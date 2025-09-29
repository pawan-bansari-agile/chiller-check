/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";

import { NotificationType, LogEntryAlert } from "src/module/user/dto/user.dto";
import { User, UserDocument } from "src/common/schema/user.schema";
import { Logs, LogsDocument } from "src/common/schema/logs.schema";
import {
  MaintenanceDocument,
  MaintenanceRecordsLogs,
} from "src/common/schema/maintenanceLogs.schema";
import {
  NotificationRedirectionType,
  Role,
  userRoleName,
} from "src/common/constants/enum.constant";
import { NotificationService } from "src/common/services/notification.service";
import { EmailService } from "src/common/helpers/email/email.service";
import { Chiller, ChillerDocument } from "src/common/schema/chiller.schema";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";
import { logAlertTemplate } from "src/common/helpers/email/emailTemplates/logAlertTemplate";
import { Report, ReportDocument } from "src/common/schema/reports.schema";
import { getStartEndDates } from "src/common/helpers/reports/dateSetter.helper";
import { ReportsService } from "src/module/reports/reports.service";
import { reportNotificationTemplate } from "src/common/helpers/email/emailTemplates/reportNotificationTemplate";

@Injectable()
export class AlertCronService {
  private readonly logger = new Logger(AlertCronService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Logs.name) private logsModel: Model<LogsDocument>,
    @InjectModel(Chiller.name) private chillerModel: Model<ChillerDocument>,
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(MaintenanceRecordsLogs.name)
    private maintModel: Model<MaintenanceDocument>,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private reportsService: ReportsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAlerts() {
    if (process.env.APP_ENV != "local") {
      this.logger.log("🚀 Starting nightly alerts cron job...");

      // Fetch active users with allowed roles
      const users = await this.userModel.find({
        isActive: true,
        isDeleted: false,
        role: {
          $in: [Role.CORPORATE_MANAGER, Role.FACILITY_MANAGER, Role.OPERATOR],
        },
      });
      console.log("✌️users.length --->", users.length);

      for (const user of users) {
        if (!user.alerts?.logs?.length) continue;

        for (const logAlert of user.alerts.logs) {
          const chillers = await this.getRelevantChillers(user);

          for (const chiller of chillers) {
            const triggered = await this.checkLogs(user, logAlert, chiller);

            if (triggered) {
              this.logger.log(
                `⚠️ Alert triggered for ${user.email} | type=${logAlert.type}, notifyBy=${logAlert.notifyBy}`,
              );

              await this.sendNotification(user, logAlert, chiller);
            }
          }
        }
      }

      this.logger.log("✅ Nightly alerts cron job completed.");
    }
  }

  /**
   * Resolve chillers based on user role
   */
  private async getRelevantChillers(user: UserDocument) {
    const filter: any = { status: "Active", isDeleted: false };

    if (user.role === Role.CORPORATE_MANAGER) {
      filter.companyId = user.companyId;
    } else if (user.role === Role.FACILITY_MANAGER) {
      filter.facilityId = { $in: user.facilityIds };
    } else if (user.role === Role.OPERATOR) {
      filter._id = { $in: user.chillerIds };
    }

    return this.chillerModel.find(filter).lean();
  }

  /**
   * Check conditions based on logAlert type
   */
  private async checkLogs(
    user: UserDocument,
    logAlert: LogEntryAlert,
    chiller: any,
  ): Promise<boolean> {
    const { type, daysSince, facilityIds, operatorIds } = logAlert;

    // calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSince);

    switch (type) {
      case "manual": {
        // No manual log entries within daysSince
        const manualLog = await this.logsModel.findOne({
          isDeleted: false,
          //   facilityId: {
          //     $in: facilityIds?.length ? facilityIds : user.facilityIds,
          //   },
          chillerId: chiller._id,
          isLogManual: true,
          createdAt: { $gte: cutoffDate },
        });
        return !manualLog;
      }

      case "maintenance": {
        // No maintenance records within daysSince
        const maintLog = await this.maintModel.findOne({
          isDeleted: false,
          //   facilityId: {
          //     $in: facilityIds?.length ? facilityIds : user.facilityIds,
          //   },
          chillerId: chiller._id,
          createdAt: { $gte: cutoffDate },
        });
        return !maintLog;
      }

      case "csv": {
        // No csv (non-manual) logs within daysSince
        const csvLog = await this.logsModel.findOne({
          isDeleted: false,
          //   facilityId: {
          //     $in: facilityIds?.length ? facilityIds : user.facilityIds,
          //   },
          chillerId: chiller._id,
          isLogManual: false,
          createdAt: { $gte: cutoffDate },
        });
        return !csvLog;
      }

      case "program": {
        // Check if operatorIds have logged in since cutoff
        // if (!operatorIds?.length) return false;
        if (!operatorIds?.length) {
          this.logger.debug(
            `⏭️ Skipping program alert for ${user._id} - no operatorIds assigned`,
          );
          return null; // return null means skip, instead of returning false (false = "no alert")
        }

        const operators = await this.userModel.find({
          _id: { $in: operatorIds },
          lastLoginTime: { $gte: cutoffDate },
        });

        // If none of the operators logged in since cutoff, trigger
        return operators.length === 0;
      }

      default:
        return false;
    }
  }

  /**
   * Send notification (web/email/both)
   */
  private async sendNotification(
    user: UserDocument,
    logAlert: LogEntryAlert,
    chiller?: ChillerDocument,
  ) {
    const content = await this.buildLogTypeContent(logAlert, user, chiller);

    switch (logAlert.notifyBy) {
      case NotificationType.WEB:
        await this.sendWebNotification(user, logAlert, content);
        break;

      case NotificationType.EMAIL:
        await this.sendEmailNotification(user, logAlert, content);
        break;

      case NotificationType.BOTH:
        await Promise.all([
          this.sendWebNotification(user, logAlert, content),
          this.sendEmailNotification(user, logAlert, content),
        ]);
        break;
    }
  }

  // 🔧 Utility to generate notification content based on alerts.logs types

  /**
   * Generate dynamic content
   */
  private async buildLogTypeContent(
    logAlert: LogEntryAlert,
    user: UserDocument,
    chiller?: ChillerDocument,
  ) {
    let title = "";
    let message = "";
    const role = userRoleName(user.role);
    if (logAlert.type === "program") {
      // const roleText = Role[user.role];
      title = "User Not Logged In";
      message = `Please note that the ${role} - ${user.firstName} ${user.lastName} hasn't logged into the system since last ${logAlert.daysSince} days. You may want to follow up to ensure everything is in order.`;
    } else {
      const facility = await this.facilityModel
        .findById(chiller.facilityId)
        .lean();
      console.log("✌️chiller --->", chiller);

      if (logAlert.type === "manual") {
        title = "Chiller Log Entry Missing";
        message = `Please note that the Chiller - ${chiller.model} from Facility - ${facility?.name} hasn't received a log entry since last ${logAlert.daysSince} days. You may want to follow up with the operators or the needed manager to ensure everything is in order.`;
      }

      if (logAlert.type === "maintenance") {
        title = "Chiller Maintenance Entry Missing";
        message = `Please note that the Chiller - ${chiller.model} from Facility - ${facility?.name} hasn't received a maintenance entry since last ${logAlert.daysSince} days. You may want to follow up with the operators or the needed manager to ensure everything is in order.`;
      }

      if (logAlert.type === "csv") {
        title = "Chiller CSV/Auto Log Entry Missing";
        message = `Please note that the Chiller - ${chiller.model} from Facility - ${facility?.name} hasn't received a CSV / Auto Log entry since last ${logAlert.daysSince} days. You may want to follow up with the operators or the needed manager to ensure everything is in order.`;
      }
    }

    return { title, message };
  }

  private async sendWebNotification(
    user: UserDocument,
    logAlert: LogEntryAlert,
    content: { title: string; message: string },
  ) {
    this.logger.debug(`🌐 Sending WEB notification to ${user.email}`);

    const payload = {
      senderId: null,
      receiverId: user._id,
      title: content.title,
      message: content.message,
      type: logAlert.type,
      redirection: { type: logAlert.type },
    };

    await this.notificationService.sendNotification(
      payload.receiverId,
      payload,
    );
  }

  private async sendEmailNotification(
    user: UserDocument,
    logAlert: LogEntryAlert,
    content: { title: string; message: string },
  ) {
    this.logger.debug(`📧 Sending EMAIL to ${user.email}`);

    const html = logAlertTemplate(
      user.firstName,
      user.lastName,
      content.message,
      content.title,
    );

    await this.emailService.emailSender({
      to: user.email,
      subject: content.title,
      html,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processSharedReports() {
    this.logger.log("Running daily shared reports cron job...");

    const reports = await this.reportModel.find({ isDeleted: false }).lean();

    for (const report of reports) {
      if (!report.sharedTo?.length) continue;

      for (const shared of report.sharedTo) {
        const shouldGenerate = this.shouldGenerateToday(shared.interval);
        if (!shouldGenerate) continue;

        await this.notifySharedUser(report, shared.userId);
      }
    }
  }

  private shouldGenerateToday(
    interval: "daily" | "weekly" | "monthly",
  ): boolean {
    const today = new Date();

    if (interval === "daily") return true;
    if (interval === "weekly") return today.getDay() === 1; // e.g. Monday
    if (interval === "monthly") return today.getDate() === 1; // 1st of month

    return false;
  }

  // private async generateAndNotify(
  //   report: any,
  //   userId: mongoose.Types.ObjectId,
  // ) {
  //   // fetch user
  //   const user = await this.userModel.findById(userId);
  //   if (!user) return;

  //   const { startDate, endDate } = getStartEndDates(report.dateType);

  //   const reportPayload = {
  //     name: report.name,
  //     notification: report.notification,
  //     parameter: report.parameter,
  //     chartType: report.chartType,
  //     companyId: report.companyId,
  //     facilityIds: report.facilityIds,
  //     description: report.description,
  //     header: report.header,
  //     footer: report.footer,
  //     startDate: startDate,
  //     endDate: endDate,
  //     dateType: report.dateType,
  //     sharedTo: [],
  //     createdBy: report.createdBy,
  //     updatedBy: report.createdBy,
  //   };

  //   // create new report (copy details)
  //   const newReport = await this.reportsService.create(
  //     reportPayload,
  //     report.createdBy.toString(),
  //   );

  //   // send notification
  //   const userFullName = `${user.firstName} ${user.lastName}`;
  //   const creator = await this.userModel.findById(report.createdBy);
  //   console.log("✌️creator --->", creator);

  //   if (report.notification === "email" || report.notification === "both") {
  //     const html = reportNotificationTemplate(
  //       userFullName,
  //       newReport.name,
  //       creator?.role,
  //       `${creator?.firstName} ${creator?.lastName}`,
  //       `${process.env.ADMIN_URL}/report/view/${newReport._id}`,
  //     );
  //     console.log("✌️process.env.ADMIN_URL --->", process.env.ADMIN_URL);

  //     console.log("✌️user.email --->", user.email);
  //     await this.emailService.emailSender({
  //       to: user.email,
  //       subject: `Your Scheduled Report`,
  //       html: html,
  //     });
  //   }

  //   if (report.notification === "web" || report.notification === "both") {
  //     const message = `Your scheduled report "${newReport.name}" is now available.`;
  //     const payload = {
  //       senderId: null,
  //       receiverId: user._id,
  //       title: "Scheduled Report",
  //       message: message,
  //       type: NotificationRedirectionType.REPORT_SHARED,
  //       redirection: {
  //         reportId: newReport._id,
  //         type: NotificationRedirectionType.REPORT_SHARED,
  //       },
  //     };

  //     await this.notificationService.sendNotification(
  //       payload.receiverId,
  //       payload,
  //     );
  //   }

  //   this.logger.log(`Generated report ${newReport._id} for user ${user.email}`);
  // }
  private async notifySharedUser(report: any, userId: mongoose.Types.ObjectId) {
    // fetch user
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const userFullName = `${user.firstName} ${user.lastName}`;
    const creator = await this.userModel.findById(report.createdBy);

    // 📧 Email Notification
    if (report.notification === "email" || report.notification === "both") {
      const html = reportNotificationTemplate(
        userFullName,
        report.name,
        creator?.role,
        `${creator?.firstName} ${creator?.lastName}`,
        `${process.env.ADMIN_URL}/report/view/${report._id}`, // ✅ use existing report id
      );

      await this.emailService.emailSender({
        to: user.email,
        subject: `Your Scheduled Report`,
        html: html,
      });
    }

    // 🔔 Web Notification
    if (report.notification === "web" || report.notification === "both") {
      const message = `Your scheduled report "${report.name}" is now available.`;
      const payload = {
        senderId: null,
        receiverId: user._id,
        title: "Scheduled Report",
        message: message,
        type: NotificationRedirectionType.REPORT_SHARED,
        redirection: {
          reportId: report._id,
          type: NotificationRedirectionType.REPORT_SHARED,
        },
      };

      await this.notificationService.sendNotification(
        payload.receiverId,
        payload,
      );
    }

    this.logger.log(
      `Sent notification for report ${report._id} to ${user.email}`,
    );
  }
}

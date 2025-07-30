import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as cron from "node-cron";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ScheduledJob,
  ScheduledJobDocument,
} from "../schema/scheduled-job.schema";
import { Company, CompanyDocument } from "../schema/company.schema";
import { EmailService } from "../helpers/email/email.service";
import { CompanyStatus, Role } from "../constants/enum.constant";
import { User, UserDocument } from "../schema/user.schema";
import { freeTrialEndingTemplate } from "../helpers/email/emailTemplates/freeTrialEndingTemplate";
import { adminSubAdminCompanyInactivatedTemplate } from "../helpers/email/emailTemplates/adminCompanyInactivatedTemplate";
import { companyManagerInactivatedTemplate } from "../helpers/email/emailTemplates/companyManagerInactivatedTemplate";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    @InjectModel(ScheduledJob.name)
    private scheduledJobModel: Model<ScheduledJobDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
  ) {}

  async scheduleJob(
    jobId: string,
    jobType: "TRIAL_EMAIL" | "TRIAL_DEACTIVATE",
    companyId: string,
    executeAt: Date,
  ) {
    const delayMs = executeAt.getTime() - Date.now();
    if (delayMs <= 0) {
      return this.logger.warn(`Scheduled time already passed for job ${jobId}`);
    }

    // Persist job
    await this.scheduledJobModel.updateOne(
      { jobId },
      {
        jobId,
        jobType,
        companyId,
        executeAt,
        isExecuted: false,
      },
      { upsert: true },
    );

    this.logger.log(
      `Persisted & scheduling job: ${jobId} at ${executeAt.toISOString()}`,
    );

    const timeout = setTimeout(async () => {
      try {
        await this.executeJob(jobId);
      } catch (err) {
        this.logger.error(`Error running job ${jobId}`, err);
      }
    }, delayMs);

    this.jobs.set(jobId, {
      stop: () => clearTimeout(timeout),
    } as unknown as cron.ScheduledTask); // Hack to satisfy cron typings
  }

  private async executeJob(jobId: string) {
    try {
      const job = await this.scheduledJobModel.findOne({ jobId });
      console.log("job:------------73 ", job);
      if (!job || job.isExecuted) return;

      this.logger.log(`Executing job ${jobId} of type ${job.jobType}`);

      if (job.jobType === "TRIAL_EMAIL") {
        const company = await this.companyModel.findById(job.companyId);
        const manager = await this.userModel.findOne({
          companyId: company._id,
          role: Role.CORPORATE_MANAGER,
        });
        if (manager) {
          const managerEmail = manager?.email;
          const managerFullName = `${manager?.firstName} ${manager?.lastName}`;

          const html = freeTrialEndingTemplate(managerFullName);

          if (company?.status == CompanyStatus.ACTIVE) {
            await this.emailService.emailSender({
              to: managerEmail,
              subject: `Your Free Trial for ${company.name} Expires Soon`,
              html: html,
            });
            await this.companyModel.updateOne(
              { _id: company._id },
              { $set: { trialReminderSent: true } },
            );
          }
        }
      }

      if (job.jobType === "TRIAL_DEACTIVATE") {
        const company = await this.companyModel.findById(job.companyId);
        console.log("company:------------106 ", company);

        const companyManager = await this.userModel.findOne({
          companyId: company._id,
          role: Role.CORPORATE_MANAGER,
        });
        const companyName = company.name;

        console.log("companyManager: ", companyManager);
        let companyManagerName;
        let tdContent;
        let subject;
        if (companyManager) {
          companyManagerName =
            companyManager?.firstName + " " + companyManager?.lastName;
          tdContent = `The free trial of the Company - ${companyName} has ended so the Company Manager - ${companyManagerName} account has been inactivated.`;
          subject = `Company Trial Ended – ${companyManagerName} Account Inactivated`;
        } else {
          companyManagerName = "Company Manager";
          tdContent = `The free trial of the Company - ${companyName} has ended so the Company Manager account for the relevant company will be inactivated if available.`;
          subject = `Company Trial Ended.`;
        }

        if (companyManager) {
          companyManager.isProfileUpdated = true;
        }

        if (company?.status == CompanyStatus.DEMO) {
          await this.companyModel.updateOne(
            { _id: company._id },
            { $set: { status: CompanyStatus.IN_ACTIVE } },
          );
          if (companyManager) {
            const html = companyManagerInactivatedTemplate(companyManagerName);

            await this.emailService.emailSender({
              to: companyManager.email,
              subject: `30-Day Trial Ended – Reactivate Your Chiller Check Account`,
              html: html,
            });
          }

          const adminAndSubAdmin = await this.userModel.find({
            role: { $in: [Role.ADMIN, Role.SUB_ADMIN] },
          });
          for (const element of adminAndSubAdmin) {
            const adminName = element?.firstName + " " + element?.lastName;
            const html = adminSubAdminCompanyInactivatedTemplate(
              adminName,
              tdContent,
            );

            await this.emailService.emailSender({
              to: element?.email,
              subject: subject,
              html: html,
            });
          }
        }
      }

      await this.scheduledJobModel.updateOne(
        { jobId },
        { $set: { isExecuted: true } },
      );
    } catch (error) {
      console.log("=-=-=-=-158", error);
    }
  }

  async onModuleInit() {
    this.logger.log("Restoring scheduled jobs from DB...");

    const jobs = await this.scheduledJobModel.find({
      isExecuted: false,
      executeAt: { $gte: new Date() },
    });

    for (const job of jobs) {
      await this.scheduleJob(
        job.jobId,
        job.jobType,
        job.companyId,
        job.executeAt,
      );
    }

    this.logger.log(`Restored ${jobs.length} scheduled jobs.`);
  }
}

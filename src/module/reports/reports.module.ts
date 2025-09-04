import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { CommonService } from "src/common/services/common.service";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Report, ReportSchema } from "src/common/schema/reports.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { NotificationService } from "src/common/services/notification.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { Device, DeviceSchema } from "src/common/schema/device.schema";
import { ImageUploadService } from "../image-upload/image-upload.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Logs.name, schema: LogsSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Report.name, schema: ReportSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    CommonService,
    EmailService,
    NotificationService,
    ImageUploadService,
  ],
})
export class ReportsModule {}

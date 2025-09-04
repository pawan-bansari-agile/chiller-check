import { Module } from "@nestjs/common";
import { LogService } from "./log.service";
import { LogController } from "./log.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Timeline, TimelineSchema } from "src/common/schema/timeline.schema";
import {
  Conversion,
  ConversionSchema,
} from "src/common/schema/conversion.schema";
import {
  AltitudeCorrection,
  AltitudeCorrectionSchema,
} from "src/common/schema/altitudeCorrection.schema";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { BadLog, BadLogSchema } from "src/common/schema/badLogs.schema";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { CommonService } from "src/common/services/common.service";
import {
  ProblemAndSolutions,
  ProblemAndSolutionsSchema,
} from "src/common/schema/problemAndSolutions.schema";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { NotificationService } from "src/common/services/notification.service";
import { EmailService } from "src/common/helpers/email/email.service";
import { Device, DeviceSchema } from "src/common/schema/device.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Logs.name, schema: LogsSchema },
      { name: User.name, schema: UserSchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Timeline.name, schema: TimelineSchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: AltitudeCorrection.name, schema: AltitudeCorrectionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: BadLog.name, schema: BadLogSchema },
      { name: ProblemAndSolutions.name, schema: ProblemAndSolutionsSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [LogController],
  providers: [
    LogService,
    ImageUploadService,
    CommonService,
    NotificationService,
    EmailService,
  ],
})
export class LogModule {}

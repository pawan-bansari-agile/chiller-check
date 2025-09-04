import { Module } from "@nestjs/common";
import { GmailController } from "./gmail.controller";
import { GmailService } from "./gmail.service";
import { LoggerService } from "src/common/logger/logger.service";
import { LogService } from "../log/log.service";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import { Timeline, TimelineSchema } from "src/common/schema/timeline.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { BadLog, BadLogSchema } from "src/common/schema/badLogs.schema";
import {
  AltitudeCorrection,
  AltitudeCorrectionSchema,
} from "src/common/schema/altitudeCorrection.schema";
import {
  Conversion,
  ConversionSchema,
} from "src/common/schema/conversion.schema";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { CommonService } from "src/common/services/common.service";
import {
  GmailHistory,
  GmailHistorySchema,
} from "src/common/schema/gmail-history.schema";
import {
  GmailState,
  GmailStateSchema,
} from "src/common/schema/gmail-state.schema";
import {
  ProcessedMessage,
  ProcessedMessageSchema,
} from "src/common/schema/processed-message.schema";
import {
  ProblemAndSolutions,
  ProblemAndSolutionsSchema,
} from "src/common/schema/problemAndSolutions.schema";
import { NotificationService } from "src/common/services/notification.service";
import { EmailService } from "src/common/helpers/email/email.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { Device, DeviceSchema } from "src/common/schema/device.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Logs.name, schema: LogsSchema },
      { name: Timeline.name, schema: TimelineSchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Company.name, schema: CompanySchema },
      { name: BadLog.name, schema: BadLogSchema },
      { name: AltitudeCorrection.name, schema: AltitudeCorrectionSchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: GmailHistory.name, schema: GmailHistorySchema },
      { name: GmailState.name, schema: GmailStateSchema },
      { name: ProcessedMessage.name, schema: ProcessedMessageSchema },
      { name: ProblemAndSolutions.name, schema: ProblemAndSolutionsSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [GmailController],
  providers: [
    GmailService,
    LoggerService,
    LogService,
    ImageUploadService,
    CommonService,
    NotificationService,
    EmailService,
  ],
})
export class GmailModule {}

import { Module } from "@nestjs/common";
import { ChillerService } from "./chiller.service";
import { ChillerController } from "./chiller.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { Timeline, TimelineSchema } from "src/common/schema/timeline.schema";
import { SchedulerService } from "src/common/scheduler/scheduler.service";
import {
  ScheduledJob,
  ScheduledJobSchema,
} from "src/common/schema/scheduled-job.schema";
import { NotificationService } from "src/common/services/notification.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { Device, DeviceSchema } from "src/common/schema/device.schema";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import {
  ProblemAndSolutions,
  ProblemAndSolutionsSchema,
} from "src/common/schema/problemAndSolutions.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: User.name, schema: UserSchema },
      { name: Timeline.name, schema: TimelineSchema },
      { name: ScheduledJob.name, schema: ScheduledJobSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Logs.name, schema: LogsSchema },
      { name: ProblemAndSolutions.name, schema: ProblemAndSolutionsSchema },
    ]),
  ],
  controllers: [ChillerController],
  providers: [
    ChillerService,
    EmailService,
    SchedulerService,
    NotificationService,
  ],
})
export class ChillerModule {}

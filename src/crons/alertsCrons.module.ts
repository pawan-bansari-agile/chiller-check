import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AlertCronService } from "./alertsCron.service";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import {
  MaintenanceRecordsLogs,
  MaintenanceRecordsLogsSchema,
} from "src/common/schema/maintenanceLogs.schema";
import { NotificationService } from "src/common/services/notification.service";
import { EmailService } from "src/common/helpers/email/email.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { Device, DeviceSchema } from "src/common/schema/device.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Logs.name, schema: LogsSchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
      {
        name: MaintenanceRecordsLogs.name,
        schema: MaintenanceRecordsLogsSchema,
      },
    ]),
  ],
  providers: [AlertCronService, NotificationService, EmailService],
})
export class AlertCronModule {}

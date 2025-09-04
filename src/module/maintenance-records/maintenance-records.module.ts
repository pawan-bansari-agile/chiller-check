import { Module } from "@nestjs/common";
import { MaintenanceRecordsService } from "./maintenance-records.service";
import { MaintenanceRecordsController } from "./maintenance-records.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import {
  MaintenanceRecordsLogs,
  MaintenanceRecordsLogsSchema,
} from "src/common/schema/maintenanceLogs.schema";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { CommonService } from "src/common/services/common.service";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Timeline, TimelineSchema } from "src/common/schema/timeline.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Logs.name, schema: LogsSchema },
      {
        name: MaintenanceRecordsLogs.name,
        schema: MaintenanceRecordsLogsSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Timeline.name, schema: TimelineSchema },
      { name: Chiller.name, schema: ChillerSchema },
    ]),
  ],
  controllers: [MaintenanceRecordsController],
  providers: [MaintenanceRecordsService, ImageUploadService, CommonService],
})
export class MaintenanceRecordsModule {}

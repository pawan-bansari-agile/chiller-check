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
    ]),
  ],
  controllers: [LogController],
  providers: [LogService],
})
export class LogModule {}

import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Logs, LogsSchema } from "src/common/schema/logs.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import {
  HistCompanyPerformance,
  HistCompanyPerformanceSchema,
} from "src/common/schema/hist-company-performance.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Logs.name, schema: LogsSchema },
      { name: User.name, schema: UserSchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: Facility.name, schema: FacilitySchema },
      {
        name: HistCompanyPerformance.name,
        schema: HistCompanyPerformanceSchema,
      },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

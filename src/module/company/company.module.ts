import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Chiller.name, schema: ChillerSchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}

import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { CompanySchema } from "src/common/schema/company.schema";
import { FacilitySchema } from "src/common/schema/facility.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Company", schema: CompanySchema }]),
    MongooseModule.forFeature([{ name: "Facility", schema: FacilitySchema }]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}

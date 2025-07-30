import { Module } from "@nestjs/common";
import { FacilityService } from "./facility.service";
import { FacilityController } from "./facility.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FacilityController],
  providers: [FacilityService, EmailService],
})
export class FacilityModule {}

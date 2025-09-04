import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { User, UserSchema } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { NotificationService } from "src/common/services/notification.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";
import { Device, DeviceSchema } from "src/common/schema/device.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: Chiller.name, schema: ChillerSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService, EmailService, NotificationService],
})
export class CompanyModule {}

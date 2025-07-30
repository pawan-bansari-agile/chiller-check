import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/common/schema/user.schema";
import { CryptoService } from "src/common/services/crypto.service";
import { RolesGuard } from "src/security/auth/guards/role.guard";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { ImageUploadModule } from "../image-upload/image-upload.module";
import { PasswordGeneratorService } from "src/common/helpers/passwordGenerator.helper";
import { EmailService } from "src/common/helpers/email/email.service";
import { CommonService } from "src/common/services/common.service";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";
import { Facility, FacilitySchema } from "src/common/schema/facility.schema";
// import { APP_GUARD } from '@nestjs/core';
// import { UserAccessGuard } from 'src/security/auth/guards/user-module.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    MongooseModule.forFeature([{ name: Chiller.name, schema: ChillerSchema }]),
    MongooseModule.forFeature([
      { name: Facility.name, schema: FacilitySchema },
    ]),
    ImageUploadModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    CryptoService,
    RolesGuard,
    PasswordGeneratorService,
    EmailService,
    CommonService,
    // {
    //   provide: APP_GUARD,
    //   useClass: UserAccessGuard,
    // },
  ], // Add RoleGuard here
})
export class UserModule {}

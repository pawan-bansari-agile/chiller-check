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
// import { APP_GUARD } from '@nestjs/core';
// import { UserAccessGuard } from 'src/security/auth/guards/user-module.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserSchema } from "src/common/schema/user.schema";
import { CryptoService } from "src/common/services/crypto.service";
import { RolesGuard } from "src/security/auth/guards/role.guard";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { ImageUploadModule } from "../image-upload/image-upload.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "User", schema: UserSchema }]),
    ImageUploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, CryptoService, RolesGuard], // Add RoleGuard here
})
export class UserModule {}

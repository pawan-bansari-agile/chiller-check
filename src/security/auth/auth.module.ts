import { Module, OnModuleInit } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { LoggerModule } from "src/common/logger/logger.module";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "src/common/schema/user.schema";
import { CryptoService } from "src/common/services/crypto.service";
import { CommonService } from "src/common/services/common.service";
import { Device, DeviceSchema } from "src/common/schema/device.schema";
import { ConversionService } from "src/common/services/conversion.service";
import {
  Conversion,
  ConversionSchema,
} from "src/common/schema/conversion.schema";
import {
  AltitudeCorrection,
  AltitudeCorrectionSchema,
} from "src/common/schema/altitudeCorrection.schema";
import { Company, CompanySchema } from "src/common/schema/company.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { NotificationService } from "src/common/services/notification.service";
import {
  Notification,
  NotificationSchema,
} from "src/common/schema/notification.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: AltitudeCorrection.name, schema: AltitudeCorrectionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("auth.secret"),
        signOptions: {
          expiresIn: configService.get<number>("auth.expiresIn", 60),
        },
      }),
    }),
    LoggerModule,
  ],
  providers: [
    JwtStrategy,
    AuthService,
    CryptoService,
    CommonService,
    ConversionService,
    EmailService,
    NotificationService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit(): Promise<void> {
    await this.authService.createInitialUser();
    await this.authService.importConversionData();
    await this.authService.importAltitudeCorrectionData();
  }
}

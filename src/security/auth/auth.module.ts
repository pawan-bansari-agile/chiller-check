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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
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
  providers: [JwtStrategy, AuthService, CryptoService, CommonService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit(): Promise<void> {
    await this.authService.createInitialUser();
  }
}

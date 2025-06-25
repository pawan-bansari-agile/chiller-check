import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { LoggerModule } from "./common/logger/logger.module";
import { AuthModule } from "./security/auth/auth.module";
import { JwtAuthGuard } from "./security/auth/guards/jwt-auth.guard";
import { DatabaseModule } from "./providers/database/mongo/database.module";
import { ThrottleModule } from "./security/throttle/throttle.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import AppConfiguration from "./config/app.config";
import DatabaseConfiguration from "./config/database.config";
import AuthConfiguration from "./config/auth.config";
import { AuthMiddleware } from "./common/middleware/auth.middleware";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./common/schema/user.schema";
import { CryptoService } from "./common/services/crypto.service";
import { RolesGuard } from "./security/auth/guards/role.guard";
import { Device, DeviceSchema } from "./common/schema/device.schema";
import { UserModule } from "./module/user/user.module";
import { ImageUploadModule } from "./module/image-upload/image-upload.module";
import { CompanyModule } from "./module/company/company.module";
import { FacilityModule } from "./module/facility/facility.module";
import { CmsModule } from "./module/cms/cms.module";
import { UserAccessGuard } from "./security/auth/guards/user-module.guard";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
    ConfigModule.forRoot({
      load: [AppConfiguration, DatabaseConfiguration, AuthConfiguration],
      ignoreEnvFile: false,
      isGlobal: true,
    }),
    DatabaseModule,
    LoggerModule,
    AuthModule,
    ThrottleModule,
    UserModule,
    ImageUploadModule,
    CompanyModule,
    FacilityModule,
    CmsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: UserAccessGuard,
    },
    CryptoService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}

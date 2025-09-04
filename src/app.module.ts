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
// import { UserAccessGuard } from './security/auth/guards/user-module.guard';
import { ChillerModule } from "./module/chiller/chiller.module";
import { ProblemSolutionModule } from "./module/problem-solution/problem-solution.module";
import { TimelineModule } from "./module/timeline/timeline.module";
import { LogModule } from "./module/log/log.module";
import { ScheduleModule } from "@nestjs/schedule";
import { Company, CompanySchema } from "./common/schema/company.schema";
import { MaintenanceRecordsModule } from "./module/maintenance-records/maintenance-records.module";
import { ReportsModule } from "./module/reports/reports.module";
import { NotificationModule } from "./module/notification/notification.module";
import { GmailModule } from "./module/gmail/gmail.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { UserActionLogModule } from "./common/userActionLog/userActionLog.module";
import { JwtService } from "@nestjs/jwt";
import { UserActionLogService } from "./common/userActionLog/userActionLog.service";
import {
  UserActionLog,
  UserActionLogSchema,
} from "./common/schema/userActionLog.schema";
import { DashboardModule } from "./module/dashboard/dashboard.module";
import { AlertCronModule } from "./crons/alertsCrons.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Company.name, schema: CompanySchema },
      { name: UserActionLog.name, schema: UserActionLogSchema },
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
    ChillerModule,
    ProblemSolutionModule,
    TimelineModule,
    LogModule,
    MaintenanceRecordsModule,
    ReportsModule,
    NotificationModule,
    GmailModule,
    UserActionLogModule,
    DashboardModule,
    AlertCronModule,
    ServeStaticModule.forRoot(
      {
        serveRoot: "/tmp-chiller-check",
        rootPath: join(__dirname, "..", "./tmp-chiller-check"),
        //exclude: ['/api*'],
        serveStaticOptions: {
          setHeaders: (res) => {
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            res.setHeader("Access-Control-Allow-Origin", "*");
          },
        },
      },
      {
        serveRoot: "/chiller-check",
        rootPath: join(__dirname, "..", "./chiller-check"),
        //exclude: ['/api*'],
        serveStaticOptions: {
          setHeaders: (res) => {
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            res.setHeader("Access-Control-Allow-Origin", "*");
          },
        },
      },
    ),
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
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Add your interceptor class here
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: UserAccessGuard,
    // },
    CryptoService,
    JwtService,
    UserActionLogService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}

import { Module } from "@nestjs/common";
import { UserActionLogService } from "./userActionLog.service";
import { UserActionLogController } from "./userActionLog.controller";
import { MongooseModule } from "@nestjs/mongoose";
import {
  UserActionLog,
  UserActionLogSchema,
} from "../schema/userActionLog.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserActionLog.name, schema: UserActionLogSchema },
    ]),
  ],
  controllers: [UserActionLogController],
  providers: [UserActionLogService],
})
export class UserActionLogModule {}

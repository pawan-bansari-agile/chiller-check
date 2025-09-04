import { Controller } from "@nestjs/common";
import { UserActionLogService } from "./userActionLog.service";

@Controller("records")
export class UserActionLogController {
  constructor(private readonly recordsService: UserActionLogService) {}
}

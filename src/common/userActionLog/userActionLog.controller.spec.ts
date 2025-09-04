import { Test, TestingModule } from "@nestjs/testing";
import { UserActionLogController } from "./userActionLog.controller";
import { UserActionLogService } from "./userActionLog.service";

describe("RecordsController", () => {
  let controller: UserActionLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserActionLogController],
      providers: [UserActionLogService],
    }).compile();

    controller = module.get<UserActionLogController>(UserActionLogController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

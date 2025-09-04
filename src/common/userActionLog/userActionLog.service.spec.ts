import { Test, TestingModule } from "@nestjs/testing";
import { UserActionLogService } from "./userActionLog.service";

describe("RecordsService", () => {
  let service: UserActionLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserActionLogService],
    }).compile();

    service = module.get<UserActionLogService>(UserActionLogService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

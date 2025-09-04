import { Test, TestingModule } from "@nestjs/testing";
import { MaintenanceRecordsService } from "./maintenance-records.service";

describe("MaintenanceRecordsService", () => {
  let service: MaintenanceRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceRecordsService],
    }).compile();

    service = module.get<MaintenanceRecordsService>(MaintenanceRecordsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

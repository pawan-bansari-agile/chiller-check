import { Test, TestingModule } from "@nestjs/testing";
import { ChillerService } from "./chiller.service";

describe("ChillerService", () => {
  let service: ChillerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChillerService],
    }).compile();

    service = module.get<ChillerService>(ChillerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { ChillerController } from "./chiller.controller";
import { ChillerService } from "./chiller.service";

describe("ChillerController", () => {
  let controller: ChillerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [ChillerService],
    }).compile();

    controller = module.get<ChillerController>(ChillerController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

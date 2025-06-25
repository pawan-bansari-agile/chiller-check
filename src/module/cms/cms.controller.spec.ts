import { Test, TestingModule } from "@nestjs/testing";
import { CmsController } from "./cms.controller";
import { CmsService } from "./cms.service";

describe("CmsController", () => {
  let controller: CmsController;
  let service: CmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmsController],
      providers: [
        {
          provide: CmsService,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CmsController>(CmsController);
    service = module.get<CmsService>(CmsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
  describe("FindOne", () => {
    it("should call cmsService.findOne with params", async () => {
      const title = "termsAndCond";
      await controller.findOne({ title: "termsAndCond" });
      expect(service.findOne).toHaveBeenCalledWith(title);
    });
  });
  describe("Update", () => {
    it("should call cmsService.update with params", async () => {
      const title = "termsAndCond";
      await controller.update({ title: title, value: "testtestest" });
      expect(service.updateAdminCms).toHaveBeenCalledWith(title);
    });
  });
});

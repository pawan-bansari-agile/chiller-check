import { Test, TestingModule } from "@nestjs/testing";
import { CmsService } from "./cms.service";
import { getModelToken } from "@nestjs/mongoose";
import { Cms } from "src/common/schema/cms.schema";
import { LoggerService } from "src/common/logger/logger.service";
import { AuthExceptions } from "src/common/helpers/exceptions";

const mockCmsModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  insertMany: jest.fn(),
};

const mockLoggerService = {
  customLog: jest.fn(),
  log: jest.fn(),
};

describe("CmsService", () => {
  let service: CmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsService,
        { provide: getModelToken(Cms.name), useValue: mockCmsModel },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<CmsService>(CmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it("should be defined", () => {
    expect(service).toBeDefined();
  });
  describe("findOne", () => {
    it("should return cms details if found", async () => {
      const mockCms = { title: "privacyPolicy", description: "data" };
      mockCmsModel.findOne.mockResolvedValue(mockCms);

      const result = await service.findOne({ title: "privacyPolicy" });
      expect(result).toEqual(mockCms);
      expect(mockCmsModel.findOne).toHaveBeenCalledWith({
        title: "privacyPolicy",
      });
    });

    it("should throw CMSNotFound if not found", async () => {
      mockCmsModel.findOne.mockResolvedValue(null);

      await expect(service.findOne({ title: "invalidTitle" })).rejects.toThrow(
        AuthExceptions.CMSNotFound().message,
      );
    });

    it("should handle unknown errors", async () => {
      mockCmsModel.findOne.mockRejectedValue(new Error("DB Error"));

      await expect(service.findOne({ title: "privacyPolicy" })).rejects.toThrow(
        "DB Error",
      );
    });
  });
  describe("updateAdminCms", () => {
    it("should update cms details if found", async () => {
      const cms = { title: "privacyPolicy" };
      mockCmsModel.findOne.mockResolvedValue(cms);
      mockCmsModel.findOneAndUpdate.mockResolvedValue({});

      const result = await service.updateAdminCms({
        title: "privacyPolicy",
        value: "newValue",
      });
      expect(result).toEqual({});
      expect(mockCmsModel.findOne).toHaveBeenCalledWith({
        title: "privacyPolicy",
      });
      expect(mockCmsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { title: "privacyPolicy" },
        { description: "newValue" },
      );
    });

    it("should throw CMSNotFound if cms not found", async () => {
      mockCmsModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateAdminCms({ title: "invalidTitle", value: "newValue" }),
      ).rejects.toThrow(AuthExceptions.CMSNotFound().message);
    });

    it("should handle unknown errors", async () => {
      mockCmsModel.findOne.mockRejectedValue(new Error("DB Error"));

      await expect(
        service.updateAdminCms({ title: "privacyPolicy", value: "newValue" }),
      ).rejects.toThrow("DB Error");
    });
  });

  describe("createInitialCMS", () => {
    it("should insert initial cms if not exists", async () => {
      mockCmsModel.find.mockResolvedValue([]);
      mockCmsModel.insertMany.mockResolvedValue([
        { title: "privacyPolicy" },
        { title: "termsAndCond" },
      ]);

      await service.createInitialCMS();

      expect(mockCmsModel.find).toHaveBeenCalled();
      expect(mockCmsModel.insertMany).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Initial CMS loaded successfully.",
      );
    });

    it("should not insert cms if already exists", async () => {
      mockCmsModel.find.mockResolvedValue([{ title: "privacyPolicy" }]);

      await service.createInitialCMS();

      expect(mockLoggerService.customLog).toHaveBeenCalledWith(
        "Initial CMS already loaded.",
      );
      expect(mockCmsModel.insertMany).not.toHaveBeenCalled();
    });

    it("should handle unknown errors", async () => {
      mockCmsModel.find.mockRejectedValue(new Error("DB Error"));

      await expect(service.createInitialCMS()).rejects.toThrow("DB Error");
    });
  });
});

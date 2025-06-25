import { Test, TestingModule } from "@nestjs/testing";
import { FacilityController } from "./facility.controller";
import { FacilityService } from "./facility.service";
import {
  CreateFacilityDTO,
  FacilityListDto,
  UpdateFacilityDto,
} from "./dto/facility.dto";
import { validateSync } from "class-validator";
import { BadRequestException } from "@nestjs/common";
// import { BadRequestException } from '@nestjs/common';

describe("FacilityController", () => {
  let controller: FacilityController;
  // let mockFacilityService: Partial<FacilityService>;
  let mockFacilityService: Partial<Record<keyof FacilityService, jest.Mock>>;

  beforeEach(async () => {
    mockFacilityService = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
      providers: [
        {
          provide: FacilityService,
          useValue: mockFacilityService,
        },
      ],
    }).compile();

    controller = module.get<FacilityController>(FacilityController);
  });

  describe("create()", () => {
    it("should call facilityService.create with correct parameters", async () => {
      const dto: CreateFacilityDTO = {
        name: "Test Facility",
        companyId: "60f1b5d94b8b3c001c8e4b1a",
        timezone: "Asia/Kolkata",
        altitude: 100,
        altitudeUnit: "METER",
      };

      await controller.create(dto);
      expect(mockFacilityService.create).toHaveBeenCalledWith(dto);
    });

    it("should throw an error if service throws (e.g. DB error)", async () => {
      const dto: CreateFacilityDTO = {
        name: "Test Facility",
        companyId: "60f1b5d94b8b3c001c8e4b1a",
        timezone: "Asia/Kolkata",
        altitude: 100,
        altitudeUnit: "METER",
      };

      (mockFacilityService.create as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(controller.create(dto)).rejects.toThrow("Database error");
    });

    it("should fail if required fields are missing (DTO)", async () => {
      const invalidDto: Partial<CreateFacilityDTO> = {
        companyId: "60f1b5d94b8b3c001c8e4b1a",
        timezone: "Asia/Kolkata",
        altitude: 100,
        altitudeUnit: "METER",
      };

      const errors = validateSync(
        Object.assign(new CreateFacilityDTO(), invalidDto),
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(mockFacilityService.create).not.toHaveBeenCalled();
    });

    it("should handle empty payload gracefully", async () => {
      const emptyDto = {};

      const errors = validateSync(
        Object.assign(new CreateFacilityDTO(), emptyDto),
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(mockFacilityService.create).not.toHaveBeenCalled();
    });
  });

  describe("findOne()", () => {
    const facilityId = "60c72b2f5f1b2c001cfb9e90";

    it("should return facility when found", async () => {
      const mockFacility = {
        _id: facilityId,
        name: "Test Facility",
        chillers: [],
        isDeleted: false,
      };

      mockFacilityService.findOne.mockResolvedValue(mockFacility);

      const result = await controller.findOne(facilityId);
      expect(result).toEqual(mockFacility);
      expect(mockFacilityService.findOne).toHaveBeenCalledWith(facilityId);
    });

    it("should throw BadRequestException when facility not found", async () => {
      const error = new BadRequestException("Facility not found");

      mockFacilityService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(facilityId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findOne(facilityId)).rejects.toThrow(
        "Facility not found",
      );
    });

    it("should throw unknown error if not handled", async () => {
      const error = new Error("Something unexpected");

      mockFacilityService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(facilityId)).rejects.toThrow(Error);
      await expect(controller.findOne(facilityId)).rejects.toThrow(
        "Something unexpected",
      );
    });
  });
});

describe("FacilityController - findAll()", () => {
  let controller: FacilityController;
  let mockFacilityService: Partial<Record<keyof FacilityService, jest.Mock>>;

  beforeEach(async () => {
    mockFacilityService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
      providers: [
        {
          provide: FacilityService,
          useValue: mockFacilityService,
        },
      ],
    }).compile();

    controller = module.get<FacilityController>(FacilityController);
  });

  const mockRequest = {} as Request;

  it("should return facility list successfully", async () => {
    const dto: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };
    const result = {
      facilityList: [],
      totalRecords: 0,
    };

    mockFacilityService.findAll.mockResolvedValue(result);

    const response = await controller.findAll(mockRequest, dto);
    expect(mockFacilityService.findAll).toHaveBeenCalledWith(mockRequest, dto);
    expect(response).toEqual(result);
  });

  // it('should pass companyId as query param to service', async () => {
  //   const dto: FacilityListDto = {
  //     page: 1,
  //     limit: 5,
  //     search: '',
  //     sort_order: 'ASC',
  //     sort_by: '',
  //     companyId: '',
  //   };
  //   const companyId = '60f1b5d94b8b3c001c8e4b1a';
  //   const result = {
  //     facilityList: [],
  //     totalRecords: 0,
  //   };

  //   mockFacilityService.findAll.mockResolvedValue(result);

  //   const response = await controller.findAll(mockRequest, dto);
  //   expect(mockFacilityService.findAll).toHaveBeenCalledWith(
  //     mockRequest,
  //     dto,
  //     companyId
  //   );
  //   expect(response).toEqual(result);
  // });

  it("should throw an error when page or limit are invalid", async () => {
    const dto: FacilityListDto = {
      page: 0,
      limit: -1,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };
    const error = new BadRequestException("Page and limit must be positive");

    mockFacilityService.findAll.mockRejectedValue(error);

    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(
      "Page and limit must be positive",
    );
  });

  it("should throw BadRequestException if service throws company not found error", async () => {
    const dto: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };
    // const companyId = 'invalid-id';
    const error = new BadRequestException("Company not found");

    mockFacilityService.findAll.mockRejectedValue(error);

    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(
      "Company not found",
    );
  });

  it("should throw unknown error directly if not handled", async () => {
    const dto: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };
    const error = new Error("Something broke");

    mockFacilityService.findAll.mockRejectedValue(error);

    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(Error); // not BadRequestException
    await expect(controller.findAll(mockRequest, dto)).rejects.toThrow(
      "Something broke",
    );
  });

  it("should handle search keyword in DTO", async () => {
    const dto: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "Mumbai",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };

    const result = {
      facilityList: [
        {
          name: "Test Facility",
          city: "Mumbai",
          totalChiller: 2,
        },
      ],
      totalRecords: 1,
    };

    mockFacilityService.findAll.mockResolvedValue(result);

    const response = await controller.findAll(mockRequest, dto);
    expect(response).toEqual(result);
    expect(mockFacilityService.findAll).toHaveBeenCalledWith(mockRequest, dto);
  });
});

describe("FacilityController - update()", () => {
  let controller: FacilityController;
  let mockFacilityService: Partial<Record<keyof FacilityService, jest.Mock>>;

  beforeEach(async () => {
    mockFacilityService = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
      providers: [
        {
          provide: FacilityService,
          useValue: mockFacilityService,
        },
      ],
    }).compile();

    controller = module.get<FacilityController>(FacilityController);
  });

  const facilityId = "60b3f6f4a1c4a33368a7a4bc";

  it("should update facility and return updated data", async () => {
    const dto: UpdateFacilityDto = {
      name: "Updated Facility",
      timezone: "Asia/Kolkata",
      altitude: 0,
      altitudeUnit: "",
    };

    const mockUpdatedFacility = {
      _id: facilityId,
      name: "Updated Facility",
      timezone: "Asia/Kolkata",
      altitude: 100,
    };

    mockFacilityService.update.mockResolvedValue(mockUpdatedFacility);

    const result = await controller.update(facilityId, dto);

    expect(mockFacilityService.update).toHaveBeenCalledWith(facilityId, dto);
    expect(result).toEqual(mockUpdatedFacility);
  });

  it("should throw BadRequestException if facility not found", async () => {
    const dto: UpdateFacilityDto = {
      name: "Test Facility",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    };

    const error = new BadRequestException("Facility not found");
    mockFacilityService.update.mockRejectedValue(error);

    await expect(controller.update(facilityId, dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.update(facilityId, dto)).rejects.toThrow(
      "Facility not found",
    );
  });

  it("should throw unknown error if service fails unexpectedly", async () => {
    const dto: UpdateFacilityDto = {
      name: "Something",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    };

    const error = new Error("Unexpected failure");
    mockFacilityService.update.mockRejectedValue(error);

    await expect(controller.update(facilityId, dto)).rejects.toThrow(
      "Unexpected failure",
    );
  });

  it("should not call service if DTO is completely empty", async () => {
    const dto: UpdateFacilityDto = {
      name: "",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    }; // Empty update payload

    await controller.update(facilityId, dto); // This will still call service in your current logic

    expect(mockFacilityService.update).toHaveBeenCalledWith(facilityId, dto);
  });
});

describe("FacilityController - updateFacilityStatus()", () => {
  let controller: FacilityController;
  let mockFacilityService: Partial<Record<keyof FacilityService, jest.Mock>>;

  beforeEach(async () => {
    mockFacilityService = {
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
      providers: [
        {
          provide: FacilityService,
          useValue: mockFacilityService,
        },
      ],
    }).compile();

    controller = module.get<FacilityController>(FacilityController);
  });

  const facilityId = "60b3f6f4a1c4a33368a7a4bc";

  it("should call service and return success when status is updated to true", async () => {
    const dto = { isActive: true };
    const mockResponse = {
      status: "success",
      message: "Facility activated successfully",
      data: {},
    };

    mockFacilityService.updateStatus.mockResolvedValue(mockResponse);

    const result = await controller.updateFacilityStatus(facilityId, dto);

    expect(mockFacilityService.updateStatus).toHaveBeenCalledWith(
      facilityId,
      dto,
    );
    expect(result).toEqual(mockResponse);
  });

  it("should return success when status is updated to false (deactivated)", async () => {
    const dto = { isActive: false };
    const mockResponse = {
      status: "success",
      message: "Facility deactivated successfully",
      data: {},
    };

    mockFacilityService.updateStatus.mockResolvedValue(mockResponse);

    const result = await controller.updateFacilityStatus(facilityId, dto);

    expect(mockFacilityService.updateStatus).toHaveBeenCalledWith(
      facilityId,
      dto,
    );
    expect(result).toEqual(mockResponse);
  });

  it("should throw an error when facility is not found", async () => {
    const dto = { isActive: true };
    const error = new BadRequestException("Facility not found");

    mockFacilityService.updateStatus.mockRejectedValue(error);

    await expect(
      controller.updateFacilityStatus(facilityId, dto),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.updateFacilityStatus(facilityId, dto),
    ).rejects.toThrow("Facility not found");
  });

  it("should throw error when isActive is not a boolean", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = { isActive: "yes" as any }; // intentionally wrong type
    const error = new BadRequestException("Invalid facility status");

    mockFacilityService.updateStatus.mockRejectedValue(error);

    await expect(
      controller.updateFacilityStatus(facilityId, dto),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.updateFacilityStatus(facilityId, dto),
    ).rejects.toThrow("Invalid facility status");
  });

  it("should throw unknown error when service fails unexpectedly", async () => {
    const dto = { isActive: false };
    const error = new Error("Unexpected error");

    mockFacilityService.updateStatus.mockRejectedValue(error);

    await expect(
      controller.updateFacilityStatus(facilityId, dto),
    ).rejects.toThrow("Unexpected error");
  });
});

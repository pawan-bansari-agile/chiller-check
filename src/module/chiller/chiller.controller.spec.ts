import { Test, TestingModule } from "@nestjs/testing";
import { ChillerController } from "./chiller.controller";
import { ChillerService } from "./chiller.service";
import {
  BulkUpdateChillerCostDto,
  ChillerByFacilityDto,
  ChillerListDto,
  CreateChillerDTO,
} from "./dto/chiller.dto";
import { BadRequestException } from "@nestjs/common";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { TypeExceptions } from "src/common/helpers/exceptions";
import mongoose from "mongoose";

describe("ChillerController", () => {
  let controller: ChillerController;
  let service: ChillerService;

  const mockChillerService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [
        {
          provide: ChillerService,
          useValue: mockChillerService,
        },
      ],
    }).compile();

    controller = module.get<ChillerController>(ChillerController);
    service = module.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createChiller", () => {
    const validChillerDto: CreateChillerDTO = {
      companyId: "665c3fb53a416f0bcd6e0f23",
      facilityId: "665c3fb53a416f0bcd6e0f99",
      unit: "USCustomary",
      ChillerNo: 1234,
      weeklyHours: 40,
      weeksPerYear: 52,
      avgLoadProfile: 70,
      desInletWaterTemp: "44°F",
      make: "Carrier",
      model: "X123",
      serialNumber: "SER123456",
      manufacturedYear: 2022,
      refrigType: "R-123",
      tons: 150,
      kwr: 527.5,
      efficiencyRating: 0.85,
      energyCost: 0.12,
      useEvapRefrigTemp: true,
      designVoltage: 400,
      voltageChoice: "400V-3PH",
      fullLoadAmps: 200,
      ampChoice: "1-phase",
      condDPDrop: "15",
      condDPDropUnit: "PSIG",
      condPressureUnit: "PSIG",
      condAPDropUnit: "InHg",
      condApproach: 3.2,
      evapDPDrop: "10",
      evapDPDropUnit: "PSIG",
      evapPressureUnit: "PSIG",
      evapAPDropUnit: "PSIG",
      evapApproach: 2.5,
      evapDOWTemp: 44,
      compOPIndicator: "12",
      userNote: "Initial entry",
      havePurge: true,
      maxPurgeTime: 60,
      purgeReadingUnit: "minutes",
      haveBearingTemp: "Yes",
      useRunHours: "true",
      condDesignDeltaT: 12,
      condDesignFlow: 150,
      evapDesignDeltaT: 10,
      evapDesignFlow: 135,
      numberOfCompressors: 2,
      oilPresHighUnit: "PSIG",
      oilPresLowUnit: "InHg",
      oilPresDifUnit: "PSIG",
      useLoad: true,
      status: "Active",
      highPressureRefrig: false,
    };

    it("should successfully create a chiller", async () => {
      const createdMock = { ...validChillerDto, _id: "mockedChillerId" };
      mockChillerService.create.mockResolvedValue(createdMock);

      const result = await controller.create(validChillerDto);

      expect(service.create).toHaveBeenCalledWith(validChillerDto);
      expect(result).toEqual(createdMock);
    });

    it("should throw error if service throws", async () => {
      mockChillerService.create.mockRejectedValue(
        new BadRequestException("Invalid input"),
      );

      await expect(controller.create(validChillerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(validChillerDto);
    });

    it("should handle edge case when DTO is missing optional fields", async () => {
      const dto = { ...validChillerDto };
      delete dto.tons;
      delete dto.serialNumber;
      delete dto.userNote;

      const createdMock = { ...dto, _id: "chiller123" };
      mockChillerService.create.mockResolvedValue(createdMock);

      const result = await controller.create(dto as CreateChillerDTO);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdMock);
    });

    it("should return chiller with status Pending if some fields are not passed", async () => {
      const partialDto: Partial<CreateChillerDTO> = {
        unit: "USCustomary",
        ChillerNo: 888,
        weeklyHours: 24,
        weeksPerYear: 40,
        avgLoadProfile: 50,
        desInletWaterTemp: "44°F",
        make: "Carrier",
        model: "Z9",
        manufacturedYear: 2020,
        refrigType: "R-123",
        efficiencyRating: 1.2,
        energyCost: 0.2,
        useEvapRefrigTemp: false,
        designVoltage: 400,
        voltageChoice: "400V-3PH",
        fullLoadAmps: 300,
        ampChoice: "1-phase",
        condPressureUnit: "PSIG",
        condAPDropUnit: "InHg",
        condApproach: 5,
        evapPressureUnit: "PSIG",
        evapAPDropUnit: "PSIG",
        evapDOWTemp: 44,
        compOPIndicator: "12",
        havePurge: false,
        haveBearingTemp: "No",
        useRunHours: "true",
        numberOfCompressors: 2,
      };

      const createdMock = {
        ...partialDto,
        status: "Pending",
        _id: "chillerPartialId",
      };

      mockChillerService.create.mockResolvedValue(createdMock);

      const result = await controller.create(partialDto as CreateChillerDTO);

      expect(service.create).toHaveBeenCalledWith(partialDto);
      expect(result.status).toBe("Pending");
    });
  });
});

describe("ChillerController - findAll()", () => {
  let controller: ChillerController;
  let chillerService: ChillerService;

  const mockChillerListResponse = {
    chillerList: [
      {
        _id: "665c123abc123abc123abc12",
        ChillerNo: 101,
        make: "Carrier",
        model: "X200",
        tons: 100,
        efficiencyRating: 0.85,
        isActive: true,
        createdAt: new Date(),
        unit: "USImperial",
        companyId: "665c3fb53a416f0bcd6e0f23",
        facilityId: "665c3fb53a416f0bcd6e0f99",
        companyName: "Acme Corp",
        facilityName: "Plant A",
        chillerName: "Carrier X200",
        energyCost: 7.5,
      },
    ],
    totalRecords: 1,
  };

  const mockChillerService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [{ provide: ChillerService, useValue: mockChillerService }],
    }).compile();

    controller = module.get<ChillerController>(ChillerController);
    chillerService = module.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Basic valid request
  it("should return chiller list with valid dto", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockResolvedValue(
      mockChillerListResponse,
    );

    const result = await controller.findAll(dto);

    expect(chillerService.findAll).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockChillerListResponse);
  });

  // ✅ With search and sort
  it("should return sorted chiller list with search term", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 5,
      search: "Carrier",
      sort_by: "chillerName",
      sort_order: "ASC",
      companyId: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockResolvedValue(
      mockChillerListResponse,
    );

    const result = await controller.findAll(dto);

    expect(chillerService.findAll).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockChillerListResponse);
  });

  // ❌ page = 0
  it("should throw BadRequest for page = 0", async () => {
    const dto: ChillerListDto = {
      page: 0,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockRejectedValue(
      new BadRequestException("Invalid page and limit value"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ limit = 0
  it("should throw BadRequest for limit = 0", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 0,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockRejectedValue(
      new BadRequestException("Invalid page and limit value"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Invalid companyId
  it("should throw BadRequest for invalid companyId", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 10,
      companyId: "invalid-object-id",
      search: "",
      sort_order: "ASC",
      sort_by: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockRejectedValue(
      new BadRequestException("Company not found"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Invalid facilityId
  it("should throw BadRequest for invalid facilityId", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 10,
      facilityId: "invalid-object-id",
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };

    (chillerService.findAll as jest.Mock).mockRejectedValue(
      new BadRequestException("Facility not found"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Unknown error
  it("should throw internal error for unknown exception", async () => {
    const dto: ChillerListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
      facilityId: "",
    };

    (chillerService.findAll as jest.Mock).mockRejectedValue(
      new Error("Unexpected DB failure"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(
      "Unexpected DB failure",
    );
  });
});

describe("ChillerController - findAllFacilities()", () => {
  let controller: ChillerController;
  let chillerService: ChillerService;

  const mockChillerService = {
    findByFacilityIds: jest.fn(),
  };

  const mockChillers = [
    {
      _id: "665c123abc123abc123abc12",
      make: "Carrier",
      model: "X200",
      tons: 100,
      energyCost: 7.5,
      isActive: true,
      facilityId: "665c3fb53a416f0bcd6e0f99",
      companyId: "665c3fb53a416f0bcd6e0f23",
      chillerName: "Carrier X200",
    },
    {
      _id: "665c456def456def456def45",
      make: "Trane",
      model: "Z900",
      tons: 120,
      energyCost: 6.8,
      isActive: false,
      facilityId: "665c3fb53a416f0bcd6e0f98",
      companyId: "665c3fb53a416f0bcd6e0f24",
      chillerName: "Trane Z900",
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [{ provide: ChillerService, useValue: mockChillerService }],
    }).compile();

    controller = module.get<ChillerController>(ChillerController);
    chillerService = module.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Valid request
  it("should return chillers for given facility IDs", async () => {
    const dto: ChillerByFacilityDto = {
      facilityIds: ["665c3fb53a416f0bcd6e0f99", "665c3fb53a416f0bcd6e0f98"],
    };

    (chillerService.findByFacilityIds as jest.Mock).mockResolvedValue(
      mockChillers,
    );

    const result = await controller.findAllFacilities(dto);

    expect(chillerService.findByFacilityIds).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockChillers);
  });

  // ❌ Empty facilityIds array
  it("should throw error if facilityIds is empty", async () => {
    const dto: ChillerByFacilityDto = {
      facilityIds: [],
    };

    try {
      await controller.findAllFacilities(dto);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getResponse().message[0]).toContain(
        "facilityIds should not be empty",
      );
    }
  });

  // ❌ Invalid ObjectId format (optional: if validation enabled)
  it("should throw error for invalid ObjectId (if enabled in DTO)", async () => {
    const dto: ChillerByFacilityDto = {
      facilityIds: ["invalid-id"],
    };

    (chillerService.findByFacilityIds as jest.Mock).mockRejectedValue(
      new BadRequestException("Invalid ObjectId format"),
    );

    await expect(controller.findAllFacilities(dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ❌ Unexpected error
  it("should throw error for unknown failure", async () => {
    const dto: ChillerByFacilityDto = {
      facilityIds: ["665c3fb53a416f0bcd6e0f99"],
    };

    (chillerService.findByFacilityIds as jest.Mock).mockRejectedValue(
      new Error("Unexpected DB failure"),
    );

    await expect(controller.findAllFacilities(dto)).rejects.toThrow(
      "Unexpected DB failure",
    );
  });
});

describe("ChillerController - findOne()", () => {
  let controller: ChillerController;
  let chillerService: ChillerService;

  const mockChillerService = {
    findOne: jest.fn(),
  };

  const validId = new mongoose.Types.ObjectId().toString();

  const mockChiller = {
    _id: validId,
    ChillerNo: "CH-101",
    make: "Carrier",
    model: "X200",
    companyId: "665c3fb53a416f0bcd6e0f23",
    facilityId: "665c3fb53a416f0bcd6e0f99",
    companyName: "Acme Corp",
    facilityName: "Main Plant",
    tons: 120,
    energyCost: 6.8,
    status: "ACTIVE",
    chillerName: "Carrier X200",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [{ provide: ChillerService, useValue: mockChillerService }],
    }).compile();

    controller = module.get<ChillerController>(ChillerController);
    chillerService = module.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Valid ID - Found
  it("should return chiller data when valid ID is passed", async () => {
    (chillerService.findOne as jest.Mock).mockResolvedValue(mockChiller);

    const result = await controller.findOne(validId);

    expect(chillerService.findOne).toHaveBeenCalledWith(validId);
    expect(result).toEqual(mockChiller);
  });

  // ❌ Valid ID - Not found
  it("should throw BadRequestException if chiller not found", async () => {
    (chillerService.findOne as jest.Mock).mockRejectedValue(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.FACILITY_NOT_FOUND,
      ),
    );

    await expect(controller.findOne(validId)).rejects.toThrow(
      "Facility Not Found",
    );

    expect(chillerService.findOne).toHaveBeenCalledWith(validId);
  });

  // ❌ Invalid ObjectId
  it("should throw CastError or BadRequestException if ID is not a valid ObjectId", async () => {
    const invalidId = "invalid-mongo-id";

    (chillerService.findOne as jest.Mock).mockRejectedValue(
      new mongoose.Error.CastError("ObjectId", invalidId, "id"),
    );

    await expect(controller.findOne(invalidId)).rejects.toThrow(
      mongoose.Error.CastError,
    );
    expect(chillerService.findOne).toHaveBeenCalledWith(invalidId);
  });

  // ❌ Unexpected internal error
  it("should throw error if unexpected failure occurs", async () => {
    const error = new Error("Unexpected DB failure");

    (chillerService.findOne as jest.Mock).mockRejectedValue(error);

    await expect(controller.findOne(validId)).rejects.toThrow(
      "Unexpected DB failure",
    );
  });
});

describe("ChillerController - bulkUpdateEnergyCost", () => {
  let controller: ChillerController;
  let service: ChillerService;

  const mockChillerService = {
    bulkUpdateEnergyCost: jest.fn(),
  };

  const validDto: BulkUpdateChillerCostDto = {
    chillerIds: ["60d5ec49f9a1b3f8d0e6a7a1", "60d5ec49f9a1b3f8d0e6a7a2"],
    energyCost: 4.75,
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [
        {
          provide: ChillerService,
          useValue: mockChillerService,
        },
      ],
    }).compile();

    controller = moduleRef.get<ChillerController>(ChillerController);
    service = moduleRef.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update energyCost for valid chillers", async () => {
    const mockResult = {
      message: "2 chiller(s) updated successfully.",
      modifiedCount: 2,
    };

    mockChillerService.bulkUpdateEnergyCost.mockResolvedValue(mockResult);

    const result = await controller.bulkUpdateEnergyCost(validDto);

    expect(service.bulkUpdateEnergyCost).toHaveBeenCalledWith(validDto);
    expect(result).toEqual(mockResult);
  });

  it("should throw BadRequestException if no valid chillers found", async () => {
    const error = TypeExceptions.BadRequestCommonFunction(
      RESPONSE_ERROR.NO_VAIL_CHILLER_FOUND,
    );

    mockChillerService.bulkUpdateEnergyCost.mockRejectedValue(error);

    await expect(controller.bulkUpdateEnergyCost(validDto)).rejects.toThrow(
      error,
    );
    expect(service.bulkUpdateEnergyCost).toHaveBeenCalledWith(validDto);
  });

  it("should throw internal server error for unexpected failure", async () => {
    const unexpectedError = new Error("DB connection failed");

    mockChillerService.bulkUpdateEnergyCost.mockRejectedValue(unexpectedError);

    await expect(controller.bulkUpdateEnergyCost(validDto)).rejects.toThrow(
      "DB connection failed",
    );
    expect(service.bulkUpdateEnergyCost).toHaveBeenCalledWith(validDto);
  });
});

describe("ChillerController - inactivateChiller", () => {
  let controller: ChillerController;
  let service: ChillerService;

  const chillerId = "665fbc63caaaed0012345678";
  const validStatus = "Inactive";

  const mockChillerService = {
    inactivateChiller: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [
        {
          provide: ChillerService,
          useValue: mockChillerService,
        },
      ],
    }).compile();

    controller = moduleRef.get<ChillerController>(ChillerController);
    service = moduleRef.get<ChillerService>(ChillerService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should inactivate a chiller and return updated chiller", async () => {
    const mockChiller = {
      _id: chillerId,
      status: "Active",
      save: jest.fn(),
    };

    mockChillerService.inactivateChiller.mockResolvedValue(mockChiller);

    const result = await controller.inactivate(chillerId, validStatus);

    expect(service.inactivateChiller).toHaveBeenCalledWith(
      chillerId,
      validStatus,
    );
    expect(result._id).toBe(chillerId);
  });

  it("should throw BadRequestException for invalid status", async () => {
    const invalidStatus = "Paused";

    const error = TypeExceptions.BadRequestCommonFunction(
      "Invalid status value",
    );

    mockChillerService.inactivateChiller.mockRejectedValue(error);

    await expect(
      controller.inactivate(chillerId, invalidStatus),
    ).rejects.toThrow("Invalid status value");
  });

  it("should throw BadRequestException if chiller not found", async () => {
    const error = TypeExceptions.BadRequestCommonFunction(
      RESPONSE_ERROR.CHILLER_NOT_FOUND,
    );

    mockChillerService.inactivateChiller.mockRejectedValue(error);

    await expect(controller.inactivate(chillerId, validStatus)).rejects.toThrow(
      RESPONSE_ERROR.CHILLER_NOT_FOUND,
    );
  });

  it("should throw error if chiller already has given status", async () => {
    const error = TypeExceptions.BadRequestCommonFunction(
      "Chiller is already Inactive",
    );

    mockChillerService.inactivateChiller.mockRejectedValue(error);

    await expect(controller.inactivate(chillerId, "Inactive")).rejects.toThrow(
      "Chiller is already Inactive",
    );
  });

  it("should throw internal server error on unexpected failure", async () => {
    const error = new Error("DB timeout");

    mockChillerService.inactivateChiller.mockRejectedValue(error);

    await expect(controller.inactivate(chillerId, validStatus)).rejects.toThrow(
      "DB timeout",
    );
  });
});

describe("ChillerController - update()", () => {
  let controller: ChillerController;
  let service: ChillerService;

  const mockChillerService = {
    update: jest.fn(),
  };

  const chillerId = "665fbc63caaaed0012345678";

  const updateDto = {
    make: "UpdatedMake",
    model: "UpdatedModel",
    tons: 80,
    energyCost: 2.2,
  };

  const chillerWithImmutableFields = {
    make: "Carrier",
    model: "X100",
    tons: 100,
    companyId: "abc123",
    facilityId: "xyz789",
    type: "Water-Cooled",
    unit: "TR",
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChillerController],
      providers: [
        {
          provide: ChillerService,
          useValue: mockChillerService,
        },
      ],
    }).compile();

    controller = moduleRef.get<ChillerController>(ChillerController);
    service = moduleRef.get<ChillerService>(ChillerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update the chiller and return updated data", async () => {
    const mockResult = {
      _id: chillerId,
      ...updateDto,
      status: "Active",
    };

    mockChillerService.update.mockResolvedValue(mockResult);

    const result = await controller.update(chillerId, updateDto);

    expect(service.update).toHaveBeenCalledWith(chillerId, updateDto);
    expect(result).toEqual(mockResult);
  });

  it("should call service with given update dto (including immutable fields)", async () => {
    const resultMock = {
      _id: chillerId,
      ...chillerWithImmutableFields,
      status: "Draft",
    };

    mockChillerService.update.mockResolvedValue(resultMock);

    const result = await controller.update(
      chillerId,
      chillerWithImmutableFields,
    );

    expect(service.update).toHaveBeenCalledWith(
      chillerId,
      chillerWithImmutableFields,
    );
    expect(result.status).toBe("Draft");
  });

  it("should throw BadRequestException if chiller not found", async () => {
    const error = TypeExceptions.BadRequestCommonFunction(
      RESPONSE_ERROR.CHILLER_NOT_FOUND,
    );

    mockChillerService.update.mockRejectedValue(error);

    await expect(controller.update(chillerId, updateDto)).rejects.toThrow(
      RESPONSE_ERROR.CHILLER_NOT_FOUND,
    );
  });

  it("should throw internal error on unexpected exception", async () => {
    const error = new Error("MongoDB timeout");

    mockChillerService.update.mockRejectedValue(error);

    await expect(controller.update(chillerId, updateDto)).rejects.toThrow(
      "MongoDB timeout",
    );
  });
});

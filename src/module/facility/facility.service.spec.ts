/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { FacilityService } from "./facility.service";
import { getModelToken } from "@nestjs/mongoose";
import {
  CreateFacilityDTO,
  FacilityListDto,
  UpdateFacilityDto,
  UpdateFacilityStatusDto,
} from "./dto/facility.dto";
import * as mongoose from "mongoose";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";

describe("FacilityService - create()", () => {
  let service: FacilityService;

  const mockFacilityModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockCompanyModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockChillerModel = {
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityService,
        {
          provide: getModelToken("Facility"),
          useValue: mockFacilityModel,
        },
        {
          provide: getModelToken("Company"),
          useValue: mockCompanyModel,
        },
        {
          provide: getModelToken("Chiller"),
          useValue: mockChillerModel,
        },
      ],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw if company does not exist", async () => {
    mockCompanyModel.findById.mockResolvedValue(null);

    const dto: CreateFacilityDTO = {
      name: "Facility A",
      companyId: new mongoose.Types.ObjectId().toHexString(),
      timezone: "Asia/Kolkata",
      altitude: 100,
      altitudeUnit: "METER",
    };

    await expect(service.create(dto)).rejects.toThrow(
      RESPONSE_ERROR.COMPANY_NOT_FOUND,
    );
  });

  it("should throw if facility with same name exists in the company", async () => {
    const companyId = new mongoose.Types.ObjectId().toHexString();

    mockCompanyModel.findById.mockResolvedValue({ _id: companyId });
    mockFacilityModel.findOne.mockResolvedValue({ name: "Facility A" });

    const dto: CreateFacilityDTO = {
      name: "Facility A",
      companyId,
      timezone: "Asia/Kolkata",
      altitude: 100,
      altitudeUnit: "METER",
    };

    await expect(service.create(dto)).rejects.toThrow(
      RESPONSE_ERROR.FACILITY_ALREADY_EXISTS,
    );
  });

  it("should create a facility without chillers", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const facilityId = new mongoose.Types.ObjectId();

    const createdFacility = {
      _id: facilityId,
      save: jest.fn(),
    };

    mockCompanyModel.findById.mockResolvedValue({ _id: companyId });
    mockFacilityModel.findOne.mockResolvedValue(null);
    mockFacilityModel.create.mockResolvedValue(createdFacility);
    mockChillerModel.countDocuments.mockResolvedValue(0);
    mockCompanyModel.updateOne.mockResolvedValue({});
    mockFacilityModel.findById.mockResolvedValue(createdFacility);

    const dto: CreateFacilityDTO = {
      name: "Facility A",
      companyId: companyId.toHexString(),
      timezone: "Asia/Kolkata",
      altitude: 100,
      altitudeUnit: "METER",
    };

    const result = await service.create(dto);
    expect(result).toEqual(createdFacility);
  });

  it("should create a facility with chillers and update chiller counts", async () => {
    const companyId = new mongoose.Types.ObjectId();
    const facilityId = new mongoose.Types.ObjectId();

    const chiller = {
      _id: new mongoose.Types.ObjectId(),
      save: jest.fn(),
    };

    const createdFacility = {
      _id: facilityId,
      chillers: [],
      save: jest.fn(),
    };

    mockCompanyModel.findById.mockResolvedValue({ _id: companyId });
    mockFacilityModel.findOne.mockResolvedValue(null);
    mockFacilityModel.create.mockResolvedValue(createdFacility);
    mockChillerModel.create.mockResolvedValue([chiller]);
    mockChillerModel.countDocuments.mockResolvedValue(1);
    mockFacilityModel.updateOne.mockResolvedValue({});
    mockCompanyModel.updateOne.mockResolvedValue({});
    mockFacilityModel.findById.mockResolvedValue(createdFacility);

    const dto: CreateFacilityDTO = {
      name: "Facility A",
      companyId: companyId.toHexString(),
      timezone: "Asia/Kolkata",
      altitude: 100,
      altitudeUnit: "METER",
      chillers: [
        {
          name: "Chiller 1",
          model: "X100",
          unit: "TR",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "asdf",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
      ],
    };

    const result = await service.create(dto);
    expect(result).toEqual(createdFacility);
    expect(mockFacilityModel.create).toHaveBeenCalled();
    expect(mockChillerModel.create).toHaveBeenCalled();
    expect(mockCompanyModel.updateOne).toHaveBeenCalled();
  });
});

describe("FacilityService - findAll()", () => {
  let service: FacilityService;

  const mockFacilityModel = {
    aggregate: jest.fn(),
  };

  const mockChillerModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCompanyModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityService,
        {
          provide: getModelToken("Facility"),
          useValue: mockFacilityModel,
        },
        {
          provide: getModelToken("Chiller"),
          useValue: mockChillerModel,
        },
        {
          provide: getModelToken("Company"),
          useValue: mockCompanyModel,
        },
      ],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = {} as any;

  it("should throw if page or limit is invalid", async () => {
    const body: FacilityListDto = {
      page: 0,
      limit: -1,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };

    await expect(service.findAll(mockRequest, body)).rejects.toThrow(
      RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
    );
  });

  it("should throw if companyId is invalid", async () => {
    const body: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "648b0e1e8e7a1e54d2c7bccc",
    };
    // const invalidCompanyId = "648b0e1e8e7a1e54d2c7bccc";

    mockCompanyModel.findById.mockResolvedValue(null);

    await expect(service.findAll(mockRequest, body)).rejects.toThrow(
      RESPONSE_ERROR.COMPANY_NOT_FOUND,
    );
  });

  it("should return facilities without filters", async () => {
    const body: FacilityListDto = {
      page: 1,
      limit: 10,
      sort_by: "createdAt",
      search: "",
      sort_order: "ASC",
      companyId: "",
    };

    const mockResponse = [
      {
        facilityList: [],
        totalRecords: [],
      },
    ];

    mockFacilityModel.aggregate.mockResolvedValue(mockResponse);

    const result = await service.findAll(mockRequest, body);
    expect(result).toEqual({
      facilityList: [],
      totalRecords: 0,
    });
  });

  it("should apply search and return filtered results", async () => {
    const body: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "test-facility",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };

    const mockResponse = [
      {
        facilityList: [
          {
            name: "Test Facility",
          },
        ],
        totalRecords: [{ count: 1 }],
      },
    ];

    mockFacilityModel.aggregate.mockResolvedValue(mockResponse);

    const result = await service.findAll(mockRequest, body);
    expect(result).toEqual({
      facilityList: [
        {
          name: "Test Facility",
        },
      ],
      totalRecords: 1,
    });

    expect(mockFacilityModel.aggregate).toHaveBeenCalled();
  });

  it("should include companyId filter when provided", async () => {
    const body: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "648b0e1e8e7a1e54d2c7bccc",
    };

    const companyId = "648b0e1e8e7a1e54d2c7bccc";

    mockCompanyModel.findById.mockResolvedValue({ _id: companyId });
    mockFacilityModel.aggregate.mockResolvedValue([
      {
        facilityList: [],
        totalRecords: [{ count: 2 }],
      },
    ]);

    const result = await service.findAll(mockRequest, body);

    expect(mockCompanyModel.findById).toHaveBeenCalledWith(companyId);
    expect(result).toEqual({
      facilityList: [],
      totalRecords: 2,
    });
  });

  it("should throw BadRequestException for unexpected errors", async () => {
    const body: FacilityListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_order: "ASC",
      sort_by: "",
      companyId: "",
    };

    mockFacilityModel.aggregate.mockRejectedValue(
      new Error("An unexpected error occurred"),
    );

    await expect(service.findAll(mockRequest, body)).rejects.toThrow(
      "An unexpected error occurred",
    );
  });
});

describe("FacilityService - findOne()", () => {
  let service: FacilityService;

  const mockFacilityModel = {
    aggregate: jest.fn(),
  };

  const mockChillerModel = {};
  const mockCompanyModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityService,
        {
          provide: getModelToken("Facility"),
          useValue: mockFacilityModel,
        },
        {
          provide: getModelToken("Chiller"),
          useValue: mockChillerModel,
        },
        {
          provide: getModelToken("Company"),
          useValue: mockCompanyModel,
        },
      ],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validFacilityId = new mongoose.Types.ObjectId().toHexString();

  it("should return the facility with populated chillers", async () => {
    const mockFacility = {
      _id: validFacilityId,
      name: "Test Facility",
      chillers: [{ name: "Chiller 1" }],
    };

    mockFacilityModel.aggregate.mockResolvedValue([mockFacility]);

    const result = await service.findOne(validFacilityId);

    expect(mockFacilityModel.aggregate).toHaveBeenCalled();
    expect(result).toEqual(mockFacility);
  });

  it("should throw if the facility is not found", async () => {
    mockFacilityModel.aggregate.mockResolvedValue([]);

    await expect(service.findOne(validFacilityId)).rejects.toThrow(
      RESPONSE_ERROR.FACILITY_NOT_FOUND,
    );
  });

  it("should throw unexpected error if ObjectId is invalid", async () => {
    const invalidId = "invalid-object-id";

    await expect(service.findOne(invalidId)).rejects.toThrow(
      "input must be a 24 character hex string, 12 byte Uint8Array, or an integer",
    );
  });
});

// describe('FacilityService - update()', () => {
//   let service: FacilityService;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   let facilityModel: any;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         FacilityService,
//         {
//           provide: getModelToken('Facility'),
//           useValue: {
//             findById: jest.fn(),
//             findByIdAndUpdate: jest.fn(),
//           },
//         },
//         {
//           provide: getModelToken('Company'),
//           useValue: {},
//         },
//         {
//           provide: getModelToken('Chiller'),
//           useValue: {},
//         },
//       ],
//     }).compile();

//     service = module.get<FacilityService>(FacilityService);
//     facilityModel = module.get(getModelToken('Facility'));
//   });

//   it('should update the facility successfully', async () => {
//     const id = '64b2b8c8e4a54d5d89d723af';
//     const dto: UpdateFacilityDto = {
//       name: 'Updated Facility',
//       timezone: 'UTC',
//       altitude: 0,
//       altitudeUnit: '',
//     };

//     const existingFacility = {
//       _id: id,
//       isDeleted: false,
//     };

//     const updatedFacility = {
//       _id: id,
//       name: 'Updated Facility',
//       timezone: 'UTC',
//       altitude: 0,
//     };

//     facilityModel.findById.mockResolvedValue(existingFacility);
//     facilityModel.findByIdAndUpdate.mockResolvedValue(updatedFacility);

//     const result = await service.update(id, dto);

//     expect(facilityModel.findById).toHaveBeenCalledWith(id);
//     expect(facilityModel.findByIdAndUpdate).toHaveBeenCalledWith(
//       id,
//       { name: 'Updated Facility', timezone: 'UTC', altitude: 0 },
//       { new: true }
//     );
//     expect(result).toEqual(updatedFacility);
//   });

//   it('should throw if facility is not found', async () => {
//     const id = '64b2b8c8e4a54d5d89d723af';
//     const dto: UpdateFacilityDto = {
//       name: 'New Name',
//       timezone: '',
//       altitude: 0,
//       altitudeUnit: '',
//     };

//     facilityModel.findById.mockResolvedValue(null);

//     await expect(service.update(id, dto)).rejects.toThrow('Facility Not Found');
//   });

//   it('should throw if facility is deleted', async () => {
//     const id = '64b2b8c8e4a54d5d89d723af';
//     const dto: UpdateFacilityDto = {
//       name: 'New Name',
//       timezone: '',
//       altitude: 0,
//       altitudeUnit: '',
//     };

//     facilityModel.findById.mockResolvedValue({ isDeleted: true });

//     await expect(service.update(id, dto)).rejects.toThrow('Facility Not Found');
//   });

//   it('should skip empty/undefined fields in DTO', async () => {
//     const id = '64b2b8c8e4a54d5d89d723af';
//     const dto: UpdateFacilityDto = {
//       name: 'Facility A',
//       city: '',
//       state: 'Texas',
//       timezone: '',
//       altitude: 0,
//       altitudeUnit: '',
//     };

//     const existingFacility = {
//       _id: id,
//       isDeleted: false,
//     };

//     const updatedFacility = {
//       _id: id,
//       name: 'Facility A',
//       state: 'Texas',
//       altitude: 0,
//     };

//     facilityModel.findById.mockResolvedValue(existingFacility);
//     facilityModel.findByIdAndUpdate.mockResolvedValue(updatedFacility);

//     const result = await service.update(id, dto);

//     expect(facilityModel.findByIdAndUpdate).toHaveBeenCalledWith(
//       id,
//       { name: 'Facility A', state: 'Texas', altitude: 0 },
//       { new: true }
//     );
//     expect(result).toEqual(updatedFacility);
//   });
// });

describe("FacilityService - update()", () => {
  let service: FacilityService;
  let facilityModel: any;
  let chillerModel: any;

  const mockFacilityId = "64b2b8c8e4a54d5d89d723af";
  const mockObjectId = new mongoose.Types.ObjectId(mockFacilityId);
  const mockCompanyId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityService,
        {
          provide: getModelToken("Facility"),
          useValue: {
            findOne: jest.fn(),
            updateOne: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken("Chiller"),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken("Company"),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
    facilityModel = module.get(getModelToken("Facility"));
    chillerModel = module.get(getModelToken("Chiller"));
  });

  it("should update the facility and return aggregated result", async () => {
    const dto: UpdateFacilityDto = {
      name: "Updated Facility",
      timezone: "UTC",
      altitude: 0,
      altitudeUnit: "",
    };

    const existingFacility = {
      _id: mockObjectId,
      isDeleted: false,
      companyId: mockCompanyId,
      chillers: [],
      save: jest.fn(),
    };

    const aggregationResult = [
      {
        _id: mockObjectId,
        name: "Updated Facility",
        timezone: "UTC",
      },
    ];

    facilityModel.findOne.mockResolvedValueOnce(existingFacility); // facility lookup
    facilityModel.findOne.mockResolvedValueOnce(null); // duplicate check
    facilityModel.updateOne.mockResolvedValue({});
    facilityModel.aggregate.mockResolvedValue(aggregationResult);

    const result = await service.update(mockFacilityId, dto);

    expect(facilityModel.findOne).toHaveBeenCalledTimes(2);
    expect(facilityModel.updateOne).toHaveBeenCalledWith(
      { _id: mockObjectId },
      { $set: { name: "Updated Facility", timezone: "UTC", altitude: 0 } },
    );
    expect(result).toEqual(aggregationResult[0]);
  });

  it("should throw if facility not found", async () => {
    facilityModel.findOne.mockResolvedValueOnce(null);

    await expect(
      service.update(mockFacilityId, {
        name: "X",
        timezone: "",
        altitude: 0,
        altitudeUnit: "",
      }),
    ).rejects.toThrow("Facility Not Found");
  });

  it("should throw if duplicate facility name exists", async () => {
    const existingFacility = {
      _id: mockObjectId,
      isDeleted: false,
      companyId: mockCompanyId,
    };

    facilityModel.findOne
      .mockResolvedValueOnce(existingFacility) // facility exists
      .mockResolvedValueOnce({}); // duplicate name exists

    await expect(
      service.update(mockFacilityId, {
        name: "Duplicate Name",
        timezone: "",
        altitude: 0,
        altitudeUnit: "",
      }),
    ).rejects.toThrow("Facility with the same already exists!");
  });

  it("should throw for duplicate chiller names in payload", async () => {
    const dto: UpdateFacilityDto = {
      chillers: [
        {
          name: "Chiller A",
          unit: "",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "asdf",
          model: "",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
        {
          name: "Chiller A",
          unit: "",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "asdf",
          model: "",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
      ],
      name: "",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    };

    const existingFacility = {
      _id: mockObjectId,
      companyId: mockCompanyId,
      chillers: [],
      isDeleted: false,
    };

    facilityModel.findOne.mockResolvedValueOnce(existingFacility);
    facilityModel.findOne.mockResolvedValueOnce(null); // name duplicate check
    facilityModel.updateOne.mockResolvedValue({});

    await expect(service.update(mockFacilityId, dto)).rejects.toThrow(
      "Duplicate chiller names in payload",
    );
  });

  it("should throw if chiller with same name already exists", async () => {
    const dto: UpdateFacilityDto = {
      chillers: [
        {
          name: "Chiller X",
          unit: "",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "asdf",
          model: "",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
      ],
      name: "",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    };

    const existingFacility = {
      _id: mockObjectId,
      companyId: mockCompanyId,
      chillers: [],
      isDeleted: false,
      save: jest.fn(),
    };

    facilityModel.findOne.mockResolvedValueOnce(existingFacility);
    facilityModel.findOne.mockResolvedValueOnce(null); // duplicate name check
    facilityModel.updateOne.mockResolvedValue({});
    chillerModel.find.mockResolvedValueOnce([{ name: "Chiller X" }]);

    await expect(service.update(mockFacilityId, dto)).rejects.toThrow(
      "Duplicate chiller names in payload",
    );
  });

  it("should create chillers and update facility", async () => {
    const dto: UpdateFacilityDto = {
      chillers: [
        {
          name: "Chiller A",
          unit: "",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "asdf",
          model: "",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
        {
          name: "Chiller B",
          unit: "",
          weeklyHours: 0,
          weeksPerYear: 0,
          avgLoadProfile: 0,
          make: "Asdf",
          model: "",
          serialNumber: "asdf",
          manufacturedYear: 0,
          refrigType: "",
          tons: 0,
          energyCost: 0,
          kwr: 0,
        },
      ],
      name: "",
      timezone: "",
      altitude: 0,
      altitudeUnit: "",
    };

    const existingFacility = {
      _id: mockObjectId,
      companyId: mockCompanyId,
      chillers: [],
      isDeleted: false,
      save: jest.fn(),
    };

    facilityModel.findOne.mockResolvedValueOnce(existingFacility); // get facility
    facilityModel.findOne.mockResolvedValueOnce(null); // check duplicate name
    facilityModel.updateOne.mockResolvedValue({});
    chillerModel.find.mockResolvedValueOnce([]);
    const mockChillers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Chiller A",
        save: jest.fn(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Chiller B",
        save: jest.fn(),
      },
    ];
    chillerModel.create.mockResolvedValue(mockChillers);
    facilityModel.aggregate.mockResolvedValue([
      { name: "Updated with Chillers" },
    ]);

    const result = await service.update(mockFacilityId, dto);

    expect(chillerModel.create).toHaveBeenCalled();
    expect(result).toEqual({ name: "Updated with Chillers" });
  });
});

describe("FacilityService - updateStatus()", () => {
  let service: FacilityService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facilityModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chillerModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityService,
        {
          provide: getModelToken("Facility"),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken("Chiller"),
          useValue: {
            updateMany: jest.fn(),
          },
        },
        {
          provide: getModelToken("Company"),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
    facilityModel = module.get(getModelToken("Facility"));
    chillerModel = module.get(getModelToken("Chiller"));
  });

  it("should activate the facility successfully", async () => {
    const facilityId = "64b2b8c8e4a54d5d89d723af";
    const body = { isActive: true };

    const facility = {
      _id: facilityId,
      isActive: false,
      save: jest.fn(),
    };

    facilityModel.findById.mockResolvedValue(facility);

    const result = await service.updateStatus(facilityId, body);

    expect(facilityModel.findById).toHaveBeenCalledWith(facilityId);
    expect(facility.isActive).toBe(true);
    expect(facility.save).toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      message: RESPONSE_SUCCESS.FACILITY_ACTIVATED,
      data: {},
    });
  });

  it("should deactivate facility and all associated chillers", async () => {
    const facilityId = "64b2b8c8e4a54d5d89d723af";
    const chillerIds = ["chiller1", "chiller2"];
    const body = { isActive: false };

    const facility = {
      _id: facilityId,
      isActive: true,
      chillers: chillerIds,
      save: jest.fn(),
    };

    facilityModel.findById.mockResolvedValue(facility);
    chillerModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const result = await service.updateStatus(facilityId, body);

    expect(facilityModel.findById).toHaveBeenCalledWith(facilityId);
    expect(chillerModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: chillerIds } },
      { $set: { isActive: false } },
    );
    expect(facility.isActive).toBe(false);
    expect(facility.save).toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      message: RESPONSE_SUCCESS.FACILITY_DEACTIVATED, // match RESPONSE_SUCCESS.FACILITY_DEACTIVATED
      data: {},
    });
  });

  it("should throw error if facility is not found", async () => {
    const facilityId = "nonexistent";
    const body = { isActive: true };

    facilityModel.findById.mockResolvedValue(null);

    await expect(service.updateStatus(facilityId, body)).rejects.toThrow(
      "Facility Not Found",
    );
  });

  it("should throw error if isActive is not a boolean", async () => {
    const facilityId = "64b2b8c8e4a54d5d89d723af";
    const body = {
      isActive: "false",
    }; // Invalid

    const facility = {
      _id: facilityId,
      isActive: false,
      save: jest.fn(),
    };

    facilityModel.findById.mockResolvedValue(facility);

    await expect(
      service.updateStatus(
        facilityId,
        body as unknown as UpdateFacilityStatusDto,
      ),
    ).rejects.toThrow(RESPONSE_ERROR.INVALID_FACILITY_STATUS);
  });
});

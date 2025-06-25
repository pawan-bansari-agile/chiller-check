import { Test, TestingModule } from "@nestjs/testing";
import { CompanyService } from "./company.service";
import { getModelToken } from "@nestjs/mongoose";
import { Company } from "src/common/schema/company.schema";
import { Facility } from "src/common/schema/facility.schema";
import {
  // CustomError
  TypeExceptions,
} from "src/common/helpers/exceptions";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import {
  CompanyListDto,
  CreateCompanyDto,
  EditCompanyDto,
  UpdateCompanyStatusDto,
} from "./dto/company.dto";
import { Chiller } from "src/common/schema/chiller.schema";
import mongoose from "mongoose";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { CompanyStatus } from "src/common/constants/enum.constant";
const mockCompanyModel = {
  aggregate: jest.fn(),
};
describe("CompanyService", () => {
  let service: CompanyService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let companyModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facilityModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chillerModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getModelToken(Company.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            aggregate: jest.fn(),
            save: jest.fn().mockResolvedValue(true), // Add this to mock the save method
          },
          // useValue: companyModel,
        },
        {
          provide: getModelToken(Facility.name),
          useValue: {
            find: jest.fn().mockResolvedValueOnce([]),
            create: jest.fn().mockResolvedValueOnce([
              { _id: "facility-id-1", name: "Facility A" },
              { _id: "facility-id-2", name: "Facility B" },
            ]),
            save: jest.fn().mockResolvedValue(true), // Add this to mock the save method
          },
          // useValue: facilityModel,
        },
        {
          provide: getModelToken(Chiller.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn().mockResolvedValue(true), // Add this to mock the save method
          },
          // useValue: companyModel,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    companyModel = module.get(getModelToken(Company.name));
    facilityModel = module.get(getModelToken(Facility.name));
    chillerModel = module.get(getModelToken(Chiller.name));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(chillerModel).toBeDefined();
  });

  describe("create", () => {
    it("should throw error if the company already exists", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Existing Company",
        facilities: [],
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "",
        zipcode: "",
        website: "",
      };

      // companyModel.findOne = jest
      //   .fn()
      //   .mockResolvedValueOnce({ name: 'Existing Company' });
      companyModel.findOne.mockResolvedValueOnce({ name: "Existing Company" });

      await expect(service.create(createCompanyDto)).rejects.toThrowError(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_ALREADY_EXISTS,
        ),
      );
    });

    it("should throw error if there are duplicate facility names in the payload", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "New Company",
        facilities: [
          {
            name: "Facility A",
            timezone: "",
            altitude: 0,
            altitudeUnit: "",
          },
          {
            name: "Facility A",
            timezone: "",
            altitude: 0,
            altitudeUnit: "",
          }, // Duplicate name
        ],
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "",
        zipcode: "",
        website: "",
      };

      companyModel.findOne = jest.fn().mockResolvedValueOnce(null);

      await expect(service.create(createCompanyDto)).rejects.toThrowError(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
        ),
      );
    });

    it("should throw error if facilities have duplicates under the company", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "New Company",
        facilities: [
          {
            name: "Facility A",
            timezone: "",
            altitude: 0,
            altitudeUnit: "",
          },
        ],
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "",
        zipcode: "",
        website: "",
      };

      companyModel.findOne = jest.fn().mockResolvedValueOnce(null);
      companyModel.create = jest.fn().mockResolvedValueOnce({
        _id: "company-id",
        name: "New Company",
        save: jest.fn().mockResolvedValueOnce(true),
      });
      facilityModel.find = jest
        .fn()
        .mockResolvedValueOnce([
          { name: "Facility A", companyId: "company-id" },
        ]);

      await expect(service.create(createCompanyDto)).rejects.toThrowError(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
        ),
      );
    });
  });
  describe("findAll", () => {
    const mockRequest = { user: { id: "123" } } as never;

    it("should return paginated company list", async () => {
      const body: CompanyListDto = {
        limit: 10,
        page: 1,
        search: "",
        sort_by: "",
        sort_order: "DESC",
      };

      const mockAggregateResult = [
        {
          companyList: [],
          totalRecords: 0,
        },
      ];

      mockCompanyModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.findAll(mockRequest, body);
      expect(result).toEqual({
        companyList: [],
        totalRecords: 0,
      });
      // expect(mockCompanyModel.aggregate).toHaveBeenCalled();
    });
    it("should return search and sort company list", async () => {
      const body: CompanyListDto = {
        limit: 10,
        page: 1,
        search: "test",
        sort_by: "name",
        sort_order: "ASC",
      };

      const mockAggregateResult = [
        {
          companyList: [],
          totalRecords: 0,
        },
      ];

      mockCompanyModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.findAll(mockRequest, body);
      expect(result).toEqual({
        companyList: [],
        totalRecords: 0,
      });
      // expect(mockCompanyModel.aggregate).toHaveBeenCalled();
    });
  });
});

describe("CompanyService - findOne", () => {
  let service: CompanyService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let companyModel: any;

  beforeEach(async () => {
    companyModel = {
      aggregate: jest.fn(),
    };

    const facilityModel = {};
    const chillerModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getModelToken("Company"), useValue: companyModel },
        { provide: getModelToken("Facility"), useValue: facilityModel },
        { provide: getModelToken("Chiller"), useValue: chillerModel },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it("should return the company if found", async () => {
    const mockId = new mongoose.Types.ObjectId().toString();
    const mockCompany = {
      _id: mockId,
      name: "Test Co",
    };

    companyModel.aggregate.mockResolvedValue([mockCompany]);

    // const result = await service.findOne(mockId);

    const expectedPipeline = [
      {
        $match: {
          isDeleted: false,
          _id: new mongoose.Types.ObjectId(mockId),
        },
      },
      {
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "_id",
          foreignField: "companyId",
          as: "facilities",
        },
      },
      {
        $addFields: {
          totalOperators: 0,
        },
      },
      {
        $project: {
          name: 1,
          address: {
            $concat: [
              "$address1",
              ", ",
              "$address2",
              ", ",
              "$city",
              ", ",
              "$state",
              ", ",
              "$country",
            ],
          },
          companyCode: 1,
          website: 1,
          status: 1,
          isDeleted: 1,
          isAssign: 1,
          totalFacilities: 1,
          totalChiller: 1,
          createdAt: 1,
          facilities: 1,
          totalOperators: 1,
          address1: 1,
          address2: 1,
          city: 1,
          state: 1,
          country: 1,
          zipcode: 1,
        },
      },
    ];

    const result = await service.findOne(mockId);

    expect(companyModel.aggregate).toHaveBeenCalledWith(expectedPipeline);

    expect(result).toEqual(mockCompany);
  });

  it("should return an empty array if company not found", async () => {
    const mockId = new mongoose.Types.ObjectId().toString();

    companyModel.aggregate.mockResolvedValue([]);

    const result = await service.findOne(mockId);

    expect(result).toEqual([]);
  });

  it("should throw a CustomError if aggregation fails", async () => {
    const mockId = "invalid-id";
    const mockError = new Error("Aggregation failed");

    companyModel.aggregate.mockRejectedValue(mockError);

    await expect(service.findOne(mockId)).rejects.toThrowError("");
  });
});

describe("CompanyService - updateStatus", () => {
  let service: CompanyService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let companyModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facilityModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chillerModel: any;

  beforeEach(async () => {
    companyModel = {
      findById: jest.fn(),
    };

    facilityModel = {
      updateMany: jest.fn(),
    };

    chillerModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getModelToken("Company"), useValue: companyModel },
        { provide: getModelToken("Facility"), useValue: facilityModel },
        { provide: getModelToken("Chiller"), useValue: chillerModel },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it("should activate the company and return success response", async () => {
    const companyId = "mock-id";
    const body = { status: CompanyStatus.ACTIVE };
    const saveMock = jest.fn();

    companyModel.findById.mockResolvedValue({
      _id: companyId,
      status: CompanyStatus.IN_ACTIVE,
      facilities: [],
      save: saveMock,
    });

    const result = await service.updateStatus(companyId, body);

    expect(companyModel.findById).toHaveBeenCalledWith(companyId);
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      message: RESPONSE_SUCCESS.COMPANY_ACTIVATED,
      data: {},
    });
  });

  it("should deactivate company and its facilities/chillers", async () => {
    const companyId = "mock-id";
    const facilityIds = ["f1", "f2"];
    const chillers = [{ _id: "c1" }, { _id: "c2" }];
    const saveMock = jest.fn();

    companyModel.findById.mockResolvedValue({
      _id: companyId,
      status: CompanyStatus.ACTIVE,
      facilities: facilityIds,
      save: saveMock,
    });

    chillerModel.find.mockResolvedValue(chillers);

    const updateFacilityMock = jest.spyOn(facilityModel, "updateMany");
    const updateChillerMock = jest.spyOn(chillerModel, "updateMany");

    const result = await service.updateStatus(companyId, {
      status: CompanyStatus.IN_ACTIVE,
    });

    expect(companyModel.findById).toHaveBeenCalledWith(companyId);
    expect(updateFacilityMock).toHaveBeenCalledWith(
      { _id: { $in: facilityIds } },
      { $set: { isActive: false } },
    );

    expect(updateChillerMock).toHaveBeenCalledWith(
      { _id: { $in: chillers.map((c) => c._id) } },
      { $set: { isActive: false } },
    );

    expect(saveMock).toHaveBeenCalled();

    expect(result).toEqual({
      status: "success",
      message: RESPONSE_SUCCESS.COMPANY_DEACTIVATED,
      data: {},
    });
  });

  it("should throw an error if company not found", async () => {
    const companyId = "mock-id";
    const body = { status: CompanyStatus.ACTIVE };
    companyModel.findById.mockResolvedValue(null);

    await expect(service.updateStatus(companyId, body)).rejects.toThrowError(
      RESPONSE_ERROR.COMPANY_NOT_FOUND,
    );
  });

  it("should throw an error if invalid status is provided", async () => {
    const companyId = "mock-id";
    const body: UpdateCompanyStatusDto = {
      status: CompanyStatus.DEMO,
    };
    companyModel.findById.mockResolvedValue({
      _id: companyId,
      facilities: [],
      save: jest.fn(),
    });

    await expect(service.updateStatus(companyId, body)).rejects.toThrowError(
      RESPONSE_ERROR.INVALID_COMPANY_STATUS,
    );
  });
});

describe("CompanyService - updateCompany()", () => {
  let service: CompanyService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // let companyModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facilityModel: any;

  const mockCompanyModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockFacilityModel = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockChillerModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getModelToken("Company"), useValue: mockCompanyModel },
        { provide: getModelToken("Facility"), useValue: mockFacilityModel },
        { provide: getModelToken("Chiller"), useValue: mockChillerModel },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    // companyModel = module.get(getModelToken('Company'));
    facilityModel = module.get(getModelToken("Facility"));
  });

  afterEach(() => jest.clearAllMocks());

  const validBody: EditCompanyDto = {
    name: "TestCo",
    address1: "123 Street",
    address2: "Block A",
    city: "Mumbai",
    state: "MH",
    country: "India",
    zipcode: "400001",
    website: "https://testco.com",
    facilities: [],
  };

  const companyId = new mongoose.Types.ObjectId().toHexString();

  it("should throw if company not found", async () => {
    mockCompanyModel.findOne.mockResolvedValueOnce(null);

    await expect(service.updateCompany(companyId, validBody)).rejects.toThrow(
      RESPONSE_ERROR.COMPANY_NOT_FOUND,
    );
  });

  it("should throw if duplicate company name exists", async () => {
    mockCompanyModel.findOne
      .mockResolvedValueOnce({ _id: companyId, facilities: [] }) // first: current company exists
      .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() }); // second: another company with same name

    await expect(service.updateCompany(companyId, validBody)).rejects.toThrow(
      RESPONSE_ERROR.COMPANY_ALREADY_EXISTS,
    );
  });

  it("should throw if duplicate facility names in payload", async () => {
    const bodyWithDuplicateFacilities: EditCompanyDto = {
      ...validBody,
      facilities: [
        {
          name: "F1",
          timezone: "",
          altitude: 0,
          altitudeUnit: "",
        },
        {
          name: "F1",
          timezone: "",
          altitude: 0,
          altitudeUnit: "",
        },
      ],
    };

    mockCompanyModel.findOne
      .mockResolvedValueOnce({ _id: companyId, facilities: [] })
      .mockResolvedValueOnce(null); // no duplicate company name

    await expect(
      service.updateCompany(companyId, bodyWithDuplicateFacilities),
    ).rejects.toThrow(RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD);
  });

  it("should throw if facilities with same name already exist under company", async () => {
    const bodyWithFacility: EditCompanyDto = {
      ...validBody,
      facilities: [
        {
          name: "ExistingFacility",
          timezone: "",
          altitude: 0,
          altitudeUnit: "",
        },
      ],
    };

    mockCompanyModel.findOne
      .mockResolvedValueOnce({ _id: companyId, facilities: [] })
      .mockResolvedValueOnce(null); // no duplicate company

    facilityModel.find.mockResolvedValueOnce([{ name: "ExistingFacility" }]);

    await expect(
      service.updateCompany(companyId, bodyWithFacility),
    ).rejects.toThrow(RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD);
  });

  it("should throw if facilities already exist in DB with same name", async () => {
    const bodyWithFacility: EditCompanyDto = {
      ...validBody,
      facilities: [
        {
          name: "F1",
          timezone: "",
          altitude: 0,
          altitudeUnit: "",
        },
      ],
    };

    mockCompanyModel.findOne
      .mockResolvedValueOnce({ _id: companyId, facilities: [] }) // company
      .mockResolvedValueOnce(null); // no name conflict

    facilityModel.find
      .mockResolvedValueOnce([]) // first check = ok
      .mockResolvedValueOnce([{ name: "F1" }]); // second = exists in DB

    await expect(
      service.updateCompany(companyId, bodyWithFacility),
    ).rejects.toThrow(RESPONSE_ERROR.FACILITY_NAME_EXISTS);
  });

  it("should update company without facilities", async () => {
    const companyDoc = {
      _id: companyId,
      facilities: [],
      save: jest.fn(),
    };

    mockCompanyModel.findOne
      .mockResolvedValueOnce(companyDoc)
      .mockResolvedValueOnce(null); // no duplicate

    mockCompanyModel.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

    const result = await service.updateCompany(companyId, validBody);

    expect(result).toEqual({});
    expect(mockCompanyModel.updateOne).toHaveBeenCalledWith(
      { _id: companyId },
      expect.objectContaining({
        $set: expect.objectContaining({ name: "TestCo" }),
      }),
    );
  });

  it("should update company and create facilities successfully", async () => {
    const facilitySaveMock = jest.fn();
    const newFacilityMock = [
      { _id: new mongoose.Types.ObjectId(), save: facilitySaveMock },
    ];

    const companyDoc = {
      _id: companyId,
      facilities: [],
      save: jest.fn(),
    };

    const bodyWithFacility: EditCompanyDto = {
      ...validBody,
      facilities: [
        {
          name: "F1",
          timezone: "",
          altitude: 0,
          altitudeUnit: "",
        },
      ],
    };

    mockCompanyModel.findOne
      .mockResolvedValueOnce(companyDoc)
      .mockResolvedValueOnce(null); // no duplicate

    facilityModel.find.mockResolvedValueOnce([]); // no conflict
    facilityModel.find.mockResolvedValueOnce([]); // still no conflict

    facilityModel.create.mockResolvedValueOnce(newFacilityMock);
    mockCompanyModel.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

    const result = await service.updateCompany(companyId, bodyWithFacility);

    expect(result).toEqual({});
    expect(facilitySaveMock).toHaveBeenCalled();
    expect(companyDoc.save).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";
import { Request } from "express";
import { CompanyStatus, Role } from "src/common/constants/enum.constant";
import {
  CompanyListDto,
  CreateCompanyDto,
  EditCompanyDto,
  UpdateCompanyStatusDto,
} from "./dto/company.dto";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import { TypeExceptions } from "src/common/helpers/exceptions";

describe("CompanyController", () => {
  let companyController: CompanyController;
  let companyService: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findAllNotDeleted: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            updateCompanyStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    companyController = module.get<CompanyController>(CompanyController);
    companyService = module.get<CompanyService>(CompanyService);
  });

  it("should be defined", () => {
    expect(companyController).toBeDefined();
  });

  describe("create", () => {
    it("should call companyService.create with params", async () => {
      const params: CreateCompanyDto = {
        name: "Test company 1",
        address1: "string",
        address2: "string",
        city: "string",
        state: "Connecticut",
        country: "string",
        zipcode: "string",
        website: "string",
        facilities: [
          {
            name: "string",
            address1: "string",
            address2: "string",
            city: "string",
            state: "Connecticut",
            country: "string",
            zipcode: "string",
            timezone: "string",
            altitude: 0,
            altitudeUnit: "",
          },
        ],
      };
      const mockRequest = {
        user: { id: "mockUserId", role: Role.ADMIN }, // Simulating user request object
      } as unknown as Request;

      await companyController.create(params, mockRequest);
      expect(companyService.create).toHaveBeenCalledWith(params);
    });
  });

  // describe('List', () => {
  //   it('should call companyService.list with params', async () => {
  //     const params: CompanyListDto = {
  //       page: 1,
  //       limit: 10,
  //       search: '',
  //       sort_order: 'ASC',
  //       sort_by: '',
  //     };
  //     const mockRequest = {
  //       user: { id: 'mockUserId', role: Role.ADMIN }, // Simulating user request object
  //     } as unknown as Request;

  //     await companyController.findAll(mockRequest, params);
  //     expect(companyService.findAll).toHaveBeenCalledWith(params);
  //   });
  // });

  describe("FindOne", () => {
    it("should call companyService.findOne with params", async () => {
      const id = "testID";
      await companyController.findOne(id);
      expect(companyService.findOne).toHaveBeenCalledWith(id);
    });
  });

  // describe('FindAll active', () => {
  //   it('should call companyService.find all with params', async () => {
  //     await companyController.findAllNotDeleted();
  //     expect(companyService.findAllNotDeleted).toHaveBeenCalledWith();
  //   });
  // });
});

describe("CompanyController - updateCompanyStatus", () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockCompanyService = {
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call service.updateStatus and return result", async () => {
    const companyId = "mockCompanyId";
    const body: UpdateCompanyStatusDto = {
      status: CompanyStatus.ACTIVE,
    };

    const mockResponse = {
      status: "success",
      message: RESPONSE_SUCCESS.COMPANY_ACTIVATED,
      data: {},
    };

    jest.spyOn(service, "updateStatus").mockResolvedValue(mockResponse);

    const result = await controller.updateCompanyStatus(companyId, body);

    expect(service.updateStatus).toHaveBeenCalledWith(companyId, body);
    expect(result).toEqual(mockResponse);
  });

  it("should throw error if service throws", async () => {
    const companyId = "invalidId";
    const body: UpdateCompanyStatusDto = {
      status: CompanyStatus.ACTIVE,
    };

    jest
      .spyOn(service, "updateStatus")
      .mockRejectedValue(new Error("Company Not Found"));

    await expect(
      controller.updateCompanyStatus(companyId, body),
    ).rejects.toThrow("Company Not Found");
  });
});

// describe('CompanyController - findAll', () => {describe('CompanyController - findAll', () => {
let controller: CompanyController;
let service: CompanyService;

const mockCompanyService = {
  findAll: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [CompanyController],
    providers: [
      {
        provide: CompanyService,
        useValue: mockCompanyService,
      },
    ],
  }).compile();

  controller = module.get<CompanyController>(CompanyController);
  service = module.get<CompanyService>(CompanyService);
});

afterEach(() => {
  jest.clearAllMocks();
});

it("should return list of companies from the service", async () => {
  const mockRequest = {
    user: { id: "mockUserId", role: "admin" },
  } as unknown as Request;

  const mockBody: CompanyListDto = {
    page: 1,
    limit: 10,
    search: "",
    sort_by: "",
    sort_order: "ASC",
  };

  const mockResult = {
    companyList: [
      { name: "TestCo", address: "Line1, Line2, City, ST, Country" },
    ],
    totalRecords: 1,
  };

  mockCompanyService.findAll.mockResolvedValue(mockResult);

  const result = await controller.findAll(mockRequest, mockBody);

  expect(service.findAll).toHaveBeenCalledWith(mockRequest, mockBody);
  expect(result).toEqual(mockResult);
});

it("should throw an error if service fails", async () => {
  const mockRequest = {} as Request;
  const mockBody: CompanyListDto = {
    page: 1,
    limit: 5,
    search: "fail",
    sort_by: "",
    sort_order: "DESC",
  };

  mockCompanyService.findAll.mockRejectedValue(
    new Error("Internal Server Error"),
  );

  await expect(controller.findAll(mockRequest, mockBody)).rejects.toThrow(
    "Internal Server Error",
  );
});

describe("CompanyController - findAllNotDeleted", () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockCompanyService = {
    findAllNotDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call service.findAllNotDeleted and return company list", async () => {
    const mockCompanies = [
      { _id: "1", name: "Company A", isDeleted: false },
      { _id: "2", name: "Company B", isDeleted: false },
    ];

    mockCompanyService.findAllNotDeleted.mockResolvedValue(mockCompanies);

    const result = await controller.findAllNotDeleted();

    expect(service.findAllNotDeleted).toHaveBeenCalled();
    expect(result).toEqual(mockCompanies);
  });

  it("should throw error if service.findAllNotDeleted throws", async () => {
    mockCompanyService.findAllNotDeleted.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(controller.findAllNotDeleted()).rejects.toThrow(
      "Database error",
    );
  });
});

describe("CompanyController - findAll", () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockCompanyService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return list of companies from the service", async () => {
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;

    const mockBody: CompanyListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_by: "",
      sort_order: "ASC",
    };

    const mockResult = {
      companyList: [
        { name: "TestCo", address: "Line1, Line2, City, ST, Country" },
      ],
      totalRecords: 1,
    };

    mockCompanyService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll(mockRequest, mockBody);

    expect(service.findAll).toHaveBeenCalledWith(mockRequest, mockBody);
    expect(result).toEqual(mockResult);
  });

  it("should throw an error if service fails", async () => {
    const mockRequest = {} as Request;
    const mockBody: CompanyListDto = {
      page: 1,
      limit: 5,
      search: "fail",
      sort_by: "",
      sort_order: "DESC",
    };

    mockCompanyService.findAll.mockRejectedValue(
      new Error("Internal Server Error"),
    );

    await expect(controller.findAll(mockRequest, mockBody)).rejects.toThrow(
      "Internal Server Error",
    );
  });
});

describe("CompanyController - updateCompany()", () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockCompanyService = {
    updateCompany: jest.fn(),
  };

  const updateDto: EditCompanyDto = {
    name: "Updated Company",
    address1: "New Addr 1",
    address2: "New Addr 2",
    city: "New York",
    state: "NY",
    country: "USA",
    zipcode: "10001",
    website: "https://updated.com",
    facilities: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: mockCompanyService }],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully update a company", async () => {
    mockCompanyService.updateCompany.mockResolvedValue({});

    const result = await controller.updateCompany("company123", updateDto);

    expect(service.updateCompany).toHaveBeenCalledWith("company123", updateDto);
    expect(result).toEqual({});
  });

  it("should fail if company not found", async () => {
    mockCompanyService.updateCompany.mockRejectedValue(
      TypeExceptions.BadRequestCommonFunction(RESPONSE_ERROR.COMPANY_NOT_FOUND),
    );

    await expect(
      controller.updateCompany("invalid-id", updateDto),
    ).rejects.toThrow(RESPONSE_ERROR.COMPANY_NOT_FOUND);
  });

  it("should fail if company name already exists", async () => {
    mockCompanyService.updateCompany.mockRejectedValue(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.COMPANY_ALREADY_EXISTS,
      ),
    );

    await expect(
      controller.updateCompany("company123", updateDto),
    ).rejects.toThrow(RESPONSE_ERROR.COMPANY_ALREADY_EXISTS);
  });

  it("should fail if duplicate facility names exist in payload", async () => {
    const dtoWithDuplicates = {
      ...updateDto,
      facilities: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { name: "Facility 1" } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { name: "Facility 1" } as any,
      ],
    };

    mockCompanyService.updateCompany.mockRejectedValue(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD,
      ),
    );

    await expect(
      controller.updateCompany("company123", dtoWithDuplicates),
    ).rejects.toThrow(RESPONSE_ERROR.DUPLICATE_FACILITY_NAMES_IN_PAYLOAD);
  });

  it("should fail if facility name already exists in DB", async () => {
    mockCompanyService.updateCompany.mockRejectedValue(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.FACILITY_NAME_EXISTS,
      ),
    );

    await expect(
      controller.updateCompany("company123", updateDto),
    ).rejects.toThrow(RESPONSE_ERROR.FACILITY_NAME_EXISTS);
  });
});

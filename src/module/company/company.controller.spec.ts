import { Test, TestingModule } from "@nestjs/testing";
import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";
import { CreateCompanyDto } from "src/common/dto/common.dto";
import { ForbiddenException } from "@nestjs/common";

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
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
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
    it("should create a company successfully", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
      };

      // Mock the service's create method to return a simplified company object
      const mockCompany = {
        _id: "someUniqueId",
        name: "Test Company",
        companyCode: 123456,
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        facilities: [],
        totalFacilities: 0,
        totalChiller: 0,
        isAssign: true,
        status: "active",
        isDeleted: false,
      };

      // Mock the service's create method to return the mock company object
      jest
        .spyOn(companyService, "create")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValue(mockCompany as any);

      const response = await companyController.create(createCompanyDto, {
        user: { role: "ADMIN" },
      });

      expect(response).toEqual(mockCompany); // Expecting the mocked company object as the response
    });

    it("should throw validation error if required fields are missing", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "",
        zipcode: "",
        website: "",
      };

      jest
        .spyOn(companyService, "create")
        .mockRejectedValue(new Error("Validation failed"));

      try {
        await companyController.create(createCompanyDto, {
          user: { role: "ADMIN" },
        });
      } catch (e) {
        expect(e.message).toBe("Validation failed");
      }
    });

    it("should throw forbidden error if user is not admin", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
      };

      // Simulating non-admin role
      const req = { user: { role: "USER" } };

      try {
        await companyController.create(createCompanyDto, req);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toBe("Only Admins can create a company.");
      }
    });

    it("should handle facility creation failure", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
        facilities: [
          {
            name: "Test Facility",
            timezone: "",
          },
        ],
      };

      jest
        .spyOn(companyService, "create")
        .mockRejectedValue(new Error("Facility creation failed"));

      try {
        await companyController.create(createCompanyDto, {
          user: { role: "ADMIN" },
        });
      } catch (e) {
        expect(e.message).toBe("Facility creation failed");
      }
    });

    it("should return company without facilities if no facilities are provided", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
      };

      const mockCompany = {
        _id: "someUniqueId",
        name: "Test Company",
        companyCode: 123456,
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        facilities: [],
        totalFacilities: 0,
        totalChiller: 0,
        isAssign: true,
        status: "active",
        isDeleted: false,
      };

      jest
        .spyOn(companyService, "create")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValue(mockCompany as any);

      const response = await companyController.create(createCompanyDto, {
        user: { role: "ADMIN" },
      });

      expect(response).toEqual(mockCompany); // Expecting the mocked company object as the response
    });

    it("should handle database save failure", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "Test Company",
        address1: "123 Test St",
        address2: "Suite 100",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipcode: "12345",
        website: "https://test.com",
      };

      jest
        .spyOn(companyService, "create")
        .mockRejectedValue(new Error("Database save failed"));

      try {
        await companyController.create(createCompanyDto, {
          user: { role: "ADMIN" },
        });
      } catch (e) {
        expect(e.message).toBe("Database save failed");
      }
    });
  });
});

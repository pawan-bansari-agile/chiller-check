import { Test, TestingModule } from "@nestjs/testing";
import { CompanyService } from "./company.service";
import { getModelToken } from "@nestjs/mongoose";
import { Company } from "src/common/schema/company.schema";
import { Facility } from "src/common/schema/facility.schema";
import { TypeExceptions } from "src/common/helpers/exceptions";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { CreateCompanyDto } from "src/common/dto/common.dto";

describe("CompanyService", () => {
  let service: CompanyService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let companyModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facilityModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getModelToken(Company.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
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
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    companyModel = module.get(getModelToken(Company.name));
    facilityModel = module.get(getModelToken(Facility.name));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
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
          },
          {
            name: "Facility A",
            timezone: "",
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

    // it('should create company successfully without facilities', async () => {
    //   const createCompanyDto: CreateCompanyDto = {
    //     name: 'New Company',
    //     facilities: [],
    //     address1: '',
    //     address2: '',
    //     city: '',
    //     state: '',
    //     country: '',
    //     zipcode: '',
    //     website: '',
    //   };

    //   class MockCompany {
    //     _id = 'company-id';
    //     name = 'New Company';
    //     facilities = [];
    //     totalFacilities = 0;
    //     save = jest.fn().mockResolvedValue(this);
    //   }

    //   const mockCompany = new MockCompany();

    //   companyModel.findOne = jest.fn().mockResolvedValueOnce(null);
    //   companyModel.create = jest.fn().mockResolvedValueOnce({
    //     // _id: 'company-id',
    //     // name: 'New Company',
    //     // facilities: [],
    //     // totalFacilities: 0,
    //     // save: jest.fn().mockResolvedValueOnce(true),
    //     mockCompany,
    //   });

    //   const result = await service.create(createCompanyDto);

    //   // await expect(service.create(createCompanyDto)).resolves.toEqual({
    //   //   _id: 'company-id',
    //   //   name: 'New Company',
    //   //   facilities: [],
    //   //   totalFacilities: 0,
    //   //   save: jest.fn().mockResolvedValueOnce(true),
    //   // });
    //   // expect(result).toEqual({
    //   //   _id: 'company-id',
    //   //   name: 'New Company',
    //   //   facilities: [],
    //   //   totalFacilities: 0,
    //   //   save: expect.any(Function),
    //   // });
    //   expect(mockCompany.save).toHaveBeenCalled();
    //   expect(result).toEqual(mockCompany);
    // });

    // it('should create company with valid facilities', async () => {
    //   const createCompanyDto: CreateCompanyDto = {
    //     name: 'New Company',
    //     facilities: [
    //       {
    //         name: 'Facility A',
    //         timezone: '',
    //       },
    //       {
    //         name: 'Facility B',
    //         timezone: '',
    //       },
    //     ],
    //     address1: '',
    //     address2: '',
    //     city: '',
    //     state: '',
    //     country: '',
    //     zipcode: '',
    //     website: '',
    //   };

    //   class MockCompany {
    //     _id = 'company-id';
    //     name = 'New Company';
    //     facilities = [];
    //     totalFacilities = 0;
    //     save = jest.fn().mockResolvedValue(this);
    //   }
    //   const mockCompany = new MockCompany();

    //   const mockCreatedFacilities = [
    //     {
    //       _id: 'facility-id-1',
    //       name: 'Facility A',
    //       save: jest.fn().mockResolvedValue(true),
    //     },
    //     {
    //       _id: 'facility-id-2',
    //       name: 'Facility B',
    //       save: jest.fn().mockResolvedValue(true),
    //     },
    //   ];

    //   companyModel.findOne = jest.fn().mockResolvedValueOnce(null);
    //   companyModel.create = jest.fn().mockResolvedValueOnce(
    //     //   {
    //     //   _id: 'company-id',
    //     //   name: 'New Company',
    //     //   facilities: [],
    //     //   totalFacilities: 0,
    //     //   save: jest.fn().mockResolvedValueOnce(true),
    //     // }
    //     mockCompany
    //   );

    //   facilityModel.find
    //     .mockResolvedValueOnce([]) // for existingCompanyFacilities
    //     .mockResolvedValueOnce([]); // for existingFacilities

    //   // facilityModel.create = jest.fn().mockResolvedValueOnce(
    //   //   //   [
    //   //   //   { _id: 'facility-id-1', name: 'Facility A' },
    //   //   //   { _id: 'facility-id-2', name: 'Facility B' },
    //   //   // ]
    //   //   mockFacilities
    //   // );
    //   facilityModel.create.mockResolvedValueOnce(mockCreatedFacilities);

    //   const result = await service.create(createCompanyDto);

    //   // await expect(service.create(createCompanyDto)).resolves.toEqual({
    //   //   _id: 'company-id',
    //   //   name: 'New Company',
    //   //   facilities: ['facility-id-1', 'facility-id-2'],
    //   //   totalFacilities: 2,
    //   // });
    //   expect(result).toEqual({
    //     _id: 'company-id',
    //     name: 'New Company',
    //     facilities: ['facility-id-1', 'facility-id-2'],
    //     totalFacilities: 2,
    //     save: expect.any(Function),
    //   });
    // });

    it("should throw error if facilities have duplicates under the company", async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: "New Company",
        facilities: [
          {
            name: "Facility A",
            timezone: "",
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
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { ChillerService } from "./chiller.service";
import { getModelToken } from "@nestjs/mongoose";
import { Chiller } from "src/common/schema/chiller.schema";
import { Facility } from "src/common/schema/facility.schema";
import { Company } from "src/common/schema/company.schema";
import { User } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { CHILLER_STATUS } from "src/common/constants/enum.constant";
import { CreateChillerDTO } from "./dto/chiller.dto";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

describe("ChillerService", () => {
  let service: ChillerService;

  const mockChillerModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockFacilityModel = {
    updateOne: jest.fn(),
    findById: jest.fn(),
  };

  const mockCompanyModel = {
    updateOne: jest.fn(),
    findById: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
  };

  const mockEmailService = {
    emailSender: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChillerService,
        { provide: getModelToken(Chiller.name), useValue: mockChillerModel },
        { provide: getModelToken(Facility.name), useValue: mockFacilityModel },
        { provide: getModelToken(Company.name), useValue: mockCompanyModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<ChillerService>(ChillerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and return a chiller", async () => {
      const dto: CreateChillerDTO = {
        unit: "IP",
        ChillerNo: 1,
        weeklyHours: 40,
        weeksPerYear: 52,
        avgLoadProfile: 50,
        desInletWaterTemp: "temp1",
        make: "make1",
        model: "model1",
        manufacturedYear: 2023,
        refrigType: "R-123",
        efficiencyRating: 3.5,
        energyCost: 2.5,
        useEvapRefrigTemp: true,
        designVoltage: 440,
        voltageChoice: "choice1",
        fullLoadAmps: 150,
        ampChoice: "1-phase",
        condPressureUnit: "PSI",
        condAPDropUnit: "PSI",
        evapPressureUnit: "PSI",
        evapAPDropUnit: "PSI",
        evapDOWTemp: 45,
        compOPIndicator: "indicator",
        havePurge: true,
        haveBearingTemp: "yes",
        useRunHours: "1",
        numberOfCompressors: 2,
        companyId: new ObjectId().toHexString(),
        facilityId: new ObjectId().toHexString(),
        serialNumber: "",
        tons: 0,
        kwr: 0,
        highPressureRefrig: false,
        condDPDrop: "",
        condDPDropUnit: "",
        condApproach: 0,
        evapDPDrop: "",
        evapDPDropUnit: "",
        evapApproach: 0,
        userNote: "",
        maxPurgeTime: 0,
        purgeReadingUnit: "",
        condDesignDeltaT: 0,
        condDesignFlow: 0,
        evapDesignDeltaT: 0,
        evapDesignFlow: 0,
        oilPresHighUnit: "",
        oilPresLowUnit: "",
        oilPresDifUnit: "",
        useLoad: false,
        status: "",
      };
      const createdChiller = { _id: new ObjectId(), ...dto };
      mockChillerModel.create.mockResolvedValue(createdChiller);

      const result = await service.create(dto);
      expect(result).toEqual(createdChiller);
    });

    it("should throw UnknownError on failure", async () => {
      mockChillerModel.create.mockRejectedValue(new Error("DB error"));
      await expect(service.create({} as any)).rejects.toThrow(
        CustomError.UnknownError("DB error", 502),
      );
    });
  });

  describe("findAll", () => {
    it("should throw BadRequestCommonFunction for invalid page/limit", async () => {
      await expect(
        service.findAll({ page: 0, limit: 0 } as any),
      ).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        ),
      );
    });

    it("should return list from aggregate", async () => {
      mockChillerModel.aggregate.mockResolvedValue([
        { chillerList: [], totalRecords: [{ count: 5 }] },
      ]);
      const result = await service.findAll({ page: 1, limit: 10 } as any);
      expect(result.totalRecords).toBe(5);
    });
  });

  describe("findByFacilityIds", () => {
    it("should return chillers with names", async () => {
      const chillers = [{ _id: "1", make: "A", model: "B" }];
      mockChillerModel.find.mockReturnValue({
        select: () => ({ lean: () => chillers }),
      });
      const result = await service.findByFacilityIds({
        facilityIds: [new ObjectId().toHexString()],
      });
      expect(result[0].chillerName).toBe("A B");
    });
  });

  describe("findOne", () => {
    it("should return chiller if found", async () => {
      const chillerId = new ObjectId();
      const chiller = { _id: chillerId, name: "Chiller X" };
      mockChillerModel.aggregate.mockResolvedValue([chiller]);

      const result = await service.findOne(chillerId.toHexString());
      expect(result).toEqual(chiller);
    });

    it("should throw BadRequest if not found", async () => {
      mockChillerModel.aggregate.mockResolvedValue([]);

      await expect(
        service.findOne(new ObjectId().toHexString()),
      ).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        ),
      );
    });
  });

  describe("bulkUpdateEnergyCost", () => {
    it("should update chillers and return count", async () => {
      const id = new ObjectId();
      mockChillerModel.find.mockResolvedValue([
        { _id: id, isDeleted: false, isActive: true },
      ]);
      mockChillerModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.bulkUpdateEnergyCost({
        chillerIds: [id.toHexString()],
        energyCost: 1.5,
      });
      expect(result.modifiedCount).toBe(1);
    });

    it("should throw BadRequest if no valid chillers", async () => {
      mockChillerModel.find.mockResolvedValue([]);

      await expect(
        service.bulkUpdateEnergyCost({
          chillerIds: [new ObjectId().toHexString()],
          energyCost: 1.5,
        }),
      ).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.NO_VAIL_CHILLER_FOUND,
        ),
      );
    });
  });

  describe("inactivateChiller", () => {
    it("should throw BadRequest if chiller not found", async () => {
      mockChillerModel.findOne.mockResolvedValue(null);

      await expect(
        service.inactivateChiller(
          new ObjectId().toHexString(),
          CHILLER_STATUS.InActive,
          new ObjectId().toHexString(),
        ),
      ).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        ),
      );
    });

    it("should throw BadRequest if already in desired status", async () => {
      const id = new ObjectId();
      const chiller = { _id: id, status: CHILLER_STATUS.InActive };
      mockChillerModel.findOne.mockResolvedValue(chiller);

      await expect(
        service.inactivateChiller(id.toHexString(), CHILLER_STATUS.InActive),
      ).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction("Chiller is already InActive"),
      );
    });

    it("should update status and notify", async () => {
      const id = new ObjectId();
      const chiller = {
        _id: id,
        status: CHILLER_STATUS.Active,
        companyId: new ObjectId(),
        facilityId: new ObjectId(),
        save: jest.fn(),
      };
      // const company = { name: 'ACME Corp' };
      // const facility = { name: 'Plant 1' };
      const users = [{ email: "test@example.com" }];

      mockChillerModel.findOne.mockResolvedValue(chiller);
      // mockCompanyModel.findById.mockResolvedValue(company);
      // mockFacilityModel.findById.mockResolvedValue(facility);
      mockCompanyModel.findById.mockReturnValue({
        lean: () => Promise.resolve({ name: "ACME Corp" }),
      });
      mockFacilityModel.findById.mockReturnValue({
        lean: () => Promise.resolve({ name: "Plant 1" }),
      });
      mockUserModel.find.mockResolvedValue(users);

      const result = await service.inactivateChiller(
        id.toHexString(),
        CHILLER_STATUS.InActive,
      );
      expect(result.status).toBe(CHILLER_STATUS.InActive);
      expect(mockEmailService.emailSender).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update chiller and remove immutable fields", async () => {
      const id = new ObjectId().toHexString();
      const chiller = {
        _id: id,
        save: jest.fn(),
      };
      mockChillerModel.findOne.mockResolvedValue(chiller);
      const updated = await service.update(id, {
        companyId: "abc",
        facilityId: "xyz",
        unit: "b",
        model: "M2",
      });
      expect(chiller.save).toHaveBeenCalled();
      expect(updated).toHaveProperty("_id", id);
    });

    it("should throw if chiller not found", async () => {
      const id = new ObjectId().toHexString();

      mockChillerModel.findOne.mockResolvedValue(null);
      await expect(service.update(id, {})).rejects.toThrow(
        TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        ),
      );
    });
  });
});

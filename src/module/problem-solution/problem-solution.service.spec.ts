import { Test, TestingModule } from "@nestjs/testing";
import { ProblemSolutionService } from "./problem-solution.service";
import {
  ProblemSolutionListDto,
  UpdateProblemSolutionDto,
} from "./dto/create-problem-solution.dto";
import { getModelToken } from "@nestjs/mongoose";
import { ProblemAndSolutions } from "src/common/schema/problemAndSolutions.schema";
import { User } from "src/common/schema/user.schema";
import mongoose from "mongoose";

describe("ProblemSolutionService", () => {
  let service: ProblemSolutionService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let psModel: any;
  const modelMock = {
    aggregate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    insertMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProblemSolutionService,
        {
          provide: getModelToken(ProblemAndSolutions.name),
          useValue: modelMock,
        },
        {
          provide: getModelToken(User.name),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = module.get<ProblemSolutionService>(ProblemSolutionService);
    userModel = module.get(getModelToken(User.name));
    psModel = module.get(getModelToken(ProblemAndSolutions.name));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(userModel).toBeDefined();
    expect(psModel).toBeDefined();
  });
  it("should return paginated list", async () => {
    modelMock.aggregate.mockResolvedValue([
      { problemSolutionList: [], totalRecords: [{ count: 0 }] },
    ]);
    const payload: ProblemSolutionListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_by: "",
      sort_order: "ASC",
    };
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;

    const result = await service.findAll(mockRequest, payload);
    expect(result.totalRecords).toBe(0);
    expect(modelMock.aggregate).toHaveBeenCalled();
  });

  it("should throw error for invalid page/limit", async () => {
    const payload: ProblemSolutionListDto = {
      page: 0,
      limit: 0,
      search: "",
      sort_by: "",
      sort_order: "ASC",
    };
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;

    await expect(service.findAll(mockRequest, payload)).rejects.toThrow();
  });
  it("should return record if found", async () => {
    const doc = { _id: new mongoose.Types.ObjectId(), problem: "Test" };
    modelMock.findById.mockResolvedValue(doc);
    const result = await service.findOne(doc._id.toString());
    expect(result).toEqual(doc);
  });

  it("should throw not found error", async () => {
    modelMock.findById.mockResolvedValue(null);
    await expect(
      service.findOne(new mongoose.Types.ObjectId().toString()),
    ).rejects.toThrow("Problem & Solution not found!");
  });
  it("should update record successfully", async () => {
    const id = new mongoose.Types.ObjectId(
      "686265e8073dd4805e2ca473",
    ).toString();

    const user = { firstName: "Test", lastName: "User", profileImage: "url" };
    modelMock.findById.mockResolvedValue({ _id: id });
    service["userModel"].findOne = jest.fn().mockResolvedValue(user);
    modelMock.findOneAndUpdate.mockResolvedValue({});
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;
    const updateDto: UpdateProblemSolutionDto = {
      problem: "TEst",
      solution: "test",
    };

    await service.update(mockRequest, id, updateDto);
    expect(modelMock.findOneAndUpdate).toHaveBeenCalled();
  });

  it("should throw not found error when record is missing", async () => {
    const id = new mongoose.Types.ObjectId(
      "686265e8073dd4805e2ca473",
    ).toString();
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;
    const updateDto: UpdateProblemSolutionDto = {
      problem: "TEst",
      solution: "test",
    };
    modelMock.findById.mockResolvedValue(null);
    await expect(service.update(mockRequest, id, updateDto)).rejects.toThrow(
      "Problem & Solution not found!",
    );
  });
  it("should return false if initial data already exists", async () => {
    modelMock.find.mockResolvedValue([{ section: "General" }]);
    const result = await service.createInitialPS();
    expect(result).toBe(false);
    expect(modelMock.find).toHaveBeenCalled();
    expect(modelMock.insertMany).not.toHaveBeenCalled();
  });

  it("should insert initial data and return true if no data exists", async () => {
    modelMock.find.mockResolvedValue([]);
    modelMock.insertMany.mockResolvedValue(true);

    const result = await service.createInitialPS();
    expect(result).toBe(true);
    expect(modelMock.find).toHaveBeenCalled();
    expect(modelMock.insertMany).toHaveBeenCalled();
  });
});

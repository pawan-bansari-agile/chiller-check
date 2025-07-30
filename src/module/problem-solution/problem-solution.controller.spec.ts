import { Test, TestingModule } from "@nestjs/testing";
import { ProblemSolutionController } from "./problem-solution.controller";
import { ProblemSolutionService } from "./problem-solution.service";
import {
  ProblemSolutionListDto,
  UpdateProblemSolutionDto,
} from "./dto/create-problem-solution.dto";

describe("ProblemSolutionController", () => {
  let controller: ProblemSolutionController;
  let service: ProblemSolutionService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProblemSolutionController],
      providers: [
        {
          provide: ProblemSolutionService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProblemSolutionController>(
      ProblemSolutionController,
    );

    service = module.get<ProblemSolutionService>(ProblemSolutionService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
  it("should call service.findOne with params", async () => {
    const id = "testID";
    await controller.findOne(id);
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it("should call service.findAll with params", async () => {
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;

    const payload: ProblemSolutionListDto = {
      page: 1,
      limit: 10,
      search: "",
      sort_by: "",
      sort_order: "ASC",
    };

    await controller.findAll(mockRequest, payload);
    expect(service.findAll).toHaveBeenCalledWith(mockRequest, payload);
  });

  it("should call service.update with params", async () => {
    const id = "testID";
    const mockRequest = {
      user: { id: "mockUserId", role: "admin" },
    } as unknown as Request;
    const updateDto: UpdateProblemSolutionDto = {
      problem: "TEst",
      solution: "test",
    };
    await controller.update(mockRequest, id, updateDto);
    expect(service.update).toHaveBeenCalledWith(mockRequest, id, updateDto);
  });
});

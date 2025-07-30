import {
  Controller,
  Get,
  Body,
  // Patch,
  Param,
  Request,
  Post,
  Put,
} from "@nestjs/common";
import { ProblemSolutionService } from "./problem-solution.service";
import {
  ProblemSolutionListDto,
  UpdateProblemSolutionDto,
} from "./dto/create-problem-solution.dto";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { PROBLEM_SOLUTION } from "src/common/constants/response.constant";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@Controller("setting")
@ApiTags("Problem solution")
@ApiBearerAuth()
export class ProblemSolutionController {
  constructor(
    private readonly problemSolutionService: ProblemSolutionService,
  ) {}

  @Post("list")
  @ResponseMessage(PROBLEM_SOLUTION.LIST)
  findAll(@Request() req: Request, @Body() body: ProblemSolutionListDto) {
    return this.problemSolutionService.findAll(req, body);
  }

  @Get(":id")
  @ResponseMessage(PROBLEM_SOLUTION.GET)
  findOne(@Param("id") id: string) {
    return this.problemSolutionService.findOne(id);
  }

  @Put(":id")
  @ResponseMessage(PROBLEM_SOLUTION.UPDATE)
  update(
    @Request() req: Request,
    @Param("id") id: string,
    @Body() updateProblemSolutionDto: UpdateProblemSolutionDto,
  ) {
    console.log("✌️req from PS update controller --->", req["user"]._id);
    return this.problemSolutionService.update(
      req,
      id,
      updateProblemSolutionDto,
    );
  }
}

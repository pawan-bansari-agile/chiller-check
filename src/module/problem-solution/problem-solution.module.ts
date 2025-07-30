import { Module, OnModuleInit } from "@nestjs/common";
import { ProblemSolutionService } from "./problem-solution.service";
import { ProblemSolutionController } from "./problem-solution.controller";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ProblemAndSolutions,
  ProblemAndSolutionsSchema,
} from "src/common/schema/problemAndSolutions.schema";
import { User, UserSchema } from "src/common/schema/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProblemAndSolutions.name, schema: ProblemAndSolutionsSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ProblemSolutionController],
  providers: [ProblemSolutionService],
})
export class ProblemSolutionModule implements OnModuleInit {
  constructor(
    private readonly problemSolutionServiceService: ProblemSolutionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.problemSolutionServiceService.createInitialPS();
  }
}

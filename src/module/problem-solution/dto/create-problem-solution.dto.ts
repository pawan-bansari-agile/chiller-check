import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProblemSolutionDto {
  @ApiProperty()
  problem: string;

  @ApiProperty()
  solution: string;
}

export class ProblemSolutionListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  page: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  limit: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search: string;

  @ApiProperty({ required: false, enum: ["ASC", "DESC"] })
  @IsOptional()
  @IsString()
  sort_order: "ASC" | "DESC";

  @ApiProperty()
  @IsOptional()
  @IsString()
  sort_by: string;
}

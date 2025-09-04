import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class DashboardDto {
  @ApiProperty({
    description: "Company ID for filtering data (optional for admins)",
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId: string;
}

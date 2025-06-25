import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { CMS } from "src/common/constants/enum.constant";

export class updateAdminCms {
  @ApiProperty({
    description: "aboutUs,privacyPolicy,termsAndCondition",
  })
  @IsEnum(CMS, {
    message: "Invalid cms key",
  })
  title: string;
  @ApiProperty({
    example: "xzy",
  })
  value: string;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { CMS } from "src/common/constants/enum.constant";

export class AdminCmsDto {
  @ApiProperty({
    description: "aboutUs,privacyPolicy,termsAndCond",
  })
  @IsEnum(CMS, {
    message: "Invalid cms key",
  })
  title: string;
}

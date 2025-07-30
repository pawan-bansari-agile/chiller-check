import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

export class PhoneDto {
  @ApiProperty({
    description: "Phone number (US only)",
    example: "+12025550123",
  })
  @Matches(/^\+1\d{10}$/, {
    message:
      "Phone number must be a valid US number in the format +1XXXXXXXXXX",
  })
  phone: string;
}

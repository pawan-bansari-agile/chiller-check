import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { UploadFolderEnum } from "src/common/constants/enum.constant";

export class CreateImageUploadDto {
  @ApiProperty({ required: true, format: "binary", type: "string" })
  files: {
    type: "file";
    format: "binary";
  };

  // @ApiProperty({})
  // @IsOptional()
  // module_name: string;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}
export class FileMultipleUploadDto {
  @ApiProperty({ required: true, format: "binary" })
  files: Array<{
    type: "file";
    format: "binary";
  }>;

  @ApiProperty({
    required: true,
    description: "profilePic",
  })
  @IsEnum(UploadFolderEnum, {
    message: "Module folder must be profilePic",
  })
  @IsString()
  moduleName: UploadFolderEnum;
}

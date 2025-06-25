import {
  Body,
  Controller,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { ImageUploadService } from "./image-upload.service";
import { FileMultipleUploadDto } from "./dto/create-image-upload.dto";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as fs from "fs";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { RESPONSE_SUCCESS } from "src/common/constants/response.constant";
import { Public } from "src/security/auth/auth.decorator";
@Controller("")
@ApiTags("Common - Image upload")
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  @Public()
  @Post("uploadMultipleFile")
  @ApiConsumes("multipart/form-data")
  @ResponseMessage(RESPONSE_SUCCESS.SUCCESS)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadDirAllFiles = "./media/allFiles";

          // Create the directory if it doesn't exist
          fs.mkdirSync(uploadDirAllFiles, { recursive: true });
          callback(null, uploadDirAllFiles);
        },
        filename: (req, file, callback) => {
          const filename = `${Date.now()}-${file.originalname}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async uploadMultipleImage(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() params: FileMultipleUploadDto,
    @Res() res: Response,
  ) {
    // this upload service use for a upload image in s3
    const result = await this.imageUploadService.uploadMultipleFileS3(
      res,
      files,
      params,
    );
    // Delete local files after successful upload
    files.forEach((file) => {
      fs.unlinkSync(`./media/allFiles/${file.filename}`);
    });
    return result;
  }
}

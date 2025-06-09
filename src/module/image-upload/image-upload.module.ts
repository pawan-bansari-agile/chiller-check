import { Module } from "@nestjs/common";
import { ImageUploadService } from "./image-upload.service";
import { ImageUploadController } from "./image-upload.controller";
import { ScheduleModule } from "@nestjs/schedule";
import { CommonService } from "src/common/services/common.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ImageUploadController],
  providers: [ImageUploadService, CommonService],
  exports: [ImageUploadService, CommonService],
})
export class ImageUploadModule {}

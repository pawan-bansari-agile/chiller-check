import { Module, OnModuleInit } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsController } from "./cms.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Cms, CmsSchema } from "src/common/schema/cms.schema";
import { LoggerService } from "src/common/logger/logger.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: Cms.name, schema: CmsSchema }])],
  controllers: [CmsController],
  providers: [CmsService, LoggerService],
})
export class CmsModule implements OnModuleInit {
  constructor(private readonly cmsServiceService: CmsService) {}
  async onModuleInit(): Promise<void> {
    await this.cmsServiceService.createInitialCMS();
  }
}

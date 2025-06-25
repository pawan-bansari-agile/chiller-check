import { Injectable } from "@nestjs/common";
import { AdminCmsDto } from "./dto/create-cm.dto";
import { AuthExceptions, CustomError } from "src/common/helpers/exceptions";
import { Cms, CmsDocument } from "src/common/schema/cms.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { updateAdminCms } from "./dto/update-cm.dto";
import { LoggerService } from "src/common/logger/logger.service";

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(Cms.name) private readonly cmsModel: Model<CmsDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  async findOne(body: AdminCmsDto) {
    try {
      const cmsDetails = await this.cmsModel.findOne({
        title: body.title,
      });
      console.log("cmsDetails: ", cmsDetails);
      if (!cmsDetails) {
        throw AuthExceptions.CMSNotFound();
      }
      return cmsDetails;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async updateAdminCms(body: updateAdminCms) {
    try {
      const cmsDetails = await this.cmsModel.findOne({
        title: body.title,
      });
      if (!cmsDetails) {
        throw AuthExceptions.CMSNotFound();
      }
      await this.cmsModel.findOneAndUpdate(
        {
          title: body.title,
        },
        {
          description: body.value,
        },
      );
      return {};
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async createInitialCMS() {
    try {
      const cmsObj = [
        { description: "<p>privacyPolicy.</p>", title: "privacyPolicy" },
        {
          description: "<p>termsAndCondition.</p>",
          title: "termsAndCond",
        },
      ];

      const cmsData = await this.cmsModel.find();

      if (cmsData.length) {
        return this.loggerService.customLog("Initial CMS already loaded.");
      }
      await this.cmsModel.insertMany(cmsObj);

      this.loggerService.log("Initial CMS loaded successfully.");
    } catch (error) {
      // If any error occurs, throw a custom "Unknown Error" with the error message and status
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}

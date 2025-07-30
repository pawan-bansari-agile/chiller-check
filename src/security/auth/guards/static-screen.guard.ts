import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { CompanyStatus, Role } from "src/common/constants/enum.constant";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { TypeExceptions } from "src/common/helpers/exceptions";
import { Company, CompanyDocument } from "src/common/schema/company.schema";
import { User, UserDocument } from "src/common/schema/user.schema";

@Injectable()
export class StaticScreenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // console.log("✌️request --->", request);
    // const userId: string = request["user"]["_id"];
    const userId: string = request.user?._id;
    console.log("✌️userId from static screen guard --->", userId);

    if (!userId) return true;

    const user = await this.userModel.findById(
      new mongoose.Types.ObjectId(userId),
    );

    // if (!user || !user.companyId) {
    //   throw new UnauthorizedException('User does not belong to any company.');
    // }

    if (user.role == Role.CORPORATE_MANAGER) {
      const company = await this.companyModel.findById(user.companyId);

      if (!company) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.COMPANY_NOT_FOUND,
        );
      }

      if (company.status != CompanyStatus.ACTIVE) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FREE_TRIAL_EXPIRED,
        );
      }
    }

    return true;
  }
}

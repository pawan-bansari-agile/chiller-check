import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { Role, UploadFolderEnum } from "src/common/constants/enum.constant";
import { UpdateUserDto } from "src/common/dto/common.dto";
import {
  AuthExceptions,
  CustomError,
  TypeExceptions,
} from "src/common/helpers/exceptions";
import { User, UserDocument } from "src/common/schema/user.schema";
import * as dotenv from "dotenv";
import { ImageUploadService } from "../image-upload/image-upload.service";
import {
  CreateUserDto,
  UpdateUserStatusDto,
  UserListDto,
} from "./dto/user.dto";
import { ModulePermission } from "./types/user.types";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { PasswordGeneratorService } from "src/common/helpers/passwordGenerator.helper";
import { EmailService } from "src/common/helpers/email/email.service";
import { congratulationTemplate } from "../image-upload/email-template/congratulation-template";
import { CommonService } from "src/common/services/common.service";
import { ConfigService } from "@nestjs/config";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
dotenv.config();

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private imageUploadService: ImageUploadService,
    private passwordGeneratorService: PasswordGeneratorService,
    private emailService: EmailService,
    private readonly commonService: CommonService,
    private readonly configService: ConfigService,
  ) {}

  async createUser(dto: CreateUserDto, req): Promise<User> {
    try {
      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.USER_ALREADY_EXIST,
        );
      }

      const { role, permissions, alerts, email } = dto;

      // Final permissions (auto-fix based on role)
      let finalPermissions = permissions;

      // if (role === Role.ADMIN || role === Role.SUB_ADMIN) {
      //   finalPermissions = this.getFullAccessPermissions();
      // } else if (permissions) {
      finalPermissions = this.autoFixPermissions(permissions);
      // }

      // Handle role-based logic: enforce required tabs or omit invalid fields
      const userPayload = {
        ...dto,
        permissions: finalPermissions,
        companyId: dto.companyId
          ? new mongoose.Types.ObjectId(dto.companyId)
          : "",
      };

      const loggedInUserRole = req.user?.role;

      // if (loggedInUserRole === Role.ADMIN) {
      //   // ADMIN can only create SUB_ADMIN
      //   if (dto.role !== Role.SUB_ADMIN) {
      //     throw TypeExceptions.BadRequestCommonFunction(
      //       RESPONSE_ERROR.INVALID_ROLE,
      //     );
      //   }
      // } else if (loggedInUserRole === Role.SUB_ADMIN) {
      //   // SUB_ADMIN can only create managers/operators
      //   const allowedRoles = [
      //     Role.CORPORATE_MANAGER,
      //     Role.FACILITY_MANAGER,
      //     Role.OPERATOR,
      //   ];
      //   if (!allowedRoles.includes(dto.role)) {
      //     throw TypeExceptions.BadRequestCommonFunction(
      //       RESPONSE_ERROR.INVALID_ROLE,
      //     );
      //   }
      // } else {
      //   // All other roles are not allowed to create users
      //   throw TypeExceptions.BadRequestCommonFunction(
      //     RESPONSE_ERROR.INVALID_ROLE,
      //   );
      // }
      if (loggedInUserRole === Role.ADMIN) {
        // ADMIN can only create ADMIN or SUB_ADMIN
        const allowedRoles = [Role.ADMIN, Role.SUB_ADMIN];
        if (!allowedRoles.includes(dto.role)) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.INVALID_ROLE,
          );
        }
      } else if (loggedInUserRole === Role.SUB_ADMIN) {
        // SUB_ADMIN can only create managers/operators
        const allowedRoles = [
          Role.CORPORATE_MANAGER,
          Role.FACILITY_MANAGER,
          Role.OPERATOR,
        ];
        if (!allowedRoles.includes(dto.role)) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.INVALID_ROLE,
          );
        }
      } else {
        // All other roles are not allowed to create users
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_ROLE,
        );
      }

      // Admin/Sub-admin: remove responsibilities & alerts
      if (role === Role.SUB_ADMIN) {
        // delete userPayload.responsibilities;
        delete userPayload.alerts;
      } else {
        // Ensure alerts and responsibilities are included
        userPayload.alerts = alerts;
      }
      console.log(userPayload);
      if (userPayload.profileImage) {
        await this.imageUploadService.moveTempToRealFolder(
          userPayload.profileImage,
        );
      }
      // Create the user
      const user = await this.userModel.create(userPayload);
      const passwordResetToken = this.commonService.generateRandomString(
        15,
        user._id.toString(),
      );
      await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          resetPasswordToken: passwordResetToken,
          resetPasswordExpires: new Date(
            Date.now() +
              +this.configService.get("auth.resetPasswordExpiryDuration"),
          ),
        },
      );
      let roleText = "";
      if (dto.role == Role.SUB_ADMIN) {
        roleText = "Sub Admin";
      } else if (dto.role == Role.CORPORATE_MANAGER) {
        roleText = "Corporate Manager";
      } else if (dto.role == Role.FACILITY_MANAGER) {
        roleText = "Facility Manager";
      } else if (dto.role == Role.OPERATOR) {
        roleText = "Operator";
      }
      const html = congratulationTemplate(
        `${process.env.ADMIN_URL}/reset-password/${passwordResetToken}`,
        `${roleText}`,
        `${dto.firstName} ${dto.lastName}`,
        `${email}`,
      );
      // Send onboarding email with credentials
      await this.emailService.emailSender({
        to: email,
        subject: `Welcome to Chiller Portal`,
        html: html,
      });

      return user;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  private autoFixPermissions(perms: Record<string, ModulePermission>) {
    const updated: Record<string, ModulePermission> = {};
    for (const moduleKey in perms) {
      const mod = perms[moduleKey];
      updated[moduleKey] = {
        ...mod,
        view: true, // Always force `view` if any other permission is selected
      };
    }
    return updated;
  }

  private getFullAccessPermissions(): Record<string, ModulePermission> {
    const modules = [
      "company",
      "facility",
      "chiller",
      "user",
      "log",
      "maintenance",
      "report",
      "setting",
    ];
    const perms: ModulePermission = {
      view: true,
      add: true,
      edit: true,
      toggleStatus: true,
    };

    return Object.fromEntries(modules.map((m) => [m, perms]));
  }
  // Method to update user profile by ID
  async updateProfile(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserRole: string,
  ) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw AuthExceptions.AccountNotExist();
      }

      if (user.isActive !== true) {
        throw AuthExceptions.AccountNotActive();
      }

      let shouldLogout = false;
      const {
        role,
        permissions,
        alerts,
        firstName,
        lastName,
        phoneNumber,
        profileImage,
      } = updateUserDto;
      console.log("✌️updateUserDto --->", updateUserDto);

      // let finalPermissions = permissions;

      // finalPermissions = this.autoFixPermissions(permissions);

      if (permissions) {
        user.permissions = this.autoFixPermissions(permissions);
        shouldLogout = true;
      }

      // Only allow the super admin to update the user role
      if (role && (currentUserRole !== Role.ADMIN || Role.SUB_ADMIN)) {
        user.role = updateUserDto.role; // Allow Super Admin or Admin to change user roles
        user.permissions = {};
        user.alerts = { general: [], logs: [] };
        shouldLogout = true;
      }

      if (role === Role.ADMIN || role === Role.SUB_ADMIN) {
        user.alerts = { general: [], logs: [] };
      } else if (alerts) {
        user.alerts = alerts;
        shouldLogout = true;
      }

      if (profileImage !== user.profileImage) {
        console.log("IN IF");

        // Move new file temp folder to real one
        if (updateUserDto.profileImage != "") {
          const newFileKey =
            UploadFolderEnum.PROFILE_PIC + "/" + updateUserDto?.profileImage;
          await this.imageUploadService.moveTempToRealFolder(newFileKey);
        }
        if (user.profileImage != "") {
          console.log("inside update image check");
          const oldFileKey =
            UploadFolderEnum.PROFILE_PIC + "/" + user.profileImage;

          await this.imageUploadService.deleteImage(oldFileKey);
        }
        user.profileImage = profileImage;
      }

      // Filter out fields with undefined or empty values
      // const filteredDto = Object.fromEntries(
      //   Object.entries(updateUserDto).filter(
      //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //     ([key, value]) => value !== undefined
      //   )
      // );

      // console.log('✌️filteredDto --->', filteredDto);
      // delete filteredDto.role;
      // delete filteredDto.email;
      // console.log(
      //   '✌️filteredDto after deleting the role and email --->',
      //   filteredDto
      // );

      // Update the user with the provided fields
      // console.log('filteredDto: ', filteredDto);
      // Object.assign(user, filteredDto);
      // console.log('✌️user after assigning the filtered dto  --->', user);

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      // if (profileImage) user.profileImage = profileImage;

      console.log("✌️user --->", user);
      await user.save();
      // Save the updated user

      return {
        forceLogout: shouldLogout,
        data: user,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async getUserById(id: string) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchObj: any = {
        isDeleted: false,
        _id: objectId,
        // role: {
        //   $in: [
        //     Role.CORPORATE_MANAGER,
        //     Role.FACILITY_MANAGER,
        //     Role.OPERATOR,
        //     Role.SUB_ADMIN,
        //   ],
        // },
      };
      const pipeline = [];

      pipeline.push({ $match: matchObj });

      pipeline.push({
        $project: {
          _id: 1,
          name: {
            $concat: ["$firstName", " ", "$lastName"],
          },
          email: 1,
          phoneNumber: 1,
          // 'company.name': 1,
          // 'facilities.name': 1,
          profileImage: 1,
          role: 1,
          companyId: 1,
          facilityIds: 1,
          // facilityId: 1,
          isActive: 1,
          createdAt: 1,
          lastLoginTime: 1,
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
          failedLoginAttempts: 1,
          lastFailedLoginAttempt: 1,
          permissions: 1,
          alerts: 1,
          firstName: 1,
          lastName: 1,
        },
      });

      const user = await this.userModel.aggregate(pipeline);
      if (!user || user.length == 0) {
        throw AuthExceptions.AccountNotExist();
      }
      console.log("✌️user from get user by id api--->", user);
      return user[0];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(body: UserListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by = "createdAt",
        sort_order = "desc",
        companyId,
        facilityId,
        role,
      } = body;

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchObj: any = {
        isDeleted: false,
        role: {
          $in: [
            Role.CORPORATE_MANAGER,
            Role.FACILITY_MANAGER,
            Role.OPERATOR,
            Role.SUB_ADMIN,
          ],
        },
      };

      if (companyId)
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      if (facilityId)
        matchObj.facilityIds = new mongoose.Types.ObjectId(facilityId);
      if (role) matchObj.role = role;

      const pipeline = [];

      pipeline.push({ $match: matchObj });

      if (search) {
        const searchRegex = new RegExp(search.trim(), "i");

        pipeline.push({
          $match: {
            $or: [
              { firstName: { $regex: searchRegex } },
              { lastName: { $regex: searchRegex } },
              { email: { $regex: searchRegex } },
              { phoneNumber: { $regex: searchRegex } },
            ],
          },
        });
      }
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY,
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityIds",
          foreignField: "_id",
          as: "facilities",
        },
      });
      pipeline.push({
        $project: {
          _id: 1,
          name: {
            $concat: ["$firstName", " ", "$lastName"],
          },
          email: 1,
          phoneNumber: 1,
          "company.name": 1,
          "facilities.name": 1,
          profileImage: 1,
          role: 1,
          companyId: 1,
          facilityIds: 1,
          facilityId: 1,
          isActive: 1,
          createdAt: 1,
        },
      });

      pipeline.push({
        $sort: {
          [sort_by === "name" ? "nameLower" : sort_by || "createdAt"]:
            sort_order === "ASC" ? 1 : -1,
        },
      });

      pipeline.push({
        $facet: {
          userList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      const result = await this.userModel.aggregate(pipeline);

      result[0].totalRecords =
        result[0].totalRecords.length > 0 ? result[0].totalRecords[0].count : 0;

      return result[0];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async updateUserStatus(dto: UpdateUserStatusDto) {
    try {
      const { userId, isActive } = dto;
      const user = await this.userModel.findById(userId);
      if (!user || user.isDeleted) {
        throw AuthExceptions.AccountNotExist();
      }

      if (user.isActive === isActive) {
        return `User is already ${isActive ? "active" : "inactive"}`;
      }

      user.isActive = isActive;

      if (!isActive) {
        user.companyId = null;
        user.facilityIds = [];
      }

      await user.save();

      const emailHtml = isActive
        ? `<p>Hello ${user.firstName}, your account has been <b>activated</b>. You may now log in.</p>`
        : `<p>Hello ${user.firstName}, your account has been <b>deactivated</b>. You can no longer log in until reactivated.</p>`;

      const subject = isActive ? "Account Activated" : "Account Deactivated";

      // Send Email
      await this.emailService.emailSender({
        to: user.email,
        subject,
        html: emailHtml,
      });

      return `User has been ${isActive ? "activated" : "deactivated"} successfully`;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}

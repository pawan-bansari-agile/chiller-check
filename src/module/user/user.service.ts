import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import {
  AppEnvironment,
  NotificationRedirectionType,
  Role,
  UploadFolderEnum,
  userRoleName,
} from "src/common/constants/enum.constant";
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
  AlertGroup,
  CreateUserDto,
  OperatorByFacilitiesDto,
  UpdateUserStatusDto,
  UserListDto,
} from "./dto/user.dto";
import { ModulePermission } from "./types/user.types";
import { RESPONSE_ERROR, USER } from "src/common/constants/response.constant";
import { PasswordGeneratorService } from "src/common/helpers/passwordGenerator.helper";
import { EmailService } from "src/common/helpers/email/email.service";
import { congratulationTemplate } from "../image-upload/email-template/congratulation-template";
import { CommonService } from "src/common/services/common.service";
import { ConfigService } from "@nestjs/config";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Company, CompanyDocument } from "src/common/schema/company.schema";
import { Chiller, ChillerDocument } from "src/common/schema/chiller.schema";
import { accountStatusTemplate } from "src/common/helpers/email/emailTemplates/accountStatusTemplate";
import { Facility, FacilityDocument } from "src/common/schema/facility.schema";
import { assignmentNotificationTemplate } from "src/common/helpers/email/emailTemplates/assignmentNotificationTemplate";
import { NotificationService } from "src/common/services/notification.service";
import { congratulationTemplateLocal } from "../image-upload/email-template/congratulation-template-local";
// import { AuthService } from 'src/security/auth/auth.service';
dotenv.config();

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Facility.name)
    private readonly facilityModel: Model<FacilityDocument>,
    @InjectModel(Chiller.name)
    private readonly chillerModel: Model<ChillerDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private imageUploadService: ImageUploadService,
    private passwordGeneratorService: PasswordGeneratorService,
    private emailService: EmailService,
    private readonly commonService: CommonService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    // private readonly authService: AuthService,
  ) {}

  async createUser(dto: CreateUserDto) {
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
      console.log("✌️finalPermissions --->", finalPermissions);

      // if (role === Role.ADMIN || role === Role.SUB_ADMIN) {
      //   finalPermissions = this.getFullAccessPermissions();
      // } else if (permissions) {
      finalPermissions = this.autoFixPermissions(permissions);
      console.log(
        "✌️finalPermissions after autofix permission --->",
        finalPermissions,
      );
      // }

      const facilityIds = Array.isArray(dto?.facilityIds)
        ? dto?.facilityIds.map((id) => new mongoose.Types.ObjectId(id))
        : [];
      const chillerIds = Array.isArray(dto.chillerIds)
        ? dto?.chillerIds.map((id) => new mongoose.Types.ObjectId(id))
        : [];

      // Handle role-based logic: enforce required tabs or omit invalid fields
      const userPayload = {
        ...dto,
        facilityIds,
        chillerIds,
        permissions: finalPermissions,
        companyId: dto?.companyId
          ? new mongoose.Types.ObjectId(dto?.companyId)
          : null,
      };

      if (role === Role.SUB_ADMIN) {
        delete userPayload.alerts;
      } else {
        console.log("inside the alerts section");
        const general =
          alerts?.general && !Array.isArray(alerts.general)
            ? {
                conditions: alerts.general.conditions || [],
                notifyBy: alerts.general.notifyBy,
              }
            : ({ conditions: [] } as AlertGroup);

        // const logs = Array.isArray(alerts?.logs) ? alerts.logs : [];
        const logs = Array.isArray(alerts?.logs)
          ? alerts.logs.map((log) => {
              if (log.type == "program") {
                return {
                  ...log,
                  facilityIds: log?.facilityIds ?? [],
                  operatorIds: log?.operatorIds ?? [],
                };
              } else {
                // Strip off unrelated fields for non-program types
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { facilityIds, operatorIds, ...rest } = log;
                return rest;
              }
            })
          : [];

        userPayload.alerts = {
          general,
          logs,
        };
      }

      if (userPayload.profileImage) {
        const newFileKey =
          UploadFolderEnum.PROFILE_PIC + "/" + userPayload.profileImage;
        await this.imageUploadService.moveTempToRealFolder(newFileKey);
      }
      // Create the user
      const user = await this.userModel.create(userPayload);

      if (role === Role.CORPORATE_MANAGER && dto.companyId) {
        await this.companyModel.updateOne(
          { _id: new mongoose.Types.ObjectId(dto.companyId) },
          { $set: { isAssign: true } },
        );
      }

      if (
        role === Role.OPERATOR &&
        facilityIds.length > 0 &&
        chillerIds.length > 0
      ) {
        await this.facilityModel.updateMany(
          { _id: { $in: facilityIds } },
          { $inc: { totalOperators: 1 } },
        );
      }

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

      if (user.role == Role.CORPORATE_MANAGER) {
        const userName = `${user.firstName} ${user.lastName}`;

        if (dto.companyId) {
          const company = await this.companyModel.findById(
            new mongoose.Types.ObjectId(dto.companyId),
          );

          const companyName = company.name;
          const message = `The Company - ${companyName} has been assigned to you. You can now manage the data under this company & its users.`;
          const payload = {
            senderId: null,
            receiverId: user._id,
            title: "Company Assigned",
            message: message,
            type: NotificationRedirectionType.COMPANY_ASSIGNED,
            redirection: {
              companyId: dto.companyId,
              type: NotificationRedirectionType.COMPANY_ASSIGNED,
            },
          };

          await this.notificationService.sendNotification(
            payload.receiverId,
            payload,
          );

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            companyName,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Company Assigned`,
            html: html,
          });
        }
      } else if (user.role == Role.FACILITY_MANAGER) {
        const userName = `${user.firstName} ${user.lastName}`;

        if (dto?.facilityIds?.length > 0) {
          const facilities = await this.facilityModel.find({
            _id: { $in: user.facilityIds },
          });

          const facilityNames = [];

          facilities.map((f) => {
            facilityNames.push(f.name);
          });
          const message = `The Facility - ${Array.isArray(facilityNames) && facilityNames.length > 1 ? "multiple Facilities" : "a new Facility"} has been assigned to you. You can now manage the data under this facility & its users.`;
          const payload = {
            senderId: null,
            receiverId: user._id,
            title: "Facility Assigned",
            message: message,
            type: NotificationRedirectionType.FACILITY_ASSIGNED,
            redirection: {
              type: NotificationRedirectionType.FACILITY_ASSIGNED,
            },
          };

          await this.notificationService.sendNotification(
            payload.receiverId,
            payload,
          );

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            facilityNames,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Facility Assigned`,
            html: html,
          });
        }
      } else if (user.role == Role.OPERATOR) {
        const userName = `${user.firstName} ${user.lastName}`;

        if (dto?.chillerIds?.length > 0) {
          const chillers = await this.chillerModel.find({
            _id: { $in: dto.chillerIds },
          });

          const chillerNames = [];

          chillers.map((c) => {
            chillerNames.push(`${c.ChillerNo} ${c.serialNumber}`);
          });

          const message = `A Chiller - ${Array.isArray(chillerNames) && chillerNames.length > 1 ? "multiple Chillers" : "a new Chiller"} has been assigned to you. You can now manage the data under this chiller.`;
          const payload = {
            senderId: null,
            receiverId: user._id,
            title: "Chiller Assigned",
            message: message,
            type: NotificationRedirectionType.CHILLER_ASSIGNED,
            redirection: {
              type: NotificationRedirectionType.CHILLER_ASSIGNED,
            },
          };

          await this.notificationService.sendNotification(
            payload.receiverId,
            payload,
          );

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            chillerNames,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Chiller Assigned`,
            html: html,
          });
        }
      }

      let roleText = "";
      if (dto.role == Role.SUB_ADMIN) {
        roleText = "Sub Admin";
      } else if (dto.role == Role.CORPORATE_MANAGER) {
        roleText = "Company manager";
      } else if (dto.role == Role.FACILITY_MANAGER) {
        roleText = "Facility Manager";
      } else if (dto.role == Role.OPERATOR) {
        roleText = "Operator";
      }
      const html = congratulationTemplate(
        `${process.env.ADMIN_URL}/set-password/${passwordResetToken}`,
        `${roleText}`,
        `${dto.firstName} ${dto.lastName}`,
        `${email}`,
      );
      // Send onboarding email with credentials
      if (
        process.env.APP_ENV === AppEnvironment.DEVELOPMENT ||
        process.env.APP_ENV === AppEnvironment.PRODUCTION
      ) {
        await this.emailService.emailSender({
          to: email,
          subject: `Welcome to Chiller Portal`,
          html: html,
        });

        return user;
      } else {
        const htmlLocal = congratulationTemplateLocal(
          `${process.env.ADMIN_URL}/set-password/${passwordResetToken}`,
          `${roleText}`,
          `${dto.firstName} ${dto.lastName}`,
          `${email}`,
        );
        const emailTemplate = await this.emailService.emailSender({
          to: email,
          subject: "Welcome to Chiller Portal",
          html: html,
        });

        console.log("✌️emailTemplate --->", emailTemplate);
        return {
          user,
          emailTemplate,
          htmlLocal,
          link: `${process.env.ADMIN_URL}/set-password/${passwordResetToken}`,
        };
      }

      // return user;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  // private autoFixPermissions(perms: Record<string, ModulePermission>) {
  //   const updated: Record<string, ModulePermission> = {};
  //   for (const moduleKey in perms) {
  //     const mod = perms[moduleKey];
  //     updated[moduleKey] = {
  //       ...mod,
  //       view: true, // Always force `view` if any other permission is selected
  //     };
  //   }
  //   return updated;
  // }
  private autoFixPermissions(perms: Record<string, ModulePermission>) {
    const updated: Record<string, ModulePermission> = {};

    for (const moduleKey in perms) {
      const mod = perms[moduleKey];

      const hasAnyPermission =
        mod.add || mod.edit || mod.toggleStatus || mod.view;

      if (hasAnyPermission) {
        // Set view: true if any permission is granted
        updated[moduleKey] = {
          view: true,
          add: !!mod.add,
          edit: !!mod.edit,
          toggleStatus: !!mod.toggleStatus,
        };
      } else {
        // Set all permissions to false if none selected
        updated[moduleKey] = {
          view: false,
          add: false,
          edit: false,
          toggleStatus: false,
        };
      }
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
    loggedInUserId: string,
    // currentUserRole: string
  ) {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw AuthExceptions.AccountNotExist();
      }

      console.log("user: -------------", user);
      // if (user.isActive !== true) {
      //   throw AuthExceptions.AccountNotActive();
      // }

      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );
      console.log("✌️loggedInUser --->", loggedInUser);

      // let shouldLogout = false;

      const {
        role,
        permissions,
        alerts,
        firstName,
        lastName,
        phoneNumber,
        profileImage,
        companyId,
        facilityIds,
        chillerIds,
      } = updateUserDto;
      console.log("✌️updateUserDto --->", updateUserDto);

      const originalRole = user.role;
      const originalCompanyId = user.companyId?.toString();
      const updatedCompanyId = companyId?.toString();
      const roleChanged = role && role !== originalRole;

      if (permissions) {
        user.permissions = this.autoFixPermissions(permissions);
        // shouldLogout = true;
      }

      // if (roleChanged) {
      //   // const previousRole = user.role;
      //   const previousFacilityIds = user.facilityIds || [];

      //   user.role = role;
      //   // shouldLogout = true;

      //   if (originalRole === Role.CORPORATE_MANAGER && user.companyId) {
      //     await this.companyModel.updateOne(
      //       { _id: user.companyId },
      //       { $set: { isAssign: false } }
      //     );
      //     // user.companyId = undefined;
      //   }

      //   // if (role === Role.CORPORATE_MANAGER) {
      //   // user.facilityIds = [];
      //   // user.chillerIds = [];
      //   // user.companyId = companyId
      //   //   ? new mongoose.Types.ObjectId(companyId)
      //   //   : undefined;

      //   // await this.companyModel.updateOne(
      //   //   { _id: new mongoose.Types.ObjectId(companyId) },
      //   //   { $set: { isAssign: true } }
      //   // );
      //   // } else
      //   if (role === Role.FACILITY_MANAGER) {
      //     // user.companyId = undefined;
      //     // user.chillerIds = [];
      //     user.facilityIds =
      //       facilityIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
      //   } else if (role === Role.OPERATOR) {
      //     // user.companyId = undefined;
      //     user.facilityIds =
      //       facilityIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
      //     user.chillerIds =
      //       chillerIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
      //   }

      //   if (role === Role.OPERATOR && user.facilityIds.length > 0) {
      //     await this.facilityModel.updateMany(
      //       { _id: { $in: user.facilityIds } },
      //       { $inc: { totalOperators: 1 } }
      //     );
      //   }

      //   if (originalRole === Role.OPERATOR && previousFacilityIds.length > 0) {
      //     await this.facilityModel.updateMany(
      //       { _id: { $in: previousFacilityIds } },
      //       { $inc: { totalOperators: -1 } }
      //     );
      //   }
      // }

      // if (facilityIds && facilityIds.length > 0) {
      //   user.facilityIds = facilityIds?.map(
      //     (id) => new mongoose.Types.ObjectId(id)
      //   );
      // }

      // if (user.role === Role.CORPORATE_MANAGER) {
      //   if (originalCompanyId !== updatedCompanyId) {
      //     if (originalCompanyId) {
      //       await this.companyModel.updateOne(
      //         { _id: new mongoose.Types.ObjectId(originalCompanyId) },
      //         { $set: { isAssign: false } }
      //       );
      //     }

      //     if (updatedCompanyId) {
      //       await this.companyModel.updateOne(
      //         { _id: new mongoose.Types.ObjectId(updatedCompanyId) },
      //         { $set: { isAssign: true } }
      //       );
      //       user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
      //     }
      //     // else {
      //     //   user.companyId = undefined;
      //     // }
      //   }
      // }

      if (roleChanged) {
        user.role = role;

        if (originalRole === Role.OPERATOR && user.facilityIds?.length > 0) {
          if (user?.chillerIds?.length > 0) {
            await this.facilityModel.updateMany(
              { _id: { $in: user.facilityIds } },
              { $inc: { totalOperators: -1 } },
            );
          }
        }

        if (originalRole === Role.CORPORATE_MANAGER && originalCompanyId) {
          await this.companyModel.updateOne(
            { _id: new mongoose.Types.ObjectId(originalCompanyId) },
            { $set: { isAssign: false } },
          );
        }
      }

      if (user.role === Role.CORPORATE_MANAGER) {
        if (originalCompanyId && !updatedCompanyId) {
          await this.companyModel.updateOne(
            { _id: new mongoose.Types.ObjectId(originalCompanyId) },
            { $set: { isAssign: false } },
          );
          user.companyId = null;
        } else if (updatedCompanyId && updatedCompanyId !== originalCompanyId) {
          if (originalCompanyId) {
            await this.companyModel.updateOne(
              { _id: new mongoose.Types.ObjectId(originalCompanyId) },
              { $set: { isAssign: false } },
            );
          }

          await this.companyModel.updateOne(
            { _id: new mongoose.Types.ObjectId(updatedCompanyId) },
            { $set: { isAssign: true } },
          );

          user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
        } else if (originalCompanyId == updatedCompanyId) {
          if (originalCompanyId) {
            await this.companyModel.updateOne(
              { _id: new mongoose.Types.ObjectId(originalCompanyId) },
              { $set: { isAssign: false } },
            );
          }

          await this.companyModel.updateOne(
            { _id: new mongoose.Types.ObjectId(updatedCompanyId) },
            { $set: { isAssign: true } },
          );

          user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
          user.chillerIds = [];
        }

        user.facilityIds = [];
      } else if (user.role === Role.FACILITY_MANAGER) {
        // if (originalCompanyId && updatedCompanyId !== originalCompanyId) {
        //   await this.companyModel.updateOne(
        //     { _id: new mongoose.Types.ObjectId(originalCompanyId) },
        //     { $set: { isAssign: false } }
        //   );
        // }

        if (updatedCompanyId) {
          user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
        }

        user.chillerIds = [];
        user.facilityIds =
          facilityIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
      } else if (user.role === Role.OPERATOR) {
        // if (originalCompanyId && updatedCompanyId !== originalCompanyId) {
        //   await this.companyModel.updateOne(
        //     { _id: new mongoose.Types.ObjectId(originalCompanyId) },
        //     { $set: { isAssign: false } }
        //   );
        // }

        if (updatedCompanyId) {
          // await this.companyModel.updateOne(
          //   { _id: new mongoose.Types.ObjectId(updatedCompanyId) },
          //   { $set: { isAssign: true } }
          // );
          user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
        }
        // 1. Fetch existing user from DB
        const existingUser = await this.userModel.findById(id); // or whatever you're updating

        // 2. Map new values
        user.chillerIds =
          chillerIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
        const newFacilityIds =
          facilityIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? [];
        const newFacilityIdsStr = newFacilityIds.map((id) => id.toString());

        // 3. Compare with old values
        const oldFacilityIds =
          existingUser.facilityIds?.map((id) => id.toString()) ?? [];

        const addedFacilityIds = newFacilityIds.filter(
          (id) => !oldFacilityIds.includes(id.toString()),
        );
        const removedFacilityIds = oldFacilityIds
          .filter((id) => !newFacilityIdsStr.includes(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        // 4. Update user
        user.facilityIds = newFacilityIds;

        // 5. Adjust totalOperators safely
        if (existingUser.role === Role.OPERATOR) {
          if (addedFacilityIds.length > 0) {
            await this.facilityModel.updateMany(
              { _id: { $in: addedFacilityIds } },
              { $inc: { totalOperators: 1 } },
            );
          }

          if (removedFacilityIds.length > 0) {
            await this.facilityModel.updateMany(
              { _id: { $in: removedFacilityIds } },
              [
                {
                  $set: {
                    totalOperators: {
                      $cond: [
                        { $gt: ["$totalOperators", 0] },
                        { $subtract: ["$totalOperators", 1] },
                        0,
                      ],
                    },
                  },
                },
              ],
            );
          }
        }
      }

      if (alerts) {
        if (role === Role.ADMIN || role === Role.SUB_ADMIN) {
          user.alerts = {
            general: { conditions: [] }, // No notifyBy
            logs: [],
          };
        } else {
          user.alerts = {
            general: alerts.general?.conditions?.length
              ? {
                  conditions: alerts.general.conditions,
                  notifyBy: alerts.general.notifyBy,
                }
              : { conditions: [] },
            logs: alerts.logs ?? [],
          };
        }
        // shouldLogout = true;
      }

      // working logic dont delete
      // if (profileImage && profileImage !== user.profileImage) {
      //   if (profileImage !== '') {
      //     console.log(
      //       '✌️profileImage inside the second condition for profileimage check --->',
      //       profileImage
      //     );
      //     const newFileKey = UploadFolderEnum.PROFILE_PIC + '/' + profileImage;
      //     await this.imageUploadService.moveTempToRealFolder(newFileKey);
      //   }
      //   if (user.profileImage !== '') {
      //     const oldFileKey =
      //       UploadFolderEnum.PROFILE_PIC + '/' + user.profileImage;
      //     await this.imageUploadService.deleteImage(oldFileKey);
      //   }
      //   user.profileImage = profileImage;
      // }
      if (profileImage !== undefined) {
        if (profileImage === "") {
          if (user.profileImage) {
            const oldFileKey = `${UploadFolderEnum.PROFILE_PIC}/${user.profileImage}`;
            await this.imageUploadService.deleteImage(oldFileKey);
          }
          user.profileImage = "";
        } else if (profileImage !== user.profileImage) {
          const newFileKey = `${UploadFolderEnum.PROFILE_PIC}/${profileImage}`;
          await this.imageUploadService.moveTempToRealFolder(newFileKey);
          if (user.profileImage) {
            const oldFileKey = `${UploadFolderEnum.PROFILE_PIC}/${user.profileImage}`;
            await this.imageUploadService.deleteImage(oldFileKey);
          }
          user.profileImage = profileImage;
        }
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      // if (companyId) user.companyId = new mongoose.Types.ObjectId(companyId);
      // if (profileImage) user.profileImage = profileImage;

      if (loggedInUser._id == id) {
        user.isProfileUpdated = false;
      } else {
        user.isProfileUpdated = true;
      }
      // console.log('✌️user --->', user);

      // const originalCompanyId = user.companyId?.toString();
      // const updatedCompanyId = companyId?.toString();

      // if (originalCompanyId !== updatedCompanyId) {
      //   // If company is removed
      //   if (!updatedCompanyId && originalCompanyId) {
      //     await this.companyModel.updateOne(
      //       { _id: new mongoose.Types.ObjectId(originalCompanyId) },
      //       { $set: { isAssign: false } }
      //     );
      //     user.companyId = undefined;
      //   }

      //   // If company is changed
      //   if (updatedCompanyId && updatedCompanyId !== originalCompanyId) {
      //     if (originalCompanyId) {
      //       await this.companyModel.updateOne(
      //         { _id: new mongoose.Types.ObjectId(originalCompanyId) },
      //         { $set: { isAssign: false } }
      //       );
      //     }

      //     await this.companyModel.updateOne(
      //       { _id: new mongoose.Types.ObjectId(updatedCompanyId) },
      //       { $set: { isAssign: true } }
      //     );

      //     user.companyId = new mongoose.Types.ObjectId(updatedCompanyId);
      //   }
      // }

      if (user.role == Role.CORPORATE_MANAGER) {
        const userName = `${user.firstName} ${user.lastName}`;

        if (updateUserDto.companyId) {
          const company = await this.companyModel.findById(
            new mongoose.Types.ObjectId(updateUserDto.companyId),
          );

          const companyName = company.name;

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            companyName,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Company Assigned`,
            html: html,
          });
        }
      } else if (user.role == Role.FACILITY_MANAGER) {
        const userName = `${user.firstName} ${user.lastName}`;

        console.log("updateUserDto: ", updateUserDto);
        if (updateUserDto?.facilityIds?.length > 0) {
          const facilities = await this.facilityModel.find({
            _id: { $in: user.facilityIds },
          });

          const facilityNames = [];

          facilities.map((f) => {
            facilityNames.push(f.name);
          });

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            facilityNames,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Facility Assigned`,
            html: html,
          });
        }
      } else if (user.role == Role.OPERATOR) {
        const userName = `${user.firstName} ${user.lastName}`;

        if (updateUserDto?.chillerIds?.length > 0) {
          const chillers = await this.chillerModel.find({
            _id: { $in: updateUserDto.chillerIds },
          });

          const chillerNames = [];

          chillers.map((c) => {
            chillerNames.push(c.serialNumber);
          });

          const html = assignmentNotificationTemplate(
            userName,
            user.role,
            chillerNames,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Chiller Assigned`,
            html: html,
          });
        }
      }

      await user.save();

      const company = await this.companyModel.findOne({ _id: user.companyId });

      let companyName = "";

      if (company) {
        companyName = company.name ? company.name : "";
      }

      const adminAndSubAdmins = await this.userModel.find({
        role: { $in: [Role.ADMIN, Role.SUB_ADMIN] },
      });

      if (adminAndSubAdmins) {
        adminAndSubAdmins.map(async (u) => {
          const userRoleText = userRoleName(user.role);
          const adminRoleText = userRoleName(loggedInUser.role);
          const notificationMessage = `The ${companyName} - ${userRoleText} - '${user.firstName} ${user.lastName}''s account has been updated. The update was done by ${adminRoleText} - '${loggedInUser.firstName} ${loggedInUser.lastName}'.`;
          const payload = {
            senderId: null,
            receiverId: u._id,
            title: "User Updated",
            message: notificationMessage,
            type: NotificationRedirectionType.USER_UPDATED,
            redirection: {
              userId: user._id,
              type: NotificationRedirectionType.USER_UPDATED,
            },
          };

          await this.notificationService.sendNotification(
            payload.receiverId,
            payload,
          );
        });
      }

      // Save the updated user

      let updatedByAdmin: boolean = false;

      if (
        id != loggedInUserId &&
        (loggedInUser.role == Role.ADMIN || loggedInUser.role == Role.SUB_ADMIN)
      ) {
        updatedByAdmin = true;
      } else {
        updatedByAdmin = false;
      }

      let message: string = "";

      if (updatedByAdmin) {
        message = USER.ADMIN_UPDATE;
      } else {
        message = USER.USER_UPDATE;
      }

      return {
        user,
        message,
      };
    } catch (error) {
      console.log("error: ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async getUserById(id: string, loggedInUserId: string) {
    try {
      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );
      console.log("✌️loggedInUser --->", loggedInUser);

      const objectId = new mongoose.Types.ObjectId(id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchObj: any = {
        isDeleted: false,
        _id: objectId,
      };
      // const userExist = await this.userModel.findOne({ id: objectId });
      const userExist = await this.userModel.findById(objectId);
      console.log("userExist: ", userExist);
      const programAlert = userExist.alerts?.logs?.find(
        (log) => log.type === "program",
      );

      const facilityIds = (programAlert?.facilityIds || []).map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      const operatorIds = (programAlert?.operatorIds || []).map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      const pipeline = [];

      pipeline.push({ $match: matchObj });

      // Lookup company
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

      // Lookup facilities
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityIds",
          foreignField: "_id",
          as: "facilities",
        },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          let: { facilityIdsFromAlert: facilityIds },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$facilityIdsFromAlert"],
                },
              },
            },
          ],
          as: "alertFacilities",
        },
      });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          let: { operatorIdsAlert: operatorIds },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$operatorIdsAlert"],
                },
              },
            },
          ],
          as: "alertOperators",
        },
      });

      // Lookup chillers from all assigned facilities
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          let: { facilityIds: "$facilityIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$facilityId", "$$facilityIds"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "facilityChillers",
        },
      });

      // Lookup operators who are assigned to any of those facility chillers
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          let: { facilityChillerIds: "$facilityChillers._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$role", Role.OPERATOR] },
                    { $gt: [{ $size: { $ifNull: ["$chillerIds", []] } }, 0] },
                    { $setIsSubset: ["$chillerIds", "$$facilityChillerIds"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "facilityOperators",
        },
      });

      // Enrich facilities with totalChillers and totalOperators
      pipeline.push({
        $addFields: {
          facilities: {
            $map: {
              input: "$facilities",
              as: "fac",
              in: {
                $mergeObjects: [
                  "$$fac",
                  {
                    totalChiller: {
                      $size: {
                        $filter: {
                          input: "$facilityChillers",
                          as: "ch",
                          cond: { $eq: ["$$ch.facilityId", "$$fac._id"] },
                        },
                      },
                    },
                    totalOperators: {
                      $size: {
                        $filter: {
                          input: "$facilityOperators",
                          as: "op",
                          cond: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: "$$op.chillerIds",
                                    as: "cid",
                                    cond: {
                                      $in: [
                                        "$$cid",
                                        {
                                          $map: {
                                            input: {
                                              $filter: {
                                                input: "$facilityChillers",
                                                as: "fc",
                                                cond: {
                                                  $eq: [
                                                    "$$fc.facilityId",
                                                    "$$fac._id",
                                                  ],
                                                },
                                              },
                                            },
                                            as: "fc",
                                            in: "$$fc._id",
                                          },
                                        },
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // Lookup full chillers if chillerIds exist
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerIds",
          foreignField: "_id",
          as: "chillers",
        },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.LOGS,
          let: { chillerIds: "$chillerIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$chillerId", "$$chillerIds"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $sort: { readingDateUTC: -1 } },
            {
              $group: {
                _id: "$chillerId",
                latestLog: { $first: "$$ROOT" },
              },
            },
          ],
          as: "latestLogs",
        },
      });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          let: { updatedByIds: "$latestLogs.latestLog.updatedBy" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$updatedByIds"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
              },
            },
          ],
          as: "latestLogUpdaters",
        },
      });

      // Add facilityName and totalOperators to each chiller
      pipeline.push({
        $addFields: {
          chillers: {
            $map: {
              input: "$chillers",
              as: "chiller",
              in: {
                $mergeObjects: [
                  "$$chiller",
                  {
                    facilityName: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$facilities",
                            as: "facility",
                            cond: {
                              $eq: ["$$facility._id", "$$chiller.facilityId"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    totalOperators: {
                      $size: {
                        $filter: {
                          input: "$facilityOperators",
                          as: "op",
                          cond: {
                            $in: ["$$chiller._id", "$$op.chillerIds"],
                          },
                        },
                      },
                    },
                    latestLog: {
                      $let: {
                        vars: {
                          matchedLog: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$latestLogs",
                                  as: "logEntry",
                                  cond: {
                                    $eq: ["$$logEntry._id", "$$chiller._id"],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: {
                          $mergeObjects: [
                            "$$matchedLog.latestLog",
                            {
                              updatedByUser: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$latestLogUpdaters",
                                      as: "user",
                                      cond: {
                                        $eq: [
                                          "$$user._id",
                                          "$$matchedLog.latestLog.updatedBy",
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // Add totalOperators in company key
      pipeline.push({
        $addFields: {
          company: {
            $cond: {
              if: { $ne: ["$companyId", null] }, // only proceed if companyId is not null
              then: {
                $mergeObjects: [
                  "$company",
                  {
                    totalOperators: {
                      $size: {
                        $filter: {
                          input: "$facilityOperators",
                          as: "op",
                          cond: { $eq: ["$$op.companyId", "$company._id"] },
                        },
                      },
                    },
                  },
                ],
              },
              else: "$company", // return original company (null or empty)
            },
          },
        },
      });

      // pipeline.push({
      //   $addFields: {
      //     "company.totalOperators": {
      //       $size: {
      //         $filter: {
      //           input: "$facilityOperators",
      //           as: "op",
      //           cond: { $eq: ["$$op.companyId", "$company._id"] },
      //         },
      //       },
      //     },
      //   },
      // });

      // Final cleanup
      pipeline.push({
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          phoneNumber: 1,
          role: 1,
          companyId: 1,
          company: 1,
          facilityIds: 1,
          facilities: 1,
          chillerIds: 1,
          chillers: 1,
          profileImage: 1,
          isActive: 1,
          createdAt: 1,
          lastLoginTime: 1,
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
          failedLoginAttempts: 1,
          lastFailedLoginAttempt: 1,
          permissions: 1,
          alertFacilities: 1,
          alertOperators: 1,
          alerts: 1,
        },
      });

      // pipeline.push({
      //   $lookup: {
      //     from: TABLE_NAMES.LOGS,
      //     let: { chillerId: '$_id' },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $eq: ['$chillerId', '$$chillerId'],
      //           },
      //         },
      //       },
      //       { $sort: { readingDateUTC: -1 } },
      //       { $limit: 1 },
      //     ],
      //     as: 'latestLog',
      //   },
      // });

      // pipeline.push({
      //   $addFields: {
      //     latestLog: { $arrayElemAt: ['$latestLog', 0] },
      //   },
      // });

      // pipeline.push({
      //   $unwind: {
      //     path: '$latestLog',
      //     preserveNullAndEmptyArrays: true,
      //   },
      // });

      const user = await this.userModel.aggregate(pipeline);

      if (!user || user.length === 0) {
        throw AuthExceptions.AccountNotExist();
      }

      const generalConditions = loggedInUser?.alerts?.general?.conditions || [];
      console.log("✌️generalConditions --->", generalConditions);

      const evaluateCondition = (
        value: number,
        operator: string,
        threshold: number,
      ): boolean => {
        switch (operator) {
          case ">":
            return value > threshold;
          case ">=":
            return value >= threshold;
          case "<":
            return value < threshold;
          case "<=":
            return value <= threshold;
          case "=":
            return value === threshold;
          default:
            return false;
        }
      };

      const getLossType = (
        metric: string,
        value: number,
      ): "normal" | "warning" | "alert" => {
        const condition = generalConditions.find((c) => c.metric === metric);
        if (!condition) return "normal";

        const { warning, alert } = condition;
        if (evaluateCondition(value, alert.operator, alert.threshold))
          return "alert";
        if (evaluateCondition(value, warning.operator, warning.threshold))
          return "warning";
        return "normal";
      };

      const userData = user[0];
      // console.log('✌️userData --->', userData);

      const formattedChillers = userData?.chillers.map((chiller) => {
        const log = chiller?.latestLog;

        // Remove latestLog from chiller object temporarily
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { latestLog: _, ...rest } = chiller;

        // Conditionally construct the latestLog object if it exists
        if (Object.keys(log).length) {
          const enhancedLog = {
            ...log,
            effLoss: {
              value: log.effLoss ?? 0,
              type: getLossType("efficiencyLoss", log.effLoss ?? 0),
            },
            condAppLoss: {
              value: log.condAppLoss ?? 0,
              type: getLossType("condenserLoss", log.condAppLoss ?? 0),
            },
            evapAppLoss: {
              value: log.evapAppLoss ?? 0,
              type: getLossType("evaporatorLoss", log.evapAppLoss ?? 0),
            },
            nonCondLoss: {
              value: log.nonCondLoss ?? 0,
              type: getLossType("nonCondenserLoss", log.nonCondLoss ?? 0),
            },
            otherLoss: {
              value: log.otherLoss ?? 0,
              type: getLossType("otherLoss", log.otherLoss ?? 0),
            },
          };

          return {
            ...rest,
            latestLog: enhancedLog,
          };
        }

        // If no latest log, just return the base chiller data (no `latestLog` key)
        return rest;
      });

      return {
        ...userData,
        chillers: formattedChillers,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(req: Request, body: UserListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "desc",
        facilityId,
        role,
      } = body;
      let companyId = body.companyId;
      const findUser = await this.userModel.findOne({
        _id: req["user"]["_id"],
      });
      console.log("findUser: ", findUser);
      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;
      let allowedRole = [
        Role.CORPORATE_MANAGER,
        Role.FACILITY_MANAGER,
        Role.OPERATOR,
        Role.SUB_ADMIN,
      ];
      if (req["user"]["role"] == Role.SUB_ADMIN) {
        allowedRole = [
          Role.CORPORATE_MANAGER,
          Role.FACILITY_MANAGER,
          Role.OPERATOR,
        ];
      }

      if (req["user"]["role"] == Role.CORPORATE_MANAGER) {
        allowedRole = [Role.FACILITY_MANAGER, Role.OPERATOR];
        if (findUser.companyId) {
          companyId = findUser.companyId.toString();
        }
      }
      if (req["user"]["role"] == Role.FACILITY_MANAGER) {
        allowedRole = [Role.OPERATOR];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchObj: any = {
        isDeleted: false,
        role: {
          $in: allowedRole,
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
      const sortField =
        !sort_by || sort_by.trim() === ""
          ? "createdAt"
          : sort_by === "name"
            ? "nameLower"
            : sort_by;

      if (sortField === "nameLower") {
        pipeline.push({
          $addFields: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
          },
        });
        pipeline.push({
          $addFields: {
            nameLower: { $toLower: "$name" },
          },
        });
      }
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

      // pipeline.push({
      //   $sort: {
      //     [sort_by === 'name' ? 'nameLower' : sort_by || 'createdAt']:
      //       sort_order === 'ASC' ? 1 : -1,
      //   },
      // });
      pipeline.push({
        $sort: {
          [sortField]: sort_order === "ASC" ? 1 : -1,
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

  async updateUserStatus(dto: UpdateUserStatusDto, loggedInUserId: string) {
    try {
      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );
      console.log("✌️loggedInUser --->", loggedInUser);
      const { userId, isActive, shouldUnassign } = dto;
      const user = await this.userModel.findById(userId);
      if (!user || user.isDeleted) {
        throw AuthExceptions.AccountNotExist();
      }

      if (user.isActive === isActive) {
        return `User is already ${isActive ? "active" : "inactive"}`;
      }

      user.isActive = isActive;

      if (!isActive) {
        if (shouldUnassign) {
          if (user.role == Role.CORPORATE_MANAGER) {
            const companyId = user?.companyId;
            if (companyId) {
              await this.companyModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(companyId) },
                { isAssign: false },
              );
            }
          }
          user.companyId = null;
          user.facilityIds = [];
          user.chillerIds = [];
        }

        const company = await this.companyModel.findOne({
          _id: user.companyId,
        });

        const adminAndSubAdmins = await this.userModel.find({
          role: { $in: [Role.ADMIN, Role.SUB_ADMIN] },
        });

        if (adminAndSubAdmins && company) {
          const adminRoleText = userRoleName(loggedInUser.role);
          adminAndSubAdmins.map(async (u) => {
            const userRoleText = userRoleName(user.role);

            const companyName = company?.name || "";
            const message = `The ${companyName} - ${userRoleText} - '${user.firstName} ${user.lastName}''s account has been inactivated. The inactivation was done by ${adminRoleText} - '${loggedInUser.firstName} ${loggedInUser.lastName}'.`;
            const payload = {
              senderId: null,
              receiverId: u._id,
              title: "User Inactivated",
              message: message,
              type: NotificationRedirectionType.USER_INACTIVATED,
              redirection: {
                userId: user._id,
                type: NotificationRedirectionType.USER_INACTIVATED,
              },
            };

            await this.notificationService.sendNotification(
              payload.receiverId,
              payload,
            );
          });
        }
      }
      user.isProfileUpdated = true;

      await user.save();

      const emailHtml = isActive
        ? accountStatusTemplate(
            true,
            { firstName: `${user.firstName} ${user.lastName}` },
            user.role,
          )
        : accountStatusTemplate(
            false,
            { firstName: `${user.firstName} ${user.lastName}` },
            user.role,
          );

      const subject = isActive ? "Account Activated" : "Account Inactivated";

      // Send Email
      await this.emailService.emailSender({
        to: user.email,
        subject,
        html: emailHtml,
      });
      let message = "";
      if (isActive) {
        message = USER.USER_ACTIVATED;
      } else {
        if (shouldUnassign) {
          message = USER.USER_UNASSIGN_INACTIVE;
        } else {
          message = USER.USER_INACTIVATED;
        }
      }

      return message;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async getUsersAssignedToChillers(dto: OperatorByFacilitiesDto) {
    // // Step 1: Get all chillers for the facilityIds
    // const chillers = await this.chillerModel
    //   .find({ facilityId: { $in: facilityIds }, isDeleted: false })
    //   .select("_id")
    //   .lean();

    // const chillerIds = chillers.map((c) => c._id);

    // if (chillerIds.length === 0) return [];

    // // Step 2: Get all users with matching chillerIds
    // const users = await this.userModel
    //   .find({
    //     chillerIds: { $in: chillerIds },
    //     isDeleted: false,
    //   })
    //   .lean();

    // return users;
    const { companyId, facilityIds } = dto;

    let finalFacilityIds: mongoose.Types.ObjectId[] = [];

    // Case 1: If companyId is provided → fetch its facilities
    if (companyId) {
      const company = await this.companyModel
        .findOne({ _id: companyId, isDeleted: false })
        .select("facilities")
        .lean();

      if (company?.facilities?.length > 0) {
        finalFacilityIds = company.facilities.map(
          (id) => new mongoose.Types.ObjectId(id),
        );
      } else {
        return []; // No facilities → no chillers → no users
      }
    }
    // Case 2: If facilityIds are provided directly
    else if (facilityIds?.length > 0) {
      finalFacilityIds = facilityIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chillerFilter: any = { isDeleted: false };

    if (finalFacilityIds.length > 0) {
      chillerFilter.facilityId = { $in: finalFacilityIds };
    }

    // Step 1: Get chillers based on computed filter
    const chillers = await this.chillerModel
      .find(chillerFilter)
      .select("_id")
      .lean();

    const chillerIds = chillers.map((c) => c._id);

    if (chillerIds.length === 0) return [];

    // Step 2: Get users assigned to those chillers
    const users = await this.userModel
      .find({
        chillerIds: { $in: chillerIds },
        isDeleted: false,
      })
      .lean();

    return users;
  }
}

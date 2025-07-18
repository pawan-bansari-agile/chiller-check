import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcrypt";
import { compareSync, hash } from "bcrypt";
import { Request } from "express";
import { AppEnvironment, Role } from "src/common/constants/enum.constant";
import {
  AUTHENTICATION,
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
  USER,
} from "src/common/constants/response.constant";
import { EmailService } from "src/common/helpers/email/email.service";
import { resetPasswordTemplate } from "src/common/helpers/email/emailTemplates/resetPasswordTemplate";
import {
  AuthExceptions,
  CustomError,
  TypeExceptions,
} from "src/common/helpers/exceptions";
import {
  CreateDeviceInterface,
  CreateInitialUserInterface,
  UserLoginInterface,
} from "src/common/interfaces/user.interface";
import { Device, DeviceDocument } from "src/common/schema/device.schema";
import { User, UserDocument } from "src/common/schema/user.schema";
import { CommonService } from "src/common/services/common.service";
import { CryptoService } from "src/common/services/crypto.service";
import { JwtPayload } from "../../common//interfaces/jwt.interface";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResendOtp,
  ResetPasswordDto,
  VerifyOtp,
} from "../../common/dto/common.dto";
import { LoggerService } from "../../common/logger/logger.service";

import mongoose, { Model, RootFilterQuery } from "mongoose";
import * as dayjs from "dayjs";
// import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";
import { sendOTP, verifyOTP } from "src/common/helpers/twillio/twillio.service";

// dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly myLogger: LoggerService,
    private readonly cryptoService: CryptoService,
    private readonly commonService: CommonService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {
    // this.myLogger.setContext(AuthService.name);
  }

  async login(params: LoginDto) {
    try {
      console.log("params: ", params);
      const matchParams: RootFilterQuery<UserDocument> = {
        isDeleted: false,
        email: params.email,
      };

      const user = await this.userModel.findOne(matchParams);
      if (!user) {
        throw AuthExceptions.AccountNotExist();
      }

      if (!user.isActive) {
        throw AuthExceptions.AccountNotActive();
      }

      const isMatched = compareSync(params.password, user.password);

      if (!isMatched) {
        if (user.role !== Role.ADMIN) {
          const now = new Date();
          const lastAttempt = user.lastFailedLoginAttempt || new Date(); // default: old date
          const timeDiff = now.getTime() - new Date(lastAttempt).getTime();
          const oneHour = 60 * 60 * 1000;

          // If the last failed attempt was more than 1 hour ago, reset count
          if (timeDiff > oneHour) {
            user.failedLoginAttempts = 1;
          } else {
            user.failedLoginAttempts += 1;
          }

          user.lastFailedLoginAttempt = now;

          // If failed attempts reached 3 within 1 hour, deactivate account
          if (user.failedLoginAttempts >= 3) {
            user.isActive = false;
          }
          await user.save();
          if (!user.isActive) {
            throw AuthExceptions.AccountNotActive();
          }
        }
        throw AuthExceptions.InvalidPassword();
      }

      // 🔍 Check if device already exists
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const existingDevice = await this.deviceModel.findOne({
        userId: user._id,
        deviceId: params.deviceId,
      });

      if (!existingDevice) {
        // 🚀 Device not found, trigger OTP
        const otpResult = await sendOTP(user.phoneNumber);
        if (!otpResult.success) {
          throw new Error("Failed to send OTP: " + otpResult.error);
        }
        return {
          userId: user._id,
          otpSent: true,
          message: AUTHENTICATION.OTP_SEND,
        };
      }

      const accessToken = await this.generateAuthToken(user);
      const cryptoEncrypt = this.cryptoService.encryptData(accessToken);
      const createDeviceObj: CreateDeviceInterface = {
        userId: user._id,
        accessToken: accessToken,
        role: user.role,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        fcmToken: params.fcmToken,
      };
      await this.deviceModel.deleteMany({ userId: createDeviceObj.userId });
      await this.deviceModel.create(createDeviceObj);
      user.failedLoginAttempts = 0;
      user.lastFailedLoginAttempt = null;
      await user.save();
      console.log("✌️user --->", user);

      const finalRes: UserLoginInterface = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        accessToken: cryptoEncrypt,
        role: user.role,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        profileImage: user.profileImage,
        permissions: user.permissions,
      };
      await this.userModel.findOneAndUpdate(
        { _id: user._id },
        { lastLoginTime: new Date().toISOString() },
      );

      return finalRes;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async resendOtp(body: ResendOtp) {
    try {
      const user = await this.userModel.findOne({ _id: body.userId });
      if (!user) {
        throw AuthExceptions.AccountNotExist();
      }
      const otpResult = await sendOTP(user.phoneNumber);
      if (!otpResult.success) {
        throw new Error("Failed to send OTP: " + otpResult.error);
      }
      return {
        userId: user._id,
        otpSent: true,
        message: AUTHENTICATION.OTP_SEND,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async verifyOtp(body: VerifyOtp) {
    try {
      const user = await this.userModel.findOne({ _id: body.userId });

      const masterOTP = process.env.MASTER_OTP;

      if (body.otp !== masterOTP) {
        if (process.env.APP_ENV === AppEnvironment.PRODUCTION) {
          const otpVerifyResult = await verifyOTP(user.phoneNumber, body.otp);
          if (!otpVerifyResult.success) {
            throw new Error("Please enter valid OTP.");
          }
        }
      }
      const accessToken = await this.generateAuthToken(user);
      const cryptoEncrypt = this.cryptoService.encryptData(accessToken);
      const createDeviceObj: CreateDeviceInterface = {
        userId: user._id,
        accessToken: accessToken,
        role: user.role,
        deviceId: body.deviceId,
        deviceType: body.deviceType,
        fcmToken: body.fcmToken,
      };
      await this.deviceModel.deleteMany({ userId: createDeviceObj.userId });
      await this.deviceModel.create(createDeviceObj);

      const finalRes: UserLoginInterface = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        accessToken: cryptoEncrypt,
        role: user.role,
        deviceId: body.deviceId,
        deviceType: body.deviceType,
        profileImage: user.profileImage,
        permissions: user.permissions,
      };
      await this.userModel.findOneAndUpdate(
        { _id: user._id },
        { lastLoginTime: new Date().toISOString() },
      );
      return finalRes;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async generateAuthToken(user) {
    const payload: JwtPayload = {
      _id: user._id,
      role: user.role,
      permissions: user.permissions,
    };
    return this.jwtService.sign(payload);
  }

  // async createInitialUser(): Promise<void> {
  //   const user = await this.userModel.findOne({
  //     email: this.configService.get("database.initialUser.email"),
  //   });

  //   if (user) {
  //     this.myLogger.customLog(RESPONSE_SUCCESS.INITIAL_USER_ALREADY_LOADED);
  //   } else {
  //     const params: CreateInitialUserInterface = {
  //       firstName: this.configService.get("database.initialUser.firstName"),
  //       lastName: this.configService.get("database.initialUser.lastName"),
  //       email: this.configService.get("database.initialUser.email"),
  //       role: Role.ADMIN,
  //       phoneNumber: this.configService.get("database.initialUser.phoneNumber"),
  //     };

  //     const encryptedPassword = await hash(
  //       this.configService.get("database.initialUser.password"),
  //       Number(process.env.PASSWORD_SALT),
  //     );

  //     params.password = encryptedPassword;

  //     this.userModel.create(params);
  //     this.myLogger.log(RESPONSE_SUCCESS.INITIAL_USER_LOADED);
  //   }
  // }
  async createInitialUser(): Promise<void> {
    const usersToCreate = [
      {
        configKey: "database.initialUser",
        logSuccess: RESPONSE_SUCCESS.INITIAL_USER_LOADED,
        logExists: RESPONSE_SUCCESS.INITIAL_USER_ALREADY_LOADED,
        role: Role.ADMIN,
      },
      {
        configKey: "database.larry",
        logSuccess: RESPONSE_SUCCESS.TEST_USER_LOADED,
        logExists: RESPONSE_SUCCESS.TEST_USER_ALREADY_LOADED,
        role: Role.ADMIN, // change this role accordingly
      },
    ];
    // const user1 = await this.userModel.findOne({
    //   email: this.configService.get("database.initialUser.email"),
    // });

    // const user2 = await this.userModel.findOne({
    //   email: this.configService.get("database.testUser.email"),
    // });

    // if (user1) {
    //   this.myLogger.customLog(RESPONSE_SUCCESS.INITIAL_USER_ALREADY_LOADED);
    // } else {
    //   const params: CreateInitialUserInterface = {
    //     firstName: this.configService.get("database.initialUser.firstName"),
    //     lastName: this.configService.get("database.initialUser.lastName"),
    //     email: this.configService.get("database.initialUser.email"),
    //     role: Role.ADMIN,
    //     phoneNumber: this.configService.get("database.initialUser.phoneNumber"),
    //   };

    //   const encryptedPassword = await hash(
    //     this.configService.get("database.initialUser.password"),
    //     Number(process.env.PASSWORD_SALT),
    //   );

    //   params.password = encryptedPassword;

    //   this.userModel.create(params);
    //   this.myLogger.log(RESPONSE_SUCCESS.INITIAL_USER_LOADED);
    // }
    for (const userConfig of usersToCreate) {
      const email = this.configService.get(`${userConfig.configKey}.email`);
      const existingUser = await this.userModel.findOne({ email });

      if (existingUser) {
        this.myLogger.customLog(userConfig.logExists);
        continue;
      }

      const password = this.configService.get(
        `${userConfig.configKey}.password`,
      );
      const hashedPassword = await hash(
        password,
        Number(process.env.PASSWORD_SALT),
      );

      const userData: CreateInitialUserInterface = {
        firstName: this.configService.get(`${userConfig.configKey}.firstName`),
        lastName: this.configService.get(`${userConfig.configKey}.lastName`),
        email,
        phoneNumber: this.configService.get(
          `${userConfig.configKey}.phoneNumber`,
        ),
        role: userConfig.role,
        password: hashedPassword,
      };

      await this.userModel.create(userData);
      this.myLogger.log(userConfig.logSuccess);
    }
  }

  /**
   * Common Api for all panel logout user.
   */
  async logout(req: Request): Promise<object> {
    try {
      let accessToken: string;
      const authorizationHeader = req.headers.authorization;

      if (authorizationHeader.startsWith("Bearer ")) {
        accessToken = authorizationHeader.slice(7); // Remove "Bearer " prefix
      }
      const device = await this.deviceModel
        .findOne({
          accessToken: accessToken,
        })
        .lean();
      console.log("device: ", device);
      // if (device) {
      //   await this.deviceModel.deleteOne({ _id: device._id });
      // }
      await this.userModel.findOne({
        _id: new mongoose.Types.ObjectId(req.user["_id"]),
      });
      return {};
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  /**
   * Common Api for all panel logout user.
   */
  async logoutUser(accessToken): Promise<boolean> {
    try {
      const device = await this.deviceModel
        .findOne({
          accessToken: accessToken,
        })
        .lean();
      if (!device) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.DEVICE_DETAILS_NOT_FOUND,
        );
      }
      await this.deviceModel.deleteOne({ _id: device._id });
      return true;
    } catch (error) {
      return false;
    }
  }

  async forgotPassword(params: ForgotPasswordDto) {
    try {
      const matchParams: RootFilterQuery<UserDocument> = {
        email: params.email,
        isDeleted: false,
      };
      const user = await this.userModel.findOne(matchParams);

      if (!user) {
        throw AuthExceptions.AccountNotExist();
      }

      if (!user.isActive) {
        throw AuthExceptions.AccountNotActive();
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

      await new EmailService().emailSender({
        to: user.email.toLowerCase(),
        html: resetPasswordTemplate(
          `${process.env.ADMIN_URL}/reset-password/${passwordResetToken}`,
          `${user.firstName} ${user.lastName}`,
        ),
        subject: "Password Reset | Chiller check",
      });

      return {
        _id: user._id,
        resetPasswordToken: passwordResetToken,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async resetPassword(body: ResetPasswordDto) {
    try {
      const user = await this.userModel.findOne({
        resetPasswordToken: body.resetPasswordToken,
        isActive: true,
        isDeleted: false,
      });

      if (!user) {
        throw AuthExceptions.PasswordResetTokenExpired();
      }

      if (Date.now() > new Date(user.resetPasswordExpires).getTime()) {
        throw AuthExceptions.PasswordResetTokenExpired();
      }

      const encryptedPassword = await hash(
        body.password,
        Number(process.env.PASSWORD_SALT),
      );

      await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          password: encryptedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      );

      return {
        _id: user._id,
        phoneNumber: user.phoneNumber,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async changePassword(body: ChangePasswordDto, req) {
    try {
      const findUser = await this.userModel.findOne({
        _id: req.user._id,
      });

      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      if (body.currentPassword === body.newPassword) {
        throw TypeExceptions.BadRequestCommonFunction(
          USER.PASSWORD_NOT_CURRENT,
        );
      }

      if (!bcrypt.compareSync(body.currentPassword, findUser.password)) {
        throw TypeExceptions.BadRequestCommonFunction(USER.CUREENT_PASSWORD);
      } else {
        const newPassword = await bcrypt.hash(body.newPassword, 10);

        await this.userModel.findOneAndUpdate(
          {
            _id: findUser._id,
          },
          {
            password: newPassword,
          },
        );
        return {};
      }
    } catch (error) {
      if (error?.response?.error) {
        throw error;
      } else {
        throw CustomError.UnknownError(error?.message, error?.status);
      }
    }
  }
}

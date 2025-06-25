import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { LoggerService } from "../../common/logger/logger.service";
import { getModelToken } from "@nestjs/mongoose";
import { User } from "../../common/schema/user.schema";
import { ConfigService } from "@nestjs/config";
import { CryptoService } from "src/common/services/crypto.service";
import { CommonService } from "src/common/services/common.service";
import { Cms } from "src/common/schema/cms.schema";
import { Device } from "src/common/schema/device.schema";
import { DeviceType, Role } from "src/common/constants/enum.constant";
import * as bcrypt from "bcrypt";
import { Request } from "express";
import { AuthExceptions, CustomError } from "src/common/helpers/exceptions";
import {
  AUTHENTICATION,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import { EmailService } from "src/common/helpers/email/email.service";
import mongoose from "mongoose";
import { LoginDto, ResetPasswordDto } from "src/common/dto/common.dto";
import * as otpService from "../../common/helpers/twillio/twillio.service"; // adjust path to where verifyOTP is defined

describe("AuthService", () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deviceModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let commonService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let configService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cryptoService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let emailService: any;

  beforeEach(async () => {
    jest.restoreAllMocks(); // ✅ Resets mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        LoggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "auth.resetPasswordExpiryDuration") return "3600000"; // 1 hour expiry
              return null;
            }),
          },
        },
        CryptoService,
        {
          provide: CommonService,
          useValue: {
            generateRandomString: jest.fn().mockReturnValue("randomToken123"),
          },
        },
        {
          provide: EmailService,
          useValue: {
            emailSender: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(), // ✅ Ensure `findOne` is a Jest mock function
            findOneAndUpdate: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(Cms.name),
          useValue: {
            findOne: jest.fn(), // Ensure `findOne` is defined
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(Device.name),
          useValue: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService, deviceModel);
    userModel = module.get(getModelToken(User.name));
    configService = module.get<ConfigService>(ConfigService);
    commonService = module.get<CommonService>(CommonService);
    cryptoService = module.get<CryptoService>(CryptoService);
    cryptoService.encryptData = jest.fn().mockReturnValue("encryptedToken");

    deviceModel = module.get(getModelToken(Device.name));
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);

    // emailService.emailSender = jest.fn({ success: true }); // ✅ Mock email sender
    emailService.emailSender.mockResolvedValue({ success: true });

    //loggerService = module.get<LoggerService>(LoggerService);

    // ✅ Explicitly mock configService.get() to return real test values
    configService.get = jest.fn((key) => {
      const mockConfig = {
        "database.initialUser.email": "admin@example.com",
        "database.initialUser.firstName": "Admin",
        "database.initialUser.lastName": "User",
        "database.initialUser.password": "securepassword",
        "externalService.url": "https://mocked-service.com/api",
      };
      return mockConfig[key] || null;
    });

    // Mock logger
    // loggerService.customLog = jest.fn();
    // loggerService.log = jest.fn();

    // Explicitly mock commonService functions
    commonService.generateRandomString = jest.fn();

    // Explicitly mock configService.get as a jest function
    //  configService.get = jest.fn();

    process.env.JWT_SECRET = "P@m!umH@$l&&CD!@&*&";
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = (headers: any, user: any): Partial<Request> => ({
    headers,
    user,
  });

  it("should throw an error if user is not found", async () => {
    userModel.findOne = jest.fn().mockResolvedValue(null);

    const body = { currentPassword: "1234556", newPassword: "4353122" };
    const req = { user: { _id: "123" } };

    await expect(service.changePassword(body, req)).rejects.toThrow(
      "User not found.",
    );
  });

  it("should throw an error if current password matches new password", async () => {
    userModel.findOne = jest.fn().mockResolvedValue({ password: "hashedPass" });

    const body = { currentPassword: "oldPass", newPassword: "oldPass" };
    const req = { user: { _id: "123" } };

    await expect(service.changePassword(body, req)).rejects.toThrow(
      "New password should not be same as current password.",
    );
  });

  it("should throw an error if current password is incorrect", async () => {
    userModel.findOne = jest.fn().mockResolvedValue({ password: "hashedPass" });
    jest.spyOn(bcrypt, "compareSync").mockReturnValue(false); // ✅ Correct way

    const body = { currentPassword: "wrongPass", newPassword: "newPass" };
    const req = { user: { _id: "123" } };

    await expect(service.changePassword(body, req)).rejects.toThrow(
      "Current password is invalid.",
    );
  });

  describe("generateAuthToken", () => {
    it("should generate a JWT token with the user payload", async () => {
      const mockUser = {
        _id: "user123",
        role: "ADMIN",
        advancedmdId: "amd456",
      };
      const mockToken = "mock-jwt-token";

      (jwtService.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await service.generateAuthToken(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        _id: "user123",
        role: "ADMIN",
      });
      expect(result).toBe(mockToken);
    });

    it("should handle users without advancedmdId", async () => {
      const mockUser = {
        _id: "user789",
        role: "PATIENT",
      };
      const mockToken = "patient-jwt-token";

      (jwtService.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await service.generateAuthToken(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        _id: "user789",
        role: "PATIENT",
      });
      expect(result).toBe(mockToken);
    });

    it("should handle jwt service throwing an error", async () => {
      const mockUser = {
        _id: "user101",
        role: "DOCTOR",
      };
      const mockError = new Error("JWT signing failed");

      (jwtService.sign as jest.Mock).mockRejectedValue(mockError);

      await expect(service.generateAuthToken(mockUser)).rejects.toThrow(
        mockError,
      );
    });
  });

  it("should do nothing if the initial user already exists", async () => {
    userModel.findOne.mockResolvedValue({ _id: "existingUserId" });

    jest.spyOn(service["myLogger"], "customLog").mockImplementation(jest.fn());

    await service.createInitialUser();

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "admin@example.com",
    });
    expect(userModel.create).not.toHaveBeenCalled();
    expect(service["myLogger"].customLog).toHaveBeenCalledWith(
      RESPONSE_SUCCESS.INITIAL_USER_ALREADY_LOADED, // ✅ Use the actual message
    );
  });

  it("should create the initial user if it does not exist", async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({ _id: "newUserId" });

    // ✅ Ensure `myLogger.log` is a Jest mock function
    jest.spyOn(service["myLogger"], "log").mockImplementation(jest.fn());

    await service.createInitialUser();

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "admin@example.com",
    });
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        role: Role.ADMIN,
        password: expect.any(String),
      }),
    );
    expect(service["myLogger"].log).toHaveBeenCalledWith(
      "Initial user loaded successfully.",
    );
  });

  it("should log out successfully and delete the device token", async () => {
    const req = mockRequest(
      { authorization: "Bearer testAccessToken" },
      { _id: new mongoose.Types.ObjectId(), role: Role.ADMIN },
    );

    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "deviceId" }), // ✅ Fix: Mock lean()
    });
    deviceModel.deleteOne.mockResolvedValue({});

    const result = await service.logout(req as Request);

    expect(deviceModel.findOne).toHaveBeenCalledWith({
      accessToken: "testAccessToken",
    });
    expect(deviceModel.deleteOne).toHaveBeenCalledWith({ _id: "deviceId" });
    expect(result).toEqual({});
  });

  it("should not delete device if no matching token is found", async () => {
    const req = mockRequest(
      { authorization: "Bearer invalidToken" },
      { _id: new mongoose.Types.ObjectId(), role: Role.ADMIN },
    );

    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null), // ✅ Fix: Properly mock `lean()`
    });

    const result = await service.logout(req as Request);

    expect(deviceModel.findOne).toHaveBeenCalledWith({
      accessToken: "invalidToken",
    });
    expect(deviceModel.deleteOne).not.toHaveBeenCalled(); // ✅ Ensure delete is not called
    expect(result).toEqual({}); // ✅ Ensure function still returns an empty object
  });

  it("should throw an error if an exception occurs", async () => {
    const req = mockRequest(
      { authorization: "Bearer validToken" },
      { _id: new mongoose.Types.ObjectId(), role: Role.ADMIN },
    );

    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB error")), // ✅ Ensures lean() is mocked
    });

    await expect(service.logout(req as Request)).rejects.toThrowError(
      CustomError.UnknownError("DB error", undefined),
    );

    expect(deviceModel.deleteOne).not.toHaveBeenCalled();
  });

  it("should log out successfully and delete the device token", async () => {
    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "deviceId" }), // ✅ Mock resolved device
    });

    deviceModel.deleteOne.mockResolvedValue({}); // ✅ Mock successful delete

    const result = await service.logoutUser("validToken");

    expect(deviceModel.findOne).toHaveBeenCalledWith({
      accessToken: "validToken",
    });
    expect(deviceModel.deleteOne).toHaveBeenCalledWith({ _id: "deviceId" });
    expect(result).toBe(true);
  });

  it("should throw an error if no matching device is found", async () => {
    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null), // ✅ Mock no device found
    });

    const result = await service.logoutUser("invalidToken");

    expect(deviceModel.findOne).toHaveBeenCalledWith({
      accessToken: "invalidToken",
    });
    expect(deviceModel.deleteOne).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should return false if an exception occurs", async () => {
    deviceModel.findOne.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("DB error")), // ✅ Mock DB error
    });

    const result = await service.logoutUser("validToken");

    expect(deviceModel.findOne).toHaveBeenCalledWith({
      accessToken: "validToken",
    });
    expect(deviceModel.deleteOne).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should throw an error if user does not exist", async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.forgotPassword({
        email: "notfound@example.com",
      }),
    ).rejects.toThrow(AuthExceptions.AccountNotExist());

    expect(userModel.findOne).toHaveBeenCalled();
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(emailService.emailSender).not.toHaveBeenCalled();
  });

  it("should throw an error if user is not active", async () => {
    const inactiveUser = {
      _id: new mongoose.Types.ObjectId(),
      email: "inactive@example.com",
      isActive: false,
      role: Role.ADMIN,
      dob: new Date("1990-01-01"),
      phoneNumber: "11234567890",
    };

    userModel.findOne.mockResolvedValue(inactiveUser);

    await expect(
      service.forgotPassword({
        email: inactiveUser.email,
      }),
    ).rejects.toThrow(AuthExceptions.AccountNotActive());

    expect(userModel.findOne).toHaveBeenCalled();
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(emailService.emailSender).not.toHaveBeenCalled();
  });

  it("should throw a generic error if an exception occurs", async () => {
    // Mock findOne to simulate a database error
    userModel.findOne.mockRejectedValue(new Error("DB error"));

    await expect(
      service.forgotPassword({
        email: "error@example.com",
      }),
    ).rejects.toThrow(CustomError.UnknownError("DB error", 404)); // ✅ Match actual error message

    // Ensure no further operations were executed
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(emailService.emailSender).not.toHaveBeenCalled();
  });

  it("should hash the password before resetting it", async () => {
    const hashSpy = jest
      .spyOn(bcrypt, "hash")
      .mockResolvedValue("hashedPassword123" as never);

    const mockUser = {
      _id: "userId",
      resetPasswordToken: "validToken",
      resetPasswordExpires: new Date(Date.now() + 3600000),
      isActive: true,
      isDeleted: false,
      isPasswordSetup: false,
      dob: new Date("1990-01-01"),
      phoneNumber: "1234567890",
    };

    userModel.findOne.mockResolvedValue(mockUser);
    userModel.findOneAndUpdate.mockResolvedValue(true);

    await service.resetPassword({
      resetPasswordToken: "validToken",
      password: "newSecurePassword",
    });

    expect(hashSpy).toHaveBeenCalledWith(
      "newSecurePassword",
      expect.any(Number),
    );

    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ password: "hashedPassword123" }),
    );
  });

  it("should throw an error if the current password is incorrect", async () => {
    userModel.findOne = jest.fn().mockResolvedValue({ password: "hashedPass" });

    jest.spyOn(bcrypt, "compareSync").mockReturnValue(false); // Mock incorrect password

    const body = { currentPassword: "wrongPass", newPassword: "newPass" };
    const req = { user: { _id: "123" } };

    await expect(service.changePassword(body, req)).rejects.toThrow(
      "Current password is invalid.",
    );
  });

  it("should throw PasswordResetTokenExpired if user is not found", async () => {
    const mockParams: ResetPasswordDto = {
      resetPasswordToken: "invalid-token",
      password: "NewPassword123",
    };

    // Mock findOne to return null (user not found)
    jest.spyOn(userModel, "findOne").mockResolvedValue(null);

    await expect(service.resetPassword(mockParams)).rejects.toThrow(
      AuthExceptions.PasswordResetTokenExpired(),
    );
  });

  it("should throw PasswordResetTokenExpired if token is expired", async () => {
    const mockParams: ResetPasswordDto = {
      resetPasswordToken: "valid-token",
      password: "NewPassword123",
    };

    const expiredUser = {
      _id: "user123",
      isActive: true,
      isDeleted: false,
      resetPasswordToken: "valid-token",
      resetPasswordExpires: new Date(Date.now() - 10000), // Expired 10 seconds ago
    };

    // Mock findOne to return a user with an expired token
    jest.spyOn(userModel, "findOne").mockResolvedValue(expiredUser);

    await expect(service.resetPassword(mockParams)).rejects.toThrow(
      AuthExceptions.PasswordResetTokenExpired(),
    );
  });

  it("should throw CustomError.UnknownError when an unexpected error occurs", async () => {
    const mockParams: ResetPasswordDto = {
      resetPasswordToken: "valid-token",
      password: "NewPassword123",
    };

    // Mock userModel.findOne to throw an error
    jest
      .spyOn(userModel, "findOne")
      .mockRejectedValue(new Error("Database error"));

    await expect(service.resetPassword(mockParams)).rejects.toThrow(
      CustomError.UnknownError("Database error", 500),
    );
  });
  it("should return accessToken on successful login", async () => {
    const mockUser = {
      _id: "user123",
      email: "chiller.check@yopmail.com",
      password: "$2b$10$Kcb/lotDNJUyuwkrQYlPnOR0us8W.2lDQgQkNjq6lbiWst2QlKIa.", // bcrypt hash of "Password123"
      firstName: "chiller",
      lastName: "check",
      phoneNumber: "+919662256782",
      role: "admin",
      isActive: true,
      isDeleted: false,
      failedLoginAttempts: 0,
      lastFailedLoginAttempt: null,
      save: jest.fn(),
    };

    userModel.findOne.mockResolvedValue({ ...mockUser, save: jest.fn() });
    deviceModel.findOne.mockResolvedValue({}); // existing device found
    jest
      .spyOn(service, "generateAuthToken")
      .mockResolvedValue("mockedToken123");
    jest
      .spyOn(cryptoService, "encryptData")
      .mockReturnValue("encryptedToken123");

    const params: LoginDto = {
      email: "chiller.check@yopmail.com",
      password: "Admin@12345",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "token123",
    };

    const result = await service.login(params);
    expect(result).toHaveProperty("accessToken");
    expect(result?.["accessToken"]).toBe("encryptedToken123");
  });

  describe("Login API - Test case", () => {
    const loginDto = {
      email: "chiller.check@yopmail.com",
      password: "Admin@12345",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "fcm123",
    };

    const baseUser = {
      _id: "userId",
      firstName: "John",
      lastName: "Doe",
      email: "chiller.check@yopmail.com",
      phoneNumber: "1234567890",
      password: "hashed-password",
      isActive: true,
      isDeleted: false,
      role: Role.ADMIN,
      save: jest.fn(),
      failedLoginAttempts: 0,
      lastFailedLoginAttempt: null,
    };

    it("should throw AccountNotExist if user is not found", async () => {
      userModel.findOne.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        AuthExceptions.AccountNotExist(),
      );
    });

    it("should throw AccountNotActive if user is inactive", async () => {
      const loginDto = {
        email: "john@example.com",
        password: "plain-password",
        deviceId: "device123",
        deviceType: DeviceType.WEB,
        fcmToken: "fcm123",
      };
      userModel.findOne.mockResolvedValue({ ...baseUser, isActive: false });
      await expect(service.login(loginDto)).rejects.toThrow(
        AuthExceptions.AccountNotActive(),
      );
    });

    it("should not deactivate admin even after failed login", async () => {
      const user = { ...baseUser, role: Role.ADMIN };
      userModel.findOne.mockResolvedValue(user);
      // require("bcryptjs").compareSync.mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        AuthExceptions.InvalidPassword(),
      );
      expect(user.save).not.toHaveBeenCalled(); // because admin shouldn't increment failedLoginAttempts
    });
  });
  it("should throw if user not found", async () => {
    userModel.findOne.mockResolvedValue(null);

    const params = {
      email: "notfound@example.com",
      password: "wrong",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "token123",
    };

    await expect(service.login(params)).rejects.toThrow(
      AuthExceptions.AccountNotExist(),
    );
  });

  it("should successfully resend OTP", async () => {
    const mockUser = {
      _id: "user123",
      phoneNumber: "+1234567890",
    };

    userModel.findOne.mockResolvedValue(mockUser);
    jest
      .spyOn(otpService, "sendOTP")
      .mockResolvedValue({ success: true, sid: "1234" });

    const result = await service.resendOtp({ userId: "user123" });

    expect(userModel.findOne).toHaveBeenCalledWith({ _id: "user123" });
    expect(otpService.sendOTP).toHaveBeenCalledWith(mockUser.phoneNumber);
    expect(result).toEqual({
      userId: "user123",
      otpSent: true,
      message: AUTHENTICATION.OTP_SEND,
    });
  });
  it("should throw AccountNotExist if user is not found", async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(service.resendOtp({ userId: "user123" })).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );

    expect(userModel.findOne).toHaveBeenCalledWith({ _id: "user123" });
  });
  it("should verify OTP and return accessToken", async () => {
    const mockUser = {
      _id: "user123",
      phoneNumber: "1234567890",
      role: "USER",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      save: jest.fn(),
    };

    const body = {
      userId: "user123",
      otp: "123456",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "fcmToken",
    };

    userModel.findOne.mockResolvedValue(mockUser);

    jest.spyOn(otpService, "verifyOTP").mockResolvedValue({ success: true });

    jest
      .spyOn(service, "generateAuthToken")
      .mockResolvedValue("access_token_123");

    jest.spyOn(cryptoService, "encryptData").mockReturnValue("encrypted_token");

    const result = await service.verifyOtp(body);

    expect(result).toEqual({
      _id: mockUser._id,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      email: mockUser.email,
      phoneNumber: mockUser.phoneNumber,
      accessToken: "encrypted_token",
      role: mockUser.role,
      deviceId: body.deviceId,
      deviceType: body.deviceType,
    });

    expect(deviceModel.deleteMany).toHaveBeenCalledWith({
      userId: mockUser._id,
    });
    expect(deviceModel.create).toHaveBeenCalled();
  });

  it("should throw if OTP verification fails", async () => {
    const mockUser = {
      _id: "user123",
      phoneNumber: "1234567890",
      role: "USER",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      save: jest.fn(),
    };

    const body = {
      userId: "user123",
      otp: "wrongOtp",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "fcmToken",
    };

    userModel.findOne.mockResolvedValue(mockUser);

    jest
      .spyOn(otpService, "verifyOTP")
      .mockResolvedValue({ success: false, error: "Invalid OTP" });

    await expect(service.verifyOtp(body)).rejects.toThrow(
      "Failed to Verify OTP: Invalid OTP",
    );
  });

  it("should throw if user not found", async () => {
    const body = {
      userId: "nonExistingUser",
      otp: "123456",
      deviceId: "device123",
      deviceType: DeviceType.WEB,
      fcmToken: "fcmToken",
    };

    userModel.findOne.mockResolvedValue(null);

    await expect(service.verifyOtp(body)).rejects.toThrow(
      "Cannot read properties of null (reading 'phoneNumber')",
    );
  });
});

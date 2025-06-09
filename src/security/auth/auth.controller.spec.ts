import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { LoggerService } from "../../common/logger/logger.service";
import { getModelToken } from "@nestjs/mongoose";
import { User } from "../../common/schema/user.schema";
import { UserModel } from "../../common/test/schema.model";
import { ConfigService } from "@nestjs/config";
import { CryptoService } from "src/common/services/crypto.service";
import { CommonService } from "src/common/services/common.service";
import { Cms } from "src/common/schema/cms.schema";
import { Device } from "src/common/schema/device.schema";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  VerifyOtp,
} from "src/common/dto/common.dto";
import { DeviceType } from "src/common/constants/enum.constant";
import { Request } from "express";

describe("AuthController", () => {
  let controller: AuthController, service: AuthService;

  const mockCmsModel = {};

  const mockAuthService = {
    passwordSignIn: jest.fn(),
    login: jest.fn(),
    verifyOtp: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtService,
        LoggerService,
        ConfigService,
        CryptoService,
        CommonService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: getModelToken(User.name),
          useClass: UserModel,
        },
        {
          provide: getModelToken(Cms.name),
          useValue: mockCmsModel, // 👈 Mock CmsModel
        },
        {
          provide: getModelToken(Device.name),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe("health", () => {
    it("should return true", async () => {
      const result = await controller.health();
      expect(result).toBe(true);
    });
  });

  describe("login", () => {
    it("should call authService.login with params", async () => {
      const params: LoginDto = {
        email: "test@example.com",
        password: "password",
        deviceId: "deviceId",
        deviceType: DeviceType.IOS,
        fcmToken: "asw",
      };
      await controller.login(params);
      expect(service.login).toHaveBeenCalledWith(params);
    });
  });
  describe("verifyOtp", () => {
    it("should call authService.verifyOtp with params", async () => {
      const params: VerifyOtp = {
        otp: "123456",
        deviceId: "deviceId",
        userId: "1234142",
        deviceType: DeviceType.IOS,
        fcmToken: "asw",
      };
      await controller.verifyOtp(params);
      expect(service.verifyOtp).toHaveBeenCalledWith(params);
    });
  });

  describe("forgotPassword", () => {
    it("should call authService.forgotPassword with body", async () => {
      const body: ForgotPasswordDto = {
        email: "test@example.com",
      };
      await controller.forgotPassword(body);
      expect(service.forgotPassword).toHaveBeenCalledWith(body);
    });
  });

  describe("resetPassword", () => {
    it("should call authService.resetPassword with body", async () => {
      const body: ResetPasswordDto = {
        password: "newPassword",
        resetPasswordToken: "token",
      };
      await controller.resetPassword(body);
      expect(service.resetPassword).toHaveBeenCalledWith(body);
    });
  });

  describe("changePassword", () => {
    it("should call authService.changePassword with body and request", async () => {
      const body: ChangePasswordDto = {
        currentPassword: "oldPass123",
        newPassword: "newPass123",
      };

      const mockRequest = {
        user: { id: "mockUserId" }, // Simulating user request object
      } as unknown as Request;

      await controller.changePassword(body, mockRequest);

      expect(service.changePassword).toHaveBeenCalledWith(body, mockRequest);
    });
  });

  describe("logout", () => {
    it("should call authService.logout with request", async () => {
      const mockRequest = {
        user: { id: "mockUserId" }, // Simulating user request object
      } as unknown as Request;

      await controller.logout(mockRequest);

      expect(service.logout).toHaveBeenCalledWith(mockRequest);
    });
  });
});

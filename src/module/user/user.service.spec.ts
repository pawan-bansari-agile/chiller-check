/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { getModelToken } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import mongoose, { Model, Types } from "mongoose";
import { EmailService } from "src/common/helpers/email/email.service";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { AppEnvironment, Role } from "src/common/constants/enum.constant";
import {
  ComparisonOperator,
  CreateUserDto,
  NotificationType,
  UpdateUserStatusDto,
  UserListDto,
} from "./dto/user.dto";
import { ModuleName } from "./types/user.types";
import { CommonService } from "src/common/services/common.service";
import { UpdateUserDto } from "src/common/dto/common.dto";
import { User } from "src/common/schema/user.schema";
import {
  AuthExceptions,
  CustomError,
  TypeExceptions,
} from "src/common/helpers/exceptions";
import { USER } from "src/common/constants/response.constant";
import { Facility } from "src/common/schema/facility.schema";
import { Chiller } from "src/common/schema/chiller.schema";
import { Company } from "src/common/schema/company.schema";
import { accountStatusTemplate } from "src/common/helpers/email/emailTemplates/accountStatusTemplate";

describe("UserService - createUser", () => {
  let service: UserService;
  let userModel: any;
  let companyModel: any;
  let facilityModel: any;
  let chillerModel: any;
  let emailService: any;
  let imageUploadService: any;
  let configService: any;
  let commonService: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    companyModel = {
      updateOne: jest.fn(),
    };

    facilityModel = {
      updateMany: jest.fn(),
    };

    chillerModel = {
      updateMany: jest.fn(),
    };

    emailService = {
      emailSender: jest.fn(),
    };

    imageUploadService = {
      moveTempToRealFolder: jest.fn(),
    };

    commonService = {
      generateRandomString: jest.fn().mockReturnValue("mockToken"),
      moveTempToRealFolder: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue(3600000), // 1 hour in ms
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: userModel },
        { provide: getModelToken("Company"), useValue: companyModel },
        { provide: getModelToken("Facility"), useValue: facilityModel },
        { provide: getModelToken("Chiller"), useValue: chillerModel },
        { provide: EmailService, useValue: emailService },
        { provide: ImageUploadService, useValue: imageUploadService },
        { provide: ConfigService, useValue: configService },
        { provide: CommonService, useValue: commonService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should throw if user already exists", async () => {
    userModel.findOne.mockResolvedValue({ email: "existing@example.com" });

    await expect(
      service.createUser({ email: "existing@example.com" } as any, {}),
    ).rejects.toThrow(
      "Email you entered is already registered. please use different email.",
    );
  });

  it("should create a user and send email (production/dev)", async () => {
    // Arrange
    const dto: CreateUserDto = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      role: Role.CORPORATE_MANAGER,
      companyId: new Types.ObjectId().toHexString(),
      chillerIds: [],
      facilityIds: [],
      permissions: {
        company: { view: true, edit: false },
        facility: { view: true, edit: false },
        chiller: { view: true, edit: false },
        users: { view: true, edit: false },
        [ModuleName.LOG]: {},
        [ModuleName.MAINTENANCE]: {},
        [ModuleName.REPORT]: {},
        [ModuleName.SETTING]: {},
        [ModuleName.CHILLER_BULK_COST_UPDATE]: {},
      },
      alerts: {
        general: {
          notifyBy: NotificationType.EMAIL,
          conditions: [],
        },
        logs: [],
      },
      phoneNumber: "",
    };

    const mockUserId = new Types.ObjectId();

    const mockUser = {
      _id: mockUserId,
      toObject: () => ({ _id: mockUserId }),
      email: dto.email,
      profileImage: null,
      ...dto,
    };

    const token = "mock-reset-token";

    jest.spyOn(userModel, "findOne").mockResolvedValue(null); // user doesn't exist
    jest.spyOn(userModel, "create").mockResolvedValue(mockUser as any);
    jest.spyOn(userModel, "findOneAndUpdate").mockResolvedValue(null);
    jest.spyOn(companyModel, "updateOne").mockResolvedValue({} as any);
    jest.spyOn(facilityModel, "updateMany").mockResolvedValue({} as any);
    jest.spyOn(configService, "get").mockReturnValue("86400000");
    jest.spyOn(emailService, "emailSender").mockResolvedValue("email sent");
    jest.spyOn(commonService, "generateRandomString").mockReturnValue(token);
    jest
      .spyOn(imageUploadService, "moveTempToRealFolder")
      .mockResolvedValue(undefined);

    process.env.APP_ENV = AppEnvironment.PRODUCTION;

    // Act
    const result = await service.createUser(dto, {});

    // Assert
    expect(result).toEqual(mockUser);
  });

  it("should skip alerts for SUB_ADMIN", async () => {
    process.env.APP_ENV = AppEnvironment.PRODUCTION;

    const dto = {
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      phoneNumber: "+12345678901",
      role: Role.SUB_ADMIN,
      permissions: {
        facility: { view: true },
      },
    } as CreateUserDto;

    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      email: "admin@example.com",
    });
    userModel.findOneAndUpdate.mockResolvedValue({});
    emailService.emailSender.mockResolvedValue({});

    const result = await service.createUser(dto, {});
    expect(result).toHaveProperty("email", "admin@example.com");
    expect(userModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ alerts: expect.anything() }),
    );
  });

  it("should return email template in staging/local environment", async () => {
    process.env.APP_ENV = "test"; // not DEV or PROD

    const dto = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phoneNumber: "+12345678901",
      role: Role.FACILITY_MANAGER,
      facilityIds: [],
      companyId: "60f6a4d4a9c0a0b3e8d8e8e8",
      permissions: {
        facility: { view: true },
      },
    } as CreateUserDto;

    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      email: "test@example.com",
    });
    userModel.findOneAndUpdate.mockResolvedValue({});
    emailService.emailSender.mockResolvedValue("mock-html");

    const result = await service.createUser(dto, {});
    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("emailTemplate", "mock-html");
  });

  it("should handle unknown errors and throw CustomError", async () => {
    userModel.findOne.mockRejectedValue(new Error("DB failure"));

    await expect(
      service.createUser({ email: "fail@test.com" } as any, {}),
    ).rejects.toThrow("DB failure");
  });
});

describe("UserService - updateProfile", () => {
  let service: UserService;
  let userModel: any;
  let companyModel: any;
  let facilityModel: any;
  let chillerModel: any;
  let imageUploadService: any;
  // let configService: any;

  // let commonService: any;

  // let emailService: any;

  const mockUserId = new mongoose.Types.ObjectId();
  const mockLoggedInId = new mongoose.Types.ObjectId();

  const mockUserDoc = {
    _id: mockUserId,
    isActive: true,
    role: Role.OPERATOR,
    facilityIds: [],
    chillerIds: [],
    save: jest.fn(),
    firstName: "test",
    lastName: "user",
    phoneNumber: "+12345678901",
    isProfileUpdated: true,
    profileImage: "asdf.jpg",
  };

  const commonService = {
    generateRandomString: jest.fn().mockReturnValue("mockToken"),
    moveTempToRealFolder: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue(3600000), // 1 hour in ms
  };

  const mockLoggedInUser = {
    _id: mockLoggedInId,
    role: Role.ADMIN,
  };

  const emailService = {
    emailSender: jest.fn(),
  };

  imageUploadService = {
    moveTempToRealFolder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: {} },
        { provide: ImageUploadService, useValue: imageUploadService },
        { provide: EmailService, useValue: emailService },
        { provide: "CompanyModel", useValue: {} },
        { provide: "FacilityModel", useValue: {} },
        { provide: "ChillerModel", useValue: {} },
        { provide: ConfigService, useValue: configService },
        { provide: CommonService, useValue: commonService },
        {
          provide: "ImageUploadService",
          useValue: {
            moveTempToRealFolder: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken(User.name));
    companyModel = module.get("CompanyModel");
    facilityModel = module.get("FacilityModel");
    chillerModel = module.get("ChillerModel");
    imageUploadService = module.get("ImageUploadService");

    userModel.findById = jest
      .fn()
      .mockImplementationOnce(() => mockUserDoc)
      .mockImplementationOnce(() => mockLoggedInUser);

    companyModel.updateOne = jest.fn();
    facilityModel.updateMany = jest.fn();
    chillerModel.updateMany = jest.fn();
  });

  it("should throw if user not found", async () => {
    userModel.findById = jest.fn().mockResolvedValueOnce(null);

    await expect(
      service.updateProfile(
        mockUserId.toString(),
        {} as UpdateUserDto,
        mockLoggedInId.toString(),
      ),
    ).rejects.toThrow(AuthExceptions.AccountNotExist().message);
  });

  it("should throw if user is not active", async () => {
    userModel.findById = jest.fn().mockResolvedValueOnce({ isActive: false });

    await expect(
      service.updateProfile(
        mockUserId.toString(),
        {} as UpdateUserDto,
        mockLoggedInId.toString(),
      ),
    ).rejects.toThrow(AuthExceptions.AccountNotActive().message);
  });

  it("should update user fields and return correct message", async () => {
    const dto: UpdateUserDto = {
      firstName: "Updated",
      phoneNumber: "+19876543210",
      role: Role.FACILITY_MANAGER,
      companyId: new mongoose.Types.ObjectId().toString(),
      profileImage: "newImage.jpg",
    };

    const userDoc = { ...mockUserDoc, save: jest.fn() };

    userModel.findById = jest
      .fn()
      .mockResolvedValueOnce(userDoc) // user
      .mockResolvedValueOnce(mockLoggedInUser); // logged-in user

    const result = await service.updateProfile(
      mockUserId.toString(),
      dto,
      mockLoggedInId.toString(),
    );

    expect(userDoc.firstName).toBe(dto.firstName);
    expect(userDoc.phoneNumber).toBe(dto.phoneNumber);
    expect(userDoc.profileImage).toBe(dto.profileImage);
    expect(userDoc.role).toBe(dto.role);
    expect(userDoc.save).toHaveBeenCalled();

    // expect(imageUploadService.moveTempToRealFolder).toHaveBeenCalled();
    // expect(imageUploadService.deleteImage).toHaveBeenCalled();

    expect(result.message).toBe(USER.ADMIN_UPDATE);
    expect(result.user).toBeDefined();
  });

  it("should reset alerts if role is ADMIN", async () => {
    const dto: UpdateUserDto = {
      role: Role.ADMIN,
      alerts: {
        general: {
          notifyBy: NotificationType.EMAIL,
          conditions: [
            {
              metric: "Temp",
              warning: { operator: ComparisonOperator.GTE, threshold: 30 },
              alert: { operator: ComparisonOperator.GTE, threshold: 40 },
            },
          ],
        },
        logs: [],
      },
      phoneNumber: "+12345678901",
    };

    const userDoc = {
      ...mockUserDoc,
      alerts: {},
      save: jest.fn(),
    };

    userModel.findById = jest
      .fn()
      .mockImplementationOnce(() => userDoc)
      .mockImplementationOnce(() => mockLoggedInUser);

    const result = await service.updateProfile(
      mockUserId.toString(),
      dto,
      mockLoggedInId.toString(),
    );

    expect(userDoc.alerts).toEqual({
      general: { conditions: [] },
      logs: [],
    });
    expect(result).toHaveProperty("user");
  });

  it("should mark isProfileUpdated based on logged-in user", async () => {
    const dto: UpdateUserDto = {
      phoneNumber: "+12345678901",
    };

    const userDoc = {
      ...mockUserDoc,
      save: jest.fn(),
    };

    userModel.findById = jest
      .fn()
      .mockImplementationOnce(() => userDoc)
      .mockImplementationOnce(() => mockLoggedInUser);

    const result = await service.updateProfile(
      mockUserId.toString(),
      dto,
      mockLoggedInUser._id.toString(),
    );

    expect(userDoc.isProfileUpdated).toBe(true);
    expect(result.message).toBeDefined();
  });
});

describe("UserService - getUserById", () => {
  let service: UserService;
  let userModel: any;

  const mockUserId = new mongoose.Types.ObjectId().toString();

  const mockAggregatedUser = [
    {
      _id: new mongoose.Types.ObjectId(),
      firstName: "John",
      lastName: "Doe",
      name: "John Doe",
      email: "john.doe@example.com",
      phoneNumber: "1234567890",
      role: Role.OPERATOR,
      companyId: new mongoose.Types.ObjectId(),
      company: {
        _id: new mongoose.Types.ObjectId(),
        name: "Test Company",
        totalOperators: 2,
      },
      facilityIds: [new mongoose.Types.ObjectId()],
      facilities: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Facility A",
          totalChiller: 1,
          totalOperators: 2,
        },
      ],
      chillerIds: [new mongoose.Types.ObjectId()],
      chillers: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Chiller 1",
          facilityName: "Facility A",
          totalOperators: 2,
        },
      ],
      profileImage: "image.png",
      isActive: true,
      createdAt: new Date(),
      lastLoginTime: new Date(),
      resetPasswordToken: null,
      resetPasswordExpires: null,
      failedLoginAttempts: 0,
      lastFailedLoginAttempt: null,
      permissions: [],
      alerts: {},
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,

        // Mongoose model mocks using .name
        {
          provide: getModelToken(User.name),
          useValue: {
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Facility.name),
          useValue: {},
        },
        {
          provide: getModelToken(Chiller.name),
          useValue: {},
        },
        {
          provide: getModelToken(Company.name),
          useValue: {},
        },

        // Service mocks
        {
          provide: ImageUploadService,
          useValue: {
            moveTempToRealFolder: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: CommonService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken(User.name));
  });

  it("should return user data when found", async () => {
    userModel.aggregate.mockResolvedValueOnce(mockAggregatedUser);

    const result = await service.getUserById(mockUserId);

    expect(userModel.aggregate).toHaveBeenCalledWith(expect.any(Array));
    expect(result).toEqual(mockAggregatedUser[0]);
  });

  it("should throw AccountNotExist if user is not found", async () => {
    userModel.aggregate.mockResolvedValueOnce([]);

    await expect(service.getUserById(mockUserId)).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );
  });

  it("should throw UnknownError on exception", async () => {
    userModel.aggregate.mockRejectedValueOnce(new Error("Unexpected error"));

    await expect(service.getUserById(mockUserId)).rejects.toThrow(
      CustomError.UnknownError("Unexpected error", 500).message,
    );
  });
});

describe("UserService - findAll", () => {
  let userService: UserService;
  let userModel: any;

  const mockUserModel = {
    aggregate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("Facility"), useValue: {} },
        { provide: getModelToken("Chiller"), useValue: {} },
        { provide: getModelToken("Company"), useValue: {} },
        { provide: ImageUploadService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: CommonService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userModel = module.get<Model<any>>(getModelToken("User"));
  });

  it("should throw error if page or limit is invalid", async () => {
    const invalidPayload = { page: 0, limit: -1 };

    await expect(userService.findAll(invalidPayload)).rejects.toThrow(
      TypeExceptions.BadRequestCommonFunction(
        "Please enter valid page and limit values",
      ),
    );
  });

  it("should call aggregate with correct pipeline and return data", async () => {
    const mockPayload: UserListDto = {
      page: 1,
      limit: 10,
      search: "john",
      sort_by: "name",
      sort_order: "ASC",
      companyId: new mongoose.Types.ObjectId().toString(),
      facilityId: new mongoose.Types.ObjectId().toString(),
      role: Role.OPERATOR,
    };

    const mockResult = [
      {
        userList: [{ _id: "user1", name: "John Doe" }],
        totalRecords: [{ count: 1 }],
      },
    ];

    userModel.aggregate.mockResolvedValueOnce(mockResult);

    const result = await userService.findAll(mockPayload);

    expect(userModel.aggregate).toHaveBeenCalledWith(expect.any(Array));
    expect(result).toEqual({
      userList: [{ _id: "user1", name: "John Doe" }],
      totalRecords: 1,
    });
  });

  it("should return 0 if no records are found", async () => {
    const mockPayload = {
      page: 1,
      limit: 10,
    };

    userModel.aggregate.mockResolvedValueOnce([
      {
        userList: [],
        totalRecords: [],
      },
    ]);

    const result = await userService.findAll(mockPayload);

    expect(result.totalRecords).toBe(0);
    expect(result.userList).toEqual([]);
  });

  it("should throw CustomError on unknown errors", async () => {
    const mockPayload = { page: 1, limit: 10 };
    userModel.aggregate.mockRejectedValueOnce(new Error("Something failed"));

    await expect(userService.findAll(mockPayload)).rejects.toThrow(
      CustomError.UnknownError("Something failed", 500).message,
    );
  });
});

describe("UserService - updateUserStatus()", () => {
  let service: UserService;
  let userModel: any;
  let emailService: any;

  const mockUser: any = {
    _id: "userId123",
    email: "john@example.com",
    firstName: "John",
    isActive: false,
    isDeleted: false,
    isProfileUpdated: false,
    companyId: "company123",
    facilityIds: ["fac123"],
    save: jest.fn(),
  };

  const mockEmailService = {
    emailSender: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: { findById: jest.fn() } },
        { provide: getModelToken("Facility"), useValue: {} },
        { provide: getModelToken("Chiller"), useValue: {} },
        { provide: getModelToken("Company"), useValue: {} },
        { provide: EmailService, useValue: mockEmailService },
        { provide: getModelToken("ImageUploadService"), useValue: {} },
        // { provide: getModelToken('CommonService'), useValue: {} },
        { provide: CommonService, useValue: {} },
        // { provide: getModelToken('ConfigService'), useValue: {} },
        { provide: ConfigService, useValue: {} },
        {
          provide: ImageUploadService,
          useValue: {
            uploadProfileImage: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken("User"));
    emailService = module.get<EmailService>(EmailService);
  });

  it("should activate a user and send email", async () => {
    const dto: UpdateUserStatusDto = {
      userId: "userId123",
      isActive: true,
      shouldUnassign: false,
    };

    const user = { ...mockUser, isActive: false, save: jest.fn() };
    userModel.findById.mockResolvedValue(user);

    const result = await service.updateUserStatus(dto);

    expect(user.save).toHaveBeenCalled();
    expect(emailService.emailSender).toHaveBeenCalledWith({
      to: user.email,
      subject: "Account Activated",
      html: accountStatusTemplate(true, { firstName: user.firstName }),
    });
    expect(result).toBe(USER.USER_ACTIVATED);
  });

  it("should deactivate a user and unassign if requested", async () => {
    const dto: UpdateUserStatusDto = {
      userId: "userId123",
      isActive: false,
      shouldUnassign: true,
    };

    const user = { ...mockUser, isActive: true, save: jest.fn() };
    userModel.findById.mockResolvedValue(user);

    const result = await service.updateUserStatus(dto);

    expect(user.companyId).toBe(null);
    expect(user.facilityIds).toEqual([]);
    expect(user.save).toHaveBeenCalled();
    expect(emailService.emailSender).toHaveBeenCalledWith({
      to: user.email,
      subject: "Account Deactivated",
      html: accountStatusTemplate(false, { firstName: user.firstName }),
    });
    expect(result).toBe(USER.USER_INACTIVATED);
  });

  it("should return early if status is already the same", async () => {
    const dto: UpdateUserStatusDto = {
      userId: "userId123",
      isActive: false,
      shouldUnassign: false,
    };

    const user = { ...mockUser, isActive: false };
    userModel.findById.mockResolvedValue(user);

    const result = await service.updateUserStatus(dto);

    expect(result).toBe("User is already inactive");
    expect(user.save).not.toHaveBeenCalled();
    // expect(emailService.emailSender).not.toHaveBeenCalled();
  });

  it("should throw error if user not found or is deleted", async () => {
    const dto: UpdateUserStatusDto = {
      userId: "userId123",
      isActive: true,
      shouldUnassign: false,
    };

    userModel.findById.mockResolvedValue(null);

    await expect(service.updateUserStatus(dto)).rejects.toThrow(
      AuthExceptions.AccountNotExist(),
    );

    userModel.findById.mockResolvedValue({ ...mockUser, isDeleted: true });

    await expect(service.updateUserStatus(dto)).rejects.toThrow(
      AuthExceptions.AccountNotExist(),
    );
  });

  it("should throw custom error on internal failure", async () => {
    const dto: UpdateUserStatusDto = {
      userId: "userId123",
      isActive: true,
      shouldUnassign: false,
    };

    const user = {
      ...mockUser,
      isActive: false,
      save: jest.fn().mockRejectedValue(new Error("DB Save Failed")),
    };
    userModel.findById.mockResolvedValue(user);

    await expect(service.updateUserStatus(dto)).rejects.toThrow(
      CustomError.UnknownError("DB Save Failed", 500).message,
    );
  });
});

describe("UserService - getUsersAssignedToChillers", () => {
  let service: UserService;

  const mockUserModel = {
    find: jest.fn(),
  };

  const mockChillerModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Chiller.name), useValue: mockChillerModel },
        { provide: getModelToken(Facility.name), useValue: {} },
        { provide: getModelToken(Company.name), useValue: {} },
        {
          provide: EmailService,
          useValue: { emailSender: jest.fn() },
        },
        {
          provide: ImageUploadService,
          useValue: { uploadProfileImage: jest.fn(), deleteImage: jest.fn() },
        },
        { provide: CommonService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty array when no chillers are found", async () => {
    mockChillerModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const facilityIds = [new mongoose.Types.ObjectId()];
    const result = await service.getUsersAssignedToChillers(facilityIds);
    expect(result).toEqual([]);
    expect(mockChillerModel.find).toHaveBeenCalledWith({
      facilityId: { $in: facilityIds },
      isDeleted: false,
    });
  });

  it("should return empty array when no users assigned to chillers", async () => {
    const mockChillers = [
      { _id: new mongoose.Types.ObjectId() },
      { _id: new mongoose.Types.ObjectId() },
    ];

    mockChillerModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockChillers),
    });

    mockUserModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    const facilityIds = [new mongoose.Types.ObjectId()];
    const result = await service.getUsersAssignedToChillers(facilityIds);

    expect(result).toEqual([]);
    expect(mockChillerModel.find).toHaveBeenCalled();
    expect(mockUserModel.find).toHaveBeenCalledWith({
      chillerIds: { $in: mockChillers.map((c) => c._id) },
      isDeleted: false,
    });
  });

  it("should return users assigned to chillers", async () => {
    const mockChillers = [{ _id: new mongoose.Types.ObjectId() }];
    const mockUsers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "John Doe",
        chillerIds: [mockChillers[0]._id],
        isDeleted: false,
      },
    ];

    mockChillerModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockChillers),
    });

    mockUserModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUsers),
    });

    const facilityIds = [new mongoose.Types.ObjectId()];
    const result = await service.getUsersAssignedToChillers(facilityIds);

    expect(result).toEqual(mockUsers);
    expect(mockUserModel.find).toHaveBeenCalledWith({
      chillerIds: { $in: mockChillers.map((c) => c._id) },
      isDeleted: false,
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { UserService } from "./user.service";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { Role } from "src/common/constants/enum.constant";
import {
  AuthExceptions,
  // CustomError,
  TypeExceptions,
} from "src/common/helpers/exceptions";
import mongoose, { Model } from "mongoose";
import { User } from "src/common/schema/user.schema";
import { UpdateUserDto } from "src/common/dto/common.dto";
import { EmailService } from "src/common/helpers/email/email.service";
import { PasswordGeneratorService } from "src/common/helpers/passwordGenerator.helper";
import { CreateUserDto, UserListDto } from "./dto/user.dto";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { CommonService } from "src/common/services/common.service";
import { ConfigService } from "@nestjs/config";
import { ModuleName, ModulePermission } from "./types/user.types";
import { CryptoService } from "src/common/services/crypto.service";

describe("UserService", () => {
  let service: UserService;
  let userModel: jest.Mocked<Model<User>>;
  let imageService: jest.Mocked<ImageUploadService>;
  let commonService: jest.Mocked<CommonService>;
  let configService: jest.Mocked<ConfigService>;

  const baseUser = {
    _id: "user123",
    profileImage: "old.png",
    role: Role.ADMIN,
    isActive: true,
    save: jest.fn().mockResolvedValue(true),
  } as unknown as User;

  const validDto: UpdateUserDto = {
    firstName: "New Name",
    phoneNumber: "+1234567890",
    role: Role.OPERATOR,
    profileImage: "new.png",
  };

  beforeEach(async () => {
    const mockModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    };

    // const mockUserModel = {
    //   findOne: jest.fn(),
    //   create: jest.fn(),
    //   aggregate: jest.fn(), // ✅ Add this line
    // };

    const mockImage = {
      moveTempToRealFolder: jest.fn(),
      deleteImage: jest.fn(),
    };

    const mockPassword = {};

    const mockEmail = {};

    const mockCommonService = {
      generateRandomString: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === "auth.resetPasswordExpiryDuration") return "3600000"; // 1 hour expiry
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        CommonService,
        { provide: getModelToken("User"), useValue: mockModel },
        { provide: ImageUploadService, useValue: mockImage },
        { provide: PasswordGeneratorService, useValue: mockPassword },
        { provide: EmailService, useValue: mockEmail },
        { provide: CommonService, useValue: mockCommonService },
        {
          provide: ConfigService,
          useValue: mockConfigService,
          // {
          //   get: jest.fn((key) => {
          //     if (key === 'auth.resetPasswordExpiryDuration') return '3600000'; // 1 hour expiry
          //     return null;
          //   }),
          // },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken("User"));
    imageService = module.get(ImageUploadService);
    commonService = module.get(CommonService);
    configService = module.get(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defiend", () => {
    expect(commonService).toBeDefined();
    expect(configService).toBeDefined();
  });
  it("should update profile successfully", async () => {
    const validUpdateDto: UpdateUserDto = {
      firstName: "New Name",
      phoneNumber: "+1234567890",
      profileImage: "new.png",
    };
    const user = {
      ...baseUser,
      save: jest.fn().mockResolvedValue(validUpdateDto),
      _id: "user123",
      isActive: true,
      role: Role.OPERATOR,
    };
    userModel.findById.mockResolvedValue(user);

    const result = await service.updateProfile(
      "user123",
      validUpdateDto,
      Role.ADMIN,
    );
    expect(user.save).toHaveBeenCalled();
    // expect(result).toEqual(validUpdateDto);
    expect(result).toEqual({
      forceLogout: false,
      data: expect.objectContaining({
        _id: "user123",
        firstName: validUpdateDto.firstName,
        phoneNumber: validUpdateDto.phoneNumber,
        profileImage: validUpdateDto.profileImage,
        role: Role.OPERATOR,
        isActive: true,
      }),
    });
  });

  it("should throw if user not found", async () => {
    userModel.findById.mockResolvedValue(null);
    await expect(
      service.updateProfile("bad_id", validDto, Role.ADMIN),
    ).rejects.toThrow(AuthExceptions.AccountNotExist().message);
  });

  it("should update profile image", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(validDto) };
    userModel.findById.mockResolvedValue(user);

    await service.updateProfile("user123", validDto, Role.ADMIN);

    expect(imageService.moveTempToRealFolder).toHaveBeenCalledWith(
      "profilePic/new.png",
    );
    expect(imageService.deleteImage).toHaveBeenCalledWith("profilePic/old.png");
  });

  it("should not update role if user is not admin", async () => {
    const user = {
      ...baseUser,
      role: Role.OPERATOR,
      save: jest.fn().mockResolvedValue(validDto),
    };
    userModel.findById.mockResolvedValue(user);

    await service.updateProfile(
      "user123",
      { ...validDto, role: Role.ADMIN },
      Role.ADMIN,
    );
    expect(user.role).toBe(Role.ADMIN); // unchanged
  });

  it("should filter out undefined/empty values", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(true) };
    userModel.findById.mockResolvedValue(user);

    const dto: Partial<UpdateUserDto> = {
      firstName: "",
      phoneNumber: undefined,
      profileImage: "new.png",
    };

    await service.updateProfile("user123", dto as UpdateUserDto, Role.ADMIN);
    expect(user.save).toHaveBeenCalled();
  });

  it("should throw on image upload failure", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(true) };
    userModel.findById.mockResolvedValue(user);

    imageService.moveTempToRealFolder.mockRejectedValue(
      new Error("upload error"),
    );

    await expect(
      service.updateProfile("user123", validDto, Role.ADMIN),
    ).rejects.toThrow("upload error");
  });

  it("should get user by ID", async () => {
    // userModel.findById.mockResolvedValue(baseUser);
    userModel.aggregate.mockResolvedValueOnce([baseUser]); // ✅ use mockUserModel not userModel

    const user = await service.getUserById(
      new mongoose.Types.ObjectId().toHexString(),
    );
    expect(user).toBe(baseUser);
  });

  it("should throw if user not found in getUserById", async () => {
    // userModel.findById.mockResolvedValue(null);
    userModel.aggregate.mockResolvedValueOnce([]);

    await expect(
      service.getUserById(new mongoose.Types.ObjectId().toHexString()),
    ).rejects.toThrow(AuthExceptions.AccountNotExist().message);
  });
});

// describe('UserService - createUser', () => {
//   let service: UserService;
//   const mockImageUploadService = {
//     uploadImage: jest.fn(),
//   };

//   const mockUserModel = {
//     findOne: jest.fn(),
//     create: jest.fn(),
//     aggregate: jest.fn(), // ✅ Add this line
//   };

//   const mockEmailService = {
//     emailSender: jest.fn(),
//   };

//   const mockPasswordService = {
//     generatePassword: jest.fn(),
//   };

//   const mockPassword = {
//     plain: 'TestPass123!',
//     hashed: 'hashedpass',
//     encrypted: 'encryptedpass',
//   };
//   const mockCommonService = {
//     generateRandomString: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         UserService,
//         CommonService,
//         { provide: getModelToken('User'), useValue: mockUserModel },
//         { provide: EmailService, useValue: mockEmailService },
//         { provide: PasswordGeneratorService, useValue: mockPasswordService },
//         { provide: ImageUploadService, useValue: mockImageUploadService },
//         { provide: CommonService, useValue: mockCommonService },
//         {
//           provide: ConfigService,
//           useValue: {
//             get: jest.fn((key) => {
//               if (key === 'auth.resetPasswordExpiryDuration') return '3600000'; // 1 hour expiry
//               return null;
//             }),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<UserService>(UserService);

//     jest.clearAllMocks();
//     mockPasswordService.generatePassword.mockReturnValue(mockPassword);
//   });

//   const baseDto: Partial<CreateUserDto> = {
//     firstName: 'Test',
//     lastName: 'User',
//     email: 'test@example.com',
//     phoneNumber: '+911234567890',
//     profileImage: '',
//     permissions: {
//       user: { view: true },
//     },
//     alerts: {
//       general: [],
//       logs: [],
//     },
//   };

//   it('should throw error if user already exists', async () => {
//     mockUserModel.findOne.mockResolvedValueOnce({ _id: 'existingUser' });

//     await expect(
//       service.createUser(
//         { ...baseDto, role: Role.ADMIN } as CreateUserDto,
//         Role.ADMIN
//       )
//     ).rejects.toThrow(RESPONSE_ERROR.USER_ALREADY_EXIST);
//   });

//   it('should create ADMIN user with full permissions, no alerts/responsibilities', async () => {
//     mockUserModel.findOne.mockResolvedValueOnce(null);
//     mockUserModel.create.mockResolvedValueOnce({ _id: 'newAdmin' });

//     const dto: CreateUserDto = {
//       firstName: 'Test',
//       lastName: 'User',
//       email: 'test@example.com',
//       phoneNumber: '+911234567890',
//       profileImage: 'some-url',
//       role: Role.ADMIN,
//       permissions: {},
//       companyId: '',
//       facilityIds: [],
//     };

//     const result = await service.createUser(dto, Role.ADMIN);

//     const fullAccess = {
//       view: true,
//       add: true,
//       edit: true,
//       toggleStatus: true,
//     };

//     expect(mockUserModel.create).toHaveBeenCalledWith({
//       firstName: 'Test',
//       lastName: 'User',
//       email: 'test@example.com',
//       phoneNumber: '+911234567890',
//       profileImage: '',
//       role: Role.SUB_ADMIN,
//       permissions: {
//         company: fullAccess,
//         facility: fullAccess,
//         chiller: fullAccess,
//         user: fullAccess,
//         log: fullAccess,
//         maintenance: fullAccess,
//         report: fullAccess,
//         setting: fullAccess,
//       },
//     });

//     expect(result).toEqual({ _id: 'newAdmin' });
//   });

//   it('should create CORPORATE_MANAGER with exactly one company responsibility', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);
//     mockUserModel.create.mockResolvedValueOnce({ _id: 'corpUser' });

//     const dto = {
//       ...baseDto,
//       role: Role.CORPORATE_MANAGER,
//       responsibilities: [{ description: 'Company A', isMandatory: true }],
//     } as CreateUserDto;

//     const result = await service.createUser(dto, Role.ADMIN);

//     expect(mockUserModel.create).toHaveBeenCalled();
//     expect(result).toEqual({ _id: 'corpUser' });
//   });

//   it('should throw error if CORPORATE_MANAGER has != 1 company', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);

//     const dto = {
//       ...baseDto,
//       role: Role.CORPORATE_MANAGER,
//       responsibilities: [],
//     } as CreateUserDto;

//     await expect(service.createUser(dto, Role.ADMIN)).rejects.toThrow(
//       RESPONSE_ERROR.INVALID_COMPANY_ASSIGNMENT
//     );
//   });

//   it('should create FACILITY_MANAGER with responsibilities', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);
//     mockUserModel.create.mockResolvedValueOnce({ _id: 'facManager' });

//     const dto = {
//       ...baseDto,
//       role: Role.FACILITY_MANAGER,
//       responsibilities: [{ description: 'Facility A', isMandatory: true }],
//     } as CreateUserDto;

//     const result = await service.createUser(dto, Role.ADMIN);

//     expect(mockUserModel.create).toHaveBeenCalled();
//     expect(result).toEqual({ _id: 'facManager' });
//   });

//   it('should throw error if FACILITY_MANAGER has no responsibilities', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);

//     const dto = {
//       ...baseDto,
//       role: Role.FACILITY_MANAGER,
//       responsibilities: [],
//     } as CreateUserDto;

//     await expect(service.createUser(dto, Role.ADMIN)).rejects.toThrow(
//       RESPONSE_ERROR.INVALID_FACILITY_ASSIGNMENT
//     );
//   });

//   it('should create OPERATOR with chiller responsibilities', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);
//     mockUserModel.create.mockResolvedValueOnce({ _id: 'opUser' });

//     const dto = {
//       ...baseDto,
//       role: Role.OPERATOR,
//       responsibilities: [{ description: 'Chiller X', isMandatory: true }],
//     } as CreateUserDto;

//     const result = await service.createUser(dto, Role.ADMIN);

//     expect(mockUserModel.create).toHaveBeenCalled();
//     expect(result).toEqual({ _id: 'opUser' });
//   });

//   it('should throw error if OPERATOR has no chillers', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);

//     const dto = {
//       ...baseDto,
//       role: Role.OPERATOR,
//       responsibilities: [],
//     } as CreateUserDto;

//     await expect(service.createUser(dto, Role.ADMIN)).rejects.toThrow(
//       RESPONSE_ERROR.INVALID_CHILLER_ASSIGNMENT
//     );
//   });

//   it('should call emailSender with proper arguments', async () => {
//     mockUserModel.findOne.mockResolvedValue(null);
//     mockUserModel.create.mockResolvedValueOnce({ _id: 'mailUser' });

//     const dto = {
//       ...baseDto,
//       role: Role.FACILITY_MANAGER,
//       responsibilities: [{ description: 'Facility B', isMandatory: true }],
//     } as CreateUserDto;

//     await service.createUser(dto, Role.ADMIN);

//     expect(mockEmailService.emailSender).toHaveBeenCalledWith(
//       expect.objectContaining({
//         to: dto.email,
//         subject: expect.stringContaining('Welcome'),
//         html: expect.stringContaining(dto.firstName),
//       })
//     );
//   });
// });

describe("UserService - createUser", () => {
  let service: UserService;

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockImageUploadService = {
    moveTempToRealFolder: jest.fn(),
  };

  const mockEmailService = {
    emailSender: jest.fn(),
  };

  const mockCommonService = {
    generateRandomString: jest.fn().mockReturnValue("mock-token"),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(3600000), // 1 hour
  };

  const mockRequest = (role: Role): { user: { role: Role } } => ({
    user: {
      role,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        PasswordGeneratorService,
        CryptoService,
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: ImageUploadService, useValue: mockImageUploadService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  const fullPermissions: Record<ModuleName, ModulePermission> = {
    company: { view: true, add: true, edit: true },
    facility: { add: true },
    chiller: {},
    users: {},
    log: {},
    maintenance: {},
    report: {},
    setting: {},
  };

  const baseDto: CreateUserDto = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+911234567890",
    role: Role.OPERATOR,
    permissions: fullPermissions,
    companyId: new mongoose.Types.ObjectId().toString(),
    facilityIds: ["fac123"],
    alerts: {
      general: [],
      logs: [],
    },
  };

  it("should create a user successfully", async () => {
    const mockUser = { _id: new mongoose.Types.ObjectId(), ...baseDto };

    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue(mockUser);
    mockUserModel.findOneAndUpdate.mockResolvedValue(null);

    const result = await service.createUser(
      baseDto,
      mockRequest(Role.SUB_ADMIN),
    );

    expect(mockUserModel.findOne).toHaveBeenCalledWith({
      email: baseDto.email,
    });
    expect(mockUserModel.create).toHaveBeenCalled();
    expect(mockEmailService.emailSender).toHaveBeenCalled();
    expect((result as any)._id).toBe(mockUser._id);
  });

  it("should fail if user already exists", async () => {
    mockUserModel.findOne.mockResolvedValue({ _id: "existingId" });

    await expect(
      service.createUser(baseDto, mockRequest(Role.SUB_ADMIN)),
    ).rejects.toThrow("User already exist");
  });

  it("should fail for invalid role created by admin", async () => {
    const dto = { ...baseDto, role: Role.OPERATOR };
    mockUserModel.findOne.mockResolvedValue(null);

    await expect(
      service.createUser(dto, mockRequest(Role.ADMIN)),
    ).rejects.toThrow();
  });

  it("should fail for invalid role created by sub-admin", async () => {
    const dto = { ...baseDto, role: Role.ADMIN };
    mockUserModel.findOne.mockResolvedValue(null);

    await expect(
      service.createUser(dto, mockRequest(Role.SUB_ADMIN)),
    ).rejects.toThrow();
  });

  it("should fail for unauthorized user role", async () => {
    const dto = { ...baseDto };
    mockUserModel.findOne.mockResolvedValue(null);

    await expect(
      service.createUser(dto, mockRequest(Role.CORPORATE_MANAGER)),
    ).rejects.toThrow();
  });

  it("should auto-fix permissions with view: true", async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    // mockUserModel.create.mockResolvedValue({ _id: '123', ...baseDto });
    // mockUserModel.create.mockImplementation((data: any) => data);
    mockUserModel.create.mockImplementation((data: any) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));

    const result = await service.createUser(
      baseDto,
      mockRequest(Role.SUB_ADMIN),
    );
    expect(result.permissions.facility.view).toBe(true);
  });

  it("should remove alerts for SUB_ADMIN", async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    // mockUserModel.create.mockImplementation((user: any) => user);
    // mockUserModel.create.mockImplementation((data: any) => data);
    mockUserModel.create.mockImplementation((data: any) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));

    const dto = { ...baseDto, role: Role.SUB_ADMIN };
    const user = await service.createUser(dto, mockRequest(Role.ADMIN));
    expect(user.alerts).toBeUndefined();
  });

  it("should retain alerts for OPERATOR", async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    // mockUserModel.create.mockImplementation((user: any) => user);
    // mockUserModel.create.mockImplementation((data: any) => data);
    mockUserModel.create.mockImplementation((data: any) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));

    const user = await service.createUser(baseDto, mockRequest(Role.SUB_ADMIN));
    expect(user.alerts).toBeDefined();
  });

  it("should upload image if profileImage exists", async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue({ _id: "123", ...baseDto });
    const dto = { ...baseDto, profileImage: "test.jpg" };
    await service.createUser(dto, mockRequest(Role.SUB_ADMIN));
    expect(mockImageUploadService.moveTempToRealFolder).toHaveBeenCalledWith(
      "test.jpg",
    );
  });

  it("should set reset token and expiry", async () => {
    // mockUserModel.findOne.mockResolvedValue(null);
    // mockUserModel.create.mockResolvedValue({ _id: 'user123', ...baseDto });
    const now = Date.now();
    jest.spyOn(global.Date, "now").mockReturnValue(now);

    const userId = new mongoose.Types.ObjectId();
    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue({ _id: userId, ...baseDto });

    await service.createUser(baseDto, mockRequest(Role.SUB_ADMIN));
    expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userId },
      expect.objectContaining({
        resetPasswordToken: "mock-token",
        resetPasswordExpires: new Date(now + 3600000),
      }),
    );
  });

  it("should throw unknown error if unexpected error occurs", async () => {
    mockUserModel.findOne.mockRejectedValue(new Error("DB Error"));
    await expect(
      service.createUser(baseDto, mockRequest(Role.SUB_ADMIN)),
    ).rejects.toThrow("DB Error");
  });
});

describe("UserService - findAll()", () => {
  let service: UserService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userModel: any;

  const mockUserModel = {
    aggregate: jest.fn(),
  };

  const mockImageUploadService = {
    uploadImage: jest.fn(),
  };

  const mockEmailService = {
    emailSender: jest.fn(),
  };

  const mockPasswordService = {
    generatePassword: jest.fn(),
  };
  const mockCommonService = {
    generateRandomString: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PasswordGeneratorService, useValue: mockPasswordService },
        { provide: ImageUploadService, useValue: mockImageUploadService },
        { provide: CommonService, useValue: mockCommonService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "auth.resetPasswordExpiryDuration") return "3600000"; // 1 hour expiry
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken("User"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated and filtered users with search and filters", async () => {
    const mockResult = [
      {
        userList: [{ firstName: "Alice" }],
        totalRecords: [{ count: 1 }],
      },
    ];

    const body: UserListDto = {
      page: 1,
      limit: 10,
      search: "alice",
      sort_by: "createdAt",
      sort_order: "DESC",
      companyId: new mongoose.Types.ObjectId().toHexString(),
      facilityId: new mongoose.Types.ObjectId().toHexString(),
      role: Role.OPERATOR,
    };

    userModel.aggregate.mockResolvedValue(mockResult);

    const result = await service.findAll(body);
    expect(userModel.aggregate).toHaveBeenCalled();
    expect(result.userList).toHaveLength(1);
    expect(result.totalRecords).toBe(1);
  });

  it("should return default results when no filters are provided", async () => {
    const mockResult = [
      {
        userList: [{ firstName: "Bob" }],
        totalRecords: [{ count: 1 }],
      },
    ];

    userModel.aggregate.mockResolvedValue(mockResult);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(userModel.aggregate).toHaveBeenCalled();
    expect(result.userList[0].firstName).toBe("Bob");
    expect(result.totalRecords).toBe(1);
  });

  it("should handle search without filters", async () => {
    const mockResult = [
      {
        userList: [{ firstName: "Charlie" }],
        totalRecords: [{ count: 1 }],
      },
    ];

    userModel.aggregate.mockResolvedValue(mockResult);

    const result = await service.findAll({
      page: 1,
      limit: 5,
      search: "char",
    });

    expect(userModel.aggregate).toHaveBeenCalled();
    expect(result.userList[0].firstName).toBe("Charlie");
    expect(result.totalRecords).toBe(1);
  });

  it("should throw error for invalid pagination (page = 0)", async () => {
    await expect(service.findAll({ page: 0, limit: 10 })).rejects.toThrowError(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
      ),
    );
  });

  it("should throw error for invalid pagination (limit = 0)", async () => {
    await expect(service.findAll({ page: 1, limit: 0 })).rejects.toThrowError(
      TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
      ),
    );
  });

  it("should return totalRecords as 0 if count is not present", async () => {
    const mockResult = [
      {
        userList: [],
        totalRecords: [],
      },
    ];

    userModel.aggregate.mockResolvedValue(mockResult);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.userList).toHaveLength(0);
    expect(result.totalRecords).toBe(0);
  });
});

describe("UserService - updateUserStatus", () => {
  let service: UserService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  let userModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let emailService: EmailService;

  const mockUserModel = {
    findById: jest.fn(),
  };

  const mockEmailService = {
    emailSender: jest.fn(),
  };

  const mockImageUploadService = {
    uploadImage: jest.fn(),
  };
  const mockCommonService = {
    generateRandomString: jest.fn(),
  };

  const mockPassword = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ImageUploadService, useValue: mockImageUploadService },
        { provide: PasswordGeneratorService, useValue: mockPassword },
        { provide: CommonService, useValue: mockCommonService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "auth.resetPasswordExpiryDuration") return "3600000"; // 1 hour expiry
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken("User"));
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDto = { userId: "123abc", isActive: true };

  it("should return already active message if status is same", async () => {
    const user = {
      _id: "123abc",
      isDeleted: false,
      isActive: true,
    };
    mockUserModel.findById.mockResolvedValue(user);

    const result = await service.updateUserStatus(mockDto);

    expect(result).toBe("User is already active");
    expect(mockUserModel.findById).toHaveBeenCalledWith("123abc");
    expect(mockEmailService.emailSender).not.toHaveBeenCalled();
  });

  it("should update status and send email if user is valid", async () => {
    const save = jest.fn().mockResolvedValue(true);

    const user = {
      _id: "123abc",
      isDeleted: false,
      isActive: false,
      email: "test@example.com",
      firstName: "Vishal",
      save,
    };

    mockUserModel.findById.mockResolvedValue(user);
    mockEmailService.emailSender.mockResolvedValue(true);

    const result = await service.updateUserStatus({
      userId: "123abc",
      isActive: true,
    });

    expect(save).toHaveBeenCalled();
    expect(mockEmailService.emailSender).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Account Activated",
      html: expect.stringContaining("activated"),
    });
    expect(result).toBe("User has been activated successfully");
  });

  it("should throw AuthException if user not found", async () => {
    mockUserModel.findById.mockResolvedValue(null);

    await expect(service.updateUserStatus(mockDto)).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );
  });

  it("should throw AuthException if user is marked deleted", async () => {
    mockUserModel.findById.mockResolvedValue({ isDeleted: true });

    await expect(service.updateUserStatus(mockDto)).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );
  });

  it("should throw CustomError if unknown error occurs", async () => {
    mockUserModel.findById.mockRejectedValue(new Error("DB Error"));

    await expect(service.updateUserStatus(mockDto)).rejects.toThrow("DB Error");
  });

  it("should deactivate user, clear company/facility, and send email", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const user = {
      _id: "123abc",
      isDeleted: false,
      isActive: true,
      email: "test@example.com",
      firstName: "Vishal",
      companyId: "cmp123",
      facilityIds: ["fac123", "fac456"],
      save,
    };

    mockUserModel.findById.mockResolvedValue(user);
    mockEmailService.emailSender.mockResolvedValue(true);

    const result = await service.updateUserStatus({
      userId: "123abc",
      isActive: false,
    });

    expect(user.companyId).toBe(null);
    expect(user.facilityIds).toEqual([]);
    expect(save).toHaveBeenCalled();
    expect(mockEmailService.emailSender).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Account Deactivated",
      html: expect.stringContaining("deactivated"),
    });
    expect(result).toBe("User has been deactivated successfully");
  });
});

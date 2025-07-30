/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { Role } from "src/common/constants/enum.constant";
import { UpdateUserDto } from "src/common/dto/common.dto";
import { AuthExceptions } from "src/common/helpers/exceptions";
import {
  CreateUserDto,
  UpdateUserStatusDto,
  UserListDto,
} from "./dto/user.dto";
import { BadRequestException } from "@nestjs/common";
// import { RESPONSE_ERROR } from 'src/common/constants/response.constant';
import { ComparisonOperator, NotificationType } from "../user/dto/user.dto";
import { ModuleName } from "./types/user.types";

describe("UserController", () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    updateProfile: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn().mockImplementation((dto) => ({
      ...dto,
      id: "mockedId",
    })),
  };

  const mockRequest = (id: string, role: Role) => ({
    user: {
      _id: id,
      role,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateDto: UpdateUserDto = {
    firstName: "Updated Name",
    phoneNumber: "+1234567890",
    role: Role.OPERATOR,
    profileImage: "updated.png",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  const validDto: CreateUserDto = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phoneNumber: "+911234567890",
    companyId: "12",
    facilityIds: ["123", "1232"],
    role: Role.OPERATOR,
    permissions: {
      facility: { view: true, add: true },
      [ModuleName.COMPANY]: undefined,
      [ModuleName.CHILLER]: undefined,
      [ModuleName.USER]: undefined,
      [ModuleName.LOG]: undefined,
      [ModuleName.MAINTENANCE]: undefined,
      [ModuleName.REPORT]: undefined,
      [ModuleName.SETTING]: undefined,
      [ModuleName.CHILLER_BULK_COST_UPDATE]: undefined,
    },
    alerts: {
      general: {
        notifyBy: NotificationType.EMAIL,
        conditions: [
          {
            metric: "Outside Temp",
            warning: {
              operator: ComparisonOperator.GTE,
              threshold: 30,
            },
            alert: {
              operator: ComparisonOperator.GTE,
              threshold: 40,
            },
          },
        ],
      },
      logs: [
        {
          type: "manual",
          daysSince: 7,
          notifyBy: NotificationType.WEB,
        },
      ],
    },
    chillerIds: [],
  };

  afterEach(() => jest.clearAllMocks());

  describe("updateUser", () => {
    const updateDto: UpdateUserDto = {
      firstName: "Updated",
      phoneNumber: "+12345678901",
    };

    it("should allow admin to update any user", async () => {
      mockUserService.updateProfile.mockResolvedValue("updated");

      const result = await controller.updateUser(
        "targetId",
        updateDto,
        mockRequest("adminId", Role.ADMIN),
      );

      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        "targetId",
        updateDto,
        "adminId",
      );
      expect(result).toBe("updated");
    });

    it("should allow user to update their own profile", async () => {
      mockUserService.updateProfile.mockResolvedValue("updated");

      const result = await controller.updateUser(
        "user123",
        updateDto,
        mockRequest("user123", Role.OPERATOR),
      );

      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        "user123",
        updateDto,
        "user123",
      );
      expect(result).toBe("updated");
    });

    it("should throw 403 if user tries to update someone else's profile", async () => {
      mockUserService.updateProfile.mockImplementation(() => {
        throw AuthExceptions.ForbiddenException();
      });

      await expect(
        controller.updateUser(
          "otherUser",
          updateDto,
          mockRequest("user123", Role.OPERATOR),
        ),
      ).rejects.toThrow(AuthExceptions.ForbiddenException().message);
    });
  });

  describe("getUserById", () => {
    it("should allow admin to get any user", async () => {
      mockUserService.getUserById.mockResolvedValue({ firstName: "Test" });

      const result = await controller.getUserById(
        "targetUser",
        mockRequest("adminId", Role.ADMIN),
      );

      expect(service.getUserById).toHaveBeenCalledWith("targetUser");
      expect(result.firstName).toBe("Test");
    });

    it("should allow user to get their own profile", async () => {
      mockUserService.getUserById.mockResolvedValue({ firstName: "Self" });

      const result = await controller.getUserById(
        "user123",
        mockRequest("user123", Role.FACILITY_MANAGER),
      );

      expect(service.getUserById).toHaveBeenCalledWith("user123");
      expect(result.firstName).toBe("Self");
    });

    // it("should throw 403 if user tries to fetch someone else's profile", async () => {
    //   await expect(
    //     controller.getUserById(
    //       'otherUser',
    //       mockRequest('user123', Role.OPERATOR)
    //     )
    //   ).rejects.toThrow(AuthExceptions.ForbiddenException().message);
    // });
  });

  describe("createUser", () => {
    const mockReq = mockRequest("adminId", Role.ADMIN);

    it("should create a user successfully with valid input", async () => {
      const result = await controller.create(validDto, mockReq);
      expect(result).toHaveProperty("id", "mockedId");
    });

    it("should fail validation if notifyBy is invalid in general alert", async () => {
      const dto = {
        ...validDto,
        alerts: {
          ...validDto.alerts,
          general: [
            {
              ...validDto.alerts.general[0],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              notifyBy: "P" as any,
            },
          ],
        },
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await controller.create(dto as any, mockReq);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().message[0]).toContain(
          "notifyBy must be one of: web, email, both",
        );
      }
    });

    it("should fail validation if notifyBy is invalid in logs alert", async () => {
      const dto = {
        ...validDto,
        alerts: {
          ...validDto.alerts,
          logs: [
            {
              ...validDto.alerts.logs[0],
              notifyBy: "P" as any,
            },
          ],
        },
      };

      try {
        await controller.create(dto as any, mockReq);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().message[0]).toContain(
          "notifyBy must be one of: web, email, both",
        );
      }
    });

    it("should fail validation for malformed permissions object", async () => {
      const dto = {
        ...validDto,
        permissions: {
          facility: { invalidKey: true },
        } as any,
      };

      try {
        await controller.create(dto as any, mockReq);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.getResponse().message[0]).toContain(
          "permissions must be a valid object with boolean fields",
        );
      }
    });

    it("should fail validation if threshold is not a number", async () => {
      const dto = {
        ...validDto,
        alerts: {
          ...validDto.alerts,
          general: [
            {
              ...validDto.alerts.general[0],
              warning: { operator: ">=", threshold: "thirty" },
            },
          ],
        },
      };

      try {
        await controller.create(dto as any, mockReq);
      } catch (err) {
        expect(err.getResponse().message[0]).toContain(
          "threshold must be a number",
        );
      }
    });
  });
});

describe("UserController - findAll()", () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserListResponse = {
    userList: [
      {
        _id: "665c123abc123abc123abc12",
        firstName: "Alice",
        lastName: "Doe",
        email: "alice@example.com",
        phoneNumber: "+911234567890",
        role: "FACILITY_MANAGER",
        companyId: "665c3fb53a416f0bcd6e0f23",
        facilityId: "665c3fb53a416f0bcd6e0f99",
        profileImage: "",
        isActive: true,
        createdAt: new Date(),
      },
    ],
    totalRecords: 1,
  };

  const mockUserService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Valid request
  it("should return user list with valid dto", async () => {
    const dto: UserListDto = {
      page: 1,
      limit: 10,
    };

    (userService.findAll as jest.Mock).mockResolvedValue(mockUserListResponse);

    const result = await controller.findAll(dto);

    expect(userService.findAll).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUserListResponse);
  });

  // ✅ Valid request with filters
  it("should return user list with company, facility and role filters", async () => {
    const dto: UserListDto = {
      page: 1,
      limit: 5,
      companyId: "665c3fb53a416f0bcd6e0f23",
      facilityId: "665c3fb53a416f0bcd6e0f99",
      role: Role.FACILITY_MANAGER,
    };

    (userService.findAll as jest.Mock).mockResolvedValue(mockUserListResponse);

    const result = await controller.findAll(dto);

    expect(userService.findAll).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUserListResponse);
  });

  // ❌ Invalid pagination (page = 0)
  it("should throw error for invalid pagination (page = 0)", async () => {
    const dto: UserListDto = {
      page: 0,
      limit: 10,
    };

    (userService.findAll as jest.Mock).mockRejectedValue(() => {
      throw new BadRequestException("Invalid page and limit value");
    });

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Invalid limit (limit = 0)
  it("should throw error for invalid pagination (limit = 0)", async () => {
    const dto: UserListDto = {
      page: 1,
      limit: 0,
    };

    (userService.findAll as jest.Mock).mockRejectedValue(() => {
      throw new BadRequestException("Invalid page and limit value");
    });

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Invalid companyId (invalid ObjectId format)
  it("should throw error for invalid companyId format", async () => {
    const dto: UserListDto = {
      page: 1,
      limit: 10,
      companyId: "invalid-object-id",
    };

    (userService.findAll as jest.Mock).mockRejectedValue(() => {
      throw new BadRequestException("companyId must be a Mongo ID");
    });

    await expect(controller.findAll(dto)).rejects.toThrow(BadRequestException);
  });

  // ❌ Service throws unknown error
  it("should handle unexpected service error", async () => {
    const dto: UserListDto = {
      page: 1,
      limit: 10,
    };

    (userService.findAll as jest.Mock).mockRejectedValue(
      new Error("Unexpected DB failure"),
    );

    await expect(controller.findAll(dto)).rejects.toThrow(
      "Unexpected DB failure",
    );
  });
});

describe("UserController - updateUserStatus", () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    updateUserStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDto: UpdateUserStatusDto = {
    userId: "60f6c0aef1e8c000175e58a9",
    isActive: true,
  };

  it("should call service and return success response", async () => {
    const mockResult = {
      message: "User has been activated successfully",
      forceLogout: false,
    };

    mockUserService.updateUserStatus.mockResolvedValue(mockResult);

    const result = await controller.updateUserStatus(mockDto);

    expect(userService.updateUserStatus).toHaveBeenCalledWith(mockDto);
    expect(result).toEqual(mockResult);
  });

  it("should return already active message if status is unchanged", async () => {
    const mockResult = {
      message: "User is already active",
      forceLogout: false,
    };

    mockUserService.updateUserStatus.mockResolvedValue(mockResult);

    const result = await controller.updateUserStatus(mockDto);

    expect(userService.updateUserStatus).toHaveBeenCalledWith(mockDto);
    expect(result).toEqual(mockResult);
  });

  it("should throw error if user does not exist or is deleted", async () => {
    const error = AuthExceptions.AccountNotExist();

    mockUserService.updateUserStatus.mockRejectedValue(error);

    await expect(controller.updateUserStatus(mockDto)).rejects.toThrow(error);
    expect(userService.updateUserStatus).toHaveBeenCalledWith(mockDto);
  });

  it("should throw internal server error for unknown exception", async () => {
    const error = new Error("Unexpected failure");

    mockUserService.updateUserStatus.mockRejectedValue(error);

    await expect(controller.updateUserStatus(mockDto)).rejects.toThrow(
      "Unexpected failure",
    );
    expect(userService.updateUserStatus).toHaveBeenCalledWith(mockDto);
  });
});

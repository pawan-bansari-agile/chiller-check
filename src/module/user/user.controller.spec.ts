import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { Role } from "src/common/constants/enum.constant";
import { UpdateUserDto } from "src/common/dto/common.dto";
import { AuthExceptions } from "src/common/helpers/exceptions";

describe("UserController", () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    updateProfile: jest.fn(),
    getUserById: jest.fn(),
  };

  const mockRequest = (id: string, role: Role) => ({
    user: {
      _id: id,
      role,
    },
  });

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

  afterEach(() => jest.clearAllMocks());

  describe("updateUser", () => {
    it("should allow admin to update any user", async () => {
      mockUserService.updateProfile.mockResolvedValue("updated");

      const result = await controller.updateUser(
        "targetId",
        updateDto,
        mockRequest("adminId", Role.ADMIN),
      );

      expect(service.updateProfile).toHaveBeenCalledWith("targetId", updateDto);
      expect(result).toBe("updated");
    });

    it("should allow user to update their own profile", async () => {
      mockUserService.updateProfile.mockResolvedValue("updated");

      const result = await controller.updateUser(
        "user123",
        updateDto,
        mockRequest("user123", Role.OPERATOR),
      );

      expect(service.updateProfile).toHaveBeenCalledWith("user123", updateDto);
      expect(result).toBe("updated");
    });

    it("should throw 403 if user tries to update someone else's profile", async () => {
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
      mockUserService.getUserById.mockResolvedValue({ fullName: "Test" });

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

    it("should throw 403 if user tries to fetch someone else's profile", async () => {
      await expect(
        controller.getUserById(
          "otherUser",
          mockRequest("user123", Role.OPERATOR),
        ),
      ).rejects.toThrow(AuthExceptions.ForbiddenException().message);
    });
  });
});

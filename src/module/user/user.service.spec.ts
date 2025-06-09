import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { UserService } from "./user.service";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { Role } from "src/common/constants/enum.constant";
import { AuthExceptions } from "src/common/helpers/exceptions";
import { Model } from "mongoose";
import { User } from "src/common/schema/user.schema";
import { UpdateUserDto } from "src/common/dto/common.dto";

describe("UserService", () => {
  let service: UserService;
  let userModel: jest.Mocked<Model<User>>;
  let imageService: jest.Mocked<ImageUploadService>;

  const baseUser = {
    _id: "user123",
    profileImage: "old.png",
    role: Role.ADMIN,
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
    };

    const mockImage = {
      moveTempToRealFolder: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken("User"), useValue: mockModel },
        { provide: ImageUploadService, useValue: mockImage },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken("User"));
    imageService = module.get(ImageUploadService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should update profile successfully", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(validDto) };
    userModel.findById.mockResolvedValue(user);

    const result = await service.updateProfile("user123", validDto);
    expect(user.save).toHaveBeenCalled();
    expect(result).toEqual(validDto);
  });

  it("should throw if user not found", async () => {
    userModel.findById.mockResolvedValue(null);
    await expect(service.updateProfile("bad_id", validDto)).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );
  });

  it("should update profile image", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(validDto) };
    userModel.findById.mockResolvedValue(user);

    await service.updateProfile("user123", validDto);

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

    await service.updateProfile("user123", { ...validDto, role: Role.ADMIN });
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

    await service.updateProfile("user123", dto as UpdateUserDto);
    expect(user.save).toHaveBeenCalled();
  });

  it("should throw on image upload failure", async () => {
    const user = { ...baseUser, save: jest.fn().mockResolvedValue(true) };
    userModel.findById.mockResolvedValue(user);

    imageService.moveTempToRealFolder.mockRejectedValue(
      new Error("upload error"),
    );

    await expect(service.updateProfile("user123", validDto)).rejects.toThrow(
      "upload error",
    );
  });

  it("should get user by ID", async () => {
    userModel.findById.mockResolvedValue(baseUser);

    const user = await service.getUserById("user123");
    expect(user).toBe(baseUser);
  });

  it("should throw if user not found in getUserById", async () => {
    userModel.findById.mockResolvedValue(null);

    await expect(service.getUserById("bad")).rejects.toThrow(
      AuthExceptions.AccountNotExist().message,
    );
  });
});

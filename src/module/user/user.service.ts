import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Role, UploadFolderEnum } from "src/common/constants/enum.constant";
import { UpdateUserDto } from "src/common/dto/common.dto";
import { AuthExceptions } from "src/common/helpers/exceptions";
import { User, UserDocument } from "src/common/schema/user.schema";
import * as dotenv from "dotenv";
import { ImageUploadService } from "../image-upload/image-upload.service";
dotenv.config();

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private imageUploadService: ImageUploadService,
  ) {}
  // Method to update user profile by ID
  async updateProfile(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw AuthExceptions.AccountNotExist();
    }
    // Only allow the super admin to update the user role
    if (updateUserDto.role && user.role !== Role.ADMIN) {
      user.role = updateUserDto.role; // Allow Super Admin to change user roles
    }
    if (updateUserDto?.profileImage !== user.profileImage) {
      // Move new file temp folder to real one
      const newFileKey =
        UploadFolderEnum.PROFILE_PIC + "/" + updateUserDto?.profileImage;
      await this.imageUploadService.moveTempToRealFolder(newFileKey);
      const oldFileKey = UploadFolderEnum.PROFILE_PIC + "/" + user.profileImage;

      await this.imageUploadService.deleteImage(oldFileKey);
    }

    // Filter out fields with undefined or empty values
    const filteredDto = Object.fromEntries(
      Object.entries(updateUserDto).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([key, value]) => value !== undefined && value !== "",
      ),
    );

    // Update the user with the provided fields
    Object.assign(user, filteredDto);

    // Save the updated user
    return user.save();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw AuthExceptions.AccountNotExist();
    }
    return user;
  }
}

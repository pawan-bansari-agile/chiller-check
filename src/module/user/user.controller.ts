import { Controller, Put, Body, Param, Request, Get } from "@nestjs/common";
import { UserService } from "./user.service";
import { Role } from "src/common/constants/enum.constant";
import { UpdateUserDto } from "src/common/dto/common.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthExceptions } from "src/common/helpers/exceptions";
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
  USER,
} from "src/common/constants/response.constant";

@Controller("users")
@ApiTags("Users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Route to update user details
  @Put(":id")
  @ApiOperation({ summary: "Update user details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the user to be updated",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiBody({
    type: UpdateUserDto,
    description: "User details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User details updated successfully",
        message: RESPONSE_SUCCESS.USER_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden: You can only edit your own profile unless you are an admin",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  @ApiBearerAuth()
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // console.log('✌️req --->', req.user);

    // uncomment this line when changing this api to protected
    const currentUserId = req.user._id;
    // const currentUserId = id;

    // uncomment this line when changing this api to protected
    const currentUserRole = req.user.role;
    // const currentUserRole = 'admin';

    // If the user is a super admin, they can edit any user
    if (currentUserRole === Role.ADMIN) {
      return this.userService.updateProfile(id, updateUserDto);
    }

    // Regular user can only update their own profile
    if (currentUserId !== id) {
      throw AuthExceptions.ForbiddenException();
    }

    return this.userService.updateProfile(id, updateUserDto);
  }

  @Get(":id")
  // @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user details by ID" })
  @ApiParam({
    name: "id",
    description: "ID of the user to retrieve",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User details updated successfully",
        message: USER.USER_PROFILE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden: You can only view your own profile unless you are an admin",
  })
  @ApiResponse({
    schema: {
      example: {
        status: 404,
        description: "User not found",
        message: RESPONSE_ERROR.USER_NOT_FOUND,
      },
    },
  })
  async getUserById(@Param("id") id: string, @Request() req) {
    console.log("✌️req --->", req.user);
    // uncomment the below line when changing this api to protected
    const currentUserId = req.user._id;
    // const currentUserId = id;

    // uncomment the below line when changing this api to protected
    const currentUserRole = req.user.role;
    // const currentUserRole = "admin";

    // If the user is a super admin, they can view any user's details
    if (currentUserRole === Role.ADMIN) {
      return this.userService.getUserById(id);
    }

    // Regular user can only view their own profile
    if (currentUserId !== id) {
      throw AuthExceptions.ForbiddenException();
    }

    return this.userService.getUserById(id);
  }
}

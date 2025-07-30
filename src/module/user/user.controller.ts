import {
  Controller,
  Put,
  Body,
  Param,
  Request,
  Get,
  Post,
  Patch,
  Req,
} from "@nestjs/common";
import { UserService } from "./user.service";
// import { Role } from 'src/common/constants/enum.constant';
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
// import { AuthExceptions } from 'src/common/helpers/exceptions';
import {
  RESPONSE_ERROR,
  RESPONSE_SUCCESS,
  USER,
} from "src/common/constants/response.constant";
import { ResponseMessage } from "src/common/decorators/response.decorator";
// import { Public } from 'src/security/auth/auth.decorator';
import {
  CreateUserDto,
  OperatorByFacilitiesDto,
  UpdateUserStatusDto,
  UserListDto,
} from "./dto/user.dto";
// import mongoose from 'mongoose';
@Controller("users")
@ApiTags("Users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("/createUser")
  @ApiOperation({ summary: "Create a User!" })
  @ApiBody({
    type: CreateUserDto,
    description: "User details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User created successfully",
        message: RESPONSE_SUCCESS.USER_INSERTED,
      },
    },
  })
  @ResponseMessage(RESPONSE_SUCCESS.USER_INSERTED)
  @ApiBearerAuth()
  // @Public()
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.userService.createUser(createUserDto, req);
  }

  // Route to update user details
  @Put(":id")
  @ApiOperation({ summary: "Update user details" })
  //   @Public()
  // @ResponseMessage(USER.USER_UPDATE)
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
  // @Public()
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Request() req,
  ) {
    const loggedInUserId = req["user"]["_id"];
    console.log("✌️loggedInUserId --->", loggedInUserId);

    return await this.userService.updateProfile(
      id,
      updateUserDto,
      loggedInUserId,
      // currentUserRole,
    );
  }

  @Get(":id")
  // @Public()
  @ResponseMessage(USER.USER_PROFILE)
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
    const loggedInUserId = req["user"]["_id"];

    return this.userService.getUserById(id, loggedInUserId);
  }

  @Post("list")
  // @Public()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User List fetched successfully",
        message: "User listing success",
      },
    },
  })
  @ApiOperation({ summary: "List Users!" })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only Admins allowed",
  })
  @ApiBearerAuth()
  @ResponseMessage(RESPONSE_SUCCESS.USER_LISTED)
  findAll(@Request() req: Request, @Body() body: UserListDto) {
    return this.userService.findAll(req, body);
  }

  @Patch("status")
  // @Public()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User status updated!",
        message: "User status updated!",
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only Admins allowed",
  })
  @ApiBearerAuth()
  // @ResponseMessage(USER.USER_STATUS_UPDATED)
  @ApiOperation({ summary: "Update user status (activate/deactivate)" })
  async updateUserStatus(@Body() dto: UpdateUserStatusDto) {
    return this.userService.updateUserStatus(dto);
  }

  @Post("assigned-to-chillers")
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "User List fetched successfully",
        message: "User listing success",
      },
    },
  })
  @ApiOperation({ summary: "List Users!" })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only Admins allowed",
  })
  @ApiBearerAuth()
  @ResponseMessage(RESPONSE_SUCCESS.OPERATORS_LISTED)
  async getUsersAssignedToChillers(@Body() body: OperatorByFacilitiesDto) {
    // if (!body.facilityIds || body.facilityIds.length === 0) {
    //   return { message: 'No facilityIds provided', data: [] };
    // }

    // const objectIds = body.facilityIds.map(
    //   (id) => new mongoose.Types.ObjectId(id),
    // );
    return await this.userService.getUsersAssignedToChillers(body);
  }
}

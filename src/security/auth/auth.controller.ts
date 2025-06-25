import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { RESPONSE_SUCCESS } from "../../common/constants/response.constant";
import { ResponseMessage } from "../../common/decorators/response.decorator";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResendOtp,
  ResetPasswordDto,
  VerifyOtp,
} from "../../common/dto/common.dto";
import { Public } from "./auth.decorator";
import { AuthService } from "./auth.service";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ResponseMessage(RESPONSE_SUCCESS.SERVER_RUNNING)
  @HttpCode(HttpStatus.OK)
  @Get("/health")
  async health() {
    return true;
  }

  @Public()
  @ResponseMessage(RESPONSE_SUCCESS.USER_LOGIN)
  @HttpCode(HttpStatus.OK)
  @Post("/login")
  async login(@Body() params: LoginDto) {
    return await this.authService.login(params);
  }

  @Public()
  @ResponseMessage(RESPONSE_SUCCESS.USER_SEND_OTP)
  @HttpCode(HttpStatus.OK)
  @Post("/resendOtp")
  async resendOtp(@Body() params: ResendOtp) {
    return await this.authService.resendOtp(params);
  }

  @Public()
  @ResponseMessage(RESPONSE_SUCCESS.USER_VERIFY_OTP)
  @HttpCode(HttpStatus.OK)
  @Post("/verifyOtp")
  async verifyOtp(@Body() params: VerifyOtp) {
    return await this.authService.verifyOtp(params);
  }

  @ApiBearerAuth()
  @ResponseMessage(RESPONSE_SUCCESS.USER_LOGOUT)
  @Get("/logout")
  async logout(@Req() req: Request) {
    return await this.authService.logout(req);
  }

  @Public()
  @ResponseMessage(RESPONSE_SUCCESS.PASSWORD_RESET_TOKEN)
  @Post("/forgotPassword")
  @ApiOperation({
    summary: "User Forgot password Api",
    description: `
        This Forgot Password Api allow user to generate 'Password Forget Token' which will be sent to his registered email address.

        ### Process Flow:
           1. **Email Verification**: 
           - The system checks if the provided email address already exists in the \`user\` table.
           - If the email is not registered, *404 Not Found* response with the message: *"Entered email id is not registered with our system"*.
           - If the email address is registered with the system it will generate random token.
           - This random generated toke will be sent to user on the given email address from where user can change his password.
        `,
  })
  @ApiOkResponse({
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message:
          "We have sent you an email for the Reset Password request, follow the steps to reset your password.",
        data: {},
      },
    },
  })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: HttpStatus.NOT_FOUND,
        message: "Entered email id is not registered with our system",
        data: {},
      },
    },
  })
  @ApiInternalServerErrorResponse({
    schema: {
      example: {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "Something went wrong",
        data: {},
      },
    },
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body);
  }

  @Public()
  @Post("/resetPassword")
  @ResponseMessage(RESPONSE_SUCCESS.PASSWORD_RESET)
  @ApiOperation({
    summary: "User password reset Api",
    description: `
        This password reset api allow user to create new password by using reset password token.

        ### Process Flow:
           1. **Reset Password Token Verification**: 
           - The system checks if the provided reset password token already exists in the \`user\` table and not expired.
           - If the reset password token is not available, *404 Not Found* response with the message: *"User not found"*.
           - If the reset password token is expired, *409 Conflict* response with the message: *"Your password reset link has expired. Please request a new one and try again"*.
           - If the reset password token is valid and is not expired, then given new password will be encrypted and set as password.
        `,
  })
  @ApiOkResponse({
    schema: {
      example: {
        statusCode: HttpStatus.OK,
        message: RESPONSE_SUCCESS.SUCCESS,
        data: {},
      },
    },
  })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: HttpStatus.NOT_FOUND,
        message: "User not found",
        data: {},
      },
    },
  })
  @ApiInternalServerErrorResponse({
    schema: {
      example: {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "Something went wrong",
        data: {},
      },
    },
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  @ApiBearerAuth()
  @ResponseMessage(RESPONSE_SUCCESS.PASSWORD_CHANGED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "User password changed Api",
    description: `
        This password changed api allow user to change password by using old(existing) password.

        ### Process Flow:
           1. **Existing Password verify**: 
           - The system checks if the provided existing password already exists in the \`user\` table.
           - If the existing password is not match, *400 Bad Request* response with the message: *"Current password is invalid"*.
           - If the current password is valid, then given new password will be encrypted and set as password.
        `,
  })
  @Post("/changePassword")
  async changePassword(@Body() body: ChangePasswordDto, @Req() req: Request) {
    return await this.authService.changePassword(body, req);
  }
}

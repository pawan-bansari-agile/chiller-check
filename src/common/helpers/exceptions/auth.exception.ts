import { HttpException, HttpStatus } from "@nestjs/common";
import {
  AUTHENTICATION,
  RESPONSE_ERROR,
} from "src/common/constants/response.constant";

export const AuthExceptions = {
  TokenExpired(): HttpException {
    return new HttpException(
      {
        message: "Token Expired use RefreshToken",
        error: "TokenExpiredError",
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  },
  CMSNotFound(): HttpException {
    return new HttpException(
      {
        message: "CMS not found",
        error: "cmsNotFound",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  chooseFile() {
    return new HttpException(
      {
        message: "Kindly choose file to upload",
        error: "Kindly choose file to upload",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  InvalidToken(): HttpException {
    return new HttpException(
      {
        message: "Invalid Token",
        error: "InvalidToken",
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  },

  ForbiddenException(): HttpException {
    return new HttpException(
      {
        message: "This resource is forbidden from this user",
        error: "UnAuthorizedResourceError",
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  },

  InvalidUserId(): HttpException {
    return new HttpException(
      {
        message: "Invalid User Id",
        error: "InvalidUserId",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  InvalidPassword(): HttpException {
    return new HttpException(
      {
        message: "Please enter valid email or password.",
        error: "InvalidPassword",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  AccountNotExist(): HttpException {
    return new HttpException(
      {
        message: "Account does not exist!",
        error: "AccountNotExist",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  AccountNotActive(): HttpException {
    return new HttpException(
      {
        message: "Account not active!",
        error: "AccountNotActive",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  UserNotAuthorizedAccess(): HttpException {
    return new HttpException(
      {
        message: "Access Denied",
        error: "UnAuthorizedResourceError",
        data: {},
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  },

  PasswordResetTokenExpired(): HttpException {
    return new HttpException(
      {
        message: AUTHENTICATION.PASSWORD_RESET_TOKEN_EXPIRED,
        error: "PasswordResetTokenExpired",
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  },

  InvalidPhoneNumber(): HttpException {
    return new HttpException(
      {
        message: "Phonenumber not exists!",
        error: "AccountNotExist",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  AlreadyExistsAccount(): HttpException {
    return new HttpException(
      {
        message: RESPONSE_ERROR.USER_ALREADY_EXIST,
        error: "UserAlreadyExist",
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  },
};

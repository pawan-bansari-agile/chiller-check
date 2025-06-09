import { HttpException, HttpStatus } from "@nestjs/common";

export const TypeExceptions = {
  NotFoundCommonFunction(message: string): HttpException {
    return new HttpException(
      {
        message: message,
        error: "Not Found",
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
  },

  BadRequestCommonFunction(message: string): HttpException {
    return new HttpException(
      {
        message: message,
        error: "Bad Request",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  },

  AlreadyExistsCommonFunction(message: string): HttpException {
    return new HttpException(
      {
        message: message,
        error: "Already Exists",
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  },
};

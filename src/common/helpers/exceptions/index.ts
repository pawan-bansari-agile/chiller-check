import { HttpException, HttpStatus } from "@nestjs/common";

export * from "./auth.exception";
export * from "./type.exception";
export * from "./connection.exception";

export const CustomError = {
  UnknownError(message: string, statusCode: number): HttpException {
    return new HttpException(
      {
        message: message || "Something went wrong, please try again later!",
        error: "UnknownError",
        statusCode: statusCode || HttpStatus.BAD_GATEWAY,
      },
      statusCode || HttpStatus.BAD_GATEWAY,
    );
  },

  ImageUploadError(message: string, statusCode: number): HttpException {
    return new HttpException(
      {
        message:
          message ||
          "Something went wrong, please try uploading the file later!",
        error: "UnknownError",
        statusCode: statusCode || HttpStatus.BAD_GATEWAY,
      },
      statusCode || HttpStatus.BAD_GATEWAY,
    );
  },
};

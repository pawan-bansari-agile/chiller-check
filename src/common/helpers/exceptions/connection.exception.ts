import { HttpException, HttpStatus } from "@nestjs/common";

export const ConnectionExceptions = {
  connectionException(): HttpException {
    return new HttpException(
      {
        message: "Microservice Communication error",
        error: "ConnectionError",
        statusCode: HttpStatus.BAD_GATEWAY,
      },
      HttpStatus.BAD_GATEWAY,
    );
  },
};

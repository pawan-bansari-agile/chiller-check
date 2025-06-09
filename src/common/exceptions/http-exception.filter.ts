import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { CustomError } from "../helpers/exceptions";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // Custom error handling logic
    if (!exception?.response?.error) {
      exception = CustomError.UnknownError(
        exception?.response?.message,
        exception?.response?.statusCode,
      );
    }

    let statusCode = this.getStatus(exception);
    let message = this.extractMessage(exception);
    //Handle dto validation
    if (
      exception?.response?.message &&
      exception?.response?.error === "Bad Request"
    ) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.response.message;
    }

    const body = this.createResponseBody(statusCode, message, request.url);

    this.logger.warn(
      `${statusCode} - ${message} - ${request.method} ${request.url}`,
    );

    response.status(statusCode).json(body);
  }

  private getStatus(exception): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR; // Internal Server Error for unknown exceptions
  }

  private extractMessage(exception): string {
    if (exception instanceof HttpException) {
      return exception.message || "Unexpected error occurred";
    }
    return exception.message || "An unknown error occurred";
  }

  private createResponseBody(statusCode: number, message: string, url: string) {
    return {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      endpoint: url,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { PaginationDto } from "src/common/dto/common.dto";
import { Request } from "express";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import {
  NOTIFICATION,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import { DeleteNotificationDto } from "./dto/notification.dto";

@Controller("notifications")
@ApiTags("Common - Notification Management")
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post("list")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(NOTIFICATION.NOTIFICATION_LIST)
  notificationList(
    @Body()
    body: PaginationDto,
    @Req() req: Request,
  ) {
    return this.notificationService.notificationList(body, req);
  }

  @ApiBearerAuth()
  @ResponseMessage(NOTIFICATION.NOTIFICATION_DELETED)
  @HttpCode(HttpStatus.OK)
  @Delete()
  @ApiOperation({
    summary: "To delete notification",
  })
  @ApiOkResponse({
    description: NOTIFICATION.NOTIFICATION_DELETED,
  })
  @ApiBadRequestResponse({
    description: "Bad Request - Validation failed",
    schema: {
      example: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Something went wrong",
        data: {},
      },
    },
  })
  @ApiInternalServerErrorResponse({
    schema: {
      example: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Something went wrong",
        data: {},
      },
    },
  })
  @ApiBadGatewayResponse({
    schema: {
      example: {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "Something went wrong",
        data: {},
      },
    },
  })
  async deleteNotification(@Body() body: DeleteNotificationDto) {
    return await this.notificationService.deleteNotification(body);
  }

  @ApiBearerAuth()
  @Get("/readNotifications")
  @ResponseMessage(RESPONSE_SUCCESS.SUCCESS)
  @ApiOperation({
    summary: "To read notification",
  })
  async readNotifications(@Req() req: Request) {
    return this.notificationService.readNotifications(req);
  }

  @Get("/getCount")
  @ResponseMessage(RESPONSE_SUCCESS.SUCCESS)
  @ApiOperation({
    summary: "Get Notification count",
  })
  async getNotificationCount(@Req() req: Request) {
    return this.notificationService.getNotificationCount(req);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { LogService } from "./log.service";
import {
  CreateLogDTO,
  ExportLogIds,
  FileUploadLogDto,
  LogListDto,
  UpdateLogDto,
} from "./dto/logs.dto";
import {
  ApiBearerAuth,
  // ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { LOGS } from "src/common/constants/response.constant";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiBearerAuth()
@ApiTags("Log")
@Controller("log")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Post("/createLog")
  @ApiOperation({ summary: "Create a log!" })
  @ApiBody({
    type: CreateLogDTO,
    description: "Log details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log created successfully",
        message: LOGS.LOG_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @ApiBearerAuth()
  // @Public()
  @ResponseMessage(LOGS.LOG_CREATE)
  create(@Body() createLogDto: CreateLogDTO, @Req() req) {
    const userId = req["user"]["_id"];
    return this.logService.create(createLogDto, userId);
  }

  @Post("list")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log List fetched successfully",
        message: LOGS.LOG_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(LOGS.LOG_LIST)
  findAll(@Req() req: Request, @Body() body: LogListDto) {
    const loggedInUserId = req["user"]["_id"];
    return this.logService.findAll(body, loggedInUserId);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log fetched successfully",
        message: LOGS.LOG_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(LOGS.LOG_BY_ID)
  @Get(":id")
  findOne(@Param("id") id: string, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.logService.findOne(id, loggedInUserId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update log details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the log to be updated",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiBody({
    type: UpdateLogDto,
    description: "Log details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log details updated successfully",
        message: LOGS.LOG_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Log not found",
  })
  @ResponseMessage(LOGS.LOG_UPDATED)
  @ApiBearerAuth()
  async update(
    @Param("id") id: string,
    @Body() updateLogDto: UpdateLogDto,
    @Req() req,
  ) {
    const loggedInUserId = req["user"]["_id"];
    return await this.logService.update(id, updateLogDto, loggedInUserId);
  }

  @Post("exportSelectedLogsExcel")
  @ResponseMessage(LOGS.LOG_EXPORT)
  @ApiOperation({
    summary: "export selected all Mandate Request",
  })
  exportSelectedLogsExcel(@Body() body: ExportLogIds) {
    return this.logService.exportSelectedLogsExcel(body);
  }

  @Post("importBulkLogExcel")
  @ApiConsumes("multipart/form-data")
  @ResponseMessage(LOGS.LOG_IMPORT)
  @ApiBody({
    description: "Upload CSV file",
    type: FileUploadLogDto,
  })
  @ApiOperation({
    summary: "Get all import logs",
  })
  @UseInterceptors(FileInterceptor("file"))
  importLogExcel(@Req() req, @UploadedFile() file: FileUploadLogDto) {
    console.log("✌️req from import excell controller--->", req["user"]._id);
    return this.logService.importLogExcel(file, req);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete log details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the log to be deleted",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log details deleted successfully",
        message: LOGS.LOG_DELETED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Log not found",
  })
  @ResponseMessage(LOGS.LOG_DELETED)
  @ApiBearerAuth()
  remove(@Param("id") id: string) {
    return this.logService.remove(id);
  }
}

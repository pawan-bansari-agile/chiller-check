import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Req,
} from "@nestjs/common";
import { MaintenanceRecordsService } from "./maintenance-records.service";
import {
  CreateMaintenanceRecordDto,
  ExportMaintenanceIds,
  MaintenanceListDto,
  UpdateMaintenanceRecordDto,
} from "./dto/create-maintenance-record.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { MAINTENANCE_LOGS } from "src/common/constants/response.constant";

@ApiBearerAuth()
@Controller("maintenance-records")
@ApiTags("Maintenance Records")
export class MaintenanceRecordsController {
  constructor(
    private readonly maintenanceRecordsService: MaintenanceRecordsService,
  ) {}

  @Post("create")
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_CREATE)
  @ApiOperation({ summary: "Create a maintenance log record!" })
  @ApiBody({
    type: CreateMaintenanceRecordDto,
    description: "Log details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Maintenance log created successfully",
        message: MAINTENANCE_LOGS.MAINTENANCE_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden: Only a user with permissions can create a maintenance log record!",
  })
  create(
    @Body() createMaintenanceRecordDto: CreateMaintenanceRecordDto,
    @Req() req,
  ) {
    const loggedInUserId = req["user"]["_id"];
    return this.maintenanceRecordsService.create(
      createMaintenanceRecordDto,
      loggedInUserId,
    );
  }

  @Post("list")
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Maintenance record list fetch successfully.",
        message: MAINTENANCE_LOGS.MAINTENANCE_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_LIST)
  findAll(@Request() req: Request, @Body() body: MaintenanceListDto) {
    return this.maintenanceRecordsService.findAll(req, body);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Maintenance fetched successfully",
        message: MAINTENANCE_LOGS.MAINTENANCE_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @Get(":id")
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_BY_ID)
  findOne(@Param("id") id: string, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.maintenanceRecordsService.findOne(id, loggedInUserId);
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
    type: UpdateMaintenanceRecordDto,
    description: "Log details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Log details updated successfully",
        message: MAINTENANCE_LOGS.MAINTENANCE_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Log not found",
  })
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_UPDATED)
  update(
    @Param("id") id: string,
    @Body() updateMaintenanceRecordDto: UpdateMaintenanceRecordDto,
    @Req() req,
  ) {
    const loggedInUserId = req["user"]["_id"];
    return this.maintenanceRecordsService.update(
      id,
      updateMaintenanceRecordDto,
      loggedInUserId,
    );
  }

  @Post("exportMaintenanceExcel")
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_EXPORT)
  exportMaintenanceExcel(@Body() body: ExportMaintenanceIds) {
    return this.maintenanceRecordsService.exportMaintenanceExcel(body);
  }

  @Delete(":id")
  @ResponseMessage(MAINTENANCE_LOGS.MAINTENANCE_DELETED)
  remove(@Param("id") id: string) {
    return this.maintenanceRecordsService.remove(id);
  }
}

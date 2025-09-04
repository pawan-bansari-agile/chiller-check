import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import {
  CreateReportDto,
  GraphDto,
  ReportsListDto,
  ReportUserList,
  UpdateReportDto,
} from "./dto/create-report.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { REPORTS } from "src/common/constants/response.constant";
import { ResponseMessage } from "src/common/decorators/response.decorator";

@ApiBearerAuth()
@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post("create")
  @ResponseMessage(REPORTS.REPORTS_CREATE)
  @ApiOperation({ summary: "Create a report!" })
  @ApiBody({
    type: CreateReportDto,
    description: "Report details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Reports created successfully",
        message: REPORTS.REPORTS_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden: Only a user with permissions can create a maintenance log record!",
  })
  create(@Body() createReportDto: CreateReportDto, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.reportsService.create(createReportDto, loggedInUserId);
  }

  @Post("list")
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Reports list fetch successfully.",
        message: REPORTS.REPORTS_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can access this route!",
  })
  @ResponseMessage(REPORTS.REPORTS_LIST)
  findAll(@Req() req, @Body() body: ReportsListDto) {
    const loggedInUserId = req["user"]["_id"];
    return this.reportsService.findAll(loggedInUserId, body);
  }
  @Post("userList")
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Reports list fetch successfully.",
        message: REPORTS.REPORTS_USER,
      },
    },
  })
  @ResponseMessage(REPORTS.REPORTS_USER)
  findAllUser(@Req() req, @Body() body: ReportUserList) {
    return this.reportsService.findAllUser(req, body);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Report fetched successfully",
        message: REPORTS.REPORTS_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can fetch a report!",
  })
  @Get(":id")
  @ResponseMessage(REPORTS.REPORTS_BY_ID)
  findOne(@Param("id") id: string, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.reportsService.findOne(id, loggedInUserId);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Report fetched successfully",
        message: REPORTS.REPORTS_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can fetch a report!",
  })
  @Post("chart")
  @ResponseMessage(REPORTS.REPORTS_BY_ID)
  findOneChart(@Req() req, @Body() body: GraphDto) {
    return this.reportsService.findOneChart(req, body);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Report fetched successfully",
        message: REPORTS.REPORTS_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can fetch a report!",
  })
  @Post("exportExcel")
  @ResponseMessage(REPORTS.REPORTS_BY_ID)
  exportExcel(@Body() body: GraphDto) {
    return this.reportsService.exportExcel(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update report details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the report to be updated",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiBody({
    type: UpdateReportDto,
    description: "Report details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Report details updated successfully",
        message: REPORTS.REPORTS_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Report not found",
  })
  @ResponseMessage(REPORTS.REPORTS_UPDATED)
  update(
    @Param("id") id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Req() req,
  ) {
    const loggedInUserId = req["user"]["_id"];
    return this.reportsService.update(id, updateReportDto, loggedInUserId);
  }

  @Delete(":id")
  @ResponseMessage(REPORTS.REPORTS_DELETED)
  remove(@Param("id") id: string) {
    return this.reportsService.remove(id);
  }
}

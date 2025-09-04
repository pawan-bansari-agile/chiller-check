import { Body, Controller, Post, Req } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import { DASHBOARD } from "src/common/constants/response.constant";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { DashboardDto } from "./dto/dashboard.dto";

@ApiBearerAuth()
@ApiTags("Dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: "Get comprehensive dashboard data",
    description:
      "Retrieves efficiency alerts, performance summaries, and facility-wise data for chillers based on user permissions. Only companyId filtering is supported.",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Dashboard details fetched successfully",
        message: DASHBOARD.DASHBOARD_LIST,
        data: {
          efficiencyAlerts: [
            {
              _id: "log_id",
              chillerId: "chiller_id",
              facilityName: "Main Building",
              chillerName: "Carrier 30GX",
              ChillerNo: "CH-001",
              effLoss: 7.81,
              condAppLoss: 0.0,
              evapAppLoss: 0.0,
              nonCondLoss: 7.8,
              otherLoss: 0.0,
              totalLoss: 15.61,
              readingDate: "7/30/25 9:00 AM",
              readingDateUTC: "2025-07-30T14:00:00.000Z",
            },
          ],
          performanceSummary: {
            thisYTD: {
              averageLoss: 10.0,
              targetCost: 399902.0,
              lossCost: 48791.4,
              actualCost: 448693.4,
              kwhLoss: 542127.49,
              btuLoss: 1849801318.49,
              co2: 321.49,
            },
            lastYTD: {
              averageLoss: 4.0,
              targetCost: 324335.3,
              lossCost: 19312.11,
              actualCost: 343647.4,
              kwhLoss: 214579.49,
              btuLoss: 732169188.49,
              co2: 127.49,
            },
          },
          facilityWiseChillerLogs: [
            {
              facilityId: "facility_id",
              facilityName: "Main Building",
              chillerLogs: [
                {
                  _id: "chiller_id",
                  chillerId: "chiller_id",
                  ChillerNo: "CH-001",
                  chillerName: "Carrier 30GX",
                  effLoss: 7.81,
                  condAppLoss: 0.0,
                  evapAppLoss: 0.0,
                  nonCondLoss: 7.8,
                  otherLoss: 0.0,
                  totalLoss: 15.61,
                  readingDate: "7/30/25 9:00 AM",
                  readingDateUTC: "2025-07-30T14:00:00.000Z",
                },
              ],
            },
          ],
          facilityWisePerformance: [
            {
              facilityId: "facility_id",
              facilityName: "Main Building",
              performance: {
                thisYTD: {
                  averageLoss: 10.0,
                  targetCost: 399902.0,
                  lossCost: 48791.4,
                  actualCost: 448693.4,
                  kwhLoss: 542127.49,
                  btuLoss: 1849801318.49,
                  co2: 321.49,
                },
              },
            },
          ],
          chillers: [
            {
              _id: "chiller_id",
              ChillerNo: "CH-001",
              make: "Carrier",
              model: "30GX",
              facilityId: "facility_id",
              facilityName: "Main Building",
              status: "Active",
              energyCost: 0.12,
              emissionFactor: 0.8,
              latestLog: {
                effLoss: 7.81,
                condAppLoss: 0.0,
                evapAppLoss: 0.0,
                nonCondLoss: 7.8,
                otherLoss: 0.0,
                readingDate: "7/30/25 9:00 AM",
                readingDateUTC: "2025-07-30T14:00:00.000Z",
              },
              hasHighEfficiencyLoss: true,
              lastReadingDate: "7/30/25 9:00 AM",
              lastReadingDateUTC: "2025-07-30T14:00:00.000Z",
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Access denied based on user role",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized: Invalid or missing authentication token",
  })
  @ResponseMessage(DASHBOARD.DASHBOARD_LIST)
  @Post("allDetails")
  findAll(@Req() req, @Body() body: DashboardDto) {
    const loggedInUserId = req["user"]["_id"];
    return this.dashboardService.findAll(loggedInUserId, body);
  }
}

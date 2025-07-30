import { Body, Controller, Post } from "@nestjs/common";
import { TimelineService } from "./timeline.service";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { TIMELINE } from "src/common/constants/response.constant";
import { TimelineListDto } from "./dto/timeline.dto";

@ApiTags("Timeline")
@Controller("timeline")
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post("list")
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Timeline List fetched successfully",
        message: TIMELINE.TIMELINE_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(TIMELINE.TIMELINE_LIST)
  findAll(@Body() body: TimelineListDto) {
    return this.timelineService.findAll(body);
  }
}

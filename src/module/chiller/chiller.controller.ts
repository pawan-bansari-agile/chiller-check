import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Request,
  // ParseEnumPipe,
} from "@nestjs/common";
import { ChillerService } from "./chiller.service";
import {
  ActiveChillers,
  BulkUpdateChillerCostDto,
  ChillerByFacilityDto,
  ChillerListDto,
  ChillerStatusUpdateDto,
  CreateChillerDTO,
  UpdateChillerDto,
} from "./dto/chiller.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CHILLER,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
import { ResponseMessage } from "src/common/decorators/response.decorator";

@ApiTags("Chiller")
@Controller("chiller")
export class ChillerController {
  constructor(private readonly chillerService: ChillerService) {}

  @Post("/createChiller")
  @ApiOperation({ summary: "Create a chiller!" })
  @ApiBody({
    type: CreateChillerDTO,
    description: "Chiller details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Chiller created successfully",
        message: CHILLER.CHILLER_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ApiBearerAuth()
  // @Public()
  @ResponseMessage(CHILLER.CHILLER_CREATE)
  create(@Body() createChillerDto: CreateChillerDTO, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.chillerService.create(createChillerDto, loggedInUserId);
  }

  @Post("list")
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Chiller List fetched successfully",
        message: CHILLER.CHILLER_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ApiQuery({
    name: "companyId",
    required: false, // Marking companyId as optional in Swagger UI
    type: String,
    description: "The Company ID to filter chillers (optional)",
  })
  @ApiQuery({
    name: "facilityId",
    required: false, // Marking companyId as optional in Swagger UI
    type: String,
    description: "The Facility ID to filter chillers (optional)",
  })
  @ResponseMessage(CHILLER.CHILLER_LIST)
  findAll(@Request() req: Request, @Body() body: ChillerListDto) {
    return this.chillerService.findAll(req, body);
  }

  @Post("findAll")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Chiller List fetched successfully",
        message: CHILLER.CHILLER_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(CHILLER.CHILLER_LIST)
  findAllFacilities(@Req() req, @Body() dto?: ChillerByFacilityDto) {
    const loggedInUserId = req["user"]["_id"];
    return this.chillerService.findByFacilityIds(dto, loggedInUserId);
  }

  @Post("findAll/activeChillers")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "All Active Chillers listed",
        message: CHILLER.ACTIVE_CHILLER_LISTED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can list chillers!",
  })
  @ResponseMessage(CHILLER.ACTIVE_CHILLER_LISTED)
  findAllActiveChillers(@Body() dto?: ActiveChillers) {
    return this.chillerService.findAllActiveChillers(dto);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Chiller fetched successfully",
        message: CHILLER.CHILLER_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(CHILLER.CHILLER_BY_ID)
  @Get(":id")
  findOne(@Param("id") id: string, @Req() req) {
    const loggedInUserId = req["user"]["_id"];
    return this.chillerService.findOne(id, loggedInUserId);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: CHILLER.CHILLER_COST_UPDATED,
        message: CHILLER.CHILLER_COST_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(CHILLER.CHILLER_COST_UPDATED)
  @Patch("/bulk-update-energy-cost")
  async bulkUpdateEnergyCost(
    @Request() req: Request,
    @Body() body: BulkUpdateChillerCostDto,
  ) {
    return this.chillerService.bulkUpdateEnergyCost(req, body);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: CHILLER.CHILLER_STATUS_UPDATED,
        message: CHILLER.CHILLER_STATUS_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @Public()
  @ApiBearerAuth()
  @ApiBody({
    type: ChillerStatusUpdateDto,
    description: "Chiller status to update with!",
  })
  // @ResponseMessage(CHILLER.CHILLER_STATUS_UPDATED)
  @Patch(":id/inactivate")
  async inactivate(
    @Param("id") id: string,
    @Body("status")
    status: string,
    @Req() req,
  ) {
    const userId = req["user"]["_id"];
    return this.chillerService.inactivateChiller(id, status, userId);
  }

  @ApiOperation({ summary: "Update chiller details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the chiller to be updated",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiBody({
    type: UpdateChillerDto,
    description: "Chiller details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Chiller details updated successfully",
        message: RESPONSE_SUCCESS.CHILLER_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Chiller not found",
  })
  @ResponseMessage(CHILLER.CHILLER_UPDATE)
  @ApiBearerAuth()
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateChillerDto: UpdateChillerDto,
    @Req() req,
  ) {
    const userId = req["user"]["_id"];
    return this.chillerService.update(id, updateChillerDto, userId);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.chillerService.remove(+id);
  }
}

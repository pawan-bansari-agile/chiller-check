import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Request,
  Put,
  Query,
  Patch,
} from "@nestjs/common";
import { FacilityService } from "./facility.service";

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
  FACILITY,
  RESPONSE_SUCCESS,
} from "src/common/constants/response.constant";
// import { Public } from 'src/security/auth/auth.decorator';
import {
  ActiveFacilities,
  CreateFacilityDTO,
  FacilityListDto,
  UpdateFacilityDto,
  UpdateFacilityStatusDto,
} from "./dto/facility.dto";
import { ResponseMessage } from "src/common/decorators/response.decorator";
// import { Public } from "src/security/auth/auth.decorator";

@ApiTags("Facility")
@Controller("facility")
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Post("/createFacility")
  @ApiOperation({ summary: "Create a facility!" })
  @ApiBody({
    type: CreateFacilityDTO,
    description: "Facility details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Facility created successfully",
        message: FACILITY.FACILITY_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ApiBearerAuth()
  // @Public()
  @ResponseMessage(FACILITY.FACILITY_CREATE)
  create(@Body() createFacilityDto: CreateFacilityDTO) {
    return this.facilityService.create(createFacilityDto);
  }

  @Post("list")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Facility List fetched successfully",
        message: FACILITY.FACILITY_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(FACILITY.FACILITY_LIST)
  findAll(@Request() req: Request, @Body() body: FacilityListDto) {
    return this.facilityService.findAll(req, body);
  }

  @Post("findAll")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Facility List fetched successfully",
        message: FACILITY.FACILITY_LIST,
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
    description: "The Company ID to filter facilities (optional)",
  })
  @ResponseMessage(FACILITY.FACILITY_LIST)
  findAllFacilities(
    @Request() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.facilityService.findAllFacilities(req, companyId);
  }

  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Facility fetched successfully",
        message: FACILITY.FACILITY_BY_ID,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(FACILITY.FACILITY_BY_ID)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.facilityService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update facility details" })
  //   @Public()
  @ApiParam({
    name: "id",
    description: "ID of the facility to be updated",
    example: "60b3f6f4a1c4a33368a7a4bc",
  })
  @ApiBody({
    type: UpdateFacilityDto,
    description: "Facility details to be updated",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Facility details updated successfully",
        message: RESPONSE_SUCCESS.FACILITY_UPDATED,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Facility not found",
  })
  @ResponseMessage(FACILITY.FACILITY_UPDATE)
  @ApiBearerAuth()
  // @Public()
  update(
    @Param("id") id: string,
    @Body() updateFacilityDto: UpdateFacilityDto,
  ) {
    return this.facilityService.update(id, updateFacilityDto);
  }

  @Patch(":facilityId")
  @ApiParam({
    name: "facilityId",
    description: "The ID of the facility to update",
  })
  @ApiResponse({
    status: 200,
    description: "Facility status updated successfully.",
  })
  // @ResponseMessage(FACILITY.FACILITY_STATUS_UPDATED)
  // @Public()
  @ApiBearerAuth()
  async updateFacilityStatus(
    @Param("facilityId") facilityId: string, // Facility ID from the URL parameter
    @Body() body: UpdateFacilityStatusDto, // Request body with new isActive value
  ) {
    return this.facilityService.updateStatus(facilityId, body);
  }

  @Post("findAll/activeFacilities")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "All Active Chillers listed",
        message: FACILITY.ACTIVE_FACILITY_LISTED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can list chillers!",
  })
  @ResponseMessage(FACILITY.ACTIVE_FACILITY_LISTED)
  findAllActiveChillers(@Body() dto?: ActiveFacilities) {
    return this.facilityService.findAllActiveChillers(dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.facilityService.remove(+id);
  }
}
// unwanted

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Put,
  Patch,
  // ForbiddenException,
} from "@nestjs/common";
import { CompanyService } from "./company.service";
// import { Role } from 'src/common/constants/enum.constant';
import {
  ApiBearerAuth,
  // ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { COMPANY } from "src/common/constants/response.constant";
// import { Public } from "src/security/auth/auth.decorator";
import {
  CompanyListDto,
  CreateCompanyDto,
  EditCompanyDto,
  UnassignedCompanyListDto,
  UpdateCompanyStatusDto,
} from "./dto/company.dto";
import { Request } from "express";
import { ResponseMessage } from "src/common/decorators/response.decorator";

@Controller("company")
@ApiTags("Company")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post("/createCompany")
  @ApiOperation({ summary: "Create a company!" })
  @ApiBody({
    type: CreateCompanyDto,
    description: "Company details to be created!",
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Company created successfully",
        message: COMPANY.COMPANY_CREATE,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(COMPANY.COMPANY_CREATE)
  @ApiBearerAuth()
  // @Public()
  async create(
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: Request,
  ) {
    console.log("✌️req --->", req.user);
    // uncomment the below for making it admin only
    // if (req.user.role !== Role.ADMIN) {
    //   throw new ForbiddenException("Only Admins can create a company.");
    // }
    return this.companyService.create(createCompanyDto);
  }

  @Post("list")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Company List fetched successfully",
        message: COMPANY.COMPANY_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(COMPANY.COMPANY_LIST)
  findAll(@Req() req: Request, @Body() body: CompanyListDto) {
    return this.companyService.findAll(req, body);
  }

  @Post("findAll")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Company List fetched successfully",
        message: COMPANY.COMPANY_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(COMPANY.COMPANY_LIST)
  findAllNotDeleted(@Req() req: Request) {
    return this.companyService.findAllNotDeleted(req);
  }

  @Post("findAllNotAssigned")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "Company List fetched successfully",
        message: COMPANY.COMPANY_LIST,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  @ResponseMessage(COMPANY.COMPANY_LIST)
  findAllNotAssigned(@Body() body: UnassignedCompanyListDto) {
    return this.companyService.findAllNotAssigned(body);
  }

  @Get(":id")
  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(COMPANY.COMPANY_FOUND)
  findOne(@Param("id") id: string) {
    return this.companyService.findOne(id);
  }

  // @Public()
  @ApiBearerAuth()
  @Put(":companyId")
  @ApiParam({
    name: "companyId",
    description: "The ID of the company to update status",
  })
  @ApiResponse({
    status: 200,
    description: "Company status updated successfully.",
  })
  // @ResponseMessage(COMPANY.COMPANY_STATUS_UPDATED)
  async updateCompanyStatus(
    @Param("companyId") companyId: string, // Company ID from the URL parameter
    @Body() body: UpdateCompanyStatusDto, // Request body with new status
  ) {
    return this.companyService.updateStatus(companyId, body);
  }

  // @Public()
  @ApiBearerAuth()
  @ResponseMessage(COMPANY.COMPANY_UPDATE)
  @Patch(":id")
  @ApiParam({
    name: "id",
    description: "The ID of the company to update status",
  })
  @ApiResponse({
    status: 200,
    description: "Company updated successfully.",
  })
  async updateCompany(
    @Param("id") id: string, // Company ID from the URL parameter
    @Body() body: EditCompanyDto, // Request body with new status
  ) {
    return this.companyService.updateCompany(id, body);
  }

  @Get("findAll/activeCompanies")
  // @Public()
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      example: {
        status: 200,
        description: "All Active Company listed",
        message: COMPANY.ACTIVE_COMPANY_LISTED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can list company!",
  })
  @ResponseMessage(COMPANY.ACTIVE_COMPANY_LISTED)
  findAllActiveChillers() {
    return this.companyService.findAllActiveCompany();
  }
}

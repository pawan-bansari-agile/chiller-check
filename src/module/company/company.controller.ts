import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  // ForbiddenException,
} from "@nestjs/common";
import { CompanyService } from "./company.service";
// import { Role } from 'src/common/constants/enum.constant';
import { CreateCompanyDto, UpdateCompanyDto } from "src/common/dto/common.dto";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RESPONSE_SUCCESS } from "src/common/constants/response.constant";
import { Public } from "src/security/auth/auth.decorator";

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
        message: RESPONSE_SUCCESS.COMPANY_CREATED,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden: Only an Admin can create Company!",
  })
  // @ApiBearerAuth()
  @Public()
  async create(@Body() createCompanyDto: CreateCompanyDto, @Request() req) {
    console.log("✌️req --->", req.user);
    // uncomment the below for making it admin only
    // if (req.user.role !== Role.ADMIN) {
    //   throw new ForbiddenException("Only Admins can create a company.");
    // }
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  findAll() {
    return this.companyService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.companyService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(+id, updateCompanyDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.companyService.remove(+id);
  }
}

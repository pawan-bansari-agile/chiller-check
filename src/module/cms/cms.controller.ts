import { Controller, Post, Body } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminCmsDto } from "./dto/create-cm.dto";
import { ResponseMessage } from "src/common/decorators/response.decorator";
import { CMS } from "src/common/constants/response.constant";
import { updateAdminCms } from "./dto/update-cm.dto";

@Controller("cms")
@ApiBearerAuth()
@ApiTags("CMS")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post("getCmsByTitle")
  @ResponseMessage(CMS.CMS_DETAIL)
  @ApiOperation({ summary: "Get CMS by heading" })
  findOne(@Body() body: AdminCmsDto) {
    return this.cmsService.findOne(body);
  }

  @Post("updateCms")
  @ResponseMessage(CMS.CMS_EDITED)
  @ApiOperation({ summary: "update CMS by heading" })
  update(@Body() body: updateAdminCms) {
    return this.cmsService.updateAdminCms(body);
  }
}

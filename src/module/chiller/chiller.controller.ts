import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { ChillerService } from "./chiller.service";
import { CreateChillerDTO, UpdateChillerDto } from "./dto/chiller.dto";

@Controller("chiller")
export class ChillerController {
  constructor(private readonly chillerService: ChillerService) {}

  @Post()
  create(@Body() createChillerDto: CreateChillerDTO) {
    return this.chillerService.create(createChillerDto);
  }

  @Get()
  findAll() {
    return this.chillerService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.chillerService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateChillerDto: UpdateChillerDto) {
    return this.chillerService.update(+id, updateChillerDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.chillerService.remove(+id);
  }
}

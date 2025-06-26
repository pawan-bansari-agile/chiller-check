import { Injectable } from "@nestjs/common";
import { CreateChillerDTO, UpdateChillerDto } from "./dto/chiller.dto";

@Injectable()
export class ChillerService {
  create(createChillerDto: CreateChillerDTO) {
    console.log("✌️createChillerDto --->", createChillerDto);
    return "This action adds a new chiller";
  }

  findAll() {
    return `This action returns all chiller`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chiller`;
  }

  update(id: number, updateChillerDto: UpdateChillerDto) {
    console.log("✌️updateChillerDto --->", updateChillerDto);
    return `This action updates a #${id} chiller`;
  }

  remove(id: number) {
    return `This action removes a #${id} chiller`;
  }
}

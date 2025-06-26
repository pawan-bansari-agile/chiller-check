import { Module } from "@nestjs/common";
import { ChillerService } from "./chiller.service";
import { ChillerController } from "./chiller.controller";

@Module({
  controllers: [ChillerController],
  providers: [ChillerService],
})
export class ChillerModule {}

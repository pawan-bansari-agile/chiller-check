import { Module } from "@nestjs/common";
import { TimelineService } from "./timeline.service";
import { TimelineController } from "./timeline.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Timeline, TimelineSchema } from "src/common/schema/timeline.schema";
import { Chiller, ChillerSchema } from "src/common/schema/chiller.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timeline.name, schema: TimelineSchema },
      { name: Chiller.name, schema: ChillerSchema },
    ]),
  ],
  controllers: [TimelineController],
  providers: [TimelineService],
})
export class TimelineModule {}

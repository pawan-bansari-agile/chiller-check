import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";

export type ProblemAndSolutionsDocument = ProblemAndSolutions & Document;

@Schema({ collection: TABLE_NAMES.ProblemAndSolution, timestamps: true })
export class ProblemAndSolutions {
  @Prop({})
  section: string;

  @Prop({})
  field: string;

  @Prop({})
  problem: string;

  @Prop({})
  solution: string;

  @Prop({})
  updated_by: string;

  @Prop({})
  updated_by_profile: string;
}

export const ProblemAndSolutionsSchema =
  SchemaFactory.createForClass(ProblemAndSolutions);

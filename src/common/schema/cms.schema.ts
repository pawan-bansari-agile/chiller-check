import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
import { CMS } from "../constants/enum.constant";

export type CmsDocument = Cms & Document;

@Schema({ collection: TABLE_NAMES.CMS, timestamps: true })
export class Cms {
  @Prop({ enum: CMS, required: true })
  title: CMS;

  @Prop({ required: true })
  description: string;
}

export const CmsSchema = SchemaFactory.createForClass(Cms);

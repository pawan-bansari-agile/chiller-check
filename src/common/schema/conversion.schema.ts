import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ConversionDocument = Conversion & Document;

function nullableNumber(val: unknown): number | undefined {
  if (val === "NULL" || val === null || val === undefined || val === "") {
    return undefined;
  }

  const num = Number(val);
  return isNaN(num) ? undefined : num;
}

@Schema()
export class Conversion {
  @Prop({
    type: Number,
    set: nullableNumber,
  })
  conversionId: number;

  @Prop()
  refrigName: string;

  @Prop({
    type: Number,
    set: nullableNumber,
  })
  tempF: number;

  @Prop({
    type: Number,
    set: nullableNumber,
  })
  psia: number;

  @Prop({
    type: Number,
    set: nullableNumber,
  })
  psig: number;

  @Prop({
    type: Number,
    set: nullableNumber,
  })
  inHg: number;
}

export const ConversionSchema = SchemaFactory.createForClass(Conversion);

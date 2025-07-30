import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type AltitudeCorrectionDocument = AltitudeCorrection & Document;

// function nullableNumber(val: unknown): number | undefined {
//   if (val === 'NULL' || val === null || val === undefined || val === '') {
//     return undefined;
//   }

//   const num = Number(val);
//   return isNaN(num) ? undefined : num;
// }

@Schema()
export class AltitudeCorrection {
  @Prop({ type: Number })
  meters: number;

  @Prop({ type: Number })
  feet: number;

  @Prop({ type: Number })
  psi: number;

  @Prop({ type: Number })
  correction: number;
}

export const AltitudeCorrectionSchema =
  SchemaFactory.createForClass(AltitudeCorrection);

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type GmailStateDocument = GmailState &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: "gmail_state", timestamps: true })
export class GmailState extends Document {
  @Prop({ required: true, default: "gmail_state" })
  _id: string;

  @Prop({ index: true })
  historyId?: string;

  @Prop({ default: false })
  processing?: boolean;

  @Prop()
  processingHistoryId?: string;

  @Prop()
  processingAt?: Date;
}

export const GmailStateSchema = SchemaFactory.createForClass(GmailState);

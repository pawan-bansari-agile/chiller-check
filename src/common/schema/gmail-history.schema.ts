import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type GmailHistoryDocument = GmailHistory &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: "gmail_history", timestamps: true })
export class GmailHistory extends Document {
  @Prop({ required: true })
  lastHistoryId: string;
}

export const GmailHistorySchema = SchemaFactory.createForClass(GmailHistory);

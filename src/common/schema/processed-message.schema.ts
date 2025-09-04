import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ProcessedMessageDocument = ProcessedMessage &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: "processed_messages", timestamps: true })
export class ProcessedMessage extends Document {
  @Prop({ required: true, unique: true, index: true })
  messageId: string;

  @Prop({ default: () => new Date() })
  processedAt: Date;
}

export const ProcessedMessageSchema =
  SchemaFactory.createForClass(ProcessedMessage);

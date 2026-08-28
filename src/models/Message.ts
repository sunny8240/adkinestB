import { Schema, model } from "mongoose";

export interface MessageDocument {
  conversationId: Schema.Types.ObjectId;
  senderId: string;
  senderRole: "admin" | "user";
  body: string;
  readAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<MessageDocument>({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  senderId: { type: String, required: true },
  senderRole: { type: String, enum: ["admin", "user"], required: true },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  readAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
export const Message = model<MessageDocument>("Message", messageSchema);

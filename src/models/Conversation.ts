import { Schema, model } from "mongoose";

export interface ConversationDocument {
  userId: Schema.Types.ObjectId;
  status: "open" | "closed";
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });
conversationSchema.index({ lastMessageAt: -1 });
export const Conversation = model<ConversationDocument>("Conversation", conversationSchema);

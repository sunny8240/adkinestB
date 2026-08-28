import { Schema, model } from "mongoose";

export interface NotificationDocument {
  recipientId: string;
  recipientRole: "admin" | "user";
  type: "lead" | "message" | "review" | "system";
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>({
  recipientId: { type: String, required: true, index: true },
  recipientRole: { type: String, enum: ["admin", "user"], required: true },
  type: { type: String, enum: ["lead", "message", "review", "system"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  link: { type: String, trim: true, maxlength: 200 },
  readAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
export const Notification = model<NotificationDocument>("Notification", notificationSchema);

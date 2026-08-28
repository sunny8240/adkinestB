import { Schema, model } from "mongoose";

export type ServiceRequestStatus = "requested" | "in_progress" | "completed" | "cancelled";

export interface ServiceRequestDocument {
  userId: Schema.Types.ObjectId;
  service: string;
  details: string;
  status: ServiceRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceRequestSchema = new Schema<ServiceRequestDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  service: { type: String, required: true, trim: true, maxlength: 120 },
  details: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["requested", "in_progress", "completed", "cancelled"], default: "requested" },
}, { timestamps: true, versionKey: false });

serviceRequestSchema.index({ userId: 1, createdAt: -1 });
export const ServiceRequest = model<ServiceRequestDocument>("ServiceRequest", serviceRequestSchema);

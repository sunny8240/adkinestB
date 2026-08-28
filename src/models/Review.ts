import { Schema, model } from "mongoose";

export interface ReviewDocument {
  userId: Schema.Types.ObjectId;
  name: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true, versionKey: false });
export const Review = model<ReviewDocument>("Review", reviewSchema);

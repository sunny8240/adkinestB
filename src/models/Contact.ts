import { Schema, model } from "mongoose";

export interface ContactDocument {
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<ContactDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true, versionKey: false }
);

export const Contact = model<ContactDocument>("Contact", contactSchema);

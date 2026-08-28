import { Schema, model } from "mongoose";

export interface SiteContentDocument {
  key: string;
  announcement: string;
  hero_title: string;
  hero_description: string;
  services: string[];
  updatedAt: Date;
}

const siteContentSchema = new Schema<SiteContentDocument>(
  {
    key: { type: String, unique: true, default: "main" },
    announcement: { type: String, trim: true, maxlength: 240, default: "" },
    hero_title: { type: String, trim: true, maxlength: 160, default: "" },
    hero_description: { type: String, trim: true, maxlength: 1000, default: "" },
    services: { type: [String], default: [], validate: [(items: string[]) => items.length <= 30, "Too many services"] },
  },
  { timestamps: true, versionKey: false }
);

export const SiteContent = model<SiteContentDocument>("SiteContent", siteContentSchema);

import { Schema, model } from "mongoose";

export interface ProjectDocument {
  title: string;
  description: string;
  category: string;
  image_url: string;
  tech_stack: string[];
  live_url?: string;
  github_url?: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    image_url: { type: String, required: true, trim: true, maxlength: 2048 },
    tech_stack: { type: [String], default: [], validate: [(items: string[]) => items.length <= 20, "Too many technologies"] },
    live_url: { type: String, trim: true, maxlength: 2048 },
    github_url: { type: String, trim: true, maxlength: 2048 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const Project = model<ProjectDocument>("Project", projectSchema);

import { Schema, model } from "mongoose";

export type BlogPostStatus = "draft" | "published";

export interface BlogPostDocument {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: string;
  category: string;
  tags: string[];
  status: BlogPostStatus;
  featured: boolean;
  publishedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<BlogPostDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, unique: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 400 },
    content: { type: String, required: true, maxlength: 100000 },
    coverImage: { type: String, trim: true, maxlength: 2048 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    tags: { type: [String], default: [], validate: [(items: string[]) => items.length <= 20, "Too many tags"] },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date },
    seoTitle: { type: String, trim: true, maxlength: 160 },
    seoDescription: { type: String, trim: true, maxlength: 320 },
    seoKeywords: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });

export const BlogPost = model<BlogPostDocument>("BlogPost", blogPostSchema);

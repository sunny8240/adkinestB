import { Schema, model } from "mongoose";

export type BlogPostStatus = "draft" | "published";

export interface BlogPostDocument {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  coverImageAlt?: string;
  coverImageCaption?: string;
  author: string;
  category: string;
  tags: string[];
  status: BlogPostStatus;
  featured: boolean;
  focusKeyword?: string;
  canonicalUrl?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
  publishedAt?: Date;
  lastUpdatedAt?: Date;
  relatedServices?: string[];
  faqs?: Array<{ question: string; answer: string }>;
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
    coverImageAlt: { type: String, trim: true, maxlength: 220 },
    coverImageCaption: { type: String, trim: true, maxlength: 220 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    tags: { type: [String], default: [], validate: [(items: string[]) => items.length <= 20, "Too many tags"] },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    focusKeyword: { type: String, trim: true, maxlength: 120 },
    canonicalUrl: { type: String, trim: true, maxlength: 2048 },
    socialTitle: { type: String, trim: true, maxlength: 160 },
    socialDescription: { type: String, trim: true, maxlength: 320 },
    socialImage: { type: String, trim: true, maxlength: 2048 },
    publishedAt: { type: Date },
    lastUpdatedAt: { type: Date },
    relatedServices: { type: [String], default: [] },
    faqs: {
      type: [{ question: { type: String, trim: true, maxlength: 240 }, answer: { type: String, trim: true, maxlength: 2000 } }],
      default: [],
      validate: [(items: Array<{ question: string; answer: string }>) => items.length <= 12, "Too many FAQs"],
    },
    seoTitle: { type: String, trim: true, maxlength: 160 },
    seoDescription: { type: String, trim: true, maxlength: 320 },
    seoKeywords: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });

export const BlogPost = model<BlogPostDocument>("BlogPost", blogPostSchema);

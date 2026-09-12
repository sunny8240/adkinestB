import { Schema, model } from "mongoose";

export type PageContentStatus = "draft" | "published";

export interface PageSectionItem {
  title: string;
  description?: string;
  value?: string;
}

export interface PageSection {
  id: string;
  type: "hero" | "features" | "stats" | "cta" | "content";
  eyebrow?: string;
  title?: string;
  description?: string;
  body?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  items?: PageSectionItem[];
}

export interface PageContentDocument {
  slug: string;
  title: string;
  excerpt: string;
  status: PageContentStatus;
  sections: PageSection[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pageSectionItemSchema = new Schema<PageSectionItem>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    value: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const pageSectionSchema = new Schema<PageSection>(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ["hero", "features", "stats", "cta", "content"], required: true },
    eyebrow: { type: String, trim: true, maxlength: 80 },
    title: { type: String, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 2000 },
    body: { type: String, trim: true, maxlength: 10000 },
    primaryCtaLabel: { type: String, trim: true, maxlength: 60 },
    primaryCtaHref: { type: String, trim: true, maxlength: 250 },
    secondaryCtaLabel: { type: String, trim: true, maxlength: 60 },
    secondaryCtaHref: { type: String, trim: true, maxlength: 250 },
    items: { type: [pageSectionItemSchema], default: [] },
  },
  { _id: false }
);

const pageContentSchema = new Schema<PageContentDocument>(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    sections: { type: [pageSectionSchema], default: [], validate: [(items: PageSection[]) => items.length <= 12, "Too many sections"] },
    seoTitle: { type: String, trim: true, maxlength: 160 },
    seoDescription: { type: String, trim: true, maxlength: 320 },
    seoKeywords: { type: [String], default: [] },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

pageContentSchema.index({ status: 1, publishedAt: -1 });

export const PageContent = model<PageContentDocument>("PageContent", pageContentSchema);
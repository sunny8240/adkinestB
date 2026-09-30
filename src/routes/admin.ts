import { Router, type Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import { isValidObjectId } from "mongoose";
import multer from "multer";
import { z } from "zod";
import { Lead, type LeadStatus } from "../models/Lead.js";
import { Project } from "../models/Project.js";
import { Testimonial } from "../models/Testimonial.js";
import { SiteContent } from "../models/SiteContent.js";
import { Review } from "../models/Review.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { createNotification } from "../services/notifications.js";
import { requireAdmin } from "../middleware/auth.js";
import { BlogPost, type BlogPostStatus } from "../models/BlogPost.js";
import { PageContent } from "../models/PageContent.js";
import { buildCanonicalUrl, toSlug } from "../services/seo.js";
import { uploadBlogImage } from "../services/imageStorage.js";
import { env } from "../config/env.js";

const idParam = z.string().refine(isValidObjectId, "Invalid record id");
const blogStatus = z.enum(["draft", "published"]);
const blogPostSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers and hyphens.").max(180).optional().or(z.literal("")),
  excerpt: z.string().trim().min(10).max(400),
  content: z.string().trim().min(20).max(100000),
  coverImage: z.string().url().max(2048).optional().or(z.literal("")),
  coverImageTitle: z.string().trim().max(160).optional().or(z.literal("")),
  coverImageAlt: z.string().trim().max(220).optional().or(z.literal("")),
  coverImageCaption: z.string().trim().max(220).optional().or(z.literal("")),
  author: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: blogStatus.default("draft"),
  featured: z.boolean().default(false),
  focusKeyword: z.string().trim().max(120).optional().or(z.literal("")),
  canonicalUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  socialTitle: z.string().trim().max(160).optional().or(z.literal("")),
  socialDescription: z.string().trim().max(320).optional().or(z.literal("")),
  socialImage: z.string().url().max(2048).optional().or(z.literal("")),
  publishedAt: z.union([z.string(), z.date(), z.null()]).optional().nullable().transform((value) => value ? new Date(value) : undefined),
  lastUpdatedAt: z.union([z.string(), z.date(), z.null()]).optional().nullable().transform((value) => value ? new Date(value) : undefined),
  relatedServices: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  inlineImages: z.array(z.object({
    url: z.string().url().max(2048),
    title: z.string().trim().max(160).default(""),
    alt: z.string().trim().max(220).default(""),
    caption: z.string().trim().max(220).default(""),
    afterParagraph: z.number().int().min(0).max(1000),
  })).max(20).default([]),
  faqs: z.array(z.object({ question: z.string().trim().min(2).max(240), answer: z.string().trim().min(2).max(2000) })).max(12).default([]),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  seoKeywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
const stripUnsafeHtml = (content: string) => content.replace(/<\/?(script|iframe|object|embed|style)[^>]*>/gi, "");
const blogInput = (input: z.infer<typeof blogPostSchema>) => {
  const normalizedSlug = (input.slug && input.slug.trim()) || toSlug(input.title);
  const normalizedCanonical = (input.canonicalUrl && input.canonicalUrl.trim()) || buildCanonicalUrl(env.CLIENT_ORIGIN || "https://www.adkinest.tech", normalizedSlug);
  const now = new Date();
  const publishedAt = input.status === "published" ? (input.publishedAt ?? now) : undefined;
  const lastUpdatedAt = input.lastUpdatedAt ?? publishedAt ?? now;

  return {
    ...input,
    slug: normalizedSlug,
    coverImageAlt: input.coverImageAlt?.trim() || "",
    coverImageCaption: input.coverImageCaption?.trim() || "",
    focusKeyword: input.focusKeyword?.trim() || "",
    canonicalUrl: normalizedCanonical,
    socialTitle: input.socialTitle?.trim() || input.seoTitle?.trim() || input.title.trim(),
    socialDescription: input.socialDescription?.trim() || input.seoDescription?.trim() || input.excerpt.trim(),
    socialImage: input.socialImage?.trim() || input.coverImage?.trim() || "",
    content: stripUnsafeHtml(input.content),
    publishedAt,
    lastUpdatedAt,
  };
};

const pageSectionItemSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  value: z.string().trim().max(80).optional().or(z.literal("")),
});

const pageSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["hero", "features", "stats", "cta", "content"]),
  eyebrow: z.string().trim().max(80).optional().or(z.literal("")),
  title: z.string().trim().max(180).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  body: z.string().trim().max(10000).optional().or(z.literal("")),
  primaryCtaLabel: z.string().trim().max(60).optional().or(z.literal("")),
  primaryCtaHref: z.string().trim().max(250).optional().or(z.literal("")),
  secondaryCtaLabel: z.string().trim().max(60).optional().or(z.literal("")),
  secondaryCtaHref: z.string().trim().max(250).optional().or(z.literal("")),
  items: z.array(pageSectionItemSchema).max(12).default([]),
}).strict();

const pageSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers and hyphens."),
  title: z.string().trim().min(2).max(180),
  excerpt: z.string().trim().min(10).max(500),
  status: z.enum(["draft", "published"]).default("draft"),
  sections: z.array(pageSectionSchema).max(12).default([]),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  seoKeywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const sanitizePageSections = (sections: z.infer<typeof pageSectionSchema>[]) =>
  sections.map((section) => ({
    ...section,
    title: section.title ? stripUnsafeHtml(section.title) : "",
    description: section.description ? stripUnsafeHtml(section.description) : "",
    body: section.body ? stripUnsafeHtml(section.body) : "",
    eyebrow: section.eyebrow ? stripUnsafeHtml(section.eyebrow) : "",
    primaryCtaLabel: section.primaryCtaLabel ? stripUnsafeHtml(section.primaryCtaLabel) : "",
    secondaryCtaLabel: section.secondaryCtaLabel ? stripUnsafeHtml(section.secondaryCtaLabel) : "",
    items: (section.items || []).map((item) => ({
      ...item,
      title: stripUnsafeHtml(item.title),
      description: item.description ? stripUnsafeHtml(item.description) : "",
      value: item.value ? stripUnsafeHtml(item.value) : "",
    })),
  }));

const pageInput = (input: z.infer<typeof pageSchema>) => ({
  ...input,
  sections: sanitizePageSections(input.sections),
  publishedAt: input.status === "published" ? new Date() : undefined,
});
const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  image_url: z.string().url().max(2048),
  tech_stack: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  live_url: z.string().url().max(2048).nullable().optional(),
  github_url: z.string().url().max(2048).nullable().optional(),
  featured: z.boolean().default(false),
});
const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(120),
  avatar_url: z.string().url().max(2048).nullable().optional(),
  quote: z.string().trim().min(10).max(2000),
  rating: z.number().int().min(1).max(5),
});
const leadStatusSchema = z.object({ status: z.enum(["new", "contacted", "qualified", "closed"]) });
const contentSchema = z.object({
  announcement: z.string().trim().max(240),
  hero_title: z.string().trim().max(160),
  hero_description: z.string().trim().max(1000),
  services: z.array(z.string().trim().min(2).max(100)).max(30),
});

const idOf = (record: { _id: unknown }) => ({ ...record, id: String(record._id) });
const sendList = (res: Response, records: unknown[]) => res.json(records.map((record) => idOf(record as { _id: unknown })));

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const parseBlogImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Upload a JPG, PNG, WebP, or AVIF image."), { statusCode: 415 }));
      return;
    }
    callback(null, true);
  },
}).single("image");

adminRouter.post("/uploads/images", (req, res, next) => {
  parseBlogImage(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ detail: error.code === "LIMIT_FILE_SIZE" ? "Image must be 4 MB or smaller." : "Upload one image file." });
      return;
    }
    const uploadError = error as Error & { statusCode?: number };
    res.status(uploadError.statusCode || 400).json({ detail: uploadError.message });
  });
}, async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ detail: "Choose an image to upload." });
    return;
  }
  try {
    const detectedType = await fileTypeFromBuffer(req.file.buffer);
    if (!detectedType || detectedType.mime !== req.file.mimetype || !allowedImageTypes.has(detectedType.mime)) {
      res.status(415).json({ detail: "The uploaded file is not a supported image." });
      return;
    }
    res.status(201).json(await uploadBlogImage(req.file.buffer));
  } catch (error) {
    const uploadError = error as Error & { statusCode?: number };
    if (uploadError.statusCode === 503) {
      res.status(503).json({ detail: uploadError.message });
      return;
    }
    next(error);
  }
});

adminRouter.get("/content", async (_req, res, next) => {
  try { res.json(await SiteContent.findOne({ key: "main" }).lean() ?? { announcement: "", hero_title: "", hero_description: "", services: [] }); } catch (error) { next(error); }
});
adminRouter.put("/content", async (req, res, next) => {
  try { res.json(await SiteContent.findOneAndUpdate({ key: "main" }, { ...contentSchema.parse(req.body), key: "main" }, { new: true, upsert: true, runValidators: true }).lean()); } catch (error) { next(error); }
});

adminRouter.get("/reviews", async (_req, res, next) => {
  try { const reviews = await Review.find().sort({ createdAt: -1 }).lean(); res.json(reviews.map((review) => ({ ...review, id: String(review._id) }))); } catch (error) { next(error); }
});
adminRouter.put("/reviews/:id", async (req, res, next) => {
  try { const review = await Review.findByIdAndUpdate(idParam.parse(req.params.id), { status: z.object({ status: z.enum(["pending", "approved", "rejected"]) }).parse(req.body).status }, { new: true }).lean(); if (!review) { res.status(404).json({ detail: "Review not found." }); return; } res.json({ ...review, id: String(review._id) }); } catch (error) { next(error); }
});
adminRouter.delete("/reviews/:id", async (req, res, next) => {
  try { await Review.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});

adminRouter.get("/services", async (_req, res, next) => {
  try { const requests = await ServiceRequest.find().sort({ createdAt: -1 }).populate("userId", "name email").lean(); res.json(requests.map((request) => ({ ...request, id: String(request._id), user: request.userId }))); } catch (error) { next(error); }
});
adminRouter.put("/services/:id", async (req, res, next) => {
  try { const status = z.object({ status: z.enum(["requested", "in_progress", "completed", "cancelled"]) }).parse(req.body).status; const request = await ServiceRequest.findByIdAndUpdate(idParam.parse(req.params.id), { status }, { new: true }).lean(); if (!request) { res.status(404).json({ detail: "Service request not found." }); return; } await createNotification({ recipientId: String(request.userId), recipientRole: "user", type: "system", title: "Service request updated", body: `Your ${request.service} request is now ${status.replace("_", " ")}.`, link: "/dashboard" }); res.json({ ...request, id: String(request._id) }); } catch (error) { next(error); }
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [leadsTotal, leadsNew, portfolioTotal, testimonialsTotal] = await Promise.all([
      Lead.countDocuments(), Lead.countDocuments({ status: "new" }), Project.countDocuments(), Testimonial.countDocuments(),
    ]);
    res.json({ leads_total: leadsTotal, leads_new: leadsNew, portfolio_total: portfolioTotal, testimonials_total: testimonialsTotal });
  } catch (error) { next(error); }
});

adminRouter.get("/leads", async (_req, res, next) => {
  try { sendList(res, await Lead.find().sort({ createdAt: -1 }).lean()); } catch (error) { next(error); }
});
adminRouter.put("/leads/:id", async (req, res, next) => {
  try {
    const id = idParam.parse(req.params.id);
    const { status } = leadStatusSchema.parse(req.body);
    const lead = await Lead.findByIdAndUpdate(id, { status: status as LeadStatus }, { new: true, runValidators: true }).lean();
    if (!lead) { res.status(404).json({ detail: "Lead not found." }); return; }
    res.json(idOf(lead));
  } catch (error) { next(error); }
});
adminRouter.delete("/leads/:id", async (req, res, next) => {
  try { await Lead.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});

adminRouter.get("/portfolio", async (_req, res, next) => {
  try { sendList(res, await Project.find().sort({ featured: -1, createdAt: -1 }).lean()); } catch (error) { next(error); }
});
adminRouter.post("/portfolio", async (req, res, next) => {
  try { res.status(201).json(idOf((await Project.create(projectSchema.parse(req.body))).toObject())); } catch (error) { next(error); }
});
adminRouter.put("/portfolio/:id", async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(idParam.parse(req.params.id), projectSchema.parse(req.body), { new: true, runValidators: true }).lean();
    if (!project) { res.status(404).json({ detail: "Project not found." }); return; }
    res.json(idOf(project));
  } catch (error) { next(error); }
});
adminRouter.delete("/portfolio/:id", async (req, res, next) => {
  try { await Project.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});

adminRouter.get("/testimonials", async (_req, res, next) => {
  try { sendList(res, await Testimonial.find().sort({ createdAt: -1 }).lean()); } catch (error) { next(error); }
});
adminRouter.post("/testimonials", async (req, res, next) => {
  try { res.status(201).json(idOf((await Testimonial.create(testimonialSchema.parse(req.body))).toObject())); } catch (error) { next(error); }
});
adminRouter.put("/testimonials/:id", async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(idParam.parse(req.params.id), testimonialSchema.parse(req.body), { new: true, runValidators: true }).lean();
    if (!testimonial) { res.status(404).json({ detail: "Testimonial not found." }); return; }
    res.json(idOf(testimonial));
  } catch (error) { next(error); }
});
adminRouter.delete("/testimonials/:id", async (req, res, next) => {
  try { await Testimonial.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});

adminRouter.get("/blog", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    const status = req.query.status ? blogStatus.parse(String(req.query.status)) : undefined;
    const category = String(req.query.category || "").trim();
    const featured = req.query.featured === undefined ? undefined : req.query.featured === "true";
    const sortKey = String(req.query.sort || "newest");
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (featured !== undefined) filter.featured = featured;
    if (query) filter.$or = [{ title: { $regex: query, $options: "i" } }, { slug: { $regex: query, $options: "i" } }, { category: { $regex: query, $options: "i" } }];
    const sort: Record<string, 1 | -1> = sortKey === "oldest" ? { createdAt: 1 } : sortKey === "updated" ? { updatedAt: -1 } : { createdAt: -1 };
    sendList(res, await BlogPost.find(filter).sort(sort).lean());
  } catch (error) { next(error); }
});
adminRouter.post("/blog", async (req, res, next) => {
  try { res.status(201).json(idOf((await BlogPost.create(blogInput(blogPostSchema.parse(req.body)))).toObject())); } catch (error) { next(error); }
});
adminRouter.put("/blog/:id", async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(idParam.parse(req.params.id), blogInput(blogPostSchema.parse(req.body)), { new: true, runValidators: true }).lean();
    if (!post) { res.status(404).json({ detail: "Blog post not found." }); return; }
    res.json(idOf(post));
  } catch (error) { next(error); }
});
adminRouter.delete("/blog/:id", async (req, res, next) => {
  try { await BlogPost.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});
adminRouter.patch("/blog/:id/status", async (req, res, next) => {
  try {
    const status = z.object({ status: blogStatus }).parse(req.body).status;
    const post = await BlogPost.findByIdAndUpdate(idParam.parse(req.params.id), { status, publishedAt: status === "published" ? new Date() : undefined }, { new: true }).lean();
    if (!post) { res.status(404).json({ detail: "Blog post not found." }); return; }
    res.json(idOf(post));
  } catch (error) { next(error); }
});
adminRouter.patch("/blog/:id/featured", async (req, res, next) => {
  try {
    const featured = z.object({ featured: z.boolean() }).parse(req.body).featured;
    const post = await BlogPost.findByIdAndUpdate(idParam.parse(req.params.id), { featured }, { new: true }).lean();
    if (!post) { res.status(404).json({ detail: "Blog post not found." }); return; }
    res.json(idOf(post));
  } catch (error) { next(error); }
});

adminRouter.get("/pages", async (_req, res, next) => {
  try {
    const pages = await PageContent.find().sort({ updatedAt: -1 }).lean();
    res.json(pages.map((page) => ({ ...page, id: String(page._id) })));
  } catch (error) { next(error); }
});

adminRouter.post("/pages", async (req, res, next) => {
  try {
    const payload = pageInput(pageSchema.parse(req.body));
    const page = await PageContent.create(payload);
    res.status(201).json({ ...page.toObject(), id: String(page._id) });
  } catch (error) { next(error); }
});

adminRouter.put("/pages/:id", async (req, res, next) => {
  try {
    const payload = pageInput(pageSchema.parse(req.body));
    const page = await PageContent.findByIdAndUpdate(idParam.parse(req.params.id), payload, { new: true, runValidators: true }).lean();
    if (!page) { res.status(404).json({ detail: "Page not found." }); return; }
    res.json({ ...page, id: String(page._id) });
  } catch (error) { next(error); }
});

adminRouter.delete("/pages/:id", async (req, res, next) => {
  try { await PageContent.findByIdAndDelete(idParam.parse(req.params.id)); res.json({ ok: true }); } catch (error) { next(error); }
});

adminRouter.patch("/pages/:id/status", async (req, res, next) => {
  try {
    const status = z.object({ status: z.enum(["draft", "published"]) }).parse(req.body).status;
    const page = await PageContent.findByIdAndUpdate(idParam.parse(req.params.id), { status, publishedAt: status === "published" ? new Date() : undefined }, { new: true }).lean();
    if (!page) { res.status(404).json({ detail: "Page not found." }); return; }
    res.json({ ...page, id: String(page._id) });
  } catch (error) { next(error); }
});

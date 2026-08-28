import { Router, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Lead, type LeadStatus } from "../models/Lead.js";
import { Project } from "../models/Project.js";
import { Testimonial } from "../models/Testimonial.js";
import { SiteContent } from "../models/SiteContent.js";
import { Review } from "../models/Review.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { createNotification } from "../services/notifications.js";
import { requireAdmin } from "../middleware/auth.js";

const idParam = z.string().refine(isValidObjectId, "Invalid record id");
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

import { Router } from "express";
import { z } from "zod";
import { Lead } from "../models/Lead.js";
import { Project } from "../models/Project.js";
import { Testimonial } from "../models/Testimonial.js";
import { SiteContent } from "../models/SiteContent.js";
import { requireUser } from "../middleware/auth.js";
import { Review } from "../models/Review.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { createNotification, sendExternalAlerts } from "../services/notifications.js";
import { env } from "../config/env.js";

export const publicRouter = Router();

publicRouter.get("/content", async (_req, res, next) => {
  try { res.json(await SiteContent.findOne({ key: "main" }).select("-key").lean() ?? { announcement: "", hero_title: "", hero_description: "", services: [] }); } catch (error) { next(error); }
});

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(30).optional(),
  business_name: z.string().trim().max(120).optional(),
  service: z.string().trim().max(120).optional(),
  budget: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(3000),
});

publicRouter.get("/portfolio", async (_req, res, next) => {
  try {
    const projects = await Project.find().sort({ featured: -1, createdAt: -1 }).lean();
    res.json(projects.map((project) => ({ ...project, id: project._id.toString() })));
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.json(testimonials.map((testimonial) => ({ ...testimonial, id: testimonial._id.toString() })));
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/reviews", async (_req, res, next) => {
  try { const reviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 }).lean(); res.json(reviews.map((review) => ({ ...review, id: String(review._id), quote: review.body, role: "Client", company: "Adkinest client" }))); } catch (error) { next(error); }
});

publicRouter.post("/leads", requireUser, async (req, res, next) => {
  try {
    const input = leadSchema.parse(req.body);
    const lead = await Lead.create({ ...input, name: req.user!.name, email: req.user!.email, userId: req.user!.id });
    const conversation = await Conversation.findOneAndUpdate({ userId: req.user!.id }, { $setOnInsert: { userId: req.user!.id }, status: "open", lastMessageAt: new Date() }, { new: true, upsert: true });
    await Message.create({ conversationId: conversation._id, senderId: req.user!.id, senderRole: "user", body: input.message });
    await createNotification({ recipientId: "admin", recipientRole: "admin", type: "lead", title: "New consultation request", body: `${req.user!.name} sent a new enquiry.`, link: "/admin" });
    await sendExternalAlerts({ email: env.ADMIN_EMAIL, subject: "New Adkinest consultation request", body: `${req.user!.name} sent a new enquiry from ${req.user!.email}.` });
    res.status(201).json({ ...lead.toObject(), id: lead.id });
  } catch (error) {
    next(error);
  }
});

import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAdmin, requireUser } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

const idParam = z.string().refine(isValidObjectId, "Invalid notification id");
export const notificationRouter = Router();

notificationRouter.get("/me", requireUser, async (req, res, next) => {
  try { const items = await Notification.find({ recipientId: req.user!.id, recipientRole: "user" }).sort({ createdAt: -1 }).limit(100).lean(); res.json(items.map((item) => ({ ...item, id: String(item._id) }))); } catch (error) { next(error); }
});
notificationRouter.put("/me/:id/read", requireUser, async (req, res, next) => {
  try { const item = await Notification.findOneAndUpdate({ _id: idParam.parse(req.params.id), recipientId: req.user!.id }, { readAt: new Date() }, { new: true }).lean(); if (!item) { res.status(404).json({ detail: "Notification not found." }); return; } res.json({ ...item, id: String(item._id) }); } catch (error) { next(error); }
});
notificationRouter.get("/admin", requireAdmin, async (_req, res, next) => {
  try { const items = await Notification.find({ recipientId: "admin", recipientRole: "admin" }).sort({ createdAt: -1 }).limit(100).lean(); res.json(items.map((item) => ({ ...item, id: String(item._id) }))); } catch (error) { next(error); }
});
notificationRouter.put("/admin/:id/read", requireAdmin, async (req, res, next) => {
  try { const item = await Notification.findOneAndUpdate({ _id: idParam.parse(req.params.id), recipientId: "admin" }, { readAt: new Date() }, { new: true }).lean(); if (!item) { res.status(404).json({ detail: "Notification not found." }); return; } res.json({ ...item, id: String(item._id) }); } catch (error) { next(error); }
});

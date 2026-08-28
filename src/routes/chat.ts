import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAdmin, requireUser } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { createNotification, sendExternalAlerts } from "../services/notifications.js";

const bodySchema = z.object({ body: z.string().trim().min(1).max(4000) });
const idSchema = z.string().refine(isValidObjectId, "Invalid conversation id");
export const chatRouter = Router();

const messagesFor = (conversationId: string) => Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
const outputMessages = (messages: Array<Record<string, unknown>>) => messages.map((message) => ({ ...message, id: String(message._id), conversation_id: String(message.conversationId) }));

chatRouter.get("/me", requireUser, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ userId: req.user!.id }).lean();
    res.json(conversation ? { ...conversation, id: String(conversation._id), messages: outputMessages(await messagesFor(String(conversation._id))) } : { conversation: null, messages: [] });
  } catch (error) { next(error); }
});
chatRouter.post("/me/messages", requireUser, async (req, res, next) => {
  try {
    const input = bodySchema.parse(req.body);
    const conversation = await Conversation.findOneAndUpdate({ userId: req.user!.id }, { $setOnInsert: { userId: req.user!.id }, status: "open", lastMessageAt: new Date() }, { new: true, upsert: true });
    const message = await Message.create({ conversationId: conversation._id, senderId: req.user!.id, senderRole: "user", body: input.body });
    await Conversation.updateOne({ _id: conversation._id }, { lastMessageAt: message.createdAt });
    await createNotification({ recipientId: "admin", recipientRole: "admin", type: "message", title: "New client message", body: `${req.user!.name} sent a new chat message.`, link: "/admin" });
    await sendExternalAlerts({ email: "", subject: "New Adkinest client message", body: `${req.user!.name} sent a new chat message.` });
    res.status(201).json({ ...message.toObject(), id: String(message._id), conversation_id: String(conversation._id) });
  } catch (error) { next(error); }
});

chatRouter.get("/conversations", requireAdmin, async (_req, res, next) => {
  try {
    const conversations = await Conversation.find().sort({ lastMessageAt: -1 }).populate("userId", "name email").lean();
    res.json(conversations.map((conversation) => ({ ...conversation, id: String(conversation._id), user: conversation.userId })));
  } catch (error) { next(error); }
});
chatRouter.get("/conversations/:id/messages", requireAdmin, async (req, res, next) => {
  try { const id = idSchema.parse(req.params.id); res.json(outputMessages(await messagesFor(id))); } catch (error) { next(error); }
});
chatRouter.post("/conversations/:id/messages", requireAdmin, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id); const input = bodySchema.parse(req.body);
    const conversation = await Conversation.findByIdAndUpdate(id, { status: "open", lastMessageAt: new Date() }, { new: true });
    if (!conversation) { res.status(404).json({ detail: "Conversation not found." }); return; }
    const message = await Message.create({ conversationId: id, senderId: "admin", senderRole: "admin", body: input.body });
    const client = await User.findById(conversation.userId).lean();
    if (client) {
      await createNotification({ recipientId: String(client._id), recipientRole: "user", type: "message", title: "New message from Adkinest", body: "The Adkinest team replied to your conversation.", link: "/dashboard" });
      await sendExternalAlerts({ email: client.email, subject: "New message from Adkinest", body: input.body });
    }
    res.status(201).json({ ...message.toObject(), id: String(message._id), conversation_id: id });
  } catch (error) { next(error); }
});
chatRouter.put("/conversations/:id", requireAdmin, async (req, res, next) => {
  try { const conversation = await Conversation.findByIdAndUpdate(idSchema.parse(req.params.id), { status: z.object({ status: z.enum(["open", "closed"]) }).parse(req.body).status }, { new: true }).lean(); if (!conversation) { res.status(404).json({ detail: "Conversation not found." }); return; } res.json({ ...conversation, id: String(conversation._id) }); } catch (error) { next(error); }
});

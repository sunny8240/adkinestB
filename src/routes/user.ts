import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { Lead } from "../models/Lead.js";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { ServiceRequest } from "../models/ServiceRequest.js";
import { createNotification, sendExternalAlerts } from "../services/notifications.js";
import { requireUser } from "../middleware/auth.js";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(200) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) });
const forgotPasswordSchema = z.object({ email: z.email() });
const resetPasswordSchema = z.object({ email: z.email(), token: z.string().min(32).max(256), password: z.string().min(8).max(200) });
export const userRouter = Router();

const tokenFor = (user: { id: string; email: string }) => jwt.sign({ email: user.email, role: "user" }, env.JWT_SECRET, { subject: user.id, expiresIn: "7d" });
const publicUser = (user: { _id: unknown; name: string; email: string }) => ({ id: String(user._id), name: user.name, email: user.email });
const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

userRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const exists = await User.exists({ email });
    if (exists) { res.status(409).json({ detail: "An account with this email already exists." }); return; }
    const user = await User.create({ name: input.name, email, passwordHash: await bcrypt.hash(input.password, 12) });
    res.status(201).json({ access_token: tokenFor({ id: String(user._id), email }), user: publicUser(user) });
  } catch (error) { next(error); }
});

userRouter.post("/login", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) { res.status(401).json({ detail: "Invalid email or password." }); return; }
    res.json({ access_token: tokenFor({ id: String(user._id), email: user.email }), user: publicUser(user) });
  } catch (error) { next(error); }
});

userRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const token = randomBytes(32).toString("base64url");
      user.passwordResetTokenHash = hashResetToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(token)}`;
      await sendExternalAlerts({
        email: normalizedEmail,
        subject: "Reset your Adkinest password",
        body: `Use this secure link to reset your Adkinest client password. It expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      });
    }

    res.json({ detail: "If that account exists, a password reset link has been sent." });
  } catch (error) { next(error); }
});

userRouter.post("/reset-password", async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash +passwordResetTokenHash +passwordResetExpiresAt");
    const tokenHash = hashResetToken(input.token);

    if (!user || !user.passwordResetTokenHash || user.passwordResetTokenHash !== tokenHash || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
      res.status(400).json({ detail: "This reset link is invalid or has expired." });
      return;
    }

    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ detail: "Password updated. You can sign in now." });
  } catch (error) { next(error); }
});

userRouter.get("/me", requireUser, async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) { res.status(404).json({ detail: "User not found." }); return; }
    res.json(publicUser(user));
  } catch (error) { next(error); }
});

userRouter.get("/leads", requireUser, async (req, res, next) => {
  try {
    const leads = await Lead.find({ $or: [{ userId: req.user!.id }, { email: req.user!.email }] }).sort({ createdAt: -1 }).lean();
    res.json(leads.map((lead) => ({ ...lead, id: String(lead._id) })));
  } catch (error) { next(error); }
});

userRouter.post("/reviews", requireUser, async (req, res, next) => {
  try {
    const input = z.object({ rating: z.number().int().min(1).max(5), body: z.string().trim().min(10).max(2000) }).parse(req.body);
    const review = await Review.create({ ...input, userId: req.user!.id, name: req.user!.name, status: "pending" });
    res.status(201).json({ ...review.toObject(), id: String(review._id) });
  } catch (error) { next(error); }
});

userRouter.get("/services", requireUser, async (req, res, next) => {
  try { const requests = await ServiceRequest.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean(); res.json(requests.map((request) => ({ ...request, id: String(request._id) }))); } catch (error) { next(error); }
});
userRouter.post("/services", requireUser, async (req, res, next) => {
  try { const input = z.object({ service: z.string().trim().min(2).max(120), details: z.string().trim().min(10).max(2000) }).parse(req.body); const request = await ServiceRequest.create({ ...input, userId: req.user!.id }); await createNotification({ recipientId: "admin", recipientRole: "admin", type: "system", title: "New service request", body: `${req.user!.name} requested ${input.service}.`, link: "/admin" }); res.status(201).json({ ...request.toObject(), id: String(request._id) }); } catch (error) { next(error); }
});
userRouter.delete("/services/:id", requireUser, async (req, res, next) => {
  try { const request = await ServiceRequest.findOneAndUpdate({ _id: z.string().refine(isValidObjectId).parse(req.params.id), userId: req.user!.id, status: "requested" }, { status: "cancelled" }, { new: true }).lean(); if (!request) { res.status(404).json({ detail: "Only open requests can be cancelled." }); return; } res.json({ ...request, id: String(request._id) }); } catch (error) { next(error); }
});

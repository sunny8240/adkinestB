import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";

const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });
export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const valid = email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() && await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (!valid) {
      res.status(401).json({ detail: "Invalid email or password." });
      return;
    }
    const token = jwt.sign({ email: env.ADMIN_EMAIL }, env.JWT_SECRET, { subject: "admin", expiresIn: "2h" });
    res.json({ access_token: token, user: { id: "admin", email: env.ADMIN_EMAIL, name: "Admin" } });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

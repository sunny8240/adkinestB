import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ detail: "Please sign in." });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== "object" || payload === null || !payload.sub) {
      res.status(401).json({ detail: "Invalid authentication token." });
      return;
    }
    req.user = { id: String(payload.sub), email: String(payload.email), name: payload.role === "user" ? "User" : "Admin", role: payload.role === "user" ? "user" : "admin" };
    next();
  } catch {
    res.status(401).json({ detail: "Invalid or expired authentication token." });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") { res.status(403).json({ detail: "Admin access required." }); return; }
    next();
  });
};

export const requireUser: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== "user") { res.status(403).json({ detail: "User access required." }); return; }
    next();
  });
};

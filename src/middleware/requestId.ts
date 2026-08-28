import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const id = req.header("X-Request-Id")?.slice(0, 100) || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

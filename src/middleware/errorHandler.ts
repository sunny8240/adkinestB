import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: error.flatten().fieldErrors });
    return;
  }

  const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Internal server error" : String(error?.message ?? "Request failed");

  console.error({ requestId: req.requestId, error }, "Request failed");
  res.status(statusCode).json({ error: message });
};

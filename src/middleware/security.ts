import cors from "cors";
import * as rateLimitModule from "express-rate-limit";
import * as helmetModule from "helmet";

import type { Express, RequestHandler } from "express";

import { env } from "../config/env.js";

const helmet = helmetModule.default;
const rateLimit = rateLimitModule.default;

export function applySecurity(app: Express): void {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
      ],
      credentials: false,
    })
  );

  app.use(expressJsonLimit);

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      skip: (req) =>
        req.method === "GET" ||
        req.method === "HEAD" ||
        req.method === "OPTIONS",
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Too many requests. Please try again later.",
      },
    })
  );
}

const expressJsonLimit: RequestHandler = (req, res, next) => {
  if (
    req.is("application/json") &&
    Number(req.headers["content-length"] ?? 0) > 100_000
  ) {
    res.status(413).json({
      error: "Request body is too large",
    });
    return;
  }

  next();
};
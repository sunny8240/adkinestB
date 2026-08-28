import express from "express";
import { requestId } from "./middleware/requestId.js";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { contactRouter } from "./routes/contact.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/public.js";
import { userRouter } from "./routes/user.js";
import { chatRouter } from "./routes/chat.js";
import { notificationRouter } from "./routes/notifications.js";

export function createApp(): express.Express {
  const app = express();
  applySecurity(app);
  app.use(requestId);
  app.use(express.json({ limit: "100kb", strict: true }));
  app.use("/api/health", healthRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/user", userRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

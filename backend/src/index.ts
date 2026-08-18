import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { redisClient } from "./config/redis.js";
import { setupEmailWorker } from "./queue/email.worker.js";
import { AuthController } from "./controllers/auth.controller.js";
import { EmailController } from "./controllers/email.controller.js";
import { SenderController } from "./controllers/sender.controller.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

// Middlewares
app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "reachinbox-scheduler-backend",
    workerConcurrency: env.WORKER_CONCURRENCY,
    minDelaySeconds: env.MIN_DELAY_BETWEEN_EMAILS_SECONDS,
    defaultHourlyLimit: env.DEFAULT_HOURLY_LIMIT,
  });
});

// Auth Routes (Google OAuth Only)
app.get("/api/auth/google", AuthController.getGoogleUrl);
app.get("/api/auth/google/callback", AuthController.handleGoogleCallback);
app.get("/api/auth/me", requireAuth, AuthController.getMe);
app.post("/api/auth/logout", AuthController.logout);

// Email & Scheduling Routes
app.post("/api/emails/parse-csv", requireAuth, upload.single("file"), EmailController.parseCsv);
app.post("/api/emails/schedule", requireAuth, upload.single("file"), EmailController.schedule);
app.get("/api/emails/scheduled", requireAuth, EmailController.getScheduled);
app.get("/api/emails/sent", requireAuth, EmailController.getSent);
app.delete("/api/emails/:id", requireAuth, EmailController.cancel);
app.get("/api/emails/stats", requireAuth, EmailController.getStats);

// Sender Routes
app.get("/api/senders", requireAuth, SenderController.getSenders);
app.post("/api/senders", requireAuth, SenderController.createSender);
app.post("/api/senders/generate-ethereal", requireAuth, SenderController.generateEtherealSender);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Unhandled Error]:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Initialize BullMQ Worker
const emailWorker = setupEmailWorker();

// Start Server
const server = app.listen(env.PORT, () => {
  console.log(`
=====================================================
🚀 ReachInbox Email Scheduler Backend is Live!
📡 Port: ${env.PORT}
🌍 Env:  ${env.NODE_ENV}
⚡ Concurrency: ${env.WORKER_CONCURRENCY} workers
⏱  Min Delay: ${env.MIN_DELAY_BETWEEN_EMAILS_SECONDS}s between emails
📊 Hourly Limit: ${env.DEFAULT_HOURLY_LIMIT} emails/hr/sender
🔗 URL:  http://localhost:${env.PORT}
=====================================================
  `);
});

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Closing server and background workers...`);
  try {
    server.close(() => {
      console.log("[Shutdown] HTTP server closed.");
    });
    await emailWorker.close();
    console.log("[Shutdown] BullMQ email worker closed.");
    await redisClient.quit();
    console.log("[Shutdown] Redis connection closed.");
    await prisma.$disconnect();
    console.log("[Shutdown] PostgreSQL Prisma connection closed.");
    process.exit(0);
  } catch (err: any) {
    console.error("[Shutdown] Error during shutdown:", err.message);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
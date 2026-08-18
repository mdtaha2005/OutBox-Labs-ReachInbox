import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { prisma } from "../config/db.js";
import { createTransporter, getPreviewUrl } from "../config/mailer.js";
import { env } from "../config/env.js";
import { EMAIL_QUEUE_NAME, addEmailJob } from "./email.queue.js";
import { EmailJobPayload } from "../types/index.js";
import { RateLimiterService } from "../services/rate-limiter.service.js";

export function setupEmailWorker(): Worker<EmailJobPayload> {
  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { emailRecordId, senderAccountId, recipientEmail, subject, body, delaySeconds, hourlyLimit } =
        job.data;

      console.log(`[Worker] Processing email job ${job.id} for recipient: ${recipientEmail}`);

      // 1. Fetch Email Record & Sender from DB
      const emailRecord = await prisma.emailRecord.findUnique({
        where: { id: emailRecordId },
        include: { senderAccount: true },
      });

      if (!emailRecord) {
        console.warn(`[Worker] Email record ${emailRecordId} not found in DB. Skipping.`);
        return { status: "not_found" };
      }

      // Idempotency: Skip if already sent or cancelled
      if (emailRecord.status === "SENT" || emailRecord.status === "CANCELLED") {
        console.log(`[Worker] Email record ${emailRecordId} is already ${emailRecord.status}. Skipping.`);
        return { status: "already_completed" };
      }

      // 2. Check Sliding-Window Hourly Rate Limit
      const rateLimitCheck = await RateLimiterService.checkAndRecordSend(
        senderAccountId,
        hourlyLimit || env.DEFAULT_HOURLY_LIMIT
      );

      if (!rateLimitCheck.allowed) {
        const rescheduleDelayMs = rateLimitCheck.waitMs;
        const newScheduledDate = new Date(Date.now() + rescheduleDelayMs);

        console.log(
          `[Worker] Hourly limit reached for sender ${senderAccountId}. Rescheduling job ${job.id} in ${Math.round(
            rescheduleDelayMs / 1000
          )}s (to ${newScheduledDate.toISOString()})`
        );

        // Update DB record status to RESCHEDULED
        await prisma.emailRecord.update({
          where: { id: emailRecordId },
          data: {
            status: "RESCHEDULED",
            actualScheduledAt: newScheduledDate,
          },
        });

        // Re-enqueue job into BullMQ
        await addEmailJob(job.data, rescheduleDelayMs);
        return { status: "rescheduled", waitMs: rescheduleDelayMs };
      }

      // 3. Enforce Per-Sender Minimum Delay
      await RateLimiterService.enforceSenderDelay(
        senderAccountId,
        delaySeconds || env.MIN_DELAY_BETWEEN_EMAILS_SECONDS
      );

      // 4. Mark DB Status as PROCESSING
      await prisma.emailRecord.update({
        where: { id: emailRecordId },
        data: { status: "PROCESSING" },
      });

      try {
        // 5. Build Nodemailer transporter
        const sender = emailRecord.senderAccount;
        const transporter = await createTransporter(
          sender
            ? {
                host: sender.smtpHost,
                port: sender.smtpPort,
                user: sender.smtpUser,
                pass: sender.smtpPass,
              }
            : undefined
        );

        const fromAddress = sender
          ? `"${sender.displayName || sender.email}" <${sender.email}>`
          : `"ReachInbox Outreach" <outreach@ethereal.email>`;

        // 6. Send Email via SMTP
        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipientEmail,
          subject: subject,
          text: body,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br/>")}</div>`,
        });

        const previewUrl = getPreviewUrl(info);
        console.log(`[Worker] Sent email to ${recipientEmail}. MessageId: ${info.messageId}`);
        if (previewUrl) {
          console.log(`[Worker] Preview URL: ${previewUrl}`);
        }

        // 7. Update Record as SENT
        await prisma.emailRecord.update({
          where: { id: emailRecordId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            etherealMessageId: info.messageId,
            etherealPreviewUrl: previewUrl,
          },
        });

        return {
          status: "sent",
          messageId: info.messageId,
          previewUrl,
        };
      } catch (err: any) {
        console.error(`[Worker] Error sending email ${emailRecordId} to ${recipientEmail}:`, err.message);

        const updatedRecord = await prisma.emailRecord.update({
          where: { id: emailRecordId },
          data: {
            retryCount: { increment: 1 },
            errorMessage: err.message,
            status: (job.attemptsMade >= (job.opts.attempts || 3) - 1) ? "FAILED" : "QUEUED",
          },
        });

        throw err; // Re-throw so BullMQ triggers retry policy if attempts remaining
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on("error", (err) => {
    console.error(`[Worker] Internal worker error:`, err.message);
  });

  return worker;
}

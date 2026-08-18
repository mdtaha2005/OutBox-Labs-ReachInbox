import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { calculateScheduleTimes } from "../utils/scheduler.js";
import { addEmailJobsBulk, cancelEmailJob } from "../queue/email.queue.js";
import { EmailJobPayload, ScheduleCampaignInput } from "../types/index.js";
import { EmailStatus } from "@prisma/client";

export class EmailService {
  /**
   * Schedules a campaign with lead emails across calculated staggered delay & hourly buckets.
   */
  static async scheduleCampaign(input: ScheduleCampaignInput) {
    const {
      userId,
      senderAccountId,
      subject,
      body,
      leads,
      scheduledStartTime,
      delaySeconds = env.MIN_DELAY_BETWEEN_EMAILS_SECONDS,
      hourlyLimit = env.DEFAULT_HOURLY_LIMIT,
    } = input;

    if (!leads || leads.length === 0) {
      throw new Error("Cannot schedule a campaign with 0 leads.");
    }

    // 1. Resolve Sender Account
    let sender = senderAccountId
      ? await prisma.senderAccount.findFirst({
          where: { id: senderAccountId, userId },
        })
      : await prisma.senderAccount.findFirst({
          where: { userId, isDefault: true },
        });

    if (!sender) {
      sender = await prisma.senderAccount.findFirst({
        where: { userId },
      });
    }

    if (!sender) {
      throw new Error("No sender account found for user. Please set up a sender first.");
    }

    // 2. Create Campaign in DB
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        senderAccountId: sender.id,
        subject,
        body,
        totalLeads: leads.length,
        delaySeconds,
        hourlyLimit,
        scheduledStartTime,
      },
    });

    // 3. Compute Schedule Timestamps for every lead
    const scheduleDates = calculateScheduleTimes(
      leads.length,
      scheduledStartTime,
      delaySeconds,
      hourlyLimit
    );

    // 4. Create Email Records in DB
    const emailRecordsData = leads.map((recipientEmail, index) => {
      const scheduledDate = scheduleDates[index];
      return {
        campaignId: campaign.id,
        userId,
        senderAccountId: sender.id,
        recipientEmail,
        subject,
        body,
        scheduledAt: scheduledDate,
        actualScheduledAt: scheduledDate,
        status: EmailStatus.QUEUED,
      };
    });

    // Use transaction or create in batch
    await prisma.emailRecord.createMany({
      data: emailRecordsData,
    });

    // Fetch the created records with IDs to construct BullMQ job payload
    const createdRecords = await prisma.emailRecord.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: "asc" },
    });

    // 5. Enqueue Jobs in BullMQ with rollback error handling
    const nowMs = Date.now();
    const queueItems = createdRecords.map((record) => {
      const targetTimeMs = record.scheduledAt.getTime();
      const delayMs = Math.max(targetTimeMs - nowMs, 0);

      const payload: EmailJobPayload = {
        emailRecordId: record.id,
        campaignId: campaign.id,
        userId,
        senderAccountId: sender.id,
        recipientEmail: record.recipientEmail,
        subject: record.subject,
        body: record.body,
        delaySeconds,
        hourlyLimit,
      };

      return { payload, delayMs };
    });

    try {
      // Bulk enqueue into Redis
      const jobIds = await addEmailJobsBulk(queueItems);

      // Update records with bullMqJobId
      for (let i = 0; i < createdRecords.length; i++) {
        const record = createdRecords[i];
        const jobId = jobIds[i] || `job_${record.id}`;
        await prisma.emailRecord.update({
          where: { id: record.id },
          data: { bullMqJobId: jobId },
        });
      }
    } catch (queueErr: any) {
      console.error("[EmailService] Failed to enqueue BullMQ jobs, cleaning up DB records:", queueErr.message);
      // Mark records as failed to maintain DB consistency
      await prisma.emailRecord.updateMany({
        where: { campaignId: campaign.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: `Redis Queue Enqueue Error: ${queueErr.message}`,
        },
      });
      throw new Error(`Failed to enqueue jobs to Redis: ${queueErr.message}`);
    }

    return {
      campaignId: campaign.id,
      totalScheduled: leads.length,
      firstScheduledAt: scheduleDates[0],
      lastScheduledAt: scheduleDates[scheduleDates.length - 1],
      senderEmail: sender.email,
    };
  }

  /**
   * Retrieves paginated list of scheduled & queued emails.
   */
  static async getScheduledEmails(
    userId: string,
    page = 1,
    limit = 10,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      userId,
      status: {
        in: [EmailStatus.QUEUED, EmailStatus.PROCESSING, EmailStatus.RESCHEDULED, EmailStatus.PENDING],
      },
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        include: {
          senderAccount: {
            select: { email: true, displayName: true },
          },
        },
        orderBy: { actualScheduledAt: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves paginated list of sent & failed emails.
   */
  static async getSentEmails(
    userId: string,
    page = 1,
    limit = 10,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      userId,
      status: {
        in: [EmailStatus.SENT, EmailStatus.FAILED],
      },
    };

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        include: {
          senderAccount: {
            select: { email: true, displayName: true },
          },
        },
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancels a scheduled email and removes it from the BullMQ Redis queue.
   */
  static async cancelEmail(userId: string, emailRecordId: string) {
    const record = await prisma.emailRecord.findFirst({
      where: { id: emailRecordId, userId },
    });

    if (!record) {
      throw new Error("Email record not found");
    }

    if (record.status === EmailStatus.SENT) {
      throw new Error("Cannot cancel an email that has already been sent.");
    }

    if (record.bullMqJobId) {
      await cancelEmailJob(record.bullMqJobId);
    }

    await prisma.emailRecord.update({
      where: { id: emailRecordId },
      data: { status: EmailStatus.CANCELLED },
    });

    return { success: true, id: emailRecordId };
  }

  /**
   * Overview metrics for dashboard cards and tab counters.
   */
  static async getStats(userId: string) {
    const [scheduledCount, sentCount, failedCount, totalCampaigns] = await Promise.all([
      prisma.emailRecord.count({
        where: {
          userId,
          status: { in: [EmailStatus.QUEUED, EmailStatus.PROCESSING, EmailStatus.RESCHEDULED] },
        },
      }),
      prisma.emailRecord.count({
        where: {
          userId,
          status: EmailStatus.SENT,
        },
      }),
      prisma.emailRecord.count({
        where: {
          userId,
          status: EmailStatus.FAILED,
        },
      }),
      prisma.campaign.count({
        where: { userId },
      }),
    ]);

    return {
      scheduledCount,
      sentCount,
      failedCount,
      totalCampaigns,
    };
  }
}

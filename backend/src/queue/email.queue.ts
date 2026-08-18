import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { EmailJobPayload } from "../types/index.js";

export const EMAIL_QUEUE_NAME = "email-delivery-queue";

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
      age: 7 * 24 * 3600,
    },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

export async function addEmailJob(
  payload: EmailJobPayload,
  delayMs: number
): Promise<string> {
  const jobId = `job_${payload.emailRecordId}`;
  const job = await emailQueue.add("send-email", payload, {
    jobId,
    delay: Math.max(delayMs, 0),
  });
  return job.id || jobId;
}

export async function addEmailJobsBulk(
  items: Array<{ payload: EmailJobPayload; delayMs: number }>
): Promise<string[]> {
  const jobsData = items.map((item) => ({
    name: "send-email",
    data: item.payload,
    opts: {
      jobId: `job_${item.payload.emailRecordId}`,
      delay: Math.max(item.delayMs, 0),
    },
  }));

  const jobs = await emailQueue.addBulk(jobsData);
  return jobs.map((j) => j.id || "");
}

export async function cancelEmailJob(jobId: string): Promise<boolean> {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

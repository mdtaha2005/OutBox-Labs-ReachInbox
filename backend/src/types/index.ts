import { EmailStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface EmailJobPayload {
  emailRecordId: string;
  campaignId: string;
  userId: string;
  senderAccountId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface ScheduleCampaignInput {
  userId: string;
  senderAccountId?: string;
  subject: string;
  body: string;
  leads: string[];
  scheduledStartTime: Date;
  delaySeconds?: number;
  hourlyLimit?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  waitMs: number;
}

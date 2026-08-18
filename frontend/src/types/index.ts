export type EmailStatus =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RESCHEDULED"
  | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface SenderAccount {
  id: string;
  email: string;
  displayName?: string | null;
  smtpHost: string;
  smtpPort: number;
  isDefault: boolean;
  hourlyLimit: number;
}

export interface EmailRecord {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  actualScheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  senderAccount?: {
    email: string;
    displayName?: string | null;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  totalCampaigns: number;
}
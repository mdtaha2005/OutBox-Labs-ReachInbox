import axios from "axios";
import { User, SenderAccount, EmailRecord, PaginatedResponse, DashboardStats } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Intercept 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const authApi = {
  getMe: async (): Promise<User> => {
    const res = await api.get<{ user: User }>("/auth/me");
    return res.data.user;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

export const emailApi = {
  parseCsv: async (fileOrText: File | string) => {
    if (typeof fileOrText === "string") {
      const res = await api.post("/emails/parse-csv", { content: fileOrText });
      return res.data;
    } else {
      const formData = new FormData();
      formData.append("file", fileOrText);
      const res = await api.post("/emails/parse-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    }
  },

  schedule: async (data: {
    senderAccountId?: string;
    subject: string;
    body: string;
    leads: string[];
    scheduledStartTime: string;
    delaySeconds: number;
    hourlyLimit: number;
  }) => {
    const res = await api.post("/emails/schedule", data);
    return res.data;
  },

  getScheduled: async (page = 1, limit = 10, search = ""): Promise<PaginatedResponse<EmailRecord>> => {
    const res = await api.get<PaginatedResponse<EmailRecord>>("/emails/scheduled", {
      params: { page, limit, search },
    });
    return res.data;
  },

  getSent: async (page = 1, limit = 10, search = ""): Promise<PaginatedResponse<EmailRecord>> => {
    const res = await api.get<PaginatedResponse<EmailRecord>>("/emails/sent", {
      params: { page, limit, search },
    });
    return res.data;
  },

  cancel: async (emailId: string) => {
    const res = await api.delete(`/emails/${emailId}`);
    return res.data;
  },

  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>("/emails/stats");
    return res.data;
  },
};

export const senderApi = {
  getSenders: async (): Promise<SenderAccount[]> => {
    const res = await api.get<{ senders: SenderAccount[] }>("/senders");
    return res.data.senders;
  },
  generateEthereal: async (): Promise<SenderAccount> => {
    const res = await api.post<{ sender: SenderAccount }>("/senders/generate-ethereal");
    return res.data.sender;
  },
};
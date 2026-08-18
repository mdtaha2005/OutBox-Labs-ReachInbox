import { Request, Response } from "express";
import { EmailService } from "../services/email.service.js";
import { parseLeadsContent } from "../utils/csv-parser.js";
import { env } from "../config/env.js";

export class EmailController {
  /**
   * Parses an uploaded CSV or TXT lead file and returns valid lead counts & preview.
   */
  static async parseCsv(req: Request, res: Response): Promise<void> {
    try {
      let fileContent = "";

      if (req.file) {
        fileContent = req.file.buffer.toString("utf-8");
      } else if (req.body.content) {
        fileContent = req.body.content;
      } else {
        res.status(400).json({ error: "No file or text content provided" });
        return;
      }

      const parsed = parseLeadsContent(fileContent);
      res.json({
        totalDetected: parsed.totalCount,
        validCount: parsed.validLeads.length,
        invalidCount: parsed.invalidCount,
        sampleLeads: parsed.validLeads.slice(0, 5),
        validLeads: parsed.validLeads,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Schedules a campaign with subject, body, leads, and timing parameters.
   */
  static async schedule(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        senderAccountId,
        subject,
        body,
        leads: rawLeads,
        scheduledStartTime,
        delaySeconds,
        hourlyLimit,
      } = req.body;

      if (!subject || !body) {
        res.status(400).json({ error: "Subject and Body are required" });
        return;
      }

      let leads: string[] = [];

      if (Array.isArray(rawLeads)) {
        leads = rawLeads;
      } else if (req.file) {
        const parsed = parseLeadsContent(req.file.buffer.toString("utf-8"));
        leads = parsed.validLeads;
      } else if (typeof rawLeads === "string") {
        const parsed = parseLeadsContent(rawLeads);
        leads = parsed.validLeads;
      }

      if (leads.length === 0) {
        res.status(400).json({ error: "At least one valid recipient email address is required." });
        return;
      }

      const parsedStartTime = scheduledStartTime ? new Date(scheduledStartTime) : new Date();
      const parsedDelay = delaySeconds ? parseInt(delaySeconds, 10) : env.MIN_DELAY_BETWEEN_EMAILS_SECONDS;
      const parsedLimit = hourlyLimit ? parseInt(hourlyLimit, 10) : env.DEFAULT_HOURLY_LIMIT;

      const result = await EmailService.scheduleCampaign({
        userId,
        senderAccountId,
        subject,
        body,
        leads,
        scheduledStartTime: parsedStartTime,
        delaySeconds: parsedDelay,
        hourlyLimit: parsedLimit,
      });

      res.status(201).json({
        success: true,
        message: `Successfully scheduled ${result.totalScheduled} emails.`,
        campaign: result,
      });
    } catch (err: any) {
      console.error("[EmailController] Scheduling error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Retrieves paginated scheduled emails.
   */
  static async getScheduled(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string;

      const result = await EmailService.getScheduledEmails(userId, page, limit, search);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Retrieves paginated sent emails.
   */
  static async getSent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string;

      const result = await EmailService.getSentEmails(userId, page, limit, search);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Cancels a scheduled email.
   */
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const emailId = req.params.id;

      const result = await EmailService.cancelEmail(userId, emailId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Overall dashboard metrics and counters.
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await EmailService.getStats(userId);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
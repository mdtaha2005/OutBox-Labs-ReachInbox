import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { getOrCreateDefaultEtherealAccount } from "../config/mailer.js";
import { env } from "../config/env.js";

export class SenderController {
  static async getSenders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const senders = await prisma.senderAccount.findMany({
        where: { userId },
        orderBy: { isDefault: "desc" },
      });
      res.json({ senders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createSender(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { email, displayName, smtpHost, smtpPort, smtpUser, smtpPass, hourlyLimit } = req.body;

      if (!email || !smtpUser || !smtpPass) {
        res.status(400).json({ error: "Email, SMTP user, and SMTP password are required" });
        return;
      }

      const sender = await prisma.senderAccount.create({
        data: {
          userId,
          email,
          displayName,
          smtpHost: smtpHost || "smtp.ethereal.email",
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : 587,
          smtpUser,
          smtpPass,
          hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : env.DEFAULT_HOURLY_LIMIT,
        },
      });

      res.status(201).json({ sender });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async generateEtherealSender(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const ethereal = await getOrCreateDefaultEtherealAccount();

      const sender = await prisma.senderAccount.create({
        data: {
          userId,
          email: ethereal.user,
          displayName: `Ethereal Sender (${ethereal.user.split("@")[0]})`,
          smtpHost: "smtp.ethereal.email",
          smtpPort: 587,
          smtpUser: ethereal.user,
          smtpPass: ethereal.pass,
          hourlyLimit: env.DEFAULT_HOURLY_LIMIT,
        },
      });

      res.status(201).json({ sender });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
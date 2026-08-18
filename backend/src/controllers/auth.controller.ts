import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { env } from "../config/env.js";

export class AuthController {
  static async getGoogleUrl(req: Request, res: Response): Promise<void> {
    try {
      const url = AuthService.getGoogleAuthUrl();
      res.redirect(url);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string;
    if (!code) {
      res.redirect(`${env.FRONTEND_URL}/login?error=missing_code`);
      return;
    }

    try {
      const token = await AuthService.handleGoogleCallback(code);

      res.cookie("token", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${env.FRONTEND_URL}/dashboard?token=${token}`);
    } catch (err: any) {
      console.error("[Auth] Google callback error:", err.message);
      res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message)}`);
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ user: req.user });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("token", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ success: true, message: "Logged out successfully" });
  }
}
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AuthenticatedUser } from "../types/index.js";
import { getOrCreateDefaultEtherealAccount } from "../config/mailer.js";

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export class AuthService {
  static getGoogleAuthUrl(): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error(
        "GOOGLE_CLIENT_ID is not configured in environment. Please add Google OAuth credentials in .env"
      );
    }
    return googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "consent",
    });
  }

  static async handleGoogleCallback(code: string): Promise<string> {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error("No ID token returned from Google");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("Invalid user payload from Google token");
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const avatarUrl = payload.picture || null;

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatarUrl },
      create: {
        googleId,
        email,
        name,
        avatarUrl,
      },
    });

    // Ensure user has at least one default Ethereal sender account
    await this.ensureDefaultSenderAccount(user.id, user.name);

    return this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  static async ensureDefaultSenderAccount(userId: string, userName: string) {
    const existingSender = await prisma.senderAccount.findFirst({
      where: { userId },
    });

    if (!existingSender) {
      const ethereal = await getOrCreateDefaultEtherealAccount();
      await prisma.senderAccount.create({
        data: {
          userId,
          email: ethereal.user,
          displayName: `${userName} (Outreach)`,
          smtpHost: "smtp.ethereal.email",
          smtpPort: 587,
          smtpUser: ethereal.user,
          smtpPass: ethereal.pass,
          isDefault: true,
          hourlyLimit: env.DEFAULT_HOURLY_LIMIT,
        },
      });
    }
  }

  static generateToken(user: AuthenticatedUser): string {
    return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
  }

  static verifyToken(token: string): AuthenticatedUser | null {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    } catch {
      return null;
    }
  }
}
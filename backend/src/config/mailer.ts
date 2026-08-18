import nodemailer, { Transporter } from "nodemailer";
import { env } from "./env.js";

let defaultTransporter: Transporter | null = null;
let defaultAccount: { user: string; pass: string } | null = null;

export async function getOrCreateDefaultEtherealAccount() {
  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    defaultAccount = { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS };
    return defaultAccount;
  }

  if (defaultAccount) {
    return defaultAccount;
  }

  console.log("[Mailer] Creating new test Ethereal account...");
  const testAccount = await nodemailer.createTestAccount();
  defaultAccount = {
    user: testAccount.user,
    pass: testAccount.pass,
  };
  console.log(`[Mailer] Test Ethereal account initialized: ${defaultAccount.user}`);
  return defaultAccount;
}

export async function createTransporter(smtpConfig?: {
  host: string;
  port: number;
  user: string;
  pass: string;
}): Promise<Transporter> {
  if (smtpConfig) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });
  }

  if (defaultTransporter) {
    return defaultTransporter;
  }

  const account = await getOrCreateDefaultEtherealAccount();
  defaultTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  return defaultTransporter;
}

export function getPreviewUrl(info: any): string | null {
  const url = nodemailer.getTestMessageUrl(info);
  return typeof url === "string" ? url : null;
}

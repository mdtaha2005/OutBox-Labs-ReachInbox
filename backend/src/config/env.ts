import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/reachinbox_db?schema=public"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379").transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(""),

  JWT_SECRET: z.string().default("super_secret_jwt_key_at_least_32_chars_long_12345"),
  COOKIE_SECRET: z.string().default("super_secret_cookie_parser_secret_key_12345"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:5000/api/auth/google/callback"),

  WORKER_CONCURRENCY: z.string().default("5").transform((val) => parseInt(val, 10)),
  MIN_DELAY_BETWEEN_EMAILS_SECONDS: z.string().default("2").transform((val) => parseInt(val, 10)),
  DEFAULT_HOURLY_LIMIT: z.string().default("200").transform((val) => parseInt(val, 10)),

  ETHEREAL_USER: z.string().optional().default(""),
  ETHEREAL_PASS: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);

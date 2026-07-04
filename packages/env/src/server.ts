import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z
      .string()
      .refine(
        (value) => value.startsWith("file:") || value.startsWith("postgresql://"),
        "DATABASE_URL must start with file: or postgresql://",
      ),
    DIRECT_URL: z.url().optional(),
    N8N_WEBHOOK_URL: z.url().optional(),
    APP_PUBLIC_URL: z.url().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

// Runtime env validation — throws at startup if required vars are missing
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_DEMO_MODE:        z.enum(["true", "false"]).optional().default("false"),
  NEXT_PUBLIC_SUPABASE_URL:    z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL:          z.string().url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
  // Service role only validated on server
  SUPABASE_SERVICE_ROLE_KEY:    z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN:       z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_DEMO_MODE:        process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    SUPABASE_SERVICE_ROLE_KEY:     process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN:        process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((e) => `  • ${String(e.path.join("."))}: ${e.message}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${msg}`);
  }

  return { ...parsed.data, demoMode: parsed.data.NEXT_PUBLIC_DEMO_MODE === "true" };
}

export const env = validateEnv();

/**
 * Centralised, validated environment access.
 *
 * Secrets are validated lazily (on first access) so that the marketing build
 * and unit tests can run without every integration configured. Format checks
 * catch the classic "wrong key in the wrong env" class of mistakes early.
 */
import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DIRECT_URL: z.string().url().startsWith("postgres").optional(),
  // Non-privileged runtime role (NOBYPASSRLS) so RLS is actually enforced.
  APP_DATABASE_URL: z.string().url().startsWith("postgres").optional(),

  CLERK_SECRET_KEY: z.string().optional().default(""),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional().default(""),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRICE_PRO: z.string().optional().default(""),

  ANTHROPIC_API_KEY: z.string().optional().default(""),
  CLASSIFY_MODEL: z.string().optional().default("claude-sonnet-4-6"),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
});

type ServerEnv = z.infer<typeof serverSchema>;
type PublicEnv = z.infer<typeof publicSchema>;

let _server: ServerEnv | null = null;

/** Server-only env. Never import this into a client component. */
export function serverEnv(): ServerEnv {
  if (_server) return _server;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Invalid server environment: " +
        JSON.stringify(parsed.error.flatten().fieldErrors),
    );
  }
  _server = parsed.data;
  return _server;
}

export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

/** Feature flags derived from which integrations are configured. */
export function features() {
  const e = serverEnv();
  return {
    billing: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_PRICE_PRO),
    ai: Boolean(e.ANTHROPIC_API_KEY),
    clerkWebhook: Boolean(e.CLERK_WEBHOOK_SIGNING_SECRET),
  };
}

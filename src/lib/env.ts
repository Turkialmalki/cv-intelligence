import "server-only";

/**
 * Server-side environment access.
 *
 * This module is marked `server-only`: importing it from a client component
 * is a build error. That is the guardrail that keeps the service role key out
 * of the browser bundle.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get resendFromEmail() {
    return optional("RESEND_FROM_EMAIL", "CV Intelligence <onboarding@resend.dev>");
  },
  get adminEmail() {
    return optional("ADMIN_EMAIL").toLowerCase().trim();
  },
  get aiProvider() {
    return optional("CV_AI_PROVIDER", "none").toLowerCase().trim();
  },
  get aiApiKey() {
    return optional("CV_AI_API_KEY");
  },
  get aiModel() {
    return optional("CV_AI_MODEL");
  },
  get fileRetentionMode(): "temporary" | "persistent" {
    return optional("CV_FILE_RETENTION_MODE", "temporary") === "persistent"
      ? "persistent"
      : "temporary";
  },
  get paymentProvider() {
    return optional("PAYMENT_PROVIDER", "manual").toLowerCase().trim();
  },
  get paymentWebhookSecret() {
    return optional("PAYMENT_WEBHOOK_SECRET");
  },
} as const;

/** True when Supabase is configured well enough to persist a report. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

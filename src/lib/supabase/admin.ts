import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, serverEnv } from "../env";

/**
 * Service-role Supabase client.
 *
 * This client bypasses RLS entirely, which is exactly why it must never be
 * constructed anywhere that could be bundled for the browser. The
 * `server-only` import above turns any such attempt into a build error.
 *
 * Every read of candidate data flows through here, behind a server route that
 * has already authorised the request — a valid report token, or an admin
 * session matching ADMIN_EMAIL.
 */

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  cached = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "cv-intelligence-server" },
    },
  });

  return cached;
}

/**
 * Returns the service client, or null when Supabase is not configured.
 *
 * Persistence is intentionally optional in local development: the analysis
 * itself never depends on the database, so a developer can run the scan flow
 * before creating a Supabase project. In production the analyze route
 * requires it, because a report that cannot be persisted cannot be revisited.
 */
export function tryGetServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return getServiceClient();
  } catch {
    return null;
  }
}

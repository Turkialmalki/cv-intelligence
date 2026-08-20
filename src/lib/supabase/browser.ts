"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Anon-key browser client, used only for admin sign-in.
 *
 * This client can do exactly two useful things: authenticate, and read the
 * current session. RLS denies it every table holding candidate data, so even
 * a signed-in admin cannot pull CVs through it — the dashboard's data comes
 * from the server, after the session's email has been checked.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(url, anonKey);
}

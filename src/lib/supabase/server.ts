import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { serverEnv } from "../env";

/**
 * Anon-key Supabase client bound to the request's cookies.
 *
 * This is the *user's* session, subject to RLS. It is used only to answer
 * "who is signed in?" for the admin dashboard — never to read candidate data,
 * which RLS denies to this role by design.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by the route handlers instead.
        }
      },
    },
  });
}

/**
 * Returns the signed-in user's email, or null.
 * Uses getUser() rather than getSession() so the token is verified with the
 * auth server instead of trusted from the cookie.
 */
export async function getSessionEmail(): Promise<string | null> {
  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    return data.user.email.toLowerCase();
  } catch {
    return null;
  }
}

/** Whether the current session belongs to the configured administrator. */
export async function isAdminSession(): Promise<boolean> {
  const adminEmail = serverEnv.adminEmail;
  if (!adminEmail) return false;
  const email = await getSessionEmail();
  return email !== null && email === adminEmail;
}

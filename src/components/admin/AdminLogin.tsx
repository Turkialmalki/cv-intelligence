"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/browser";

/**
 * Admin sign-in.
 *
 * Authentication is Supabase Auth; authorisation is the ADMIN_EMAIL check on
 * the server. Signing in successfully is not sufficient — a valid Supabase
 * user whose email does not match is shown the same denial as a stranger.
 */
export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Deliberately generic: distinguishing "no such user" from "wrong
        // password" hands an attacker a user-enumeration oracle.
        setError("Sign-in failed. Check your email and password.");
        setBusy(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Sign-in is unavailable. Check the Supabase configuration.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-900 text-white">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Admin access</h1>
          <p className="mt-1.5 text-[14px] text-ink-500">
            Sign in with the administrator account.
          </p>
        </div>

        {!configured ? (
          <div className="card p-5 text-[13px] leading-relaxed text-ink-600">
            Supabase is not configured. Set{" "}
            <code className="rounded bg-ink-100 px-1">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            ,{" "}
            <code className="rounded bg-ink-100 px-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            and{" "}
            <code className="rounded bg-ink-100 px-1">ADMIN_EMAIL</code> to
            enable the dashboard.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4 p-5">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-[13px] font-semibold text-ink-800"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                dir="ltr"
                required
                className="field"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-[13px] font-semibold text-ink-800"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
                required
                className="field"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-signal-critical/25 bg-signal-critical/[0.04] p-3"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-signal-critical"
                  aria-hidden="true"
                />
                <span className="text-[13px] text-ink-800">{error}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

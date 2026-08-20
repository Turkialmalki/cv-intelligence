import type { Metadata } from "next";
import { ShieldX } from "lucide-react";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { getAdminData } from "@/lib/admin/queries";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { getSessionEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The admin dashboard.
 *
 * Two gates, in order: a valid Supabase session, then an email that matches
 * ADMIN_EMAIL. Authentication alone is not authorisation — anyone can create
 * a Supabase user against a public project, so the email check is what
 * actually protects this page. Only after both pass is any service-role query
 * run.
 */
export default async function AdminPage() {
  const configured = isSupabaseConfigured();
  const adminEmail = serverEnv.adminEmail;
  const sessionEmail = configured ? await getSessionEmail() : null;

  if (!sessionEmail) {
    return <AdminLogin configured={configured} />;
  }

  if (!adminEmail || sessionEmail !== adminEmail) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-signal-critical/10 text-signal-critical">
            <ShieldX className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink-900">
            Not authorised
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            {adminEmail
              ? "This account does not have administrator access."
              : "No ADMIN_EMAIL is configured for this deployment."}
          </p>
        </div>
      </div>
    );
  }

  const data = await getAdminData();

  return <AdminDashboard data={data} adminEmail={sessionEmail} />;
}

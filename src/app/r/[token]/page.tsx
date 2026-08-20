import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportView } from "@/components/report/ReportView";
import { buildCheckoutUrl, isCheckoutConfigured } from "@/lib/payments";
import { getReportByToken } from "@/lib/repository";
import { isValidTokenFormat } from "@/lib/tokens";

/**
 * The report page.
 *
 * Rendered on the server from the database by token, which is what makes a
 * report survive a refresh, a new device or a shared link. sessionStorage is
 * only ever a paint optimisation on the scan hand-off — it is never the
 * source of truth here.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your CV Report",
  // Reports are private URLs and must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Reject malformed tokens before touching the database.
  if (!isValidTokenFormat(token)) notFound();

  const report = await getReportByToken(token);
  if (!report) notFound();

  const checkoutUrl = isCheckoutConfigured()
    ? buildCheckoutUrl({
        token: report.token,
        email: report.candidateEmail || null,
        name: report.candidateName,
        targetRole: report.targetRole,
      })
    : null;

  return (
    <ReportView
      result={report.result}
      token={report.token}
      candidateName={report.candidateName}
      createdAt={report.createdAt}
      checkoutUrl={checkoutUrl}
    />
  );
}

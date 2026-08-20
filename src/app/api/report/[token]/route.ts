import { NextResponse } from "next/server";

import { getReportByToken } from "@/lib/repository";
import { isValidTokenFormat } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves a report by its public token.
 *
 * The token is the only credential. A malformed token is rejected before it
 * ever reaches the database, and a token that does not resolve returns the
 * same 404 as one that never existed — nothing here should let a caller
 * distinguish "wrong token" from "deleted report".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!isValidTokenFormat(token)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  const report = await getReportByToken(token);

  if (!report) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      token: report.token,
      createdAt: report.createdAt,
      candidateName: report.candidateName,
      targetRole: report.targetRole,
      hasJobDescription: report.hasJobDescription,
      result: report.result,
    },
    {
      status: 200,
      headers: {
        // Private by nature: never cached by a CDN or shared proxy.
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { sendReportEmail } from "@/lib/email/send";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { getReportByToken } from "@/lib/repository";
import { isValidTokenFormat } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /**
   * Optional override. When absent the report is re-sent to the address the
   * lead already gave us, so possession of the token cannot be used to mail
   * an arbitrary stranger.
   */
  email: z.string().email().max(200).optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!isValidTokenFormat(token)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  // Resending is a cheap way to generate mail volume, so it is limited more
  // tightly than analysis.
  const identifier = getClientIdentifier(request);
  const limit = checkRateLimit(`report-email:${identifier}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many emails requested. Please try again later.",
        },
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid request." } },
      { status: 400 },
    );
  }

  const report = await getReportByToken(token);
  if (!report) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  const recipient = body.email ?? report.candidateEmail;
  if (!recipient) {
    return NextResponse.json(
      {
        error: {
          code: "NO_RECIPIENT",
          message: "No email address is on file for this report.",
        },
      },
      { status: 400 },
    );
  }

  const sent = await sendReportEmail({
    to: recipient,
    name: report.candidateName ?? "there",
    token: report.token,
    result: report.result,
    locale: body.locale,
    analysisId: report.analysisId,
    eventType: "report_resend",
  });

  if (!sent.sent) {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_FAILED",
          message:
            "We couldn't send that email right now. Your report link still works.",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";

import { feedbackRequestSchema } from "@/lib/analysis/schema";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { getAnalysisIdByToken, recordFeedback } from "@/lib/repository";
import { isValidTokenFormat } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = checkRateLimit(`feedback:${identifier}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many submissions." } },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = feedbackRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid feedback." } },
      { status: 400 },
    );
  }

  if (!isValidTokenFormat(parsed.token)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  // Feedback is written against the analysis id, never the raw token, so a
  // malformed or unknown token cannot create an orphaned row.
  const analysisId = await getAnalysisIdByToken(parsed.token);
  if (!analysisId) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Report not found." } },
      { status: 404 },
    );
  }

  const stored = await recordFeedback({
    analysisId,
    rating: parsed.rating,
    comment: parsed.comment?.trim() || null,
  });

  if (!stored) {
    return NextResponse.json(
      { error: { code: "STORAGE_FAILED", message: "Could not save feedback." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ recorded: true }, { headers: { "Cache-Control": "no-store" } });
}

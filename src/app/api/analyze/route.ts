import { NextResponse } from "next/server";

import { enrichAnalysis } from "@/lib/ai";
import { UPLOAD_LIMITS } from "@/lib/analysis/config";
import { analyzeCV } from "@/lib/analysis/engine";
import { analyzeRequestSchema } from "@/lib/analysis/schema";
import { sendReportEmail } from "@/lib/email/send";
import {
  FileTooLargeError,
  UnsupportedFileError,
  conditionMessage,
  parseDocument,
  parsePastedText,
  validateUpload,
} from "@/lib/parsing";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { persistAnalysis } from "@/lib/repository";

/**
 * PDF and DOCX parsing require Node APIs, so this route cannot run on Edge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_FIELD_BYTES = 200_000;

function badRequest(message: string, code: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  // --- Rate limiting -----------------------------------------------------
  const identifier = getClientIdentifier(request);
  const limit = checkRateLimit(`analyze:${identifier}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `You've reached the limit of analyses for now. Please try again in ${Math.ceil(
            limit.retryAfterSeconds / 60,
          )} minute(s).`,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  // --- Request shape -----------------------------------------------------
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected a multipart form submission.", "INVALID_BODY");
  }

  const parsedFields = analyzeRequestSchema.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    targetRole: form.get("targetRole") || null,
    jobDescription: form.get("jobDescription") || null,
    pastedText: form.get("pastedText") || null,
    locale: form.get("locale") === "ar" ? "ar" : "en",
  });

  if (!parsedFields.success) {
    const first = parsedFields.error.issues[0];
    return badRequest(
      first?.message ?? "Please check the details you entered.",
      "VALIDATION_FAILED",
    );
  }
  const fields = parsedFields.data;

  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const pasted = fields.pastedText?.trim() ?? "";

  if (!hasFile && pasted.length === 0) {
    return badRequest(
      "Please upload your CV or paste its text.",
      "NO_DOCUMENT",
    );
  }

  if (fields.jobDescription && fields.jobDescription.length > MAX_FIELD_BYTES) {
    return badRequest("That job description is too long.", "FIELD_TOO_LONG");
  }

  // --- Parse -------------------------------------------------------------
  let parsed;
  let filename = "pasted-text.txt";
  let mimeType = "text/plain";
  let fileSize = pasted.length;

  try {
    if (hasFile) {
      const upload = file;
      validateUpload({
        size: upload.size,
        name: upload.name,
        type: upload.type,
      });
      filename = upload.name;
      mimeType = upload.type || "application/octet-stream";
      fileSize = upload.size;
      const buffer = Buffer.from(await upload.arrayBuffer());
      parsed = await parseDocument(buffer, upload.name, mimeType);
    } else {
      parsed = parsePastedText(pasted);
    }
  } catch (error) {
    if (error instanceof FileTooLargeError) {
      return badRequest(error.message, "FILE_TOO_LARGE", 413);
    }
    if (error instanceof UnsupportedFileError) {
      return badRequest(error.message, "UNSUPPORTED_FILE", 415);
    }
    console.error("[analyze] parsing failed", error);
    return badRequest(
      "We couldn't read this file. Try uploading a text-based PDF or DOCX.",
      "PARSE_FAILED",
      422,
    );
  }

  // A document with no readable text is reported honestly rather than being
  // scored as though it were empty — a fake score here would be worse than
  // no answer at all.
  if (parsed.condition === "image_based_document" || parsed.condition === "unreadable") {
    return NextResponse.json(
      {
        error: {
          code: "IMAGE_BASED_DOCUMENT",
          message:
            conditionMessage(parsed.condition) ??
            "We couldn't reliably read this CV. Try uploading a text-based PDF or DOCX.",
        },
      },
      { status: 422 },
    );
  }

  // --- Analyse -----------------------------------------------------------
  let result;
  try {
    const deterministic = analyzeCV({
      text: parsed.text,
      parserPageCount: parsed.pageCount,
      condition: parsed.condition,
      jobDescription: fields.jobDescription ?? null,
      targetRole: fields.targetRole ?? null,
    });
    // Enrichment is optional and never load-bearing; it returns the
    // deterministic result unchanged when disabled or on failure.
    result = await enrichAnalysis(deterministic);
  } catch (error) {
    console.error("[analyze] scoring failed", error);
    return NextResponse.json(
      {
        error: {
          code: "ANALYSIS_FAILED",
          message: "Something went wrong analysing your CV. Please try again.",
        },
      },
      { status: 500 },
    );
  }

  // --- Persist -----------------------------------------------------------
  const persisted = await persistAnalysis({
    lead: {
      name: fields.name,
      email: fields.email,
      targetRole: fields.targetRole ?? null,
      source: "web",
    },
    document: {
      filename,
      mimeType,
      fileSize,
      language: parsed.language,
      extractedText: parsed.text,
      // Temporary retention is the default: the upload was parsed in memory
      // and no original file was ever written anywhere.
      storagePath: null,
    },
    analysis: {
      jobDescription: fields.jobDescription ?? null,
      targetRole: fields.targetRole ?? null,
    },
    result,
  });

  // --- Email (best effort) ----------------------------------------------
  // Deliberately awaited but never fatal: a failed send is logged to
  // email_events and the report is returned regardless.
  void sendReportEmail({
    to: fields.email,
    name: fields.name,
    token: persisted.token,
    result,
    locale: fields.locale,
    analysisId: persisted.analysisId,
  }).catch((error) => {
    console.error("[analyze] email dispatch failed", error);
  });

  return NextResponse.json(
    {
      token: persisted.token,
      reportPath: `/r/${persisted.token}`,
      persisted: persisted.persisted,
      notice: conditionMessage(parsed.condition),
      result,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/** Surfaces the upload constraints so the client can validate before sending. */
export async function GET() {
  return NextResponse.json({
    maxBytes: UPLOAD_LIMITS.maxBytes,
    allowedExtensions: UPLOAD_LIMITS.allowedExtensions,
  });
}

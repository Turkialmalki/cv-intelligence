import "server-only";

import { Resend } from "resend";

import type { AnalysisResult } from "../analysis/schema";
import { reportUrl } from "../appUrl";
import { isEmailConfigured, serverEnv } from "../env";
import { recordEmailEvent } from "../repository";
import { buildReportEmail } from "./template";

/**
 * Transactional email.
 *
 * Sending must never fail an analysis. The user's report already exists and
 * is already reachable by the time we get here, so every failure path logs to
 * email_events and returns — it never throws into the request.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!client) client = new Resend(serverEnv.resendApiKey);
  return client;
}

export interface SendReportEmailInput {
  to: string;
  name: string;
  token: string;
  result: AnalysisResult;
  locale: "en" | "ar";
  analysisId: string | null;
  eventType?: string;
}

export interface SendResult {
  sent: boolean;
  messageId: string | null;
  reason?: string;
}

export async function sendReportEmail(
  input: SendReportEmailInput,
): Promise<SendResult> {
  const eventType = input.eventType ?? "report_ready";
  const resend = getClient();

  if (!resend) {
    await recordEmailEvent({
      analysisId: input.analysisId,
      recipient: input.to,
      eventType,
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
    });
    return { sent: false, messageId: null, reason: "email_not_configured" };
  }

  const url = reportUrl(input.token);
  const { subject, html, text } = buildReportEmail({
    name: input.name,
    result: input.result,
    reportUrl: url,
    locale: input.locale,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: serverEnv.resendFromEmail,
      to: input.to,
      subject,
      html,
      text,
    });

    if (error) {
      await recordEmailEvent({
        analysisId: input.analysisId,
        recipient: input.to,
        eventType,
        status: "failed",
        errorMessage: error.message ?? "unknown Resend error",
      });
      console.error("[email] send failed", error);
      return { sent: false, messageId: null, reason: error.message };
    }

    await recordEmailEvent({
      analysisId: input.analysisId,
      recipient: input.to,
      eventType,
      status: "sent",
      providerMessageId: data?.id ?? null,
    });

    return { sent: true, messageId: data?.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await recordEmailEvent({
      analysisId: input.analysisId,
      recipient: input.to,
      eventType,
      status: "failed",
      errorMessage: message,
    });
    console.error("[email] send threw", error);
    return { sent: false, messageId: null, reason: message };
  }
}

import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { getAnalysisIdByToken, upsertPayment } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider-agnostic payment webhook.
 *
 * The route knows nothing about any specific provider: it reads the raw body,
 * hands it to the configured adapter to verify and normalise, and writes the
 * result. Adding Tap, Moyasar, Stripe or Lemon Squeezy means adding an
 * adapter, not editing this file.
 *
 * Two properties matter here. Verification is mandatory — an unverified
 * webhook could grant paid access for free, so an unconfigured secret rejects
 * rather than defaults open. And writes are idempotent on
 * (provider, provider_reference), because every provider retries.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const secret = serverEnv.paymentWebhookSecret;

  // Fail closed. Without a configured secret nothing can be authenticated,
  // so nothing is accepted.
  if (!secret) {
    console.warn(
      "[payments] webhook received but PAYMENT_WEBHOOK_SECRET is not set; rejecting.",
    );
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Webhook not configured." } },
      { status: 503 },
    );
  }

  // The raw body is needed for signature verification, so it must be read as
  // text before any JSON parsing.
  const rawBody = await request.text();

  if (!provider.verifyWebhook(rawBody, request.headers, secret)) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Rejected." } },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Malformed payload." } },
      { status: 400 },
    );
  }

  const event = provider.parseWebhook(payload);
  if (!event) {
    return NextResponse.json(
      { error: { code: "UNRECOGNISED_EVENT", message: "Ignored." } },
      { status: 202 },
    );
  }

  const analysisId = event.token
    ? await getAnalysisIdByToken(event.token)
    : null;

  const stored = await upsertPayment({
    analysisId,
    leadId: null,
    provider: provider.id,
    providerReference: event.reference,
    amount: event.amount,
    currency: event.currency,
    status: event.status,
    rawPayload: payload,
  });

  if (!stored) {
    // A 500 asks the provider to retry, which is what we want when the write
    // failed for a transient reason.
    return NextResponse.json(
      { error: { code: "STORAGE_FAILED", message: "Retry." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

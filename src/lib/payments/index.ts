/**
 * Payment provider abstraction.
 *
 * The product ships with a "manual" provider: the CTA points at whatever
 * checkout URL the owner configures (Lemon Squeezy, a Tap payment link, a
 * Stripe Payment Link, even a Google Form). That is genuinely all a launch
 * needs, and it avoids committing the codebase to a provider before the first
 * customer exists.
 *
 * When a real integration is wanted, add an adapter implementing
 * `PaymentProvider` and register it below. Nothing outside this directory
 * needs to change — the CTA and the webhook route both talk to the interface.
 */

export interface CheckoutContext {
  /** Public report token, so the purchase can be tied back to the analysis. */
  token: string;
  email?: string | null;
  name?: string | null;
  targetRole?: string | null;
  locale?: "en" | "ar";
}

export interface NormalizedWebhookEvent {
  /** Provider's own id for the transaction; used for idempotency. */
  reference: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  amount: number;
  currency: string;
  /** Report token, when the provider echoed it back to us. */
  token: string | null;
  email: string | null;
}

export interface PaymentProvider {
  readonly id: string;
  /** Builds the URL the "Transform My CV" button points at. */
  createCheckoutUrl(context: CheckoutContext): string;
  /**
   * Verifies a webhook's authenticity. Returning false must cause the route
   * to reject the request — an unverified webhook can award paid access.
   */
  verifyWebhook(rawBody: string, headers: Headers, secret: string): boolean;
  /** Maps a provider-specific payload onto our own shape. */
  parseWebhook(payload: unknown): NormalizedWebhookEvent | null;
}

function checkoutBase(): string {
  return process.env.NEXT_PUBLIC_CV_SERVICE_CHECKOUT_URL?.trim() ?? "";
}

/**
 * Appends our tracking parameters to a configured checkout link without
 * clobbering any query string the owner already put there.
 */
function withParams(base: string, context: CheckoutContext): string {
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("ref", context.token);
    if (context.email) url.searchParams.set("checkout[email]", context.email);
    if (context.locale) url.searchParams.set("locale", context.locale);
    return url.toString();
  } catch {
    // Not a parseable absolute URL — hand it back untouched rather than
    // producing a broken link.
    return base;
  }
}

/**
 * The default. No API integration: the owner configures a hosted checkout
 * URL, and payment confirmation arrives out of band (or through a webhook
 * once a real provider is wired up).
 */
const manualProvider: PaymentProvider = {
  id: "manual",
  createCheckoutUrl: (context) => withParams(checkoutBase(), context),
  // Without a provider there is no signature to verify, so a webhook can
  // only be accepted when a shared secret is configured and matches.
  verifyWebhook: (_rawBody, headers, secret) => {
    if (!secret) return false;
    const provided = headers.get("x-webhook-secret") ?? "";
    return provided.length === secret.length && provided === secret;
  },
  parseWebhook: (payload) => {
    if (typeof payload !== "object" || payload === null) return null;
    const body = payload as Record<string, unknown>;
    const reference =
      typeof body.reference === "string"
        ? body.reference
        : typeof body.id === "string"
          ? body.id
          : null;
    if (!reference) return null;

    const statusRaw = typeof body.status === "string" ? body.status : "pending";
    const status: NormalizedWebhookEvent["status"] = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "cancelled",
    ].includes(statusRaw)
      ? (statusRaw as NormalizedWebhookEvent["status"])
      : "pending";

    return {
      reference,
      status,
      amount: typeof body.amount === "number" ? body.amount : 0,
      currency: typeof body.currency === "string" ? body.currency : "SAR",
      token:
        typeof body.token === "string"
          ? body.token
          : typeof body.ref === "string"
            ? body.ref
            : null,
      email: typeof body.email === "string" ? body.email : null,
    };
  },
};

const providers: Record<string, PaymentProvider> = {
  manual: manualProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.toLowerCase().trim();
  return (configured && providers[configured]) || manualProvider;
}

/** Whether a checkout destination has been configured at all. */
export function isCheckoutConfigured(): boolean {
  return checkoutBase().length > 0;
}

export function buildCheckoutUrl(context: CheckoutContext): string {
  return getPaymentProvider().createCheckoutUrl(context);
}

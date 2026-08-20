import { RATE_LIMIT } from "./analysis/config";

/**
 * Fixed-window rate limiter.
 *
 * Deliberately in-memory. On Vercel each serverless instance keeps its own
 * counter, so this is a speed bump against casual abuse rather than a hard
 * guarantee — which is the right trade for a free public tool where the real
 * cost ceiling is CPU, not money. Swapping in Upstash or Vercel KV later is a
 * change to this file alone; nothing else knows how limiting is implemented.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Evicts expired entries so a long-lived instance cannot grow unbounded. */
function sweep(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimitResult {
  const max = options.max ?? RATE_LIMIT.max;
  const windowMs = options.windowMs ?? RATE_LIMIT.windowMs;
  const now = Date.now();

  sweep(now);

  const existing = windows.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, max - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client identity.
 *
 * Proxy headers are forgeable, so this cannot be treated as authentication —
 * it only needs to be stable enough to slow down the ordinary case.
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  const candidate =
    headers.get("x-real-ip") ??
    forwarded?.split(",")[0]?.trim() ??
    headers.get("cf-connecting-ip") ??
    "unknown";
  return candidate || "unknown";
}

/** Test-only: clears all windows. */
export function resetRateLimits(): void {
  windows.clear();
}

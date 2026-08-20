/**
 * Resolves the public base URL of the deployment.
 *
 * Order matters: an explicitly configured URL always wins, then Vercel's
 * injected host, then localhost as a development-only last resort. Report
 * links are emailed, so a localhost URL escaping into an email would be a
 * real defect — never hard-code it anywhere else.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function reportUrl(token: string): string {
  return `${getAppUrl()}/r/${token}`;
}

import { classificationLabel } from "../analysis/config";
import type { AnalysisResult } from "../analysis/schema";

/**
 * The report-ready email.
 *
 * Built as inline-styled table HTML because that is what survives Outlook and
 * Gmail. No CV content is attached or embedded — the email carries the score,
 * two insights and a link, and the report itself stays behind the token.
 */

/** Escapes anything derived from user input before it enters HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ReportEmailInput {
  name: string;
  result: AnalysisResult;
  reportUrl: string;
  locale: "en" | "ar";
}

const COPY = {
  en: {
    subject: "Your CV Intelligence Report is ready",
    preheader: (score: number) =>
      `Your CV scored ${score}/100. Here is what is holding it back.`,
    greeting: (name: string) => `Hi ${name},`,
    intro: "Your CV has been analysed. Here is the summary:",
    scoreLabel: "ATS Readiness Score",
    outOf: "out of 100",
    potentialLabel: "Realistic potential",
    insightsTitle: "Your two biggest opportunities",
    cta: "View My Full Report",
    linkFallback: "Or paste this link into your browser:",
    disclaimer:
      "Simulated against common ATS parsing, recruiter readability, CV structure and job-matching criteria. This is not the score of any specific applicant tracking system.",
    privacy:
      "Your CV was processed securely and is never made publicly accessible. This report link is private to you.",
    dir: "ltr",
  },
  ar: {
    subject: "تقرير تحليل سيرتك الذاتية جاهز",
    preheader: (score: number) =>
      `حصلت سيرتك على ${score} من 100. وهذي أبرز النقاط اللي تعيقها.`,
    greeting: (name: string) => `أهلاً ${name}،`,
    intro: "تم تحليل سيرتك الذاتية، وهذا ملخص النتيجة:",
    scoreLabel: "درجة جاهزية السيرة لأنظمة التوظيف",
    outOf: "من 100",
    potentialLabel: "النتيجة الممكنة بشكل واقعي",
    insightsTitle: "أكبر فرصتين للتحسين",
    cta: "اعرض التقرير الكامل",
    linkFallback: "أو انسخ هذا الرابط في المتصفح:",
    disclaimer:
      "التقييم محاكاة لمعايير قراءة أنظمة التوظيف، ووضوح السيرة لمسؤول التوظيف، وهيكلتها، ومدى توافقها مع الوظيفة. وهو ليس درجة صادرة عن نظام توظيف بعينه.",
    privacy:
      "تمت معالجة سيرتك بشكل آمن ولا تُتاح للعامة إطلاقًا. ورابط التقرير خاص بك وحدك.",
    dir: "rtl",
  },
} as const;

export function buildReportEmail(input: ReportEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, result, reportUrl, locale } = input;
  const copy = COPY[locale];
  const label = classificationLabel(result.classification);
  const classification = locale === "ar" ? label.ar : label.en;

  const insights = result.findings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 2);

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(reportUrl);

  const insightRows = insights
    .map(
      (finding) => `
        <tr>
          <td style="padding:0 0 14px 0;">
            <div style="font:600 15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1219;">
              ${escapeHtml(finding.title)}
            </div>
            <div style="font:400 14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#65728e;padding-top:4px;">
              ${escapeHtml(finding.recommendation)}
            </div>
          </td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${locale}" dir="${copy.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    copy.preheader(result.overallScore),
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e9ef;border-radius:16px;">
      <tr><td style="padding:32px 32px 8px 32px;">
        <div style="font:600 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#65728e;">
          CV Intelligence
        </div>
      </td></tr>

      <tr><td style="padding:16px 32px 0 32px;">
        <div style="font:400 16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1219;">
          ${escapeHtml(copy.greeting(safeName))}
        </div>
        <div style="font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#65728e;padding-top:8px;">
          ${escapeHtml(copy.intro)}
        </div>
      </td></tr>

      <tr><td style="padding:24px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e6e9ef;border-radius:12px;">
          <tr><td style="padding:24px;" align="center">
            <div style="font:600 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#65728e;">
              ${escapeHtml(copy.scoreLabel)}
            </div>
            <div style="font:700 48px/1.1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1219;padding-top:10px;">
              ${result.overallScore}<span style="font-size:20px;color:#8591aa;">/100</span>
            </div>
            <div style="font:600 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d69f0;padding-top:8px;">
              ${escapeHtml(classification)}
            </div>
            <div style="font:400 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#65728e;padding-top:12px;">
              ${escapeHtml(copy.potentialLabel)}: <strong style="color:#12a672;">${result.potentialScore}/100</strong>
            </div>
          </td></tr>
        </table>
      </td></tr>

      ${
        insights.length > 0
          ? `<tr><td style="padding:28px 32px 0 32px;">
        <div style="font:600 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#65728e;padding-bottom:14px;">
          ${escapeHtml(copy.insightsTitle)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${insightRows}</table>
      </td></tr>`
          : ""
      }

      <tr><td style="padding:28px 32px 0 32px;" align="center">
        <a href="${safeUrl}" style="display:inline-block;background:#0f1219;color:#ffffff;text-decoration:none;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px 28px;border-radius:10px;">
          ${escapeHtml(copy.cta)}
        </a>
      </td></tr>

      <tr><td style="padding:18px 32px 0 32px;" align="center">
        <div style="font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#8591aa;word-break:break-all;">
          ${escapeHtml(copy.linkFallback)}<br>
          <a href="${safeUrl}" style="color:#65728e;">${safeUrl}</a>
        </div>
      </td></tr>

      <tr><td style="padding:26px 32px 32px 32px;">
        <div style="height:1px;background:#e6e9ef;margin-bottom:18px;"></div>
        <div style="font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#8591aa;">
          ${escapeHtml(copy.privacy)}
        </div>
        <div style="font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#a8b1c4;padding-top:10px;">
          ${escapeHtml(copy.disclaimer)}
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    copy.greeting(name),
    "",
    copy.intro,
    "",
    `${copy.scoreLabel}: ${result.overallScore} ${copy.outOf} (${classification})`,
    `${copy.potentialLabel}: ${result.potentialScore}/100`,
    "",
    ...(insights.length > 0
      ? [
          copy.insightsTitle,
          ...insights.map((f) => `- ${f.title}: ${f.recommendation}`),
          "",
        ]
      : []),
    `${copy.cta}: ${reportUrl}`,
    "",
    copy.privacy,
    copy.disclaimer,
  ].join("\n");

  return { subject: copy.subject, html, text };
}

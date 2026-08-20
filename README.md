# CV ATS Intelligence

A public tool that scores a CV out of 100 against ATS parsing, recruiter
readability, CV structure and job matching — then shows exactly what is
holding it back and how to fix it, in English or Arabic.

Upload a CV → watch an animated scan → get an explainable score, a
before/after built only from your own content, and a private report link.

---

## What makes this trustworthy

Three constraints shaped most of the technical decisions here:

**The scoring engine is deterministic, not an LLM.** All 100 points come from
a pure TypeScript engine with configurable weights. The same CV always
produces the same score. AI enrichment exists behind an interface but ships
disabled, and the entire test suite runs without it.

**Nothing is ever fabricated.** The before/after rewrites only reorder, tidy
and re-frame the candidate's own words. Where a metric is missing, the output
inserts a visible placeholder asking for the real number — never an invented
one. Tests assert that every digit in an "after" already existed in the
"before".

**It never claims to be a real ATS.** The product is positioned as an *ATS
Readiness Score*, simulated against common parsing, readability, structure and
matching criteria. It never claims to be the score Workday, Greenhouse or
Taleo would give.

---

## Stack

Next.js 15 (App Router) · TypeScript strict · Supabase (Postgres/Auth/Storage)
· Resend · Zod · Framer Motion · lucide-react · Tailwind · Vitest · Vercel

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

The app runs without Supabase configured — you can upload a CV and see the
full scan and score. Persistence and the `/r/[token]` report page require
Supabase, because a report that cannot be stored cannot be revisited.

```bash
npm run lint      # ESLint
npm run test      # Vitest — 97 tests
npm run build     # production build
npm run typecheck # tsc --noEmit
npm run inspect   # inspect real CVs (see below)
```

### Inspecting real CVs

The most valuable debugging tool in the repo. It prints exactly what the
parser extracted, what the engine scored, and every finding:

```bash
npm run inspect                        # every file in tests/fixtures/real-cvs/
npm run inspect -- path/to/cv.pdf      # one file
npm run inspect -- --text              # also dump the extracted text
npm run inspect -- --summary           # comparison table across all fixtures
npm run inspect -- --jd path/to/jd.txt # score against a job description
```

Drop any `.pdf`, `.docx` or `.txt` into `tests/fixtures/real-cvs/` and it is
picked up automatically by both the harness and the smoke tests. The tests
assert invariants and *relative* ordering only — never absolute scores — so
the fixture set can grow without breaking the suite.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server only.** Never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL, no trailing slash. Used in emailed report links |
| `RESEND_API_KEY` | for email | Resend API key. Without it, analysis still works; sends are logged as `skipped` |
| `RESEND_FROM_EMAIL` | for email | e.g. `CV Intelligence <reports@yourdomain.com>` |
| `ADMIN_EMAIL` | for `/admin` | The only email allowed into the dashboard |
| `NEXT_PUBLIC_CV_SERVICE_CHECKOUT_URL` | for selling | Checkout link the "Transform My CV" button opens |
| `PAYMENT_PROVIDER` | no | `manual` (default), or a provider adapter you add |
| `PAYMENT_WEBHOOK_SECRET` | for webhooks | Without it the webhook rejects everything, by design |
| `CV_AI_PROVIDER` | no | `none` (default). The product is complete without AI |
| `CV_FILE_RETENTION_MODE` | no | `temporary` (default) deletes the original after parsing |
| `RATE_LIMIT_MAX` | no | Analyses per IP per window (default 5) |
| `RATE_LIMIT_WINDOW_MS` | no | Window length (default 1 hour) |

---

## Supabase setup — manual steps

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy the Project URL, the `anon` key and the
   `service_role` key into your env.
3. **SQL Editor**: run the three migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage.sql`
4. *(Optional, for direct SQL access as admin)* set the admin email at the
   database level:
   ```sql
   alter database postgres set app.admin_email = 'you@yourdomain.com';
   ```
5. **Authentication → Users → Add user**: create your admin user with the
   same email as `ADMIN_EMAIL`, and set a password. This is the account you
   sign in to `/admin` with.
6. *(Optional)* **Authentication → Providers → Email**: disable public
   sign-ups so nobody else can create accounts on your project.

### A note on the security model

The anon key ships in the browser bundle, so it is treated as public. **No
table containing candidate data grants anything to `anon` or `authenticated`,
and there are no permissive `USING (true)` policies anywhere.** Reports are
served only through a server route that resolves the public token with the
service role. Raw CV text (`cv_documents`) is not readable even by an admin
session — only by the server.

Report tokens are 32 characters of cryptographically random data (~157 bits),
never sequential ids. They are the only credential protecting a report, so
report pages are served `no-store` and `noindex`.

---

## Resend setup — manual steps

1. Create an account at [resend.com](https://resend.com).
2. **Domains → Add Domain**, then add the DNS records it gives you (SPF,
   DKIM, and ideally DMARC) at your DNS provider. Wait for verification —
   without it, mail lands in spam.
3. **API Keys → Create API Key**, with send permission. Copy it to
   `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on the verified domain.

Email failure never fails an analysis. Every attempt — including failures —
is recorded in `email_events`, and the user still gets their report.

For testing before a domain is verified, Resend's `onboarding@resend.dev`
sender works but can only deliver to your own account email.

---

## Vercel deployment

1. Push to GitHub (already configured: `Turkialmalki/cv-intelligence`).
2. Import the repo at [vercel.com/new](https://vercel.com/new). Framework
   preset and build settings are detected automatically.
3. **Settings → Environment Variables**: add every variable from the table
   above for Production (and Preview, if you want previews to work).
   - Set `NEXT_PUBLIC_APP_URL` to your real domain, e.g.
     `https://cv.yourdomain.com`. Do not leave it as localhost — it is what
     emailed report links point at.
4. Deploy.
5. *(Optional)* **Settings → Domains**: add your custom domain, then update
   `NEXT_PUBLIC_APP_URL` and redeploy.

Routes that parse PDF/DOCX declare `runtime = "nodejs"` — they cannot run on
Edge. Analysis of a real 2-page PDF completes in well under a second.

---

## Payments

Ships with a `manual` provider: the CTA opens whatever checkout URL you set in
`NEXT_PUBLIC_CV_SERVICE_CHECKOUT_URL` — a Lemon Squeezy link, a Stripe Payment
Link, a Tap link, anything. That is genuinely all a launch needs, and it avoids
committing to a provider before the first customer.

To integrate a provider properly, add an adapter implementing
`PaymentProvider` in `src/lib/payments/index.ts` and register it. Nothing
outside that directory needs to change — the CTA and the webhook both talk to
the interface.

The webhook **fails closed**: with no `PAYMENT_WEBHOOK_SECRET` it rejects
everything, because an unverified webhook could grant paid access for free.
Writes are idempotent on `(provider, provider_reference)` since every provider
retries.

---

## What the owner must still do

Nothing in this list is code — it is all accounts and credentials only you can
create:

- [ ] Create the Supabase project and run the three migrations
- [ ] Create the admin user in Supabase Auth matching `ADMIN_EMAIL`
- [ ] Create the Resend account and verify your sending domain's DNS
- [ ] Set up a payment provider / checkout link and set
      `NEXT_PUBLIC_CV_SERVICE_CHECKOUT_URL`
- [ ] Add all environment variables in Vercel and deploy
- [ ] Point `NEXT_PUBLIC_APP_URL` at the real domain

---

## Project structure

```
src/
  app/
    page.tsx                 landing
    scan/                    upload → animated scan → score reveal
    r/[token]/               the full report (server-rendered by token)
    admin/                   dashboard, gated on ADMIN_EMAIL
    api/                     analyze, report, email, feedback, payment webhook
  components/
    scan/                    uploader, scan experience, score reveal
    report/                  gauge, breakdown, findings, comparison, CTA
    admin/                   login, dashboard
    layout/                  header, footer, language switcher
  lib/
    analysis/                the scoring engine
      config.ts              all weights and thresholds live here
      engine.ts              orchestration, potential score
      dimensions/            the nine scorers
      lexicon.ts             bilingual EN/AR vocabularies
      normalize.ts           raw text → structured CV
      rewrite.ts             deterministic, non-fabricating rewrites
    parsing/                 PDF / DOCX / TXT extraction
    i18n/                    bilingual copy and locale context
    payments/  ai/  email/   provider abstractions
supabase/migrations/         schema, RLS, storage
tests/fixtures/real-cvs/     real CVs for the inspection harness
scripts/inspect-cv.ts        the debugging harness
```

### Tuning the scoring

All weights and thresholds are in `src/lib/analysis/config.ts`. The nine
dimensions sum to 100 and a test asserts it. Adjusting a weight there changes
the score everywhere, with no magic numbers hidden in the scorers.

---

## Privacy

- Original uploads are parsed in memory and never written to disk in the
  default `temporary` retention mode. Only extracted text is persisted.
- CVs are never made publicly accessible. There is no public bucket.
- Report URLs are unguessable, `noindex`, and served `no-store`.
- The admin dashboard never reads CV text.

> **Note:** `tests/fixtures/real-cvs/` contains real CVs with real contact
> details. If this repository is ever made public, remove them first or move
> them behind `.gitignore`.

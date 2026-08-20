-- ---------------------------------------------------------------------------
-- CV ATS Intelligence — initial schema
--
-- Design notes:
--   * Reports are reachable by an unguessable public token, without an
--     account. The token is therefore a credential: it is never exposed to
--     the anon role, and reports are served only through a server route that
--     validates it with the service role.
--   * No table below grants any privilege to `anon` or `authenticated`.
--     RLS is enabled everywhere and left without permissive policies, so the
--     service role (which bypasses RLS) is the only path in. This is
--     deliberate — see 0002_rls_policies.sql.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  linkedin_url  text,
  target_role   text,
  source        text not null default 'web',
  created_at    timestamptz not null default now()
);

create index if not exists leads_email_idx      on public.leads (lower(email));
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_source_idx     on public.leads (source);

-- ---------------------------------------------------------------------------
-- cv_documents
--
-- `extracted_text` is the durable artefact. The original upload is deleted
-- after parsing unless CV_FILE_RETENTION_MODE=persistent, in which case
-- storage_path points into the private `cv-uploads` bucket.
-- ---------------------------------------------------------------------------
create table if not exists public.cv_documents (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads (id) on delete cascade,
  original_filename text not null,
  mime_type         text not null,
  file_size         integer not null check (file_size >= 0),
  language          text not null default 'unknown',
  storage_path      text,
  extracted_text    text not null default '',
  created_at        timestamptz not null default now()
);

create index if not exists cv_documents_lead_id_idx    on public.cv_documents (lead_id);
create index if not exists cv_documents_created_at_idx on public.cv_documents (created_at desc);

-- ---------------------------------------------------------------------------
-- analyses
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads (id) on delete cascade,
  cv_document_id  uuid not null references public.cv_documents (id) on delete cascade,
  public_token    text not null unique,
  overall_score   integer not null check (overall_score between 0 and 100),
  potential_score integer not null check (potential_score between 0 and 100),
  classification  text not null,
  language        text not null default 'unknown',
  job_description text,
  target_role     text,
  score_breakdown jsonb not null default '[]'::jsonb,
  summary         jsonb not null default '{}'::jsonb,
  status          text not null default 'completed',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint analyses_potential_gte_overall check (potential_score >= overall_score),
  constraint analyses_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  constraint analyses_classification_check check (
    classification in (
      'exceptional', 'strong', 'competitive',
      'needs_improvement', 'weak', 'critical'
    )
  )
);

-- The token lookup is the hottest query in the product.
create unique index if not exists analyses_public_token_idx on public.analyses (public_token);
create index if not exists analyses_lead_id_idx      on public.analyses (lead_id);
create index if not exists analyses_created_at_idx   on public.analyses (created_at desc);
create index if not exists analyses_score_idx        on public.analyses (overall_score);
create index if not exists analyses_target_role_idx  on public.analyses (target_role);

-- ---------------------------------------------------------------------------
-- findings
-- ---------------------------------------------------------------------------
create table if not exists public.findings (
  id              uuid primary key default gen_random_uuid(),
  analysis_id     uuid not null references public.analyses (id) on delete cascade,
  finding_key     text not null,
  category        text not null,
  severity        text not null,
  title           text not null,
  description     text not null,
  evidence        text,
  recommendation  text not null,
  score_deduction numeric(5, 2) not null default 0 check (score_deduction >= 0),
  before_text     text,
  after_text      text,
  is_locked       boolean not null default false,
  created_at      timestamptz not null default now(),

  constraint findings_severity_check check (
    severity in ('critical', 'high', 'medium', 'low', 'positive')
  )
);

create index if not exists findings_analysis_id_idx on public.findings (analysis_id);
create index if not exists findings_severity_idx    on public.findings (analysis_id, severity);

-- ---------------------------------------------------------------------------
-- generated_improvements
-- ---------------------------------------------------------------------------
create table if not exists public.generated_improvements (
  id                uuid primary key default gen_random_uuid(),
  analysis_id       uuid not null references public.analyses (id) on delete cascade,
  section_type      text not null,
  original_content  text not null,
  suggested_content text not null,
  confidence        numeric(3, 2) not null default 1.0
                      check (confidence between 0 and 1),
  is_locked         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists generated_improvements_analysis_id_idx
  on public.generated_improvements (analysis_id);

-- ---------------------------------------------------------------------------
-- email_events
--
-- Email delivery must never fail an analysis, so every attempt — including
-- failures — is recorded here and the request continues.
-- ---------------------------------------------------------------------------
create table if not exists public.email_events (
  id                  uuid primary key default gen_random_uuid(),
  analysis_id         uuid references public.analyses (id) on delete cascade,
  recipient           text not null,
  event_type          text not null,
  provider_message_id text,
  status              text not null default 'queued',
  error_message       text,
  created_at          timestamptz not null default now(),

  constraint email_events_status_check check (
    status in ('queued', 'sent', 'failed', 'skipped')
  )
);

create index if not exists email_events_analysis_id_idx on public.email_events (analysis_id);
create index if not exists email_events_created_at_idx  on public.email_events (created_at desc);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  analysis_id        uuid references public.analyses (id) on delete set null,
  lead_id            uuid references public.leads (id) on delete set null,
  provider           text not null,
  provider_reference text,
  amount             numeric(10, 2) not null default 0 check (amount >= 0),
  currency           text not null default 'SAR',
  status             text not null default 'pending',
  raw_payload        jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint payments_status_check check (
    status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')
  )
);

-- A provider reference is unique per provider, which makes webhook handling
-- idempotent: a replayed webhook updates rather than duplicates.
create unique index if not exists payments_provider_reference_idx
  on public.payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists payments_analysis_id_idx on public.payments (analysis_id);
create index if not exists payments_lead_id_idx     on public.payments (lead_id);
create index if not exists payments_status_idx      on public.payments (status);

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_analysis_id_idx on public.feedback (analysis_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists analyses_set_updated_at on public.analyses;
create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

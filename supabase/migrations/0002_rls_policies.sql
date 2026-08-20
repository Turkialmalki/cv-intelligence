-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Threat model: the anon key ships in the browser bundle. Anyone who visits
-- the site has it. Every policy below is written on that assumption.
--
-- Consequences:
--   * CVs, extracted text, leads and analyses are never readable with the
--     anon key. Not by token, not by id, not at all. The report page is
--     rendered by a server route that looks the token up with the service
--     role, which bypasses RLS.
--   * There are deliberately NO permissive `using (true)` policies on any
--     table holding candidate data.
--   * The admin dashboard reads through the server with the service role and
--     checks the session email against ADMIN_EMAIL before doing so.
-- ---------------------------------------------------------------------------

alter table public.leads                  enable row level security;
alter table public.cv_documents           enable row level security;
alter table public.analyses               enable row level security;
alter table public.findings               enable row level security;
alter table public.generated_improvements enable row level security;
alter table public.email_events           enable row level security;
alter table public.payments               enable row level security;
alter table public.feedback               enable row level security;

-- Force RLS even for the table owner, so a mistakenly-owned connection
-- cannot read around the policies. The service role still bypasses this.
alter table public.leads                  force row level security;
alter table public.cv_documents           force row level security;
alter table public.analyses               force row level security;
alter table public.findings               force row level security;
alter table public.generated_improvements force row level security;
alter table public.email_events           force row level security;
alter table public.payments               force row level security;
alter table public.feedback               force row level security;

-- ---------------------------------------------------------------------------
-- Explicitly revoke direct table access from the public-facing roles.
--
-- Enabling RLS without policies already denies everything, but revoking the
-- grants as well means an accidentally-added permissive policy in future
-- cannot silently open a table up.
-- ---------------------------------------------------------------------------
revoke all on public.leads                  from anon, authenticated;
revoke all on public.cv_documents           from anon, authenticated;
revoke all on public.analyses               from anon, authenticated;
revoke all on public.findings               from anon, authenticated;
revoke all on public.generated_improvements from anon, authenticated;
revoke all on public.email_events           from anon, authenticated;
revoke all on public.payments               from anon, authenticated;
revoke all on public.feedback               from anon, authenticated;

-- New tables created later in this schema should not be granted by default.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin read access (optional)
--
-- The admin dashboard reads via the service role after verifying the session
-- email, so these policies are not required for it to work. They are provided
-- so that an authenticated admin can also query directly (for example from
-- the Supabase SQL editor while signed in as themselves) without ever opening
-- the data to ordinary authenticated users.
--
-- Set the admin email once, as a database setting:
--   alter database postgres set app.admin_email = 'you@yourdomain.com';
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    nullif(current_setting('app.admin_email', true), '') is not null
      and lower(coalesce(auth.jwt() ->> 'email', '')) =
          lower(current_setting('app.admin_email', true)),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

grant select on public.leads     to authenticated;
grant select on public.analyses  to authenticated;
grant select on public.findings  to authenticated;
grant select on public.payments  to authenticated;
grant select on public.feedback  to authenticated;

create policy "admin reads leads"
  on public.leads for select to authenticated
  using (public.is_admin());

create policy "admin reads analyses"
  on public.analyses for select to authenticated
  using (public.is_admin());

create policy "admin reads findings"
  on public.findings for select to authenticated
  using (public.is_admin());

create policy "admin reads payments"
  on public.payments for select to authenticated
  using (public.is_admin());

create policy "admin reads feedback"
  on public.feedback for select to authenticated
  using (public.is_admin());

-- Note the omissions: cv_documents (raw CV text), generated_improvements and
-- email_events are never granted to any browser-reachable role, even an
-- admin one. They are reachable only through the server with the service key.

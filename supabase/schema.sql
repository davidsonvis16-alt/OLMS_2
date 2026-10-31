-- ASPIRE SAFETY & HYGIENE SOLUTIONS — LMS schema
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ---------- Companies ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  seats int not null default 0,
  paid_until date,
  join_code text unique not null default upper(encode(gen_random_bytes(8), 'hex')),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  id_number text,
  phone text,
  country text default 'Kenya',
  role text not null default 'learner' check (role in ('learner', 'admin')),
  company_id uuid references public.companies(id) on delete set null,
  company_role text check (company_role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

-- Columns added after launch (safe to re-run).
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Normalised forms used to spot one person on two accounts ("0712 345 678" and "+254712345678" differ, so compare digits;
-- ID numbers ignore spaces, dashes and case).
create or replace function public.norm_phone(t text) returns text language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g'), 9), '')
$$;
create or replace function public.norm_id(t text) returns text language sql immutable as $$
  select nullif(upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- One account per person: a phone number already on another account blocks the sign-up.
  if public.norm_phone(new.raw_user_meta_data->>'phone') is not null and exists (
    select 1 from public.profiles where public.norm_phone(phone) = public.norm_phone(new.raw_user_meta_data->>'phone')
  ) then
    raise exception 'phone_in_use';
  end if;
  insert into public.profiles (id, email, full_name, phone, country, terms_accepted_at)
  values (new.id, new.email, left(new.raw_user_meta_data->>'full_name', 120), left(new.raw_user_meta_data->>'phone', 30),
          coalesce(nullif(left(new.raw_user_meta_data->>'country', 60), ''), 'Kenya'),
          case when new.raw_user_meta_data->>'terms' = 'yes' then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Courses ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null default 'food-safety' check (category in ('food-safety', 'health-safety', 'hospitality')),
  categories text[] not null default '{}',
  summary text,
  topics text[] not null default '{}',
  assignment text,
  slide_count int not null default 0,
  slides_version int not null default 0,
  certificate_price_usd numeric(10,2),
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position int not null,
  title text not null,
  page_from int not null default 1,
  page_to int not null default 1,
  extra_pages int[] not null default '{}',
  video_url text,
  unique (course_id, position)
);

-- Answers live here. Learners never read this table directly; the server grades.
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  position int not null default 0,
  prompt text not null,
  options text[] not null,
  answer int[] not null,
  source text default 'deck',
  review_note text,
  in_final boolean not null default true
);

-- ---------- Learning ----------
create table if not exists public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  viewed_upto int not null default 0,
  quiz_best int,
  completed_at timestamptz,
  primary key (user_id, module_id)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  score int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ---------- Money & certificates ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  purpose text not null check (purpose in ('certificate', 'company_seats')),
  seats int,
  amount numeric(12,2) not null,
  currency text not null,
  amount_usd numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  channel text,
  details jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  serial text unique not null,
  user_id uuid references auth.users(id) on delete set null, -- kept (and still verifiable) if the account is deleted
  course_id uuid not null references public.courses(id) on delete restrict,
  full_name text not null,
  id_number text not null,
  course_title text not null,
  modules text[] not null default '{}',
  score int not null,
  company_name text,
  payment_id uuid references public.payments(id),
  issued_at timestamptz not null default now(),
  revoked boolean not null default false,
  unique (user_id, course_id)
);

create table if not exists public.settings (
  key text primary key,
  value jsonb
);
insert into public.settings (key, value) values ('seat_price_usd', 'null') on conflict do nothing;

-- ---------- Row level security ----------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.questions enable row level security;
alter table public.enrollments enable row level security;
alter table public.module_progress enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.payments enable row level security;
alter table public.certificates enable row level security;
alter table public.settings enable row level security;

-- Profiles: read yourself. No direct updates: every profile change goes through the server, which decides which
-- fields a person may change. (An earlier "update own profile" policy let users rewrite email and company_role.)
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "update own profile" on public.profiles;

-- Catalogue is public when published.
drop policy if exists "read courses" on public.courses;
create policy "read courses" on public.courses for select using (published or public.is_admin());
drop policy if exists "read modules" on public.modules;
create policy "read modules" on public.modules for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.published or public.is_admin())));

-- Questions: admins only (learners get them through the server without answers).
drop policy if exists "admin questions" on public.questions;
create policy "admin questions" on public.questions for select using (public.is_admin());

-- Own learning records.
drop policy if exists "own enrollments" on public.enrollments;
create policy "own enrollments" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own progress" on public.module_progress;
create policy "own progress" on public.module_progress for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own attempts" on public.exam_attempts;
create policy "own attempts" on public.exam_attempts for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own submissions" on public.assignment_submissions;
create policy "own submissions" on public.assignment_submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own certificates" on public.certificates;
create policy "own certificates" on public.certificates for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "company read" on public.companies;
create policy "company read" on public.companies for select using (
  owner_id = auth.uid() or public.is_admin()
  or id = (select company_id from public.profiles where profiles.id = auth.uid()));
drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings for select using (true);

-- All writes go through the server with the service role key.

-- Invite codes: 16 hex characters (64 bits) for new companies; existing codes keep working.
alter table public.companies alter column join_code set default upper(encode(gen_random_bytes(8), 'hex'));

-- ---------- Rate limits (server only) ----------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security; -- no policies: only the service role can touch it

create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into c;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '2 days'; end if;
  return c <= p_max;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- ---------- Storage: slide images ----------
insert into storage.buckets (id, name, public) values ('slides', 'slides', true) on conflict (id) do nothing;

-- Admins upload slide images from the browser (admin > course > upload slides).
drop policy if exists "admin read slides" on storage.objects;
create policy "admin read slides" on storage.objects for select to authenticated using (bucket_id = 'slides' and public.is_admin());
drop policy if exists "admin upload slides" on storage.objects;
create policy "admin upload slides" on storage.objects for insert to authenticated with check (bucket_id = 'slides' and public.is_admin());
drop policy if exists "admin update slides" on storage.objects;
create policy "admin update slides" on storage.objects for update to authenticated using (bucket_id = 'slides' and public.is_admin());
drop policy if exists "admin delete slides" on storage.objects;
create policy "admin delete slides" on storage.objects for delete to authenticated using (bucket_id = 'slides' and public.is_admin());

-- ---------- One account per person ----------
-- Which identity detail (if any) already belongs to another account. Server only.
create or replace function public.identity_taken(p_user uuid, p_id_number text, p_phone text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when public.norm_id(p_id_number) is not null and exists (select 1 from public.profiles where id <> p_user and public.norm_id(id_number) = public.norm_id(p_id_number)) then 'id_number'
    when public.norm_phone(p_phone) is not null and exists (select 1 from public.profiles where id <> p_user and public.norm_phone(phone) = public.norm_phone(p_phone)) then 'phone'
  end
$$;
revoke all on function public.identity_taken(uuid, text, text) from public, anon, authenticated;
grant execute on function public.identity_taken(uuid, text, text) to service_role;

-- A database-level lock as well, switched on once no two accounts already share a detail.
do $$ begin
  if exists (select 1 from public.profiles where public.norm_id(id_number) is not null group by public.norm_id(id_number) having count(*) > 1) then
    raise notice 'Two accounts share an ID number. Fix them in Admin > Learners (marked "Shared"), then run this file again.';
  else
    create unique index if not exists profiles_one_per_id on public.profiles (public.norm_id(id_number)) where public.norm_id(id_number) is not null;
  end if;
  if exists (select 1 from public.profiles where public.norm_phone(phone) is not null group by public.norm_phone(phone) having count(*) > 1) then
    raise notice 'Two accounts share a phone number. Fix them in Admin > Learners (marked "Shared"), then run this file again.';
  else
    create unique index if not exists profiles_one_per_phone on public.profiles (public.norm_phone(phone)) where public.norm_phone(phone) is not null;
  end if;
end $$;

-- ---------- Deleting an account keeps its issued certificates verifiable ----------
alter table public.certificates alter column user_id drop not null;
alter table public.certificates drop constraint if exists certificates_user_id_fkey;
alter table public.certificates add constraint certificates_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

-- ---------- Open tests ----------
-- While a learner has a test open in a course, that course's slides are closed to them until they submit it.
create table if not exists public.test_locks (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade, -- null = the final assessment
  started_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
alter table public.test_locks enable row level security; -- no policies: only the server can read or change it

-- ---------- Company account history ----------
-- One shared log for each company account: the owner and Aspire admins read the same entries. Entries are only added
-- (by the server); deleting a company keeps its history, with the company name, for the record.
create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  at timestamptz not null default now(),
  actor text not null,
  by_admin boolean not null default false,
  kind text not null,
  detail text not null
);
create index if not exists company_events_company_at on public.company_events (company_id, at desc);
alter table public.company_events enable row level security;
-- No policies: only the server (service key) reads and writes this table.

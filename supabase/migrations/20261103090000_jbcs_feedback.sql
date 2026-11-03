create table if not exists public.jbcs_feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  service text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.jbcs_feedback enable row level security;
revoke all on public.jbcs_feedback from anon, authenticated;
grant select, insert, update, delete on public.jbcs_feedback to service_role;

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

create table if not exists public.jbcs_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text not null,
  website_url text,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jbcs_clients_name_not_blank check (length(trim(name)) > 0),
  constraint jbcs_clients_logo_url_not_blank check (length(trim(logo_url)) > 0),
  constraint jbcs_clients_website_url_format check (website_url is null or website_url ~* '^https?://')
);
create index if not exists jbcs_clients_published_sort_idx on public.jbcs_clients (is_published, sort_order, name);
alter table public.jbcs_clients enable row level security;
revoke all on public.jbcs_clients from anon, authenticated;
grant select, insert, update, delete on public.jbcs_clients to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jbcs-website-media', 'jbcs-website-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;;

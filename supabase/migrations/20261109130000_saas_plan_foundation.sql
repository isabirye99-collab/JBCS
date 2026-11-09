-- JBCS SaaS subscription foundation: free Basic and annual Pro plans.
-- Apply only after reviewing this migration and confirming the target environment.

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  description text not null default '',
  price_amount numeric(12,2),
  currency char(3) not null default 'UGX',
  billing_interval text not null default 'annual' check (billing_interval = 'annual'),
  max_users integer,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_plans_price_nonnegative check (price_amount is null or price_amount >= 0),
  constraint saas_plans_users_positive check (max_users is null or max_users >= 1)
);

insert into public.saas_plans
  (plan_key, name, description, price_amount, currency, billing_interval, max_users, features, sort_order)
values
  ('basic', 'Basic', 'Free plan for invoicing, sales and expense recording.', 0, 'UGX', 'annual', 1,
   '{"invoicing":true,"quotes":true,"sales":true,"expenses":true,"basic_dashboard":true,"full_accounting":false,"advanced_reports":false}'::jsonb, 1),
  ('pro', 'Pro Accounting', 'Paid annual plan for full accounting and advanced reporting.', null, 'UGX', 'annual', null,
   '{"invoicing":true,"quotes":true,"sales":true,"expenses":true,"basic_dashboard":true,"full_accounting":true,"advanced_reports":true,"bank_reconciliation":true}'::jsonb, 2)
on conflict (plan_key) do update set
  name = excluded.name,
  description = excluded.description,
  billing_interval = excluded.billing_interval,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.workspace_subscriptions
  add column if not exists plan_key text not null default 'basic';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workspace_subscriptions_plan_key_fkey'
      and conrelid = 'public.workspace_subscriptions'::regclass
  ) then
    alter table public.workspace_subscriptions
      add constraint workspace_subscriptions_plan_key_fkey
      foreign key (plan_key) references public.saas_plans(plan_key);
  end if;
end $$;

alter table public.saas_plans enable row level security;
revoke all on public.saas_plans from anon, authenticated;
grant select, insert, update, delete on public.saas_plans to service_role;

comment on table public.saas_plans is 'JBCS SaaS plans. Read and manage through trusted server-side APIs only.';
comment on column public.workspace_subscriptions.plan_key is 'SaaS plan assigned to the workspace; Basic is the free one-user plan.';

-- New signups start on the free Basic plan; no trial is required to use Basic.
-- Existing workspaces and their subscription rows are not rewritten.
create or replace function public.provision_saas_workspace(
  p_user_id uuid,
  p_company_name text,
  p_billing_currency text default 'UGX'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_workspace_id uuid;
  v_slug text;
  v_name text;
  v_currency text;
begin
  if p_user_id is null then
    raise exception 'Authenticated user is required';
  end if;

  v_name := nullif(trim(p_company_name), '');
  if v_name is null or length(v_name) > 140 then
    raise exception 'Company name must be between 1 and 140 characters';
  end if;

  v_currency := upper(coalesce(nullif(trim(p_billing_currency), ''), 'UGX'));
  if v_currency not in ('UGX', 'USD') then
    raise exception 'Billing currency must be UGX or USD';
  end if;

  v_slug := trim(both '-' from left(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), 40));
  if v_slug = '' then v_slug := 'business'; end if;
  v_slug := v_slug || '-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.business_workspaces(slug, name, workspace_type, base_currency, is_active)
  values (v_slug, v_name, 'consultancy', 'UGX', true)
  returning id into v_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role, is_active)
  values (v_workspace_id, p_user_id, 'owner', true);

  insert into public.workspace_subscriptions(
    workspace_id, billing_interval, billing_currency, status,
    trial_started_at, trial_ends_at, plan_key
  )
  values (v_workspace_id, 'annual', v_currency, 'active', now(), now(), 'basic');

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'workspace_slug', v_slug,
    'workspace_name', v_name,
    'plan_key', 'basic',
    'max_users', 1,
    'billing_interval', 'annual',
    'billing_currency', v_currency,
    'subscription_status', 'active'
  );
end;
$function$;

-- Enforce the Basic plan's single active user at database level.
create or replace function public.enforce_workspace_member_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan_key text := 'basic';
  v_status text;
  v_trial_end timestamptz;
  v_period_end timestamptz;
  v_max_users integer;
  v_active_users bigint;
begin
  if new.is_active is distinct from true then
    return new;
  end if;

  select s.plan_key, s.status, s.trial_ends_at, s.current_period_ends_at
    into v_plan_key, v_status, v_trial_end, v_period_end
  from public.workspace_subscriptions s
  where s.workspace_id = new.workspace_id
  order by s.created_at desc
  limit 1;

  if v_status = 'trialing' and v_trial_end > now() then
    v_plan_key := 'pro';
  elsif v_status = 'active' and (v_period_end is null or v_period_end > now()) then
    v_plan_key := coalesce(v_plan_key, 'basic');
  else
    v_plan_key := 'basic';
  end if;

  select p.max_users into v_max_users
  from public.saas_plans p
  where p.plan_key = coalesce(v_plan_key, 'basic') and p.is_active = true
  limit 1;

  if v_max_users is not null then
    select count(*) into v_active_users
    from public.workspace_members m
    where m.workspace_id = new.workspace_id and m.is_active = true;

    if v_active_users >= v_max_users then
      raise exception 'This workspace plan allows a maximum of % active user(s). Upgrade the subscription to add more users.', v_max_users
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_workspace_member_limit_before_insert on public.workspace_members;
create trigger enforce_workspace_member_limit_before_insert
before insert or update of is_active, workspace_id on public.workspace_members
for each row execute function public.enforce_workspace_member_limit();

revoke all on function public.enforce_workspace_member_limit() from public, anon, authenticated;

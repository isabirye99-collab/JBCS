-- SaaS tenant provisioning and annual-trial subscription foundation.
-- This migration is intentionally staged for review; do not apply to production yet.

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.business_workspaces(id) on delete cascade,
  billing_interval text not null default 'annual' check (billing_interval = 'annual'),
  billing_currency char(3) not null check (billing_currency in ('UGX','USD')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','cancelled','expired','pending_payment')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trial_ends_at > trial_started_at),
  check (current_period_ends_at is null or current_period_starts_at is null or current_period_ends_at > current_period_starts_at)
);

create index if not exists workspace_subscriptions_status_trial_idx
  on public.workspace_subscriptions(status, trial_ends_at);

alter table public.workspace_subscriptions enable row level security;
revoke all on public.workspace_subscriptions from anon, authenticated;
grant all on public.workspace_subscriptions to service_role;

-- Called only by trusted server-side signup code using the service role key.
-- It creates a tenant and owner membership atomically, without creating financial records.
create or replace function public.provision_saas_workspace(
  p_user_id uuid,
  p_company_name text,
  p_billing_currency text default 'UGX'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_slug text;
  v_name text;
  v_currency text;
  v_base text;
begin
  if p_user_id is null then raise exception 'Authenticated user is required'; end if;
  v_name := nullif(trim(p_company_name), '');
  if v_name is null or length(v_name) > 140 then raise exception 'Company name must be between 1 and 140 characters'; end if;
  v_currency := upper(coalesce(nullif(trim(p_billing_currency), ''), 'UGX'));
  if v_currency not in ('UGX','USD') then raise exception 'Billing currency must be UGX or USD'; end if;

  -- Stable, unique slug with a random suffix; never use a user-provided slug directly.
  v_slug := left(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), 40);
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'business'; end if;
  v_slug := v_slug || '-' || replace(gen_random_uuid()::text, '-', '')::text;

  insert into public.business_workspaces(slug, name, workspace_type, base_currency, is_active)
  values (v_slug, v_name, 'consultancy', 'UGX', true)
  returning id into v_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role, is_active)
  values (v_workspace_id, p_user_id, 'owner', true);

  insert into public.workspace_subscriptions(workspace_id, billing_interval, billing_currency, status)
  values (v_workspace_id, 'annual', v_currency, 'trialing');

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'workspace_slug', v_slug,
    'workspace_name', v_name,
    'trial_days', 14,
    'billing_interval', 'annual',
    'billing_currency', v_currency,
    'subscription_status', 'trialing'
  );
end;
$$;

revoke all on function public.provision_saas_workspace(uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_saas_workspace(uuid, text, text) to service_role;

comment on table public.workspace_subscriptions is 'SaaS subscription state. Payment provider activation must be verified server-side from signed provider webhooks.';
comment on function public.provision_saas_workspace(uuid, text, text) is 'Atomically provisions a tenant, owner membership, and 14-day annual-plan trial. Service-role only.';

create table if not exists public.recurring_invoice_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  contact_id uuid not null references public.business_contacts(id),
  name text not null,
  currency text not null default 'UGX' check (currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 100),
  notes text,
  frequency text not null check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_run_date date not null,
  end_date date,
  is_active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= next_run_date)
);

create table if not exists public.recurring_expense_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  supplier_contact_id uuid references public.business_contacts(id),
  name text not null,
  category text not null,
  description text not null,
  amount numeric(20,2) not null check (amount > 0),
  currency text not null default 'UGX' check (currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  payment_method text not null default 'other' check (payment_method in ('cash','bank_transfer','mobile_money','card','cheque','other')),
  notes text,
  frequency text not null check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_run_date date not null,
  end_date date,
  is_active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= next_run_date)
);

create index if not exists recurring_invoice_templates_due_idx
  on public.recurring_invoice_templates (workspace_id, next_run_date)
  where is_active = true;
create index if not exists recurring_expense_templates_due_idx
  on public.recurring_expense_templates (workspace_id, next_run_date)
  where is_active = true;

alter table public.recurring_invoice_templates enable row level security;
alter table public.recurring_expense_templates enable row level security;
revoke all on public.recurring_invoice_templates from anon, authenticated;
revoke all on public.recurring_expense_templates from anon, authenticated;

comment on table public.recurring_invoice_templates is 'Templates for scheduled invoice generation; processing must be server-side and idempotent.';
comment on table public.recurring_expense_templates is 'Templates for scheduled expense generation; processing must be server-side and idempotent.';

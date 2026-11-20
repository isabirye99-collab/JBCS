-- Money owed register for JBCS Finance.
-- Deliberately does not reclassify existing expenses or apply any production changes.
create table if not exists public.business_obligations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  obligation_type text not null check (obligation_type in ('loan', 'payable', 'land_debt', 'other')),
  lender_type text not null default 'other' check (lender_type in ('bank', 'financial_institution', 'individual', 'director', 'shareholder', 'supplier', 'land_seller', 'other')),
  lender_name text not null,
  lender_contact text,
  reference_number text,
  description text not null,
  currency char(3) not null default 'UGX',
  original_amount numeric(18,2) not null check (original_amount > 0),
  outstanding_amount numeric(18,2) not null check (outstanding_amount >= 0),
  interest_rate numeric(8,4),
  interest_type text not null default 'unspecified' check (interest_type in ('unspecified', 'interest_free', 'fixed', 'annual_rate')),
  received_or_incurred_date date not null default current_date,
  due_date date,
  repayment_frequency text not null default 'flexible' check (repayment_frequency in ('flexible', 'weekly', 'monthly', 'quarterly', 'annually', 'one_off')),
  status text not null default 'open' check (status in ('open', 'partially_paid', 'overdue', 'settled', 'disputed', 'written_off')),
  source_expense_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_obligations_amount_consistent check (outstanding_amount <= original_amount)
);
create index if not exists business_obligations_workspace_status_idx
  on public.business_obligations (workspace_id, status, due_date);
create index if not exists business_obligations_workspace_lender_idx
  on public.business_obligations (workspace_id, lender_name);
create unique index if not exists business_obligations_workspace_source_expense_uidx
  on public.business_obligations (workspace_id, source_expense_id)
  where source_expense_id is not null;

create table if not exists public.business_obligation_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  obligation_id uuid not null references public.business_obligations(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'UGX',
  payment_method text not null default 'other',
  payment_reference text,
  principal_amount numeric(18,2),
  interest_amount numeric(18,2),
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists business_obligation_payments_workspace_obligation_idx
  on public.business_obligation_payments (workspace_id, obligation_id, payment_date desc);

alter table public.business_obligations enable row level security;
alter table public.business_obligation_payments enable row level security;
-- Access is through the server API using the service role and an explicit workspace_id filter.

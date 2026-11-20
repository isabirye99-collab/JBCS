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


-- Record a repayment and update the obligation atomically, avoiding split writes.
create or replace function public.record_business_obligation_payment(
  p_workspace_id uuid,
  p_obligation_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_principal_amount numeric,
  p_interest_amount numeric,
  p_payment_method text,
  p_payment_reference text,
  p_notes text,
  p_recorded_by uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligation public.business_obligations%rowtype;
  v_remaining numeric(18,2);
  v_payment public.business_obligation_payments%rowtype;
  v_status text;
begin
  if p_amount is null or p_amount <= 0
     or p_principal_amount is null or p_principal_amount < 0
     or p_interest_amount is null or p_interest_amount < 0
     or round(p_principal_amount + p_interest_amount, 2) <> round(p_amount, 2) then
    raise exception 'Payment amount must equal principal plus interest.';
  end if;

  select * into v_obligation
    from public.business_obligations
   where id = p_obligation_id and workspace_id = p_workspace_id
   for update;

  if not found then raise exception 'Obligation not found in this workspace.'; end if;
  if p_principal_amount > v_obligation.outstanding_amount then
    raise exception 'Principal payment cannot exceed the outstanding balance.';
  end if;
  if v_obligation.status in ('settled', 'written_off') then
    raise exception 'This obligation is already settled or written off.';
  end if;

  v_remaining := v_obligation.outstanding_amount - p_principal_amount;
  v_status := case
    when v_remaining = 0 then 'settled'
    when v_obligation.due_date is not null and v_obligation.due_date < coalesce(p_payment_date, current_date) then 'overdue'
    else 'partially_paid'
  end;

  insert into public.business_obligation_payments (
    workspace_id, obligation_id, payment_date, amount, currency, payment_method,
    payment_reference, principal_amount, interest_amount, notes, recorded_by
  ) values (
    p_workspace_id, p_obligation_id, coalesce(p_payment_date, current_date), p_amount,
    v_obligation.currency, coalesce(nullif(p_payment_method, ''), 'other'),
    nullif(p_payment_reference, ''), p_principal_amount, p_interest_amount,
    nullif(p_notes, ''), p_recorded_by
  ) returning * into v_payment;

  update public.business_obligations
     set outstanding_amount = v_remaining, status = v_status, updated_at = now()
   where id = p_obligation_id and workspace_id = p_workspace_id;

  return jsonb_build_object('payment', to_jsonb(v_payment), 'outstanding_amount', v_remaining, 'status', v_status);
end;
$$;

revoke all on function public.record_business_obligation_payment(uuid, uuid, date, numeric, numeric, numeric, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_business_obligation_payment(uuid, uuid, date, numeric, numeric, numeric, text, text, text, uuid) to service_role;


-- Keep explicit review decisions for existing expenses that are not outstanding payables.
-- This prevents paid expenses and already-recorded loan repayments from repeatedly
-- appearing as candidates for conversion into a liability.
create table if not exists public.business_expense_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  expense_id uuid not null,
  classification text not null check (classification in ('already_paid', 'ordinary_expense', 'loan_repayment')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint business_expense_reviews_workspace_expense_key unique (workspace_id, expense_id)
);
create index if not exists business_expense_reviews_workspace_classification_idx
  on public.business_expense_reviews (workspace_id, classification);
alter table public.business_expense_reviews enable row level security;
grant select, insert, update, delete on public.business_obligations to service_role;
grant select, insert, update, delete on public.business_obligation_payments to service_role;
grant select, insert, update, delete on public.business_expense_reviews to service_role;

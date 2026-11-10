-- JBCS accounting suite expansion. All records are workspace-scoped and accessed server-side.
create table if not exists public.catalog_items (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
 item_code text not null,
 item_type text not null check(item_type in ('product','service')),
 name text not null,
 description text,
 category text,
 unit text not null default 'unit',
 unit_price numeric(18,2) not null default 0 check(unit_price>=0),
 currency char(3) not null default 'UGX',
 tax_rate numeric(7,4) not null default 0 check(tax_rate>=0 and tax_rate<=100),
 tax_inclusive boolean not null default false,
 is_active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,item_code)
);
create index if not exists catalog_items_workspace_name_idx on public.catalog_items(workspace_id,name);
create table if not exists public.credit_notes (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
 invoice_id uuid not null references public.invoices(id) on delete restrict,
 credit_note_number text not null,
 issue_date date not null default current_date,
 reason text not null,
 amount numeric(18,2) not null check(amount>0),
 currency char(3) not null default 'UGX',
 status text not null default 'draft' check(status in ('draft','issued','void')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(workspace_id,credit_note_number)
);
create table if not exists public.recurring_finance_templates (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
 template_type text not null check(template_type in ('invoice','expense')),
 name text not null,
 contact_id uuid references public.business_contacts(id) on delete restrict,
 description text,
 amount numeric(18,2) not null check(amount>=0),
 currency char(3) not null default 'UGX',
 frequency text not null check(frequency in ('weekly','monthly','quarterly','yearly')),
 next_run_date date not null,
 is_active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.time_entries (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
 contact_id uuid references public.business_contacts(id) on delete restrict,
 project_name text not null,
 description text,
 work_date date not null default current_date,
 hours numeric(8,2) not null check(hours>0),
 hourly_rate numeric(18,2) not null default 0 check(hourly_rate>=0),
 currency char(3) not null default 'UGX',
 billable boolean not null default true,
 invoiced boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.sales_receipts (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
 receipt_number text not null,
 contact_id uuid references public.business_contacts(id) on delete restrict,
 receipt_date date not null default current_date,
 amount numeric(18,2) not null check(amount>0),
 currency char(3) not null default 'UGX',
 payment_method text not null check(payment_method in ('cash','bank_transfer','mobile_money','card','cheque','other')),
 reference text,
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(workspace_id,receipt_number)
);
alter table public.catalog_items enable row level security;
alter table public.credit_notes enable row level security;
alter table public.recurring_finance_templates enable row level security;
alter table public.time_entries enable row level security;
alter table public.sales_receipts enable row level security;
revoke all on public.catalog_items,public.credit_notes,public.recurring_finance_templates,public.time_entries,public.sales_receipts from anon,authenticated;
grant all on public.catalog_items,public.credit_notes,public.recurring_finance_templates,public.time_entries,public.sales_receipts to service_role;

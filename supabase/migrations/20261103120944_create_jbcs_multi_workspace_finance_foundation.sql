
create extension if not exists pgcrypto;

create table public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  workspace_type text not null check (workspace_type in ('consultancy','medical_center')),
  base_currency char(3) not null default 'UGX',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','finance','staff','clinician','receptionist','inventory')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.business_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  contact_type text not null check (contact_type in ('client','supplier','other')),
  name text not null,
  email text,
  phone text,
  address text,
  tax_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  quote_number text not null,
  contact_id uuid references public.business_contacts(id) on delete restrict,
  issue_date date not null default current_date,
  valid_until date,
  currency char(3) not null default 'UGX',
  exchange_rate numeric(18,6) not null default 1 check (exchange_rate > 0),
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total numeric(18,2) not null default 0 check (total >= 0),
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired','converted')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, quote_number)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  invoice_number text not null,
  contact_id uuid references public.business_contacts(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'UGX',
  exchange_rate numeric(18,6) not null default 1 check (exchange_rate > 0),
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total numeric(18,2) not null default 0 check (total >= 0),
  amount_paid numeric(18,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'draft' check (status in ('draft','sent','part_paid','paid','overdue','void')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table public.document_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  document_type text not null check (document_type in ('quote','invoice')),
  quote_id uuid references public.quotes(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  line_total numeric(18,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  check (
    (document_type = 'quote' and quote_id is not null and invoice_id is null)
    or
    (document_type = 'invoice' and invoice_id is not null and quote_id is null)
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete restrict,
  payment_reference text,
  payment_date date not null default current_date,
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'UGX',
  exchange_rate numeric(18,6) not null default 1 check (exchange_rate > 0),
  method text not null check (method in ('cash','bank_transfer','mobile_money','card','cheque','other')),
  notes text,
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  supplier_contact_id uuid references public.business_contacts(id) on delete restrict,
  amount numeric(18,2) not null check (amount >= 0),
  currency char(3) not null default 'UGX',
  exchange_rate numeric(18,6) not null default 1 check (exchange_rate > 0),
  payment_method text check (payment_method in ('cash','bank_transfer','mobile_money','card','cheque','other')),
  receipt_url text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  patient_number text not null,
  full_name text not null,
  date_of_birth date,
  sex text check (sex in ('female','male','other','undisclosed')),
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  clinical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, patient_number)
);

create table public.clinic_appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_at timestamptz not null,
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled','checked_in','completed','cancelled','no_show')),
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_charges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.clinic_appointments(id) on delete set null,
  charge_date date not null default current_date,
  description text not null,
  quantity numeric(18,3) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  currency char(3) not null default 'UGX',
  status text not null default 'unpaid' check (status in ('unpaid','part_paid','paid','void')),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.clinic_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  charge_id uuid references public.clinic_charges(id) on delete restrict,
  receipt_number text not null,
  receipt_date timestamptz not null default now(),
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'UGX',
  payment_method text not null check (payment_method in ('cash','mobile_money','bank_transfer','card','other')),
  transaction_reference text,
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, receipt_number)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  item_name text not null,
  item_type text not null default 'supply' check (item_type in ('medicine','medical_supply','office_supply','other')),
  sku text,
  unit text not null default 'unit',
  quantity_on_hand numeric(18,3) not null default 0,
  reorder_level numeric(18,3) not null default 0,
  unit_cost numeric(18,2) not null default 0,
  currency char(3) not null default 'UGX',
  expiry_date date,
  supplier_contact_id uuid references public.business_contacts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sku)
);

create table public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete restrict,
  reconciliation_date date not null default current_date,
  opening_balance numeric(18,2) not null default 0,
  cash_received numeric(18,2) not null default 0,
  cash_paid_out numeric(18,2) not null default 0,
  expected_closing_balance numeric(18,2) not null default 0,
  actual_closing_balance numeric(18,2) not null default 0,
  variance numeric(18,2) not null default 0,
  notes text,
  reconciled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, reconciliation_date, reconciled_by)
);

create index business_contacts_workspace_idx on public.business_contacts(workspace_id, contact_type, name);
create index quotes_workspace_date_idx on public.quotes(workspace_id, issue_date desc);
create index invoices_workspace_date_idx on public.invoices(workspace_id, issue_date desc);
create index invoices_workspace_status_idx on public.invoices(workspace_id, status);
create index payments_workspace_date_idx on public.payments(workspace_id, payment_date desc);
create index expenses_workspace_date_idx on public.expenses(workspace_id, expense_date desc);
create index patients_workspace_name_idx on public.patients(workspace_id, full_name);
create index appointments_workspace_time_idx on public.clinic_appointments(workspace_id, appointment_at);
create index clinic_charges_patient_idx on public.clinic_charges(workspace_id, patient_id, charge_date desc);
create index clinic_receipts_date_idx on public.clinic_receipts(workspace_id, receipt_date desc);
create index inventory_workspace_name_idx on public.inventory_items(workspace_id, item_name);

alter table public.business_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.business_contacts enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.document_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.patients enable row level security;
alter table public.clinic_appointments enable row level security;
alter table public.clinic_charges enable row level security;
alter table public.clinic_receipts enable row level security;
alter table public.inventory_items enable row level security;
alter table public.cash_reconciliations enable row level security;

revoke all on public.business_workspaces, public.workspace_members, public.business_contacts,
  public.quotes, public.invoices, public.document_items, public.payments, public.expenses,
  public.patients, public.clinic_appointments, public.clinic_charges, public.clinic_receipts,
  public.inventory_items, public.cash_reconciliations from anon, authenticated;

grant all on public.business_workspaces, public.workspace_members, public.business_contacts,
  public.quotes, public.invoices, public.document_items, public.payments, public.expenses,
  public.patients, public.clinic_appointments, public.clinic_charges, public.clinic_receipts,
  public.inventory_items, public.cash_reconciliations to service_role;

insert into public.business_workspaces (slug, name, workspace_type, base_currency)
values
  ('jbcs', 'Johden Business Consultancy Services', 'consultancy', 'UGX'),
  ('johnpaul-medical-center', 'Johnpaul Medical Center', 'medical_center', 'UGX')
on conflict (slug) do nothing;
;

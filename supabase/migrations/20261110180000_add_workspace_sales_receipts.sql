-- Add a separate direct-sales receipt ledger. Existing invoice payments remain in public.payments.
create table if not exists public.sales_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  receipt_number text not null,
  contact_id uuid,
  sale_date date not null default current_date,
  currency char(3) not null default 'UGX' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total numeric(18,2) not null default 0 check (total >= 0),
  payment_method text not null check (payment_method in ('cash','bank_transfer','mobile_money','card','cheque','other')),
  payment_reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_receipts_workspace_receipt_number_unique unique (workspace_id, receipt_number),
  constraint sales_receipts_contact_workspace_fk foreign key (contact_id, workspace_id)
    references public.business_contacts(id, workspace_id) on delete set null
);
create table if not exists public.sales_receipt_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  sales_receipt_id uuid not null references public.sales_receipts(id) on delete cascade,
  description text not null,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  line_total numeric(18,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists sales_receipts_workspace_date_idx on public.sales_receipts(workspace_id, sale_date desc);
create index if not exists sales_receipt_items_receipt_idx on public.sales_receipt_items(workspace_id, sales_receipt_id);
alter table public.sales_receipts enable row level security;
alter table public.sales_receipt_items enable row level security;
drop policy if exists sales_receipts_workspace_member_select on public.sales_receipts;
create policy sales_receipts_workspace_member_select on public.sales_receipts for select to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipts.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipts_workspace_member_insert on public.sales_receipts;
create policy sales_receipts_workspace_member_insert on public.sales_receipts for insert to authenticated with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipts.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipts_workspace_member_update on public.sales_receipts;
create policy sales_receipts_workspace_member_update on public.sales_receipts for update to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipts.workspace_id and wm.user_id = auth.uid() and wm.is_active)
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipts.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipts_workspace_member_delete on public.sales_receipts;
create policy sales_receipts_workspace_member_delete on public.sales_receipts for delete to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipts.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipt_items_workspace_member_select on public.sales_receipt_items;
create policy sales_receipt_items_workspace_member_select on public.sales_receipt_items for select to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipt_items.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipt_items_workspace_member_insert on public.sales_receipt_items;
create policy sales_receipt_items_workspace_member_insert on public.sales_receipt_items for insert to authenticated with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipt_items.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipt_items_workspace_member_update on public.sales_receipt_items;
create policy sales_receipt_items_workspace_member_update on public.sales_receipt_items for update to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipt_items.workspace_id and wm.user_id = auth.uid() and wm.is_active)
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipt_items.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);
drop policy if exists sales_receipt_items_workspace_member_delete on public.sales_receipt_items;
create policy sales_receipt_items_workspace_member_delete on public.sales_receipt_items for delete to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = sales_receipt_items.workspace_id and wm.user_id = auth.uid() and wm.is_active)
);

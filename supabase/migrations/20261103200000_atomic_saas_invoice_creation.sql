-- Atomic invoice + line-item creation for the public SaaS finance API.
-- Keep this staged for review; do not apply to production without approval.

create or replace function public.create_workspace_invoice(
  p_workspace_id uuid,
  p_created_by uuid,
  p_contact_id uuid,
  p_invoice_number text,
  p_issue_date date,
  p_due_date date,
  p_currency text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_item jsonb;
  v_description text;
  v_quantity numeric(18,3);
  v_unit_price numeric(18,2);
  v_tax_rate numeric(7,4);
  v_base numeric(18,2);
  v_tax numeric(18,2);
  v_line_total numeric(18,2);
  v_subtotal numeric(18,2) := 0;
  v_tax_amount numeric(18,2) := 0;
  v_count integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if p_workspace_id is null or p_created_by is null or p_contact_id is null then
    raise exception 'Workspace, creator and customer are required';
  end if;
  if p_invoice_number is null or length(trim(p_invoice_number)) = 0 then
    raise exception 'Invoice number is required';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid invoice currency';
  end if;
  if p_due_date is not null and p_due_date < p_issue_date then
    raise exception 'Due date cannot be earlier than issue date';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Invoice must contain between 1 and 100 items';
  end if;

  -- Recheck tenant ownership inside the same transaction as invoice creation.
  if not exists (
    select 1 from public.business_contacts c
    where c.id = p_contact_id and c.workspace_id = p_workspace_id and c.contact_type = 'client'
  ) then
    raise exception 'Customer does not belong to this workspace';
  end if;
  if not exists (
    select 1 from public.workspace_members m
    join public.business_workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id and m.user_id = p_created_by
      and m.is_active and w.is_active and m.role in ('owner','admin','finance')
  ) then
    raise exception 'User is not authorized to create invoices for this workspace';
  end if;

  insert into public.invoices (
    workspace_id, invoice_number, contact_id, issue_date, due_date, currency,
    exchange_rate, subtotal, tax_amount, total, amount_paid, status, notes, created_by
  ) values (
    p_workspace_id, p_invoice_number, p_contact_id, p_issue_date, p_due_date, p_currency,
    1, 0, 0, 0, 0, 'draft', nullif(trim(p_notes), ''), p_created_by
  ) returning * into v_invoice;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_description := nullif(trim(v_item->>'description'), '');
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_tax_rate := coalesce((v_item->>'tax_rate')::numeric, 0);

    if v_description is null or v_quantity is null or v_quantity <= 0
       or v_unit_price is null or v_unit_price < 0
       or v_tax_rate < 0 or v_tax_rate > 100 then
      raise exception 'Invalid invoice item values';
    end if;

    v_base := round(v_quantity * v_unit_price, 2);
    v_tax := round(v_base * v_tax_rate / 100, 2);
    v_line_total := v_base + v_tax;
    v_subtotal := v_subtotal + v_base;
    v_tax_amount := v_tax_amount + v_tax;

    insert into public.document_items (
      workspace_id, document_type, invoice_id, quote_id,
      description, quantity, unit_price, tax_rate, line_total
    ) values (
      p_workspace_id, 'invoice', v_invoice.id, null,
      v_description, v_quantity, v_unit_price, v_tax_rate, v_line_total
    );

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'description', v_description, 'quantity', v_quantity,
      'unit_price', v_unit_price, 'tax_rate', v_tax_rate, 'line_total', v_line_total
    ));
    v_count := v_count + 1;
  end loop;

  update public.invoices
  set subtotal = v_subtotal, tax_amount = v_tax_amount, total = v_subtotal + v_tax_amount, updated_at = now()
  where id = v_invoice.id
  returning * into v_invoice;

  return jsonb_build_object(
    'invoice', to_jsonb(v_invoice),
    'document_items', v_items
  );
end;
$$;

revoke all on function public.create_workspace_invoice(uuid, uuid, uuid, text, date, date, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_workspace_invoice(uuid, uuid, uuid, text, date, date, text, text, jsonb) to service_role;
comment on function public.create_workspace_invoice(uuid, uuid, uuid, text, date, date, text, text, jsonb)
  is 'Atomically creates a draft invoice and its line items after verifying workspace membership and customer ownership. Service-role only.';

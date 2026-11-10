-- Safe, workspace-scoped edit path for supplier payment register records.
-- Locks the payment and linked expense while validating the updated allocation.
create or replace function public.update_workspace_supplier_payment(
  p_workspace_id uuid,
  p_payment_id uuid,
  p_supplier_contact_id uuid,
  p_expense_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_payment_reference text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_payment public.supplier_payments%rowtype;
  v_supplier public.business_contacts%rowtype;
  v_expense public.expenses%rowtype;
  v_invoice public.invoices%rowtype;
  v_other_paid numeric(18,2);
  v_currency text := upper(trim(p_currency));
  v_method text := lower(trim(p_payment_method));
  v_date date := coalesce(p_payment_date, current_date);
begin
  if p_workspace_id is null or p_payment_id is null or p_supplier_contact_id is null then
    raise exception 'Choose a payment and supplier.';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000000 or p_amount <> round(p_amount, 2) then
    raise exception 'Payment amount must be positive and use no more than two decimal places.';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter code.';
  end if;
  if v_method not in ('cash','bank_transfer','mobile_money','card','cheque','other') then
    raise exception 'Invalid payment method.';
  end if;

  select * into v_payment
  from public.supplier_payments
  where id = p_payment_id and workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception 'Supplier payment was not found in this workspace.';
  end if;

  select * into v_supplier
  from public.business_contacts
  where id = p_supplier_contact_id
    and workspace_id = p_workspace_id
    and (contact_type = 'supplier' or coalesce(is_supplier, false) = true);
  if not found then
    raise exception 'Choose a supplier belonging to this workspace.';
  end if;

  if p_expense_id is not null then
    select * into v_expense
    from public.expenses
    where id = p_expense_id and workspace_id = p_workspace_id
    for update;
    if not found then
      raise exception 'The linked expense was not found in this workspace.';
    end if;
    if v_expense.supplier_contact_id is distinct from p_supplier_contact_id then
      raise exception 'The linked expense must belong to the selected supplier.';
    end if;
    if upper(trim(v_expense.currency::text)) <> v_currency then
      raise exception 'Payment currency must match the linked expense currency.';
    end if;
    select coalesce(sum(amount), 0) into v_other_paid
    from public.supplier_payments
    where workspace_id = p_workspace_id
      and expense_id = p_expense_id
      and id <> p_payment_id;
    if v_other_paid + p_amount > v_expense.amount then
      raise exception 'Payment exceeds the outstanding balance on this expense.';
    end if;
  end if;

  if p_invoice_id is not null then
    select * into v_invoice
    from public.invoices
    where id = p_invoice_id and workspace_id = p_workspace_id;
    if not found then
      raise exception 'The linked customer invoice was not found in this workspace.';
    end if;
    if lower(coalesce(v_invoice.status, '')) = 'void' then
      raise exception 'A void customer invoice cannot be linked.';
    end if;
  end if;

  update public.supplier_payments
  set supplier_contact_id = p_supplier_contact_id,
      expense_id = p_expense_id,
      invoice_id = p_invoice_id,
      payment_date = v_date,
      amount = p_amount,
      currency = v_currency,
      payment_method = v_method,
      payment_reference = nullif(trim(coalesce(p_payment_reference, '')), ''),
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_payment_id and workspace_id = p_workspace_id
  returning * into v_payment;

  return to_jsonb(v_payment);
end;
$function$;

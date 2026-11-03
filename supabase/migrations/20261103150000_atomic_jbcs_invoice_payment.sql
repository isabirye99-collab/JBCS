create or replace function public.record_jbcs_invoice_payment(
  p_workspace_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_exchange_rate numeric,
  p_method text,
  p_payment_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_payment public.payments%rowtype;
  v_new_paid numeric(18,2);
  v_outstanding numeric(18,2);
  v_new_status text;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 9999999999999999 then
    raise exception 'Invalid payment amount';
  end if;
  if p_exchange_rate is null or p_exchange_rate <= 0 or p_exchange_rate > 999999999999 then
    raise exception 'Invalid exchange rate';
  end if;
  if p_method not in ('cash','bank_transfer','mobile_money','card','cheque','other') then
    raise exception 'Invalid payment method';
  end if;
  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
    and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Invoice not found in this workspace';
  end if;
  if v_invoice.status = 'void' then
    raise exception 'Payments cannot be recorded against a void invoice';
  end if;

  v_outstanding := round(v_invoice.total - v_invoice.amount_paid, 2);
  if v_outstanding <= 0 then
    raise exception 'This invoice has no outstanding balance';
  end if;
  if p_amount > v_outstanding then
    raise exception 'Payment exceeds the outstanding invoice balance';
  end if;

  v_new_paid := round(v_invoice.amount_paid + p_amount, 2);
  v_new_status := case when v_new_paid >= v_invoice.total then 'paid' else 'part_paid' end;

  insert into public.payments (
    workspace_id, invoice_id, payment_reference, payment_date, amount,
    currency, exchange_rate, method, notes
  ) values (
    p_workspace_id, p_invoice_id, nullif(left(trim(coalesce(p_payment_reference, '')), 100), ''),
    p_payment_date, p_amount, v_invoice.currency, p_exchange_rate, p_method,
    nullif(left(trim(coalesce(p_notes, '')), 2000), '')
  )
  returning * into v_payment;

  update public.invoices
  set amount_paid = v_new_paid, status = v_new_status, updated_at = now()
  where id = v_invoice.id and workspace_id = p_workspace_id
  returning * into v_invoice;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'invoice', to_jsonb(v_invoice),
    'outstanding', round(v_invoice.total - v_invoice.amount_paid, 2)
  );
end;
$$;

revoke all on function public.record_jbcs_invoice_payment(uuid, uuid, date, numeric, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_jbcs_invoice_payment(uuid, uuid, date, numeric, numeric, text, text, text)
  to service_role;

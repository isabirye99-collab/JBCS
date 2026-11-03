create or replace function public.record_workspace_invoice_payment(
  p_workspace_id uuid,
  p_invoice_id uuid,
  p_received_by uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_payment_reference text default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_payment public.payments%rowtype;
  v_remaining numeric;
begin
  if p_workspace_id is null or p_invoice_id is null then
    raise exception 'Workspace and invoice are required' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 999999999999999 then
    raise exception 'Payment amount must be positive and within the supported range' using errcode = '22023';
  end if;
  if p_payment_date is null or p_payment_date > current_date then
    raise exception 'Payment date must be valid and cannot be in the future' using errcode = '22023';
  end if;
  if p_method not in ('cash','bank_transfer','mobile_money','card','cheque','other') then
    raise exception 'Unsupported payment method' using errcode = '22023';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Invoice not found in this workspace' using errcode = 'P0002';
  end if;
  if v_invoice.status not in ('sent','part_paid','overdue') then
    raise exception 'Only issued invoices can receive payments' using errcode = '22023';
  end if;
  if v_invoice.total <= v_invoice.amount_paid then
    raise exception 'Invoice has no outstanding balance' using errcode = '22023';
  end if;
  v_remaining := v_invoice.total - v_invoice.amount_paid;
  if p_amount > v_remaining then
    raise exception 'Payment exceeds the outstanding balance' using errcode = '22023';
  end if;

  insert into public.payments (
    workspace_id, invoice_id, payment_date, amount, currency, exchange_rate,
    method, payment_reference, notes, received_by
  ) values (
    p_workspace_id, p_invoice_id, p_payment_date, round(p_amount, 2),
    v_invoice.currency, v_invoice.exchange_rate, p_method,
    nullif(left(trim(coalesce(p_payment_reference, '')), 120), ''),
    nullif(left(trim(coalesce(p_notes, '')), 1000), ''),
    p_received_by
  ) returning * into v_payment;

  update public.invoices
  set amount_paid = amount_paid + v_payment.amount,
      status = case
        when amount_paid + v_payment.amount >= total then 'paid'
        else 'part_paid'
      end,
      updated_at = now()
  where id = p_invoice_id and workspace_id = p_workspace_id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'invoice_id', p_invoice_id,
    'amount_paid', (v_invoice.amount_paid + v_payment.amount),
    'balance_due', (v_invoice.total - v_invoice.amount_paid - v_payment.amount),
    'status', case when v_invoice.amount_paid + v_payment.amount >= v_invoice.total then 'paid' else 'part_paid' end
  );
end;
$$;

revoke all on function public.record_workspace_invoice_payment(uuid, uuid, uuid, numeric, date, text, text, text) from public, anon, authenticated;
grant execute on function public.record_workspace_invoice_payment(uuid, uuid, uuid, numeric, date, text, text, text) to service_role;

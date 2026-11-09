-- Allow the existing atomic payment function to accept both owner income and commission entries.
-- Apply through the normal reviewed Supabase migration workflow; do not run ad hoc against production.
create or replace function public.record_owner_commission_payment(
  p_workspace_id uuid,
  p_entry_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_currency character,
  p_payment_method text,
  p_payment_reference text,
  p_notes text,
  p_recorded_by uuid
)
returns public.owner_commission_payments
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_entry public.owner_income_entries;
  v_payment public.owner_commission_payments;
  v_received numeric(18,2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into v_entry
  from public.owner_income_entries
  where id = p_entry_id and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Income record not found in this workspace';
  end if;
  if v_entry.status = 'cancelled' then
    raise exception 'Cancelled records cannot receive payments';
  end if;
  if upper(trim(p_currency::text)) <> upper(trim(v_entry.currency::text)) then
    raise exception 'Payment currency must match the income record currency';
  end if;
  if v_entry.amount_received + p_amount > v_entry.amount then
    raise exception 'Payment exceeds the outstanding balance';
  end if;

  insert into public.owner_commission_payments(
    workspace_id, entry_id, payment_date, amount, currency,
    payment_method, payment_reference, notes, recorded_by
  )
  values (
    p_workspace_id, p_entry_id, p_payment_date, p_amount, p_currency,
    p_payment_method, p_payment_reference, p_notes, p_recorded_by
  )
  returning * into v_payment;

  v_received := v_entry.amount_received + p_amount;
  update public.owner_income_entries
  set amount_received = v_received,
      status = case
        when v_received >= amount then 'paid'
        when v_received > 0 then 'partially_paid'
        else 'pending'
      end,
      updated_at = now()
  where id = p_entry_id and workspace_id = p_workspace_id;

  return v_payment;
end;
$function$;

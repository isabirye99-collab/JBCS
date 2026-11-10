create or replace function public.record_clinic_receipt(
  p_workspace_id uuid,
  p_patient_id uuid,
  p_charge_id uuid,
  p_receipt_number text,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_transaction_reference text default null
)
returns table (
  receipt_number text,
  amount numeric,
  currency character,
  payment_method text,
  receipt_date timestamptz,
  patient_id uuid,
  charge_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.clinic_charges%rowtype;
  v_total numeric;
  v_paid numeric;
  v_receipt public.clinic_receipts%rowtype;
begin
  if p_workspace_id is null or p_patient_id is null then
    raise exception using errcode = '22023', message = 'A workspace and patient are required.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Payment must be greater than zero.';
  end if;
  if upper(trim(coalesce(p_currency, ''))) not in ('UGX','USD','KES','TZS','EUR','GBP') then
    raise exception using errcode = '22023', message = 'Unsupported currency.';
  end if;
  if p_payment_method not in ('cash','mobile_money','bank_transfer','card','other') then
    raise exception using errcode = '22023', message = 'Invalid payment method.';
  end if;
  if p_receipt_number is null or length(trim(p_receipt_number)) = 0 then
    raise exception using errcode = '22023', message = 'Receipt number is required.';
  end if;

  perform 1 from public.patients
   where id = p_patient_id and workspace_id = p_workspace_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Patient not found in this clinic.';
  end if;

  if p_charge_id is not null then
    select * into v_charge
      from public.clinic_charges
     where id = p_charge_id
       and workspace_id = p_workspace_id
       and patient_id = p_patient_id
     for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Charge not found for this patient.';
    end if;
    if v_charge.status in ('void','paid') then
      raise exception using errcode = 'P0001', message = 'This charge is not open for payment.';
    end if;
    if upper(trim(v_charge.currency::text)) <> upper(trim(p_currency)) then
      raise exception using errcode = '22023', message = 'Payment currency must match the charge.';
    end if;

    select coalesce(sum(r.amount), 0) into v_paid
      from public.clinic_receipts r
     where r.workspace_id = p_workspace_id and r.charge_id = p_charge_id;
    v_total := v_charge.quantity * v_charge.unit_price;
    if p_amount > greatest(0, v_total - v_paid) then
      raise exception using errcode = 'P0001',
        message = 'Payment exceeds remaining balance of ' || greatest(0, v_total - v_paid)::text || ' ' || upper(trim(p_currency)) || '.';
    end if;
  end if;

  insert into public.clinic_receipts (
    workspace_id, patient_id, charge_id, receipt_number, amount,
    currency, payment_method, transaction_reference
  ) values (
    p_workspace_id, p_patient_id, p_charge_id, trim(p_receipt_number), p_amount,
    upper(trim(p_currency)), p_payment_method, nullif(trim(coalesce(p_transaction_reference,'')), '')
  ) returning * into v_receipt;

  if p_charge_id is not null then
    v_paid := v_paid + p_amount;
    update public.clinic_charges
       set status = case when v_paid >= v_total then 'paid' else 'part_paid' end
     where id = p_charge_id and workspace_id = p_workspace_id;
  end if;

  return query select v_receipt.receipt_number, v_receipt.amount, v_receipt.currency,
                      v_receipt.payment_method, v_receipt.receipt_date,
                      v_receipt.patient_id, v_receipt.charge_id;
end;
$$;

revoke all on function public.record_clinic_receipt(uuid, uuid, uuid, text, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.record_clinic_receipt(uuid, uuid, uuid, text, numeric, text, text, text) to service_role;

create or replace function public.create_workspace_sales_receipt(
  p_workspace_id uuid,
  p_created_by uuid,
  p_contact_id uuid,
  p_sale_date date,
  p_currency text,
  p_payment_method text,
  p_payment_reference text,
  p_notes text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_id uuid;
  v_receipt_number text;
  v_subtotal numeric(18,2);
  v_tax numeric(18,2);
  v_total numeric(18,2);
  v_item_count integer;
  v_highest integer;
begin
  if p_workspace_id is null or p_created_by is null then
    raise exception 'Workspace and creator are required';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency'; end if;
  if p_payment_method not in ('cash','bank_transfer','mobile_money','card','cheque','other') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one sales line is required'; end if;
  if p_contact_id is not null and not exists (
    select 1 from business_contacts where id = p_contact_id and workspace_id = p_workspace_id
  ) then raise exception 'Customer does not belong to this workspace'; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(description text, quantity numeric, unit_price numeric, tax_rate numeric)
    where coalesce(trim(description),'') = '' or quantity is null or quantity <= 0 or quantity > 1000000
      or unit_price is null or unit_price < 0 or unit_price > 1000000000000
      or tax_rate is null or tax_rate < 0 or tax_rate > 100
  ) then raise exception 'Invalid sales line item'; end if;

  select count(*) into v_item_count from jsonb_to_recordset(p_items) as x(description text, quantity numeric, unit_price numeric, tax_rate numeric);
  if v_item_count > 500 then raise exception 'Too many sales line items'; end if;

  select round(sum(quantity * unit_price),2),
         round(sum(quantity * unit_price * tax_rate / 100),2)
    into v_subtotal, v_tax
    from jsonb_to_recordset(p_items) as x(description text, quantity numeric, unit_price numeric, tax_rate numeric);
  v_subtotal := coalesce(v_subtotal,0);
  v_tax := coalesce(v_tax,0);
  v_total := v_subtotal + v_tax;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || ':sales-receipts', 0));
  select coalesce(max((regexp_match(receipt_number, '^JBCS R ([0-9]+)$'))[1]::integer),0)
    into v_highest from sales_receipts where workspace_id = p_workspace_id;
  v_receipt_number := 'JBCS R ' || lpad((v_highest + 1)::text,4,'0');

  insert into sales_receipts(workspace_id,receipt_number,contact_id,sale_date,currency,subtotal,tax_amount,total,payment_method,payment_reference,notes,created_by)
  values (p_workspace_id,v_receipt_number,p_contact_id,coalesce(p_sale_date,current_date),p_currency,v_subtotal,v_tax,v_total,p_payment_method,nullif(trim(p_payment_reference),''),nullif(trim(p_notes),''),p_created_by)
  returning id into v_receipt_id;

  insert into sales_receipt_items(workspace_id,sales_receipt_id,description,quantity,unit_price,tax_rate,line_total)
  select p_workspace_id,v_receipt_id,trim(description),quantity,unit_price,tax_rate,round(quantity * unit_price * (1 + tax_rate/100),2)
  from jsonb_to_recordset(p_items) as x(description text, quantity numeric, unit_price numeric, tax_rate numeric);

  return jsonb_build_object('id',v_receipt_id,'receipt_number',v_receipt_number,'subtotal',v_subtotal,'tax_amount',v_tax,'total',v_total);
end;
$$;
revoke all on function public.create_workspace_sales_receipt(uuid,uuid,uuid,date,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_workspace_sales_receipt(uuid,uuid,uuid,date,text,text,text,text,jsonb) to service_role;

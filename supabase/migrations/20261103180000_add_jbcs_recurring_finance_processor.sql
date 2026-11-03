alter table public.invoices
  add column if not exists recurring_template_id uuid references public.recurring_invoice_templates(id) on delete set null,
  add column if not exists recurring_run_date date;

alter table public.expenses
  add column if not exists recurring_template_id uuid references public.recurring_expense_templates(id) on delete set null,
  add column if not exists recurring_run_date date;

create unique index if not exists invoices_recurring_run_unique
  on public.invoices(recurring_template_id, recurring_run_date)
  where recurring_template_id is not null and recurring_run_date is not null;

create unique index if not exists expenses_recurring_run_unique
  on public.expenses(recurring_template_id, recurring_run_date)
  where recurring_template_id is not null and recurring_run_date is not null;

create or replace function public.jbcs_next_recurring_date(p_date date, p_frequency text)
returns date
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_month date;
  v_day integer;
  v_last_day integer;
begin
  case p_frequency
    when 'weekly' then return p_date + 7;
    when 'monthly' then
      v_month := (date_trunc('month', p_date)::date + interval '1 month')::date;
      v_last_day := extract(day from (v_month + interval '1 month - 1 day'))::integer;
      v_day := least(extract(day from p_date)::integer, v_last_day);
      return make_date(extract(year from v_month)::integer, extract(month from v_month)::integer, v_day);
    when 'quarterly' then
      v_month := (date_trunc('month', p_date)::date + interval '3 months')::date;
      v_last_day := extract(day from (v_month + interval '1 month - 1 day'))::integer;
      v_day := least(extract(day from p_date)::integer, v_last_day);
      return make_date(extract(year from v_month)::integer, extract(month from v_month)::integer, v_day);
    when 'yearly' then
      v_month := (date_trunc('month', p_date)::date + interval '12 months')::date;
      v_day := least(extract(day from p_date)::integer, extract(day from (v_month + interval '1 month - 1 day'))::integer);
      return make_date(extract(year from v_month)::integer, extract(month from v_month)::integer, v_day);
    else raise exception 'Unsupported recurring frequency';
  end case;
end;
$$;

create or replace function public.process_jbcs_due_recurring_finance(p_today date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template record;
  v_item jsonb;
  v_invoice_id uuid;
  v_invoice_number text;
  v_subtotal numeric(18,2);
  v_tax numeric(18,2);
  v_total numeric(18,2);
  v_qty numeric;
  v_price numeric;
  v_tax_rate numeric;
  v_base numeric;
  v_line_total numeric;
  v_next date;
  v_invoices integer := 0;
  v_expenses integer := 0;
  v_skipped integer := 0;
begin
  if p_today is null then raise exception 'Processing date is required'; end if;

  for v_template in
    select * from public.recurring_invoice_templates
    where is_active and next_run_date <= p_today
      and (end_date is null or next_run_date <= end_date)
    order by next_run_date, id
    for update
  loop
    v_subtotal := 0; v_tax := 0; v_total := 0;
    for v_item in select value from jsonb_array_elements(v_template.items)
    loop
      v_qty := (v_item->>'quantity')::numeric;
      v_price := (v_item->>'unit_price')::numeric;
      v_tax_rate := coalesce((v_item->>'tax_rate')::numeric, 0);
      if v_qty <= 0 or v_price < 0 or v_tax_rate < 0 or v_tax_rate > 100 then
        raise exception 'Invalid line item in recurring invoice template %', v_template.id;
      end if;
      v_base := round(v_qty * v_price, 2);
      v_line_total := round(v_base * (1 + v_tax_rate / 100), 2);
      v_subtotal := v_subtotal + v_base;
      v_total := v_total + v_line_total;
    end loop;
    v_tax := v_total - v_subtotal;
    v_invoice_number := 'RINV-' || to_char(v_template.next_run_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_template.id::text, '-', ''), 1, 8));
    select id into v_invoice_id from public.invoices
      where recurring_template_id = v_template.id and recurring_run_date = v_template.next_run_date;
    if v_invoice_id is null then
      insert into public.invoices(workspace_id, invoice_number, contact_id, issue_date, currency, exchange_rate, subtotal, tax_amount, total, amount_paid, status, notes, recurring_template_id, recurring_run_date)
      values(v_template.workspace_id, v_invoice_number, v_template.contact_id, v_template.next_run_date, v_template.currency, v_template.exchange_rate, v_subtotal, v_tax, v_total, 0, 'draft', v_template.notes, v_template.id, v_template.next_run_date)
      returning id into v_invoice_id;
      for v_item in select value from jsonb_array_elements(v_template.items)
      loop
        v_qty := (v_item->>'quantity')::numeric;
        v_price := (v_item->>'unit_price')::numeric;
        v_tax_rate := coalesce((v_item->>'tax_rate')::numeric, 0);
        v_base := round(v_qty * v_price, 2);
        insert into public.document_items(workspace_id, document_type, invoice_id, quote_id, description, quantity, unit_price, tax_rate, line_total)
        values(v_template.workspace_id, 'invoice', v_invoice_id, null, left(trim(v_item->>'description'),500), v_qty, v_price, v_tax_rate, round(v_base * (1 + v_tax_rate / 100),2));
      end loop;
      v_invoices := v_invoices + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
    v_next := public.jbcs_next_recurring_date(v_template.next_run_date, v_template.frequency);
    update public.recurring_invoice_templates
      set last_generated_at = now(), next_run_date = case when end_date is not null and v_next > end_date then next_run_date else v_next end,
          is_active = case when end_date is not null and v_next > end_date then false else is_active end,
          updated_at = now()
      where id = v_template.id;
    v_invoice_id := null;
  end loop;

  for v_template in
    select * from public.recurring_expense_templates
    where is_active and next_run_date <= p_today
      and (end_date is null or next_run_date <= end_date)
    order by next_run_date, id
    for update
  loop
    if not exists(select 1 from public.expenses where recurring_template_id=v_template.id and recurring_run_date=v_template.next_run_date) then
      insert into public.expenses(workspace_id, expense_date, category, description, supplier_contact_id, amount, currency, exchange_rate, payment_method, notes, recurring_template_id, recurring_run_date)
      values(v_template.workspace_id, v_template.next_run_date, v_template.category, v_template.description, v_template.supplier_contact_id, v_template.amount, v_template.currency, v_template.exchange_rate, v_template.payment_method, v_template.notes, v_template.id, v_template.next_run_date);
      v_expenses := v_expenses + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
    v_next := public.jbcs_next_recurring_date(v_template.next_run_date, v_template.frequency);
    update public.recurring_expense_templates
      set last_generated_at = now(), next_run_date = v_next,
          is_active = case when end_date is not null and v_next > end_date then false else is_active end,
          updated_at = now()
      where id = v_template.id;
  end loop;

  return jsonb_build_object('invoices_created',v_invoices,'expenses_created',v_expenses,'duplicates_skipped',v_skipped,'processed_through',p_today);
end;
$$;

revoke all on function public.process_jbcs_due_recurring_finance(date) from public, anon, authenticated;
grant execute on function public.process_jbcs_due_recurring_finance(date) to service_role;
revoke all on function public.jbcs_next_recurring_date(date,text) from public, anon, authenticated;
grant execute on function public.jbcs_next_recurring_date(date,text) to service_role;

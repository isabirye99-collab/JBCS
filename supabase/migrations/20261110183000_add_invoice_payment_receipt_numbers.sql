alter table public.payments add column if not exists receipt_number text;

with ranked as (
  select id, workspace_id, row_number() over (partition by workspace_id order by payment_date, created_at, id) as seq
  from public.payments
  where receipt_number is null or btrim(receipt_number) = ''
)
update public.payments p
set receipt_number = 'JBCS P ' || lpad(ranked.seq::text, 4, '0')
from ranked
where p.id = ranked.id;

create unique index if not exists payments_workspace_receipt_number_unique
  on public.payments(workspace_id, receipt_number)
  where receipt_number is not null;

create or replace function public.assign_workspace_payment_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_highest integer;
begin
  if new.receipt_number is null or btrim(new.receipt_number) = '' then
    perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text || ':payment-receipts', 0));
    select coalesce(max((regexp_match(receipt_number, '^JBCS P ([0-9]+)$'))[1]::integer),0)
      into v_highest
      from public.payments
      where workspace_id = new.workspace_id;
    new.receipt_number := 'JBCS P ' || lpad((v_highest + 1)::text,4,'0');
  end if;
  return new;
end;
$$;

drop trigger if exists payments_assign_receipt_number on public.payments;
create trigger payments_assign_receipt_number
before insert on public.payments
for each row execute function public.assign_workspace_payment_receipt_number();

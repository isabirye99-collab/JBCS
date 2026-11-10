-- Prevent receipt headers or lines from linking records across workspaces.
alter table public.business_contacts
  add constraint business_contacts_id_workspace_unique unique (id, workspace_id);

alter table public.sales_receipts
  drop constraint if exists sales_receipts_contact_fk;
alter table public.sales_receipts
  add constraint sales_receipts_contact_workspace_fk
  foreign key (contact_id, workspace_id)
  references public.business_contacts(id, workspace_id)
  on delete restrict;

alter table public.sales_receipts
  add constraint sales_receipts_id_workspace_unique unique (id, workspace_id);

alter table public.sales_receipt_items
  drop constraint if exists sales_receipt_items_sales_receipt_id_fkey;
alter table public.sales_receipt_items
  add constraint sales_receipt_items_receipt_workspace_fk
  foreign key (sales_receipt_id, workspace_id)
  references public.sales_receipts(id, workspace_id)
  on delete cascade;

# Recurring finance deployment checklist

Recurring invoice and expense templates are implemented in the JBCS finance application. Complete these steps before using them with live financial data.

## 1. Apply database migrations

Apply the migrations in timestamp order, including:

- `20261103170000_add_recurring_finance_templates.sql`
- `20261103180000_add_jbcs_recurring_finance_processor.sql`

The second migration adds recurring run identifiers, duplicate-protection indexes, date advancement logic, and the server-only processing function. Do not mark migrations as applied without actually applying and verifying them against the intended Supabase project.

## 2. Confirm server environment variables

The server-side application requires the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Keep the service-role key server-only; never expose it in client-side code.

Add a strong, random `CRON_SECRET` to the Vercel project environment variables for the Production environment. Do not commit its value to GitHub. Redeploy after the environment variable is configured.

## 3. Scheduled processing

`vercel.json` configures the recurring processor to run daily at 02:00 UTC (05:00 in Kampala). Vercel Cron sends a GET request with the bearer token configured by `CRON_SECRET`. The endpoint also supports authenticated manual POST requests from the finance screen.

Cron availability and frequency depend on the Vercel plan and deployment configuration. Confirm the schedule appears in the Vercel project's Cron Jobs page after a successful Production deployment.

## 4. Verify before production use

1. Confirm both migrations completed successfully in the correct Supabase project.
2. Create a test recurring invoice with a future run date and verify it does not generate early.
3. Create due test schedules and run processing once.
4. Run processing a second time and verify the same template/date does not create duplicate records.
5. Check invoice line items, taxes, currency, exchange rate, and expense fields.
6. Verify pause, resume, and end-date behavior.
7. Review Vercel function logs and Supabase logs before enabling real schedules.

## Important

Creating a recurring template does not itself send an invoice to a customer or make a payment. Generated invoices are created as drafts. Expenses are recorded as expenses; the processor does not initiate a bank or mobile-money payment.

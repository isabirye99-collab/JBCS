import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function kampalaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const isScheduledCall = Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
  if (!isScheduledCall && !(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Finance database configuration is missing." }, { status: 503 });
  }
  try {
    const response = await fetch(`${url}/rest/v1/rpc/process_jbcs_due_recurring_finance`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_today: kampalaDate() }),
      cache: "no-store",
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Recurring finance processing failed:", response.status, details);
      return NextResponse.json({ error: "Recurring processing is unavailable. Confirm the latest Supabase migrations are applied." }, { status: 503 });
    }
    return NextResponse.json({ result: await response.json() });
  } catch {
    return NextResponse.json({ error: "Unable to connect to finance database." }, { status: 502 });
  }
}

// Vercel Cron invokes endpoints with GET; the same authentication and processor apply.
export async function GET(request: Request) {
  return POST(request);
}

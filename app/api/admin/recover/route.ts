import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const allowedEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();

  if (!url || !key || !allowedEmail) {
    return NextResponse.json({ error: "Password recovery is not configured. Ask the administrator to check the Supabase environment settings." }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the administrator email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email !== allowedEmail) {
    // Do not reveal whether other email addresses have accounts.
    return NextResponse.json({ success: true, message: "If the address is authorised, a recovery email will be sent." });
  }

  const redirectTo = new URL("/admin/reset-password", request.nextUrl.origin).toString();
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Supabase could not send the recovery email. Check the Auth email settings and try again." }, { status: 502 });
  }

  return NextResponse.json({ success: true, message: "If the address is authorised, a recovery email will be sent. Check your inbox and spam folder." });
}

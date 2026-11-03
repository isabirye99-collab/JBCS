import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const allowedEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !allowedEmail) {
    return NextResponse.json({ error: "Admin login is not configured. Add the Supabase URL, publishable key and admin email in the hosting environment." }, { status: 503 });
  }
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email !== allowedEmail) {
    return NextResponse.json({ error: "These credentials are not authorised for the website dashboard." }, { status: 401 });
  }
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Login failed. Check your password or ask the administrator to set up your Supabase account." }, { status: 401 });
  const session = await response.json();
  if (!session.access_token) return NextResponse.json({ error: "Unable to establish a secure session." }, { status: 401 });
  const result = NextResponse.json({ success: true });
  result.cookies.set(ADMIN_COOKIE, session.access_token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: Math.min(Number(session.expires_in) || 3600, 3600),
  });
  return result;
}

export async function DELETE() {
  const result = NextResponse.json({ success: true });
  result.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return result;
}

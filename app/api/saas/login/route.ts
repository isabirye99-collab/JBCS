import { NextRequest, NextResponse } from "next/server";
import { SAAS_SESSION_COOKIE, supabaseConfig } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return NextResponse.json({ error: "Account services are not configured yet." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  try {
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }), cache: "no-store",
    });
    const auth = await authResponse.json();
    if (!authResponse.ok || !auth.access_token || !auth.user?.id) {
      return NextResponse.json({ error: "Sign-in failed. Check your details and confirm your email address." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, redirectTo: "/workspace" });
    response.cookies.set(SAAS_SESSION_COOKIE, auth.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", maxAge: Math.min(Number(auth.expires_in) || 3600, 60 * 60 * 24),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 502 });
  }
}

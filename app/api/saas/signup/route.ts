import { NextRequest, NextResponse } from "next/server";
import { SAAS_SESSION_COOKIE, supabaseConfig } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  const { url, anonKey, serviceKey } = supabaseConfig();
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Account services are not configured yet." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }
  const companyName = clean(body.companyName, 140);
  const email = clean(body.email, 254).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const currency = clean(body.currency || "UGX", 3).toUpperCase();

  if (companyName.length < 2) return NextResponse.json({ error: "Enter your company or business name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Use a password between 10 and 128 characters." }, { status: 400 });
  if (!["UGX", "USD"].includes(currency)) return NextResponse.json({ error: "Choose UGX or USD for subscription billing." }, { status: 400 });

  try {
    const signUp = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: { company_name: companyName } }),
      cache: "no-store",
    });
    const auth = await signUp.json();
    if (!signUp.ok || !auth?.user?.id) {
      return NextResponse.json({ error: auth?.msg || auth?.message || "Could not create the account. The email may already be registered." }, { status: 400 });
    }

    const provision = await fetch(`${url}/rest/v1/rpc/provision_saas_workspace`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: auth.user.id, p_company_name: companyName, p_billing_currency: currency }),
      cache: "no-store",
    });
    if (!provision.ok) {
      // Do not expose database details or credentials to the caller.
      return NextResponse.json({ error: "Your login was created, but workspace setup needs assistance. Please contact Johden support before trying again." }, { status: 502 });
    }

    const workspace = await provision.json();
    const response = NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !auth.access_token,
      message: auth.access_token ? "Your workspace is ready." : "Check your email to confirm your account. Your workspace has been prepared.",
      workspace,
    }, { status: 201 });

    if (auth.access_token) {
      response.cookies.set(SAAS_SESSION_COOKIE, auth.access_token, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
        path: "/", maxAge: Math.min(Number(auth.expires_in) || 3600, 60 * 60 * 24),
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Account creation is temporarily unavailable. Please try again later." }, { status: 502 });
  }
}

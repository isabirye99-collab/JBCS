import { NextRequest, NextResponse } from "next/server";
import { SAAS_SESSION_COOKIE } from "@/lib/saas-auth";

export async function POST(request: NextRequest) {
  // Prefer the configured public site URL, but never send a production user to localhost
  // if that variable was accidentally set to a local-development value.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const configuredIsLocalhost = configuredSiteUrl
    ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredSiteUrl)
    : false;
  const origin =
    configuredSiteUrl && !configuredIsLocalhost
      ? configuredSiteUrl
      : request.nextUrl.origin;

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("next", "/workspace/finance");

  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.set(SAAS_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

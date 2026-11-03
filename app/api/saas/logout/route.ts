import { NextResponse } from "next/server";
import { SAAS_SESSION_COOKIE } from "@/lib/saas-auth";

export async function POST() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), 303);
  response.cookies.set(SAAS_SESSION_COOKIE, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 0,
  });
  return response;
}

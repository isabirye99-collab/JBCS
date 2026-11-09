import { NextResponse } from "next/server";
import { getSaasSession } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSaasSession();

  if (!session) {
    return NextResponse.json(
      { error: "Not signed in." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(
    { email: session.user.email },
    { headers: { "Cache-Control": "no-store" } }
  );
}

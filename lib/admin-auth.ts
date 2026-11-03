import { cookies } from "next/headers";

export const ADMIN_COOKIE = "jbcs_admin_session";

export async function verifyAdmin(): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const allowedEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !allowedEmail) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const user = await response.json();
    return typeof user.email === "string" && user.email.toLowerCase() === allowedEmail;
  } catch {
    return false;
  }
}

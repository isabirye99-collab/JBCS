import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Website storage is not configured." }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP or SVG image." }, { status: 400 });
  if (file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 400 });

  const originalExtension = file.name.split(".").pop()?.toLowerCase() || "png";
  const extension = ["jpg", "jpeg", "png", "webp", "svg"].includes(originalExtension) ? originalExtension : (file.type === "image/jpeg" ? "jpg" : "png");
  const objectName = `clients/${crypto.randomUUID()}.${extension}`;
  const upload = await fetch(`${url}/storage/v1/object/jbcs-website-media/${objectName}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.type, "x-upsert": "false" },
    body: await file.arrayBuffer(),
    cache: "no-store",
  });
  if (!upload.ok) return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 502 });
  return NextResponse.json({ url: `${url}/storage/v1/object/public/jbcs-website-media/${objectName}` }, { status: 201 });
}

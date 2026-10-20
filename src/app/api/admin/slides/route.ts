import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SLIDE = 3 * 1024 * 1024;
const MAX_BATCH = 12;
const MAX_REQUEST = 4 * 1024 * 1024; // stays under hosting body limits

const isWebp = (b: Uint8Array) => b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";

/**
 * Saves a batch of slide images (WebP) for a course. Admins only. The browser converts the PDF; this route checks who
 * is uploading and what, then stores the images with the server key. Form fields: course, version, and files named
 * "p<page number>".
 */
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST) return NextResponse.json({ error: "Batch too large" }, { status: 413 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad upload" }, { status: 400 });
  const course = String(form.get("course") ?? "");
  const version = Number(form.get("version"));
  if (!UUID.test(course) || !Number.isInteger(version) || version < 1 || version > 100000) return NextResponse.json({ error: "Bad slide details" }, { status: 400 });

  const slides: { page: number; bytes: Uint8Array }[] = [];
  for (const [key, value] of form.entries()) {
    const m = /^p(\d{1,4})$/.exec(key);
    if (!m) continue;
    const page = Number(m[1]);
    if (page < 1 || page > 2000 || typeof value === "string") return NextResponse.json({ error: "Bad slide details" }, { status: 400 });
    const bytes = new Uint8Array(await value.arrayBuffer());
    if (bytes.length > MAX_SLIDE || !isWebp(bytes)) return NextResponse.json({ error: `Slide ${page} is not a valid image` }, { status: 400 });
    slides.push({ page, bytes });
  }
  if (slides.length === 0 || slides.length > MAX_BATCH) return NextResponse.json({ error: "Bad slide details" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: c } = await db.from("courses").select("id").eq("id", course).maybeSingle();
  if (!c) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const results = await Promise.all(slides.map(({ page, bytes }) =>
    db.storage.from("slides").upload(`${course}/v${version}/${String(page).padStart(3, "0")}.webp`, bytes, { contentType: "image/webp", upsert: true, cacheControl: "31536000" })));
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: slides.length });
}

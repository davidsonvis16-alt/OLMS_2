import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { limit } from "@/lib/rate-limit";
import { PDFDocument, degrees, rgb, setCharacterSpacing } from "pdf-lib";
import QRCode from "qrcode";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { SITE } from "@/lib/site";
import { embedCertFonts } from "@/lib/cert-fonts";
import { C, LIGA, PAGE, layoutCertificate } from "@/lib/cert-layout";

const K = 72 / 25.4; // points per millimetre
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

export async function GET(req: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/certificates`, req.url));
  const db = supabaseAdmin();
  if (!/^[A-Z0-9-]{6,40}$/.test(serial)) return new NextResponse("Not found", { status: 404 });
  const { data: c } = await db.from("certificates").select("*").eq("serial", serial).maybeSingle();
  if (!c || c.revoked) return new NextResponse("Not found", { status: 404 });
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (c.user_id !== user.id && me?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  if (!(await limit("pdf", user.id))) return new NextResponse("Too many requests", { status: 429 });
  // Brand files come from disk, never from a URL built out of request headers.
  const asset = async (p: string) => new Uint8Array(await fs.readFile(path.join(process.cwd(), "public", p)));
  const verifyUrl = `${SITE.url.replace(/\/$/, "")}/verify/${encodeURIComponent(c.serial)}`;
  const [logo, sig, qrPng] = await Promise.all([
    asset("/brand/logo-light.png"), asset("/brand/signature.png"),
    QRCode.toBuffer(verifyUrl, { margin: 0, width: 600, errorCorrectionLevel: "M", color: { dark: C.ink, light: "#ffffff" } }),
  ]);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Aspire certificate ${c.serial}`);
  pdf.setAuthor(SITE.name);
  pdf.setSubject(c.course_title);
  const PW = PAGE.w * K, PH = PAGE.h * K;
  const page = pdf.addPage([PW, PH]);
  const fonts = await embedCertFonts(pdf);
  const img = { logo: await pdf.embedPng(logo), signature: await pdf.embedPng(sig), qr: await pdf.embedPng(qrPng) };

  const ops = layoutCertificate({
    serial: c.serial, fullName: c.full_name, idNumber: c.id_number, course: c.course_title, modules: c.modules ?? [], score: c.score,
    issuedAt: c.issued_at, companyName: c.company_name, verifyUrl, stamp: null,
  }, fonts);

  for (const o of ops) {
    switch (o.k) {
      case "rect":
        page.drawRectangle({
          x: o.x * K, y: PH - (o.y + o.h) * K, width: o.w * K, height: o.h * K,
          color: o.fill ? hex(o.fill) : undefined, opacity: o.opacity,
          borderColor: o.stroke ? hex(o.stroke) : undefined, borderWidth: o.stroke ? (o.sw ?? .2) * K : 0, borderOpacity: o.opacity,
        });
        break;
      case "line":
        page.drawLine({ start: { x: o.x1 * K, y: PH - o.y1 * K }, end: { x: o.x2 * K, y: PH - o.y2 * K }, thickness: o.sw * K, color: hex(o.stroke), opacity: o.opacity });
        break;
      case "circle":
        page.drawCircle({
          x: o.cx * K, y: PH - o.cy * K, size: o.r * K, color: o.fill ? hex(o.fill) : undefined, opacity: o.opacity,
          borderColor: o.stroke ? hex(o.stroke) : undefined, borderWidth: o.stroke ? (o.sw ?? .2) * K : 0, borderOpacity: o.opacity,
        });
        break;
      case "path":
        // drawSvgPath works in SVG space (y down) scaled by K, so line widths stay in millimetres.
        page.drawSvgPath(o.d, {
          x: 0, y: PH, scale: K, color: o.fill ? hex(o.fill) : undefined, opacity: o.opacity,
          borderColor: o.stroke ? hex(o.stroke) : undefined, borderWidth: o.stroke ? o.sw ?? .2 : 0, borderOpacity: o.opacity,
        });
        break;
      case "image":
        page.drawImage(img[o.src], { x: o.x * K, y: PH - (o.y + o.h) * K, width: o.w * K, height: o.h * K });
        break;
      case "text":
        if (o.ls) page.pushOperators(setCharacterSpacing(o.ls * K));
        if (LIGA.test(o.text) && !o.rotate) {
          // pdf-lib mis-advances ligature glyphs, so these strings are set one letter at a time.
          let x = o.x;
          for (const ch of o.text) {
            page.drawText(ch, { x: x * K, y: PH - o.y * K, size: o.size * K, font: fonts[o.font], color: hex(o.color), opacity: o.opacity });
            x += fonts[o.font].widthOfTextAtSize(ch, o.size) + (o.ls ?? 0);
          }
        } else page.drawText(o.text, { x: o.x * K, y: PH - o.y * K, size: o.size * K, font: fonts[o.font], color: hex(o.color), opacity: o.opacity, rotate: o.rotate ? degrees(-o.rotate) : undefined });
        if (o.ls) page.pushOperators(setCharacterSpacing(0));
        break;
    }
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Aspire-Certificate-${c.serial}.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

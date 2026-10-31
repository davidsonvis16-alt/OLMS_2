import type { LoaderFunctionArgs } from "react-router";
import { seeOther } from "@/lib/server/http";
import { getSession } from "@/lib/auth";
import { limit } from "@/lib/rate-limit";
import { PDFDocument, degrees, rgb, setCharacterSpacing } from "pdf-lib";
import { qrShape } from "@/lib/qr";
import { assetBytes } from "@/lib/server/assets";
import { supabaseAdmin } from "@/lib/supabase";
import { SITE } from "@/lib/site";
import { embedCertFonts } from "@/lib/cert-fonts";
import { C, LIGA, PAGE, layoutCertificate } from "@/lib/cert-layout";

const K = 72 / 25.4; // points per millimetre
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

async function get(req: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const { user, profile: me } = await getSession(); // also treats suspended accounts as signed out
  if (!user) return seeOther(new URL(`/login?next=/certificates`, req.url));
  const db = supabaseAdmin();
  if (!/^[A-Z0-9-]{6,40}$/.test(serial)) return new Response("Not found", { status: 404 });
  const { data: c } = await db.from("certificates").select("*").eq("serial", serial).maybeSingle();
  if (!c || c.revoked) return new Response("Not found", { status: 404 });
  if (c.user_id !== user.id && me?.role !== "admin") return new Response("Not found", { status: 404 });

  if (!(await limit("pdf", user.id))) return new Response("Too many requests", { status: 429 });
  // Brand files come from the site's own files, never from a URL built out of request headers.
  const verifyUrl = `${SITE.url.replace(/\/$/, "")}/verify/${encodeURIComponent(c.serial)}`;
  const [logo, sig, seal, ghp] = await Promise.all([assetBytes("/brand/logo-light.png"), assetBytes("/brand/signature.png"), assetBytes("/brand/haccp-seal.png"), assetBytes("/brand/ghp-seal.png")]);
  const qr = qrShape(verifyUrl);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Aspire Safety Academy certificate ${c.serial}`);
  pdf.setAuthor(SITE.name);
  pdf.setSubject(c.course_title);
  const PW = PAGE.w * K, PH = PAGE.h * K;
  const page = pdf.addPage([PW, PH]);
  const fonts = await embedCertFonts(pdf);
  const img = { logo: await pdf.embedPng(logo), signature: await pdf.embedPng(sig), seal: await pdf.embedPng(seal), ghp: await pdf.embedPng(ghp) };

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
        if (o.src === "qr") page.drawSvgPath(qr.d, { x: o.x * K, y: PH - o.y * K, scale: (o.w * K) / qr.n, color: hex(C.ink) });
        else page.drawImage(img[o.src], { x: o.x * K, y: PH - (o.y + o.h) * K, width: o.w * K, height: o.h * K, opacity: o.opacity });
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
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Aspire-Certificate-${c.serial}.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

export const loader = ({ request, params }: LoaderFunctionArgs) => get(request, { params: Promise.resolve({ serial: params.serial ?? "" }) });

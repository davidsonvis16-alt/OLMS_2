import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/** Font files shared by the on-screen certificate (for measuring) and the PDF (for drawing). */
export const CERT_FONT_FILES = {
  sans500: "archivo-500.ttf",
  sans600: "archivo-600.ttf",
  serif: "garamond-400.ttf",
  serifI: "garamond-400i.ttf",
  serif600: "garamond-600.ttf",
  mono: "plexmono-500.ttf",
} as const;
export type FontKey = keyof typeof CERT_FONT_FILES;

const dir = () => path.join(process.cwd(), "src", "assets", "fonts");

let bytesCache: Promise<Record<FontKey, Uint8Array>> | null = null;
export function fontBytes() {
  bytesCache ??= (async () => {
    const out = {} as Record<FontKey, Uint8Array>;
    for (const [k, f] of Object.entries(CERT_FONT_FILES)) out[k as FontKey] = new Uint8Array(await fs.readFile(path.join(dir(), f)));
    return out;
  })();
  return bytesCache;
}

/** Embeds every certificate font into a document. */
export async function embedCertFonts(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  const bytes = await fontBytes();
  const out = {} as Record<FontKey, PDFFont>;
  // fontkit drops glyphs when subsetting EB Garamond, so the serif faces are embedded whole.
  for (const k of Object.keys(bytes) as FontKey[]) out[k] = await pdf.embedFont(bytes[k], { subset: !k.startsWith("serif") });
  return out;
}

let measureCache: Promise<Record<FontKey, PDFFont>> | null = null;
/** Fonts in a throwaway document, used only to measure text for the on-screen certificate. */
export function measuringFonts() {
  measureCache ??= (async () => embedCertFonts(await PDFDocument.create()))();
  return measureCache;
}

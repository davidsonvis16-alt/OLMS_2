export const SITE = {
  name: "ASPIRE SAFETY & HYGIENE SOLUTIONS",
  short: "Aspire",
  tagline: "Value, Quality & Service",
  email: "Aspiresafetystandards@gmail.com",
  phone: "+254 725 009 705",
  phoneHref: "tel:+254725009705",
  whatsapp: "254725009705",
  websites: [
    { label: "sgfoodsafety.com", href: "https://sgfoodsafety.com" },
    { label: "nexthospitality.ke", href: "http://nexthospitality.ke/" },
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  passMark: 80,
};

export const CATEGORIES = [
  { id: "food-safety", label: "Food Safety" },
  { id: "health-safety", label: "Health & Safety" },
  { id: "hospitality", label: "Hospitality" },
] as const;

const COURSE_PHOTOS: Record<string, string> = {
  "food-hygiene-safety-food-handlers": "plating",
  "personal-health-hygiene": "hands",
  "haccp-principles": "thermometer",
  "food-allergen-awareness": "gloves",
  "fire-safety-fire-marshal": "flame",
  "occupational-safety-health": "prep",
  "kitchen-hygiene-sanitation": "clean-kitchen",
  "integrated-pest-control": "pass",
};
const CATEGORY_PHOTOS: Record<string, string> = { "food-safety": "plating", "health-safety": "prep", hospitality: "team" };

/** Cover photo for a course, by slug, falling back to its category. */
export const coursePhoto = (slug: string, category?: string) =>
  `/photos/${COURSE_PHOTOS[slug] ?? CATEGORY_PHOTOS[category ?? ""] ?? "hero"}.jpg`;

export const catLabel =(id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const wa = (text: string) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
export const mailto = (subject: string, body = "") =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

export const usd = (n: number | string | null | undefined) =>
  n == null ? "—" : `US$${Number(n).toLocaleString("en-US", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function maskId(id: string) {
  if (id.length <= 4) return "••••";
  return "•".repeat(Math.max(4, id.length - 3)) + id.slice(-3);
}

export function pagesOf(m: { page_from: number; page_to: number; extra_pages: number[] | null }) {
  const out: number[] = [];
  for (let p = m.page_from; p <= m.page_to; p++) out.push(p);
  for (const p of m.extra_pages ?? []) if (!out.includes(p)) out.push(p);
  return out;
}

export function companyActive(c: { paid_until: string | null } | null | undefined) {
  if (!c?.paid_until) return false;
  return new Date(c.paid_until + "T23:59:59") >= new Date();
}

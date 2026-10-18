import crypto from "node:crypto";

const API = "https://api.paystack.co";
const key = () => {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
};

export type Method = "card" | "mpesa";

/** Card is charged in USD. M-Pesa only works in KES, so the USD price is converted at USD_TO_KES. */
export function quote(usd: number, method: Method) {
  if (method === "card") return { amount: round2(usd), currency: "USD" as const };
  const rate = Number(process.env.USD_TO_KES);
  if (!rate || !isFinite(rate)) throw new Error("M-Pesa is not available yet (USD_TO_KES rate is not set).");
  return { amount: Math.ceil(usd * rate), currency: "KES" as const };
}
export const mpesaAvailable = () => !!Number(process.env.USD_TO_KES);
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function initialize(opts: { email: string; amount: number; currency: "USD" | "KES"; reference: string; callbackUrl: string; method: Method; metadata: Record<string, unknown> }) {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: Math.round(opts.amount * 100), // subunits
      currency: opts.currency,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      channels: opts.method === "mpesa" ? ["mobile_money"] : ["card"],
      metadata: opts.metadata,
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || !data.status) throw new Error(data.message || "Could not start payment");
  return data.data as { authorization_url: string; reference: string };
}

export async function verify(reference: string) {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${key()}` }, cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.status || data.data?.reference !== reference) return null;
  return data.data as { status: string; amount: number; currency: string; reference: string; channel: string; paid_at: string };
}

export function validSignature(raw: string, signature: string | null) {
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", key()).update(raw).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature)); } catch { return false; }
}

export function newReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
}

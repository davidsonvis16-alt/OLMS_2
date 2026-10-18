import { NextResponse } from "next/server";
import { applyPayment } from "@/lib/certs";
import { validSignature, verify } from "@/lib/paystack";

/** Paystack webhook: signed with our secret key, and every event is re-checked with Paystack before it changes anything. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return new NextResponse("bad signature", { status: 401 });
  let evt: { event?: string; data?: { reference?: unknown } };
  try { evt = JSON.parse(raw); } catch { return new NextResponse("bad request", { status: 400 }); }
  const ref = evt.data?.reference;
  if (evt.event === "charge.success" && typeof ref === "string" && ref.length <= 100) {
    const v = await verify(ref); // never trust the webhook body alone
    if (v) {
      try { await applyPayment(ref, v); } catch (e) { console.error("[webhook] could not apply", ref, e instanceof Error ? e.message : e); }
    }
  }
  // Always 200 for a correctly signed event, so Paystack doesn't retry events we deliberately ignore.
  return NextResponse.json({ received: true });
}

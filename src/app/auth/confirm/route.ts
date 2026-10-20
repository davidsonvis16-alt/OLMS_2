import type { LoaderFunctionArgs } from "react-router";
import { seeOther } from "@/lib/server/http";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "magiclink", "invite", "email_change"];

/**
 * Where the Aspire email templates link to (see supabase/email-templates). The one-time token is checked with
 * Supabase on the server, which signs the person in, so email links point at this site, not supabase.co.
 */
async function get(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"), type === "recovery" ? "/reset" : "/dashboard");
  if (!token_hash || !type || !TYPES.includes(type) || token_hash.length > 256) return seeOther(new URL("/login?error=link", url.origin));
  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ type, token_hash });
  if (error) return seeOther(new URL("/login?error=link", url.origin));
  return seeOther(new URL(next, url.origin));
}

export const loader = ({ request }: LoaderFunctionArgs) => get(request);

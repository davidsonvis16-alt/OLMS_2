import type { LoaderFunctionArgs } from "react-router";
import { seeOther } from "@/lib/server/http";
import { supabaseServer } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

async function get(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (!code) return seeOther(new URL("/login", url.origin));
  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return seeOther(new URL("/login?error=link", url.origin));
  return seeOther(new URL(next, url.origin)); // /dashboard sends admins on to /admin
}

export const loader = ({ request }: LoaderFunctionArgs) => get(request);

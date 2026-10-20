import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

export const metadata: Metadata = { title: "Create account" };

export default async function Page() {
  // The host tells us the visitor's country from their connection (Vercel or Cloudflare); no lookup service is used.
  const h = await headers();
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  return <AuthFrame><Suspense><AuthForm mode="signup" country={country} /></Suspense></AuthFrame>;
}

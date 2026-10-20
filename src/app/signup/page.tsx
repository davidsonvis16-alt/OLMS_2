import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return <AuthFrame><Suspense><AuthForm mode="signup" /></Suspense></AuthFrame>;
}

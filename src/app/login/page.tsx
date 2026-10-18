import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <AuthFrame><Suspense><AuthForm mode="login" /></Suspense></AuthFrame>;
}

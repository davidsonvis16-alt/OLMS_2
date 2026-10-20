import { pageTitle } from "@/lib/site";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

export const meta = () => pageTitle("Sign in");

export default function Page() {
  return <AuthFrame><Suspense><AuthForm mode="login" /></Suspense></AuthFrame>;
}

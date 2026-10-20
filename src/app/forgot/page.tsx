import { pageTitle } from "@/lib/site";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

export const meta = () => pageTitle("Reset password");

export default function Page() {
  return <AuthFrame><Suspense><AuthForm mode="forgot" /></Suspense></AuthFrame>;
}

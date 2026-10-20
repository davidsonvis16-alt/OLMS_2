import { pageTitle } from "@/lib/site";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

export const meta = () => pageTitle("New password");

export default function Page() {
  return <AuthFrame><Suspense><AuthForm mode="reset" /></Suspense></AuthFrame>;
}

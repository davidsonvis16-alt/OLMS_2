import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { pageTitle } from "@/lib/site";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-aside";

export const meta = () => pageTitle("Create account");

export async function loader({ request }: LoaderFunctionArgs) {
  // Cloudflare tells us the visitor's country from their connection; no lookup service is used.
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  return { country: cf?.country ?? request.headers.get("cf-ipcountry") };
}

export default function Page() {
  const { country } = useLoaderData<typeof loader>();
  return <AuthFrame><AuthForm mode="signup" country={country} /></AuthFrame>;
}

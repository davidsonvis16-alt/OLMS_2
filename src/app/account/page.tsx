import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { pageTitle } from "@/lib/site";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { PasskeyManager } from "@/components/passkey-manager";
import { DetailsForm } from "@/components/details-form";
import { safeNext } from "@/lib/safe-next";

export const meta = () => pageTitle("Account");

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string | undefined>;
  const { profile } = await requireUser("/account");
  return {
    details: { full_name: profile.full_name, id_number: profile.id_number, phone: profile.phone, country: profile.country, email: profile.email },
    error: searchParams.error ?? null,
    next: safeNext(searchParams.next, "") || undefined,
  };
}

export default function Account() {
  const { details, error, next } = useLoaderData<typeof loader>();
  return (
    <AppShell active="account">
      <PageHead eyebrow="Settings" title="Your details" />
      {error && <p className="alert alert--error" role="alert">{error}</p>}
      <DetailsForm profile={details} next={next} />
      <PasskeyManager />
    </AppShell>
  );
}

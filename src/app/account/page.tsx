import type { Metadata } from "next";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { PasskeyManager } from "@/components/passkey-manager";
import { DetailsForm } from "@/components/details-form";
import { safeNext } from "@/lib/safe-next";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.

export const metadata: Metadata = { title: "Account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ saved?: string; next?: string; error?: string }> }) {
  const { profile } = await requireUser("/account");
  const sp = await searchParams;
  return (
    <AppShell active="account">
      <PageHead eyebrow="Settings" title="Your details" />
      {sp.error && <p className="alert alert--error" role="alert">{sp.error}</p>}
      <DetailsForm profile={{ full_name: profile.full_name, id_number: profile.id_number, phone: profile.phone, country: profile.country, email: profile.email }} next={safeNext(sp.next, "") || undefined} />
      <PasskeyManager />
    </AppShell>
  );
}

import type { Metadata } from "next";
import { AppShell, PageHead } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/app/actions";
import Link from "next/link";

export const metadata: Metadata = { title: "Account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ saved?: string; next?: string }> }) {
  const { profile } = await requireUser("/account");
  const sp = await searchParams;
  return (
    <AppShell active="account">
      <PageHead eyebrow="Settings" title="Your details" />
      {sp.saved && <p className="alert alert--ok">Saved.</p>}
      <form action={updateProfile} className="form-card narrow">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <p>Your full name and ID or passport number are printed on your certificates. Enter them exactly as they appear on your ID.</p>
        <div className="form-grid">
          <div className="field field--full"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} autoComplete="name" /></div>
          <div className="field"><label htmlFor="id_number">National ID / passport number</label><input id="id_number" name="id_number" defaultValue={profile.id_number ?? ""} /></div>
          <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" /></div>
          <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue={profile.country ?? ""} autoComplete="country-name" /></div>
          <div className="field"><label>Email</label><input value={profile.email ?? ""} disabled /></div>
        </div>
        <div className="form-actions"><button className="btn btn--green">Save details</button><Link className="btn btn--outline" href="/reset">Change password</Link></div>
      </form>
    </AppShell>
  );
}

import Link from "@/components/link";
import { useRouter } from "@/lib/navigation";
import { useActionState, useEffect, useState } from "react";
import { callAction } from "@/lib/call-action";

type SaveState = { ok?: boolean; error?: string; at?: number };
const save = (_prev: SaveState, form: FormData) => callAction<SaveState>("saveDetails", form);
import { PhoneField } from "./phone-field";
import { Icon } from "./icons";

type Details = { full_name: string | null; id_number: string | null; phone: string | null; country: string | null; email: string | null };

/**
 * "Your details": the certificate details first, with a live preview of exactly how they will be printed, then contact
 * details. Saves in place and says so.
 */
export function DetailsForm({ profile, next }: { profile: Details; next?: string }) {
  const r = useRouter();
  const [state, action, pending] = useActionState<SaveState, FormData>(save, {});
  const [name, setName] = useState(profile.full_name ?? "");
  const [idn, setIdn] = useState(profile.id_number ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    setDirty(false);
    if (next) r.push(next);
  }, [state, next, r]);

  const missing = !name.trim() || !idn.trim();
  return (
    <form action={action} className="details" onChange={() => setDirty(true)}>
      <section className="form-card details-cert" aria-labelledby="cert-h">
        <div>
          <h3 id="cert-h"><Icon name="award" />On your certificate</h3>
          <p>Type these exactly as they appear on your national ID or passport. They are printed on every certificate you earn, and employers check them.</p>
          <div className="field"><label htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Jane Wanjiku Kamau" maxLength={120} />
          </div>
          <div className="field"><label htmlFor="id_number">National ID or passport number</label>
            <input id="id_number" name="id_number" value={idn} onChange={(e) => setIdn(e.target.value)} placeholder="e.g. 32456789" maxLength={40} autoCapitalize="characters" spellCheck={false} />
          </div>
        </div>
        <figure className="cert-preview" aria-label="Preview of your certificate details">
          <span className="micro">Preview</span>
          <small>This is to certify that</small>
          <b className={name.trim() ? "" : "is-empty"}>{name.trim() || "Your full name"}</b>
          <span className="cert-preview-id">ID / Passport: <span className={idn.trim() ? "mono" : "mono is-empty"}>{idn.trim() || "—"}</span></span>
          <small>has successfully completed …</small>
        </figure>
      </section>

      <section className="form-card" aria-labelledby="contact-h">
        <h3 id="contact-h"><Icon name="phone" />Contact</h3>
        <div className="form-grid">
          <PhoneField value={profile.phone} label="Phone" />
          <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue={profile.country ?? ""} autoComplete="country-name" /></div>
          <div className="field field--full"><label>Email</label><input value={profile.email ?? ""} disabled /></div>
        </div>
      </section>

      <div className="details-bar">
        <button className="btn btn--go btn--lg" disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
        <span role="status" aria-live="polite">
          {state.error ? <span className="details-err">{state.error}</span>
            : state.ok && !dirty ? <span className="details-ok"><Icon name="check" />Saved{next ? ". Taking you back…" : ""}</span>
            : missing ? <span className="muted">Add your full name and ID number to be ready for certificates.</span> : null}
        </span>
        <Link className="btn btn--outline" href="/reset">Change password</Link>
      </div>
    </form>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { certificatePreview, type Preview } from "@/app/cert-preview";
import { claimCertificate } from "@/app/pay-actions";
import { CertSvg } from "./cert-svg";

/**
 * The certificate claim form with a live preview: as the learner types their name and ID, the sample certificate is
 * redrawn with exactly the layout the issued one will have. The payment buttons are passed in as children.
 */
export function ClaimDetails({ slug, initial, name: name0, idNumber: id0, children }: {
  slug: string; initial: Preview | null; name: string; idNumber: string; children: React.ReactNode;
}) {
  const [name, setName] = useState(name0);
  const [idn, setIdn] = useState(id0);
  const [preview, setPreview] = useState(initial);
  const [busy, setBusy] = useState(false);
  const turn = useRef(0);

  useEffect(() => {
    if (name === name0 && idn === id0 && preview === initial) return;
    const mine = ++turn.current;
    setBusy(true);
    const t = setTimeout(async () => {
      const p = await certificatePreview(slug, name, idn).catch(() => null);
      if (mine !== turn.current) return; // a newer keystroke is on its way
      if (p) setPreview(p);
      setBusy(false);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, idn, slug]);

  const src = { logo: "/brand/logo-light.png", signature: "/brand/signature.png", qr: preview?.qr ?? "" };
  return (
    <div className="claim">
      <div className={`claim-preview${busy ? " is-updating" : ""}`}>
        {preview && <div className="cert-stage"><CertSvg ops={preview.ops} src={src} label={preview.label} /></div>}
        <p className="muted small center">Preview: it updates as you type. Your real certificate gets its own number and QR code.</p>
      </div>
      <form action={claimCertificate} className="form-card claim-form">
        <input type="hidden" name="slug" value={slug} />
        <h3>Your details on the certificate</h3>
        <p>Type them exactly as they appear on your national ID or passport. They can&apos;t be changed after the certificate is issued.</p>
        <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" placeholder="e.g. Jane Wanjiku Kamau" /></div>
        <div className="field"><label htmlFor="id_number">National ID or passport number</label><input id="id_number" name="id_number" value={idn} onChange={(e) => setIdn(e.target.value)} required minLength={4} maxLength={40} spellCheck={false} placeholder="e.g. 32456789" /></div>
        <label className="check"><input type="checkbox" name="confirm" required /> <span>My name and ID number are correct.</span></label>
        {children}
      </form>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { Icon } from "./icons";

export function VerifyForm(_: { dark?: boolean }) {
  const r = useRouter();
  const [v, setV] = useState("");
  return (
    <form className="vform" onSubmit={(e) => { e.preventDefault(); const s = v.trim().toUpperCase().replace(/\s+/g, ""); if (s) r.push(`/verify/${encodeURIComponent(s)}`); }}>
      <label htmlFor="cert-no" className="sr-only">Certificate number</label>
      <input id="cert-no" value={v} onChange={(e) => setV(e.target.value)} placeholder="Certificate number, e.g. ASH-2026-7K4Q9P" autoComplete="off" spellCheck={false} required />
      <button className="btn btn--ink" type="submit"><Icon name="shield" />Verify</button>
    </form>
  );
}

export function EnquiryForm({ courses }: { courses: string[] }) {
  const [via, setVia] = useState<"whatsapp" | "email">("whatsapp");
  const [err, setErr] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    if (!g("name")) { setErr(true); return; }
    setErr(false);
    const lines = ["Hello Aspire,", "", `Name: ${g("name")}`];
    if (g("company")) lines.push(`Business: ${g("company")}`);
    if (g("phone")) lines.push(`Phone: ${g("phone")}`);
    if (g("staff")) lines.push(`Staff to train: ${g("staff")}`);
    lines.push(`Training: ${g("course") || "Not sure yet, please advise"}`);
    if (g("message")) lines.push("", g("message"));
    const text = lines.join("\n");
    if (via === "email") window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(`Training enquiry — ${g("name")}`)}&body=${encodeURIComponent(text)}`;
    else window.open(`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <div className="field"><label htmlFor="f-name">Your name</label><input id="f-name" name="name" autoComplete="name" aria-invalid={err || undefined} /></div>
        <div className="field"><label htmlFor="f-company">Business / organisation</label><input id="f-company" name="company" autoComplete="organization" /></div>
        <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" /></div>
        <div className="field"><label htmlFor="f-staff">Number of staff to train</label><input id="f-staff" name="staff" inputMode="numeric" /></div>
        <div className="field field--full">
          <label htmlFor="f-course">Training you&apos;re interested in</label>
          <select id="f-course" name="course" defaultValue="">
            <option value="">Not sure yet, please advise</option>
            {courses.map((c) => <option key={c}>{c}</option>)}
            <option>Company account for my staff</option>
            <option>Audit / Consultancy</option>
          </select>
        </div>
        <div className="field field--full"><label htmlFor="f-msg">Message</label><textarea id="f-msg" name="message" placeholder="Where are you based, and when would suit you?" /></div>
      </div>
      {err && <p className="form-error">Please add your name.</p>}
      <div className="form-actions">
        <button className="btn btn--wa" type="submit" onClick={() => setVia("whatsapp")}><Icon name="whatsapp" />Send on WhatsApp</button>
        <button className="btn btn--line" type="submit" onClick={() => setVia("email")}><Icon name="mail" />Send by email</button>
      </div>
      <p className="form-note">This opens WhatsApp or your email app with your message filled in. Nothing is sent until you press send there.</p>
    </form>
  );
}

export function Reveal() {
  useEffect(() => {
    document.querySelectorAll<HTMLImageElement>("img[data-hide-broken]").forEach((img) => {
      const hide = () => img.remove();
      if (img.complete && img.naturalWidth === 0) hide(); else img.addEventListener("error", hide, { once: true });
    });
    const els = document.querySelectorAll(".rv:not(.is-in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("is-in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_CODES as ALL, countryName, dial, isCountry, splitPhone } from "@/lib/phone";
import type { CountryCode } from "libphonenumber-js/min";

export { readPhone } from "@/lib/phone";

const flag = (c: string) => String.fromCodePoint(...[...c.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

/**
 * Phone number with a searchable country code picker. The country is guessed from the visitor's location (sent by the
 * host, e.g. Vercel) or, failing that, from the browser's language setting; it falls back to Kenya. Nothing is sent
 * anywhere to work out the location.
 */
export function PhoneField({ detected, value, label = "Phone (optional)" }: { detected?: string | null; value?: string | null; label?: string }) {
  const saved = splitPhone(value);
  const [iso, setIso] = useState<CountryCode>(saved.iso ?? (isCountry(detected) ? (detected.toUpperCase() as CountryCode) : "KE"));
  const [guessed, setGuessed] = useState(!saved.iso && isCountry(detected));
  // Country names come from the browser, so the hint is shown after loading (the server's names can differ slightly).
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const number = useRef<HTMLInputElement>(null);
  const listEl = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setReady(true);
    if (saved.iso || isCountry(detected)) return;
    for (const lang of navigator.languages ?? []) {
      const region = lang.split("-")[1];
      if (isCountry(region)) { setIso(region.toUpperCase() as CountryCode); setGuessed(true); return; }
    }
  }, [detected, saved.iso]);

  const all = useMemo(() => (ready ? [...ALL].map((c) => ({ c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)) : []), [ready]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^\+/, "");
    if (!s) {
      const top = [...new Set([iso, "KE"])].map((c) => ({ c, name: countryName(c) }));
      return [...top, ...all.filter((x) => !top.some((t) => t.c === x.c))];
    }
    const starts = all.filter((x) => x.name.toLowerCase().startsWith(s) || dial(x.c).startsWith(s) || x.c.toLowerCase() === s);
    const contains = all.filter((x) => !starts.includes(x) && x.name.toLowerCase().includes(s));
    return [...starts, ...contains];
  }, [q, all, iso]);

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => { if (open) search.current?.focus(); }, [open]);
  useEffect(() => { listEl.current?.children[hi]?.scrollIntoView({ block: "nearest" }); }, [hi]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function choose(c: string) {
    setIso(c as CountryCode); setGuessed(false); setOpen(false); setQ("");
    number.current?.focus();
  }

  function keys(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) choose(matches[hi].c); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); setQ(""); }
  }

  return (
    <div className="field" ref={box}>
      <label htmlFor="phone_local">{label}</label>
      <div className="phone">
        <input type="hidden" name="phone_country" value={iso} />
        <button type="button" className="phone-code" aria-haspopup="listbox" aria-expanded={open} aria-label={`Country code: ${ready ? countryName(iso) : iso} +${dial(iso)}. Change`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => { if (/^[a-z0-9+]$/i.test(e.key)) { setQ(e.key); setOpen(true); e.preventDefault(); } }}>
          {flag(iso)} +{dial(iso)}
        </button>
        <input ref={number} id="phone_local" name="phone_local" type="tel" autoComplete="tel-national" inputMode="tel" defaultValue={saved.local} placeholder={iso === "KE" ? "712 345 678" : "Your number"} />
        {open && (
          <div className="phone-pop">
            <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={keys}
              placeholder="Type a country or code" aria-label="Search countries" role="combobox" aria-expanded="true" aria-controls="phone-list"
              aria-activedescendant={matches[hi] ? `pc-${matches[hi].c}` : undefined} autoComplete="off" />
            <ul id="phone-list" role="listbox" ref={listEl} aria-label="Countries">
              {matches.length === 0 && <li className="phone-none">No country matches “{q}”.</li>}
              {matches.map((x, i) => (
                <li key={x.c} id={`pc-${x.c}`} role="option" aria-selected={x.c === iso} className={i === hi ? "is-hi" : ""}
                  onPointerMove={() => setHi(i)} onClick={() => choose(x.c)}>
                  <span>{flag(x.c)}</span><b>{x.name}</b><small>+{dial(x.c)}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <small>{!ready ? " " : guessed ? `We picked ${countryName(iso)} from your location. Tap the flag to change it.` : "Tap the flag to choose your country."}</small>
    </div>
  );
}

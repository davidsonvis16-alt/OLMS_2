"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { passkeyMessage, passkeysSupported } from "@/lib/passkey";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { Icon } from "./icons";

const when = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never");

/** Add, rename and remove the devices that can sign in to this account by fingerprint or face. */
export function PasskeyManager() {
  const [supported, setSupported] = useState(true);
  const [items, setItems] = useState<PasskeyListItem[] | null>(null);
  const [off, setOff] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().auth.passkey.list();
    if (error) { setOff(passkeyMessage(error)); setItems([]); return; }
    setItems(data ?? []);
  }, []);
  useEffect(() => { setSupported(passkeysSupported()); load(); }, [load]);

  async function add() {
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.registerPasskey();
    if (error) setMsg({ ok: false, text: passkeyMessage(error) });
    else {
      const name = deviceName();
      if (data && "id" in data && data.id) await sb.auth.passkey.update({ passkeyId: String(data.id), friendlyName: name }).catch(() => {});
      setMsg({ ok: true, text: `Done. You can now sign in on this ${name.toLowerCase()} with your fingerprint or face.` });
      await load();
    }
    setBusy(false);
  }
  async function remove(p: PasskeyListItem) {
    if (!confirm(`Stop “${p.friendly_name || "this device"}” from signing in with fingerprint or face?`)) return;
    const { error } = await supabaseBrowser().auth.passkey.delete({ passkeyId: p.id });
    setMsg(error ? { ok: false, text: passkeyMessage(error) } : { ok: true, text: "Removed. That device now needs your password." });
    await load();
  }

  return (
    <section className="form-card narrow" style={{ marginTop: 20 }} aria-labelledby="pk-title">
      <h3 id="pk-title"><Icon name="fingerprint" />Fingerprint &amp; face sign-in</h3>
      <p>Sign in with the fingerprint reader, face unlock or PIN already on your phone or computer, instead of typing your password. Your fingerprint never leaves your device; Aspire only receives a secure key.</p>
      {!supported && <p className="alert alert--info">This browser can&apos;t do fingerprint or face sign-in. Try on your phone, or in an up-to-date Chrome, Safari or Edge.</p>}
      {off && <p className="alert alert--warn">{off}</p>}
      {items && items.length > 0 && (
        <ul className="pk-list">
          {items.map((p) => (
            <li key={p.id}>
              <span><b>{p.friendly_name || "Device"}</b><small>Added {when(p.created_at)} · last used {when(p.last_used_at)}</small></span>
              <button type="button" className="link-btn danger" onClick={() => remove(p)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {items && items.length === 0 && !off && <p className="muted small">No devices set up yet.</p>}
      {msg && <p className={`alert ${msg.ok ? "alert--ok" : "alert--error"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</p>}
      {supported && !off && (
        <button type="button" className="btn btn--ink" onClick={add} disabled={busy} style={{ marginTop: 14 }}>
          <Icon name="fingerprint" />{busy ? "Follow the prompt on your device…" : "Set up on this device"}
        </button>
      )}
      <p className="form-note">Set it up on each phone or computer you use. Lost a device? Remove it here; your password still works.</p>
    </section>
  );
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  return "Device";
}

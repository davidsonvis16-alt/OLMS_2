import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { passkeyMessage, passkeysSupported } from "@/lib/passkey";
import { Icon } from "./icons";

/** "Sign in with fingerprint or face" on the sign-in page. Hidden on browsers that can't do it. */
export function PasskeySignIn({ next }: { next: string }) {
  const r = useRouter();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setOk(passkeysSupported()), []);
  if (!ok) return null;

  async function go() {
    setBusy(true); setErr(null);
    const { data, error } = await supabaseBrowser().auth.signInWithPasskey();
    setBusy(false);
    if (error || !data?.session) { setErr(passkeyMessage(error)); return; }
    r.replace(next); r.refresh();
  }
  return (
    <div className="pk-signin">
      <div className="pk-or"><span>or</span></div>
      <button type="button" className="btn btn--line btn--lg btn--block" onClick={go} disabled={busy}>
        <Icon name="fingerprint" />{busy ? "Waiting for your device…" : "Sign in with fingerprint or face"}
      </button>
      {err && <p className="alert alert--error" role="alert" style={{ marginTop: 12 }}>{err}</p>}
    </div>
  );
}

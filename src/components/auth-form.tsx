import Link from "@/components/link";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Icon } from "./icons";
import { safeNext } from "@/lib/safe-next";
import { checkPassword } from "@/lib/password";
import { PasswordField } from "./password-field";
import { PasskeySignIn } from "./passkey-signin";
import { PhoneField, readPhone } from "./phone-field";

type Mode = "login" | "signup" | "forgot" | "reset";

const LINK_EXPIRED = "That link has expired or was already used. Sign in, or use “Forgot password?” to get a new one.";
const SUSPENDED = "This account has been suspended. If you think this is a mistake, contact Aspire.";

export function AuthForm({ mode, country }: { mode: Mode; country?: string | null }) {
  const r = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(
    params.get("error") === "link" ? LINK_EXPIRED
    : params.get("error") === "suspended" ? SUSPENDED : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [who, setWho] = useState<{ email?: string; name?: string }>({});

  // A reset link lands here as /reset#access_token=…&refresh_token=… (see "forgot" below). Sign in with it, then
  // clear it from the address bar so it isn't left in history.
  useEffect(() => {
    if (mode !== "reset" || !window.location.hash) return;
    const h = new URLSearchParams(window.location.hash.slice(1));
    history.replaceState(null, "", window.location.pathname);
    const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
    if (!access_token || !refresh_token) { if (h.get("error")) setErr(LINK_EXPIRED); return; }
    supabaseBrowser().auth.setSession({ access_token, refresh_token }).then(({ error }) => { if (error) setErr(LINK_EXPIRED); });
  }, [mode]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const sb = supabaseBrowser();
    const origin = window.location.origin;
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/invalid login/i.test(error.message)
          ? "Email or password is wrong. Passwords are case-sensitive: check capital letters, dots and symbols, or use “Forgot password?”."
          : /not confirmed/i.test(error.message) ? "Please confirm your email first: tap the link we emailed you."
          : /banned/i.test(error.message) ? SUSPENDED : error.message);
        // A full page load, so the new sign-in is carried on the very next request.
        setMsg("Signed in. Opening your account…");
        window.location.assign(next);
        return;
      } else if (mode === "signup") {
        const full_name = String(f.get("full_name") ?? "").trim();
        const { phone, country } = readPhone(f);
        newPassword(f, { email, name: full_name });
        if (f.get("terms") !== "yes") throw new Error("Please agree to the Terms and Conditions and the Privacy Policy to create an account.");
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, phone, country, terms: "yes" }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw new Error(/database error saving new user/i.test(error.message)
          ? "That phone number is already linked to another account. Each person can have one account: sign in instead, or use “Forgot password?”."
          : error.message);
        if (data.session) { r.replace(next); r.refresh(); }
        else setMsg("Check your email and tap the confirmation link to activate your account.");
      } else if (mode === "forgot") {
        // Not the usual cookie-bound sign-in: that kind of link only works in the browser that asked for it. This
        // kind carries its own one-time sign-in, so the email can be opened on any phone or computer.
        const anyDevice = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const { error } = await anyDevice.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset` });
        if (error) throw error;
        setMsg("If that email has an account, a reset link is on its way.");
      } else {
        newPassword(f, {});
        if (!(await sb.auth.getSession()).data.session) throw new Error(LINK_EXPIRED);
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw new Error(/different from the old/i.test(error.message) ? "Choose a password you haven't used on this account before." : error.message);
        r.replace("/dashboard"); r.refresh();
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  /** The same rules the checklist shows, enforced before anything is sent. */
  function newPassword(f: FormData, context: { email?: string; name?: string }) {
    const pw = String(f.get("password") ?? "");
    const failed = checkPassword(pw, context).rules.filter((r) => !r.ok);
    if (failed.length) throw new Error(`Your password still needs: ${failed.map((r) => r.label.toLowerCase()).join("; ")}.`);
    if (pw !== String(f.get("password_confirm") ?? "")) throw new Error("The two passwords don't match.");
  }

  const titles: Record<Mode, [string, string]> = {
    login: ["Welcome back.", "Sign in to continue your training."],
    signup: ["Start learning, free.", "Pay only for the certificate, once you pass."],
    forgot: ["Reset your password.", "We'll email you a link to choose a new one."],
    reset: ["Choose a new password.", "Use the generator, or mix capitals, small letters, numbers and symbols."],
  };

  return (
    <div className="auth-card">
      <span className="micro" style={{ marginBottom: 16 }}>{mode === "login" ? "Sign in" : mode === "signup" ? "New account" : "Password"}</span>
      <h1>{titles[mode][0]}</h1>
      <p>{titles[mode][1]}</p>
      <form onSubmit={submit} method="post" className="auth-form" onChange={(e) => {
        if (!(e.target instanceof HTMLInputElement)) return
        const t = e.target;
        if (t.name === "email") setWho((w) => ({ ...w, email: t.value }));
        if (t.name === "full_name") setWho((w) => ({ ...w, name: t.value }));
      }}>
        {mode === "signup" && (
          <>
            <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" autoComplete="name" required placeholder="As it should appear on your certificate" /></div>
            <PhoneField detected={country} />
          </>
        )}
        {mode !== "reset" && <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>}
        {mode === "login" && <PasswordField kind="current" />}
        {(mode === "signup" || mode === "reset") && <PasswordField kind="new" context={who} label={mode === "reset" ? "New password" : "Password"} />}
        {mode === "signup" && (
          <label className="agree">
            <input type="checkbox" name="terms" value="yes" required />
            <span>I agree to the <Link href="/terms" target="_blank">Terms and Conditions</Link> and the <Link href="/privacy" target="_blank">Privacy Policy</Link>, and I&apos;m creating one account for myself.</span>
          </label>
        )}
        {err && <p className="alert alert--error" role="alert">{err}</p>}
        {msg && <p className="alert alert--ok" role="status">{msg}</p>}
        <button className="btn btn--go btn--lg btn--block" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Save password"}
          {!busy && <Icon name="arrow" />}
        </button>
      </form>
      {mode === "login" && <PasskeySignIn next={next} />}
      <div className="auth-links">
        {mode === "login" && <><Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link><Link href="/forgot">Forgot password?</Link></>}
        {mode === "signup" && <span>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></span>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">Back to sign in</Link>}
      </div>
    </div>
  );
}

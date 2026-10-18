"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Icon } from "./icons";
import { safeNext } from "@/lib/safe-next";

type Mode = "login" | "signup" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const r = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
        if (error) throw error;
        r.replace(next); r.refresh();
      } else if (mode === "signup") {
        const full_name = String(f.get("full_name") ?? "").trim();
        const phone = String(f.get("phone") ?? "").trim();
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, phone }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        if (data.session) { r.replace(next); r.refresh(); }
        else setMsg("Check your email and tap the confirmation link to activate your account.");
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset` });
        if (error) throw error;
        setMsg("If that email has an account, a reset link is on its way.");
      } else {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        r.replace("/dashboard"); r.refresh();
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  const titles: Record<Mode, [string, string]> = {
    login: ["Welcome back.", "Sign in to continue your training."],
    signup: ["Start learning, free.", "Pay only for the certificate, once you pass."],
    forgot: ["Reset your password.", "We'll email you a link to choose a new one."],
    reset: ["Choose a new password.", "At least 8 characters."],
  };

  return (
    <div className="auth-card">
      <span className="micro" style={{ marginBottom: 16 }}>{mode === "login" ? "Sign in" : mode === "signup" ? "New account" : "Password"}</span>
      <h1>{titles[mode][0]}</h1>
      <p>{titles[mode][1]}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && (
          <>
            <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" autoComplete="name" required placeholder="As it should appear on your certificate" /></div>
            <div className="field"><label htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+254…" /></div>
          </>
        )}
        {mode !== "reset" && <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>}
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label>
            <input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? undefined : 8} />
          </div>
        )}
        {err && <p className="alert alert--error" role="alert">{err}</p>}
        {msg && <p className="alert alert--ok" role="status">{msg}</p>}
        <button className="btn btn--go btn--lg btn--block" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Save password"}
          {!busy && <Icon name="arrow" />}
        </button>
      </form>
      <div className="auth-links">
        {mode === "login" && <><Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link><Link href="/forgot">Forgot password?</Link></>}
        {mode === "signup" && <span>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></span>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">Back to sign in</Link>}
      </div>
    </div>
  );
}

/** Browser-side helpers for fingerprint / face sign-in (passkeys). */

export function passkeysSupported() {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

/** Turns Supabase and WebAuthn errors into plain words. */
export function passkeyMessage(e: unknown): string {
  const err = e as { code?: string; name?: string; message?: string; cause?: { name?: string } } | null;
  const code = err?.code ?? "", name = err?.cause?.name ?? err?.name ?? "", msg = err?.message ?? "";
  if (code === "passkey_disabled" || /passkeys are disabled/i.test(msg)) return "Fingerprint and face sign-in isn't switched on for this site yet. Please sign in with your password.";
  if (name === "NotAllowedError" || /ABORTED|cancel|not allowed|timed out/i.test(code + msg)) return "Cancelled. Nothing was changed. Try again when you're ready.";
  if (name === "InvalidStateError" || /already registered|excludeCredentials/i.test(msg)) return "This device is already set up for fingerprint or face sign-in.";
  if (/challenge_expired/i.test(code)) return "That took too long. Please try again.";
  if (/not found|no passkey|credential/i.test(msg)) return "No fingerprint or face sign-in is set up for this device yet. Sign in with your password, then add it under Your details.";
  return msg || "That didn't work. Please try again or sign in with your password.";
}

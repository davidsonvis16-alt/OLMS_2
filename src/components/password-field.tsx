import { useMemo, useState } from "react";
import { checkPassword, generatePassword, MIN_LENGTH } from "@/lib/password";
import { Icon } from "./icons";

/** A password input with show/hide. For a new password it also offers a generator, the rules as a live checklist, and a confirm box. */
export function PasswordField({ kind, context, label }: { kind: "current" | "new"; context?: { email?: string; name?: string }; label?: string }) {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const check = useMemo(() => checkPassword(value, context), [value, context]);
  const matches = confirm.length > 0 && confirm === value;

  function generate() {
    const pw = generatePassword();
    setValue(pw); setConfirm(pw); setShow(true); setCopied(false);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  const toggle = (
    <button type="button" className="pw-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} title={show ? "Hide password" : "Show password"}>
      <Icon name={show ? "eyeOff" : "eye"} />
    </button>
  );

  if (kind === "current") {
    return (
      <div className="field">
        <label htmlFor="password">{label ?? "Password"}</label>
        <div className="pw-wrap">
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required value={value} onChange={(e) => setValue(e.target.value)} />
          {toggle}
        </div>
      </div>
    );
  }

  return (
    <div className="pw-new">
      <div className="field">
        <div className="pw-head">
          <label htmlFor="password">{label ?? "Password"}</label>
          <button type="button" className="pw-gen" onClick={generate}><Icon name="dice" />Generate a strong password</button>
        </div>
        <div className="pw-wrap">
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={MIN_LENGTH}
            value={value} onChange={(e) => { setValue(e.target.value); setCopied(false); }} aria-describedby="pw-rules" aria-invalid={value.length > 0 && !check.valid} />
          {value && <button type="button" className="pw-btn" onClick={copy} aria-label="Copy password" title="Copy password"><Icon name={copied ? "check" : "copy"} /></button>}
          {toggle}
        </div>
      </div>
      <div className="pw-rules" id="pw-rules">
        <p>Your password must have:</p>
        <ul>{check.rules.map((r) => <li key={r.id} className={r.ok ? "ok" : ""}><span aria-hidden="true">{r.ok ? "✓" : "·"}</span>{r.label}<span className="sr-only">{r.ok ? " (done)" : " (not yet)"}</span></li>)}</ul>
        <p className="pw-tip">Tip: press <b>Generate</b> for a random password that's different every time, then save it in your phone or browser&apos;s password manager. Never reuse a password from another site.</p>
      </div>
      <div className="field">
        <label htmlFor="password_confirm">Type it again</label>
        <div className="pw-wrap">
          <input id="password_confirm" name="password_confirm" type={show ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={confirm.length > 0 && !matches} />
        </div>
        {confirm.length > 0 && !matches && <small className="pw-miss" role="status">The two passwords don&apos;t match yet.</small>}
      </div>
    </div>
  );
}

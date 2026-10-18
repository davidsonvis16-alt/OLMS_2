"use client";
import { useState } from "react";
import { Icon } from "./icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn--outline btn--sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* ignore */ } }}>
      <Icon name={ok ? "check" : "copy"} />{ok ? "Copied" : label}
    </button>
  );
}

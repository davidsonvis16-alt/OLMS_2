"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

export function HeaderShell({ children, brand, stage }: { children: React.ReactNode; brand: React.ReactNode; stage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [onStage, setOnStage] = useState(!!stage);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => {
      if (!stage) return;
      const s = document.querySelector<HTMLElement>(".stage");
      setOnStage(!!s && window.scrollY < s.offsetHeight - 68);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("keydown", esc); };
  }, [stage]);
  return (
    <header className={`site-header${onStage && !open ? " is-stage" : ""}`}>
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap hdr">
        {brand}
        <button className="nav-toggle" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <Icon name={open ? "close" : "menu"} />
        </button>
        <nav className={`nav${open ? " is-open" : ""}`} id="site-nav" aria-label="Main">{children}</nav>
      </div>
    </header>
  );
}

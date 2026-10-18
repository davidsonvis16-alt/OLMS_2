"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/site";

/** Category filter for the catalogue. Rows carry data-cats; the URL keeps ?c= in sync. */
export function CourseTabs({ counts, children }: { counts: Record<string, number>; children: React.ReactNode }) {
  const params = useSearchParams();
  const initial = params.get("c");
  const [cat, setCat] = useState<string>(CATEGORIES.some((c) => c.id === initial) ? initial! : "all");
  const tabs = useMemo(() => [{ id: "all", label: "All courses" }, ...CATEGORIES], []);

  useEffect(() => {
    let shown = 0;
    document.querySelectorAll<HTMLElement>("[data-courses] [data-cats]").forEach((el) => {
      const ok = cat === "all" || (el.dataset.cats || "").split(" ").includes(cat);
      el.hidden = !ok; if (ok) shown++;
    });
    document.querySelector("[data-empty]")?.classList.toggle("is-visible", shown === 0);
    const url = new URL(window.location.href);
    if (cat === "all") url.searchParams.delete("c"); else url.searchParams.set("c", cat);
    window.history.replaceState(null, "", url);
  }, [cat]);

  return (
    <>
      <div className="filters">
        <div className="wrap" role="group" aria-label="Filter courses by category">
          {tabs.map((t) => (
            <button key={t.id} type="button" aria-pressed={cat === t.id} onClick={() => setCat(t.id)}>
              {t.label}<sup>{counts[t.id] ?? 0}</sup>
            </button>
          ))}
        </div>
      </div>
      {children}
    </>
  );
}

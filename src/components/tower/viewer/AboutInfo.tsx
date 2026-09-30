"use client";

import { useEffect, useRef, useState } from "react";
import { ui } from "@/i18n/ui";
import type { Lang } from "@/i18n";

/**
 * A small ⓘ after the title: opens a note that the site is independent of Swiss Prime Site and
 * the Prime Tower, with a link to the sources. Closes on a click elsewhere or Escape.
 * Spans only, as it sits inside the <h1>.
 */
export function AboutInfo({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const t = ui[lang];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative ml-2 inline-block align-top pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.aboutLabel}
        aria-expanded={open}
        title={t.aboutLabel}
        className={
          "grid h-5 w-5 place-items-center rounded-full border font-mono text-[11px] font-normal leading-none transition-colors sm:h-6 sm:w-6 sm:text-xs " +
          (open ? "border-accent text-accent" : "border-line text-muted hover:border-accent hover:text-accent")
        }
      >
        i
      </button>
      {open && (
        <span role="dialog" aria-label={t.aboutLabel} className="glass absolute left-0 top-full z-50 mt-2 block w-64 rounded-xl p-4 text-sm font-normal leading-relaxed tracking-normal text-paper shadow-2xl sm:w-72">
          {t.notAffiliated}
          <a href="#sources" onClick={() => setOpen(false)} className="mt-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-accent hover:underline">
            {t.nav.sources} ↓
          </a>
        </span>
      )}
    </span>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { slides } from "@/data/presentation";
import { pick } from "@/i18n";
import { LangToggle, useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { CANVAS_H, CANVAS_W, SlideView } from "./SlideView";

/* The current slide lives in the URL hash (#1 … #8), read through an external store so it hydrates cleanly. */
function slideFromHash() {
  const n = parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= slides.length ? n - 1 : 0;
}
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const serverSlide = () => 0;

/**
 * The school-talk deck: a fixed 1920×1080 canvas scaled to fit the viewport.
 * Arrow keys / space / click step through; F toggles fullscreen; N toggles speaker notes.
 * The current slide is kept in the URL hash so a reload or a shared link lands on it.
 */
export function SlideDeck() {
  const { lang } = useLang();
  const t = ui[lang].sections.talk;
  const index = useSyncExternalStore(subscribeHash, slideFromHash, serverSlide);
  const [notes, setNotes] = useState(false);
  const [scale, setScale] = useState(0.5);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const go = useCallback((n: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, n));
    if (next !== slideFromHash()) window.location.hash = `#${next + 1}`;
  }, []);

  const step = useCallback((d: number) => go(slideFromHash() + d), [go]);

  /* Fit the canvas into whatever space the stage has. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / CANVAS_W, r.height / CANVAS_H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes]);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          step(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          step(-1);
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(slides.length - 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "n":
        case "N":
          setNotes((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, toggleFullscreen]);

  const slide = slides[index];
  const btn = "rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper hover:text-accent hover:border-accent disabled:opacity-30 disabled:hover:text-paper disabled:hover:border-line";

  return (
    <div ref={rootRef} className="h-dvh w-full flex flex-col bg-ink text-paper select-none">
      <div className="flex-1 min-h-0 flex">
        {/* Stage */}
        <div ref={stageRef} className="flex-1 min-w-0 min-h-0 relative">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl"
            style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              step(e.clientX - r.left < r.width / 3 ? -1 : 1);
            }}
          >
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}>
              {/* Keep the neighbours mounted so their photos are already loaded when they appear. */}
              {slides.map((s, i) =>
                Math.abs(i - index) <= 1 ? (
                  <div key={s.id} className="absolute inset-0" style={{ visibility: i === index ? "visible" : "hidden" }} aria-hidden={i !== index}>
                    <SlideView slide={s} index={i} lang={lang} active={i === index} />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </div>

        {/* Speaker notes */}
        {notes && (
          <aside className="w-96 shrink-0 border-l border-line bg-ink-2 p-6 overflow-y-auto">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent mb-3">
              {t.notes} · {index + 1}/{slides.length}
            </p>
            <p className="text-sm leading-relaxed text-paper/90">{pick(slide.notes, lang)}</p>
          </aside>
        )}
      </div>

      {/* Control bar */}
      <div className="h-14 shrink-0 glass border-x-0 border-b-0 px-4 sm:px-6 flex items-center gap-3">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted hover:text-accent shrink-0">
          ← {t.back}
        </Link>
        <span className="hidden md:block text-[11px] text-muted font-mono truncate">{t.help}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button type="button" className={btn} onClick={() => step(-1)} disabled={index === 0} aria-label={t.prev}>
            ←
          </button>
          <span className="font-mono text-[11px] tracking-[0.2em] text-paper tabular-nums w-16 text-center">
            {index + 1} / {slides.length}
          </span>
          <button type="button" className={btn} onClick={() => step(1)} disabled={index === slides.length - 1} aria-label={t.next}>
            →
          </button>
          <button type="button" className={`${btn} hidden sm:block ${notes ? "text-accent border-accent" : ""}`} onClick={() => setNotes((v) => !v)}>
            {t.notes}
          </button>
          <button type="button" className={`${btn} hidden sm:block`} onClick={toggleFullscreen}>
            {t.fullscreen}
          </button>
          <LangToggle />
        </div>
      </div>
    </div>
  );
}

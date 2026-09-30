"use client";

import { slides } from "@/data/presentation";
import { pick, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { CANVAS_H, CANVAS_W, SlideView } from "./SlideView";

/**
 * Every slide at full canvas size, one per printed page. scripts/export-talk.mjs prints this
 * to PDF and lifts the slides (with their speaker notes, in `data-notes`) into the offline HTML,
 * whose controls take their labels from `data-ui`.
 */
export function SlidePrint({ lang }: { lang: Lang }) {
  const t = ui[lang].sections.talk;
  const labels = { help: t.help, prev: t.prev, next: t.next, notes: t.notes, fullscreen: t.fullscreen };
  return (
    <div className="talk-print" data-ui={JSON.stringify(labels)}>
      <style>{`@page { size: ${CANVAS_W}px ${CANVAS_H}px; margin: 0 } .talk-print-slide { break-after: page; print-color-adjust: exact; -webkit-print-color-adjust: exact }`}</style>
      {slides.map((s, i) => (
        <div key={s.id} className="talk-print-slide relative overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H }} data-notes={pick(s.notes, lang)}>
          <SlideView slide={s} index={i} lang={lang} active />
        </div>
      ))}
    </div>
  );
}

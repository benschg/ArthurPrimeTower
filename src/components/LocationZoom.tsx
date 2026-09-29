"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geo, type Box } from "@/data/geo";
import { l, pick, type L, type Lang } from "@/i18n";

type Level = "switzerland" | "city" | "kreis5";
const levels: Level[] = ["switzerland", "city", "kreis5"];

const txt = {
  levels: {
    switzerland: l("Switzerland", "Schweiz"),
    city: l("City of Zürich", "Stadt Zürich"),
    kreis5: l("Kreis 5", "Kreis 5"),
  } as Record<Level, L>,
  captions: {
    switzerland: l(
      "Northern Switzerland, in the Canton of Zürich, about 20 km from the German border.",
      "In der Nordschweiz, im Kanton Zürich, rund 20 km von der deutschen Grenze.",
    ),
    city: l(
      "In Kreis 5, the former Industriequartier, about 2 km west of the main station. The city has twelve Kreise.",
      "Im Kreis 5, dem ehemaligen Industriequartier, rund 2 km westlich des Hauptbahnhofs. Die Stadt hat zwölf Kreise.",
    ),
    kreis5: l(
      "In the Escher Wyss quarter, on the railway tracks beside Bahnhof Hardbrücke.",
      "Im Quartier Escher Wyss, direkt am Gleisfeld beim Bahnhof Hardbrücke.",
    ),
  } as Record<Level, L>,
  zoomIn: l("Zoom in", "Hineinzoomen"),
  zoomOut: l("Zoom out", "Herauszoomen"),
  canton: l("Canton of Zürich", "Kanton Zürich"),
  lake: l("Lake Zurich", "Zürichsee"),
  hint: l("Click the map or use + and − to zoom.", "Karte anklicken oder + und − zum Zoomen."),
  credit: l(
    "Boundaries: swisstopo swissBOUNDARIES3D and VECTOR25, Stadt Zürich Open Data, Natural Earth.",
    "Grenzen: swisstopo swissBOUNDARIES3D und VECTOR25, Open Data Stadt Zürich, Natural Earth.",
  ),
};

const PAD: Record<Level, number> = { switzerland: 0.04, city: 0.08, kreis5: 0.12 };
const ASPECT = 16 / 10;

/** Level bounds, padded and widened to the map's aspect ratio. */
function levelBox(level: Level): Box {
  const b = geo[level].bounds;
  const p = PAD[level];
  let w = b.w * (1 + 2 * p);
  let h = b.h * (1 + 2 * p);
  if (w / h < ASPECT) w = h * ASPECT;
  else h = w / ASPECT;
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
}
const boxes = Object.fromEntries(levels.map((lv) => [lv, levelBox(lv)])) as Record<Level, Box>;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Zoom path: width interpolates logarithmically, and the centre moves in step with the width. */
function interpolate(a: Box, b: Box, t: number): Box {
  const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * t);
  const s = a.w === b.w ? t : (a.w - w) / (a.w - b.w);
  const cx = a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * s;
  const cy = a.y + a.h / 2 + (b.y + b.h / 2 - (a.y + a.h / 2)) * s;
  const h = w / ASPECT;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** 0 when the view is wider than `from`, 1 when narrower than `to` (log scale). */
const fadeIn = (w: number, from: number, to: number) => Math.max(0, Math.min(1, (Math.log(from) - Math.log(w)) / (Math.log(from) - Math.log(to))));

function niceScale(metres: number) {
  const steps = [100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000];
  return steps.reduce((best, s) => (s <= metres ? s : best), steps[0]);
}

export function LocationZoom({ lang }: { lang: Lang }) {
  const [level, setLevel] = useState<Level>("switzerland");
  const [view, setView] = useState<Box>(boxes.switzerland);
  const viewRef = useRef(view);
  const frame = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [pxWidth, setPxWidth] = useState(800);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPxWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = useCallback((next: Level) => {
    setLevel(next);
    if (frame.current) cancelAnimationFrame(frame.current);
    const from = viewRef.current;
    const to = boxes[next];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const v = interpolate(from, to, ease(t));
      viewRef.current = v;
      setView(v);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => () => void (frame.current && cancelAnimationFrame(frame.current)), []);

  const idx = levels.indexOf(level);
  const zoomIn = () => idx < levels.length - 1 && go(levels[idx + 1]);
  const zoomOut = () => idx > 0 && go(levels[idx - 1]);

  // Sizes in map units that stay constant on screen.
  const unit = view.w / pxWidth; // metres per CSS pixel
  const font = 12 * unit;
  const cityOpacity = fadeIn(view.w, boxes.switzerland.w * 0.35, boxes.city.w * 1.3);
  const kreisOpacity = fadeIn(view.w, boxes.city.w * 0.6, boxes.kreis5.w * 1.2);
  const [tx, ty] = geo.tower;

  const scaleM = niceScale(view.w * 0.2);
  const scalePx = scaleM / unit;

  return (
    <figure className="rounded-2xl overflow-hidden border border-line bg-ink-2">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
        {levels.map((lv, i) => (
          <button
            key={lv}
            type="button"
            onClick={() => go(lv)}
            aria-pressed={level === lv}
            className={
              "rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors " +
              (level === lv ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-paper")
            }
          >
            {i > 0 && <span className="opacity-50 mr-1">›</span>}
            {pick(txt.levels[lv], lang)}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={zoomOut} disabled={idx === 0} aria-label={pick(txt.zoomOut, lang)} className="h-8 w-8 rounded-full border border-line text-paper hover:border-accent hover:text-accent disabled:opacity-30">
            −
          </button>
          <button type="button" onClick={zoomIn} disabled={idx === levels.length - 1} aria-label={pick(txt.zoomIn, lang)} className="h-8 w-8 rounded-full border border-line text-paper hover:border-accent hover:text-accent disabled:opacity-30">
            +
          </button>
        </div>
      </div>

      <div ref={wrap} className="relative bg-[#0e141b]" style={{ aspectRatio: String(ASPECT) }}>
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="absolute inset-0 h-full w-full cursor-zoom-in select-none"
          onClick={zoomIn}
          role="img"
          aria-label={`${pick(txt.levels[level], lang)}: ${pick(txt.captions[level], lang)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "=") zoomIn();
            if (e.key === "-") zoomOut();
          }}
        >
          {/* Country */}
          <path d={geo.switzerland.outline} fill="#1b2430" stroke="#5c6f83" strokeWidth={1.2} vectorEffect="non-scaling-stroke" fillRule="evenodd" />
          <path d={geo.switzerland.lakes} fill="#23445f" />
          <path
            d={geo.switzerland.canton}
            fill="#7dd3c0"
            fillOpacity={0.18 * (1 - cityOpacity * 0.7)}
            stroke="#7dd3c0"
            strokeOpacity={0.8 * (1 - cityOpacity)}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* City with its twelve Kreise */}
          <g opacity={cityOpacity}>
            <path d={geo.city.lakes} fill="#23445f" />
            {geo.city.kreise.map((k) => (
              <path
                key={k.no}
                d={k.d}
                fill={k.no === 5 ? "#7dd3c0" : "#2a3644"}
                fillOpacity={k.no === 5 ? 0.35 * (1 - kreisOpacity * 0.6) : 1}
                stroke={k.no === 5 ? "#7dd3c0" : "#6d8096"}
                strokeWidth={k.no === 5 ? 1.6 : 0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <g opacity={1 - kreisOpacity}>
              {geo.city.kreise.map((k) => (
                <text key={k.no} x={k.label[0]} y={k.label[1] - (k.no === 5 ? 18 * unit : 0)} fontSize={font * 1.1} textAnchor="middle" dominantBaseline="middle" fill={k.no === 5 ? "#e8edf2" : "#8b98a8"} fontFamily="var(--font-mono)">
                  {k.no}
                </text>
              ))}
            </g>
          </g>

          {/* Kreis 5 and its statistical quarters */}
          <g opacity={kreisOpacity}>
            <path d={geo.kreis5.outline} fill="#7dd3c0" fillOpacity={0.12} stroke="#7dd3c0" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            {geo.kreis5.quartiere.map((q) => (
              <g key={q.name}>
                <path d={q.d} fill="none" stroke="#8b98a8" strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
                <text x={q.label[0]} y={q.label[1]} fontSize={font} textAnchor="middle" fill="#c7d1dc" fontFamily="var(--font-mono)" letterSpacing={font * 0.08}>
                  {q.name.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

          {/* Context labels */}
          <text
            x={geo.city.bounds.x + geo.city.bounds.w * 0.95}
            y={geo.city.bounds.y + geo.city.bounds.h * 1.02}
            fontSize={font * 0.95}
            fill="#6f9cc2"
            fontStyle="italic"
            opacity={cityOpacity * (1 - kreisOpacity)}
          >
            {pick(txt.lake, lang)}
          </text>
          <text x={geo.switzerland.bounds.x + geo.switzerland.bounds.w * 0.62} y={geo.switzerland.bounds.y + geo.switzerland.bounds.h * 0.02} fontSize={font} fill="#7dd3c0" opacity={1 - cityOpacity}>
            {pick(txt.canton, lang)}
          </text>

          {/* The tower */}
          <circle cx={tx} cy={ty} r={14 * unit} fill="#e25c4a" opacity={0.25}>
            <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={tx} cy={ty} r={6 * unit} fill="#e25c4a" stroke="#fff" strokeWidth={2 * unit} />
          <text x={tx + 11 * unit} y={ty - 9 * unit} fontSize={font * 1.05} fill="#fff" fontWeight={600} style={{ paintOrder: "stroke" }} stroke="#0e141b" strokeWidth={3 * unit}>
            Prime Tower
          </text>
        </svg>

        {/* Scale bar */}
        <div className="pointer-events-none absolute left-4 bottom-3 font-mono text-[10px] text-muted">
          <div className="h-1.5 border-x border-b border-muted" style={{ width: scalePx }} />
          <span>{scaleM >= 1000 ? `${scaleM / 1000} km` : `${scaleM} m`}</span>
        </div>
      </div>

      <figcaption className="px-4 py-3 text-sm">
        <p>{pick(txt.captions[level], lang)}</p>
        <p className="mt-1 text-[11px] text-muted">
          {pick(txt.hint, lang)} {pick(txt.credit, lang)}
        </p>
      </figcaption>
    </figure>
  );
}

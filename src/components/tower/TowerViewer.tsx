"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { floorBands, tenants } from "@/data/tower";
import { floorElevation, FLOORS, stageForFloor, TOWER_HEIGHT } from "./geometry";
import type { ViewerState } from "./TowerScene";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-muted font-mono text-xs tracking-widest uppercase">
      Loading 3D model…
    </div>
  ),
});

type Toggle = { key: keyof Omit<ViewerState, "hovered" | "selected">; label: string; hint: string };

const toggles: Toggle[] = [
  { key: "showTenants", label: "Tenants", hint: "Colour floors by tenant and reveal cores, columns and struts" },
  { key: "explode", label: "Explode", hint: "Separate the 36 floor plates" },
  { key: "showGarage", label: "Garage", hint: "Look beneath the plaza at the two-level car park" },
  { key: "night", label: "Night", hint: "Lit windows" },
  { key: "autoRotate", label: "Rotate", hint: "Slow orbit" },
];

export function TowerViewer() {
  const [state, setState] = useState<ViewerState>({
    showTenants: false,
    showGarage: false,
    explode: false,
    autoRotate: true,
    night: false,
    hovered: null,
    selected: null,
  });

  const onHover = useCallback((f: number | null) => setState((s) => (s.hovered === f ? s : { ...s, hovered: f })), []);
  const onSelect = useCallback((f: number | null) => setState((s) => ({ ...s, selected: f })), []);
  const toggle = (key: Toggle["key"]) =>
    setState((s) => {
      const next = { ...s, [key]: !s[key] };
      if (key === "showGarage" && next.showGarage) next.explode = false;
      if (key === "explode" && next.explode) next.showGarage = false;
      return next;
    });

  const focus = state.selected ?? state.hovered;
  const band = focus === null ? null : floorBands.find((b) => focus >= b.from && focus <= b.to);
  const tenantsOnFloor = useMemo(() => {
    if (!band?.tenant) return [];
    return tenants.filter((t) => t.building === "Prime Tower" && t.name.toLowerCase().includes(band.tenant!.toLowerCase()));
  }, [band]);

  return (
    <div className="relative w-full h-[100svh] min-h-[560px] overflow-hidden bg-ink">
      <TowerScene {...state} onHover={onHover} onSelect={onSelect} />

      {/* Top-left title */}
      <div className="absolute left-4 top-4 sm:left-8 sm:top-8 pointer-events-none max-w-[60vw]">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Zürich-West · Hardstrasse 201</p>
        <h1 className="mt-2 text-4xl sm:text-6xl font-semibold tracking-tight leading-[0.95]">
          Prime
          <br />
          Tower
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xs hidden sm:block">
          126 m, 36 floors, an irregular octagon that broadens toward the top. Drag to orbit, scroll to zoom, hover a floor.
        </p>
      </div>

      {/* Controls */}
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8 flex flex-col gap-1.5 items-end">
        {toggles.map((t) => (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            title={t.hint}
            className={
              "glass rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors " +
              (state[t.key] ? "text-ink !bg-accent border-accent" : "text-paper hover:text-accent")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Floor info card */}
      <div className="absolute left-4 bottom-4 sm:left-8 sm:bottom-8 glass rounded-xl p-4 w-[calc(100%-2rem)] sm:w-80 pointer-events-none">
        {focus === null ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Floor plate</p>
            <p className="mt-1 text-sm leading-snug">
              Hover or tap a floor to see who is there. Toggle <span className="text-accent">Tenants</span> to colour the
              whole stack.
            </p>
            <p className="mt-2 text-[11px] text-muted">
              Model built from the 3. OG letting plan, Gigon/Guyer plans and sections and OSM footprints. Stylised, not a survey.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Floor {focus === 0 ? "G" : focus} of {FLOORS - 1} · {floorElevation(focus).toFixed(1)} m
            </p>
            <p className="mt-1 text-base font-medium leading-snug">{band?.label ?? "Offices"}</p>
            <p className="mt-1 text-[11px] text-muted">{stageForFloor(focus).label}</p>
            {tenantsOnFloor.map((t) => (
              <p key={t.name} className="mt-2 text-xs text-muted">
                <span className="text-paper">{t.name}</span> · {t.industry}
                {t.note ? ` · ${t.note}` : ""}
              </p>
            ))}
          </>
        )}
      </div>

      {/* Height scale */}
      <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 hidden md:flex flex-col items-end gap-1 font-mono text-[10px] text-muted pointer-events-none">
        <span>▲ {TOWER_HEIGHT.toFixed(0)} m roof</span>
        <span>118.7 m highest occupied floor</span>
        <span>6.7 m double-height lobby</span>
        <span>−6.8 m garage level 2</span>
      </div>

      <a
        href="#facts"
        className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted hover:text-accent hidden sm:block"
      >
        scroll ↓
      </a>
    </div>
  );
}

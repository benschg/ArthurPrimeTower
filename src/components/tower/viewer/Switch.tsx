"use client";

import type { ReactNode } from "react";

/**
 * Two-state slider switch in the style of the day/night control: both states sit at the
 * ends of a pill and a knob slides to the active one. `on` selects the right-hand state.
 */
export function Switch({
  on,
  onToggle,
  label,
  hint,
  left,
  right,
  disabled = false,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  left: ReactNode;
  right: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={hint ?? label}
      disabled={disabled}
      onClick={onToggle}
      className="glass relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-40"
    >
      <span
        aria-hidden
        className={
          "absolute left-1 top-1 h-7 w-7 rounded-full bg-accent shadow-[0_0_10px_rgba(125,211,192,0.35)] transition-transform duration-500 " +
          "[transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)] " +
          (on ? "translate-x-7" : "translate-x-0")
        }
      />
      <span className={"absolute left-1 top-1 grid h-7 w-7 place-items-center transition-opacity duration-300 " + (on ? "opacity-45" : "text-ink")}>{left}</span>
      <span className={"absolute right-1 top-1 grid h-7 w-7 place-items-center transition-opacity duration-300 " + (on ? "text-ink" : "opacity-45")}>{right}</span>
    </button>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Still camera: a plain ring. */
export function IconStill() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

/** Orbiting camera: a circular arrow, spinning slowly while active. */
export function IconRotate({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={"h-4 w-4 " + (spinning ? "animate-[dn-spin_6s_linear_infinite]" : "")} {...stroke} aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.35-5.65" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

/** Stacked floors, touching. */
export function IconStacked() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke} aria-hidden>
      <path d="M5 8.5h14M5 12h14M5 15.5h14" />
    </svg>
  );
}

/** Exploded floors, pulled apart with arrows. */
export function IconExploded() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke} aria-hidden>
      <path d="M6 5h12M6 12h12M6 19h12" />
      <path d="M3 9l0-3M2 7.5L3 6l1 1.5M3 15v3M2 16.5L3 18l1-1.5" />
    </svg>
  );
}

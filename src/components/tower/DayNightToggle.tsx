"use client";

/**
 * Animated sun/moon switch. The sun's rays spin slowly and retract, the disc slides
 * and a shadow disc sweeps in to carve the crescent, and a few stars fade up at night.
 * All motion is CSS (see .dn-* rules in globals.css), so it stays cheap.
 */
export function DayNightToggle({ night, onToggle, label, hint }: { night: boolean; onToggle: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={hint}
      aria-label={label}
      aria-pressed={night}
      data-night={night ? "1" : "0"}
      className={
        "dn glass relative h-9 w-16 rounded-full overflow-hidden transition-colors duration-700 " +
        (night ? "border-accent-2/60" : "border-line")
      }
    >
      {/* sky behind the knob */}
      <span className="dn-sky absolute inset-0 rounded-full" />
      {/* stars */}
      <span className="dn-star absolute h-0.5 w-0.5 rounded-full bg-paper" style={{ left: "14%", top: "28%" }} />
      <span className="dn-star absolute h-1 w-1 rounded-full bg-paper" style={{ left: "26%", top: "58%", animationDelay: "0.6s" }} />
      <span className="dn-star absolute h-0.5 w-0.5 rounded-full bg-paper" style={{ left: "40%", top: "36%", animationDelay: "1.1s" }} />
      {/* celestial body */}
      <svg viewBox="0 0 24 24" className="dn-orb absolute top-1/2 h-7 w-7" aria-hidden>
        <defs>
          <mask id="dn-crescent">
            <rect width="24" height="24" fill="white" />
            <circle className="dn-shadow" cx="12" cy="12" r="7" fill="black" />
          </mask>
        </defs>
        <g className="dn-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 12 + Math.cos(a) * 8.2;
            const y1 = 12 + Math.sin(a) * 8.2;
            const x2 = 12 + Math.cos(a) * 10.8;
            const y2 = 12 + Math.sin(a) * 10.8;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <circle className="dn-disc" cx="12" cy="12" r="5.6" fill="currentColor" mask="url(#dn-crescent)" />
      </svg>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * The warning that stays up for as long as a game on the bridge is on: a hazard sign that
 * drops in and keeps wobbling, with the frog itself holding up a stop sign. These are games,
 * and nobody is to try the real thing. (Animations in globals.css, off for reduced motion.)
 * `compact` is for the race, whose view is the road ahead: below desktop widths the sign is
 * smaller and loses its small print, to keep out of the way.
 */
export function FrogSign({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  const place = compact ? "top-44 sm:left-56 sm:right-24 sm:top-5 " : "top-44 sm:top-48 ";
  return (
    <div role="alert" className={"pointer-events-none absolute left-0 right-0 lg:left-80 lg:right-28 lg:top-5 z-20 flex justify-center px-4 " + place}>
      <div className="cross-sign max-w-[min(92vw,42rem)] overflow-hidden rounded-3xl border-4 border-[#10151b] bg-[#ffd91a] text-[#10151b]">
        <div className="cross-stripes h-2.5 sm:h-3" />
        <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2">
          <StopFrog small={compact} />
          <div>
            <p className={"font-extrabold uppercase leading-none tracking-tight lg:text-4xl " + (compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl")}>{title}</p>
            <p className={"mt-1 sm:mt-1.5 text-[13px] sm:text-base font-semibold leading-snug " + (compact ? "hidden lg:block" : "")}>{text}</p>
          </div>
        </div>
        <div className="cross-stripes h-2.5 sm:h-3" />
      </div>
    </div>
  );
}

/** The frog, bobbing and blinking, with a stop sign in its hand. */
function StopFrog({ small }: { small: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={"cross-bob shrink-0 lg:h-24 lg:w-24 " + (small ? "h-12 w-12 sm:h-14 sm:w-14" : "h-16 w-16 sm:h-24 sm:w-24")} aria-hidden>
      {/* stop sign on a stick, waved */}
      <g className="cross-wave">
        <rect x="50.5" y="22" width="3" height="26" rx="1.5" fill="#10151b" />
        <circle cx="52" cy="14" r="10.5" fill="#e0262a" stroke="#ffffff" strokeWidth="2" />
        <rect x="45.5" y="12" width="13" height="4" rx="1" fill="#ffffff" />
      </g>
      {/* body and head */}
      <ellipse cx="28" cy="50" rx="19" ry="11" fill="#3f8f3a" />
      <ellipse cx="28" cy="36" rx="22" ry="16" fill="#5cb84a" />
      <circle cx="16" cy="20" r="9" fill="#5cb84a" />
      <circle cx="40" cy="20" r="9" fill="#5cb84a" />
      <g className="cross-blink">
        <circle cx="16" cy="19.5" r="5.6" fill="#f6f8e6" />
        <circle cx="40" cy="19.5" r="5.6" fill="#f6f8e6" />
        <circle cx="17" cy="20" r="2.6" fill="#10151b" />
        <circle cx="39" cy="20" r="2.6" fill="#10151b" />
        <circle cx="18" cy="19" r="0.9" fill="#ffffff" />
        <circle cx="40" cy="19" r="0.9" fill="#ffffff" />
      </g>
      <circle cx="11" cy="38" r="3.4" fill="#f59aa0" opacity="0.8" />
      <circle cx="45" cy="38" r="3.4" fill="#f59aa0" opacity="0.8" />
      <path d="M17 39 Q28 49 39 39" fill="none" stroke="#1f4f1e" strokeWidth="2.4" strokeLinecap="round" />
      {/* the arm holding the stick */}
      <path d="M44 44 Q50 44 52 40" fill="none" stroke="#3f8f3a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

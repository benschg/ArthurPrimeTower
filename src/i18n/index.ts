export type Lang = "en" | "de";
export const langs: Lang[] = ["en", "de"];

/** A localised string. */
export type L = Record<Lang, string>;

export function isLang(v: string | undefined): v is Lang {
  return v === "en" || v === "de";
}

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "de" : "en";
}

/** Pick a localised string; falls back to English. */
export function pick(l: L | string | undefined, lang: Lang): string {
  if (l === undefined) return "";
  if (typeof l === "string") return l;
  return l[lang] ?? l.en;
}

/** Shorthand for building a localised string. */
export const l = (en: string, de: string): L => ({ en, de });

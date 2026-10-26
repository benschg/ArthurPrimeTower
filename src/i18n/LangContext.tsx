"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { readStored, writeStored } from "@/lib/storage";
import { isLang, type Lang } from "./index";

const STORAGE_KEY = "prime-tower-lang";
const DEFAULT_LANG: Lang = "de";

/* A tiny external store: localStorage when available, memory otherwise. */
const listeners = new Set<() => void>();
let memory: Lang | null = null;

function readLang(): Lang {
  if (memory) return memory;
  const v = readStored(STORAGE_KEY) ?? undefined;
  return isLang(v) ? v : DEFAULT_LANG;
}

function setLang(l: Lang) {
  memory = l;
  writeStored(STORAGE_KEY, l);
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const getServerSnapshot = () => DEFAULT_LANG;

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: DEFAULT_LANG, setLang });

/** German by default; a visitor's choice is remembered in localStorage, never in the URL. */
export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

/** Union Jack (simplified) and Swiss flag as small inline SVGs. */
export function FlagUK({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 36" className={className} aria-hidden>
      <rect width="60" height="36" fill="#012169" />
      <path d="M0 0L60 36M60 0L0 36" stroke="#fff" strokeWidth="7" />
      <path d="M0 0L60 36M60 0L0 36" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0V36M0 18H60" stroke="#fff" strokeWidth="11" />
      <path d="M30 0V36M0 18H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function FlagCH({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden>
      <rect width="36" height="36" fill="#D52B1E" />
      <path d="M15 7h6v8h8v6h-8v8h-6v-8H7v-6h8z" fill="#fff" />
    </svg>
  );
}

/** Language switch as two flags; the active language is highlighted. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const flag = (l: Lang, label: string, Flag: typeof FlagUK) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      lang={l}
      aria-label={label}
      aria-pressed={lang === l}
      title={label}
      className={
        "h-7 w-8 grid place-items-center rounded-full transition-all " +
        (lang === l ? "opacity-100 ring-2 ring-accent/70" : "opacity-45 hover:opacity-90")
      }
    >
      <Flag className="h-3.5 w-5 rounded-[2px] shadow-sm" />
    </button>
  );
  const flags = [flag("en", "English", FlagUK), flag("de", "Deutsch", FlagCH)];
  return (
    <div className={"flex items-center gap-1 rounded-full border border-line px-1.5 py-1 " + className} role="group" aria-label="Language">
      {flags}
    </div>
  );
}

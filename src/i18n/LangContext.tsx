"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { isLang, otherLang, type Lang } from "./index";
import { ui } from "./ui";

const STORAGE_KEY = "prime-tower-lang";
const DEFAULT_LANG: Lang = "de";

/* A tiny external store: localStorage when available, memory otherwise. */
const listeners = new Set<() => void>();
let memory: Lang | null = null;

function readStored(): Lang {
  if (memory) return memory;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(v ?? undefined)) return v as Lang;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_LANG;
}

function writeStored(l: Lang) {
  memory = l;
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* storage unavailable */
  }
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

type Ctx = { lang: Lang; setLang: (l: Lang) => void; toggle: () => void };
const LangCtx = createContext<Ctx>({ lang: DEFAULT_LANG, setLang: () => {}, toggle: () => {} });

/** German by default; a visitor's choice is remembered in localStorage, never in the URL. */
export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => writeStored(l), []);
  const toggle = useCallback(() => writeStored(otherLang(lang)), [lang]);

  return <LangCtx.Provider value={{ lang, setLang, toggle }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      lang={otherLang(lang)}
      className={"rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper hover:text-accent hover:border-accent " + className}
      aria-label={lang === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
    >
      {ui[lang].langSwitch}
    </button>
  );
}

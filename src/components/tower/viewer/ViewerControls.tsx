"use client";

import type { Lang } from "@/i18n";
import { FlagCH, FlagUK } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { DayNightToggle } from "../DayNightToggle";
import { IconExploded, IconRotate, IconStacked, IconStill, Switch } from "./Switch";

/** Top right: one column of slider switches for the language, auto-rotation, day/night and the explode view. */
export function ViewerControls({
  lang,
  setLang,
  autoRotate,
  night,
  explode,
  locked,
  onToggle,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  autoRotate: boolean;
  night: boolean;
  explode: boolean;
  /** a game has the camera and the facade: the view stays as it is */
  locked: boolean;
  onToggle: (key: "autoRotate" | "night" | "explode") => void;
}) {
  const t = ui[lang].viewer;
  return (
    <div data-board-avoid className="z-20 absolute right-4 top-4 sm:right-8 sm:top-8 flex flex-col gap-1.5 items-end">
      <Switch
        on={lang === "de"}
        onToggle={() => setLang(lang === "de" ? "en" : "de")}
        label={lang === "de" ? "Sprache: Deutsch" : "Language: English"}
        left={<FlagUK className="h-3.5 w-5 rounded-[2px] shadow-sm" />}
        right={<FlagCH className="h-3.5 w-3.5 rounded-[2px] shadow-sm" />}
      />
      <Switch
        on={autoRotate}
        onToggle={() => onToggle("autoRotate")}
        label={t.toggles.autoRotate[0]}
        hint={t.toggles.autoRotate[1]}
        disabled={locked}
        left={<IconStill />}
        right={<IconRotate spinning={autoRotate} />}
      />
      <DayNightToggle night={night} onToggle={() => onToggle("night")} label={t.toggles.night[0]} hint={t.toggles.night[1]} />
      <Switch
        on={explode}
        onToggle={() => onToggle("explode")}
        label={t.toggles.explode[0]}
        hint={t.toggles.explode[1]}
        disabled={locked}
        left={<IconStacked />}
        right={<IconExploded />}
      />
    </div>
  );
}

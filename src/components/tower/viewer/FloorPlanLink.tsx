"use client";

import { useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { planForFloor } from "../floorPlans";

export function FloorPlanLink({ floor }: { floor: number }) {
  const { lang } = useLang();
  const t = ui[lang];
  const ref = planForFloor(floor);
  const target = ref.pdf ?? ref.image;
  if (!target) return null;
  return (
    <a href={target.url} target="_blank" rel="noreferrer" className="ml-auto text-muted hover:text-accent underline decoration-line underline-offset-2">
      {t.viewer.planLink} ↗
    </a>
  );
}

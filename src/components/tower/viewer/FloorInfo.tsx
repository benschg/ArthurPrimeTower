"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { categoryLabel, profilesOnFloor } from "@/data/tenantProfiles";
import { bandForFloor } from "@/data/tower";
import { pick, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { floorElevation, FLOORS, polygonArea, stageForFloor } from "../geometry";
import { PAC_FLOOR } from "../pacman/maze";
import { FloorPlanLink } from "./FloorPlanLink";

/**
 * Bottom-left card when no game is on: how to use the model, or the hovered or pulled-out
 * floor with its height, use, area, plan and the companies on it.
 */
export function FloorInfo({ floor, pulled, lang, note, onRelease }: { floor: number | null; pulled: boolean; lang: Lang; note: string; onRelease: () => void }) {
  const t = ui[lang].viewer;
  const tenants = useMemo(() => (floor === null ? [] : profilesOnFloor(floor)), [floor]);
  if (floor === null) {
    return (
      <>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{t.floorPlate}</p>
        <p className="mt-1 text-sm leading-snug">
          {t.hint} <span className="text-accent">{t.hintTenants}</span> {t.hintRest}
        </p>
        <p className="mt-2 text-[11px] text-muted">{note}</p>
      </>
    );
  }
  const band = bandForFloor(floor);
  const stage = stageForFloor(floor);
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
        {t.floor} {floor === 0 ? t.ground : floor} {t.of} {FLOORS - 1} · {floorElevation(floor).toFixed(1)} m
      </p>
      <p className="mt-1 text-base font-medium leading-snug">{band ? pick(band.label, lang) : t.offices}</p>
      <p className="mt-1 text-[11px] text-muted">
        {pick(stage.label, lang)} · {polygonArea(stage.polygon).toFixed(0)} m²
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 pointer-events-auto font-mono text-[10px]">
        {pulled ? (
          <>
            <span className="text-accent">{t.pulled}</span>
            <button onClick={onRelease} className="glass rounded-md px-2 py-1 hover:text-accent">
              {t.release} ✕
            </button>
          </>
        ) : (
          <span className="text-muted">{floor === PAC_FLOOR ? ui[lang].pacman.tease : t.pullOut}</span>
        )}
        <FloorPlanLink floor={floor} />
      </div>
      {tenants.length > 0 && (
        <ul className="mt-3 space-y-2 pointer-events-auto">
          {tenants.map((p) => {
            const icon = tenantAssetBySlug[p.slug]?.icon;
            return (
              <li key={p.slug}>
                <Link href={`/tenants#${p.slug}`} className="group flex items-center gap-2.5 rounded-lg -mx-1 px-1 py-1 hover:bg-paper/5">
                  {icon && <Image src={`/tenants/${icon}`} alt="" width={32} height={32} className="shrink-0 rounded-md bg-white object-contain" style={{ width: 32, height: 32 }} />}
                  <span className="min-w-0">
                    <span className="block text-sm text-paper leading-tight group-hover:text-accent truncate">{p.name}</span>
                    <span className="block text-[11px] text-muted leading-tight truncate">
                      {pick(categoryLabel[p.category], lang)}
                      {p.floorsLabel ? ` · ${pick(p.floorsLabel, lang)}` : ""}
                    </span>
                  </span>
                  <span className="ml-auto text-muted group-hover:text-accent">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

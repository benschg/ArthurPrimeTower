import Image from "next/image";
import Link from "next/link";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { categoryLabel, statusClass, statusLabel, tenantProfiles, type ProfileBuilding } from "@/data/tenantProfiles";
import { pick, type Lang } from "@/i18n";

const buildings: ProfileBuilding[] = ["Prime Tower", "Platform", "Cubus", "Diagonal", "MAAG Halle"];

/** Tenants grouped by building, from the researched list. Each row opens the profile on /tenants. */
export function TenantList({ lang }: { lang: Lang }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {buildings.map((b) => {
        const rows = tenantProfiles.filter((p) => p.building === b);
        if (rows.length === 0) return null;
        const tower = b === "Prime Tower";
        return (
          <div key={b} className={tower ? "lg:col-span-2" : ""}>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-3">
              {b} <span className="text-muted">· {rows.length}</span>
            </h3>
            <ul className={"grid gap-2 " + (tower ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2")}>
              {rows.map((p) => {
                const icon = tenantAssetBySlug[p.slug]?.icon;
                const dim = p.status === "former" || p.status === "moved";
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/tenants#${p.slug}`}
                      className={
                        "group flex h-full items-center gap-3 rounded-xl border border-line bg-ink-2/60 px-3 py-2.5 hover:border-accent/60 hover:bg-ink-3/60 transition-colors " +
                        (dim ? "opacity-60 hover:opacity-100" : "")
                      }
                    >
                      {icon && <Image src={`/tenants/${icon}`} alt="" width={36} height={36} className="shrink-0 rounded-lg bg-white object-contain" style={{ width: 36, height: 36 }} />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight truncate group-hover:text-accent">{p.name}</span>
                        <span className="block text-xs text-muted leading-tight truncate mt-0.5">
                          {pick(categoryLabel[p.category], lang)}
                          {p.floorsLabel ? ` · ${pick(p.floorsLabel, lang)}` : ""}
                        </span>
                      </span>
                      {p.status !== "current" && (
                        <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono " + statusClass[p.status]}>{pick(statusLabel[p.status], lang)}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

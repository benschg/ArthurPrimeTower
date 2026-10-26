import { categoryLabel, profileBuildings, tenantProfiles, type ProfileBuilding, type ProfileCategory, type TenantProfile } from "@/data/tenantProfiles";
import { pick, type Lang } from "@/i18n";
import { Chip } from "./parts";
import { txt } from "./text";

const categories: ProfileCategory[] = ["finance", "law", "consulting", "tech", "realestate", "energy", "media", "food", "retail", "health", "culture"];

/** Search, building and category chips, and whether former tenants show. */
export function Filters(props: {
  lang: Lang;
  query: string;
  setQuery: (v: string) => void;
  building: ProfileBuilding | null;
  setBuilding: (v: ProfileBuilding | null) => void;
  category: ProfileCategory | null;
  setCategory: (v: ProfileCategory | null) => void;
  showPast: boolean;
  setShowPast: (v: boolean) => void;
}) {
  const { lang } = props;
  const count = (fn: (p: TenantProfile) => boolean) => tenantProfiles.filter(fn).length;
  return (
    <div className="space-y-3">
      <input
        type="search"
        value={props.query}
        onChange={(e) => props.setQuery(e.target.value)}
        placeholder={pick(txt.search, lang)}
        className="w-full rounded-xl border border-line bg-ink-2 px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        <Chip active={props.building === null} onClick={() => props.setBuilding(null)}>
          {pick(txt.all, lang)}
        </Chip>
        {profileBuildings.map((b) => (
          <Chip key={b} active={props.building === b} onClick={() => props.setBuilding(props.building === b ? null : b)}>
            {b} <span className="opacity-60">{count((p) => p.building === b)}</span>
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Chip key={c} active={props.category === c} onClick={() => props.setCategory(props.category === c ? null : c)}>
            {pick(categoryLabel[c], lang)}
          </Chip>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
        <input type="checkbox" checked={props.showPast} onChange={(e) => props.setShowPast(e.target.checked)} className="accent-[var(--accent)]" />
        {pick(txt.showPast, lang)}
      </label>
    </div>
  );
}

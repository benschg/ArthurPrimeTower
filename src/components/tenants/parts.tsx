import Image from "next/image";
import type { ReactNode } from "react";
import type { TenantAsset } from "@/data/tenantAssets";

/** A filter toggle. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors " +
        (active ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-paper hover:border-paper/40")
      }
    >
      {children}
    </button>
  );
}

/** A company's square icon on white. */
export function TenantIcon({ asset, name, size = 40, className = "" }: { asset?: TenantAsset; name: string; size?: number; className?: string }) {
  if (!asset) return null;
  return (
    <Image
      src={`/tenants/${asset.icon}`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={"rounded-lg bg-white object-contain shadow-md ring-1 ring-black/10 " + className}
      style={{ width: size, height: size }}
    />
  );
}

/** One labelled value in the detail drawer's fact row. */
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-3/50 px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 text-xs leading-snug">{value}</dd>
    </div>
  );
}

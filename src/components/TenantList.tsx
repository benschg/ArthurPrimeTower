import type { Tenant } from "@/data/types";

const buildings: Tenant["building"][] = ["Prime Tower", "Cubus", "Diagonal", "Platform"];

export function TenantList({ tenants }: { tenants: Tenant[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      {buildings.map((b) => {
        const rows = tenants.filter((t) => t.building === b);
        if (rows.length === 0) return null;
        return (
          <div key={b} className={b === "Prime Tower" ? "lg:col-span-2" : ""}>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-3">{b}</h3>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-ink-3 text-muted font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Company</th>
                    <th className="text-left px-4 py-2 font-medium">Industry</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Floors</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.name} className="border-t border-line bg-ink-2/60 hover:bg-ink-3/60">
                      <td className="px-4 py-2.5">
                        {t.source ? (
                          <a href={t.source} target="_blank" rel="noreferrer" className="hover:text-accent underline decoration-line underline-offset-4">
                            {t.name}
                          </a>
                        ) : (
                          t.name
                        )}
                        {t.note && <p className="text-xs text-muted mt-0.5">{t.note}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted">{t.industry}</td>
                      <td className="px-4 py-2.5 font-mono text-xs hidden sm:table-cell">{t.floors ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            "inline-block rounded-full px-2 py-0.5 text-[11px] font-mono " +
                            (t.status === "current" ? "bg-accent/15 text-accent" : "bg-muted/15 text-muted")
                          }
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

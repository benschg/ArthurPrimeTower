"use client";

import { FactGrid } from "@/components/FactGrid";
import { Gallery } from "@/components/Gallery";
import { MapEmbed } from "@/components/MapEmbed";
import { Section } from "@/components/Section";
import { TenantList } from "@/components/TenantList";
import { TowerViewer } from "@/components/tower/TowerViewer";
import { photos } from "@/data/photos";
import { annexes, architecture, facts, garage, heroFacts, location, plans, sources, tenants, timeline } from "@/data/tower";
import { pick } from "@/i18n";
import { LangToggle, useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";

const navIds = ["facts", "architecture", "plans", "tenants", "garage", "site", "gallery", "sources"] as const;

export default function Home() {
  const { lang } = useLang();
  const t = ui[lang];
  const s = t.sections;

  return (
    <main className="flex-1">
      <TowerViewer />

      <nav className="sticky top-0 z-40 glass border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-12 flex items-center gap-5 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-accent shrink-0">Prime Tower</span>
          {navIds.map((id) => (
            <a key={id} href={`#${id}`} className="shrink-0 text-muted hover:text-paper">
              {t.nav[id]}
            </a>
          ))}
          <LangToggle className="ml-auto shrink-0" />
        </div>
      </nav>

      <Section id="facts" eyebrow={s.facts.eyebrow} title={s.facts.title} intro={s.facts.intro}>
        <FactGrid facts={heroFacts} lang={lang} />
        <div className="h-4" />
        <FactGrid facts={facts} lang={lang} />
      </Section>

      <Section id="architecture" eyebrow={s.architecture.eyebrow} title={s.architecture.title} intro={s.architecture.intro}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {architecture.map((a) => (
            <article key={a.title.en} className="rounded-2xl border border-line bg-ink-2 p-5">
              <h3 className="font-semibold mb-2">{pick(a.title, lang)}</h3>
              <p className="text-sm text-muted leading-relaxed">{pick(a.text, lang)}</p>
            </article>
          ))}
        </div>

        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-accent mt-14 mb-4">{s.architecture.timeline}</h3>
        <ol className="relative border-l border-line ml-2 space-y-5">
          {timeline.map((x) => (
            <li key={x.year} className="pl-6 relative">
              <span className="absolute -left-1.25 top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <p className="font-mono text-xs text-accent">{x.year}</p>
              <p className="text-sm text-muted leading-relaxed">{pick(x.text, lang)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="plans" eyebrow={s.plans.eyebrow} title={s.plans.title} intro={s.plans.intro}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-line bg-ink-2 p-4 hover:border-accent/60 transition-colors">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {p.kind === "pdf" ? s.plans.pdfSource : `${s.plans.kinds[p.kind]} · ${s.plans.ggSource}`}
              </p>
              <p className="mt-1 font-medium group-hover:text-accent">{pick(p.title, lang)} ↗</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{pick(p.note, lang)}</p>
            </a>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-ink-2 p-5 text-sm text-muted leading-relaxed">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent mb-2">{s.plans.whatTitle}</p>
          <p>{s.plans.what}</p>
        </div>
      </Section>

      <Section id="tenants" eyebrow={s.tenants.eyebrow} title={s.tenants.title} intro={s.tenants.intro}>
        <TenantList tenants={tenants} lang={lang} />
      </Section>

      <Section id="garage" eyebrow={s.garage.eyebrow} title={s.garage.title} intro={s.garage.intro}>
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
          <dl className="grid grid-cols-2 gap-px bg-line rounded-2xl overflow-hidden border border-line h-fit">
            {s.garage.table.map(([k, v]) => (
              <div key={k} className="bg-ink-2 p-4">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{k}</dt>
                <dd className="text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-3 text-sm text-muted leading-relaxed">
            {garage.notes.map((n) => (
              <li key={n.en} className="rounded-xl border border-line bg-ink-2 p-4">
                {pick(n, lang)}
              </li>
            ))}
            {s.garage.extra.map((n) => (
              <li key={n} className="rounded-xl border border-line bg-ink-2 p-4">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="site" eyebrow={s.site.eyebrow} title={s.site.title} intro={s.site.intro}>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {annexes.map((a) => (
            <article key={a.name} className="rounded-2xl border border-line bg-ink-2 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{a.name}</p>
              <p className="text-sm text-muted">{a.address}</p>
              <p className="mt-3 text-sm">
                {a.floors} {s.site.floors} · {a.height} · {a.area}
              </p>
              <p className="mt-2 text-sm text-muted leading-relaxed">{pick(a.text, lang)}</p>
            </article>
          ))}
        </div>
        <MapEmbed lat={location.lat} lon={location.lon} lang={lang} />
      </Section>

      <Section id="gallery" eyebrow={s.gallery.eyebrow} title={s.gallery.title} intro={s.gallery.intro}>
        <Gallery photos={photos} lang={lang} />
      </Section>

      <Section id="sources" eyebrow={s.sources.eyebrow} title={s.sources.title}>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {sources.map((x) => (
            <li key={x.url}>
              <a href={x.url} target="_blank" rel="noreferrer" className="text-muted hover:text-accent underline decoration-line underline-offset-4">
                {x.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-muted leading-relaxed max-w-2xl">{s.sources.disclaimer}</p>
      </Section>
    </main>
  );
}

import { FactGrid } from "@/components/FactGrid";
import { Gallery } from "@/components/Gallery";
import { MapEmbed } from "@/components/MapEmbed";
import { Section } from "@/components/Section";
import { TenantList } from "@/components/TenantList";
import { TowerViewer } from "@/components/tower/TowerViewer";
import { photos } from "@/data/photos";
import { annexes, architecture, facts, garage, heroFacts, location, plans, sources, tenants, timeline } from "@/data/tower";

const nav = [
  ["facts", "Facts"],
  ["architecture", "Architecture"],
  ["plans", "Plans"],
  ["tenants", "Tenants"],
  ["garage", "Garage"],
  ["site", "Site"],
  ["gallery", "Photos"],
  ["sources", "Sources"],
];

export default function Home() {
  return (
    <main className="flex-1">
      <TowerViewer />

      <nav className="sticky top-0 z-40 glass border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-12 flex items-center gap-5 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-accent shrink-0">Prime Tower</span>
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 text-muted hover:text-paper">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Section
        id="facts"
        eyebrow="At a glance"
        title="Switzerland's tallest building, 2011 to 2015"
        intro="Swiss Prime Site developed the tower on the former Maag gear-factory site next to Bahnhof Hardbrücke. It opened fully let in December 2011 and is still the tallest building in Zürich."
      >
        <FactGrid facts={heroFacts} />
        <div className="h-4" />
        <FactGrid facts={facts} />
      </Section>

      <Section
        id="architecture"
        eyebrow="Gigon/Guyer"
        title="Two rectangles, melted into a crystal"
        intro="The architects won the invited competition in 2004 with a green-glass volume whose contours change with every viewpoint."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {architecture.map((a) => (
            <article key={a.title} className="rounded-2xl border border-line bg-ink-2 p-5">
              <h3 className="font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{a.text}</p>
            </article>
          ))}
        </div>

        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-accent mt-14 mb-4">Timeline</h3>
        <ol className="relative border-l border-line ml-2 space-y-5">
          {timeline.map((t) => (
            <li key={t.year} className="pl-6 relative">
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <p className="font-mono text-xs text-accent">{t.year}</p>
              <p className="text-sm text-muted leading-relaxed">{t.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="plans"
        eyebrow="Drawings"
        title="Floor plans and sections"
        intro="Gigon/Guyer publish the full plan set, and the letting agent's PDFs carry a metre scale bar. The drawings are copyrighted, so they are linked here rather than copied. The 3D model's footprint, height steps and cores were measured from them."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-line bg-ink-2 p-4 hover:border-accent/60 transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {p.kind === "pdf" ? "PDF · primetower.ch" : `${p.kind} · gigon-guyer.ch`}
              </p>
              <p className="mt-1 font-medium group-hover:text-accent">{p.title} ↗</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{p.note}</p>
            </a>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-ink-2 p-5 text-sm text-muted leading-relaxed">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent mb-2">What the plans show</p>
          <p>
            Eight facade vertices, two of them reflex: 23.9 m north-east, 26.6 m east toward the Hardbrücke, 24.2 m south-west onto the
            plaza and 22.7 m west toward the Diagonal, joined by short sides of 12.8 to 21.3 m. Perimeter columns sit about 5.65 m
            apart, one metre inside the glass, and three off-centre cores run along the diagonal band so both ends of every floor are
            column-free. Floor-to-floor is 3.35 m with 2.77 m clear; the ground floor is double height.
          </p>
        </div>
      </Section>

      <Section
        id="tenants"
        eyebrow="Who is inside"
        title="Law, banking, tech and a restaurant in the clouds"
        intro="The tower was fully let at opening with about 26 tenants. Floor assignments come from press reports and company pages, so treat them as approximate. Toggle Tenants in the 3D model to see the stack."
      >
        <TenantList tenants={tenants} />
      </Section>

      <Section
        id="garage"
        eyebrow="Below the plaza"
        title="Two basement levels, one shared garage"
        intro="The underground garage links the tower with Cubus, Diagonal and Platform. It is private, with monthly spaces rather than public hourly parking."
      >
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
          <dl className="grid grid-cols-2 gap-px bg-line rounded-2xl overflow-hidden border border-line h-fit">
            {[
              ["Levels", `${garage.levels}`],
              ["Tower spaces", `${garage.spacesTower}`],
              ["Site total", `≈ ${garage.spacesEnsemble}`],
              ["Platform", `${garage.spacesPlatform}`],
              ["Entrance", "Zahnradstrasse"],
              ["Clearance", "2.05 m"],
              ["Monthly rent", "CHF 250"],
              ["Public parking", "Pfingstweid, 150 m"],
            ].map(([k, v]) => (
              <div key={k} className="bg-ink-2 p-4">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{k}</dt>
                <dd className="text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-3 text-sm text-muted leading-relaxed">
            {garage.notes.map((n) => (
              <li key={n} className="rounded-xl border border-line bg-ink-2 p-4">
                {n}
              </li>
            ))}
            <li className="rounded-xl border border-line bg-ink-2 p-4">
              The ramp drops from the eastern end of Zahnradstrasse between the tower and the Cubus. Bollards close the plaza to
              through traffic. The nearest public car park is Parkhaus Pfingstweid with 276 spaces, open around the clock.
            </li>
            <li className="rounded-xl border border-line bg-ink-2 p-4">
              Bikes: free racks around Maagplatz and Zahnradstrasse, plus two-tier racks at Bahnhof Hardbrücke on the bridge
              level.
            </li>
          </ul>
        </div>
      </Section>

      <Section
        id="site"
        eyebrow="Maag-Areal"
        title="The tower and its three companions"
        intro="Gigon/Guyer designed the ensemble as a family: the tower, the new Cubus, the refurbished Diagonal and the Platform built for EY."
      >
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {annexes.map((a) => (
            <article key={a.name} className="rounded-2xl border border-line bg-ink-2 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{a.name}</p>
              <p className="text-sm text-muted">{a.address}</p>
              <p className="mt-3 text-sm">
                {a.floors} floors · {a.height} · {a.area}
              </p>
              <p className="mt-2 text-sm text-muted leading-relaxed">{a.text}</p>
            </article>
          ))}
        </div>
        <MapEmbed lat={location.lat} lon={location.lon} />
      </Section>

      <Section
        id="gallery"
        eyebrow="Photographs"
        title="Emerald, white, and everything between"
        intro="All images are freely licensed from Wikimedia Commons. Click any photo to enlarge; the caption links to the file page and licence."
      >
        <Gallery photos={photos} />
      </Section>

      <Section id="sources" eyebrow="Sources" title="Where the numbers come from">
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-muted hover:text-accent underline decoration-line underline-offset-4">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-muted leading-relaxed max-w-2xl">
          This is an independent showcase and is not affiliated with Swiss Prime Site, Wincasa or Gigon/Guyer. The 3D model is a
          stylised reconstruction: footprint and height steps follow the published plans, but details are approximate. Map data ©
          OpenStreetMap contributors.
        </p>
      </Section>
    </main>
  );
}

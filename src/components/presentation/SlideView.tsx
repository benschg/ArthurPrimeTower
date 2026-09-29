import Image from "next/image";
import { photos } from "@/data/photos";
import type { Slide, SlideItem } from "@/data/presentation";
import { pick, type L, type Lang } from "@/i18n";

/** The fixed design canvas every slide is laid out on; SlideDeck scales it to the viewport. */
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

const photoByFile = new Map(photos.map((p) => [p.file, p]));

function credit(files: string[]) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const f of files) {
    const p = photoByFile.get(f);
    if (!p) continue;
    const author = p.author.split("  ")[0].trim();
    const s = `${author} (${p.license})`;
    if (!seen.has(s)) {
      seen.add(s);
      parts.push(s);
    }
  }
  return parts.length ? `${parts.length > 1 ? "Fotos" : "Foto"}: ${parts.join(", ")} · Wikimedia Commons` : "";
}

function isPortrait(file: string) {
  const p = photoByFile.get(file);
  return !!p && (p.height ?? 0) > (p.width ?? 0);
}

function Photo({ file, width, priority, sizes = "60vw", className = "" }: { file: string; width?: number; priority?: boolean; sizes?: string; className?: string }) {
  const p = photoByFile.get(file);
  const alt = p?.titleDe ?? p?.title ?? "";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-2xl bg-ink-3 ${className}`} style={width ? { width } : undefined}>
      <Image src={`/photos/${file}`} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

function Footer({ left, page, dark = true }: { left: string; page: number; dark?: boolean }) {
  const color = dark ? "text-muted" : "text-ink/70";
  return (
    <>
      <p className={`absolute left-32 bottom-16 w-[1400px] text-[24px] ${color}`}>{left}</p>
      <p className={`absolute right-32 bottom-16 w-20 text-right font-mono text-[24px] ${color}`}>{page}</p>
    </>
  );
}

function Eyebrow({ text }: { text: string }) {
  return <p className="font-mono text-[26px] uppercase tracking-[0.3em] text-accent">{text}</p>;
}

function Title({ text }: { text: string }) {
  return <h2 className="text-[84px] font-semibold tracking-tight leading-[1.05]">{text}</h2>;
}

function headText(item: SlideItem, lang: Lang) {
  return typeof item.head === "string" ? item.head : pick(item.head, lang);
}

function Items({ slide, lang }: { slide: Extract<Slide, { kind: "content" }>; lang: Lang }) {
  if (slide.layout === "cards") {
    return (
      <div className="grid grid-cols-2 gap-6 content-start">
        {slide.items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-line bg-ink-2 p-8 flex flex-col gap-2">
            <p className={it.big ? "text-[92px] font-semibold tracking-tight leading-[1.05] text-accent" : "text-[38px] font-semibold leading-[1.15] text-accent"}>{headText(it, lang)}</p>
            {it.text && <p className="text-[26px] leading-[1.4] text-muted">{pick(it.text, lang)}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (slide.layout === "pills") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {slide.items.map((it, i) => (
          <p key={i} className="rounded-full bg-accent/15 border border-accent/30 px-6 py-4 text-[26px] font-semibold leading-[1.3]">
            {headText(it, lang)}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-7 justify-center flex-1">
      {slide.items.map((it, i) => (
        <div key={i} className="flex flex-col gap-1">
          <p className={it.big ? "text-[64px] font-semibold tracking-tight leading-[1.05] text-accent" : "text-[34px] font-semibold leading-[1.2]"}>{headText(it, lang)}</p>
          {it.text && <p className="text-[26px] leading-[1.4] text-muted">{pick(it.text, lang)}</p>}
        </div>
      ))}
    </div>
  );
}

function photoWidth(files: string[]) {
  if (files.length > 1) return 400;
  return isPortrait(files[0]) ? 420 : 900;
}

export function SlideView({ slide, index, lang, active }: { slide: Slide; index: number; lang: Lang; active: boolean }) {
  const page = index + 1;
  const bg = index % 2 === 0 ? "bg-ink" : "bg-ink-2";
  const t = (x: L) => pick(x, lang);

  if (slide.kind === "hero") {
    return (
      <section className="absolute inset-0 bg-ink text-paper">
        <Image src={`/photos/${slide.photo}`} alt="" fill sizes="100vw" priority={active} className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/10 via-ink/55 to-ink/95" />
        <div className="absolute inset-x-32 bottom-32 flex flex-col gap-6">
          <Eyebrow text={t(slide.eyebrow)} />
          <h1 className="text-[190px] font-semibold tracking-tight leading-[0.95]">{t(slide.title)}</h1>
          <p className="text-[48px] font-light text-paper/90">{t(slide.subtitle)}</p>
          <p className="text-[24px] text-muted">{credit([slide.photo])}</p>
        </div>
      </section>
    );
  }

  if (slide.kind === "content") {
    const w = photoWidth(slide.photos);
    return (
      <section className={`absolute inset-0 ${bg} text-paper p-32 pb-40 flex flex-col gap-9`}>
        <Eyebrow text={t(slide.eyebrow)} />
        <Title text={t(slide.title)} />
        <div className="flex gap-8 flex-1 min-h-0">
          {slide.photos.map((f) => (
            <Photo key={f} file={f} width={w} priority={active} />
          ))}
          <div className="flex-1 min-w-0 flex flex-col gap-6 justify-center">
            {slide.intro && <p className="text-[28px] leading-[1.4] text-muted">{t(slide.intro)}</p>}
            <Items slide={slide} lang={lang} />
            {slide.footer && <p className="text-[28px] leading-[1.4] text-muted">{t(slide.footer)}</p>}
          </div>
        </div>
        <Footer left={credit(slide.photos)} page={page} />
      </section>
    );
  }

  if (slide.kind === "bars") {
    const scale = 2.5;
    return (
      <section className="absolute inset-0 bg-accent text-ink p-32 pb-40 flex flex-col gap-9">
        <p className="font-mono text-[26px] uppercase tracking-[0.3em] text-ink/70">{t(slide.eyebrow)}</p>
        <Title text={t(slide.title)} />
        <div className="flex-1 flex items-end justify-center gap-20 px-20">
          {slide.bars.map((b, i) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-3">
              <p className="text-[56px] font-semibold tracking-tight leading-[1.05]">{b.metres} m</p>
              <div className={`w-[300px] rounded-t-xl ${i === slide.highlight ? "bg-ink" : "bg-ink/35"}`} style={{ height: b.metres * scale }} />
              <p className="text-[28px] font-semibold text-center">{b.label}</p>
              <p className="text-[24px] text-ink/70 text-center">{t(b.note)}</p>
            </div>
          ))}
        </div>
        <Footer left={t(slide.footer)} page={page} dark={false} />
      </section>
    );
  }

  if (slide.kind === "gallery") {
    return (
      <section className={`absolute inset-0 ${bg} text-paper p-32 pb-40 flex flex-col gap-9`}>
        <Eyebrow text={t(slide.eyebrow)} />
        <Title text={t(slide.title)} />
        <div className="flex gap-8 flex-1 min-h-0">
          {slide.photos.map((p) => (
            <div key={p.file} className="flex-1 flex flex-col gap-3 min-h-0">
              <Photo file={p.file} priority={active} sizes="25vw" className="flex-1" />
              <p className="text-[24px] text-muted">{t(p.caption)}</p>
            </div>
          ))}
        </div>
        <Footer left={credit(slide.photos.map((p) => p.file))} page={page} />
      </section>
    );
  }

  return (
    <section className={`absolute inset-0 ${bg} text-paper p-32 pb-40 flex flex-col gap-9`}>
      <Eyebrow text={t(slide.eyebrow)} />
      <Title text={t(slide.title)} />
      <div className="flex gap-16 flex-1 min-h-0">
        {slide.groups.map((g) => (
          <div key={g.head.en} className="flex-1 flex flex-col gap-4">
            <h3 className="text-[32px] font-semibold leading-[1.2]">{t(g.head)}</h3>
            <ul className="list-disc pl-8 text-[26px] leading-[1.5] text-muted space-y-1">
              {g.items.map((x) => (
                <li key={x.en}>{t(x)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Footer left="" page={page} />
    </section>
  );
}

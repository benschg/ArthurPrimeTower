"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { Photo } from "@/data/types";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { useDialogKeys } from "@/lib/useDialogKeys";

const titleOf = (p: Photo, lang: Lang) => (lang === "de" && p.titleDe ? p.titleDe : p.title);

/** The photos as a masonry grid; a click opens one large. */
export function Gallery({ photos, lang }: { photos: Photo[]; lang: Lang }) {
  const title = (p: Photo) => titleOf(p, lang);
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + photos.length) % photos.length)),
    [photos.length],
  );

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
        {photos.map((p, i) => (
          <button
            key={p.file}
            onClick={() => setOpen(i)}
            className="group relative block w-full overflow-hidden rounded-xl border border-line bg-ink-2 text-left focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Image
              src={`/photos/${p.file}`}
              alt={title(p)}
              width={p.width ?? 1200}
              height={p.height ?? 800}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink/90 to-transparent">
              <p className="text-sm font-medium">{title(p)}</p>
              <p className="text-[11px] text-muted">
                {p.author} · {p.license}
              </p>
            </div>
          </button>
        ))}
      </div>

      {open !== null && <Lightbox photo={photos[open]} lang={lang} onClose={close} onStep={step} />}
    </>
  );
}

/** One photo large, with its credits; Esc and the arrows work as the buttons do. */
function Lightbox({ photo, lang, onClose, onStep }: { photo: Photo; lang: Lang; onClose: () => void; onStep: (d: number) => void }) {
  const t = ui[lang].sections.gallery;
  useDialogKeys(onClose, onStep);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-ink/95 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
        <Image
          src={`/photos/${photo.file}`}
          alt={titleOf(photo, lang)}
          width={photo.width ?? 1600}
          height={photo.height ?? 1067}
          sizes="100vw"
          priority
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-medium">{titleOf(photo, lang)}</p>
            <p className="text-muted text-xs">
              {t.photo}: {photo.author} ·{" "}
              <a className="underline hover:text-accent" href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license}
              </a>{" "}
              ·{" "}
              <a className="underline hover:text-accent" href={photo.source} target="_blank" rel="noreferrer">
                {t.source}
              </a>
            </p>
          </div>
          <div className="flex gap-2 font-mono text-xs">
            <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={() => onStep(-1)}>
              {t.prev}
            </button>
            <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={() => onStep(1)}>
              {t.next}
            </button>
            <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

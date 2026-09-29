"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/data/types";

export function Gallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

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
              alt={p.title}
              width={p.width ?? 1200}
              height={p.height ?? 800}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink/90 to-transparent">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-[11px] text-muted">
                {p.author} · {p.license}
              </p>
            </div>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-ink/95 flex flex-col items-center justify-center p-4"
          onClick={close}
        >
          <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={`/photos/${photos[open].file}`}
              alt={photos[open].title}
              width={photos[open].width ?? 1600}
              height={photos[open].height ?? 1067}
              sizes="100vw"
              priority
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{photos[open].title}</p>
                <p className="text-muted text-xs">
                  Photo: {photos[open].author} ·{" "}
                  <a className="underline hover:text-accent" href={photos[open].licenseUrl} target="_blank" rel="noreferrer">
                    {photos[open].license}
                  </a>{" "}
                  ·{" "}
                  <a className="underline hover:text-accent" href={photos[open].source} target="_blank" rel="noreferrer">
                    source
                  </a>
                </p>
              </div>
              <div className="flex gap-2 font-mono text-xs">
                <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={() => step(-1)}>← prev</button>
                <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={() => step(1)}>next →</button>
                <button className="glass px-3 py-1.5 rounded-md hover:text-accent" onClick={close}>close ✕</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

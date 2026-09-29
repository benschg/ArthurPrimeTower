export function MapEmbed({ lat, lon }: { lat: number; lon: number }) {
  const d = 0.006;
  const bbox = `${lon - d * 1.6},${lat - d},${lon + d * 1.6},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-line bg-ink-2">
      <iframe
        title="Prime Tower location map"
        src={src}
        className="w-full h-[360px] sm:h-[420px] block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="text-xs text-muted px-4 py-2 font-mono">
        {lat.toFixed(5)}°N {lon.toFixed(5)}°E · © OpenStreetMap contributors
      </p>
    </div>
  );
}

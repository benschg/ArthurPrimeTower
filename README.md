# Prime Tower Zürich · interactive showcase

A Next.js 16 + React Three Fiber site about the Prime Tower (Gigon/Guyer, 2011) at Hardstrasse 201, Zürich-West.

## What is inside

- **3D model** (`src/components/tower/`): a parametric reconstruction. The footprint octagon was measured from the
  3. OG letting plan PDF (20 m scale bar), the height steps at floors 11, 17 and 26 from the Gigon/Guyer plans and
  sections, floor-to-floor 3.35 m from Doka's formwork reference, and the neighbouring buildings, station and garage
  ramp from OpenStreetMap. Modes: tenants, explode, garage, night, auto-rotate. Hover or click a floor for details.
- **Data** (`src/data/tower.ts`): facts, timeline, architecture notes, garage, annexes, tenants with floors, floor
  bands for the model, links to the published floor plans and sections, and all sources.
- **Photos** (`public/photos/`, `src/data/photos.ts`): 17 freely licensed images from Wikimedia Commons with
  attribution, downloaded and resized by `scripts/fetch-photos.mjs`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Scripts

```bash
node scripts/fetch-photos.mjs                    # refresh photos + metadata (polite to Commons, retries on 429)
node scripts/screenshot.mjs http://localhost:3000 screenshots   # headless Chrome smoke test of every viewer mode
```

## Licences and credits

Photos are CC BY / CC BY-SA / CC0 as noted per image; the drawings are copyrighted by Gigon/Guyer and JLL / Swiss Prime
Site and are linked, not copied. Map data © OpenStreetMap contributors. This is an independent project, not affiliated
with Swiss Prime Site, Wincasa or Gigon/Guyer.

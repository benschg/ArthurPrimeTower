# Prime Tower Zürich · interactive showcase

A Next.js 16 + React Three Fiber site about the Prime Tower (Gigon/Guyer, 2011) at Hardstrasse 201, Zürich-West.

## What is inside

- **3D model** (`src/components/tower/`): a parametric reconstruction. The footprint octagon was measured from the
  3. OG letting plan PDF (20 m scale bar), the height steps at floors 11, 17 and 26 from the Gigon/Guyer plans and
  sections, floor-to-floor 3.35 m from Doka's formwork reference, and the neighbouring buildings, station and garage
  ramp from OpenStreetMap. Modes: tenants, explode, garage, night, auto-rotate. Hover or click a floor for details.
- **Data** (`src/data/tower.ts`): facts, timeline, architecture notes, garage, annexes, tenants with floors, floor
  bands for the model, links to the published floor plans and sections, and all sources.
- **Facade shader** (`src/components/tower/facadeShader.ts`): a GLSL3 ShaderMaterial that samples an equirectangular
  HDRI directly (mip-blurred by roughness, Schlick Fresnel so the glass turns from emerald to mirror at grazing angles),
  with a night mask that lights individual windows. Day uses a partly cloudy sky, night a city waterfront so the lights
  reflect in the glass. HDRIs in `public/hdri/` are CC0 from [Poly Haven](https://polyhaven.com/)
  (`kloofendal_48d_partly_cloudy_puresky`, `shanghai_bund`).
- **Languages**: German by default, English via the toggle in the nav and viewer. The choice is kept in
  localStorage (`prime-tower-lang`), not in the URL. UI strings live in `src/i18n/ui.ts`; data fields are
  bilingual `{ en, de }` objects in `src/data/tower.ts`.
- **Maintenance unit and game**: a facade-access cradle patrols the Hardbrücke facade. Click it (or open `/#clean`)
  to play a 60-second window-cleaning game: move the pointer over the facade to steer the cradle and squeegee the
  dirt layer away.
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
node scripts/screenshot.mjs http://localhost:3000 screenshots        # headless Chrome smoke test of every viewer mode
node scripts/screenshot-game.mjs http://localhost:3000 screenshots   # language default/persistence and the cleaning game
node scripts/screenshot-roof.mjs http://localhost:3000 screenshots   # roof close-ups by day and night
```

## Licences and credits

Photos are CC BY / CC BY-SA / CC0 as noted per image; the drawings are copyrighted by Gigon/Guyer and JLL / Swiss Prime
Site and are linked, not copied. Map data © OpenStreetMap contributors. This is an independent project, not affiliated
with Swiss Prime Site, Wincasa or Gigon/Guyer.

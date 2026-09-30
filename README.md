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
- **Exploded interiors** (`src/components/tower/interiorLayout.ts`, `Interiors.tsx`): in Explode mode the plates thin
  out and every floor shows its fit-out, derived from the 31st-floor plan: cellular offices along each facade with desk,
  chair and screen, a ring corridor with doors, corner meeting rooms, two banks of four lifts facing a lobby in the main
  core, a fire lift and stairs in the north-east core, a lobby with reception on the ground floor, conference tables on
  34 and round tables on 35. About 9,400 pieces, one instanced draw call per kind. Zoom-to-cursor lets you get close.
  Lift cables span the whole exploded stack with cars travelling their shafts, and the roof rides up with the top floor.
- **Pull-out floors**: clicking a floor opens the tower above it (everything higher lifts by 9 m, roof included),
  then the plate pops out, thins to a slab and binds to the camera on the right of the view, tilted toward you with
  its fit-out on top. The picture shifts so the tower sits on the left, and orbiting or auto-rotation keeps going
  while the floor stays put. "Put back" (or clicking elsewhere) reverses the choreography. The facade is one glass
  ring per floor so the stack can open and explode.
- **Entrances**: main entrance with canopy and the bank branch on the recessed south-east porch, Clouds entrance on the
  plaza side. `/#entrance` opens the site at street level in front of the main door.
- **Window blinds** (`src/components/tower/blinds.ts`): every pane of every floor has its own blind, stored in a
  128 x 36 data texture the facade shader samples. Pane k of a floor is the 1.5 m strip from k x 1.5 m along that
  floor's perimeter, starting at the west corner. Changes glide toward their target. Scriptable in the browser
  console as `primeTower.blinds`:
  `setAll(1)`, `setFloor(24, 1)`, `setFacade(21, 3, 0.6)` (edge index as in `geometry`, 3 = Hardbrücke side),
  `set(f, pane, amount)`, `map((floor, pane, edge) => amount)`, `setFromSun([east, north])`, `randomize()`;
  add `.snap()` to skip the glide. `node scripts/probe-blinds.mjs` exercises all of it.
- **Type the tower** (`src/components/tower/typing/`): click the "P" of the title. The camera squares up to the
  tower's three-faced west flank, where three characters are drawn with the blinds as a 5 x 7 dot matrix, one per
  face, with double-width dots (floors 26 to 32, amber glow so they read by day and night). Type them and the next three glide in. Rounds shorten from 10 s toward 3.5 s
  and the character set grows from easy capitals to all letters, then digits, then look-alikes. A wrong key costs a
  second and the streak; three small cannons sit on the roof, one above each face: a typed character makes its cannon pop a puff of confetti, a finished round fires all three, every fifth round a double volley, and the pieces arc out and float down past the letters. When the clock runs out the
  facade shows the score in the same dot matrix (a new best gets a volley). Score,
  streak and best (localStorage) live in the bottom-left card; Esc quits and the blinds return to how they were.
  Phones get the soft keyboard through a hidden input. `node scripts/probe-typing.mjs` plays a game headlessly.
- **Ghosts on 13** (`src/components/tower/pacman/`, `scene/pacman.tsx`): click floor 13 (or open `/#pacman`). The
  floor pulls out to the front like any other, but its plate arrives as a Pac-Man board: a maze carved into the
  floor's real plan on a 1.9 m grid in the letting-plan frame, bounded by the facade and the three cores, with the
  lanes closed into a ring around the cores (157 cells, no dead ends, seeded so it is the same every visit). Four
  ghosts come up through the lift doors (both banks and the fire lift), float across the core to the lanes and hunt,
  each in its own way; eat every dot, and a big one at each end of the floor turns the ghosts blue and edible.
  Arrow keys or WASD steer by screen direction, so they stay right however the plate is dragged around; touch
  screens get a pad, and upright screens turn the board on end. The board is centred in the view and sized so the
  whole floor shows, clear of the HUD pieces marked `data-board-avoid`, which `scene/boardFit.ts` measures (it
  refits on resize; the site's labels hide meanwhile), and drawn into a reserved front slice of the depth range so
  nothing that crosses the plate can cut into it. Sounds are synthesised with Web Audio (`pacman/sound.ts`, mute
  button in the HUD). Three lives, faster ghosts each level, best score in
  localStorage; Esc or "Quit" puts the floor back. Scriptable as `primeTower.pacman` (`game`, `steer(x, y)`,
  `text()` prints the board). `node scripts/probe-pacman.mjs` plays it headlessly.
- **Floor picking** uses one invisible solid volume per floor (the footprint extruded over the full slot, from the
  middle of the gap below to the middle of the gap above), so the pointer never falls between floors in the
  exploded view. The volumes ignore the hover bulge, so the bulge cannot chase its own movement.
  `node scripts/probe-hover.mjs` sweeps the stack and reports misses and reversals.
- **Photos** (`public/photos/`, `src/data/photos.ts`): 17 freely licensed images from Wikimedia Commons with
  attribution, downloaded and resized by `scripts/fetch-photos.mjs`.

## Code layout

```
src/components/tower/
  TowerViewer.tsx        client wrapper: state, HUD, mode buttons, floor card
  viewer/                HUD pieces (Celebration, FloorPlanLink)
  TowerScene.tsx         the Canvas; re-exports the viewer state types
  scene/                 one module per subsystem of the 3D scene
    Scene.tsx            composition, explode/pull-out choreography, camera binding
    glass.tsx            per-floor glass rings with the facade shader, roof group
    floors.tsx           floor plates (hover/click/pull-out), structure, labels
    roof.tsx             parapet, plant room, mast, aviation lights
    maintenance.tsx      cradle, dirt layer and the window-cleaning game
    pacman.tsx           the floor-13 game board on the pulled-out plate
    entrances.tsx        doors and canopy on the ground floor
    site.tsx / garage.tsx neighbours, bridge, railway; two-level garage and peek target
    camera.tsx / blender.tsx  mode transitions; day/night and garage fades
    hdri.ts / textures.ts / helpers.ts / types.ts
  geometry/              measured geometry: footprint & stages, structure (cores, columns,
                         drawing frame), site (OSM footprints, garage, parking)
  pacman/                floor-13 game: maze.ts (board from the plan), game.ts (simulation), store.ts, sound.ts
  interiorLayout.ts      instanced fit-out per floor;  entrances.ts  door positions
  Interiors.tsx          instanced rendering of the fit-out, lift cables and cars
  facadeShader.ts        GLSL facade material
src/i18n/ui/             en.ts, de.ts and the ui index
```

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
node scripts/screenshot-explode.mjs http://localhost:3000 screenshots # entrance at street level, exploded interiors
```

## Licences and credits

Photos are CC BY / CC BY-SA / CC0 as noted per image; the drawings are copyrighted by Gigon/Guyer and JLL / Swiss Prime
Site and are linked, not copied. Map data © OpenStreetMap contributors. This is an independent project, not affiliated
with Swiss Prime Site, Wincasa or Gigon/Guyer.

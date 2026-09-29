// Downloads a curated set of freely licensed Prime Tower photos from Wikimedia Commons
// into public/photos and writes src/data/photos.ts with attribution metadata.
// Run: node scripts/fetch-photos.mjs
// German titles (titleDe) live in src/data/photos.ts; re-add them there after regenerating.
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const UA = "ArthurPrimeTower/1.0 (personal showcase project)";
const WIDTH = 2000;

const picks = [
  { file: "Prime Tower Zürich..jpg", slug: "hero-plaza-dusk", title: "Blue hour at the plaza entrance" },
  { file: "Prime Tower Zürich.jpg", slug: "from-hardbruecke", title: "From Bahnhof Hardbrücke" },
  { file: "Prime Tower Zürich - Käferberg-Waidspital 2016-05-17 18-55-57.JPG", slug: "kaeferberg-evening", title: "Evening light from Käferberg" },
  { file: "Zürich - Prime Tower (48677546201).jpg", slug: "low-angle-sunny", title: "Green glass against blue sky" },
  { file: "Prime Tower Luftaufnahme, 2023.jpg", slug: "aerial-2023", title: "Drone aerial over Zürich-West, 2023" },
  { file: "Aerial view of Zurich.JPG", slug: "aerial-2011", title: "Aerial view amid the railway yards, 2011" },
  { file: "DSC 2727 3 (11806742154).jpg", slug: "top-alps-bluehour", title: "Lit upper floors against the Alps" },
  { file: "Prime Tower Night Entrance.jpg", slug: "night-entrance", title: "Entrance canopy and lobby glow at night" },
  { file: "Prime Tower Night Zürich Zurich.jpg", slug: "night-elevated", title: "Night view with Hardbrücke" },
  { file: "Prime Tower, Zürich (24209383652).jpg", slug: "facade-lookup", title: "Straight up the glass grid" },
  { file: "Industriequartier - Prime Tower - Hardbrücke Bahnhof 2011-09-06 19-48-02.JPG", slug: "cantilever-evening", title: "Upper volumes and cantilevers, 2011" },
  { file: "Zürich Prime Tower.jpg", slug: "reflection", title: "Reflected in the neighbouring facade" },
  { file: "Prime Tower Cubus in Zürich.jpg", slug: "cubus-annex", title: "The Cubus annex with the tower behind" },
  { file: "Prime Tower 2020.JPG", slug: "viaduct-arch", title: "Framed by the railway viaduct" },
  { file: "Prime Tower bei Schneefall - Zürich (50841680992).jpg", slug: "snowfall", title: "Snowfall on the Maag site, 2021" },
  { file: "CH.ZH.Zurich 2014-05-31 Prime-Tower.jpg", slug: "maagplatz-cubus", title: "From Maagplatz with the Cubus" },
  { file: "Zürich vom Prime Tower.jpg", slug: "view-from-top", title: "View from the tower toward Uetliberg" },
];

const outDir = path.resolve("public/photos");
await mkdir(outDir, { recursive: true });

const licenseUrls = {
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchRetry(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429) return res;
    const wait = 5000 * (i + 1);
    console.log("429, waiting", wait, "ms");
    await sleep(wait);
  }
  throw new Error("too many retries: " + url);
}
const strip = (html) => (html ?? "").replace(/<[^>]+>/g, "").trim();

const results = [];
for (const p of picks) {
  const title = `File:${p.file}`;
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: String(WIDTH),
    format: "json",
  }).toString();
  const meta = await fetchRetry(api).then((r) => r.json());
  const page = Object.values(meta.query.pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) {
    console.error("no imageinfo for", p.file);
    continue;
  }
  const ext = info.extmetadata ?? {};
  const author = strip(ext.Artist?.value) || "Unknown";
  const license = strip(ext.LicenseShortName?.value) || "see source";
  const dest = path.join(outDir, `${p.slug}.jpg`);
  const thumbW = Math.min(WIDTH, info.width);
  const thumbH = Math.round((info.height * thumbW) / info.width);

  if (!existsSync(dest)) {
    // Special:FilePath serves a resized thumbnail from the thumb host, which is throttled
    // independently of upload.wikimedia.org originals.
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=${WIDTH}`;
    let res;
    try {
      res = await fetchRetry(url);
    } catch (err) {
      console.error(String(err));
      continue;
    }
    if (!res.ok) {
      console.error("download failed", res.status, url);
      continue;
    }
    const raw = Buffer.from(await res.arrayBuffer());
    await sharp(raw).rotate().resize({ width: WIDTH, height: WIDTH, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
    console.log("saved", dest, `${thumbW}x${thumbH}`);
    await sleep(2500);
  } else {
    console.log("exists", dest);
  }

  const dim = await sharp(dest).metadata();
  results.push({
    file: `${p.slug}.jpg`,
    title: p.title,
    titleDe: p.titleDe,
    author,
    license,
    licenseUrl: licenseUrls[license],
    source: info.descriptionurl,
    width: dim.width,
    height: dim.height,
  });
}

const ts = `import type { Photo } from "./types";

/** Generated by scripts/fetch-photos.mjs from Wikimedia Commons. */
export const photos: Photo[] = ${JSON.stringify(results, null, 2)};
`;
await writeFile(path.resolve("src/data/photos.ts"), ts);
console.log(`wrote src/data/photos.ts with ${results.length} photos`);

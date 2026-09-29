// Downloads official boundaries and writes them as SVG for the "Where in Switzerland" zoom map.
//   Switzerland + Canton of Zürich: swisstopo swissBOUNDARIES3D via api3.geo.admin.ch (already LV95)
//   City districts (Stadtkreise) + statistical quarters: Stadt Zürich open data WFS (WGS84, converted)
//   Lakes: Natural Earth 1:10m (public domain) for the country view; swisstopo VECTOR25 Lake Zurich for the city
// Everything is projected into Swiss LV95 metres (EPSG:2056) so all zoom levels share one SVG coordinate
// space, then simplified per level. Output:
//   public/geo/switzerland.svg, public/geo/zurich-city.svg, public/geo/kreis-5.svg  (standalone drawings)
//   src/data/geo.ts                                                              (paths for the app)
// Run: node scripts/fetch-geo.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = "ArthurPrimeTower/1.0 (personal showcase project)";
const TOWER = { lat: 47.38586, lon: 8.51689 };
// SVG origin: x = E - E0, y = N0 - N (north up). Metres.
const E0 = 2480000;
const N0 = 1300000;

const get = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

/** swisstopo's approximate WGS84 → LV95 formula (accuracy about 1 m). */
function toLV95(lon, lat) {
  const p = (lat * 3600 - 169028.66) / 10000;
  const l = (lon * 3600 - 26782.5) / 10000;
  const E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3;
  const N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3;
  return [E, N];
}
const toSvg = ([E, N]) => [E - E0, N0 - N];

/** Iterative Douglas–Peucker on a ring of [x, y]. */
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    let max = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const qx = ax + t * dx - px;
      const qy = ay + t * dy - py;
      const d = qx * qx + qy * qy;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > t2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const polygons = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : []);

/** GeoJSON geometry → SVG path "d", with rings projected, simplified and rounded. */
function toPath(geom, { wgs84, tol, decimals = 0, minArea = 0 }) {
  const f = 10 ** decimals;
  const r = (v) => Math.round(v * f) / f;
  const out = [];
  for (const poly of polygons(geom)) {
    for (const ring of poly) {
      let pts = ring.map((c) => toSvg(wgs84 ? toLV95(c[0], c[1]) : [c[0], c[1]]));
      pts = simplify(pts, tol);
      if (pts.length < 4) continue;
      if (minArea && Math.abs(area(pts)) < minArea) continue;
      out.push("M" + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join("L") + "Z");
    }
  }
  return out.join("");
}
function area(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return s / 2;
}
function bounds(geoms, wgs84) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const g of geoms)
    for (const poly of polygons(g))
      for (const c of poly[0]) {
        const [x, y] = toSvg(wgs84 ? toLV95(c[0], c[1]) : [c[0], c[1]]);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}
/** Largest-area interior-ish label point: centroid of the biggest outer ring. */
function labelPoint(geom, wgs84) {
  let best = null;
  for (const poly of polygons(geom)) {
    const pts = poly[0].map((c) => toSvg(wgs84 ? toLV95(c[0], c[1]) : [c[0], c[1]]));
    const a = area(pts);
    if (!best || Math.abs(a) > Math.abs(best.a)) {
      let cx = 0;
      let cy = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const k = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
        cx += (pts[j][0] + pts[i][0]) * k;
        cy += (pts[j][1] + pts[i][1]) * k;
      }
      best = { a, x: cx / (6 * -a), y: cy / (6 * -a) };
    }
  }
  return best ? [Math.round(Math.abs(best.x)), Math.round(Math.abs(best.y))] : [0, 0];
}

// ── Download ───────────────────────────────────────────────────────────
console.log("downloading…");
const geoAdmin = (layer, id) => `https://api3.geo.admin.ch/rest/services/api/MapServer/${layer}/${id}?geometryFormat=geojson&sr=2056`;
const ch = (await get(geoAdmin("ch.swisstopo.swissboundaries3d-land-flaeche.fill", "CH"))).feature;
const canton = (await get(geoAdmin("ch.swisstopo.swissboundaries3d-kanton-flaeche.fill", 1))).feature;
const wfs = (name, type) =>
  `https://www.ogd.stadt-zuerich.ch/wfs/geoportal/${name}?service=WFS&version=1.1.0&request=GetFeature&outputFormat=GeoJSON&typename=${type}`;
const kreise = await get(wfs("Stadtkreise", "adm_stadtkreise_a"));
const quartiere = await get(wfs("Statistische_Quartiere", "adm_statistische_quartiere_map"));
const zurichsee = (await get(geoAdmin("ch.bafu.vec25-seen", 60))).feature;
const lakesAll = await get("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes_europe.geojson");

console.log("kreis properties:", Object.keys(kreise.features[0].properties).join(", "));
console.log("quartier properties:", Object.keys(quartiere.features[0].properties).join(", "));

const kreisNo = (p) => Number(String(p.kname ?? p.name ?? p.bezeichnung ?? "").match(/\d+/)?.[0] ?? p.knr ?? NaN);
const kreisFeatures = kreise.features.map((f) => ({ no: kreisNo(f.properties), geom: f.geometry })).sort((a, b) => a.no - b.no);
const kreis5 = kreisFeatures.find((k) => k.no === 5);
if (!kreis5) throw new Error("Kreis 5 not found; check property names above");

const quartierKreis = (p) => Number(p.knr ?? String(p.kname ?? "").match(/\d+/)?.[0] ?? NaN);
const quartiere5 = quartiere.features
  .filter((f) => quartierKreis(f.properties) === 5)
  .map((f) => ({ name: f.properties.qname ?? f.properties.name, geom: f.geometry }));
if (quartiere5.length === 0) console.warn("no quarters matched Kreis 5; properties:", quartiere.features[0].properties);

// Lakes: keep those overlapping Switzerland's bounding box.
const inCH = (g) =>
  polygons(g).some((poly) => poly[0].some(([lon, lat]) => lon > 5.95 && lon < 10.5 && lat > 45.8 && lat < 47.82));
const lakes = lakesAll.features.filter((f) => inCH(f.geometry)).map((f) => ({ name: f.properties.name, geom: f.geometry }));

// ── Build paths per level ──────────────────────────────────────────────
const tower = toSvg(toLV95(TOWER.lon, TOWER.lat)).map(Math.round);
const cityGeom = { type: "MultiPolygon", coordinates: kreisFeatures.flatMap((k) => polygons(k.geom)) };

const geo = {
  tower,
  switzerland: {
    bounds: bounds([ch.geometry], false),
    outline: toPath(ch.geometry, { tol: 120 }),
    canton: toPath(canton.geometry, { tol: 60 }),
    lakes: lakes.map((x) => toPath(x.geom, { wgs84: true, tol: 80, minArea: 2e6 })).filter(Boolean).join(""),
  },
  city: {
    bounds: bounds([cityGeom], true),
    kreise: kreisFeatures.map((k) => ({ no: k.no, d: toPath(k.geom, { wgs84: true, tol: 6 }), label: labelPoint(k.geom, true) })),
    lakes: toPath(zurichsee.geometry, { tol: 10 }),
  },
  kreis5: {
    bounds: bounds([kreis5.geom], true),
    outline: toPath(kreis5.geom, { wgs84: true, tol: 2 }),
    quartiere: quartiere5.map((q) => ({ name: q.name, d: toPath(q.geom, { wgs84: true, tol: 2 }), label: labelPoint(q.geom, true) })),
  },
};

// ── Standalone SVG files ───────────────────────────────────────────────
const pad = (b, f) => {
  const px = b.w * f;
  const py = b.h * f;
  return `${Math.round(b.x - px)} ${Math.round(b.y - py)} ${Math.round(b.w + 2 * px)} ${Math.round(b.h + 2 * py)}`;
};
const dot = (r) => `<circle cx="${tower[0]}" cy="${tower[1]}" r="${r}" fill="#e25c4a" stroke="#fff" stroke-width="${r / 3}"/>`;
const svg = (viewBox, body, title) => {
  const [, , w, h] = viewBox.split(" ").map(Number);
  const width = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round((width * h) / w)}" viewBox="${viewBox}"><title>${title}</title>${body}</svg>\n`;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const outDir = path.resolve("public/geo");
await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "switzerland.svg"),
  svg(
    pad(geo.switzerland.bounds, 0.03),
    `<path d="${geo.switzerland.outline}" fill="#e8edf2" stroke="#5c6f83" stroke-width="600" fill-rule="evenodd"/>` +
      `<path d="${geo.switzerland.lakes}" fill="#9cc3e4"/>` +
      `<path d="${geo.switzerland.canton}" fill="#7dd3c0" fill-opacity="0.35" stroke="#2a8f7a" stroke-width="500"/>` +
      dot(3000),
    "Switzerland with the Canton of Zürich and the Prime Tower (swisstopo swissBOUNDARIES3D, Natural Earth lakes)",
  ),
);
await writeFile(
  path.join(outDir, "zurich-city.svg"),
  svg(
    pad(geo.city.bounds, 0.04),
    `<path d="${geo.city.lakes}" fill="#9cc3e4"/>` +
      geo.city.kreise
        .map(
          (k) =>
            `<path d="${k.d}" fill="${k.no === 5 ? "#7dd3c0" : "#e8edf2"}" stroke="#5c6f83" stroke-width="40"/>` +
            `<text x="${k.label[0]}" y="${k.label[1]}" font-family="Arial" font-size="420" text-anchor="middle" dominant-baseline="middle" fill="#334">${k.no}</text>`,
        )
        .join("") +
      dot(160),
    "City of Zürich, Stadtkreise 1–12, Kreis 5 highlighted (Stadt Zürich open data)",
  ),
);
await writeFile(
  path.join(outDir, "kreis-5.svg"),
  svg(
    pad(geo.kreis5.bounds, 0.06),
    `<path d="${geo.kreis5.outline}" fill="#e8edf2" stroke="#2a8f7a" stroke-width="14"/>` +
      geo.kreis5.quartiere
        .map(
          (q) =>
            `<path d="${q.d}" fill="none" stroke="#5c6f83" stroke-width="6" stroke-dasharray="20 14"/>` +
            `<text x="${q.label[0]}" y="${q.label[1]}" font-family="Arial" font-size="90" text-anchor="middle" fill="#334">${esc(q.name)}</text>`,
        )
        .join("") +
      dot(45),
    "Kreis 5 (Industriequartier) with its statistical quarters and the Prime Tower (Stadt Zürich open data)",
  ),
);

// ── App data ───────────────────────────────────────────────────────────
const ts = `/**
 * Generated by scripts/fetch-geo.mjs. Do not edit by hand.
 * Coordinates are Swiss LV95 metres shifted to x = E − ${E0}, y = ${N0} − N (north up).
 * Sources: swisstopo swissBOUNDARIES3D (country, canton), Stadt Zürich open data (Stadtkreise,
 * statistical quarters), Natural Earth (lakes).
 */
export type Box = { x: number; y: number; w: number; h: number };

export const geo = ${JSON.stringify(geo)} as const;
`;
await writeFile(path.resolve("src/data/geo.ts"), ts);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + " kB";
console.log("tower", tower, "kreis5 quarters:", quartiere5.map((q) => q.name).join(", "));
console.log("sizes: ch", kb(geo.switzerland.outline), "canton", kb(geo.switzerland.canton), "lakes", kb(geo.switzerland.lakes), "city", kb(JSON.stringify(geo.city)), "kreis5", kb(JSON.stringify(geo.kreis5)));

// Cuts the 16:9 middle out of every photo a hero slide of the talk uses and writes it to
// public/photos/hero, so the deck does not download the two thirds of a portrait photo it never shows.
// Run after changing a hero slide's photo: node scripts/crop-heroes.mjs
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// The deck's canvas (CANVAS_W × CANVAS_H in src/components/presentation/SlideView.tsx).
const RATIO = 1920 / 1080;

const deck = await readFile(path.resolve("src/data/presentation.ts"), "utf8");
const files = [...new Set([...deck.matchAll(/kind: "hero",[\s\S]*?\bphoto: "([^"]+)"/g)].map((m) => m[1]))];
if (!files.length) throw new Error("no hero slides found in src/data/presentation.ts");

const outDir = path.resolve("public/photos/hero");
await mkdir(outDir, { recursive: true });

for (const file of files) {
  const src = path.resolve("public/photos", file);
  const { width, height } = await sharp(src).metadata();
  const w = Math.min(width, Math.round(height * RATIO));
  const h = Math.min(height, Math.round(width / RATIO));
  const dest = path.join(outDir, file);
  // Same cut as the `object-cover` the slide used on the full photo: centred.
  await sharp(src).resize({ width: w, height: h, fit: "cover", position: "centre" }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
  console.log("saved", dest, `${w}x${h}`);
}

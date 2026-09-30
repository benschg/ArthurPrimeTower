// Exports the school talk as a PDF and as one self-contained HTML file per language, for a USB
// stick: public/downloads/prime-tower-vortrag.{pdf,html} (German) and prime-tower-talk.{pdf,html}
// (English), the names talkDownloads in src/data/presentation.ts links to.
// Needs the site running; rerun after editing the slides.
// Usage: node scripts/export-talk.mjs [baseUrl]
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const SITE = "https://primetower.arthurfaehndrich.ch";
const FILES = { de: "prime-tower-vortrag", en: "prime-tower-talk" };
const TITLES = { de: "Prime Tower · Vortrag", en: "Prime Tower · Talk" };
const W = 1920;
const H = 1080;
// images are stored at this multiple of their size on the slide, for sharp projectors and retina screens
const DENSITY = 2;

const outDir = path.resolve("public/downloads");
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", `--window-size=${W},${H}`],
});

/** The public file behind an <img> src, whether served directly or through /_next/image. */
function publicFile(src) {
  const url = new URL(src);
  const p = url.pathname === "/_next/image" ? url.searchParams.get("url") : url.pathname;
  return path.resolve("public", "." + decodeURIComponent(p));
}

const dataUri = (mime, buf) => `data:${mime};base64,${buf.toString("base64")}`;

/**
 * Each image cropped and scaled to what its box shows. Opaque photos become JPEG (the PDF embeds
 * those as they are); cutouts with transparency become PNG for the PDF and WebP for the HTML.
 */
async function encode({ src, w, h, fit }) {
  const file = publicFile(src);
  const raw = await readFile(file);
  if (file.endsWith(".svg")) return { pdf: dataUri("image/svg+xml", raw), html: dataUri("image/svg+xml", raw) };
  const img = sharp(raw);
  const { width: sw, height: sh, hasAlpha } = await img.metadata();
  let pipeline;
  if (fit === "cover") {
    // the largest crop with the box's shape, capped at DENSITY times the box
    const s = Math.min(1, sw / (w * DENSITY), sh / (h * DENSITY));
    pipeline = img.resize({ width: Math.round(w * DENSITY * s), height: Math.round(h * DENSITY * s), fit: "cover", position: "centre" });
  } else {
    pipeline = img.resize({ height: Math.min(sh, Math.round(h * DENSITY)) });
  }
  if (!hasAlpha) {
    const jpg = dataUri("image/jpeg", await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer());
    return { pdf: jpg, html: jpg };
  }
  return {
    pdf: dataUri("image/png", await pipeline.clone().png({ compressionLevel: 9 }).toBuffer()),
    html: dataUri("image/webp", await pipeline.clone().webp({ quality: 84, alphaQuality: 100 }).toBuffer()),
  };
}

/** Every stylesheet on the page as text, with its fonts inlined. */
async function collectCss(page) {
  // url()s are relative to their own stylesheet, so make them absolute sheet by sheet
  const css = await page.evaluate(() =>
    [...document.styleSheets]
      .map((s) => {
        try {
          const text = [...s.cssRules].map((r) => r.cssText).join("\n");
          return text.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (m, u) => (u.startsWith("data:") || u.startsWith("#") ? m : `url("${new URL(u, s.href ?? location.href).href}")`));
        } catch {
          return "";
        }
      })
      .join("\n"),
  );
  const urls = [...new Set([...css.matchAll(/url\("(https?:[^"]+)"\)/g)].map((m) => m[1]))];
  let out = css;
  for (const u of urls) {
    const res = await fetch(u);
    if (!res.ok) throw new Error(`could not fetch ${u}: ${res.status}`);
    const ext = path.extname(new URL(u).pathname).slice(1);
    const mime = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webp: "image/webp" }[ext] ?? "application/octet-stream";
    out = out.split(u).join(dataUri(mime, Buffer.from(await res.arrayBuffer())));
  }
  return out;
}

function viewerHtml({ lang, htmlClass, bodyClass, css, slides, labels }) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="${lang}" class="${esc(htmlClass)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLES[lang])}</title>
<style>${css}</style>
<style>
html, body { height: 100%; margin: 0; }
body { display: flex; flex-direction: column; overflow: hidden; user-select: none; }
#main { flex: 1; min-height: 0; display: flex; }
#stage { flex: 1; min-width: 0; position: relative; }
#frame { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); overflow: hidden; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5); cursor: pointer; }
#canvas { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
.slide { position: absolute; inset: 0; visibility: hidden; }
.slide.on { visibility: visible; }
#notes { width: 24rem; flex-shrink: 0; border-left: 1px solid var(--line); background: var(--ink-2); padding: 1.5rem; overflow-y: auto; font-size: 0.875rem; line-height: 1.6; }
#notes[hidden] { display: none; }
#notes b { display: block; margin-bottom: 0.75rem; font-family: var(--font-mono); font-size: 11px; font-weight: normal; text-transform: uppercase; letter-spacing: 0.25em; color: var(--accent); }
#bar { height: 3.5rem; flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem; padding: 0 1.5rem; border-top: 1px solid var(--line); background: rgba(18, 24, 33, 0.72); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; }
#bar .help { color: var(--muted); letter-spacing: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#bar .gap { margin-left: auto; }
#bar button { border: 1px solid var(--line); border-radius: 999px; padding: 0.25rem 0.75rem; background: none; color: var(--paper); font: inherit; text-transform: uppercase; cursor: pointer; }
#bar button:hover:not(:disabled), #bar button.on { color: var(--accent); border-color: var(--accent); }
#bar button:disabled { opacity: 0.3; cursor: default; }
#count { width: 4rem; text-align: center; font-variant-numeric: tabular-nums; }
</style>
</head>
<body class="${esc(bodyClass)}">
<div id="main">
<div id="stage"><div id="frame"><div id="canvas">
${slides.map((s) => `<div class="slide">${s.html}</div>`).join("\n")}
</div></div></div>
<aside id="notes" hidden><b></b><p></p></aside>
</div>
<div id="bar">
<span class="help">${esc(labels.help)}</span>
<span class="gap"></span>
<button id="prev" type="button" aria-label="${esc(labels.prev)}">←</button>
<span id="count"></span>
<button id="next" type="button" aria-label="${esc(labels.next)}">→</button>
<button id="nbtn" type="button">${esc(labels.notes)}</button>
<button id="fs" type="button">${esc(labels.fullscreen)}</button>
</div>
<script>
(() => {
  const NOTES = ${JSON.stringify(slides.map((s) => s.notes)).replace(/</g, "\\u003c")};
  const LABEL = ${JSON.stringify(labels.notes)};
  const $ = (id) => document.getElementById(id);
  const slides = [...document.querySelectorAll(".slide")];
  const stage = $("stage"), frame = $("frame"), canvas = $("canvas"), notes = $("notes");
  let index = 0;
  function show(n) {
    index = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle("on", k === index));
    $("count").textContent = (index + 1) + " / " + slides.length;
    $("prev").disabled = index === 0;
    $("next").disabled = index === slides.length - 1;
    notes.querySelector("b").textContent = LABEL + " · " + (index + 1) + "/" + slides.length;
    notes.querySelector("p").textContent = NOTES[index];
    try { history.replaceState(null, "", "#" + (index + 1)); } catch {}
  }
  function fit() {
    const r = stage.getBoundingClientRect();
    const s = Math.min(r.width / ${W}, r.height / ${H});
    frame.style.width = ${W} * s + "px";
    frame.style.height = ${H} * s + "px";
    canvas.style.transform = "scale(" + s + ")";
  }
  function toggleNotes() {
    notes.hidden = !notes.hidden;
    $("nbtn").classList.toggle("on", !notes.hidden);
    fit();
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }
  frame.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const r = frame.getBoundingClientRect();
    show(index + (e.clientX - r.left < r.width / 3 ? -1 : 1));
  });
  $("prev").onclick = () => show(index - 1);
  $("next").onclick = () => show(index + 1);
  $("nbtn").onclick = toggleNotes;
  $("fs").onclick = toggleFullscreen;
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case "PageDown": case " ": e.preventDefault(); show(index + 1); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": e.preventDefault(); show(index - 1); break;
      case "Home": show(0); break;
      case "End": show(slides.length - 1); break;
      case "f": case "F": toggleFullscreen(); break;
      case "n": case "N": toggleNotes(); break;
    }
  });
  addEventListener("resize", fit);
  const n = parseInt(location.hash.slice(1), 10);
  show(Number.isFinite(n) ? n - 1 : 0);
  fit();
})();
</script>
</body>
</html>
`;
}

for (const lang of ["de", "en"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`${base}/vortrag/print/${lang}`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);

  const imgs = await page.$$eval(".talk-print img", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { src: el.currentSrc || el.src, w: r.width, h: r.height, fit: getComputedStyle(el).objectFit };
    }),
  );
  const encoded = [];
  for (const im of imgs) encoded.push(await encode(im));

  const setImages = (which) =>
    page.evaluate(
      async (srcs) => {
        const els = [...document.querySelectorAll(".talk-print img")];
        els.forEach((el, i) => {
          for (const a of ["srcset", "sizes", "loading", "fetchpriority", "decoding"]) el.removeAttribute(a);
          el.src = srcs[i];
        });
        await Promise.all(els.map((el) => el.decode().catch(() => {})));
      },
      encoded.map((e) => e[which]),
    );

  // links in the slides lead to the live site; offline they must be absolute
  await page.evaluate((site) => {
    for (const a of document.querySelectorAll(".talk-print a[href^='/']")) {
      a.setAttribute("href", site + a.getAttribute("href"));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  }, SITE);

  await setImages("pdf");
  const pdfPath = path.join(outDir, `${FILES[lang]}.pdf`);
  await page.pdf({ path: pdfPath, width: `${W}px`, height: `${H}px`, printBackground: true, preferCSSPageSize: true });

  await setImages("html");
  const { htmlClass, bodyClass, slides, labels } = await page.evaluate(() => ({
    htmlClass: document.documentElement.className,
    bodyClass: document.body.className,
    slides: [...document.querySelectorAll(".talk-print-slide")].map((el) => ({ html: el.innerHTML, notes: el.dataset.notes ?? "" })),
    labels: JSON.parse(document.querySelector(".talk-print").dataset.ui),
  }));
  const css = await collectCss(page);
  const htmlPath = path.join(outDir, `${FILES[lang]}.html`);
  await writeFile(htmlPath, viewerHtml({ lang, htmlClass, bodyClass, css, slides, labels }));

  const kb = async (p) => Math.round((await readFile(p)).length / 1024);
  console.log(lang, `${slides.length} slides`, path.relative(".", pdfPath), `${await kb(pdfPath)} KB,`, path.relative(".", htmlPath), `${await kb(htmlPath)} KB`);
  await page.close();
}
await browser.close();

// Downloads a logo/icon and a feature image for every company listed in docs/tenants.md
// into public/tenants/<slug>-icon.png (+ -icon.svg when the site ships one) and
// public/tenants/<slug>-feature.jpg, and writes src/data/tenantAssets.ts.
//
// Sources, in order: the company website's apple-touch-icon / <link rel=icon> and its
// Open Graph image; Google favicon service and DuckDuckGo as icon fallbacks; a
// directory page (zuerich.com etc.) as feature-image fallback; a generated monogram
// when no icon can be found at all (flagged placeholder: true).
// Run: node scripts/fetch-tenant-assets.mjs [slug ...]   (no args = all)
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 ArthurPrimeTower/1.0";
const ICON_PX = 256;
const FEATURE_W = 1600;
const outDir = path.resolve("public/tenants");
await mkdir(outDir, { recursive: true });

/** @type {{slug:string,name:string,building:string,sites:string[],featureFallback?:string[]}[]} */
const tenants = [
  // Prime Tower – offices
  { slug: "homburger", name: "Homburger AG", building: "Prime Tower", sites: ["https://www.homburger.ch/en"] },
  { slug: "deutsche-bank", name: "Deutsche Bank (Schweiz) AG", building: "Prime Tower", sites: ["https://country.db.com/switzerland/", "https://www.db.com/"] },
  { slug: "citibank", name: "Citibank (Switzerland) AG", building: "Prime Tower", sites: ["https://www.citigroup.com/global/about-us/global-presence/switzerland", "https://www.citigroup.com/"] },
  { slug: "gam", name: "GAM Investments", building: "Prime Tower", sites: ["https://www.gam.com/"] },
  { slug: "crypto-finance", name: "Crypto Finance AG", building: "Prime Tower", sites: ["https://www.crypto-finance.com/"] },
  { slug: "zalando", name: "Zalando Switzerland AG", building: "Prime Tower", sites: ["https://corporate.zalando.com/en", "https://jobs.zalando.com/en/where-we-work/zurich"] },
  { slug: "hdi-global", name: "HDI Global SE", building: "Prime Tower", sites: ["https://www.hdi.global/"] },
  { slug: "oracle", name: "Oracle Software (Schweiz) GmbH", building: "Prime Tower", sites: ["https://www.oracle.com/ch-de/", "https://www.oracle.com/"] },
  { slug: "roland-berger", name: "Roland Berger AG", building: "Prime Tower", sites: ["https://www.rolandberger.com/en/"] },
  { slug: "repower", name: "Repower AG", building: "Prime Tower", sites: ["https://www.repower.com/"] },
  { slug: "korn-ferry", name: "Korn Ferry", building: "Prime Tower", sites: ["https://www.kornferry.com/"] },
  { slug: "jll", name: "JLL (Jones Lang LaSalle) AG", building: "Prime Tower", sites: ["https://www.jll.com/en-ch", "https://www.jll.ch/", "https://www.jll.com/"] },
  { slug: "cognizant", name: "Cognizant Technology Solutions AG", building: "Prime Tower", sites: ["https://www.cognizant.com/ch/en", "https://www.cognizant.com/"] },
  { slug: "nexxiot", name: "Nexxiot AG", building: "Prime Tower", sites: ["https://nexxiot.com/"] },
  { slug: "swiss-prime-site", name: "Swiss Prime Site Immobilien AG", building: "Prime Tower", sites: ["https://sps.swiss/en", "https://sps.swiss/"] },
  { slug: "flexoffice", name: "FlexOffice (Schweiz) AG", building: "Prime Tower", sites: ["https://flexoffice.swiss/en/location/zurich-prime-tower/", "https://flexoffice.swiss/"] },
  { slug: "humanis", name: "Humanis AG", building: "Prime Tower", sites: ["https://www.humanis.ch/"] },
  { slug: "schilling-partners", name: "schilling partners ag", building: "Prime Tower", sites: ["https://www.schillingpartners.ch/"] },
  { slug: "universal-music", name: "Universal Music Group (Switzerland)", building: "Prime Tower", sites: ["https://www.universalmusic.ch/", "https://www.universalmusic.com/"] },
  { slug: "a-connect", name: "A-Connect", building: "Prime Tower", sites: ["https://www.a-connect.com/"] },
  { slug: "assess-perform", name: "Assess + Perform AG", building: "Prime Tower", sites: ["https://www.assess-perform.ch/", "https://www.assessperform.ch/", "https://www.assess-perform.com/", "https://www.assessandperform.ch/"] },
  { slug: "credit-exchange", name: "Credit Exchange AG", building: "Prime Tower", sites: ["https://www.credit-exchange.ch/", "https://www.creditexchange.ch/", "https://credex.ch/", "https://www.credex.ch/"] },
  { slug: "equans", name: "Equans Switzerland FM AG", building: "Prime Tower", sites: ["https://www.equans.ch/"] },
  { slug: "trammo", name: "Trammo AG / Trammochem", building: "Prime Tower", sites: ["https://www.trammo.com/"] },
  // Prime Tower – ground floor, top floors, services
  { slug: "clouds", name: "Clouds (Candrian Catering)", building: "Prime Tower", sites: ["https://clouds.ch/en/", "https://clouds.ch/"] },
  { slug: "zkb", name: "Zürcher Kantonalbank", building: "Prime Tower", sites: ["https://www.zkb.ch/de/standorte/zuerich-primetower.html", "https://www.zkb.ch/"] },
  { slug: "hotel-rivington-sons", name: "Hotel Rivington & Sons", building: "Prime Tower", sites: ["https://www.hotelrivingtonandsons.ch/", "https://hotelrivingtonandsons.ch/", "https://www.rivington.ch/"], featureFallback: ["https://www.zuerich.com/en/visit/bars-lounges/hotel-rivington-sons"] },
  { slug: "migrolino", name: "Migrolino", building: "Prime Tower", sites: ["https://www.migrolino.ch/"] },
  { slug: "wincasa", name: "Wincasa AG", building: "Prime Tower", sites: ["https://www.wincasa.ch/"] },
  // Prime Tower – former
  { slug: "infosys", name: "Infosys", building: "Prime Tower", sites: ["https://www.infosys.com/"] },
  // Platform
  { slug: "ey", name: "EY (Ernst & Young AG)", building: "Platform", sites: ["https://www.ey.com/en_ch", "https://www.ey.com/"] },
  { slug: "ey-restaurant-platform", name: "EY Restaurant platform (ZFV)", building: "Platform", sites: ["https://www.zfv.ch/de/essen-gehen/ey-restaurant-platform", "https://www.zfv.ch/"] },
  { slug: "coop", name: "Coop", building: "Platform", sites: ["https://www.coop.ch/"] },
  // Cubus
  { slug: "coop-pronto", name: "Coop Pronto", building: "Cubus", sites: ["https://www.coop-pronto.ch/", "https://www.coop.ch/de/unternehmen/standorte-und-oeffnungszeiten/detail.html/4577/coop-pronto-zuerich-prime-tower.html"] },
  { slug: "kids-and-co", name: "kids & co Prime Tower", building: "Cubus", sites: ["https://www.kidsandco.ch/", "https://kidsandco.ch/", "https://www.kids-co.ch/"], featureFallback: ["https://www.kinderkrippen-online.ch/kinderbetreuung/1072"] },
  { slug: "kieser-training", name: "Kieser Training Zürich-Prime Tower", building: "Cubus", sites: ["https://www.kieser-training.ch/", "https://www.kieser.ch/"], featureFallback: ["https://zuri.net/en/zurich/gym/kieser-training-zurich-prime-tower-8992.htm"] },
  { slug: "dr-semm", name: "Dr. Semm AG", building: "Cubus", sites: ["https://www.dr-semm.ch/", "https://www.praxis-semm.ch/", "https://www.drsemm.ch/"] },
  { slug: "physio-kandil", name: "Physio Kandil GmbH", building: "Cubus", sites: ["https://www.physiokandil.ch/"] },
  { slug: "zahnarztzentrum", name: "Zahnarztzentrum.ch", building: "Cubus", sites: ["https://www.zahnarztzentrum.ch/"] },
  // Diagonal
  { slug: "galerie-presenhuber", name: "Galerie Eva Presenhuber", building: "Diagonal", sites: ["https://www.presenhuber.com/"] },
  { slug: "galerie-kilchmann", name: "Galerie Peter Kilchmann", building: "Diagonal", sites: ["https://www.peterkilchmann.com/"], featureFallback: ["https://www.zuerich.com/en/visit/culture/galerie-peter-kilchmann"] },
  { slug: "moyo-ooki", name: "Moyo event space / Ooki Temporary", building: "Diagonal", sites: ["https://www.moyo.ch/", "https://moyo-zurich.ch/", "https://www.ooki.ch/", "https://ooki-temporary.ch/"] },
  // MAAG Halle
  { slug: "maag-music-arts", name: "MAAG Music & Arts AG", building: "MAAG Halle", sites: ["https://www.maag.ch/", "https://www.maaghalle.ch/", "https://bymaag.ch/"] },
  { slug: "k2-bistro", name: "k2 Bistro & Bar", building: "MAAG Halle", sites: ["https://www.k2bistro.ch/", "https://k2-bistro.ch/", "https://www.k2-bistrobar.ch/"], featureFallback: ["https://www.zuerich.com/en/visit/restaurants/k2-bistro-bar"] },
];

const only = new Set(process.argv.slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept = "*/*") {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en,de;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  return out;
}

function parseHead(html, base) {
  const links = [];
  const metas = {};
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (!a.href) continue;
    const rel = (a.rel ?? "").toLowerCase();
    if (/icon/.test(rel)) {
      const svg = /svg/.test(a.type ?? "") || /\.svg(\?|$)/i.test(a.href);
      const size = parseInt((a.sizes ?? "").split("x")[0]) || (svg ? 512 : /apple-touch/.test(rel) ? 180 : 0);
      try {
        links.push({ rel, href: new URL(a.href, base).href, size, svg });
      } catch {}
    }
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property ?? a.name ?? "").toLowerCase();
    if (key && a.content && !(key in metas)) metas[key] = a.content;
  }
  const og = metas["og:image:secure_url"] ?? metas["og:image"] ?? metas["twitter:image"] ?? metas["twitter:image:src"];
  let ogUrl;
  try {
    if (og) ogUrl = new URL(og.replace(/&amp;/g, "&"), base).href;
  } catch {}
  return { links, ogUrl, title: metas["og:site_name"] ?? metas["og:title"] };
}

async function loadPage(url) {
  const res = await get(url, "text/html,application/xhtml+xml");
  const html = await res.text();
  if (!/<html|<head|<meta|<link/i.test(html)) throw new Error("not html " + url);
  return { html, finalUrl: res.url || url };
}

async function toImage(buf) {
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) return null;
    return { buf, width: meta.width, height: meta.height, format: meta.format };
  } catch {
    return null;
  }
}

async function download(url) {
  const res = await get(url, "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error("tiny " + url);
  return { buf, type: res.headers.get("content-type") ?? "" };
}

// Google returns a generic globe when it has no icon; hash it once so we can reject it.
let googleDefault = null;
async function googleDefaultHash() {
  if (googleDefault !== null) return googleDefault;
  try {
    const { buf } = await download(`https://www.google.com/s2/favicons?domain=no-such-domain-${Date.now()}.invalid&sz=${ICON_PX}`);
    googleDefault = createHash("sha1").update(buf).digest("hex");
  } catch {
    googleDefault = "";
  }
  return googleDefault;
}

async function fetchIcon(t, page) {
  const tried = [];
  const candidates = [];
  if (page) {
    const links = page.head.links.filter((l) => !/\.ico(\?|$)/i.test(l.href)).sort((a, b) => b.size - a.size);
    for (const l of links) candidates.push({ url: l.href, from: "site", svg: l.svg });
    const origin = new URL(page.finalUrl).origin;
    candidates.push({ url: `${origin}/apple-touch-icon.png`, from: "site-guess" }, { url: `${origin}/apple-touch-icon-180x180.png`, from: "site-guess" });
  }
  const host = page ? new URL(page.finalUrl).hostname : new URL(t.sites[0]).hostname;
  candidates.push({ url: `https://www.google.com/s2/favicons?domain=${host}&sz=${ICON_PX}`, from: "google" });
  candidates.push({ url: `https://icons.duckduckgo.com/ip3/${host}.ico`, from: "duckduckgo" });

  let best = null;
  for (const c of candidates) {
    try {
      const { buf } = await download(c.url);
      if (c.from === "google" && createHash("sha1").update(buf).digest("hex") === (await googleDefaultHash())) throw new Error("google default globe");
      const img = await toImage(buf);
      if (!img) throw new Error("undecodable");
      if (img.width < 32) throw new Error(`too small ${img.width}px`);
      tried.push(`${c.from} ok ${img.width}px`);
      if (!best || img.width > best.width) best = { ...img, url: c.url, from: c.from, svg: img.format === "svg" };
      if (best.width >= 128) break; // good enough; stop hammering
    } catch (e) {
      tried.push(`${c.from} ${String(e.message).slice(0, 60)}`);
    }
  }
  return { best, tried };
}

async function fetchFeature(t, page) {
  const tried = [];
  const urls = [];
  if (page?.head.ogUrl) urls.push({ url: page.head.ogUrl, from: page.finalUrl });
  for (const fb of t.featureFallback ?? []) {
    try {
      const p = await loadPage(fb);
      const head = parseHead(p.html, p.finalUrl);
      if (head.ogUrl) urls.push({ url: head.ogUrl, from: p.finalUrl });
      else tried.push(`fallback ${fb} has no og:image`);
    } catch (e) {
      tried.push(`fallback ${String(e.message).slice(0, 60)}`);
    }
  }
  for (const u of urls) {
    try {
      const { buf } = await download(u.url);
      const img = await toImage(buf);
      if (!img) throw new Error("undecodable");
      if (img.width < 300) throw new Error(`too small ${img.width}px`);
      return { ...img, url: u.url, from: u.from, tried };
    } catch (e) {
      tried.push(`${u.url} ${String(e.message).slice(0, 60)}`);
    }
  }
  return { tried };
}

function monogram(name) {
  const words = name
    .replace(/[()/&+.,]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(ag|gmbh|se|the|und|and|of)$/i.test(w));
  const initials = words.slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const fontSize = initials.length > 1 ? 112 : 140;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="hsl(${hue} 35% 28%)"/><text x="128" y="128" dy="0.36em" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#f4f4f0">${initials}</text></svg>`;
}

const results = [];
const report = [];
for (const t of tenants) {
  if (only.size && !only.has(t.slug)) continue;
  let page = null;
  for (const site of t.sites) {
    try {
      const p = await loadPage(site);
      page = { ...p, head: parseHead(p.html, p.finalUrl) };
      break;
    } catch (e) {
      report.push(`${t.slug}: site ${site} -> ${String(e.message).slice(0, 80)}`);
    }
  }

  const iconRes = await fetchIcon(t, page);
  const iconPng = path.join(outDir, `${t.slug}-icon.png`);
  const iconSvg = path.join(outDir, `${t.slug}-icon.svg`);
  const entry = { slug: t.slug, name: t.name, building: t.building, website: page?.finalUrl, icon: `${t.slug}-icon.png` };
  if (iconRes.best) {
    const b = iconRes.best;
    await sharp(b.buf, b.svg ? { density: 300 } : undefined)
      .resize({ width: ICON_PX, height: ICON_PX, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: b.width >= ICON_PX })
      .png()
      .toFile(iconPng);
    if (b.svg) {
      await writeFile(iconSvg, b.buf);
      entry.iconSvg = `${t.slug}-icon.svg`;
    }
    entry.iconSource = b.url;
    entry.iconOrigin = b.from;
    entry.iconWidth = b.width;
  } else {
    await sharp(Buffer.from(monogram(t.name)), { density: 300 }).resize(ICON_PX, ICON_PX).png().toFile(iconPng);
    entry.iconOrigin = "placeholder";
    entry.placeholder = true;
  }

  const feat = await fetchFeature(t, page);
  if (feat.buf) {
    const dest = path.join(outDir, `${t.slug}-feature.jpg`);
    const info = await sharp(feat.buf, feat.format === "svg" ? { density: 200 } : undefined)
      .flatten({ background: "#ffffff" })
      .resize({ width: FEATURE_W, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dest);
    entry.feature = `${t.slug}-feature.jpg`;
    entry.featureSource = feat.url;
    entry.featurePage = feat.from;
    entry.featureWidth = info.width;
    entry.featureHeight = info.height;
  }

  results.push(entry);
  console.log(
    `${t.slug.padEnd(24)} icon: ${entry.iconOrigin}${entry.iconWidth ? ` ${entry.iconWidth}px` : ""}`.padEnd(60),
    `feature: ${entry.feature ? `${entry.featureWidth}x${entry.featureHeight}` : "none"}`,
  );
  if (!iconRes.best) report.push(`${t.slug}: no icon (${iconRes.tried.join(" | ")})`);
  if (!feat.buf) report.push(`${t.slug}: no feature image (${feat.tried.join(" | ") || "no og:image"})`);
  await sleep(300);
}

if (!only.size) {
  const ts = `/** Generated by scripts/fetch-tenant-assets.mjs. Files live under /public/tenants. */
export type TenantAsset = {
  slug: string;
  name: string;
  building: string;
  website?: string;
  icon: string;
  iconSvg?: string;
  iconSource?: string;
  iconOrigin: "site" | "site-guess" | "google" | "duckduckgo" | "placeholder";
  iconWidth?: number;
  placeholder?: boolean;
  feature?: string;
  featureSource?: string;
  featurePage?: string;
  featureWidth?: number;
  featureHeight?: number;
};

export const tenantAssets: TenantAsset[] = ${JSON.stringify(results, null, 2)};

export const tenantAssetBySlug = Object.fromEntries(tenantAssets.map((a) => [a.slug, a])) as Record<string, TenantAsset>;
`;
  await writeFile(path.resolve("src/data/tenantAssets.ts"), ts);
  console.log(`\nwrote src/data/tenantAssets.ts with ${results.length} entries`);
}
if (report.length) console.log("\nIssues:\n- " + report.join("\n- "));

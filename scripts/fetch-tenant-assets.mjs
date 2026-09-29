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

/** @type {{slug:string,name:string,building:string,sites:string[],featureFallback?:string[],iconUrls?:string[],featureUrls?:string[],logoUrls?:string[],skipOg?:boolean,noLogo?:boolean,featureCredit?:string}[]} */
const tenants = [
  // Prime Tower – offices
  { slug: "homburger", name: "Homburger AG", building: "Prime Tower", sites: ["https://www.homburger.ch/en"], skipOg: true, featureUrls: ["https://www.homburger.ch/api/ms/2025/10/w_3000,h_1680,c_fill/Homburger_D1_238_Breaker.jpg"] },
  { slug: "deutsche-bank", name: "Deutsche Bank (Schweiz) AG", building: "Prime Tower", sites: ["https://country.db.com/switzerland/", "https://www.db.com/"] },
  { slug: "citibank", name: "Citibank (Switzerland) AG", building: "Prime Tower", sites: ["https://www.citigroup.com/global/about-us/global-presence/switzerland", "https://www.citigroup.com/"], iconUrls: ["https://www.google.com/s2/favicons?domain=citi.com&sz=256"] },
  { slug: "gam", name: "GAM Investments", building: "Prime Tower", sites: ["https://www.gam.com/"], logoUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/GAM%20Holding%20logo.svg?width=800"] },
  { slug: "crypto-finance", name: "Crypto Finance AG", building: "Prime Tower", sites: ["https://www.crypto-finance.com/"] },
  { slug: "zalando", name: "Zalando Switzerland AG", building: "Prime Tower", sites: ["https://corporate.zalando.com/en", "https://jobs.zalando.com/en/where-we-work/zurich"] },
  { slug: "hdi-global", name: "HDI Global SE", building: "Prime Tower", sites: ["https://www.hdi.global/"], featureUrls: ["https://res.cloudinary.com/hdiglobal/image/upload/f_auto,q_auto/w_1920,h_1200,x_0,y_29,c_crop/w_1600,c_scale/productioncms12/episerver/cec8a8ee-c0c1-40f3-9dc3-b4c0afa03994/hdi_keyvisual_partner_in_transformation.jpg"] },
  { slug: "oracle", name: "Oracle Software (Schweiz) GmbH", building: "Prime Tower", sites: ["https://www.oracle.com/ch-de/", "https://www.oracle.com/"], logoUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Oracle%20logo.svg?width=800"] },
  { slug: "roland-berger", name: "Roland Berger AG", building: "Prime Tower", sites: ["https://www.rolandberger.com/en/"] },
  { slug: "repower", name: "Repower AG", building: "Prime Tower", sites: ["https://www.repower.com/"], logoUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Repower%20AG%20Logo.svg?width=800"] },
  { slug: "korn-ferry", name: "Korn Ferry", building: "Prime Tower", sites: ["https://www.kornferry.com/"] },
  { slug: "jll", name: "JLL (Jones Lang LaSalle) AG", building: "Prime Tower", sites: ["https://www.jll.com/en-ch", "https://www.jll.ch/", "https://www.jll.com/"] },
  { slug: "cognizant", name: "Cognizant Technology Solutions AG", building: "Prime Tower", sites: ["https://www.cognizant.com/ch/en", "https://www.cognizant.com/"] },
  { slug: "nexxiot", name: "Nexxiot AG", building: "Prime Tower", sites: ["https://nexxiot.com/"] },
  { slug: "swiss-prime-site", name: "Swiss Prime Site Immobilien AG", building: "Prime Tower", sites: ["https://sps.swiss/en", "https://sps.swiss/"], logoUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Swiss%20Prime%20Site%20Logo%202023.svg?width=800"] },
  { slug: "flexoffice", name: "FlexOffice (Schweiz) AG", building: "Prime Tower", sites: ["https://flexoffice.swiss/en/location/zurich-prime-tower/", "https://flexoffice.swiss/"] },
  { slug: "humanis", name: "Humanis AG", building: "Prime Tower", sites: ["https://www.humanis.ch/"] },
  { slug: "schilling-partners", name: "schilling partners ag", building: "Prime Tower", sites: ["https://www.schillingpartners.ch/"], skipOg: true },
  { slug: "universal-music", name: "Universal Music Group (Switzerland)", building: "Prime Tower", sites: ["https://www.universalmusic.ch/", "https://www.universalmusic.com/"] },
  { slug: "a-connect", name: "A-Connect", building: "Prime Tower", sites: ["https://www.a-connect.com/"] },
  { slug: "assess-perform", name: "Assess + Perform AG", building: "Prime Tower", sites: ["https://www.assessandperform.ch/de/"] },
  { slug: "credit-exchange", name: "Credit Exchange AG", building: "Prime Tower", sites: ["https://www.creditexchange.ch/"], skipOg: true },
  { slug: "equans", name: "Equans Switzerland FM AG", building: "Prime Tower", sites: ["https://www.equans.ch/"] },
  { slug: "trammo", name: "Trammo AG / Trammochem", building: "Prime Tower", sites: ["https://www.trammo.com/"] },
  // Prime Tower – ground floor, top floors, services
  { slug: "clouds", name: "Clouds (Candrian Catering)", building: "Prime Tower", sites: ["https://clouds.ch/en/", "https://clouds.ch/"] },
  { slug: "zkb", name: "Zürcher Kantonalbank", building: "Prime Tower", sites: ["https://www.zkb.ch/de/standorte/zuerich-primetower.html", "https://www.zkb.ch/"] },
  { slug: "hotel-rivington-sons", name: "Hotel Rivington & Sons", building: "Prime Tower", sites: ["https://www.hotelrivingtonandsons.ch/"], featureFallback: ["https://www.zuerich.com/en/visit/bars-lounges/hotel-rivington-sons"] },
  { slug: "migrolino", name: "Migrolino", building: "Prime Tower", sites: ["https://www.migrolino.ch/"], featureUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Affoltern%20-%20Migrolino%20-%20Bahnhof%202012-05-13%2017-59-52%20(P7000).JPG?width=1600"] },
  { slug: "wincasa", name: "Wincasa AG", building: "Prime Tower", sites: ["https://www.wincasa.ch/"] },
  // Prime Tower – former
  { slug: "infosys", name: "Infosys", building: "Prime Tower", sites: ["https://www.infosys.com/"] },
  // Platform
  { slug: "ey", name: "EY (Ernst & Young AG)", building: "Platform", sites: ["https://www.ey.com/en_ch", "https://www.ey.com/"], logoUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/EY%20logo%202019.svg?width=800"] },
  { slug: "ey-restaurant-platform", name: "EY Restaurant platform (ZFV)", building: "Platform", sites: ["https://www.zfv.ch/de/essen-gehen/ey-restaurant-platform", "https://www.zfv.ch/"] },
  { slug: "coop", name: "Coop", building: "Platform", sites: ["https://www.coop.ch/"], featureUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coop%20-%20vegetables.jpg?width=1600"] },
  // Cubus
  { slug: "coop-pronto", name: "Coop Pronto", building: "Cubus", sites: ["https://www.coop-pronto.ch/", "https://www.coop.ch/de/unternehmen/standorte-und-oeffnungszeiten/detail.html/4577/coop-pronto-zuerich-prime-tower.html"] },
  { slug: "kids-and-co", name: "kids & co Prime Tower", building: "Cubus", sites: ["https://kidsco.profawo.ch/de/"], featureFallback: ["https://www.kinderkrippen-online.ch/kinderbetreuung/1072"] },
  { slug: "kieser-training", name: "Kieser Training Zürich-Prime Tower", building: "Cubus", sites: ["https://www.kieser-training.ch/", "https://www.kieser.ch/"], featureFallback: ["https://zuri.net/en/zurich/gym/kieser-training-zurich-prime-tower-8992.htm"] },
  { slug: "dr-semm", name: "Dr. Semm AG", building: "Cubus", sites: ["https://www.drsemm.ch/"], noLogo: true },
  { slug: "physio-kandil", name: "Physio Kandil GmbH", building: "Cubus", sites: ["https://www.physiokandil.ch/"] },
  { slug: "zahnarztzentrum", name: "Zahnarztzentrum.ch", building: "Cubus", sites: ["https://www.zahnarztzentrum.ch/"] },
  // Diagonal
  { slug: "galerie-presenhuber", name: "Galerie Eva Presenhuber", building: "Diagonal", sites: ["https://www.presenhuber.com/"] },
  { slug: "galerie-kilchmann", name: "Galerie Peter Kilchmann", building: "Diagonal", sites: ["https://www.peterkilchmann.com/"], featureFallback: ["https://www.zuerich.com/en/visit/culture/galerie-peter-kilchmann"] },
  { slug: "moyo-ooki", name: "Moyo event space / Ooki Temporary", building: "Diagonal", sites: ["https://moyoshimono.ch/"] },
  // MAAG Halle
  { slug: "maag-music-arts", name: "MAAG Music & Arts AG", building: "MAAG Halle", sites: ["https://www.maaghalle.ch/", "https://bymaag.ch/"] },
  { slug: "k2-bistro", name: "k2 Bistro & Bar", building: "MAAG Halle", sites: ["https://www.k2bistro.ch/"], featureFallback: ["https://www.zuerich.com/en/visit/restaurants/k2-bistro-bar"] },
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
  // Content images and header logos, in document order.
  const imgs = [];
  const pushImg = (raw, meta) => {
    if (!raw || raw.startsWith("data:")) return;
    try {
      imgs.push({ url: new URL(raw.replace(/&amp;/g, "&").trim(), base).href, ...meta });
    } catch {}
  };
  const bestFromSrcset = (srcset) => {
    const parts = srcset.split(/,\s+/).map((p) => p.trim().split(/\s+/));
    parts.sort((a, b) => (parseFloat(b[1]) || 0) - (parseFloat(a[1]) || 0));
    return parts[0]?.[0];
  };
  for (const m of html.matchAll(/<(img|source)\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const hint = `${a.src ?? ""} ${a["data-src"] ?? ""} ${a.alt ?? ""} ${a.class ?? ""} ${a.id ?? ""}`;
    const isLogo = /logo|brand|signet/i.test(hint);
    const srcset = a.srcset ?? a["data-srcset"];
    pushImg(srcset ? bestFromSrcset(srcset) : a["data-src"] ?? a.src, { isLogo, alt: a.alt ?? "" });
  }
  for (const m of html.matchAll(/background(?:-image)?\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) pushImg(m[1], { isLogo: /logo/i.test(m[1]), alt: "" });

  const og = metas["og:image:secure_url"] ?? metas["og:image"] ?? metas["twitter:image"] ?? metas["twitter:image:src"];
  let ogUrl;
  try {
    if (og) ogUrl = new URL(og.replace(/&amp;/g, "&"), base).href;
  } catch {}
  return { links, ogUrl, imgs, title: metas["og:site_name"] ?? metas["og:title"] };
}

async function loadPage(url) {
  const res = await get(url, "text/html,application/xhtml+xml");
  const html = await res.text();
  if (!/<html|<head|<meta|<link/i.test(html)) throw new Error("not html " + url);
  return { html, finalUrl: res.url || url };
}

async function toImage(buf) {
  try {
    const meta = await sharp(buf, { limitInputPixels: false }).metadata();
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
  for (const u of t.iconUrls ?? []) candidates.push({ url: u, from: "override" });
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
  for (const u of t.featureUrls ?? []) urls.push({ url: u, from: "override", strict: false });
  if (page?.head.ogUrl && !t.skipOg) urls.push({ url: page.head.ogUrl, from: page.finalUrl, strict: false });
  const heroes = [];
  if (page) heroes.push(...heroCandidates(page.head.imgs, page.finalUrl));
  for (const fb of t.featureFallback ?? []) {
    try {
      const p = await loadPage(fb);
      const head = parseHead(p.html, p.finalUrl);
      if (head.ogUrl) urls.push({ url: head.ogUrl, from: p.finalUrl, strict: false });
      else tried.push(`fallback ${fb} has no og:image`);
      heroes.push(...heroCandidates(head.imgs, p.finalUrl));
    } catch (e) {
      tried.push(`fallback ${String(e.message).slice(0, 60)}`);
    }
  }
  // Largest landscape photo from the page body, when there is no usable og:image.
  urls.push(...heroes.slice(0, 14));
  if (page?.head.ogUrl && t.skipOg) urls.push({ url: page.head.ogUrl, from: page.finalUrl, strict: false });
  for (const u of urls) {
    try {
      const { buf } = await download(u.url);
      const img = await toImage(buf);
      if (!img) throw new Error("undecodable");
      if (img.format === "svg") throw new Error("svg");
      const min = u.strict ? 700 : 300;
      if (img.width < min) throw new Error(`too small ${img.width}px`);
      const ratio = img.width / img.height;
      if (u.strict && (ratio < 1.0 || ratio > 3.2)) throw new Error(`ratio ${ratio.toFixed(2)}`);
      return { ...img, url: u.url, from: u.from, tried };
    } catch (e) {
      tried.push(`${u.url} ${String(e.message).slice(0, 60)}`);
    }
  }
  return { tried };
}

// Author and licence for Wikimedia Commons images (they must be attributed).
async function commonsCredit(url) {
  const m = url.match(/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?]+)/);
  if (!m) return undefined;
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=File:${m[1]}`;
  try {
    const d = await (await get(api, "application/json")).json();
    const ext = Object.values(d.query.pages)[0]?.imageinfo?.[0]?.extmetadata ?? {};
    const strip = (h) => (h ?? "").replace(/<[^>]+>/g, "").trim();
    return `${strip(ext.Artist?.value) || "Unknown"}, ${strip(ext.LicenseShortName?.value) || "see source"}, Wikimedia Commons`;
  } catch {
    return "Wikimedia Commons";
  }
}

function heroCandidates(imgs, from) {
  const seen = new Set();
  return imgs
    .filter((i) => !i.isLogo && !/\.svg(\?|$)|\.gif(\?|$)|icon|sprite|avatar|flag|pixel|tracking|placeholder/i.test(i.url))
    .filter((i) => (seen.has(i.url) ? false : seen.add(i.url)))
    .map((i) => ({ url: i.url, from, strict: true }));
}

async function fetchLogo(t, page) {
  if (t.noLogo) return null; // e.g. the page's only "logo" belongs to a software vendor
  const cands = [...(t.logoUrls ?? []).map((u) => ({ url: u }))];
  if (page) {
    const logos = page.head.imgs.filter((i) => i.isLogo);
    logos.sort((a, b) => Number(/\.svg(\?|$)/i.test(b.url)) - Number(/\.svg(\?|$)/i.test(a.url)));
    cands.push(...logos.slice(0, 4));
  }
  for (const c of cands) {
    try {
      const { buf } = await download(c.url);
      const img = await toImage(buf);
      if (!img) continue;
      if (img.format !== "svg" && img.width < 80) continue;
      return { ...img, url: c.url };
    } catch {}
  }
  return null;
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
  try {
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
  const logo = await fetchLogo(t, page);
  const iconPng = path.join(outDir, `${t.slug}-icon.png`);
  const iconSvg = path.join(outDir, `${t.slug}-icon.svg`);
  const entry = { slug: t.slug, name: t.name, building: t.building, website: page?.finalUrl, icon: `${t.slug}-icon.png` };
  const weakIcon = !iconRes.best || (iconRes.best.width < 96 && iconRes.best.format !== "svg");
  if (weakIcon && logo) {
    // Brand logo centred on a white tile beats a blurry 32px favicon or a monogram.
    const inner = await sharp(logo.buf, { limitInputPixels: false, ...(logo.format === "svg" ? { density: 300 } : {}) })
      .resize({ width: ICON_PX - 48, height: ICON_PX - 48, fit: "inside" })
      .png()
      .toBuffer();
    await sharp({ create: { width: ICON_PX, height: ICON_PX, channels: 4, background: "#ffffff" } })
      .composite([{ input: inner, gravity: "centre" }])
      .png()
      .toFile(iconPng);
    entry.iconSource = logo.url;
    entry.iconOrigin = "logo";
    entry.iconWidth = ICON_PX;
  } else if (iconRes.best) {
    const b = iconRes.best;
    await sharp(b.buf, { limitInputPixels: false, ...(b.svg ? { density: 150 } : {}) })
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

  if (logo) {
    const isSvg = logo.format === "svg";
    if (isSvg) await writeFile(path.join(outDir, `${t.slug}-logo.svg`), logo.buf);
    await sharp(logo.buf, { limitInputPixels: false, ...(isSvg ? { density: 200 } : {}) })
      .resize({ width: 600, height: 300, fit: "inside", withoutEnlargement: !isSvg })
      .png()
      .toFile(path.join(outDir, `${t.slug}-logo.png`));
    entry.logo = `${t.slug}-logo.png`;
    if (isSvg) entry.logoSvg = `${t.slug}-logo.svg`;
    entry.logoSource = logo.url;
  }

  const feat = await fetchFeature(t, page);
  if (feat.buf) {
    const dest = path.join(outDir, `${t.slug}-feature.jpg`);
    const info = await sharp(feat.buf, { limitInputPixels: false, ...(feat.format === "svg" ? { density: 150 } : {}) })
      .flatten({ background: "#ffffff" })
      .resize({ width: FEATURE_W, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dest);
    entry.feature = `${t.slug}-feature.jpg`;
    entry.featureSource = feat.url;
    entry.featurePage = feat.from;
    const credit = await commonsCredit(feat.url);
    if (credit) entry.featureCredit = credit;
    entry.featureWidth = info.width;
    entry.featureHeight = info.height;
  }

  results.push(entry);
  console.log(
    `${t.slug.padEnd(24)} icon: ${entry.iconOrigin}${entry.iconWidth ? ` ${entry.iconWidth}px` : ""}`.padEnd(60),
    `feature: ${entry.feature ? `${entry.featureWidth}x${entry.featureHeight}${entry.featurePage === "override" ? " override" : ""}` : "none"}`.padEnd(26),
    `logo: ${entry.logoSvg ? "svg" : entry.logo ? "png" : "none"}`,
  );
  if (!iconRes.best) report.push(`${t.slug}: no icon (${iconRes.tried.join(" | ")})`);
  if (!feat.buf) report.push(`${t.slug}: no feature image (${feat.tried.join(" | ") || "no og:image"})`);
  } catch (e) {
    report.push(`${t.slug}: FAILED ${e.message}`);
    console.log(`${t.slug.padEnd(24)} FAILED ${e.message}`);
  }
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
  iconOrigin: "override" | "logo" | "site" | "site-guess" | "google" | "duckduckgo" | "placeholder";
  iconWidth?: number;
  placeholder?: boolean;
  feature?: string;
  featureSource?: string;
  featurePage?: string;
  featureWidth?: number;
  featureHeight?: number;
  featureCredit?: string;
  logo?: string;
  logoSvg?: string;
  logoSource?: string;
};

export const tenantAssets: TenantAsset[] = ${JSON.stringify(results, null, 2)};

export const tenantAssetBySlug = Object.fromEntries(tenantAssets.map((a) => [a.slug, a])) as Record<string, TenantAsset>;
`;
  await writeFile(path.resolve("src/data/tenantAssets.ts"), ts);
  console.log(`\nwrote src/data/tenantAssets.ts with ${results.length} entries`);
}
if (report.length) console.log("\nIssues:\n- " + report.join("\n- "));

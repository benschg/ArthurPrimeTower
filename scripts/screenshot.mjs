// Visual smoke test: opens the running app in headless Chrome and captures the 3D viewer in several states.
// Usage: node scripts/screenshot.mjs [baseUrl] [outDir]
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
await mkdir(out, { recursive: true });

const candidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const browser = await puppeteer.launch({
  executablePath: candidates[0],
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);

const shot = async (name) => {
  await wait(1200);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log("captured", name);
};

await shot("01-hero");

const click = async (label) => {
  const [btn] = await page.$$(`xpath/.//button[normalize-space()='${label}']`);
  if (!btn) throw new Error("button not found: " + label);
  await btn.click();
};

await click("Rotate"); // stop auto-rotate for deterministic frames
await click("Tenants");
await shot("02-tenants");
await click("Tenants");
await click("Explode");
await wait(2000);
await shot("03-explode");
await click("Explode");
await click("Garage");
await wait(2000);
await shot("04-garage");
await click("Garage");
await click("Night");
await shot("05-night");
await click("Night");

// hover a floor: move the mouse over the tower centre
await page.mouse.move(720, 420);
await shot("06-hover");

// full page sections
await page.evaluate(() => window.scrollTo(0, window.innerHeight));
await shot("07-facts");
await page.evaluate(() => document.getElementById("tenants")?.scrollIntoView());
await shot("08-tenants-table");
await page.evaluate(() => document.getElementById("gallery")?.scrollIntoView());
await wait(2000);
await shot("09-gallery");

// mobile
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.evaluate(() => window.scrollTo(0, 0));
await wait(1500);
await shot("10-mobile");

await browser.close();
if (errors.length) {
  console.log("Errors observed:");
  for (const e of errors) console.log(" -", e);
} else {
  console.log("No page errors.");
}

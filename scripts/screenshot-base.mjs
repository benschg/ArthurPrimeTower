// High-resolution crop of the tower base to inspect artefacts at ground level.
// Usage: node scripts/screenshot-base.mjs [baseUrl] [outDir]
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);
const [btn] = await page.$$("xpath/.//button[normalize-space()='Rotate']");
await btn.click();
await wait(600);
await page.mouse.move(1200, 200); // away from the plaza so the garage does not peek
await wait(600);
await page.screenshot({ path: path.join(out, "base-crop.png"), clip: { x: 500, y: 560, width: 520, height: 260 } });
// grazing angle: drag upward to lower the camera to the horizon
await page.mouse.move(720, 300);
await page.mouse.down();
await page.mouse.move(720, 40, { steps: 20 });
await page.mouse.up();
await wait(800);
await page.screenshot({ path: path.join(out, "base-grazing.png") });
const [night] = await page.$$("xpath/.//button[normalize-space()='Night']");
await night.click();
await wait(3000);
await page.screenshot({ path: path.join(out, "base-grazing-night.png") });
// garage peek fade: hover the plaza and capture early and settled frames
await page.mouse.move(560, 700);
await wait(150);
await page.screenshot({ path: path.join(out, "peek-early.png") });
await wait(1200);
await page.screenshot({ path: path.join(out, "peek-settled.png") });
await browser.close();
console.log("done");

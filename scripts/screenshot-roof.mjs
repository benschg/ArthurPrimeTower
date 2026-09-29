// Close-up captures of the roof by day and night for visual checks.
// Usage: node scripts/screenshot-roof.mjs [baseUrl] [outDir]
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
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);
const click = async (label) => {
  const [btn] = await page.$$(`xpath/.//button[normalize-space()='${label}']`);
  await btn.click();
};
await click("Rotate");
// zoom in on the roof: scroll wheel over the canvas centre, then drag to tilt down slightly
await page.mouse.move(720, 450);
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel({ deltaY: -400 });
  await wait(120);
}
await page.mouse.down();
await page.mouse.move(720, 560, { steps: 12 });
await page.mouse.up();
await wait(1500);
await page.screenshot({ path: path.join(out, "roof-day.png") });
await click("Night");
await wait(2500);
await page.screenshot({ path: path.join(out, "roof-night.png") });
await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

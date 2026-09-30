// Exercises the blinds controller through window.primeTower.blinds and captures the result.
// Usage: node scripts/probe-blinds.mjs [baseUrl] [outDir]
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
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 300)));
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);
const click = async (label) => {
  const [b] = await page.$$(`xpath/.//button[normalize-space()='${label}' or @aria-label='${label}']`);
  await b.click();
};
await click("Rotate");
// zoom to the cursor on the upper facade so panes are legible
await page.mouse.move(720, 300);
for (let i = 0; i < 7; i++) {
  await page.mouse.wheel({ deltaY: -300 });
  await wait(100);
}
await wait(800);
await page.screenshot({ path: path.join(out, "blinds-default.png") });

const api = await page.evaluate(() => {
  const b = window.primeTower?.blinds;
  if (!b) return null;
  return { panes21: b.panes(21), facadeSE21: b.facadePanes(21, 3), get: b.get(21, 10) };
});
console.log("api:", JSON.stringify(api));

await page.evaluate(() => window.primeTower.blinds.setAll(1).snap());
await wait(600);
await page.screenshot({ path: path.join(out, "blinds-all-down.png") });

await page.evaluate(() => window.primeTower.blinds.setAll(0).snap());
await wait(600);
await page.screenshot({ path: path.join(out, "blinds-all-up.png") });

// sun from the south-west: the plaza-side facade shades, the Hardbruecke side stays open
await page.evaluate(() => window.primeTower.blinds.setFromSun([-0.7, -0.7]).snap());
await wait(600);
await page.screenshot({ path: path.join(out, "blinds-sun-sw.png") });

// one floor fully down, eased (not snapped): capture mid-glide and settled
await page.evaluate(() => window.primeTower.blinds.setAll(0).snap().setFloor(24, 1));
await wait(250);
await page.screenshot({ path: path.join(out, "blinds-floor24-mid.png") });
await wait(2500);
await page.screenshot({ path: path.join(out, "blinds-floor24.png") });

await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

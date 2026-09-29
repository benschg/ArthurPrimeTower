// Captures the window-cleaning game (auto-started via /#clean) and the language toggle.
// Usage: node scripts/screenshot-game.mjs [baseUrl] [outDir]
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// German default
await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
await wait(3000);
await page.screenshot({ path: path.join(out, "lang-de.png") });
const htmlLang = await page.evaluate(() => document.documentElement.lang);
const h2 = await page.evaluate(() => document.querySelector("h2")?.textContent);
console.log("html lang:", htmlLang, "| first h2:", h2);

// toggle to English, reload, expect persisted
const [btn] = await page.$$("xpath/.//button[normalize-space()='English']");
await btn.click();
await wait(800);
await page.screenshot({ path: path.join(out, "lang-en.png") });
await page.reload({ waitUntil: "networkidle0" });
await wait(2500);
console.log("after reload lang:", await page.evaluate(() => document.documentElement.lang), "| stored:", await page.evaluate(() => localStorage.getItem("prime-tower-lang")));

// game (leave the page first so the hash navigation is a real load)
await page.goto("about:blank");
await page.goto(base + "/#clean", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
await wait(4500);
await page.screenshot({ path: path.join(out, "game-start.png") });
// direction check: pointer at the left of the facade, then the right
await page.mouse.move(640, 420);
await wait(900);
await page.screenshot({ path: path.join(out, "game-left.png") });
await page.mouse.move(820, 420);
await wait(900);
await page.screenshot({ path: path.join(out, "game-right.png") });
// sweep the pointer over the facade in rows
for (let row = 0; row < 6; row++) {
  const y = 250 + row * 70;
  for (let x = 420; x <= 1020; x += 40) {
    await page.mouse.move(x, y);
    await wait(25);
  }
}
await wait(800);
await page.screenshot({ path: path.join(out, "game-mid.png") });
const hud = await page.evaluate(() => document.body.innerText.match(/\d+%/)?.[0]);
console.log("progress:", hud);
await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

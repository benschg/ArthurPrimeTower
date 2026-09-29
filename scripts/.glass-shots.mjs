import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const out = process.argv[2];
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 1500)); });
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 180000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (label) => { const [b] = await page.$$(`xpath/.//button[normalize-space()='${label}' or @aria-label='${label}']`); if (!b) throw new Error("no button " + label); await b.click(); };
const shot = async (n) => { await wait(1500); await page.screenshot({ path: path.join(out, n + ".png") }); console.log("captured", n); };
await wait(4000);
await click("Rotate");
await page.mouse.move(2000, 2000);
await shot("1-day");
await page.mouse.move(720, 380);
for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -300 }); await wait(150); }
await page.mouse.move(2000, 2000);
await shot("2-day-close");
await click("Night");
await wait(3000);
await shot("3-night-close");
for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 300 }); await wait(150); }
await shot("4-night");
await click("Night");
await wait(2500);
await click("Explode");
await wait(2500);
await shot("5-explode");
await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

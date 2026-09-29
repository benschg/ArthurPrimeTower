// Close-ups of the exploded view (interiors) and the ground-floor entrances.
// Usage: node scripts/screenshot-explode.mjs [baseUrl] [outDir]
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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);
const click = async (label) => {
  const [btn] = await page.$$(`xpath/.//button[normalize-space()='${label}' or @aria-label='${label}']`);
  await btn.click();
};
await click("Rotate");

// entrances: the /#entrance deep link starts at street level in front of the main door
await page.goto("about:blank");
await page.goto(base + "/#entrance", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
await wait(3000);
await page.screenshot({ path: path.join(out, "entrance.png") });
await page.goto("about:blank");
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
await wait(2500);
await click("Rotate");

// exploded view, overall
await page.mouse.move(1200, 200);
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel({ deltaY: 350 });
  await wait(120);
}
await click("Explode");
await wait(2600);
await page.screenshot({ path: path.join(out, "explode-overview.png") });

// dock-style bulge: hover a floor in the exploded stack
await page.mouse.move(720, 470);
await wait(900);
await page.screenshot({ path: path.join(out, "explode-bulge.png") });
await page.mouse.move(1200, 200);
await wait(600);
// close-up on the middle floors: look from above, then zoom to the cursor on a floor
await page.mouse.move(720, 300);
await page.mouse.down();
await page.mouse.move(720, 120, { steps: 12 }); // drag up = camera rises, looking down
await page.mouse.up();
await wait(600);
await page.mouse.move(720, 430);
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel({ deltaY: -300 });
  await wait(120);
}
await wait(1200);
await page.screenshot({ path: path.join(out, "explode-closeup.png") });
await page.screenshot({ path: path.join(out, "explode-detail.png"), clip: { x: 420, y: 200, width: 600, height: 400 } });
// pull a floor out: leave explode, re-enable rotation, click a floor around mid-height;
// two frames a few seconds apart show the floor staying put while the tower keeps turning
await click("Explode");
await wait(2500);
await click("Rotate");
await page.mouse.move(720, 420);
await wait(300);
await page.mouse.click(720, 420);
await wait(3200);
await page.screenshot({ path: path.join(out, "pullout.png") });
await wait(5000);
await page.screenshot({ path: path.join(out, "pullout-later.png") });
// select another floor: the current one goes back in, then the new one comes out
await page.mouse.click(470, 250);
await wait(900);
await page.screenshot({ path: path.join(out, "switch-retracting.png") });
await wait(4200);
await page.screenshot({ path: path.join(out, "switch-done.png") });
await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

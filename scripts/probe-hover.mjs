// Sweeps the pointer down the exploded stack and reports which floor is hovered at each step.
// Seamless picking volumes mean no "none" readings while over the tower and no jitter between
// neighbouring floors. Usage: node scripts/probe-hover.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const base = process.argv[2] ?? "http://localhost:3000";
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
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
await page.goto(base, { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);

const click = async (label) => {
  const [b] = await page.$$(`xpath/.//button[normalize-space()='${label}' or @aria-label='${label}']`);
  await b.click();
};
await click("Rotate"); // stop the orbit so the sweep is repeatable
await click("Explode");
await wait(2800);

const readFloor = () =>
  page.evaluate(() => {
    const m = document.body.innerText.match(/FLOOR (\d+|G) OF/);
    return m ? m[1] : "none";
  });

const seq = [];
for (let y = 300; y <= 700; y += 10) {
  await page.mouse.move(720, y);
  await wait(70);
  seq.push({ y, floor: await readFloor() });
}
console.log(seq.map((s) => `${s.y}:${s.floor}`).join(" "));
const misses = seq.filter((s) => s.floor === "none").length;
let reversals = 0;
for (let i = 2; i < seq.length; i++) {
  const a = Number(seq[i - 2].floor);
  const b = Number(seq[i - 1].floor);
  const c = Number(seq[i].floor);
  if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && (b - a) * (c - b) < 0) reversals++;
}
console.log(`samples ${seq.length}, misses ${misses}, direction reversals ${reversals}`);
await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

// Plays the typing game headlessly: starts it from the "P", reads the round's characters,
// types them, makes a mistake, lets a round time out, then quits and checks the blinds return.
// Usage: node scripts/probe-typing.mjs [baseUrl] [outDir]
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

const before = await page.evaluate(() => window.primeTower.blinds.get(21, 10));
const shot = async (name) => {
  const t = Date.now();
  await page.screenshot({ path: path.join(out, name) });
  console.log(`shot ${name} took ${((Date.now() - t) / 1000).toFixed(1)}s (software GL)`);
};
const state = () =>
  page.evaluate(() => {
    const s = window.primeTower.typingState();
    return { round: s.round, chars: s.chars, typed: s.typed, score: s.score, streak: s.streak, mistakes: s.mistakes, timeLeft: +s.timeLeft.toFixed(1), over: s.over };
  });

const [p] = await page.$$("xpath/.//h1//button");
await p.click();
await wait(2600); // camera glides to the facade
const s0 = await state();
console.log("round 1:", JSON.stringify(s0));
await shot("typing-round1.png");

// Keys first, captures later: a screenshot costs real seconds here, and the round clock keeps running.
const wrong = s0.chars.includes("X") ? "Q" : "X";
await page.keyboard.press(wrong);
await wait(150);
const s1 = await state();
console.log("after a wrong key:", JSON.stringify({ mistakes: s1.mistakes, streak: s1.streak, timeLeft: s1.timeLeft }));
for (const k of s0.chars) {
  await page.keyboard.press(k);
  await wait(150);
}
const s2 = await state();
console.log("after typing the three:", JSON.stringify(s2), "(new chars:", s2.chars !== s0.chars, ")");
await shot("typing-round2.png");

// two of round 2's characters, then a capture with cleared slots and a burst
if (!s2.over) {
  await page.keyboard.press(s2.chars[0]);
  await wait(120);
  await page.keyboard.press(s2.chars[1]);
  await wait(200);
  console.log("mid round 2:", JSON.stringify(await state()));
  await shot("typing-two-typed.png");
}

// let the clock run out
await wait(11000);
const over = await page.evaluate(() => /Time's up/.test(document.body.innerText));
console.log("game over shown:", over, JSON.stringify(await state()));
await shot("typing-over.png");

// quit: blinds and style come back
await page.keyboard.press("Escape");
await wait(1500);
const after = await page.evaluate(() => window.primeTower.blinds.get(21, 10));
console.log("blind (21,10) before/after:", before.toFixed(3), after.toFixed(3), "restored:", Math.abs(before - after) < 1e-6);
await shot("typing-quit.png");

await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

// Plays the floor-13 game headlessly: opens /#pacman, checks the board, steers with the arrow
// keys (and checks the player moves the way the key points on screen), lets a bot eat dots
// while the ghosts come out of the lifts, then quits and checks the floor goes back.
// Usage: node scripts/probe-pacman.mjs [baseUrl] [outDir] [width] [height]
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
const tag = width < height ? "-portrait" : "";
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", `--window-size=${width},${height}`],
});
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.evaluateOnNewDocument(() => localStorage.setItem("prime-tower-lang", "en"));
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 300)));
await page.goto(base + "/#pacman", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  const t = Date.now();
  await page.screenshot({ path: path.join(out, name) });
  console.log(`shot ${name} took ${((Date.now() - t) / 1000).toFixed(1)}s (software GL)`);
};
const state = () =>
  page.evaluate(() => {
    const g = window.primeTower.pacman.game;
    if (!g) return null;
    const r = (v) => +v.toFixed(2);
    return {
      phase: g.phase,
      score: g.score,
      lives: g.lives,
      level: g.level,
      left: g.left,
      pac: [r(g.pac.x), r(g.pac.y)],
      ghosts: g.ghosts.map((h) => h.mode).join(","),
      basisX: g.basis.x.map(r),
      basisY: g.basis.y.map(r),
    };
  });
const waitFor = async (what, test, ms = 60000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await state();
    if (test(s)) return s;
    await wait(200);
  }
  console.log(`TIMEOUT waiting for ${what}:`, JSON.stringify(await state()));
  return state();
};

// the deep link pulls floor 13 out after 1.5 s; the game starts with it
const s0 = await waitFor("game start", (s) => s !== null);
console.log("started:", JSON.stringify(s0));
console.log(await page.evaluate(() => window.primeTower.pacman.text()));
await waitFor("play phase", (s) => s?.phase === "play");
await shot(`pacman-ready${tag}.png`);

// Arrow keys: whichever lane is open from the start cell, the key that points that way on
// screen must move the player along it.
const probe = await page.evaluate(() => {
  const g = window.primeTower.pacman.game;
  const m = g.maze;
  const lane = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.lane[y * m.w + x] === 1;
  const cx = Math.round(g.pac.x);
  const cy = Math.round(g.pac.y);
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ].filter(([dx, dy]) => lane(cx + dx, cy + dy));
  const [dx, dy] = dirs[0];
  // where that lane direction points on screen (x right, y up)
  const sx = dx * g.basis.x[0] + dy * g.basis.y[0];
  const sy = dx * g.basis.x[1] + dy * g.basis.y[1];
  const key = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? "ArrowRight" : "ArrowLeft") : sy > 0 ? "ArrowUp" : "ArrowDown";
  return { from: [cx, cy], dir: [dx, dy], screen: [+sx.toFixed(2), +sy.toFixed(2)], key };
});
const before = await state();
await page.keyboard.press(probe.key);
const moved = await waitFor("player to move", (s) => s && (s.pac[0] !== before.pac[0] || s.pac[1] !== before.pac[1]), 20000);
const went = [Math.sign(moved.pac[0] - before.pac[0]), Math.sign(moved.pac[1] - before.pac[1])];
console.log(`key ${probe.key} for lane dir ${probe.dir} (screen ${probe.screen}): moved ${went}, as steered: ${went[0] === probe.dir[0] && went[1] === probe.dir[1]}`);

// A bot takes over: at every cell it heads for the nearest dot, steering through the same
// screen-direction input the keys use.
await page.evaluate(() => {
  const P = window.primeTower.pacman;
  window.__bot = setInterval(() => {
    const g = P.game;
    if (!g || g.phase !== "play") return;
    const m = g.maze;
    const lane = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.lane[y * m.w + x] === 1;
    const cx = Math.round(g.pac.x);
    const cy = Math.round(g.pac.y);
    // breadth-first from the player to the nearest dot
    const seen = new Map([[cy * m.w + cx, null]]);
    let frontier = [[cx, cy, null]];
    let first = null;
    while (frontier.length && !first) {
      const next = [];
      for (const [x, y, step] of frontier) {
        if (g.pellets[y * m.w + x] && step) {
          first = step;
          break;
        }
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const k = (y + dy) * m.w + x + dx;
          if (!lane(x + dx, y + dy) || seen.has(k)) continue;
          seen.set(k, true);
          next.push([x + dx, y + dy, step ?? [dx, dy]]);
        }
      }
      frontier = next;
    }
    if (!first) return;
    P.steer(first[0] * g.basis.x[0] + first[1] * g.basis.y[0], first[0] * g.basis.x[1] + first[1] * g.basis.y[1]);
  }, 30);
});
const eating = await waitFor("dots eaten", (s) => s && s.score >= 150, 120000);
console.log("bot eating:", JSON.stringify(eating));
await shot(`pacman-play${tag}.png`);
const hunted = await waitFor("a ghost in the lanes", (s) => s && /hunt|fright/.test(s.ghosts), 120000);
console.log("ghosts out:", JSON.stringify(hunted));
await shot(`pacman-ghosts${tag}.png`);
const hud = await page.evaluate(() => /ghosts on 13/i.test(document.body.innerText));
console.log("HUD shown:", hud);

// Esc: the game ends and the floor goes back into the stack.
await page.evaluate(() => clearInterval(window.__bot));
await page.keyboard.press("Escape");
await wait(2500);
const after = await state();
const card = await page.evaluate(() => /ghosts on 13/i.test(document.body.innerText));
console.log("after Esc: game", after === null ? "stopped" : "STILL RUNNING", "| HUD gone:", !card);
await shot(`pacman-quit${tag}.png`);

await browser.close();
console.log(errors.length ? errors.join("\n") : "No page errors.");

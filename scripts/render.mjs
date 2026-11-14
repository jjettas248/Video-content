// Renders the reel to MP4, frame by frame, from a running app.
//   npm run build && npm start   (in one terminal)
//   npm run render               (in another)  ->  out/reel-12-closed-lost-money.mp4
// Needs ffmpeg on PATH and Playwright's Chromium (npx playwright install chromium).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const URL = process.env.REEL_URL ?? "http://localhost:3000/render";
const OUT = process.env.REEL_OUT ?? "out/reel-12-closed-lost-money.mp4";
const FPS = Number(process.env.REEL_FPS ?? 30);

mkdirSync("out", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction(() => window.__reel);
await page.evaluate(() => Promise.race([document.fonts.ready.then(() => true), new Promise((r) => setTimeout(r, 4000))]));
const duration = await page.evaluate(() => window.__reel.duration);
const frames = Math.round(duration * FPS);

const ff = spawn(
  "ffmpeg",
  ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", OUT],
  { stdio: ["pipe", "ignore", "inherit"] },
);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => void window.__reel.tl.time(t, false), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 90 === 0) console.log(`frame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("wrote", OUT);

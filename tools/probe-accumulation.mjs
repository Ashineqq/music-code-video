// Airtight accumulation test — two independent checks, both with no ambiguity. It DRIVES A BROWSER,
// so it is a debugging tool rather than part of the normal workflow.
//
//   bun tools/probe-accumulation.mjs http://localhost:5173/
//
//  CHECK 1 (seek only, never plays): render 7.32, wander to other times, come back, compare.
//          Any per-frame accumulation would show up as the return frame being dirtier.
//  CHECK 2 (playing): play for a while, then PAUSE VERIFIED (the clock must actually stop),
//          seek back to 7.32, compare against a fresh load at 7.32.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const dir = mkdtempSync(path.join(tmpdir(), 'pdoom-acc2-'));
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
const read = async () => ((await page.locator('#info').textContent()) ?? '').trim();
const tNow = async () => parseFloat(await read());
const shot = async (name) => {
  const f = path.join(dir, name);
  await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  return f;
};
const seek = async (v) => {
  await page.evaluate((x) => {
    const s = document.getElementById('scrub');
    s.value = String(x);
    s.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(900);
};
const diff = (a, b) => {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-i', a, '-i', b, '-lavfi', 'blend=all_mode=difference,signalstats,metadata=print:file=-', '-f', 'null', '-'], { encoding: 'utf8' });
  return +(out.match(/YAVG=([0-9.]+)/) ?? [])[1];
};
const pauseVerified = async () => {
  for (let i = 0; i < 8; i++) {
    const a = await tNow(); await page.waitForTimeout(700); const b = await tNow();
    if (Math.abs(a - b) < 0.001) return true;
    await page.keyboard.press(' ');   // space also toggles
    await page.waitForTimeout(400);
  }
  return false;
};

// ================= CHECK 1: seek-only, never plays
await page.goto(`${URL}?t=7.32`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const c1a = await shot('c1_a.png');
console.log(`CHECK 1  baseline @${await tNow()}`);
for (const v of [12.4, 25.1, 38.8, 47.2, 55.9]) { await seek(v); }
await seek(7.32);
const c1b = await shot('c1_b.png');
const d1 = diff(c1a, c1b);
console.log(`CHECK 1  after wandering the timeline and returning to 7.32: diff = ${d1} / 255  ->  ${d1 > 2 ? 'DIRTY (accumulates)' : 'clean'}`);

// ================= CHECK 2: play, verify pause, return
await page.goto(`${URL}?t=7.32`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const c2a = await shot('c2_a.png');
console.log(`\nCHECK 2  fresh baseline @${await tNow()}`);
await page.locator('#c').click();
await page.waitForTimeout(1000);
console.log(`         playing: ${await read()}`);
await page.waitForTimeout(20000);
const paused = await pauseVerified();
console.log(`         paused verified: ${paused}  (clock now frozen at ${await tNow()})`);
await seek(7.32);
await page.waitForTimeout(1200);
const c2b = await shot('c2_b.png');
const d2 = diff(c2a, c2b);
console.log(`CHECK 2  same 7.32 after ~20 s of playback: diff = ${d2} / 255  ->  ${d2 > 2 ? 'DIRTY (accumulates)' : 'clean'}`);

console.log(`\nerrors: ${errs.length ? errs.join(' | ') : 'none'}`);
console.log(`captures in ${dir}`);
await browser.close();

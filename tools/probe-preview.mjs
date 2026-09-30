// Reliable probe. Two things:
//  1. does the preview start where it should (read the HUD line, not a guess)?
//  2. with t HELD FIXED, are successive frames identical? Screenshots (not readPixels — the app's
//     context has no preserveDrawingBuffer, so readPixels on it is unreliable) diffed pixel by pixel.
//
//   bun tools/probe-preview.mjs http://localhost:5210/         (no ?t= -> should start at 0)
//   bun tools/probe-preview.mjs "http://localhost:5210/?t=7.32"
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:5210/';
const dir = mkdtempSync(path.join(tmpdir(), 'pdoom-probe-'));

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(`[console] ${m.text()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);   // let it boot, load fonts, and settle

// ---- 1. what time does it report, and is it advancing on its own?
const read = async () => (await page.locator('#info').textContent()) ?? '';
const t0 = await read();
await page.waitForTimeout(1200);
const t1 = await read();
console.log(`URL: ${URL}`);
console.log(`  HUD now:  ${t0.trim()}`);
console.log(`  HUD +1.2s: ${t1.trim()}`);

// ---- 2. hold t still and diff successive screenshots
const shots = [];
for (let i = 0; i < 4; i++) {
  const f = path.join(dir, `s${i}.png`);
  await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  shots.push(f);
  await page.waitForTimeout(900);
}
console.log('\n  frame-to-frame difference with t held fixed:');
for (let i = 1; i < shots.length; i++) {
  let mad = '?';
  try {
    const out = execFileSync('ffmpeg', ['-v', 'error', '-i', shots[i - 1], '-i', shots[i],
      '-lavfi', 'blend=all_mode=difference,signalstats,metadata=print:file=-', '-f', 'null', '-'],
      { encoding: 'utf8' });
    mad = (out.match(/YAVG=([0-9.]+)/) ?? [])[1] ?? '?';
  } catch (e) { mad = 'err'; }
  console.log(`    s${i - 1} vs s${i}: mean abs diff = ${mad} / 255`);
}

// ---- 3. now let it play and see whether the picture piles up
await page.locator('#c').click();   // canvas click toggles play
await page.waitForTimeout(2500);
const fA = path.join(dir, 'play.png');
await page.screenshot({ path: fA, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
console.log(`\n  playing: ${(await read()).trim()}`);
console.log(`  (playing capture: ${fA})`);

console.log(`\n  page errors (${errs.length}):`);
for (const e of [...new Set(errs)].slice(0, 10)) console.log('    ' + e);
console.log(`\n  screenshots kept in ${dir}`);
await browser.close();

#!/usr/bin/env node
// Static gate for the films in this repo. No browser, no renderer: it reads the same JSON the film
// reads, rebuilds that film's edit table with the same maths as its timeline.ts, and — for the
// hand-drawn film — inspects the plate sources for the cel rules.
//
//   node tools/check-plates.mjs [--film handdrawn|pdoom]     (default handdrawn; errors fail the run)
//
// What it proves, for either film:
//   * the edit table covers 0 → audio duration with no gap, overlap or dangling scene file;
//   * every lyric line that starts inside a plate's window is queried by that plate (a dropped
//     line is otherwise invisible until someone watches the whole film);
// and, for the hand-drawn film only (the cel rules are its own):
//   * every plate is an InkedScene with a draw() (the hand-drawn layer's contract);
//   * the hand-drawn rules hold textually: no glow-era imports, no additive blending, no
//     Math.random / Date.now / performance.now (the film must be a pure function of time), and no
//     colour outside the cel palette in _ink.ts.
//
// What it does NOT prove: that a plate looks right. Composition, timing and drawing quality are the
// eye's job — this gate only catches the mistakes that are cheaper to find in the source.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const FILM = arg('film', 'handdrawn');
/** The cel rules (InkedScene, flat fills, the palette) are the hand-drawn film's; the rest is common. */
const CEL = FILM === 'handdrawn';
const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');
const FILM_DIR = `app/src/films/${FILM}`;
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ------------------------------------------------------------------ the data the film reads
// ------------------------------------------------------------------ the data the film reads
// Each film keeps its own data folder (they may diverge; today both hold the same song).
const lyrics = readJSON(`data/${FILM}/lyrics.json`);
const audio = readJSON(`data/${FILM}/audio.json`);
const lines = lyrics.lines;

const fold = (s) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
/** Same semantics as Lyrics.get(): first line whose folded text contains the query. */
const findLine = (q, nth = 0) => {
  const hits = lines.filter((l) => fold(l.text).includes(fold(q)));
  if (!hits[nth]) throw new Error(`lyric not found: ${q}${nth ? ` (nth ${nth})` : ''}`);
  return hits[nth];
};
/** Same maths as AudioData: continuous beat index, and the time of a beat index. */
const beats = audio.beats;
const beatAt = (t) => {
  const b = beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  if (t >= b[b.length - 1]) return b.length - 1 + (t - b[b.length - 1]) / (b[b.length - 1] - b[b.length - 2]);
  let lo = 0, hi = b.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
  return lo + (t - b[lo]) / (b[hi] - b[lo]);
};
const timeOfBeat = (i) => {
  const b = beats, n = b.length;
  const period = (b[n - 1] - b[0]) / (n - 1);
  if (i <= 0) return b[0] + i * period;
  if (i >= n - 1) return b[n - 1] + (i - (n - 1)) * period;
  const k = Math.floor(i);
  return b[k] + (b[k + 1] - b[k]) * (i - k);
};

// ------------------------------------------------------------------ rebuild the edit table from timeline.ts
const timelineSrc = read(`${FILM_DIR}/timeline.ts`);
const cut = (q, nth = 0, tol = 0.02) => {
  const s = findLine(q, nth).words[0].start;
  return timeOfBeat(Math.floor(beatAt(s + tol)));
};
/**
 * Same maths as the film's `after`: the one boundary helper that differs between the two films. The
 * hand-drawn film cuts on the first beat at/after a line's last word; the code-rendered film took the
 * downbeat nearest the line's end.
 */
const after = CEL
  ? (q, nth = 0) => {
      const w = findLine(q, nth).words;
      return timeOfBeat(Math.ceil(beatAt(w[w.length - 1].end + 0.02)));
    }
  : (q, nth = 0) => {
      const e = findLine(q, nth).end;
      const d = audio.downbeats;
      return d.reduce((b, x) => (Math.abs(x - e) < Math.abs(b - e) ? x : b), d[0] ?? e);
    };
/** The downbeat nearest t — same as the timeline's helper of the same name. */
const nearDown = (t) => audio.downbeats.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), audio.downbeats[0] ?? t);
const sectionStart = (name, fallback) => {
  const s = audio.sections.find((x) => x.name === name);
  return s ? s.start : fallback;
};

// `const b = { ... }` — the boundary table. The expressions are evaluated by hand: keep this in step
// with timeline.ts if a boundary is ever written in a new shape.
const bBlock = /const b = \{([\s\S]*?)\n  \};/.exec(timelineSrc);
if (!bBlock) err('timeline.ts: cannot find the `const b = { … }` boundary table');
const B = {};
// a query may be quoted either way (double quotes when it contains an apostrophe, e.g. "I'm upping")
const Q = `(?:(?:'([^']*)')|(?:"([^"]*)"))`;
const oneBoundary = (e) => {
    e = e.trim();
    let m;
    if (/^\d+(?:\.\d+)?$/.test(e)) return +e;
    if ((m = new RegExp(`^cut\\(\\s*${Q}\\s*(?:,\\s*(\\d+))?\\s*(?:,\\s*([\\d.]+))?\\s*\\)$`).exec(e)))
      return cut(m[1] ?? m[2], m[3] ? +m[3] : 0, m[4] ? +m[4] : 0.02);
    if ((m = new RegExp(`^after\\(\\s*${Q}\\s*(?:,\\s*(\\d+))?\\s*\\)$`).exec(e)))
      return after(m[1] ?? m[2], m[3] ? +m[3] : 0);
    // the outro boundary: the analysis's section start, with the film's own guess as a fallback
    // (anchored: the same shape may sit inside a Math.max, which is checked below)
    if ((m = /^au\.sections\.find\(.*name === '([^']+)'.*\)\?\.start \?\? (.+)$/.exec(e)))
      return sectionStart(m[1], oneBoundary(m[2]));
    if (/^au\.duration$/.test(e)) return audio.duration;
    if ((m = /^Math\.max\((.+)\)$/.exec(e))) return Math.max(...splitArgs(m[1]).map(oneBoundary));
    // boundaries taken from the music where nothing is sung: the downbeat nearest t, and the midpoint
    // of two boundaries snapped to one (how a wordless stretch gets split in two)
    if ((m = /^nearDown\((.+)\)$/.exec(e))) return nearDown(oneBoundary(m[1]));
    if ((m = /^mid\((.+)\)$/.exec(e))) { const v = splitArgs(m[1]).map(oneBoundary); return nearDown((v[0] + v[1]) / 2); }
    if ((m = /^(?:b\.)?([A-Za-z0-9_]+)$/.exec(e)) && Number.isFinite(B[m[1]])) return B[m[1]];
    throw new Error(`cannot evaluate: ${e}`);
};
const evalBoundary = (key, expr) => {
  try { B[key] = oneBoundary(expr); } catch (e) { err(`timeline.ts: ${e.message}`); }
};
/** Evaluate an entry's start/end expression (they may be a boundary name or a call like mid(...)). */
const evalExpr = (x) => { try { return oneBoundary(x.trim()); } catch { err(`timeline.ts: cannot evaluate entry bound '${x}'`); return NaN; } };
/** Split a call's argument list on top-level commas. */
const splitArgs = (s) => {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
};
for (const line of (bBlock?.[1] ?? '').split('\n')) {
  const m = /^\s*([A-Za-z0-9_]+):\s*(.+?),?\s*(?:\/\/.*)?$/.exec(line);
  if (!m) continue;
  evalBoundary(m[1], m[2]);
}
// derived boundaries: `const drop1 = mid(b.nights1, b.thunder);` — evaluated after the table so they
// can refer to it (and to each other)
for (const m of timelineSrc.matchAll(/^\s*const\s+([A-Za-z0-9_]+)\s*=\s*(mid|nearDown)\((.+?)\);\s*$/gm)) {
  evalBoundary(m[1], `${m[2]}(${m[3]})`);
}

// `E('id', 'file', start, end, { … })?` entries
const entries = [];
const entryRe = /\bE\(\s*'([^']+)',\s*'([^']+)',\s*([A-Za-z0-9_.]+|\d+(?:\.\d+)?),\s*([A-Za-z0-9_.]+|\d+(?:\.\d+)?)/g;
let em;
while ((em = entryRe.exec(timelineSrc))) {
  const [, id, file, sExpr, eExpr] = em;
  const val = (x) => (/^\d/.test(x) ? +x : (x in B ? B[x] : B[x.replace(/^b\./, '')] ?? evalExpr(x)));
  const start = val(sExpr), end = val(eExpr);
  const params = new RegExp(`E\\('${id}',[^)]*params:\\s*\\{([^}]*)\\}`).exec(timelineSrc)?.[1];
  entries.push({ id, file, start, end, params: params?.trim() ?? '' });
}
if (entries.length === 0) err('timeline.ts: no timeline entries found (parser out of date?)');

// coverage, order, contiguity
entries.sort((a, b) => a.start - b.start);
entries.forEach((e, i) => {
  if (!Number.isFinite(e.start) || !Number.isFinite(e.end)) { err(`${e.id}: non-finite window`); return; }
  if (e.end <= e.start) err(`${e.id}: empty window (${e.start} → ${e.end})`);
  const prev = entries[i - 1];
  if (prev && Math.abs(prev.end - e.start) > 1e-6) {
    const gap = e.start - prev.end;
    err(`${prev.id} → ${e.id}: ${gap > 0 ? 'gap' : 'overlap'} of ${Math.abs(gap).toFixed(3)} s`);
  }
});
if (entries.length) {
  if (Math.abs(entries[0].start) > 1e-6) err(`timeline starts at ${entries[0].start}, not 0`);
  const last = entries[entries.length - 1];
  if (Math.abs(last.end - audio.duration) > 0.02) err(`timeline ends at ${last.end}, audio is ${audio.duration} s`);
}
const ids = new Set();
for (const e of entries) { if (ids.has(e.id)) err(`duplicate timeline id '${e.id}'`); ids.add(e.id); }

// ------------------------------------------------------------------ the film's plates
const scenesDir = path.join(APP, 'src/films', FILM, 'scenes');
if (!existsSync(scenesDir)) err(`${FILM_DIR}/scenes/ is missing`);
const sceneFiles = existsSync(scenesDir)
  ? readdirSync(scenesDir).filter((f) => f.endsWith('.ts') && !f.startsWith('_'))
  : [];

const sceneSrc = {};
for (const f of sceneFiles) sceneSrc[f] = readFileSync(path.join(scenesDir, f), 'utf8');

/**
 * Every string literal in a plate that could be a lyric query. Deliberately broad (not just the
 * argument of lyrics.get): a plate may keep its lines in a table (`TEXT: Record<Variant, string>`)
 * and look them up by variant, and one module can serve several timeline entries.
 */
const queriesOf = (src) =>
  [...src.matchAll(/'([^'\\\n]{6,})'|"([^"\\\n]{6,})"/g)].map((m) => m[1] ?? m[2]);

if (CEL) {
  // ---------------------------------------------------------------- the cel palette (from _ink.ts)
  const inkSrc = read(`${FILM_DIR}/scenes/_ink.ts`);
  const palette = {};
  for (const m of inkSrc.matchAll(/^\s*([A-Za-z0-9_]+):\s*'(#[0-9A-Fa-f]{6})'/gm)) palette[m[1]] = m[2].toUpperCase();
  if (!Object.keys(palette).length) err('_ink.ts: cannot find the HEX palette');
  const paletteVals = new Set(Object.values(palette));

  // ---------------------------------------------------------------- the cel rules, per plate
  for (const f of sceneFiles) {
    const src = sceneSrc[f];
    // contract
    if (!/from '\.\/_ink'/.test(src)) err(`scenes/${f}: does not import the hand-drawn layer './_ink'`);
    if (!/extends InkedScene/.test(src)) err(`scenes/${f}: default class does not extend InkedScene`);
    if (!/export default class/.test(src)) err(`scenes/${f}: no default-exported scene class`);
    if (!/\bdraw\s*\(/.test(src)) err(`scenes/${f}: no draw() method`);
    // glow era
    if (/from '(?:\.\.\/)+engine\/lines'|from '\.\/_motifs'/.test(src)) err(`scenes/${f}: imports the glow-era line/motif module`);
    if (/blend:\s*'add'/.test(src)) err(`scenes/${f}: additive blending (the cel look is flat)`);
    if (/LineBatch|glow\(/.test(src)) err(`scenes/${f}: uses the glow-era LineBatch`);
    // determinism
    if (/Math\.random|Date\.now|performance\.now/.test(src)) err(`scenes/${f}: non-deterministic source of time/randomness`);
    // palette
    for (const m of src.matchAll(/#[0-9A-Fa-f]{6}/g)) {
      const c = m[0].toUpperCase();
      if (!paletteVals.has(c)) warn(`scenes/${f}: colour ${m[0]} is not in the cel palette (line ${src.slice(0, m.index).split('\n').length})`);
    }
  }
}

// per-plate lyric coverage: every line that STARTS inside a window must be queried by that plate
for (const e of entries) {
  const src = sceneSrc[`${e.file}.ts`];
  if (!src) { err(`${e.id}: scene file ${FILM_DIR}/scenes/${e.file}.ts is missing`); continue; }
  const qs = queriesOf(src).map((q) => fold(q));
  const own = lines.filter((l) => l.start >= e.start - 0.02 && l.start < e.end);
  for (const l of own) {
    // a line that starts within 0.25 s of the cut is the next plate's (the cut is snapped to the beat)
    if (l.start > e.end - 0.25) continue;
    const hit = qs.some((q) => fold(l.text).includes(q));
    if (!hit) warn(`${e.id} (${e.start.toFixed(2)}–${e.end.toFixed(2)}): lyric "…${l.text.slice(-38)}" (${l.start.toFixed(2)} s) is never queried by scenes/${e.file}.ts`);
  }
  if (!CEL) continue;
  const hasWords = own.some((l) => l.start <= e.end - 0.25);
  if (hasWords && !/\bwordProgress\b/.test(src)) err(`${e.id}: scenes/${e.file}.ts never uses Lyrics.wordProgress (no per-word sync)`);
}

// ------------------------------------------------------------------ assets the films read at runtime
const need = [`audio/${FILM}.mp3`, `data/${FILM}/lyrics.json`, `data/${FILM}/audio.json`];
for (const p of need) if (!existsSync(path.join(ROOT, p))) err(`missing asset: ${p}`);

// ------------------------------------------------------------------ fonts: one folder per owner
// A face lives in `fonts/common/` (every film loads it) or `fonts/<film>/` (only that film does):
// the first path segment is the owner, and the engine loads by that rule. This checks the folder
// against it, so a move that leaves a stray face or a dangling path fails here instead of the app
// quietly falling back to a default font. `src/` subfolders are the instancer's inputs, not faces.
const fontsDir = path.join(APP, 'public/fonts');
const faceFiles = (dir) =>
  !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'src' ? [] : faceFiles(path.join(dir, e.name))) : (/\.(ttf|svg)$/i.test(e.name) ? [`${path.relative(fontsDir, dir)}/${e.name}`.replace(/^\.\//, '')] : []));
const owners = existsSync(fontsDir) ? readdirSync(fontsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
for (const o of owners) {
  if (o !== 'common' && !existsSync(path.join(APP, 'src/films', o))) err(`app/public/fonts/${o}/: not 'common' and not a film in app/src/films/ — nothing would ever load it`);
}
const commonFaces = faceFiles(path.join(fontsDir, 'common'));
const ownByFilm = owners.filter((o) => o !== 'common').map((o) => [o, faceFiles(path.join(fontsDir, o))]);
for (const [o, files] of ownByFilm) if (!files.length) warn(`app/public/fonts/${o}/: no faces in it`);
const ownFaces = ownByFilm.flatMap(([, files]) => files);
const myFaces = ownByFilm.find(([o]) => o === FILM)?.[1] ?? [];
for (const m of read('app/src/engine/stroke.ts').matchAll(/'([A-Za-z0-9_]+\.svg)'/g)) {
  const p = `app/public/fonts/common/stroke/${m[1]}`;
  if (!existsSync(path.join(ROOT, p))) err(`missing stroke font: ${p}`);
}
// one shared set of stills: the code-rendered film's outro rewinds through them (plates/figNN.jpg).
// The hand-drawn film draws its own flip-book and reads none of them.
const platesDir = path.join(APP, 'public/plates');
const plateJpgs = existsSync(platesDir) ? readdirSync(platesDir).filter((f) => /\.jpe?g$/.test(f)) : [];
if (plateJpgs.length && CEL) {
  const consumed = Object.values(sceneSrc).some((s) => /plates\//.test(s));
  if (consumed) warn('app/public/plates/: the hand-drawn film reads stills that belong to the other film');
}
const figStills = plateJpgs.filter((f) => /^fig\d+\.jpe?g$/.test(f)).length;

// Each film carries its own copy of the song data and the two are free to diverge, so this is a note
// rather than a check: it just says whether the two films are still cutting on the same alignment.
const other = FILM === 'pdoom' ? 'handdrawn' : 'pdoom';
const drift = ['lyrics.json', 'audio.json'].filter((f) => {
  const a = path.join(ROOT, 'data', FILM, f), b = path.join(ROOT, 'data', other, f);
  return existsSync(a) && existsSync(b) && readFileSync(a, 'utf8') !== readFileSync(b, 'utf8');
});

// ------------------------------------------------------------------ report
const w = (s) => process.stdout.write(s);
w(`\n${FILM} · static gate\n`);
w(`  ${entries.length} plates, ${(entries[entries.length - 1]?.end ?? 0).toFixed(2)} s, ${lines.length} lyric lines` +
  `, ${figStills} shared stills\n`);
w(`  data/${FILM}/ · ${drift.length ? `differs from data/${other}/ in ${drift.join(', ')}` : `same song data as data/${other}/`}\n`);
w(`  fonts · ${commonFaces.length} shared (fonts/common/) + ${myFaces.length} of its own` +
  `${ownFaces.length - myFaces.length ? `, ${ownFaces.length - myFaces.length} belonging to other films` : ''}\n`);
if (warnings.length) {
  w(`\n${warnings.length} warning${warnings.length > 1 ? 's' : ''}:\n`);
  for (const m of warnings) w(`  ! ${m}\n`);
}
if (errors.length) {
  w(`\n${errors.length} error${errors.length > 1 ? 's' : ''}:\n`);
  for (const m of errors) w(`  ✗ ${m}\n`);
  w('\nFAIL\n');
  process.exit(1);
}
w(`\nOK — ${warnings.length ? `with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : 'clean'}\n`);

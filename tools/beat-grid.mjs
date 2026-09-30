#!/usr/bin/env bun
// A constant-tempo beat grid from an audio file, in the shape the engine reads (`data/<film>/audio.json`).
//
//   bun tools/beat-grid.mjs audio/<song>.mp3 [--lrc <song>.lrc] [--out data/<film>/audio.json]
//                           [--bpm 126] [--offset 0.12] [--gap 6]
//
// What it does: decode the audio with ffmpeg (mono, 22 kHz), take the kick band (a one-pole low-pass),
// build a 100 fps onset envelope from its rises, autocorrelate it for the beat period, then pick the
// phase the onsets agree with and the bar phase the lyric lines agree with. Sections are cut where the
// lyric lines leave a gap longer than `--gap` and snapped to downbeats.
//
// This is the **cheap tier** of the data layer, and it says so in the file it writes: a constant grid
// with no onsets, no envelopes, and a bar phase inferred from the lyrics rather than from the music.
// `analysis/analyze.py` is the real thing (Demucs stems → kit onsets, per-stem envelopes, sections
// from the chord changes); when it has run, its `audio.json` replaces this one.
//
// `--bpm`/`--offset` skip the estimation and use the numbers you give (a tap-tempo or a DAW reading is
// better than a guess that lands a beat early).
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const SR = 22000, FPS = 100; // 22000 / 100 = 220 samples per frame, so a frame is exactly 10 ms

// ------------------------------------------------------------------ decode + onset envelope
function pcm(file) {
  const p = Bun.spawnSync(['ffmpeg', '-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SR), '-']);
  if (p.exitCode !== 0 || p.stdout.length === 0) throw new Error(`ffmpeg could not decode ${file}: ${p.stderr.toString().slice(0, 300)}`);
  const s = new Int16Array(p.stdout.buffer, p.stdout.byteOffset, Math.floor(p.stdout.length / 2));
  return s;
}

/** Kick-band energy per 10 ms frame: one-pole low-pass at ~110 Hz, then the frame's RMS. */
function lowBand(s) {
  const a = 1 - Math.exp((-2 * Math.PI * 110) / SR);
  const hop = SR / FPS;
  const n = Math.floor(s.length / hop);
  const e = new Float32Array(n);
  let y = 0;
  for (let f = 0; f < n; f++) {
    let sum = 0;
    const s0 = Math.round(f * hop), s1 = Math.round((f + 1) * hop);
    for (let i = s0; i < s1; i++) { y += a * (s[i] / 32768 - y); sum += y * y; }
    e[f] = Math.sqrt(sum / (s1 - s0));
  }
  return e;
}

/** Half-wave-rectified rise of the band energy: what a kick looks like in this signal. */
function onsets(e) {
  const o = new Float32Array(e.length);
  for (let i = 1; i < e.length; i++) o[i] = Math.max(0, e[i] - e[i - 1]);
  // 3-frame moving average keeps the autocorrelation from favouring one-frame spikes
  const s = new Float32Array(o.length);
  for (let i = 0; i < o.length; i++) s[i] = (o[Math.max(0, i - 1)] + o[i] + o[Math.min(o.length - 1, i + 1)]) / 3;
  return s;
}

/** Mean product at a lag (divided by the number of terms, so short lags are not favoured). */
const corr = (o, lag) => { let s = 0; for (let i = lag; i < o.length; i++) s += o[i] * o[i - lag]; return s / (o.length - lag); };

/** Period (in frames) that maximizes the autocorrelation in [60, 200] BPM, with its runners-up. */
function period(o) {
  const lo = (FPS * 60) / 200, hi = (FPS * 60) / 60;
  const top = [];
  for (let lag = Math.ceil(lo); lag <= hi; lag++) top.push({ lag, s: corr(o, lag) });
  top.sort((a, b) => b.s - a.s);
  let best = top[0].lag;
  // Dance tracks tap at the four-on-the-floor: if twice the period scores nearly as well, the real beat
  // is the shorter one (autocorrelation peaks at every multiple of the beat, and the tallest is often 2×).
  const half = best / 2;
  if (half >= lo && corr(o, Math.round(half)) > top[0].s * 0.9) best = Math.round(half);
  return { lag: best, top: top.slice(0, 4) };
}

/** Phase whose grid lines sit on the most onset energy. */
function phase(o, P) {
  let best = 0, bestScore = -1;
  for (let ph = 0; ph < P; ph += 0.25) {
    let s = 0;
    for (let x = ph; x < o.length; x += P) { const i = Math.round(x); s += o[i] + o[i + 1] * 0.5 + o[i - 1] * 0.5; }
    if (s > bestScore) { bestScore = s; best = ph; }
  }
  return best;
}

/**
 * The coarse period is only good to a percent, and a percent of three minutes is seconds of drift. So
 * refine (tempo, phase) together around it: for each candidate tempo, histogram the onset energy by
 * phase and keep the bin that collects the most. The right tempo piles the energy into one bin; a wrong
 * one smears it.
 */
function refine(o, bpm0) {
  let best = { bpm: bpm0, ph: phase(o, FPS * (60 / bpm0)), score: -1 };
  const K = 64;
  for (let bpm = bpm0 * 0.96; bpm <= bpm0 * 1.04; bpm += 0.005) {
    const P = (FPS * 60) / bpm;
    const acc = new Float64Array(K);
    for (let i = 0; i < o.length; i++) acc[Math.round(((i % P) / P) * K) % K] += o[i];
    let k = 0;
    for (let j = 1; j < K; j++) if (acc[j] > acc[k]) k = j;
    if (acc[k] > best.score) best = { bpm, ph: (k / K) * P, score: acc[k] };
  }
  return best;
}

/** Beats against the gaps between them: ~1 means the grid is not tracking anything. */
function contrast(o, P, ph) {
  let on = 0, onN = 0, off = 0, offN = 0;
  for (let x = ph; x < o.length; x += P) {
    const i = Math.round(x), m = Math.round(x + P / 2);
    if (i < o.length) { on += o[i]; onN++; }
    if (m < o.length) { off += o[m]; offN++; }
  }
  return (on / onN) / (off / offN || 1);
}

// ------------------------------------------------------------------ run
const src = process.argv[2];
if (!src || src.startsWith('--')) {
  console.error('usage: bun tools/beat-grid.mjs <audio> [--lrc <song>.lrc] [--out data/<film>/audio.json] [--bpm N] [--offset S] [--gap 6]');
  process.exit(2);
}
const srcd = pcm(src);
const duration = srcd.length / SR;
const env = onsets(lowBand(srcd));

const givenBpm = +arg('bpm', '0');
const est = givenBpm > 0 ? { lag: Math.round(FPS * (60 / givenBpm)), top: [] } : period(env);
// refine tempo and phase together; with --bpm only the phase is estimated (unless --offset says otherwise)
const ref = arg('bpm') || arg('offset') ? { bpm: givenBpm > 0 ? givenBpm : (FPS * 60) / est.lag, ph: 0 } : refine(env, (FPS * 60) / est.lag);
const bpm = ref.bpm;
const P = FPS * (60 / bpm);
const ph = arg('offset') ? +arg('offset') * FPS : ref.ph;

// beats, and a beat before 0 so an entry starting at 0 has a grid line to snap to
const beats = [];
for (let x = ph; x < env.length; x += P) beats.push(+(x / FPS).toFixed(4));
if (beats[0] > 0.01) beats.unshift(+(beats[0] - 60 / bpm).toFixed(4));

// bar phase: the offset that puts the most lyric line starts on a downbeat
let lrcLines = [];
const lrcPath = arg('lrc');
if (lrcPath && existsSync(lrcPath)) {
  const text = await Bun.file(lrcPath).text();
  lrcLines = [...text.matchAll(/^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/gm)]
    .map((m) => +m[1] * 60 + +m[2] + (m[3] ? +`0.${m[3]}` : 0)).sort((a, b) => a - b);
}
const downbeatOffset = (() => {
  if (beats.length < 8) return 0;
  let best = 0, bestScore = Infinity;
  for (let k = 0; k < 4; k++) {
    const db = beats.filter((_, i) => (i - k) % 4 === 0);
    if (!db.length) continue;
    const err = lrcLines.reduce((a, t) => a + Math.min(...db.map((d) => Math.abs(d - t))), 0) / (lrcLines.length || 1);
    if (err < bestScore) { bestScore = err; best = k; }
  }
  return { k: best, err: +bestScore.toFixed(3) };
})();
const downbeats = beats.filter((_, i) => (i - downbeatOffset.k) % 4 === 0).filter((b) => b >= -0.001);

// sections: cut where the lyric lines leave a gap, snapped to a downbeat
const gap = +arg('gap', '6');
const cuts = [0];
for (let i = 1; i < lrcLines.length; i++) if (lrcLines[i] - lrcLines[i - 1] > gap) cuts.push(lrcLines[i - 1] + gap / 2);
cuts.push(duration);
const snap = (t) => downbeats.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), downbeats[0] ?? 0);
const sections = cuts.slice(0, -1).map((t, i) => ({
  name: i === 0 && t === 0 ? 'intro' : `part${i + 1}`,
  start: i === 0 ? 0 : +Math.max(0, snap(t)).toFixed(3),
  end: +Math.min(duration, i + 1 < cuts.length ? snap(cuts[i + 1]) : duration).toFixed(3),
}));

const out = {
  duration: +duration.toFixed(3),
  bpm: +bpm.toFixed(3),
  fps: FPS,
  beat_period: +(60 / bpm).toFixed(5),
  time_signature: 4,
  beats,
  downbeats,
  sections,
  features: {},
  onsets: { kick: [], snare: [], hat: [], vocal: [] },
  notes: 'constant-tempo grid: kick-band onset autocorrelation for the period, lyric lines for the bar phase; no per-stem onsets or envelopes (analysis/analyze.py is that tier)',
};
const OUTP = path.resolve(arg('out', path.join('data', 'audio.json')));
mkdirSync(path.dirname(OUTP), { recursive: true });
writeFileSync(OUTP, JSON.stringify(out) + '\n');

console.log(`bpm ${bpm.toFixed(3)} (period ${(60 / bpm).toFixed(4)} s, ${givenBpm ? 'given' : 'estimated from the kick band'})`);
if (est.top.length) console.log('  autocorrelation peaks: ' + est.top.map((t) => `${t.lag}f=${(FPS * 60 / t.lag).toFixed(1)}bpm (${t.s.toExponential(2)})`).join(', '));
console.log(`beats ${beats.length} · downbeats ${downbeats.length} · bar phase ${downbeatOffset.k} (lyric lines sit ${downbeatOffset.err} s off a downbeat on average)`);
console.log(`  grid check: beat onsets are ${contrast(env, P, ph).toFixed(2)}× the gaps between them (≥1.5 is tracking, ~1 is not)`);
console.log(`sections ${sections.length}: ` + sections.map((s) => `${s.name} ${s.start}–${s.end}`).join(' · '));
console.log(`first beats ${beats.slice(0, 6).join(', ')} → written to ${OUTP}`);

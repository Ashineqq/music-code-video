// Plate 7 — "We had a stable training run, / But now the singularity's begun / And you're optimizing,
// accelerating, / I feel my atoms rearranging"   (38.42 → 52.51 s)
//
// Four drawings, four hard cuts — the vanishing point moves and the framing changes with `setCam`, so
// it reads as four separate sheets rather than one long move:
//
//   I  STABLE RUN    a hand-ruled oscilloscope. The pen re-draws the trace from the left every two
//                    beats and the sweeps it leaves behind stay on the paper as fainter ghosts. The
//                    lyric is written along the curve, so the pen is writing the word as it is sung.
//   II SINGULARITY   the trace snaps off like an old TV — squashed to a line inside a wobbly
//                    rectangle — and on "now" the paper itself is punched through: an ink hole with a
//                    torn, hatched rim, and the graticule rings redraw themselves smaller and rotated
//                    into a vortex. The words are pulled off the line and spiral in, stretching as
//                    they go.
//   III ACCELERATING the vortex becomes a corkscrew: long smooth streamlines sweep down and around,
//                    the pitch tightening as the line accelerates, and the words are written along
//                    the streamlines.
//   IV ATOMS         the lyric is stippled out as one small dot per letter; the dots detach and land
//                    in the exact positions of a large paperclip, inked as one unbroken line.
//
// Hand-drawn rules (see _ink.ts): every wobble and every breathing position is seeded by the drawing
// index `s.d`, never by raw time, so the export's motion-blur sub-frames never smear a drawing.
//
// The plate's last word ("rearranging", 51.38 → 52.825 s) is still being sung where the window ends
// at 52.508, so its karaoke finishes in the next plate's first frames — the edit lets a word ring over
// a cut, and the word is never started early to compensate. Nothing here waits on it: the paperclip's
// inking is timed off B3 rather than off the words, so it is complete at 51.90 s and holds for the
// window's last 0.6 s while the final word's dots are still in flight.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, TAU, type V2, type InkOpts } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import { polylineLengths, pointAtLength } from '../../../engine/util';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- geometry & edit
const GX0 = 300, GX1 = 1620, GY = 520, GH = 250;   // the graticule
const B0 = 38.42, B1 = 41.34, B2 = 45.06, B3 = 49.56;  // movement boundaries (song seconds)
const SWEEP = 0.909;                                // one sweep = two beats at 132 bpm
const HOLE = { x: 1262, y: 428 };                   // where the paper is punched through

const ss = (a: number, b: number, x: number) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
type Cam = { cx: number; cy: number; z: number; roll: number };
const CAMS: Cam[] = [
  { cx: 960, cy: 534, z: 1.01, roll: 0.0 },      // I    the chart, square on
  { cx: 1150, cy: 528, z: 1.07, roll: 0.016 },   // II   hole punched right of centre, closer in
  { cx: 944, cy: 498, z: 0.95, roll: -0.025 },   // III  pulled back, the screw leans
  { cx: 1000, cy: 545, z: 1.05, roll: 0.012 },   // IV   tight on the clip
];

/** A wobbly ring of points (a hand-drawn circle for the eyes, rims and rings). */
function ring(cx: number, cy: number, r: number, seed: number, d: number, o: { n?: number; jag?: number; ry?: number; rot?: number } = {}) {
  const n = o.n ?? 30, jag = o.jag ?? 0.05, ry = o.ry ?? 1;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (o.rot ?? 0);
    const rr = 1 + jag * (noise1(i * 0.7 + d * 1.9 + seed, seed + 5) * 0.68 + noise1(i * 2.3 + d * 3.1 + seed, seed + 9) * 0.32);
    pts.push(v2(cx + Math.cos(a) * r * rr, cy + Math.sin(a) * r * ry * rr));
  }
  return pts;
}

/** A rotated ellipse as a point list — the vortex rings and the corkscrew coils. */
function ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, n = 34): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, cs = Math.cos(rot), sn = Math.sin(rot);
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push(v2(cx + x * cs - y * sn, cy + x * sn + y * cs));
  }
  return pts;
}

/**
 * A paperclip as one unbroken wire: a rounded-rectangle spiral, 2.4 turns, shrinking as it winds in.
 * The rounded rect comes from a superellipse (n = 5) so the loops read square-ish, then the whole
 * thing is stretched vertically.
 */
function paperclip(cx: number, cy: number, S: number, turns = 2.4, N = 168): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = -Math.PI / 2 + u * turns * TAU;
    const scl = 1 - 0.60 * u;
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const rr = 1 / Math.pow(Math.pow(c, 5) + Math.pow(s, 5), 1 / 5);
    pts.push(v2(cx + Math.cos(a) * rr * S * scl, cy + Math.sin(a) * rr * S * scl * 1.5));
  }
  return pts;
}

export default class Spacetime extends InkedScene {
  private lines = [
    this.ctx.lyrics.get('We had a stable training run'),
    this.ctx.lyrics.get('But now the singularity'),
    this.ctx.lyrics.get("And you're optimizing"),
    this.ctx.lyrics.get('I feel my atoms rearranging'),
  ];
  private clip = paperclip(960, 574, 152);
  private clipLen = polylineLengths(paperclip(960, 574, 152));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const m = t < B1 ? 0 : t < B2 ? 1 : t < B3 ? 2 : 3;
    const c0 = CAMS[m]!;
    // a hard cut between movements, plus a hand-held jitter seeded per drawing
    const z = c0.z + 0.0018 * noise1(d * 0.29 + m * 11, 7);
    const roll = c0.roll + 0.0032 * noise1(d * 0.23 + m * 19, 9);
    s.setCam(c0.cx + 2.0 * noise1(d * 0.37 + m * 13, 3), c0.cy + 2.0 * noise1(d * 0.41 + m * 17, 5), z, roll);

    // the cel frame is pinned to the screen, so it stays put while the drawing cuts under it
    const fa = s.pin(64, 48), fb = s.pin(W - 64, 48), fc = s.pin(W - 64, H - 48), fd = s.pin(64, H - 48);
    s.stroke([fa, fb, fc, fd], 90, { w: 3.2, closed: true, color: rgba('ink', 0.7), overshoot: 6, amp: 3.0 });

    if (m === 0) this.stable(s, f, d);
    else if (m === 1) this.singularity(s, f, d);
    else if (m === 2) this.corkscrew(s, f, d);
    else this.atoms(s, f, d);

    // slug, movement head, drawing number — pinned to the screen, sizes corrected for the zoom
    const heads = ['I · STABLE RUN', 'II · SINGULARITY', 'III · ACCELERATING', 'IV · REARRANGING'];
    const hx = s.pin(96, 116), u0 = s.pin(96, 130), u1 = s.pin(96 + s.measureLetter(heads[m]!, 'tech', 26 * (1 / z), 0), 130);
    s.letter(heads[m]!, hx.x, hx.y, 26 * (1 / z), 40 + m, { font: 'tech', color: rgba('graphite', 0.9), w: 2.6 * (1 / z), rot: -roll });
    s.stroke([u0, u1], 44 + m, { w: 1.6 * (1 / z), color: rgba('graphite', 0.5), taper: false, amp: 1.6 });
    const sp1 = s.pin(96, 1024), sp2 = s.pin(W - 130, 1024);
    s.text('7 — SPACETIME', sp1.x, sp1.y, { size: 18 * (1 / z), fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, sp2.x, sp2.y, { size: 18 * (1 / z), fam: 'Plex-400', color: rgba('graphite', 0.5) });

    return { flash: 0.02 * f.a.snare, zoom: 1 + 0.003 * f.a.kick };
  }

  // ---------------------------------------------------------------- helpers
  /** Stroke only the first `cut` of a polyline: the pen tip is wherever the line currently ends. */
  private partial(s: Sheet, pts: V2[], seed: number, cut: number, o: InkOpts) {
    if (pts.length < 2) return;
    const n = Math.max(2, Math.round(pts.length * clamp(cut)));
    s.stroke(pts.slice(0, n), seed, o);
  }

  /** The stable waveform, one draw per sweep `k` — the same shape, re-drawn every beat, so it boils. */
  private trace(k: number): V2[] {
    const N = 96, pts: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const y = GY
        + 58 * (Math.sin(u * TAU * 1.2 + k * 0.55) * 0.66 + Math.sin(u * TAU * 2.9 - k * 0.9) * 0.24)
        + 9 * noise1(u * 9 + k * 3.7, 31);
      pts.push(v2(lerp(GX0, GX1, u), y));
    }
    return pts;
  }

  /** The hand-ruled graticule (straight rules, so untapered: a chart, ruled by hand). */
  private graticule(s: Sheet, d: number, a = 1) {
    const c = rgba('ink', 0.55 * a);
    s.rect(GX0, GY - GH, GX1, GY + GH, 61, { w: 3.2, color: c, amp: 3.0, taper: false, overshoot: 6 });
    for (let i = 1; i < 8; i++) {
      const x = lerp(GX0, GX1, i / 8);
      s.stroke([v2(x, GY - GH), v2(x, GY + GH)], 62 + i, { w: 1.4, color: rgba('ink', 0.22 * a), taper: false, amp: 2.2 });
    }
    for (let j = 1; j < 5; j++) {
      const y = lerp(GY - GH, GY + GH, j / 5);
      s.stroke([v2(GX0, y), v2(GX1, y)], 74 + j, { w: 1.4, color: rgba('ink', 0.22 * a), taper: false, amp: 2.2 });
    }
    s.letter('loss', GX0 - 96, GY - GH + 6, 24, 81, { font: 'tech', color: rgba('graphite', 0.85 * a), w: 2.2 });
    s.letter('steps', GX1 - 66, GY + GH + 44, 24, 82, { font: 'tech', color: rgba('graphite', 0.85 * a), w: 2.2 });
    s.arc(GX1 + 22, GY + GH + 38, 18, 0, TAU, 83, { w: 2.2, color: rgba('graphite', 0.8 * a), taper: false });
  }

  /** The pen itself: a small ink nib at the head of the live trace. */
  private nib(s: Sheet, at: { x: number; y: number; angle: number }, seed: number) {
    const cs = Math.cos(at.angle), sn = Math.sin(at.angle), L = 30, w2 = 8;
    s.fill([v2(at.x, at.y), v2(at.x - cs * L - sn * w2, at.y - sn * L + cs * w2), v2(at.x - cs * L + sn * w2, at.y - sn * L - cs * w2)], 900 + seed, rgba('ink'), { amp: 1.2 });
  }

  // ---------------------------------------------------------------- I · stable run
  private stable(s: Sheet, f: Frame, d: number) {
    const t = f.t;
    this.graticule(s, d);
    const words = this.lines[0]!.words;
    const fam = 'readable' as const, size = 50;

    for (let j = Math.max(0, Math.floor((t - B0) / SWEEP) - 2); j <= Math.floor((t - B0) / SWEEP); j++) {
      const live = j === Math.floor((t - B0) / SWEEP);
      const ph = clamp((t - B0) / SWEEP - j, 0, 1);
      const tr = this.trace(j);
      const L = polylineLengths(tr);
      const total = L[L.length - 1]!;
      const a = live ? 1 : j === Math.floor((t - B0) / SWEEP) - 1 ? 0.32 : 0.15;
      // the sweep, and the ghosts of the sweeps already drawn
      this.partial(s, tr, 1000 + j * 11, live ? ph : 1, { w: live ? 3.6 : 3.0, color: rgba('ink', 0.95 * a), amp: 2.0 });
      if (live) this.nib(s, pointAtLength(tr, L, ph * total), j & 7);
      // the lyric rides the trace: each word is written where the pen is when it is sung
      for (let i = 0; i < words.length; i++) {
        const w = words[i]!;
        if (Math.floor((w.start - B0) / SWEEP) !== j) continue;
        const uw = clamp((w.start - B0 - j * SWEEP) / SWEEP, 0, 0.93);
        const at = pointAtLength(tr, L, uw * total);
        const ang = clamp(at.angle, -0.5, 0.5);
        const rot = Math.abs(ang) < 1e-3 ? 0 : ang;
        const p = Lyrics.wordProgress(w, t);
        const nx = -Math.sin(ang), ny = Math.cos(ang);      // sit just under the trace
        if (p < 1) s.letterWritten(w.w, at.x + nx * 12, at.y + ny * 12, size, 300 + i * 3, 1, { font: fam, ghost: true, rot });
        s.letterWritten(w.w, at.x + nx * 12, at.y + ny * 12, size, 300 + i * 3, p, {
          font: fam, rot, color: p >= 1 ? rgba('ink') : rgba('signal'), w: 4.6, a,
        });
      }
    }
  }

  // ---------------------------------------------------------------- II · singularity
  private singularity(s: Sheet, f: Frame, d: number) {
    const t = f.t;
    const squash = clamp((t - B1) / 0.34);                 // the trace collapses to a line
    const crush = clamp((t - B1 - 0.20) / 0.36);           // then the box crushes vertically
    const punch = clamp((t - B1 - 0.22) / 0.5);            // "now": the hole
    this.graticule(s, d, 1 - 0.75 * squash);

    // the CRT: the last sweep, squashed, inside a wobbly rectangle that crushes down onto it
    const h = lerp(GH, 9, ease.inCubic(crush));
    const box = [v2(GX0, GY - h), v2(GX1, GY - h), v2(GX1, GY + h), v2(GX0, GY + h)];
    s.stroke(box, 930, { w: 3.4, color: rgba('ink', 0.85), closed: true, amp: 2.6, overshoot: 6 });
    const tr = this.trace(Math.floor((t - B0) / SWEEP));
    const flat: V2[] = tr.map((p) => v2(p.x, lerp(p.y, GY, ease.inCubic(squash))));
    this.partial(s, flat, 932, 1, { w: 3.8, color: rgba('ink', 0.95), amp: 1.6 });

    if (punch <= 0) {
      // before the hole: the line is dead flat, and the words sit on it
      this.pulledWords(s, t, d, 0);
      return;
    }

    // the hole: an ink disc with a torn, hatched rim
    const hr = lerp(26, 198, ease.outCubic(punch));
    const rim = ring(HOLE.x, HOLE.y, hr * 1.26, 940, d, { n: 40, jag: 0.11 });
    s.hatch(ring(HOLE.x, HOLE.y, hr * 1.42, 941, d, { n: 40, jag: 0.13 }), 942, { spacing: 13, angle: -Math.PI / 3.1, color: rgba('ink', 0.42), w: 1.5 });
    s.fill(rim, 943, rgba('ink'));
    s.stroke(ring(HOLE.x, HOLE.y, hr, 944, d, { n: 40, jag: 0.1 }), 945, { w: 3.6, closed: true, color: rgba('ink'), amp: 2.4 });
    // torn edge: short strokes radiating off the rim
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + noise1(i * 0.9 + d * 0.7, 946) * 0.16;
      const r0 = hr * (1.02 + 0.1 * noise1(i * 1.3 + d, 947));
      const r1 = r0 + hr * (0.16 + 0.2 * hash(i, 948));
      s.stroke([v2(HOLE.x + Math.cos(a) * r0, HOLE.y + Math.sin(a) * r0), v2(HOLE.x + Math.cos(a) * r1, HOLE.y + Math.sin(a) * r1)], 949 + i, { w: 2.0, color: rgba('ink', 0.7), amp: 1.6 });
    }

    // the vortex: the graticule rings re-drawn smaller, squashed and rotated into the hole
    const spin = t - B1 - 0.22;
    const shrink = ease.inCubic(clamp(spin / 1.7));
    for (let i = 0; i < 9; i++) {
      const q = i / 8;
      const rr = lerp(hr * 3.7, hr * 1.24, q) * lerp(1, 0.5, shrink * (1 - q * 0.45));
      const rot = spin * (0.45 + q * 0.75) + q * 1.3;
      s.stroke(ellipse(HOLE.x, HOLE.y, rr, rr * 0.63, rot, 38), 960 + i, { w: 2.6, closed: true, taper: false, amp: 2.6, color: rgba('ink', 0.35 + 0.5 * (1 - q)), overshoot: 4 });
    }

    // the words are pulled off the ruled line and spiral in, stretching as they go
    this.pulledWords(s, t, d, t - B1 - 0.22);
  }

  /** The singularity lyric: on the ruled line at first, then dragged around and into the hole. */
  private pulledWords(s: Sheet, t: number, d: number, spin: number) {
    const words = this.lines[1]!.words;
    const fam = 'readable' as const;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      if (p <= 0) continue;
      const base = clamp(52 - Math.max(0, w.w.length - 6) * 2.4, 30, 52);
      const mix = ease.inOutCubic(clamp((spin - i * 0.05) * 1.05));
      const lx = 340 + ((i + 0.5) / words.length) * 1240, ly = GY;
      const th = -0.4 + i * 0.72 + spin * 1.15;
      const rad = lerp(540 - i * 34, (540 - i * 34) * 0.34, ease.inCubic(p));
      const sx = HOLE.x + Math.cos(th) * rad, sy = HOLE.y + Math.sin(th) * rad * 0.66;
      const x = lerp(lx, sx, mix), y = lerp(ly, sy, mix);
      const rot = clamp((th + Math.PI / 2) * mix, -0.6, 0.6);
      const size = base * (1 + 0.28 * mix * p);
      if (p < 1) s.letterWritten(w.w, x, y, size, 980 + i * 3, 1, { font: fam, ghost: true, rot });
      s.letterWritten(w.w, x, y, size, 980 + i * 3, p, {
        font: fam, rot, color: p >= 1 ? rgba('ink') : rgba('signal'), w: 4.4, tracking: 2.4 * mix * size * 0.1,
      });
    }
  }

  // ---------------------------------------------------------------- III · accelerating
  private corkscrew(s: Sheet, f: Frame, d: number) {
    const t = f.t;
    const acc = clamp((t - B2) / (B3 - B2));               // 0 → 1 across the line
    const words = this.lines[2]!.words;
    const fam = 'readable' as const;

    // the wire: coils stacked down a slightly wandering axis, pitch tightening as it accelerates
    const coils = 9;
    for (let i = 0; i < coils; i++) {
      const u = i / (coils - 1);
      const y = lerp(150, 930, u);
      const rx = lerp(300, 88, ease.inCubic(u));
      const ax = 960 + 46 * Math.sin(u * 3.4 + acc * 1.6);
      s.stroke(ellipse(ax, y, rx, 34 + 16 * u, -0.16 + 0.4 * u, 30), 1100 + i * 5, { w: 2.4, closed: true, taper: false, color: rgba('ink', 0.4 + 0.35 * u), amp: 2.2 });
    }
    // the streamlines: long smooth wobbling curves sweeping down and around
    const S = 6;
    const stream: V2[][] = [];
    for (let i = 0; i < S; i++) {
      const ph = (i / S) * TAU;
      const pts: V2[] = [];
      for (let k = 0; k <= 44; k++) {
        const u = k / 44;
        const th = ph + u * TAU * (0.85 + 0.5 * acc);      // it winds tighter as it accelerates
        const rr = lerp(560, 150, ease.inCubic(u)) * (1 - 0.16 * acc);
        const w = 18 * noise1(u * 4 + i * 2.1 + d * 0.7, 61);
        pts.push(v2(960 + Math.cos(th) * rr + w, lerp(140, 946, u * 0.35 + u * u * 0.65)));
      }
      stream.push(pts);
      s.stroke(pts, 1000 + i * 9, { w: 2.9, color: rgba('ink', 0.38 + 0.32 * (i / S)), amp: 2.8 });
    }
    // hatch under the funnel so it has weight
    s.hatch([v2(430, 620), v2(1490, 620), v2(1180, 990), v2(740, 990)], 1200, { spacing: 17, angle: -Math.PI / 2.6, color: rgba('ink', 0.2), w: 1.4 });

    // the lyric, written along the primary streamline
    const path = stream[2]!;
    const L = polylineLengths(path);
    const total = L[L.length - 1]!;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const u = clamp((w.start - B2) / (B3 - B2), 0, 0.9);
      const at = pointAtLength(path, L, u * total);
      const rot = clamp(at.angle, -0.42, 0.42);
      const p = Lyrics.wordProgress(w, t);
      const size = clamp(52 - Math.max(0, w.w.length - 6) * 2.6, 28, 52);
      const nx = -Math.sin(rot), ny = Math.cos(rot);
      if (p < 1) s.letterWritten(w.w, at.x + nx * 14, at.y + ny * 14, size, 700 + i * 3, 1, { font: fam, ghost: true, rot });
      s.letterWritten(w.w, at.x + nx * 14, at.y + ny * 14, size, 700 + i * 3, p, {
        font: fam, rot, color: p >= 1 ? rgba('ink') : rgba('signal'), w: 4.6,
      });
    }
  }

  // ---------------------------------------------------------------- IV · atoms rearranging
  private atoms(s: Sheet, f: Frame, d: number) {
    const t = f.t;
    const clip = this.clip, L = this.clipLen, total = L[L.length - 1]!;

    // the clip that is coming, sketched faintly first
    s.stroke(clip, 1300, { w: 1.8, color: rgba('ink', 0.20), amp: 2.2, taper: false, sketch: true });
    // …then inked as one unbroken line. It is timed off B3 and not off the words: the window closes at
    // 52.508, so the re-formation has to be finished well inside it — the completed clip is on the paper
    // for the last 0.6 s instead of arriving as the cut lands (see the note at the head of the plate).
    const inkP = clamp((t - (B3 + 1.39)) / 0.95);
    if (inkP > 0.01) this.partial(s, clip, 1301, ease.inOutCubic(inkP), { w: 4.8, color: rgba('ink', 0.98), amp: 2.0 });

    // the lyric as one small dot per letter, laid out as a readable line
    const words = this.lines[3]!.words;
    const fam = 'readable' as const, size = 62, gap = 24;
    const widths = words.map((w) => s.measureLetter(w.w, fam, size));
    const totalW = widths.reduce((m, n) => m + n, 0) + gap * (words.length - 1);
    let x = (W - totalW) / 2;
    const y = 262;                                   // the dotted line sits clear above the clip
    let idx = 0;
    const N = words.reduce((m, w) => m + Array.from(w.w).length, 0) - 1;
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi]!;
      const chars = Array.from(w.w);
      // a faint guide letterform keeps the dotted word readable as a word
      if (Lyrics.wordProgress(w, t) > 0) {
        s.letterWritten(w.w, x, y, size, 1320 + wi * 3, 1, { font: fam, ghost: true });
      }
      for (let ci = 0; ci < chars.length; ci++) {
        const birth = w.start + (ci / Math.max(1, chars.length)) * (w.end - w.start);
        const appear = clamp((t - birth) / 0.16);
        if (appear > 0) {
          const cw = s.measureLetter(chars.slice(0, ci).join(''), fam, size);
          const wx = x + cw + s.measureLetter(chars[ci]!, fam, size) * 0.5;
          const target = pointAtLength(clip, L, N > 0 ? (idx / N) * total : 0);
          const tr = ease.inOutCubic(clamp((t - birth - 0.05) / 0.42));
          const swing = Math.sin(tr * Math.PI) * 74 * (1 - tr) * (idx % 2 ? 1 : -1);
          const dx = lerp(wx, target.x, tr) + Math.sin(tr * Math.PI * 3 + idx) * 12 * (1 - tr);
          const dy = lerp(y, target.y, tr) + swing * 0.6;
          const r = lerp(7.4, 5.0, tr) * appear * (1 + 0.3 * noise1(d * 2.1 + idx, 1330));
          s.blob(dx, dy, r, 1340 + idx, { colour: rgba('ink'), jag: 0.22, n: 12, outline: { w: 0 } });
        }
        idx++;
      }
      x += widths[wi]! + gap;
    }
    // a baton rule under the dotted line, so the reading has a floor
    s.stroke([v2((W - totalW) / 2 - 12, y + 26), v2((W + totalW) / 2 + 12, y + 26)], 1360, { w: 2.2, color: rgba('signal', 0.55), amp: 2.6, overshoot: 8 });
  }
}

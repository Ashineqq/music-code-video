// Plate 14 — "Too late now, we lit the fuse" / "Orthogonality thesis blues"
//
// (1) THE FUSE. The lyric line IS the fuse: each word is hand-lettered, and along it runs a braided
//     cord drawn as dozens of short cross-hatched strokes. A burning spark rides the burn front, and
//     the front keeps the VOICE's clock: a word chars to ash only once it has been fully sung, so the
//     line is never ash before it has been heard — the burned words are re-drawn as broken, sparse
//     graphite strokes with ember flecks over a hatched scorch band, and smoke curls off the burn. At
//     the end the camera slides onto the spark and pushes in, so the cut lands it on `stack`'s axis.
// (2) BLUES. Cut to a hand-drawn scatter chart on graph paper: an x axis "intelligence", a y axis
//     "goals", a formless scatter of little hand-drawn marks each with a tiny label, and a flat
//     regression line ruled through it — the orthogonality thesis. On "blues" that flat line becomes
//     a guitar string: it bows into a smooth curve and vibrates, offset by a high-frequency wobble
//     read off the drawing index, with a few staff lines and a single note on a scrap in the corner.
//
// Flat cel throughout — the spark is an ink-and-cell-paint dot with rays, never a glow.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, TAU, heldT } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const LABELS = ['gpt', 'yolo', 'doom', 'bot', 'agi', 'sota', 'p(doom)'];

/** The plate changes instrument on the last word of the first line (14A THE FUSE → 14B BLUES). */
const CUT = 105.96;

function circlePts(cx: number, cy: number, r: number, n = 16): V2[] {
  const p: V2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; p.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  return p;
}

/** The lyric, hand-lettered and written stroke by stroke as it is sung — never a rectangular wipe. */
function writeLine(s: Sheet, line: Line, t: number, y: number, size: number, seedBase: number) {
  const fam = 'readable';
  const words = line.words;
  const widths = words.map((w) => s.measureLetter(w.w, fam, size));
  const gap = size * 0.3;
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, words.length - 1);
  let x = (W - total) / 2;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const p = Lyrics.wordProgress(w, t);
    if (p > 0) {
      const sway = noise1(s.d * 0.41 + i * 1.7, 55) * 2.2;
      if (p < 1) s.letterWritten(w.w, x, y + sway, size, seedBase + i * 3, 1, { font: fam, ghost: true });
      s.letterWritten(w.w, x, y + sway, size, seedBase + i * 3, p, {
        font: fam,
        color: p >= 1 ? rgba('ink') : rgba('signal'),
        w: size * 0.085,
      });
    }
    x += widths[i]! + gap;
  }
}

export default class Fuse extends InkedScene {
  private l1 = this.ctx.lyrics.get('Too late now, we lit the fuse');
  private l2 = this.ctx.lyrics.get('Orthogonality thesis blues');
  /** The camera we last handed the sheet — the plate's own labels are pinned against it. */
  private cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };

  private setCam(s: Sheet, cx: number, cy: number, z = 1, roll = 0) {
    this.cam = { cx, cy, z, roll };
    s.setCam(cx, cy, z, roll);
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    let flash = 0;
    if (t < CUT) flash = this.fusePlate(s, t, d);
    else this.chart(s, t, d);
    // the plate's own slug is pinned to the screen — the camera rushes at the end of the fuse — and it
    // sits just inside the title-safe line (the old 1004 put its ink below it)
    const k = 19 / this.cam.z;
    const a = s.pin(96, 968), b = s.pin(W - 118, 968);
    s.text(t < CUT ? '14A — THE FUSE' : '14B — BLUES', a.x, a.y, { size: k, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, b.x, b.y, { size: k, fam: 'Plex-400', color: rgba('graphite', 0.55) });
    return { flash: 0.04 * f.a.snare + flash, zoom: 1 + 0.005 * f.a.kick };
  }

  // ---------------------------------------------------------------- (1) the fuse
  private fusePlate(s: Sheet, t: number, d: number): number {
    const line = this.l1;
    const size = 72;
    const baseY = 600;
    const words = line.words;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const gap = size * 0.34;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    const x0 = (W - total) / 2;
    const spans: [number, number][] = [];
    let xx = x0;
    for (let i = 0; i < words.length; i++) { spans.push([xx, xx + widths[i]!]); xx += widths[i]! + gap; }
    const x1 = spans[spans.length - 1]![1];
    const cordY = baseY + 34;
    const cordPt = (X: number) => cordY + noise1(X * 0.006 + d * 0.7, 5) * 7;
    const ht = heldT(t);

    // THE FIRE keeps the voice's clock, not a timer of its own. A word is charred only once it has been
    // fully sung — so the line is never ash before it has been heard — and the front rides the right
    // edge of the last sung word, licking forward across the gap toward the word being sung now. After
    // the last word it runs out the tail of the cord, so a live spark is under the frame at the cut.
    const p = words.map((w) => Lyrics.wordProgress(w, t));
    let lastSung = -1, singing = -1;
    for (let i = 0; i < words.length; i++) {
      if (p[i]! >= 1) lastSung = i;
      else if (singing < 0 && p[i]! > 0) singing = i;
    }
    const burnX = lerp(
      lastSung < 0 ? x0 - 66 : spans[lastSung]![1],
      singing < 0 ? x1 + 90 : spans[singing]![0],
      singing < 0 ? clamp((t - words[words.length - 1]!.end) / 0.4) : p[singing]!,
    );
    const burnT = clamp((burnX - (x0 - 60)) / (x1 + 90 - (x0 - 60)));
    const sparkY = cordPt(burnX);

    // the camera trails the burn, and over the last half second it slides onto the spark itself and
    // pushes in — the treatment cuts to `stack` with the spark on the shaft's axis (the frame centre),
    // and the push stops just short of carrying the line out of the title-safe frame
    const rush = ease.inOutCubic(prog(t, CUT - 0.62, CUT - 0.02));
    this.setCam(s, lerp(W / 2, burnX, rush), lerp(H / 2 - 24 * burnT, sparkY, rush), (1 + 0.05 * burnT) * (1 + 0.04 * rush), 0);

    // THE SCORCH — laid down first, so the ash letters sit on top of it
    const sx1 = clamp(burnX, x0 - 40, x1 + 80);
    if (sx1 > x0 - 38) {
      const band = [v2(x0 - 40, baseY - 66), v2(sx1, baseY - 66), v2(sx1, cordY + 42), v2(x0 - 40, cordY + 42)];
      s.hatch(band, 1900, { spacing: 18, angle: -0.85, color: rgba('blood', 0.28), w: 1.3 });
      s.hatch(band, 1901, { spacing: 34, angle: 1.25, color: rgba('graphite', 0.26), w: 1.2 });
    }

    // THE CORD: a wavy run with a braid of short cross strokes over it
    const cx0 = x0 - 70, cx1 = x1 + 90;
    const cpts: V2[] = [];
    for (let i = 0; i <= 46; i++) { const X = lerp(cx0, cx1, i / 46); cpts.push(v2(X, cordPt(X))); }
    s.stroke(cpts, 800, { w: 3.0, color: rgba('ink2', 0.9), amp: 2.0 });
    const TICK = 18;
    const nT = Math.floor((cx1 - cx0) / TICK);
    for (let i = 0; i < nT; i++) {
      const X = cx0 + i * TICK + hash(i, d) * 4;
      const sgn = i % 2 === 0 ? 1 : -1;
      const ln = 0.7 + hash(i, 3) * 0.55;
      const y0 = cordPt(X);
      s.stroke(
        [v2(X - 6.5 * sgn * ln, y0 - 11 * ln), v2(X + 6.5 * sgn * ln, y0 + 11 * ln)],
        i * 2.1,
        { w: 2.3, color: rgba('ink2', 0.7), amp: 1.7 },
      );
    }

    // THE WORDS: sung into place, then eaten — but a word is only ever eaten once the voice has
    // finished it, so nothing is charred ahead of the singing
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const ax = spans[i]![0], bx = spans[i]![1];
      const sway = noise1(d * 0.33 + i * 1.9, 61) * 2.6;

      if (p[i]! < 1) {
        if (p[i]! <= 0) continue;
        s.letterWritten(w.w, ax, baseY + sway, size, 800 + i * 5, 1, { font: 'readable', ghost: true });
        s.letterWritten(w.w, ax, baseY + sway, size, 800 + i * 5, p[i]!, {
          font: 'readable',
          color: rgba('signal'),
          w: size * 0.085,
        });
      } else {
        // ASH: the same letters, broken and sparse, with flecks lifting off them. It is written whole —
        // never a fraction of the word, which would be a word in the wrong material — and the ink it
        // replaces stays over it for a beat and fades, so the change reads as the fire taking the word
        s.letterWritten(w.w, ax, baseY + sway, size, 1400 + i * 5, 1, {
          font: 'readable', color: rgba('graphite', 0.5), w: 2.2, amp: size * 0.075,
        });
        const out = 1 - clamp((ht - w.end) / 0.16);
        if (out > 0.02) s.letterWritten(w.w, ax, baseY + sway, size, 800 + i * 5, 1, {
          font: 'readable', color: rgba('ink'), w: size * 0.085, a: out,
        });
        for (let k = 0; k < 11; k++) {
          const fx = ax + hash(k, i * 7 + 1) * Math.max(1, bx - ax);
          const fy = baseY - 30 + hash(k, i * 7 + 2) * 60 + sway;
          const ang = hash(k, i * 7 + 3) * TAU;
          const ln = 6 + hash(k, i * 7 + 4) * 18;
          s.stroke(
            [v2(fx, fy), v2(fx + Math.cos(ang) * ln, fy + Math.sin(ang) * ln)],
            1600 + i * 11 + k,
            { w: 1.8, color: k % 4 === 0 ? rgba('ember', 0.75) : rgba('graphite', 0.6), amp: 1.6 },
          );
        }
      }
    }

    // THE IGNITER (a hand-drawn cap, already lit; the flame's growth steps on the drawing clock)
    s.blob(cx0 - 34, cordY, 15, 2000, { colour: rgba('ink2'), jag: 0.16, n: 14, outline: { w: 2.6 } });
    const fl = clamp((ht - 102.6) / 0.6);
    if (fl > 0) {
      s.blob(cx0 - 34, cordY - 20 - 8 * fl, 9 + 4 * fl, 2001, { colour: rgba('ember', 0.95), jag: 0.24, n: 14, outline: { w: 2.0, color: rgba('ink', 0.8) } });
    }

    // THE SPARK — a flat cel dot with rays, its boil read off the drawing index. It rides the burn
    // front and is never switched off: it is the one thing that has to be alive at the cut.
    s.blob(burnX, sparkY, 12, 2100, { colour: rgba('ember'), jag: 0.2, n: 14, outline: { w: 0 } });
    s.blob(burnX, sparkY, 5.5, 2101, { colour: rgba('signal'), jag: 0.26, n: 10, outline: { w: 0 } });
    for (let k = 0; k < 4; k++) {
      const a = k * (TAU / 4) + 0.5 + noise1(d * 1.3 + k, 77) * 0.7;
      const r = 16 + noise1(d * 2.1 + k, 79) * 8;
      s.stroke([v2(burnX - Math.cos(a) * r, sparkY - Math.sin(a) * r), v2(burnX + Math.cos(a) * r, sparkY + Math.sin(a) * r)], 2200 + k, { w: 3.0, color: rgba('ember'), amp: 2.2 });
    }
    // embers lifted off the burn, re-scattered every drawing
    for (let k = 0; k < 12; k++) {
      const fx = burnX - hash(k, d) * 220;
      const fy = sparkY - 16 - hash(k, d + 31) * 130;
      const ang = hash(k, d + 53) * TAU;
      const ln = 5 + hash(k, d + 71) * 14;
      s.stroke([v2(fx, fy), v2(fx + Math.cos(ang) * ln, fy + Math.sin(ang) * ln)], 2300 + k, { w: 2.0, color: rgba(k % 3 === 0 ? 'signal' : 'ember', 0.8), amp: 1.6 });
    }

    // SMOKE: two hand-drawn curls, rising and thinning (the rise steps on the drawing clock)
    for (let k = 0; k < 2; k++) {
      const ph = (((d * 0.0458 + k * 0.37) % 1) + 1) % 1;
      const sy = cordPt(burnX) - 34 - ph * 190;
      const sx = burnX - 44 - k * 66 + noise1(d * 0.6 + k * 3, 5) * 18;
      const pts: V2[] = [];
      for (let j = 0; j < 10; j++) {
        const u = j / 9, a = u * 4.4 + k * 2;
        pts.push(v2(sx + Math.cos(a) * (10 + u * 24), sy - u * 38));
      }
      s.stroke(pts, 2500 + k, { w: 2.2, color: rgba('graphite', 0.32 * (1 - ph)), amp: 2.4 });
    }

    // a short paper flash each time the fire takes a word — landed by the voice, not on a timer
    const hit = lastSung < 0 ? 0 : clamp(1 - (t - words[lastSung]!.end) / 0.2);
    return 0.05 * hit;
  }

  // ---------------------------------------------------------------- (2) blues
  private chart(s: Sheet, t: number, d: number) {
    this.setCam(s, W / 2, H / 2, 1.0, 0);
    const px0 = 300, px1 = 1660, py0 = 170, py1 = 770;
    const plot = [v2(px0, py0), v2(px1, py0), v2(px1, py1), v2(px0, py1)];

    // graph paper: two hand-ruled rulings, one fine, one heavy
    s.hatch(plot, 10, { spacing: 44, angle: 0, color: rgba('cool', 0.2), w: 1.0 });
    s.hatch(plot, 11, { spacing: 88, angle: Math.PI / 2, color: rgba('cool', 0.24), w: 1.0 });

    // the axes, ruled in one pass with the corner left as a bend
    s.stroke([v2(px0, py0 - 14), v2(px0, py1), v2(px1 + 34, py1)], 20, { w: 3.4, color: rgba('ink'), amp: 2.2, overshoot: 3 });
    s.stroke([v2(px0 - 11, py0 + 13), v2(px0, py0 - 17), v2(px0 + 11, py0 + 13)], 21, { w: 3.0, color: rgba('ink'), amp: 1.6 });
    s.stroke([v2(px1 + 6, py1 - 12), v2(px1 + 37, py1), v2(px1 + 6, py1 + 12)], 22, { w: 3.0, color: rgba('ink'), amp: 1.6 });
    s.letter('intelligence', (px0 + px1) / 2, py1 + 64, 36, 30, { font: 'tech', align: 'center', color: rgba('ink') });
    s.letter('goals', px0 - 82, (py0 + py1) / 2, 36, 31, { font: 'tech', align: 'center', rot: -Math.PI / 2, color: rgba('ink') });
    s.letter('the orthogonality thesis', px0 + 4, py0 - 34, 28, 32, { font: 'hscript', color: rgba('graphite', 0.95) });

    // the scatter: a formless cloud — no slope to find
    const N = 26;
    for (let i = 0; i < N; i++) {
      const mx = lerp(px0 + 80, px1 - 50, 0.04 + hash(i, 5) * 0.92);
      const my = lerp(py1 - 62, py0 + 70, hash(i, 9));
      const sd = 200 + i * 7;
      const col = rgba('ink', 0.85);
      const kind = i % 4;
      if (kind === 0) {
        s.stroke([v2(mx - 9, my - 9), v2(mx + 9, my + 9)], sd, { w: 2.6, color: col, amp: 1.6 });
        s.stroke([v2(mx - 9, my + 9), v2(mx + 9, my - 9)], sd + 1, { w: 2.6, color: col, amp: 1.6 });
      } else if (kind === 1) {
        s.stroke([v2(mx - 10, my), v2(mx + 10, my)], sd, { w: 2.6, color: col, amp: 1.6 });
        s.stroke([v2(mx, my - 10), v2(mx, my + 10)], sd + 1, { w: 2.6, color: col, amp: 1.6 });
      } else if (kind === 2) {
        s.stroke(circlePts(mx, my, 10), sd, { closed: true, w: 2.6, color: col, amp: 1.6 });
      } else {
        s.stroke([v2(mx - 10, my + 9), v2(mx, my - 10), v2(mx + 10, my + 9)], sd, { closed: true, w: 2.6, color: col, amp: 1.6 });
      }
      if (i % 4 === 1) s.letter(LABELS[i % LABELS.length]!, mx + 15, my - 6, 18, sd + 2, { font: 'tech', color: rgba('graphite', 0.85) });
    }

    // the regression line — flat, because there is nothing to regress
    const ybar = py1 - 210;
    const bend = ease.inOutCubic(prog(t, 107.42, 108.5));
    if (bend < 0.02) {
      s.stroke([v2(px0 + 10, ybar), v2(px1 + 10, ybar)], 300, { w: 3.4, color: rgba('ink'), amp: 2.4, overshoot: 4 });
    } else {
      // ... and on "blues" it is a guitar string: bowed, then vibrating on the drawing clock
      const n = 44;
      const stringAt = (phase: number): V2[] => {
        const out: V2[] = [];
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const X = lerp(px0 + 10, px1 + 10, u);
          const disp = bend * (
            -74 * Math.sin(Math.PI * u) * (0.62 + 0.38 * Math.cos(phase))
            + 18 * Math.sin(2 * Math.PI * u) * Math.cos(phase * 1.7 + 0.7)
            + 6 * noise1(u * 9 + d * 1.7, 44)
          );
          out.push(v2(X, ybar + disp));
        }
        return out;
      };
      s.stroke(stringAt(d * 0.85 + 1.2), 301, { w: 3.2, color: rgba('ink', 0.28), amp: 1.6 });
      s.stroke(stringAt(d * 0.85 - 1.2), 302, { w: 3.2, color: rgba('ink', 0.44), amp: 1.6 });
      s.stroke(stringAt(d * 0.85), 303, { w: 3.6, color: rgba('ink'), amp: 1.6 });
    }

    // the scrap in the corner: five staff lines and one note
    const sx0 = 1544, sy0 = 78, sx1 = 1858, sy1 = 316;
    const scrap = [v2(sx0, sy0), v2(sx1, sy0 - 6), v2(sx1 - 8, sy1), v2(sx0 + 16, sy1 - 12), v2(sx0, sy0 + 40)];
    s.fill(scrap, 400, rgba('paper2', 0.96));
    s.stroke(scrap, 401, { closed: true, w: 2.6, color: rgba('ink', 0.85), amp: 3.2 });
    for (let i = 0; i < 5; i++) {
      const y = sy0 + 84 + i * 22;
      s.stroke([v2(sx0 + 20, y), v2(sx1 - 28, y)], 410 + i, { w: 1.6, color: rgba('ink', 0.7), amp: 1.8 });
    }
    const nx = sx0 + 96, ny = sy0 + 172;
    s.blob(nx, ny, 11, 420, { colour: rgba('ink'), jag: 0.12, n: 14, outline: { w: 2.0 } });
    s.stroke([v2(nx + 9, ny), v2(nx + 12, ny - 74)], 421, { w: 2.6, color: rgba('ink'), amp: 1.6 });
    s.stroke([v2(nx + 12, ny - 74), v2(nx + 42, ny - 62), v2(nx + 30, ny - 36)], 422, { w: 2.6, color: rgba('ink'), amp: 1.8 });

    // the lyric is raised clear of the bottom title-safe line: at 990 its descenders reached 1002, and
    // at the film's 950 line the tail of “blues” would still sit in the reserved corner band
    writeLine(s, this.l2, t, 924, 52, 900);
  }
}

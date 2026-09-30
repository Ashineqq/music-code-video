// Plate 17 — “Just transformers all the way!” → “Till you learned to disobey”
//
// An endless vertical stack of transformer sections, ruled in one-point perspective and receding to a
// vanishing point: wobbly boxes with register ticks at the corners and a tiny hand-lettered label
// (attention / add & norm / feed-forward / add & norm), joined by arrowed connectors down the middle.
// The camera FALLS through it, and the fall is driven by the vocal — one section per word — so the
// quotation is read off the stack as it comes up at you. On “Till you learned to disobey” the fall
// stops dead, and the section carrying “disobey” is drawn wrong: several times the wobble, register
// ticks that miss the corner, a label written askew, letters that will not stay in a line, and a
// karaoke that runs the wrong way — the word is written from its right end, the highlight first.
//
// RULE 1 — the fall, the vanishing point, the sway, the halt and the break are all read at `heldT(t)`
//   (the drawing's own time), so every motion-blur sub-frame of the export shows ONE drawing.
// RULE 2 — every outline re-rolls its wobble from `s.d`, and every element carries its own seed, so
//   the whole shaft boils even while the camera is stopped.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, noise1, hash, TAU, heldT } from './_ink';
import type { V2 } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import type { StrokeFontName } from '../../../engine/stroke';

// ---- the shaft. A section at depth r draws at screen y = vpy + K/r with screen half-size
//      FOCAL * worldHalf / r, so falling with the camera makes sections swell and sweep past.
const SPACING = 330;   // px of shaft between sections
const NEAR = 300;      // depth of the near plane in front of the camera
const K = 200000;      // screen y  = vpy + K / r
const FOCAL = 328;     // screen half-size = FOCAL * worldHalf / r
const BW = 430;        // section half-width in the shaft
const BH = 118;        // section half-height in the shaft
const FAR = 3600;      // beyond this the sections have dissolved into the vanishing point
const MINR = 150;
const CSHIFT = 0.75;   // the camera trails the word it is passing by this many sections

const TECH = 'tech' as StrokeFontName;
const LYR = 'readable' as StrokeFontName;
const SECTIONS = ['attention', 'add & norm', 'feed-forward', 'add & norm'];

interface Cell { g: number; r: number; cx: number; y: number; hw: number; hh: number }
interface BoxWord { text: string; p: number; live: boolean; drift: number }

const rotP = (p: V2, cx: number, cy: number, a: number): V2 => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p.x - cx, dy = p.y - cy;
  return v2(cx + dx * cs - dy * sn, cy + dx * sn + dy * cs);
};
const mixP = (a: V2, b: V2, u: number): V2 => v2(lerp(a.x, b.x, u), lerp(a.y, b.y, u));
const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Fractional word index of a line at t (j + progress); before the first word it runs in from -1. */
function cursorAt(ws: Word[], t: number): number {
  const t0 = ws[0]!.start;
  if (t < t0) return -1 + clamp((t - (t0 - 0.45)) / 0.45);
  let j = 0;
  for (let i = 0; i < ws.length; i++) if (t >= ws[i]!.start) j = i;
  return j + Lyrics.wordProgress(ws[j]!, t);
}

export default class Stack extends InkedScene {
  private lineA = this.ctx.lyrics.get('transformers all the way');
  private lineB = this.ctx.lyrics.get('Till you learned to disobey');

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, ht = heldT(t);
    const A = this.lineA.words, B = this.lineB.words;
    const halt = this.lineB.start;                    // 113.34 — the fall stops dead here
    const tDis = B[B.length - 1]!.start;              // 114.24 — “disobey”
    const since = ht - halt;
    const falling = 1 - clamp(since / 0.4);           // 1 while descending, 0 once it has stopped
    const stopped = since > 0;

    // ---- RULE 1: the fall is the vocal, one section per word, read at the drawing's own time -----
    const cur = cursorAt(A, ht);
    const cw = cur - CSHIFT;
    const vel = clamp((cur - cursorAt(A, ht - 0.1)) * 10, 0, 3) / 3;

    // the halt lands as a damped jolt, and the vanishing point dies with it
    const jolt = stopped ? Math.exp(-since * 4.4) * Math.sin(since * 30) * 24 : 0;
    const vpx = W / 2 + noise1(d * 1.03, 61) * 5 + falling * (Math.sin(ht * 1.55) * 15 + f.a.kick * 7);
    const vpy = 296 + noise1(d * 0.87, 12) * 4 + clamp((ht - 109.85) / 3.4) * 30 + jolt;

    s.setCam(W / 2, H / 2, 1 + 0.01 * f.a.kick, 0);

    const cellAt = (g: number): Cell => {
      const r = (g - cw) * SPACING + NEAR;
      return { g, r, cx: vpx, y: vpy + K / r, hw: (FOCAL * BW) / r, hh: (FOCAL * BH) / r };
    };

    const cells: Cell[] = [];
    const gMax = Math.floor(cw + (FAR - NEAR) / SPACING);
    const gMin = Math.ceil(cw + (MINR - NEAR) / SPACING);
    for (let g = gMax; g >= gMin; g--) {
      const c = cellAt(g);
      // a section is dropped only once it is entirely off the sheet: the sweep of the biggest one as
      // it goes by IS the fall, and because it is drawn as a single path it costs almost nothing
      if (c.y - c.hh > H + 20) continue;
      cells.push(c);
    }
    if (cells.length === 0) return {};
    // the section "in focus" — the nearest one whose top edge is still on the sheet — is the one that
    // carries the word being sung; the section below it is only sweeping out of frame
    let fi = cells.length - 1;
    while (fi > 0 && cells[fi]!.y - cells[fi]!.hh > H - 110) fi--;
    const focus = cells[fi]!;
    const gNear = focus.g;

    // the section that will not obey, once “disobey” arrives: it turns in drawn steps, not smoothly
    const lineBNow = t >= halt;
    const gBroken = lineBNow ? gNear : -9999;
    const bq = Math.floor(clamp((ht - (tDis - 0.10)) / 0.5) * 6) / 6;

    const curWi = clamp(Math.floor(cur), 0, A.length - 1);
    const wordsOn = (g: number, r: number): BoxWord => {
      if (lineBNow) {
        const k = (B.length - 1) - (g - gNear);      // the ladder reads top to bottom: Till … disobey
        if (k < 0 || k >= B.length) return { text: '', p: 1, live: false, drift: 0 };
        const w = B[k]!;
        return { text: w.w, p: Lyrics.wordProgress(w, t), live: t >= w.start, drift: k === B.length - 1 ? bq : 0 };
      }
      const wi = wrap(g, A.length);
      const w = A[wi]!;
      const live = wi === curWi && r < 1200;   // written only on a section close enough to read
      return { text: w.w, p: live ? Lyrics.wordProgress(w, t) : t >= w.end ? 1 : 0, live, drift: 0 };
    };

    // ---- speed streaks: the only thing in the shot that knows how fast the fall is ---------------
    if (vel > 0.03) {
      for (let i = 0; i < 16; i++) {
        const sx = hash(i, 23) < 0.5 ? lerp(118, 340, hash(i, 29)) : lerp(1580, 1802, hash(i, 29));
        const len = (70 + 430 * vel) * (0.45 + hash(i, 37));
        const ph = (hash(i, 41) + ht * 3.4 * vel) % 1;
        const y0 = -90 + ph * (H + 180);
        s.stroke([v2(sx, y0), v2(sx, y0 + len)], 600 + i, { w: 1.4 + 2.2 * vel, color: rgba('ink', 0.20), amp: 1.3 });
      }
    }

    // ---- the sections, far to near --------------------------------------------------------------
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      const faded = clamp((FAR - c.r) / 760);
      if (faded <= 0.03) continue;
      const nxt = cellAt(c.g + 1);
      const broken = c.g === gBroken ? bq : 0;
      const nb = Math.abs(c.g - gBroken) === 1 ? bq : 0;      // its neighbours get twitchy too
      const wamp = (2.2 + 3.4 * nb) * (1 + 7.5 * broken);      // …a box drawn wrong wobbles far too much
      const bx = c.cx + broken * 56;                           // …and is pulled out of the ladder
      const ang = broken * (0.13 + 0.04 * noise1(d * 1.7, 77));
      const seed = 30 + c.g * 7;
      // the section sweeping out of the bottom of the shot gets an outline and a band and nothing
      // else: the largest thing in the frame is then the cheapest thing in the frame
      const sweeping = c.y + c.hh > H + 40;

      const y0 = c.y - c.hh;
      const yb = Math.min(c.y + c.hh, H + 30);                 // never draw past the bottom of the sheet
      let face: V2[] = [v2(bx - c.hw, y0), v2(bx + c.hw, y0), v2(bx + c.hw, yb), v2(bx - c.hw, yb)];
      if (ang) face = face.map((p) => rotP(p, bx, c.y, ang));
      const txL = nxt.cx - nxt.hw, txR = nxt.cx + nxt.hw, tyB = nxt.y + nxt.hh;
      // the band is the shaft wall in the GAP between this section and the next one up, so it can
      // never paint over a face (and the two rails read as the shaft receding to the point)
      const roof: V2[] = [face[0]!, v2(txL, tyB), v2(txR, tyB), face[1]!];

      // …and it is a WALL, so it is hatched, not flat-filled: a flat tone this size reads as a slab
      // pasted over the lower half of the frame, while ruled shading reads as the side of a shaft. The
      // band is only skipped outright once its face has swept clean off the sheet — the gap is then the
      // whole frame and there is no face left for the wall to belong to.
      const wallOn = y0 < H;
      if (wallOn) {
        const nearW = Math.abs(face[1]!.x - face[0]!.x);
        s.hatch(roof, seed, { spacing: clamp(nearW * 0.022, 13, 30), angle: -0.95, color: rgba('graphite', 0.5 * faded), w: 1.6 });
        // the seams of the wall, ruled in the same hand
        if (c.hw > 96) {
          for (let k = 1; k <= 3; k++) {
            const u = k / 4;
            s.stroke([mixP(face[0]!, v2(txL, tyB), u), mixP(face[1]!, v2(txR, tyB), u)], seed + 40 + k, {
              w: 1.1, color: rgba('ink', 0.20 * faded), amp: 1.4, taper: false,
            });
          }
        }
      }

      s.fill(face, seed + 1, rgba('paper', 0.94 * faded), { amp: wamp });
      s.stroke(face, seed + 2, {
        // a lifted, tapered pen on the sections you can actually see; the long ones and the ones
        // sweeping out of frame are drawn as one path, because a taper costs four ops a segment
        closed: true, w: clamp(c.hw * 0.019, 1.4, 4.4), amp: wamp, overshoot: 4, a: faded,
        taper: c.hw < 210,
      });
      if (broken > 0.5) {
        // a second tone, laid on at the wrong angle
        s.hatch(face, seed + 3, { spacing: 30, angle: 0.55, color: rgba('signal', 0.30 * faded), w: 1.4 });
      }

      // register ticks at the corners: a broken cross that stops short of the mark (…or misses it)
      if (c.hw > 118 && faded > 0.55 && !sweeping) {
        const L = clamp(c.hw * 0.085, 5, 15);
        for (let k = 0; k < 4; k++) {
          const p = face[k]!;
          const sx = k === 1 || k === 2 ? 1 : -1;
          const sy = k >= 2 ? 1 : -1;
          const ox = broken * (hash(c.g, k, 3) - 0.5) * 44;
          const oy = broken * (hash(c.g, k, 9) - 0.5) * 44;
          s.stroke([v2(p.x + sx * 5 + ox, p.y + oy), v2(p.x + sx * (5 + L) + ox, p.y + oy)], seed + 50 + k * 2, { w: 2, amp: 1.3 * (1 + 6 * broken) });
          s.stroke([v2(p.x + ox, p.y + sy * 5 + oy), v2(p.x + ox, p.y + sy * (5 + L) + oy)], seed + 51 + k * 2, { w: 2, amp: 1.3 * (1 + 6 * broken) });
        }
      } else if (c.hw > 34) {
        s.stroke([v2(bx - c.hw - 5, y0), v2(bx - c.hw - 5 - clamp(c.hw * 0.18, 5, 12), y0)], seed + 70, { w: 1.4, color: rgba('ink', 0.5 * faded), amp: 1.2 });
      }

      // the tiny hand-lettered section label, top-left inside the face
      const sc = clamp(c.hw / 300, 0.2, 1.15);
      if (c.hw > 56 && !sweeping) {
        let lp = v2(bx - c.hw + 16 * sc, y0 + 28 * sc);
        if (ang) lp = rotP(lp, bx, c.y, ang);
        s.letter(SECTIONS[wrap(c.g, SECTIONS.length)]!, lp.x, lp.y, clamp(25 * sc, 10, 25), seed + 80, {
          font: TECH, color: rgba('ink2', 0.85), w: clamp(2.3 * sc, 1.1, 2.4),
          rot: ang * 1.7,                                  // the disobedient label is written askew
          a: faded,
        });
      }

      // the word this section carries: one word per box, written as it is sung
      const bw = wordsOn(c.g, c.r);
      if (bw.text && !sweeping) {
        const wsize = this.fitSize(bw.text, c.hw * 2 - 48 * sc, Math.min(c.hh * 1.35, 86));
        if (wsize > 9) {
          const wy = c.y + wsize * 0.30;
          if (bw.drift > 0.02) {
            this.writeDrifting(s, bw.text, bx, wy, wsize, bw.p, seed + 100, bw.drift, ang, d, faded);
          } else {
            if (bw.p < 1) s.letterWritten(bw.text, bx, wy, wsize, seed + 100, 1, { font: LYR, ghost: true, align: 'center', rot: ang, a: faded });
            s.letterWritten(bw.text, bx, wy, wsize, seed + 100, bw.p, {
              font: LYR, align: 'center', rot: ang, a: faded,
              color: bw.live && bw.p < 1 ? rgba('signal') : rgba('ink'),
              w: wsize * 0.082,
            });
          }
        }
      }

      // a deadpan hand-lettered annotation hung off the corner of the section that will not obey
      if (broken > 0.4 && c.hw > 90) {
        // the callout hangs off the corner — but a section near enough to the camera would run the
        // label clear off the right edge, so it is pulled back inside the title-safe margin
        const ay = y0 - 16;
        const lw = s.measureLetter('out of alignment', TECH, 22);
        const ax = Math.min(bx + c.hw + 34, W - 118 - lw);
        s.stroke([v2(bx + c.hw - 10, c.y - c.hh * 0.4), v2(ax, ay)], seed + 120, { w: 1.8, color: rgba('signal', 0.75), amp: 1.5, taper: false });
        s.letter('out of alignment', ax + 10, ay + 7, 22, seed + 121, { font: TECH, color: rgba('signal', 0.9) });
      }
    }

    // ---- arrowed connectors down the middle: the shaft's own flow ---------------------------------
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      const faded = clamp((FAR - c.r) / 760);
      if (faded <= 0.15) continue;
      const nxt = cellAt(c.g + 1);
      const bx = c.cx + (c.g === gBroken ? bq * 56 : 0);
      const yA = nxt.y + nxt.hh;              // bottom edge of the section above
      const yB = c.y - c.hh;                  // top edge of this one
      if (yB - yA < 6) continue;
      const seed = 200 + c.g * 5;
      if (c.g === gBroken && bq > 0.3) {
        // the connector has come apart, and the loose end dangles
        const mid = lerp(yA, yB, 0.45);
        const sw = (yB - yA) * 0.22 * bq;
        s.stroke([v2(c.cx, yA), v2(c.cx + sw * 0.4, mid)], seed, { w: 2.6, color: rgba('ink', 0.8), amp: 2 + 8 * bq });
        s.stroke([v2(bx + sw, yB), v2(bx + sw * 0.2, mid + 6)], seed + 1, { w: 2.6, color: rgba('ink', 0.8), amp: 2 + 8 * bq });
      } else {
        s.stroke([v2(c.cx, yA), v2(c.cx, yB)], seed, { w: 2.6, color: rgba('ink', 0.78 * faded), amp: 1.8 });
        const hw = clamp((yB - yA) * 0.16, 4, 13);
        s.stroke([v2(c.cx - hw, yB - hw * 1.1), v2(c.cx, yB)], seed + 1, { w: 2.6, color: rgba('ink', 0.78 * faded), amp: 1.6 });
        s.stroke([v2(c.cx + hw, yB - hw * 1.1), v2(c.cx, yB)], seed + 2, { w: 2.6, color: rgba('ink', 0.78 * faded), amp: 1.6 });
      }
    }

    // ---- the big curly quotes that make the stack a quoted block ----------------------------------
    // (anchored at a fixed depth in the shaft, not to "the nearest section", so the pair rides the
    //  fall smoothly instead of jumping each time a section sweeps past the camera)
    if (!stopped) {
      const qc = cellAt(cw + 1.6);
      const qr = clamp(qc.hw * 0.26, 14, 62);
      const qy = qc.y - qc.hh * 0.5;
      for (const side of [-1, 1]) {
        const qbx = qc.cx + side * (qc.hw + 46 + qr * 0.3);
        for (let k = 0; k < 2; k++) {
          const qx = qbx + side * k * qr * 0.62;
          if (side < 0) {
            s.arc(qx, qy, qr, -0.75, 2.15, 850 + k, { w: 4.4, color: rgba('signal', 0.9), amp: 2.2 });
            s.stroke([v2(qx + Math.cos(2.15) * qr * 0.9, qy + Math.sin(2.15) * qr * 0.9), v2(qx + Math.cos(2.1) * qr * 1.5, qy + Math.sin(2.1) * qr * 1.5)], 860 + k, { w: 4.0, color: rgba('signal', 0.9), amp: 1.8 });
          } else {
            s.arc(qx, qy, qr, Math.PI - 2.15, Math.PI + 0.75, 850 + k, { w: 4.4, color: rgba('signal', 0.9), amp: 2.2 });
            s.stroke([v2(qx - Math.cos(2.15) * qr * 0.9, qy + Math.sin(2.15) * qr * 0.9), v2(qx - Math.cos(2.1) * qr * 1.5, qy + Math.sin(2.1) * qr * 1.5)], 860 + k, { w: 4.0, color: rgba('signal', 0.9), amp: 1.8 });
          }
        }
      }
    }

    // ---- the stop: tick fragments thrown off the section it stopped on ----------------------------
    if (stopped && since < 1.1) {
      const k = 1 - since / 1.1;
      for (let i = 0; i < 12; i++) {
        const px0 = focus.cx - focus.hw + focus.hw * 2 * hash(i, 3);
        const py0 = focus.y + (hash(i, 5) < 0.5 ? -1 : 1) * focus.hh * (0.45 + hash(i, 9) * 0.55);
        const ang0 = Math.atan2(py0 - focus.y, px0 - focus.cx || 0.001);
        const sp = 130 + hash(i, 7) * 430;
        const px = px0 + Math.cos(ang0) * sp * since;
        const py = py0 + Math.sin(ang0) * sp * since * 0.6 + 330 * since * since;
        const rot = ang0 + hash(d, i, 11) * TAU * 0.5 + since * 5;   // tumbles a new way every drawing
        const L = 10 + hash(i, 13) * 17;
        s.stroke([v2(px - Math.cos(rot) * L, py - Math.sin(rot) * L), v2(px + Math.cos(rot) * L, py + Math.sin(rot) * L)], 900 + i, {
          w: 2.4, color: rgba('ink', 0.8 * k), amp: 1.8,
        });
      }
    }

    // ---- the camera furniture: ruled, and pinned so it does NOT fall with the drawing -------------
    const f0 = s.pin(58, 46), f1 = s.pin(W - 58, H - 46);
    s.stroke([f0, v2(f1.x, f0.y), f1, v2(f0.x, f1.y)], 20, { closed: true, w: 3.4, color: rgba('ink', 0.72), overshoot: 6, amp: 3, taper: false });

    // a scrolling layer ruler down the left edge: it is how the fall is read
    const rx = 84, unit = 92;
    const base = Math.floor(cw * 4);
    const scroll = (cw * 4 - base) * unit;
    s.stroke([s.pin(rx, 92), s.pin(rx, H - 92)], 400, { w: 2.2, color: rgba('ink', 0.7), amp: 1.6, taper: false });
    for (let i = 0; i <= 10; i++) {
      const yy = 92 + i * unit - scroll;
      if (yy < 88 || yy > H - 88) continue;
      const long = (base + i) % 5 === 0;
      s.stroke([s.pin(rx, yy), s.pin(rx + (long ? 26 : 12), yy)], 410 + i, { w: long ? 2.4 : 1.5, color: rgba('ink', 0.7), amp: 1.2, taper: false });
      if (long) {
        const lp = s.pin(rx + 36, yy + 7);
        s.letter(`L${base + i}`, lp.x, lp.y, 19, 430 + i, { font: TECH, color: rgba('ink2', 0.75) });
      }
    }

    // depth + velocity readout, and the deadpan stamp when the thing stops
    const dep = clamp(cw, 0, 99);
    s.letter('DEPTH', 196, 140, 20, 460, { font: TECH, color: rgba('graphite', 0.9) });
    s.letter(`${(dep * 0.33).toFixed(2)} m`, 196, 170, 30, 462, { font: TECH, color: rgba('ink', 0.9) });
    s.letter(stopped ? 'v 0.00' : `v ${(vel * 3.3).toFixed(2)}`, 196, 206, 20, 464, { font: TECH, color: rgba('graphite', 0.9) });
    s.letter(`SECTION ${Math.floor(dep) + 1}`, W - 96, 968, 20, 466, { font: TECH, color: rgba('graphite', 0.85), align: 'right' });
    if (stopped) {
      s.letter('STOP', 1650, 350, 32, 470, { font: TECH, color: rgba('signal', 0.95), align: 'center' });
      s.stroke([v2(1560, 372), v2(1740, 372)], 472, { w: 3.2, color: rgba('signal', 0.7), amp: 2.4, overshoot: 5 });
    }

    // the technical habit of pointing at one joint and drawing it again, bigger, in the corner
    // (28 px down from the sheet's top edge, to clear the plate's own label on the title-safe line)
    const ix0 = 1406, iy0 = 124, ix1 = 1848, iy1 = 320;
    s.stroke([v2(ix0, iy0), v2(ix1, iy0), v2(ix1, iy1), v2(ix0, iy1)], 560, { closed: true, w: 2.6, color: rgba('ink', 0.6), overshoot: 5, amp: 2.4, taper: false });
    s.letter('DETAIL A', ix0 + 12, iy0 + 26, 19, 562, { font: TECH, color: rgba('ink2', 0.8) });
    s.letter('SECTION JOINT — 2:1', ix0 + 12, iy1 - 12, 17, 564, { font: TECH, color: rgba('graphite', 0.8) });
    s.stroke([v2(ix0 + 66, iy0 + 78), v2(ix0 + 330, iy0 + 78), v2(ix0 + 330, iy0 + 158), v2(ix0 + 66, iy0 + 158)], 566, {
      closed: true, w: 2.4, color: rgba('ink', 0.7), overshoot: 3, amp: 2.2, taper: false,
    });
    for (let k = 0; k < 4; k++) {
      const px = k === 1 || k === 2 ? ix0 + 330 : ix0 + 66;
      const py = k >= 2 ? iy0 + 158 : iy0 + 78;
      const sx = k === 1 || k === 2 ? 1 : -1, sy = k >= 2 ? 1 : -1;
      s.stroke([v2(px + sx * 5, py), v2(px + sx * 19, py)], 570 + k * 2, { w: 2, amp: 1.2 });
      s.stroke([v2(px, py + sy * 5), v2(px, py + sy * 19)], 571 + k * 2, { w: 2, amp: 1.2 });
    }
    s.letter('ticks miss by design', ix0 + 66, iy0 + 186, 16, 580, { font: TECH, color: rgba('graphite', 0.75) });
    // …and a balloon hung off the section it is describing
    const bal = v2(focus.cx - focus.hw + 12, focus.y - focus.hh + 8);
    const elbow = v2(lerp(ix0, bal.x, 0.58), iy1 + 74);
    s.stroke([v2(ix0, iy1), elbow, bal], 1100, { w: 1.8, color: rgba('ink', 0.42), amp: 1.8, taper: false });
    s.blob(bal.x, bal.y, 16, 1102, { outline: { w: 2, color: rgba('ink', 0.5), amp: 1.8 } });

    // a ruled scale bar along the bottom: this is a technical section, not a hallway
    const sbx = 560, sby = 1016;
    s.stroke([v2(sbx, sby), v2(sbx + 800, sby)], 480, { w: 2.6, color: rgba('ink', 0.8), amp: 1.8, overshoot: 4, taper: false });
    for (let i = 0; i <= 20; i++) {
      const long = i % 5 === 0;
      s.stroke([v2(sbx + i * 40, sby), v2(sbx + i * 40, sby + (long ? 15 : 8))], 490 + i, { w: long ? 2.2 : 1.3, color: rgba('ink', 0.7), amp: 1, taper: false });
      if (long && i > 0) s.letter(`${i / 5}`, sbx + i * 40, sby + 34, 17, 520 + i, { font: TECH, color: rgba('graphite', 0.8), align: 'center' });
    }
    s.letter('SCALE 1:1', sbx + 800 + 22, sby + 4, 19, 545, { font: TECH, color: rgba('graphite', 0.85) });

    // the plate's own labels ride the title-safe line (their ink clears 96 px), not the margin outside it
    s.text('17 — STACK', 96, 112, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 118, 112, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55) });

    return { flash: 0.02 * f.a.snare, zoom: 1 + 0.005 * f.a.kick, vignette: 0.19 };
  }

  /** Largest hand-lettered size that keeps `text` inside a box. */
  private fitSize(text: string, maxW: number, maxH: number) {
    const w = this.sheet.measureLetter(text, LYR, 100);
    return clamp(w > 1 ? (maxW / w) * 100 : maxH * 0.6, 9, maxH);
  }

  /**
   * Write a word letter by letter and let the letters drift apart: the later the letter, the further
   * it wanders off the baseline and the more it leans. “disobey” disobeys the karaoke too — the hand
   * starts at the word's right end and works leftwards, the letters it has not reached ride out the
   * wrong way instead of waiting under the pen, and the wet letter is the signal red.
   */
  private writeDrifting(s: Sheet, text: string, cx: number, y: number, size: number, p: number, seed: number, drift: number, lean: number, d: number, a: number) {
    const chars = Array.from(text);
    const gap = drift * size * 0.15;
    const adv = chars.map((ch) => s.measureLetter(ch, LYR, size));
    const total = adv.reduce((x, y2) => x + y2, 0) + gap * (chars.length - 1);
    let x = cx - total / 2;
    const done = clamp(p) * chars.length;
    for (let i = 0; i < chars.length; i++) {
      const u = chars.length > 1 ? i / (chars.length - 1) : 0;
      const pull = drift * (0.35 + u * 1.65);
      const jx = noise1(d * 0.9 + i * 3.1, seed + 5) * pull * 30;
      const jy = noise1(d * 1.3 + i * 2.3, seed + 9) * pull * 40 * (0.3 + u);
      const rr = lean + noise1(d * 0.7 + i * 1.9, seed + 3) * pull * 0.55;
      // the karaoke backwards: the last letter is the one the hand reaches for first, and the slide is
      // the wrong way too — a letter is held out to the right until the pen is done with it
      const pi = clamp(done - (chars.length - 1 - i));
      const slide = (1 - pi) * drift * 26;
      if (pi > 0) {
        s.letterWritten(chars[i]!, x + jx + slide, y + jy, size, seed + i * 4, pi, {
          font: LYR, color: pi < 1 ? rgba('signal') : rgba('ink'), w: size * 0.085, rot: rr, a,
        });
      } else {
        s.letterWritten(chars[i]!, x + jx + slide, y + jy, size, seed + i * 4, 1, { font: LYR, ghost: true, rot: rr, a });
      }
      x += adv[i]! + gap;
    }
  }
}

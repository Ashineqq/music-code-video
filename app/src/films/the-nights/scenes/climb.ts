// Plate 7 — `climb` (59.10 → 68.62 s, instrumental). The drop, full.
//
// The plate before this one tore the page open along the horizon and the night came through; this one
// spends the whole drop inside that night. Two things happen here and nothing else:
//
//   * THE BOY CLIMBS THE THREAD. The opening plate's horizon is now a vertical line of light running
//     up the page, and he goes up it hand over hand: a step on every beat (`beatAt`), one reach per
//     bar (`timeOfBeat`), the same drawing grammar as `open`'s shadows — ink that steps on the beat.
//   * THE PAGE TEARS. The paper he came out of is still below him and it comes apart: the torn edge
//     drops a step on every downbeat, and the pieces it leaves go with it — flat `paper`/`paper2`
//     strips that fall out of the frame. The sky it was hiding is full of stars, and the stars he has
//     climbed past have grown (the same dot, nearer).
//
// Nothing is sung in this window, so there is no `Lyrics` import and not one letter: the words come
// back in the next plate. Everything is a pure function of `f.t` and the drawing index `s.d`, and
// every flat mass is SOLID (a = 1 or the fill's own tone): the night is ink that has covered the page,
// not a wash, and nothing here glows (CEL.flat).
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
// (no `Lyrics` here on purpose: nothing is sung inside [59.10, 68.62), so this plate writes no words)
import type { V2 } from './_ink';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- world layout (sheet px, y down)
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge (as in `open`)
const FOLD_X = 960;                 // the spread's spine
const THREAD_X = 880;               // the opening plate's horizon, stood on its end
const THREAD_TOP = 118;             // where the line of light leaves the picture
const Y_TEAR0 = 690;                // the torn edge at the first downbeat
const Y_TEAR4 = 1020;               // ... and when the page has gone
const BOY_FEET0 = 660;              // his feet at the first beat (just off the tearing edge)
const BOY_FEET1 = 205;              // ... and at the last beat, near the top of the page
const NSTEP = 19;                   // steps between those two (the window holds 20 beats)
const SEAMS = 13;                   // the page is already scored where it will come apart

type Star = { x: number; y: number; r: number };
type Strip = { k: number; x: number; w: number; tRel: number; fall: number; dx: number; rot: number; light: boolean };

export default class Climb extends InkedScene {
  /** The downbeat and beat indices this window opens on (59.10 s is downbeats[31] / beats[125]). */
  private bar0 = Math.floor(this.ctx.audio.barAt(this.ctx.start));
  private beat0 = Math.floor(this.ctx.audio.beatAt(this.ctx.start));

  /** The starfield: fixed points, the low ones nearer (bigger). Seeded off `hash`, never off time. */
  private stars: Star[] = Array.from({ length: 38 }, (_, i) => {
    let x = lerp(126, 1794, hash(i, 7));
    if (Math.abs(x - THREAD_X) < 60) x += x < THREAD_X ? -76 : 76; // keep the line of light clear
    return { x, y: lerp(142, 902, hash(i, 13)), r: lerp(3.2, 6.6, hash(i, 19)) };
  });

  /** Two strips come off the tear on each of downbeats 1..3; the last bar is bare sky. */
  private strips: Strip[] = Array.from({ length: 6 }, (_, j) => {
    const db = this.ctx.audio.downbeats;
    const k = 1 + Math.floor(hash(j, 41) * 3);
    return {
      k,
      x: lerp(160, 1690, hash(j, 17)),
      w: 56 + 62 * hash(j, 23),
      tRel: (db[this.bar0 + k] ?? this.ctx.start) + 0.09 * hash(j, 29),
      fall: 300 + 170 * hash(j, 59),
      dx: (hash(j, 53) - 0.5) * 120,
      rot: (hash(j, 61) - 0.5) * 1.7,
      light: hash(j, 71) < 0.5,
    };
  });

  draw(s: Sheet, f: Frame): PostOverrides {
    const au = this.ctx.audio;
    const t = f.t, d = s.d, t0 = this.ctx.start;
    const ht = heldT(t);

    // the camera: a slow push and a hand-held breathe — a page being held, not a machine move
    const push = 1 + 0.02 * prog(t, t0, this.ctx.end);
    s.setCam(W / 2, H / 2 + 20 + 7 * noise1(ht * 0.3, 3), push, 0.004 * noise1(ht * 0.22, 7));

    // ---- the tear: one step per downbeat, and widening through the first second (movement 1) ----
    const k = clamp(Math.floor(au.barAt(t)) - this.bar0, 0, 4);
    const tearAt = (step: number) => lerp(Y_TEAR0, Y_TEAR4, clamp(step, 0, 4) / 4);
    const tearY = tearAt(k) - (1 - prog(t, t0, t0 + 0.95)) * 54;

    // ---- the boy: one step per beat, one reach per bar ----
    const n = clamp(Math.floor(au.beatAt(t)) - this.beat0, 0, NSTEP);
    const fy = lerp(BOY_FEET0, BOY_FEET1, n / NSTEP);
    const bx = THREAD_X + (Math.floor(n / 4) % 2 === 0 ? 26 : -26);

    // the lantern at the foot of the thread: a small signal, brightest on the downbeat
    const ly = Math.min(tearY + 18, 958);
    const barT = au.downbeats[Math.floor(au.barAt(t))] ?? t;
    const lit = 1 - 0.4 * clamp((ht - barT) / 1.9);

    // ---- draw order: night, sky, the paper, what leaves it, the thread, the light, the boy, the page
    this.flood(s);
    this.starfield(s, d, fy);
    this.paper(s, d, k, tearY);
    this.pieces(s, t, tearAt);
    this.thread(s, ly - 32);
    this.lantern(s, d, THREAD_X, ly, lit);
    this.boy(s, bx, fy, n);
    this.furniture(s);
    return CEL.flat;
  }

  // ------------------------------------------------------------------ the page
  /** The night: one flat mass over the whole page and past it, so no camera ever finds its edge. */
  private flood(s: Sheet) {
    s.fill([v2(-380, -240), v2(2300, -240), v2(2300, 1320), v2(-380, 1320)], 1, rgba('night'));
  }

  /** Furniture, drawn last so it stays crisp: the page's edge, its crease, the fold down the spine. */
  private furniture(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.4, color: rgba('star', 0.24), amp: 1.6, taper: false, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 2, color: rgba('graphite', 0.45), amp: 1.6, taper: false });
    s.stroke([v2(FOLD_X, FRAME[1] + 18), v2(FOLD_X, FRAME[3] - 18)], 4, { w: 2, color: rgba('graphite', 0.3), taper: false, overshoot: 8 });
  }

  // ------------------------------------------------------------------ movement 3, the sky
  /** The sky, and the stars the climb is measured against: the ones he has passed are bigger. */
  private starfield(s: Sheet, d: number, fy: number) {
    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i]!;
      const passed = clamp((st.y - fy) / 300);                 // 0 while it is still ahead of him, 1 once past
      const r = st.r * lerp(0.58, 1.55, passed) * (0.9 + 0.2 * hash(i, d));
      this.star4(s, st.x, st.y, r, 60 + i, r > 4.5 ? rgba('star', 0.97) : rgba('cool', 1));
    }
  }

  // ------------------------------------------------------------------ movement 2, the page tears
  /** The paper he came out of: still below him, scored into strips, its torn edge stepping down. */
  private paper(s: Sheet, d: number, k: number, tearY: number) {
    if (tearY > FRAME[3] - 4) return; // the last bar: the page is gone and this is bare sky
    const NB = 40;
    const top: V2[] = [];
    for (let i = 0; i <= NB; i++) {
      const x = lerp(-90, W + 90, i / NB);
      top.push(v2(x, tearY + 13 * noise1(i * 1.35 + k * 3.7 + d * 1.7, 5)));
    }
    // the band bleeds off both sides and off the foot of the page: what is left is an edge, not a slab
    s.fill([...top, v2(W + 90, 1240), v2(-90, 1240)], 41, rgba('paper'), { amp: 2.0 });
    // the torn lip catches what light there is
    s.stroke(top, 42, { w: 2.2, color: rgba('star', 0.3), taper: false });
    // and the page is already scored where it will come apart
    for (let i = 1; i < SEAMS; i++) {
      const x = lerp(128, 1796, i / SEAMS);
      s.stroke([v2(x, tearY + 12), v2(x, 1210)], 43 + i, { w: 2.4, color: rgba('shade', 0.9), taper: false });
    }
  }

  /** The strips: flat cel pieces leaving the page on the downbeats, fluttering as they go. */
  private pieces(s: Sheet, t: number, tearAt: (k: number) => number) {
    for (let j = 0; j < this.strips.length; j++) {
      const q = this.strips[j]!;
      const p = t - q.tRel;
      if (p <= 0 || p > 3) continue;
      const y = tearAt(q.k) + 62 + 0.5 * q.fall * p * p;
      if (y > 1160) continue;
      const x = q.x + q.dx * p + 15 * Math.sin(p * 4.4 + j);
      const sc = clamp(1 - 0.3 * p, 0.55, 1);
      const h = 132 * sc, w = q.w * sc;
      const rot = q.rot * p;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const c = (dx: number, dy: number): V2 => v2(x + dx * cs - dy * sn, y + dx * sn + dy * cs);
      const box = [c(-w / 2, -h / 2), c(w / 2, -h / 2), c(w / 2, h / 2), c(-w / 2, h / 2)];
      s.fill(box, 200 + j, q.light ? rgba('paper') : rgba('paper2'));
      // a torn lip and a cut edge, so a strip is an object and not a smudge
      s.stroke([c(-w / 2, -h / 2), c(w / 2, -h / 2)], 220 + j, { w: 3.4, color: rgba('shade', 0.95), taper: false, overshoot: 4 });
      s.stroke([c(-w / 2, h / 2), c(w / 2, h / 2)], 230 + j, { w: 2, color: rgba('shade', 0.6), taper: false });
    }
  }

  // ------------------------------------------------------------------ the thread, the light, the boy
  /** The thread: the opening plate's horizon, stood on its end, running up out of the page. */
  private thread(s: Sheet, footY: number) {
    const pts: V2[] = [];
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(v2(THREAD_X + Math.sin(u * 5.2) * 5 + 6 * noise1(u * 2.6, 5), lerp(THREAD_TOP, footY, u)));
    }
    s.stroke(pts, 21, { w: 3.6, color: rgba('star', 0.96) });
  }

  /** The lantern: a small solid signal at the foot of the thread, pulsing once per bar. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    const flick = 0.94 + 0.12 * hash(0, d);
    const body: V2[] = [v2(x - 13, y - 22), v2(x + 13, y - 22), v2(x + 16, y), v2(x - 16, y)];
    s.fill(body, 51, rgba('lantern', 0.96));
    s.stroke(body, 51, { closed: true, w: 3.2, color: rgba('lantern', 0.96) });
    s.stroke([v2(x - 9, y - 22), v2(x, y - 42), v2(x + 9, y - 22)], 52, { w: 3.2, color: rgba('lantern', 0.9) });
    this.dot(s, x, y - 11, 6.4 * lit * flick, 53, rgba('star', 0.95));
  }

  /** The boy: two flat masses and five strokes — head, body, four limbs, no face. */
  private boy(s: Sheet, bx: number, fy: number, step: number) {
    const up = Math.floor(step / 4) % 2 === 0; // one reach per bar, the hands alternating
    const hipY = fy - 23, shY = fy - 48;
    const body: V2[] = [v2(bx - 8, shY), v2(bx + 8, shY), v2(bx + 7, hipY), v2(bx - 7, hipY)];
    s.fill(body, 301, rgba('night2', 0.95));
    s.stroke(body, 301, { closed: true, w: 3.2, color: rgba('star', 0.92) });
    s.blob(bx, shY - 13, 10, 302, { colour: rgba('night2', 0.95), fillA: 1, n: 12, jag: 0.1, outline: { w: 3.2, color: rgba('star', 0.92) } });
    // both hands on the thread, one above the other
    const hiY = fy - 78, loY = fy - 52;
    const sHi = v2(bx + (up ? 8 : -8), shY + 1), sLo = v2(bx + (up ? -8 : 8), shY + 1);
    s.stroke([sHi, v2(lerp(sHi.x, THREAD_X, 0.5) + (up ? 16 : -16), (sHi.y + hiY) / 2), v2(THREAD_X, hiY)], 311, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([sLo, v2(lerp(sLo.x, THREAD_X, 0.5) + (up ? -16 : 16), (sLo.y + loY) / 2), v2(THREAD_X, loY)], 312, { w: 3.2, color: rgba('star', 0.9) });
    // the legs: the beat he is on lifts one of them
    const kickA = step % 2 === 0 ? 0 : 10;
    const kickB = step % 2 === 0 ? 10 : 0;
    s.stroke([v2(bx - 5, hipY), v2(bx - 13, fy - 7 - kickA * 0.5), v2(bx - 16, fy - kickA)], 313, { w: 3.2, color: rgba('star', 0.88) });
    s.stroke([v2(bx + 5, hipY), v2(bx + 14, fy - 7 - kickB * 0.5), v2(bx + 17, fy - kickB)], 314, { w: 3.2, color: rgba('star', 0.88) });
  }

  // ------------------------------------------------------------------ small flat masses
  /** A solid cel dot: a hand-drawn polygon, never an outline circle. */
  private dot(s: Sheet, x: number, y: number, r: number, seed: number, colour: string) {
    const pts: V2[] = [];
    for (let i = 0; i < 6; i++) {
      const A = (i / 6) * TAU;
      pts.push(v2(x + Math.cos(A) * r, y + Math.sin(A) * r));
    }
    s.fill(pts, seed, colour, { amp: Math.max(0.5, r * 0.16) });
  }

  /** A star: a solid dot, with four short rays once it is big enough to carry them. */
  private star4(s: Sheet, x: number, y: number, r: number, seed: number, colour: string) {
    if (r < 4.4) { this.dot(s, x, y, r, seed, colour); return; }
    const inner = r * 0.3;
    const pts: V2[] = [];
    for (let k = 0; k < 4; k++) {
      const A = (k / 4) * TAU - Math.PI / 2;
      const B = A + TAU / 8;
      pts.push(v2(x + Math.cos(A) * r, y + Math.sin(A) * r));
      pts.push(v2(x + Math.cos(B) * inner, y + Math.sin(B) * inner));
    }
    s.fill(pts, seed, colour, { amp: r * 0.12 });
  }
}

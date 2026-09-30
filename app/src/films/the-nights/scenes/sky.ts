// Plate 8 — `sky` (68.62 → 78.62 s, instrumental). Alone in the night.
//
// The camera pulls back until the page sits in the middle of a dark that runs past every edge: the boy
// is tiny, in the lower third, standing on the film's thread (flat again, a horizon now) and holding
// its end. Then the plate does one thing, twice:
//
//   * A SINGLE INK LINE DRAWS A CONSTELLATION. One continuous stroke leaves his hand, visits eight
//     stars and comes back down to the horizon — and it is DRAWN, not revealed: the pen walks the path
//     as a pure function of `f.t`, and each star turns from a cold dot to a solid `star` as it arrives.
//     No letters anywhere: nothing is sung in this window.
//   * THE LINE IS FOLLOWED BACK, AND BECOMES A ROAD. The pen retraces it to the horizon, and where it
//     lands the same line opens into a wedge of `night2` in two-point perspective, running off the
//     page's foot — the set-up for the thunder clouds of the next plate.
//
// The lantern is far below: one small `lantern` dot whose SIZE is the pulse, once per bar, stepped on
// the drawing clock (`heldT`) — nothing glows. Every flat mass is solid; every wobble is seeded by the
// drawing index `s.d`; nothing is carried between frames.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { pointAtLength, polylineLengths } from '../../../engine/util';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- world layout (sheet px, y down)
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge (as in `open`)
const FOLD_X = 960;                  // the spread's spine
const HORIZON_Y = 886;               // the film's thread, flat again: the night's far edge
const BOY_X = 880;
const HAND: V2 = v2(886, 818);       // his raised hand: the thread's end, and the line's first point
const VP: V2 = v2(880, HORIZON_Y);   // where the line returns — and the road's vanishing point
/** The eight stars the line visits: upper two thirds, well inside the safe area. */
const STARS: V2[] = [
  v2(1006, 726), v2(1168, 664), v2(1288, 548), v2(1194, 428),
  v2(1024, 414), v2(886, 494), v2(712, 452), v2(598, 540),
];
const PATH_CTRL: V2[] = [HAND, ...STARS, VP];

/** Densify a polyline to roughly `step` px — the shape the pen will be asked to draw. */
function densify(pts: V2[], step: number): V2[] {
  const out: V2[] = [pts[0]!];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(v2(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n)));
  }
  return out;
}

export default class Sky extends InkedScene {
  /** The constellation, densified once: the pen walks this array and the drawn slice is its head. */
  private path = densify(PATH_CTRL, 13);
  private pathL = polylineLengths(this.path);
  private total = this.pathL[this.pathL.length - 1]!;
  /** Arc length at which the pen reaches each of the eight stars (they light as it arrives). */
  private starAt: number[] = (() => {
    const out: number[] = [];
    let run = 0;
    for (let i = 0; i < STARS.length; i++) {
      const a = i === 0 ? HAND : STARS[i - 1]!;
      const b = STARS[i]!;
      run += Math.hypot(b.x - a.x, b.y - a.y);
      out.push(run);
    }
    return out;
  })();

  /** The field: fixed points. The bright ones are solid `star`, the small far ones solid `cool`. */
  private field = Array.from({ length: 52 }, (_, i) => ({
    x: lerp(120, 1800, hash(i, 101)),
    y: lerp(120, 940, hash(i, 103)),
    r: lerp(1.9, 4.4, hash(i, 107)),
  }));

  draw(s: Sheet, f: Frame): PostOverrides {
    const au = this.ctx.audio;
    const t = f.t, d = s.d, t0 = this.ctx.start;
    const ht = heldT(t);

    // the wide: the camera pulls back until the page is an island in the dark, and then holds
    const z = lerp(1.02, 0.84, ease.inOutCubic(prog(t, t0, t0 + 5.2)));
    s.setCam(W / 2, H / 2 + 10, z, 0.004 * noise1(ht * 0.21, 17));

    // movement 2: the line is drawn (0 → 1 of its length) … and movement 4: the pen walks it back
    const pDraw = prog(t, t0 + 1.5, t0 + 6.3);
    const pBack = prog(t, t0 + 7.1, t0 + 8.8);
    const pRoad = prog(t, t0 + 8.1, t0 + 9.8);
    const hzP = prog(t, t0 + 7.6, t0 + 9.4);
    const penU = pBack > 0 ? 1 - pBack : pDraw;
    const penOn = (pDraw > 0 && pDraw < 1) || (pBack > 0 && pBack < 1);

    // the lantern far below: one dot, biggest on the downbeat
    const barT = au.downbeats[Math.floor(au.barAt(t))] ?? t;
    const lit = 1 - 0.4 * clamp((ht - barT) / 1.9);

    // ---- draw order: the night, the field, the far edge, the road, the line, the figures, the page
    this.flood(s);
    this.stars(s, d);
    this.horizon(s, hzP);
    this.road(s, pRoad);
    this.line(s, pDraw);
    this.constellation(s, d, pDraw);
    this.boy(s);
    this.lantern(s, d, 628, 958, lit);
    if (penOn) this.pen(s, penU);
    this.furniture(s);
    return CEL.flat;
  }

  // ------------------------------------------------------------------ the page
  /** The night: one flat mass over the whole page and past it (the wide shot must not find its edge). */
  private flood(s: Sheet) {
    s.fill([v2(-420, -260), v2(2340, -260), v2(2340, 1340), v2(-420, 1340)], 1, rgba('night'));
  }

  /** Furniture, drawn last so it stays crisp: the page's edge, its crease, the fold down the spine. */
  private furniture(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.4, color: rgba('star', 0.24), amp: 1.6, taper: false, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 2, color: rgba('graphite', 0.45), amp: 1.6, taper: false });
    s.stroke([v2(FOLD_X, FRAME[1] + 18), v2(FOLD_X, FRAME[3] - 18)], 4, { w: 2, color: rgba('graphite', 0.3), taper: false, overshoot: 8 });
  }

  // ------------------------------------------------------------------ the sky
  /** The field: solid dots, twinkling on the drawing clock — size, never alpha. */
  private stars(s: Sheet, d: number) {
    for (let i = 0; i < this.field.length; i++) {
      const st = this.field[i]!;
      const r = st.r * (0.9 + 0.2 * hash(i, d));
      this.dot(s, st.x, st.y, r, 100 + i, r > 3.4 ? rgba('star', 0.95) : rgba('cool', 1));
    }
  }

  /** The night's far edge: the film's thread flat again, lit as the road arrives on it. */
  private horizon(s: Sheet, hzP: number) {
    const pts: V2[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = lerp(150, 1770, i / 40);
      pts.push(v2(x, HORIZON_Y + Math.sin(i * 0.2) * 5 + (hash(i * 3.1, 9) - 0.5) * 4));
    }
    s.stroke(pts, 11, { w: 2, color: rgba('star', 0.1 + 0.32 * hzP), taper: false, overshoot: 10 });
  }

  /** The road: the same line in two-point perspective, opening from the vanishing point down the page. */
  private road(s: Sheet, p: number) {
    if (p <= 0) return;
    const halfW = lerp(3, 142, p);
    const yEnd = lerp(VP.y + 8, FRAME[3], p); // it runs to the page's own foot, where the frame is
    const w: V2[] = [v2(VP.x - 3, VP.y), v2(VP.x + 3, VP.y), v2(VP.x + halfW, yEnd), v2(VP.x - halfW, yEnd)];
    s.fill(w, 700, rgba('night2', 0.95), { amp: 2.2 });
    // the kerbs: light and thin, so they never dominate the mass
    s.stroke([v2(VP.x + 3, VP.y), v2(VP.x + halfW, yEnd)], 701, { w: 2, color: rgba('star', 0.28), taper: false });
    s.stroke([v2(VP.x - 3, VP.y), v2(VP.x - halfW, yEnd)], 702, { w: 2, color: rgba('star', 0.28), taper: false });
  }

  /** The line: one continuous stroke, from the hand around the eight stars and back to the horizon. */
  private line(s: Sheet, p: number) {
    if (p <= 0) return;
    const n = Math.max(2, Math.min(this.path.length, Math.round(this.path.length * p)));
    s.stroke(this.path.slice(0, n), 30, { w: 2.6, color: rgba('star', 0.9), taper: false });
  }

  /** The eight stars: cold dots until the pen arrives, then solid `star` and bigger. */
  private constellation(s: Sheet, d: number, p: number) {
    for (let i = 0; i < STARS.length; i++) {
      const st = STARS[i]!;
      const lit = clamp((p * this.total - (this.starAt[i]! - 26)) / 42);
      const r = lerp(3.5, 7.4 + 2.6 * hash(i, 5), lit) * (0.92 + 0.16 * hash(i, d));
      this.star4(s, st.x, st.y, r, 500 + i, lit > 0.04 ? rgba('star', 0.96) : rgba('cool', 1));
    }
  }

  // ------------------------------------------------------------------ the boy, the lantern, the pen
  /** The boy: tiny, on the horizon, holding the thread's end. Two flat masses, five strokes, no face. */
  private boy(s: Sheet) {
    const bx = BOY_X, fy = HORIZON_Y;
    const hipY = fy - 22, shY = fy - 42;
    const body: V2[] = [v2(bx - 6, shY), v2(bx + 6, shY), v2(bx + 5, hipY), v2(bx - 5, hipY)];
    s.fill(body, 401, rgba('night2', 0.95));
    s.stroke(body, 401, { closed: true, w: 3.2, color: rgba('star', 0.92) });
    s.blob(bx, shY - 11, 8.5, 402, { colour: rgba('night2', 0.95), fillA: 1, n: 12, jag: 0.1, outline: { w: 3.2, color: rgba('star', 0.92) } });
    // the raised arm holds the thread's end at HAND; the other hangs
    s.stroke([v2(bx + 5, shY + 1), v2(bx + 16, shY - 12), v2(HAND.x, HAND.y)], 411, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(bx - 5, shY + 1), v2(bx - 12, shY + 14), v2(bx - 11, fy - 26)], 412, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(bx - 4, hipY), v2(bx - 10, fy - 6), v2(bx - 13, fy)], 413, { w: 3.2, color: rgba('star', 0.88) });
    s.stroke([v2(bx + 4, hipY), v2(bx + 11, fy - 6), v2(bx + 14, fy)], 414, { w: 3.2, color: rgba('star', 0.88) });
    // the last of the thread, hanging free from his fist — the end he is holding (it swings clear of
    // his head, which is directly under the raised hand)
    s.stroke([v2(HAND.x, HAND.y), v2(HAND.x + 26, HAND.y + 22), v2(HAND.x + 38, HAND.y + 46)], 421, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(HAND.x + 38, HAND.y + 46), v2(HAND.x + 46, HAND.y + 54)], 422, { w: 2.4, color: rgba('star', 0.7) });
  }

  /** The lantern far below: one solid dot, its size the pulse — nothing here glows. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    const flick = 0.9 + 0.2 * hash(0, d);
    this.dot(s, x, y, 5.4 + 3.4 * lit * flick, 51, rgba('lantern', 0.96));
    this.dot(s, x, y, 2.4 * lit, 52, rgba('star', 0.95));
  }

  /** The pen: the moving nib that draws the line and then walks it back (a lantern tick, as in `open`). */
  private pen(s: Sheet, u: number) {
    const q = pointAtLength(this.path, this.pathL, clamp(u) * this.total);
    this.dot(s, q.x, q.y, 4.2, 61, rgba('lantern', 0.95));
    s.stroke([v2(q.x - 3, q.y - 14), v2(q.x + 1, q.y - 2)], 62, { w: 3.2, color: rgba('lantern', 0.9) });
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

/*!plate
{
  "id": "climb",
  "window": [59.0997, 68.6235],
  "device": "riding",
  "staging": "instrument",
  "typePx": 0,
  "bands": [
    { "name": "sky",  "y": [96, 686] },
    { "name": "tear", "y": [688, 732] },
    { "name": "page", "y": [734, 1018] }
  ],
  "movements": [
    { "at": 59.0997, "camera": "wide-hold" },
    { "at": 60.0521, "camera": "punch-in" },
    { "at": 61.4807, "camera": "tilt-up" },
    { "at": 62.4330, "camera": "orbit-right" },
    { "at": 63.8616, "camera": "orbit-left" },
    { "at": 65.2902, "camera": "crane-up" },
    { "at": 66.2426, "camera": "drift-back" },
    { "at": 67.6711, "camera": "reach-out-of-frame" }
  ]
}
*/
// Plate 7 — `climb` (59.0997 → 68.6235 s, instrumental, night). The drop, climbed.
//
// The plate before this one tore the page open along the horizon and the night came through; this one
// spends the whole drop inside that night, on the tear. Nothing is sung in this window, so there is no
// `Lyrics` import and not one letter: the words come back two plates later.
//
// Contract of this re-shoot (the reference plate is `open.ts`):
//   * `03-animation.md §2` — the camera IS the cut: the eight movements below are eight camera
//     sub-shots, whipped into with `ease.outExpo`, each with its own roll and a kick-driven zoom, plus
//     a drawing-clock drift so even a held shot breathes.
//   * `03-animation.md §3` — a new composition every 1.1–1.5 s: eight movements, mean gap 1.22 s,
//     and the drawing keeps moving inside every one — the climb steps on the beat, the tear on the bar,
//     the strips fall in pairs on the downbeats.
//   * `04-plates.md §1` — this plate has its own world: the torn page as a cliff, with the opening
//     plate's horizon stood on its end as the thread he climbs (device: **riding**, the same device the
//     horizon is ridden with in `open`). Its language is the tear; no other plate has one.
//
// Movements, cut on the sub-shot beats (the tear and the strips also cut on the bar grid). The brief's
// five beats are here as eight movements, because §3's density rule (a new composition every 1.1–1.5 s)
// will not fit five into 9.52 s: brief 1 (the tear widens) = 1–2, brief 2 (he climbs) = 3–4, brief 3
// (the camera orbits him past the strips) = 4–5, brief 4 (the strips fall in pairs) = 5–7, brief 5
// (the reach out of frame) = 8.
//   1  59.100  WIDE-HOLD    the tear and the boy at its lip; the slit widens to its 44 px gape.
//   2  60.052  PUNCH-IN     the tear is open, its fibres flutter across the gap, and the thread is
//                           drawn from the tear to the top of the page.
//   3  61.481  TILT-UP      he starts up the thread: a step per beat, one reach per bar.
//   4  62.433  ORBIT-RIGHT  the camera swings right past him as the page's edge steps down a bar.
//   5  63.862  ORBIT-LEFT   and back left: two torn strips leave the page on every downbeat.
//   6  65.290  CRANE-UP      the strips fall past him; the stars he has passed swell as he nears them.
//   7  66.243  DRIFT-BACK   the last steps, the page a sliver at the foot.
//   8  67.671  REACH-OUT-OF-FRAME  his high arm comes off the thread and leaves through the top edge.
//
// BANDS (sheet px, y down; the manifest's three y-strata are these four things seen as horizontal
// strips). The boy, the thread, the stars and the paper each keep to their own band:
//   * STAR BAND   x ∈ [96, 784] ∪ [976, 1824] — the sky. Stars keep 96 px clear of the thread, and are
//                 drawn before the paper, so the page hides any they have not passed. y ∈ [128, 682].
//   * THREAD COLUMN x ∈ [858, 902] — the line of light, its fray where it leaves the frame, and the
//                 lantern at its foot (the one thing that straddles the tear it stands on).
//   * BOY BAND    x ∈ [832, 928], y ∈ [96, 686] — his whole drawing: he never drops below the tear.
//                 The one exception is movement 8's reach, which leaves through the top edge on purpose.
//   * PAPER BAND  y ∈ [734, 1018] — the page (the cliff), its torn lip, its score lines and the strips
//                 that leave it; the strips spawn outside the boy band and drift only further outward,
//                 so nothing ever falls through him. The paper's mass and the strips run off the page's
//                 foot (they are cut by the frame, not by the band).
//   The thread itself runs from the tear to the top of the page, so it crosses all three strata — by
//   design: it is the thing being climbed.
//
// Deterministic: every wobble is seeded by the drawing index `s.d` and every flicker by `hash(i, d)`;
// the climb steps on the beat grid and the tear on the bar grid; no state, no history, CEL.flat.
import { InkedScene, Sheet, rgba, v2, W, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ the world (sheet px, y down)
/** The book's page edge — the same furniture as `open`, so every plate is the same book. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const FOLD_X = 960;
/** The thread: the opening plate's horizon stood on its end, and the column the boy climbs. */
const THREAD_X = 880, THREAD_TOP = 132;
/** The torn edge: it starts just under his feet and steps off the page in four bars (53 px a bar). */
const Y_TEAR0 = 690, Y_TEAR1 = 902;
/** His feet at the first beat, and after the last step (15 steps of 32 px); his head stays in the safe
 *  area until the reach of movement 5, which leaves through the top edge on purpose. */
const FEET0 = 668, FEET1 = 186, STEPS = 15;
/** The bands the four things live in (stated in the head comment): the stars, the thread, the boy, the page. */
const T_BAND = [858, 902], BOY_BAND = [832, 928];
/** The tear's gape: it widens to this in movement 1 and holds. */
const GAPE = 44;

/**
 * Camera sub-shots — absolute `(cx, cy, zoom, roll)`, whipped between with `outExpo`. The targets are
 * placed where the boy will be when the shot takes effect, so he is always in frame but never pinned:
 * inside a shot the framing drifts and he climbs through it.
 */
const SHOT: [number, number, number, number][] = [
  [960, 700, 1.10, -0.020],  // 1 the tear and the boy at its lip
  [930, 660, 1.14, 0.024],   // 2 the first step
  [990, 610, 1.20, -0.030],  // 3 rising
  [1052, 540, 1.16, 0.034],  // 4 the orbit, swung right
  [852, 470, 1.12, -0.044],  // 5 the orbit, swung left
  [1012, 300, 1.22, 0.026],  // 6 the strips fall past him
  [900, 250, 1.14, -0.020],  // 7 the last steps
  [966, 285, 1.12, 0.006],   // 8 the reach: the top edge is just above his hand
];
/** The beat (counted from this window's first beat) each sub-shot takes effect on — ≈1.19 s apart. */
const SHOT_AT = [0, 2, 5, 7, 10, 13, 15, 18];

// ------------------------------------------------------------------ cached flat shapes (cost rule)
/** A unit hexagon and a unit four-point star: the only star geometry, mapped per frame, never remade. */
const UNIT6: V2[] = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU; return v2(Math.cos(a), Math.sin(a)); });
const UNIT4: V2[] = (() => {
  const out: V2[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU - Math.PI / 2, b = a + TAU / 8;
    out.push(v2(Math.cos(a), Math.sin(a)), v2(Math.cos(b) * 0.3, Math.sin(b) * 0.3));
  }
  return out;
})();

interface Star { x: number; y: number; r: number }
interface Strip { bar: number; x: number; w: number; tRel: number; fall: number; dx: number; rot: number; light: boolean }

export default class Climb extends InkedScene {
  private readonly au = this.ctx.audio;
  /** 59.10 is a downbeat, so bar `bar0` is this window's first movement and beat `beat0` its first beat. */
  private readonly bar0 = Math.max(0, Math.floor(this.ctx.audio.barAt(this.ctx.start)));
  private readonly beat0 = Math.floor(this.ctx.audio.beatAt(this.ctx.start));
  /** The sky: fixed points, the low ones nearer. x is mapped into the two star bands, clear of the thread. */
  private readonly stars: Star[] = Array.from({ length: 40 }, (_, i) => {
    const u = hash(i, 7) * 1536;
    return { x: u < 688 ? 96 + u : 976 + (u - 688), y: lerp(128, 672, hash(i, 13)), r: lerp(3.0, 6.4, hash(i, 19)) };
  });
  /** Two strips leave the tear on each of the four downbeats; both spawn clear of the boy band. */
  private readonly strips: Strip[] = Array.from({ length: 8 }, (_, j) => {
    const db = this.ctx.audio.downbeats;
    const bar = 1 + Math.floor(j / 2);
    const tRel = (db[this.bar0 + bar] ?? this.ctx.start) + 0.07 * hash(j, 29);
    const u = hash(j, 17);
    let x = u < 0.42 ? lerp(164, 760, u / 0.42) : lerp(1000, 1756, (u - 0.42) / 0.58);
    if (x > BOY_BAND[0]! && x < BOY_BAND[1]!) x = x < THREAD_X ? BOY_BAND[0]! - 44 : BOY_BAND[1]! + 44;
    return {
      bar, tRel, x,
      w: 58 + 66 * hash(j, 23), fall: 300 + 180 * hash(j, 59),
      dx: (hash(j, 53) - 0.5) * 130, rot: (hash(j, 61) - 0.5) * 1.8, light: hash(j, 71) < 0.5,
    };
  });

  draw(s: Sheet, f: Frame): PostOverrides {
    const au = this.au, t = f.t, d = s.d, t0 = this.ctx.start;
    const db = au.downbeats;
    const m = [t0, db[this.bar0 + 1] ?? t0 + 1.9, db[this.bar0 + 2] ?? t0 + 3.8, db[this.bar0 + 3] ?? t0 + 5.7,
      db[this.bar0 + 4] ?? t0 + 7.6, this.ctx.end];
    // the movement is the bar (the tear, the strips and the camera all cut on it)
    const mk = clamp(Math.floor(au.barAt(t)) - this.bar0, 0, 4);

    // the climb: 15 beat-steps from the second bar line to the window's last beat, half a beat each
    const bi = Math.floor(au.beatAt(t)) - this.beat0;
    const n = clamp(bi - 4, 0, STEPS);
    const rise = ease.outCubic(clamp(clamp(au.beatAt(t) - this.beat0 - 4 - n) * 1.9));
    const fy = lerp(FEET0, FEET1, (n + rise) / STEPS);
    const bx = THREAD_X + (n > 0 ? (Math.floor(n / 4) % 2 === 0 ? 24 : -24) : 0);
    const reach = prog(t, m[4]! + 0.2, m[4]! + 1.6, ease.outCubic);

    // the tear: a gape that opens in movement 1, and an edge that steps down one bar at a time
    const tearY = lerp(Y_TEAR0, Y_TEAR1, mk / 4);
    const gape = GAPE * prog(t, t0 + 0.06, t0 + 1.05, ease.outCubic);
    const paperTop = tearY + gape;

    // the lantern at the thread's foot: brightest on the downbeat, held that way (never a glow)
    const barT = db[Math.floor(au.barAt(t))] ?? t;
    const ht = heldT(t);
    const lit = 1 - 0.4 * clamp((ht - barT) / 1.9);

    this.shot(s, t, bi);
    // draw order: night, sky, the page, what leaves it, the tear, the thread, the lamp, the boy, the book
    this.flood(s);
    this.starfield(s, d, fy);
    this.paper(s, d, paperTop);
    this.dropStrips(s, t, mk);
    this.tear(s, d, t, tearY, gape, paperTop);
    this.thread(s, d, Math.min(paperTop + 6, 1048));
    this.lantern(s, d, THREAD_X, Math.min(paperTop - 16, 992), lit);
    this.boy(s, d, bx, fy, n, reach);
    this.furniture(s, d);
    return CEL.flat;
  }

  /** The shot index for a beat index: the last sub-shot whose beat has arrived. */
  private si(bi: number): number {
    let k = 0;
    for (let i = 0; i < SHOT_AT.length; i++) if (bi >= SHOT_AT[i]!) k = i;
    return k;
  }

  /** Hold the shot; whip into the next one with outExpo (a cut, not a drift) plus a kick-driven zoom. */
  private shot(s: Sheet, t: number, bi: number) {
    const i = this.si(bi);
    const A = SHOT[Math.max(0, i - 1)]!, B = SHOT[i]!;
    const bT = this.au.timeOfBeat(this.beat0 + SHOT_AT[i]!);
    const w = clamp(prog(t, bT - 0.14, bT + 0.30, ease.outExpo));
    const kick = Math.max(0, 1 - (this.au.beatAt(t) % 1) * 3);
    const dr = noise1(heldT(t) * 0.30, 17 + i);
    s.setCam(
      lerp(A[0], B[0], w) + 5 * dr,
      lerp(A[1], B[1], w) + 4 * noise1(heldT(t) * 0.27, 23 + i),
      lerp(A[2], B[2], w) * (1 + 0.028 * kick),
      lerp(A[3], B[3], w) + 0.003 * dr,
    );
  }

  // ------------------------------------------------------------------ the page
  /** The night: one flat mass over the whole page and past it, so no camera ever finds its edge. */
  private flood(s: Sheet) {
    s.fill([v2(-380, -240), v2(2300, -240), v2(2300, 1320), v2(-380, 1320)], 1, rgba('night'));
  }

  /** Furniture, drawn last so it stays crisp: the page's edge, its crease, the fold down the spine. */
  private furniture(s: Sheet, d: number) {
    void d;
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.4, color: rgba('star', 0.24), amp: 1.6, taper: false, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 2, color: rgba('graphite', 0.45), amp: 1.6, taper: false });
    s.stroke([v2(FOLD_X, FRAME[1] + 18), v2(FOLD_X, FRAME[3] - 18)], 4, { w: 2, color: rgba('graphite', 0.3), taper: false, overshoot: 8 });
    s.text('vii.', 176, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  // ------------------------------------------------------------------ the sky
  /** The stars, and the ones he has passed swell: the same dot, nearer. Size, never alpha. */
  private starfield(s: Sheet, d: number, fy: number) {
    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i]!;
      const passed = clamp((st.y - fy) / 300);
      const r = st.r * lerp(0.58, 1.55, passed) * (0.9 + 0.2 * hash(i, d));
      this.star4(s, st.x, st.y, r, 60 + i, r > 4.5 ? rgba('star', 0.97) : rgba('cool', 1));
    }
  }

  // ------------------------------------------------------------------ the page tears
  /** The paper below the tear: the cliff face, scored into the strips that will leave it. */
  private paper(s: Sheet, d: number, topY: number) {
    if (topY > 1120) return;                              // the last bar: what is left is a sliver
    const NB = 40;
    const top: V2[] = [];
    for (let i = 0; i <= NB; i++) {
      const x = lerp(-90, W + 90, i / NB);
      top.push(v2(x, topY + 13 * noise1(i * 1.35 + d * 1.7, 5)));
    }
    // the band bleeds off both sides and off the foot of the page: what is left is an edge, not a slab
    s.fill([...top, v2(W + 90, 1264), v2(-90, 1264)], 41, rgba('paper'), { amp: 2.0 });
    // the torn lip catches what light there is
    s.stroke(top, 42, { w: 2.4, color: rgba('star', 0.34), taper: false });
    // the page is already scored where it will come apart
    for (let i = 1; i < 13; i++) {
      const x = lerp(128, 1796, i / 13);
      s.stroke([v2(x, topY + 14), v2(x, 1214)], 43 + i, { w: 2.4, color: rgba('shade', 0.9), taper: false });
    }
  }

  /** The tear itself: the lit upper strand, and the fibres crossing the gape as it widens. */
  private tear(s: Sheet, d: number, t: number, tearY: number, gape: number, paperTop: number) {
    const N = 48;
    const up: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const x = lerp(140, 1780, i / N);
      up.push(v2(x, tearY + noise1(i * 0.7 + d, 9) * 2 + (hash(i * 3.1, d) - 0.5) * 3));
    }
    s.stroke(up, 21, { w: 2.6, color: rgba('star', 0.42), amp: 1.4, taper: false });
    if (gape <= 4 || paperTop > 1120) return;
    for (let i = 0; i < 16; i++) {
      const x = lerp(170, 1750, (i + 0.5) / 16);
      const fl = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(heldT(t) * 2.2 + i * 1.7));
      s.stroke([v2(x, tearY + 2), v2(x + (hash(i, d) - 0.5) * 24, tearY + 2 + gape * fl)], 30 + i, { w: 1.6, color: rgba('paper2', 0.72), amp: 1.2 });
    }
  }

  /**
   * The strips: flat cel pieces leaving the page, two per downbeat, fluttering and turning as they go.
   * They spawn outside the boy band (see the head comment) and are drawn over the paper they came from.
   */
  private dropStrips(s: Sheet, t: number, mk: number) {
    for (let j = 0; j < this.strips.length; j++) {
      const q = this.strips[j]!;
      if (q.bar > mk + 1) continue;                        // the pairs yet to fall
      const p = t - q.tRel;
      if (p <= 0 || p > 2.8) continue;
      const y = lerp(Y_TEAR0, Y_TEAR1, q.bar / 4) + GAPE + 34 + 0.5 * q.fall * p * p;
      if (y > 1180) continue;
      // they drift outward, away from the boy: a left strip falls left, a right strip right
      const dir = q.x < THREAD_X ? -1 : 1;
      const x = q.x + dir * Math.abs(q.dx) * p + 15 * Math.sin(p * 4.4 + j);
      const sc = clamp(1 - 0.3 * p, 0.55, 1);
      const h = 132 * sc, w = q.w * sc;
      const rot = q.rot * p;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const c = (dx: number, dy: number): V2 => v2(x + dx * cs - dy * sn, y + dx * sn + dy * cs);
      s.fill([c(-w / 2, -h / 2), c(w / 2, -h / 2), c(w / 2, h / 2), c(-w / 2, h / 2)], 200 + j, q.light ? rgba('paper') : rgba('paper2'));
      // a torn lip and a cut edge, so a strip is an object and not a smudge
      s.stroke([c(-w / 2, -h / 2), c(w / 2, -h / 2)], 220 + j, { w: 3.4, color: rgba('shade', 0.95), taper: false, overshoot: 4 });
      s.stroke([c(-w / 2, h / 2), c(w / 2, h / 2)], 230 + j, { w: 2, color: rgba('shade', 0.6), taper: false });
    }
  }

  // ------------------------------------------------------------------ the thread, the lamp, the boy
  /** The thread: the opening plate's horizon stood on its end, running up out of the page. */
  private thread(s: Sheet, d: number, footY: number) {
    void d;
    const N = 20;
    const pts: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(v2(THREAD_X + Math.sin(u * 5.2) * 4 + 5 * noise1(u * 2.6, 5), lerp(THREAD_TOP, footY, u)));
    }
    s.stroke(pts, 22, { w: 9, color: rgba('cool', 0.55), taper: false });
    s.stroke(pts, 21, { w: 3.4, color: rgba('star', 0.96) });
    // the fray where the line leaves the frame (kept inside the thread column)
    for (let i = 0; i < 3; i++) {
      const side = i - 1;
      s.stroke([v2(THREAD_X, THREAD_TOP + 4), v2(clamp(THREAD_X + side * 9, T_BAND[0]!, T_BAND[1]!), THREAD_TOP - 18 - i * 6)], 24 + i, { w: 1.6, color: rgba('star', 0.55) });
    }
  }

  /** The lantern at the thread's foot: a small solid signal, its size the pulse, never a glow. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    const flick = 0.94 + 0.12 * hash(0, d);
    const body: V2[] = [v2(x - 13, y - 22), v2(x + 13, y - 22), v2(x + 16, y), v2(x - 16, y)];
    s.fill(body, 51, rgba('lantern', 0.96));
    s.stroke(body, 51, { closed: true, w: 3.2, color: rgba('lantern', 0.96) });
    s.stroke([v2(x - 9, y - 22), v2(x, y - 42), v2(x + 9, y - 22)], 52, { w: 3.2, color: rgba('lantern', 0.9) });
    this.star4(s, x, y - 11, 6.4 * lit * flick, 53, rgba('star', 0.95));
  }

  /**
   * The boy: two flat masses and a handful of strokes, no face. He steps one beat at a time (a step per
   * beat, 2 beats per hand → one reach per bar); in the last movement the high arm comes off the thread
   * and goes up out of the frame.
   */
  private boy(s: Sheet, d: number, bx: number, fy: number, n: number, reach: number) {
    void d;
    const hipY = fy - 26, shY = fy - 56, headY = fy - 76;
    const hp = Math.floor(n / 2) % 2;                     // which hand is the high one (2-beat steps)
    const body: V2[] = [v2(bx - 8, shY), v2(bx + 8, shY), v2(bx + 7, hipY), v2(bx - 7, hipY)];
    s.fill(body, 301, rgba('night2', 0.95));
    s.stroke(body, 301, { closed: true, w: 3.2, color: rgba('star', 0.92) });
    s.blob(bx, headY, 10, 302, { colour: rgba('night2', 0.95), fillA: 1, n: 12, jag: 0.1, outline: { w: 3.2, color: rgba('star', 0.92) } });
    // both hands grip the thread, one above the other
    const hiY = shY - 30, loY = shY - 2;
    const hiSide = hp === 0 ? 1 : -1;
    const hiFrom = v2(bx + hiSide * 8, shY + 1), loFrom = v2(bx - hiSide * 8, shY + 1);
    const handY = lerp(hiY, -300, reach);                 // movement 5: the hand leaves the frame
    s.stroke([hiFrom, v2(lerp(hiFrom.x, THREAD_X, 0.5) + hiSide * (16 - 6 * reach), (hiFrom.y + handY) / 2), v2(THREAD_X + hiSide * 10 * reach, handY)], 311, { w: 3.2, color: rgba('star', 0.92) });
    s.stroke([loFrom, v2(lerp(loFrom.x, THREAD_X, 0.5) - hiSide * 16, (loFrom.y + loY) / 2), v2(THREAD_X, loY)], 312, { w: 3.2, color: rgba('star', 0.9) });
    // the legs: the beat he is on lifts one foot
    const kick = n % 2 === 0 ? 1 : 0;
    s.stroke([v2(bx - 5, hipY), v2(bx - 13, fy - 7 - kick * 5), v2(bx - 16, fy - kick * 10)], 313, { w: 3.2, color: rgba('star', 0.88) });
    s.stroke([v2(bx + 5, hipY), v2(bx + 14, fy - 7 - (1 - kick) * 5), v2(bx + 17, fy - (1 - kick) * 10)], 314, { w: 3.2, color: rgba('star', 0.88) });
  }

  // ------------------------------------------------------------------ the star (a cached flat shape)
  /** A star: a solid dot, with four short rays once it is big enough to carry them. */
  private star4(s: Sheet, x: number, y: number, r: number, seed: number, colour: string) {
    const src = r < 4.4 ? UNIT6 : UNIT4;
    const pts: V2[] = [];
    for (let i = 0; i < src.length; i++) { const p = src[i]!; pts.push(v2(x + p.x * r, y + p.y * r)); }
    s.fill(pts, seed, colour, { amp: Math.max(0.5, r * 0.13) });
  }
}

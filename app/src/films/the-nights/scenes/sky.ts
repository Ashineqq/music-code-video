/*!plate
{
  "id": "sky",
  "window": [68.6235, 78.6235],
  "device": "written",
  "staging": "instrument",
  "typePx": 0,
  "bands": [
    { "name": "sky",     "y": [96, 796] },
    { "name": "horizon", "y": [798, 916] },
    { "name": "road",    "y": [918, 1040] }
  ],
  "movements": [
    { "at": 68.6235, "camera": "wide-hold" },
    { "at": 70.0521, "camera": "punch-in" },
    { "at": 71.0045, "camera": "tilt-up" },
    { "at": 72.4330, "camera": "roll-in" },
    { "at": 73.3854, "camera": "orbit-half" },
    { "at": 74.3378, "camera": "level-out" },
    { "at": 75.7664, "camera": "drift-back" },
    { "at": 76.7188, "camera": "crane-out" },
    { "at": 78.1473, "camera": "pull-out" }
  ]
}
*/
// Plate 8 — `sky` (68.6235 → 78.6235 s, instrumental, night). The night the drop climbed into, drawn on.
//
// Nothing is sung in this window, so there is no `Lyrics` import and not one letter. The plate does one
// thing, twice: a single ink line draws a constellation above the boy, and the same line is then walked
// back — and what it was drawing all along is a figure.
//
// Contract of this re-shoot (the reference plate is `open.ts`):
//   * `03-animation.md §2` — the camera IS the cut: the nine movements below are nine camera sub-shots,
//     whipped into with `ease.outExpo`, each with its own roll and a kick-driven zoom, plus a
//     drawing-clock drift. Movement 5 is the camera itself becoming the subject: the roll sweeps
//     −0.52 → 0 while the centre stays pinned to the figure's centre, which is exactly an ORBIT around
//     it, and the constellation stands up as a figure.
//   * `03-animation.md §3` — a new composition every 1.1–1.5 s: nine movements, mean gap 1.19 s, with
//     the pen drawing, the field twinkling and the boy always in frame inside each shot.
//   * `04-plates.md §1` — this plate's own world: the film's thread gone flat as a horizon, a boy who is
//     one small dot on it, and a star line that is also a person. Device: **written** — the pen draws
//     the line the way `open`'s nib draws the land. Only the horizon and the page's edge are shared
//     (the film's furniture); the constellation is this plate's alone.
//
// Movements, cut on the sub-shot beats (68.62 opens on a downbeat). The brief's five beats are here as
// nine movements for §3's density rule (a new composition every 1.1–1.5 s): brief 1 (wide night, the
// boy tiny with the thread's end) = 1–2, brief 2 (the line draws star to star, each igniting as the pen
// arrives) = 3–4, brief 3 (the camera orbits/rolls to reveal the line as a figure) = 4–6, brief 4 (the
// line retraces) = 7, brief 5 (the retrace opens as a road wedge to the horizon) = 8–9.
//   1  68.624  WIDE-HOLD   the camera pulls back until the page is an island in the dark; the boy is
//                          tiny on the horizon with the thread's end in his fist.
//   2  70.052  PUNCH-IN    the pen begins: one continuous stroke leaves his hand and visits the stars.
//   3  71.005  TILT-UP     star after star ignites as the pen arrives.
//   4  72.433  ROLL-IN     the roll starts to turn; the last star is drawn.
//   5  73.385  ORBIT-HALF  the camera is half-way round the line's centre.
//   6  74.338  LEVEL-OUT   the frame is level and the line is upright: a figure.
//   7  75.766  DRIFT-BACK  the pen walks the line back; the stars go cold one by one.
//   8  76.719  CRANE-OUT   the retrace lands on the horizon and the wedge opens.
//   9  78.147  PULL-OUT    the road runs out of the page's foot, with the boy at its vanishing point.
//
// BANDS (sheet px, y down; the manifest's three y-strata — one small thing per stratum):
//   * SKY BAND      y ∈ [96, 796] — the far field (y ≤ 792) and the constellation / figure it becomes
//                   (x ∈ [980, 1260], y ∈ [330, 780]); the field keeps 46 px clear of the figure's own
//                   rectangle, so the constellation reads against clean sky.
//   * HORIZON BAND  y ∈ [798, 916] — the film's thread gone flat, the boy standing on it (x ∈
//                   [836, 944]) and his raised fist holding the thread's end.
//   * ROAD BAND     y ∈ [918, 1040] — the wedge opened at the vanishing point, running out of the
//                   page's foot, and the lantern beside it.
//   The one line crosses all three, by design: it is drawn from the horizon up into the sky.
//
// Cost: the star shapes are two cached unit polygons mapped per frame; the constellation is ONE fixed
// densified path (plus its own arc lengths, computed once) sliced by `prog`; no geometry is rebuilt.
// Deterministic: every wobble is seeded by `s.d` and every twinkle by `hash(i, d)`; the movements cut on
// the shot beats; no state, no history; CEL.flat.
import { InkedScene, Sheet, rgba, v2, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { pointAtLength, polylineLengths } from '../../../engine/util';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ the world (sheet px, y down)
/** The book's page edge — the same furniture as `open`, so every plate is the same book. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const FOLD_X = 960;
/** The film's thread, flat again: the night's far edge, and where the road's vanishing point sits. */
const HORIZON_Y = 906;
const BOY_X = 880;
const VP: V2 = v2(880, 918);              // the line's first point — and the road's vanishing point
const HAND: V2 = v2(892, 806);            // his raised fist: the line's last point
/**
 * The eight stars, in the order the pen visits them. Read as a constellation they are a zigzag; read
 * upright (movement 3) the same eight joints are a figure: left foot → hips → right foot → right hand →
 * right shoulder → head → left shoulder → left hand.
 */
const JOINTS: V2[] = [
  v2(1064, 762), v2(1122, 618), v2(1178, 762), v2(1244, 540),
  v2(1186, 428), v2(1120, 344), v2(1054, 428), v2(996, 540),
];
/** The figure's centre: the camera orbits this, which is what makes the roll a reveal. */
const FIG: V2 = v2(1120, 520);
/** Every point the one stroke passes through, from the horizon to his fist. Densified once, below. */
const PATH_CTRL: V2[] = [VP, ...JOINTS, HAND];
/** The figure's own rectangle, kept clear of the far field (see BANDS in the head comment). */
const FIG_BOX = [980, 330, 1260, 780];

/**
 * Camera sub-shots — absolute `(cx, cy, zoom, roll)` in SHEET space (the shot helper turns the target
 * into the rotated space the camera wants, so pinning a target while the roll changes is an orbit).
 */
const SHOT: [number, number, number, number][] = [
  [1080, 620, 0.92, -0.55],  // 1 the wide night
  [1100, 604, 0.96, -0.55],  // 2 the boy and the thread's end
  [1110, 568, 1.00, -0.55],  // 3 the pen begins
  [1120, 522, 1.04, -0.52],  // 4 the last star is drawn
  [1120, 520, 1.07, -0.26],  // 5 the orbit: the roll is half-way round
  [1120, 520, 1.05, 0.00],   // 6 the figure, upright
  [1110, 528, 1.02, 0.00],   // 7 the retrace
  [1060, 600, 0.98, 0.00],   // 8 the road opens
  [1000, 620, 0.95, 0.00],   // 9 the road to the horizon
];
/** The beat (counted from this window's first beat) each sub-shot takes effect on — ≈1.11 s apart. */
const SHOT_AT = [0, 3, 5, 8, 10, 12, 15, 17, 20];

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

/** Densify a polyline to roughly `step` px — the shape the pen is asked to draw, made once. */
function densify(pts: V2[], step: number): V2[] {
  const out: V2[] = [pts[0]!];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(v2(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n)));
  }
  return out;
}

interface Star { x: number; y: number; r: number }

export default class Sky extends InkedScene {
  private readonly au = this.ctx.audio;
  private readonly beat0 = Math.floor(this.ctx.audio.beatAt(this.ctx.start));
  /** The constellation: densified once; the pen walks it and the drawn slice is its head. */
  private readonly path = densify(PATH_CTRL, 13);
  private readonly pathL = polylineLengths(this.path);
  private readonly total = this.pathL[this.pathL.length - 1]!;
  /** Arc length at which the pen reaches each of the eight stars (they light as it arrives). */
  private readonly jointAt: number[] = (() => {
    const out: number[] = [];
    let run = 0;
    for (let i = 0; i < JOINTS.length; i++) {
      const a = i === 0 ? VP : JOINTS[i - 1]!, b = JOINTS[i]!;
      run += Math.hypot(b.x - a.x, b.y - a.y);
      out.push(run);
    }
    return out;
  })();
  /**
   * The far field: fixed points, the bright ones solid `star` and the small far ones solid `cool`. Any
   * that lands in the figure's rectangle is pushed out of it, so the constellation has clean sky.
   */
  private readonly field: Star[] = Array.from({ length: 52 }, (_, i) => {
    let x = lerp(120, 1800, hash(i, 101));
    const y = lerp(110, 792, hash(i, 103));
    const [bx0, by0, bx1, by1] = FIG_BOX;
    if (x > bx0! - 46 && x < bx1! + 46 && y > by0! - 46 && y < by1! + 46) {
      x = x < FIG.x ? bx0! - 76 - 60 * hash(i, 109) : bx1! + 76 + 60 * hash(i, 109);
    }
    return { x, y, r: lerp(1.9, 4.4, hash(i, 107)) };
  });

  draw(s: Sheet, f: Frame): PostOverrides {
    const au = this.au, t = f.t, d = s.d, t0 = this.ctx.start;
    const db = au.downbeats;
    // movements from the downbeat grid (68.62 opens on one)
    let i0 = db.findIndex((x) => x >= t0 - 0.001);
    if (i0 < 0) i0 = 0;
    const m = [t0, db[i0 + 1] ?? t0 + 1.9, db[i0 + 2] ?? t0 + 3.8, db[i0 + 3] ?? t0 + 5.7, db[i0 + 4] ?? t0 + 7.6, this.ctx.end];
    const mk = t < m[1]! ? 0 : t < m[2]! ? 1 : t < m[3]! ? 2 : t < m[4]! ? 3 : 4;

    const bi = Math.floor(au.beatAt(t)) - this.beat0;
    const pDraw = prog(t, m[1]! + 0.15, m[1]! + 1.45);                 // 2: the pen draws the line
    const pBack = prog(t, m[3]! + 0.12, m[3]! + 1.45);                 // 4: the pen walks it back
    const pRoad = prog(t, m[4]! + 0.30, m[4]! + 1.20, ease.outCubic);  // 5: the wedge opens
    const reveal = prog(t, m[2]! + 0.05, m[2]! + 1.35, ease.inOutCubic); // 3: the figure stands up
    const drawn = clamp(pDraw - pBack);                                // how much of the line is on
    const penOn = (pDraw > 0 && pDraw < 1) || (pBack > 0 && pBack < 1);

    // the lantern, far below on the horizon: one dot, largest on the downbeat (never a glow)
    const barT = db[Math.floor(au.barAt(t))] ?? t;
    const lit = 1 - 0.4 * clamp((heldT(t) - barT) / 1.9);

    this.shot(s, t, bi);
    // draw order: the night, the field, the horizon, the road, the line, its stars, the boy, the page
    this.flood(s);
    this.stars(s, d);
    this.horizon(s, pRoad);
    this.road(s, pRoad);
    this.line(s, drawn, reveal);
    this.joints(s, d, drawn, reveal);
    this.boy(s, t, d);
    this.lantern(s, d, 636, 958, lit);
    if (penOn) this.pen(s, drawn);
    this.furniture(s);
    return CEL.flat;
  }

  /** The shot index for a beat index: the last sub-shot whose beat has arrived. */
  private si(bi: number): number {
    let k = 0;
    for (let i = 0; i < SHOT_AT.length; i++) if (bi >= SHOT_AT[i]!) k = i;
    return k;
  }

  /**
   * Hold the shot; whip into the next with outExpo (a cut, not a drift) plus a kick-driven zoom. The
   * camera centre is in the ROTATED space, so the target is given as `R(roll)·T` — that pins T while
   * the roll changes, which is an orbit about T (movement 3 rides on this).
   */
  private shot(s: Sheet, t: number, bi: number) {
    const i = this.si(bi);
    const A = SHOT[Math.max(0, i - 1)]!, B = SHOT[i]!;
    const bT = this.au.timeOfBeat(this.beat0 + SHOT_AT[i]!);
    const w = clamp(prog(t, bT - 0.16, bT + 0.34, ease.outExpo));
    const kick = Math.max(0, 1 - (this.au.beatAt(t) % 1) * 3);
    const dr = noise1(heldT(t) * 0.30, 31 + i);
    const tx = lerp(A[0], B[0], w), ty = lerp(A[1], B[1], w);
    const roll = lerp(A[3], B[3], w) + 0.003 * dr;
    const z = lerp(A[2], B[2], w) * (1 + 0.026 * kick);
    const cs = Math.cos(roll), sn = Math.sin(roll);
    s.setCam(tx * cs - ty * sn + 4 * dr, tx * sn + ty * cs, z, roll);
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
    s.text('viii.', 176, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  // ------------------------------------------------------------------ the sky
  /** The far field: solid dots, twinkling on the drawing clock — size, never alpha. */
  private stars(s: Sheet, d: number) {
    for (let i = 0; i < this.field.length; i++) {
      const st = this.field[i]!;
      const r = st.r * (0.9 + 0.2 * hash(i, d));
      this.star4(s, st.x, st.y, r, 100 + i, r > 3.4 ? rgba('star', 0.95) : rgba('cool', 1));
    }
  }

  /** The film's thread, flat again: the night's far edge, lighting up as the road arrives on it. */
  private horizon(s: Sheet, hzP: number) {
    const pts: V2[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = lerp(150, 1770, i / 40);
      pts.push(v2(x, HORIZON_Y + Math.sin(i * 0.2) * 5 + (hash(i * 3.1, 9) - 0.5) * 4));
    }
    s.stroke(pts, 11, { w: 2, color: rgba('star', 0.34 + 0.3 * hzP), taper: false, overshoot: 10 });
  }

  /** The road: the same line opened at the vanishing point, a wedge running out of the page's foot. */
  private road(s: Sheet, p: number) {
    if (p <= 0) return;
    const half = lerp(3, 170, ease.outCubic(p));
    const yEnd = lerp(VP.y + 8, FRAME[3] + 22, p);
    s.fill([v2(VP.x - 3, VP.y), v2(VP.x + 3, VP.y), v2(VP.x + half, yEnd), v2(VP.x - half, yEnd)], 700, rgba('night2', 0.95), { amp: 2.2 });
    // the kerbs: light and thin, so they never dominate the mass
    s.stroke([v2(VP.x + 3, VP.y), v2(VP.x + half, yEnd)], 701, { w: 2, color: rgba('star', 0.3), taper: false });
    s.stroke([v2(VP.x - 3, VP.y), v2(VP.x - half, yEnd)], 702, { w: 2, color: rgba('star', 0.3), taper: false });
    // the ties, one per bar, widening toward the viewer: the road is a drawn object, not a gradient
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const yy = lerp(VP.y + 8, yEnd, u), hw = lerp(3, half, u);
      s.stroke([v2(VP.x - hw, yy), v2(VP.x + hw, yy)], 710 + i, { w: 1.4, color: rgba('shade', 0.42), taper: false });
    }
  }

  /** The line: one continuous stroke, from the horizon around the eight stars and up to his fist. */
  private line(s: Sheet, drawn: number, reveal: number) {
    if (drawn <= 0) return;
    const n = clamp(Math.round(this.path.length * drawn), 2, this.path.length);
    s.stroke(this.path.slice(0, n), 30, { w: lerp(2.2, 4.6, reveal), color: rgba('star', lerp(0.7, 0.97, reveal)) });
  }

  /** The drawn slice's head, in arc length — what the stars light against and the pen rides. */
  private head(drawn: number): number {
    const n = clamp(Math.round(this.path.length * drawn), 1, this.path.length);
    return this.pathL[n - 1]!;
  }

  /** The eight stars: cold `cool` dots until the pen arrives, then solid `star`; a ring on the reveal. */
  private joints(s: Sheet, d: number, drawn: number, reveal: number) {
    const visible = drawn > 0.0005;
    const L = visible ? this.head(drawn) : 0;
    for (let i = 0; i < JOINTS.length; i++) {
      const j = JOINTS[i]!;
      const on = visible ? clamp((L - (this.jointAt[i]! - 30)) / 46) : 0;
      const r = lerp(3.4, 7.2 + 2.4 * hash(i, 5), on) * (0.92 + 0.16 * hash(i, d));
      this.star4(s, j.x, j.y, r, 500 + i, on > 0.04 ? rgba('star', 0.96) : rgba('cool', 1));
      // while the figure stands up, the joints become articulate points
      if (reveal > 0.05) s.arc(j.x, j.y, 11 + 5 * (1 - reveal), 0, TAU, 520 + i, { w: 1.3, color: rgba('star', 0.5 * reveal) });
    }
  }

  /** The pen: the moving nib that draws the line out and then walks it back (a lantern tick). */
  private pen(s: Sheet, drawn: number) {
    const q = pointAtLength(this.path, this.pathL, this.head(drawn));
    this.star4(s, q.x, q.y, 4.6, 61, rgba('lantern', 0.97));
    s.stroke([v2(q.x - 3, q.y - 15), v2(q.x + 1, q.y - 2)], 62, { w: 3.2, color: rgba('lantern', 0.9) });
  }

  // ------------------------------------------------------------------ the boy
  /** The boy: tiny on the horizon, holding the thread's end. Two flat masses, five strokes, no face. */
  private boy(s: Sheet, t: number, d: number) {
    const bx = BOY_X, fy = HORIZON_Y;
    const breathe = 1 + 0.035 * noise1(heldT(t) * 0.4, d);
    const hipY = fy - 22 * breathe, shY = fy - 42 * breathe;
    const body: V2[] = [v2(bx - 6, shY), v2(bx + 6, shY), v2(bx + 5, hipY), v2(bx - 5, hipY)];
    s.fill(body, 401, rgba('night2', 0.95));
    s.stroke(body, 401, { closed: true, w: 3.2, color: rgba('star', 0.92) });
    s.blob(bx, shY - 11, 8.5, 402, { colour: rgba('night2', 0.95), fillA: 1, n: 12, jag: 0.1, outline: { w: 3.2, color: rgba('star', 0.92) } });
    // the raised arm holds the thread's end at HAND; the other hangs
    s.stroke([v2(bx + 5, shY + 1), v2(bx + 16, shY - 12), v2(HAND.x, HAND.y)], 411, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(bx - 5, shY + 1), v2(bx - 12, shY + 14), v2(bx - 11, fy - 26)], 412, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(bx - 4, hipY), v2(bx - 10, fy - 6), v2(bx - 13, fy)], 413, { w: 3.2, color: rgba('star', 0.88) });
    s.stroke([v2(bx + 4, hipY), v2(bx + 11, fy - 6), v2(bx + 14, fy)], 414, { w: 3.2, color: rgba('star', 0.88) });
    // the last of the thread, hanging free from his fist
    s.stroke([v2(HAND.x, HAND.y), v2(HAND.x + 26, HAND.y + 22), v2(HAND.x + 38, HAND.y + 46)], 421, { w: 3.2, color: rgba('star', 0.9) });
    s.stroke([v2(HAND.x + 38, HAND.y + 46), v2(HAND.x + 46, HAND.y + 54)], 422, { w: 2.4, color: rgba('star', 0.7) });
  }

  /** The lantern far below on the horizon: one solid dot, its size the pulse — nothing here glows. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    const flick = 0.9 + 0.2 * hash(0, d);
    this.star4(s, x, y, 5.4 + 3.4 * lit * flick, 51, rgba('lantern', 0.96));
    this.star4(s, x, y, 2.4 * lit, 52, rgba('star', 0.95));
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

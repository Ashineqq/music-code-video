// Plate 5 — "'cause the future goes FOOM / Trapped in the Chinese room, / with a bag of shrooms"
//
// One room, drawn in one-point perspective with a ruler: a door, a desk, a slot in the wall, shelves
// of books, a hanging sign. Three moves:
//   1. FOOM — the word lifts off the sign, is hand-lettered as it is sung, and bursts into a branching
//      tree of drawn lines that doubles on every 8th note (1→2→4→…) until the paper is full, about
//      1.6 s after the crack. Its two O's let go as shockwave rings.
//   2. The Chinese room — five shots: one on the FOOM beat, then four down the aisle, each re-projected
//      around a NEW vanishing point so it cuts instead of sliding. The shockwave kicks the door in,
//      cards shoot out of the slot on the kicks (each card carrying a small hand-drawn glyph, since the
//      film's type is Latin-only), and the rulebook riffles on the desk.
//   3. Shrooms — a paper bag lands on the desk, mushrooms grow out of it in six drawn steps while
//      mycelium creeps out over the desk and up the room, SHROOMS lifts off the sign, and the whole
//      drawing wobbles harder for the last second.
// The hanging sign carries the line's words as they are sung, written stroke by stroke.
//
// The treatment's "acid" accent has no counterpart here: this edition is flat cel and the palette has
// no acid, so the mycelium and the late mushrooms are sage — the palette's own vegetable green.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, TAU, heldT, type V2, type InkOpts, type InKey } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- the room
interface Cam { vp: V2; f: number; D: number; camY: number }
const ROOM = { hw: 1.05, top: 1.06, zmax: 0.60, camY: 0.52 };
const ZSIGN = 0.05;
const BAG = { x0: -0.04, x1: 0.30, y0: 0.355, top: 0.60, z0: 0.17, z1: 0.33 };
/** Where a word that leaves the plank ends up, and how big it gets there. */
const LIFT_MARK = { foom: { x: 960, y: 668, s: 168 }, shrooms: { x: 1086, y: 296, s: 86 } };

function proj(c: Cam, x: number, y: number, z: number): V2 {
  const k = c.f / Math.max(0.14, c.D - z);
  return v2(c.vp.x + x * k, c.vp.y - (y - c.camY) * k);
}
const kAt = (c: Cam, z: number) => c.f / Math.max(0.14, c.D - z);

/** The box the whole plate is built in: back wall, floor, ceiling, two walls, and the ruled joins. */
function shell(s: Sheet, c: Cam, seed: number, ampK: number) {
  const X = ROOM.hw, T = ROOM.top, Z = ROOM.zmax;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  // flat cels first: the far wall reads darker than the floor
  s.fill([P(-X, 0, 0), P(X, 0, 0), P(X, T, 0), P(-X, T, 0)], seed, rgba('shade', 0.42), { amp: 2.6 * ampK });
  s.fill([P(-X, 0, 0), P(X, 0, 0), P(X, 0, Z), P(-X, 0, Z)], seed + 1, rgba('paper2', 0.8), { amp: 3.0 * ampK });
  s.fill([P(-X, T, 0), P(X, T, 0), P(X, T, Z), P(-X, T, Z)], seed + 2, rgba('paper2', 0.4), { amp: 3.0 * ampK });
  s.fill([P(-X, 0, 0), P(-X, T, 0), P(-X, T, Z), P(-X, 0, Z)], seed + 3, rgba('shade', 0.2), { amp: 3.0 * ampK });
  s.fill([P(X, 0, 0), P(X, T, 0), P(X, T, Z), P(X, 0, Z)], seed + 4, rgba('shade', 0.2), { amp: 3.0 * ampK });
  s.stroke([P(-X, 0, 0), P(X, 0, 0), P(X, T, 0), P(-X, T, 0)], seed + 5, { closed: true, w: 3.4, amp: 2.4 * ampK });
  // the ruled joins, all of them running to the vanishing point
  const R = (o: InkOpts): InkOpts => ({ w: 3.2, color: rgba('ink2'), amp: 1.7 * ampK, taper: false, overshoot: 9, ...o });
  s.stroke([P(-X, 0, 0), P(-X, 0, Z)], seed + 6, R({}));
  s.stroke([P(X, 0, 0), P(X, 0, Z)], seed + 7, R({}));
  s.stroke([P(-X, T, 0), P(-X, T, Z)], seed + 8, R({}));
  s.stroke([P(X, T, 0), P(X, T, Z)], seed + 9, R({}));
  s.stroke([P(-X, 0, Z), P(-X, T, Z)], seed + 10, R({ amp: 2.6 * ampK }));
  s.stroke([P(X, 0, Z), P(X, T, Z)], seed + 11, R({ amp: 2.6 * ampK }));
  // floorboards, running away from us
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.42;
    s.stroke([P(x, 0, 0.02), P(x, 0, Z)], seed + 20 + i, { w: 1.6, color: rgba('graphite', 0.45), amp: 1.8 * ampK, taper: false });
  }
  // perspective cross-lines on the floor, beams on the ceiling
  for (let k = 0; k < 3; k++) {
    const z = 0.18 + k * 0.19;
    s.stroke([P(-X, 0, z), P(X, 0, z)], seed + 30 + k, { w: 1.5, color: rgba('graphite', 0.32), amp: 1.8 * ampK, taper: false });
    s.stroke([P(-X, T, z), P(X, T, z)], seed + 34 + k, { w: 5.0, color: rgba('ink2', 0.8), amp: 2.0 * ampK, taper: false });
  }
}

/** A row of books standing on a shelf board, as one jagged-topped polygon plus a few spines. */
function bookRow(s: Sheet, c: Cam, xf: number, by: number, zA: number, zB: number, seed: number, col: string, ampK: number) {
  const n = 8;
  const bot: V2[] = [], top: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const z = lerp(zA + 0.03, zB - 0.03, i / n);
    const hgt = 0.05 + hash(i, seed) * 0.085;
    bot.push(proj(c, xf, by, z));
    top.push(proj(c, xf, by + hgt, z));
  }
  const row = [...bot, ...top.slice().reverse()];
  s.fill(row, seed + 1, col, { amp: 2.2 * ampK });
  s.stroke(row, seed + 2, { closed: true, w: 2.0, amp: 2.2 * ampK, taper: false });
  for (let k = 0; k < 3; k++) {
    const z = lerp(zA + 0.07, zB - 0.07, (k + 0.5) / 3);
    s.stroke([proj(c, xf, by, z), proj(c, xf, by + 0.09, z)], seed + 10 + k, { w: 1.4, color: rgba('ink', 0.5), amp: 1.6 * ampK, taper: false });
  }
}

/** A shelf unit standing against one wall, its aisle face toward us. */
function shelfUnit(s: Sheet, c: Cam, side: number, zA: number, zB: number, seed: number, ampK: number) {
  const X = ROOM.hw, xf = side * (X - 0.26);
  const y0 = 0.05, y1 = 0.95;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  // the end cap: the unit's side, seen edge-on and lit flat
  const cap = [P(side * X, y0, zB), P(xf, y0, zB), P(xf, y1, zB), P(side * X, y1, zB)];
  s.fill(cap, seed, rgba('shade', 0.55), { amp: 2.4 * ampK });
  s.stroke(cap, seed + 1, { closed: true, w: 2.8, amp: 2.4 * ampK });
  // the face
  const face = [P(xf, y0, zA), P(xf, y0, zB), P(xf, y1, zB), P(xf, y1, zA)];
  s.stroke(face, seed + 2, { closed: true, w: 3.2, amp: 2.2 * ampK });
  const cols = [rgba('sage', 0.5), rgba('cool', 0.45), rgba('paper2', 0.75)];
  for (let b = 1; b <= 3; b++) {
    const by = lerp(y0, y1, b / 4);
    s.stroke([P(xf, by, zA), P(xf, by, zB)], seed + 10 + b, { w: 2.4, color: rgba('ink2'), amp: 1.8 * ampK, taper: false });
    s.stroke([P(xf, by, zA), P(side * X, by, zA)], seed + 20 + b, { w: 1.6, color: rgba('graphite', 0.75), amp: 1.6 * ampK, taper: false });
    if (b !== 2) bookRow(s, c, xf, by + 0.012, zA, zB, seed + 40 * b, cols[(b + (side > 0 ? 1 : 0)) % 3]!, ampK);
  }
}

/**
 * The door on the back wall: a dark recess, two panels, a knob. `blast` (0..1) is the FOOM shockwave
 * arriving: every edge of the doorway bows in, the recess goes to ink, the panels swing off their
 * hinges and fly open, and the wood splinters away from the frame's centre.
 */
function door(s: Sheet, c: Cam, seed: number, ampK: number, blast = 0) {
  const x0 = -0.66, x1 = -0.26, y1 = 0.80;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  const b = clamp(blast);
  const q = [P(x0, 0, 0.004), P(x1, 0, 0.004), P(x1, y1, 0.004), P(x0, y1, 0.004)];
  // the kick dents the frame: the middle of every edge is pushed in toward the middle of the door
  const dent = (pts: V2[]): V2[] => {
    const mx = (pts[0]!.x + pts[2]!.x) / 2, my = (pts[0]!.y + pts[2]!.y) / 2, k = 0.11 * b;
    const out: V2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, n = pts[(i + 1) % pts.length]!;
      out.push(a, v2(lerp((a.x + n.x) / 2, mx, k), lerp((a.y + n.y) / 2, my, k)));
    }
    return out;
  };
  const qd = dent(q);
  s.fill(qd, seed, rgba('shade', 0.9), { amp: 2.4 * ampK });
  if (b > 0.02) s.fill(qd, seed + 7, rgba('ink', 0.78 * b), { amp: 2.4 * ampK });   // the dark behind it
  s.stroke(qd, seed + 1, { closed: true, w: 3.0, amp: 2.4 * ampK });
  for (let i = 0; i < 2; i++) {
    const ya = 0.1 + i * 0.34;
    const hp = P(x0 + 0.05, ya, 0.006);
    const k = Math.cos(b * 1.2);                 // 1 -> 0.36: the free edge falls back to its hinge
    const sag = 16 * b * b;
    const pan = (px: number, py: number): V2 => { const a = P(px, py, 0.006); return v2(hp.x + (a.x - hp.x) * k, a.y + sag + (hp.y - a.y) * (1 - k) * 0.3); };
    s.stroke([pan(x0 + 0.05, ya), pan(x1 - 0.05, ya), pan(x1 - 0.05, ya + 0.22), pan(x0 + 0.05, ya + 0.22)], seed + 2 + i, { closed: true, w: 1.7, color: rgba('ink', 0.55 + 0.3 * b), amp: 2.0 * ampK, taper: false });
  }
  const kn = P(x1 - 0.07, 0.42, 0.012);
  s.blob(kn.x + 54 * b, kn.y - 26 * b, 4.2 * (1 - 0.4 * b), seed + 5, { colour: rgba('ink2', 1 - 0.3 * b), n: 12, jag: 0.2, outline: { w: 1.4 } });
  s.hatch(qd, seed + 6, { spacing: 15, angle: -Math.PI / 3.2, color: rgba('ink', 0.28), w: 1.2 });
  if (b > 0.05) {
    // splinters out of the hole, thrown away from the blast (which comes from the middle of the frame)
    const dc = P((x0 + x1) / 2, y1 * 0.62, 0.004);
    for (let k = 0; k < 5; k++) {
      const ang = -Math.PI * 0.5 - k * 0.33 - hash(k, seed) * 0.16;
      const L = (42 + hash(k, seed + 3) * 96) * b;
      s.stroke([dc, v2(dc.x + Math.cos(ang) * L, dc.y + Math.sin(ang) * L)], seed + 20 + k, { w: 1.8, color: rgba('ink', 0.55 * b), amp: 1.6 * ampK });
    }
  }
}

/** The slot in the wall: a dark slit with a lip, and a hatched flank. */
function slot(s: Sheet, c: Cam, seed: number, ampK: number) {
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  const q = [P(-0.09, 0.60, 0.006), P(0.13, 0.60, 0.006), P(0.13, 0.655, 0.006), P(-0.09, 0.655, 0.006)];
  s.fill(q, seed, rgba('ink'), { amp: 2.0 * ampK });
  s.stroke(q, seed + 1, { closed: true, w: 2.6, amp: 2.0 * ampK });
  s.stroke([P(-0.12, 0.60, 0.01), P(0.16, 0.60, 0.01)], seed + 2, { w: 2.0, color: rgba('ink2'), amp: 1.8 * ampK, taper: false });
  s.hatch([P(-0.09, 0.655, 0.006), P(0.13, 0.655, 0.006), P(0.13, 0.70, 0.006), P(-0.09, 0.70, 0.006)], seed + 3, { spacing: 6, angle: -Math.PI / 3, color: rgba('ink', 0.5), w: 1.1 });
}

/** The desk in the aisle: a top, an apron and four legs, in flat cel tones. */
function desk(s: Sheet, c: Cam, seed: number, ampK: number) {
  const x0 = -0.44, x1 = 0.44, yT = 0.34, th = 0.035, z0 = 0.10, z1 = 0.38;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  const top = [P(x0, yT, z0), P(x1, yT, z0), P(x1, yT, z1), P(x0, yT, z1)];
  s.fill(top, seed, rgba('paper2', 0.95), { amp: 2.4 * ampK });
  s.stroke(top, seed + 1, { closed: true, w: 3.0, amp: 2.4 * ampK });
  const ap = [P(x0, yT - th, z1), P(x1, yT - th, z1), P(x1, yT, z1), P(x0, yT, z1)];
  s.fill(ap, seed + 2, rgba('shade', 0.7), { amp: 2.2 * ampK });
  s.stroke(ap, seed + 3, { closed: true, w: 2.4, amp: 2.2 * ampK });
  s.hatch(ap, seed + 4, { spacing: 8, angle: -Math.PI / 3.3, color: rgba('ink', 0.35), w: 1.2 });
  for (const sx of [x0 + 0.06, x1 - 0.06]) for (const sz of [z0 + 0.03, z1 - 0.03])
    s.stroke([P(sx, 0.005, sz), P(sx, yT - th, sz)], seed + 6, { w: 2.4, color: rgba('ink2'), amp: 1.7 * ampK, taper: false });
}

/** The rulebook on the desk, its pages flicking over one after another. */
function rulebook(s: Sheet, c: Cam, seed: number, ampK: number, t: number) {
  const xs = -0.40, zs = 0.20, yb = 0.352, len = 0.30;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  const cover = [P(xs - 0.02, yb, zs - 0.03), P(xs + 0.32, yb, zs - 0.03), P(xs + 0.32, yb, zs + 0.14), P(xs - 0.02, yb, zs + 0.14)];
  s.fill(cover, seed, rgba('blood', 0.55), { amp: 2.2 * ampK });
  s.stroke(cover, seed + 1, { closed: true, w: 2.6, amp: 2.2 * ampK });
  for (let k = 0; k < 8; k++) {
    const ft = 26.86 + k * 0.075;
    const fu = Math.floor(clamp((t - ft) / 0.26) * 4) / 4;      // four drawn steps per page
    const a = lerp(0.14, 1.52, fu) + k * 0.015;
    const tipx = xs + Math.cos(a) * len, tipy = yb + Math.sin(a) * len + 0.004 * k;
    const page = [P(xs, yb + 0.003 * k, zs + 0.004 * k), P(xs, yb + 0.003 * k, zs + 0.09), P(tipx, tipy, zs + 0.09), P(tipx, tipy, zs + 0.004 * k)];
    s.fill(page, seed + 10 + k, rgba('paper', 0.92), { amp: 1.8 * ampK });
    s.stroke(page, seed + 30 + k, { closed: true, w: 1.5, color: rgba('ink', 0.7), amp: 1.8 * ampK, taper: false });
  }
}

/** One mushroom: a two-line stem with a domed, hatched cap on top. Drawn at whatever height it has grown to. */
function shroom(s: Sheet, c: Cam, x: number, y: number, z: number, hgt: number, seed: number, ampK: number, cap: InKey) {
  const P = (px: number, py: number, pz: number) => proj(c, px, py, pz);
  const base = P(x, y, z), tip = P(x + 0.01, y + hgt, z);
  const sw = kAt(c, z) * 0.016;
  s.stroke([v2(base.x - sw, base.y), v2(tip.x - sw * 0.7, tip.y), v2(tip.x, tip.y - 2), v2(tip.x + sw * 0.7, tip.y), v2(base.x + sw, base.y)], seed, { w: 2.4, color: rgba('paper2'), amp: 1.8 * ampK, taper: false });
  const cr = kAt(c, z) * (0.048 + hash(seed, 11) * 0.028);
  const dome: V2[] = [];
  for (let a = 0; a <= 10; a++) {
    const th = (a / 10) * Math.PI;
    dome.push(v2(tip.x - Math.cos(th) * cr, tip.y - Math.sin(th) * cr * 0.78));
  }
  dome.push(v2(tip.x + cr, tip.y + 1), v2(tip.x - cr, tip.y + 1));
  s.fill(dome, seed + 10, rgba(cap, 0.9), { amp: 2.2 * ampK });
  s.stroke(dome, seed + 20, { closed: true, w: 2.6, amp: 2.2 * ampK });
  s.hatch(dome, seed + 30, { spacing: 7, angle: -Math.PI / 3.4, color: rgba('ink', 0.45), w: 1.3 });
  s.blob(tip.x - cr * 0.45, tip.y - cr * 0.3, 2.4 + hash(seed, 13) * 2, seed + 40, { colour: rgba('paper', 0.9), n: 10, outline: { w: 0 } });
}

/**
 * Mycelium: pale sage threads crawling out of the bag in seven drawn stages — down the bag's flank,
 * across the desk top, off its edge, and away over the floor (every third one climbs a side wall).
 * This is the plate's "mycelium overgrows the room", and its stand-in for the treatment's acid.
 */
function mycelium(s: Sheet, c: Cam, p: number, ampK: number) {
  if (p <= 0.001) return;
  const q = Math.floor(clamp(p) * 7) / 7;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z);
  const bx = (BAG.x0 + BAG.x1) / 2, bz = (BAG.z0 + BAG.z1) / 2;
  for (let k = 0; k < 7; k++) {
    const a0 = hash(k, 41) * TAU;
    const reach = 0.45 + hash(k, 43) * 0.6;
    const wall = k % 3 === 2;                       // this one leaves the desk and runs up a side wall
    const wsg = Math.cos(a0) >= 0 ? 1 : -1;
    const pts: V2[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = (i / 10) * q;
      const t3 = clamp((u - 0.72) / 0.28);
      const wob = 0.05 * noise1(i * 0.8 + k * 5.3, k + 4);
      // down the bag to the desk, a spell across the desk top, then off the edge and away
      const y = u < 0.4 ? lerp(BAG.top + 0.01, 0.345, u / 0.4) : u < 0.72 ? 0.345 : lerp(0.345, wall ? 0.74 : 0.03, t3);
      const x = wall ? lerp(bx + Math.cos(a0) * reach * 0.7, wsg * 1.01, t3) : bx + Math.cos(a0) * reach * u;
      pts.push(P(clamp(x + wob, -1.02, 1.02), y, clamp(bz + Math.sin(a0) * reach * 0.5 * u + wob, 0.05, 0.55)));
    }
    s.stroke(pts, 1560 + k * 3, { w: 1.5, color: rgba('sage', 0.72), amp: 2.0 * ampK });
    if (q > 0.9) {
      const tip = pts[pts.length - 1]!;
      s.blob(tip.x, tip.y, 3 + hash(k, 53) * 3, 1590 + k, { colour: rgba('sage', 0.5), n: 12, jag: 0.24, outline: { w: 1.2, color: rgba('sage', 0.8) } });
    }
  }
}

/** A card shot out of the slot, carrying a hand-drawn mark. Latin-only type: these are abstract marks. */
const GLYPH: V2[][] = [
  [v2(-0.5, 0.62), v2(-0.5, -0.62)],
  [v2(-0.52, -0.18), v2(0.5, -0.18)],
  [v2(-0.44, -0.6), v2(0.44, -0.6)],
];
const GLYPHS: V2[][][] = [
  GLYPH,
  [[v2(-0.44, -0.62), v2(0.44, -0.62)], [v2(0, -0.62), v2(0, 0.64)], [v2(0, 0.3), v2(0.44, 0.66)]],
  [[v2(-0.5, -0.52), v2(0.5, -0.52), v2(0.5, 0.56), v2(-0.5, 0.56), v2(-0.5, -0.52)], [v2(-0.5, 0.56), v2(0.5, -0.52)]],
  [[v2(-0.46, -0.56), v2(-0.46, 0.24)], [v2(-0.04, -0.24), v2(-0.04, 0.62)], [v2(0.42, -0.56), v2(0.42, 0.36)]],
];

interface Card { tb: number; side: number; spin: number; seed: number; glyph: number }

// ---------------------------------------------------------------- the FOOM tree
interface Branch { a: V2; b: V2; born: number; depth: number; seed: number }

/** A binary tree in CANVAS px: seven generations, each born one 8th note after the last (1→2→4→…→64). */
function buildTree(origin: V2, trunk: number): Branch[] {
  let cur = [{ a: origin, b: v2(origin.x, origin.y - trunk), dir: -Math.PI / 2, seed: 1.7 }];
  const out: Branch[] = [];
  for (let L = 0; L < 7; L++) {
    const next: typeof cur = [];
    for (const br of cur) {
      out.push({ a: br.a, b: br.b, born: L, depth: L, seed: br.seed });
      const len = Math.hypot(br.b.x - br.a.x, br.b.y - br.a.y) * 0.84;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? -1 : 1;
        const turn = sgn * (0.66 + 0.24 * noise1(br.seed * 3.1, 7)) + noise1(br.seed * 1.7 + sgn, 11) * 0.2;
        const ang = br.dir + turn;
        next.push({ a: br.b, b: v2(br.b.x + Math.cos(ang) * len, br.b.y + Math.sin(ang) * len), dir: ang, seed: br.seed * 2.17 + (sgn > 0 ? 0.5 : 1.5) });
      }
    }
    cur = next;
  }
  return out;
}

// ---------------------------------------------------------------- shot list
interface Shot { lt0: number; vp: V2; f: number; d0: number; d1: number; z1: number; pan: number }
/** Re-projected around a new vanishing point for every shot: the geometry jumps, so it cuts. */
const SHOTS: Shot[] = [
  { lt0: 0.00, vp: v2(960, 486), f: 660, d0: 2.35, d1: 2.02, z1: 1.03, pan: 0 },
  { lt0: 1.99, vp: v2(872, 468), f: 640, d0: 2.06, d1: 1.52, z1: 1.08, pan: 44 },
  { lt0: 2.55, vp: v2(1234, 524), f: 600, d0: 1.98, d1: 1.42, z1: 1.07, pan: -46 },
  { lt0: 3.09, vp: v2(846, 432), f: 700, d0: 1.92, d1: 1.34, z1: 1.10, pan: 34 },
  { lt0: 3.61, vp: v2(966, 502), f: 655, d0: 1.74, d1: 1.60, z1: 1.05, pan: 0 },
];
const SHOT_END = 5.45;

export default class Room extends InkedScene {
  private l7 = this.ctx.lyrics.get("'cause the future goes FOOM");
  private l8 = this.ctx.lyrics.get('Trapped in the Chinese room');
  private l9 = this.ctx.lyrics.get('with a bag of shrooms');
  private cards: Card[] = [];
  private tree: Branch[] = [];
  /** Birth time (song s) of each generation of the tree, from the 8th-note grid. */
  private gens: number[] = [];
  /** Index of the two words that leave the plank: FOOM (which bursts) and SHROOMS (which scatters). */
  private foomIdx = -1;
  private shroomIdx = -1;
  /** FOOM's advance width at 100 px, and its two O's as fractions of that width — the shockwave marks. */
  private foomW = 0;
  private oFrac: [number, number] = [0.33, 0.86];

  override init() {
    const au = this.ctx.audio;
    // cards ride the kicks in the aisle
    for (const [ot] of au.events('kick', 26.30, 27.9)) {
      for (let k = 0; k < 3; k++)
        this.cards.push({ tb: ot + 0.012 * k, side: (k - 1) * (0.55 + hash(k, 5)), spin: (hash(k, 9) - 0.5) * 1.4, seed: k * 7.3 + ot, glyph: Math.floor(hash(k, 11) * 4) });
    }
    // the tree: one doubling per 8th note (132 bpm -> 0.2273 s), so six doublings fill the sheet in
    // about 1.6 s of the drawn crack
    const eighth = 30 / au.bpm;
    const t0 = 25.58;
    this.gens = [0, 1, 2, 3, 4, 5, 6].map((k) => t0 + k * eighth);
    this.tree = buildTree(v2(960, 622), 300);
    // the O's inside FOOM, measured once: the ratios are scale-invariant, so the shockwave rings can be
    // centred on them at whatever size the word has flown to
    const w4 = this.sheet.measureLetter('FOOM', 'readable', 100);
    const w1 = this.sheet.measureLetter('F', 'readable', 100);
    const w2 = this.sheet.measureLetter('FO', 'readable', 100);
    const w3 = this.sheet.measureLetter('FOO', 'readable', 100);
    this.foomW = w4;
    this.oFrac = [(w1 + w2) / 2 / w4, (w3 + w4) / 2 / w4];
    this.foomIdx = this.l7.words.findIndex((w) => /foom/i.test(w.w));
    this.shroomIdx = this.l9.words.findIndex((w) => /shroom/i.test(w.w));
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, lt = f.lt, d = s.d;
    const ampK = 1 + 1.5 * clamp((lt - 4.40) / 1.0);   // the shrooms make the whole drawing loose

    // ---------------------------------------------------------------- shot + camera
    let si = 0;
    for (let i = 0; i < SHOTS.length; i++) if (lt >= SHOTS[i]!.lt0) si = i;
    const sh = SHOTS[si]!;
    const lt1 = si + 1 < SHOTS.length ? SHOTS[si + 1]!.lt0 : SHOT_END;
    const u = clamp((lt - sh.lt0) / (lt1 - sh.lt0));
    const rush = ease.inCubic(u);
    const cam: Cam = { vp: sh.vp, f: sh.f, D: lerp(sh.d0, sh.d1, rush), camY: ROOM.camY };
    const roll = 0.008 * noise1(d * 1.7, 3) + 0.01 * noise1(d * 0.9, 8) * clamp((lt - 4.4) / 1.0);
    const camX = sh.vp.x + sh.pan * u * (si === 0 ? 0 : 1);
    const camZ = lerp(1, sh.z1, rush) * (1 + 0.045 * Math.max(0, 1 - Math.abs(lt - (si === 0 ? 0 : SHOTS[si]!.lt0)) / 0.12));
    s.setCam(camX, sh.vp.y, camZ, roll);
    const P = (x: number, y: number, z: number) => proj(cam, x, y, z);

    // ---------------------------------------------------------------- the room (far to near)
    shell(s, cam, 601, ampK);
    // FOOM's shockwave crosses the frame and kicks the door in (the buckle is drawn on twos too)
    door(s, cam, 900, ampK, clamp((heldT(t) - 26.42) / 0.40));
    slot(s, cam, 940, ampK);

    // ---------------------------------------------------------------- the hanging sign
    // (it carries the line's words; FOOM lifts off it and bursts, SHROOMS lifts off in the last line)
    const line: Line = t < this.l7.end ? this.l7 : t < this.l8.end ? this.l8 : this.l9;
    const fly = clamp((lt - 1.14) / 0.34);
    const swing = 0.045 * noise1(d * 1.3, 9);
    const xw = 0.78, yb0 = 0.79, yb1 = 0.96;
    const kS = kAt(cam, ZSIGN);
    const midS = P(0, (yb0 + yb1) / 2, ZSIGN);
    const cs = Math.cos(swing), sn = Math.sin(swing);
    const rp = (dx: number, dy: number): V2 => v2(midS.x + dx * cs - dy * sn, midS.y + dx * sn + dy * cs);
    const plank = [rp(-xw * kS, -0.09 * kS), rp(xw * kS, -0.09 * kS), rp(xw * kS, 0.09 * kS), rp(-xw * kS, 0.09 * kS)];
    // the strings up to the ceiling
    s.stroke([rp(-0.34 * kS, -0.09 * kS), P(-0.34, ROOM.top, ZSIGN)], 1000, { w: 2.2, color: rgba('ink2'), amp: 1.6 * ampK, taper: false });
    s.stroke([rp(0.34 * kS, -0.09 * kS), P(0.34, ROOM.top, ZSIGN)], 1001, { w: 2.2, color: rgba('ink2'), amp: 1.6 * ampK, taper: false });
    s.fill(plank, 1002, rgba('paper2', 0.98), { amp: 2.2 * ampK });
    s.stroke(plank, 1003, { closed: true, w: 3.4, amp: 2.2 * ampK });
    s.hatch([rp(-xw * kS, -0.09 * kS), rp(xw * kS, -0.09 * kS), rp(xw * kS, -0.055 * kS), rp(-xw * kS, -0.055 * kS)], 1004, { spacing: 9, angle: -Math.PI / 3.2, color: rgba('ink', 0.3), w: 1.2 });
    for (const nx of [-0.92, 0.92])
      s.blob(rp(nx * xw * kS, 0).x, rp(nx * xw * kS, 0).y, 3.4, 1006, { colour: rgba('ink2'), n: 10, outline: { w: 0 } });

    // the words, written as sung
    const fam = 'readable' as const;
    const words = line.words;
    let size = 46;
    const widths0 = words.map((w) => s.measureLetter(w.w, fam, size, 0));
    let total = widths0.reduce((a, b) => a + b, 0) + size * 0.3 * Math.max(0, words.length - 1);
    const room0 = xw * 2 * kS * 0.88;
    if (total > room0) { size *= room0 / total; }
    const widths = words.map((w) => s.measureLetter(w.w, fam, size, 0));
    const gap = size * 0.3;
    total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, words.length - 1);

    // the one word that leaves the plank: FOOM in the first line, SHROOMS in the last. Its seat on the
    // plank and the mark it flies to are both needed before the loop (FOOM's O's let go from it).
    const liftIdx = line === this.l7 ? this.foomIdx : line === this.l9 ? this.shroomIdx : -1;
    const liftU = line === this.l7 ? ease.outCubic(fly) : line === this.l9 ? ease.outCubic(clamp((lt - 4.94) / 0.46)) : 0;
    const liftMark = line === this.l7 ? LIFT_MARK.foom : LIFT_MARK.shrooms;
    const liftS = lerp(size, liftMark.s, liftU);
    let liftHome = 0;
    {
      let q = -total / 2;
      for (let i = 0; i < words.length; i++) { if (i === liftIdx) liftHome = q + widths[i]! / 2; q += widths[i]! + gap; }
    }
    const liftStart = toCanvas(rp(liftHome, 0.28 * size), camX, sh.vp.y, camZ, roll);
    const liftX = lerp(liftStart.x, liftMark.x, liftU), liftY = lerp(liftStart.y, liftMark.y, liftU);

    let ox = -total / 2;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const cw = widths[i]!;
      const p = Lyrics.wordProgress(w, t);
      const lifted = i === liftIdx && liftU > 0.02;
      const homex = ox + cw / 2;
      if (!lifted) {
        const at = rp(homex, 0.28 * size);
        if (p < 1) s.letterWritten(w.w, at.x - cw / 2 * cs, at.y - cw / 2 * sn, size, 100 + i * 3, 1, { font: fam, ghost: true, rot: swing });
        s.letterWritten(w.w, at.x - cw / 2 * cs, at.y - cw / 2 * sn, size, 100 + i * 3, p, { font: fam, color: p >= 1 ? rgba('ink') : rgba('signal'), w: size * 0.085, rot: swing });
      } else {
        // the word leaves the plank. `pin` gives the sheet point that lands on that screen mark, and the
        // align centres the word on it — left-aligned it sat half a word too far right.
        const at = s.pin(liftX, liftY);
        if (p < 1) s.letterWritten(w.w, at.x, at.y, liftS, 100 + i * 3, 1, { font: fam, ghost: true, align: 'center' });
        s.letterWritten(w.w, at.x, at.y, liftS, 100 + i * 3, p, { font: fam, color: p >= 1 ? rgba('ink') : rgba('signal'), w: liftS * 0.08, align: 'center' });
      }
      ox += cw + gap;
    }

    // ---------------------------------------------------------------- the aisle, nearer than the sign
    shelfUnit(s, cam, -1, 0.16, 0.56, 700, ampK);
    shelfUnit(s, cam, 1, 0.16, 0.56, 800, ampK);
    desk(s, cam, 960, ampK);
    rulebook(s, cam, 1300, ampK, t);

    // ---------------------------------------------------------------- FOOM: the tree
    if (fly > 0.5) {
      for (const br of this.tree) {
        const g = this.gens[br.depth] ?? this.gens[this.gens.length - 1]!;
        const born = clamp((t - g) / 0.24);
        if (born <= 0.02) continue;
        const q = Math.floor(born * 5) / 5;            // five drawn steps per generation
        const a = s.pin(br.a.x, br.a.y);
        const b = s.pin(lerp(br.a.x, br.b.x, q), lerp(br.a.y, br.b.y, q));
        s.stroke([a, b], 1100 + br.seed, {
          w: Math.max(1.5, 5.2 - br.depth * 0.62),
          color: br.depth >= 4 ? rgba('signal', 0.85) : rgba('ink'),
          amp: (2.2 + br.depth * 0.5) * ampK,
          taper: br.depth <= 1,
        });
      }
    }

    // ---------------------------------------------------------------- FOOM's O's: shockwave rings
    // Drawn over the room (a blast is nearer than the furniture). By the time the first ring lets go
    // `fly` has long been pinned at 1, so the word's mark is fixed: the rings keep expanding across
    // the frame after the sign has moved on, and they are what kicks the door in.
    if (fly > 0.99) {
      const rw = this.foomW * LIFT_MARK.foom.s / 100;
      const h = heldT(t);                                     // a drawn ring a step at a time, not raw t
      for (let k = 0; k < 2; k++) {
        const rx = LIFT_MARK.foom.x + (this.oFrac[k]! - 0.5) * rw;
        const ry = LIFT_MARK.foom.y - 0.342 * LIFT_MARK.foom.s;      // the cap of a full-height O
        for (let j = 0; j < 2; j++) {
          const u = clamp((h - (26.20 + k * 0.12 + j * 0.46)) / 0.92);
          if (u <= 0.03 || u >= 1) continue;
          const r = lerp(30, 390, ease.outCubic(u));
          s.blob(rx, ry, r, 1240 + k * 4 + j, {
            outline: { w: 4.6 - 2.4 * u, color: rgba('signal', 0.62 * (1 - u) ** 1.4), amp: 2.0 + r * 0.02, taper: false },
            n: 34, jag: 0.05,
          });
        }
      }
    }

    // ---------------------------------------------------------------- the bag and the shrooms
    const ltd = lt - (t - heldT(t));        // local time snapped to the drawing clock
    const bagT = clamp((ltd - 3.61) / 0.42);
    if (bagT > 0.001) {
      const drop = (1 - ease.inQuad(bagT)) * 0.62;
      // the paper settles on a decaying bounce read from the DRAWING clock: the same bounce sampled
      // from raw t ran at ~3.5 Hz, and the export's motion blur smeared the bag's outline into a band
      const age = Math.max(0, ltd - 4.03);
      const sq = bagT < 1 ? 1 : 1 + 0.22 * Math.exp(-age * 5) * Math.cos(age * 11);
      const y0 = BAG.y0 + drop, top = y0 + (BAG.top - BAG.y0) * sq;
      const P4 = (x: number, y: number, z: number) => proj(cam, x, y, z);
      const front = [P4(BAG.x0, y0, BAG.z1), P4(BAG.x1, y0, BAG.z1), P4(BAG.x1, top, BAG.z1), P4(BAG.x0, top, BAG.z1)];
      s.fill(front, 1400, rgba('paper2', 0.96), { amp: 2.4 * ampK });
      s.stroke(front, 1401, { closed: true, w: 3.0, amp: 2.4 * ampK });
      const side = [P4(BAG.x1, y0, BAG.z0), P4(BAG.x1, y0, BAG.z1), P4(BAG.x1, top, BAG.z1), P4(BAG.x1, top, BAG.z0)];
      s.fill(side, 1402, rgba('shade', 0.6), { amp: 2.4 * ampK });
      s.stroke(side, 1403, { closed: true, w: 2.6, amp: 2.4 * ampK });
      // the crumpled mouth
      s.stroke([P4(BAG.x0, top, BAG.z1), P4(BAG.x0 + 0.08, top + 0.022, BAG.z1 - 0.03), P4(BAG.x1 - 0.06, top + 0.03, BAG.z1 + 0.02), P4(BAG.x1, top, BAG.z1)], 1404, { w: 2.6, color: rgba('ink2'), amp: 2.6 * ampK, taper: false });
      s.hatch(front, 1405, { spacing: 10, angle: -Math.PI / 3.1, color: rgba('ink', 0.28), w: 1.2 });

      // mycelium first, so the fruit sits on top of its own threads
      mycelium(s, cam, (lt - 4.24) / 0.80, ampK);

      // mushrooms, growing in six drawn steps out of the mouth
      if (lt > 4.05) {
        for (let i = 0; i < 5; i++) {
          const gu = clamp((lt - 4.05 - hash(i, 3) * 0.4) / 0.5);
          const q = Math.floor(gu * 6) / 6;
          if (q <= 0) continue;
          const mx = lerp(BAG.x0 + 0.04, BAG.x1 - 0.04, hash(i, 5));
          const mz = lerp(BAG.z0 + 0.03, BAG.z1 - 0.03, hash(i, 7));
          shroom(s, cam, mx, BAG.top + 0.02, mz, (0.055 + hash(i, 9) * 0.065) * q, 1500 + i, ampK, 'signal');
        }
        // and a few small ones sprout where the mycelium has reached: the desk top, then the floor
        for (let i = 0; i < 3; i++) {
          const su = clamp((lt - 4.62 - hash(i, 61) * 0.30) / 0.42);
          const sq6 = Math.floor(su * 6) / 6;
          if (sq6 <= 0) continue;
          const sx = i === 0 ? 0.33 : i === 1 ? -0.27 : -0.22;
          const sz = i === 2 ? 0.44 : 0.22 + hash(i, 63) * 0.1;
          shroom(s, cam, sx, i === 2 ? 0.02 : 0.351, sz, (0.042 + hash(i, 67) * 0.038) * sq6, 1600 + i, ampK, 'sage');
        }
      }
    }

    // ---------------------------------------------------------------- cards shot out of the slot (nearest, so last)
    for (const cd of this.cards) {
      const age = t - cd.tb;
      if (age < 0 || age > 1.05) continue;
      const u2 = age / 1.05;
      const z = 0.06 + 0.55 * u2 * u2;
      const c = P(cd.side * 0.5 * u2 + 0.02, 0.63 + (0.2 + hash(cd.seed, 3) * 0.2) * u2 - 0.1 * u2 * u2, z);
      const kk = kAt(cam, z) * 0.085;
      const a0 = cd.spin + u2 * 2.4 + age * 0.7;
      const ca = Math.cos(a0), sa = Math.sin(a0);
      const cor = (ux: number, uy: number): V2 => v2(c.x + (ux * ca - uy * sa) * kk, c.y + (ux * sa + uy * ca) * kk);
      const quad = [cor(-1, -1), cor(1, -1), cor(1, 1), cor(-1, 1)];
      s.fill(quad, 1200, rgba('paper', 0.97), { amp: 2.0 * ampK });
      s.stroke(quad, 1201, { closed: true, w: 2.4, amp: 2.0 * ampK });
      s.hatch([cor(-1, 1), cor(1, 1), cor(1, 0.55), cor(-1, 0.55)], 1202, { spacing: 9, angle: -Math.PI / 3.2, color: rgba('cool', 0.5), w: 1.2 });
      const gl = GLYPHS[cd.glyph % GLYPHS.length]!;
      for (let g = 0; g < gl.length; g++) {
        const pl = gl[g]!.map((q) => cor(q.x, q.y));
        s.stroke(pl, 1210 + g, { w: Math.max(1.6, kk * 0.15), color: rgba('ink'), amp: 1.6 * ampK, taper: false });
      }
    }

    // ---------------------------------------------------------------- slug
    // (inside the 96 px safe margin: the old x=88 / baseline 96 put the ink outside it)
    s.setCam(960, 540, 1, 0);
    s.text('5 — ROOM', 100, 124, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 100, 124, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.5), align: 'right' });

    // a paper flash on each cut
    let flash = 0;
    for (const sh2 of SHOTS) flash = Math.max(flash, 0.34 * Math.max(0, 1 - Math.abs(lt - sh2.lt0) / 0.07));
    return { flash, vignette: 0.18 + 0.14 * clamp((lt - 3.6) / 1.4), zoom: 1 + 0.006 * f.a.kick, grain: 0.03 };
  }
}

/** sheet -> canvas, so a sign position can be flown to a fixed point on the screen. */
function toCanvas(p: V2, cx: number, cy: number, z: number, roll: number): V2 {
  const cs = Math.cos(roll), sn = Math.sin(roll);
  const dx = p.x - cx, dy = p.y - cy;
  return v2(W / 2 + (dx * cs - dy * sn) * z, H / 2 + (dx * sn + dy * cs) * z);
}

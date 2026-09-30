// Plate 3 — "There was a sudden drop in your training loss, / now I'm your servant and you're my boss"
//
// A graph on hand-ruled graph paper. An unseen pen draws the curve: it runs flat across the top of
// the plot, then plunges. The first line RIDES the curve — each word is lettered where the pen has
// got to, tilted to the local tangent, so the sentence falls down the cliff with the loss. Once the
// line is through, the sheet tears (a wobbly gash filled with ink and ringed with a hatched, flapping
// rim) and the camera follows it down through the hole, so the second half of the plate happens BELOW
// the paper's edge: the same curve still falling, drawn light against the void, and two tiny figures
// at the bottom of it, one growing while the other shrinks.
//
// The second line is its own in-drawing treatment, not a subtitle band: a hand-lettered lockup
// standing on a rule that drops like the loss curve, on which "servant" and "boss" swap dominance as
// the line is sung, so the typographic hierarchy INVERTS. The whole drawing rolls 180° on "boss", and
// the lockup rolls a little with it.
//
// Everything moves on twos (RULE 1): every wobble seed is the drawing index (s.d), and the tear's
// growth and the 180° roll are quantised through heldT so each step is one held drawing. The lyric
// sits inside the 96 px title-safe margin for the whole time it is written.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, TAU, heldT, type V2, type InkOpts } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import { keys, pointAtLength, polylineLengths, type Key } from '../../../engine/util';

// ---------------------------------------------------------------- world layout (sheet px, y down)
const PAPER_BOT = 1046;                       // the paper's bottom edge: below it, the void
const AX = { x: 268, y: 646 };                // the graph's origin
// The gash where the curve goes through the paper: the falling sentence rides only the curve's upper
// run, so it stays clear of the gash, and the camera dives straight through the gash as it opens.
const HOLE = { x: 1186, y: 836, rx: 296, ry: 116 };
const GROUND = 1902;                          // the rule the two figures stand on, in the void

/** The curve, as an animator would lay it out: flat, then a plunge. */
const CURVE: V2[] = [
  v2(272, 238), v2(356, 230), v2(452, 242), v2(548, 232), v2(652, 244), v2(748, 231), v2(836, 240), v2(886, 249),
  v2(930, 274), v2(962, 332), v2(990, 414), v2(1012, 510), v2(1028, 608), v2(1040, 708), v2(1049, 806), v2(1056, 890), v2(1060, 966),
];
const FLAT_END = 7;                           // index where the plunge begins

/** The same curve, still falling, on the far side of the paper. */
const FALL: V2[] = [v2(1060, 966), v2(1054, 1116), v2(1032, 1320), v2(1000, 1548), v2(970, 1730), v2(951, 1900)];

/** Arc-length table of the curve, built once: the first line is lettered along it (pointAtLength). */
const CURVE_L = polylineLengths(CURVE);
const CURVE_TOT = CURVE_L[CURVE_L.length - 1]!;

// ---------------------------------------------------------------- helpers
/** A wobbly ellipse as a point ring (the tear's silhouette). */
function ellipsePts(cx: number, cy: number, rx: number, ry: number, seed: number, n = 30, jag = 0.06): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + jag * noise1(i * 0.83 + seed * 0.017, seed);
    out.push(v2(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k));
  }
  return out;
}

/** The first `p` of a polyline's arc length — how a drawn line is revealed. */
function reveal(pts: V2[], p: number): V2[] {
  if (p <= 0.001) return [];
  if (p >= 1) return pts.slice();
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const tot = L[L.length - 1]!;
  if (tot <= 0) return pts.slice();
  const target = tot * p;
  const out: V2[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    if (L[i]! <= target) { out.push(pts[i]!); continue; }
    const a = pts[i - 1]!, b = pts[i]!, seg = L[i]! - L[i - 1]!;
    const u = seg > 0 ? (target - L[i - 1]!) / seg : 0;
    out.push(v2(lerp(a.x, b.x, u), lerp(a.y, b.y, u)));
    return out;
  }
  return out;
}

/**
 * A tiny hand-drawn figure: head, torso (a flat cel fill), four limbs, a couple of props.
 * `kneel` gives the servant (bowed, one knee down, hands out); otherwise the boss (upright, hatted).
 * Drawn in a few strokes only — the point is that it reads at 40 px tall.
 */
function figure(s: Sheet, x: number, y: number, h: number, seed: number, kneel: boolean, line: string) {
  if (h < 16) return;
  const lw = Math.max(2.0, h * 0.036);
  const O = (extra: InkOpts = {}): InkOpts => ({ color: line, w: lw, amp: 1.9, ...extra });
  const head = (hx: number, hy: number, r: number, s2: number) =>
    s.blob(hx, hy, r, s2, { colour: rgba('paper', 0.95), jag: 0.07, n: 18, outline: { color: line, w: lw * 0.9, amp: 1.6 } });

  if (!kneel) {
    // ---- the boss: standing, hatted, hands at the sides
    const hip = y - h * 0.46, sh = y - h * 0.76;
    const torso = [v2(x - h * 0.115, sh), v2(x + h * 0.115, sh), v2(x + h * 0.085, hip), v2(x - h * 0.085, hip)];
    s.fill(torso, seed, rgba('signal', 0.92), { amp: 2.2, inset: 1.5 });
    s.stroke(torso, seed + 1, { closed: true, ...O() });
    // tie: one dark wedge, the boss's badge
    s.fill([v2(x, sh + h * 0.02), v2(x + h * 0.05, sh + h * 0.07), v2(x, sh + h * 0.20), v2(x - h * 0.05, sh + h * 0.07)], seed + 2, rgba('ink', 0.9), { amp: 2.0 });
    s.stroke([v2(x, sh - h * 0.01), v2(x, y - h * 0.44)], seed + 3, O({ w: lw * 0.7 }));
    // legs and feet
    s.stroke([v2(x - h * 0.035, hip), v2(x - h * 0.095, y)], seed + 4, O());
    s.stroke([v2(x + h * 0.035, hip), v2(x + h * 0.095, y)], seed + 5, O());
    s.stroke([v2(x - h * 0.105, y), v2(x - h * 0.055, y)], seed + 6, O({ w: lw * 0.8 }));
    s.stroke([v2(x + h * 0.055, y), v2(x + h * 0.115, y)], seed + 7, O({ w: lw * 0.8 }));
    // arms
    s.stroke([v2(x - h * 0.11, sh + h * 0.02), v2(x - h * 0.155, y - h * 0.5)], seed + 8, O({ w: lw * 0.85 }));
    s.stroke([v2(x + h * 0.11, sh + h * 0.02), v2(x + h * 0.15, y - h * 0.52)], seed + 9, O({ w: lw * 0.85 }));
    head(x, y - h * 0.865, h * 0.082, seed + 10);
    s.stroke([v2(x, y - h * 0.815), v2(x, sh)], seed + 11, O({ w: lw * 0.75 }));
    // the hat
    const hy = y - h * 0.865 - h * 0.082;
    s.fill([v2(x - h * 0.075, hy + h * 0.03), v2(x + h * 0.075, hy + h * 0.03), v2(x + h * 0.055, hy - h * 0.1), v2(x - h * 0.055, hy - h * 0.1)], seed + 12, rgba('ink'), { amp: 1.8 });
    s.stroke([v2(x - h * 0.105, hy + h * 0.032), v2(x + h * 0.105, hy + h * 0.032)], seed + 13, O({ w: lw * 1.05 }));
    // eyes: two dots, looking down at the other one
    s.blob(x - h * 0.03, hy + h * 0.075, h * 0.011, seed + 14, { colour: rgba('ink'), jag: 0.2, n: 10, outline: { w: 0 } });
    s.blob(x - h * 0.062, hy + h * 0.075, h * 0.011, seed + 15, { colour: rgba('ink'), jag: 0.2, n: 10, outline: { w: 0 } });
  } else {
    // ---- the servant: one knee down, head bowed, hands held out
    const hip = v2(x + h * 0.14, y - h * 0.33), sh = v2(x - h * 0.02, y - h * 0.53);
    const torso = [v2(sh.x - h * 0.05, sh.y), v2(sh.x + h * 0.11, sh.y + h * 0.01), v2(hip.x + h * 0.02, hip.y), v2(hip.x - h * 0.1, hip.y + h * 0.02)];
    s.fill(torso, seed, rgba('cool', 0.9), { amp: 2.2, inset: 1.5 });
    s.stroke(torso, seed + 1, { closed: true, ...O() });
    // the apron: a hatched panel, the servant's badge
    s.hatch([v2(sh.x - h * 0.04, sh.y + h * 0.04), v2(sh.x + h * 0.09, sh.y + h * 0.05), v2(hip.x - h * 0.02, hip.y), v2(hip.x - h * 0.09, hip.y)], seed + 2, { spacing: h * 0.045, angle: -Math.PI / 3.2, color: rgba('paper', 0.6), w: lw * 0.4 });
    // legs: the down shin, and the front leg folded under
    s.stroke([v2(hip.x, hip.y), v2(x + h * 0.22, y - h * 0.03)], seed + 3, O());
    s.stroke([v2(x + h * 0.22, y - h * 0.02), v2(x + h * 0.31, y - h * 0.01)], seed + 4, O({ w: lw * 0.8 }));
    s.stroke([v2(hip.x - h * 0.02, hip.y), v2(x - h * 0.04, y - h * 0.15), v2(x - h * 0.2, y)], seed + 5, O());
    s.stroke([v2(x - h * 0.24, y), v2(x - h * 0.3, y - h * 0.02)], seed + 6, O({ w: lw * 0.8 }));
    // arms out, offering
    s.stroke([v2(sh.x + h * 0.01, sh.y + h * 0.02), v2(x - h * 0.16, y - h * 0.42), v2(x - h * 0.24, y - h * 0.4)], seed + 7, O({ w: lw * 0.85 }));
    s.stroke([v2(sh.x + h * 0.07, sh.y + h * 0.03), v2(x - h * 0.06, y - h * 0.36), v2(x - h * 0.14, y - h * 0.33)], seed + 8, O({ w: lw * 0.8 }));
    const hx = sh.x - h * 0.035, hy = y - h * 0.615;
    s.stroke([v2(sh.x + h * 0.03, sh.y), v2(hx + h * 0.03, hy + h * 0.07)], seed + 9, O({ w: lw * 0.75 }));
    head(hx, hy, h * 0.075, seed + 10);
    // a bowed face: one curve and a dot
    s.stroke([v2(hx - h * 0.055, hy + h * 0.012), v2(hx - h * 0.02, hy + h * 0.035)], seed + 11, O({ w: lw * 0.7 }));
    s.blob(hx - h * 0.042, hy + h * 0.008, h * 0.011, seed + 12, { colour: rgba('ink'), jag: 0.2, n: 10, outline: { w: 0 } });
  }
}

export default class Loss extends InkedScene {
  private l1 = this.ctx.lyrics.get('sudden drop in your training');
  private l2 = this.ctx.lyrics.get("servant and you're my boss");
  /** Loss, falling out of the tear and past the camera. Deterministic birth times. */
  private drops: { x: number; tb: number; sp: number; r: number }[] = [];

  override init() {
    for (let i = 0; i < 14; i++) {
      this.drops.push({
        x: HOLE.x + (hash(i, 3) - 0.5) * 420,
        tb: 13.2 + hash(i, 7) * 2.9,
        sp: 200 + hash(i, 11) * 280,
        r: 4.4 + hash(i, 13) * 6.2,
      });
    }
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, lt = f.lt, d = s.d;
    // the held (exposure-on-twos) local time: everything that STEPS reads this, not raw lt
    const hlt = heldT(t) - f.start;
    const kick = f.a.kick, snare = f.a.snare;

    // ---------------------------------------------------------------- camera
    // A slow push on the graph. The plunge waits for the line to finish falling down the curve (the
    // last word is written at lt 3.42), then the whole drawing dives through the tear and we end up
    // under the sheet; the roll is stepped in six drawings, quantised through heldT.
    const push = 1 + 0.05 * ease.inOutCubic(clamp((lt - 0.1) / 3.1));
    const plunge = ease.inOutCubic(clamp((lt - 3.42) / 0.63));
    const cx = lerp(960, 1182, plunge);
    const cy = lerp(540, 1614, plunge);
    const z = lerp(1, 1.08, plunge) * push * (1 + 0.04 * clamp((lt - 3.9) / 3.0));
    const rollP = clamp((hlt - 6.72) / 0.5);
    const roll = (Math.floor(rollP * 6) / 6) * Math.PI;
    s.setCam(cx, cy, z, roll);
    const dark = cy > PAPER_BOT + 80;                  // under the sheet: the line reads as light
    const line = dark ? rgba('paper', 0.94) : rgba('ink');

    // ---------------------------------------------------------------- graph paper
    const GS = 158;
    for (let gx = 20; gx <= 1910; gx += GS)
      s.stroke([v2(gx, -60), v2(gx, PAPER_BOT)], 300 + gx, { w: 1.5, color: rgba('graphite', 0.33), amp: 2.0, taper: false });
    for (let gy = 20; gy <= PAPER_BOT; gy += GS)
      s.stroke([v2(-40, gy), v2(1940, gy)], 340 + gy, { w: 1.5, color: rgba('graphite', 0.33), amp: 2.0, taper: false });

    // ---------------------------------------------------------------- axes, ruled
    s.stroke([v2(AX.x, 126), v2(AX.x, AX.y + 22)], 400, { w: 3.4, color: rgba('ink2'), overshoot: 15, amp: 1.5, freq: 1.3 });
    s.stroke([v2(AX.x - 30, AX.y), v2(1524, AX.y)], 402, { w: 3.4, color: rgba('ink2'), overshoot: 17, amp: 1.5, freq: 1.3 });
    for (let i = 1; i <= 6; i++)
      s.stroke([v2(AX.x, AX.y - 86 * i), v2(AX.x + 17, AX.y - 86 * i)], 410 + i, { w: 2.4, color: rgba('graphite', 0.9), amp: 1.5, taper: false });
    for (let i = 1; i <= 8; i++)
      s.stroke([v2(AX.x + 96 * i, AX.y), v2(AX.x + 96 * i, AX.y - 15)], 430 + i, { w: 2.4, color: rgba('graphite', 0.9), amp: 1.5, taper: false });
    s.letter('loss', AX.x - 32, 330, 27, 450, { font: 'tech', color: rgba('graphite', 0.85), rot: -Math.PI / 2, align: 'center' });
    s.letter('steps', 1250, AX.y + 36, 27, 452, { font: 'tech', color: rgba('graphite', 0.85), align: 'center' });

    // ---------------------------------------------------------------- the curve, drawn by an unseen pen
    const p = keys(lt, [[0.19, 0], [0.81, 0.44], [1.33, 0.63], [1.85, 0.84], [2.75, 0.97], [3.42, 1]] as Key[]);
    // the pencil layout of the whole curve, waiting for the pen
    s.stroke(CURVE, 470, { w: 1.9, color: rgba('graphite', 0.22), taper: false, amp: 2.3 });
    const shown = reveal(CURVE, p);

    // hatched field under the flat run (the loss you already had)
    const flat = shown.filter((_, i) => i <= FLAT_END);
    if (flat.length > 1) {
      const lastx = flat[flat.length - 1]!.x;
      s.hatch([v2(flat[0]!.x, AX.y), ...flat, v2(lastx, AX.y)], 480, { spacing: 17, angle: -Math.PI / 2.7, color: rgba('ink', 0.3), w: 1.2 });
    }
    // hatched wedge marking the drop itself
    const plungePts = shown.filter((_, i) => i >= FLAT_END);
    if (plungePts.length > 1) {
      const last = plungePts[plungePts.length - 1]!;
      s.hatch([...plungePts, v2(last.x, 249), v2(886, 249)], 482, { spacing: 13, angle: -Math.PI / 3.1, color: rgba('signal', 0.42), w: 1.4 });
    }
    if (shown.length > 1) s.stroke(shown, 486, { w: 4.6, color: rgba('ink'), amp: 2.6 });
    // the wet head of the pen, while it is still drawing
    if (p < 0.999 && shown.length > 1) {
      const head = shown[shown.length - 1]!, pre = shown[shown.length - 2]!;
      const ang = Math.atan2(head.y - pre.y, head.x - pre.x);
      s.stroke([v2(head.x - Math.cos(ang) * 24, head.y - Math.sin(ang) * 24), head], 488, { w: 2.0, color: rgba('ink', 0.45), taper: false });
      s.blob(head.x, head.y, 6.5, 490, { colour: rgba('ink'), jag: 0.3, n: 16, outline: { w: 0 } });
    }

    // the first line RIDES the curve: each word is lettered where the pen has got to, tilted to the
    // local tangent, so the sentence falls down the cliff with the loss (never ahead of the voice)
    this.curveLine(s, t, line);

    // ---------------------------------------------------------------- the tear
    // Opens in eight drawn steps read at heldT, so a step boundary is always a drawing boundary and
    // the filled gash's edge holds still across a frame's motion-blur sub-frames (RULE 1).
    const hg = Math.floor(clamp((hlt - 2.95) / 0.45) * 8) / 8;
    if (hg > 0.01) {
      const hp = ellipsePts(HOLE.x, HOLE.y, HOLE.rx * hg, HOLE.ry * hg, 205, 34, 0.07);
      s.fill(hp, 210, rgba('ink'), { amp: 4.0 });
      const outer = ellipsePts(HOLE.x, HOLE.y, HOLE.rx * hg * 1.14 + 11, HOLE.ry * hg * 1.2 + 10, 206, 30, 0.1);
      s.hatch([...outer, ...hp.slice().reverse()], 212, { spacing: 8, angle: -Math.PI / 3.2, color: rgba('ink', 0.7), w: 1.7 });
      s.stroke(hp, 214, { closed: true, w: 3.6, amp: 4.4 });
      // the paper's flaps, curled back into the gash
      for (let i = 0; i < 7; i++) {
        const a0 = (i / 7) * TAU + 0.45 + d * 0.02;
        const r0 = 1 + 0.15 * noise1(i * 3.1, 91);
        const a1 = a0 + 0.36;
        const pt = (a: number, r: number) => v2(HOLE.x + Math.cos(a) * HOLE.rx * hg * r, HOLE.y + Math.sin(a) * HOLE.ry * hg * r);
        const tri = [pt(a0, r0), pt(a0 + 0.18, r0 - 0.42), pt(a1, r0)];
        s.fill(tri, 216 + i, rgba('paper2', 0.94), { amp: 3.0 });
        s.stroke(tri, 224 + i, { closed: true, w: 2.4, amp: 3.2, color: rgba('ink') });
      }
    }
    // the crack that runs from the gash to the paper's edge
    const crack = clamp((hg - 0.72) / 0.28);
    if (crack > 0) {
      const cp: V2[] = [];
      const n = 8, y0 = HOLE.y + HOLE.ry * hg * 0.9;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        cp.push(v2(HOLE.x + 24 + Math.sin(u * 7.3) * 13 + (hash(i, 33) - 0.5) * 24, lerp(y0, PAPER_BOT + 10, u * crack)));
      }
      s.stroke(cp, 240, { w: 2 + 4 * crack, color: rgba('ink'), amp: 3.0 });
      s.hatch([...cp, ...cp.map((q) => v2(q.x + 15, q.y)).reverse()], 242, { spacing: 7, angle: -Math.PI / 2.9, color: rgba('ink', 0.55), w: 1.3 });
    }

    // ---------------------------------------------------------------- below the paper's edge
    const tear: V2[] = [];
    const NT = 40;
    for (let i = 0; i <= NT; i++) {
      const x = lerp(-220, 2140, i / NT);
      tear.push(v2(x, PAPER_BOT + noise1(i * 1.9, 71) * 15 + Math.sin(i * 2.1) * 6));
    }
    if (plunge > 0.01) {
      s.fill([...tear, v2(2140, 2260), v2(-220, 2260)], 250, rgba('ink'), { amp: 3.2, a: plunge });
      s.stroke(tear, 252, { w: 3.0, color: rgba('paper', 0.85), amp: 3.4, taper: false, a: plunge });
      s.hatch([...tear, ...tear.map((q) => v2(q.x, q.y + 26)).reverse()], 254, { spacing: 16, angle: -Math.PI / 3.4, color: rgba('paper', 0.3), w: 1.3 });
    }

    // the curve, still falling, drawn light against the void
    const fall = reveal(FALL, clamp((lt - 3.45) / 1.2));
    if (fall.length > 1) s.stroke(fall, 260, { w: 4.4, color: rgba('paper', 0.88), amp: 3.0 });
    // the ground rule, and its shadow
    s.stroke([v2(566, GROUND), v2(1618, GROUND)], 266, { w: 3.0, color: rgba('paper', 0.5), amp: 2.6, overshoot: 10, taper: false });
    s.hatch([v2(566, GROUND), v2(1618, GROUND), v2(1618, GROUND + 66), v2(566, GROUND + 66)], 268, { spacing: 11, angle: -Math.PI / 3.4, color: rgba('paper', 0.2), w: 1.2 });

    // loss still falling out of the tear: the one hot colour, in the dark
    for (const dr of this.drops) {
      const age = t - dr.tb;
      if (age <= 0 || age > 1.6) continue;
      const y = PAPER_BOT + 18 + age * dr.sp + 190 * age * age;
      if (y > GROUND + 26) continue;
      const x = dr.x + noise1(d * 1.3 + dr.x * 0.01, 77) * 6;
      s.stroke([v2(x, y - dr.r * 3.2), v2(x, y - dr.r)], 270, { w: 1.8, color: rgba('signal', 0.5), taper: false, amp: 1.6 });
      s.blob(x, y, dr.r, 272 + i2(dr.x), { colour: rgba('signal', 0.92), jag: 0.3, n: 12, outline: { w: 0 } });
    }

    // ---------------------------------------------------------------- the two of them
    const growIn = ease.outCubic(clamp((lt - 4.05) / 0.75));
    const trade = ease.inOutCubic(clamp((lt - 6.30) / 1.05));   // "boss": he grows, you shrink
    if (growIn > 0.02) {
      figure(s, 826, GROUND, 178 * growIn * lerp(1, 0.58, trade), 320, true, line);
      figure(s, 1166, GROUND, 238 * growIn * lerp(0.9, 1.55, trade), 340, false, line);
      // the servant's knee leaves a mark in the dust
      s.hatch([v2(848, GROUND), v2(1010, GROUND), v2(1010, GROUND + 16), v2(848, GROUND + 16)], 360, { spacing: 6, angle: 0, color: rgba('paper', 0.22), w: 1.1 });
    }

    // ---------------------------------------------------------------- the second line, and the inversion
    // Not a subtitle band: a hand-lettered lockup standing on a hand-ruled rule that drops like the
    // loss curve, on which "servant" and "boss" swap dominance. It rolls a little with the world
    // (stepped on the drawing clock) but stays centred, so it never leaves the title-safe area.
    if (lt > 3.80) {
      const tilt = clamp(roll * 0.09, 0, 0.22);
      s.setCam(W / 2, H / 2, 1, tilt);
      this.inversion(s, t, dark ? rgba('paper') : rgba('ink'));
    }
    // the slug, pinned and kept inside the 96 px safe margin
    s.setCam(960, 540, 1, 0);
    s.text('2 — LOSS', 104, 96, { size: 19, fam: 'Plex-400', color: dark ? rgba('paper', 0.6) : rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 104, 96, { size: 19, fam: 'Plex-400', color: dark ? rgba('paper', 0.4) : rgba('graphite', 0.5) });

    return {
      vignette: lerp(0.16, 0.32, plunge),
      flash: 0.05 * snare + 0.3 * Math.max(0, 1 - Math.abs(lt - 3.44) / 0.09),
      zoom: 1 + 0.005 * kick,
      grain: 0.03,
    };
  }

  /**
   * The first line, laid along the drawn loss curve. Every word is lettered at the arc-length point
   * the layout gives it, tilted to the local tangent (damped so it stays legible on the cliff), and
   * written only as it is sung. The words ride just above the ink line, so pen and sentence agree.
   */
  private curveLine(s: Sheet, t: number, col: string) {
    const words = this.l1.words;
    const fam = 'readable' as const;
    const units = words.map((w) => s.measureLetter(w.w, fam, 1));
    const gapU = 0.30;
    let totalUnit = gapU * Math.max(0, words.length - 1);
    for (const u of units) totalUnit += u;
    // the words ride the curve's upper run, stopping above the gash: lower down, the curve is inside
    // the tear (which is where the camera dives), so a word there would be swallowed by the ink.
    const a0 = 0.03 * CURVE_TOT, a1 = 0.70 * CURVE_TOT;
    const size = clamp((a1 - a0) / Math.max(0.001, totalUnit), 26, 58);
    let cum = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      if (p > 0.001) {
        const q = pointAtLength(CURVE, CURVE_L, a0 + (cum / totalUnit) * (a1 - a0));
        const rot = clamp(q.angle * 0.72, -1.05, 1.05);
        const off = size * 0.42;                        // sit the words just above the drawn line
        const ax = q.x + Math.sin(rot) * off, ay = q.y - Math.cos(rot) * off;
        const seed = 100 + i * 3;
        if (p < 1) s.letterWritten(w.w, ax, ay, size, seed, 1, { font: fam, color: col, rot, ghost: true });
        s.letterWritten(w.w, ax, ay, size, seed, p, {
          font: fam, rot, color: p >= 1 ? col : rgba('signal'), w: size * 0.082, amp: size * 0.014,
        });
      }
      cum += units[i]! + gapU;
    }
  }

  /**
   * The second line as a drawing in its own right: a hand-lettered lockup standing on a hand-ruled
   * rule that drops like the loss curve, on which "servant" and "boss" swap dominance, so the
   * hierarchy INVERTS as the line is sung. Each word keeps a fixed slot, so only the sizes cross
   * over and the type does not re-flow; the dominant word gets the cel second tone as a hatched slab.
   */
  private inversion(s: Sheet, t: number, col: string) {
    const words = this.l2.words;
    const n = words.length;
    const fam = 'readable' as const;
    const base = 44;
    const swap = ease.inOutCubic(clamp((t - this.ctx.start - 4.5) / 2.0));
    const slotOf = (w: string) => (w === 'servant' ? 116 : w === 'boss' ? 128 : base);
    const sizeOf = (w: string) => (w === 'servant' ? lerp(116, base, swap) : w === 'boss' ? lerp(base, 128, swap) : base);
    const slots = words.map((w) => s.measureLetter(w.w, fam, slotOf(w.w)));
    const gap = base * 0.34;
    let total = gap * Math.max(0, n - 1);
    for (const sl of slots) total += sl;
    let x = (W - total) / 2;
    const rule: V2[] = [];
    for (let i = 0; i < n; i++) {
      const w = words[i]!;
      const sz = sizeOf(w.w);
      const wid = s.measureLetter(w.w, fam, sz);
      const yb = lerp(594, 646, n > 1 ? i / (n - 1) : 0) + noise1(s.d * 1.7 + i * 2.3, 63) * 3.0;
      const wx = x + (slots[i]! - wid) / 2;              // centred in its fixed slot: sizes change, slots do not
      rule.push(v2(wx + wid / 2, yb));
      const p = Lyrics.wordProgress(w, t);
      if (p > 0.001) {
        const seed = 600 + i * 5;
        if (p < 1) s.letterWritten(w.w, wx, yb, sz, seed, 1, { font: fam, color: col, ghost: true });
        s.letterWritten(w.w, wx, yb, sz, seed, p, { font: fam, color: p >= 1 ? col : rgba('signal'), w: sz * 0.078 });
        // the dominant word, as a drawn object: a hatched slab of cel second tone
        if (sz > base * 1.6) {
          s.hatch([v2(wx - 4, yb + 12), v2(wx + wid + 4, yb + 12), v2(wx + wid + 4, yb + 30), v2(wx - 4, yb + 30)],
            seed + 2, { spacing: 9, angle: -Math.PI / 3.5, color: rgba('shade', 0.6), w: 1.4 });
        }
      }
      x += slots[i]! + gap;
    }
    // the rule the words stand on: hand-ruled, dropping like the loss curve
    s.stroke(rule, 690, { w: 2.6, color: col, amp: 2.6, taper: false, overshoot: 10 });
  }
}

/** A drop's seed has to be an integer-ish value for the hash to be stable across frames. */
function i2(x: number) { return Math.round(x * 0.37) + 100; }

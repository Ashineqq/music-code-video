// `father` — two entries, one drawing: `father1` 17.19 → 24.81 (`params.n = 1`) and `father2`
// 93.39 → 101.00 (`params.n = 2`). The same night, remembered twice, a size step apart.
//
// THE IDEA. What the page remembers of the father is not a face, it is his HAND: a hand the size of the
// spread, reaching in from the right while the verse is sung. This plate has no lantern and no horizon —
// the hand is the plate's instrument, and the words are letters, so they are lettered on the rules in
// `hscript`, word by word, as they are sung, and the picture answers them:
//
//   n = 1 — the boy is small and he fits: drawn stroke by stroke into the hollow of the palm, and on
//           "He took me in his arms" the fingers close over him.
//   n = 2 — the same hand, the same words, a boy one size step bigger: he stands on the palm with his
//           head above the fingertips, and the fingers curl behind him instead of closing.
//
// Movements: (1) the page tilts and the arm reaches in — a wrist, a palm, four fingers, a thumb, all flat
// cel masses with ink contours; (2) the fingers are drawn by the pen, one per beat; (3) the boy is drawn
// while "Son, don't let it slip away" is sung; (4) on the third line the hand closes (n = 1) or cannot
// (n = 2, where the fingers give up and open a little again); (5) the hold — the words dry from the pen's
// `lantern` into `ink`.
//
// ON TWOS. The wobble of every outline is seeded from `s.d`; the hand's own shape change (the fingers
// closing) is driven through `heldT` so it steps with the drawing, while the pen strokes (the fingers
// being drawn, the boy, the words) and the page's tilt read the clock — the same split the reference
// plate uses.
import { InkedScene, Sheet, rgba, v2, W, H, TAU, resample, lerp, ease, prog, heldT, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ page furniture
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge
/**
 * The three writing rules. Measured off `HersheyScript1.svg` at size 56, the lettered line's ink box is
 * [baseline − 37, baseline + 21]; the pen's wobble and stroke width add about 5 px, so [−43, +26]. The
 * brief's band for sung words ends at y = 940, so the last baseline is 912 (ink to 938): every sung word
 * of both entries stays inside the band, and nowhere near the safe area's own edge at 984. (The opening
 * plate writes its last rule at 958 — with these metrics its own descenders reach 984 exactly.)
 */
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)

// ------------------------------------------------------------------ the lines
/**
 * This module serves two entries, so all six lines are queried here, by fragment: the gate reads this
 * file and has to see both entries' lines covered. `mine()` picks the three that belong to `n`.
 */
const Q: [string, number][] = [
  ['One day my father he told me', 0], // father1 · 17.27
  ["Son, don't let it slip away", 0],  // father1 · 19.44
  ['He took me in his arms', 0],       // father1 · 21.56
  ['One day my father he told me', 1], // father2 · 93.49
  ["Son, don't let it slip away", 1],  // father2 · 95.69
  ['When I was just a kid', 0],        // father2 · 97.71
];

// ------------------------------------------------------------------ the hand
/** How far the arm starts off the sheet before it reaches in: far enough that no ink is on screen. */
const SLIDE = 1150;

/**
 * The forearm and the palm as ONE cel mass (closed outline, drawn in sheet px, y down). The arm runs off
 * the sheet at the right, the knuckle line rises at x ≈ 900, and the hollow where the boy is put down
 * dips to y ≈ 440. The whole mass moves with `slide`; it is drawn with taper off because a closed loop
 * has no lifted pen (and one canvas pass instead of one per 14 px).
 */
const PALM: V2[] = [
  v2(1960, 430), v2(1750, 424), v2(1560, 400), v2(1450, 380), v2(1330, 396), v2(1210, 424),
  v2(1100, 440), v2(1010, 430), v2(950, 402), v2(925, 374),
  v2(900, 420), v2(888, 470), v2(908, 520), v2(950, 570), v2(1050, 610), v2(1200, 632),
  v2(1360, 640), v2(1530, 628), v2(1720, 636), v2(1900, 648), v2(1960, 640),
];

/** The underside of the arm and the palm: the one area that takes the cel's second tone (one hatch pass). */
const UNDER: V2[] = [
  v2(896, 486), v2(1000, 560), v2(1200, 596), v2(1450, 606), v2(1700, 604), v2(1960, 566),
  v2(1960, 640), v2(1900, 648), v2(1720, 636), v2(1530, 628), v2(1360, 640), v2(1200, 632),
  v2(1050, 610), v2(950, 570), v2(908, 520),
];

/**
 * The four fingers: knuckle (x, y) on the palm, the angle they leave it at (up, fanned), their length
 * per joint, and their share of the curl. The pinky has the least to give, as a pinky does.
 */
const FINGERS: [number, number, number, number, number][] = [
  [934, 376, -1.28, 74, 1.0],
  [919, 408, -1.42, 80, 1.0],
  [905, 440, -1.55, 74, 0.9],
  [895, 468, -1.68, 58, 0.78],
];
/** How far each joint of a finger turns: standing up when the hand is open, a fist when it closes. */
const TURN_OPEN = 0.30;
const TURN_CLOSED = 0.56;

/** The thumb, which never curls — it is what tells the eye this is a hand and not a paw. */
const THUMB: [number, number, number, number, number] = [930, 540, -2.2, 92, 0.22];

/**
 * The boy at the two stages: head (cx, cy, r), the four limbs (each densified so a pen can draw part of
 * one), and the flat shadow he stands in. Five strokes, no trunk, no face — the film's vocabulary for
 * him. n = 1 he sits in the hollow; n = 2 he stands on it, big enough that his head clears the fingers.
 */
const SITS = {
  head: [1088, 394, 24] as [number, number, number],
  limbs: [
    [v2(1088, 418), v2(1120, 428), v2(1146, 432)], // the leg he sits on, forward
    [v2(1088, 418), v2(1104, 432), v2(1112, 436)], // the folded one
    [v2(1088, 418), v2(1062, 404), v2(1052, 414)], // an arm back on the palm
    [v2(1088, 418), v2(1114, 404), v2(1128, 414)], // an arm resting on his knee
  ].map((p) => resample(p, 10)),
  shadow: [1112, 437, 58, 8] as [number, number, number, number],
};
const STANDS = {
  head: [1060, 256, 30] as [number, number, number],
  limbs: [
    [v2(1060, 286), v2(1044, 362), v2(1046, 436)],
    [v2(1060, 286), v2(1078, 358), v2(1076, 436)],
    [v2(1060, 286), v2(1024, 330), v2(1018, 372)],
    [v2(1060, 286), v2(1092, 324), v2(1104, 350)],
  ].map((p) => resample(p, 10)),
  shadow: [1062, 440, 52, 10] as [number, number, number, number],
};

/** A flat ellipse as a polygon: the cel stand-in for a soft shadow (there are no gradients). */
const ellipse = (cx: number, cy: number, rx: number, ry: number): V2[] => {
  const p: V2[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    p.push(v2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return p;
};

export default class Father extends InkedScene {
  /** The six lines this module serves, resolved once, by fragment (never by time). */
  private all: Line[] = Q.map(([q, nth]) => this.ctx.lyrics.get(q, nth));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, S = this.ctx.start;
    const n = this.ctx.params.n === 2 ? 2 : 1;
    const mine = n === 2 ? this.all.slice(3, 6) : this.all.slice(0, 3);
    const L2 = mine[1]!;

    // ---------------------------------------------------------------- 1 · the page, and the tilt
    this.page(s);
    // The page is picked up and tipped toward the light: the brief's roll (−0.03 n) plus a 1.5 % pull
    // back, and the pull-back is what keeps the frame's far corner on the sheet at the biggest roll (at
    // n = 2, roll −0.06, the corner (1848, 1018) lands at screen (1861, 958) — on the sheet with room).
    const tilt = prog(t, S - 0.2, S + 1.5, ease.outCubic);
    s.setCam(W / 2, H / 2, 1 - 0.015 * tilt, -0.03 * n * tilt);

    // ---------------------------------------------------------------- 2 · the hand reaches in
    const slide = (1 - prog(t, S + 0.05, S + 1.2, ease.outCubic)) * SLIDE;
    this.arm(s, slide);
    const c = this.closure(heldT(t), n, mine);
    // The draw order is the story: at n = 1 the fingers are drawn over the boy (they close IN FRONT of
    // him); at n = 2 they are drawn first and he covers them (they are BEHIND him).
    const b0 = L2.words[0]!.start + 0.1; // the pen starts on him as the second line's first word is sung
    if (n === 1) {
      this.boy(s, t, n, b0);
      this.digits(s, t, c, slide);
    } else {
      this.digits(s, t, c, slide);
      this.boy(s, t, n, b0);
    }

    // ---------------------------------------------------------------- 3 · the words, on the rules
    this.writeRules(s, f, mine);

    return CEL.flat;
  }

  // ------------------------------------------------------------------ the page
  /** The page: its edge and the three rules. The same furniture as the opening plate. */
  private page(s: Sheet) {
    // `taper: false` on the two frames: the outline of a closed loop has no ends to thin (and the frame is
    // the longest path in the plate, so this is one canvas pass instead of ~390)
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9, taper: false });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4), taper: false });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 });
    }
  }

  // ------------------------------------------------------------------ the hand
  /** The forearm and the palm: one flat cel mass, its underside hatched, two creases across it. */
  private arm(s: Sheet, slide: number) {
    const mvx = (p: V2) => v2(p.x + slide, p.y);
    const palm = PALM.map(mvx);
    // a solid keeps its shape; the contour on top of it is light (2.6, ink at 0.85), never a black scribble
    s.fill(palm, 3, rgba('paper2', 0.95));
    s.stroke(palm, 3, { closed: true, w: 2.6, color: rgba('ink', 0.85), taper: false });
    // the second tone: one hatch pass under the palm and the arm (the cel has no gradients)
    s.hatch(UNDER.map(mvx), 4, { spacing: 18, color: rgba('graphite', 0.45), w: 1.6 });
    // the wrist fold, and the fold the fingers leave in the hollow
    s.stroke([mvx(v2(1500, 412)), mvx(v2(1466, 500)), mvx(v2(1494, 582))], 12, { w: 2, color: rgba('graphite', 0.5), sketch: true });
    s.stroke([mvx(v2(944, 452)), mvx(v2(1056, 488)), mvx(v2(1196, 466))], 13, { w: 2, color: rgba('graphite', 0.5), sketch: true });
  }

  /**
   * The four fingers and the thumb. Each finger is drawn by the unseen pen — outline first, then the
   * paint floods into it — and then bends by its own share of the closure. The thumb never bends.
   */
  private digits(s: Sheet, t: number, c: number, slide: number) {
    const S = this.ctx.start;
    const turn = lerp(TURN_OPEN, TURN_CLOSED, c);
    for (let i = 0; i < FINGERS.length; i++) {
      const f = FINGERS[i]!;
      const pen = prog(t, S + 1.25 + i * 0.26, S + 1.59 + i * 0.26, ease.outQuad); // one finger per beat
      if (pen <= 0) continue;
      const core = this.digitCore(v2(f[0] + slide, f[1]), f[2], f[3], 4, turn * f[4]);
      this.digit(s, this.ribbon(core, f[3] * 0.3, f[3] * 0.24), 200 + i, pen, rgba('shade', 0.92));
    }
    // the thumb lies in front of the fingers, so it is drawn last (it is held up first, at the hand's arrival)
    const thumb = this.digitCore(v2(THUMB[0] + slide, THUMB[1]), THUMB[2], THUMB[3], 2, THUMB[4]);
    this.digit(s, this.ribbon(thumb, 46, 32), 210, prog(t, S + 1.05, S + 1.45, ease.outQuad), rgba('shade', 0.92));
  }

  /**
   * How far the hand has closed at `t`: 0 = the fingers stand up (how the plate opens), 1 = they have
   * curled all the way over the hollow. n = 1 reaches 1 on the third line; n = 2 gets to a little over
   * half, then gives up and opens slightly — the boy does not fit, and the hand knows it.
   */
  private closure(t: number, n: number, mine: Line[]) {
    const L3 = mine[2]!;
    const w0 = L3.words[0]!.start;
    const close = ease.inOutCubic(prog(t, w0, w0 + 1.05));
    if (n === 1) return lerp(0.1, 1, close);
    const giveUp = ease.inOutQuad(prog(t, L3.end - 1.15, L3.end - 0.15));
    return lerp(0.1, 0.56, close) * (1 - 0.22 * giveUp);
  }

  /** One digit: while the pen is writing it, only the part of the outline drawn so far; then paint + line. */
  private digit(s: Sheet, rib: V2[], seed: number, pen: number, tone: string) {
    if (pen < 1) {
      this.limb(s, rib, seed, pen, 2.4);
      return;
    }
    s.fill(rib, seed, tone);
    s.stroke(rib, seed, { closed: true, w: 2.4, color: rgba('ink', 0.8), taper: false });
  }

  /** The centreline of a digit: a chain that turns by `turn` at every joint. Small turn = open hand. */
  private digitCore(base: V2, a0: number, seg: number, joints: number, turn: number): V2[] {
    const out: V2[] = [base];
    let a = a0, p = base;
    for (let j = 0; j < joints; j++) {
      a += turn;
      p = v2(p.x + Math.cos(a) * seg, p.y + Math.sin(a) * seg);
      out.push(p);
    }
    return out;
  }

  /** Widen a centreline into a closed ribbon with a blunt tip — a finger is a flat shape, not a line. */
  private ribbon(pts: V2[], w0: number, w1: number): V2[] {
    const n = pts.length;
    const left: V2[] = [], right: V2[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(n - 1, i + 1)]!;
      let tx = b.x - a.x, ty = b.y - a.y;
      const L = Math.hypot(tx, ty) || 1;
      tx /= L; ty /= L;
      const w = lerp(w0, w1, i / (n - 1));
      left.push(v2(pts[i]!.x - ty * w, pts[i]!.y + tx * w));
      right.push(v2(pts[i]!.x + ty * w, pts[i]!.y - tx * w));
    }
    const a = pts[n - 2]!, b = pts[n - 1]!;
    let tx = b.x - a.x, ty = b.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    const tip = v2(b.x + (tx / L) * w1 * 0.9, b.y + (ty / L) * w1 * 0.9);
    return [...left, tip, ...right.reverse()];
  }

  /** Draw the first `p` of a line: a hand finishes what it starts. */
  private limb(s: Sheet, pts: V2[], seed: number, p: number, w = 3.6) {
    if (p <= 0 || pts.length < 2) return;
    const k = Math.min(pts.length, Math.max(2, Math.ceil(pts.length * p)));
    s.stroke(pts.slice(0, k), seed, { w, color: rgba('ink', 0.95), overshoot: 4, taper: false });
  }

  // ------------------------------------------------------------------ the boy
  /**
   * The boy: five strokes — a head and four limbs, no trunk, no face — drawn one after another while the
   * second line is sung. He is a small ink figure, so his lines are heavy enough to read (w 3.6).
   */
  private boy(s: Sheet, t: number, n: number, b0: number) {
    const B = n === 1 ? SITS : STANDS;
    const at = (i: number) => ease.outQuad(prog(t, b0 + i * 0.15, b0 + i * 0.15 + 0.34));
    // the hollow darkens where he is put down (a flat tone under him, not a shadow pass)
    if (at(0) > 0) s.fill(ellipse(B.shadow[0], B.shadow[1], B.shadow[2], B.shadow[3]), 330, rgba('shade', 0.9));
    const hp = at(0);
    if (hp > 0) {
      s.arc(B.head[0], B.head[1], B.head[2], -Math.PI * 0.5, -Math.PI * 0.5 + TAU * hp, 331, { w: 3.6, color: rgba('ink', 0.95), amp: 3 });
    }
    for (let i = 0; i < 4; i++) this.limb(s, B.limbs[i]!, 332 + i, at(i + 1));
  }

  // ------------------------------------------------------------------ the words
  /**
   * The father's words on the rules, in `hscript`, in order, written word by word as they are sung: the
   * words already sung stay in `ink`, the word being sung now is written under the pen's `lantern`, and
   * the line waits as a pale guide until the voice gets there (the guide is dropped once the line is in
   * — by then the ink words are the whole line anyway).
   */
  private writeRules(s: Sheet, f: Frame, mine: Line[]) {
    const size = 56, gap = 17;
    for (let i = 0; i < mine.length; i++) {
      const l = mine[i]!;
      const y = RULES[i]!;
      const words = l.words;
      const widths = words.map((w) => s.measureLetter(w.w, 'hscript', size));
      const total = widths.reduce((a, w) => a + w, 0) + gap * (words.length - 1);
      const waiting = prog(f.t, l.start - 1.2, l.start - 0.35);
      const done = words.every((w) => Lyrics.wordProgress(w, f.t) >= 1);
      if (waiting > 0 && !done) {
        s.letter(l.text, W / 2, y, size, 60 + i, { font: 'hscript', align: 'center', color: rgba('graphite', 0.22 * waiting), w: 3, amp: 1.6 });
      }
      let x = (W - total) / 2;
      let penX = x;
      for (let k = 0; k < words.length; k++) {
        const w = words[k]!;
        const p = Lyrics.wordProgress(w, f.t);
        if (p > 0) {
          s.letterWritten(w.w, x, y, size, 70 + i * 8 + k, p, {
            font: 'hscript', w: 4.6, amp: 2,
            color: p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95),
          });
        }
        if (p > 0 && p < 1) penX = x + widths[k]! * p;
        x += widths[k]! + gap;
      }
      // the nib: a lantern tick riding the word the voice is on
      const writing = f.t >= l.start - 0.15 && f.t <= l.end + 0.2;
      if (writing) s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], 80 + i, { w: 4.2, color: rgba('lantern', 0.95), taper: true });
    }
  }
}

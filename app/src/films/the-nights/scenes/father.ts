/*!plate
{
  "id": ["father1", "father2"],
  "window": [17.1949, 101.0045],
  "device": "written",
  "staging": "instrument",
  "typePx": 120,
  "bands": [
    { "name": "head-space", "y": [96, 392] },
    { "name": "carved", "y": [394, 572] },
    { "name": "palm", "y": [634, 850] },
    { "name": "base", "y": [858, 984] }
  ],
  "movements": [
    { "at": 17.1949, "camera": "crash-dolly-in" },
    { "at": 18.6235, "camera": "punch-in" },
    { "at": 20.0521, "camera": "orbit" },
    { "at": 21.4807, "camera": "crane-out" },
    { "at": 22.9092, "camera": "hold-kick" },
    { "at": 93.3854, "camera": "crash-dolly-in" },
    { "at": 94.8140, "camera": "punch-in" },
    { "at": 96.2426, "camera": "orbit" },
    { "at": 97.6711, "camera": "crane-out" },
    { "at": 99.0997, "camera": "hold-kick" }
  ]
}
*/
// Plate `father` — one module, two entries, entered twice by the edit: `father1` 17.19 → 24.81
// (`params.n = 1`) and `father2` 93.39 → 101.00 (`params.n = 2`). Re-shoot of a plate whose lyric sat
// on writing rules at the bottom of the page: the rules are gone, and the line is now an object in the
// world.
//
// WORLD: a giant hand talking to the boy. DEVICE: **written on the palm** (`04-plates.md §3.1`, 被写出
// 来) — the father's words are lettered in `hscript` at 108–120 px ACROSS the palm, word by word, wet in
// `lantern` and dry in `ink`; each finished word advances the hand's curl (the four fingers close in
// order as the sentence is spent), and a finished LINE is absorbed into the fingers, so the palm never
// carries two lines at once. This plate's language is the palm-as-page — no other plate may reuse it
// (`04-plates.md §5`).
//   n = 1 — the boy stands ON the live word like a ledge; the hand is the size of the spread.
//   n = 2 — the words are CARVED on the wall behind (`04-plates.md §3.5`, 雕刻), the hand has shrunk to
//           the lower right, and the boy is taller than it.
//
// BANDS (nothing but the live line ever enters the TYPE BAND; the single deliberate exception is the
// boy's cast shadow in movement 4, kept at ≤ 0.16 alpha so the sung line stays readable):
//   n = 1   TYPE BAND  y ∈ [634, 850]   baseline 760, across the palm (hscript ink [634, 805])
//           fingers ≤ 600 · knuckle arc ~545 · palm base hatch 858–952 · thumb ≥ 890
//           the boy's soles rest on the live line's own ink top (634 at 120 px, 677 at 79 px), body above
//           forearm x ≥ 1660 · cuff x ≥ 1720 · speed streaks x ≥ 1700 · lint y ≤ 320 or ≥ 955
//   n = 2   TYPE BAND  y ∈ [394, 572]   baseline 520, carved on the wall (ink [394, 565])
//           boy 134–394 (his head clears the hand) · hand ink 620–970 · wall 240–720 (hatched 240–394 and
//           572–720 only) · chisel grooves at 370/590
//
// MOVEMENTS (five, cut on beats — `03-animation.md §2` a camera move is a cut, `§3` a new composition
// every 1.1–1.5 s). Local clock S = the entry start; b(x) snaps x to the nearest beat.
//   1  S+0.00 → b(S+1.5)  the hand whips in from the right, palm open, blotting the page; word 1 starts
//   2  → b(S+2.9)         word 1 written across the palm; finger 1 curls on its last stroke
//   3  → b(S+4.3)         the spent line is absorbed and the next arrives; the camera orbits a little
//   4  → b(S+5.7)         the hand closes; the boy's shadow is cast across the words
//   5  → S+W              the hand (and the boy) leave; the words stay, larger, as the only objects
//
// ON TWOS. Every outline's wobble is seeded from `s.d` (RULE 2). The finger curl is sampled on the
// drawing (`heldT`, RULE 1) so the hand steps rather than slides; the pen strokes, the arm's arrival and
// the camera read the clock, exactly as the reference plate `open.ts` does.
import { InkedScene, Sheet, rgba, v2, W, clamp, lerp, ease, prog, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ the page
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge
/** The live line: lettered in hscript, fitted so the camera never has to crop it (cap 1420 → half 710). */
const SIZE = 120, MAXW = 1420;
/** The type baseline: across the palm (n = 1) and across the wall (n = 2). */
const BASE: [number, number] = [760, 520];
/** The giant hand: palm centre and scale per entry. At n = 2 it has shrunk to the lower right. */
const PALM_C: V2[] = [v2(960, 740), v2(1150, 860)];
const PALM_S: [number, number] = [1, 0.55];
/** How far off the sheet the hand starts (and leaves to): far enough that no ink is on screen. */
const SLIDE = 1150;

// ------------------------------------------------------------------ the lines (both entries)
/**
 * This module serves two entries, so all six lines are queried here, by fragment — the gate reads this
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

// ------------------------------------------------------------------ hand geometry (local: palm centre + y down)
/** The palm: a wide cel mass, its half-width (730) just wider than the widest fitted line (710). */
const PALM_LOCAL: [number, number][] = [
  [-730, -30], [-706, -140], [-566, -200], [-330, -222], [-40, -226], [260, -220], [500, -196],
  [646, -142], [730, -30], [730, 66], [640, 156], [468, 198], [220, 212], [-96, 212], [-372, 198],
  [-580, 148], [-692, 58],
];
/** The palm's own second tone, at its base — strictly below the type band. */
const UNDER_LOCAL: [number, number][] = [
  [-560, 118], [-320, 144], [-60, 158], [220, 158], [470, 144], [560, 118],
  [560, 150], [468, 196], [220, 212], [-96, 212], [-372, 196], [-576, 150],
];
/** The forearm: enters from the right (this plate's arm) and leaves the frame. */
const ARM_LOCAL: [number, number][] = [
  [700, -60], [900, -110], [1120, -80], [1300, 0], [1400, 80], [1400, 140], [1300, 200],
  [1120, 220], [900, 220], [700, 185],
];
/** The four fingers' knuckles, left to right; the pinky has the least to give. */
const FING_LOCAL = [-500, -170, 170, 500];
/**
 * The camera sub-shots, six per entry: index 0 is the pre-roll (used only for the first 0.3 s whip),
 * 1–5 are movements 1–5. While a full line is on screen the framing must hold it: at zoom z the visible
 * half-width is 960/z, so a line of half-width 710 needs 960/z ≥ 710 + |cx − 960|. Every destination
 * below satisfies that at every kick-driven 1.5 % zoom overshoot.
 */
const SHOT: Record<1 | 2, [number, number, number, number][]> = {
  1: [
    [1240, 780, 1.30, 0.060], // pre-roll: the whip's origin (0.1 s of screen)
    [1010, 620, 1.17, 0.030], // 1 crash-dolly: in from above-right, roll +0.03
    [990, 662, 1.26, 0.014],  // 2 punch-in to the palm (zoom → 1.26)
    [1030, 634, 1.19, -0.020], // 3 orbit a little, roll −0.02
    [950, 618, 1.02, 0.006],  // 4 crane out (zoom → 1.02)
    [970, 602, 1.10, 0],      // 5 hold, kick-zoom
  ],
  2: [
    [1090, 560, 1.10, 0.060],
    [1010, 470, 1.12, 0.030],
    [992, 500, 1.20, 0.014],
    [1032, 486, 1.14, -0.020],
    [952, 500, 1.00, 0.006],
    [968, 480, 1.08, 0],
  ],
};

export default class Father extends InkedScene {
  /** The six lines this module serves, resolved once, by fragment (never by time). */
  private all: Line[] = Q.map(([q, nth]) => this.ctx.lyrics.get(q, nth));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, S = this.ctx.start;
    const n: 1 | 2 = this.ctx.params.n === 2 ? 2 : 1;
    const mine = n === 2 ? this.all.slice(3, 6) : this.all.slice(0, 3);

    // ---- the clock: five movements, every boundary snapped to a beat (never a round second)
    const au = this.ctx.audio;
    const bk = (x: number) => au.timeOfBeat(Math.round(au.beatAt(x)));
    const m = [S, bk(S + 1.5), bk(S + 2.9), bk(S + 4.3), bk(S + 5.7), this.ctx.end];
    const mk = t < m[1]! ? 0 : t < m[2]! ? 1 : t < m[3]! ? 2 : t < m[4]! ? 3 : 4;
    this.shot(s, t, m, mk, SHOT[n], f.a.kick);

    // the hand's arrival (a crash) and departure (it leaves in the last movement)
    const arrive = prog(t, S + 0.04, S + 1.3, ease.outCubic);
    const leave = prog(t, m[4]! - 0.10, m[4]! + 1.00, ease.outExpo);
    const slide = (1 - arrive + leave) * SLIDE;

    // the curl: how far the hand has closed, from the words already finished — sampled ON TWOS (`§6.1`)
    const tq = heldT(t);
    let done = 0, total = 0;
    for (const l of mine) for (const w of l.words) { total++; if (Lyrics.wordProgress(w, tq) >= 1) done++; }
    const curl = total ? done / total : 0;

    // ---- the world, back to front
    this.bookEdge(s);
    if (n === 2) this.wall(s);
    this.desk(s, arrive);
    this.streaks(s, t, mk);
    this.hand(s, n, slide, curl, arrive);
    this.lint(s);

    // ---- the words: one line at full size at a time, revealed by `Lyrics.wordProgress`
    const st = this.liveState(mine, t);
    this.words(s, t, n, mine[st.i]!, st);

    // ---- the boy: he stands on the word being sung, and walks off the page in the last movement
    const sp = this.stand(mine, t);
    const lay = this.layout(s, mine[sp.i]!);
    const feetY = BASE[n - 1]! - 1.05 * lay.size; // his soles rest on the ink-line, like a ledge
    const boyIn = prog(t, mine[0]!.words[0]!.start - 0.25, mine[0]!.words[0]!.start + 0.45, ease.outCubic);
    const exit = prog(t, m[4]!, m[4]! + 1.25, ease.inCubic);
    const bx = lerp(lay.centers[sp.w]!, -180, exit); // walks off the left edge as the hand leaves
    // movement 4: his shadow is thrown across the words (the one flat tone allowed over the type band)
    const sh = clamp(prog(t, m[3]! - 0.15, m[3]! + 0.9, ease.outCubic), 0, 1) * (1 - 0.7 * exit);
    if (sh > 0.01) {
      const poly = [v2(bx - 30, feetY - 4), v2(bx + 360, feetY + 52), v2(bx + 430, feetY + 124), v2(bx - 20, feetY + 42)];
      s.fill(poly, 340, rgba('night2', 0.16 * sh), { amp: 3 });
    }
    this.boy(s, t, n, bx, feetY, boyIn);

    return CEL.flat;
  }

  /** The camera: hold the movement's shot, whip into the next with `outExpo` (a cut, not a drift). */
  private shot(s: Sheet, t: number, m: number[], k: number, tab: [number, number, number, number][], kick: number) {
    const A = tab[k]!, B = tab[k + 1]!;
    const w = clamp(prog(t, m[k]! - 0.20, m[k]! + 0.32, ease.outExpo), 0, 1);
    const z = lerp(A[2], B[2], w) * (1 + 0.015 * kick); // the kick drives a small zoom, not a sine of t
    s.setCam(lerp(A[0], B[0], w), lerp(A[1], B[1], w), z, lerp(A[3], B[3], w));
  }

  // ------------------------------------------------------------------ page furniture
  /** The page: its edge and the folio only — the writing rules of v1 are gone on purpose. */
  private bookEdge(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9, taper: false });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4), taper: false });
    s.text('ii.', 178, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  /** The surface the hand rests on: one soft tone under the palm, at the very foot of the page. */
  private desk(s: Sheet, arrive: number) {
    if (arrive <= 0.01) return;
    s.fill([v2(260, 962), v2(1660, 960), v2(1660, 982), v2(260, 984)], 28, rgba('shade', 0.28 * arrive), { amp: 3 });
  }

  /** n = 2's background: the wall the words are carved into. Its hatch keeps clear of the type band. */
  private wall(s: Sheet) {
    const w = [v2(150, 240), v2(1780, 236), v2(1784, 720), v2(146, 724)];
    s.fill(w, 6, rgba('paper2', 0.55));
    s.stroke(w, 6, { closed: true, w: 2.2, color: rgba('ink', 0.6), taper: false, amp: 2 });
    // hatched only above and below the band, so no hatch line ever crosses the carved words
    s.hatch([v2(150, 240), v2(1780, 236), v2(1780, 394), v2(150, 396)], 7, { spacing: 22, angle: 1.35, color: rgba('graphite', 0.28), w: 1.2 });
    s.hatch([v2(150, 574), v2(1780, 572), v2(1784, 720), v2(146, 724)], 8, { spacing: 22, angle: 1.35, color: rgba('graphite', 0.28), w: 1.2 });
    // two chisel grooves framing the carved panel (both just outside the band)
    s.stroke([v2(230, 370), v2(1690, 366)], 9, { w: 1.8, color: rgba('graphite', 0.4), sketch: true, overshoot: 12 });
    s.stroke([v2(230, 590), v2(1690, 588)], 10, { w: 1.8, color: rgba('graphite', 0.34), sketch: true, overshoot: 12 });
    // a couple of stone joints, well off the band
    s.stroke([v2(620, 248), v2(628, 386)], 11, { w: 1.4, color: rgba('graphite', 0.25), sketch: true });
    s.stroke([v2(1240, 580), v2(1248, 714)], 12, { w: 1.4, color: rgba('graphite', 0.25), sketch: true });
  }

  /** Movement 1 only: speed streaks trailing the arriving hand, right of the type band. */
  private streaks(s: Sheet, t: number, mk: number) {
    if (mk !== 0) return;
    const S = this.ctx.start;
    const k = clamp(prog(t, S + 0.05, S + 0.5), 0, 1) * (1 - clamp(prog(t, S + 0.95, S + 1.35)));
    if (k <= 0.02) return;
    for (let i = 0; i < 7; i++) {
      const y = 520 + i * 54 + hash(i, 3) * 20;
      const len = 90 + 120 * hash(i + 9, 4);
      s.stroke([v2(1912, y), v2(1912 - len, y + 8 - 16 * hash(i + 3, 5))], 400 + i, { w: 2.2, color: rgba('graphite', 0.5 * k) });
    }
  }

  /** Dust around the hand: two short ticks per draw, above and below the bands. */
  private lint(s: Sheet) {
    for (let i = 0; i < 5; i++) {
      const x = 240 + hash(i, 7) * 1440;
      const l = 4 + hash(i, 13) * 6, a = 0.22 + 0.25 * hash(i, 17);
      const ya = 200 + hash(i, 11) * 110;
      s.stroke([v2(x, ya), v2(x + l, ya - l * 0.6)], 500 + i, { w: 1.6, color: rgba('graphite', a), taper: false });
      const yb = 958 + hash(i, 23) * 22;
      s.stroke([v2(x + 30, yb), v2(x + 30 + l, yb - l * 0.6)], 520 + i, { w: 1.6, color: rgba('graphite', a * 0.8), taper: false });
    }
  }

  // ------------------------------------------------------------------ the hand
  /** Map a palm-local point to the sheet: scale about the palm centre, then add the slide. */
  private hp(n: 1 | 2, x: number, y: number, slide: number): V2 {
    const c = PALM_C[n - 1]!, sc = PALM_S[n - 1]!;
    return v2(c.x + x * sc + slide, c.y + y * sc);
  }

  private hand(s: Sheet, n: 1 | 2, slide: number, curl: number, arrive: number) {
    if (arrive <= 0.001) return;
    const map = (x: number, y: number) => this.hp(n, x, y, slide);

    // the forearm, drawn first so the palm overlaps its wrist
    const arm = ARM_LOCAL.map(([x, y]) => map(x, y));
    s.fill(arm, 13, rgba('paper2', 0.96));
    s.stroke(arm, 13, { closed: true, w: 2.4, color: rgba('ink', 0.8), taper: false });
    // the cuff: a hatched band across the wrist, clear of the type band
    const cuff = [v2(720, -95), v2(860, -120), v2(860, 210), v2(720, 190)].map((p) => map(p.x, p.y));
    s.hatch(cuff, 14, { spacing: 16, angle: 1.9, color: rgba('graphite', 0.42), w: 1.4 });

    // the palm
    const palm = PALM_LOCAL.map(([x, y]) => map(x, y));
    s.fill(palm, 3, rgba('paper2', 0.96), { amp: 2.6 });
    s.stroke(palm, 3, { closed: true, w: 2.6, color: rgba('ink', 0.85), taper: false });
    s.hatch(UNDER_LOCAL.map(([x, y]) => map(x, y)), 4, { spacing: 20, color: rgba('graphite', 0.40), w: 1.4 });
    // the knuckle arc, above the type band
    const kn: V2[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; kn.push(map(lerp(-660, 660, u), -196 + 30 * Math.sin(Math.PI * u))); }
    s.stroke(kn, 12, { w: 1.8, color: rgba('graphite', 0.5), sketch: true, amp: 1.8 });

    // the four fingers: the hand closes in order as the sentence is spent
    for (let i = 0; i < FING_LOCAL.length; i++) {
      const c = clamp(curl * 4 - i, 0, 1);
      const core = this.chain(FING_LOCAL[i]!, -170, 84, 3, -Math.PI / 2, 0.12 + 1.55 * c);
      this.digit(s, core.map((p) => map(p.x, p.y)), 200 + i, 26 - i * 1.5, 22 - i * 1.5, rgba('shade', 0.94));
    }
    // the thumb: it barely closes — it is what tells the eye this is a hand
    const thumb = this.chain(-600, 150, 96, 2, (160 * Math.PI) / 180, 0.06 + 0.35 * curl);
    this.digit(s, thumb.map((p) => map(p.x, p.y)), 210, 48, 34, rgba('shade', 0.94));
  }

  /** A joint chain in palm-local coords: `joints` segments of `seg`, turning `turn` at every joint. */
  private chain(bx: number, by: number, seg: number, joints: number, dir0: number, turn: number): V2[] {
    const out: V2[] = [v2(bx, by)];
    let a = dir0, x = bx, y = by;
    for (let j = 0; j < joints; j++) { x += Math.cos(a) * seg; y += Math.sin(a) * seg; out.push(v2(x, y)); a += turn; }
    return out;
  }

  /** One digit: widen the centreline into a closed flat ribbon with a blunt tip, then ink it. */
  private digit(s: Sheet, core: V2[], seed: number, w0: number, w1: number, tone: string) {
    if (core.length < 2) return;
    const rib = this.ribbon(core, w0, w1);
    s.fill(rib, seed, tone);
    s.stroke(rib, seed, { closed: true, w: 2.4, color: rgba('ink', 0.8), taper: false });
  }

  /** Widen a polyline into a blunt-tipped ribbon (used to give a digit a body). */
  private ribbon(pts: V2[], w0: number, w1: number): V2[] {
    const n = pts.length, left: V2[] = [], right: V2[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(n - 1, i + 1)]!;
      let tx = b.x - a.x, ty = b.y - a.y;
      const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const w = lerp(w0, w1, i / Math.max(1, n - 1));
      left.push(v2(pts[i]!.x - ty * w, pts[i]!.y + tx * w));
      right.push(v2(pts[i]!.x + ty * w, pts[i]!.y - tx * w));
    }
    const a = pts[n - 2] ?? pts[0]!, b = pts[n - 1]!;
    let tx = b.x - a.x, ty = b.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    return [...left, v2(b.x + (tx / L) * w1 * 0.9, b.y + (ty / L) * w1 * 0.9), ...right.reverse()];
  }

  // ------------------------------------------------------------------ the words
  /** Fit a line to MAXW: measure the hscript advances at size 1, then solve for the size. */
  private layout(s: Sheet, l: Line) {
    let sumAdv = 0;
    for (const w of l.words) sumAdv += s.measureLetter(w.w, 'hscript', 1);
    const size = Math.max(48, Math.min(SIZE, Math.floor(MAXW / (sumAdv + 0.16 * (l.words.length - 1)))));
    const widths = l.words.map((w) => s.measureLetter(w.w, 'hscript', size));
    const gap = Math.round(size * 0.16);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (l.words.length - 1);
    const x0 = (W - total) / 2;
    const centers: number[] = [];
    let x = x0;
    for (let i = 0; i < widths.length; i++) { centers.push(x + widths[i]! / 2); x += widths[i]! + gap; }
    return { size, widths, gap, total, x0, centers };
  }

  /** Which line is on the palm: live, being absorbed, staying, or waiting as a ghost. */
  private liveState(mine: Line[], t: number):
    { k: 'live' | 'absorb' | 'stay' | 'ghost'; i: number } {
    for (let i = 0; i < mine.length; i++) if (t >= mine[i]!.start && t < mine[i]!.end) return { k: 'live', i };
    for (let i = 0; i < mine.length - 1; i++) if (t >= mine[i]!.end && t < mine[i]!.end + 0.16) return { k: 'absorb', i };
    if (t >= mine[mine.length - 1]!.end) return { k: 'stay', i: mine.length - 1 };
    for (let i = 0; i < mine.length; i++) if (t >= mine[i]!.start - 1.4 && t < mine[i]!.start) return { k: 'ghost', i };
    return { k: 'ghost', i: 0 };
  }

  /**
   * One line. Live: written word by word, each word ghosted 0.35 s before its voice (never led by more
   * than that), wet in `lantern`, dry in `ink`. A spent line slides into the fingers and fades; the last
   * line stays, alone, to the end of the plate.
   */
  private words(s: Sheet, t: number, n: 1 | 2, l: Line, st: { k: string; i: number }) {
    const L = this.layout(s, l);
    const base = BASE[n - 1]!;
    const carved = n === 2;

    if (st.k === 'ghost') {
      const g = clamp(prog(t, l.start - 1.4, l.start - 0.25), 0, 1);
      s.letter(l.text, W / 2, base, L.size, 60, { font: 'hscript', align: 'center', color: rgba('graphite', 0.2 * g), w: 3, amp: 1.6 });
      return;
    }

    // a spent line (absorb) or the last line (stay)
    if (st.k === 'absorb' || st.k === 'stay') {
      const k = st.k === 'absorb' ? clamp(prog(t, l.end, l.end + 0.16, ease.inQuart), 0, 1) : 0;
      const size = L.size * (1 - 0.7 * k);
      const sc = size / L.size, a = 1 - k;
      let x = L.x0 + k * (PALM_C[n - 1]!.x - W / 2);
      for (let i = 0; i < l.words.length; i++) {
        s.letterWritten(l.words[i]!.w, x, base, size, 70 + i, 1, {
          font: 'hscript', w: Math.max(2, size * 0.055), amp: 1.6,
          color: carved ? rgba('ink', 0.94 * a) : rgba('ink', 0.96 * a), a,
        });
        x += L.widths[i]! * sc + L.gap * sc;
      }
      return;
    }

    // live
    let x = L.x0;
    let penX = x;
    for (let i = 0; i < l.words.length; i++) {
      const w = l.words[i]!;
      const p = Lyrics.wordProgress(w, t);
      if (t >= w.start - 0.35) {
        s.letterWritten(w.w, x, base, L.size, 70 + i, p, {
          font: 'hscript', w: L.size * 0.055, amp: 1.9, ghost: true,
          color: p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95),
        });
      }
      if (p > 0 && p < 1) penX = x + L.widths[i]! * p;
      x += L.widths[i]! + L.gap;
    }
    // the pen: a lantern nib riding the word the voice is on
    if (t >= l.start - 0.1 && t <= l.end + 0.15) {
      s.stroke([v2(penX - 3, base - 8), v2(penX + 1, base + 20)], 80, { w: 4.2, color: rgba('lantern', 0.95) });
    }
  }

  /** The last word whose voice has begun — the boy stands on it. */
  private stand(mine: Line[], t: number) {
    let bi = 0, bw = 0;
    for (let i = 0; i < mine.length; i++) {
      for (let j = 0; j < mine[i]!.words.length; j++) if (mine[i]!.words[j]!.start <= t) { bi = i; bw = j; }
    }
    return { i: bi, w: bw };
  }

  // ------------------------------------------------------------------ the boy
  /**
   * The boy: a plain ink figure — a head, a spine and four limbs, no face (this plate's own boy, not
   * `open`'s filled silhouette). He is drawn out of the pen as the first word arrives, and steps
   * (on twos) while he stands on the live word.
   */
  private boy(s: Sheet, t: number, n: 1 | 2, fx: number, fy: number, k: number) {
    if (k <= 0.01 || fx < 40) return;
    const h = n === 2 ? 265 : 175;
    const step = Math.sin(heldT(t) * 2.2) * h * 0.05;
    const hipY = fy - h * 0.46, shY = fy - h * 0.66, headY = fy - h * 0.86, r = h * 0.13;
    const w = Math.max(2.4, h * 0.019);
    s.arc(fx, headY, r, -Math.PI * 0.5, -Math.PI * 0.5 + TAU, 331, { w: w * 1.1, color: rgba('ink', 0.95), amp: 2.6, a: k });
    const seg = (a: V2, b: V2, seed: number) => s.stroke([a, b], seed, { w, color: rgba('ink', 0.95), overshoot: 3, a: k });
    seg(v2(fx, headY + r), v2(fx, hipY), 332);
    seg(v2(fx, hipY), v2(fx - h * 0.1 + step, fy), 333);
    seg(v2(fx, hipY), v2(fx + h * 0.1 - step, fy), 334);
    seg(v2(fx, shY), v2(fx - h * 0.14, shY + h * 0.15 + step), 335);
    seg(v2(fx, shY), v2(fx + h * 0.14, shY + h * 0.15 - step), 336);
  }
}

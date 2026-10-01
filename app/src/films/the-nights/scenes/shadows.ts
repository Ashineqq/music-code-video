/*!plate
{
  "id": "shadows",
  "window": [9.5759, 17.1949],
  "device": "stamped",
  "staging": "instrument",
  "typePx": 80,
  "bands": [
    { "name": "sky",    "y": [96, 300] },
    { "name": "wall",   "y": [301, 632] },
    { "name": "live",   "y": [633, 726] },
    { "name": "row",    "y": [727, 884] },
    { "name": "ground", "y": [885, 984] }
  ],
  "movements": [
    { "at": 9.5759, "camera": "crane-in-left" },
    { "at": 11.005, "camera": "whip-right" },
    { "at": 12.433, "camera": "tilt-down" },
    { "at": 13.862, "camera": "punch-in" },
    { "at": 15.29,  "camera": "ground-hold" },
    { "at": 16.243, "camera": "crane-out" }
  ]
}
*/

// Plate 2 — `shadows` (9.576 → 17.195 s, three lines). The re-shoot. Read `open.ts` first: this plate
// answers the same contract with a different world. Density: `03-animation.md §3` (a new composition
// every 1.1–1.5 s — six movements over 7.6 s, one camera sub-shot each, cut on the beat grid). Lyric
// staging: `04-plates.md §3` (the line is an object of the world: **stamped**, never typed under the
// picture) and §5 (the stamping row is this plate's language alone — `open` rides a path along the
// ground, `never` presses a rubber block onto paper; three devices, three drawings).
//
// World: a dusk wall. A row of tall ink figures steps out of it — one for every word of the live line.
// Each word is pressed onto its figure's chest as that figure peels off the wall and walks away right;
// the word is left behind. While a line is being sung its whole row of words stands on the chest band,
// one line at a time; when the line is over its words drop to the ground and stand there as small
// objects. By the close the figures are gone, the ground is a field of left words, and the last line's
// strokes unravel into the film's animals and walk off the right edge.
//
// BANDS — the manifest's five strips. Nothing but the live line and its own substrate may enter `live`:
//   sky    96–300   the paper above the wall
//   wall   301–632  the dusk wall's parapet, its seams and the rain hatch (the hatch stops at 620)
//   live   633–726  the line being sung, stamped on the row's chests: baseline CHEST = 700, fitted to
//                   74–90 px, so ascenders reach ~638 and descenders ~719. Its substrate is the row of
//                   figures — that IS the plate's device, the word is pressed ON the chest.
//   row    727–884  the figures' bodies below the type: heads rise into `wall`, feet on GROUND = 884
//   ground 885–984  the words a line leaves behind, standing as objects (three rows, baselines 909 /
//                   941 / 976, sizes 26 / 30 / 34 px — the oldest row smallest), and the animals of
//                   movement 6 (y 904–981)
// The fitted size is 74–90 px: a stamp, and the contract's 46–90 px instrument band allows it — a word
// pressed onto a chest is an instrument, not a title (manifest "staging": "instrument"). The line is
// still capped at MAXW, and the camera shots that hold a full line are all ≤ 1.14 (see SHOT).
//
// Six movements, one camera sub-shot each, boundaries on the beats the window opens and closes on
// (it is exactly 16 beats long, beats 21 → 37; the lyric lines are dispatched from their own times):
//   1  9.576 → 11.005  the dusk wall draws in from the left; the ground and the lantern arrive; the row
//                      of figures steps out and takes line 1's first words on the chest.
//   2  11.005 → 12.433 the branded figures peel off and walk right; line 1 completes and drops.
//   3  12.433 → 13.862 the rain sweeps the upper wall; the figures shrink under it; line 2 stamps, drops.
//   4  13.862 → 15.290 line 3 stamps; the wall empties; the ground already stands two lines of words.
//   5  15.290 → 16.243 the words already left behind are the subject — the ground stands them as objects
//                      while line 3 is still being stamped above them
//   6  16.243 → 17.195 the words' ink lifts into a frieze of animals that walks off the right edge
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['When face to face with all our fears', 'Learned our lessons through the tears', 'Made memories we knew would never fade'];

/** The page furniture — identical to `open.ts`, because it is the same page (the film's motif). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];

/** The stamp: a nominal 152 px, shrunk to MAXW so the camera never has to crop the words being sung. */
const SIZE = 152, MAXW = 1420, GAP = 30;
/** The chest band the words are stamped on, and the wall they are stamped against. */
const CHEST = 700;
const WALL_TOP = 330, GROUND = 884, WALL_X0 = 150, WALL_X1 = 1770;
/** A figure is 336 px of ink standing on GROUND: head above the type, chest exactly in its band. */
const FIG_H = 336;
/**
 * Where a line's words are left standing once it is over: three rows of small objects in the ground
 * band [885, 984]. They are stacked bottom-up so no row's ink can reach the one below it, and the
 * oldest row is the smallest — the field recedes into the ground as the film goes on.
 */
const LEFT_Y = [909, 941, 976], SUNK = [26, 30, 34], SUNK_GAP = 22;

/**
 * The camera sub-shots (cx, cy, zoom, roll). A whip between two of these is a cut that costs nothing
 * (`03-animation.md §2`). While a line stands on the chest band the framing must contain it: at zoom z
 * the visible half-width is 960/z, and the fitted line spans [250, 1670], so the shots that hold a full
 * line are all ≤ 1.14 and centred near 960.
 */
const SHOT: [number, number, number, number][] = [
  [600, 688, 0.92, 0.006],   // 1 the wall draws in from the left; the row steps out (type still only left)
  [980, 660, 1.14, 0.015],   // 2 whip right: the figures peel away; line 1 spans [250,1670] → 960/1.14 = 842 ✓
  [1010, 700, 1.06, -0.012], // 3 tilt down under the rain (half-width 906)
  [900, 676, 1.12, -0.02],   // 4 punch-in as line 3 stamps, the wall empties (half-width 857, holds 1670)
  [960, 812, 1.18, 0.01],    // 5 the ground words (half-width 814, holds the ~1000 px rows)
  [960, 720, 0.92, 0],       // 6 crane out: the animals walk off the right edge
];

/** One line's stamp layout: the size the line is fitted to, and where each word sits. */
interface Lay { size: number; widths: number[]; xs: number[]; total: number; }

export default class Shadows extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const L = this.lines;

    // The six movement boundaries come from the music, not from round seconds: the window opens and
    // closes exactly on beats (21 → 37), and the interior cuts are beats inside it. Density is the
    // point of the re-shoot: the first five movements are 1.43 s each and the last 0.95 s (its length
    // is what is left of the window), a fresh framing every time rather than one drawing drifting.
    const b0 = Math.round(a.beatAt(this.ctx.start + 0.02));
    const MS = [this.ctx.start, a.timeOfBeat(b0 + 3), a.timeOfBeat(b0 + 6), a.timeOfBeat(b0 + 9), a.timeOfBeat(b0 + 12), a.timeOfBeat(b0 + 14)];
    let mk = 0;
    for (let k = 1; k < MS.length; k++) if (t >= MS[k]!) mk = k;

    // Every word of every line is laid out once, and the same rows are reused by the figures that carry
    // it and by the words themselves (they must agree, or a word would not sit on its chest).
    // Each line's words are measured once (at a 100 px reference) and scaled: measureLetter is linear
    // in the size and the kerning scales with it, so this is exact and keeps ~22 layout calls a frame
    // instead of one per layout. The same widths then serve the chest band and the ground rows.
    const U = L.map((l) => l.words.map((w) => s.measureLetter(w.w, 'readable', 100)));
    const CH = U.map((u) => this.layout(u, SIZE, GAP));
    const GR = U.map((u, m) => this.layout(u, SUNK[m]!, SUNK_GAP));

    this.shot(s, t, MS, mk);
    this.bookEdge(s, d);

    // the world first: the ground the figures stand on, then the dusk wall behind them, then the lamp
    this.groundLine(s, d, prog(t, this.ctx.start, this.ctx.start + 0.7, ease.outCubic));
    this.wall(s, d, prog(t, this.ctx.start + 0.25, this.ctx.start + 1.15, ease.outCubic));
    this.lantern(s, d, 210, GROUND, clamp(prog(t, this.ctx.start + 0.3, this.ctx.start + 1.0), 0, 1));

    // the rain and the row of figures: both are functions of the drawing, so both boil on twos
    const rainK = clamp(prog(t, L[1]!.start - 0.15, L[1]!.start + 0.45), 0, 1) * (1 - clamp(prog(t, L[2]!.start - 0.1, L[2]!.start + 0.6), 0, 1));
    this.rain(s, d, rainK);
    this.figures(s, f, CH, rainK);

    // the lyric, on top: the live line at stamp size, a line that is over left standing on the ground
    for (let m = 0; m < L.length; m++) this.words(s, f, L[m]!, m, CH[m]!, GR[m]!);

    // movement 6: the ink of the left words lifts as animals and walks out of the frame
    this.animals(s, f, prog(t, MS[5]!, this.ctx.end, ease.inOutCubic));
    return CEL.flat;
  }

  /** The camera: hold the movement's shot and whip into the next with outExpo (a cut, not a drift). */
  private shot(s: Sheet, t: number, MS: number[], k: number) {
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const w = clamp(prog(t, MS[k]! - 0.22, MS[k]! + 0.34, ease.outExpo), 0, 1);
    const phase = this.ctx.audio.beatAt(t) % 1;                    // kinetic zoom off the beat, not a sine of t
    // each stamp is a kick: the wall shudders for a fifth of a second (noise, not random, and seeded
    // by the drawing so it is one displacement per drawing, not a smear)
    const sh = this.stampPulse(t) * 2.6 * Math.sin(this.ctx.audio.beatAt(t) * 7.3);
    const z = lerp(A[2], B[2], w) * (1 + 0.024 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(A[0], B[0], w) + sh, lerp(A[1], B[1], w) + sh * 0.6, z, lerp(A[3], B[3], w) + sh * 0.0012);
  }

  /** The decaying pulse of the most recent stamp, so the wall shudders when a word is pressed on. */
  private stampPulse(t: number): number {
    let v = 0;
    for (const l of this.lines) for (const w of l.words) {
      const dt = t - w.start;
      if (dt >= 0 && dt < 0.2) v = Math.max(v, Math.pow(0.5, dt / 0.05));
    }
    return v;
  }

  /** The sheet: its edge and the folio only — the writing rules of v1 are gone (the contract). */
  private bookEdge(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.text('ii.', 176, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  /**
   * One line fitted to the frame from its words' widths at a 100 px reference (`u`). Widths scale
   * linearly with the size, so this is exact. The gap comes out of the budget before the words do, so
   * a nine-word line lands at or just under MAXW instead of a hundred px over it — and the camera
   * shots that hold a full line are all ≤ 1.14.
   */
  private layout(u: number[], size0: number, gap: number): Lay {
    const n = Math.max(1, u.length);
    const g = gap * (n - 1);
    const sum0 = u.reduce((a, b) => a + b, 0);
    const size = sum0 > 0 && (sum0 * size0) / 100 + g > MAXW ? Math.max(46, Math.floor(((MAXW - g) * 100) / sum0)) : size0;
    const widths = u.map((x) => (x * size) / 100);
    const total = widths.reduce((a, b) => a + b, 0) + g;
    const xs: number[] = [];
    let x = (W - total) / 2;
    for (let i = 0; i < n; i++) { xs.push(x); x += widths[i]! + gap; }
    return { size, widths, xs, total };
  }

  /** Movement 1's ground: the line every figure stands on, and the paper's lower margin under it. */
  private groundLine(s: Sheet, d: number, w: number) {
    if (w <= 0.01) return;
    const x1 = lerp(WALL_X0, WALL_X1, w);
    const g: V2[] = [v2(WALL_X0, GROUND + 3), v2(x1, GROUND + 3), v2(x1, 1006), v2(WALL_X0, 1006)];
    s.fill(g, 25, rgba('paper2', 0.95), { a: 0.85 });
    s.hatch(g, 26, { spacing: 20, angle: 2.32, color: rgba('shade', 0.5), w: 1 });
    const pts: V2[] = [];
    for (let i = 0; i <= 40; i++) pts.push(v2(lerp(WALL_X0, x1, i / 40), GROUND + 3 + Math.sin(i * 0.19) * 2));
    s.stroke(pts, 27, { w: 3.2, overshoot: 14, color: rgba('ink', 0.9) });
  }

  /**
   * Movement 1's wall: a flat `cool` dusk mass drawn in from the left, with a parapet it never quite
   * agrees with and a hatching that lives only in the upper band — the lower wall stays plain so the
   * chest band the words are stamped on is never crossed by the weather.
   */
  private wall(s: Sheet, d: number, w: number) {
    if (w <= 0.01) return;
    const x1 = lerp(WALL_X0, WALL_X1, w);
    const top: V2[] = [];
    for (let i = 0; i <= 26; i++) {
      const x = lerp(WALL_X0, x1, i / 26);
      top.push(v2(x, WALL_TOP + 16 * noise1(i * 0.5, 3) + 8 * noise1(i * 0.15, 9)));
    }
    const mass: V2[] = [...top, v2(x1, GROUND + 2), v2(WALL_X0, GROUND + 2)];
    s.fill(mass, 21, rgba('cool', 0.9), { a: 0.94 });
    s.stroke(top, 22, { w: 3, color: rgba('ink', 0.62), amp: 2.2 });
    // a seam every tenth of the wall: it is masonry, not a page
    for (let i = 1; i < 10; i++) {
      const x = lerp(WALL_X0, x1, i / 10);
      s.stroke([v2(x, WALL_TOP + 14), v2(x + 4, GROUND - 8)], 40 + i, { w: 1.2, sketch: true, color: rgba('night2', 0.32) });
    }
    const bot: V2[] = [];
    for (let i = 0; i <= 26; i++) bot.push(v2(lerp(WALL_X0, x1, i / 26), 596 + 15 * noise1(i * 0.6 + 3, 5)));
    s.hatch([...top, ...bot.reverse()], 30, { spacing: 18, angle: 1.16, color: rgba('night2', 0.3), w: 1.1 });
  }

  /**
   * Movement 3: the rain, as cel hatch in two bands over the upper wall (the far band a quarter of its
   * gap down the page per drawing, the near band a third), re-clipped every drawing, so the whole
   * curtain boils instead of sliding. It stops at the type: a word being sung is never rained on.
   */
  private rain(s: Sheet, d: number, k: number) {
    if (k <= 0.01) return;
    const band = (yTop: number, yBot: number, ang: number, sp: number, cyc: number, ph0: number, col: string, w: number) => {
      const ph = (((((d + ph0) % cyc) + cyc) % cyc)) * (sp / cyc);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const top: V2[] = [], bot: V2[] = [];
      for (let i = 0; i <= 24; i++) {
        const x = lerp(WALL_X0, WALL_X1, i / 24);
        top.push(v2(x + nx * ph, yTop + ny * ph + 10 * noise1(i * 0.7, 4)));
        bot.push(v2(x + nx * ph, yBot + ny * ph + 13 * noise1(i * 0.6 + 3, 5)));
      }
      s.hatch([...top, ...bot.reverse()], 200 + ph0, { spacing: sp, angle: ang, color: col, w });
    };
    band(336, 598, 1.18, 30, 4, 0, rgba('night2', 0.44 * k), 1.5);
    band(352, 620, 1.3, 54, 3, 1, rgba('night2', 0.3 * k), 1.2);
  }

  /**
   * The row: one tall figure for every word of the live line, stepped out of the wall under its own
   * word. It receives the word on the chest, then peels off the wall and walks right, fading — the word
   * stays where the chest was. Under the rain (movement 3) the whole row is shorter.
   */
  private figures(s: Sheet, f: Frame, CH: Lay[], rainK: number) {
    const t = f.t;
    const shrink = lerp(1, 0.6, clamp(prog(t, this.lines[1]!.start, this.lines[1]!.start + 0.5), 0, 1)
      * (1 - clamp(prog(t, this.lines[2]!.start - 0.25, this.lines[2]!.start + 0.5), 0, 1)));
    for (let m = 0; m < this.lines.length; m++) {
      const l = this.lines[m]!, lay = CH[m]!;
      const cell = lay.total / Math.max(1, l.words.length);
      for (let i = 0; i < l.words.length; i++) {
        const w = l.words[i]!;
        const born = Math.max(this.ctx.start + 0.12, w.start - 0.42);
        const peel = w.end + 0.1, gone = peel + 0.66;
        if (t < born || t > gone) continue;
        const emerge = clamp(prog(t, born, born + 0.24, ease.outCubic), 0, 1);
        const walk = clamp(prog(t, peel, gone, ease.inOutQuad), 0, 1);
        const fade = 1 - clamp(prog(t, peel + 0.18, gone), 0, 1);
        const h = FIG_H * shrink * (0.97 + 0.05 * hash(i + m * 11, 5));
        const x = lay.xs[0]! + (i + 0.5) * cell + walk * 350;
        const dy = (1 - emerge) * 44 + Math.sin(t * 6 + i) * 1.5 * (1 - walk) * rainK;
        const P = this.tall(x, h).map((q) => v2(q.x, q.y + dy));
        s.fill(P, 90 + i, rgba('ink', 0.92), { a: 0.92 * emerge * fade, amp: 2.4 });
        s.stroke(P, 90 + i, { closed: true, w: 2.4, amp: 2.4, color: rgba('ink', 0.85 * emerge * fade) });
      }
    }
  }

  /**
   * One line's words. While the line is being sung they stand on the chest band, revealed word by word
   * by `Lyrics.wordProgress` (a pale ghost shows a word's shape at most 0.36 s before the voice; the
   * bright impression never leads it). A stamp flashes and sprays at the moment the word is pressed on.
   * When the line is over its words slide down to their row and stand there as small ink objects — and
   * they are dark, because the page under them is paper (a light word on light ground is invisible).
   */
  private words(s: Sheet, f: Frame, l: Line, idx: number, lay: Lay, gr: Lay) {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const MS5 = a.timeOfBeat(Math.round(a.beatAt(this.ctx.start + 0.02)) + 14);
    const drop = clamp(prog(t, l.end + 0.06, l.end + 0.52, ease.inOutCubic), 0, 1);
    const fadeAll = 1 - 0.92 * clamp(prog(t, MS5, this.ctx.end, ease.inOutCubic), 0, 1);
    for (let i = 0; i < l.words.length; i++) {
      const w = l.words[i]!;
      if (t < w.start - 0.36) continue;
      const p = Lyrics.wordProgress(w, t);
      const size = lerp(lay.size, SUNK[idx]!, drop);
      const x = lerp(lay.xs[i]!, gr.xs[i]!, drop);
      const y = lerp(CHEST, LEFT_Y[idx]! + (hash(i, idx * 7) - 0.5) * 7, drop);
      const rot = (hash(i, idx * 13 + 3) - 0.5) * 0.07 * drop;
      const seed = 100 + idx * 20 + i;
      // 1 the ghost: the shape the word will take, ≤ 0.36 s ahead of the voice, gone once it is sung
      const g = (1 - p) * 0.14;
      if (g > 0.005) s.letter(w.w, x, y, size, seed, { font: 'readable', color: rgba('star', g), w: Math.max(2, size * 0.045), rot, a: fadeAll });
      // 2 the impression on the dark wall: light ink, written as the word is sung
      const light = 1 - drop;
      if (light > 0.02 && p > 0) {
        s.letterWritten(w.w, x, y, size, seed, p, {
          font: 'readable', w: Math.max(2.6, size * 0.075), amp: 1.8, rot,
          color: rgba('star', (p >= 1 ? 0.97 : 0.95) * light * fadeAll),
        });
        const since = t - w.start;
        if (since >= -0.02 && since < 0.34) this.press(s, x + lay.widths[i]! / 2, y, size, since, seed);
      }
      // 3 the object on the ground: dark ink on paper, with a plinth so it is a thing and not a line
      if (drop > 0.02) {
        s.letter(w.w, x, y, size, seed, { font: 'readable', color: rgba('ink', 0.9 * drop * fadeAll), w: Math.max(2.4, size * 0.07), rot });
        if (drop > 0.5) {
          const k = (drop - 0.5) * 2 * fadeAll;
          s.stroke([v2(x - 4, y + size * 0.17), v2(x + gr.widths[i]! + 6, y + size * 0.17)], seed + 500, { w: 1.4, sketch: true, color: rgba('graphite', 0.5 * k) });
          s.stroke([v2(x + gr.widths[i]! / 2, y + size * 0.17), v2(x + gr.widths[i]! / 2, y + size * 0.34)], seed + 501, { w: 1.2, sketch: true, color: rgba('graphite', 0.4 * k) });
        }
      }
    }
  }

  /** The stamp itself: a warm flash and a spray of light specks at the instant a word is pressed on. */
  private press(s: Sheet, cx: number, y: number, size: number, since: number, seed: number) {
    const k = 1 - clamp(since / 0.34, 0, 1);
    const burst = clamp(prog(since, 0, 0.16), 0, 1);
    s.blob(cx, y - size * 0.36, 9 * k, seed, { colour: rgba('lantern', 0.5 * k), n: 7, jag: 0.6 });
    for (let i = 0; i < 5; i++) {
      const ang = -0.7 - i * 0.34;
      const r = 14 + 48 * ease.outQuad(burst) * (0.6 + 0.4 * hash(i, seed));
      s.blob(cx + Math.cos(ang) * r, y - size * 0.36 + Math.sin(ang) * r * 0.7, (2.4 + 3 * k) * (1 - burst * 0.4), seed + i * 7, { colour: rgba('star', 0.55 * k), n: 5, jag: 0.7 });
    }
  }

  /**
   * Movement 6: the left words' ink lifts and becomes the film's animals, which walk out of the right
   * edge. The three animals are `open`'s own polylines — a motif used in two plates has to look
   * identical, and here it is the ground the whole verse was about walking.
   */
  private animals(s: Sheet, f: Frame, k: number) {
    if (k <= 0.01) return;
    const t = f.t;
    const a = this.ctx.audio;
    const b0 = a.timeOfBeat(Math.round(a.beatAt(this.ctx.start + 0.02)) + 14);
    const kinds = [this.horse, this.bird, this.cat, this.horse, this.bird, this.cat, this.horse];
    for (let i = 0; i < kinds.length; i++) {
      const tb = b0 + i * 0.13;
      const drawP = clamp(prog(t, tb, tb + 0.26, ease.outQuad), 0, 1);
      if (drawP <= 0) continue;
      const walk = clamp(prog(t, tb + 0.08, this.ctx.end, ease.inOutQuad), 0, 1);
      const x = lerp(360 + i * 62, 1780, walk);
      const y = 946 + (i % 2) * 9;
      const pts = kinds[i]!(x, y, 0.9 + 0.12 * hash(i * 1.7, 3));
      s.stroke(pts.slice(0, Math.max(2, Math.ceil(pts.length * drawP))), 300 + i, { w: 3.2, taper: false, color: rgba('ink', 0.9 * k), overshoot: 3 });
      s.stroke([v2(x - 30, y + 26), v2(x + 44, y + 26)], 330 + i, { w: 1.4, sketch: true, color: rgba('graphite', 0.4 * k) });
    }
  }

  /** The lantern: the film's one instrument, carried over from `open` and lit at the ground's left end. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    if (lit <= 0.001) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.stroke(body, 51, { w: 3.2, closed: true, color: rgba('ink', 0.95) });
    s.fill(body, 51, rgba('lantern', 0.5 * lit * flick), { a: 0.9 });
    s.stroke([v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 52, { w: 3, color: rgba('ink', 0.9) });
    s.blob(x, y - 22, 11 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 18, 5 * lit, 54, { colour: rgba('star', 0.9 * lit), n: 7, jag: 0.5 });
  }

  /**
   * One tall figure, front-facing, feet on GROUND, `h` px tall, written in hundredths of its own height
   * so the rain's shrink is one number on one outline (a figure redrawn to change size reads as a
   * different person). Slim: 32 units wide against 97 tall.
   */
  private tall(x: number, h: number): V2[] {
    const S = h / 100;
    const P: V2[] = [];
    const p = (dx: number, dy: number) => { P.push(v2(x + dx * S, GROUND - dy * S)); };
    // up the left side: foot, shin, knee, hip, the arm held off the body, shoulder, neck
    p(-6, 0); p(-9, 24); p(-6, 40); p(-12, 58); p(-16, 62); p(-12, 70); p(-7, 76);
    // the head, from the left jaw over the crown to the right jaw
    for (let i = 0; i <= 6; i++) {
      const a = lerp(Math.PI * 0.94, Math.PI * 0.06, i / 6);
      p(Math.cos(a) * 6.4, 89 + Math.sin(a) * 8);
    }
    // down the right, mirrored, then back along the ground through the notch between the legs
    p(7, 76); p(12, 70); p(16, 62); p(12, 58); p(6, 40); p(9, 24);
    p(6, 0); p(3, 0); p(1, 17); p(-1, 17); p(-3, 0);
    return P;
  }

  // three animals, each a single ink line — `open`'s own three, unchanged (the film's vocabulary)
  private horse = (x: number, y: number, k: number): V2[] => [
    v2(x - 34 * k, y), v2(x - 26 * k, y - 22 * k), v2(x - 4 * k, y - 28 * k), v2(x + 10 * k, y - 46 * k),
    v2(x + 24 * k, y - 30 * k), v2(x + 30 * k, y - 44 * k), v2(x + 36 * k, y - 42 * k), v2(x + 30 * k, y - 26 * k),
    v2(x + 40 * k, y), v2(x + 30 * k, y - 14 * k), v2(x + 20 * k, y), v2(x + 14 * k, y - 16 * k), v2(x, y),
    v2(x - 10 * k, y - 18 * k), v2(x - 22 * k, y),
  ];
  private bird = (x: number, y: number, k: number): V2[] => [
    v2(x - 26 * k, y), v2(x - 20 * k, y - 12 * k), v2(x - 6 * k, y - 16 * k), v2(x, y - 10 * k),
    v2(x + 8 * k, y - 20 * k), v2(x + 14 * k, y - 8 * k), v2(x + 22 * k, y), v2(x + 8 * k, y + 6 * k), v2(x - 8 * k, y + 6 * k),
  ];
  private cat = (x: number, y: number, k: number): V2[] => [
    v2(x - 26 * k, y), v2(x - 18 * k, y - 18 * k), v2(x - 10 * k, y - 24 * k), v2(x + 2 * k, y - 22 * k),
    v2(x + 12 * k, y - 36 * k), v2(x + 16 * k, y - 22 * k), v2(x + 24 * k, y), v2(x + 16 * k, y - 10 * k), v2(x + 6 * k, y),
    v2(x - 2 * k, y - 10 * k), v2(x - 12 * k, y), v2(x - 26 * k, y - 30 * k), v2(x - 32 * k, y - 12 * k),
  ];
}

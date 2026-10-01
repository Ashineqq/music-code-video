/*!plate
{
  "id": ["nights1", "nights2"],
  "window": [40.0521, 123.3854],
  "device": "stamped",
  "staging": "subject",
  "typePx": 140,
  "maxWidth": 1320,
  "bands": [
    { "name": "holes",    "y": [96, 280] },
    { "name": "pictures", "y": [284, 430] },
    { "name": "crease",   "y": [432, 476] },
    { "name": "live",     "y": [478, 890] },
    { "name": "shelf",    "y": [892, 984] }
  ],
  "movements": [
    { "at": 40.0521, "camera": "crane-in" },
    { "at": 41.0045, "camera": "crane-out" },
    { "at": 41.9568, "camera": "punch-in" },
    { "at": 42.9092, "camera": "whip-right" },
    { "at": 43.8616, "camera": "tilt-down" },
    { "at": 44.8140, "camera": "crane-in" },
    { "at": 45.7664, "camera": "whip-left" },
    { "at": 46.2426, "camera": "push-in" },
    { "at": 47.1949, "camera": "tilt-up" },
    { "at": 47.6711, "camera": "whip-right" },
    { "at": 48.6235, "camera": "crash-dolly-through" },
    { "at": 49.5759, "camera": "whip-down" },
    { "at": 50.5283, "camera": "push-in" },
    { "at": 51.9568, "camera": "crane-out" },
    { "at": 53.3854, "camera": "tilt-down" },
    { "at": 54.3378, "camera": "whip-left" },
    { "at": 55.2902, "camera": "crane-out" },
    { "at": 56.2426, "camera": "push-in" },
    { "at": 57.1949, "camera": "whip-left" },
    { "at": 58.1473, "camera": "hold" },
    { "at": 116.2426, "camera": "crane-in" },
    { "at": 116.7188, "camera": "push-in" },
    { "at": 117.6711, "camera": "crane-out" },
    { "at": 118.6235, "camera": "tilt-down" },
    { "at": 119.5759, "camera": "whip-left" },
    { "at": 120.0521, "camera": "whip-right" },
    { "at": 121.0045, "camera": "push-in" },
    { "at": 121.9568, "camera": "crane-out" },
    { "at": 122.4330, "camera": "hold" }
  ]
}
*/
// Plate 6/14 — `nights` (nights1 40.0521 → 59.0997, n = 1, 19.05 s; nights2 116.2426 → 123.3854, n = 2,
// 7.14 s). ONE module serves both entries through `ctx.params.n`, so the manifest above carries one
// movement table per entry — the gate checks each entry's table inside its own window, and both are the
// code's shot lists. nights1 (the long one, where the plate's design lives): twenty reframes, one per
// 0.95–1.43 s, from `N1_OFF`/`N1_SHOT` below. nights2: nine reframes, one per 0.48–0.95 s, from
// `N2_OFF`/`N2_SHOT` — 116.2426 / 116.7188 / 117.6711 / 118.6235 / 119.5759 / 120.0521 / 121.0045 /
// 121.9568 / 122.4330 (crane-in, push-in, crane-out, tilt-down, whip-left, whip-right, push-in, crane-out,
// hold), the last of them 0.95 s before the entry's cut. Every framing below is inside the hold-the-line
// window computed in the BANDS note: while a line is sung the whole stamped block stays in frame.
//
// World: **an album of three photographs** — three prints of one size lying loose on the album's page in a
// fanned pile (slot 1 deepest, slot 3 on top), the film's thread crossing the page as a CREASE (the
// pictures' horizon, and the line the page tears on at the drop), a shelf under them, the lantern at the
// page's left. Device: **stamped** — a print rises off the pile, its picture comes up under a developer's
// edge, and its line is pressed in by a carriage that walks word by word along the row. A finished print is
// laid back into the pile, where the print above it covers everything but its fanned tab: so exactly ONE
// caption is on the page at a time, and the pile itself enforces "one line at full size at a time".
// In nights2 all three prints are made (the third is the father and the son at the same height) and there
// is no blank print left for the words, so the two lines are stamped on the PAGE and, when a line is done,
// drain down off its lower edge — the same rule nights1's third line follows ("the words land on the page
// itself"): a picture or the words, never both.
//
// The six movements of `plans/pages-brief.md`, each reframed 3–5 times (the shot list names them):
//   1  40.05 → 41.96  the chorus's night lifts off the page's head; the album is there: three undeveloped
//                     prints, the lantern, the shelf. Print 1 is already up (this window starts on line 1's
//                     first beat, so there is no intro), its mask is laid on, and the first words land.
//   2  41.96 → 44.81  print 1 develops under the wash — the child on the shore comes up with the words —
//                     and line 1 is pressed in row by row ("my father told me" / "when I was just a child").
//                     At the beat after "child" (43.8616) the print is laid into the pile and print 2's
//                     mask goes down.
//   3  44.81 → 46.24  print 2 rises: the kite, its string, the hatched cloud, the sky developing; line 2
//                     is pressed in `rose` (the film's memory red) and the three windows of light ignite.
//   4  46.24 → 47.19  print 2 is laid down on the same beat the page tears (47.1949); the front of the
//                     pile is the blank third print — the empty frame — and the last word ("die") lands.
//   5  47.19 → 53.39  THE TEAR. The crease rips open (tTear = 47.1949, the drop), the night pours through
//                     the slit — rising over the pictures slowly (3.6 s), falling over the shelf in 0.22 s
//                     so the live band is night before the next word — and the prints sink into it, print 1
//                     first and the blank third print last. The father's "My" and "father" land in the night.
//   6  53.39 → 59.10  the page is night: the blank frame's silhouette the last object, the three windows of
//                     light the last lights, the lantern's wash handing its colour to the words. "told"
//                     (53.75) and "me" (56.93) are pressed into the night in `lantern` — one long gesture,
//                     ~2.8 s of singing per word, staged as one: the carriage presses and stays, while the
//                     camera drifts along the line.
//
// BANDS (sheet y — the manifest's table). Every element belongs to one band, and the hard rule the table
// enforces is that **the live band [478, 890] carries no ink but the live line's** (only flat tones may pass
// under it). Checked element by element: the pictures' ink stops at the crease (the hill outline, the
// figure's feet, the shore lines and the boy's hand all land on 450–463, inside the crease band); the
// prints' papers and the night are flats; the prints' inner edge is at 260 (above) and 900 (below); the
// corner tabs are 230–270 and 896–930, the pencil tallies 894–914, the shelf's edge 936, and the lantern is
// wholly inside the shelf band; the sunk prints' silhouettes carry only a top and a bottom ragged edge
// (their sides are left to the night), and both edges stay outside 478–890; the flood's ripples ride above
// the crease. The one caveat, stated rather than hidden: the crease IS the pictures' horizon, so a picture's
// own ground line meets it exactly — nothing crosses into the live band.
//   holes    [96, 280]   the page's head, the binding stitches, the three windows of light, the prints' tabs
//   pictures [284, 430]  the sky inside each print: the boy, the kite and its string, the cloud, the hills
//   crease   [432, 476]  the film's thread: the pictures' horizon, the tear's ragged edges
//   live     [478, 890]  the sung line only: the mask, the impressions, the carriage
//   shelf    [892, 984]  the shelf board, the lantern, the pile's shadow
// The printed block's ink sits at y 519–883 (two rows, the last on ROW_B = 840, leading 1.32; sizes 142 /
// 153 / 176 measured from the font, floored at 140 = the manifest's `typePx`). The camera has to hold it:
// the visible half-height is 540/z, so cy ∈ [890 − 540/z, 478 + 540/z] — every shot is inside it (at
// z = 1.28 that is cy ∈ [468, 900]); the visible half-width is 960/z, so the live block (its right edge at
// 1642) needs cx ∈ [block_right − 960/z, block_left + 960/z] — checked per shot, the stiffest being z = 1.28
// with cx ≈ 900–1000. No shot goes past z = 1.34 while a line is live.
//
// Determinism: every wobble is seeded with `s.d` (the drawing index, exposure on twos), every moving
// quantity is quantised to the drawing where it should hold, and the only time sources in this file are
// `f.t` and `s.d` — no RNG, no wall clock, no state carried between frames. Every word of every line in
// both windows is revealed by `Lyrics.wordProgress`.
import { InkedScene, Sheet, rgba, v2, clamp, lerp, ease, prog, noise1, hash, heldT, CEL } from './_ink';
import type { V2, InkOpts } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import { WINDOWS } from './chorus';

/** The five lines this module owes — the three of nights1 and the two of nights2, by occurrence (the same
 *  sentence is sung twice: "My father told me when" is occurrence 0 then 1, "My father told me" alone is
 *  occurrence 1 because the longer line matches first — the timeline counts them the same way). */
const Q: [string, number][] = [
  ['My father told me when', 0],              // 40.06  nights1 line 1
  ['These are the nights that never die', 0], // 43.91  nights1 line 2
  ['My father told me', 1],                   // 47.38  nights1 line 3 (the drop)
  ['My father told me when', 1],              // 116.34 nights2 line 1
  ['These are the nights that never die', 1], // 120.13 nights2 line 2
];
/** The words per row of each block: the stamp is a two-line stamp, pressed row by row, left to right. */
const SPLITS = [[4, 6], [4, 3], [4]];

// ---- the page ------------------------------------------------------------------------------------
/** The book's page edge — the same furniture as `open`, so every plate is the same book. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The film's thread: the crease across the page, the pictures' horizon, the line the page tears on. */
const CREASE = 450, TX0 = 210, TX1 = 1736;
/** The binding: three stitched holes in the page's left margin (band `holes`). */
const STITCH: V2[] = [v2(118, 190), v2(118, 254), v2(118, 318)];

// ---- the pile ------------------------------------------------------------------------------------
/** Three prints, one size, fanned 64 px apart: slot 1 is the deepest, slot 3 lies on top of the pile. */
const PR_W = 1480, PR_H = 700, PR_Y = 230, SLOT = [170, 234, 298];
/** The print's white border, and the picture inside it (the sky above the crease, a flat foreground). */
const BORD = 30, IMG_B = 900;
/** The stamped block: left-aligned rows inside these caps. The width is what keeps the pile honest — a
 *  lifted print's paper must reach past the block of the print under it (right edge ≤ 1650 at slot 2). */
const CAP_X = 130, CAP_W = [1300, 1280, 1320];
/** The page's own line (the lines that have no print): its left edge and its cap. */
const PAGE_X = 250, PAGE_W = 1320;
/** The block's rows: the last row's baseline, the leading, the word gap, the size window. */
const ROW_B = 840, LEAD = 1.32, GAP = 0.14, SIZE_MAX = 176, SIZE_MIN = 140;
/** A lifted print is the same size and place as when it lay in the pile (the pictures' horizons must stay
 *  one line): what says "picked up" is the shadow it throws on the prints under it, and being drawn on top. */
const SHADOW = 26;
/** The pencil tally on each print's tab — one stroke, two, three: the pile counts itself. */
const TALLY_X = 44, TALLY_Y = 906;
/** How far each print drifts into the night (they stay inside the page's bottom edge), and how long after
 *  the tear it goes: print 1 first, the blank third print last. */
const SINK = [24, 40, 54], SINK_T = [0.05, 0.2, 0.36];
/** A finished page-line drains down off the page's lower edge (nights2 only; nights1's last line stays). */
const DRAIN = 400, DRAIN_T = 0.22;

// ---- the shelf (below the prints: the pile stands on it, so it is drawn first) --------------------
const SH_TOP = 934, SHELF = 950;
const LAMP = { x: 132, y: 968 };

// ---- the camera: the shot list (see the manifest's movement table — the verbs are those rows) -----
/** nights1: a reframe every 1–2 beats, each one holding the live block (see the BANDS note). */
const N1_OFF = [0, 2, 4, 6, 8, 10, 12, 13, 15, 16, 18, 20, 22, 25, 28, 30, 32, 34, 36, 38];
const N1_SHOT: [number, number, number, number][] = [
  [960, 470, 1.28, 0.020],   // crane-in             the night leaves the page's head as the album arrives
  [905, 600, 1.08, -0.012],  // crane-out            the page: the pile, the lantern, the shelf
  [900, 570, 1.18, 0.010],   // punch-in             print 1 up, the mask laid, the first words landing
  [905, 650, 1.28, -0.016],  // whip-right           the carriage walking row 1
  [890, 560, 1.12, 0.016],   // tilt-down            the wash crosses the print: row 2, the sky darkening
  [950, 570, 1.26, -0.010],  // crane-in             the picture up on the shore, the block below it
  [950, 600, 1.06, 0.014],   // whip-left            print 1 laid down; print 2's mask appears
  [975, 650, 1.24, -0.012],  // push-in              print 2 up: the carriage pressing in `rose`
  [960, 560, 1.26, 0.018],   // tilt-up              the kite climbing, the three windows igniting
  [960, 620, 1.28, -0.026],  // whip-right           the blank print in front; "die" landing
  [960, 680, 1.22, 0.020],   // crash-dolly-through  THE TEAR along the crease: the night coming through
  [1000, 700, 1.18, -0.014], // whip-down            the flood: the prints sinking, "My" in the night
  [930, 640, 1.12, 0.016],   // push-in              "father" — the long gesture
  [940, 860, 1.34, -0.012],  // crane-out            the shelf and its shadow: the night takes it
  [960, 580, 1.04, 0.010],   // tilt-down            the page wide: three silhouettes, the empty one last
  [905, 720, 1.24, -0.018],  // whip-left            "told": the carriage down in the night
  [960, 550, 1.02, -0.006],  // crane-out            the whole night page
  [960, 700, 1.26, 0.014],   // push-in              "me" — the last impression
  [1000, 640, 1.24, 0.020],  // whip-left            the words alone in the night
  [960, 560, 1.02, -0.008],  // hold                 the held end: the windows of light, the empty frame
];
/** nights2: nine reframes in 7.14 s, the same design one stage on. */
const N2_OFF = [0, 1, 3, 5, 7, 8, 10, 12, 13];
const N2_SHOT: [number, number, number, number][] = [
  [960, 600, 1.04, -0.008],  // crane-in    the night page: the father and the son in the front print
  [1000, 620, 1.18, 0.012],  // push-in     the carriage down: row 1 of line 1 in `star`
  [980, 560, 1.28, -0.014],  // crane-out   row 1 completing; the prints standing in the night
  [975, 660, 1.26, 0.016],   // tilt-down   row 2 ("was just a child")
  [950, 700, 1.20, -0.012],  // whip-left   the last words; the line about to drain
  [980, 640, 1.26, 0.018],   // whip-right  the drain on the downbeat; line 2's carriage arriving
  [1000, 560, 1.20, -0.016], // push-in     "never" pressed in `rose`
  [980, 700, 1.24, 0.014],   // crane-out   "die"; the two prints' tabs and the empty text
  [960, 580, 1.04, -0.010],  // hold        the whole page: the father and the son, the three windows
];

/** One stamped block: the line, where it lives, its fitted size, and where each word sits. */
interface Cap {
  l: Line;
  /** the print it is stamped into (0..2), or −1 for the page itself */
  home: number;
  left: number;
  /** the drawn size in sheet px (≥ SIZE_MIN) */
  size: number;
  /** words per row, first row first */
  rows: number[];
  /** per row: the baseline */
  ys: number[];
  /** per row, per word: the word's left edge */
  xs: number[][];
}
export default class Nights extends InkedScene {
  /** Which telling this entry is: 1 = the prints being made, 2 = the page with the last print full. */
  private readonly n = Number(this.ctx.params?.n ?? 1) >= 2 ? 2 : 1;
  private readonly A = this.ctx.audio;
  /** The lines of this entry (three at n = 1, two at n = 2). */
  private readonly lines: Line[] = this.n === 2
    ? [this.ctx.lyrics.get(Q[3]![0], Q[3]![1]), this.ctx.lyrics.get(Q[4]![0], Q[4]![1])]
    : [this.ctx.lyrics.get(Q[0]![0], Q[0]![1]), this.ctx.lyrics.get(Q[1]![0], Q[1]![1]), this.ctx.lyrics.get(Q[2]![0], Q[2]![1])];
  /** Shaped once, in init (the fonts are loaded by then and the data cannot change). */
  private caps: Cap[] = [];
  /** The reframe table in song seconds, built from the beat grid — never from round numbers. */
  private shots: { at: number; cx: number; cy: number; z: number; roll: number }[] = [];
  /** The drop's beat (the page tears there) and each print's lay-down beat. */
  private tear = 0;
  private downBeat: number[] = [];

  override init() {
    const A = this.A;
    const start = this.ctx.start;
    const bi = Math.round(A.beatAt(start + 0.02));            // the window's first beat (the edit cut on it)
    const off = this.n === 2 ? N2_OFF : N1_OFF;
    const shot = this.n === 2 ? N2_SHOT : N1_SHOT;
    this.shots = off.map((k, i) => {
      const [cx, cy, z, roll] = shot[i]!;
      return { at: i === 0 ? start : A.timeOfBeat(bi + k), cx, cy, z, roll };
    });
    // the tear: the beat at/before the first word of the last line (the drop) — 47.1949 in nights1
    this.tear = this.n === 1 ? A.timeOfBeat(Math.floor(A.beatAt(this.lines[2]!.words[0]!.start + 0.02))) : start;
    // each print is laid back into the pile on the first beat at/after its line's last word
    this.downBeat = this.lines.map((l) => {
      const w = l.words[l.words.length - 1]!;
      return A.timeOfBeat(Math.ceil(A.beatAt(w.end + 0.02)));
    });
    this.caps = this.buildCaps();
  }

  /** Fit each line's block to its cap and lay every word out (measured with the font, never guessed). */
  private buildCaps(): Cap[] {
    const s = this.sheet;
    // nights1: line 1 → print 1, line 2 → print 2, line 3 → the page (no blank print is left for it).
    // nights2: both lines on the page — all three prints are pictures already, so the words live there.
    const homes = this.n === 2 ? [-1, -1] : [0, 1, -1];
    const out: Cap[] = [];
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      const home = homes[i]!;
      const nw = l.words.length;
      let rows = SPLITS[i]!.slice();
      if (rows.reduce((a, b) => a + b, 0) !== nw) rows = [nw];   // a re-aligned lyric still lays out
      const maxw = home < 0 ? PAGE_W : CAP_W[home]!;
      const left = home < 0 ? PAGE_X : SLOT[home]! + CAP_X;
      // the advance is linear in size, so measuring every row at SIZE_MAX gives the exact fit
      let unit = 1;
      for (const r of rows) {
        const k = Math.max(1, r);
        let w = 0;
        for (let q = 0; q < k; q++) w += s.measureLetter(l.words[q]!.w, 'readable', SIZE_MAX);
        unit = Math.max(unit, w + GAP * SIZE_MAX * (k - 1));
      }
      const size = clamp(Math.floor((maxw * SIZE_MAX) / unit), SIZE_MIN, SIZE_MAX);
      const base = rows.length > 1 ? ROW_B - LEAD * size * (rows.length - 1) : 760;
      const ys = rows.map((_, r) => base + r * LEAD * size);
      const xs: number[][] = [];
      let wi = 0;
      for (const r of rows) {
        const row: number[] = [];
        let x = left;
        for (let q = 0; q < Math.max(1, r); q++) {
          row.push(x);
          x += s.measureLetter(l.words[wi++]!.w, 'readable', size) + GAP * size;
        }
        xs.push(row);
      }
      out.push({ l, home, left, size, rows, ys, xs });
    }
    return out;
  }

  // ------------------------------------------------------------------ draw
  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    this.cam(s, t);
    const nightish = this.n === 2;
    // the flood clock. n = 1: the slit opens at the tear and the night takes the page — up over the
    // pictures slowly (3.6 s), down over the shelf in 0.22 s so the live band is night before the next
    // word lands. n = 2: the page is already the night the chorus left it in.
    const up = nightish ? 60 : lerp(CREASE, 60, ease.outCubic(prog(t, this.tear + 0.08, this.tear + 3.6)));
    const down = nightish ? 1080 : lerp(CREASE, 1080, clamp((t - this.tear) / 0.22));
    const covered = (y: number) => t >= this.tear && y >= up && y <= down;

    // the draw order is the world's depth, and it differs by entry. nights2: the night is the page's
    // ground, so it goes down first, then the shelf, the prints, the crease. nights1: the shelf and the
    // prints are there in the day's paper, the night pours OVER the prints at the tear, and the page's
    // furniture is re-drawn after it — in the day's ink where the paper is, in reverse where it is not
    // (the frame is outside the prints, so drawing it last never crosses them).
    if (nightish) this.flood(s, d, t, up, down, true);
    if (nightish || !covered(SHELF)) this.shelf(s, d, t, nightish);
    const live = this.n === 1 ? this.livePrint(t) : -1;
    for (let i = 0; i < 3; i++) if (i !== live) this.print(s, t, i);
    if (live >= 0) this.print(s, t, live);                    // the live print is drawn last (on top)
    if (nightish || t < this.tear) this.crease(s, d, nightish);
    if (!nightish && t >= this.tear) {
      this.flood(s, d, t, up, down, false);                   // nights1: the night pours over the prints
      for (let i = 0; i < 3; i++) this.sunk(s, d, t, i);
      this.lastLight(s, d, t);
    }
    this.page(s, d, covered, up, down);
    if (this.n === 1) this.leave(s, t);
    for (let i = 0; i < this.caps.length; i++) this.caption(s, t, i);
    this.windows(s, d, t, nightish);
    return CEL.flat;
  }

  /** nights1 opens on the sheet the chorus left it as: the night lies across the page's head (with the
   *  chorus's stitched holes in it) and withdraws upward over the plate's first beat, so the album comes
   *  out from under it — the cut from chorus1 is a page leaving, not a jump to a new drawing. */
  private leave(s: Sheet, t: number) {
    const off = prog(t, this.ctx.start, this.ctx.start + 0.45, ease.outCubic);
    if (off >= 1) return;
    const yb = lerp(330, 34, off);
    const top: V2[] = [], bot: V2[] = [];
    for (let k = 0; k <= 18; k++) {
      const x = lerp(70, 1850, k / 18);
      top.push(v2(x, -20));
      bot.push(v2(x, yb + noise1(k * 0.8, 31) * 5));
    }
    s.fill([...top, ...bot.slice().reverse()], 210, rgba('night', 0.98), { a: 1, amp: 2.2 });
    s.stroke(bot, 211, { w: 2, color: rgba('cool', 0.6), amp: 2.6 });
    for (let i = 0; i < STITCH.length; i++) {
      const p = STITCH[i]!;
      s.arc(p.x, p.y, 9, -1.1, 1.1, 212 + i, { w: 2, color: rgba('paper', 0.45) });
    }
  }

  /** Which print is off the pile at t (nights1 only: only the prints with a line are handled). */
  private livePrint(t: number): number {
    let live = -1;
    for (let i = 0; i < this.caps.length; i++) {
      const c = this.caps[i]!;
      if (c.home >= 0 && this.liftOf(i, t) > 0.02) live = c.home;
    }
    return live;
  }

  /** How far a print is out of the pile (0 laid down, 1 lifted). It rises before its line is sung; on the
   *  beat after the line's last word it is laid back in. nights1's window starts on line 1's first beat,
   *  so print 1 is already up at the plate's first frame — this plate has no intro to spend. */
  private liftOf(i: number, t: number): number {
    const t0 = this.caps[i]!.l.words[0]!.start;
    const up = prog(t, t0 - 1.5, t0 - 0.5);
    const dn = prog(t, this.downBeat[i]! - 0.05, this.downBeat[i]! + 0.35);
    return clamp(up - dn, 0, 1);
  }

  /** What can be seen of a block. A print's caption rides its print (the lift) and goes with the print's
   *  paper when the night takes it; a page's line is at full ink while it is sung and then drains down off
   *  the page's lower edge (nights2) — so the next line always arrives alone. */
  private see(i: number, t: number): { a: number; dy: number } {
    const c = this.caps[i]!;
    if (c.home >= 0) {
      if (this.n === 1 && t >= this.tear) return { a: 0, dy: 0 };   // the night swallowed the print
      return { a: this.liftOf(i, t), dy: 0 };
    }
    const end = c.l.words[c.l.words.length - 1]!.end;
    const dr = this.n === 2 ? clamp((t - (end + 0.04)) / DRAIN_T) : 0;
    return { a: 1 - 0.85 * dr, dy: DRAIN * ease.inQuad(dr) };
  }

  /** The camera: hold the movement, whip into the next with outExpo (a cut, not a drift), and read the
   *  beat's phase for the zoom kick. Every framing holds the live block (see the BANDS note). */
  private cam(s: Sheet, t: number) {
    const S = this.shots;
    let k = 0;
    for (let i = 0; i < S.length; i++) if (t >= S[i]!.at) k = i;
    const B = S[k]!, A = S[Math.max(0, k - 1)]!;
    const w = clamp(prog(t, B.at - 0.22, B.at + 0.34, ease.outExpo), 0, 1);
    const phase = this.A.beatAt(t) % 1;
    const z = lerp(A.z, B.z, w) * (1 + 0.022 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(A.cx, B.cx, w), lerp(A.cy, B.cy, w), z, lerp(A.roll, B.roll, w));
  }

  /** The page: its edge in the day's ink where the paper is, in reverse where the night has taken it — so
   *  the side edges are cut at the night's two fronts (the joins land under the tear, which is where the
   *  paper itself has moved). */
  private page(s: Sheet, d: number, cov: (y: number) => boolean, up: number, down: number) {
    const [x0, y0, x1, y1] = FRAME;
    const day: InkOpts = { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 };
    const rev: InkOpts = { w: 2.6, color: rgba('paper', 0.72), amp: 1.6, overshoot: 9 };
    const thinDay: InkOpts = { w: 1, sketch: true, color: rgba('graphite', 0.4) };
    const thinRev: InkOpts = { w: 1, sketch: true, color: rgba('paper', 0.22) };
    const seg = (pts: V2[], seed: number, nightSeg: boolean) => {
      s.stroke(pts, seed, nightSeg ? rev : day);
      s.stroke(pts.map((p) => v2(p.x + 9, p.y + 9)), seed + 1, nightSeg ? thinRev : thinDay);
    };
    seg([v2(x0, y0), v2(x1, y0)], 2, cov(y0));                 // the head
    seg([v2(x0, y1), v2(x1, y1)], 5, cov(y1));                 // the tail
    const cut = (y: number) => clamp(y, y0, y1);
    const cuts = [y0, cut(up), cut(down), y1];
    for (let k = 0; k + 1 < cuts.length; k++) {
      const a = cuts[k]!, b = cuts[k + 1]!;
      if (b - a < 3) continue;
      const nightSeg = cov((a + b) / 2);
      seg([v2(x0, a), v2(x0, b)], 11 + k, nightSeg);
      seg([v2(x1, a), v2(x1, b)], 21 + k, nightSeg);
    }
    s.text(this.n === 2 ? 'xiv.' : 'vi.', 178, 1006,
      { size: 26, fam: 'Plex-400', color: cov(1006) ? rgba('paper', 0.5) : rgba('graphite', 0.55) });
    for (let i = 0; i < STITCH.length; i++) {
      const p = STITCH[i]!;
      const col = cov(p.y) ? rgba('paper', 0.5) : rgba('ink', 0.45);
      s.arc(p.x, p.y, 9, -1.1, 1.1, 40 + i, { w: 2, color: col });
      s.stroke([v2(p.x - 16, p.y - 6), v2(p.x + 16, p.y + 2)], 44 + i, { w: 1.2, color: col, sketch: true });
    }
    // the page's tooth: a handful of specks, re-rolled every drawing like everything else. Only where the
    // paper still is (they would be invisible on the night) and never over the prints' field.
    for (let i = 0; i < 6; i++) {
      const x = 140 + hash(i, 11) * 1640, y = 120 + hash(i, 23) * 820;
      if (x > 170 && x < 1780 && y > 230 && y < 930) continue;
      if (cov(y)) continue;
      s.stroke([v2(x, y), v2(x + 3 + hash(i, d) * 4, y + 1)], 60 + i, { w: 1, color: rgba('graphite', 0.3), taper: false });
    }
  }

  /** One print: paper, picture, corners, tally. Its stamped block is drawn by `caption()` (gated by the
   *  lift), so this method never draws type. */
  private print(s: Sheet, t: number, i: number) {
    const night = this.n === 2;
    const x = SLOT[i]!;
    const cap = i < this.caps.length ? this.caps[i]! : null;
    const lift = cap && cap.home === i ? this.liftOf(i, t) : 0;
    const y0 = PR_Y, y1 = PR_Y + PR_H;
    if (lift > 0.01) {
      // off the pile: the print lies on top and throws its shadow across the ones under it
      const off = SHADOW * lift;
      s.fill([v2(x + off, y0 + off), v2(x + PR_W + off, y0 + off), v2(x + PR_W + off, y1 + off), v2(x + off, y1 + off)], 8,
        rgba('shade', night ? 0.4 : 0.3), { a: 0.6 * lift });
    }
    s.rect(x, y0, x + PR_W, y1, 10 + i, {
      w: night ? 2.4 : 2.2, closed: true, color: night ? rgba('paper', 0.6) : rgba('ink', 0.55),
      fill: night ? rgba('night2', 0.92) : rgba('star', 0.95), amp: 1.5, overshoot: 6,
    });
    s.rect(x + BORD, y0 + BORD, x + PR_W - BORD, y1 - BORD, 14 + i, {
      w: 1.6, closed: true, color: night ? rgba('paper', 0.34) : rgba('graphite', 0.5),
      fill: night ? rgba('night', 0.85) : rgba('paper2', 0.75), sketch: night, amp: 1.2,
    });
    const wash = this.washOf(i, t);
    if (wash <= 0) this.guide(s, x, y0, i);
    else this.picture(s, t, i, x, y0, wash);
    this.corners(s, t, x, y0, y1, i, cap && cap.home === i ? this.downBeat[i]! : -1, lift);
    this.tally(s, x, i);
  }

  /** How far the developer has crossed a print. Print 1 comes up with line 1, print 2 just before line 2;
   *  the blank third print never develops in nights1 — it is the empty frame. In nights2 all three are up. */
  private washOf(i: number, t: number): number {
    if (this.n === 2) return 1;
    const c = i < this.caps.length ? this.caps[i]! : null;
    if (!c || c.home < 0) return i === 2 ? 0 : 1;
    const t0 = c.l.words[0]!.start;
    return prog(t, Math.max(this.ctx.start, t0 - 1.2), t0 + 2.2);
  }

  /** The pencil guide on a print that has not developed: the picture that was never made. */
  private guide(s: Sheet, x: number, y0: number, i: number) {
    const col = rgba(this.n === 2 ? 'paper' : 'graphite', 0.28);
    const dy = y0 - PR_Y;
    s.rect(x + BORD + 26, y0 + BORD + 26, x + PR_W - BORD - 26, y0 + PR_H - BORD - 26, 20 + i,
      { w: 1.2, sketch: true, color: col, closed: true });
    s.stroke([v2(x + BORD + 60, CREASE + dy), v2(x + PR_W - BORD - 60, CREASE + dy + 2)], 24 + i, { w: 1, sketch: true, color: col });
  }

  /** The picture inside a print, coming up behind the developer's edge. The sky sits above the crease;
   *  the near ground under it is a flat tone only, so the stamped block may lie on it (see BANDS). */
  private picture(s: Sheet, t: number, i: number, x: number, y0: number, wash: number) {
    const night = this.n === 2;
    const dy = y0 - PR_Y;
    const inkC = night ? rgba('paper', 0.8) : rgba('ink', 0.9);
    const soft = night ? rgba('paper', 0.45) : rgba('graphite', 0.6);
    const flat = night ? rgba('cool', 0.5) : rgba('shade', 0.5);
    const wx = x + BORD, w2 = x + PR_W - BORD;
    const edge = y0 + BORD + wash * (PR_H - BORD * 2);         // the developer's edge, in sheet y
    // an element has come up once the edge has passed its own lowest ink (so it appears whole and
    // everything under the edge is still the print's blank paper)
    const seen = (lowAbs: number) => wash >= 1 || lowAbs <= edge + 26;
    if (this.n === 1 && wash < 1) {
      const pts: V2[] = [];
      for (let k = 0; k <= 22; k++) pts.push(v2(lerp(wx, w2, k / 22), edge + noise1(k * 0.6 + i, 6) * 9));
      s.stroke(pts, 30 + i, { w: 2.2, color: rgba('shade', 0.7), amp: 1.4 });
      for (let r = 1; r <= 2; r++) s.stroke(pts.map((p) => v2(p.x, p.y + r * 16)), 33 + i * 3 + r, { w: 1.1, sketch: true, color: rgba('shade', 0.4) });
    }
    // the near ground: a flat wash under the crease (a tone, never a line)
    s.fill([v2(wx, CREASE + dy), v2(w2, CREASE + dy), v2(w2, IMG_B + dy), v2(wx, IMG_B + dy)], 36 + i, flat,
      { a: (night ? 0.5 : 0.42) * (wash >= 1 ? 1 : clamp(wash * 1.6)) });
    if (seen(CREASE + dy)) {
      // the horizon inside the print: a hill, and the picture's own line along the crease
      const hill: V2[] = [v2(wx, CREASE + dy)];
      for (let k = 0; k <= 16; k++) {
        const px = lerp(wx, w2, k / 16);
        hill.push(v2(px, CREASE + dy - 34 - 46 * noise1(k * 0.5 + i * 3, 4) - 16 * noise1(k * 0.16, 8)));
      }
      hill.push(v2(w2, CREASE + dy));
      s.fill(hill, 40 + i, flat, { a: 0.5 });
      s.stroke(hill, 41 + i, { w: 2, color: soft, amp: 1.8 });
    }
    if (i === 0) {
      // print 1 — the child on the shore: a small figure standing on the horizon, two birds above it,
      // and the shore itself: two lines just under the crease (the foreground carries no ink at all —
      // the stamped block lies on it, see BANDS)
      if (seen(CREASE + dy)) {
        this.figure(s, wx + 150, CREASE + dy, 96, 50, night);
        for (let k = 0; k < 2; k++) {
          const bx = wx + 420 + k * 70, by = PR_Y + dy + 128 + k * 26 - noise1(heldT(t) * 1.6 + k, 9) * 3;
          s.stroke([v2(bx - 15, by), v2(bx, by - 8), v2(bx + 15, by)], 50 + k, { w: 2.4, color: soft });
        }
      }
      if (seen(CREASE + dy + 13)) {
        for (let k = 0; k < 2; k++) {
          const ry = CREASE + dy + 6 + k * 7;
          s.stroke([v2(wx + 40, ry), v2(w2 - 60, ry + 1)], 56 + k, { w: 1.2, sketch: true, color: soft });
        }
      }
    } else if (i === 1) {
      // print 2 — the kite: the diamond up in the sky, its tail, its line down to the hand, one cloud
      if (seen(PR_Y + dy + 162)) {
        const kx = wx + 200 * hash(i, 3);
        const ky = PR_Y + dy + 96 + Math.sin(heldT(t) * 1.4) * 6;
        const kite: V2[] = [v2(kx, ky - 34), v2(kx + 28, ky), v2(kx, ky + 34), v2(kx - 28, ky)];
        s.fill(kite, 60, night ? rgba('cool', 0.6) : rgba('shade', 0.6), { a: 0.75 });
        s.stroke(kite, 60, { w: 2.8, closed: true, color: inkC, amp: 2 });
        s.stroke([v2(kx - 28, ky), v2(kx + 28, ky)], 61, { w: 1.4, color: soft });
        s.stroke([v2(kx, ky + 34), v2(kx + 22, ky + 52), v2(kx - 4, ky + 66)], 62, { w: 1.6, color: soft, amp: 3.4 });
        const str: V2[] = [];
        for (let k = 0; k <= 10; k++) str.push(v2(lerp(kx, wx + 150, k / 10), lerp(ky + 34, CREASE + dy - 75, k / 10)));
        s.stroke(str, 63, { w: 1.2, color: soft, amp: 1.6 });
        this.figure(s, wx + 150, CREASE + dy, 96, 50, night);
      }
      if (seen(PR_Y + dy + 128)) {
        const cld: V2[] = [v2(w2 - 300, PR_Y + dy + 70), v2(w2 - 120, PR_Y + dy + 44), v2(w2 - 40, PR_Y + dy + 96), v2(w2 - 210, PR_Y + dy + 128)];
        s.fill(cld, 66, night ? rgba('cool', 0.42) : rgba('paper2', 0.9), { a: 0.8 });
        s.stroke(cld, 66, { w: 2, closed: true, color: soft, amp: 2.4 });
        s.hatch(cld, 67, { spacing: 13, angle: -0.9, color: night ? rgba('paper', 0.22) : rgba('graphite', 0.3), w: 1 });
      }
    } else if (this.n === 2) {
      // print 3, nights2 — the father and the son at the same height: the print that never developed
      if (seen(CREASE + dy)) {
        this.figure(s, wx + 120, CREASE + dy, 150, 60, night);
        this.figure(s, wx + 205, CREASE + dy, 150, 60, night);
        s.stroke([v2(wx + 20, CREASE + dy + 4), v2(w2 - 30, CREASE + dy + 6)], 70, { w: 2, color: soft, amp: 1.4 });
      }
    }
  }

  /** The film's small ink figure: one line for the head, four for the limbs, no face. */
  private figure(s: Sheet, x: number, feet: number, h: number, seed: number, night: boolean) {
    const c = night ? rgba('paper', 0.85) : rgba('ink', 0.92);
    const hr = h * 0.11;
    s.arc(x, feet - h + hr, hr, 0, Math.PI * 2, seed, { w: 3, color: c, amp: 1.2 });
    s.stroke([v2(x, feet - h + hr * 2), v2(x, feet - h * 0.42)], seed + 1, { w: 3.4, color: c });
    s.stroke([v2(x, feet - h * 0.42), v2(x - h * 0.16, feet)], seed + 2, { w: 3, color: c });
    s.stroke([v2(x, feet - h * 0.42), v2(x + h * 0.16, feet)], seed + 3, { w: 3, color: c });
    s.stroke([v2(x, feet - h * 0.78), v2(x - h * 0.22, feet - h * 0.5)], seed + 4, { w: 2.6, color: c });
    s.stroke([v2(x, feet - h * 0.78), v2(x + h * 0.22, feet - h * 0.5)], seed + 5, { w: 2.6, color: c });
  }

  /** The four photo corners. While a print is up they are only the slots it came out of; on the beat it is
   *  laid back in they are pressed onto its corners (stepped on twos, like everything else here). */
  private corners(s: Sheet, t: number, x: number, y0: number, y1: number, i: number, landAt: number, lift: number) {
    const night = this.n === 2;
    const col = night ? rgba('paper', 0.5) : rgba('shade', 0.95);
    const line = night ? rgba('paper', 0.35) : rgba('graphite', 0.6);
    const land = landAt < 0 ? 1 : clamp(prog(heldT(t), landAt - 0.05, landAt + 0.5));
    const a = (lift > 0.02 ? 0.2 : land) * 0.85;
    if (a <= 0.01) return;
    const pts = [[x, y0, 1, 1], [x + PR_W, y0, -1, 1], [x + PR_W, y1, -1, -1], [x, y1, 1, -1]] as const;
    for (let k = 0; k < 4; k++) {
      const [px, py, sx, sy] = pts[k]!;
      const tri: V2[] = [v2(px, py), v2(px + 34 * sx, py), v2(px, py + 34 * sy)];
      s.fill(tri, 80 + i * 4 + k, col, { a, amp: 1.2 });
      s.stroke(tri, 80 + i * 4 + k, { w: 1.4, closed: true, color: line, amp: 1.4, a });
    }
  }

  /** The pencil tally on a print's tab: one stroke, two, three — the pile counts itself. */
  private tally(s: Sheet, x: number, i: number) {
    const col = this.n === 2 ? rgba('paper', 0.45) : rgba('graphite', 0.75);
    for (let k = 0; k <= i; k++) {
      const tx = x + TALLY_X + k * 13;
      s.stroke([v2(tx, TALLY_Y - 12), v2(tx + 2, TALLY_Y + 8)], 90 + i * 4 + k, { w: 2.2, color: col, sketch: true });
    }
  }

  /** A stamped block: the mask laid on the paper, then the words pressed in one at a time, west to east,
   *  row after row — the carriage walking ahead of each word and lifting to the next. Never ahead of the
   *  voice: an impression appears only once `Lyrics.wordProgress` says the word has started. */
  private caption(s: Sheet, t: number, i: number) {
    const c = this.caps[i]!;
    const view = this.see(i, t);
    if (view.a <= 0.01) return;
    const first = c.l.words[0]!;
    const nightline = c.home < 0 || this.n === 2;
    const ink = this.impression(c);
    const ghost = nightline ? rgba('paper', 0.16) : rgba('graphite', 0.22);
    const mask = clamp(prog(t, Math.max(this.ctx.start, first.start - 0.35), first.start + 0.25), 0, 1) * view.a;
    let wi = 0;
    for (let r = 0; r < c.rows.length; r++) {
      const y = c.ys[r]! + view.dy;
      const row = c.rows[r]!;
      for (let k = 0; k < row; k++) {
        const w = c.l.words[wi]!;
        const x = c.xs[r]![k]!;
        // the mask: the stain the words will take, laid on with the block before it is pressed
        s.letter(w.w, x, y, c.size, 300 + wi, { font: 'readable', color: ghost, w: 3, amp: 1.6, a: mask });
        const p = Lyrics.wordProgress(w, t);
        if (p > 0) {
          const press = clamp(p * 3.2, 0, 1);
          s.letter(w.w, x, y, c.size, 220 + wi, { font: 'readable', color: ink, w: 5, amp: 1.5, a: press * (0.55 + 0.45 * press) * view.a });
          // the wet impression spreads a hair as it takes: the same word again, wider and fainter
          if (p < 0.98) s.letter(w.w, x, y, c.size, 260 + wi, { font: 'readable', color: ink, w: 8, amp: 2.6, a: 0.22 * view.a });
        }
        if (t >= w.start - 0.28 && t <= w.end + 0.22) {
          this.carriage(s, t, x, y, s.measureLetter(w.w, 'readable', c.size), c.size, nightline, p);
        }
        wi++;
      }
    }
  }

  /** The impression's ink: `rose` for the two "never die" lines (the film's two memory-red beats), the
   *  father's last words in `lantern` once they land in the night, `star` on the night page, ink on paper. */
  private impression(c: Cap): string {
    if (c.l.text.includes('never die')) return rgba('rose', 0.95);
    if (this.n === 1 && c.home < 0) return rgba('lantern', 0.95);
    if (this.n === 2) return rgba('star', 0.94);
    return rgba('ink', 0.95);
  }

  /** The carriage: the mask frame that walks the row, presses a word in and lifts to the next one. On a
   *  word that is held (the drop's ~2.8 s per word) it stays down and shudders on the beat instead. */
  private carriage(s: Sheet, t: number, x: number, y: number, w: number, size: number, night: boolean, p: number) {
    const c0 = night ? rgba('paper', 0.5) : rgba('ink', 0.5);
    const c1 = night ? rgba('paper', 0.3) : rgba('ink', 0.32);
    const bump = p < 1 && this.A.beatAt(t) % 1 < 0.16 ? -4 : -3;
    const pad = 18, top = y - size * 0.86 + bump, bot = y + size * 0.34 + bump;
    s.rect(x - pad, top, x + w + pad, bot, 120, { w: 2.4, closed: true, color: c0, amp: 1.4, overshoot: 4 });
    s.stroke([v2(x - pad + 12, top + 12), v2(x + w + pad - 12, top + 12)], 121, { w: 1, sketch: true, color: c1 });
    s.stroke([v2(x - pad + 12, bot - 10), v2(x + w + pad - 12, bot - 10)], 122, { w: 1, sketch: true, color: c1 });
    s.stroke([v2(x + w / 2 - 16, top), v2(x + w / 2 - 28, top - 26), v2(x + w / 2 + 28, top - 26), v2(x + w / 2 + 16, top)], 123, { w: 3, color: c0, overshoot: 3 });
  }

  /** The crease: one continuous ink line across the page — the film's thread, the pictures' horizon. */
  private crease(s: Sheet, d: number, night: boolean) {
    const pts: V2[] = [];
    for (let k = 0; k <= 40; k++) pts.push(v2(lerp(TX0, TX1, k / 40), CREASE + Math.sin(k * 0.4) * 2));
    s.stroke(pts, 130, { w: 3.4, color: night ? rgba('paper', 0.62) : rgba('ink', 0.85), overshoot: 14 });
    s.stroke(pts.map((p) => v2(p.x, p.y + 5)), 131, { w: 1, sketch: true, color: night ? rgba('paper', 0.25) : rgba('graphite', 0.4) });
    void d;
  }

  /** The shelf under the pile and the lantern on it: the film's one light, and what it falls on. */
  private shelf(s: Sheet, d: number, t: number, night: boolean) {
    const edge = night ? rgba('paper', 0.4) : rgba('graphite', 0.6);
    s.fill([v2(96, SH_TOP), v2(1824, SH_TOP), v2(1824, 984), v2(96, 984)], 140, night ? rgba('night2', 0.9) : rgba('shade', 0.85), { a: night ? 0.9 : 0.8, amp: 2 });
    s.stroke([v2(96, SH_TOP + 2), v2(1824, SH_TOP + 4)], 140, { w: 2.6, color: edge, overshoot: 10 });
    s.stroke([v2(96, 962), v2(1824, 964)], 141, { w: 1.4, sketch: true, color: edge });
    // the pile's shadow on the shelf, and the lantern's wash along it
    s.fill([v2(170, SH_TOP + 6), v2(1778, SH_TOP + 10), v2(1700, 984), v2(240, 984)], 142, rgba('ink', night ? 0.5 : 0.28), { a: night ? 0.45 : 0.3 });
    if (!night) {
      s.fill([v2(96, SH_TOP), v2(900, SH_TOP + 6), v2(860, 984), v2(96, 984)], 143, rgba('lantern', 0.5), { a: 0.4 });
      s.fill([v2(96, 620), v2(260, 560), v2(300, 984), v2(96, 984)], 144, rgba('lantern', 0.4), { a: 0.16 });
    }
    this.lantern(s, d, night);
    void t;
  }

  /** The lantern: the film's instrument, unchanged — a flat `lantern` body, a flame that rides the drawing. */
  private lantern(s: Sheet, d: number, night: boolean) {
    const x = LAMP.x, y = LAMP.y;
    const flick = 0.86 + 0.14 * hash(0, d);
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.stroke(body, 151, { w: 3.2, closed: true, color: night ? rgba('paper', 0.7) : rgba('ink', 0.95) });
    s.fill(body, 151, rgba('lantern', 0.5 * flick), { a: 0.9 });
    s.stroke([v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 152, { w: 3, color: night ? rgba('paper', 0.7) : rgba('ink', 0.9) });
    s.blob(x, y - 22, 11 * flick, 153, { colour: rgba('lantern', 0.95), n: 9, jag: 0.6 });
    s.blob(x, y - 18, 5 * flick, 154, { colour: rgba('star', 0.9), n: 7, jag: 0.5 });
  }

  /** The night pouring through the slit: a flat mass between the two torn edges, and its ripples. */
  private flood(s: Sheet, d: number, t: number, up: number, down: number, night: boolean) {
    if (down - up < 2) return;
    const top: V2[] = [], bot: V2[] = [];
    for (let k = 0; k <= 26; k++) {
      const x = lerp(80, 1840, k / 26);
      top.push(v2(x, up + (night ? 0 : noise1(k * 0.7 + heldT(t) * 0.5, 17) * 7)));
      bot.push(v2(x, down + (night ? 0 : noise1(k * 0.8 + 3, 19) * 7)));
    }
    s.fill([...top, ...bot.slice().reverse()], 160, rgba('night', 0.98), { a: 1, amp: night ? 2.4 : 3.4 });
    if (night) return;
    // the torn edges: the paper's rip — a day-side line, and a hair of light on the night's side
    s.stroke(top, 161, { w: 2.4, color: rgba('graphite', 0.6), amp: 3.4 });
    s.stroke(bot, 162, { w: 2.4, color: rgba('graphite', 0.6), amp: 3.4 });
    s.stroke(top.map((p) => v2(p.x, p.y + 4)), 163, { w: 1.2, color: rgba('star', 0.2), sketch: true });
    // the night's own texture: two slow ripples riding the drawing index, above the crease only — the live
    // band stays the line's own ink (see BANDS)
    for (let r = 0; r < 2; r++) {
      const yy = lerp(up, Math.min(CREASE - 20, down), 0.35 + r * 0.34) + Math.sin(heldT(t) * (0.7 + r * 0.4) + r) * 5;
      const pts: V2[] = [];
      for (let k = 0; k <= 20; k++) pts.push(v2(lerp(110, 1810, k / 20), yy + noise1(k * 0.5 + r * 4, 23) * 6));
      s.stroke(pts, 165 + r, { w: 1.2, sketch: true, color: rgba('cool', 0.55) });
    }
    void d;
  }

  /** A print the night has taken: a flat silhouette sinking away from the tear — no side ink, so the live
   *  band stays the line's own. Print 1 goes first; the blank third print is the last object standing. */
  private sunk(s: Sheet, d: number, t: number, i: number) {
    const k = prog(t, this.tear + SINK_T[i]!, this.tear + SINK_T[i]! + 0.55, ease.outCubic);
    if (k <= 0.001) return;
    const x = SLOT[i]!, sink = SINK[i]! * k;
    const y0 = PR_Y + sink, y1 = PR_Y + PR_H + sink;
    const fade = 1 - 0.25 * prog(t, this.tear + 2, this.tear + 6);
    const a = (i === 2 ? 0.66 : 0.5) * fade;
    s.fill([v2(x, y0), v2(x + PR_W, y0), v2(x + PR_W, y1), v2(x, y1)], 170 + i, rgba('night2', 0.95), { a, amp: 2.2 });
    const top: V2[] = [], bot: V2[] = [];
    for (let q = 0; q <= 18; q++) {
      const px = lerp(x, x + PR_W, q / 18);
      top.push(v2(px, y0 + noise1(q * 0.9 + i, 27) * 5));
      bot.push(v2(px, y1 + noise1(q * 0.9 + i + 5, 29) * 5));
    }
    const lin = i === 2 ? rgba('paper', 0.5) : rgba('cool', 0.7);
    s.stroke(top, 172 + i, { w: 2, color: lin, amp: 2.6 });
    s.stroke(bot, 176 + i, { w: 1.6, color: rgba('cool', 0.5), amp: 2.6 });
    if (i === 2) {
      // the empty frame is the last thing the night has: its corners and its tally stay countable
      this.corners(s, t, x, y0, y1, i, -1, 0);
      this.tally(s, x, i);
    }
    void d;
  }

  /** What the lamp left behind: the warm wash on the shelf lingering in the night as the words light up. */
  private lastLight(s: Sheet, d: number, t: number) {
    const k = 1 - prog(t, this.tear + 0.3, this.tear + 3.4, ease.outCubic);
    if (k <= 0.001) return;
    s.fill([v2(96, SH_TOP + 2), v2(1020, SH_TOP + 8), v2(980, 984), v2(96, 984)], 180, rgba('lantern', 0.5), { a: 0.34 * k });
    s.blob(LAMP.x, LAMP.y - 22, 12 * k, 181, { colour: rgba('lantern', 0.9 * k), fillA: 0.85 * k, n: 9, jag: 0.6 });
    void d;
  }

  /** The three windows of light — `chorus.ts` owns the positions, and this plate uses them unchanged.
   *  They ignite on the "never die" line: holes punched through the page while it is paper (a `night`
   *  disc with a `star` rim), and plain `star` dots once the night is behind them. */
  private windows(s: Sheet, d: number, t: number, night: boolean) {
    if (this.caps.length < 2) return;
    const l = this.caps[1]!.l.words[0]!;
    const lit = clamp(prog(t, l.start, l.start + 0.5), 0, 1);
    if (lit <= 0.001) return;
    for (let i = 0; i < WINDOWS.length; i++) {
      const [x, y] = WINDOWS[i]!;
      const bl = 0.9 + 0.1 * hash(0, heldT(t) * 4 + i);
      if (!night) s.blob(x, y, 24 * lit, 190 + i, { colour: rgba('night', 0.95), n: 12, jag: 0.2, fillA: lit });
      s.blob(x, y, 15 * lit * bl, 196 + i, { colour: rgba('star', 0.96), n: 10, jag: 0.4, fillA: lit });
      s.stroke([v2(x - 19, y), v2(x + 19, y)], 200 + i, { w: 1.6, color: rgba('star', 0.5 * lit) });
      s.stroke([v2(x, y - 19), v2(x, y + 19)], 204 + i, { w: 1.6, color: rgba('star', 0.5 * lit) });
    }
    void d;
  }
}

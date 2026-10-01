/*!plate
{
  "id": ["chorus1", "chorus2"],
  "window": [32.433, 116.2426],
  "device": "masked",
  "staging": "subject",
  "typePx": 180,
  "maxWidth": 970,
  "bands": [
    { "name": "lamps",     "y": [140, 296] },
    { "name": "head",      "y": [298, 396] },
    { "name": "live",      "y": [470, 675] },
    { "name": "hills",     "y": [678, 808] },
    { "name": "sprockets", "y": [812, 868] },
    { "name": "drop",      "y": [880, 984] }
  ],
  "movements": [
    { "at": 32.433,   "camera": "crash-dolly-down" },
    { "at": 32.9092,  "camera": "punch-in" },
    { "at": 34.3378,  "camera": "whip" },
    { "at": 36.2426,  "camera": "crane-out" },
    { "at": 38.1473,  "camera": "hold" },
    { "at": 39.0997,  "camera": "kick-zoom" },
    { "at": 108.6235, "camera": "crash-dolly-down" },
    { "at": 109.0997, "camera": "punch-in" },
    { "at": 110.5283, "camera": "whip" },
    { "at": 112.433,  "camera": "crane-out" },
    { "at": 114.3378, "camera": "pull-back" },
    { "at": 115.2902, "camera": "hold-wide" }
  ]
}
*/
// Plate 5/13 — `chorus` (chorus1 32.433 → 40.052, chorus2 108.624 → 116.243; one module, `params.n`).
//
// World: THE NIGHT AS A PRINTED SHEET — a night-blue tape on the light table, running through a press.
// Device: **masked out** (`04-plates.md §3.6`) — the tape is a stencil and every sung word is a hole
// punched through it, opening onto the paper's light underneath at 180 px. The tape feeds leftward
// through a fixed punch head; a word is cut exactly while it is sung (`Lyrics.wordProgress` opens it
// character by character, never ahead of the voice), and it then drifts left as the next word is fed
// to the head. A seal station closes each hole as the feed carries it past — so the live line is one
// line at a time, always at full size, always at the head, and what it leaves behind rides off the sheet.
//
// Six movements per entry, cut on the singing and on bar lines (never on round seconds), one camera
// sub-shot each (the table below), and a small zoom pulse driven by the punch on every word.
// chorus1 (32.433 → 40.052) — the clock the numbers below are quoted at:
//   1  32.433 → 32.909  the tape falls in from above the frame and lands on the first word (the pour);
//                        the head strikes and the first hole opens. crash-dolly down, roll +0.03.
//   2  32.909 → 34.338  line 1 is fed word by word; the table's three lamps ignite on the beat.
//   3  34.338 → 36.243  the day page's landscape surfaces on the tape — the horizon of `open` and its
//                        hills, re-drawn as paper-coloured outlines on the night — and line 1 ends.
//   4  36.243 → 38.147  line 2 is fed. At n = 2 the tape outgrows the page here and the words open
//                        past the frame's ink, which runs off the sheet (the film's one frame break).
//   5  38.147 → 39.100  the last bar at the machine's own pace: the last words are fed to the head and
//                        cut there; the camera holds on the row, the punch pumping it on every word.
//   6  39.100 → 40.052  the feed's last slot drains and the tape comes to a stand; the seal's stroke
//                        then runs forward, closing the holes still left on the tape one by one, and
//                        halts short of the last one — that hole holds the frame to the end of the plate.
// chorus2 (108.624 → 116.243) runs the same six at its own clock — 108.6235, 109.0997, 110.5283,
// 112.433, 114.3378, 115.2902 — with the two camera differences the wider tape earns at n = 2:
// movement 5 pulls back past the frame instead of holding, and movement 6 holds that wide framing on
// the seal's stroke instead of punching in (so the frame break stays in shot; see `SHOT2`).
//
// BANDS — every element this plate draws lives in one horizontal band, and none of them enters the
// live line's; the page's edge and its folio are the film's furniture (they are in every plate and sit
// outside this table, exactly as the frame does in the reference plate):
//   lamps     y 140–296   the light table's three lamps (the film's three windows, `WINDOWS`)
//   head      y 298–396   the gantry beam and the punch head (it presses down on every word)
//   live      y 470–675   THE PUNCHED ROW — the sung line, 180 px, and nothing else
//
// maxWidth 970 = HEAD − SEAL: the corridor the line is fitted into. An 180 px line of 7–9 words is
// ~2400–3600 px wide and cannot be fitted whole into any frame, so the line is staged word by word
// (the lead's rule 2, `handdrawn/scenes/hook.ts`): each aperture (<= 797 px) is fitted into this
// corridor, whose left edge is the seal station and whose right edge is the punch head — the drawn
// holes never leave x in [180, 1150].
//   hills     y 678–808   the day page's horizon and hills, drawn on the tape in `paper`
//   sprockets y 812–868   the tape's register punches, which carry the feed
//   drop      y 880–984   the paper below the tape: the landing's splash and the punched-out chips
//
// Deterministic: the layout is a pure function of the lyric data, every wobble is seeded with the
// drawing index `s.d` (exposure on twos), and the feed, the strike and the seal are functions of `f.t`.
import { InkedScene, Sheet, rgba, v2, clamp, lerp, ease, prog, noise1, hash, heldT, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line, type Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The four lines this module owes (two per entry), queried by fragment — never by time. */
const Q: readonly (readonly [string, number])[] = [
  ["He said, one day you'll leave", 0],
  ['So live a life you will remember', 0],
  ["He said, one day you'll leave", 1],
  ['So live a life you will remember', 1],
];

/** The book's page edge — the same furniture every plate of the film carries. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The night tape's two edges: the band of page the stencil covers. */
const TAPE_T = 392, TAPE_B = 880;
/** The punched row's baseline; the aperture (the sung line's size) and the gap between word slots. */
const ROW = 620, SZ = 180, GAP = 40;
/** The punch head's home. The tape feeds to keep the cut's wet edge here, so the head never moves. */
const HEAD = 1150;
/** The seal station: the ink runs back into every hole the feed carries past this edge. */
const SEAL = 180, SEAL2 = -60;
/** The day page's horizon (the film's thread, the same 47 samples as `open`/`nights`) and its hills. */
const HZ = 792, HX0 = 210, HX1 = 1736, HX_L = 150, HX_R = 1770;
/** THE THREE WINDOWS OF LIGHT — the film's three positions, the same in every chorus. */
export const WINDOWS: [number, number][] = [[648, 250], [960, 190], [1272, 250]];

/**
 * The camera sub-shots (cx, cy, zoom, roll), one per movement; a whip between two of them is a cut
 * (`03-animation.md §2`). The narrow shots hold the punched row and the head; the wide ones hold the
 * tape's two edges. At zoom >= 1.04 the visible window is inside the page plus a little paper, so at
 * n = 1 nothing of the world can spill beside the page's edge.
 */
const SHOT: [number, number, number, number][] = [
  [960, 330, 1.28, 0.030],    // 1 crash-dolly down: the tape falling in from above the frame
  [960, 545, 1.16, 0.008],    // 2 punch-in: the head, the row, the seal
  [1005, 585, 1.12, -0.018],  // 3 whip right: the day page's landscape surfacing
  [960, 570, 1.04, 0.010],    // 4 crane out wide: the tape's two edges and the whole page
  [960, 572, 1.05, 0.004],    // 5 hold: the last bar at the machine's own pace, the framing held
  [960, 556, 1.18, -0.002],   // 6 kick-zoom: in onto the seal's stroke and the hole it leaves holding
];
/** n = 2 only: the tape is wider than the page, so the camera goes out past the frame to show it. */
const SHOT2: ([number, number, number, number] | null)[] = [
  null, null, null,
  [1040, 570, 1.00, 0.014],   // 4 the tape outgrowing the page, held in a wider frame
  [960, 540, 0.90, 0.006],    // 5 pull back past the frame: the page's edge, the ink leaving the sheet
  [960, 540, 0.90, 0.000],    // 6 hold wide: the seal's stroke and the last hole, seen out past the page
];

/** One word's place in the row: its text, its aperture width, and its slot's left edge in tape space. */
interface Slot { w: Word; wpx: number; x: number }

export default class Chorus extends InkedScene {
  private lines: Line[] = Q.map(([q, nth]) => this.ctx.lyrics.get(q, nth));
  /** The row's layout is a pure function of the (fixed) lyric data, so it is measured once. */
  private layout = new Map<number, Slot[]>();

  /** This entry's row: its two lines laid as ONE continuous cut on the tape. */
  private slots(s: Sheet, k: number): Slot[] {
    const hit = this.layout.get(k);
    if (hit) return hit;
    const out: Slot[] = [];
    let x = 0;
    for (const l of [this.lines[k * 2]!, this.lines[k * 2 + 1]!]) {
      for (const w of l.words) {
        const wpx = s.measureLetter(w.w, 'readable', SZ);
        out.push({ w, wpx, x });
        x += wpx + GAP;
      }
    }
    this.layout.set(k, out);
    return out;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const n = typeof this.ctx.params.n === 'number' ? this.ctx.params.n : 1;
    const slots = this.slots(s, n - 1);
    const A = this.ctx.audio;

    // ---- the plate's own clock: five cut points taken from the singing and the bar lines
    const beatAfter = (x: number) => A.timeOfBeat(Math.ceil(A.beatAt(x)));
    const downAfter = (x: number) => A.downbeats.find((b) => b > x + 0.02) ?? x + 1.905;
    const per = A.beats.length > 1 ? (A.beats[A.beats.length - 1]! - A.beats[0]!) / (A.beats.length - 1) : 0.476;
    const first = slots[0]!.w.start;
    const m1 = Math.max(beatAfter(first), this.ctx.start + 0.3);
    const m2 = downAfter(m1), m3 = downAfter(m2), m4 = downAfter(m3);
    const m5 = m4 + 2 * per;
    const m = [this.ctx.start, m1, m2, m3, m4, m5, this.ctx.end];

    // ---- movement 1: the tape falls in from above the frame and lands on the first word
    const land = Math.max(first, this.ctx.start + 0.05);
    const pf = prog(t, this.ctx.start, land, ease.outCubic);
    const knock = t > land ? Math.exp(-(t - land) * 7) * Math.sin((t - land) * 27) * 20 : 0;
    const dy = -(1 - pf) * 1180 + knock;

    // ---- n = 2: during movement 4 the tape outgrows the page (the brief's one deliberate break)
    const over = n === 2 ? 330 * prog(t, m3 - 0.15, m3 + 1.1, ease.outCubic) : 0;
    const tx0 = FRAME[0] - over, tx1 = FRAME[2] + over;

    // ---- the feed: the tape carries the row past the head, and comes to a stand with the last word
    const off = HEAD - this.rowAt(t, slots);
    const home = n === 2 ? SEAL2 : SEAL;
    const sealX = this.sealAt(t, slots, home, m5, this.ctx.end);
    const seated = t >= land;                               // the punches exist only once the tape is down

    this.shot(s, f, m);

    // ---- back to front, each element in its own band
    this.page(s, n, over, t);
    s.fill(this.tape(dy, tx0, tx1), 101, rgba('night'), { amp: 2.4 });
    this.sprockets(s, d, off, dy, tx0, tx1);
    this.hills(s, t, m);
    if (seated) this.row(s, t, slots, off, home);
    if (seated) this.seal(s, d, sealX, tx0);
    this.head(s, d, t);
    this.lamps(s, f);
    this.droppings(s, d, t, land);
    return CEL.flat;
  }

  // ------------------------------------------------------------------ the camera
  /** Hold the movement's shot, whip into the next with outExpo — a cut, not a drift. */
  private shot(s: Sheet, f: Frame, m: number[]) {
    const t = f.t;
    const k = t < m[1]! ? 0 : t < m[2]! ? 1 : t < m[3]! ? 2 : t < m[4]! ? 3 : t < m[5]! ? 4 : 5;
    const n = typeof this.ctx.params.n === 'number' ? this.ctx.params.n : 1;
    const a0 = SHOT2[Math.max(0, k - 1)], b0 = SHOT2[k];
    const A0 = n === 2 && a0 ? a0 : SHOT[Math.max(0, k - 1)]!;
    const B0 = n === 2 && b0 ? b0 : SHOT[k]!;
    const w = clamp(prog(t, m[k]! - 0.2, m[k]! + 0.3, ease.outExpo), 0, 1);
    const A = this.ctx.audio;
    const phase = A.beatAt(t) % 1;                          // kinetic zoom off the beat, not off sin(t)
    // the punch rides its own small pulse: every word is struck, so every word pumps the frame a little
    const w0 = this.liveWord(t);
    const punch = w0 ? Math.max(0, 1 - (t - w0.start) * 3.2) : 0;
    const kick = Math.max(0, 1 - phase * 3);
    const z = lerp(A0[2], B0[2], w) * (1 + 0.02 * kick + 0.03 * punch);
    s.setCam(lerp(A0[0], B0[0], w), lerp(A0[1], B0[1], w), z,
      lerp(A0[3], B0[3], w) + noise1(s.d * 1.9, 9) * 0.0016);   // the roll boils on the drawing clock
  }

  /** The word being sung right now (the one the head is cutting), or null in a gap. */
  private liveWord(t: number): Word | null {
    const n = typeof this.ctx.params.n === 'number' ? this.ctx.params.n : 1;
    for (const l of [this.lines[(n - 1) * 2]!, this.lines[(n - 1) * 2 + 1]!]) {
      for (const w of l.words) if (t >= w.start && t < w.end) return w;
    }
    return null;
  }

  // ------------------------------------------------------------------ the tape's geometry
  /**
   * The row's tape-space coordinate under the punch head — the cut's wet edge. The tape feeds so that
   * this stays at `HEAD`: a word arrives at the head exactly at its `start`, its hole opens character
   * by character while it is sung, and what has been cut drifts left behind it.
   */
  private rowAt(t: number, slots: Slot[]): number {
    const N = slots.length;
    if (N === 0) return 0;
    if (t <= slots[0]!.w.start) return slots[0]!.x;
    let k = 0;
    while (k + 1 < N && slots[k + 1]!.w.start <= t) k++;
    const sl = slots[k]!, w = sl.w;
    const p = Lyrics.wordProgress(w, t);
    if (p < 1) return sl.x + sl.wpx * p;
    if (k + 1 >= N) return sl.x + sl.wpx;
    const nx = slots[k + 1]!.w.start;
    const u = clamp((t - w.end) / Math.max(1e-3, nx - w.end));
    return sl.x + sl.wpx + GAP * u;
  }

  /**
   * Where the tape's ink has run back into the holes. Before the last movement this is the seal station,
   * and every hole the feed carries past it is closed — one by one, in the order it was punched. In the
   * last movement the feed has stopped and the seal runs its stroke forward: it steps to each hole still
   * left on the tape (the stop is where the feed would finally leave that hole) and halts short of the
   * last one, which is never closed.
   */
  private sealAt(t: number, slots: Slot[], home: number, m5: number, end: number): number {
    if (t < m5) return home;
    const N = slots.length;
    const offEnd = N ? HEAD - (slots[N - 1]!.x + slots[N - 1]!.wpx) : 0;
    const stops: number[] = [home];
    for (const sl of slots) {
      if (Lyrics.wordProgress(sl.w, t) <= 0) continue;
      const xf = sl.x + offEnd;                             // where the feed finally leaves it
      if (xf < home + 40 || xf + sl.wpx < home + 6) continue;
      stops.push(xf - 3);
    }
    stops.sort((a, b) => a - b);
    for (let i = stops.length - 1; i > 0; i--) if (stops[i]! - stops[i - 1]! < 14) stops.splice(i, 1);
    const NH = stops.length - 1;
    if (NH <= 0) return home;
    const u = clamp(prog(t, m5, end - 0.16)) * NH;
    const i0 = Math.min(NH - 1, Math.floor(u));
    const f0 = clamp(u - i0);
    return lerp(stops[i0]!, stops[i0 + 1]!, ease.outExpo(clamp(f0 / 0.55)));
  }

  /** The tape: one flat `night` mass across the page, both long edges redrawn every drawing. */
  private tape(dy: number, x0: number, x1: number): V2[] {
    const N = 30, dd = this.sheet.d, pts: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const x = lerp(x0, x1, i / N);
      pts.push(v2(x, TAPE_T + dy + noise1(i * 0.5 + dd * 1.7, dd * 2.9 + 3) * 9 + noise1(i * 0.17 + dd * 0.4, dd * 5.1 + 11) * 5));
    }
    for (let i = N; i >= 0; i--) {
      const x = lerp(x0, x1, i / N);
      pts.push(v2(x, TAPE_B + dy + noise1(i * 0.44 + dd * 2.3, dd * 3.7 + 23) * 11 + noise1(i * 0.15 + dd * 0.7, dd * 6.1 + 31) * 6));
    }
    return pts;
  }

  /** The tape's register punches: a row of small holes that shows the feed (band `sprockets`). */
  private sprockets(s: Sheet, d: number, off: number, dy: number, x0: number, x1: number) {
    const y = TAPE_B + dy - 56, per = 96;
    const ph = ((off % per) + per) % per;
    const N = Math.ceil((x1 - x0) / per) + 2;
    for (let i = -1; i < N; i++) {
      const x = x0 + i * per + ph;
      if (x < 108 || x > 1812) continue;                    // the safe area
      const fade = clamp(Math.min((x - 108) / 96, (1812 - x) / 96));
      if (fade <= 0.03) continue;
      s.blob(x, y, 7 + 1.8 * noise1(i * 0.7 + d * 1.3, 5), 300 + i, {
        colour: rgba('paper', 0.82 * fade), n: 9, jag: 0.2,
        outline: { w: 1.2, color: rgba('night2', 0.8 * fade), a: fade },
      });
    }
  }

  // ------------------------------------------------------------------ the punched row
  /**
   * The sung line as holes. Each word's aperture is punched at 180 px and opened by `Lyrics.wordProgress`
   * (so it is never ahead of the voice), then carried left by the feed. A fresh hole is `star` and shows
   * the sheet's lit cut edge beside it; a finished one is flat `paper`, the page's own print.
   */
  private row(s: Sheet, t: number, slots: Slot[], off: number, home: number) {
    const live = this.liveWord(t);
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i]!;
      const p = Lyrics.wordProgress(sl.w, t);
      if (p <= 0) continue;
      const x = sl.x + off;
      if (x > 1960) continue;                               // not fed to the head yet
      if (x + sl.wpx * p < home + 16) continue;             // already swallowed by the seal
      const fresh = sl.w === live;
      if (fresh) {
        // the cut's lit edge: the sheet has thickness, and the table's light catches it
        s.letterWritten(sl.w.w, x + 5, ROW + 5, SZ, 130 + i, p, {
          font: 'readable', w: SZ * 0.105, color: rgba('night2', 0.95), amp: 2.2,
        });
      }
      s.letterWritten(sl.w.w, x, ROW, SZ, 130 + i, p, {
        font: 'readable', w: fresh ? SZ * 0.105 : SZ * 0.1, amp: 2.2,
        color: fresh ? rgba('star', 0.98) : rgba('paper', 0.92),
      });
    }
  }

  /** The seal: the tape's ink running back over every hole the feed has taken past the edge. */
  private seal(s: Sheet, d: number, sealX: number, x0: number) {
    const pts: V2[] = [v2(x0, 470)];
    for (let i = 0; i <= 16; i++) {
      const y = lerp(470, 675, i / 16);
      pts.push(v2(sealX + noise1(i * 0.6 + d * 1.9, d * 3.3 + 7) * 13, y));
    }
    pts.push(v2(x0, 675));
    s.fill(pts, 200, rgba('night'), { amp: 2.4 });
  }

  // ------------------------------------------------------------------ the day page, on the tape
  /**
   * Movement 3: the daylit page's landscape surfaces on the night — the film's thread drawn exactly as
   * `open` draws it (the same 47 samples, the same seed, the same ends), with its hills behind, all of
   * it in `paper` outlines because on this page the light is what is underneath.
   */
  private hills(s: Sheet, t: number, m: number[]) {
    const k = clamp(prog(t, m[2]!, m[2]! + 1.6, ease.outCubic));
    if (k <= 0.01) return;
    const dr = -12 * clamp(this.ctx.audio.sample(t).kick);   // it breathes with the kick, never a sine
    const ridge: V2[] = [v2(HX_L + dr, HZ - 2)];
    for (let i = 0; i <= 20; i++) {
      ridge.push(v2(lerp(HX_L, HX_R, i / 20) + dr, HZ - 40 - 46 * noise1(i * 0.42, 3) - 20 * noise1(i * 0.11, 9)));
    }
    ridge.push(v2(HX_R + dr, HZ - 2));
    s.stroke(ridge, 21, { w: 2, color: rgba('paper', 0.62 * k), a: k, amp: 1.8 });
    s.hatch(ridge, 22, { spacing: 18, angle: 1.0, color: rgba('paper', 0.2 * k), w: 1.1 });
    const hz: V2[] = [];
    for (let i = 0; i <= 46; i++) {
      const x = lerp(HX0, HX1, i / 46);
      hz.push(v2(x + dr, HZ + Math.sin(i * 0.18) * 7 + (hash(i * 3.3, 7) - 0.5) * 5));
    }
    const cut = Math.max(2, Math.ceil(hz.length * k));       // the thread draws itself as it surfaces
    s.stroke(hz.slice(0, cut), 11, { w: 3.4, color: rgba('paper', 0.88 * k), a: k, overshoot: 14 });
  }

  // ------------------------------------------------------------------ the machine
  /** The gantry and the punch head: the feed brings the cut's wet edge to it, and it presses on every word. */
  private head(s: Sheet, d: number, t: number) {
    const w = this.liveWord(t);
    const strike = w ? Math.max(0, 1 - (t - w.start) * 3.6) : 0;
    const x = HEAD + noise1(d * 1.4, 9) * 2.5;
    s.stroke([v2(180, 300), v2(1740, 302)], 500, { w: 3.4, color: rgba('ink', 0.85), overshoot: 8 });
    s.stroke([v2(180, 324), v2(1740, 326)], 504, { w: 1.4, sketch: true, color: rgba('graphite', 0.5) });
    const drop = 26 * strike;
    const body: V2[] = [v2(x - 34, 302 + drop), v2(x + 34, 302 + drop), v2(x + 26, 358 + drop), v2(x - 26, 358 + drop)];
    s.fill(body, 510, rgba('night2', 0.9), { a: 0.95 });
    s.stroke(body, 510, { w: 2.6, closed: true, color: rgba('ink', 0.8) });
    s.stroke([v2(x - 24, 358 + drop), v2(x - 12, 392 + 2 * strike)], 512, { w: 3, color: rgba('ink', 0.85) });
    s.stroke([v2(x + 24, 358 + drop), v2(x + 12, 392 + 2 * strike)], 513, { w: 3, color: rgba('ink', 0.85) });
    if (strike > 0.02) {
      // the strike's flash lands exactly on the sheet's top edge, where the punch is opening the hole
      s.stroke([v2(x - 42, 392), v2(x + 42, 392)], 514, { w: 2 + 3 * strike, color: rgba('lantern', 0.8 * strike), taper: false });
    }
  }

  /** The three windows of light: the table's lamps, each igniting on its own beat of the bar. */
  private lamps(s: Sheet, f: Frame) {
    const a = this.ctx.audio, ht = heldT(f.t);
    const beat = a.beatAt(ht), bi = Math.floor(beat), bp = beat - bi;
    const rise = clamp(prog(f.t, f.start + 0.05, f.start + 0.42, ease.outCubic));
    for (let i = 0; i < WINDOWS.length; i++) {
      const [x, y] = WINDOWS[i]!;
      const mine = (((bi + i) % 3) + 3) % 3 === 0;
      const flash = mine ? 0.62 + 0.38 * Math.exp(-bp * 3.4) : 0.62;
      const bl = clamp(flash * rise);
      if (bl <= 0.02) continue;
      const r = 6.4 + 3.2 * flash;
      s.blob(x, y, r, 300 + i, {
        colour: rgba('star'), fillA: bl, n: 12, jag: 0.16,
        outline: { w: 2, color: rgba('star', 0.72), a: bl },
      });
      const ry = r * (2.2 + 1.5 * flash);
      s.stroke([v2(x - ry, y), v2(x + ry, y)], 310 + i, { w: 2, color: rgba('star', 0.55), a: bl });
      s.stroke([v2(x, y - ry), v2(x, y + ry)], 320 + i, { w: 2, color: rgba('star', 0.55), a: bl });
    }
  }

  /** The landing's splash and the chips the punch knocks out: the droppings of band `drop`. */
  private droppings(s: Sheet, d: number, t: number, land: number) {
    const base = TAPE_B;
    const burst = clamp(prog(t, land - 0.02, land + 0.55, ease.outCubic));
    if (burst > 0.01 && burst < 1) {
      for (let i = 0; i < 11; i++) {
        const x = lerp(190, 1730, i / 10) + (hash(i, 3) - 0.5) * 90;
        const h = (1 - burst) * (20 + 58 * hash(i, 7));
        s.blob(x, base + 12 + h, 4 + 5 * hash(i, 9), 600 + i, { colour: rgba('night', 0.9 * (1 - burst)), n: 7, jag: 0.55 });
      }
      const wave: V2[] = [];
      for (let i = 0; i <= 22; i++) {
        wave.push(v2(lerp(170, 1750, i / 22), base + 8 + (1 - burst) * 22 * noise1(i * 0.5 + d * 1.7, 3)));
      }
      s.stroke(wave, 620, { w: 2.4, color: rgba('night2', 0.5 * (1 - burst)) });
    }
    const w = this.liveWord(t);
    if (!w) return;
    const fresh = Math.max(0, 1 - (t - w.start) * 2.4) * clamp((t - w.start) * 9);
    if (fresh <= 0.02) return;
    for (let i = 0; i < 6; i++) {
      const fade = clamp(fresh - i * 0.14);
      if (fade <= 0.03) continue;
      const x = HEAD + (hash(i, 11) - 0.5) * 150;
      const y = base + 12 + (1 - fade) * (38 + 34 * hash(i, 5));
      s.blob(x, y, 4.5 + 4 * hash(i, 7), 640 + i, { colour: rgba('night', 0.85 * fade), n: 7, jag: 0.5 });
    }
  }

  // ------------------------------------------------------------------ the page
  /**
   * The book's edge and the folio — the film's inherited furniture, in the film's one place. At n = 2
   * the tape is wider than the page: the frame's ink is broken where the night crosses it, and runs off
   * the sheet (the brief's one deliberate pass outside the safe area).
   */
  private page(s: Sheet, n: number, over: number, t: number) {
    const [x0, y0, x1, y1] = FRAME;
    if (n === 1) {
      s.rect(x0, y0, x1, y1, 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    } else {
      s.stroke([v2(x0, y0), v2(x1, y0)], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
      s.stroke([v2(x1, y1), v2(x0, y1)], 4, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
      const run = clamp(prog(t, this.ctx.start + 3.8, this.ctx.end - 0.6, ease.outCubic)) * over;
      for (const sx of [x0, x1]) {
        // the sides, held clear of the tape; then the ink the night displaced keeps going, outward
        s.stroke([v2(sx, y0), v2(sx, TAPE_T - 12)], 6, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
        s.stroke([v2(sx, TAPE_B + 12), v2(sx, y1)], 7, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
        const g = sx === x0 ? -1 : 1;
        s.stroke([v2(sx, TAPE_T - 12), v2(sx + g * run, TAPE_T - 34), v2(sx + g * (run + 46), TAPE_T - 70)], 8, { w: 2.4, color: rgba('ink', 0.42), amp: 1.4 });
        s.stroke([v2(sx, TAPE_B + 12), v2(sx + g * run, TAPE_B + 34), v2(sx + g * (run + 46), TAPE_B + 70)], 9, { w: 2.4, color: rgba('ink', 0.42), amp: 1.4 });
      }
    }
    s.rect(x0 + 9, y0 + 9, x1 - 9, y1 - 9, 12, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.text('v.', 178, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }
}

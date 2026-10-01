// Plate 1 — `open` (0.00 → 9.58 s, three lines). THE REFERENCE PLATE for the re-shoot: read this before
// writing your own plate. Density contract: `03-animation.md §3` (a new composition every 1.1–1.5 s,
// 4–9 movements in a 5–8 s plate); lyric staging: `04-plates.md §3` (the line is an object in the
// world, never a bottom bar); no shared motif: `04-plates.md §5` (this plate's language is the sunken
// line — another plate may not reuse it).
//
// World: a drawing hand turning a blank sheet into land. Device: **riding a path** — the live line is
// lettered at up to 132 px *along the ground*, its baseline the ridge itself; where a word's ink ends
// the nib keeps going and the ink becomes the horizon. One line is the subject at a time; a line that
// has been sung **sinks into the sky band** (small, hatched, half-erased) and stays there as landscape:
// by the last movement the page is a stack of three remembered lines over one horizon.
//
// Five movements, one camera sub-shot each, cut on beats:
//   1  0.00 → 2.40  the nib enters and draws the ground; a fence and three birds arrive. No type yet.
//   2  2.40 → 4.50  line 1 rides the ground; a ridge rises behind it and the word-hills hatch.
//   3  4.50 → 6.28  line 2 rides; three silhouettes step along the ridge above it, one per beat.
//   4  6.28 → 8.63  line 3 rides; animals walk the near ground and their footfall spells the line.
//   5  8.63 → 9.58  the lantern is lit; the three sung lines sit small in the sky above the horizon.
/*!plate
{
  "id": "open",
  "window": [0, 9.5759],
  "device": "riding",
  "staging": "subject",
  "typePx": 142,
  "maxWidth": 1420,
  "bands": [
    { "name": "sunk", "y": [200, 390] },
    { "name": "walk", "y": [400, 568] },
    { "name": "live", "y": [574, 766] },
    { "name": "near", "y": [850, 984] }
  ],
  "movements": [
    { "at": 0,      "camera": "zoom-in-nib" },
    { "at": 2.4,    "camera": "punch-in-hills" },
    { "at": 4.5,    "camera": "whip-right-frieze" },
    { "at": 6.28,   "camera": "crane-out-tracks" },
    { "at": 8.63,   "camera": "hold-kick-lantern" }
  ],
  "opensLoop": true
}
*/
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const Q = ['once upon a younger year', 'all our shadows disappeared', 'animals inside came out'];
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The live line: big, riding the ground, fitted to MAXW so the camera never has to crop it. */
const SIZE = 142, MAXW = 1420;
/** The one ground the live line rides (only one line is live at a time, so they may share it). */
const GROUND = 706;
/** Bands that may never touch the live line's ink (type ascenders reach ~606, descenders ~736). */
const WALK_HIGH = 556;   // silhouettes' feet, above the type
const WALK_LOW = 906;    // animals' feet, below it
/** Where a sung line goes once it is over: the sky band, small and hatched. */
const SUNK = [268, 330, 392];

/**
 * The camera sub-shots (cx, cy, zoom, roll). A whip between two of these is a cut that costs nothing
 * (`03-animation.md §2`). While a full line is on screen the framing must hold it: at zoom z the visible
 * half-width is 960/z, so a line spanning [250, 1670] needs the view centred near 960.
 */
const SHOT: [number, number, number, number][] = [
  [470, 720, 1.30, 0],       // 1 the nib arrives, tight on the empty ground (no type on screen)
  [960, 610, 1.06, 0.012],   // 2 line 1 lands as hills
  [1000, 596, 1.04, -0.012], // 3 the frieze, whipped right (still holds the line)
  [960, 630, 1.05, 0.008],   // 4 the tracks, wide
  [950, 600, 1.10, 0],       // 5 the memory page: three sunken lines over the horizon
];

export default class Open extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const L = this.lines;
    // movement boundaries come from the lines themselves — never from round seconds. The last line's
    // `end` can sit far past the plate's end (the data spreads words over a following instrumental), so
    // the closing movement is clamped to the window: otherwise it would never play.
    const last = this.ctx.end - 0.95;
    const m = [this.ctx.start, L[0]!.start, L[1]!.start, L[2]!.start, Math.min(L[2]!.end + 0.35, last), this.ctx.end];
    const mk = t < m[1]! ? 0 : t < m[2]! ? 1 : t < m[3]! ? 2 : t < m[4]! ? 3 : 4;
    this.shot(s, t, m, mk);
    this.bookEdge(s, d);

    // 1 — the blank sheet and the line the nib draws: it becomes the ground everything else stands on
    if (mk === 0) {
      const p = prog(t, 0.35, m[1]! - 0.15, ease.outCubic);
      this.ground(s, p);
      this.nib(s, d, p);
      this.fence(s, d, prog(t, 0.9, m[1]! - 0.3));
      this.birds(s, d, t, prog(t, 1.2, m[1]! - 0.2));
    }
    // 2 — line 1 rides the ground; the ridge rises behind it (feet at WALK_HIGH, clear of the type)
    if (mk >= 1) this.ridge(s, d, t, m[1]!);
    this.live(s, t, 0, mk === 1, 'hill');
    // 3 — line 2 rides; the silhouettes step along the ridge above it, one per beat
    if (mk >= 2) this.walkers(s, d, t, m[2]!);
    this.live(s, t, 1, mk === 2, 'frieze');
    // 4 — line 3 rides; the animals walk the near ground below it and their footfall spells the line
    if (mk >= 3) this.animals(s, d, t, m[3]!);
    this.live(s, t, 2, mk === 3, 'track');
    // 5 — the lantern, and every line already sung sunk into the sky
    for (let i = 0; i < 3; i++) this.sunk(s, d, t, i);
    this.lantern(s, d, t, 214, GROUND + 8, prog(t, m[4]! - 0.45, m[4]!));
    return CEL.flat;
  }

  /** The camera: hold the movement's shot, whip into the next one with outExpo (a cut, not a drift). */
  private shot(s: Sheet, t: number, m: number[], k: number) {
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const w = clamp(prog(t, m[k]! - 0.22, m[k]! + 0.34, ease.outExpo), 0, 1);
    const phase = this.ctx.audio.beatAt(t) % 1;   // kinetic zoom off the beat, not off a sine of t
    const z = lerp(A[2], B[2], w) * (1 + 0.022 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(A[0], B[0], w), lerp(A[1], B[1], w), z, lerp(A[3], B[3], w));
  }

  /** The sheet: its edge and the folio only — the writing rules of v1 are gone on purpose. */
  private bookEdge(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.text('i.', 178, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  /** Movement 1's line: drawn left to right, and never removed — this ink is the world's ground. */
  private ground(s: Sheet, p: number) {
    const pts: V2[] = [];
    for (let i = 0; i <= 60; i++) pts.push(v2(lerp(250, 1670, i / 60), GROUND + 4 + Math.sin(i * 0.17) * 6));
    s.stroke(pts.slice(0, Math.max(2, Math.ceil(pts.length * p))), 11, { w: 3.4, overshoot: 14, color: rgba('ink', 0.92) });
  }

  /** The pen nib and its lantern light — the tool that makes the world, and the film's warm note. */
  private nib(s: Sheet, d: number, p: number) {
    if (p >= 1) return;
    const x = lerp(250, 1670, p), y = GROUND + 4 + Math.sin((x - 250) * 0.0028) * 6;
    s.blob(x + 6, y - 5, 7, 31, { colour: rgba('lantern', 0.95), n: 7, jag: 0.5 });
    s.stroke([v2(x - 8, y - 26), v2(x + 4, y - 4)], 32, { w: 3, color: rgba('ink', 0.9) });
  }

  private fence(s: Sheet, d: number, k: number) {
    if (k <= 0) return;
    for (let i = 0; i < 9; i++) {
      const x = 300 + i * 160;
      s.stroke([v2(x, GROUND + 2), v2(x + 2, GROUND - 32)], 60 + i, { w: 2.2, color: rgba('ink', 0.5 * k) });
    }
    s.stroke([v2(296, GROUND - 14), v2(1590, GROUND - 18)], 70, { w: 1.8, color: rgba('ink', 0.42 * k), a: k });
  }

  private birds(s: Sheet, d: number, t: number, k: number) {
    if (k <= 0) return;
    for (let i = 0; i < 3; i++) {
      const bx = 1180 + i * 66 + Math.sin(heldT(t) * 2 + i) * 5, by = 300 - i * 30 - prog(t, 1.2, 9.5) * 40;
      s.stroke([v2(bx - 15, by), v2(bx, by - 8), v2(bx + 15, by)], 80 + i, { w: 2.6, color: rgba('graphite', 0.7 * k) });
    }
  }

  /** The ridge: two flat tones with hatching, feet at WALK_HIGH so the live type never touches it. */
  private ridge(s: Sheet, d: number, t: number, t0: number) {
    const k = clamp(prog(t, t0 - 0.2, t0 + 1.1, ease.outCubic), 0, 1);
    const ridge: V2[] = [v2(150, WALK_HIGH + 12)];
    for (let i = 0; i <= 22; i++) ridge.push(v2(lerp(150, 1770, i / 22), WALK_HIGH - 30 - 62 * noise1(i * 0.4, 3) - 18 * noise1(i * 0.12, 9)));
    ridge.push(v2(1770, WALK_HIGH + 12));
    s.fill(ridge, 21, rgba('shade', 0.85), { a: 0.5 * k });
    s.stroke(ridge, 21, { w: 2, color: rgba('graphite', 0.5), a: 0.7 * k, amp: 1.8 });
    s.hatch(ridge.map((p) => v2(p.x, p.y + 16)), 22, { spacing: 15, angle: 1.05, color: rgba('graphite', 0.3 * k), w: 1.1 });
  }

  /** The silhouettes (movement 3): they walk the ridge, one step per beat, well above the type. */
  private walkers(s: Sheet, d: number, t: number, t0: number) {
    const up = clamp(prog(t, t0 - 0.25, t0 + 0.7, ease.outCubic), 0, 1);
    if (up <= 0) return;
    for (let i = 0; i < 3; i++) {
      const walk = clamp((t - (t0 + i * 0.45)) / (this.ctx.end - t0), 0, 1);
      const x = lerp(560 + i * 300, 1480 + i * 110, ease.outCubic(walk));
      const h = 132 - i * 10;
      const step = Math.sin(heldT(t) * 6 + i * 2) * 6 * (walk < 1 ? 1 : 0);
      const body: V2[] = [v2(x, WALK_HIGH), v2(x + 18, WALK_HIGH - h * 0.5), v2(x + 9, WALK_HIGH - h * 0.8), v2(x + 24, WALK_HIGH - h), v2(x + 40, WALK_HIGH - h * 0.76), v2(x + 31, WALK_HIGH - h * 0.44), v2(x + 52, WALK_HIGH)];
      s.fill(body, 90 + i, rgba('night2', 0.95), { a: 0.9 * up * (1 - walk * 0.3) });
      s.stroke(body, 90 + i, { w: 3.2, color: rgba('ink', 0.9 * up * (1 - walk * 0.25)) });
      s.stroke([v2(x + 13, WALK_HIGH + 2), v2(x + 18 + step, WALK_HIGH - 42), v2(x + 15, WALK_HIGH)], 95 + i, { w: 2.8, color: rgba('ink', 0.72 * up) });
      s.stroke([v2(x + 42, WALK_HIGH + 2), v2(x + 38 - step, WALK_HIGH - 42), v2(x + 48, WALK_HIGH)], 96 + i, { w: 2.8, color: rgba('ink', 0.72 * up) });
    }
  }

  /** The animals (movement 4): they walk the near ground, below the type, and leave the tracks. */
  private animals(s: Sheet, d: number, t: number, t0: number) {
    const kinds = [this.horse, this.bird, this.cat, this.bird, this.horse];
    for (let i = 0; i < kinds.length; i++) {
      const k = clamp(prog(t, t0 + 0.15 + i * 0.35, this.ctx.end - 0.6 + i * 0.3), 0, 1);
      if (k <= 0) continue;
      const x = lerp(300, 1620, k), y = WALK_LOW + i * 8;
      s.stroke(kinds[i]!(x, y, 1.05 + 0.12 * hash(i, d)), 120 + i, { w: 3.4, color: rgba('ink', 0.92), overshoot: 3 });
      s.stroke([v2(x - 30, y + 26), v2(x + 44, y + 26)], 140 + i, { w: 1.4, sketch: true, color: rgba('graphite', 0.4) });
    }
  }

  /**
   * A line, live: the one being sung rides the ground at full size, revealed word by word. When it is
   * not this line's movement nothing is drawn here — the sunk copy in `sunk()` speaks for it instead,
   * so the plate never has two lines competing at full size.
   */
  private live(s: Sheet, t: number, idx: number, isLive: boolean, style: 'hill' | 'frieze' | 'track') {
    if (!isLive) return;
    const l = this.lines[idx]!;
    if (t < l.start - 1.6) return;
    const ground = (x: number) => GROUND + Math.sin(x * 0.0021 + idx * 4) * 12 + noise1(x * 0.0035, idx + 1) * 8;
    const slope = (x: number) => (ground(x + 24) - ground(x - 24)) / 48;
    const words = l.words;
    const raw = words.reduce((acc, w) => acc + s.measureLetter(w.w, 'readable', SIZE), 0) + 26 * (words.length - 1);
    const size = raw > MAXW ? Math.max(60, Math.floor((SIZE * MAXW) / raw)) : SIZE;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const total = widths.reduce((a, w) => a + w, 0) + 26 * (words.length - 1);
    let x = (W - total) / 2;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      const cx = x + widths[i]! / 2;
      const y = ground(cx);
      const rot = Math.atan(slope(cx)) * 0.9;
      const rise = clamp(prog(t, w.start - 0.5, w.start + 0.08, ease.outCubic), 0, 1);
      if (style === 'track') {
        this.trackWord(s, w.w, x, y + 4, size, 200 + i, p, rot);
      } else {
        if (rise < 1) s.letter(w.w, x, y + (1 - rise) * 40, size, 100 + i, { font: 'readable', color: rgba('graphite', 0.2), w: 3.4, rot });
        s.letterWritten(w.w, x, y, size, 100 + i, p, {
          font: 'readable', w: 5.2, amp: 2, rot,
          color: p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95),
        });
      }
      if (style !== 'track' && p > 0.15) {
        // the ink of a word keeps going under itself: the ground is made of the line's own strokes
        const sk: V2[] = [];
        for (let q = 0; q <= 10; q++) { const sx = lerp(x - 12, x + widths[i]! + 12, q / 10); sk.push(v2(sx, ground(sx) + 8)); }
        s.fill([...sk, v2(x + widths[i]! + 12, GROUND + 52), v2(x - 12, GROUND + 52)], 150 + i, rgba('shade', 0.8), { a: 0.4 * p });
        if (style === 'hill') s.hatch(sk.map((q) => v2(q.x, q.y + 20)), 160 + i, { spacing: 14, angle: 0.9, color: rgba('graphite', 0.35), w: 1.2 });
      }
      x += widths[i]! + 26;
    }
  }

  /** A word laid down as tracks: dashed footfall strokes that still spell the word. */
  private trackWord(s: Sheet, word: string, x: number, y: number, size: number, seed: number, p: number, rot: number) {
    const w = s.measureLetter(word, 'readable', size);
    const n = Math.max(3, Math.round(w / 42));
    for (let i = 0; i < n; i++) {
      if ((i + 1) / n > p * 1.15) break;
      const px = x + (i + 0.5) * (w / n);
      const a2 = rot + (hash(i, seed) - 0.5) * 0.5;
      const dx = Math.cos(a2) * 15, dy = Math.sin(a2) * 15;
      s.stroke([v2(px - dx, y - 6 - dy), v2(px + dx, y - 6 + dy)], seed + i, { w: 4.6, color: rgba('ink', 0.9), taper: false });
      s.stroke([v2(px - dx * 0.8, y + 8 - dy), v2(px + dx * 0.8, y + 8 + dy)], seed + 50 + i, { w: 3.4, color: rgba('graphite', 0.8), taper: false });
    }
  }

  /** A line that is over: it sinks into the sky band, small and hatched — the land remembering it. */
  private sunk(s: Sheet, d: number, t: number, idx: number) {
    const l = this.lines[idx]!;
    const k = clamp(prog(t, l.end + 0.25, l.end + 1.5, ease.inOutCubic), 0, 1);
    if (k <= 0.01 || l.end > this.ctx.end - 0.6) return;   // a line whose data-end runs past the plate stays live
    const y = SUNK[idx]!, size = 40 - idx * 3;
    const w = s.measureLetter(l.text, 'readable', size);
    const x = 300 + idx * 70;
    s.letter(l.text, x + w / 2, y, size, 300 + idx, { font: 'readable', align: 'center', color: rgba('graphite', 0.3 + 0.12 * k), w: 2 });
    s.hatch([v2(x - 6, y + 8), v2(x + w + 6, y + 8), v2(x + w + 6, y + 26), v2(x - 6, y + 26)], 310 + idx, { spacing: 10, angle: -1.1, color: rgba('graphite', 0.22 * k), w: 1 });
  }

  /** The lantern: the film's instrument, lit at the ground's left end in the closing movement. */
  private lantern(s: Sheet, d: number, t: number, x: number, y: number, lit: number) {
    if (lit <= 0.001) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.stroke(body, 51, { w: 3.2, closed: true, color: rgba('ink', 0.95) });
    s.fill(body, 51, rgba('lantern', 0.5 * lit * flick), { a: 0.9 });
    s.stroke([v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 52, { w: 3, color: rgba('ink', 0.9) });
    s.blob(x, y - 22, 11 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 18, 5 * lit, 54, { colour: rgba('star', 0.9 * lit), n: 7, jag: 0.5 });
  }

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

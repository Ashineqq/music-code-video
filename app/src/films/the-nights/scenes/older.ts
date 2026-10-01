/*!plate
{
  "id": ["older1", "older2"],
  "window": [24.814, 108.6235],
  "device": "riding",
  "staging": "subject",
  "typePx": 140,
  "maxWidth": 1330,
  "bands": [
    { "name": "crown", "y": [96, 240] },
    { "name": "live", "y": [241, 800] },
    { "name": "coil", "y": [801, 980] }
  ],
  "movements": [
    { "at": 24.814, "camera": "follow-pen" },
    { "at": 26.2426, "camera": "whip-right" },
    { "at": 27.6711, "camera": "whip-scan2" },
    { "at": 29.0997, "camera": "punch-in" },
    { "at": 30.5283, "camera": "crash-in" },
    { "at": 31.4807, "camera": "crane-out" },
    { "at": 101.0045, "camera": "follow-pen" },
    { "at": 102.433, "camera": "whip-right" },
    { "at": 103.8616, "camera": "whip-scan2" },
    { "at": 105.2902, "camera": "punch-in" },
    { "at": 106.7188, "camera": "crash-in" },
    { "at": 107.6711, "camera": "tilt-to-canopy" }
  ]
}
*/
// Plate 4 — `older` (older1 24.814 → 32.433 s, n = 1; older2 101.0045 → 108.6235 s, n = 2). ONE module,
// two entries through `ctx.params.n`: the same recorder at two ages.
//
// WORLD — a hand-scribbled chart recorder. Its dead line prints at the upper left (scan A, x 190–470,
// y 380); where it ends the hand starts looping, loop after loop, the trace runs off the page's right
// edge and a fresh line starts at the left edge one scan lower (scan B, y 620). Two scans, one pen.
// DEVICE — *riding a path* (`04-plates.md §3.2`): a lyric line is spaced along the scan that holds it
// (`polylineLengths` + `pointAtLength`), every word's baseline on the scan and rotating with its tangent,
// and the loops the trace hangs under a word swell on every kick (`f.a.kick`) while that word is being
// sung. A finished line does not linger at full size: it is already shrinking and folding down from its
// last word, and 0.45 s later it is at rest in the coil of loops under the strip (`04-plates.md §6` — the
// only full-size line on the page is the live one; the fold itself crosses the band's lower edge, which is
// the movement). By the sixth movement the strip carries three rows of loops with three faint remembered
// lines inside them.
//
// n = 1 — the last line's last word rides scan B's tail: the loop under it swells past its neighbours,
//   blows up to full frame and its ink runs off the page's right and bottom edges; the sixth movement
//   brings it back as a TREE standing over the strip's tail.
// n = 2 — the tree is already there when we arrive; the last words ride in under its canopy, and the
//   small figure steps onto scan B inside a solid `night2` shadow thrown by the canopy.
//
// SIX MOVEMENTS (one camera sub-shot each, cut on beats — `03-animation.md §2/§3`, 1.33 s mean):
//   1 start → b1  the dead line prints; the pen arrives, lays scan A loop after loop, runs off the sheet
//                 and lays scan B; line 1's words ride the ink as it arrives.  (follow the pen, z 1.30→1.00)
//   2 b1 → b2     line 2's words on scan A; line 1 is already a coil below.                (whip right)
//   3 b2 → b3     line 2's words wrap onto scan B and the camera drops with them.       (whip to scan B)
//   4 b3 → b4     line 3's words on scan A; the hand re-scribbles the whole trace once.      (punch in)
//   5 b4 → b5     "ever you're": the loop under the live word swells, blows up, leaves the page. (crash in)
//   6 b5 → end    "afraid" is sung as the ring returns as a tree.                       (crane out wide)
// The same six are re-anchored on n = 2's own lines and beats (101.0045 → 108.6235); because the tree is
// already standing there and no ring escapes, its movement 6 is `tilt-to-canopy` instead: the camera tilts
// up under the canopy and holds on the trunk and the figure standing in its `night2` shadow (SHOT_CANOPY).
// n = 1's six `at` values are the manifest's first six, n = 2's the last six.
//
// BANDS (y — `04-plates.md §6`: the live line's ink is touched by the trace it rides and by nothing else):
//   crown  y 96–240    the 1 mV calibration, the beat counter, and the tree's canopy.
//   live   y 241–800   the live words and the trace they ride (the scans + the loops under the live word).
//   coil   y 801–980   the finished lines, curled into the coil of loops under the strip.
// Inside `live` the words' own x-run is [400, 1730] on both scans, and only the trace they ride enters it.
// The recorder's wood — trunk, figure, solid shadow — stands at x > 1730 in that band's right margin,
// where no word reaches (the words' ink out there is scan A's alone, and it ends at y ≈ 419, well above
// the wood). The one deliberate pass outside the safe area: the escape ring leaves the page.
import { InkedScene, Sheet, rgba, v2, W, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL, resample } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { AudioSample } from '../../../engine/audio';
import { polylineLengths, pointAtLength } from '../../../engine/util';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines both entries open on, in order. Queried by fragment; the entry picks the occurrence. */
const Q = ['When you get older', 'Your wild heart will live for younger days', "Think of me if ever you're afraid"];
/** The sheet (the film's paper) — its right edge is where the trace runs off. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const PAGE_R = FRAME[2];
/** The subject's size (`typePx`); both scans together hold the longest line, so nothing ever shrinks. */
const SIZE = 140, GAP = 22;
/** The words' run on each scan: inside the safe area, clear of the recorder's wood at x ≥ 1730. */
const WX0 = 400, WX1 = 1730, RUNW = WX1 - WX0;
/** The recorder's two scans and the dead line that prints before the pen starts. */
const SC = [380, 620];
const X0 = 190, FLAT = 470;
const A_WAVE = 18, B_WAVE = 8;
/** The rows a finished line curls into, and how small it gets (`SUNK` of its live size). */
const ROW = [836, 874, 912];
const SUNK = 0.30;
/** The loop sites: the same rail on both scans; a hand-variegated ring hangs under each. */
const NR = 10, RX0 = 470, RDX = 130;
/** The tree (n = 2 from the first frame; n = 1 grows it in movement 6) and the figure under it. */
const TREE = { x: 1800, cy: 160, rx: 128, ry: 58 };
const FIG = { x: 1800, h: 74 };
const SH = { x: 1786, y: 652, rx: 62, ry: 24 };

/** The camera sub-shots (cx, cy, zoom, roll) — a whip between two is a cut that costs nothing. */
const SHOT: [number, number, number, number][] = [
  [960, 560, 1.00, 0.006],    // 1 — where movement 1 leaves the pen (used as the source of the first whip)
  [1010, 440, 1.05, 0.018],   // 2 — line 2's words on scan A
  [1030, 590, 1.04, -0.014],  // 3 — line 2's words, wrapped onto scan B
  [1010, 470, 1.12, 0.010],   // 4 — line 3's words on scan A, punched in
  [1040, 580, 1.16, -0.040],  // 5 — the loop under the live word blows up
  [1010, 560, 0.80, -0.010],  // 6 — n = 1: crane out wide, the escaped ring back as a tree
];
/**
 * n = 2's last movement instead (the brief's own fifth row): the camera tilts up under the canopy and
 * holds, so the frame is the tree, the trunk and the small figure standing in its shadow. At z 0.92 the
 * visible x starts at 647, so "afraid" (1098–1446) — the word being sung — is still whole.
 */
const SHOT_CANOPY: [number, number, number, number] = [1690, 400, 0.92, -0.006];

/** The hand's wave on a scan: dead flat until the pen starts, then a slow loop-to-loop sway. */
function scanY(k: number, x: number): number {
  const fade = k === 0 ? clamp(prog(x, FLAT, 800, ease.inOutCubic)) : 1;
  return SC[k]! + fade * (A_WAVE * Math.sin(x * 0.0060 + k * 2.1) + B_WAVE * noise1(x * 0.0035, 11 + k));
}

/** One word's place on a scan: the left anchor, its centre, and the tangent it rides. */
interface Slot { scan: number; x0: number; xc: number; y: number; rot: number; w: number }
/** The word being sung right now (one at a time — the lyrics never overlap). */
interface Now { line: number; scan: number; x0: number; x1: number; p: number }

export default class Older extends InkedScene {
  /** 1 for older1, 2 for older2. */
  private n: number = this.ctx.params.n === 2 ? 2 : 1;
  /** This entry's three lines: occurrence 0 for n = 1, occurrence 1 for n = 2. All six are queried. */
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q, this.n - 1));

  // ---- the fixed trace: one resampled polyline per scan, built once and reused by every pass
  private scans: V2[][] = [];
  private scansL: Float32Array[] = [];
  private rings: { scan: number; x: number; rx: number; ry: number }[] = [];

  override init() {
    for (let k = 0; k < 2; k++) {
      // the base is coarse on purpose: `resample` only refines, so the material has to start wider than
      // the 14 px step — that is what keeps the trace's wobble at ~120 points a scan, not ~570
      const pts: V2[] = [];
      for (let x = X0; x <= PAGE_R; x += 30) pts.push(v2(x, scanY(k, x)));
      const line = resample(pts, 14);
      this.scans.push(line);
      this.scansL.push(polylineLengths(line));
    }
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < NR; j++) {
        this.rings.push({ scan: k, x: RX0 + j * RDX, rx: 30 + 16 * hash(j, k, 5), ry: 22 + 12 * hash(j, k, 9) });
      }
    }
  }

  /**
   * The point of a scan at x, with the tangent there: the words ride the SCAN'S OWN POLYLINE
   * (`pointAtLength`), not a formula about it — that is the whole device (`04-plates.md §3.2`).
   * Both scans are x-monotone, so x -> arc length is a short linear walk.
   */
  private atScan(k: number, x: number): { y: number; angle: number } {
    const pts = this.scans[k]!, L = this.scansL[k]!;
    let i = 0;
    while (i + 2 < pts.length && pts[i + 1]!.x < x) i++;
    const a = pts[i]!, b = pts[Math.min(i + 1, pts.length - 1)]!;
    const u = b.x > a.x ? clamp((x - a.x) / (b.x - a.x)) : 0;
    const s = L[i]! + (L[Math.min(i + 1, L.length - 1)]! - L[i]!) * u;
    return pointAtLength(pts, L, s);
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const m = this.bounds();                       // seven boundaries, from the lines themselves
    let mk = 0;
    for (let k = 0; k < 5; k++) if (t >= m[k + 1]!) mk = k + 1;
    const lay = this.lines.map((l) => this.lay(s, l));   // one layout pass per line per frame
    const now = this.now(t, lay);
    const pen = this.penPhase(t, mk);
    const esc = this.escape(t, m);                       // 0 until the loop under the last word goes
    const escIdx = esc > 0.001 ? this.escRing(lay) : -1;

    this.shot(s, t, m, mk, pen[2]);
    this.page(s);
    this.marks(s, t);
    this.trace(s, t, mk, m, pen, now, f.a, esc, escIdx);
    this.words(s, t, lay, now, d, [this.penX(0, pen[0]), this.penX(1, pen[1])]);
    this.coil(s, t, lay);
    this.tree(s, t, m);
    this.figure(s, t);
    return CEL.flat;
  }

  // ------------------------------------------------------------------ the movement table
  /**
   * The six movements' boundaries from this entry's own lines, each snapped to the beat grid
   * (`03-animation.md §1/§2`): the plate's start, then line 2, the middle of line 2, line 3, and two
   * points inside line 3's tail. For n = 1 these are exactly the manifest's `at` values.
   */
  private bounds(): number[] {
    const a = this.ctx.audio, L = this.lines;
    const on = (x: number) => a.timeOfBeat(Math.floor(a.beatAt(x + 0.02)));
    return [
      this.ctx.start,
      on(L[1]!.start),
      on((L[1]!.start + L[1]!.end) / 2),
      on(L[2]!.start),
      on(L[2]!.start + 1.35),
      on(L[2]!.start + 2.45),
      this.ctx.end,
    ];
  }

  /** The camera: movement 1 follows the pen; every later movement is a whip into its own shot. */
  private shot(s: Sheet, t: number, m: number[], mk: number, pen: number) {
    const phase = this.ctx.audio.beatAt(t) % 1;              // kinetic zoom off the beat, not off sin(t)
    const kick = 1 + 0.024 * Math.max(0, 1 - phase * 3);
    if (mk === 0) {
      const p = clamp(pen, 0, 1);
      s.setCam(lerp(430, 960, ease.outCubic(p)), lerp(540, 500, ease.outCubic(p)) + 60 * clamp(pen - 1, 0, 1),
        lerp(1.30, 1.00, ease.outCubic(p)) * kick, 0.006 * p);
      return;
    }
    const A = SHOT[Math.max(0, mk - 1)]!;
    const B = this.n === 2 && mk === 5 ? SHOT_CANOPY : SHOT[mk]!;
    const w = clamp(prog(t, m[mk]! - 0.22, m[mk]! + 0.34, ease.outExpo), 0, 1);
    s.setCam(lerp(A[0], B[0], w), lerp(A[1], B[1], w), lerp(A[2], B[2], w) * kick, lerp(A[3], B[3], w));
  }

  // ------------------------------------------------------------------ the sheet and its marks
  /** The sheet's edge — the film's paper. The writing rules of v1 are gone on purpose. */
  private page(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
  }

  /** The recorder's own instruments: its 1 mV calibration and its beat counter (stepped on twos). */
  private marks(s: Sheet, t: number) {
    s.rect(560, 106, 640, 186, 20, { w: 2.6, color: rgba('ink', 0.8), overshoot: 5 });
    s.text('1 mV', 652, 152, { size: 25, fam: 'Plex-400', color: rgba('graphite', 0.85) });
    const b0 = Math.floor(this.ctx.audio.beatAt(this.ctx.start));
    const bn = Math.floor(this.ctx.audio.beatAt(heldT(t)));
    s.text(`BEAT ${String(Math.max(0, bn - b0)).padStart(2, '0')}`, 652, 196, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.8) });
  }

  // ------------------------------------------------------------------ the trace
  /** A wobbly ring: never an ellipse (the hand wanders with the angle). Seeded, so it is one shape. */
  private ring(seed: number, cx: number, cy: number, rx: number, ry: number): V2[] {
    const n = 18, pts: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const j = 1 + 0.10 * noise1(i * 0.9 + seed * 2.7, 29);
      pts.push(v2(cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j));
    }
    return pts;
  }

  /** How far the pen has got, per scan (0..2 over both), and while movement 1 is drawing. */
  private penPhase(t: number, mk: number): [number, number, number] {
    const pen = mk > 0 ? 2 : 2 * prog(t, this.ctx.start + 0.12, this.ctx.start + 1.30, ease.outCubic);
    const lim = (k: number) => clamp(pen - k, 0, 1);
    return [lim(0), lim(1), pen];
  }

  /** The pen's x on a scan. It ARRIVES at the dead line's end (the line is already printed) and goes on. */
  private penX(k: number, lim: number): number {
    return k === 0 ? FLAT + lim * (PAGE_R - FLAT) : X0 + lim * (PAGE_R - X0);
  }

  /** The trace: the dead line, then both scans, loop after loop — and the loops themselves. */
  private trace(s: Sheet, t: number, mk: number, m: number[], pen: [number, number, number], now: Now | null, a: AudioSample, esc: number, escIdx: number) {
    const lim = [pen[0], pen[1]];
    for (let k = 0; k < 2; k++) {
      const l = lim[k]!;
      const px = this.penX(k, l);
      const line = this.scans[k]!;
      // the re-scribble: from movement 2 on, the hand goes over the scan it has already laid
      if (mk > 0) {
        const rp = prog(t, m[mk]!, m[mk]! + 0.70, ease.outCubic);
        const w = clamp(Math.min(rp * 3 - k, 1), 0, 1);
        if (w > 0 && w < 1) {
          const off = 5 * (1 - w);
          const sub = line.filter((q) => q.x <= lerp(X0, PAGE_R, w)).map((q) => v2(q.x, q.y + off));
          if (sub.length > 1) s.stroke(sub, 70 + mk * 2 + k, { w: 1.7, color: rgba('graphite', 0.5 * (1 - w)), amp: 3.6, freq: 3.2, taper: false });
        }
      }
      // the trace itself, up to the pen (the dead line is printed before the plate opens)
      const cut = line.findIndex((q) => q.x > px);
      const kn = cut < 0 ? line.length : cut;
      if (kn > 1) s.stroke(line.slice(0, kn), 40 + k, { w: 3.0, color: rgba('ink', 0.92), amp: 2, freq: 2.2, taper: false, overshoot: 4 });
      // the nib, while the pen is still on this scan
      if (mk === 0 && l < 1) {
        const py = scanY(k, px);
        s.stroke([v2(px - 9, py - 26), v2(px + 3, py - 4)], 80 + k, { w: 3, color: rgba('ink', 0.9) });
        s.blob(px + 4, py - 5, 6.5, 82 + k, { colour: rgba('lantern', 0.95), n: 7, jag: 0.5 });
      }
    }
    // the loops: one per site, hanging under its scan; the ones under the live word take the kick
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i]!;
      if (r.x > this.penX(r.scan, lim[r.scan]!)) continue;         // the pen has not reached it yet
      if (i === escIdx && esc > 0.001) continue;                   // this one is busy escaping
      const under = !!now && now.scan === r.scan && r.x > now.x0 - 34 && r.x < now.x1 + 34;
      const g = under ? 1 + 0.85 * a.kick + 0.35 * now!.p : 1 + 0.05 * Math.sin(heldT(t) * 2.1 + i * 1.7);
      const rx = r.rx * g, ry = r.ry * g;
      s.stroke(this.ring(i, r.x, scanY(r.scan, r.x) + ry, rx, ry), 50 + i,
        { closed: true, w: 2.6, color: rgba('ink', under ? 0.95 : 0.72), amp: 2.4 });
    }
    if (esc > 0.001 && escIdx >= 0) {
      // the loop under the last word, blown up and on its way off the sheet
      const r = this.rings[escIdx]!;
      const cx = r.x + 640 * esc * esc, cy = scanY(r.scan, r.x) + r.ry + 430 * esc * esc;
      const k = 1 + 7.2 * esc;
      s.stroke(this.ring(60, cx, cy, r.rx * k, r.ry * k), 62, { closed: true, w: 3.4, color: rgba('ink', 0.95), amp: 3.4 });
      if (esc < 0.96) s.stroke(this.ring(61, cx, cy, r.rx * k * 0.9, r.ry * k * 0.9), 63, { closed: true, w: 1.8, color: rgba('lantern', 0.45), amp: 4.2 });
    }
  }

  // ------------------------------------------------------------------ the words
  /**
   * A line's words, greedily filled across the two scans and centred within each scan's run. The trace
   * is the page's own width, so both scans together hold the longest line at `SIZE` — no shrinking.
   */
  private lay(s: Sheet, l: Line): { size: number; slots: Slot[] } {
    const words = l.words;
    let size = SIZE;
    let wid = words.map((q) => s.measureLetter(q.w, 'readable', size));
    const need = (w: number[]) => w.reduce((x, y) => x + y, 0) + GAP * (words.length - 1);
    const cap = 2 * RUNW;
    if (need(wid) > cap) {                       // a longer line than the strip holds rides smaller
      size *= cap / need(wid);
      wid = words.map((q) => s.measureLetter(q.w, 'readable', size));
    }
    const slots: Slot[] = [];
    let i = 0;
    for (let k = 0; k < 2 && i < words.length; k++) {
      let j = i, tot = 0;
      while (j < words.length) {
        const add = (j === i ? 0 : GAP) + wid[j]!;
        if (tot + add > RUNW) break;
        tot += add; j++;
      }
      if (j === i) { tot = wid[i]!; j = i + 1; }     // one word wider than the run still gets the run
      let x = WX0 + (RUNW - tot) / 2;
      for (let q = i; q < j; q++) {
        const w = wid[q]!;
        const xc = x + w / 2;
        const at = this.atScan(k, xc);            // the scan's own polyline: y and tangent
        slots.push({ scan: k, x0: x, xc, y: at.y, rot: clamp(at.angle, -0.22, 0.22), w });
        x += w + GAP;
      }
      i = j;
    }
    return { size, slots };
  }

  /** The word being sung this instant — the only one whose loops take the kick. */
  private now(t: number, lay: { size: number; slots: Slot[] }[]): Now | null {
    for (let i = 0; i < 3; i++) {
      const l = this.lines[i]!;
      if (t < l.start - 1.15 || t > l.end + 0.20) continue;
      for (let j = 0; j < l.words.length; j++) {
        const p = Lyrics.wordProgress(l.words[j]!, t);
        if (p > 0 && p < 1) {
          const q = lay[i]!.slots[j]!;
          return { line: i, scan: q.scan, x0: q.x0, x1: q.x0 + q.w, p };
        }
      }
    }
    return null;
  }

  /** Every queried word, ridden or curled: the live line at full size, a finished one sinking. */
  private words(s: Sheet, t: number, lay: { size: number; slots: Slot[] }[], now: Now | null, d: number, mx: [number, number]) {
    for (let i = 0; i < 3; i++) {
      const l = this.lines[i]!;
      if (t < l.start - 1.15) continue;
      const { size, slots } = lay[i]!;
      const isLive = !!now && now.line === i;
      const sink = clamp(prog(t, l.end - 0.12, l.end + 0.45, ease.outCubic), 0, 1);
      // where the line curls to: a small remembered row, its own coil row
      const sw = slots.map((q) => q.w * SUNK);
      const totS = sw.reduce((x, y) => x + y, 0) + GAP * SUNK * (slots.length - 1);
      let sx = W / 2 - totS / 2;
      for (let j = 0; j < slots.length; j++) {
        const q = slots[j]!, word = l.words[j]!;
        const p = Lyrics.wordProgress(word, t);
        // the word waits for the ink it rides: it is drawn once the pen has passed its anchor
        const ready = q.x0 <= (q.scan === 0 ? mx[0] : mx[1]) + 40;
        const sz = lerp(size, size * SUNK, sink);
        const cx = lerp(q.xc, sx + sw[j]! / 2, sink);
        const cy = lerp(q.y, ROW[i]!, sink);
        const rot = q.rot * (1 - sink);
        if (isLive && (p <= 0 || !ready)) {
          // the word waiting to be written — the 16 % ghost (`03-animation.md §7`)
          s.letter(word.w, cx, cy, sz, 30 + i * 10 + j, { font: 'readable', align: 'center', rot, color: rgba('graphite', 0.22), w: 2.4, amp: 1.6 });
        } else if (p > 0) {
          const col = sink > 0.02 ? rgba('graphite', 0.55) : p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95);
          s.letterWritten(word.w, cx, cy, sz, 60 + i * 10 + j, p, { font: 'readable', align: 'center', rot, w: isLive ? 4.6 : 3.2, amp: 2, color: col });
        }
        sx += sw[j]! + GAP * SUNK;
        // the nib: a lantern tick that rides the word being written this instant
        if (isLive && p > 0 && p < 1 && ready) {
          const px = q.xc + (p - 0.5) * q.w * Math.cos(q.rot), py = q.y + (p - 0.5) * q.w * Math.sin(q.rot);
          s.blob(px + 4, py - 6, 6 * (0.85 + 0.15 * hash(7, d)), 90 + j, { colour: rgba('lantern', 0.95), n: 7, jag: 0.5 });
          s.stroke([v2(px - 7, py - 26), v2(px + 3, py - 4)], 94 + j, { w: 2.8, color: rgba('ink', 0.9) });
        }
      }
    }
  }

  /** The coil a finished line has become: loose loops over the remembered row, and a strike through it. */
  private coil(s: Sheet, t: number, lay: { size: number; slots: Slot[] }[]) {
    for (let i = 0; i < 3; i++) {
      const l = this.lines[i]!;
      const k = clamp(prog(t, l.end - 0.12, l.end + 0.45, ease.outCubic), 0, 1);
      if (k <= 0.25) continue;
      const slots = lay[i]!.slots;
      const sw = slots.map((q) => q.w * SUNK);
      const tot = sw.reduce((x, y) => x + y, 0) + GAP * SUNK * (slots.length - 1);
      const x0 = W / 2 - tot / 2;
      for (let j = 0; j < 7; j++) {
        const x = x0 + (j + 0.5) * (tot / 7);
        const rx = 22 + 15 * hash(i, j, 3), ry = 14 + 8 * hash(i, j, 7);
        s.stroke(this.ring(j + i * 7, x, ROW[i]! - 6 + 8 * hash(i, j, 11), rx, ry), 400 + i * 10 + j,
          { closed: true, w: 2, color: rgba('ink', 0.42 * k), amp: 2.6 });
      }
      s.stroke([v2(x0 - 26, ROW[i]! + 8), v2(x0 + tot + 26, ROW[i]! - 6)], 430 + i,
        { w: 1.6, color: rgba('graphite', 0.5 * k), amp: 4, freq: 3, taper: false });
    }
  }

  // ------------------------------------------------------------------ the payoff
  /**
   * The escape: 0 while the loop under the last word is still a loop; 1 when its ink has left the page.
   * It is slow inside "ever you're" and explodes on "afraid" (`inQuart`), so the blow-up lands on the
   * beat the last word starts on.
   */
  private escape(t: number, m: number[]): number {
    if (this.n !== 1) return 0;
    return clamp(prog(t, m[4]! + 0.80, m[5]! + 0.46, ease.inQuart), 0, 1);
  }

  /** The ring site nearest line 3's last word on its scan: the one that blows up and becomes the tree. */
  private escRing(lay: { size: number; slots: Slot[] }[]): number {
    const slots = lay[2]!.slots;
    const last = slots[slots.length - 1]!;
    let bi = -1, bd = 1e9;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i]!;
      if (r.scan !== last.scan) continue;
      const dd = Math.abs(r.x - last.xc);
      if (dd < bd) { bd = dd; bi = i; }
    }
    return bi;
  }

  /** The tree: the escaped ring come back — canopy, two inner loops, a trunk to the strip, two roots. */
  private tree(s: Sheet, t: number, m: number[]) {
    const g = this.n === 2 ? 1 : clamp(prog(t, m[5]! + 0.28, m[5]! + 0.96, ease.outCubic), 0, 1);
    if (g <= 0.01) return;
    const cx = TREE.x, cy = TREE.cy + (1 - g) * 70;
    const rx = TREE.rx * (0.62 + 0.38 * g), ry = TREE.ry * (0.62 + 0.38 * g);
    const canopy = this.ring(3, cx, cy, rx, ry);
    s.stroke(canopy, 300, { closed: true, w: 3.2, color: rgba('ink', 0.95), amp: 2.6 });
    s.hatch(canopy, 301, { spacing: 15, angle: -1.05, color: rgba('graphite', 0.35), w: 1.2 });
    s.stroke(this.ring(4, cx - rx * 0.36, cy + 6, rx * 0.40, ry * 0.50), 302, { closed: true, w: 2, color: rgba('graphite', 0.55), amp: 4 });
    s.stroke(this.ring(5, cx + rx * 0.34, cy - 4, rx * 0.38, ry * 0.46), 303, { closed: true, w: 2, color: rgba('graphite', 0.55), amp: 4 });
    const gy = scanY(1, cx) + 2;
    s.stroke([v2(cx - 11, cy + ry * 0.80), v2(cx - 6, cy + ry * 1.70), v2(cx - 3, gy)], 310, { w: 3.6, color: rgba('ink', 0.9), amp: 2, taper: false });
    s.stroke([v2(cx + 13, cy + ry * 0.72), v2(cx + 6, cy + ry * 1.60), v2(cx + 3, gy)], 311, { w: 3.6, color: rgba('ink', 0.9), amp: 2, taper: false });
    s.stroke([v2(cx - 3, gy - 16), v2(cx - 46, gy + 4)], 312, { w: 3, color: rgba('ink', 0.85), taper: false });
    s.stroke([v2(cx + 3, gy - 16), v2(cx + 48, gy + 6)], 313, { w: 3, color: rgba('ink', 0.85), taper: false });
  }

  /**
   * n = 2 only: the small figure steps onto scan B's tail inside the canopy's shadow — one flat,
   * SOLID `night2` shape (a shadow you can stand inside is a shape, not a wash).
   */
  private figure(s: Sheet, t: number) {
    if (this.n !== 2) return;
    const L3 = this.lines[2]!;
    const ever = L3.words[Math.min(4, L3.words.length - 1)]!;
    const youre = L3.words[Math.min(5, L3.words.length - 1)]!;
    const sh = clamp(prog(t, ever.start, ever.start + 0.9, ease.outQuad), 0, 1);
    const up = clamp(prog(t, youre.start, youre.start + 0.7, ease.outCubic), 0, 1);
    const gy = scanY(1, FIG.x) + 2;
    if (sh > 0) {
      const e = this.ring(9, SH.x - (1 - sh) * 90, SH.y, SH.rx * (0.30 + 0.70 * sh), SH.ry * (0.45 + 0.55 * sh));
      s.fill(e, 500, rgba('night2', 1), { amp: 4 });
    }
    if (up > 0) {
      const h = FIG.h, ink = { w: 3.2, color: rgba('ink', 0.95 * up), amp: 1.5, taper: false };
      const x = FIG.x;
      s.arc(x, gy - h * 0.86, h * 0.14, 0.5, TAU + 0.2, 510, ink);
      s.stroke([v2(x, gy - h * 0.72), v2(x, gy - h * 0.40)], 511, ink);
      s.stroke([v2(x, gy - h * 0.66), v2(x - h * 0.20, gy - h * 0.45)], 512, ink);
      s.stroke([v2(x, gy - h * 0.66), v2(x + h * 0.19, gy - h * 0.46)], 513, ink);
      s.stroke([v2(x - 3, gy - h * 0.40), v2(x - h * 0.06, gy)], 514, ink);
      s.stroke([v2(x + 3, gy - h * 0.40), v2(x + h * 0.07, gy)], 515, ink);
    }
  }
}

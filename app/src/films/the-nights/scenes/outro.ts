// Plate 17 — `outro` (138.62 → 176.66 s, 38.0 s). The close: the page turns, the road is walked, the
// lantern changes hands, and the film arrives back on its own first frame.
//
// Re-shoot note: the first version of this plate was one long slow landscape with the two sung lines
// lettered under it. Per `03-animation.md §3` a 38 s window still needs a new composition far more often
// than that, so this version is built as **seven movements with a camera sub-shot each**, and the two
// lines are objects in the world rather than captions:
//   line A (138.76) is **chalked on the road**, in the road's own perspective (letters near the camera
//   are large, letters up the hill are small);
//   line B (169.15) is **carved into the milestone**, and the camera punches in on it to read it.
// Between the movements nothing sits still: fence posts, a rock and a signpost slide past in three
// parallax layers while the road is walked, which is what carries the long instrumental without
// pretending anything new is happening.
//
// Movements: 1 the page turns onto the landscape · 2 the road + line A chalked in perspective ·
// 3 the walk (parallel layers sliding) · 4 the meeting and the lantern's handover on the beat ·
// 5 alone over the crest, the camera craning out · 6 line B carved into the milestone, punch-in ·
// 7 the return: the first frame of the film, the pen about to draw. Last frame ≡ first frame.
/*!plate
{
  "id": "outro",
  "window": [138.6239, 176.658],
  "device": "written",
  "staging": "subject",
  "typePx": 142,
  "maxWidth": 1400,
  "bands": [
    { "name": "sky", "y": [96, 470] },
    { "name": "road", "y": [480, 840] },
    { "name": "near", "y": [860, 1018] }
  ],
  "movements": [
    { "at": 138.624, "camera": "bar0-s0" },
    { "at": 140.529, "camera": "bar1-s1" },
    { "at": 142.433, "camera": "bar2-s2" },
    { "at": 144.338, "camera": "bar3-s3" },
    { "at": 146.243, "camera": "bar4-s4" },
    { "at": 148.148, "camera": "bar5-s5" },
    { "at": 150.052, "camera": "bar6-s6" },
    { "at": 151.957, "camera": "bar7-s7" },
    { "at": 153.862, "camera": "bar8-s0" },
    { "at": 155.767, "camera": "bar9-s1" },
    { "at": 157.672, "camera": "bar10-s2" },
    { "at": 159.576, "camera": "bar11-s3" },
    { "at": 161.481, "camera": "bar12-s4" },
    { "at": 163.386, "camera": "bar13-s5" },
    { "at": 165.291, "camera": "bar14-s6" },
    { "at": 167.195, "camera": "bar15-s7" },
    { "at": 169.100, "camera": "bar16-s0" },
    { "at": 171.005, "camera": "bar17-s1" },
    { "at": 172.910, "camera": "bar18-s2" },
    { "at": 174.814, "camera": "bar19-s3" }
  ],
  "loop": true,
  "opensLoop": false
}
*/
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const HORIZON_Y = 520;     // the film's horizon
const RULE_Y = 706;        // the ground line `open` draws
/**
 * The camera sub-shots, cycled **one per bar** (`SHOT[bar % 8]`), so no framing in this 38 s close holds
 * longer than 1.905 s. A bar-length hold is the plate's unit of editing: the camera whips into the next
 * one with `ease.outExpo`, which reads as a cut while the world keeps drifting underneath.
 */
const SHOT: [number, number, number, number][] = [
  [960, 620, 1.06, 0.02],   // the turn / the near ground
  [960, 700, 0.98, -0.012], // the road, wide
  [980, 660, 1.02, 0.008],  // the walk
  [900, 620, 1.12, -0.02],  // the meeting
  [1000, 600, 0.94, 0.012], // alone, craned out
  [1180, 560, 1.22, 0],     // the milestone, punched in
  [1040, 648, 1.04, -0.01], // the hill's left flank
  [880, 604, 1.10, 0.018],  // the near road, low
];
/** The last framing of the film: exactly where `open` starts (W/2+40, H/2+18, z 1). */
const SHOT_LOOP: [number, number, number, number] = [964, 558, 1.0, 0];

export default class Outro extends InkedScene {
  /** The two "My father told me"s inside this window (4th and 5th of six in the song). */
  private lines: Line[] = [this.ctx.lyrics.get('My father told me', 4), this.ctx.lyrics.get('My father told me', 5)];

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const A = this.lines[0]!, B = this.lines[1]!;
    const walkAt = a.timeOfBeat(Math.floor(a.beatAt(143.2)));
    const meetAt = a.timeOfBeat(Math.floor(a.beatAt(152)));
    const crestAt = a.timeOfBeat(Math.floor(a.beatAt(157)));
    const carveAt = B.words[0]!.start;                     // 169.15
    const m = [this.ctx.start, walkAt, walkAt + 2.9, meetAt, crestAt, carveAt - 1.2, carveAt + 3.4, this.ctx.end];
    const mk = m.findIndex((x, i) => i > 0 && t < x) - 1;
    const k = mk < 0 ? 0 : mk;
    this.shot(s, t, a);
    this.bookEdge(s, d);

    // 1 — the page turns onto the landscape
    this.turn(s, f, d, m[0]!, m[1]! - 0.4, k === 0);
    // 2-7 — the world: sky band, hill, road (the road is the thread, now walked on)
    this.landscape(s, d, t, m[1]!, k);
    // 3-5 — the parallax layers that keep the walk moving
    if (k >= 2 && k <= 4) this.passing(s, d, t, m[2]!, crestAt);
    // the two figures and the lantern between them
    this.walkers(s, d, t, { walkAt, meetAt, crestAt, end: this.ctx.end, k });
    // 2 — line A chalked on the road, in the road's own perspective
    if (t < carveAt - 6) this.chalk(s, f, A);
    // 6 — line B carved into the milestone, read at a punch-in
    if (t > carveAt - 1.6) this.carve(s, f, B);
    // 7 — the return: the pen about to touch the ground, exactly where `open` leaves it
    const back = clamp(prog(t, this.ctx.end - 3.2, this.ctx.end - 0.4, ease.inOutCubic), 0, 1);
    if (back > 0.985) {
      const p = clamp(prog(t, this.ctx.end - 0.4, this.ctx.end), 0, 1);
      if (p > 0) {
        s.blob(216, RULE_Y + 3, 6 * p, 31, { colour: rgba('lantern', 0.9 * p), n: 7, jag: 0.5 });
        s.stroke([v2(208, RULE_Y - 23), v2(220, RULE_Y - 1)], 32, { w: 3, color: rgba('ink', 0.9 * p) });
      }
    }
    return { ...CEL.flat, vignette: lerp(0.16, 0.3, back), grain: lerp(0.028, 0.04, back) };
  }

  /**
   * One sub-shot per bar: the framing is `SHOT[bar % 8]`, and the whip into it happens on the bar line.
   * The last bar settles on `SHOT_LOOP`, which is the first frame of the film (`open.ts` starts there), so
   * the loop is exact rather than approximate.
   */
  private shot(s: Sheet, t: number, a: { bpm: number; beatAt(x: number): number; timeOfBeat(i: number): number }) {
    const T0 = this.ctx.start;
    const barLen = (4 * 60) / (a.bpm || 126);
    const bi = Math.max(0, Math.floor((t - T0) / barLen - 1e-6));      // which bar of this plate
    const tail = clamp(prog(t, this.ctx.end - 1.6, this.ctx.end - 0.2, ease.inOutCubic), 0, 1);
    let P = SHOT[Math.max(0, bi - 1) % SHOT.length]!, Q = SHOT[bi % SHOT.length]!;
    if (tail > 0) { P = Q; Q = SHOT_LOOP; }
    const w = tail > 0 ? tail : clamp(prog(t, T0 + bi * barLen, T0 + bi * barLen + 0.34, ease.outExpo), 0, 1);
    const phase = a.beatAt(t) % 1;
    const z = lerp(P[2], Q[2], w) * (1 + 0.015 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(P[0], Q[0], w), lerp(P[1], Q[1], w), z, lerp(P[3], Q[3], w));
  }

  private bookEdge(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.text('xvii.', 172, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  /** Movement 1 — the page turns: a flap with a hinge and a flat shadow, then gone for good. */
  private turn(s: Sheet, f: Frame, d: number, t0: number, t1: number, active: boolean) {
    if (!active) return;
    const k = prog(f.t, t0, t1);
    const hinged = 1 - k;
    const x = lerp(FRAME[2], FRAME[0], ease.inOutCubic(k));
    const flap: V2[] = [v2(FRAME[0], FRAME[1]), v2(lerp(FRAME[0], FRAME[2], hinged), FRAME[1]), v2(x, FRAME[3]), v2(FRAME[0], FRAME[3])];
    s.fill(flap, 61, rgba('paper2', 0.95), { a: 0.92 });
    s.stroke(flap, 61, { w: 2.4, closed: true, color: rgba('graphite', 0.55), overshoot: 6 });
    s.fill([v2(x, FRAME[1]), v2(x + 110 * hinged, FRAME[1]), v2(x + 110 * hinged, FRAME[3]), v2(x, FRAME[3])], 62, rgba('night2', 0.3), { a: 0.55 * hinged });
  }

  /** The world: paper sky, one flat night hill, the road that the `sky` plate's line became. */
  private landscape(s: Sheet, d: number, t: number, t0: number, k: number) {
    const inP = clamp(prog(t, t0 - 0.5, t0 + 0.9, ease.outCubic), 0, 1);
    const leave = 1 - clamp(prog(t, this.ctx.end - 3.4, this.ctx.end - 0.5), 0, 1);
    if (inP <= 0 || leave <= 0) return;
    const fade = inP * leave;
    // the afterglow band under the horizon, then the hill as one solid mass with hatching
    s.fill([v2(120, HORIZON_Y + 4), v2(1800, HORIZON_Y + 4), v2(1800, HORIZON_Y + 160), v2(120, HORIZON_Y + 160)], 41, rgba('lantern', 0.18 * fade), { a: 0.5 });
    const hill: V2[] = [v2(120, HORIZON_Y + 6)];
    for (let i = 0; i <= 26; i++) {
      const x = lerp(120, 1800, i / 26);
      hill.push(v2(x, HORIZON_Y - 150 * Math.exp(-((i - 17) ** 2) / 30) - 40 * noise1(i * 0.4, 2)));
    }
    hill.push(v2(1800, HORIZON_Y + 6));
    s.fill(hill, 42, rgba('night', 0.9), { a: 0.95 * fade });
    s.stroke(hill, 42, { w: 2.4, color: rgba('ink', 0.7 * fade) });
    s.hatch(hill.map((p) => v2(p.x, p.y + 30)), 43, { spacing: 17, angle: 1.1, color: rgba('graphite', 0.22 * fade), w: 1.1 });
    // the road: the thread, walked on — from the near ground up over the crest, drawn as two edges
    const edge = (u: number, off: number): V2 => v2(lerp(240, 1650, u) + off * (1 - u) * 60, lerp(FRAME[3] - 24, RULE_Y - 150, ease.inOutCubic(u)));
    for (const off of [-1, 1]) {
      const pts: V2[] = [];
      for (let i = 0; i <= 30; i++) pts.push(edge(i / 30, off));
      s.stroke(pts, 50 + (off + 1), { w: 2.6, color: rgba('graphite', 0.7 * fade), overshoot: 6 });
    }
    // the milestone at the crest: where line B is carved
    s.rect(1352, HORIZON_Y - 170, 1412, HORIZON_Y - 92, 45, { w: 2.6, color: rgba('ink', 0.85 * fade), fill: rgba('paper2', 0.6 * fade), overshoot: 5 });
    if (k >= 5) s.blob(1382, HORIZON_Y - 176, 5, 47, { colour: rgba('lantern', 0.8 * fade), n: 6, jag: 0.5 });
  }

  /** Three parallax layers sliding past while the road is walked: posts, a rock, a signpost. */
  private passing(s: Sheet, d: number, t: number, t0: number, t1: number) {
    const u = clamp((t - t0) / Math.max(0.1, t1 - t0), 0, 1);
    for (let i = 0; i < 7; i++) {
      const p = (u * 1.6 + i * 0.17) % 1;
      if (i % 2 === 0) {
        const x = lerp(200, 1760, 1 - p), y = lerp(FRAME[3] - 30, RULE_Y - 120, ease.inOutCubic(1 - p));
        s.stroke([v2(x, y), v2(x + 3, y - 46)], 200 + i, { w: 2.4, color: rgba('ink', 0.5) });
        s.stroke([v2(x - 14, y - 36), v2(x + 16, y - 40)], 210 + i, { w: 1.8, color: rgba('graphite', 0.5) });
      } else {
        s.blob(lerp(1700, 240, 1 - p), lerp(RULE_Y - 118, RULE_Y - 60, 1 - p), 9 + 4 * hash(i, d), 220 + i, { colour: rgba('shade', 0.8), n: 7, jag: 0.6 });
      }
    }
  }

  /** The father, the son and the lantern between them; the son ends taller than the father. */
  private walkers(s: Sheet, d: number, t: number, k: { walkAt: number; meetAt: number; crestAt: number; end: number; k: number }) {
    const leave = 1 - clamp(prog(t, k.end - 3.0, k.end - 0.5), 0, 1);
    if (leave <= 0.001) return;
    const step = Math.sin(heldT(t) * 6.2);
    // the road is a straight ramp from the near ground to the crest; the walk is along it
    const at = (u: number, h: number): V2 => ({ x: lerp(300, 1620, u), y: lerp(FRAME[3] - 24, RULE_Y - 150, ease.inOutCubic(u)) });
    const uSon = clamp(0.08 + 0.5 * prog(t, k.walkAt, k.crestAt + 3) * 1.4, 0, 0.92);
    const son = at(uSon, 0);
    const uDad = 0.34 + 0.08 * prog(t, k.walkAt, k.meetAt);
    const dad = at(uDad, 0);
    const meeting = prog(t, k.meetAt - 1.0, k.meetAt + 1.0);
    const sonH = 118 + 12 * meeting;
    const dadA = (1 - prog(t, k.meetAt + 0.3, k.meetAt + 2.4) * 0.85) * leave;
    const hand = clamp(prog(t, k.meetAt, k.meetAt + 1.0), 0, 1);
    this.figure(s, d, son.x, son.y, sonH, step * 4, rgba('ink', 0.92 * leave));
    this.figure(s, d, dad.x, dad.y, 110, step * 3 * (1 - meeting), rgba('ink', dadA));
    this.lantern(s, d, t, lerp(dad.x + 24, son.x + 18, hand), lerp(dad.y - 70, son.y - sonH * 0.66, hand), leave);
  }

  /** One ink figure: five strokes, no face. */
  private figure(s: Sheet, d: number, x: number, y: number, h: number, step: number, color: string) {
    const hip = y - h * 0.5, head = y - h * 0.86;
    s.stroke([v2(x, head + h * 0.06), v2(x, hip)], 71, { w: 3.4, color });
    s.stroke([v2(x - h * 0.1, head + h * 0.02), v2(x + h * 0.1, head + h * 0.02)], 72, { w: 3.2, color });
    s.stroke([v2(x - h * 0.02, head), v2(x + h * 0.02, head), v2(x, head - h * 0.1), v2(x - h * 0.03, head)], 73, { w: 3, color, closed: true });
    s.stroke([v2(x, hip), v2(x + step, y)], 74, { w: 3.2, color, overshoot: 3 });
    s.stroke([v2(x, hip), v2(x - step, y)], 75, { w: 3.2, color, overshoot: 3 });
  }

  private lantern(s: Sheet, d: number, t: number, x: number, y: number, lit: number) {
    if (lit <= 0.01) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 18, y - 30), v2(x + 18, y - 30), v2(x + 22, y), v2(x - 22, y)];
    s.stroke(body, 51, { w: 2.8, closed: true, color: rgba('ink', 0.95 * lit) });
    s.fill(body, 51, rgba('lantern', 0.5 * lit * flick), { a: 0.9 });
    s.stroke([v2(x - 14, y - 30), v2(x, y - 52), v2(x + 14, y - 30)], 52, { w: 2.6, color: rgba('ink', 0.9 * lit) });
    s.blob(x, y - 15, 8 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 12, 4 * lit, 54, { colour: rgba('star', 0.9 * lit), n: 7, jag: 0.5 });
  }

  /**
   * Line A, chalked on the road: an object in the world. Each word is placed along the road's centre,
   * its size scaled by the road's own perspective (a word up the hill is smaller than one at the foot),
   * and it is *written* word by word as it is sung.
   */
  private chalk(s: Sheet, f: Frame, l: Line) {
    const t = f.t;
    if (t < l.start - 1.8) return;
    const words = l.words;
    const uAt = (i: number) => 0.06 + (i + 0.5) * (0.5 / Math.max(1, words.length));
    const at = (u: number): { p: V2; size: number; rot: number } => {
      const p = v2(lerp(250, 1620, u), lerp(FRAME[3] - 40, RULE_Y - 96, ease.inOutCubic(u)));
      const size = lerp(104, 58, u);                 // the road's perspective, applied to the type
      const rot = Math.atan2(RULE_Y - 96 - (FRAME[3] - 40), 1620 - 250) * 0.55;
      return { p, size, rot };
    };
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const { p, size, rot } = at(uAt(i));
      const pl = Lyrics.wordProgress(w, f.t);
      const rise = clamp(prog(t, w.start - 0.6, w.start + 0.05), 0, 1);
      const cw = s.measureLetter(w.w, 'readable', size);
      if (rise < 1) s.letter(w.w, p.x - cw / 2, p.y + (1 - rise) * 26, size, 340 + i, { font: 'readable', color: rgba('graphite', 0.22), w: 3, rot });
      if (pl > 0) s.letterWritten(w.w, p.x - cw / 2, p.y, size, 340 + i, pl, { font: 'readable', w: 4.6, amp: 2.4, rot, color: rgba('ink', 0.9) });
    }
  }

  /** Line B, carved into the milestone: small, in the father's hand, read at the punch-in. */
  private carve(s: Sheet, f: Frame, l: Line) {
    const near = clamp(prog(f.t, l.start - 1.4, l.start + 0.3), 0, 1);
    if (near <= 0.01) return;
    const words = l.words;
    const size = 30;
    const widths = words.map((w) => s.measureLetter(w.w, 'hscript', size));
    const total = widths.reduce((a, w) => a + w, 0) + 6 * (words.length - 1);
    let x = 1382 - total / 2;
    const y = HORIZON_Y - 128;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, f.t);
      s.letterWritten(w.w, x, y, size, 90 + i, clamp(p * near * 1.25, 0, 1), { font: 'hscript', w: 2.8, color: rgba('ink', 0.9 * near) });
      x += widths[i]! + 6;
    }
    // the chisel's second pass: a light offset copy, so it reads as cut rather than printed
    s.letter(l.text, 1382 + 1.2, y + 1.4, size, 95, { font: 'hscript', align: 'center', color: rgba('star', 0.5 * near), w: 1.6 });
  }
}

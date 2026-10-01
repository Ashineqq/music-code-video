// Plate 16 — `never` (135.29 → 138.62 s, 3.3 s, one line). The film's shortest plate and one of its two
// `rose` moments. Contract of this re-shoot: `03-animation.md §3` (a new composition every 1.1–1.5 s —
// in 3.3 s that means five distinct shots, not one), `04-plates.md §3` (the line is an object: it is
// *stamped into the paper*, never written under the picture), `§5` (the stamp is this plate's language
// alone; no other plate in the film has one).
//
// World: a hand press. Device: **stamped** — the block falls, hits on the line's first beat, the phrase
// bleeds into the paper at 140 px as it is sung, the splat freezes, the three windows of light are
// stamped above it, and the block lifts away out of frame. What is left is the impression.
//
// Movements (cut on beats, one camera sub-shot each):
//   1  the block falls from above the frame, the page tilts under it
//   2  impact: the splat, the three windows ignite, the phrase lands pale
//   3  the block lifts and exits the top of the frame; the phrase darkens word by word
//   4  the page takes one kick-driven shudder; the droplets from the splat settle
//   5  hold: the impression alone, its ink soaking outward, the page still
/*!plate
{
  "id": "never",
  "window": [135.2902, 138.6239],
  "device": "stamped",
  "staging": "subject",
  "typePx": 144,
  "maxWidth": 1500,
  "bands": [
    { "name": "press", "y": [96, 240] },
    { "name": "lights", "y": [250, 370] },
    { "name": "live", "y": [560, 780] },
    { "name": "splat", "y": [790, 984] }
  ],
  "movements": [
    { "at": 135.2902, "camera": "look-up-fall" },
    { "at": 135.5902, "camera": "impact" },
    { "at": 136.1902, "camera": "lift-and-exit" },
    { "at": 136.7902, "camera": "shudder" },
    { "at": 137.6902, "camera": "soak" }
  ],
  "loop": true
}
*/
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const Q = 'These are the nights that never die';
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The impression: big enough to be the subject of the frame (it is, for one and a half seconds). */
const SIZE = 144, MAXW = 1500;
const RULE_Y = 640;
const LIGHTS: V2[] = [v2(660, 330), v2(960, 286), v2(1260, 330)];
/** Camera sub-shots: the fall, the impact, the lift, the shudder, the soak. */
const SHOT: [number, number, number, number][] = [
  [960, 300, 1.18, 0.02],   // 1 looking up at the falling block
  [960, 560, 1.06, -0.014], // 2 the hit
  [980, 580, 1.0, 0.006],   // 3 the block leaving
  [930, 600, 1.08, -0.02],  // 4 the shudder
  [960, 590, 1.04, 0],      // 5 the soak
];

export default class Never extends InkedScene {
  private line: Line = this.ctx.lyrics.get(Q);

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const hit = a.timeOfBeat(Math.floor(a.beatAt(this.line.words[0]!.start + 0.02)));
    const beat = 60 / (a.bpm || 126);
    // five movements inside 3.3 s: the fall, the hit, the lift, the shudder, the soak
    // five movements inside 3.3 s: the fall, the hit, the lift, the shudder, the soak. The fall needs
    // room before the impact, so movement 1 starts with the window, not with the (earlier) beat.
    const S = this.ctx.start;
    const m = [S, S + 0.3, S + 0.9, S + 1.5, S + 2.4, this.ctx.end];
    const mk = t < m[1]! ? 0 : t < m[2]! ? 1 : t < m[3]! ? 2 : t < m[4]! ? 3 : 4;
    this.shot(s, t, m, mk, hit);
    this.bookEdge(s, d);

    const fall = prog(t, m[0]!, m[1]! - 0.04);
    const impact = prog(t, m[1]! - 0.02, m[1]! + 0.1);
    const lift = prog(t, m[3]! - 0.3, m[3]! + 0.25);
    const kick = Math.max(0, 1 - (a.beatAt(t) % 1) * 3);

    this.lights(s, d, t, hit, impact);
    if (mk <= 3) this.block(s, fall, lift);                    // 1-3: the press itself
    if (impact > 0) this.splat(s, t, hit, mk, kick);           // 2 + 4: the splat, then its droplets
    if (impact > 0) this.imprint(s, f, impact, lift);          // 2-5: the phrase, bleeding in word by word
    if (mk === 4) this.soak(s, d, t);                          // 5: the ink creeping outward
    return { ...CEL.flat, grain: 0.032, vignette: 0.16 + 0.05 * kick };
  }

  /** A cut per movement: hold the shot, whip into the next with outExpo (plus a kick-driven zoom). */
  private shot(s: Sheet, t: number, m: number[], k: number, hit: number) {
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const w = clamp(prog(t, m[k]! - 0.18, m[k]! + 0.26, ease.outExpo), 0, 1);
    const shake = t < hit + 0.28 ? (1 - clamp((t - hit) / 0.28, 0, 1)) * 6 * Math.sin((t - hit) * 60) : 0;
    const z = lerp(A[2], B[2], w) * (1 + 0.03 * Math.max(0, 1 - Math.abs(t - hit) * 3));
    s.setCam(lerp(A[0], B[0], w) + shake, lerp(A[1], B[1], w) + shake * 0.6, z, lerp(A[3], B[3], w) + shake * 0.002);
  }

  private bookEdge(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.text('xvi.', 176, 1006, { size: 26, fam: 'Plex-400', color: rgba('graphite', 0.55) });
  }

  /** The block: a flat rose body with its cut lines and a two-stroke handle, falling and lifting. */
  private block(s: Sheet, fall: number, lift: number) {
    const y = lerp(-320, RULE_Y - 150, ease.inQuad(clamp(fall, 0, 1))) - lift * 1100;
    const a0 = (1 - lift) * (fall > 0.02 ? 1 : 1);
    const body: V2[] = [v2(560, y - 58), v2(1360, y - 58), v2(1382, y + 34), v2(538, y + 34)];
    s.fill(body, 21, rgba('rose', 0.2 * a0), { a: 0.65 });
    s.stroke(body, 21, { w: 5, closed: true, color: rgba('rose', 0.88 * a0), overshoot: 8 });
    s.stroke([v2(596, y - 32), v2(1344, y - 32)], 22, { w: 2, sketch: true, color: rgba('rose', 0.5 * a0) });
    s.stroke([v2(596, y + 12), v2(1344, y + 12)], 23, { w: 2, sketch: true, color: rgba('rose', 0.5 * a0) });
    s.stroke([v2(870, y - 58), v2(900, y - 122), v2(1040, y - 122), v2(1066, y - 58)], 24, { w: 5, color: rgba('ink', 0.86 * a0), overshoot: 4 });
    s.stroke([v2(960, y - 122), v2(960, y - 166)], 25, { w: 5, color: rgba('ink', 0.86 * a0) });
  }

  /** The splat: blobs thrown out from under the block; in movement 4 they settle and dry. */
  private splat(s: Sheet, t: number, hit: number, mk: number, kick: number) {
    const burst = clamp(prog(t, hit, hit + 0.14), 0, 1);
    for (let i = 0; i < 7; i++) {
      const ang = -1.1 + i * 0.33;
      const r = 24 + 150 * ease.outQuad(burst) * (0.55 + 0.45 * hash(i, 3));
      const settle = mk >= 3 ? 1 - 0.12 * hash(i, 9) : 1;
      s.blob(960 + Math.cos(ang) * r * 1.7 * settle, RULE_Y + Math.sin(ang) * r * 0.8 * settle, (8 + 9 * (1 - burst) * hash(i, 7)) * settle, 30 + i, {
        colour: rgba('rose', 0.72 * (1 - burst * 0.5)), n: 8, jag: 0.7,
      });
      // a droplet that dries in movement 4: a small solid dot with a ring around it
      if (mk >= 3 && i % 2 === 0) {
        const dx = 960 + Math.cos(ang) * r * 1.7, dy = RULE_Y + Math.sin(ang) * r * 0.8;
        s.blob(dx, dy, 3.5, 60 + i, { colour: rgba('rose', 0.85), n: 6, jag: 0.4 });
        s.arc(dx, dy, 7 + 2 * kick, 0, TAU, 61 + i, { w: 1.2, color: rgba('rose', 0.35) });
      }
    }
  }

  /** The phrase, stamped: pale and complete at the impact, darkening word by word as it is sung. */
  private imprint(s: Sheet, f: Frame, impact: number, lift: number) {
    const words = this.line.words;
    const raw = words.reduce((acc, w) => acc + s.measureLetter(w.w, 'readable', SIZE), 0) + 26 * (words.length - 1);
    const size = raw > MAXW ? Math.max(64, Math.floor((SIZE * MAXW) / raw)) : SIZE;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const gap = 26;
    const total = widths.reduce((a, w) => a + w, 0) + gap * (words.length - 1);
    const y = RULE_Y + 4;
    s.letter(this.line.text, W / 2, y, size, 90, { font: 'readable', align: 'center', color: rgba('rose', 0.2 * impact), w: 4, amp: 2 });
    let x = (W - total) / 2;
    for (let k = 0; k < words.length; k++) {
      const w = words[k]!;
      const p = Lyrics.wordProgress(w, f.t);
      if (p > 0) {
        s.letterWritten(w.w, x, y, size, 100 + k, clamp(p * 1.15, 0, 1), {
          font: 'readable', w: 5.4, amp: 1.8, color: rgba('rose', 0.92 * impact * (1 - lift * 0.1)),
        });
      }
      x += widths[k]! + gap;
    }
  }

  /** The three windows of light, stamped above the phrase on the beat. */
  private lights(s: Sheet, d: number, t: number, hit: number, impact: number) {
    for (let i = 0; i < LIGHTS.length; i++) {
      const p = LIGHTS[i]!;
      const on = clamp(prog(t, hit + i * 0.1, hit + 0.26 + i * 0.1), 0, 1);
      if (on <= 0) continue;
      const pulse = 1 + 0.24 * hash(0, heldT(t) * 3 + i);
      s.blob(p.x, p.y, 12 * on * pulse, 60 + i, { colour: rgba('star', 0.96 * on * impact), n: 9, jag: 0.45 });
      s.stroke([v2(p.x - 20 * on, p.y), v2(p.x + 20 * on, p.y)], 70 + i, { w: 2, color: rgba('star', 0.5 * on) });
      s.stroke([v2(p.x, p.y - 20 * on), v2(p.x, p.y + 20 * on)], 71 + i, { w: 2, color: rgba('star', 0.5 * on) });
    }
  }

  /** Movement 5: the impression alone, its ink creeping outward into the paper's fibres. */
  private soak(s: Sheet, d: number, t: number) {
    const k = clamp(prog(t, this.ctx.end - 0.9, this.ctx.end, ease.inOutCubic), 0, 1);
    const y = RULE_Y + 4;
    s.letter(this.line.text, W / 2, y, 144 * 0.98, 90, { font: 'readable', align: 'center', color: rgba('rose', 0.1 * k), w: 8, amp: 2.6 });
    for (let i = 0; i < 22; i++) {
      const x = 300 + hash(i, 4) * 1320, yy = RULE_Y - 40 + hash(i, 8) * 100;
      s.stroke([v2(x, yy), v2(x + (hash(i, 12) - 0.5) * 26, yy + 4)], 400 + i, { w: 1.2, color: rgba('rose', 0.22 * k), taper: false });
    }
  }
}

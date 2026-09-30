// Plate 16 — `never` (135.29 → 138.62 s, 3.3 s, one line). The film's shortest plate and one of its
// two `rose` moments: a stamp comes down on the page and the phrase refuses to lift.
//
// Why a stamp: the line is the song's thesis ("these are the nights that never die") and the page has
// just been handed back to daylight by `ember`, so the plate is a single gesture — an instrument
// arriving, hitting, and staying. Nothing else moves. The film's rule that no word may lead the voice
// is kept by letting the stamp *bleed*: the whole phrase lands as a pale `rose` impression on the
// impact beat, and each word darkens to full `rose` at its own `wordProgress`, as if the ink were
// soaking in as it is sung.
//
// Movements: (1) the block falls (2 drawings), (2) impact on the line's first beat — a flat splat plus
// the three windows of light stamped above, (3) the block lifts and is gone, (4) held: the page
// vibrates, the phrase stays.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const Q = 'These are the nights that never die';
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The stamped line sits on a rule of its own; the three windows of light above it. */
const RULE_Y = 700;
const LIGHTS: V2[] = [v2(660, 360), v2(960, 320), v2(1260, 360)];

export default class Never extends InkedScene {
  private line: Line = this.ctx.lyrics.get(Q);

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const hit = a.timeOfBeat(Math.floor(a.beatAt(this.line.words[0]!.start + 0.02))); // the impact beat
    const fall = prog(t, this.ctx.start, hit - 0.06);        // the block dropping in
    const impact = prog(t, hit - 0.02, hit + 0.10);          // the contact
    const lift = prog(t, hit + 0.55, hit + 1.05);            // and lifting away

    this.page(s, d);
    const shake = impact < 1 ? (1 - impact) * 5 * Math.sin(impact * 40) : 0;
    s.setCam(W / 2 + shake, H / 2 + shake * 0.6, 1 + 0.004 * Math.sin(t * 0.8), 0);

    // the night leaving: a flat shape shrinking back to the page's edge as `ember` finishes handing over
    const retreat = 1 - prog(t, this.ctx.start, hit + 0.4);
    if (retreat > 0.001) {
      const pad = 40 + 460 * retreat;
      s.fill([v2(FRAME[0] - pad, FRAME[1] - pad), v2(FRAME[2] + pad, FRAME[1] - pad), v2(FRAME[2] + pad, FRAME[3] + pad), v2(FRAME[0] - pad, FRAME[3] + pad)], 5, rgba('night', 0.5 * retreat), { a: 0.7 });
    }

    this.lights(s, d, t, hit, impact);
    if (fall < 1 || lift < 1) this.block(s, fall, lift);
    if (impact > 0) {
      this.splat(s, t, hit);
      this.stamp(s, f, impact);
    }

    return { ...CEL.flat, grain: 0.032 };
  }

  /** The page's furniture — identical to the reference plate's, so the film keeps one page. */
  private page(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    s.stroke([v2(238, RULE_Y + 24), v2(1690, RULE_Y + 24)], 40, { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 });
  }

  /** The stamp block itself: a flat rose body with its cut lines and a two-stroke handle. */
  private block(s: Sheet, fall: number, lift: number) {
    const drop = lerp(-260, RULE_Y - 46, ease.inQuad(clamp(fall, 0, 1))) - lift * 520;
    const a0 = (1 - lift) * (fall < 1 ? 1 : 0.9);
    const body: V2[] = [v2(560, drop - 54), v2(1360, drop - 54), v2(1382, drop + 34), v2(538, drop + 34)];
    s.fill(body, 21, rgba('rose', 0.18 * a0), { a: 0.6 });
    s.stroke(body, 21, { w: 5, closed: true, color: rgba('rose', 0.85 * a0), overshoot: 8 });
    s.stroke([v2(596, drop - 30), v2(1344, drop - 30)], 22, { w: 2, sketch: true, color: rgba('rose', 0.5 * a0) });
    s.stroke([v2(596, drop + 12), v2(1344, drop + 12)], 23, { w: 2, sketch: true, color: rgba('rose', 0.5 * a0) });
    s.stroke([v2(870, drop - 54), v2(900, drop - 116), v2(1040, drop - 116), v2(1066, drop - 54)], 24, { w: 5, color: rgba('ink', 0.85 * a0), overshoot: 4 });
    s.stroke([v2(960, drop - 116), v2(960, drop - 158)], 25, { w: 5, color: rgba('ink', 0.85 * a0) });
  }

  /** The splat: six flat rose blobs thrown out from under the block, frozen after two drawings. */
  private splat(s: Sheet, t: number, hit: number) {
    const burst = clamp(prog(t, hit, hit + 0.16), 0, 1);
    for (let i = 0; i < 6; i++) {
      const ang = -0.9 + i * 0.36;
      const r = 30 + 130 * ease.outQuad(burst) * (0.6 + 0.4 * hash(i, 3));
      s.blob(960 + Math.cos(ang) * r * 1.6, RULE_Y + Math.sin(ang) * r * 0.7, 9 + 8 * (1 - burst) * hash(i, 7), 30 + i, {
        colour: rgba('rose', 0.7 * (1 - burst * 0.55)), n: 8, jag: 0.7,
      });
    }
  }

  /** Three star dots, on the beat: the film's chorus signature, here stamped rather than drawn. */
  private lights(s: Sheet, d: number, t: number, hit: number, impact: number) {
    for (let i = 0; i < LIGHTS.length; i++) {
      const p = LIGHTS[i]!;
      const on = clamp(prog(t, hit + i * 0.12, hit + 0.3 + i * 0.12), 0, 1);
      if (on <= 0) continue;
      const pulse = 1 + 0.25 * hash(0, heldT(t) * 3 + i);   // steps with the drawing, not with time
      s.blob(p.x, p.y, 13 * on * pulse, 60 + i, { colour: rgba('star', 0.95 * on * impact), n: 9, jag: 0.45 });
      s.stroke([v2(p.x - 22 * on, p.y), v2(p.x + 22 * on, p.y)], 70 + i, { w: 2, color: rgba('star', 0.5 * on) });
      s.stroke([v2(p.x, p.y - 22 * on), v2(p.x, p.y + 22 * on)], 71 + i, { w: 2, color: rgba('star', 0.5 * on) });
    }
  }

  /**
   * The impression: the phrase, once as a pale full stamp and once again word by word as it is sung.
   * The second pass is what keeps the plate honest — no word is legible before its `wordProgress`.
   */
  private stamp(s: Sheet, f: Frame, impact: number) {
    const size = 62, gap = 20;
    const words = this.line.words;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const total = widths.reduce((acc, w) => acc + w, 0) + gap * (words.length - 1);
    const y = RULE_Y + 6;
    s.letter(this.line.text, W / 2, y, size, 90, { font: 'readable', align: 'center', color: rgba('rose', 0.2 * impact), w: 4, amp: 1.8 });
    let x = (W - total) / 2;
    for (let k = 0; k < words.length; k++) {
      const w = words[k]!;
      const p = Lyrics.wordProgress(w, f.t);
      if (p > 0) {
        s.letterWritten(w.w, x, y, size, 100 + k, clamp(p * 1.15, 0, 1), { font: 'readable', w: 5, amp: 1.6, color: rgba('rose', 0.9 * impact) });
      }
      x += widths[k]! + gap;
    }
  }
}

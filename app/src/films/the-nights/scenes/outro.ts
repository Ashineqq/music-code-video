// Plate 17 — `outro` (138.62 → 176.66 s, 38.0 s). The close: the page turns, the walk, the handover,
// and the film arriving back on its own first frame.
//
// This plate is where the film has to *land*, and it is the longest window in the edit, so it is built
// as five slow movements rather than a busy one:
//
//   1. 138.6 → 144   the page turns. The right half of the sheet lifts and flips over (a paper flap with
//                    a moving hinge line and a flat shadow under it) onto a dusk landscape: paper sky,
//                    one `night` hill, the road that the `sky` plate ended on.
//   2. 144 → 150     the road, walked. The grown son walks up the road; the father waits at the crest
//                    with the lantern. One step per beat; nothing else moves (this is the plate's
//                    "hold", and holding is the point — the song is 24 s of instrumental here).
//   3. 150 → 156     the handover. They meet on the last beat before 150; the lantern changes hands; the
//                    father's outline thins to `graphite` and stops, the son walks on with the light.
//   4. 156 → 169.15  alone, over the crest. The camera pulls back slowly; the figure gets small; the
//                    first "My father told me" (138.76) is lettered on the road behind him, the second
//                    (169.15) is carved into the milestone he passes.
//   5. 169.15 → end  the return: everything fades out in reverse order, the lantern goes out, the camera
//                    arrives exactly where `open` starts (centre + 40 px right, z = 1) and the last
//                    drawing is the opening plate's first drawing — a blank page, a pen about to move.
//                    That is what makes the film loop: last frame ≡ first frame.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const HORIZON_Y = 520;               // the same horizon the opening plate drew
const RULE_Y = 700;

export default class Outro extends InkedScene {
  /** The two "My father told me"s that fall inside this window (4th and 5th of six in the song). */
  private lines: Line[] = [this.ctx.lyrics.get('My father told me', 4), this.ctx.lyrics.get('My father told me', 5)];

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const T0 = this.ctx.start;                      // 138.62
    const walk = a.timeOfBeat(Math.floor(a.beatAt(144)));   // the walk starts on a downbeat
    const meet = a.timeOfBeat(Math.floor(a.beatAt(150)));
    const alone = a.timeOfBeat(Math.floor(a.beatAt(156)));
    const last = this.lines[1]!.words[0]!.start;    // 169.15
    const tail = prog(t, last + 2.4, this.ctx.end - 0.15);   // the return to the first frame

    // ------------------------------------------------------------------ camera: wide → the opening's framing
    // `open` starts at setCam(W/2 + 40, H/2 + 18, 1) — this plate must arrive there, exactly.
    const zoom = lerp(0.90, 1, ease.inOutCubic(prog(t, meet, alone)));
    s.setCam(lerp(960, W / 2 + 40, ease.inOutCubic(tail)), lerp(548, H / 2 + 18, ease.inOutCubic(tail)), lerp(zoom, 1, tail), 0);

    this.page(s, d);
    this.turn(s, f, d, T0, Math.max(T0 + 0.4, walk - 0.6));   // movement 1
    this.landscape(s, f, d, walk);                            // movements 2-5 share the world
    this.walkers(s, f, d, { walk, meet, alone, last, tail }); // the two figures and the lantern
    this.road(s, f, d, walk, tail);                           // the letters, in the world

    // the last drawings: the page empties to the opening's state (the pen nib about to touch down)
    if (tail > 0.985) {
      const nibP = clamp(prog(t, this.ctx.end - 0.35, this.ctx.end - 0.05), 0, 1);
      if (nibP > 0) {
        s.blob(216, HORIZON_Y - 1, 6 * nibP, 31, { colour: rgba('lantern', 0.9 * nibP), n: 7, jag: 0.5 });
        s.stroke([v2(208, HORIZON_Y - 26), v2(220, HORIZON_Y - 4)], 32, { w: 3, color: rgba('ink', 0.9 * nibP) });
      }
    }
    return { ...CEL.flat, vignette: lerp(0.16, 0.28, 1 - tail), grain: lerp(0.028, 0.04, 1 - tail) };
  }

  private page(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
  }

  /** Movement 1 — the page turns: a paper flap with a hinge line and a flat shadow, then gone for good. */
  private turn(s: Sheet, f: Frame, d: number, t0: number, t1: number) {
    const k = prog(f.t, t0, t1);
    if (k >= 1) return;
    const hinged = 1 - k;                                     // 1 = flat, 0 = fully turned
    const x = lerp(FRAME[2], FRAME[0], ease.inOutCubic(k));   // the free edge sweeping left
    const flap: V2[] = [v2(FRAME[0], FRAME[1]), v2(lerp(FRAME[0], FRAME[2], hinged), FRAME[1]), v2(x, FRAME[3]), v2(FRAME[0], FRAME[3])];
    s.fill(flap, 61, rgba('paper2', 0.95), { a: 0.9 });
    s.stroke(flap, 61, { w: 2.4, closed: true, color: rgba('graphite', 0.55), overshoot: 6 });
    // the shadow the flap throws on the landscape it is uncovering
    s.fill([v2(x, FRAME[1]), v2(x + 90 * hinged, FRAME[1]), v2(x + 90 * hinged, FRAME[3]), v2(x, FRAME[3])], 62, rgba('night2', 0.25), { a: 0.5 * hinged });
    // the page's own ruled lines go with it
    for (let i = 0; i < 3; i++) s.stroke([v2(238, RULE_Y + i * 96 + 24), v2(lerp(238, 1690, hinged), RULE_Y + i * 96 + 24)], 63 + i, { w: 1.4, sketch: true, color: rgba('graphite', 0.4 * hinged) });
  }

  /** Movements 2-5 — the dusk landscape: paper sky, one night hill, the crest, the milestone. */
  private landscape(s: Sheet, f: Frame, d: number, walk: number) {
    const arrive = prog(f.t, this.ctx.start, walk);
    const fade = 1 - prog(f.t, this.ctx.end - 3.2, this.ctx.end - 0.4);   // everything leaves before the loop
    if (arrive <= 0 || fade <= 0) return;
    // the sky's last colour: one flat band under the paper, and the sun's afterglow in lantern
    s.fill([v2(120, HORIZON_Y + 4), v2(1800, HORIZON_Y + 4), v2(1800, HORIZON_Y + 150), v2(120, HORIZON_Y + 150)], 41, rgba('lantern', 0.16 * arrive * fade), { a: 0.5 });
    // the hill: a flat night shape the road climbs
    const hill: V2[] = [v2(120, HORIZON_Y + 6)];
    for (let i = 0; i <= 26; i++) {
      const x = lerp(120, 1800, i / 26);
      const h = 150 * Math.exp(-((i - 17) ** 2) / 30) + 40 * noise1(i * 0.4, 2);
      hill.push(v2(x, HORIZON_Y - h));
    }
    hill.push(v2(1800, HORIZON_Y + 6));
    s.fill(hill, 42, rgba('night', 0.86 * arrive * fade), { a: 0.95 });
    s.stroke(hill, 42, { w: 2.4, color: rgba('ink', 0.7 * arrive * fade), a: arrive * fade });
    // the road: the thread, now walked on — from the lower-left up over the crest
    const road: V2[] = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      road.push(v2(lerp(300, 1620, u), lerp(FRAME[3] - 30, HORIZON_Y - 128, ease.inOutCubic(u)) + 26 * noise1(u * 3, 5)));
    }
    s.stroke(road, 43, { w: 3.4, color: rgba('graphite', 0.75 * arrive * fade), overshoot: 8 });
    s.stroke(road.map((p) => v2(p.x + 12, p.y + 9)), 44, { w: 1.6, sketch: true, color: rgba('graphite', 0.5 * arrive * fade) });
    // the milestone at the crest: where the last line gets carved
    s.rect(1348, HORIZON_Y - 176, 1404, HORIZON_Y - 96, 45, { w: 2.6, color: rgba('ink', 0.8 * arrive * fade), fill: rgba('paper2', 0.5 * arrive * fade), overshoot: 5 });
  }

  /** The two figures on the road, the lantern between them, and the son walking on alone. */
  private walkers(s: Sheet, f: Frame, d: number, k: { walk: number; meet: number; alone: number; last: number; tail: number }) {
    const leave = 1 - k.tail;
    if (leave <= 0.001) return;
    // the son walks up the road, one step per beat; the father waits, then stops forever
    const step = Math.sin(heldT(f.t) * 6.2);                                    // on twos
    const sonU = clamp(prog(f.t, k.walk, k.alone + 6) * 0.72 + 0.1, 0, 1);      // along the road
    const roadAt = (u: number): V2 => ({ x: lerp(300, 1620, u), y: lerp(FRAME[3] - 30, HORIZON_Y - 128, ease.inOutCubic(u)) });
    const son = roadAt(sonU);
    const dad = roadAt(0.46 + 0.1 * prog(f.t, k.walk, k.meet));
    const meeting = prog(f.t, k.meet - 1.2, k.meet + 1.2);
    const sonH = 118 + 10 * meeting;                                            // he has grown; he ends taller than the father
    // the father's outline thins to graphite once the light has changed hands, and he stops walking
    const dadA = (1 - prog(f.t, k.meet + 0.2, k.meet + 2.2) * 0.85) * leave;
    const hand = clamp(prog(f.t, k.meet, k.meet + 1.1), 0, 1);                   // 0 = in his hand, 1 = in the son's
    const lanternX = lerp(dad.x + 26, son.x + 20, hand);
    const lanternY = lerp(dad.y - 74, son.y - sonH * 0.66, hand);

    this.figure(s, d, son.x, son.y, sonH, step * 4, rgba('ink', 0.92 * leave));
    this.figure(s, d, dad.x, dad.y, 112, step * 3 * (1 - meeting), rgba('ink', dadA));
    this.lantern(s, d, f.t, lanternX, lanternY, leave * (1 - k.tail * 0.9));
  }

  /** One ink figure: five strokes, no face (the film's boy, grown up). */
  private figure(s: Sheet, d: number, x: number, y: number, h: number, step: number, color: string) {
    const hip = y - h * 0.5, head = y - h * 0.86;
    s.stroke([v2(x, head + h * 0.06), v2(x, hip)], 71, { w: 3.2, color });                                  // body
    s.stroke([v2(x - h * 0.1, head + h * 0.02), v2(x + h * 0.1, head + h * 0.02)], 72, { w: 3, color });     // shoulders
    s.stroke([v2(x - h * 0.02, head), v2(x + h * 0.02, head), v2(x, head - h * 0.1), v2(x - h * 0.03, head)], 73, { w: 2.8, color, closed: true });
    s.stroke([v2(x, hip), v2(x + step, y)], 74, { w: 3, color, overshoot: 3 });                              // legs, stepping
    s.stroke([v2(x, hip), v2(x - step, y)], 75, { w: 3, color, overshoot: 3 });
  }

  /** The lantern, now carried: the same instrument as the opening plate's. */
  private lantern(s: Sheet, d: number, t: number, x: number, y: number, lit: number) {
    if (lit <= 0.01) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 18, y - 30), v2(x + 18, y - 30), v2(x + 22, y), v2(x - 22, y)];
    s.stroke(body, 51, { w: 2.8, closed: true, color: rgba('ink', 0.95 * lit) });
    s.fill(body, 51, rgba('lantern', 0.5 * lit * flick), { a: 0.9 });
    s.stroke([v2(x - 14, y - 30), v2(x, y - 52), v2(x + 14, y - 30)], 52, { w: 2.6, color: rgba('ink', 0.9 * lit) });
    s.blob(x, y - 15, 8 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 12, 4 * lit, 54, { colour: rgba('star', 0.9 * lit), n: 7, jag: 0.5 });
    s.stroke([v2(x, y), v2(x + 10, y + 16)], 55, { w: 2, color: rgba('ink', 0.55 * lit) });   // the handle, hanging
  }

  /**
   * The two sung lines, staged in the world rather than under it: the first is lettered on the road the
   * son has just walked (so it lies in perspective behind him), the second is carved into the milestone.
   */
  private road(s: Sheet, f: Frame, d: number, walk: number, tail: number) {
    const leave = 1 - tail;
    const size = 46;
    // line A — written on the road, word by word, following the walk
    if (f.t < this.lines[1]!.start - 4) {
      const l = this.lines[0]!;
      const words = l.words;
      const widths = words.map((w) => s.measureLetter(w.w, 'readable', size * 0.8));
      let x = 470;
      const y = FRAME[3] - 92;
      for (let i = 0; i < words.length; i++) {
        const w = words[i]!;
        const p = Lyrics.wordProgress(w, f.t);
        if (p > 0) s.letterWritten(w.w, x, y, size * 0.8, 80 + i, p, { font: 'readable', w: 3.6, color: rgba('graphite', 0.85 * leave), amp: 2.4 });
        x += widths[i]! + 12;
      }
    }
    // line B — carved into the milestone, in the father's hand
    const l = this.lines[1]!;
    const near = clamp(prog(f.t, l.start - 1.2, l.start + 0.4), 0, 1) * leave;
    if (near > 0.01) {
      const words = l.words;
      const size2 = 26;
      const widths = words.map((w) => s.measureLetter(w.w, 'hscript', size2));
      const total = widths.reduce((a2, w) => a2 + w, 0) + 5 * (words.length - 1);
      let x = 1376 - total / 2;
      const y = HORIZON_Y - 150;
      for (let i = 0; i < words.length; i++) {
        const w = words[i]!;
        const p = Lyrics.wordProgress(w, f.t);
        s.letterWritten(w.w, x, y, size2, 90 + i, clamp(p * near * 1.2, 0, 1), { font: 'hscript', w: 2.6, color: rgba('ink', 0.85 * near) });
        x += widths[i]! + 5;
      }
    }
  }
}

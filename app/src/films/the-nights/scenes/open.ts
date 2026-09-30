// Plate 1 — the opening (0 → 9.33 s). THE REFERENCE PLATE: everything the other twelve plates do, this
// one does once, small. Read it before writing one of your own.
//
// What it establishes, and what every plate owes the film:
//
//   * A PAGE. The film is a storybook, so the page is furniture: a wobbled ink frame just inside the
//     safe area, and (from plate 2 on) a fold line down the middle. The picture happens above the
//     rules; the sung line is written on a rule, in order, and stays there.
//   * THE RULES. Three practice-page rules in the lower band. A line is written on its own rule with
//     `letterWritten`, one word at a time, driven by `Lyrics.wordProgress` — never all at once, never
//     ahead of the voice. Words already sung stay in `ink`; the pen's current word is written under a
//     sliding `lantern` tick (the one light of the film is the pen tip).
//   * THE HORIZON + THE LANTERN. One line across the picture area is the film's thread (here it is
//     drawn by an unseen hand in the intro, and the lantern is lit on it). It comes back as a coastline,
//     a road and a skyline in later plates; the lantern is the palette's only signal colour.
//   * ON TWOS. Every wobble is seeded with the drawing index `s.d`, so lines boil once per drawing.
//     Only the camera, the pen position and the reveal ramps use `f.t`.
//
// Movements: (1) 0 → 2.4 the intro — the horizon is drawn, the lantern is lit, on the beat; then one
// movement per line: (2) "once upon a younger year" writes the first rule, (3) the shadows stand on the
// horizon and slide off the page, (4) the animals come out of the empty lane and walk the margin.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['once upon a younger year', 'all our shadows disappeared', 'animals inside came out'];

/** Where the page's furniture sits. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge
const HORIZON_Y = 520;
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)

export default class Open extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  /** One small animal for the margin frieze: [every point of the body], drawn as a single ink line. */
  private animals: V2[][] = [];

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const intro = 2.4;                        // the song starts singing here
    const beat = (i: number) => a.timeOfBeat(i);
    const first = beat(Math.floor(a.beatAt(intro)));   // the downbeat the first line lands on

    // ------------------------------------------------------------------ the page (furniture)
    this.page(s, d);
    // the camera breathes a little and settles: a hand-held page, not a scan
    const pull = 1 + 0.012 * Math.sin(t * 0.5);
    s.setCam(W / 2 + (1 - prog(t, 0, intro)) * 40, H / 2 + 18, pull, 0);

    // ------------------------------------------------------------------ the horizon (the film's thread)
    // Drawn by an unseen hand during the intro: the pen tip runs left to right, then lifts.
    const drawP = prog(t, 0.35, Math.max(0.9, first - 0.25));
    const hx0 = 210, hx1 = 1736;
    const pts: V2[] = [];
    for (let i = 0; i <= 46; i++) {
      const x = lerp(hx0, hx1, i / 46);
      pts.push(v2(x, HORIZON_Y + Math.sin(i * 0.18) * 7 + (hash(i * 3.3, 7) - 0.5) * 5));
    }
    const shown = Math.max(2, Math.ceil(pts.length * drawP));
    s.stroke(pts.slice(0, shown), 11, { w: 3.4, overshoot: 14, color: rgba('ink', 0.92) });
    // the hills behind it: two flat cel shapes, one tone apart
    const hills: V2[] = [v2(150, HORIZON_Y + 2)];
    for (let i = 0; i <= 20; i++) hills.push(v2(lerp(150, 1770, i / 20), HORIZON_Y - 40 - 46 * noise1(i * 0.42, 3) - 20 * noise1(i * 0.11, 9)));
    hills.push(v2(1770, HORIZON_Y + 2));
    // a cel mass, not a wash: one flat tone with the ink line kept light on top
    s.fill(hills, 21, rgba('shade', 0.85), { a: 0.75 * drawP });
    s.stroke(hills, 21, { w: 2, color: rgba('graphite', 0.5), a: 0.7 * drawP, amp: 1.8 });
    // the pen tip: a lantern-lit nib that lifts off the page when the line is done
    if (drawP < 1) {
      const p = pts[Math.min(pts.length - 1, shown - 1)]!;
      s.blob(p.x + 6, p.y - 5, 7, 31, { colour: rgba('lantern', 0.95), n: 7, jag: 0.5 });
      s.stroke([v2(p.x - 8, p.y - 26), v2(p.x + 4, p.y - 4)], 32, { w: 3, color: rgba('ink', 0.9) });
    }

    // ------------------------------------------------------------------ the lantern
    this.lantern(s, d, t, 214, HORIZON_Y + 8, t > 0.9 ? 1 : 0);

    // ------------------------------------------------------------------ movement 2-4 per line
    this.writeRules(s, f, d, first);

    // the shadows (line 2) and the animals (line 3) happen on the horizon
    const L1 = this.window(1), L2 = this.window(2);
    if (t > L1.start - 0.5) this.shadows(s, f, d, L1);
    if (t > L2.start - 0.4) this.frieze(s, f, d, L2);

    // the lantern warms the last line, and only the last line
    const lit = prog(t, L2.start, L2.start + 0.6) * (1 - prog(t, this.ctx.end - 0.2, this.ctx.end));
    return { ...CEL.flat, ...(lit > 0.4 ? CEL.hot : null) };
  }

  /** The page: its edge and the three rules. Same every plate (copy this block). */
  private page(s: Sheet, d: number) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 });
    }
  }

  /** The lantern: a flat cel lamp with an ink handle. Its flame is the film's one hot colour. */
  private lantern(s: Sheet, d: number, t: number, x: number, y: number, lit: number) {
    if (lit <= 0.001) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.stroke(body, 51, { w: 3.2, closed: true, color: rgba('ink', 0.95) });
    s.fill(body, 51, rgba('lantern', 0.5 * lit * flick), { a: 0.9 });
    s.stroke([v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 52, { w: 3, color: rgba('ink', 0.9) });
    // the flame: two flat shapes, no glow (the cel layer is flat) — the heat is the post, not a shader
    s.blob(x, y - 22, 11 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 18, 5 * lit, 54, { colour: rgba('star', 0.9 * lit), n: 7, jag: 0.5 });
  }

  /** The window of one of this plate's lines (the engine hands us the plate's own start/end). */
  private window(i: number) {
    const l = this.lines[i]!;
    return { start: l.start, end: l.end };
  }

  /**
   * Write the sung lines on the rules, in order. The words already sung stay in ink; the word being
   * sung right now is written by the moving lantern nib; the rest of the line is a pale guide.
   */
  private writeRules(s: Sheet, f: Frame, d: number, first: number) {
    const size = 56, gap = 17;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (f.t < first + i * 1.2 - 0.6) continue;                 // this rule is not being written yet
      const y = RULES[i]!;
      const words = l.words;
      const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
      const total = widths.reduce((acc, w) => acc + w, 0) + gap * (words.length - 1);
      let x = (W - total) / 2;
      // the faint guide: the whole line, barely there, so the page is never blank
      const rise = clamp(prog(f.t, l.start - 1.4, l.start - 0.4), 0, 1);
      s.letter(l.text, W / 2, y, size, 60 + i, { font: 'readable', align: 'center', color: rgba('graphite', 0.22 * rise), w: 3, amp: 1.6 });
      let penX = x;
      for (let k = 0; k < words.length; k++) {
        const w = words[k]!;
        const p = Lyrics.wordProgress(w, f.t);
        if (p > 0) {
          s.letterWritten(w.w, x, y, size, 70 + i * 8 + k, p, {
            font: 'readable', w: 4.4, amp: 2,
            color: p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95),
          });
        }
        if (p > 0 && p < 1) penX = x + widths[k]! * p;
        x += widths[k]! + gap;
      }
      // the nib: a lantern tick that rides the current word
      const writing = f.t >= l.start - 0.15 && f.t <= l.end + 0.2;
      if (writing) s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], 80 + i, { w: 4.2, color: rgba('lantern', 0.95), taper: true });
    }
  }

  /**
   * Movement 3 — the shadows. Three flat ink figures standing on the horizon walk to the right and
   * slide off the page edge, one per bar, on the drawing clock so each one boils as it goes.
   */
  private shadows(s: Sheet, f: Frame, d: number, L: { start: number; end: number }) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const k = prog(f.t, L.start + i * 0.55, L.start + 1.9 + i * 0.55);
      if (k <= 0) continue;
      const x = lerp(560 + i * 190, 1960, ease.inQuad(k));
      const h = 112 - i * 6;
      const step = Math.sin(heldT(f.t) * 6 + i * 2) * (k < 1 ? 5 : 0);   // on twos: the walk steps
      const body: V2[] = [
        v2(x, HORIZON_Y), v2(x + 16, HORIZON_Y - h * 0.42), v2(x + 8, HORIZON_Y - h * 0.72),
        v2(x + 20, HORIZON_Y - h), v2(x + 34, HORIZON_Y - h * 0.7), v2(x + 26, HORIZON_Y - h * 0.38),
        v2(x + 44, HORIZON_Y),
      ];
      // a silhouette is a solid: flat `night2`, dark enough to read as a hole in the page
      s.fill(body, 90 + i, rgba('night2', 0.95), { a: 0.92 * (1 - k * 0.45) });
      s.stroke(body, 90 + i, { w: 3.2, color: rgba('ink', 0.9 * (1 - k * 0.4)) });
      // the legs, in the gap they leave
      s.stroke([v2(x + 10, HORIZON_Y - 4), v2(x + 14 + step, HORIZON_Y - 34), v2(x + 12, HORIZON_Y)], 95 + i, { w: 2.6, color: rgba('ink', 0.7) });
      s.stroke([v2(x + 32, HORIZON_Y - 4), v2(x + 30 - step, HORIZON_Y - 34), v2(x + 36, HORIZON_Y)], 96 + i, { w: 2.6, color: rgba('ink', 0.7) });
    }
  }

  /**
   * Movement 4 — the animals. Small one-line creatures walk out of the empty lane and along the
   * margin, left to right, each on its own phase; they stay on the page as a frieze.
   */
  private frieze(s: Sheet, f: Frame, d: number, L: { start: number; end: number }) {
    const kinds = [this.horse, this.bird, this.cat, this.bird, this.horse];
    for (let i = 0; i < kinds.length; i++) {
      const k = prog(f.t, L.start + 0.15 + i * 0.42, L.start + 2.4 + i * 0.42);
      if (k <= 0) continue;
      const x = lerp(300, 1660, k);
      const y = HORIZON_Y + 40 + i * 9;
      const sc = 1.05 + 0.12 * hash(i, d);
      this.ink(s, kinds[i]!(x, y, sc), 120 + i, 3.4, rgba('ink', 0.92));
      // a step line under each, so they belong to the page's ground
      s.stroke([v2(x - 30, y + 26), v2(x + 40, y + 26)], 140 + i, { w: 1.4, sketch: true, color: rgba('graphite', 0.4) });
    }
  }

  private ink(s: Sheet, pts: V2[], seed: number, w: number, color: string) {
    s.stroke(pts, seed, { w, color, overshoot: 3 });
  }

  // three animals, each a single ink line (the film's vocabulary: one stroke, no filled detail)
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

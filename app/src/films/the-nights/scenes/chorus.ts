// Plate 5 — chorus. Two entries (chorus1 32.43 → 40.05, chorus2 108.62 → 116.24) served by one module
// through `ctx.params.n`, the second entry one size step further along.
//
// The page turns over. This plate is the film's big negative: the same furniture as the opening page —
// the ink frame, the fold, the three rules, the horizon and its hills, the lantern, the boy — is re-drawn
// in reverse, as paper-coloured lines on a page that has flooded to `night`. Nothing is new here except
// the light: the three windows in the upper third (the same three positions in every chorus) and the sung
// lines, which are now written in `star`.
//
// Movements (from plans/pages-brief.md):
//   1. the flood — from the window's first downbeat a flat `night` mass sweeps down the page on a moving
//      edge. The brief wants the page night *by the first sung word*, and the words are `star`: cream
//      lettering can only be read on night, so the pour is a fast one (the cut lands inside the pour).
//   2. the reverse — the daylit furniture, drawn twice with the SAME seed (ink on paper, then the very
//      same wobbled line in `paper` on the night) so the page changes colour, not line count.
//   3. the three windows of light — three solid `star` dots, blinking on the beat through `heldT`,
//      brighter at n = 2.
//   4. the two sung lines, written word by word in `star` on the rules, never ahead of the voice.
//   5. n = 2 only — on the last line the page's edge gives way, its ink runs off the sheet and the night
//      reaches the frame's edge (the one deliberate pass outside the safe area).
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2, InkOpts } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The four lines this module owes (two per entry), queried by fragment — never by time. */
const Q = [
  ["He said, one day you'll leave", 0],
  ['So live a life you will remember', 0],
  ["He said, one day you'll leave", 1],
  ['So live a life you will remember', 1],
] as const;

/** Where the page's furniture sits — the same page as the opening plate (copy this block). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const HORIZON_Y = 520;
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)
/** THE THREE WINDOWS OF LIGHT: the same three positions in every chorus (and in `nights`). */
export const WINDOWS: [number, number][] = [[648, 250], [960, 190], [1272, 250]];
/** The lantern from the opening plate, unchanged, on the thread. */
const LANTERN = { x: 214, y: HORIZON_Y + 8 };

// ---- the page's two inks. Every piece of furniture is drawn twice with the same seed: as it was
// (daylit) and in reverse (paper on night). Same seed => the same polyline, so the cross-fade never
// doubles a line.
const PAGE_DAY: InkOpts = { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 };
const PAGE_NIGHT: InkOpts = { w: 2.8, color: rgba('paper', 0.78), amp: 1.6, overshoot: 9 };
const THIN_DAY: InkOpts = { w: 1, sketch: true, color: rgba('graphite', 0.4) };
const THIN_NIGHT: InkOpts = { w: 1, sketch: true, color: rgba('paper', 0.26) };
const RULE_DAY: InkOpts = { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 };
const RULE_NIGHT: InkOpts = { w: 1.8, sketch: true, color: rgba('paper', 0.32), overshoot: 12 };
const THREAD_DAY: InkOpts = { w: 3.4, color: rgba('ink', 0.92), overshoot: 14 };
const THREAD_NIGHT: InkOpts = { w: 3.6, color: rgba('paper', 0.85), overshoot: 14 };
// the outline over a flat mass stays light and thin (the mass carries the shape, not the line)
const HILL_DAY: InkOpts = { w: 2, sketch: true, color: rgba('graphite', 0.5) };
const HILL_NIGHT: InkOpts = { w: 2, sketch: true, color: rgba('paper', 0.36) };
const FIG_DAY: InkOpts = { w: 3.4, color: rgba('ink', 0.9) };
const FIG_NIGHT: InkOpts = { w: 3.4, color: rgba('paper', 0.82) };

export default class Chorus extends InkedScene {
  private lines: Line[] = Q.map(([q, nth]) => this.ctx.lyrics.get(q, nth));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const n = typeof this.ctx.params.n === 'number' ? this.ctx.params.n : 1;
    const L1 = this.lines[(n - 1) * 2]!;
    const L2 = this.lines[(n - 1) * 2 + 1]!;

    // the page settles for the first two bars: a hand-held page, not a scan
    const settle = prog(t, this.ctx.start, this.ctx.start + 2.4);
    s.setCam(W / 2, H / 2 + lerp(16, 4, settle), lerp(1.014, 1, settle), 0);

    // ---------------------------------------------------------------- 1. the flood
    // One flat `night`, full strength — ink poured over the page, with a moving edge. The edge is a pure
    // function of f.t (a reveal ramp) and of the drawing index (its wobble), so it never drifts.
    const firstWord = L1.words[0]!;
    const pourEnd = Math.max(firstWord.start, this.ctx.start + 0.08);
    const pour = prog(t, this.ctx.start, pourEnd, ease.outQuad);
    const edgeY = lerp(-160, 1120, pour);
    s.fill(this.nightShape(d, edgeY), 101, rgba('night'), { amp: 3.4 });

    // n = 2: on the last line the page gives way and the night runs off the sheet
    const brk = n === 2 ? prog(t, L2.words[0]!.start, L2.words[0]!.start + 1.25, ease.outCubic) : 0;
    if (brk > 0) this.spill(s, d, brk);

    // ---------------------------------------------------------------- 2. the reverse
    this.page(s, pour, brk);
    this.thread(s, pour);
    this.boy(s, pour, n);

    // ---------------------------------------------------------------- 3. the three windows of light
    this.windowsOfLight(s, f, n, pour);

    // the lantern — now the only warm thing on the page
    this.lantern(s, f, d, pour);

    // ---------------------------------------------------------------- 4. the sung lines
    this.writeLines(s, f, n);

    return CEL.flat;
  }

  /**
   * The night: a flat mass filling the page from above down to `edgeY`. Its top starts above the sheet and
   * its left/right/top stay inside the page's edge line (the frame), so the page — and only the page —
   * turns over.
   */
  private nightShape(d: number, edgeY: number): V2[] {
    // The sides sit on the page's edge line itself. The fill re-wobbles the whole outline, so the night's
    // edge can end up ~3 px outside the frame's ink at the worst drawing: ink spilling over the page's
    // edge (the frame's line is drawn on top of it), never a strip of paper left showing inside the frame.
    const x0 = FRAME[0], x1 = FRAME[2];
    const top = FRAME[1] - 240;
    const pts: V2[] = [v2(x0, top)];
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const x = lerp(x0, x1, i / N);
      // two octaves of hand error on the pouring edge, re-rolled every drawing
      const w = noise1(i * 0.55 + d * 1.9, d * 3.1 + 5) * 30 + noise1(i * 0.17 + d * 0.6, d * 5.3 + 11) * 14;
      pts.push(v2(x, clamp(edgeY + w, top + 6, FRAME[3])));
    }
    pts.push(v2(x1, top));
    return pts;
  }

  /**
   * n = 2, on the last line: the night leaves the page. A flat `night` band rises across the whole sheet —
   * past the safe area, to the frame's edge — and joins the page's own night at the gap in its bottom edge.
   */
  private spill(s: Sheet, d: number, brk: number) {
    const yTop = lerp(1140, 992, brk);
    const pts: V2[] = [v2(-60, 1180)];
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const x = lerp(-60, 1980, i / N);
      const w = noise1(i * 0.55 + d * 2.1, d * 4.3 + 17) * 38;
      pts.push(v2(x, Math.max(986, yTop + w)));
    }
    pts.push(v2(1980, 1180));
    s.fill(pts, 131, rgba('night'), { amp: 4 });
  }

  /**
   * One piece of the daylit page, drawn twice: as it was (ink on paper) and in reverse (a paper line on the
   * night). Both passes share the seed, so they are the same wobbled polyline — the page does not double
   * its lines when it turns over, it only changes their colour.
   */
  private both(s: Sheet, pts: V2[], seed: number, pour: number, day: InkOpts, night: InkOpts) {
    if (pour < 0.995) s.stroke(pts, seed, { ...day, a: (day.a ?? 1) * (1 - pour) });
    if (pour > 0.005) s.stroke(pts, seed, { ...night, a: (night.a ?? 1) * pour });
  }

  /** The same cross-fade for a flat mass. Both tones are solid: a cel shape never fades into its paper. */
  private bothFill(s: Sheet, pts: V2[], seed: number, pour: number, day: string, night: string) {
    if (pour < 0.995) s.fill(pts, seed, day, { a: 0.95 * (1 - pour) });
    if (pour > 0.005) s.fill(pts, seed, night, { a: 0.95 * pour });
  }

  /** The page: its edge (which can give way at n = 2), the fold, and the three rules. */
  private page(s: Sheet, pour: number, brk: number) {
    const [x0, y0, x1, y1] = FRAME;
    const lb = lerp(y1, y1 + 96, brk);          // n = 2: the frame's ink keeps running, off the sheet
    // top + right, then the left, then the bottom — each edge its own stroke, so the wobble cost stays
    // linear per edge instead of quadratic over the whole rectangle
    this.both(s, [v2(x0, y0), v2(x1, y0), v2(x1, lb)], 2, pour, PAGE_DAY, PAGE_NIGHT);
    this.both(s, [v2(x0, y0), v2(x0, lb)], 3, pour, PAGE_DAY, PAGE_NIGHT);
    const gap = 430 * brk;
    if (gap < 8) {
      this.both(s, [v2(x1, y1), v2(x0, y1)], 4, pour, PAGE_DAY, PAGE_NIGHT);
    } else {
      this.both(s, [v2(x0, y1), v2(960 - gap, y1)], 4, pour, PAGE_DAY, PAGE_NIGHT);
      this.both(s, [v2(960 + gap, y1), v2(x1, y1)], 5, pour, PAGE_DAY, PAGE_NIGHT);
      // the edge breaks open and its ink runs off the sheet (this is the one line that leaves the page)
      this.both(s, [v2(960 - gap, y1), v2(960 - gap - 190, 1240)], 6, pour, PAGE_DAY, PAGE_NIGHT);
      this.both(s, [v2(960 + gap, y1), v2(960 + gap + 190, 1240)], 7, pour, PAGE_DAY, PAGE_NIGHT);
    }
    // the fold, just inside the edge — also edge by edge: one 4-point closed rect costs five times the
    // wobble of its four sides (the cost is quadratic in the resampled point count, and resampling runs
    // along the whole perimeter)
    const fx0 = x0 + 9, fy0 = y0 + 9, fx1 = x1 - 9, fy1 = y1 - 9;
    this.both(s, [v2(fx0, fy0), v2(fx1, fy0)], 12, pour, THIN_DAY, THIN_NIGHT);
    this.both(s, [v2(fx1, fy0), v2(fx1, fy1)], 13, pour, THIN_DAY, THIN_NIGHT);
    this.both(s, [v2(fx1, fy1), v2(fx0, fy1)], 14, pour, THIN_DAY, THIN_NIGHT);
    this.both(s, [v2(fx0, fy1), v2(fx0, fy0)], 15, pour, THIN_DAY, THIN_NIGHT);
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]! + 12;
      this.both(s, [v2(238, y), v2(1690, y)], 40 + i, pour, RULE_DAY, RULE_NIGHT);
    }
  }

  /**
   * The film's thread: the horizon of the opening plate (the same 46-point line, the same seeds), now the
   * sky's line, with its hills as a flat mass one tone up from the night.
   */
  private thread(s: Sheet, pour: number) {
    const pts: V2[] = [];
    for (let i = 0; i <= 46; i++) {
      const x = lerp(210, 1736, i / 46);
      pts.push(v2(x, HORIZON_Y + Math.sin(i * 0.18) * 7 + (hash(i * 3.3, 7) - 0.5) * 5));
    }
    this.both(s, pts, 11, pour, THREAD_DAY, THREAD_NIGHT);
    const hills: V2[] = [v2(150, HORIZON_Y + 2)];
    for (let i = 0; i <= 20; i++) hills.push(v2(lerp(150, 1770, i / 20), HORIZON_Y - 40 - 46 * noise1(i * 0.42, 3) - 20 * noise1(i * 0.11, 9)));
    hills.push(v2(1770, HORIZON_Y + 2));
    this.bothFill(s, hills, 21, pour, rgba('paper2'), rgba('night2'));
    this.both(s, hills, 21, pour, HILL_DAY, HILL_NIGHT);
  }

  /**
   * The boy, from before: one line for the head, then the arms, the legs and the spine — no face. He stands
   * on the thread, in reverse, and grows the one size step the treatment gives him per chorus.
   */
  private boy(s: Sheet, pour: number, n: number) {
    const h = n === 2 ? 112 : 92;
    const x = 1216, y = HORIZON_Y + 3;
    const hr = h * 0.135;
    const headY = y - h + hr, shY = y - h * 0.72, hipY = y - h * 0.42;
    const head: V2[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.62 + (i / 10) * TAU * 0.92;
      head.push(v2(x + Math.cos(a) * hr, headY + Math.sin(a) * hr));
    }
    this.both(s, head, 201, pour, FIG_DAY, FIG_NIGHT);
    this.both(s, [v2(x, shY - 4), v2(x, hipY + 2)], 202, pour, FIG_DAY, FIG_NIGHT);
    this.both(s, [v2(x - h * 0.26, y - h * 0.5), v2(x, shY + 2), v2(x + h * 0.26, y - h * 0.52)], 203, pour, FIG_DAY, FIG_NIGHT);
    this.both(s, [v2(x - h * 0.17, y), v2(x, hipY), v2(x + h * 0.18, y)], 204, pour, FIG_DAY, FIG_NIGHT);
  }

  /**
   * Movement 3 — the three windows of light. Always the same three positions, always on the beat: each one
   * flashes on its own beat of the bar and decays, stepped through `heldT` so it blinks on the drawing
   * clock. Brighter (and a step larger) at n = 2.
   */
  private windowsOfLight(s: Sheet, f: Frame, n: number, pour: number) {
    const a = this.ctx.audio;
    const ht = heldT(f.t);
    const beat = a.beatAt(ht);
    const bi = Math.floor(beat);
    const bp = beat - bi;                        // 0..1 inside the beat, stepped on twos
    const gain = (n === 2 ? 1 : 0.95) * pour;
    for (let i = 0; i < WINDOWS.length; i++) {
      const [x, y] = WINDOWS[i]!;
      const mine = (((bi + i) % 3) + 3) % 3 === 0;              // this window's beat of the bar
      const flash = mine ? 0.66 + 0.34 * Math.exp(-bp * 3.4) : 0.66;
      const bl = clamp(flash * gain);
      if (bl <= 0.02) continue;
      const r = (6.4 + 3.2 * flash) * (n === 2 ? 1.15 : 1);
      s.blob(x, y, r, 300 + i, {
        colour: rgba('star'), fillA: bl, n: 12, jag: 0.16,
        outline: { w: 2, color: rgba('star', 0.72), a: bl },
      });
      // four short cross strokes — the light is drawn, never glowed
      const ry = r * (2.2 + 1.5 * flash);
      s.stroke([v2(x - ry, y), v2(x + ry, y)], 310 + i, { w: 2, color: rgba('star', 0.55), a: bl });
      s.stroke([v2(x, y - ry), v2(x, y + ry)], 320 + i, { w: 2, color: rgba('star', 0.55), a: bl });
    }
  }

  /** The lantern of the opening plate: glass a flat `lantern`, flame a flat blob, pulsing one per beat. */
  private lantern(s: Sheet, f: Frame, d: number, pour: number) {
    const { x, y } = LANTERN;
    const bp = this.ctx.audio.beatAt(heldT(f.t)) % 1;
    const lit = clamp((0.88 + 0.12 * Math.exp(-bp * 2.6)) * (0.92 + 0.08 * hash(0, d)));
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.fill(body, 51, rgba('lantern', 0.5 * lit), { a: 0.9 });
    this.both(s, body, 51, pour, { w: 3.2, color: rgba('ink', 0.95), closed: true }, { w: 3.4, color: rgba('paper', 0.85), closed: true });
    this.both(s, [v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 52, pour, { w: 3, color: rgba('ink', 0.9) }, { w: 3.2, color: rgba('paper', 0.8) });
    s.blob(x, y - 22, 11 * lit, 53, { colour: rgba('lantern'), fillA: lit, n: 9, jag: 0.6, outline: { w: 2, color: rgba('lantern', 0.8), a: lit } });
    s.blob(x, y - 18, 5 * lit, 54, { colour: rgba('star'), fillA: lit, n: 7, jag: 0.5 });
  }

  /**
   * Movement 4 — the sung lines, written in `star` on the rules, one word at a time, never ahead of the
   * voice. The size is fitted so the longest line still fits the safe area whatever the font's metrics do.
   */
  private writeLines(s: Sheet, f: Frame, n: number) {
    const nom = 54, gap0 = 17, MAXW = 1600;
    const lines = [this.lines[(n - 1) * 2]!, this.lines[(n - 1) * 2 + 1]!];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      const y = RULES[i]!;
      const words = l.words;
      const w0 = words.map((w) => s.measureLetter(w.w, 'readable', nom));
      const total0 = w0.reduce((acc, w) => acc + w, 0) + gap0 * (words.length - 1);
      const k = total0 > MAXW ? MAXW / total0 : 1;
      const size = nom * k, gap = gap0 * k;
      const widths = w0.map((w) => w * k);
      const total = total0 * k;
      let x = (W - total) / 2;
      // the guide: the whole line, barely there, so the page is never blank
      const rise = clamp(prog(f.t, l.start - 1.6, l.start - 0.5));
      if (rise > 0) s.letter(l.text, W / 2, y, size, 60 + i, { font: 'readable', align: 'center', color: rgba('star', 0.16 * rise), w: 3, amp: 1.6 });
      let penX = x;
      for (let j = 0; j < words.length; j++) {
        const w = words[j]!;
        const p = Lyrics.wordProgress(w, f.t);
        if (p > 0) {
          s.letterWritten(w.w, x, y, size, 70 + i * 8 + j, p, {
            font: 'readable', w: 4.4, amp: 2,
            color: rgba('star', p >= 1 ? 0.98 : 0.9),
          });
        }
        if (p > 0 && p < 1) penX = x + widths[j]! * p;
        x += widths[j]! + gap;
      }
      // the nib: a star tick riding the word being sung right now
      if (f.t >= l.start - 0.15 && f.t <= l.end + 0.3) {
        s.stroke([v2(penX - 3, y - 8), v2(penX + 1, y + 14)], 80 + i, { w: 4, color: rgba('star', 0.95) });
      }
    }
  }
}

// Plate 10 — `shores` (85.77 → 93.39 s). The page becomes a chart: one coastline across the page, a
// flat `cool` sea, a dotted route walking east one dot per beat, a thumbnail boat with the boy in it,
// and — on the last line — a `lantern` thread from the far corner of the page to the boat.
//
// Furniture is the reference plate's (`open.ts`): the frame, the three practice rules, the lyric block
// written word by word. The father is speaking this plate, so the rules are lettered in `hscript`. The
// page is night and every flat is a SOLID (`night` page, `cool` sea, `star` dots, `night` hull): hatch
// is the cel's second tone and never stands in for a fill.
//
// The brief asks that the thread be the only warm thing in the frame, so on this page the pen itself
// writes in `star` (a moonlit nib) and `lantern` is spent on exactly two objects: the thread, and the
// lamp at the far corner it comes from.
//
// Movements:
//   1. 85.8 the coastline draws itself left to right and the sea floods in behind the pen.
//   2. the chart's land: two pencil contours and a small compass rose — the page's new grammar.
//   3. 86.3 "go venture far": the boat — hull, mast, sail, and the boy in it — is drawn at the route's
//      start (a thumbnail, ~116 px of hull).
//   4. the dotted route walks one dot per beat; the newest dot takes the kick.
//   5. 90.1 "I'll guide you home": the lamp lights in the far corner and the thread is drawn from it to
//      the boat, driven by the line's own words.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['He said go venture far', "Don't forsake this life", "I'll guide you home"];

/** The page's furniture — the same frame and rules as every other plate (see `open.ts`). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const RULES = [720, 818, 916];

/** The chart's band: the coast's two ends, the sea's lower border, and the page-wide inset. */
const LEFT = 82, RIGHT = 1838, SEA_BOTTOM = 660;
/** How many beats of route the plate has room for (16 beats ≈ the whole window). */
const NDOTS = 16;
/** The boat: the route's start, and the size a thumbnail is allowed to be. */
const BOAT = v2(420, 566);
/** The far corner of the page, where the lamp stands (inside the frame, inside the safe area). */
const LAMP = v2(1694, 190);

export default class Shores extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const L1 = this.lines[0]!, L3 = this.lines[2]!;

    // a chart is held flat: the camera barely moves, only a slow settle, so the map stays readable
    s.setCam(W / 2, H / 2 + 6, 1.012 - 0.012 * prog(t, this.ctx.start, this.ctx.end), 0);

    this.page(s, d);

    // Movement 1 — the coastline, drawn by the pen, then the sea behind it
    const cA = this.ctx.start + 0.12, cB = this.ctx.start + 1.15;
    const drawn = clamp(prog(t, cA, cB, ease.inOutQuad));
    const coast = this.coast();
    const shown = Math.max(2, Math.ceil(coast.length * drawn));
    s.fill(this.sea(coast), 12, rgba('cool', 0.92 * clamp(prog(t, cA + 0.5, cB + 0.45))), { amp: 2 });
    s.stroke(coast.slice(0, shown), 14, { w: 2.4, color: rgba('graphite', 0.6), amp: 2, taper: false, overshoot: 12 });
    s.stroke([v2(LEFT, SEA_BOTTOM), v2(RIGHT, SEA_BOTTOM)], 16, { w: 1.6, sketch: true, color: rgba('star', 0.22), overshoot: 10 });
    if (drawn > 0 && drawn < 1) {
      const p = coast[Math.min(coast.length - 1, shown - 1)]!;
      s.blob(p.x + 5, p.y - 5, 6.5, 18, { colour: rgba('star', 0.95), n: 7, jag: 0.45 });
    }

    // Movement 2 — the land's own grammar: two contours, and the compass the chart is oriented by
    this.land(s, f);
    this.compass(s, f);

    // Movement 3-4 — the boat at the route's start, and the dotted route walking east
    const w1 = L1.words;
    const bp = clamp(prog(t, w1[2]!.start, w1[4]!.end));
    if (bp > 0) this.boat(s, f, bp);
    this.route(s, f);

    // Movement 5 — the lamp in the far corner and the thread from it to the boat
    this.thread(s, f, L3);

    for (let i = 0; i < this.lines.length; i++) this.writeRule(s, f, i);
    return CEL.flat;
  }

  /** The page: the night (solid, inside the frame), the frame, and the three rules. */
  private page(s: Sheet, d: number) {
    s.fill([v2(74, 64), v2(1846, 64), v2(1846, 1016), v2(74, 1016)], 1, rgba('night'), { amp: 1.1 });
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('star', 0.34), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1.4, color: rgba('star', 0.16) });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('star', 0.15), overshoot: 12 });
    }
  }

  /** The coastline: one line across the page, a shallow fall to the east with a couple of headlands. */
  private coast(): V2[] {
    const out: V2[] = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = lerp(LEFT, RIGHT, u);
      const y = 214 + 96 * u + 40 * noise1(u * 3.2, 5) + 12 * noise1(u * 8.1, 11);
      out.push(v2(x, y));
    }
    return out;
  }

  /** The sea: the coast, and everything south of it down to the chart's lower border. */
  private sea(coast: V2[]): V2[] {
    return [...coast, v2(RIGHT, SEA_BOTTOM), v2(LEFT, SEA_BOTTOM)];
  }

  /** The land half of the chart: two pencil contours over the coast, so the page reads as a map. */
  private land(s: Sheet, f: Frame) {
    const rise = clamp(prog(f.t, this.ctx.start + 0.6, this.ctx.start + 1.6));
    if (rise <= 0) return;
    for (let i = 0; i < 2; i++) {
      const pts: V2[] = [];
      const y0 = 128 + i * 34;
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        pts.push(v2(lerp(760, 1620, u), y0 + 16 * noise1(u * 2.4 + i * 7.7, 21 + i) + 6 * noise1(u * 6.1, i)));
      }
      s.stroke(pts, 30 + i, { w: 1.6, sketch: true, color: rgba('graphite', 0.42 * rise), overshoot: 6 });
    }
  }

  /** A small compass rose, drawn in pencil: the chart's grammar, not a decoration. */
  private compass(s: Sheet, f: Frame) {
    const rise = clamp(prog(f.t, this.ctx.start + 0.9, this.ctx.start + 1.9));
    if (rise <= 0) return;
    const x = 218, y = 176, r = 40;
    const arm = (ang: number, len: number) => [v2(x - Math.cos(ang) * len, y - Math.sin(ang) * len), v2(x + Math.cos(ang) * len, y + Math.sin(ang) * len)];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI;
      s.stroke(arm(ang, i === 2 ? r : r * 0.66), 50 + i, { w: 1.8, sketch: true, color: rgba('graphite', 0.55 * rise), taper: false });
    }
    s.fill([v2(x, y - 8), v2(x + 8, y), v2(x, y + 8), v2(x - 8, y)], 55, rgba('star', 0.8 * rise), { amp: 1 });
    // the one machine label in the plate: which way the chart faces
    s.text('N 63°', x + 52, y + 6, { size: 20, fam: 'Plex-400', color: rgba('star', 0.55 * rise), align: 'left' });
  }

  /** Movement 3 — the boat, drawn in its four parts as "go venture far" is sung. */
  private boat(s: Sheet, f: Frame, p: number) {
    const sway = Math.sin(heldT(f.t) * 1.6) * 2.4;                 // on twos: it steps, it does not slide
    const x = BOAT.x, y = BOAT.y + sway;
    const ink = rgba('star', 0.78), warm = rgba('star', 0.95);
    // the hull: a solid `night` silhouette, so it reads as an object on the `cool` sea
    const hull = [v2(x - 58, y + 14), v2(x + 58, y + 14), v2(x + 38, y - 10), v2(x - 38, y - 10)];
    s.fill(hull, 60, rgba('night', 0.95), { amp: 1.6 });
    s.stroke(hull, 60, { w: 3.6, closed: true, color: ink, taper: false });
    if (p > 0.3) s.stroke([v2(x - 4, y - 8), v2(x - 4, y - 78)], 61, { w: 3.4, color: ink });
    if (p > 0.5) {
      const sail = [v2(x - 1, y - 72), v2(x + 36, y - 16), v2(x - 1, y - 16)];
      s.fill(sail, 62, rgba('star', 0.22), { amp: 1.4 });
      s.stroke(sail, 62, { w: 3.4, closed: true, color: warm, taper: false });
    }
    if (p > 0.72) {
      // the boy: a head and four strokes, no face (the film's figure), standing in the boat
      s.blob(x + 14, y - 46, 6.5, 63, { colour: rgba('star', 0.9), n: 8, jag: 0.15 });
      s.stroke([v2(x + 14, y - 39), v2(x + 14, y - 12)], 64, { w: 3.4, color: warm });
      s.stroke([v2(x + 6, y - 32), v2(x + 14, y - 27), v2(x + 22, y - 33)], 65, { w: 3.2, color: warm });
    }
  }

  /**
   * Movement 4 — the dotted route: one flat `star` dot per beat (never per frame), walking from the
   * boat east across the sea. The newest dot takes the kick.
   */
  private route(s: Sheet, f: Frame) {
    const a = this.ctx.audio;
    const b0 = Math.round(a.beatAt(this.ctx.start));
    const nb = clamp(Math.floor(a.beatAt(f.t)) - b0 + 1, 0, NDOTS);
    for (let i = 0; i < nb; i++) {
      const bt = a.timeOfBeat(b0 + i);
      const q = this.routeAt(i / (NDOTS - 1));
      const born = clamp(prog(f.t, bt - 0.12, bt + 0.22, ease.outCubic));
      const r = 8 * (0.5 + 0.5 * born) + (i === nb - 1 ? 3.2 * f.a.kick : 0);
      const pts: V2[] = [];
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * TAU + 0.4;
        const rr = r * (1 + 0.22 * noise1(k * 1.1 + i * 3.7, 9));
        pts.push(v2(q.x + Math.cos(ang) * rr, q.y + Math.sin(ang) * rr));
      }
      s.fill(pts, 300 + i, rgba('star', 0.92), { amp: 0.7 });
    }
  }

  /** One point on the route: a shallow arc from the boat's water east across the sea. */
  private routeAt(u: number): V2 {
    return v2(lerp(BOAT.x + 34, 1615, u), 552 - 56 * u + 15 * Math.sin(u * 3.2));
  }

  /**
   * Movement 5 — the thread. The lamp in the far corner lights on the first word of the last line and
   * the `lantern` line is drawn from it to the boy, word by word, over land and coast and sea. It is
   * the only warm thing in the frame.
   */
  private thread(s: Sheet, f: Frame, L: Line) {
    const w = L.words;
    const from = w[0]!.start, to = w[Math.min(w.length - 1, 3)]!.end;   // "I'll guide you home"
    const lit = clamp(prog(f.t, from - 0.35, from + 0.2));
    if (lit > 0) {
      const lx = LAMP.x, ly = LAMP.y, fl = 0.85 + 0.15 * hash(0, s.d);
      const body = [v2(lx - 24, ly - 28), v2(lx + 24, ly - 28), v2(lx + 28, ly + 2), v2(lx - 28, ly + 2)];
      s.fill(body, 70, rgba('lantern', 0.95), { amp: 2 });
      s.stroke(body, 70, { w: 3.4, closed: true, color: rgba('star', 0.8), taper: false });
      s.stroke([v2(lx - 16, ly - 28), v2(lx, ly - 54), v2(lx + 16, ly - 28)], 71, { w: 3.2, color: rgba('star', 0.8) });
      s.blob(lx, ly - 13, 10 * lit * fl, 72, { colour: rgba('star', 0.95), n: 9, jag: 0.5 });
    }
    const p = clamp(prog(f.t, from, to, ease.inOutQuad));
    if (p <= 0) return;
    const A = v2(LAMP.x, LAMP.y + 24), C = v2(1010, 128), B = v2(BOAT.x + 14, BOAT.y - 40);
    const pts = this.qbez(A, C, B, 30);
    const shown = Math.max(2, Math.ceil(pts.length * p));
    s.stroke(pts.slice(0, shown), 75, { w: 5, color: rgba('lantern', 0.98), amp: 1.8, overshoot: 6 });
    if (p < 1) {
      const head = pts[Math.min(pts.length - 1, shown - 1)]!;
      s.blob(head.x, head.y, 7, 76, { colour: rgba('star', 0.95), n: 7, jag: 0.4 });
    }
  }

  private qbez(a: V2, c: V2, b: V2, n: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push(v2(v * v * a.x + 2 * v * u * c.x + u * u * b.x, v * v * a.y + 2 * v * u * c.y + u * u * b.y));
    }
    return out;
  }

  /**
   * One line of the lyric block, written on its rule. The father's words, so `hscript`; the pen is
   * `star` here (the thread owns `lantern` in this frame).
   */
  private writeRule(s: Sheet, f: Frame, i: number) {
    const L = this.lines[i]!;
    const size = 48, gap = 16;
    if (f.t < L.start - 1.3) return;
    const y = RULES[i]!;
    const words = L.words;
    const widths = words.map((w) => s.measureLetter(w.w, 'hscript', size));
    const total = widths.reduce((acc, w) => acc + w, 0) + gap * (words.length - 1);
    let x = (W - total) / 2;
    const rise = clamp(prog(f.t, L.start - 1.3, L.start - 0.35));
    if (f.t < L.end + 0.4) s.letter(L.text, W / 2, y, size, 60 + i, { font: 'hscript', align: 'center', color: rgba('star', 0.12 * rise), w: 3, amp: 1.6 });
    let penX = x;
    for (let k = 0; k < words.length; k++) {
      const w = words[k]!;
      const p = Lyrics.wordProgress(w, f.t);
      if (p > 0) {
        s.letterWritten(w.w, x, y, size, 70 + i * 8 + k, p, {
          font: 'hscript', w: 4.4, amp: 2,
          color: p >= 1 ? rgba('star', 0.95) : rgba('star', 0.6),
        });
      }
      if (p > 0 && p < 1) penX = x + widths[k]! * p;
      x += widths[k]! + gap;
    }
    if (f.t >= L.start - 0.15 && f.t <= L.end + 0.2) {
      s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], 80 + i, { w: 4.2, color: rgba('star', 0.9) });
    }
  }
}

// Plate 2 — shadows (9.58 → 17.19 s, three lines, daylight paper). The shout out of the intro:
// the page stops being empty and starts being about people.
//
// What this plate owes the film (open.ts is the pattern — read it first):
//
//   * THE PAGE, UNDISTURBED. The plate opens on the page `open` was holding when it cut: the same
//     frame, the same three rules, the same horizon (the film's thread), the same lantern still lit on
//     it at x=214. The cut is a held page; nothing on it moves until the first word.
//   * THE FIGURES *ARE* THE LINE. "face to face with all our fears" is two silhouettes standing on the
//     horizon, growing while the words land; "through the tears" is hatching rain (one cel hatch per
//     drawing, re-clipped — no shader, no animated droplet) and they shrink under it; "made memories…"
//     is the pair walking off into the page's right margin while the margin they leave empties and
//     then fills with the film's animal frieze.
//   * THE FRIEZE IS `open`'s DRAWING. A motif used in two plates has to look identical, so the three
//     animals are the same three polylines `open` walks in from the lane, scaled up to the size a
//     small ink figure needs to read at 1080p (≈ 50–90 px, w ≥ 3.2) and drawn one per beat.
//   * ON TWOS. The stride, the boil of every outline and the stepping of the rain are functions of the
//     drawing index `s.d`; only the camera, the reveal ramps, the walk's travel and `wordProgress`
//     use `f.t`. Nothing is carried between frames.
//   * FLAT MEANS SOLID. Every mass here is one palette tone at ≥ 0.85 alpha (the hills are `paper2`,
//     the silhouettes `ink`, the walkers' exit `graphite`); the light line on top of it is only ever
//     an outline. A cel fill at 0.5 alpha is not a lighter shape — it is an invisible one.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['When face to face', 'Learned our lessons through the tears', 'Made memories we knew would never fade'];

/** The page furniture — identical to `open.ts`, because it is the same page. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018]; // the page edge
const HZ = 520;                          // the horizon's y, unchanged: the film's thread is one line
const HX0 = 210, HX1 = 1736;             // and its two ends, as `open` drew them
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)

/** Where the two figures stand — either side of the page's centre, so the camera can hold between. */
const FX: [number, number] = [792, 1128];
const H_SMALL = 54;                      // they come onto the line small…
const H_TALL = 236;                      // …and grow: a fear is at its worst at full height
const H_SHRUNK = 124;                    // the rain takes most of it back, and they walk away small
const FRIEZE_Y = 604;                    // the margin the frieze fills: below the horizon, above the rules

export default class Shadows extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const beat = (i: number) => a.timeOfBeat(i);
    // The plate's own first beat: the last beat at/before the first word — the same maths timeline.ts
    // cut with, so "the page `open` left" is true from the plate's first frame, not approximately.
    // (At this cut it evaluates to the window's own start, 9.576 s: the two must agree, or the frame
    // the previous plate was holding and the frame this one opens on are two different pages.)
    const first = beat(Math.floor(a.beatAt(this.lines[0]!.words[0]!.start + 0.02)));
    const L1 = this.window(0), L2 = this.window(1), L3 = this.window(2);

    // ------------------------------------------------------------------ movement 1: the held page
    this.page(s);
    // The camera opens on the framing `open` ended on (its slow pull, evaluated at the cut) and only
    // then starts a move of its own: a cut may turn the page, it may not jump the camera.
    const zIn = 1 + 0.012 * Math.sin(first * 0.5);
    const push = prog(t, L1.start, L1.start + 2.0, ease.inOutQuad);   // movement 2: lean in on the pair
    const tip = prog(t, L2.start, L2.end);                            // movement 3: the rain tips the page
    const away = prog(t, L3.start, L3.start + 2.6, ease.inOutQuad);   // movement 4: let them go
    s.setCam(
      W / 2 + 26 * away,
      H / 2 + 18 - 13 * push + 7 * away,
      zIn + (1.055 - zIn) * push - 0.055 * away,
      0.011 * Math.sin(Math.PI * tip),
    );
    this.land(s);
    // the lamp `open` lit in its intro, still standing on the line where it left it
    this.lantern(s, d, 214, HZ + 8, 1);

    // ------------------------------------------------------------------ movements 2-4, one per line
    // The rain's own ramp is shared by both halves of movement 3 (the figures are hatched *by* it and
    // the curtain *is* it), so it is one number computed once.
    const rainA = prog(t, L2.start + 0.06, L2.start + 0.5) * (1 - prog(t, L2.end - 0.12, L2.end + 0.34));
    this.standers(s, f, d, L1, L2, L3, rainA);
    this.rain(s, d, rainA);
    this.depart(s, f, d, L3);

    // the sung words last, on top of the picture, as everywhere in this film
    this.writeRules(s, f);

    // a daylight verse on paper: no night flood, no bloom. The lamp is warm but it is not the subject.
    return CEL.flat;
  }

  /** The page: its edge and the three rules. Same every plate (copy this block). */
  private page(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 });
    }
  }

  /**
   * The horizon and the hills behind it — the same 47 samples, the same y, the same ends as `open`
   * drew them, because it is the same line: this is the thread the whole film hangs on, and here it is
   * only the ground the two of them stand on. The hills are a solid `paper2` mass, not a wash.
   */
  private land(s: Sheet) {
    const pts: V2[] = [];
    for (let i = 0; i <= 46; i++) {
      const x = lerp(HX0, HX1, i / 46);
      pts.push(v2(x, HZ + Math.sin(i * 0.18) * 7 + (hash(i * 3.3, 7) - 0.5) * 5));
    }
    const hills: V2[] = [v2(150, HZ + 2)];
    for (let i = 0; i <= 20; i++) hills.push(v2(lerp(150, 1770, i / 20), HZ - 40 - 46 * noise1(i * 0.42, 3) - 20 * noise1(i * 0.11, 9)));
    hills.push(v2(1770, HZ + 2));
    s.fill(hills, 21, rgba('paper2', 0.9), { a: 0.94 });
    s.stroke(hills, 21, { w: 2, sketch: true, color: rgba('graphite', 0.5) });
    // the line itself goes on last, over its own hills: it is the one thing that must never break
    s.stroke(pts, 11, { w: 3.4, overshoot: 14, color: rgba('ink', 0.92) });
  }

  /** The lantern: a flat cel lamp with an ink handle. Its flame is the film's one hot colour. */
  private lantern(s: Sheet, d: number, x: number, y: number, lit: number) {
    if (lit <= 0.001) return;
    const flick = 0.9 + 0.1 * hash(0, d);
    const body: V2[] = [v2(x - 26, y - 44), v2(x + 26, y - 44), v2(x + 32, y), v2(x - 32, y)];
    s.fill(body, 51, rgba('lantern', 0.92 * lit * flick), { a: 1 });
    s.stroke(body, 51, { w: 2.2, closed: true, color: rgba('ink', 0.9) });
    s.stroke([v2(x - 20, y - 44), v2(x, y - 74), v2(x + 20, y - 44)], 52, { w: 2.4, color: rgba('ink', 0.85) });
    // the flame: two flat shapes, no glow (the cel layer is flat) — the heat is the post, not a shader
    s.blob(x, y - 22, 11 * lit * flick, 53, { colour: rgba('lantern', 0.95 * lit), n: 9, jag: 0.6 });
    s.blob(x, y - 18, 5 * lit, 54, { colour: rgba('star', 0.92 * lit), n: 7, jag: 0.5 });
  }

  /** The window of one of this plate's lines (the engine hands us the plate's own start/end). */
  private window(i: number) {
    const l = this.lines[i]!;
    return { start: l.start, end: l.end };
  }

  /**
   * Write the sung lines on the rules, in order. Words already sung stay in `ink`; the word being sung
   * right now is written by the moving lantern nib; the rest of the line is a pale guide. Same block as
   * the reference plate, with one change: `open`'s three lines are evenly spaced and this plate's are
   * not (they start 2.36 s and 1.58 s apart), so a rule rises on its *own* line's approach rather than
   * on a fixed spacing — a rule that rose early would announce a line the voice has not reached.
   */
  private writeRules(s: Sheet, f: Frame) {
    const size = 56, gap = 17;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (f.t < l.start - 1.45) continue;                        // this rule is not being written yet
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
   * Movement 2 ("face to face with all our fears", 9.94 → 12.16) and movement 3's first half
   * ("through the tears", 12.30 → 13.79): the two silhouettes.
   *
   * They come onto the line two drawings before the first word and are still growing when "fears"
   * lands: the growth is the line's argument, so it runs across the whole line rather than before it.
   * The shrink rides the second line, and it is what the rain does — the height is the only thing that
   * moves, so the eye reads weather, not animation.
   */
  private standers(s: Sheet, f: Frame, d: number, L1: { start: number; end: number }, L2: { start: number; end: number }, L3: { start: number; end: number }, rainA: number) {
    const t = f.t;
    const g0 = L1.start - 0.18;
    if (t < g0) return;
    if (t >= L3.start + 0.1) return;                     // movement 4 turns them to profile instead
    const grow = prog(t, g0, g0 + 1.9, ease.outCubic);
    const shrink = prog(t, L2.start, L2.end - 0.2, ease.inOutCubic);
    const show = prog(t, g0, g0 + 0.16);                 // an entrance, not a fade
    const hh = lerp(lerp(H_SMALL, H_TALL, grow), H_SHRUNK, shrink);
    for (let i = 0; i < 2; i++) {
      // the far one is a shade shorter, and both breathe: every outline boils because the drawing
      // changes, but a standing body should also change *height* a little or it reads as a cut-out.
      const h = hh * (i ? 0.94 : 1) + noise1(d * 0.33, i * 7 + 2) * 2.5;
      const body = this.figure(FX[i]!, HZ, h);
      const seed = 90 + i * 4;
      // the mass first (solid), the rain's own bite into it, and only then a light outline on the edge
      s.fill(body, seed, rgba('ink', 0.9), { amp: 2.4, a: show });
      if (rainA > 0.02) s.hatch(body, seed, { spacing: 22, angle: 1.24, color: rgba('paper', 0.62 * rainA * show), w: 1.8 });
      s.stroke(body, seed, { closed: true, w: 2.2, amp: 2.4, color: rgba('ink', 0.78 * show) });
    }
  }

  /**
   * Movement 3's second half: the rain itself, as cel hatch. Two clipped hatch passes, re-drawn every
   * drawing; the far band steps a quarter of its gap down the page per drawing, the near band a third,
   * so the two read at different distances and the whole curtain boils instead of sliding. The offset
   * is applied along the *normal* of the hatch angle — moving the clip box along the lines themselves
   * would move nothing, since a line is invariant along its own direction.
   */
  private rain(s: Sheet, d: number, rainA: number) {
    if (rainA <= 0.01) return;
    const far = { ang: 1.24, sp: 32, cyc: 4 };
    const near = { ang: 1.31, sp: 56, cyc: 3 };
    const band = (x0: number, y0: number, x1: number, y1: number, a: number, sp: number, cyc: number, ph0: number): V2[] => {
      const ph = (((d + ph0) % cyc) + cyc) % cyc * (sp / cyc);
      const nx = -Math.sin(a), ny = Math.cos(a);
      return [v2(x0 + nx * ph, y0 + ny * ph), v2(x1 + nx * ph, y0 + ny * ph), v2(x1 + nx * ph, y1 + ny * ph), v2(x0 + nx * ph, y1 + ny * ph)];
    };
    s.hatch(band(300, 252, 1620, 542, far.ang, far.sp, far.cyc, 0), 201, { spacing: far.sp, angle: far.ang, color: rgba('ink', 0.42 * rainA), w: 1.6 });
    s.hatch(band(430, 320, 1520, 546, near.ang, near.sp, near.cyc, 1), 202, { spacing: near.sp, angle: near.ang, color: rgba('ink', 0.28 * rainA), w: 1.3 });
  }

  /**
   * Movement 4 — the exit ("made memories we knew would never fade", 13.88 → 17.19). The two turn to
   * profile on the line and walk out of the page's right margin, the near one first, the other half a
   * bar behind; each keeps its mass while it walks and then *changes tone* to `graphite` before it
   * lifts — ink does not get thinner as it leaves, it gets to be pencil.
   *
   * They stop at x = 1780, inside the safe area (1824): the fade happens in the page's margin, so
   * nothing is ever drawn outside the frame to be cropped by it. (At the widest point of the stride
   * the leading foot reaches 1780 + 35 = 1815, and the wobble adds about 2 px — still inside.)
   */
  private depart(s: Sheet, f: Frame, d: number, L3: { start: number; end: number }) {
    const t = f.t;
    if (t < L3.start + 0.08) return;
    const OUT = 1780;
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.56, dur = 1.82 + i * 0.3;
      const tEnd = L3.start + 0.1 + delay + dur;
      const k = prog(t, L3.start + 0.1 + delay, tEnd, ease.inOutQuad);
      const fade = 1 - prog(t, tEnd - 0.08, tEnd + 0.52);
      if (fade <= 0.02) continue;
      const solid = clamp(fade * 3, 0, 1);                 // a body stays solid; only the last third lifts
      const key = fade > 0.5 ? 'ink' : 'graphite';
      const x = lerp(FX[1 - i]!, OUT - i * 44, k);
      const h = H_SHRUNK + noise1(d * 0.3, i * 9 + 4) * 2;
      const body = this.walker(x, h, d * (TAU / 5) + i * 2.1);
      s.fill(body, 100 + i, rgba(key, 0.9 * solid), { amp: 2.4, a: 1 });
      s.stroke(body, 100 + i, { closed: true, w: 2.2, amp: 2.4, color: rgba(key, 0.8 * solid) });
    }
    this.frieze(s, f, L3);
  }

  /**
   * What the margin keeps: the frieze. One small animal per beat of the third line (beats 31–36 of the
   * grid, six of them), left to right, each drawn by the pen over 0.26 s — three drawings — so the
   * margin fills in time with the music rather than appearing. The animals are `open`'s three, at the
   * size a small ink figure needs to read (≈ 50–90 px across, w 3.4).
   */
  private frieze(s: Sheet, f: Frame, L3: { start: number; end: number }) {
    const a = this.ctx.audio;
    const b0 = Math.ceil(a.beatAt(L3.start + 0.02));                       // the first beat inside the line
    const n = Math.max(1, Math.floor(a.beatAt(this.ctx.end - 0.25)) - b0 + 1);
    const kinds = [this.horse, this.bird, this.cat, this.bird, this.horse, this.cat];
    for (let i = 0; i < n; i++) {
      const tb = a.timeOfBeat(b0 + i);
      const k = prog(f.t, tb, tb + 0.26, ease.outQuad);
      if (k <= 0) continue;
      const x = lerp(286, 1668, n > 1 ? i / (n - 1) : 0.5);
      const y = FRIEZE_Y + (i % 2) * 8;
      const sc = 0.95 + 0.12 * hash(i * 1.7, 3);
      const pts = kinds[i % kinds.length]!(x, y, sc);
      // no taper: an animal is a small figure, and a thinning nib turns it into a scratch
      s.stroke(pts.slice(0, Math.max(2, Math.ceil(pts.length * k))), 120 + i, { w: 3.4, taper: false, color: rgba('ink', 0.88), overshoot: 3 });
      // a step line under each, so they belong to the page's ground rather than floating on it
      s.stroke([v2(x - 30, y + 26), v2(x + 40, y + 26)], 140 + i, { w: 1.4, sketch: true, color: rgba('graphite', 0.4) });
    }
  }

  /**
   * One silhouette standing on the line, facing the viewer: feet at `y0`, `h` px tall. Written in units
   * of 1/100 of the figure's height, so the whole grow in movement 2 is one number on one outline —
   * a figure that is re-drawn to change size would read as a different person.
   */
  private figure(x: number, y0: number, h: number): V2[] {
    const S = h / 100;
    const P: V2[] = [];
    const p = (dx: number, dy: number) => { P.push(v2(x + dx * S, y0 - dy * S)); };
    // up the left side: foot, shin, hip, the hand held a little away from the body, shoulder, neck
    p(-11, 0); p(-8, 30); p(-12, 46); p(-24, 60); p(-20, 70); p(-17, 77); p(-11, 82);
    // the head, over the top: six samples of a skull, from the left jaw to the right jaw
    for (let i = 0; i <= 6; i++) {
      const a = lerp(Math.PI * 0.88, Math.PI * 0.12, i / 6);
      p(Math.cos(a) * 10.5, 87.5 + Math.sin(a) * 12.5);
    }
    // down the right side, mirrored, then back along the ground through the notch between the legs
    p(11, 82); p(17, 77); p(20, 70); p(24, 60); p(12, 46); p(8, 30);
    p(11, 0); p(6, 0); p(2, 22); p(-2, 22); p(-6, 0);
    return P;
  }

  /**
   * One silhouette in profile, mid-stride, facing right — the exit. `ph` is the stride phase and it is
   * fed the drawing index, so the legs change position on the drawing and hold: a walk on twos. The
   * notch between the legs and the swinging arm are cut into the trunk's outline, because a flat
   * silhouette has no interior line to tell one limb from another.
   */
  private walker(x: number, h: number, ph: number): V2[] {
    const S = h / 100, sw = Math.sin(ph), aw = -sw;
    const P: V2[] = [];
    const p = (dx: number, dy: number) => { P.push(v2(x + dx * S, HZ - dy * S)); };
    // the back: hip, lower back, shoulder blade, nape
    p(-6, 44); p(-8, 60); p(-5, 75); p(-1, 83);
    // the head in profile: the back of the skull, the crown, the brow, the nose
    p(-10, 90); p(-4, 99); p(6, 97); p(12, 89);
    // the front: chin, throat, then the arm out to its hand and back to the armpit
    p(8, 84); p(4, 80); p(8, 75); p(14 + 14 * aw, 55); p(4, 62);
    // the belly and the front hip, then the front leg out to its foot and up the inside
    p(10, 50); p(7, 44); p(8 + 13 * sw, 24); p(11 + 26 * sw, 0); p(4 + 26 * sw, 0); p(1, 24);
    // up over the crotch and down the back leg, then up its far side to the hip
    p(-1, 24); p(-2 - 26 * sw, 0); p(-9 - 26 * sw, 0); p(-6 - 13 * sw, 24);
    return P;
  }

  // three animals, each a single ink line — `open`'s own three, unchanged (the film's vocabulary)
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

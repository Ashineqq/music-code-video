// Plate 9 — `thunder` (78.62 → 85.77 s). The page is night: ink clouds pour, a fire is hatched into
// the lower third, and the boy's name is carved into three stars.
//
// Furniture is the reference plate's (`open.ts`): the frame, the three practice rules, and the lyric
// block written word by word from `Lyrics.wordProgress`. Only the page's *tone* changes — this is a
// night plate, so the rules are rules of starlight and every flat mass is a SOLID (`night` page,
// `night2` cloud, `star` dots): hatch is the cel's second tone and is only ever put *inside* a solid
// shape, never instead of one. The one warmth is the fire; the words keep the film's `lantern` nib.
//
// Movements (everything that moves or wobbles is on the drawing clock; only the camera, the reveal
// ramps and `wordProgress` use `f.t`):
//   1. the page — the night floods the frame; the paper stays as the book's margin outside it.
//   2. 78.7 "When thunder clouds start pouring down": three flat `night2` masses slide in from the
//      left, one per beat, each trailing a rain curtain hatched `cool` on the inside of the mass.
//   3. 81.5 "Light a fire they can't put out": the fire — one `lantern` ring per beat, hatched into a
//      solid `night2` dome in the lower third, each ring swept on by the pen as its beat lands. It
//      does not go out (the `ember` plate inherits this fire).
//   4. 82.8 "Carve your name into those shining stars": three `star` dots stand under the rain and the
//      name is cut into them with `tech` strokes, one letter per group of the line's own words.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, ease, prog, noise1, hash, heldT, CEL } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['When thunder clouds', 'Light a fire they', 'Carve your name into'];

/** The page's furniture — frame and rules, the same on every plate (see `open.ts`). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const RULES = [720, 818, 916];

/**
 * The name. The song never gives the boy one; the only name this page is allowed to know is what his
 * father calls him — `father1`'s "Son, don't let it slip away" — so the three stars spell that: one
 * letter per star, carved while the line about carving is being sung.
 */
const NAME = ['S', 'O', 'N'];
/** The three star dots: a row in the band under the rain, above the lyric block. */
const STARS: V2[] = [v2(700, 600), v2(960, 600), v2(1220, 600)];
/** The fire's ground: lower third, left of the lyric block (r <= 179 keeps it inside x = 111…469). */
const FIRE = { x: 290, y: 880 };

export default class Thunder extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const L1 = this.lines[0]!, L2 = this.lines[1]!, L3 = this.lines[2]!;

    // the page breathes in: a slow push, so the plate ends closer to the storm than it started
    s.setCam(W / 2, H / 2 + 12, 1 + 0.035 * prog(t, this.ctx.start, this.ctx.end), 0);

    this.page(s, d);
    this.storm(s, f, L1);
    this.fire(s, f, d, L2);
    this.name(s, f, L3);
    for (let i = 0; i < this.lines.length; i++) this.writeRule(s, f, i);

    return CEL.flat;
  }

  /** The page: the night (a solid flat inside the frame), the frame, and the three rules. */
  private page(s: Sheet, d: number) {
    // the night stays ON the page: the paper shows outside the frame as the margin of the book
    s.fill([v2(74, 64), v2(1846, 64), v2(1846, 1016), v2(74, 1016)], 1, rgba('night'), { amp: 1.1 });
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('star', 0.34), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1.4, color: rgba('star', 0.16) });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('star', 0.15), overshoot: 12 });
    }
  }

  /**
   * Movement 2 — the storm. Three flat `night2` masses slide in from the left, one per beat; each is
   * ONE silhouette (the cloud's bumps, its flat belly, and the curtain of rain below it) filled solid,
   * so the rain can be hatched `cool` on the inside of the mass as the cel's second tone.
   */
  private storm(s: Sheet, f: Frame, L: Line) {
    const clouds = [
      { x: 430, y: 250, hw: 250, h: 118, drop: 200 },
      { x: 1010, y: 240, hw: 288, h: 100, drop: 178 },
      { x: 1560, y: 288, hw: 198, h: 104, drop: 208 },
    ];
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]!;
      const arrive = clamp(prog(f.t, L.start - 0.2 + i * 0.32, L.start + 1.35 + i * 0.32, ease.outCubic));
      if (arrive <= 0) continue;
      const cx = c.x - (1 - arrive) * 820;                       // it comes in from off the left edge
      const rain = clamp(prog(f.t, L.start + 0.3 + i * 0.32, L.start + 1.2 + i * 0.32));
      this.mass(s, f, cx, c.y, c.hw, c.h, c.drop, rain, i);
    }
  }

  private mass(s: Sheet, f: Frame, cx: number, cy: number, hw: number, h: number, drop: number, rain: number, seed: number) {
    const n = 12;
    const top: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const bump = Math.sin(Math.PI * u) ** 0.6;
      const y = cy - h * bump * (1 + 0.26 * noise1(u * 2.7 + seed * 5.1, seed + 3)) - 8 * noise1(u * 7.3, seed + 6);
      top.push(v2(cx - hw + 2 * hw * u, y));
    }
    const belly = cy + h * 0.5;
    const bottom = belly + drop * rain;
    const body: V2[] = [...top, v2(cx + hw, belly)];
    if (rain > 0.01) {
      body.push(v2(cx + hw, bottom));
      // the curtain's ragged hem crawls on the drawing clock (rain, on twos)
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        body.push(v2(cx - hw + 2 * hw * u, bottom + 15 * noise1(u * 9.1 + heldT(f.t) * 2.2, seed + 8)));
      }
    }
    body.push(v2(cx - hw, belly));
    s.fill(body, 100 + seed, rgba('night2', 0.92), { amp: 2.2 });
    s.stroke(body, 100 + seed, { w: 2, color: rgba('graphite', 0.5), amp: 2.2, taper: false });
    if (rain > 0.05) {
      // one hatch pass per drawing, clipped to the solid mass it belongs to
      const curtain: V2[] = [v2(cx - hw + 4, belly), v2(cx + hw - 4, belly), v2(cx + hw - 4, bottom), v2(cx - hw + 4, bottom)];
      s.hatch(curtain, 130 + seed, { spacing: 24, angle: 1.34, color: rgba('cool', 0.9), w: 2.2 });
    }
  }

  /**
   * Movement 3 — the fire. A solid `night2` dome in the lower third with the rings hatched `lantern`
   * on the inside, one ring per beat from the beat the word "fire" lands on, each ring swept on by the
   * pen. The rings only ever accumulate: the fire does not go out.
   */
  private fire(s: Sheet, f: Frame, d: number, L: Line) {
    const a = this.ctx.audio;
    const fw = L.words.find((w) => w.w.toLowerCase().startsWith('fire'));
    if (!fw) return;
    const b0 = Math.ceil(a.beatAt(fw.start));
    const rings = clamp(Math.floor(a.beatAt(f.t)) - b0 + 1, 0, 9);
    if (rings <= 0) return;
    const R = (k: number) => 26 + 17 * k;
    const flick = 0.88 + 0.12 * hash(3, d);                      // the flame steps once per drawing

    s.fill(this.dome(R(rings)), 200, rgba('night2', 0.92), { amp: 2.4 });
    // the heart of it: solid `lantern` inside the first ring — the one flat warm shape in the frame
    s.fill(this.dome(R(1) * 0.78), 202, rgba('lantern', 0.95 * flick), { amp: 2 });
    s.arc(FIRE.x, FIRE.y, R(1) * 0.78, Math.PI, 2 * Math.PI, 201, { w: 2.6, color: rgba('lantern', 0.95), amp: 1.6, taper: false });
    for (let k = 1; k <= rings; k++) {
      const bt = a.timeOfBeat(b0 + k - 1);
      const sweep = clamp(prog(f.t, bt, bt + 0.24, ease.outCubic));
      s.hatch(this.band(R(k - 1), R(k)), 210 + k, { spacing: 13 + 1.5 * k, angle: -1.02, color: rgba('lantern', 0.9 * flick), w: 2.4 });
      if (sweep > 0.02) s.arc(FIRE.x, FIRE.y, R(k), Math.PI, Math.PI + Math.PI * sweep, 230 + k, { w: 3.4, color: rgba('lantern', 0.95), amp: 1.6, taper: false });
    }
  }

  /** The upper half of a disc: what the fire's dome (and each ring's band) is cut from. */
  private dome(r: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + Math.PI * (i / 18);
      out.push(v2(FIRE.x + Math.cos(a) * r, FIRE.y + Math.sin(a) * r));
    }
    return out;
  }

  private band(r0: number, r1: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + Math.PI * (i / 12); out.push(v2(FIRE.x + Math.cos(a) * r1, FIRE.y + Math.sin(a) * r1)); }
    for (let i = 12; i >= 0; i--) { const a = Math.PI + Math.PI * (i / 12); out.push(v2(FIRE.x + Math.cos(a) * r0, FIRE.y + Math.sin(a) * r0)); }
    return out;
  }

  /**
   * Movement 4 — the name. Three flat `star` dots, each appearing on the first word of its group, and
   * the letter cut into the dot while that group is being sung. The carving is driven by the line's
   * own word times (`wordProgress`'s line), so no letter can be ahead of the voice.
   */
  private name(s: Sheet, f: Frame, L: Line) {
    const w = L.words;
    const groups: [number, number][] = [[0, 1], [2, 4], [5, w.length - 1]];
    for (let k = 0; k < STARS.length; k++) {
      const g = groups[k]!;
      const from = w[g[0]]!.start, to = w[Math.min(w.length - 1, g[1])]!.end;
      const born = clamp(prog(f.t, from - 0.24, from + 0.1, ease.outCubic));
      if (born <= 0) continue;
      const x = STARS[k]!.x, y = STARS[k]!.y;
      s.blob(x, y, 34 * (0.7 + 0.3 * born), 300 + k, {
        colour: rgba('star', 0.95), n: 12, jag: 0.2, rot: 0.3 * k,
        outline: { w: 2, color: rgba('star', 0.5), taper: false },
      });
      const p = clamp((f.t - from) / Math.max(0.16, to - from));
      if (p <= 0) continue;
      // the cut: a `night` letter inside a `star` dot reads as carved, not as written on top
      s.letterWritten(NAME[k]!, x, y + 14, 42, 320 + k, p, { font: 'tech', color: rgba('night', 0.95), w: 5, align: 'center' });
      if (p < 1) s.blob(x - 15 + 30 * p, y - 17, 4.5, 340 + k, { colour: rgba('lantern', 0.95), n: 6, jag: 0.4 });
    }
  }

  /** One line of the lyric block, written on its rule (the reference plate's pattern). */
  private writeRule(s: Sheet, f: Frame, i: number) {
    const L = this.lines[i]!;
    const size = 52, gap = 16;
    if (f.t < L.start - 1.3) return;
    const y = RULES[i]!;
    const words = L.words;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const total = widths.reduce((acc, w) => acc + w, 0) + gap * (words.length - 1);
    const x0 = (W - total) / 2;
    let x = x0;
    // the faint guide: the whole line, barely there, so the rule is never blank while it is written
    // (once the ink is on it the guide is invisible, and dropping it saves ~500 strokes a drawing)
    const rise = clamp(prog(f.t, L.start - 1.3, L.start - 0.35));
    if (f.t < L.end + 0.4) s.letter(L.text, W / 2, y, size, 60 + i, { font: 'readable', align: 'center', color: rgba('star', 0.13 * rise), w: 3, amp: 1.6 });
    let penX = x;
    for (let k = 0; k < words.length; k++) {
      const w = words[k]!;
      const p = Lyrics.wordProgress(w, f.t);
      if (p > 0) {
        s.letterWritten(w.w, x, y, size, 70 + i * 8 + k, p, {
          font: 'readable', w: 4.4, amp: 2,
          color: p >= 1 ? rgba('star', 0.95) : rgba('lantern', 0.95),
        });
      }
      if (p > 0 && p < 1) penX = x + widths[k]! * p;
      x += widths[k]! + gap;
    }
    const writing = f.t >= L.start - 0.15 && f.t <= L.end + 0.2;
    if (writing) s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], 80 + i, { w: 4.2, color: rgba('lantern', 0.95) });
  }
}

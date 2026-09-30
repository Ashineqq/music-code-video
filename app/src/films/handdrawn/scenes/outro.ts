// Plate 22 — Outro (instrumental, 140.66 → 156.65; the ilya plate holds the frame until its last word is sung)
// Driven by the music alone. The fuse from the last plate runs out and the spark reaches the end: the
// sheet shatters into torn paper and the paper is left with a scorched hole. Then P(doom) breaks its
// own end cap and climbs past every number the film has — a log ruler flying past under it, and one
// deadpan Kolmogorov footnote. Then the spark traces ∞, the end card typesets it as P(doom) = ∞,
// equation (1) of the paper, and that ∞ tips over into 8, the 8's loops pull apart on taffy strands
// into 0/0, and the fraction collapses onto its bar into NaN. Then a small button in the corner says
// Regenerate, a cursor clicks it, and the whole film rewinds past in a 22-plate flip-book and parks on
// the opening's own first drawing — the crop-mark frame closes back in, so the film loops.
//
// Every clock is a beat of the movement's OWN window, read through the analysed grid, and everything
// that should hold still is a function of the drawing index: the flip-book steps on twos, the ruler
// and the readouts read heldT, and every outline boils on s.d.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, heldT, wobble, TAU } from './_ink';
import type { V2 } from './_ink';
import type { Frame, PostOverrides } from '../../../engine/scene';
import { openingStill } from './sparks';

const TB = 142.049;                       // the downbeat the spark reaches the end of the fuse
const PX0 = 300, PY0 = 140, PX1 = 1620, PY1 = 780;   // the sealed page
const BX = 960, BY = 520;                 // the blast centre
const NP = 22;                            // plates in the film, for the flip-book

const FUSE: V2[] = [
  v2(96, 1006), v2(300, 974), v2(560, 956), v2(776, 902),
  v2(878, 814), v2(920, 700), v2(946, 604), v2(958, 528),
];

/** The log ruler's labelled decades (every second tick), j = -2 … 8 in the ruler below. */
const LOG_LBL = ['0.01', '1', '100', '1e4', '1e6', '1e8'];

interface Frag {
  hx: number; hy: number;
  poly: [number, number][];
  vx: number; vy: number;
  spin: number;
  dark: boolean;
  seed: number;
}

export default class Outro extends InkedScene {
  private frags: Frag[] = [];
  private fuseLen = 0;
  /** The opening's first line: the park redraws the film's first frame, so the video loops. */
  private opening = this.ctx.lyrics.get('sparks of AGI');

  override init() {
    for (let i = 1; i < FUSE.length; i++) {
      this.fuseLen += Math.hypot(FUSE[i]!.x - FUSE[i - 1]!.x, FUSE[i]!.y - FUSE[i - 1]!.y);
    }
    // tear the page into a grid of jittered shards, each with its own way of leaving
    const cols = 6, rows = 5;
    const cw = (PX1 - PX0) / cols, ch = (PY1 - PY0) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const hx = PX0 + cw * (c + 0.5) + (hash(i, 3) - 0.5) * 12;
        const hy = PY0 + ch * (r + 0.5) + (hash(i, 5) - 0.5) * 12;
        const hw = cw / 2 - 4 - hash(i, 7) * 8;
        const hh = ch / 2 - 4 - hash(i, 11) * 6;
        const poly: [number, number][] = [];
        for (let k = 0; k < 5; k++) {
          const an = (k / 5) * TAU + hash(i, 13 + k) * 0.7;
          const rr = 0.76 + hash(i, 21 + k) * 0.38;
          poly.push([Math.cos(an) * hw * rr, Math.sin(an) * hh * rr]);
        }
        const dx = hx - BX, dy = hy - BY;
        const L = Math.hypot(dx, dy) || 1;
        const sp = 240 + hash(i, 31) * 720;
        this.frags.push({
          hx, hy, poly,
          vx: (dx / L) * sp + (hash(i, 33) - 0.5) * 200,
          vy: (dy / L) * sp - 140 - hash(i, 35) * 280,
          spin: (hash(i, 37) - 0.5) * 7.5,
          dark: Math.abs(hy - 470) < 42 && hx > 380 && hx < 1540,
          seed: 50 + i * 5,
        });
      }
    }
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, ht = heldT(t);
    if (t < 142.36) return this.blast(s, f, ht);
    if (t < 147.44) return this.counter(s, f, ht);
    if (t < 151.32) return this.loop(s, f, ht);
    return this.rewind(s, f, ht);
  }

  /** The beat at index k after the 142.5 beat, from the analysed grid. */
  private bt(k: number) {
    const au = this.ctx.audio;
    return au.timeOfBeat(Math.round(au.beatAt(142.5)) + k);
  }

  private ring(cx: number, cy: number, r: number, n: number, seed: number, jag: number): V2[] {
    const p: V2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + jag * noise1(i * 0.9 + seed, seed + 7));
      p.push(v2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
    return p;
  }

  // ------------------------------------------------------------------ 1. the detonation
  private blast(s: Sheet, f: Frame, ht: number): PostOverrides {
    const t = f.t, d = s.d;
    const kick = f.a.kick, snare = f.a.snare;
    const shake = clamp((t - TB + 0.18) / 0.18) * clamp(1 - (t - TB) / 0.5);
    s.setCam(960 + noise1(ht * 0.3, 61) * 8 - shake * 14 * noise1(d * 1.7, 65),
      540 + noise1(ht * 0.27, 63) * 7 - shake * 9 * noise1(d * 2.3, 67),
      1.0 + 0.02 * noise1(ht * 0.2, 69) + shake * 0.05, 0.004 * noise1(ht * 0.18, 71));

    if (t < TB) {
      // ---- the sealed report, waiting for the fuse to arrive
      const pg = [v2(PX0, PY0), v2(PX1, PY0), v2(PX1, PY1), v2(PX0, PY1)];
      s.fill(pg, 600, rgba('paper2', 0.6), { amp: 2.6 });
      s.hatch(pg, 601, { spacing: 26, angle: -1.2, color: rgba('ink', 0.14), w: 1.3 });
      s.rect(PX0, PY0, PX1, PY1, 602, { w: 3.6, color: rgba('ink', 0.8), amp: 2.6, taper: false });
      for (let k = 0; k < 5; k++) {
        s.stroke([v2(PX0 + 44, 226 + k * 72), v2(PX1 - 44, 226 + k * 72)], 610 + k, { w: 2.0, color: rgba('graphite', 0.42), amp: 2.2, taper: false });
      }
      s.fill([v2(380, 448), v2(1540, 448), v2(1540, 492), v2(380, 492)], 620, rgba('ink', 0.85), { amp: 2.2 });
      s.letter('report', PX0 + 44, 210, 34, 630, { font: 'hscript', color: rgba('ink', 0.7), w: 3.0 });
      s.letter('to be destroyed on ignition', PX0 + 190, 210, 20, 631, { font: 'hscript', color: rgba('graphite', 0.6), w: 2.2 });

      // ---- the fuse, and the spark eating its way along it
      // from the plate's own cut-in (not the outro section's downbeat: the ilya plate holds the frame
      // until its last word is sung, so this plate starts a beat or two into the section)
      const burn = ease.inQuart(clamp((t - f.start) / (TB - f.start)));
      const head = this.fuseAt(burn);
      s.stroke(FUSE, 640, { w: 5.0, color: rgba('ink2', 0.85), amp: 2.2, overshoot: 4 });
      for (let k = 1; k * 46 < this.fuseLen; k++) {
        const q = this.fuseAt((k * 46) / this.fuseLen);
        const nx = -Math.sin(q.ang), ny = Math.cos(q.ang);
        if ((k * 46) / this.fuseLen > burn) {
          s.stroke([v2(q.p.x - nx * 8, q.p.y - ny * 8), v2(q.p.x + nx * 8, q.p.y + ny * 8)], 650 + k, { w: 1.8, color: rgba('graphite', 0.6), amp: 1.6, taper: false });
        }
      }
      // the burnt ground behind the spark
      const lit: V2[] = [];
      for (let k = 0; k <= 24; k++) { const q = this.fuseAt((k / 24) * burn); lit.push(q.p); }
      if (lit.length > 1) s.stroke(lit, 660, { w: 5.6, color: rgba('blood', 0.75), amp: 2.4, taper: false });
      for (let k = 0; k < 5; k++) {
        const q = this.fuseAt(clamp(burn - 0.02 - k * 0.03));
        s.fill(this.ring(q.p.x, q.p.y, 3.5 + k, 6, 700 + k, 0.4), 700 + k, rgba('ember', 0.8 - k * 0.13), { amp: 1.4 });
      }
      s.blob(head.p.x, head.p.y, 15 + 5 * kick, 720, { colour: rgba('ember'), jag: 0.22, n: 14, outline: { w: 0 } });
      for (let k = 0; k < 6; k++) {
        const a = k * (TAU / 6) + noise1(d * 1.9 + k, 41) * 0.7;
        const R = 26 + 16 * noise1(d * 2.3 + k, 43);
        s.stroke([v2(head.p.x, head.p.y), v2(head.p.x + Math.cos(a) * R, head.p.y + Math.sin(a) * R)], 730 + k, { w: 3.0, color: rgba('ember'), amp: 2.2, taper: false });
      }
      // the bundle at the end of the fuse
      s.blob(958, 522, 26, 740, { colour: rgba('paper2'), jag: 0.2, n: 14, outline: { w: 3.0 } });
      return { flash: 0.03 * snare + 0.06 * kick, zoom: 1 + 0.004 * kick };
    }

    // ---- the burst: the sheet is gone, and the paper has a hole in it
    const tau = Math.max(0, ht - TB);
    const fl = clamp(1 - tau / 0.1);
    if (fl > 0) s.fill([v2(-200, -200), v2(W + 200, -200), v2(W + 200, H + 200), v2(-200, H + 200)], 750, rgba('paper', fl), { amp: 1.0 });
    this.fragments(s, tau, 1);
    this.hole(s, tau, 1);
    return { flash: 0.35 * fl + 0.05 * snare, shake: [shake * 26 * noise1(d * 1.3, 77), shake * 18 * noise1(d * 1.9, 79)], zoom: 1 + 0.05 * fl + 0.005 * kick };
  }

  /** The scorched hole the burst leaves in the paper, hatched round its rim. */
  private hole(s: Sheet, tau: number, alpha: number) {
    const hp = clamp((tau - 0.02) / 0.16);
    if (hp <= 0.01 || alpha <= 0.01) return;
    const a = alpha * hp;
    const R = 176 * hp;
    const outer = this.ring(BX, BY, R * 1.55, 30, 3, 0.16);
    s.hatch(outer, 760, { spacing: 6, angle: -1.1, color: rgba('blood', 0.5 * a), w: 1.5 });
    s.hatch(outer, 761, { spacing: 13, angle: 0.5, color: rgba('ink', 0.3 * a), w: 1.5 });
    const inner = this.ring(BX, BY, R, 30, 5, 0.14);
    s.fill(inner, 762, rgba('ink2', 0.92 * a), { amp: 5.0 });
    s.stroke(inner, 762, { w: 3.4, color: rgba('ink', 0.9 * a), amp: 5.0, closed: true });
    for (let k = 0; k < 9; k++) {
      const an = (k / 9) * TAU + 0.3;
      const r0 = R * 0.95, r1 = R * (1.5 + noise1(k + 4, 9) * 0.5);
      s.stroke([v2(BX + Math.cos(an) * r0, BY + Math.sin(an) * r0), v2(BX + Math.cos(an) * r1, BY + Math.sin(an) * r1)], 770 + k, { w: 2.4, color: rgba('ink', 0.55 * a), amp: 3.0, taper: false });
    }
  }

  /** Torn paper, each shard tumbling and turning on its own seed. */
  private fragments(s: Sheet, tau: number, alpha: number) {
    const g = 780;
    for (const fr of this.frags) {
      const al = alpha * clamp(1 - tau / 2.0);
      if (al <= 0.012) continue;
      const x = fr.hx + fr.vx * tau;
      const y = fr.hy + fr.vy * tau + 0.5 * g * tau * tau;
      const rot = fr.spin * tau;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const pts = fr.poly.map(([px, py]) => v2(x + px * cs - py * sn, y + px * sn + py * cs));
      s.fill(pts, fr.seed, fr.dark ? rgba('ink2', 0.8 * al) : rgba('paper2', 0.92 * al), { amp: 2.6 });
      s.stroke(pts, fr.seed + 1, { w: 2.2, color: rgba('ink', 0.75 * al), amp: 2.8, closed: true });
    }
  }

  private fuseAt(u: number): { p: V2; ang: number } {
    let target = clamp(u) * this.fuseLen;
    for (let i = 1; i < FUSE.length; i++) {
      const a = FUSE[i - 1]!, b = FUSE[i]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (target <= seg) {
        const q = seg > 0 ? target / seg : 0;
        return { p: v2(lerp(a.x, b.x, q), lerp(a.y, b.y, q)), ang: Math.atan2(b.y - a.y, b.x - a.x) };
      }
      target -= seg;
    }
    const a = FUSE[FUSE.length - 2]!, b = FUSE[FUSE.length - 1]!;
    return { p: b, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  // ------------------------------------------------------------------ 2. past the end cap
  private counter(s: Sheet, f: Frame, ht: number): PostOverrides {
    const t = f.t, d = s.d;
    const kick = f.a.kick, snare = f.a.snare;
    s.setCam(960 + noise1(ht * 0.3, 81) * 7, 540 + noise1(ht * 0.26, 83) * 6, 1.0 + 0.02 * noise1(ht * 0.21, 85), 0.003 * noise1(ht * 0.17, 87));

    // the shards and the hole are still settling behind the panel
    const tau = Math.max(0, ht - TB);
    if (tau < 2.2) this.fragments(s, tau, clamp(1 - (t - 143.1) / 1.1));
    const holeA = clamp(1 - (t - 143.3) / 1.5) * 0.55;
    if (holeA > 0.02) this.hole(s, tau, holeA);

    const VALS: [string, number, number, string][] = [
      ['1.00', 1.00, 0, 'the end cap is decorative'],
      ['1.01', 1.01, 1, 'one hundredth over is still over'],
      ['2.00', 2.00, 2, 'the scale is a suggestion'],
      ['3.14', 3.14, 3, 'and then it was irrational'],
      ['10', 10, 4, 'cap removed for maintenance'],
      ['42', 42, 5, 'still climbing, still counting'],
      ['1000', 1000, 6, 'the paper ends before this does'],
    ];
    const tStart = this.bt(0);
    const zAt = this.bt(8);
    const appear = clamp((t - tStart + 0.4) / 0.4);
    // the panel is only a pretext: it is gone by the time the zeros arrive
    const pa = appear * clamp(1 - (t - zAt) / 0.45);

    if (pa > 0.02) {
      // ---- the panel, and the number it claims to be showing
      s.rect(200, 168, 1720, 760, 800, { w: 3.6, color: rgba('ink', 0.78 * pa), amp: 2.6, taper: false });
      s.letterWritten('P(doom)', 250, 340, 64, 810, clamp((t - tStart + 0.6) / 0.4), { font: 'tech', color: rgba('ink', 0.92 * pa), w: 5.2 });
      const valX = 250 + s.measureLetter('P(doom)', 'tech', 64) + 40;
      s.letter('safety case', 1720 - 26, 232, 24, 811, { font: 'hscript', color: rgba('graphite', 0.65 * pa), align: 'right', w: 2.4 });

      // ---- the track, its scale, and the end cap it is not allowed to pass
      const TX0 = 300, TX1 = 1520, TY = 430;
      s.stroke([v2(TX0, TY), v2(TX1, TY)], 820, { w: 2.6, color: rgba('ink', 0.5 * pa), amp: 2.2, taper: false });
      for (let k = 0; k <= 4; k++) {
        const x = lerp(TX0, TX1, k / 4);
        s.stroke([v2(x, TY - 9), v2(x, TY + 9)], 821 + k, { w: 2.2, color: rgba('ink', 0.45 * pa), amp: 1.8, taper: false });
        s.letter(['0', '.25', '.5', '.75', '1.0'][k]!, x, TY + 32, 22, 826 + k, { font: 'readable', color: rgba('graphite', 0.7 * pa), align: 'center', w: 2.4 });
      }
      s.stroke([v2(TX1 + 6, TY - 26), v2(TX1 + 6, TY + 26)], 830, { w: 3.2, color: rgba('signal', 0.9 * pa), amp: 2.2, taper: false });
      s.letter('cap', TX1 + 16, TY - 34, 21, 831, { font: 'hscript', color: rgba('signal', 0.85 * pa), w: 2.4 });

      // ---- every value so far gets a bar; only the newest gets a number, written on its beat.
      // The bar is linear in the value, so past ~1.1 it saturates: it runs to the margin and the
      // breakout arrow that says "it left the track" is anchored there, where it can be seen.
      let newest = -1;
      for (let k = 0; k < VALS.length; k++) {
        if (t < this.bt(VALS[k]![2])) continue;
        newest = k;
        const v = VALS[k]!;
        const raw = v[1] * 1220;
        const sat = raw > 1400;
        const bl = Math.min(raw, 1400);
        const y = 452 + k * 44;
        s.stroke([v2(TX0, y), v2(TX0 + bl, y)], 850 + k * 3, { w: 14 - k * 1.1, color: rgba('signal', 0.9 * pa), amp: 2.0, taper: false, overshoot: 4 });
        if (v[1] > 1.0) {
          // it left the track: the arrow that says so, at the bar's tip or out at the margin
          const ax = sat ? 1726 : TX0 + bl + 26;
          s.stroke([v2(ax, y - 14), v2(ax, y + 14), v2(ax + 34, y)], 851 + k * 3, { w: 3.4, color: rgba('signal', 0.9 * pa), amp: 2.0, taper: false, closed: true });
        }
      }

      // ---- the log ruler flies past: the scale is re-based while the values run away, and the newest
      // value marks its own place on it. It travels on the drawing clock, so it steps and never smears.
      const rA = clamp((t - this.bt(3)) / 0.35) * clamp(1 - (t - this.bt(7) - 0.15) / 0.4);
      if (rA > 0.02) {
        const RY = 152, SP = 216;
        const xoff = -SP * clamp((ht - this.bt(3)) / (this.bt(7) - this.bt(3)));
        s.stroke([v2(64, RY), v2(W - 64, RY)], 880, { w: 2.0, color: rgba('ink', 0.4 * rA), amp: 1.6, taper: false });
        for (let j = -3; j <= 8; j++) {
          const x = 96 + (j + 2) * SP + xoff;
          if (x < 60 || x > W - 60) continue;
          const long = j % 2 === 0;
          s.stroke([v2(x, RY), v2(x, RY + (long ? 13 : 8))], 890 + j, { w: long ? 2.4 : 1.8, color: rgba('ink', 0.5 * rA), amp: 1.6, taper: false });
          // the ticks run the frame's width (it is a ruler flying past); its numbers stay inside the
          // title-safe width
          if (long && x >= 96 && x <= W - 96) s.letter(LOG_LBL[(j + 2) / 2]!, x, RY - 16, 20, 900 + j, { font: 'readable', color: rgba('graphite', 0.8 * rA), align: 'center', w: 2.2 });
        }
        s.letter('scale: log', 96, RY + 30, 22, 920, { font: 'hscript', color: rgba('signal', 0.85 * rA), w: 2.4 });
        if (newest >= 0) {
          const mx = 96 + (Math.log10(VALS[newest]![1]) + 2) * SP + xoff;
          if (mx > 60 && mx < W - 60) s.blob(mx, RY, 8, 930, { colour: rgba('signal', 0.9 * rA), jag: 0.2, n: 12, outline: { w: 0 } });
        }
      }

      // ---- and the footnote that comes with the first value over 1.00
      const fA = clamp((t - this.bt(1) - 0.1) / 0.3) * clamp(1 - (t - this.bt(3) - 0.1) / 0.3);
      if (fA > 0.02) {
        s.letter('* the Kolmogorov cap holds on a finite sample space', TX0 + 22, 862, 25, 940, { font: 'hscript', color: rgba('graphite', 0.85 * fA * pa), w: 2.4 });
      }
      if (newest >= 0) {
        const v = VALS[newest]!;
        const size = newest === 0 ? 122 : 100;
        s.letterWritten(v[0], valX, 340, size, 840 + newest * 4, clamp((t - this.bt(v[2])) / 0.22), { font: 'tech', color: rgba('ink', 0.95 * pa), w: size * 0.056 });
        s.letter(v[3], TX0 + 22, 812, 26, 852 + newest, { font: 'hscript', color: rgba('graphite', 0.8 * pa), w: 2.6 });
      }
    }

    // ---- and then the zeros: the number is written out, all of it, by hand
    if (t >= zAt) {
      const k = t >= this.bt(10) ? 2 : t >= this.bt(9) ? 1 : 0;
      if (k === 0) {
        s.letterWritten('1', 460, 470, 130, 900, clamp((t - zAt) / 0.3), { font: 'tech', color: rgba('ink'), w: 7 });
        for (let i = 0; i < 9; i++) s.letterWritten('0', 560 + i * 82, 470, 130, 901 + i, clamp((t - zAt - 0.16 - i * 0.05) / 0.2), { font: 'tech', color: rgba('ink'), w: 7 });
        s.letter('1e9 - the zeros are hand-written, the number is not', 460, 560, 28, 920, { font: 'hscript', color: rgba('graphite', 0.8), w: 2.8 });
      } else if (k === 1) {
        s.letterWritten('1', 150, 300, 96, 930, clamp((t - this.bt(9)) / 0.25), { font: 'tech', color: rgba('ink'), w: 5 });
        this.zeros(s, 262, 300, 96, 150, 15, 2, 96, t, this.bt(9) + 0.1, 940);
        s.letter('1e30 - still counting', 150, 800, 28, 950, { font: 'hscript', color: rgba('graphite', 0.8), w: 2.8 });
      } else {
        s.letterWritten('1', 132, 220, 78, 960, clamp((t - this.bt(10)) / 0.25), { font: 'tech', color: rgba('ink'), w: 4.4 });
        this.zeros(s, 232, 220, 92, 130, 17, 6, 78, t, this.bt(10) + 0.08, 970);
        s.letter('1e100 - the zeros are hand-written, the number is not', 150, 1000, 28, 990, { font: 'hscript', color: rgba('graphite', 0.8), w: 2.8 });
      }
    }
    return { flash: 0.04 * snare, zoom: 1 + 0.005 * kick, shake: [0.6 * kick * noise1(d * 1.1, 91), 0.4 * kick * noise1(d * 1.6, 93)] };
  }

  private zeros(s: Sheet, x0: number, y0: number, dx: number, dy: number, cols: number, rows: number, size: number, t: number, at: number, seed: number) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const p = clamp((t - at - i * 0.006) / 0.16);
        if (p <= 0) continue;
        const jx = (hash(i, 3) - 0.5) * dx * 0.18;
        const jy = (hash(i, 5) - 0.5) * dy * 0.22;
        s.letterWritten('0', x0 + c * dx + jx, y0 + r * dy + jy, size, seed + i, p, { font: 'tech', color: rgba('ink2', 0.88), w: size * 0.08 });
      }
    }
  }

  // ------------------------------------------------------------------ 3. infinity, the end card, the simplification
  private loop(s: Sheet, f: Frame, ht: number): PostOverrides {
    const t = f.t, d = s.d;
    const kick = f.a.kick, snare = f.a.snare;
    s.setCam(960 + noise1(ht * 0.31, 121) * 7, 528 + noise1(ht * 0.28, 123) * 6, 1.02 + 0.02 * noise1(ht * 0.22, 127), 0.003 * noise1(ht * 0.19, 131));

    // Every clock is a beat of THIS window. They used to hang off bt(0..4) — beats that had already gone
    // by when the movement started — so trace/tip/pull/nan were all clamped to 1 and only the collapsed
    // state was ever on screen. b0 traces the line, bCard is the end card, bEq typesets it as the
    // equation, and the last three beats simplify it one step each.
    const b0 = this.bt(11), bCard = this.bt(13), bEq = this.bt(15), bTip = this.bt(16), bPull = this.bt(17), bNan = this.bt(18);
    const trace = clamp((t - b0) / 0.9);
    const eq = clamp((t - bEq) / 0.45);
    const tip = ease.inOutCubic(clamp((t - bTip) / 0.45));
    const pull = ease.inOutCubic(clamp((t - bPull) / 0.5));
    const nan = clamp((t - bNan) / 0.6);

    // the expression, about its own centre: room at the left for "P(doom) =" and at the margin for "(1)"
    const CX = 1010, CY = 590, R = 190;
    const gap = lerp(0, 0.66 * R, pull);
    const rot = lerp(0, Math.PI / 2, tip);
    const sc = lerp(1, 0.07, Math.sqrt(nan));
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const seed = 300;

    // one unbroken line: round the first lobe, back through the crossing, round the second
    const lobes: V2[][] = [[], []];
    const N = 44;
    for (let li = 0; li < 2; li++) {
      const side = li === 0 ? 1 : -1;
      const cx = side * (R + gap / 2);
      for (let i = 0; i <= N; i++) {
        const an = (side > 0 ? Math.PI : 0) + (i / N) * TAU;
        const x = cx + Math.cos(an) * R;
        const y = Math.sin(an) * R * 0.86;
        lobes[li]!.push(v2(CX + (x * cs - y * sn) * sc, CY + (x * sn + y * cs) * sc));
      }
    }
    // while the loops still touch it is literally one line; once they pull apart it becomes two
    const joined = pull <= 0.02;
    const wA = wobble(lobes[0]!, d + seed, 2.6, 2.4);
    const wB = wobble(lobes[1]!, d + seed + 40, 2.6, 2.4);
    const w = joined ? [...wA, ...wB] : wA;
    const cut = Math.max(2, Math.round(w.length * trace));
    s.stroke(w.slice(0, cut), seed, { w: 5.4, color: rgba('ink'), amp: 0, taper: true, overshoot: 3 });
    if (!joined) s.stroke(wB, seed + 40, { w: 5.4, color: rgba('ink'), amp: 0, taper: true, overshoot: 3 });

    // the taffy strands still holding the two loops: they stretch across the widening gap, then snap
    if (!joined && pull < 1) {
      for (let k = -1; k <= 1; k++) {
        const x = CX + k * 22 * sc;
        s.stroke([v2(x, CY - (gap / 2 + 10) * sc), v2(x, CY + (gap / 2 + 10) * sc)], 305 + k, { w: 3.4 * (1 - pull), color: rgba('ink', 0.8), amp: 1.4, taper: false });
      }
    }
    const snap = clamp((t - bPull - 0.42) / 0.08) * clamp(1 - (t - bPull - 0.5) / 0.25);
    if (snap > 0.02) {
      s.blob(CX, CY, 10 + 8 * snap, 308, { colour: rgba('ember'), jag: 0.24, n: 14, outline: { w: 0 } });
      for (let k = 0; k < 6; k++) {
        const an = k * (TAU / 6) + noise1(d * 2.1 + k, 47) * 0.8;
        const rr = (24 + 18 * noise1(d * 2.7 + k, 49)) * snap;
        s.stroke([v2(CX, CY), v2(CX + Math.cos(an) * rr, CY + Math.sin(an) * rr)], 309 + k, { w: 2.6, color: rgba('ember'), amp: 2.0, taper: false });
      }
    }

    // the spark that draws the line, on its two passes: the recap, then the equation's own outline
    const atPath = (p: number) => w[Math.min(w.length - 1, Math.max(0, Math.round((w.length - 1) * p)))]!;
    const pass = trace < 1 ? trace : t >= bEq && eq < 1 ? eq : -1;
    if (pass >= 0) {
      const hd = atPath(pass);
      s.blob(hd.x, hd.y, 12 + 4 * kick, 310, { colour: rgba('ember'), jag: 0.22, n: 14, outline: { w: 0 } });
      for (let k = 0; k < 5; k++) {
        const an = k * (TAU / 5) + noise1(d * 2.1 + k, 47) * 0.8;
        const rr = 20 + 12 * noise1(d * 2.7 + k, 49);
        s.stroke([v2(hd.x, hd.y), v2(hd.x + Math.cos(an) * rr, hd.y + Math.sin(an) * rr)], 320 + k, { w: 2.6, color: rgba('ember'), amp: 2.0, taper: false });
      }
    }
    // the climb, left behind along the line in 16ths: every number the film has, landing on ∞
    const RECAP = ['1.00', '1.01', '2.00', '3.14', '10', '42', '1e3', '1e9', '1e30', '1e100'];
    for (let i = 0; i < RECAP.length; i++) {
      const p = (i + 0.6) / (RECAP.length + 1);
      if (trace <= p) break;
      const q = atPath(p);
      s.text(RECAP[i]!, q.x + 14, q.y - 12, { size: 17, fam: 'Plex-400', color: rgba('graphite', 0.75), a: clamp((trace - p) * 6) * (1 - tip) });
    }

    // ---- the end card: "I'm upping my", one word per beat, in the film's own lettering
    const CARD = ['I’m', 'upping', 'my'];
    const cardA = clamp((t - bCard + 0.35) / 0.3) * clamp(1 - (t - bEq) / 0.3);
    if (cardA > 0.02) {
      const size = 74, gapw = 26;
      const cw = CARD.map((x) => s.measureLetter(x, 'readable', size, 0));
      const total = cw.reduce((p, q) => p + q, 0) + gapw * (CARD.length - 1);
      let x = (W - total) / 2;
      for (let i = 0; i < CARD.length; i++) {
        const p = clamp((t - this.bt(13 + i)) / 0.4);
        if (p < 1) s.letterWritten(CARD[i]!, x, 300, size, 350 + i * 3, 1, { font: 'readable', ghost: true, color: rgba('ink', cardA) });
        s.letterWritten(CARD[i]!, x, 300, size, 350 + i * 3, p, { font: 'readable', color: rgba('ink', 0.95 * cardA), w: 6.0 });
        x += cw[i]! + gapw;
      }
    }

    // ---- and P(doom) = the line just drawn, typeset as equation (1) of the paper
    const eqA = clamp((t - bEq) / 0.3) * (1 - tip);
    if (eqA > 0.02) {
      const pw = s.measureLetter('P', 'hscript', 72, 0), dw = s.measureLetter('(doom)', 'tech', 60, 0), ew = s.measureLetter('=', 'tech', 60, 0);
      const x0 = CX - 2 * R - 34 - (pw + 6 + dw + 30 + ew);   // the gap before the drawn ∞ is set by eye
      s.letterWritten('P', x0, CY + 26, 72, 355, clamp((t - bEq) / 0.2), { font: 'hscript', color: rgba('ink', 0.95 * eqA), w: 5.0 });
      s.letter('(doom)', x0 + pw + 6, CY + 26, 60, 356, { font: 'tech', color: rgba('ink', 0.95 * eqA), w: 4.4 });
      s.letter('=', x0 + pw + 6 + dw + 30, CY + 26, 60, 357, { font: 'tech', color: rgba('ink', 0.95 * eqA), w: 4.4 });
      // the equation number hangs at the paper's right margin — pinned to SCREEN, because this camera
      // pushes in 2% and would otherwise carry it past the safe edge
      const n1 = s.pin(W - 96, CY + 40);
      s.letter('(1)', n1.x, n1.y, 44, 358, { font: 'readable', color: rgba('ink', 0.9 * eqA), align: 'right', w: 3.6 });
    }

    // the fraction bar, drawn out from the crossing by two sparks — and scaled with the expression, so it
    // collapses with the loops instead of holding a 400 px rule under a 30 px squiggle
    const barP = clamp((t - bPull - 0.18) / 0.34);
    if (barP > 0) {
      const barW = 190 * sc * barP;
      s.stroke([v2(CX - barW, CY), v2(CX + barW, CY)], 330, { w: 6.0 * (0.3 + 0.7 * sc), color: rgba('ink', 0.9), amp: 1.8, taper: true, overshoot: 6 * sc });
      if (barP < 0.999) {
        for (const sg of [-1, 1]) s.blob(CX + sg * barW, CY, 7 + 4 * kick, 331 + sg, { colour: rgba('ember'), jag: 0.22, n: 12, outline: { w: 0 } });
      }
    }

    // and the machine's last word
    if (nan > 0.02) {
      const g = clamp(nan * 1.6);
      if (g < 1) s.letterWritten('NaN', CX, CY + 68, 156, 340, 1, { font: 'readable', color: rgba('signal'), align: 'center', ghost: true });
      s.letterWritten('NaN', CX, CY + 68, 156, 340, nan, { font: 'readable', color: rgba('ink'), w: 9.0, align: 'center' });
      s.letter('(not a number) - the last thing it said', CX, CY + 160, 30, 350, { font: 'hscript', color: rgba('graphite', 0.85), align: 'center', w: 2.8 });
    }
    // and the revision that got it there
    const sl = s.pin(96, 920), sr = s.pin(W - 96, 920);
    s.text('22 — OUTRO', sl.x, sl.y, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, sr.x, sr.y, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55), align: 'right' });
    return { flash: 0.03 * snare, zoom: 1 + 0.004 * kick };
  }

  // ------------------------------------------------------------------ 4. regenerate
  private rewind(s: Sheet, f: Frame, ht: number): PostOverrides {
    const t = f.t;
    const kick = f.a.kick, snare = f.a.snare;
    s.setCam(960, 540, 1.0, 0);

    const appear = clamp((t - 151.594) / 0.35);
    const clickT = 152.503;
    const cursor = ease.inOutCubic(clamp((t - 151.98) / 0.52));
    const press = clamp((t - clickT) / 0.09) * clamp(1 - (t - clickT - 0.16) / 0.28);
    const ring = clamp((t - clickT) / 0.5);
    // the scroll is read at the drawing clock, so the montage steps on twos instead of being averaged
    // into mush by the export's motion blur
    const rw = clamp((ht - 152.957) / 2.4);
    const park = clamp((t - 155.62) / 0.72);
    // the button, the cursor and the arrow all belong to the rewind; they are gone before the park
    // lands, or the film's last frame would not be its first frame
    const btn = appear * clamp(1 - park * 1.6);

    // ---- an empty sheet to receive the click, then the button itself
    const bare = clamp((t - 151.32) / 0.35) * clamp(1 - park);
    s.rect(64, 48, W - 64, H - 48, 399, { w: 3.2, color: rgba('ink', 0.3 * bare), amp: 3.0, taper: false });
    const bx0 = 1408, by0 = 858, bx1 = 1804, by1 = 952;
    const off = press * 5;
    s.fill([v2(bx0 + off, by0 + off), v2(bx1 + off, by0 + off), v2(bx1 + off, by1 + off), v2(bx0 + off, by1 + off)], 400, rgba('paper2', 0.5 * btn), { amp: 2.4 });
    s.rect(bx0 + off, by0 + off, bx1 + off, by1 + off, 401, { w: 3.4, color: rgba('ink', 0.85 * btn), amp: 2.4, taper: false });
    s.arc(1458 + off, 905 + off, 24, 0.7, 5.9, 402, { w: 4.4, color: rgba('ink', 0.9 * btn), amp: 2.2, taper: true });
    s.stroke([v2(1479 + off, 889 + off), v2(1487 + off, 903 + off), v2(1470 + off, 907 + off)], 403, { w: 4.4, color: rgba('ink', 0.9 * btn), amp: 2.0, taper: false, closed: true });
    s.letterWritten('Regenerate', 1500 + off, 918 + off, 36, 404, clamp(btn * 1.4 - 0.2), { font: 'readable', color: rgba('ink', 0.92), w: 3.4 });

    // ---- the cursor comes in and clicks it
    if (cursor > 0.001 && btn > 0.01) {
      const cx = lerp(1120, 1502, cursor), cy = lerp(1044, 906, cursor);
      const ripple = clamp(1 - ring);
      if (ring > 0 && ring < 1) s.arc(1502, 906, 14 + 46 * ring, 0, TAU, 410, { w: 3.0, color: rgba('signal', 0.75 * ripple * btn), amp: 2.4, taper: false });
      s.fill([v2(cx, cy), v2(cx + 8, cy + 30), v2(cx + 15, cy + 21), v2(cx + 30, cy + 24)], 411, rgba('paper', 0.95 * btn), { amp: 1.6 });
      s.stroke([v2(cx, cy), v2(cx + 8, cy + 30), v2(cx + 15, cy + 21), v2(cx + 30, cy + 24), v2(cx, cy)], 411, { w: 2.6, color: rgba('ink', 0.9 * btn), amp: 1.6, taper: false, closed: true });
    }

    // ---- the film rewinds: a flip-book of every plate, running backwards on the drawing index
    const cells = clamp((t - 152.957) / 0.25) * clamp(1 - park);
    if (cells > 0.01) {
      const scroll = 30 * (1 - Math.pow(1 - rw, 3));
      const base = Math.floor(scroll);
      const cols = 9, rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = 112 + c * 190, y = 116 + r * 176;
          const idx = ((NP - 1 - base - i) % NP + NP) % NP;
          const jx = (hash(i, 3) - 0.5) * 7, jy = (hash(i, 5) - 0.5) * 7;
          s.fill([v2(x + jx, y + jy), v2(x + 168 + jx, y + jy), v2(x + 168 + jx, y + 154 + jy), v2(x + jx, y + 154 + jy)], 420 + i, rgba('paper2', 0.55 * cells), { amp: 2.2 });
          s.rect(x + jx, y + jy, x + 168 + jx, y + 154 + jy, 420 + i, { w: 2.2, color: rgba('ink', 0.6 * cells), amp: 2.4, taper: false });
          this.miniPlate(s, x + 84 + jx, y + 77 + jy, 128, 108, idx, 500 + i, cells);
        }
      }
    }

    // ---- and the loop home: the OPENING's own first drawing, on the opening's own camera, so the
    // film's last frame is its first frame and the video loops (crop marks included, see the return)
    if (park > 0.01) {
      openingStill(s, this.opening, park);
    }
    return { flash: 0.22 * clamp(1 - ring * 2) + 0.03 * snare, zoom: 1 + 0.006 * kick, frame: park, paper: 1 };
  }

  /**
   * A thumbnail of one earlier plate: a few strokes the eye reads as a picture. All 22 are distinct —
   * the flip-book claims 22 plates, so it draws 22.
   */
  private miniPlate(s: Sheet, cx: number, cy: number, w: number, h: number, idx: number, seed: number, a: number) {
    const col = rgba('ink', 0.7 * a);
    const k = idx % 22;
    const P = (p: V2[]) => s.stroke(p.map((q) => v2(cx + q.x, cy + q.y)), seed, { w: 2.0, color: col, amp: 1.8, taper: false });
    if (k === 0) P([v2(-w / 2, -h / 2), v2(w / 2, -h / 2 + 6), v2(w / 2 - 4, h / 2), v2(-w / 2 + 5, h / 2 - 4), v2(-w / 2, -h / 2)]);
    else if (k === 1) { P([v2(-52, 4), v2(-10, -18), v2(30, 4), v2(-2, 24), v2(-52, 4)]); P([v2(22, 4), v2(58, -16), v2(84, 4), v2(56, 22), v2(22, 4)]); }
    else if (k === 2) { P([v2(-56, -18), v2(-20, -22), v2(-34, 12), v2(0, 18), v2(52, 14)]); }
    else if (k === 3) P([v2(-50, 20), v2(-46, -16), v2(46, -20), v2(52, 18), v2(-50, 20)]);
    else if (k === 4) { for (let i = 0; i < 4; i++) P([v2(-46 + i * 30, 22), v2(-46 + i * 30, 22 - 12 - hash(seed + i, 3) * 26)]); }
    else if (k === 5) { P([v2(-34, 0), v2(-14, -22), v2(12, -12), v2(20, 8), v2(0, 20), v2(-20, 8), v2(-8, -6), v2(10, -2), v2(24, -14)]); }
    else if (k === 6) { P(this.ring(cx + 0, cy + 0, 30, 16, seed, 0.06).map((q) => v2(q.x - cx, q.y - cy))); P([v2(-8, -4), v2(-2, -4)]); P([v2(6, -4), v2(12, -4)]); }
    else if (k === 7) { for (let i = 0; i < 4; i++) P([v2(-46, -20 + i * 13), v2(46, -22 + i * 13)]); }
    else if (k === 8) { P([v2(-52, 20), v2(-16, 14), v2(14, 6), v2(40, -12)]); P([v2(34, -18), v2(48, -6), v2(34, 0)]); }
    else if (k === 9) { P([v2(0, 22), v2(0, -22)]); for (let i = 0; i < 3; i++) P([v2(0, -14 + i * 14), v2(-30 - i * 6, -22 + i * 14)]); }
    else if (k === 10) P([v2(-44, -20), v2(44, -16), v2(40, 22), v2(-40, 18), v2(-44, -20)]);
    else if (k === 11) P([v2(0, -20), v2(14, 0), v2(0, 20), v2(-14, 0), v2(0, -20)]);
    else if (k === 12) { P([v2(-52, -26), v2(52, -24), v2(50, 26), v2(-50, 24), v2(-52, -26)]); P([v2(-38, -8), v2(22, -10)]); P([v2(-38, 6), v2(30, 4)]); P([v2(26, 6), v2(44, 16), v2(24, 18), v2(26, 6)]); }
    else if (k === 13) { P([v2(-50, -18), v2(6, -18)]); P([v2(-50, 0), v2(34, 2)]); P([v2(-50, 18), v2(-4, 20)]); P([v2(18, -24), v2(18, 24)]); }
    else if (k === 14) { P([v2(-30, -20), v2(10, -18), v2(12, 16), v2(-16, 14), v2(-18, -6), v2(2, -8)]); P([v2(30, -22), v2(48, -20), v2(48, 8), v2(34, 6), v2(34, -4)]); P([v2(28, 16), v2(46, 18), v2(46, 24)]); }
    else if (k === 15) { P([v2(-52, 22), v2(-14, 12), v2(14, 2), v2(38, -14)]); P([v2(30, -22), v2(48, -6), v2(32, 2), v2(30, -22)]); }
    else if (k === 16) { for (let i = 0; i < 3; i++) P([v2(-44, -22 + i * 22), v2(44, -20 + i * 22), v2(44, -8 + i * 22), v2(-44, -10 + i * 22)]); P([v2(50, -20), v2(50, 20), v2(58, 20)]); }
    else if (k === 17) { for (let i = 0; i < 3; i++) P([v2(-42, -22 + i * 22), v2(42, -22 + i * 22)]); for (let i = 0; i < 3; i++) P([v2(-42 + i * 42, -22), v2(-42 + i * 42, 22)]); }
    else if (k === 18) { P([v2(-40, -22), v2(-32, 16), v2(38, 16), v2(30, -22), v2(-40, -22)]); P([v2(-14, -14), v2(-10, 8), v2(10, 8), v2(8, -14)]); P([v2(-52, 18), v2(52, 18)]); }
    else if (k === 19) { P([v2(-48, -20), v2(-44, 24), v2(30, 22), v2(34, -18)]); P([v2(-46, 2), v2(-26, 2), v2(-34, 12), v2(-26, 2)]); P([v2(-34, -10), v2(22, -12)]); }
    else if (k === 20) { P([v2(-50, 24), v2(48, -22)]); P([v2(-38, 14), v2(-33, 10)]); P([v2(-8, -2), v2(-3, -6)]); P([v2(26, -16), v2(31, -20)]); }
    else { P(this.ring(cx - 12, cy - 6, 30, 16, seed, 0.08).map((q) => v2(q.x - cx, q.y - cy))); P(this.ring(cx + 14, cy + 8, 24, 14, seed + 9, 0.08).map((q) => v2(q.x - cx, q.y - cy))); }
  }
}

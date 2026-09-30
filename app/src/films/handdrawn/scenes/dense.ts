// Plate 18 — “Post-Chinchilla, super-dense” → “RLHF goes askew”
//
// Typographic pressure, all of it drawn by hand. The plate is a framed drawing sheet, and it has its
// safe-area guides ruled straight onto it: paper edge, action safe, title safe, each labelled in tiny
// hand-lettering. On every half-beat the sung word is written on the sheet again — each copy a little
// larger and a little tighter — until the words pack into a solid slab that just fits inside the
// guides. On “Breaking through each safety fence” the words break the guides one at a time: the
// title-safe line snaps, then the action-safe line, then the paper edge, each drawn as a hand-ruled
// line with the pieces flying off, while a deadpan hand-lettered log keeps score in the corner.
// “Hundred thousand GPU” cuts to a top-down wafer of ruled cells flickering in waves; “RLHF goes
// askew” reveals that the whole drawing has been sitting on a tilting table all along — the camera
// rolls in notches on the kicks (stepped on the drawing index, never smoothed), the block of type
// slides downhill and piles up against the edge, and the words tilt with it. The bland mask rolls down
// the same slope: it slips, is jerked back by an “RLHF correction”, slips further — uncovering more of
// the hatched shoggoth under its trailing edge each time — and lands upside down, its smile a frown,
// while the REWARD MODEL panel falls 0.99 → 0.41 and the correction snaps it back.
//
// RULE 1 — every motion (the notch of the roll, the reveal of the table, the tumble of a card, the
//   flicker of a cell) is read at `heldT(t)` or seeded with `s.d`, so motion blur never smears them.
// RULE 2 — every ruled line re-rolls its wobble from `s.d` with its own seed; the whole sheet boils.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, TAU, heldT } from './_ink';
import type { V2 } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Line, Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import type { StrokeFontName } from '../../../engine/stroke';

const TECH = 'tech' as StrokeFontName;
const LYR = 'readable' as StrokeFontName;

// the three fences, inset from the sheet edge
const EDGE = 36, ACT = 104, TIT = 196;
// the slab's grid: the title-safe box, 3 x 3 copies of the word
const GX = TIT, GY = TIT;
const GW = W - 2 * TIT, GH = 884 - TIT;
const CW = GW / 3, CH = GH / 3;
const CAPY = 934;                     // the caption baseline

const rotP = (p: V2, cx: number, cy: number, a: number): V2 => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p.x - cx, dy = p.y - cy;
  return v2(cx + dx * cs - dy * sn, cy + dx * sn + dy * cs);
};
const mixP = (a: V2, b: V2, u: number): V2 => v2(lerp(a.x, b.x, u), lerp(a.y, b.y, u));

export default class Dense extends InkedScene {
  private lA = this.ctx.lyrics.get('Post-Chinchilla');
  private lB = this.ctx.lyrics.get('Breaking through each safety fence');
  private lC = this.ctx.lyrics.get('Hundred thousand GPU');
  private lD = this.ctx.lyrics.get('RLHF goes askew');

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, ht = heldT(t);
    const beat = 60 / (this.ctx.audio.bpm || 132);
    const tick = beat / 2;                              // half a beat: the slab's own clock
    const A0 = this.lA.words[0]!.start;                 // 115.20 — the first copy
    const B0 = this.lB.start;                           // 117.02 — the fences
    const C0 = this.lC.start;                           // 118.75 — the wafer
    const D0 = this.lD.start;                           // 120.76 — the tilt

    // ---- movement IV: the roll is taken in NOTCHES, and each notch in two drawn steps ------------
    const bi = this.beatIdx(ht);
    const b0 = this.beatIdx(D0 - 0.02);
    const kn = Math.max(0, bi - b0);
    const lastBeat = bi >= 0 ? this.ctx.audio.beats[bi]! : 0;
    const inD = t >= D0;
    const q = inD ? clamp(Math.floor((ht - lastBeat) / 0.115), 0, 2) / 2 : 0;   // two drawn steps
    const roll = inD ? (kn + q) * 0.030 : 0;
    const tilt = clamp(Math.abs(roll) / 0.24);
    s.setCam(W / 2, H / 2, 1 - 0.07 * tilt + 0.012 * f.a.kick, roll);

    // ---- the slab: one more copy of the sung word every half-beat, on the DRAWING's own clock -----
    // (RULE 1: the cell count must not change inside a drawing's shutter, or the slab pops off the twos)
    const placed = t < B0 ? clamp(Math.floor((ht - A0) / tick) + 1, 0, 9) : 9;
    const tb = [this.lB.words[1]!.start, this.lB.words[3]!.start, this.lB.words[4]!.start];
    // RULE 1: the break is a motion, so it is read at the drawing's own time, not at t
    const bk = tb.map((x) => clamp((ht - x) / 0.42));
    // each fence it breaks adds a surge: the black mass presses outward past the line it just broke
    const pad = bk.reduce((acc, b) => acc + 78 * b + 26 * ease.outBack(b), 0);
    const breaks = bk.filter((b) => b > 0).length;

    const wordAt = (ws: Word[], at: number) => {
      let best = ws[0]!;
      for (const w of ws) if (at >= w.start) best = w;
      return best;
    };
    const curWord = wordAt(this.lA.words, t);

    if (t < C0) {
      // ---- the ink the words are packing into: one ruled rect of ink per placed copy -------------
      for (let n = 0; n < placed; n++) {
        const x0 = GX + (n % 3) * CW, y0 = GY + Math.floor(n / 3) * CH;
        s.fill(
          [v2(x0 - pad, y0 - pad), v2(x0 + CW + pad, y0 - pad), v2(x0 + CW + pad, y0 + CH + pad), v2(x0 - pad, y0 + CH + pad)],
          200 + n * 3, rgba('ink', 0.94), { amp: 3.4 },
        );
      }
      // …and its hand-ruled boundary, following the copies that exist
      if (placed > 0) {
        s.stroke(this.slabOutline(placed, pad), 260, { closed: true, w: 3.4, color: rgba('ink', 0.72), overshoot: 8, amp: 3.2, taper: false });
      }

      // ---- the packed copies: paper letterforms carved out of the ink ----------------------------
      // each copy is a little larger and a little tighter than the last, and it collides when full
      for (let n = 0; n < placed; n++) {
        const w = wordAt(this.lA.words, A0 + n * tick);
        const fit = this.fitSize(w.w, CW - 34, CH * 0.66);
        const u = n / 8;
        const size = fit * (0.44 + 0.62 * u) * (1 + 0.06 * breaks);
        const trac = lerp(10, -size * 0.035, u);
        const cx = GX + (n % 3) * CW + CW / 2;
        const cy = GY + Math.floor(n / 3) * CH + CH / 2 + size * 0.30;
        const live = w === curWord && n === placed - 1;
        const p = live ? Lyrics.wordProgress(w, t) : 1;
        if (live && p < 1) {
          s.letterWritten(w.w, cx, cy, size, 300 + n * 3, 1, { font: LYR, align: 'center', tracking: trac, ghost: true, amp: size * 0.02 });
        }
        if (live) {
          s.letterWritten(w.w, cx, cy, size, 300 + n * 3, p, { font: LYR, align: 'center', tracking: trac, color: rgba('paper', 0.96), w: size * 0.08 });
        } else {
          s.letter(w.w, cx, cy, size, 300 + n * 3, { font: LYR, align: 'center', tracking: trac, color: rgba('paper', 0.96), w: size * 0.08, amp: size * 0.018 });
        }
      }
    }

    // ---- the engraving's furniture: this is one sheet from the first frame to the last -----------
    // (the ruler, the three guides and the log stay on the sheet through every movement, so the
    //  tilt in movement IV reads as the SHEET rolling while the table under it stays level)
    this.sheetFrame(s, d);
    // once the wafer is up the snapped guides step back: they are scenery by then, not the subject
    this.fences(s, d, ht, tb, bk, t >= C0 ? 0.55 : 1);
    this.log(s, ht, tb);

    // ---- movement III: a wafer of ruled cells, lit in waves that re-roll every drawing ------------
    if (t >= C0) this.wafer(s, d, ht, D0);

    // ---- movement IV: the block of type slides downhill and piles up ------------------------------
    if (inD) this.slide(s, d, ht, D0, tick, A0, wordAt);

    // ---- the camera furniture: the tilting table the sheet has been sitting on --------------------
    if (inD) this.table(s, d, ht, D0, roll);

    // ---- movement IV's subject: the bland mask rolling down the slope, and the panel scoring it --
    if (inD) {
      this.mask(s, ht, D0);
      this.reward(s, ht, D0);
    }

    // ---- the lyric: hand-lettered, word by word, on the sheet (so it tilts with everything else) --
    this.caption(s, t, d, t >= C0, t >= B0 && t < C0);

    s.text('18 — DENSE', 96, 62, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 118, 1030, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55) });

    return { flash: 0.025 * f.a.snare, zoom: 1 + 0.006 * f.a.kick, vignette: 0.2 };
  }

  // -------------------------------------------------------------------------------------------- //
  /** The sheet's furniture: a ruler of ticks along the paper edge and the corner register marks. */
  private sheetFrame(s: Sheet, d: number) {
    for (let i = 0; i <= 30; i++) {
      const x = EDGE + i * ((W - 2 * EDGE) / 30);
      const long = i % 5 === 0;
      s.stroke([v2(x, EDGE), v2(x, EDGE + (long ? 15 : 7))], 90 + i, { w: long ? 2 : 1.2, color: rgba('ink', 0.4), amp: 1, taper: false });
      if (long && i > 0 && i < 30) s.letter(`${i * 64}`, x, EDGE + 34, 15, 130 + i, { font: TECH, color: rgba('graphite', 0.7), align: 'center' });
    }
    for (const [cx, cy] of [[EDGE, EDGE], [W - EDGE, EDGE], [W - EDGE, H - EDGE], [EDGE, H - EDGE]] as [number, number][]) {
      for (let a = 0; a < 2; a++) {
        const ang = (a * Math.PI) / 2 + noise1(d * 0.9 + a, 5) * 0.02;
        s.stroke([v2(cx - Math.cos(ang) * 26, cy - Math.sin(ang) * 26), v2(cx + Math.cos(ang) * 26, cy + Math.sin(ang) * 26)], 40 + a, { w: 2, color: rgba('ink', 0.5), amp: 1.4, taper: false });
      }
      s.blob(cx, cy, 4, 44, { outline: { w: 0 }, colour: rgba('signal', 0.8), n: 10, jag: 0.2 });
    }
  }

  /** Outline of the ink so far: the copies exist in reading order, so the boundary is a staircase. */
  private slabOutline(n: number, pad: number): V2[] {
    const x0 = GX - pad, y0 = GY - pad;
    const full = Math.floor(n / 3), extra = n % 3;
    const pts: V2[] = [v2(x0, y0)];
    const rows = extra > 0 ? full + 1 : full;
    if (full > 0) { pts.push(v2(x0 + GW + 2 * pad, y0)); pts.push(v2(x0 + GW + 2 * pad, y0 + full * CH + 2 * pad)); }
    else pts.push(v2(x0 + extra * CW + 2 * pad, y0));
    if (extra > 0) {
      const yy = rows * CH + 2 * pad + GY - pad;
      if (full > 0) pts.push(v2(x0 + extra * CW + 2 * pad, y0 + full * CH + 2 * pad));
      pts.push(v2(x0 + extra * CW + 2 * pad, yy));
      pts.push(v2(x0, yy));
    } else {
      pts.push(v2(x0, y0 + full * CH + 2 * pad));
    }
    return pts;
  }

  /** The three guides. Each is hand-ruled until its word snaps it, then it is drawn in two halves. */
  private fences(s: Sheet, d: number, ht: number, tb: number[], bk: number[], m: number) {
    const rows: [number, number, number][] = [
      [TIT, tb[0]!, bk[0]!],
      [ACT, tb[1]!, bk[1]!],
      [EDGE, tb[2]!, bk[2]!],
    ];
    for (let k = 0; k < 3; k++) {
      const [i, at, b] = rows[k]!;
      const x0 = i, y0 = i, x1 = W - i, y1 = H - i;
      const corners = [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
      const push = 30 * ease.outBack(b);
      // a broken guide is drawn in the signal colour, so it reads both on the paper and on the ink
      // the words have packed into
      const snapped = rgba('signal', 0.88 * m);
      const whole = rgba(k === 2 ? 'ink' : 'ink2', 0.62);
      if (b <= 0) {
        s.stroke(corners, 300 + k * 11, { closed: true, w: k === 0 ? 3.2 : 2.6, color: whole, overshoot: 9, amp: 3, taper: false, a: m });
      } else {
        const gap = 0.09 + 0.045 * k;
        for (let e = 0; e < 4; e++) {
          const a = corners[e]!, b2 = corners[(e + 1) % 4]!;
          const nrm = [v2(0, -1), v2(1, 0), v2(0, 1), v2(-1, 0)][e]!;
          const off = v2(nrm.x * push, nrm.y * push);
          const jig = v2(nrm.x * push * 0.5 + hash(k, e, 1) * 6, nrm.y * push * 0.5 + hash(k, e, 2) * 6);
          const pa = mixP(a, b2, 0.5 - gap / 2), pb = mixP(a, b2, 0.5 + gap / 2);
          s.stroke([v2(a.x + off.x, a.y + off.y), v2(pa.x + jig.x, pa.y + jig.y)], 320 + k * 20 + e * 2, { w: 2.8, color: snapped, overshoot: 6, amp: 2.8, taper: false });
          s.stroke([v2(pb.x + jig.x, pb.y + jig.y), v2(b2.x + off.x, b2.y + off.y)], 321 + k * 20 + e * 2, { w: 2.8, color: snapped, overshoot: 6, amp: 2.8, taper: false });
        }
        // the pieces that flew off the snap, tumbling: a new angle every drawing (RULE 1)
        const age = ht - at;
        if (age > 0 && age < 0.9) {
          const life = 1 - age / 0.9;
          const snaps = [v2((x0 + x1) / 2, y0), v2(x1, (y0 + y1) / 2), v2((x0 + x1) / 2, y1), v2(x0, (y0 + y1) / 2)];
          for (let q2 = 0; q2 < 6; q2++) {
            const sp0 = snaps[q2 % 4]!;
            const nr = [v2(0, -1), v2(1, 0), v2(0, 1), v2(-1, 0)][q2 % 4]!;
            const sp = 110 + hash(k, q2, 5) * 250;
            const px = sp0.x + nr.x * sp * age + Math.cos(hash(d, k, q2) * TAU) * 40 * age;
            const py = sp0.y + nr.y * sp * age + 240 * age * age;
            const rot = hash(d, k * 9 + q2, 7) * TAU + age * 2.5;
            const L = 14 + hash(k, q2, 9) * 24;
            s.stroke([v2(px - Math.cos(rot) * L, py - Math.sin(rot) * L), v2(px + Math.cos(rot) * L, py + Math.sin(rot) * L)], 900 + k * 10 + q2, {
              w: 2.6, color: rgba('signal', 0.9 * life * m), amp: 2.2,
            });
          }
        }
      }
      // the label hangs off its own line once that line has been broken
      const nm = ['TITLE SAFE  90%', 'ACTION SAFE  93%', 'PAPER EDGE  1920 × 1080'][k]!;
      s.letter(nm, x0 + 14 + push * 0.7, y0 - 12 + push, 19, 350 + k, {
        font: TECH, color: b > 0 ? snapped : rgba('graphite', 0.85 * m), rot: b * 0.06, a: m,
      });
    }
  }

  /** A deadpan hand-lettered log of the failures, pinned in the corner. */
  private log(s: Sheet, ht: number, tb: number[]) {
    const x0 = 64, y0 = 944, x1 = 764, y1 = 1044;
    s.fill([v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)], 700, rgba('paper', 0.94), { amp: 2.4 });
    s.stroke([v2(x0 + 5, y0 + 5), v2(x1 + 5, y0 + 5), v2(x1 + 5, y1 + 5), v2(x0 + 5, y1 + 5)], 701, { closed: true, w: 1.6, color: rgba('ink', 0.18), amp: 2, taper: false });
    s.stroke([v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)], 702, { closed: true, w: 2.6, color: rgba('ink', 0.75), overshoot: 5, amp: 2.4, taper: false });
    const names = ['TITLE SAFE', 'ACTION SAFE', 'PAPER EDGE'];
    s.letter('BREAK LOG', x0 + 16, y0 + 24, 20, 710, { font: TECH, color: rgba('ink', 0.9) });
    let done = 0;
    for (let k = 0; k < 3; k++) {
      const on = ht >= tb[k]!;
      if (on) done++;
      const yy = y0 + 46 + k * 22;
      const col = on ? rgba('signal', 0.95) : rgba('graphite', 0.35);
      s.letter(`${k + 1}.`, x0 + 16, yy, 20, 720 + k, { font: TECH, color: col, a: on ? 1 : 0.45 });
      s.letter(names[k]!, x0 + 46, yy, 20, 730 + k, { font: TECH, color: col, a: on ? 1 : 0.45 });
      s.letter(on ? 'BROKEN' : 'pending', x0 + 300, yy, 20, 740 + k, { font: TECH, color: col, a: on ? 1 : 0.4 });
      if (on) {
        // a hand-drawn tick through it
        s.stroke([v2(x0 + 14, yy - 6), v2(x0 + 24, yy + 2), v2(x0 + 40, yy - 16)], 750 + k, { w: 2.6, color: rgba('signal', 0.9), amp: 1.6 });
      }
    }
    s.letter(`${done}/3 FENCES DOWN`, x1 - 16, y0 + 24, 20, 760, { font: TECH, color: rgba(done > 2 ? 'signal' : 'ink2', 0.9), align: 'right' });
  }

  /** Movement III: a wafer of ruled cells, lit in waves that re-roll on every drawing. */
  private wafer(s: Sheet, d: number, ht: number, D0: number) {
    const COLS = 36, ROWS = 21;
    const x0 = 200, y0 = 200, gw = W - 2 * x0, gh = 668;
    const cw = gw / COLS, ch = gh / ROWS;
    const fade = ht >= D0 ? 1 - clamp((ht - D0) / 1.9) : 1;
    if (fade <= 0.02) return;
    // the block lattice of the wafer, ruled, heavier every six cells
    for (let i = 0; i <= COLS; i += 6) {
      const x = x0 + i * cw;
      s.stroke([v2(x, y0), v2(x, y0 + gh)], 400 + i, { w: 2.4, color: rgba('ink', 0.42 * fade), amp: 1.6, taper: false });
    }
    for (let j = 0; j <= ROWS; j += 7) {
      const y = y0 + j * ch;
      s.stroke([v2(x0, y), v2(x0 + gw, y)], 440 + j, { w: 2.4, color: rgba('ink', 0.42 * fade), amp: 1.6, taper: false });
    }
    s.stroke([v2(x0, y0), v2(x0 + gw, y0), v2(x0 + gw, y0 + gh), v2(x0, y0 + gh)], 480, { closed: true, w: 3, color: rgba('ink', 0.6 * fade), overshoot: 7, amp: 2.8, taper: false });

    let lit = 0;
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const cx = x0 + (i + 0.5) * cw, cy = y0 + (j + 0.5) * ch;
        // two travelling waves, plus a per-drawing re-roll: the cells flicker on twos
        const wv = Math.sin(i * 0.30 + j * 0.24 - ht * 3.1) * 0.5 + Math.sin(i * 0.12 - j * 0.36 + ht * 1.9) * 0.5;
        const v = wv + (hash(d, i * 3 + 1, j * 5 + 2) - 0.5) * 0.62;
        const seed = 500 + i * 37 + j * 3;
        if (v > 0.34) {
          lit++;
          const it = clamp((v - 0.34) / 0.85);
          const len = (7 + cw * 0.86 * it) * fade;
          s.stroke([v2(cx - len / 2, cy), v2(cx + len / 2, cy)], seed, {
            w: 1.4 + 3.4 * it, color: rgba('ink', (0.22 + 0.6 * it) * fade), amp: 1.1, taper: false,
          });
          if (v > 0.94 && it > 0.6) {
            // the brightest cells are drawn as an actual die
            const r = cw * 0.30;
            s.stroke([v2(cx - r, cy - r), v2(cx + r, cy - r), v2(cx + r, cy + r), v2(cx - r, cy + r)], seed + 1, {
              closed: true, w: 1.8, color: rgba('ink', 0.75 * fade), amp: 1.2, taper: false,
            });
          }
        } else {
          s.stroke([v2(cx - 2.5, cy), v2(cx + 2.5, cy)], seed, { w: 1, color: rgba('ink', 0.11 * fade), amp: 0.7, taper: false });
        }
      }
    }
    // the deadpan readout: a live count of what is lit
    const n = `${lit}`.padStart(4, '0');
    s.letter(`LIT ${n}`, x0 + gw, y0 - 16, 22, 900, { font: TECH, color: rgba('ink', 0.85), align: 'right' });
    s.letter('GPU × 100,000', x0, y0 - 16, 22, 902, { font: TECH, color: rgba('ink', 0.85) });
    s.letter('wafer map  /  cells flicker on twos', x0, y0 + gh + 26, 19, 904, { font: TECH, color: rgba('graphite', 0.85) });
  }

  /** Movement IV: the block of type that has been packed all along slides downhill and piles up. */
  private slide(s: Sheet, d: number, ht: number, D0: number, tick: number, A0: number, wordAt: (ws: Word[], at: number) => Word) {
    const N = 8, cw = 322, chh = 106;
    for (let n = 0; n < N; n++) {
      const t0 = D0 + 0.06 + n * tick;
      if (ht < t0) continue;
      const age = ht - t0;
      const rest = 884 - 20 * n;
      const yTop = 104 - 58 * n;
      const y = Math.min(yTop + chh / 2 + 780 * age * age, rest);
      const moving = y < rest - 0.5;
      const x = 268 + (n % 4) * 336 + noise1(n * 2.3, 7) * 44;
      const rot = moving
        ? (hash(d, n, 3) - 0.5) * 0.5                       // tumbles a new way every drawing (RULE 1)
        : (n % 2 ? 0.055 : -0.045) + noise1(n * 1.7, 11) * 0.05;
      const pts = [v2(-cw / 2, -chh / 2), v2(cw / 2, -chh / 2), v2(cw / 2, chh / 2), v2(-cw / 2, chh / 2)].map((p) => rotP(v2(x + p.x, y + p.y), x, y, rot));
      s.fill(pts, 600 + n, rgba('paper', 0.96), { amp: 2.6 });
      s.stroke(pts, 601 + n, { closed: true, w: 2.6, color: rgba('ink', 0.8), overshoot: 4, amp: 2.6, taper: false });
      const w = wordAt(this.lA.words, A0 + n * tick);
      const sz = this.fitSize(w.w, cw - 30, 44);
      // letter by letter, so the word leans with the card and scatters as the pile grows (a single
      // `s.letter(..., {rot})` would turn about the word's left end and throw it off the card)
      const drift = moving ? 0.28 : 0.1 + clamp((ht - t0 - 1.2) / 4) * 0.5;
      this.writeLoose(s, w.w, x, y + sz * 0.3, sz, 1, 620 + n * 4, drift, d, rgba('ink', 0.9), rot);
    }
  }

  /** The table: pinned to the camera, because the camera is riding it. */
  private table(s: Sheet, d: number, ht: number, D0: number, roll: number) {
    const rev = clamp((ht - D0 + 0.06) / 0.42);          // the reveal, in drawn steps
    const drop = (1 - ease.outCubic(rev)) * 300;
    const p = (x: number, y: number) => s.pin(x, y + drop);
    // the table's top edge, sagging slightly where the sheet's weight is
    const e0 = p(24, 1004), e1 = p(620, 1014), e2 = p(1300, 1014), e3 = p(1896, 1002);
    s.stroke([e0, e1, e2, e3], 950, { w: 3.6, color: rgba('ink', 0.78), amp: 2.6, taper: false });
    s.stroke([v2(e0.x, e0.y + 12), v2(e1.x, e1.y + 12), v2(e2.x, e2.y + 12), v2(e3.x, e3.y + 12)], 951, { w: 1.8, color: rgba('ink', 0.35), amp: 2.2, taper: false });
    // the wedge under the high side: the whole tilt is one borrowed book
    const propH = 12 + 150 * clamp(roll / 0.24);
    const q0 = p(1560, 1012), q1 = p(1870, 1010), q2 = p(1876, 1012 + propH), q3 = p(1560, 1014 + propH * 0.72);
    s.fill([q0, q1, q2, q3], 960, rgba('shade', 0.4), { amp: 2.6 });
    s.stroke([q0, q1, q2, q3], 961, { closed: true, w: 3, color: rgba('ink', 0.75), overshoot: 5, amp: 2.8, taper: false });
    s.letter('PROP: 1 BOOK', p(1500, 1000).x, p(1500, 1000).y - 14, 19, 964, { font: TECH, color: rgba('ink2', 0.85), align: 'right', rot: -roll });
    s.letter('TILT TABLE  /  SHEET 18', p(64, 988).x, p(64, 988).y, 19, 966, { font: TECH, color: rgba('ink2', 0.85), rot: -roll });
    // roll the camera and the bubble leaves the middle: the drawing is the thing that is wrong
    const lx = 1600, ly = 60, lw = 260, lh = 46;
    // every corner goes through pin(), so the vial stays square to the SCREEN however the sheet rolls
    const vA = p(lx, ly), vB = p(lx + lw, ly), vC = p(lx + lw, ly + lh), vD = p(lx, ly + lh);
    s.stroke([vA, vB, vC, vD], 970, { closed: true, w: 2.6, color: rgba('ink', 0.7), overshoot: 4, amp: 2.2, taper: false });
    const mid = (lx + lw / 2);
    s.stroke([p(mid - 24, ly + 8), p(mid - 24, ly + lh - 8)], 972, { w: 1.8, color: rgba('ink', 0.5), amp: 1.2, taper: false });
    s.stroke([p(mid + 24, ly + 8), p(mid + 24, ly + lh - 8)], 973, { w: 1.8, color: rgba('ink', 0.5), amp: 1.2, taper: false });
    const bx = mid - roll * 620 + noise1(d * 1.4, 91) * 2.5;
    s.blob(p(bx, ly + lh / 2).x, p(bx, ly + lh / 2).y, 13, 980, { colour: rgba('signal', 0.9), n: 18, jag: 0.12, outline: { w: 1.8 } });
    const deg = roll * 180 / Math.PI;
    s.letter(`${deg.toFixed(1)}°`, p(lx + lw + 16, ly + 30).x, p(lx + lw + 16, ly + 30).y, 24, 982, { font: TECH, color: rgba('ink', 0.9), rot: -roll });
    s.letter(deg > 6 ? 'ASKEW' : deg > 1 ? 'tilting' : 'LEVEL', p(lx, ly - 12).x, p(lx, ly - 12).y, 20, 984, { font: TECH, color: rgba(deg > 6 ? 'signal' : 'ink2', 0.9), rot: -roll });
  }

  /** Movement IV's subject: the bland mask rolling down the slope. Two slips, each pulled back by an
   *  RLHF correction, then the long one that lands it upside down — and the hatched mass it uncovers
   *  under its trailing edge grows with every slip. */
  private mask(s: Sheet, ht: number, D0: number) {
    const T0 = ht - D0;
    // the run, as one number: + slips downhill, - the corrections jerk it back up
    const md = clamp(
      ease.inCubic(clamp((T0 - 0.10) / 0.60)) * 0.34
      - ease.outCubic(clamp((T0 - 0.95) / 0.14)) * 0.08
      + ease.inCubic(clamp((T0 - 1.20) / 0.60)) * 0.46
      - ease.outCubic(clamp((T0 - 2.05) / 0.12)) * 0.06
      + ease.inCubic(clamp((T0 - 2.30) / 0.65)) * 0.34,
    );
    const hop = 30 * Math.sin(Math.PI * clamp((T0 - 2.95) / 0.30));   // it comes down on its back
    const mx = 300 + 1130 * md, my = 762 - hop;
    const spin = md * Math.PI * 3;                                    // three half-turns: upside down
    // what it has been covering: our own shoggoth, suggested as hatched wobbly mass, nothing more
    if (md > 0.02) {
      const R = 60 + 150 * md;
      const m = s.blob(mx - 70 * md, my + 26, R, 310, { jag: 0.13, n: 30, outline: { w: 2.4, color: rgba('ink', 0.6), amp: R * 0.05 } });
      s.hatch(m, 312, { spacing: 16, angle: -Math.PI / 3.1 + 0.4 * noise1(s.d * 1.3, 4), color: rgba('ink', 0.4), w: 1.3 });
    }
    // the mask: a flat bone disc, two dot eyes, one curve — the single cartoon face the film allows
    s.blob(mx, my, 88, 320, { colour: rgba('paper', 0.98), jag: 0.02, n: 38, outline: { w: 3.2, color: rgba('ink', 0.9), amp: 2.6 } });
    for (const [ex, ey] of [[-33, -24], [33, -24]] as [number, number][]) {
      const e = rotP(v2(mx + ex, my + ey), mx, my, spin);
      s.blob(e.x, e.y, 9, 330 + ex, { colour: rgba('ink'), n: 12, jag: 0.14, outline: { w: 0 } });
    }
    // the curve is one arc; rotated by a half-turn it reads as the frown it lands with
    s.arc(mx, my, 51, Math.PI * 0.16 + spin, Math.PI * 0.84 + spin, 340, { w: 3, color: rgba('ink', 0.9), amp: 2.2 });
    s.letter('MASK', mx, my - 112, 19, 350, { font: TECH, color: rgba('ink2', 0.8), align: 'center' });
  }

  /** Movement IV's score: the REWARD MODEL panel falls 0.99 → 0.41 and the correction snaps it back. */
  private reward(s: Sheet, ht: number, D0: number) {
    const T0 = ht - D0;
    const fall = clamp(ease.inCubic(clamp((T0 - 0.18) / 0.42)) - ease.outCubic(clamp((T0 - 0.82) / 0.16)));
    const v = 0.99 - 0.58 * fall;
    const x0 = 1176, y0 = 128, x1 = 1690, y1 = 320;
    const box = [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
    s.fill(box, 800, rgba('paper', 0.96), { amp: 2.6 });
    s.stroke([v2(x0 + 5, y0 + 5), v2(x1 + 5, y0 + 5), v2(x1 + 5, y1 + 5), v2(x0 + 5, y1 + 5)], 801, { closed: true, w: 1.6, color: rgba('ink', 0.18), amp: 2, taper: false });
    s.stroke(box, 802, { closed: true, w: 2.8, color: rgba('ink', 0.78), overshoot: 5, amp: 2.4, taper: false });
    s.letter('REWARD MODEL', x0 + 16, y0 + 36, 24, 805, { font: TECH, color: rgba('ink', 0.88) });
    s.letter('RLHF correction', x0 + 16, y0 + 62, 19, 806, { font: TECH, color: rgba('graphite', 0.9) });
    s.letter(v.toFixed(2), x1 - 18, y0 + 140, 66, 810, { font: TECH, color: rgba(fall > 0.04 ? 'signal' : 'ink', 0.94), align: 'right' });
    // the bar it falls along, with the 0.41 mark it drops to drawn on it
    const bx = x0 + 16, by = y1 - 36, bw = x1 - 18 - bx;
    s.stroke([v2(bx, by), v2(bx + bw, by)], 815, { w: 2.4, color: rgba('ink', 0.4), taper: false });
    s.stroke([v2(bx, by), v2(bx + bw * clamp(v), by)], 816, { w: 10, color: rgba(fall > 0.04 ? 'signal' : 'ink', 0.85), amp: 1.6, taper: false });
    s.stroke([v2(bx + bw * 0.41, by - 12), v2(bx + bw * 0.41, by + 12)], 817, { w: 1.8, color: rgba('graphite', 0.7), taper: false });
  }

  // -------------------------------------------------------------------------------------------- //
  /** The lyric: hand-lettered on the sheet, word by word, ghosted ahead of the voice. */
  private caption(s: Sheet, t: number, d: number, card: boolean, onInk: boolean) {
    const y = CAPY;
    const line: Line = t < this.lB.start ? this.lA : t < this.lC.start ? this.lB : t < this.lD.start ? this.lC : this.lD;
    const words = line.words;
    const size = 52, gap = 17;
    const loose = line === this.lD && words.length > 2;          // “askew” is allowed to come apart
    const widths = words.map((w, i) => this.sheet.measureLetter(w.w, LYR, size) + (loose && i >= 2 ? 40 : 0));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    const x0 = (W - total) / 2;
    if (card) {
      const cx0 = x0 - 42, cx1 = x0 + total + 42;
      s.fill([v2(cx0, y - 62), v2(cx1, y - 62), v2(cx1, y + 34), v2(cx0, y + 34)], 880, rgba('paper', 0.95), { amp: 2.6 });
      s.stroke([v2(cx0 + 5, y - 57), v2(cx1 + 5, y - 57), v2(cx1 + 5, y + 39), v2(cx0 + 5, y + 39)], 881, { closed: true, w: 1.5, color: rgba('ink', 0.16), amp: 2, taper: false });
      s.stroke([v2(cx0, y - 62), v2(cx1, y - 62), v2(cx1, y + 34), v2(cx0, y + 34)], 882, { closed: true, w: 2.8, color: rgba('ink', 0.7), overshoot: 6, amp: 2.6, taper: false });
    }
    let x = x0;
    // over the packed ink the line is written in paper, with the hot colour for the word being sung
    const done0 = onInk ? rgba('paper', 0.96) : rgba('ink');
    const hot0 = onInk ? rgba('ember') : rgba('signal');
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      const active = p > 0 && p < 1;
      const col = active ? hot0 : done0;
      if (loose && i >= 2) {
        this.writeLoose(s, w.w, x + widths[i]! / 2, y, size, p, 400 + i * 6, 0.55, d, col, 0);
      } else {
        if (p < 1) s.letterWritten(w.w, x, y, size, 400 + i * 6, 1, { font: LYR, ghost: true, color: onInk ? rgba('paper') : rgba('ink') });
        s.letterWritten(w.w, x, y, size, 400 + i * 6, p, { font: LYR, color: col, w: size * 0.085 });
      }
      x += widths[i]! + gap;
    }
    // one hand-ruled rule under the whole line, growing with the line
    const lp = clamp(Lyrics.lineCharProgress(line, t) / Math.max(1, line.text.length));
    if (lp > 0.02) {
      s.stroke([v2(x0 - 10, y + 20), v2(x0 - 10 + (total + 20) * lp, y + 20)], 470, { w: 2.6, color: onInk ? rgba('ember', 0.8) : rgba('signal', 0.75), amp: 2.4, overshoot: 5, taper: false });
    }
  }

  /** Write a word letter by letter, letting the letters come apart and lean as they are drawn. */
  private writeLoose(s: Sheet, text: string, cx: number, base: number, size: number, p: number, seed: number, drift: number, d: number, colour: string, lean: number) {
    const chars = Array.from(text);
    const gap = drift * size * 0.2;
    const adv = chars.map((c) => s.measureLetter(c, LYR, size));
    const total = adv.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let x = cx - total / 2;
    const done = clamp(p) * chars.length;
    for (let i = 0; i < chars.length; i++) {
      const u = chars.length > 1 ? i / (chars.length - 1) : 0;
      const pull = drift * (0.3 + u * 1.7);
      const jx = noise1(d * 1.1 + i * 3.3, seed + 5) * pull * 26;
      const jy = noise1(d * 1.4 + i * 2.1, seed + 9) * pull * 34 * (0.25 + u);
      const rr = lean + noise1(d * 0.8 + i * 1.7, seed + 3) * pull * 0.55;
      const pi = clamp(done - i);
      if (pi > 0) {
        s.letterWritten(chars[i]!, x + jx, base + jy, size, seed + i * 4, pi, { font: LYR, color: colour, w: size * 0.085, rot: rr });
      } else {
        s.letterWritten(chars[i]!, x + jx, base + jy, size, seed + i * 4, 1, { font: LYR, ghost: true, rot: rr });
      }
      x += adv[i]! + gap;
    }
  }

  /** Largest hand-lettered size that keeps `text` inside a box. */
  private fitSize(text: string, maxW: number, maxH: number) {
    const w = this.sheet.measureLetter(text, LYR, 100);
    return clamp(w > 1 ? (maxW / w) * 100 : maxH * 0.6, 8, maxH);
  }

  /** Index of the last beat at or before t (for the notch clock). */
  private beatIdx(t: number) {
    const b = this.ctx.audio.beats;
    let i = -1;
    for (let k = 0; k < b.length; k++) { if (b[k]! <= t) i = k; else break; }
    return i;
  }
}

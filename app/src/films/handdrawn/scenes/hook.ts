// Plate — Hook. "I'm upping my P(doom)", one word per sung word, full frame.
// One module serves four timeline entries via ctx.params.n: four stages of the SAME drawing getting out
// of hand — clean, re-outlined on a signal field, hairline, multiplied — with the number
// 0.15 → 0.42 → 0.81 → 0.99 as its own beat. Motif 4: on the sung "P(doom)" the readout LEAVES its
// corner and blows up to full frame (label, hand-lettered digits, hand-ruled tick bar) as it rolls to
// the new value, then shrinks back. "UPPING" literally rises: the row shoots up from below, stretched
// tall, and lands on the beat. Stage 2 inverts to a flat signal field with ink type; stage 4 multiplies
// its digits (0.99999…). Everything is re-drawn each drawing (seeded by s.d), and every motion that
// steps — the rise, the roll — is quantised through heldT(t), so nothing smears in the export.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, resample, type V2, type InkOpts } from './_ink';
import { strokeText } from '../../../engine/stroke';
import { Lyrics } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The value each stage rolls TO; stage 1 rolls from the film's opening 0.02. */
const VAL = [0.15, 0.42, 0.81, 0.99];
/** The readout's local box (px at k = 1): label over a hand-ruled tick bar, the digits to the right. */
const RBW = 560, RBH = 210;
/** Where each stage's readout sits (and how big it is) while it is in its corner. */
const CORNER: [number, number, number][] = [[112, 126, 0.5], [112, 118, 0.52], [112, 128, 0.4], [112, 116, 0.62]];
/** The blow-up: the readout at full frame — k, and the local origin that puts it full-width with its
 *  bar just clear of the bottom lyric row, so the sung "P(DOOM)" stays readable under it. */
const KFULL = 3.4, FX = W / 2 - (RBW * KFULL) / 2, FY = 104;

export default class Hook extends InkedScene {
  private n = clamp(Number(this.ctx.params.n ?? 1), 1, 4) as 1 | 2 | 3 | 4;
  private line = this.ctx.lyrics.get("I'm upping my P(doom)", this.n - 1);

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, n = this.n;
    const ls = this.line.start;
    const words = this.line.words;
    const NW = Math.max(1, words.length);
    const font = 'readable' as const;
    const prevVal = n === 1 ? 0.02 : VAL[n - 2]!;
    const newVal = VAL[n - 1]!;
    const size = n === 3 ? 150 : n === 4 ? 236 : 224;
    // the rows follow the lyric's own word count (today always four) so changed lyric data cannot
    // produce NaN geometry: with more words they simply pack tighter
    const rowTop = n === 3 ? 342 : 272;
    const rowStep = (n === 3 ? 170 : 214) * (NW > 4 ? 4 / NW : 1);
    const uIdx = words.findIndex((w) => /upp/i.test(w.w));
    const rIdx = uIdx >= 0 ? uIdx : Math.min(1, NW - 1);
    const pIdx = words.findIndex((w) => /doom/i.test(w.w));
    const pw = words[pIdx >= 0 ? pIdx : NW - 1]!;

    // stage 2 is the inversion: the sheet is a flat signal field and everything on it is ink and paper
    // (the treatment's "ink on signal-orange field, heavier"). The margin covers the camera's push.
    if (n === 2) s.fill([v2(-280, -280), v2(W + 280, -280), v2(W + 280, H + 280), v2(-280, H + 280)], 12, rgba('signal'), { amp: 7 });

    // the camera holds; only at the last stage does the sheet start to shake, and then only on twos
    s.setCam(W / 2, H / 2, 1 + (n === 4 ? 0.022 : 0.01) * ease.outCubic(f.p), n === 4 ? 0.004 * noise1(d * 1.1, 5) : 0);

    this.frame(s, n);
    if (n === 4) this.digitWall(s, ls, t);

    // ------------------------------------------------------------ the ruled box (stages 1 and 2)
    const bp = prog(t, f.start + 0.02, f.start + 0.5, ease.outCubic);
    if (n === 1) this.ruleBox(s, 500, 92, 1420, 1014, 100, bp, { w: 3.4, color: rgba('ink', 0.85) });
    if (n === 2) {
      this.ruleBox(s, 500, 92, 1420, 1014, 100, bp, { w: 3.4, color: rgba('ink', 0.85) });
      this.ruleBox(s, 492, 100, 1428, 1006, 106, bp, { w: 1.8, color: rgba('ink', 0.45), amp: 3.6 });
      this.ruleBox(s, 508, 84, 1412, 1022, 112, Math.max(0, bp - 0.25) * 1.33, { w: 2.2, color: rgba('ink', 0.32), amp: 4.2 });
    }
    if (n === 3) {
      // no box: just the four registration marks the paper was aligned to
      for (const [cx, cy, sx, sy] of [[300, 132, 1, 1], [1620, 132, -1, 1], [300, 972, 1, -1], [1620, 972, -1, -1]] as const) {
        s.stroke([v2(cx + 34 * sx, cy), v2(cx, cy)], 60, { w: 1.6, color: rgba('graphite', 0.5), amp: 1.6 });
        s.stroke([v2(cx, cy), v2(cx, cy + 34 * sy)], 61, { w: 1.6, color: rgba('graphite', 0.5), amp: 1.6 });
      }
    }

    // ------------------------------------------------------------ the line, one word per sung word
    const widths = words.map((w) => s.measureLetter(w.w, font, size));
    const reps: [number, number][] = n === 2
      ? [[6, -5], [-7, 6], [9, 3]]
      : [[-10, -8], [9, -7], [7, 10], [-8, 9]];
    const hair = n === 3;

    for (let i = 0; i < NW; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      let yy = rowTop + i * rowStep + noise1(d * 1.1 + i * 3.3, 21) * (n === 3 ? 3.4 : 2.0);
      let ys = 1;
      if (i === rIdx) {
        // UPPING rises: the row shoots up from below, stretched tall through the middle of the flight,
        // and lands on the beat at its own word's end — quantised through the drawing clock (RULE 1)
        const flight = 1 - ease.outCubic(prog(heldT(t), w.start - 0.05, w.end));
        yy += 220 * flight;
        ys = 1 + 0.85 * Math.sin(Math.PI * flight);
      }

      // stage 4: the letterform is worked solid before the pen goes round again
      if (n === 4 && p > 0.02) {
        const hw = widths[i]! / 2 + 10;
        const hh = size * 0.78 * ys;
        s.hatch(
          [v2(W / 2 - hw, yy - hh), v2(W / 2 + hw, yy - hh), v2(W / 2 + hw, yy + size * 0.16), v2(W / 2 - hw, yy + size * 0.16)],
          400 + i * 11,
          { spacing: 11, angle: -Math.PI / 3.2 + i * 0.22, color: rgba('ink', 0.3 * Math.min(1, p * 3)), w: 1.4 },
        );
      }

      if (p < 1) {
        if (i === rIdx) this.riseWord(s, w.w, W / 2, yy, size, 100 + i * 5, 1, ys, { ghost: true });
        else s.letterWritten(w.w, W / 2, yy, size, 100 + i * 5, 1, { font, align: 'center', ghost: true });
      }
      if (i === rIdx) {
        this.riseWord(s, w.w, W / 2, yy, size, 100 + i * 5, p, ys, {
          colour: hair ? rgba('ink', 0.68) : rgba('ink'),
          w: hair ? size * 0.018 : size * 0.075,
        });
      } else {
        s.letterWritten(w.w, W / 2, yy, size, 100 + i * 5, p, {
          font, align: 'center',
          color: hair ? rgba('ink', 0.68) : rgba('ink'),
          w: hair ? size * 0.018 : size * 0.075,
          amp: hair ? size * 0.05 : size * 0.012,
        });
      }

      // the pen went round again: stage 2 twice more, stage 4 into a scribble
      if (n === 2 || n === 4) {
        for (let k = 0; k < reps.length; k++) {
          if (p <= 0) break;
          const r = reps[k]!;
          s.letterWritten(w.w, W / 2 + r[0], yy + r[1], size, 150 + k * 9 + i * 5, p, {
            font, align: 'center',
            color: rgba(k === reps.length - 1 && n === 4 ? 'signal' : 'ink', (n === 2 ? 0.5 : 0.46) - k * 0.08),
            w: size * (0.055 + k * 0.008),
            amp: size * (0.016 + k * 0.004),
          });
        }
      }
    }

    // ------------------------------------------------------------ the number, its own beat
    // motif 4: on the sung "P(doom)" the corner readout leaves its corner and blows up to full frame
    // as it rolls to the new value, then shrinks back. Hooks 2 and 3 are cut before the word's own end
    // (the next plate takes the downbeat on the beat), so the beat is squeezed into what this window has.
    const pEnd = Math.max(pw.start + 0.2, Math.min(pw.end, f.end - 0.04));
    const span = pEnd - pw.start;
    const open = prog(t, pw.start, pw.start + span * 0.34, ease.outExpo);
    const back = prog(t, pEnd - span * 0.3, pEnd - span * 0.05, ease.inCubic);
    const u = clamp(open) * (1 - clamp(back));
    const rolled = prog(heldT(t), pw.start + span * 0.3, pEnd - span * 0.26, ease.outCubic);
    const rollQ = t >= pEnd ? 1 : clamp(Math.floor(rolled * 10) / 10);
    const shown = prevVal + (newVal - prevVal) * rollQ;
    const C = CORNER[n - 1]!;
    const k = lerp(C[2], KFULL, u);
    const rx = lerp(C[0], FX, u), ry = lerp(C[1], FY, u);
    // stage 4's digits multiply: once the value has rolled they keep growing nines (0.99999…)
    const saturated = n === 4 && t >= pw.start + span * 0.62;
    const digits = saturated ? `0.${'9'.repeat(2 + Math.floor(clamp(prog(t, pw.start, pEnd)) * 2))}…` : shown.toFixed(2);
    const style = [
      { ink: rgba('ink', 0.92), bar: rgba('ink', 0.85), fill: rgba('signal', 0.92), hv: 1.0, reps: 1, strobe: false, a: 1 },
      { ink: rgba('ink', 0.95), bar: rgba('ink', 0.9), fill: rgba('ink', 0.9), hv: 1.55, reps: 1, strobe: false, a: 1 },
      { ink: rgba('ink', 0.34), bar: rgba('graphite', 0.4), fill: rgba('graphite', 0.34), hv: 0.16, reps: 1, strobe: false, a: 0.8 },
      { ink: rgba('ink', 0.92), bar: rgba('ink', 0.88), fill: rgba('signal', 0.95), hv: 1.25, reps: 3, strobe: true, a: 1 },
    ][n - 1]!;
    // the corner version is still written by hand: the value arrives in the hand's own time
    const wp = t >= pw.start ? 1 : prog(t, ls + 0.16, ls + 0.62, ease.outCubic);
    this.readout(s, rx, ry, k, { digits, frac: clamp(shown), wp, ...style });

    const label = n === 2 ? rgba('ink', 0.85) : rgba('graphite', 0.9);
    s.text(`HOOK ${n}/4`, 96, 1004, { size: 19, fam: 'Plex-400', color: label });
    s.text(`d${d}`, W - 118, 1004, { size: 19, fam: 'Plex-400', color: n === 2 ? rgba('ink', 0.6) : rgba('graphite', 0.55) });

    // ------------------------------------------------------------ post: flat cel, a punch at the last stage
    if (n === 4) {
      return {
        flash: 0.03 * clamp(f.a.snare),
        zoom: 1 + 0.006 * clamp(f.a.kick),
        shake: [noise1(d * 1.3, 3) * 7, noise1(d * 1.9, 9) * 7],
      };
    }
    return { flash: n === 2 ? 0.015 * clamp(f.a.snare) : 0 };
  }

  // ------------------------------------------------------------------ furniture
  /** The cel border. Stages 2 and 4 draw it more than once. */
  private frame(s: Sheet, n: 1 | 2 | 3 | 4) {
    const o: InkOpts = { w: 3.4, color: rgba('ink', 0.7), overshoot: 6, amp: 3.0 };
    s.rect(64, 46, W - 64, H - 46, 900, o);
    if (n === 2) s.rect(56, 54, W - 56, H - 54, 902, { w: 1.6, color: rgba('ink', 0.35), amp: 4.0 });
    if (n === 3) s.rect(64, 46, W - 64, H - 46, 904, { w: 1.2, color: rgba('graphite', 0.5), amp: 7.0 });
    if (n === 4) { s.rect(56, 54, W - 56, H - 54, 906, { w: 2.0, color: rgba('ink', 0.45), amp: 5.0 }); s.rect(72, 38, W - 72, H - 38, 908, { w: 1.6, color: rgba('ink', 0.3), amp: 5.4 }); }
  }

  /** A hand-ruled box, drawn up to `p` of its perimeter: the hand goes round, a machine closes in. */
  private ruleBox(s: Sheet, x0: number, y0: number, x1: number, y1: number, seed: number, p: number, o: InkOpts) {
    if (p <= 0.005) return;
    const pts = resample([v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1), v2(x0, y0)], 22);
    const cut = Math.max(2, Math.ceil(pts.length * clamp(p)));
    s.stroke(pts.slice(0, cut), seed, { w: 3.0, color: rgba('ink', 0.85), amp: 2.6, overshoot: 6, ...o });
  }

  /**
   * The P(doom) readout — label, hand-lettered digits and a hand-ruled tick bar — laid out in one local
   * box so the SAME drawing can sit in its corner, leave it, and blow up to full frame (motif 4).
   * `k` scales the box; the digits are written up to `wp`, so in its corner the number still arrives in
   * the hand's own time. `hv` is the stage's line weight, and is how the escalation (clean / heavier /
   * hairline / multiplied) reads here.
   */
  private readout(s: Sheet, x: number, y: number, k: number, o: {
    digits: string; frac: number; ink: string; bar: string; fill: string;
    hv: number; wp: number; a: number; reps: number; strobe: boolean;
  }) {
    const lx = (u: number) => x + u * k, ly = (v: number) => y + v * k;
    const wDig = 122 * k * 0.075 * o.hv, wLab = 44 * k * 0.075 * o.hv;
    const by = ly(RBH - 30);
    // the tick bar: a hand-ruled rule, ten ticks, the filled part up to the value, a knob on the mark
    s.stroke([v2(lx(6), by), v2(lx(RBW - 6), by)], 140, { w: wDig * 1.5, color: o.bar, amp: 2.4 * k, taper: false, a: o.a });
    for (let i = 0; i <= 10; i++) {
      const tx = lx(lerp(6, RBW - 6, i / 10)), tall = i % 5 === 0;
      s.stroke([v2(tx, by - (tall ? 16 : 9) * k), v2(tx, by + (tall ? 6 : 4) * k)], 150 + i, {
        w: wDig * (tall ? 0.55 : 0.32), color: o.bar, amp: 1.1 * k, taper: false, a: o.a,
      });
    }
    const fx = lx(lerp(6, RBW - 6, clamp(o.frac)));
    s.stroke([v2(lx(6), by), v2(fx, by)], 190, { w: wDig * 2.6, color: o.fill, amp: 2.0 * k, taper: false, a: o.a });
    s.blob(fx, by, 9 * k, 191, { colour: o.fill, n: 14, jag: 0.16, fillA: o.a, outline: { w: wDig * 0.5, color: o.bar } });
    s.letter('P(DOOM)', lx(6), ly(46), 44 * k, 195, { font: 'readable', color: o.ink, w: wLab, a: o.a * 0.92 });
    // stage 4 stacks the digits and strobes them: a new flicker every drawing (RULE 2)
    for (let r = o.reps - 1; r >= 0; r--) {
      const strobe = o.strobe && hash(s.d * 1.7 + r, 3) < 0.4 ? 0.3 : 1;
      s.letterWritten(o.digits, lx(RBW - 6) + r * 6 * k, ly(152) + r * 5 * k, 122 * k, 200 + r * 7, o.wp, {
        font: 'readable', align: 'right', color: o.ink, w: wDig, a: o.a * strobe * (r === 0 ? 1 : 0.5),
      });
    }
  }

  /**
   * Write a word with a vertical scale about its baseline — the one thing the Sheet's letterer cannot
   * do, and what "UPPING rises" needs. Same pen as `letterWritten`: the glyph polylines are stretched
   * before they reach the hand, written a character at a time (so it is still karaoke, never ahead of
   * the voice), wobbled per drawing and thinned into the wet end.
   */
  private riseWord(s: Sheet, text: string, x: number, y: number, size: number, seed: number, p: number, ys: number, o: { colour?: string; w?: number; ghost?: boolean }) {
    const st = strokeText(text, 'readable', size, 0);
    const ox = -st.width / 2;
    const scale = (raw: V2[]) => raw.map((q) => v2(x + ox + q.x, y + q.y * ys));
    const w0 = o.w ?? size * 0.075;
    const colour = o.colour ?? rgba('ink');
    if (o.ghost) {
      for (let si = 0; si < st.strokes.length; si++) {
        s.stroke(scale(st.strokes[si]!), seed + si * 3, { w: w0 * 0.7, color: colour, amp: size * 0.012, a: 0.16, taper: false });
      }
      return;
    }
    const chars = Array.from(text);
    const done = clamp(p) * chars.length;
    const full = Math.floor(done), frac = done - full;
    for (let si = 0; si < st.strokes.length; si++) {
      const ci = st.charOf[si] ?? 0;
      const upto = ci < full ? 1 : ci > full ? 0 : frac;
      if (upto <= 0.001) continue;
      const P = scale(st.strokes[si]!);
      const cut = Math.max(1, Math.round(P.length * upto));
      s.stroke(P.slice(0, cut), seed + si * 3, { w: w0 * Math.min(1, 0.45 + upto), color: colour, amp: size * 0.012 });
    }
  }

  /** Stage 4: the value re-written until it multiplies — every tile grows more nines as the plate runs. */
  private digitWall(s: Sheet, ls: number, t: number) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const bx = 220 + c * 560 + (r % 2) * 150;
        const by = 150 + r * 240;
        const sz = 60 + 46 * hash(r, c, 3);
        const rev = hash(idx, 5);
        const ap = prog(t, ls + 0.04 * rev * 4, ls + 0.45 + 0.55 * rev, ease.outCubic) * (0.12 + 0.3 * hash(r, c, 7));
        if (ap < 0.02) continue;
        // 0.99 → 0.999 → 0.9999…: the digits multiply while the plate runs, so the wall never settles
        // (the count is capped at 0.9999…, which is also what keeps this wall's stroke bill bounded)
        const nines = 2 + Math.floor(clamp(prog(t, ls + 0.12 + 0.3 * rev, ls + 1.5)) * 2);
        s.letter(`0.${'9'.repeat(nines)}${nines >= 4 ? '…' : ''}`, bx, by, sz, 600 + idx * 3, {
          font: 'readable',
          color: rgba(hash(r, c, 11) < 0.25 ? 'signal' : 'ink', ap),
          w: sz * 0.055, amp: sz * 0.02, rot: (hash(r, c, 13) - 0.5) * 0.3,
        });
      }
    }
  }
}

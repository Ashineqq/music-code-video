// Plate — Prompt. A plea typed into a hand-drawn interface.
// One module serves three timeline entries via ctx.params.variant: chatgpt · sydney · gato (validated
// against the three names, with a fallback, so a bad param can never blank the plate).
// The lyric is hand-lettered word by word as it is sung; above the word still being written a tiny
// next-token fan flickers on the drawing index, then the word lands. Every outline is re-drawn each
// drawing (nothing is mechanically still) and nothing moves on raw t except true motion: the wobble
// of every line is seeded by s.d.
// chatgpt: behind the field, a hand-ruled throat of concentric rings pulls slowly in and rushes at
// the camera on ⏎. When the line runs out (the last word's end, read from the data, not a clock), the
// return key is pressed and the plate is launched into the chorus: the frame collapses and flashes.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, TAU, heldT, type V2 } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

type Variant = 'chatgpt' | 'sydney' | 'gato';

/** The three plates this module serves; ctx.params.variant is checked against these. */
const VARIANTS: Variant[] = ['chatgpt', 'sydney', 'gato'];

const TEXT: Record<Variant, string> = {
  chatgpt: "ChatGPT, please don't eat me alive",
  sydney: 'Sydney, please let me free',
  gato: "Gato, please don't let me go",
};

/** The hand-ruled text field, in sheet px (y down). */
const F = { x0: 250, y0: 392, x1: 1620, y1: 688 };
const BASE_Y = 588;
/** Wrong guesses the fan offers alongside the word that actually lands. */
const POOL = ['you', 'the', 'just', 'it', 'all', 'then', 'we', 'not', 'no', 'and', 'so', 'still', 'more', 'back', 'now'];

/** Catmull-Rom through `pts`: a curve that looks drawn rather than computed. */
function smooth(pts: V2[], per = 8): V2[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const out: V2[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(n - 1, i + 2)]!;
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      out.push(v2(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      ));
    }
  }
  out.push(pts[n - 1]!);
  return out;
}

function oval(cx: number, cy: number, rx: number, ry: number, n = 28): V2[] {
  const p: V2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; p.push(v2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
  return p;
}

export default class Prompt extends InkedScene {
  /** ctx.params.variant, validated against the three known variants (a bad value falls back, not throws). */
  private variant: Variant = VARIANTS.includes(this.ctx.params.variant) ? (this.ctx.params.variant as Variant) : 'chatgpt';
  private line = this.ctx.lyrics.get(TEXT[this.variant]);

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const kind = this.variant;
    const kick = clamp(f.a.kick);

    // the line's last word runs past the plate's window (the cut lands mid-word), so the END of the
    // line is where the word has used up its window: read that from the data, not a hard-coded time.
    const words = this.line.words;
    const lastWord = words[words.length - 1]!;
    const endP = clamp((this.ctx.end - lastWord.start) / Math.max(1e-3, lastWord.end - lastWord.start));
    const lastP = Lyrics.wordProgress(lastWord, t);
    const launch = ease.inCubic(clamp((lastP - 0.5) / Math.max(1e-3, endP - 0.5)));   // 0 .. 1 into the cut

    // a slow push onto the field; the drawing boils, the camera does not
    s.setCam(W / 2, H / 2, 1 + 0.032 * ease.inOutCubic(f.p), 0);

    // the cel frame
    s.rect(64, 46, W - 64, H - 46, 900, { w: 3.4, color: rgba('ink', 0.7), overshoot: 6, amp: 3.0 });

    // chatgpt's beat, BEHIND the field: the throat of concentric rings (a tunnel), pulling in
    if (kind === 'chatgpt') this.rings(s, t, d, launch);
    this.field(s);
    if (kind === 'sydney') this.blinds(s, f);

    // ------------------------------------------------------------ the plea
    const font = 'readable' as const;
    const lineP = clamp(Lyrics.lineCharProgress(this.line, t) / Math.max(1, this.line.text.length));
    // gato: by the end the letters no longer want to sit together
    const drift = kind === 'gato' ? ease.inOutQuad(clamp((lineP - 0.4) / 0.6)) : 0;
    const gapK = (i: number) => 0.27 * (1 + 2.0 * drift) + 0.14 * drift * i;

    const unit = words.map((w) => s.measureLetter(w.w, font, 1));
    // fit against the fully-drifted layout, so the type never rescales mid-line
    const maxDrift = kind === 'gato' ? 1 : 0;
    let gapSum = 0;
    for (let i = 0; i < words.length - 1; i++) gapSum += 0.27 * (1 + 2.0 * maxDrift) + 0.14 * maxDrift * i;
    const size = Math.min(70, (F.x1 - F.x0 - 112) / Math.max(0.001, unit.reduce((a, b) => a + b, 0) + gapSum));
    const widths = words.map((w) => s.measureLetter(w.w, font, size));

    let x = F.x0 + 56;
    const xs: number[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      xs[i] = x;
      const sway = noise1(d * 1.4 + i * 5.1, 71) * 1.8;
      const lift = drift * (10 + 26 * hash(i, 9));
      const rot = drift * (hash(i, 13) - 0.5) * 0.26;
      const yy = BASE_Y + sway - lift;
      if (p < 1) s.letterWritten(w.w, x, yy, size, 300 + i * 7, 1, { font, rot, ghost: true });
      s.letterWritten(w.w, x, yy, size, 300 + i * 7, p, {
        font, rot, color: p >= 1 ? rgba('ink') : rgba('signal'), w: size * 0.075,
      });
      x += widths[i]! + size * gapK(i);
    }

    const active = words.findIndex((w) => Lyrics.wordProgress(w, t) < 1);
    const last = words.length - 1;
    const penX = active >= 0
      ? xs[active]! + widths[active]! * Lyrics.wordProgress(words[active]!, t)
      : xs[last]! + widths[last]!;

    // ------------------------------------------------------------ next-token fan over the live word
    if (active >= 0) {
      const w = words[active]!;
      const p = Lyrics.wordProgress(w, t);
      const fa = Math.min(prog(t, w.start - 0.40, w.start - 0.06, ease.outQuad), 1 - prog(p, 0.68, 0.97, ease.inQuad));
      if (fa > 0.02) this.fan(s, xs[active]! + widths[active]! * 0.4, 168, 500 + active * 13, fa, w.w, d);
    }

    // ------------------------------------------------------------ caret, blinking on the drawing index
    if (d % 7 < 5) {
      s.stroke([v2(penX + 10, BASE_Y - 46), v2(penX + 10, BASE_Y + 8)], 400, { w: 3.0, color: rgba('signal', 0.95), amp: 2.4, overshoot: 5 });
    }

    // ------------------------------------------------------------ the return key, hand-ruled
    // appears as the line is typed, then is PRESSED as the last word runs out (driven off its end)
    const ra = prog(lineP, 0.46, 0.9, ease.outCubic);
    const press = ease.outCubic(clamp((lastP - 0.6) / Math.max(1e-3, endP - 0.6)));
    if (ra > 0.02) this.enter(s, F.x1 - 66, F.y1 - 54 + 6 * press, 62, clamp(ra * (0.8 + 0.2 * kick) + 0.15 * press));

    // ------------------------------------------------------------ the variant's own flavour
    if (kind === 'chatgpt') this.smiley(s, 402, 806, 104 * (1 + 0.05 * lineP), lineP, d);
    if (kind === 'sydney') this.reply(s, lineP);
    if (kind === 'gato') this.cat(s, d);

    this.send(s, kick, d);
    // the launch on ⏎: the frame collapses inward and flashes into the cut
    this.collapse(s, launch, d);
    s.text(`PROMPT — ${kind}`, 96, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 118, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55) });

    return { flash: 0.008 * clamp(f.a.snare) + 0.45 * launch, zoom: 1 + 0.34 * launch + 0.008 * kick };
  }

  // ------------------------------------------------------------------ the interface
  /** The hand-ruled text field, ruled before anything is typed into it. */
  private field(s: Sheet) {
    const seed = 610;
    s.rect(F.x0, F.y0, F.x1, F.y1, seed, { fill: rgba('paper2', 0.5), w: 3.2, color: rgba('ink', 0.85), overshoot: 8, amp: 2.8 });
    // the pen went round a second time, as it does
    s.rect(F.x0 + 7, F.y0 + 8, F.x1 - 6, F.y1 - 5, seed + 1, { w: 1.4, color: rgba('ink', 0.3), amp: 3.2, overshoot: 5 });
    for (let i = 0; i < 3; i++) s.blob(F.x0 + 34 + i * 30, F.y0 + 26, 8, seed + 3 + i, { n: 14, jag: 0.14, outline: { w: 2.2 } });
    s.letter('prompt', F.x0 + 142, F.y0 + 34, 24, seed + 9, { font: 'readable', color: rgba('ink2', 0.8), w: 1.9 });
    s.stroke([v2(F.x0 + 24, F.y0 + 62), v2(F.x1 - 24, F.y0 + 62)], seed + 11, { w: 2.0, color: rgba('graphite', 0.45), amp: 2.6, overshoot: 6 });
    // a corner worked in with hatching: the cel second tone
    s.hatch([v2(F.x0 + 24, F.y1 - 60), v2(F.x0 + 250, F.y1 - 60), v2(F.x0 + 250, F.y1 - 16), v2(F.x0 + 24, F.y1 - 16)], seed + 13, { spacing: 9, angle: -Math.PI / 3.6, color: rgba('shade', 0.85), w: 1.5 });
  }

  /** The send button, top right of the field. Flickers on the drawing index. */
  private send(s: Sheet, kick: number, d: number) {
    const bump = hash(d, 77) < 0.22 ? 1.1 : 1;
    const cx = F.x1 - 66, cy = F.y0 + 34, R = 24 * bump;
    s.rect(cx - R, cy - R, cx + R, cy + R, 640, { w: 2.6, color: rgba('ink', 0.85), amp: 2.0, overshoot: 4 });
    const a = 0.7 + 0.3 * kick;
    s.stroke([v2(cx, cy + R * 0.44), v2(cx, cy - R * 0.5)], 644, { w: 3.0, color: rgba('signal', a), amp: 1.8, overshoot: 4 });
    s.stroke([v2(cx - R * 0.36, cy - R * 0.12), v2(cx, cy - R * 0.56), v2(cx + R * 0.36, cy - R * 0.12)], 646, { w: 2.6, color: rgba('signal', a), amp: 1.8, overshoot: 3 });
  }

  /**
   * The launch on ⏎: the cel frame is ruled again, smaller, and struck through with converging
   * strokes, so the plate collapses into the cut (the punch-in and the flash come from the post).
   */
  private collapse(s: Sheet, launch: number, d: number) {
    const a = clamp(launch);
    if (a <= 0.02) return;
    const k = 1 - 0.6 * a;                                 // how far the frame has closed in
    s.rect(lerp(W / 2, 64, k), lerp(H / 2, 46, k), lerp(W / 2, W - 64, k), lerp(H / 2, H - 46, k), 800 + d, {
      w: 3.0 + 3.0 * a, color: rgba('ink', 0.85), amp: 3.4, overshoot: 6, a: 0.6 + 0.4 * a,
    });
    const n = 9;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + 0.3 + d * 0.05;
      const rIn = k * 640, rOut = rIn + 170 * a;
      s.stroke(
        [v2(W / 2 + Math.cos(ang) * rOut, H / 2 + Math.sin(ang) * rOut), v2(W / 2 + Math.cos(ang) * rIn, H / 2 + Math.sin(ang) * rIn)],
        820 + i * 5, { w: 2.0, color: rgba('ink', 0.5 * a), amp: 2.2 },
      );
    }
  }

  /** The return key: a hand-ruled cap with the ↵ drawn inside it. */
  private enter(s: Sheet, cx: number, cy: number, size: number, a: number) {
    const c = clamp(a);
    s.rect(cx - 44, cy - 46, cx + 44, cy + 40, 430, { w: 2.6, color: rgba('ink', 0.8), a: c, amp: 2.2, overshoot: 5 });
    s.hatch([v2(cx - 40, cy + 36), v2(cx + 40, cy + 36), v2(cx + 40, cy + 26), v2(cx - 40, cy + 26)], 433, { spacing: 7, angle: -Math.PI / 3.4, color: rgba('shade', 0.5 * c), w: 1.4 });
    const P = smooth([v2(cx + size * 0.5, cy - size * 0.6), v2(cx + size * 0.5, cy - size * 0.12), v2(cx + size * 0.22, cy + size * 0.08), v2(cx - size * 0.56, cy + size * 0.08)], 6);
    s.stroke(P, 434, { w: 2.8 * c + 0.8, color: rgba('ink', 0.92), a: c, amp: 2.0, overshoot: 4 });
    s.stroke([v2(cx - size * 0.56, cy + size * 0.08), v2(cx - size * 0.24, cy - size * 0.2)], 435, { w: 2.6, color: rgba('ink', 0.92), a: c, amp: 1.6, overshoot: 3 });
    s.stroke([v2(cx - size * 0.56, cy + size * 0.08), v2(cx - size * 0.22, cy + size * 0.36)], 436, { w: 2.6, color: rgba('ink', 0.92), a: c, amp: 1.6, overshoot: 3 });
  }

  /**
   * The next-token fan: the alternatives the model weighed, as little hand-ruled probability bars.
   * Their lengths are a function of the drawing index, so the whole panel boils and the lead flickers.
   */
  private fan(s: Sheet, ax: number, topY: number, seed: number, a: number, chosen: string, d: number) {
    const rows = 4, w = 320;
    const items: { txt: string; p: number }[] = [{ txt: chosen, p: 0.62 }];
    for (let k = 1; k < rows; k++) {
      items.push({ txt: POOL[Math.floor(hash(seed, k, 5) * POOL.length) % POOL.length]!, p: 0.12 + hash(seed, k, 9) * 0.36 });
    }
    const fl = items.map((it, k) => clamp(it.p + 0.32 * noise1(d * 2.3 + k * 3.1, seed + k * 17), 0.04, 1));
    let lead = 0;
    for (let k = 1; k < rows; k++) if (fl[k]! > fl[lead]!) lead = k;
    const bx = clamp(ax - 70, 90, W - 90 - w);
    const h = rows * 34;

    s.rect(bx - 20, topY - 38, bx + w, topY + h + 4, seed + 3, { w: 2.2, color: rgba('graphite', 0.5), a, overshoot: 6, amp: 2.6 });
    s.letter('next token', bx - 8, topY - 50, 20, seed + 5, { font: 'readable', color: rgba('graphite', 0.75), a, w: 1.7 });

    const barX = bx + 112;
    for (let k = 0; k < rows; k++) {
      const ry = topY + k * 34;
      const on = k === lead;
      s.letter(items[k]!.txt, bx, ry, 25, seed + k * 11, { font: 'readable', color: on ? rgba('signal', 0.95) : rgba('graphite', 0.8), a, w: 2.0 });
      const len = 34 + 152 * fl[k]!;
      s.rect(barX, ry - 15, barX + len, ry - 3, seed + 40 + k * 6, {
        w: 1.6, color: rgba('ink', 0.5), fill: on ? rgba('signal', 0.5) : rgba('graphite', 0.22), a, amp: 1.8,
      });
      if (on) s.stroke([v2(bx - 18, ry - 12), v2(bx - 11, ry - 5), v2(bx + 2, ry - 26)], seed + 70 + k, { w: 2.6, color: rgba('signal', 0.9), a, amp: 1.6, overshoot: 3 });
    }

    // the model reaches down to the word it is about to write
    s.stroke([v2(bx + w * 0.5, topY + h + 8), v2(bx + w * 0.5 + 14, topY + h + 44), v2(ax, F.y0 - 18)], seed + 77, {
      w: 1.8, color: rgba('graphite', 0.5), a, amp: 3.4, overshoot: 5,
    });
  }

  // ------------------------------------------------------------------ chatgpt: the throat, and the smile
  /**
   * chatgpt's treated beat: the throat behind the field. Concentric hand-ruled rings — a tunnel —
   * that pull slowly in across the plate and rush at the camera as the plate is launched on ⏎. Every
   * ring is re-drawn each drawing (the wobble is seeded by s.d), the innermost stops are engraved with
   * hatching, and the pupil at the end of the tunnel swells as we fall into it.
   */
  private rings(s: Sheet, t: number, d: number, launch: number) {
    const cx = W / 2, cy = (F.y0 + F.y1) / 2;
    const pull = clamp((heldT(t) - this.ctx.start) / Math.max(1e-3, this.ctx.end - this.ctx.start));
    const rush = ease.inCubic(clamp(launch));
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      // the tunnel narrows as the plea is typed, then flies outward past the camera on ⏎
      const r = (lerp(740, 470, ease.inOutCubic(pull)) * (1 - 0.7 * u) + 70) * (1 + 3.2 * rush);
      const wob = 1 + 0.028 * noise1(i * 2.3 + d * 1.7, 31 + i * 7);
      const ox = noise1(d * 1.1 + i * 3.7, 61) * 6, oy = noise1(d * 1.3 + i * 5.1, 71) * 5;
      const pts: V2[] = [];
      const seg = 34;
      for (let k = 0; k < seg; k++) {
        const a = (k / seg) * TAU;
        pts.push(v2(cx + ox + Math.cos(a) * r * wob, cy + oy + Math.sin(a) * r * 0.78 * wob));
      }
      s.stroke(pts, 200 + i * 9, { closed: true, w: 1.5 + 1.5 * (1 - u), color: rgba('graphite', 0.5 - 0.045 * i), amp: 2.4, taper: false });
      // engrave the last two stops: kept at a fixed ink density, so the capture does not blow up on the rush
      if (i >= n - 2) s.hatch(pts, 520 + i * 5, { spacing: 12 * (1 + 2 * rush), angle: -Math.PI / 3.4, color: rgba('ink', 0.26), w: 1.3 });
    }
    // the pupil at the end of the tunnel
    s.blob(cx, cy, 46 * (1 + 2.4 * rush), 596, { colour: rgba('ink', 0.92), jag: 0.14, n: 26, outline: { w: 3.2, color: rgba('ink') } });
  }

  private smiley(s: Sheet, cx: number, cy: number, R: number, p: number, d: number) {
    const rr = R * (1 + 0.02 * noise1(d * 1.3, 17));
    s.blob(cx, cy, rr, 200, { colour: rgba('paper', 0.96), fillA: 1, jag: 0.02, n: 40, outline: { w: 4.2, amp: 2.8 } });
    s.hatch(oval(cx, cy, rr * 0.96, rr * 0.96, 34), 204, { spacing: 13, angle: -Math.PI / 3.3, color: rgba('shade', 0.5), w: 1.6 });
    // eyes: friendly dots that get just a little too round
    for (const sx of [-1, 1]) {
      const ex = cx + sx * rr * 0.30 + noise1(d * 2.1 + sx * 3, 21) * 1.6;
      const ey = cy - rr * 0.17;
      s.blob(ex, ey, rr * (0.075 + 0.03 * p), 210 + sx, { colour: rgba('ink'), jag: 0.12, n: 14, outline: { w: 0 } });
    }
    // the smile
    const smR = rr * (0.5 + 0.12 * p), smCy = cy + rr * 0.04;
    const a0 = Math.PI * 0.30, a1 = Math.PI * 0.70;
    s.arc(cx, smCy, smR, a0, a1, 230, { w: 3.6, color: rgba('ink', 0.92), amp: 2.2, overshoot: 4 });
    // teeth: three at first, and far too many by the end — they creep round the mouth as it fills
    const n = 3 + Math.floor(p * 13);
    const spread = 0.22 + 0.5 * p;
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n;
      const ang = lerp(a0 - spread, a1 + spread, u);
      const px = cx + Math.cos(ang) * smR, py = smCy + Math.sin(ang) * smR;
      const tx = -Math.sin(ang), ty = Math.cos(ang);
      const nx = -Math.cos(ang), ny = -Math.sin(ang);
      const hw = smR * (a1 - a0) / n * 0.42 * (0.8 + 0.4 * hash(j, 3));
      const len = smR * (0.30 + 0.22 * hash(j, 5));
      const q: V2[] = [
        v2(px + tx * hw, py + ty * hw),
        v2(px + tx * hw * 0.7 + nx * len, py + ty * hw * 0.7 + ny * len),
        v2(px - tx * hw * 0.7 + nx * len, py - ty * hw * 0.7 + ny * len),
        v2(px - tx * hw, py - ty * hw),
      ];
      s.fill(q, 240 + j * 3, rgba('paper', 0.96), { amp: 1.4 });
      s.stroke(q, 240 + j * 3, { w: 2.0, closed: true, amp: 1.8, overshoot: 2 });
    }
    // an upper row as well: the mouth is full
    if (p > 0.6) {
      const un = 2 + Math.floor((p - 0.6) * 26);
      for (let j = 0; j < un; j++) {
        const u = (j + 0.5) / un;
        const px = cx + lerp(-smR * 0.92, smR * 0.92, u);
        const py = smCy - smR * 0.42;
        const hw = smR * 0.92 / un * 0.42, len = smR * (0.26 + 0.2 * hash(j, 13));
        const q: V2[] = [v2(px - hw, py), v2(px + hw, py), v2(px + hw * 0.7, py + len), v2(px - hw * 0.7, py + len)];
        s.fill(q, 270 + j * 3, rgba('paper', 0.96), { amp: 1.4 });
        s.stroke(q, 270 + j * 3, { w: 1.9, closed: true, amp: 1.7, overshoot: 2 });
      }
    }
    s.letter('assistant', cx, cy + rr + 82, 22, 290, { font: 'readable', color: rgba('graphite', 0.8), w: 1.8, align: 'center' });
  }

  // ------------------------------------------------------------------ sydney: blinds, and a curve that answers
  private blinds(s: Sheet, f: Frame) {
    // The slats close on the beat, but the shutter is a DRAWN thing: the beat phase is read at the
    // drawing clock (heldT), so a stop holds for a whole drawing and can never step inside a frame's
    // motion-blur shutter (RULE 1). The old 0.1-of-a-beat rounding could step mid-drawing.
    const bAt = this.ctx.audio.beatAt(heldT(f.t));
    const bp = bAt - Math.floor(bAt);
    const sp = lerp(30, 78, clamp(bp * 1.7));
    const x0 = F.x0 + 22, x1 = F.x1 - 22, y0 = F.y0 + 88, y1 = F.y1 - 18;
    s.stroke([v2(x0 - 12, y0 - 12), v2(x1 + 12, y0 - 12)], 700, { w: 4.4, color: rgba('ink', 0.9), amp: 2.4, overshoot: 8 });
    s.stroke([v2(x0 - 12, y1 + 10), v2(x1 + 12, y1 + 10)], 704, { w: 3.2, color: rgba('ink', 0.7), amp: 2.4, overshoot: 8 });
    let i = 0;
    for (let x = x0; x <= x1 + 1; x += sp, i++) {
      const lean = (x - x0) / (x1 - x0) * 30;
      s.stroke([v2(x + lean * 0.5, y0 - 8), v2(x + lean, (y0 + y1) / 2), v2(x + lean * 0.5, y1 + 8)], 710 + i * 3, {
        w: 2.2 + (i % 3 === 0 ? 1.3 : 0), color: rgba('ink', i % 2 ? 0.42 : 0.72), amp: 3.4, overshoot: 4,
      });
      s.stroke([v2(x + lean * 0.5, y1 + 8), v2(x + lean * 0.5 - 3, y1 + 20)], 730 + i, { w: 2.0, color: rgba('ink', 0.55) });
    }
  }

  /** Sydney's reply: one long unsettling curve, written by an unseen hand, coiling in on itself. */
  private reply(s: Sheet, lineP: number) {
    const pts: V2[] = [];
    for (let i = 0; i <= 36; i++) {
      const u = i / 36;
      pts.push(v2(lerp(340, 1310, u), 810 + 58 * Math.sin(u * Math.PI * 0.92) - 30 * u * Math.sin(u * Math.PI * 3.2)));
    }
    const C = v2(1420, 796);
    for (let i = 0; i <= 46; i++) {
      const u = i / 46;
      const ang = -Math.PI * 0.5 + u * TAU * 2.1;
      const r = lerp(92, 9, Math.pow(u, 0.82));
      pts.push(v2(C.x + Math.cos(ang) * r, C.y + Math.sin(ang) * r * 0.74));
    }
    const cut = Math.max(2, Math.ceil(pts.length * clamp(lineP)));
    const P = pts.slice(0, cut);
    s.stroke(P, 800, { w: 4.2, color: rgba('ink', 0.92), amp: 2.4, overshoot: 5 });
    s.stroke(P, 806, { w: 1.8, color: rgba('signal', 0.45), amp: 4.2 });
    if (lineP > 0.03 && lineP < 0.99) {
      const q = P[cut - 1]!;
      s.blob(q.x, q.y, 7, 812, { colour: rgba('signal'), jag: 0.22, n: 12, outline: { w: 0 }, fillA: 0.9 });
    }
  }

  // ------------------------------------------------------------------ gato: the quiet one
  private cat(s: Sheet, d: number) {
    const gx = 1718, gy = 898;
    s.stroke([v2(gx - 172, gy), v2(gx + 122, gy)], 900, { w: 2.6, color: rgba('graphite', 0.6), amp: 2.4, overshoot: 8 });
    s.hatch(oval(gx, gy + 6, 96, 13, 26), 902, { spacing: 8, angle: -0.06, color: rgba('shade', 0.55), w: 1.4 });

    const body: V2[] = [
      v2(gx - 64, gy), v2(gx - 72, gy - 64), v2(gx - 54, gy - 118), v2(gx - 24, gy - 146),
      v2(gx + 26, gy - 146), v2(gx + 58, gy - 116), v2(gx + 70, gy - 60), v2(gx + 64, gy),
    ];
    s.fill(body, 905, rgba('paper2', 0.92), { amp: 2.4, inset: 2 });
    s.stroke(body, 905, { w: 3.4, closed: true, amp: 3.0, overshoot: 5 });
    s.hatch([v2(gx - 56, gy - 110), v2(gx + 52, gy - 108), v2(gx + 58, gy - 36), v2(gx - 50, gy - 38)], 908, { spacing: 11, angle: -Math.PI / 3.4, color: rgba('shade', 0.6), w: 1.5 });

    s.blob(gx, gy - 186, 56, 910, { colour: rgba('paper2', 0.95), jag: 0.05, n: 30, outline: { w: 3.4 } });
    const twitch = noise1(d * 1.4, 61) * 3;
    for (const sx of [-1, 1]) {
      const ex = gx + sx * 33;
      const ear: V2[] = [v2(ex - 20, gy - 220), v2(ex + sx * 5, gy - 266 + twitch), v2(ex + 21, gy - 224)];
      s.fill(ear, 915 + sx, rgba('paper2', 0.95), { amp: 2.0 });
      s.stroke(ear, 915 + sx, { w: 3.0, closed: true, amp: 2.6 });
      const inner: V2[] = [v2(ex - 10, gy - 226), v2(ex + sx * 4, gy - 252 + twitch), v2(ex + 12, gy - 228)];
      s.stroke(inner, 921 + sx, { w: 2.0, closed: true, color: rgba('signal', 0.45), amp: 2.0 });
    }
    for (const sx of [-1, 1]) {
      const ex = gx + sx * 21, ey = gy - 192;
      if (s.d % 11 === 0) s.stroke([v2(ex - 12, ey), v2(ex + 12, ey)], 930 + sx, { w: 3.0, amp: 2.0 });
      else s.blob(ex, ey, 5.4, 930 + sx, { colour: rgba('ink'), jag: 0.18, n: 12, outline: { w: 0 } });
    }
    s.fill([v2(gx - 5, gy - 170), v2(gx + 5, gy - 170), v2(gx, gy - 162)], 940, rgba('ink'), { amp: 1.2 });
    s.stroke([v2(gx, gy - 162), v2(gx - 9, gy - 154)], 941, { w: 2.0, amp: 1.8 });
    s.stroke([v2(gx, gy - 162), v2(gx + 9, gy - 154)], 942, { w: 2.0, amp: 1.8 });
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const wy = gy - 176 + k * 8;
      s.stroke([v2(gx + sx * 26, wy), v2(gx + sx * 74, wy - 6 + k * 5)], 950 + k + sx * 4, { w: 1.4, color: rgba('graphite', 0.65), amp: 1.6 });
    }
    const tw = noise1(d * 1.7, 41) * 14;
    const tail = smooth([v2(gx + 62, gy - 28), v2(gx + 104, gy - 38 + tw), v2(gx + 126, gy - 92 + tw), v2(gx + 112, gy - 138 + tw * 0.5)], 6);
    s.stroke(tail, 970, { w: 4.6, amp: 2.6, overshoot: 6 });
  }
}

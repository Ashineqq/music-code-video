// Plate 1 — the opening (0 → 9.328 s): one sheet, three lines, three drawings.
//
// The reference plate for the hand-drawn film. It establishes the whole vocabulary: paper sheet, ink
// outline, flat cel fills, hatching for the second tone, hand-lettered lyric written stroke by stroke,
// and boil on everything (every outline is re-drawn from the drawing index, so nothing is ever
// mechanically still). The camera reframes down onto the written line BEFORE its first word, so the
// lettered baseline sits in the lower third and stays inside the title-safe band the whole time it is
// sung; the slugs are pinned to the frame for the same reason.
//
// One movement per line, each a new drawing on the same sheet: the two eyes that see the sparks; a
// drawing retrained through five checkpoints (the fourth briefly has five legs) until its strokes
// re-route into PCB traces; and a surprisal readout rolling down to 0.00 nats while the sheet
// dissolves back to the spark. `openingStill` is this plate's first frame, drawn again by the outro's
// park, so the film loops.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, heldT, TAU } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

interface Spark { x: number; y: number; t0: number; fall: number; drift: number; size: number; }

/** Legs at each of the five checkpoints the drawing is retrained through; the fourth has five. */
const LEGS = [2, 4, 4, 5, 4] as const;
/** The lyric's baseline on the sheet: clear of the eyes, and inside the safe band under this camera. */
const LYRIC_Y = 906;
/** The slugs sit here once pinned, 160 px clear of the bottom edge and of the HUD corner band. */
const SLUG_Y = 920;

// ------------------------------------------------------------------ pieces of the sheet
/** The cel frame: a hand-ruled border, redrawn every drawing. */
function border(s: Sheet, a = 1) {
  s.rect(64, 48, W - 64, H - 48, 90, { w: 3.6, color: rgba('ink', 0.75 * a), overshoot: 6, amp: 3.0 });
}

/** The plate's small hand-printed labels, pinned to the frame so the camera cannot push them out. */
function slug(s: Sheet, d: number, a = 1) {
  const l = s.pin(96, SLUG_Y), r = s.pin(W - 96, SLUG_Y);
  s.text('1 — SPARKS', l.x, l.y, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9 * a) });
  s.text(`d${d}`, r.x, r.y, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55 * a), align: 'right' });
}

/** Two eyes, drawn as flat graphic discs (rings and a pupil, not anatomy). */
function eyes(s: Sheet, ht: number, a = 1) {
  const eyes_: [number, number][] = [[620, 430], [1300, 430]];
  for (let e = 0; e < 2; e++) {
    const [ex, ey] = eyes_[e]!;
    // the look wanders on the drawing clock: a held drawing must not slide inside its own shutter
    const look = noise1(ht * 0.6 + e * 3, 5) * 26, lookY = noise1(ht * 0.5 + e * 7, 9) * 12;
    // almond outline
    const lid: { x: number; y: number }[] = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const an = lerp(Math.PI * 1.0, Math.PI * 2.0, u);
      lid.push(v2(ex + Math.cos(an) * 196, ey + Math.sin(an) * 108));
    }
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const an = lerp(0, Math.PI, u);
      lid.push(v2(ex + Math.cos(an) * 196, ey + Math.sin(an) * 108));
    }
    s.fill(lid, 10 + e, rgba('paper', 0.9 * a), { amp: 3.2, inset: 2 });
    s.stroke(lid, 10 + e, { w: 4.4, closed: true, amp: 3.4, overshoot: 8, a });
    // iris: a flat cel disc with a hatched rim ring, kept round
    s.blob(ex + look, ey + lookY, 84, 40 + e, { colour: rgba('signal', a), fillA: 0.94, jag: 0.012, n: 64, outline: { w: 3.2, a } });
    s.hatch(circle(ex + look, ey + lookY, 84), 44 + e, { spacing: 8, angle: -Math.PI / 3, color: rgba('blood', 0.45 * a), w: 1.3 });
    s.blob(ex + look, ey + lookY, 34, 48 + e, { colour: rgba('ink', a), jag: 0.06, n: 30, outline: { w: 0 } });
    // a pale ring between the pupil and the cel edge: the only highlight, kept graphic
    s.arc(ex + look, ey + lookY, 58, 0, TAU, 54 + e, { w: 2.2, color: rgba('paper', 0.75 * a), amp: 2.0 });
    // upper lid: a stroke that sits ABOVE the eye, drawn with the shape, never across it
    const uy = ey - 118;
    s.stroke([v2(ex - 186, uy + 26), v2(ex - 80, uy - 8), v2(ex + 76, uy - 10), v2(ex + 186, uy + 22)], 60 + e, { w: 3.6, amp: 3.4, overshoot: 5, a });
  }
}

/** One sung line, written stroke by stroke as it is sung; what is still to come stays as a ghost. */
function lyric(s: Sheet, t: number, ht: number, ln: Line, seed: number, a = 1) {
  const words = ln.words;
  const fam = 'readable' as const;
  const size = 62;
  // measure so the line can be centred as a whole
  const widths = words.map((w) => s.measureLetter(w.w, fam, size, 0));
  const gap = 17;
  const total = widths.reduce((p, q) => p + q, 0) + gap * (words.length - 1);
  const x0 = (W - total) / 2;
  let x = x0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const p = Lyrics.wordProgress(w, t);
    const sway = noise1(ht * 0.9 + i * 1.7, 55) * 3.2;
    // ghost of what is still to come (letterWritten sets its own 0.16, so the fade rides on the colour)
    if (p < 1) s.letterWritten(w.w, x, LYRIC_Y + sway, size, seed + i * 3, 1, { font: fam, ghost: true, color: rgba('ink', a) });
    s.letterWritten(w.w, x, LYRIC_Y + sway, size, seed + i * 3, p, {
      font: fam,
      color: p >= 1 ? rgba('ink', a) : rgba('signal', a),
      w: 5.2,
    });
    x += widths[i]! + gap;
  }
  // one rule under the whole line, growing with the line's own progress
  const lineP = Lyrics.wordProgress(words[0]!, t) > 0
    ? clamp((Lyrics.lineCharProgress(ln, t)) / ln.text.length)
    : 0;
  if (lineP > 0.02) {
    s.stroke([v2(x0 - 8, LYRIC_Y + 22), v2(x0 - 8 + (total + 16) * lineP, LYRIC_Y + 22)], seed + 50, { w: 2.8, color: rgba('signal', 0.8), amp: 2.6, overshoot: 5 });
  }
}

/**
 * The opening's own first drawing, as a still. The outro's park calls it, so the film's last frame is
 * its first frame and the video loops: the opening camera, the eyes, the first line still all ghost,
 * and the two slugs. `a` fades the whole still in.
 */
export function openingStill(s: Sheet, first: Line, a = 1) {
  s.setCam(960, 430, 0.86, 0.012);
  border(s, a);
  eyes(s, 0, a);
  lyric(s, 0, 0, first, 100, a);
  slug(s, 0, a);
}

export default class Sparks extends InkedScene {
  /** The three lines this plate sings, in order. */
  private lines: Line[] = [
    this.ctx.lyrics.get('sparks of AGI'),
    this.ctx.lyrics.get('Your circuits make me nervous'),
    this.ctx.lyrics.get('that’s no surprise'),
  ];
  private sparks: Spark[] = [];

  override init() {
    // deterministic sparks: fixed birth times, looping so the shower never runs out
    for (let i = 0; i < 26; i++) {
      this.sparks.push({
        x: 200 + hash(i, 3) * 1520,
        y: -60 - hash(i, 5) * 260,
        t0: 0.7 + hash(i, 7) * 3.2,
        fall: 250 + hash(i, 11) * 430,
        drift: (hash(i, 13) - 0.5) * 220,
        size: 0.6 + hash(i, 17) * 0.85,
      });
    }
  }

  /** Which of the three lines is being sung (the first one before it starts, so its words ghost in). */
  private lineIndex(t: number) {
    const l = this.ctx.lyrics.lineAt(t);
    const i = l ? this.lines.indexOf(l) : -1;
    return i < 0 ? 0 : i;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, ht = heldT(t);
    const kick = f.a.kick, snare = f.a.snare;
    // camera: hold on the eyes, then reframe DOWN onto the written line before its first word, then a
    // slow push on the line itself. (The push used to arrive with the camera still pinned at y 430, which
    // put the lettered baseline at screen y ≈ 1039 — through the safe band and into the HUD corner.)
    const drop = ease.inOutCubic(clamp((t - 0.9) / 1.3));
    const push = ease.inOutCubic(clamp((t - 1.6) / 5.6));
    s.setCam(960, lerp(430, 720, drop), lerp(0.86, 1.02, push), lerp(0.012, -0.008, push));

    const li = this.lineIndex(t);
    const l2 = this.lines[1]!.start, l3 = this.lines[2]!.start;
    // the drawing dissolves back to the spark at the end of the third line
    const diss = t >= l3 ? clamp((t - 8.9) / 0.42) : 0;

    border(s);
    // one movement per line: each is a new drawing on the same sheet, and they cross-fade on the line
    // change so the sheet is never empty for a frame
    if (t < l2 + 0.25) eyes(s, ht, clamp(1 - (t - l2) / 0.25));
    if (t >= l2 && t < l3 + 0.25) this.checkpoints(s, t, d, clamp(1 - (t - l3) / 0.25));
    if (t >= l3) this.surprisal(s, t, ht, d);
    this.shower(s, ht, d, kick, 1 - diss);
    lyric(s, t, ht, this.lines[li]!, 100);
    slug(s, d);

    return {
      flash: 0.02 * snare,
      zoom: 1 + 0.004 * kick,
      // the bookend frame: in place around the opening's sheet, flying out on the cut to `loss`
      frame: clamp((f.end - t) / 0.55),
      paper: 1,
    };
  }

  /**
   * Line 2 — "Your circuits make me nervous": the drawing is retrained through a checkpoint per word
   * (the fourth draws five legs, and there is a note about it), its strokes re-route into PCB traces,
   * and the whole drawing trembles on "nervous".
   */
  private checkpoints(s: Sheet, t: number, d: number, a: number) {
    if (a <= 0.01) return;
    const ws = this.lines[1]!.words;
    let k = 0;
    for (let i = 0; i < ws.length; i++) if (t >= ws[i]!.start) k = i;
    const last = ws[ws.length - 1]!;
    const legs = LEGS[Math.min(LEGS.length - 1, k)]!;
    // the tremble is read off the drawing clock, so it shakes a whole drawing at a time
    const tr = clamp((t - last.start) / 0.1) * (0.5 + 0.5 * noise1(d * 1.7, 71));
    const dx = tr * 8 * noise1(d * 2.3, 73), dy = tr * 7 * noise1(d * 2.9, 75);
    // ...and once the checkpoints are done the strokes re-route: legs become traces
    const pcb = clamp((t - ws[ws.length - 2]!.start - 0.1) / 0.55);
    const bx = 960 + dx, by = 470 + dy;

    // body, plain, with a hatched second tone
    const body = s.blob(bx, by, 84, 200, { colour: rgba('paper2', 0.9 * a), jag: 0.05, n: 30, outline: { w: 3.6, a } });
    s.hatch(body, 202, { spacing: 9, angle: -1.15, color: rgba('cool', 0.4 * a), w: 1.3 });
    // head, and two dots that are not eyes so much as indicators
    s.blob(bx, by - 122, 40, 206, { colour: rgba('paper', 0.95 * a), jag: 0.07, n: 22, outline: { w: 3.2, a } });
    s.blob(bx - 14, by - 130, 5.5, 208, { colour: rgba('ink', a), jag: 0.2, n: 12, outline: { w: 0 } });
    s.blob(bx + 14, by - 130, 5.5, 209, { colour: rgba('ink', a), jag: 0.2, n: 12, outline: { w: 0 } });

    // the legs of the current checkpoint, and the traces they re-route into
    for (let i = 0; i < legs; i++) {
      const lx = bx + (i / (legs - 1) - 0.5) * 96;
      const knee = lx + (hash(i, 3) - 0.5) * 26;
      const foot = lx + (hash(i, 5) - 0.5) * 14;
      if (pcb < 0.99) {
        s.stroke([v2(lx, by + 56), v2(knee, by + 116), v2(foot, by + 158)], 210 + i, { w: 4.2, amp: 2.4, color: rgba('ink', a), a: a * (1 - pcb) });
      }
      if (pcb > 0.02) {
        // a trace leaves the joint, runs square, and ends on a pad
        const px = lx + (hash(i, 7) - 0.5) * 44, py = by + 196;
        s.stroke([v2(lx, by + 56), v2(lx, by + 140), v2(px, by + 140), v2(px, py)], 240 + i, { w: 3.0, amp: 1.6, taper: false, color: rgba('cool', 0.95), a: a * pcb });
        s.arc(px, py, 9, 0, TAU, 250 + i, { w: 2.8, amp: 1.4, color: rgba('cool', 0.95), a: a * pcb });
      }
    }
    // a scrap of board to the right, so the re-route reads as routing rather than as legs
    if (pcb > 0.02) {
      for (let i = 0; i < 4; i++) {
        const y = by + 26 + i * 34;
        s.stroke([v2(bx + 170, y), v2(bx + 236, y)], 260 + i, { w: 3.2, amp: 1.4, taper: false, color: rgba('cool', 0.9), a: a * pcb });
        s.arc(bx + 242, y, 8, 0, TAU, 264 + i, { w: 2.6, amp: 1.2, color: rgba('cool', 0.9), a: a * pcb });
      }
    }

    // the checkpoints, one per word of the line, ticked across the sheet as they are sung
    const cy0 = 700;
    s.stroke([v2(620, cy0), v2(1300, cy0)], 280, { w: 2.2, amp: 2.0, taper: false, color: rgba('graphite', 0.7 * a) });
    for (let i = 0; i < ws.length; i++) {
      if (t < ws[i]!.start) continue;
      const x = 620 + (i / (ws.length - 1)) * 680;
      s.stroke([v2(x, cy0 - 10), v2(x, cy0 + 10)], 290 + i, { w: 2.6, amp: 1.8, taper: false, color: rgba('ink', 0.8 * a) });
      s.text(`ckpt ${i + 1}`, x, cy0 + 30, { size: 16, fam: 'Plex-400', color: rgba('graphite', 0.85 * a), align: 'center' });
    }
    // ...and the note for the checkpoint that got it wrong
    const five = k === 3 ? clamp((t - ws[3]!.start) / 0.16) * clamp(1 - (t - ws[4]!.start) / 0.18) : 0;
    if (five > 0.02) {
      s.stroke([v2(bx + 62, by + 130), v2(bx + 210, by + 104)], 300, { w: 2.0, amp: 2.0, taper: false, color: rgba('signal', 0.7 * five * a) });
      s.letter('five legs', bx + 220, by + 108, 30, 301, { font: 'hscript', color: rgba('signal', five * a), w: 3.0 });
    }
  }

  /**
   * Line 3 — "that's no surprise": a hand-ruled surprisal plot whose readout rolls down to 0.00 nats,
   * and at the end the whole drawing dissolves back to the spark that was drawing it.
   */
  private surprisal(s: Sheet, t: number, ht: number, d: number) {
    const ln = this.lines[2]!;
    const diss = clamp((t - 8.9) / 0.42);
    const a = clamp((t - ln.start) / 0.25) * (1 - diss);
    if (a <= 0.01) return;
    // the roll is read off the drawing clock: a readout steps, it does not slide between drawings
    const roll = clamp((ht - ln.start) / 1.35);

    // axes, hand-ruled (the plot sits low on the sheet: under this camera its top is still 170 px
    // clear of the frame's top edge)
    s.stroke([v2(560, 380), v2(560, 800)], 400, { w: 3.0, amp: 2.2, color: rgba('ink', 0.85), a });
    s.stroke([v2(548, 800), v2(1420, 800)], 401, { w: 3.0, amp: 2.2, color: rgba('ink', 0.85), a });
    for (let i = 0; i <= 4; i++) {
      const y = 800 - i * 105;
      s.stroke([v2(548, y), v2(560, y)], 402 + i, { w: 2.0, amp: 1.6, taper: false, color: rgba('ink', 0.8), a });
      s.text((4.4 - i * 1.1).toFixed(1), 540, y + 6, { size: 18, fam: 'Plex-400', color: rgba('graphite', 0.85 * a), align: 'right' });
    }
    s.letter('surprisal', 560, 356, 32, 410, { font: 'hscript', color: rgba('ink', 0.8 * a), w: 2.8 });
    s.letter('-log p', 696, 356, 32, 411, { font: 'hscript', color: rgba('signal', 0.9 * a), w: 2.8 });

    // the curve, drawn by the spark: it descends as the number rolls down
    const cur: V2[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      cur.push(v2(lerp(560, 1420, u), lerp(430, 790, Math.pow(u, 0.7)) + noise1(i * 1.7 + d * 0.4, 420) * 12));
    }
    const cut = Math.max(2, Math.round(cur.length * clamp(roll * 1.15)));
    s.stroke(cur.slice(0, cut), 421, { w: 3.6, amp: 2.0, color: rgba('ink', 0.9), a });
    const hd = cur[Math.min(cur.length - 1, cut - 1)]!;
    // the spark drawing it, and where it ends up: the middle of the FRAME, so the loss plate can pick
    // the pen up from there
    const mid = s.pin(960, 540);
    const sx = lerp(hd.x, mid.x, diss), sy = lerp(hd.y, mid.y, diss);
    if (diss > 0.02) {
      s.stroke([v2(sx - 170, sy + 44), v2(sx - 96, sy + 14), v2(sx - 40, sy + 12), v2(sx, sy)], 450, { w: 2.4, amp: 2.6, color: rgba('graphite', 0.75), overshoot: 4, a: diss });
    }
    s.blob(sx, sy, 9 + 6 * diss, 430, { colour: rgba('ember', a), jag: 0.22, n: 14, outline: { w: 0 } });
    for (let i = 0; i < 4; i++) {
      const an = i * (TAU / 4) + 0.4 + noise1(d + i, 433) * 0.6;
      const R = 22 + 8 * noise1(d * 2.1 + i, 435);
      s.stroke([v2(sx - Math.cos(an) * R, sy - Math.sin(an) * R), v2(sx + Math.cos(an) * R, sy + Math.sin(an) * R)], 436 + i, { w: 3.0, amp: 2.4, color: rgba('ember', a) });
    }

    // the readout itself: 4.61 nats of surprise, rolling down to nothing
    s.letter((4.61 * (1 - roll)).toFixed(2), 1500, 480, 104, 440, { font: 'readable', color: rgba('ink', 0.95 * a), align: 'right', w: 7.0 });
    s.letter('nats', 1500, 534, 28, 441, { font: 'hscript', color: rgba('graphite', 0.8 * a), align: 'right', w: 2.6 });
  }

  /**
   * Sparks: 4-ray stars, boiling, falling toward the eyes. The fall is read at the drawing clock too —
   * a held drawing must not slide inside its own shutter, or the shower blurs into a streak.
   */
  private shower(s: Sheet, ht: number, d: number, kick: number, a: number) {
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i]!;
      const CYCLE = 4.6;
      const age = ((ht - sp.t0) % CYCLE + CYCLE) % CYCLE;
      if (ht < sp.t0) continue;
      const fall = sp.fall * age + 300 * age * age;
      const y = sp.y + fall;
      if (y > 1060) continue;
      const x = sp.x + sp.drift * age + noise1(ht * 1.6 + i, 21) * 24;
      const bob = this.nearEye(x, y) ? 1 + 0.5 * noise1(d * 2.1 + i, 61) : 1;
      const size = sp.size * bob * (1 + 0.25 * kick);
      const flick = 1 + 0.32 * noise1(d * 1.9 + i * 2.3, 31);
      const R = 40 * size * flick;
      for (let k = 0; k < 4; k++) {
        const an = k * (TAU / 4) + 0.4 + noise1(d + i, 41) * 0.6;
        s.stroke([v2(x - Math.cos(an) * R, y - Math.sin(an) * R), v2(x + Math.cos(an) * R, y + Math.sin(an) * R)], 70 + i * 4 + k, { w: 3.4, color: rgba('ember', a), amp: 2.4 });
      }
      s.blob(x, y, 7.5 * size, 80 + i, { colour: rgba('ember', a), jag: 0.18, n: 16, outline: { w: 0 } });
    }
  }

  private nearEye(x: number, y: number) {
    return (Math.abs(x - 620) < 210 && Math.abs(y - 430) < 140) || (Math.abs(x - 1300) < 210 && Math.abs(y - 430) < 140);
  }
}

function circle(cx: number, cy: number, r: number) {
  const p: { x: number; y: number }[] = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; p.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  return p;
}

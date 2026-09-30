// Plate 4 / 12 — `older` (n = 1: 24.81 → 32.43 s; n = 2: 101.00 → 108.62 s). ONE module, two entries:
// the same drawing at two ages, handed the stage through `ctx.params.n`.
//
// The instrument is a heart scribbled over and over, and the whole plate is the argument that a
// scribble is a drawing you have not finished yet:
//
//   n = 1 — three passes, each looser than the last. On the word "heart" the third pass stops
//     following the outline and keeps going: out of the right lobe, down, flat, and off the page's
//     right edge at y ≈ 656. That line is the next movement's horizon. On "afraid" the heart is
//     scribbled shut one last time, tight around a small figure standing in its notch — protected.
//   n = 2 — the same call to `heart()`, the same passes; but a trunk grew under it, and the ground it
//     stands on is the line that escaped in n = 1 (660 ≈ the 656 it left at). The boy is one size step
//     taller and the small n = 1 figure sits at the foot. On "ever you're afraid" the canopy's shadow
//     is laid down as one flat `night2` shape and the small figure stands up inside it.
//
// Everything else is the reference plate's page furniture and its lyric block (see open.ts): the frame,
// the rules, the sung line written word by word under a lantern nib, never ahead of the voice.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, TAU, CEL, resample } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines both entries open on, in order. Queried by fragment; the entry picks the occurrence. */
const Q = ['When you get older', 'Your wild heart will live for younger days', "Think of me if ever you're afraid"];

/** The page's furniture (copied from the reference plate). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const FOLD_X = 960;                     // the spread's spine
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)
                                        // lifted 28 px so the descenders of the third line stay inside
                                        // the brief's sung-word band (y ≤ 940).
const SIZE = 54, GAP = 16, MAXW = 1540;

/** n = 1 — the scribble, and the figure it shuts around. */
const H1 = { cx: 960, cy: 390, rw: 205, rh: 185 };   // heart: x 755..1165, y 211..575 (95-pt resample)
const FIG_Y = 524, FIG_H = 74;                        // the small boy, standing in the heart's notch
                                                      // (the heart's interior is ±24 px at y = 530 and
                                                      //  ±33 at 520; his body is ±15, so he clears it)
const ESC_Y = 656;                                    // where the escaped line settles (n = 2's ground)
/** n = 2 — the same heart with a trunk under it. */
const H2 = { cx: 960, cy: 400, rw: 200, rh: 190 };   // canopy: x 760..1160, y 216..590 (97-pt resample)
const GROUND = 660;
const BIG_X = 820, BIG_H = 104;                       // the boy, one size bigger (n = 1's figure is 74)
const SIT_X = 1078, SIT_H = 62;                       // the small figure, sitting at the foot
const STAND_X = 1118, SMALL_H = 76;                   // …the same figure upright, inside the shadow
const SH = { cx: 1118, cy: 620, rw: 250, rh: 50 };    // the canopy's shadow, flat on the ground

/**
 * One heart as a closed polyline — the classic 16sin³θ / 13cosθ−5cos2θ−2cos3θ−cos4θ curve, mapped to a
 * box of ±rw, ±rh about (cx, cy). n = 2's canopy is THIS function, so the tree is literally the same
 * drawing as the scribble it grew out of. `from`/`to` cut an arc of it (the escape only traces a lobe).
 */
function heart(cx: number, cy: number, rw: number, rh: number, from = 0, to = TAU, n = 76): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const th = lerp(from, to, i / n);
    const s = Math.sin(th);
    const y = 13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th);
    // the curve runs y ∈ [−17, 12.4]; centre that range on 0 so ±rh is the real height of the heart
    pts.push(v2(cx + ((16 * s * s * s) / 16) * rw, cy - ((y + 2.3) / 14.7) * rh));
  }
  return pts;
}

export default class Older extends InkedScene {
  /** Which stage of the same drawing this entry is. */
  private n: number = this.ctx.params.n === 2 ? 2 : 1;
  /** This entry's three lines: occurrence 0 for n = 1, occurrence 1 for n = 2. All six are queried. */
  private lines: Line[] = [0, 1, 2].map((k) => this.ctx.lyrics.get(Q[k]!, this.n - 1));

  draw(s: Sheet, f: Frame): PostOverrides {
    const d = s.d, t = f.t;
    const k = clamp(prog(t, f.start, f.end));

    // The camera first, then the page, so the paper and the drawing on it move together: n = 1 leans in
    // on the heart as it escapes; n = 2 starts close and pulls back off the tree. Both stay under
    // z = 1.02, where the frame (x 72..1848, y 62..1018) is still inside the screen.
    if (this.n === 1) s.setCam(W / 2 + 6, H / 2 + 12, 1 + 0.018 * k, 0);
    else s.setCam(W / 2, H / 2 + 6 - 10 * k, 1.02 - 0.03 * k, 0);
    this.page(s);

    const lit = this.n === 1 ? this.scribble(s, f, d) : this.tree(s, f, d);
    this.writeRules(s, f);

    // the pen is the film's one light: the last line of each entry warms the page a whisper, and only
    // there (the reference plate's idiom — `CEL.hot` is earned, never the default).
    return { ...CEL.flat, ...(lit > 0.45 ? CEL.hot : null) };
  }

  // ------------------------------------------------------------------ the page
  /** The page: its edge, the spread's fold, and the three rules. The same block as the reference. */
  private page(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4) });
    // the fold where the spread meets: drawn first, so the drawing happens over it
    s.stroke([v2(FOLD_X, 118), v2(FOLD_X + 3, 540), v2(FOLD_X - 2, 982)], 7, { w: 1.2, sketch: true, color: rgba('graphite', 0.2), taper: false });
    for (let i = 0; i < RULES.length; i++) {
      const y = RULES[i]!;
      s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 });
    }
  }

  // ------------------------------------------------------------------ n = 1: the scribble
  /** Three passes over one heart; the third one leaves. Returns how warm the page should be. */
  private scribble(s: Sheet, f: Frame, d: number): number {
    const L = this.lines;
    // ONE resample, reused by all four passes — the wobble is O(points²) in its arc-length walk, so the
    // polyline the passes share is ~95 points, not the 76 of the raw curve drawn three times.
    const base = resample(heart(H1.cx, H1.cy, H1.rw, H1.rh), 14);

    // pass 1 — the heart itself, drawn round the loop by the pen (line 1). The pen lands before the
    // first word and lifts after it, so the shape exists before it is named.
    const p1 = prog(f.t, L[0]!.start - 0.4, L[0]!.start + 1.6);
    if (p1 > 0) {
      const shown = Math.max(2, Math.round(base.length * p1));
      s.stroke(base.slice(0, shown), 100, { w: 3.2, color: rgba('ink', 0.95), amp: 2.2, overshoot: 12 });
    }

    // pass 2 — the same loop again, half a size out and looser (line 2's first words)
    const p2 = prog(f.t, L[1]!.start - 0.2, L[1]!.start + 1.1);
    if (p2 > 0) {
      const out = this.scaled(base, H1.cx, H1.cy, 1.045, 8, -7);
      const shown = Math.max(2, Math.round(out.length * p2));
      s.stroke(out.slice(0, shown), 101, { w: 2.4, color: rgba('ink', 0.6), amp: 4.2, freq: 3.4, taper: false });
    }

    // pass 3 — the wild one, on the word "heart": the trace stops following the outline and keeps going.
    // Out of the lobe, down, flat, and off the right edge at the height the next plate's horizon is.
    const w0 = this.onBeat(this.word(L[1]!, 'heart'));
    const p3 = prog(f.t, w0, w0 + 2.5);
    if (p3 > 0) {
      const wild = this.wild();
      const shown = Math.max(2, Math.round(wild.length * p3));
      s.stroke(wild.slice(0, shown), 102, { w: 2.6, color: rgba('ink', 0.8), amp: 4.6, freq: 3, taper: false });
      if (p3 < 1) {                                  // the nib, while the line is still running off
        const p = wild[shown - 1]!;
        s.blob(p.x + 5, p.y - 5, 5.5 * (0.85 + 0.15 * hash(7, d)), 103, { colour: rgba('lantern', 0.9), n: 7, jag: 0.5 });
      }
    }

    // the heart is scribbled shut, tight, over line 3 — the wild heart settles back onto its own outline
    const shut = this.onBeat(L[2]!.start);
    const p4 = prog(f.t, shut, shut + 1.3);
    if (p4 > 0) {
      const tight = this.scaled(base, H1.cx, H1.cy, 0.99, 0, 0);
      const shown = Math.max(2, Math.round(tight.length * p4));
      s.stroke(tight.slice(0, shown), 104, { w: 2.2, color: rgba('ink', 0.7), amp: 1.5, freq: 2.6, taper: false });
    }

    // …and the small figure is standing inside it, in the heart's notch. He is the seed of n = 2's boy:
    // the same five strokes, one size up, under the tree.
    const af = this.onBeat(this.word(L[2]!, 'afraid'));
    const fa = prog(f.t, af, af + 0.5);
    if (fa > 0) this.boy(s, H1.cx, FIG_Y, FIG_H, 120, false, rgba('ink', 0.95), 3.4, fa);
    return prog(f.t, af, af + 0.6) * (1 - prog(f.t, f.end - 0.15, f.end));
  }

  /**
   * The escaped line: the right lobe of the heart traced but not finished, then 800 px that leave the
   * page. One polyline, because it is one stroke of the pen — which is the whole point of the movement.
   */
  private wild(): V2[] {
    const lobe = heart(H1.cx, H1.cy, H1.rw * 1.08, H1.rh * 1.08, 0, 1.62, 20);
    const ctrl: V2[] = [
      lobe[lobe.length - 1]!,
      v2(1285, 262), v2(1402, 306), v2(1508, 452), v2(1626, 588), v2(1748, ESC_Y - 8), v2(FRAME[2] - 2, ESC_Y),
    ];
    // a long line sways: the fine boil is the Sheet's (seeded by s.d), the big sway is ours
    const pts: V2[] = [];
    for (let i = 0; i + 1 < ctrl.length; i++) {
      const a = ctrl[i]!, b = ctrl[i + 1]!;
      for (let k = 0; k < 8; k++) {
        const u = k / 8;
        pts.push(v2(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + noise1(i * 1.7 + u, 5) * 9));
      }
    }
    pts.push(ctrl[ctrl.length - 1]!);
    return resample([...lobe, ...pts], 14);
  }

  // ------------------------------------------------------------------ n = 2: the tree
  /** The heart, a trunk under it, and the shadow that shelters the small figure. */
  private tree(s: Sheet, f: Frame, d: number): number {
    const L = this.lines;
    const base = resample(heart(H2.cx, H2.cy, H2.rw, H2.rh), 14);

    // the ground: the line that escaped in n = 1 has come back, and the tree stands on it
    s.stroke([v2(280, GROUND), v2(760, GROUND - 4), v2(1180, GROUND + 3), v2(1760, GROUND - 2)], 200,
      { w: 3, color: rgba('ink', 0.85), amp: 2.6, overshoot: 14 });
    // the road the treatment asks for: the far edge converging into the ground at the far right
    s.stroke([v2(200, 716), v2(900, 690), v2(1500, 672), v2(1760, GROUND)], 201,
      { w: 1.6, sketch: true, color: rgba('graphite', 0.4), taper: false });

    // the tree swells by a hair as the plate opens — it is already grown when we arrive
    const grow = 0.9 + 0.1 * prog(f.t, f.start, f.start + 0.9);
    const canopy = this.scaled(base, H2.cx, H2.cy, grow, 0, 0);

    // canopy: one SOLID second tone carries the mass (never a half-transparent shape — a flat cel that
    // is not solid disappears into the paper), then a light hatch for the leaves, then the trunk through
    // it, and only then the scribble, kept light so the fill — not the outline — is what reads.
    s.fill(canopy, 210, rgba('shade', 0.9), { amp: 3 });
    s.hatch(canopy, 211, { spacing: 16, angle: -1.05, color: rgba('graphite', 0.42), w: 1.4 });
    // the trunk meets the canopy exactly at its point (the mass is only 8 px wide at y = 578) and flares
    // to 56 px at the ground; the two branches stay INSIDE the mass, where they read as ink over the tone
    // instead of growing horns out of the silhouette
    s.stroke([v2(955, 578), v2(946, 620), v2(938, GROUND)], 220, { w: 3.6, color: rgba('ink', 0.9), amp: 2, taper: false });
    s.stroke([v2(965, 578), v2(974, 620), v2(994, GROUND)], 221, { w: 3.6, color: rgba('ink', 0.9), amp: 2, taper: false });
    s.stroke([v2(938, GROUND - 10), v2(902, GROUND)], 222, { w: 3, color: rgba('ink', 0.85), taper: false });
    s.stroke([v2(994, GROUND - 10), v2(1030, GROUND)], 223, { w: 3, color: rgba('ink', 0.85), taper: false });
    s.stroke([v2(958, 600), v2(920, 512)], 224, { w: 2.6, color: rgba('graphite', 0.6), taper: false });
    s.stroke([v2(972, 598), v2(1012, 500)], 225, { w: 2.6, color: rgba('graphite', 0.6), taper: false });
    // the canopy is still the scribble: the same two passes as n = 1 (the third one is the ground now)
    s.stroke(canopy, 230, { w: 2.2, color: rgba('graphite', 0.6), amp: 2.6, taper: false });
    s.stroke(this.scaled(canopy, H2.cx, H2.cy, 1.05, 6, -6), 231, { w: 1.8, color: rgba('graphite', 0.42), amp: 4, freq: 3.2, taper: false });

    // the two figures: the boy, one size bigger, on the paper where he stood the first time; the small
    // n = 1 figure sitting at the foot — the same five strokes, one size down, and he sits exactly
    // where the shade is about to fall.
    const af = this.onBeat(this.word(L[2]!, 'afraid'));
    const up = prog(f.t, af, af + 0.5);
    this.boy(s, BIG_X, GROUND, BIG_H, 250, false, rgba('ink', 0.95), 3.8, 1);
    if (up < 1) this.boy(s, SIT_X, GROUND, SIT_H, 260, true, rgba('ink', 0.9), 3.2, 1 - up);

    // on "ever you're afraid" the canopy's shadow arrives: one SOLID flat `night2` shape spreading from
    // the foot — a shadow you can stand inside is a shape, not a wash. Drawn after the sitting figure,
    // so it genuinely sweeps over him.
    const ev = this.onBeat(this.word(L[2]!, 'ever'));
    const sh = prog(f.t, ev, ev + 1.3, ease.outQuad);
    if (sh > 0) {
      const spread = heart(SH.cx - (1 - sh) * 110, SH.cy, SH.rw * (0.35 + 0.65 * sh), SH.rh * (0.55 + 0.45 * sh), 0, TAU, 40);
      s.fill(spread, 240, rgba('night2', 1), { amp: 5 });
    }
    // …and he comes out of it standing: paper-coloured lines, the way this film draws a figure on night
    // (ink on `night2` would read as nothing at all).
    if (up > 0) this.boy(s, STAND_X, GROUND, SMALL_H, 270, false, rgba('paper', 0.95), 3.4, up);
    void d;
    return prog(f.t, ev, ev + 0.9) * (1 - prog(f.t, f.end - 0.15, f.end));
  }

  // ------------------------------------------------------------------ the boy
  /**
   * The boy: one line for the head, one for the spine, four for the limbs, no face. `sit` folds him at
   * the knees; `h` is the whole standing height, so the two ages of him are one number apart.
   */
  private boy(s: Sheet, x: number, y: number, h: number, seed: number, sit: boolean, color: string, w: number, a = 1) {
    if (a <= 0.01) return;
    const ink = { w, color, a, amp: 1.5, taper: false };
    const neck = y - h * (sit ? 0.5 : 0.72);
    const hip = y - h * (sit ? 0.2 : 0.4);
    const shoulder = y - h * (sit ? 0.44 : 0.66);
    s.arc(x, y - h * (sit ? 0.62 : 0.86), h * 0.14, 0.5, TAU + 0.2, seed, ink);
    s.stroke([v2(x, neck), v2(x + (sit ? 3 : 0), hip)], seed + 1, ink);
    s.stroke([v2(x, shoulder), v2(x - h * 0.2, y - h * (sit ? 0.24 : 0.45))], seed + 2, ink);
    s.stroke([v2(x, shoulder), v2(x + h * 0.19, y - h * (sit ? 0.24 : 0.46))], seed + 3, ink);
    if (sit) {
      s.stroke([v2(x + 2, hip), v2(x + h * 0.22, y - 5), v2(x + h * 0.3, y)], seed + 4, ink);
      s.stroke([v2(x - 2, hip), v2(x + h * 0.13, y - 2), v2(x + h * 0.17, y)], seed + 5, ink);
    } else {
      s.stroke([v2(x - 3, hip), v2(x - h * 0.06, y)], seed + 4, ink);
      s.stroke([v2(x + 3, hip), v2(x + h * 0.07, y)], seed + 5, ink);
    }
  }

  /** The same polyline, a little out of true — the passes of a scribble are never the same line twice. */
  private scaled(pts: V2[], cx: number, cy: number, k: number, dx: number, dy: number): V2[] {
    return pts.map((p) => v2(cx + (p.x - cx) * k + dx, cy + (p.y - cy) * k + dy));
  }

  // ------------------------------------------------------------------ the words (the reference block)
  /** The sung lines, written on the rules in order, word by word, never ahead of the voice. */
  private writeRules(s: Sheet, f: Frame) {
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i]!;
      if (f.t < l.start - 1.2) continue;                       // this rule is not being written yet
      const y = RULES[i]!;
      const words = l.words;
      let size = SIZE;
      let widths = words.map((q) => s.measureLetter(q.w, 'readable', size));
      let total = widths.reduce((n, q) => n + q, 0) + GAP * (words.length - 1);
      if (total > MAXW) {                                      // a long line must still fit the page
        size *= MAXW / total;
        widths = words.map((q) => s.measureLetter(q.w, 'readable', size));
        total = widths.reduce((n, q) => n + q, 0) + GAP * (words.length - 1);
      }
      // The pale guide: the whole line, barely there, so the rule is never blank. Dropped once the line
      // is fully sung — measured, all three guides cost 1054 single-segment strokes a frame, and a guide
      // under finished ink is a pencil echo nobody asked for (the ink is what stays on the page).
      const rise = clamp(prog(f.t, l.start - 1.2, l.start - 0.3), 0, 1);
      if (f.t < l.end + 0.4) {
        s.letter(l.text, W / 2, y, size, 60 + i, { font: 'readable', align: 'center', color: rgba('graphite', 0.22 * rise), w: 3, amp: 1.6 });
      }
      let penX = (W - total) / 2, x = penX;
      for (let k = 0; k < words.length; k++) {
        const q = words[k]!;
        const p = Lyrics.wordProgress(q, f.t);
        if (p > 0) {
          s.letterWritten(q.w, x, y, size, 70 + i * 8 + k, p, {
            font: 'readable', w: 4.4, amp: 2,
            color: p >= 1 ? rgba('ink', 0.96) : rgba('lantern', 0.95),
          });
        }
        if (p > 0 && p < 1) penX = x + widths[k]! * p;
        x += widths[k]! + GAP;
      }
      // the nib: a lantern tick that rides the word being sung this instant
      if (f.t >= l.start - 0.15 && f.t <= l.end + 0.2) {
        s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], 80 + i, { w: 4.2, color: rgba('lantern', 0.95) });
      }
    }
  }

  // ------------------------------------------------------------------ sync helpers
  /** The word of a line that starts the given fragment (falls back to the line's own start). */
  private word(l: Line, frag: string): number {
    const q = l.words.find((w) => w.w.toLowerCase().replace(/[^a-z]/g, '').startsWith(frag));
    return q ? q.start : l.start;
  }

  /** The last beat at/before t — the film's cut maths, so a movement starts on the grid, not on t. */
  private onBeat(t: number): number {
    const a = this.ctx.audio;
    return a.timeOfBeat(Math.floor(a.beatAt(t + 0.02)));
  }
}

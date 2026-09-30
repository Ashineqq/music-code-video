// Plate 6 — "See through the shoggoth's lies, / with your shinigami eyes"   (29.78 → 38.42 s)
//
// The friendliest drawing in the film, hiding the worst thing in it. A bland bone-white mask disc —
// two dot eyes, one smile — fills the frame. On "See through" a hand-drawn X-ray band sweeps left to
// right; wherever it has already passed the paper goes clear and the mask is replaced by what is
// underneath: a blanket mass built entirely from interlocking wobbly folds and dense hatching, with a
// scattering of little eyes that open on the kicks. The line splits with the scan: "see through the"
// is printed small on the mask's forehead — its polite voice — and is wiped away with the face, while
// SHOGGOTH'S and LIES, are engraved into the folds, a tentacle drawn back over each. On "shinigami
// eyes" those eyes fix on tags stacked down the LEFT margin, each with its name written as it is sung,
// a live lifespan counter and a leader line back to the eye it labels; a tag whose eye has closed is
// struck through and stamped EXPIRED. For the instrumental tail the eyes shut in sequence, the whole
// mass collapses down onto one ruled flatline, and the mask settles back on top of it.
//
// Hand-drawn rules (see _ink.ts): every wobble is seeded by the drawing index `s.d` — the Sheet adds
// `s.d` to each stroke seed itself — and every value that breathes is quantised by `s.d` or the
// drawing clock too, so the export's motion-blur sub-frames never smear one drawing into the next.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, TAU, heldT, type V2 } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- geometry (sheet px)
const MX = 960, MY = 486, RX = 530, RY = 372;    // the mass under the blanket
const MR = 366, MKX = 960, MKY = 468;            // the mask disc (and its sweet face)
const FLAT_Y = 902;                              // where the whole mass collapses to
const LEAD_OUT = W + 180;                        // the X-ray band's leading edge, parked off-frame
const PARK_X = W - 20;                           // where the instrument rests, in the sheet's right margin

/** Clamped smoothstep (the util one is not re-exported by _ink). */
const ss = (a: number, b: number, x: number) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
type Cam = { cx: number; cy: number; z: number; roll: number };
interface Eye { x: number; y: number; r: number }

/** A wobbly closed ring of points: a hand-drawn ellipse (and the makings of the mask, the eyes and the fold contours). */
function ring(cx: number, cy: number, r: number, seed: number, d: number, o: { n?: number; jag?: number; ry?: number; rot?: number } = {}) {
  const n = o.n ?? 30, jag = o.jag ?? 0.045, ry = o.ry ?? 1;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (o.rot ?? 0);
    const rr = 1 + jag * (noise1(i * 0.7 + d * 1.9 + seed, seed + 5) * 0.68 + noise1(i * 2.3 + d * 3.1 + seed, seed + 9) * 0.32);
    pts.push(v2(cx + Math.cos(a) * r * rr, cy + Math.sin(a) * r * ry * rr));
  }
  return pts;
}

/**
 * One fold of the blanket: a wavy line from a0 to a1 that domes upward (`bulge`) and fades to nothing
 * at both ends, with two crossing wave trains so it never reads as a sine. `amp`/`bulge` shrink to 0
 * as the mass collapses, which is what turns the folds into a flatline.
 */
function fold(a0: number, a1: number, y: number, bulge: number, waves: number, amp: number, phase: number): V2[] {
  const n = Math.max(8, Math.round(Math.abs(a1 - a0) / 22));
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(a0, a1, u);
    const env = Math.sin(Math.PI * u) ** 0.55;
    const wv = Math.sin(u * TAU * waves + phase) * 0.66 + Math.sin(u * TAU * waves * 2.35 + phase * 1.7) * 0.34;
    const dome = 1 - (2 * u - 1) ** 2;
    out.push(v2(x, y + wv * amp * env - bulge * dome));
  }
  return out;
}

/** The shinigami tags: one per word of the second line, stacked straight down the LEFT margin. */
const TAG_X = 116;
const TAG_YS = [200, 380, 560, 740];
const TAG = TAG_YS.map((y) => ({ x: TAG_X, y }));
/** Which little eye each tag labels, in tag order. Read through `% length`, so extra words cannot throw. */
const EYE_LINK = [1, 4, 8, 11];

export default class Shoggoth extends InkedScene {
  private l1 = this.ctx.lyrics.get('See through the shoggoth');
  private l2 = this.ctx.lyrics.get('with your shinigami eyes');
  /** The little eyes buried in the folds: fixed positions and sizes, deterministic. */
  private eyes: Eye[] = (() => {
    const out: Eye[] = [];
    for (let k = 0; k < 14; k++) {
      const a = hash(k, 21) * TAU;
      const rr = 0.30 + hash(k, 23) * 0.62;
      out.push({
        x: MX + Math.cos(a) * RX * 0.80 * rr,
        y: MY - RY * 0.34 + Math.sin(a) * RY * 0.62 * rr,
        r: 9 + hash(k, 27) * 12,
      });
    }
    return out;
  })();

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const kick = f.a.kick, snare = f.a.snare;
    // The eyes' pulse is read at the DRAWING clock, not from `t`: the lid rings are drawings, and a
    // pulse sampled per sub-frame made them animate on ones inside a single motion-blurred frame.
    const kickD = this.ctx.audio.hit('kick', heldT(t), 0.12);

    // ---- camera: a long slow push in, with a per-drawing hand-held jitter (seeded by d, so the
    //      frame itself boils; a jitter read from t would smear under motion blur)
    const push = ease.inOutCubic(clamp((t - 29.78) / 8.2));
    const cam: Cam = {
      cx: 960,
      cy: lerp(528, 500, push) + 1.7 * noise1(d * 0.43, 11),
      z: lerp(1.035, 1.0, push) + 0.0016 * noise1(d * 0.31, 3),
      roll: 0.0034 * noise1(d * 0.27, 7),
    };
    s.setCam(cam.cx, cam.cy, cam.z, cam.roll);

    // ---- the X-ray sweep. Where the leading edge has already passed, the paper is clear.
    const lead = t < 29.86 ? -200
      : t < 31.35 ? lerp(-200, LEAD_OUT, ease.inOutQuad((t - 29.86) / 1.49))
        : LEAD_OUT;
    const xray = lead > -190;

    // ---- the truth underneath, drawn only inside the cleared band
    // (the mass is flat onto FLAT_Y by 37.98, before the ruled line has finished drawing itself at
    //  38.08; every eye is shut by ~37.90. Both run off the drawing clock: a collapse is a stepped
    //  motion, and on raw t it would smear across the export's motion-blur sub-frames.)
    const hd = heldT(t);
    const collapse = clamp((hd - 37.30) / 0.68);
    const closing = clamp((hd - 37.10) / 1.00);
    if (xray) {
      const full = lead >= W + 120;                      // the band has left the frame: all of it is clear
      if (!full) this.clipTo(s, cam, -400, lead);
      // the paper goes transparent: a cooler, flatter sheet wherever the band has been
      const x0 = full ? -600 : -400, x1 = full ? W + 600 : lead;
      const band = [v2(x0, -700), v2(x1, -700), v2(x1, H + 700), v2(x0, H + 700)];
      s.fill(band, 180, rgba('paper2'), { a: 0.62, amp: 3.0 });
      s.fill(band, 181, rgba('cool'), { a: 0.10, amp: 3.0 });
      this.mass(s, t, d, kickD, collapse, closing);
      if (!full) s.c.restore();
    }

    // ---- the lie on top: the mask, drawn only outside the band (and unclipped once it settles back)
    const settle = clamp((t - 37.45) / 0.82);
    const maskDy = lerp(-860, 0, ease.outCubic(settle));
    if (!xray) {
      this.mask(s, d);
    } else if (settle > 0.001) {
      this.mask(s, d, MKY + maskDy);
    } else if (lead < W - 40) {
      this.clipTo(s, cam, lead, W + 400);
      this.mask(s, d);
      s.c.restore();
    }

    // ---- the instrument itself: a hatched band with a little handle, lifted away at the end (the
    //      yank is stepped off the drawing clock, or a 2000 px/s move would smear into a grey band)
    this.bar(s, lead, clamp((hd - 37.35) / 0.55));

    // ---- the flatline the mass collapses into: a short residual blip, then dead flat
    const fl = clamp((t - 37.50) / 0.58);
    if (fl > 0.02) this.flatline(s, ease.outCubic(fl));

    // ---- the cel frame, ruled last so the cleared band never washes it out
    s.rect(56, 44, W - 56, H - 44, 90, { w: 3.2, color: rgba('ink', 0.72), overshoot: 6, amp: 3.0 });

    // ---- lyric 1, split with the scan: polite words on the forehead, the rest cut into the folds
    const l1a = 1 - ss(33.42, 34.10, t);
    if (l1a > 0.02) this.lyricLine(s, d, t, lead);

    // ---- lyric 2: the words become margin tags, each tethered to the eye it labels
    if (t > 33.30) this.tags(s, d, t, closing);

    // ---- production slug, in the top margin (baseline 1024 sat inside the bottom margin and the
    //      bottom-left HUD corner)
    s.text('6 — SHOGGOTH', 100, 124, { size: 18, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 100, 124, { size: 18, fam: 'Plex-400', color: rgba('graphite', 0.5), align: 'right' });

    return { flash: 0.018 * snare, zoom: 1 + 0.0035 * kick };
  }

  // ------------------------------------------------------------------ clipping
  /**
   * Clip the sheet to the sheet-space slab [x0, x1]. The clip lives in device space, so the transforms
   * the Sheet re-applies for every stroke do not disturb it; hand back with `s.c.restore()`.
   */
  private clipTo(s: Sheet, cam: Cam, x0: number, x1: number) {
    const c = s.c;
    c.save();
    c.setTransform(cam.z, 0, 0, cam.z, W / 2, H / 2);
    c.translate(-cam.cx, -cam.cy);
    c.rotate(cam.roll);
    c.beginPath();
    c.rect(x0, -700, Math.max(0, x1 - x0), H + 1400);
    c.clip();
  }

  // ------------------------------------------------------------------ the mask
  /** The bland "assistant smile": a bone disc, two dots, one curve — proportions from _motifs.MASK. */
  private mask(s: Sheet, d: number, cy = MKY) {
    const R = MR, cx = MKX;
    // disc: flat bone fill, then a soft shade lune along the bottom so it reads against the paper
    s.fill(ring(cx, cy, R, 20, d, { n: 44, jag: 0.022 }), 21, rgba('paper', 1), { amp: 2.6 });
    const lune: V2[] = [];
    for (let i = 0; i <= 22; i++) { const a = lerp(0.18, Math.PI * 0.97, i / 22); lune.push(v2(cx + Math.cos(a) * R * 0.995, cy + Math.sin(a) * R * 0.995)); }
    for (let i = 22; i >= 0; i--) { const a = lerp(0.18, Math.PI * 0.97, i / 22); lune.push(v2(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72)); }
    s.fill(lune, 22, rgba('shade', 0.5), { amp: 3.4 });
    // the outline, heavy and sweet
    s.stroke(ring(cx, cy, R, 20, d, { n: 44, jag: 0.022 }), 23, { w: 4.6, closed: true, amp: 2.6, overshoot: 4 });
    // two dot eyes
    for (const sx of [-1, 1]) {
      s.blob(cx + sx * 0.30 * R, cy - 0.16 * R, 0.075 * R, 26 + sx, { colour: rgba('ink'), jag: 0.1, n: 18, outline: { w: 0 } });
    }
    // one smile curve (25°..155°, y down: the corners lift)
    s.arc(cx, cy - 0.08 * R, 0.50 * R, (25 * Math.PI) / 180, (155 * Math.PI) / 180, 28, { w: 9.5, amp: 2.0, overshoot: 6 });
  }

  // ------------------------------------------------------------------ the mass
  /**
   * The mass's outline. As `collapse` runs to 1 the whole thing SINKS onto FLAT_Y and flattens there —
   * squashing the radius alone left the outline hanging around MY while the folds ran down to the line,
   * which is why a second, separate flatline used to appear underneath a fading silhouette.
   */
  private massShape(d: number, collapse: number): V2[] {
    const n = 46, pts: V2[] = [];
    const cy = lerp(MY, FLAT_Y, collapse);
    const ry = RY * (1 - 0.96 * collapse);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      // a few deep lobes so the blanket is never a circle
      const lump = 1 + 0.14 * Math.sin(a * 3 + 0.7) + 0.09 * Math.sin(a * 5 - 1.1) + 0.05 * noise1(i * 0.9 + d * 2.3, 71);
      const rr = 1 + 0.03 * noise1(i * 1.7 + d * 3.7, 73);
      pts.push(v2(MX + Math.cos(a) * RX * lump * rr, cy + Math.sin(a) * ry * lump * rr));
    }
    return pts;
  }

  /** The arc of the outline below yLow, closed with a chord — the region that gets the dense hatching. */
  private lowerArc(pts: V2[], yLow: number): V2[] {
    let first = -1, last = -1;
    for (let i = 0; i < pts.length; i++) if (pts[i]!.y >= yLow) { if (first < 0) first = i; last = i; }
    if (first < 0) return [];
    const out: V2[] = [];
    for (let i = first; i <= last; i++) out.push(pts[i]!);
    out.push(v2(out[out.length - 1]!.x, yLow), v2(out[0]!.x, yLow));
    return out;
  }

  /**
   * The thing under the blanket: a light tone, dense hatching, then many overlapping wobbly fold
   * curves and drapes over the top, and the little eyes. Everything collapses toward FLAT_Y as
   * `collapse` runs to 1, and the eyes shut in sequence over `closing`. The mass keeps full opacity
   * until its outline has actually flattened onto the line; only the residue fades away after that.
   */
  private mass(s: Sheet, t: number, d: number, kick: number, collapse: number, closing: number) {
    const fade = 1 - ss(38.00, 38.30, t);
    if (fade < 0.02) return;
    const cc = ease.inOutCubic(collapse);
    const outline = this.massShape(d, cc);

    // tone under everything, so the mass separates from the cleared paper
    s.fill(outline, 200, rgba('shade'), { a: 0.20 * (1 - 0.35 * cc) * fade, amp: 5 });

    // second tone by hatching: coarse over the whole mass, dense through the lower folds
    s.hatch(outline, 202, { spacing: 17, angle: -Math.PI / 3.1, color: rgba('ink', (0.26 + 0.18 * cc) * fade), w: 1.35 });
    const low = this.lowerArc(outline, lerp(MY + RY * 0.10, FLAT_Y - 10, cc));
    if (low.length > 4) s.hatch(low, 204, { spacing: 10, angle: -Math.PI / 2.7, color: rgba('ink', (0.34 + 0.2 * cc) * fade), w: 1.5 });

    // the folds: overlapping wobbly curves, each collapsing on its own stagger
    const K = 12;
    for (let k = 0; k < K; k++) {
      const u = k / (K - 1);
      const ck = ease.inOutCubic(clamp(cc * 1.4 - u * 0.4));
      const baseY = lerp(MY - RY * 0.80, MY + RY * 0.74, u);
      const y = lerp(baseY, FLAT_Y, ck);
      const chord = RX * Math.sqrt(Math.max(0, 1 - ((baseY - MY) / RY) ** 2));
      const hw = lerp(chord, RX * 1.06, ck);
      const waves = 1.1 + hash(k, 3) * 1.5;
      const amp = (10 + hash(k, 5) * 14) * (1 - 0.9 * ck);
      const bulge = (20 + hash(k, 7) * 26) * (1 - ck);
      s.stroke(fold(MX - hw, MX + hw, y, bulge, waves, amp, hash(k, 9) * TAU), 300 + k * 6, { w: 3.3 - 0.06 * k, color: rgba('ink', 0.94 * fade), amp: 2.4 });
    }

    // drapes: the blanket pleats, hanging from the crown to the base
    for (let k = 0; k < 5; k++) {
      const u = (k + 0.5) / 5;
      const x0 = MX + (u - 0.5) * RX * 1.15;
      const x1 = MX + (u - 0.5) * RX * 2.0;
      const side = Math.sign(x1 - x0) || 1;
      const ck = ease.inOutCubic(clamp(cc * 1.35 - k * 0.085));
      const pts: V2[] = [];
      for (let i = 0; i <= 9; i++) {
        const q = i / 9;
        const y = lerp(lerp(MY - RY * 0.78, MY + RY * 0.66, q), FLAT_Y, ck);
        pts.push(v2(lerp(x0, x1, q) + Math.sin(q * Math.PI) * side * 46 * (1 - ck), y));
      }
      s.stroke(pts, 420 + k * 5, { w: 3.0, color: rgba('ink', 0.85 * fade), amp: 2.8 });
    }

    // the silhouette, drawn last so the outline stays crisp over the folds
    s.stroke(outline, 210, { w: 4.2, closed: true, amp: 3.0, overshoot: 5, color: rgba('ink', 0.98 * fade) });

    // ---- the little eyes
    const lookAmt = clamp((t - 33.40) / 0.65);
    const ne = Math.max(1, this.eyes.length - 1);
    for (let k = 0; k < this.eyes.length; k++) {
      const e = this.eyes[k]!;
      const ey = lerp(e.y, FLAT_Y + 6, ease.inOutCubic(clamp(cc * 1.35 - k * 0.02)));
      const closeAt = (k / ne) * 0.5;
      const shut = ss(closeAt, closeAt + 0.30, closing);
      const open = clamp(0.16 + 1.5 * kick + 0.28 * noise1(d * 0.61 + k * 1.3, 41), 0, 1) * (1 - shut);
      if (open < 0.03) continue;
      const r = e.r * (0.14 + 0.86 * open);
      // where this eye is looking: toward its tag once the tags are up, else a slow hand-held drift
      const link = EYE_LINK.indexOf(k);
      let lx = noise1(d * 0.33 + k, 51) * 6, ly = noise1(d * 0.41 + k, 57) * 4;
      if (link >= 0 && link < TAG.length && lookAmt > 0.01) {
        const tg = TAG[link]!;
        const dx = tg.x - e.x, dy = tg.y - ey, L = Math.hypot(dx, dy) || 1;
        lx = lerp(lx, (dx / L) * r * 0.55, lookAmt);
        ly = lerp(ly, (dy / L) * r * 0.55, lookAmt);
      }
      // the lid: a wobbly ring, drawn every drawing
      s.stroke(ring(e.x, ey, r, 520 + k, d, { n: 18, jag: 0.12 }), 530 + k, { w: 2.8, closed: true, amp: 1.5, color: rgba('ink', fade) });
      if (open > 0.34 && fade > 0.3) s.blob(e.x + lx, ey + ly, r * 0.42, 560 + k, { colour: rgba('ink', fade), jag: 0.14, n: 14, outline: { w: 0 } });
    }
  }

  // ------------------------------------------------------------------ the instrument
  /**
   * The X-ray band. Its leading edge (`x`) drives the sweep, but the band it draws parks in the sheet's
   * right margin instead of following it off the frame: parked at LEAD_OUT it was already out of shot,
   * so `lift` — the hand taking the instrument away — never rendered at all. Driven by its own lift
   * progress, the exit now actually happens.
   */
  private bar(s: Sheet, x: number, lift: number) {
    if (x < -70) return;
    const bx = Math.min(x, PARK_X);
    const a = 1 - ss(0.58, 1.0, lift);
    if (a < 0.02) return;
    const yoff = -1160 * ease.inCubic(lift), hw = 34;
    const rect = [v2(bx - hw, yoff - 40), v2(bx + hw, yoff - 40), v2(bx + hw, H + 40 + yoff), v2(bx - hw, H + 40 + yoff)];
    s.fill(rect, 700, rgba('paper2'), { a: 0.9 * a, amp: 2.4 });
    s.hatch(rect, 701, { spacing: 15, angle: -Math.PI / 3.2, color: rgba('cool', 0.5 * a), w: 1.4 });
    for (const sx of [-1, 1]) {
      s.stroke([v2(bx + sx * hw, yoff - 40), v2(bx + sx * hw, H + yoff + 40)], 702 + sx, { w: 3.6, color: rgba('ink', 0.9 * a), amp: 2.4, overshoot: 9 });
    }
    s.arc(bx, yoff - 46, 26, 0, TAU, 704, { w: 3.2, color: rgba('ink', 0.85 * a), taper: false });
  }

  // ------------------------------------------------------------------ the flatline
  /** Ruled left to right: a residual spike while the pen starts, then dead flat. */
  private flatline(s: Sheet, p: number) {
    const x0 = 430, xe = lerp(x0, 1490, p), b = clamp(1 - p / 0.5);
    const pts: V2[] = [v2(x0, FLAT_Y)];
    const sx = x0 + 96;
    if (xe > sx) pts.push(v2(sx, FLAT_Y), v2(sx + 16, FLAT_Y - 74 * b), v2(sx + 32, FLAT_Y));
    pts.push(v2(xe, FLAT_Y));
    s.stroke(pts, 640, { w: 3.8, color: rgba('ink'), amp: 1.8, overshoot: 12 });
  }

  // ------------------------------------------------------------------ lyric 1
  /**
   * "See through the shoggoth's lies,", split the way the treatment wants it. The polite half — "see
   * through the" — is printed small on the mask's forehead and goes with the face when the scan wipes
   * over it; the rest, SHOGGOTH'S and LIES,, is engraved into the folds with a tentacle drawn back over
   * it, so the type is part of the drawing. (No caption card any more: the one this line used to sit on
   * reached down into the protected bottom-right corner.)
   */
  private lyricLine(s: Sheet, d: number, t: number, lead: number) {
    const words = this.l1.words, fam = 'readable' as const;
    const a = 1 - ss(33.42, 34.10, t);
    if (a < 0.02) return;

    // the polite voice, on the forehead, only while there is still a forehead to print it on
    const forehead = 1 - ss(840, 1100, lead);
    if (forehead > 0.02) {
      const SMALL = 34, n = Math.min(3, words.length);
      const sw: number[] = [];
      for (let i = 0; i < n; i++) sw.push(s.measureLetter(words[i]!.w, fam, SMALL));
      let tot = 12 * Math.max(0, n - 1);
      for (const q of sw) tot += q;
      let x = MKX - tot / 2;
      const fy = MKY - 0.58 * MR;
      for (let i = 0; i < n; i++) {
        const w = words[i]!, p = Lyrics.wordProgress(w, t);
        const y = fy + 2.2 * noise1(d * 0.6 + i, 71);
        if (p < 1) s.letterWritten(w.w, x, y, SMALL, 300 + i * 3, 1, { font: fam, ghost: true });
        s.letterWritten(w.w, x, y, SMALL, 300 + i * 3, p, { font: fam, color: p >= 1 ? rgba('ink') : rgba('signal'), w: 2.6, a: forehead });
        x += sw[i]! + 12;
      }
    }

    // the big words: cut into the folds, each with one fold drawn back over the lettering. The scan
    // reveals each of them as its edge sweeps over it — nothing is left half on the mask and half off.
    for (let i = 3; i < words.length; i++) {
      const w = words[i]!, k = i - 3;
      const size = k === 0 ? 104 : 116;
      const bx = k === 0 ? 900 : 1040, by = k === 0 ? 620 : 772;
      const p = Lyrics.wordProgress(w, t);
      const ax = bx + 3.0 * noise1(d * 0.4 + k * 2.1, 77), ay = by + 2.6 * noise1(d * 0.5 + k, 79);
      const reveal = a * ss(ax - size * 1.1, ax + size * 0.35, lead);
      if (reveal < 0.03) continue;
      if (p < 1) s.letterWritten(w.w, ax, ay, size, 400 + k * 3, 1, { font: fam, ghost: true, align: 'center' });
      s.letterWritten(w.w, ax, ay, size, 400 + k * 3, p, { font: fam, color: p >= 1 ? rgba('ink') : rgba('signal'), w: size * 0.085, align: 'center', a: reveal });
      s.stroke(fold(ax - size * 2.1, ax + size * 2.1, ay - 22, 30, 2.3, 13, hash(k, 83) * TAU), 440 + k * 4, { w: 3.0, color: rgba('ink', 0.5 * reveal), amp: 2.6 });
    }
  }

  // ------------------------------------------------------------------ lyric 2: margin tags
  /**
   * "with your shinigami eyes", each word a pasted tag stacked down the LEFT margin: the name written
   * as it is sung, the eye it labels wired to it by a leader line, and a lifespan counter that ticks
   * down as that eye shuts. A tag whose eye has closed is struck through and stamped EXPIRED.
   */
  private tags(s: Sheet, d: number, t: number, closing: number) {
    const words = this.l2.words, fam = 'readable' as const;
    const a = ss(33.32, 33.76, t) * (1 - ss(37.55, 38.15, t));
    if (a < 0.02) return;
    const ne = Math.max(1, this.eyes.length - 1);
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      const tg = TAG[i % TAG.length]!;
      const size = clamp(52 - Math.max(0, w.w.length - 6) * 2.4, 30, 52);
      const ww = s.measureLetter(w.w, fam, size);
      const tx = tg.x, ty = tg.y + 2.4 * noise1(d * 0.7 + i, 63);    // the tag boils with the drawing
      const x0 = tx - 20, x1 = tx + ww + 20;
      // the eye this tag labels. A missing link or a shorter eye list just means no leader line.
      const li = EYE_LINK.length > 0 ? EYE_LINK[i % EYE_LINK.length]! : -1;
      const eye = li >= 0 && li < this.eyes.length ? this.eyes[li]! : null;

      // leader line first, so the card sits over its own tether
      if (p > 0.02 && eye) {
        const ex = x1 + 8, eyy = ty - 16;
        const pts: V2[] = [];
        for (let k = 0; k <= 10; k++) {
          const q = k / 10;
          const bow = -Math.sin(q * Math.PI) * 40;
          pts.push(v2(lerp(ex, eye.x, q) + bow, lerp(eyy, eye.y, q) + Math.sin(q * Math.PI) * 16));
        }
        s.stroke(pts, 800 + i * 7, { w: 1.5, color: rgba('ink', 0.55 * a * p), taper: false, amp: 2.2 });
      }

      // the card
      s.fill([v2(x0, ty - 58), v2(x1, ty - 58), v2(x1, ty + 26), v2(x0, ty + 26)], 810 + i * 3, rgba('paper'), { a: 0.92 * a, amp: 2.2 });
      s.stroke([v2(x0, ty - 58), v2(x1, ty - 58), v2(x1, ty + 26), v2(x0, ty + 26)], 812 + i * 3, { w: 2.2, closed: true, amp: 2.4, color: rgba('ink', 0.55 * a), overshoot: 5 });

      // the word, written as it is sung
      if (p < 1) s.letterWritten(w.w, tx, ty, size, 840 + i * 3, 1, { font: fam, ghost: true });
      s.letterWritten(w.w, tx, ty, size, 840 + i * 3, p, { font: fam, color: p >= 1 ? rgba('ink') : rgba('signal'), w: 4.4, a });

      // the lifespan counter: the machine's voice, ticking down as the eye it labels shuts
      const closeAt = (Math.max(0, li) / ne) * 0.5;
      const shut = ss(closeAt, closeAt + 0.30, closing);
      const life = Math.max(0, Math.round((1 - shut) * (8 + hash(i, 71) * 88)));
      s.text(`${life}s`, x0 + 8, ty + 20, { size: 16, fam: 'Plex-400', color: rgba('ink2', 0.9), a });
      if (shut > 0.5) {
        // expired: struck through the name, and stamped
        s.stroke([v2(x0 + 6, ty - 14), v2(x1 - 6, ty - 24)], 880 + i, { w: 2.6, color: rgba('blood', 0.95 * a), amp: 1.6, overshoot: 6 });
        s.text('EXPIRED', x1 - 8, ty + 20, { size: 15, fam: 'Plex-400', color: rgba('blood', 0.95), a, align: 'right' });
      }
    }
  }
}

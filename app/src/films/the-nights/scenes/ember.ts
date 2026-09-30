// Plate 15 — ember (123.39 → 135.29 s, 6¼ bars, instrumental). What the `thunder` plate hatched, this
// plate takes apart again: the fire's concentric half-rings contract and are lost one per bar until a
// single ember is left in the middle of the page; the night then lifts off the page from every edge
// (the chorus flood, run backwards) until the sheet is paper again; and on the last bar the ember is
// blown out — three ink sparks, drawn on three consecutive drawings, and then nothing.
//
// Nothing is sung inside this window, so there is no `Lyrics` import and no word reveal here: the
// plate's whole job is to hand the page back to the closing plates in daylight.
//
// Everything that moves is cut on the bar grid (`a.barAt` / `a.downbeats`), never on round seconds, and
// every wobble is seeded by the drawing index. No cross-frame state.
//
// ---------------------------------------------------------------------------------------------------
// CROSS-PLATE CONTRACT — THE FIRE (shared with `thunder`, written in parallel; see the plate's report)
//   hearth centre  (FX, FY) = (960, 600)      — the middle of the page
//   shape          five concentric UPPER HALF-CIRCLES (angle π → 2π), closed along the hearth line
//   ring radii     R = [28, 76, 124, 172, 216] px (ring 0 is the ember itself)
//   tones          solid `shade` for the outermost skirt, solid `lantern` inside it, `star` at the core
//   `thunder` grows this fire one ring per beat and leaves it at full size (outer radius 216) at the
//   end of "Light a fire they can't put out"; this plate inherits that state (one bar of it, held) and
//   then loses rings 4,3,2,1 on the four bar lines after the first, one per bar. If `thunder` settles on
//   other numbers, this block is the only place in this file that describes the fire.
// ---------------------------------------------------------------------------------------------------
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, drawing, CEL } from './_ink';
import type { V2 } from './_ink';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The page's furniture — the reference plate's own numbers, so every plate is the same page. */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
const RULES = [720, 818, 916]; // the three writing rules (canonical: 720/818/916, so a descender stays inside y ≤ 940)

/** The hearth. See the cross-plate contract above. */
const FX = 960;
const FY = 600;
const R = [28, 76, 124, 172, 216];
const N = R.length;

/** Arc resolution: enough points that the wobble has material to work with, and no more. */
const arcSteps = (r: number) => Math.max(8, Math.round(r / 9));

/** The night at full strength: a patch big enough to cover the whole sheet, corners and edges included. */
const NIGHT_HW = 1030;
const NIGHT_HH = 640;

/** An upper half-circle about the hearth, as a flat cel polygon (its base line closes the path). */
const halfDisc = (r: number): V2[] => {
  const n = arcSteps(r);
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    out.push(v2(FX + Math.cos(a) * r, FY + Math.sin(a) * r));
  }
  return out;
};

/** The half-annulus between two contours: one ring's band (out over the top, back along the inside). */
const halfRing = (ro: number, ri: number): V2[] => {
  const no = arcSteps(ro), ni = arcSteps(ri);
  const out: V2[] = [];
  for (let i = 0; i <= no; i++) {
    const a = Math.PI + (i / no) * Math.PI;
    out.push(v2(FX + Math.cos(a) * ro, FY + Math.sin(a) * ro));
  }
  for (let i = ni; i >= 0; i--) {
    const a = Math.PI + (i / ni) * Math.PI;
    out.push(v2(FX + Math.cos(a) * ri, FY + Math.sin(a) * ri));
  }
  return out;
};

/** The night's patch: a rounded rectangle, centred on the hearth, that the paper eats from every edge. */
const patchPoly = (hw: number, hh: number, rad: number, n = 6): V2[] => {
  const r = Math.max(0, Math.min(rad, hw * 0.98, hh * 0.98));
  const out: V2[] = [];
  const corners: [number, number, number][] = [
    [FX + hw - r, FY + hh - r, 0],
    [FX - hw + r, FY + hh - r, Math.PI / 2],
    [FX - hw + r, FY - hh + r, Math.PI],
    [FX + hw - r, FY - hh + r, Math.PI * 1.5],
  ];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push(v2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
  }
  return out;
};

export default class Ember extends InkedScene {
  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const start = this.ctx.start, end = this.ctx.end;

    // ---------------------------------------------------------------- the bar grid
    // The plate opens mid-bar (its cut is the beat the last "My father told me" lands on), so the fire's
    // first ring goes on the first WHOLE bar line inside the window.
    const firstBar = Math.ceil(a.barAt(start) - 1e-6);
    const barT = (k: number) => Math.min(end, a.downbeats[k] ?? end);
    // The window is 25 beats = 6¼ bars: the sixth bar line starts the plate's final bar, and the ember
    // is blown out on that bar's third beat.
    const lastBar = firstBar + 5;
    const dBlowT = barT(lastBar);
    const blowT = a.timeOfBeat(Math.round(a.beatAt(dBlowT)) + 2);
    const dBlow = drawing(blowT); // the drawing the ember goes out on (its sparks take the next two)

    // ---------------------------------------------------------------- the fire's burn-down clock
    // The plate opens holding the fire `thunder` left it at — one bar of it — and then loses a ring on
    // each of the next four bar lines. Ring i (1..N-1) contracts into the ring inside it over the half
    // second before its bar, then is gone.
    const ringDead = (i: number) => barT(firstBar + (N - i));
    const life = (i: number) => 1 - prog(t, ringDead(i) - 0.55, ringDead(i), ease.outQuad);
    const solo = prog(t, barT(firstBar + 4), blowT - 0.3, ease.inQuad);  // the ember alone: it dwindles
    const gone = prog(t, blowT - 0.22, blowT, ease.inQuad);             // and is blown out
    const flare = prog(t, blowT - 0.34, blowT, ease.outQuad);           // its last breath

    const c: number[] = [];
    c[0] = R[0]! * lerp(1, 0.78, solo) * (1 - gone);
    for (let i = 1; i < N; i++) c[i] = lerp(R[i - 1]!, R[i]!, life(i));
    // The rings are lost from the outside in, so the ones still on the fire are always 1..live (0 when
    // the ember is alone). A ring whose bar has passed is NOT drawn at all: its contour has already
    // closed onto the ring inside it, and drawing it would put a ghost band back on the fire.
    let live = 0;
    for (let i = 1; i < N; i++) if (t < ringDead(i)) live = i;

    // ---------------------------------------------------------------- the night lifting off the page
    // Half the rings are gone before the paper starts to close in from the edges; it has finished by the
    // time the ember is blown, so the sparks are ink on bare paper.
    const liftStart = barT(firstBar + 2);
    const kn = prog(t, liftStart, blowT - 0.18, ease.inOutQuad); // 0 = the page is night, 1 = paper
    const hw = NIGHT_HW * (1 - kn), hh = NIGHT_HH * (1 - kn);
    // the page's own lines sit at the very edge, so they come back to the paper long before the middle
    // has: their colour follows the retreating edge itself, not the clock.
    const kf = clamp((FX - hw - FRAME[0]) / 200);

    // ---------------------------------------------------------------- camera
    // One breath in and back: the first and the last frame of the plate sit exactly on the sheet, so the
    // closing plates get the film's page back unchanged.
    const u = clamp((t - start) / (end - start));
    s.setCam(W / 2, H / 2, 1 + 0.016 * Math.sin(Math.PI * u), 0);

    // ---------------------------------------------------------------- 1. the night, and its retreat
    this.night(s, hw, hh, kn);

    // ---------------------------------------------------------------- 2. the page's furniture
    this.page(s, kf);

    // ---------------------------------------------------------------- 3. the hearth line (the thread)
    // The fire stands on the film's horizon; when the night goes, its ground goes with it.
    if (kn < 1) {
      s.stroke([v2(FX - 310, FY + 3), v2(FX + 310, FY + 3)], 61, {
        w: 2, amp: 1.8, taper: false, color: rgba('star', 0.4 * (1 - kn)),
      });
    }

    // ---------------------------------------------------------------- 4. the fire
    this.fire(s, t, live, c, flare);

    // ---------------------------------------------------------------- 5. the blow-out
    // Three ink sparks on three CONSECUTIVE drawings — one exposure each, the way a hand draws a spark.
    for (let i = 0; i < 3; i++) {
      if (d !== dBlow + i) continue;
      const sx = FX + (hash(i, 5) - 0.5) * 46;
      const sy = FY - 20 - i * 30 - 12 * hash(i, 9);
      this.spark(s, sx, sy, 900 + i * 13);
    }
    // and the smoke of it, gone well before the plate ends
    const wisp = prog(t, blowT, blowT + 0.6);
    if (wisp > 0 && wisp < 1) this.smoke(s, d, wisp);

    // ---------------------------------------------------------------- post
    // The warmth belongs to the fire: flat cel once it is out (and the page has nothing warm left on it).
    const warm = 1 - prog(t, blowT, blowT + 0.5);
    return warm > 0.02 ? { ...CEL.hot, vignette: lerp(0.2, 0.16, kn) } : CEL.flat;
  }

  /**
   * The night, and the paper eating it from the edges. The mass is SOLID (alpha 1) — a flat cel shape,
   * not a wash — and its retreat is read off one hand-drawn edge: a `cool` hatch band lying just inside
   * it and a light `graphite` line on top (never a sketch line doing the mass's job).
   */
  private night(s: Sheet, hw: number, hh: number, kn: number) {
    if (hw < 22) return; // the last of it is gone: the page is paper from here on
    const rad = Math.min(0.45 * Math.min(hw, hh), 300 * kn);
    const patch = patchPoly(hw, hh, rad);
    s.fill(patch, 200, rgba('night', 1), { amp: 5 });
    // the edge only exists once it is on the sheet (before that the patch covers it entirely)
    const onSheet = hw < 940 || hh < 520;
    if (!onSheet) return;
    // the hatch band is texture: it appears once the edge is small enough for it to read (and once the
    // patch is cheap enough to pay for a third wobble — a full-sheet patch is the frame's dearest shape)
    const bandA = 0.3 * clamp((780 - hw) / 140);
    if (bandA > 0.01 && hw > 46) {
      // a wide translucent stroke on an inset patch = the hatch band at the retreating edge, drawn once
      const band = patchPoly(hw - 24, hh - 24, Math.max(0, rad - 22));
      s.stroke(band, 201, { closed: true, w: 46, amp: 5, taper: false, color: rgba('cool', bandA) });
    }
    s.stroke(patch, 202, { closed: true, w: 2, amp: 5, taper: false, color: rgba('graphite', 0.5) });
  }

  /**
   * The page: its frame and its three rules. While the page is night they are drawn paper-coloured (the
   * chorus's negative); once the night has lifted they are the reference plate's ink on paper. `kf` is
   * how far the retreating edge has already passed the furniture.
   */
  private page(s: Sheet, kf: number) {
    const F = FRAME;
    if (kf < 1) {
      const p = 1 - kf;
      s.rect(F[0], F[1], F[2], F[3], 2, { w: 2.6, amp: 1.6, overshoot: 9, color: rgba('star', 0.5 * p) });
      s.rect(F[0] + 9, F[1] + 9, F[2] - 9, F[3] - 9, 3, { w: 1, sketch: true, color: rgba('star', 0.3 * p) });
      for (let i = 0; i < RULES.length; i++) {
        const y = RULES[i]!;
        s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, overshoot: 12, color: rgba('star', 0.34 * p) });
      }
    }
    if (kf > 0) {
      s.rect(F[0], F[1], F[2], F[3], 2, { w: 2.6, amp: 1.6, overshoot: 9, color: rgba('ink', 0.5 * kf) });
      s.rect(F[0] + 9, F[1] + 9, F[2] - 9, F[3] - 9, 3, { w: 1, sketch: true, color: rgba('graphite', 0.4 * kf) });
      for (let i = 0; i < RULES.length; i++) {
        const y = RULES[i]!;
        s.stroke([v2(238, y + 12), v2(1690, y + 12)], 40 + i, { w: 1.6, sketch: true, overshoot: 12, color: rgba('graphite', 0.5 * kf) });
      }
    }
  }

  /**
   * The fire. One solid band per live ring, drawn outside in, so each is the annulus between its own
   * contour and the one inside it: the outermost live ring is the pale `shade` skirt, the rest are solid
   * `lantern`. Every mass is solid (`shade` and `lantern` are different palette keys, never a lower
   * alpha), hatched inside and outlined by a light contour. `live` = 0 means only the ember is left.
   */
  private fire(s: Sheet, t: number, live: number, c: number[], flare: number) {
    // a fire is never still: brightness and size both step on the drawing clock (never on `t`)
    const nz = 0.5 + 0.5 * noise1(heldT(t) * 7, 11);
    const fl = 0.78 + 0.22 * nz;
    const breathe = 0.97 + 0.06 * nz;
    for (let i = live; i >= 1; i--) {
      const r = c[i]! * breathe, ri = c[i - 1]! * breathe;
      if (r - ri < 1.5) continue; // this ring has just closed onto the one inside it: it is gone
      const skirt = i === live;
      const band = halfRing(r, ri);
      s.fill(band, 300 + i, rgba(skirt ? 'shade' : 'lantern', 1), { amp: 3 });
      s.hatch(band, 300 + i, {
        spacing: 19, angle: -Math.PI / 3.4, w: 1.6,
        color: skirt ? rgba('lantern', 0.5) : rgba('shade', 0.45),
      });
      s.stroke(band, 300 + i, { w: 2.4, amp: 2.4, taper: false, color: rgba(skirt ? 'graphite' : 'ink', 0.55) });
    }
    // the ember itself: solid, ~50 px across, with a hot centre; it flares once and goes out on `blowT`
    const r0 = c[0]! * breathe;
    if (r0 > 1.5) {
      const disc = halfDisc(r0);
      s.fill(disc, 299, rgba('lantern', 1), { amp: 2 });
      s.hatch(disc, 299, { spacing: 12, angle: -Math.PI / 3.4, w: 1.4, color: rgba('shade', 0.4) });
      s.stroke(disc, 299, { w: 3.2, taper: false, color: rgba('ink', 0.6) });
      const hot = r0 * 0.55 * fl * (1 + 0.9 * flare);
      // the core stays a SOLID dot (it is a mass, not a wash): the flicker moves it, it never thins it out
      if (hot > 2) s.blob(FX, FY - r0 * 0.42, hot, 298, { colour: rgba('star', clamp(0.72 + 0.28 * fl + 0.5 * flare, 0, 1)), n: 9, jag: 0.32 });
    }
  }

  /** One spark: a hot head and five ink rays — a single drawing, then it is not there (see `draw`). */
  private spark(s: Sheet, x: number, y: number, seed: number) {
    for (let j = 0; j < 5; j++) {
      const a0 = -Math.PI / 2 + (hash(j, seed) - 0.5) * 2.6;
      const r0 = 4 + 5 * hash(j + 3, seed);
      const L = 14 + 22 * hash(j + 9, seed);
      s.stroke(
        [v2(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0), v2(x + Math.cos(a0) * (r0 + L), y + Math.sin(a0) * (r0 + L))],
        seed + j, { w: 3.2, amp: 1.2, color: rgba('ink', 0.95) },
      );
    }
    s.blob(x, y, 8, seed + 40, { colour: rgba('lantern', 1), n: 8, jag: 0.45 });
    s.blob(x, y, 4, seed + 41, { colour: rgba('star', 1), n: 7, jag: 0.4 });
  }

  /** The ember's smoke: three graphite threads rising and thinning out over the last half second. */
  private smoke(s: Sheet, d: number, w: number) {
    for (let i = 0; i < 3; i++) {
      const yy = FY - 26 - w * (92 + i * 26);
      const x = FX + noise1(i * 3.1 + d * 0.7, 3) * 30;
      s.stroke([v2(FX - 24 + i * 20, yy + 20), v2(x - 10, yy + 2), v2(x + 4, yy - 16)], 950 + i, {
        w: 2, amp: 2.6, taper: false, color: rgba('graphite', 0.5 * (1 - w)),
      });
    }
  }
}

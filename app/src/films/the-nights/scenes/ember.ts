/*!plate
{
  "id": "ember",
  "window": [123.3854, 135.2902],
  "device": "woven",
  "staging": "instrument",
  "typePx": 0,
  "bands": [
    { "name": "night", "y": [96, 616] },
    { "name": "fire", "y": [616, 886] },
    { "name": "ash", "y": [886, 926] },
    { "name": "scrub", "y": [926, 980] }
  ],
  "movements": [
    { "at": 123.3854, "camera": "hold-on-fire" },
    { "at": 124.8140, "camera": "crane-out-i" },
    { "at": 126.2426, "camera": "crane-out-ii" },
    { "at": 127.6711, "camera": "crane-out-iii" },
    { "at": 129.0997, "camera": "crane-out-iv" },
    { "at": 130.5283, "camera": "crane-out-v" },
    { "at": 131.4807, "camera": "settle-in" },
    { "at": 132.4330, "camera": "punch-in-ember" },
    { "at": 133.8616, "camera": "whip-out" },
    { "at": 134.3378, "camera": "crane-in-scorch" }
  ]
}
*/
// Plate 15 — `ember` (123.385 → 135.290 s, 6¼ bars, INSTRUMENTAL — nothing is sung inside this window,
// hence `staging: "instrument"`, `typePx: 0`, no `Lyrics` import and no word reveal: what has to move
// here is the page itself). The block above is the machine-checked contract; this comment is the story
// behind it and must not drift from it.
//
// RE-SHOOT (v2). The first pass held one drawing for twelve seconds — a single camera breath and no
// sub-shots — and read as a still. This pass gives the plate a camera sub-shot table and something
// visibly changing in every movement (`references/03-animation.md §2`: in 2-D a reframe IS the cut —
// give the plate a table of (cx, cy, zoom, roll) and whip between entries; §3: change the composition
// every 1.1–1.5 s, or the audience sees "one drawing moving slowly").
//
// WORLD (the manifest's `device: "woven"` is the honest one for a plate with no lyric: every mass here
// carries its own hatch — the cel's second tone — and the fire's trace is burnt into the page, which is
// this plate's way of engraving). The page is still night; in its foot, on the film's thread, there is a
// fire — the one `thunder` grew (cross-plate contract below) — with a band of dry scrub along the near
// ground and the ash the ground keeps. Nothing is sung, so the plate's subject is subtraction: the
// fire's rings go out one per bar, the night lifts off the page from every edge, and what is left at the
// end is bare paper with the fire's scorch baked into it. One subject at full attention at a time; every
// outline re-drawn per drawing (`s.d`), so nothing in a held frame is mechanically still.
//
// TEN MOVEMENTS (the manifest's list — one per camera sub-shot, a reframe every 1.43 s), grouped into
// five phases. Boundaries are beats of the analysed grid (`at(k)`), never round seconds:
//   PHASE 1  the rings die one per bar   mv 1–3   (123.385 → 127.671)  ring 4 contracts onto ring 3 on
//            the bar at 125.766 (beat 5), ring 3 onto ring 2 at 127.671 (beat 9). Page night to edge.
//   PHASE 2  the crane out, the night lifting from every edge   mv 4–6   (127.671 → 131.481)  rings 2
//            and 1 die on the bars at 129.576 and 131.481 (beats 13, 17) while the night's edge sweeps
//            in from all four sides at once; the camera cranes out 1.26 → 0.98 so the sweep is read at
//            page scale.
//   PHASE 3  the ember alone, pulsing   mv 7–8   (131.481 → 133.862)  one solid dot on paper: every
//            kick swells it (stepped on the drawing clock) and throws a step of light down the scrub.
//   PHASE 4  the blow-out   mv 9   (133.862)  on three CONSECUTIVE DRAWINGS (`dBlow`, +1, +2).
//   PHASE 5  bare paper   mv 10   (134.338 → 135.290)  the crane in onto the scorch, the only trace.
//
// CAMERA (levels in the manifest's order): 1.34 hold → 1.26, 1.17, 1.10, 1.04, 0.98 (the crane out, one
// step per movement) → 1.06 settle → 1.22 punch onto the ember → 1.14 whip out at the blow → 1.28 crane
// in onto the scorch. A whip is `ease.outExpo` over ~0.5 s with a little roll and a kick-driven zoom.
//
// THE FOUR BANDS (the manifest's y ranges partition the page; each band has its own tone, its own seed
// and its own pass, and none may borrow another's shape). Every band is drawn as FLAT MASSES — solids at
// alpha ≥ 0.9 of a real palette tone with a light outline on top, never a wash (a translucent mass
// vanishes into the paper):
//   night  [96, 616]   the sky: the night mass (solid `night`, alpha 1) with its retreating edge — a
//                      solid `cool` rim just inside the contour, a light `star` line on the contour
//                      itself — and, in the margin, the plate's tally. The mass is drawn first, under
//                      every other band; the retreat is read here and dies at the hearth.
//   fire   [616, 886]  the hearth: the film's thread and the fire standing on it — five upper half-discs
//                      (radii R, top at y 716) drawn outside in as solid `shade` skirt / `lantern` rings
//                      / `star` heart, hatched inside, light contour on top — plus the plume rising off it.
//   ash    [886, 926]  the near ground: the soot strip (solid flecks, two flat `shade` smudges, a hatch
//                      at the hearth) and the fire's brand (the scorch). Drawn under the night mass.
//   scrub  [926, 980]  the near scrub: 14 bushes rooted on the page's foot, solid `ink` masses (the
//                      burnt ones solid `graphite`) with light outlines and blades. Also drawn under the
//                      night mass, so the retreat is what reveals the ground — nothing fades in on a
//                      clock of its own.
//
// CROSS-PLATE CONTRACT — THE FIRE (shared with `thunder`, 78.62 → 85.77, which hands this plate its
// fire). hearth (FX, GY) = (290, 886) on the film's thread (`sky.ts`'s HORIZON_Y), shape = five
// concentric UPPER half-discs closed along the thread, radii R = [26, 62, 98, 134, 170] (ring 0 is the
// ember). `thunder` grows it ring by ring and leaves it at full size; this plate inherits that state and
// spends it: rings 4, 3, 2, 1 die on the four bar lines at 125.766 / 127.671 / 129.576 / 131.481.
// `thunder` was being RE-SHOT in parallel while this plate was written, so its final hearth is a
// cross-plate dependency (see this plate's report): if it settles elsewhere, `FX`/`GY`/`R` here and
// `FIRE` in a re-shot `thunder` are the only two places to reconcile.
import { InkedScene, Sheet, rgba, v2, clamp, lerp, ease, prog, noise1, hash, heldT, drawing, TAU, CEL } from './_ink';
import type { V2 } from './_ink';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ the page
/** The page's furniture: the frame. (The writing rules of v1 are gone on purpose — see the brief.) */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The film's thread, flat: the line the fire stands on, and the night/fire band boundary. */
const GY = 886;
/** The hearth: the fire's foot, bottom-left, where `thunder` left it (see the cross-plate contract). */
const FX = 290;
/** The scrub band's root line: the near ground, at the page's own foot. */
const SROOT = 980;
/** The tally's first beat mark: the plate's own meter, down the left margin, inside the safe area. */
const HOME: V2 = v2(150, 180);
/** The tally counts the plate: 26 marks for the 25 beats between `at(0)` and `at(25)`. */
const TICKS = 26;

// ------------------------------------------------------------------ the night
/**
 * The night's mass at full strength: a rounded box around (NCX, NCY) big enough that its edge is off
 * every frame this plate's camera ever shows while the night holds (verified: the tightest visible
 * corner keeps 106 px of margin — see the plate report). It is a rounded BOX, not a disc, because the
 * visible area is a rectangle: a box covers it with a ~30 % shorter perimeter, and `wobble()` resamples
 * every 14 px, so perimeter is what this shape costs.
 */
const NCX = 560, NCY = 786, NHW = 1050, NHH = 600;

// ------------------------------------------------------------------ the fire
/** The five contours, outside in (ring 0 is the ember). See the cross-plate contract in the head. */
const R = [26, 62, 98, 134, 170];
const N = R.length;

// ------------------------------------------------------------------ band populations
const SC = 14; // the scrub band: bushes
const AN = 22; // the ash band: settled flecks
const FN = 9;  // the ash the plume is still dropping

/** An upper half-disc on the thread, as a flat cel polygon (its base line closes the path). */
const halfDisc = (r: number): V2[] => {
  const n = Math.max(7, Math.round(r / 9));
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    out.push(v2(FX + Math.cos(a) * r, GY + Math.sin(a) * r));
  }
  return out;
};

/** The half-annulus between two contours: one ring's band (out over the top, back along the inside). */
const halfRing = (ro: number, ri: number): V2[] => {
  const no = Math.max(7, Math.round(ro / 9)), ni = Math.max(6, Math.round(ri / 9));
  const out: V2[] = [];
  for (let i = 0; i <= no; i++) {
    const a = Math.PI + (i / no) * Math.PI;
    out.push(v2(FX + Math.cos(a) * ro, GY + Math.sin(a) * ro));
  }
  for (let i = ni; i >= 0; i--) {
    const a = Math.PI + (i / ni) * Math.PI;
    out.push(v2(FX + Math.cos(a) * ri, GY + Math.sin(a) * ri));
  }
  return out;
};

/** The night's mass: a rounded box around its retreat centre. */
const nightMass = (cx: number, cy: number, hw: number, hh: number, rad: number, n = 5): V2[] => {
  const r = Math.max(0, Math.min(rad, hw * 0.98, hh * 0.98));
  const out: V2[] = [];
  const corners: [number, number, number][] = [
    [cx + hw - r, cy + hh - r, 0],
    [cx - hw + r, cy + hh - r, Math.PI / 2],
    [cx - hw + r, cy - hh + r, Math.PI],
    [cx + hw - r, cy - hh + r, Math.PI * 1.5],
  ];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push(v2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
  }
  return out;
};

/**
 * Signed distance to that rounded box: < 0 inside (still night), > 0 on bare paper. This is what
 * decides, per element, whether the night has passed it — the margin's tally, the frame, the thread's
 * twelve segments and the scrub's rims each read their own key off it, so the retreat is one front
 * sweeping across the page instead of a global fade.
 */
const nightSdf = (x: number, y: number, cx: number, cy: number, hw: number, hh: number, rad: number): number => {
  const r = Math.max(1, Math.min(rad, hw * 0.98, hh * 0.98));
  const dx = Math.abs(x - cx) - (hw - r), dy = Math.abs(y - cy) - (hh - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};

/**
 * The camera sub-shot table — the manifest's ten movements, in its order: (beat offset from `at(0)`,
 * cx, cy, zoom, roll). The move itself reads raw `t` (it is continuous camera motion,
 * `03-animation.md §6`); the idle roll noise is stepped on the drawing clock so it never smears.
 */
const SHOT: [number, number, number, number, number][] = [
  [0, 420, 834, 1.34, 0],
  [3, 452, 822, 1.26, 0.013],
  [6, 500, 806, 1.17, -0.011],
  [9, 566, 786, 1.10, 0.015],
  [12, 660, 756, 1.04, -0.013],
  [15, 742, 722, 0.98, 0.011],
  [17, 660, 776, 1.06, -0.017],
  [19, 452, 848, 1.22, 0.019],
  [22, 540, 812, 1.14, -0.015],
  [23, 356, 870, 1.28, 0.009],
];

export default class Ember extends InkedScene {
  draw(s: Sheet, f: Frame): PostOverrides {
    const a = this.ctx.audio;
    const t = f.t, d = s.d;
    const start = this.ctx.start, end = this.ctx.end;

    // ---------------------------------------------------------------- the grid
    // The plate opens mid-bar (its cut is the beat the last "My father told me" lands on), so every
    // boundary is taken as a beat offset from the beat it opens on — never from a round second.
    const B0 = Math.round(a.beatAt(start));
    const at = (k: number) => Math.min(end, a.timeOfBeat(B0 + k));
    /** Ring i's bar: 4 → beat 5 (125.766), 3 → 9, 2 → 13, 1 → 17 (131.481). One ring per bar. */
    const ringT = (i: number) => at(5 + (4 - i) * 4);
    const blowT = at(22);                       // 133.862: the ember goes out on this beat
    const dBlow = drawing(blowT);               // the drawing it goes out on (its sparks take two more)
    const mk = t < at(9) ? 0 : t < at(17) ? 1 : t < at(22) ? 2 : t < at(23) ? 3 : 4;

    // ---------------------------------------------------------------- the page's clocks
    // The night retreats toward the hearth: the last of it is the hole the fire burned in the page.
    const kn = prog(t, at(9), blowT - 0.12, ease.inOutQuad);   // 0 = night edge to edge, 1 = bare paper
    const ncx = lerp(NCX, FX, ease.inQuad(kn)), ncy = lerp(NCY, GY, ease.inQuad(kn));
    const nhw = NHW * (1 - kn), nhh = NHH * (1 - kn);
    const nrad = Math.min(0.32 * Math.min(nhw, nhh), 300);
    /** How far the paper has come back at (x, y): 0 = still night, 1 = bare paper. */
    const paper = (x: number, y: number) => (nhw < 3 ? 1 : clamp(nightSdf(x, y, ncx, ncy, nhw, nhh, nrad) / 26));

    // ---------------------------------------------------------------- the fire's clocks
    // The kick is sampled at `heldT` — the drawing's own time — so the pulse is a SIZE that steps once
    // per drawing, not a value that changes every frame and gets averaged into mush on export.
    const pulse = clamp(a.hit('kick', heldT(t), 0.13)) * (mk === 0 ? 0.16 : mk === 1 ? 0.26 : mk === 2 ? 0.62 : mk === 3 ? 1 : 0.10);
    const gone = prog(t, blowT - 0.10, blowT, ease.inCubic);   // the ember is out exactly on the beat
    const flare = prog(t, blowT - 0.30, blowT - 0.10, ease.outQuad); // its last breath, on the way out
    // Ring i contracts into the ring inside it over the half second before its bar, then is not drawn.
    const life = (i: number) => 1 - prog(t, ringT(i) - 0.55, ringT(i), ease.outCubic);
    const c: number[] = [];
    c[0] = R[0]! * (1 - 0.22 * prog(t, at(17), blowT - 0.12, ease.inQuad)) * (1 - gone);
    for (let i = 1; i < N; i++) c[i] = lerp(R[i - 1]!, R[i]!, life(i));
    let live = 0;
    for (let i = 1; i < N; i++) if (t < ringT(i)) live = i;

    // ---------------------------------------------------------------- the frame
    this.shot(s, t, B0);

    // 1 — the ground the night is hiding (drawn first, so the retreat is what reveals it)
    this.scrub(s, d);
    this.ashBand(s, d);
    // 2 — the night, and its edge coming in
    this.night(s, d, ncx, ncy, nhw, nhh, nrad);
    // 3 — the film's thread: starlight on the night, the page's ink once the paper is back
    this.thread(s, d, paper);
    // 4 — the fire's brand on the ground: the one thing it leaves behind
    this.scorch(s, d, pulse);
    // 5 — the fire (the subject of phases 1–3)
    this.fire(s, t, live, c, pulse, flare);
    // 6 — the fire's light on the scrub, one step per kick, only where the night has left
    this.scrubRim(s, t, d, paper);
    // 7 — the plume, and the ash it is still dropping
    this.plume(s, t, d, paper, strength(t, at(17), blowT));
    this.ashFall(s, t, B0, blowT);
    // 8 — the blow-out: three consecutive drawings, then never again
    for (let i = 0; i < 3; i++) if (d === dBlow + i) this.spark(s, FX, GY - 34 - i * 12, i, 700 + i * 17);
    // 9 — the margin's tally, the plate's own meter
    this.tally(s, t, d, B0, paper);
    // 10 — the page's furniture, on top of everything
    this.page(s, d, paper);

    // The night holds a deeper vignette than the bare page does; no bloom anywhere (the cel is flat, and
    // a drawn line stays one line — the warmth of this plate is the `lantern` tone, not a glow).
    return { ...CEL.flat, vignette: lerp(0.27, 0.16, kn) };
  }

  /**
   * The camera: hold the movement's sub-shot, whip into the next with `outExpo` — a camera move is a cut
   * that costs nothing (`03-animation.md §2`). The whip is pre-rolled 0.30 s so the cut *lands* on the
   * beat instead of starting there.
   */
  private shot(s: Sheet, t: number, B0: number) {
    const a = this.ctx.audio;
    let k = 0;
    for (let i = 0; i < SHOT.length; i++) if (t >= a.timeOfBeat(B0 + SHOT[i]![0]) - 0.30) k = i;
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const t0 = a.timeOfBeat(B0 + B[0]);
    const w = clamp(prog(t, t0 - 0.26, t0 + 0.24, ease.outExpo));
    const z = lerp(A[3], B[3], w) * (1 + 0.028 * clamp(a.hit('kick', t, 0.10)));
    s.setCam(lerp(A[1], B[1], w), lerp(A[2], B[2], w), z, lerp(A[4], B[4], w) + 0.004 * noise1(heldT(t) * 0.19, 21));
  }

  /**
   * The night band. A solid mass (`night`, alpha 1) whose edge retreats toward the hearth; the edge is a
   * solid `cool` rim laid just inside the contour, with a light `star` contour on top. The rim and the
   * contour are only paid for once the edge is on the sheet — before that the mass runs off every frame
   * and its boundary is not there to be drawn.
   */
  private night(s: Sheet, d: number, cx: number, cy: number, hw: number, hh: number, rad: number) {
    if (hw < 3) return;
    s.fill(nightMass(cx, cy, hw, hh, rad), 40, rgba('night', 1), { amp: 4 });
    if (hw > 980) return;   // the edge is still off every frame: there is no boundary to draw
    // the rim: a wide stroke on a patch inset by half its width, so the band sits *inside* the contour.
    // Below ~60 px the inset patch degenerates and the rim would be a blob rather than a band, so the
    // last of the night goes as a mass with its contour only — the way it came in.
    if (hw > 60) s.stroke(nightMass(cx, cy, hw - 24, hh - 24, Math.max(0, rad - 20)), 41, { closed: true, w: 44, amp: 4, taper: false, color: rgba('cool', 0.9) });
    s.stroke(nightMass(cx, cy, hw, hh, rad), 42, { closed: true, w: 2.2, amp: 4, taper: false, color: rgba('star', 0.34) });
    void d;
  }

  /**
   * The thread: the film's horizon, flat, with the fire standing on it. It is ONE line in two tones —
   * `star` while the night is behind it, `ink` once the paper is — and it is drawn as twelve short
   * segments so each reads its own `paper()` key and the tone changes exactly where the edge passes.
   */
  private thread(s: Sheet, d: number, paper: (x: number, y: number) => number) {
    const SEG = 12;
    for (let i = 0; i < SEG; i++) {
      const x0 = lerp(150, 1810, i / SEG), x1 = lerp(150, 1810, (i + 1) / SEG);
      const pts: V2[] = [];
      for (let q = 0; q <= 3; q++) {
        const x = lerp(x0, x1, q / 3);
        pts.push(v2(x, GY + 2 + Math.sin(x * 0.0021) * 4 + 3 * noise1(x * 0.004, 3)));
      }
      const pk = paper((x0 + x1) / 2, GY);
      if (pk < 0.98) s.stroke(pts, 200 + i, { w: 2, amp: 1.6, taper: false, color: rgba('star', 0.42 * (1 - pk)) });
      if (pk > 0.02) s.stroke(pts, 200 + i, { w: 2.2, amp: 1.6, taper: false, color: rgba('ink', 0.85 * pk) });
    }
    void d;
  }

  /**
   * The scrub band [926, 980] (its own band: 14 bushes rooted on the page's foot). Drawn BEFORE the
   * night mass: the retreat is what reveals them, so no bush needs a fade of its own. Every mass is
   * SOLID — `ink`, or `graphite` for the bushes inside the fire's footprint, which are burnt stubs —
   * with a light outline on top; the blades are separate wind-bent strokes.
   */
  private scrub(s: Sheet, d: number) {
    for (let i = 0; i < SC; i++) {
      const b = this.bush(i);
      s.fill(b.mass, 800 + i * 7, rgba(b.burnt ? 'graphite' : 'ink', 1), { amp: 2.4 });
      s.stroke(b.mass, 800 + i * 7, { closed: true, w: 2.2, amp: 2.4, color: rgba(b.burnt ? 'shade' : 'graphite', 0.8) });
      for (let j = 0; j < b.blades.length; j++) {
        s.stroke(b.blades[j]!, 840 + i * 7 + j, { w: 2.2, amp: 2.4, color: rgba('graphite', 0.75) });
      }
    }
    void d;
  }

  /**
   * One bush of the scrub band, as geometry only — static, so the mass, the outline and the lit rim all
   * agree (the wobble, and with it the boiling, comes from the drawing index inside `stroke`/`fill`).
   */
  private bush(i: number) {
    const x = 168 + i * 122 + (hash(i, 21) - 0.5) * 66;
    const burnt = Math.abs(x - FX) < 205;
    const h = (18 + 36 * hash(i, 23)) * (burnt ? 0.62 : 1);
    const kind = burnt ? 2 : i % 3;
    const w = (kind === 1 ? 12 : 18) + 9 * hash(i, 25);
    const n = kind === 2 ? 5 : 8;
    const mass: V2[] = [v2(x - w, SROOT)];
    for (let q = 0; q <= n; q++) {
      const u = q / n;
      const bump = Math.sin(Math.PI * u) ** (kind === 1 ? 0.45 : 0.7);
      const hh = h * bump * (1 + 0.24 * noise1(u * 3.1 + i * 1.7, i + 5));
      mass.push(v2(x - w + 2 * w * u, SROOT - Math.max(3, hh)));
    }
    mass.push(v2(x + w, SROOT));
    const blades: V2[][] = [];
    const nb = kind === 2 ? 2 : 3;
    for (let j = 0; j < nb; j++) {
      const bx = x - w * 0.45 + j * (w * 0.45);
      const bh = h * (0.95 + 0.5 * hash(j, i + 31));
      blades.push([v2(bx, SROOT - 1), v2(bx + 5 + 7 * hash(j, i + 33), SROOT - bh * 0.6), v2(bx + 16 + 9 * hash(j, i + 35), SROOT - bh)]);
    }
    return { x, h, w, kind, burnt, mass, blades };
  }

  /**
   * The fire's light on the scrub: one step per kick, and only where the paper has come back (a rim on a
   * bush the night still covers would be a line floating in the dark, which is exactly the failure the
   * "flat masses are solids" rule exists to prevent). The rim is the mass's own top contour, so the light
   * sits on the bush; it falls off with distance from the hearth.
   */
  private scrubRim(s: Sheet, t: number, d: number, paper: (x: number, y: number) => number) {
    const kick = clamp(this.ctx.audio.hit('kick', heldT(t), 0.17));
    if (kick < 0.06) return;
    for (let i = 0; i < SC; i++) {
      const b = this.bush(i);
      const pk = paper(b.x, SROOT - b.h * 0.5);
      const a = 0.7 * kick * clamp(1 - Math.abs(b.x - FX) / 820) * pk;
      if (a < 0.05) continue;
      s.stroke(b.mass.slice(1, b.mass.length - 1), 800 + i * 7, { w: 2.4, amp: 2.4, color: rgba('lantern', a) });
    }
    void d;
  }

  /**
   * The ash band [886, 926]: the soot the ground keeps under the night — solid flecks, two flat `shade`
   * smudges, and a hatch strip on the burnt ground at the hearth. Under the night mass on purpose, so
   * the retreat is what uncovers it.
   */
  private ashBand(s: Sheet, d: number) {
    for (let i = 0; i < AN; i++) {
      const x = 160 + i * 72 + (hash(i, 31) - 0.5) * 52;
      const y = GY + 8 + 30 * hash(i, 35);
      this.dot(s, x, y, 2.2 + 2.6 * hash(i, 37), 900 + i, rgba('graphite', 0.95));
    }
    for (let k = 0; k < 2; k++) {
      const sx = 360 + k * 560, sy = GY + 20 + 6 * k;
      const sm: V2[] = [];
      for (let q = 0; q < 10; q++) {
        const A = (q / 10) * TAU;
        sm.push(v2(sx + Math.cos(A) * (120 + 34 * noise1(q * 1.7, k + 3)), sy + Math.sin(A) * (14 + 6 * noise1(q * 2.3, k + 7))));
      }
      s.fill(sm, 930 + k, rgba('shade', 0.92), { amp: 2.6 });
      s.stroke(sm, 930 + k, { closed: true, w: 2, color: rgba('graphite', 0.5) });
    }
    s.hatch([v2(150, GY + 4), v2(760, GY + 4), v2(760, GY + 38), v2(150, GY + 38)], 950, { spacing: 17, angle: 0.34, w: 1.4, color: rgba('graphite', 0.3) });
    void d;
  }

  /** One solid cel fleck — a hand-drawn polygon, never an outlined circle. */
  private dot(s: Sheet, x: number, y: number, r: number, seed: number, colour: string) {
    const pts: V2[] = [];
    for (let i = 0; i < 6; i++) {
      const A = (i / 6) * TAU;
      pts.push(v2(x + Math.cos(A) * r, y + Math.sin(A) * r));
    }
    s.fill(pts, seed, colour, { amp: Math.max(0.5, r * 0.18) });
  }

  /**
   * The ash the plume is still dropping: born in the retreat (phases 1–3) and all of it down before the
   * blow, so phase 5 really is bare paper. Each fleck is a pure function of `t` (born at its own hashed
   * beat, gliding right with the wind, shrinking into the ash band it lands in) — no state.
   */
  private ashFall(s: Sheet, t: number, B0: number, blowT: number) {
    const a = this.ctx.audio;
    const t0 = Math.min(this.ctx.end, a.timeOfBeat(B0 + 9)) + 0.5;
    const t1 = blowT - 1.3;
    if (t1 <= t0 || t < t0) return;
    for (let i = 0; i < FN; i++) {
      const birth = lerp(t0, t1, hash(i, 41));
      const u = clamp((t - birth) / 1.3);
      if (u <= 0 || u >= 1) continue;
      const x = FX + (hash(i, 43) - 0.5) * 150 + 300 * hash(i, 47) * u + 11 * noise1(u * 2.2 + i * 3.1, 8);
      const y = lerp(GY - 150 - 90 * hash(i, 49), GY + 8 + 30 * hash(i, 35), u * u * 0.55 + u * 0.45);
      const r = (2.2 + 2.4 * hash(i, 51)) * (1 - clamp((u - 0.74) / 0.26));
      if (r < 0.5) continue;
      this.dot(s, x, y, r, 640 + i, rgba('graphite', 0.9));
    }
  }

  /**
   * The plume: three thin threads rising off the hearth and drifting right, their shapes stepped on the
   * drawing clock (a plume that changed every frame would smear). It SHRINKS as the fire dies — the
   * height rides the fire's own clock, and the last puff is the blow-out's, gone inside a second. Two
   * tones per thread, so it reads on the night and on the paper.
   */
  private plume(s: Sheet, t: number, d: number, paper: (x: number, y: number) => number, strength: number) {
    if (strength < 0.03) return;
    const pk = paper(FX, GY - 130);
    for (let i = 0; i < 3; i++) {
      const hgt = (70 + 34 * i) * (0.42 + 0.58 * strength);
      const pts: V2[] = [];
      for (let q = 0; q <= 5; q++) {
        const u = q / 5;
        pts.push(v2(FX - 16 + i * 15 + Math.sin(u * 2.6 + i * 2.1 + heldT(t) * 0.9) * (6 + u * 26) + u * 18, GY - 34 - u * hgt));
      }
      if (pk < 0.98) s.stroke(pts, 600 + i, { w: 2.4 - 0.3 * i, amp: 2.6, color: rgba('shade', 0.44 * strength * (1 - pk)) });
      if (pk > 0.02) s.stroke(pts, 600 + i, { w: 2.4 - 0.3 * i, amp: 2.6, color: rgba('graphite', 0.5 * strength * pk) });
    }
    void d;
  }

  /**
   * The fire: the fire band (the hearth's half-discs on the thread). One solid band per live ring, drawn
   * outside in — the outermost live ring is the cooled `shade` skirt, the ones inside it are `lantern`,
   * and the ember is `lantern` with a solid `star` heart. Every mass is a solid (a different palette
   * tone, never a lower alpha), hatched on the inside, with a light contour on top.
   */
  private fire(s: Sheet, t: number, live: number, c: number[], pulse: number, flare: number) {
    const breathe = 1 + 0.5 * pulse;
    for (let i = live; i >= 1; i--) {
      const r = c[i]! * breathe, ri = c[i - 1]! * breathe;
      if (r - ri < 1.6) continue;   // this ring has just closed onto the one inside it: it is gone
      const skirt = i === live;
      const band = halfRing(r, ri);
      s.fill(band, 300 + i, rgba(skirt ? 'shade' : 'lantern', 1), { amp: 3 });
      s.hatch(band, 310 + i, { spacing: 20, angle: -1.02, w: 1.5, color: skirt ? rgba('lantern', 0.45) : rgba('shade', 0.5) });
      s.stroke(band, 320 + i, { w: 2.2, amp: 2.2, taper: false, color: rgba(skirt ? 'graphite' : 'star', skirt ? 0.7 : 0.5) });
    }
    const r0 = c[0]! * breathe;
    if (r0 > 1.4) {
      const disc = halfDisc(r0);
      s.fill(disc, 299, rgba('lantern', 1), { amp: 2.2 });
      s.hatch(disc, 297, { spacing: 11, angle: -1.02, w: 1.3, color: rgba('shade', 0.45) });
      s.stroke(disc, 298, { w: 3, taper: false, color: rgba('star', 0.7) });
      const hot = r0 * 0.52 * (1 + 0.85 * flare);
      if (hot > 2) this.dot(s, FX, GY - r0 * 0.44, hot, 296, rgba('star', 1));
    }
    void t;
  }

  /**
   * The fire's brand on the ground: solid `graphite` with burnt rays — a pale mark on the night, a
   * scorch on the paper, and the only trace left in phase 5. Its rays step out on the kick, so the brand
   * breathes with the fire and lies still once it is out.
   */
  private scorch(s: Sheet, d: number, pulse: number) {
    const cy = GY + 20;
    const body: V2[] = [];
    for (let i = 0; i < 12; i++) {
      const A = (i / 12) * TAU;
      const rx = 96 * (0.5 + 0.14 * noise1(i * 1.3, 4)), ry = (22 + 6 * pulse) * (0.5 + 0.18 * noise1(i * 2.1, 9));
      body.push(v2(FX + Math.cos(A) * rx, cy + Math.sin(A) * ry));
    }
    s.fill(body, 61, rgba('graphite', 0.95), { amp: 2.4 });
    s.stroke(body, 61, { closed: true, w: 2.2, color: rgba('ink', 0.7) });
    for (let j = 0; j < 7; j++) {
      const A = Math.PI * 1.02 + j * 0.44;
      const r0 = 48, L = (16 + 26 * hash(j, 13)) * (1 + 0.5 * pulse);
      s.stroke(
        [v2(FX + Math.cos(A) * r0, cy + Math.sin(A) * r0 * 0.16), v2(FX + Math.cos(A) * (r0 + L), cy + Math.sin(A) * (r0 + L) * 0.16)],
        62 + j, { w: 2, amp: 1.6, color: rgba('ink', 0.72) },
      );
    }
    const core: V2[] = [];
    for (let i = 0; i < 8; i++) {
      const A = (i / 8) * TAU;
      core.push(v2(FX + Math.cos(A) * (28 + 7 * noise1(i * 1.9, 6)), cy + Math.sin(A) * 7));
    }
    s.fill(core, 70, rgba('ink', 0.95), { amp: 2 });
    void d;
  }

  /**
   * One drawing of the blow-out (phase 4). Three of these run on three CONSECUTIVE drawings — the way a
   * hand animates a thing going out: the first throws the burst, the second thins it, the third is the
   * last of it. Each is solid: a `lantern` head with a `star` heart, and ink rays around it.
   */
  private spark(s: Sheet, x: number, y: number, stage: number, seed: number) {
    const rays = 7 - stage * 2;
    for (let j = 0; j < rays; j++) {
      const a0 = -Math.PI / 2 + (hash(j, seed) - 0.5) * 2.9;
      const r0 = 5 + 6 * hash(j + 3, seed);
      const L = (16 + 26 * hash(j + 9, seed)) * (1 + stage * 0.55);
      s.stroke(
        [v2(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0), v2(x + Math.cos(a0) * (r0 + L), y + Math.sin(a0) * (r0 + L))],
        seed + j, { w: 3 - stage * 0.5, amp: 1.2, color: rgba('ink', 0.95) },
      );
    }
    const head = 9 - stage * 2.6;
    if (head > 1) {
      this.dot(s, x, y, head, seed + 30, rgba('lantern', 1));
      if (stage === 0) this.dot(s, x, y, head * 0.5, seed + 31, rgba('star', 1));
    }
  }

  /**
   * The tally: the plate's own meter, 26 marks down the left margin of the night band, one crossed off
   * on each of the 25 beats this window contains (and the last on the closing beat). It is this plate's
   * answer to "a global readout must be staged in-world" — no HUD, just the page's own counting mark.
   * Each mark takes its tone from `paper()` at its own position, so the retreat crosses it exactly when
   * the paper does.
   */
  private tally(s: Sheet, t: number, d: number, B0: number, paper: (x: number, y: number) => number) {
    const a = this.ctx.audio;
    for (let k = 0; k < TICKS; k++) {
      const y = HOME.y + k * 17.4, x = HOME.x;
      const bt = a.timeOfBeat(B0 + k);
      const pk = paper(x + 13, y);
      if (pk < 0.98) s.stroke([v2(x, y), v2(x + 26, y)], 1000 + k, { w: 2, amp: 1.4, color: rgba('star', 0.34 * (1 - pk)) });
      if (pk > 0.02) s.stroke([v2(x, y), v2(x + 26, y)], 1000 + k, { w: 2, amp: 1.4, color: rgba('ink', 0.5 * pk) });
      if (t < bt) continue;
      const cr = clamp(prog(t, bt, bt + 0.16, ease.outCubic));
      s.stroke([v2(x - 3, y - 7), v2(lerp(x - 3, x + 29, cr), lerp(y - 7, y + 7, cr))], 1030 + k, { w: 2, amp: 1.2, color: rgba(pk > 0.5 ? 'ink' : 'star', 0.6) });
    }
    void d;
  }

  /** The page's furniture: the frame — four sides, each with its own key to the retreat. */
  private page(s: Sheet, d: number, paper: (x: number, y: number) => number) {
    const F = FRAME;
    const sides: [number, number, number, number, number][] = [
      [F[0], F[1], F[2], F[1], 2],
      [F[2], F[1], F[2], F[3], 3],
      [F[0], F[3], F[2], F[3], 4],
      [F[0], F[1], F[0], F[3], 5],
    ];
    for (const sd of sides) {
      const pk = paper((sd[0] + sd[2]) / 2, (sd[1] + sd[3]) / 2);
      if (pk < 0.98) s.stroke([v2(sd[0], sd[1]), v2(sd[2], sd[3])], sd[4], { w: 2.6, amp: 1.6, overshoot: 9, color: rgba('star', 0.34 * (1 - pk)) });
      if (pk > 0.02) s.stroke([v2(sd[0], sd[1]), v2(sd[2], sd[3])], sd[4], { w: 2.6, amp: 1.6, overshoot: 9, color: rgba('ink', 0.5 * pk) });
    }
    void d;
  }
}

/**
 * How hard the plume is breathing: 1 while the fire has rings, thinning through the ember's own phase,
 * and gone a beat after the blow-out. (`strength` is a plain function of `t`, so the plume is a pure
 * function of the frame like everything else.)
 */
function strength(t: number, emberT: number, blowT: number): number {
  return (1 - 0.35 * prog(t, emberT, blowT - 0.2, ease.inOutCubic)) * (1 - prog(t, blowT, blowT + 0.8, ease.outCubic));
}

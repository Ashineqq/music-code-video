/*!plate
{
  "id": "thunder",
  "window": [78.6235, 85.7664],
  "device": "woven",
  "staging": "subject",
  "maxWidth": 1340,
  "typePx": 140,
  "bands": [
    { "name": "front", "y": [40, 112] },
    { "name": "live", "y": [116, 384] },
    { "name": "hearth", "y": [384, 600] },
    { "name": "ground", "y": [600, 984] }
  ],
  "movements": [
    { "at": 78.6235, "camera": "whip-left" },
    { "at": 79.0997, "camera": "punch-in" },
    { "at": 80.5283, "camera": "tilt-down" },
    { "at": 81.9568, "camera": "tilt-up" },
    { "at": 83.3854, "camera": "crane-up" },
    { "at": 84.8140, "camera": "pull-back" }
  ]
}
*/
// Plate 9 — `thunder` (78.6235 → 85.7664 s, 15 beats, three lines). A storm front with a fire under it,
// and the lyric **woven into the front's own rain**: the cloud is the paper, the hatch is the type
// (`04-plates.md §3.5`, 编织/雕刻 — this plate's language; §5: no other plate may reuse it). The last
// line is *carved* (§3.5): three tears in the front, one star in each, and S-O-N cut into them.
//
// THE DEVICE, in measured numbers. One lattice of parallel lines is the whole plate's rain: direction
// RAIN_A = 1.86 rad (106.6° from +x — rain falling steeply to the left), spacing RAIN_SP = 9 px. The
// live line is laid out as a block of TWO rows (baselines 220 and 354, a 0.96 em leading — the tightest
// that still lets em 140 fit the 268-px band between the front's edge (116) and the hearth's dome
// (384); the block's own ink measures 118…383). Each word is a ribbon of half-width RIB = 7 px along
// its glyph centre-lines, and the ribbon inks only the lattice lines it crosses — the line through each
// sample plus the two half-steps k ± 0.5 — so the type's rain is 4.5 px apart against the front's 9:
// the letters ARE the storm's rain, one tone brighter (`star` on `cool`). Measured letter height:
// cap = 0.630 em = **88 px** at em 140 (the font's cap measured off the 'H' outline: y 22.1 → 652 of
// 1000 upm). Every row measures ≤ 1340 px (line 1: 1298 + 1160), which clears every framing below: the
// tightest is zoom 1.24, half-width 960/1.24 = 774 ≥ 1340/2 + 40 = 710.
//
// BANDS (manifest above). The *paper* of a band is that band's own, by the device: the front's rain
// field and its cells (40 → their hems at 366…380) are the live band's paper, and the ground is the
// paper of the lines that are over. Nothing but the live line's own ink is ever drawn inside the live
// band: the tears and the stars (y 120…286) are the LAST line's own instrument (they are what its S-O-N
// is carved into) and the first tear opens at 82.78, which is 0.15 s after the last hatch word is inked
// (82.63) — the two never hold the band at the same time. One declared override: movement 6's closing
// front runs its hem down to y 934, deliberately crossing into the ground band to swallow the ground
// and the two lines filed there — the brief's "the clouds close over everything but the fire".
//
// THE SIX SHOTS (one movement = one re-draw or one reframe; boundaries are the film's beats
// 166/167/170/173/176/179 = 78.6235 · 79.0997 · 80.5283 · 81.9568 · 83.3854 · 84.8140):
//   1 whip-left  the front slams in from the left; the ember comes up on the hearth.     (700,540,1.30,+0.022)
//   2 punch-in   line 1 hatched into the rain.                                           (960,480,1.24,+0.010)
//   3 tilt-down  line 2 hatched; the fire blooms ring by ring (rings on beats 171–174).  (1010,520,1.18,−0.014)
//   4 tilt-up    line 2 erodes; three tears open, three stars ignite, the S is cut.       (960,420,1.22,+0.012)
//   5 crane-up   the carve carries on (O, N); the sparks rise.                            (960,330,1.20,−0.010)
//   6 pull-back  the front closes over everything but the fire and the star still being named. (960,470,1.06,0)
//
// THE FIRE is this plate's cross-plate contract with `ember` (its head comment): hearth (960,600), five
// upper half-discs R = [28,76,124,172,216], one ring per beat from the beat the word "fire" is sung on,
// so it stands at full size when line 2 ends — the state `ember` inherits. Movement 6 is the brief's
// one deviation, deliberately: the third star (the N being cut) stays open until 85.64, because the
// word "stars" is still being sung; the front swallows the other two and the ground.
//
// Everything that moves or wobbles is a function of the drawing clock (`s.d` / `heldT` / `drawing`);
// only the camera, the reveal ramps and `Lyrics.wordProgress` read `f.t`. No cross-frame state.
import { InkedScene, Sheet, rgba, v2, W, clamp, lerp, ease, prog, noise1, hash, heldT, drawing, resample, CEL } from './_ink';
import type { V2 } from './_ink';
import { strokeText } from '../../../engine/stroke';
import { Lyrics, type Line, type Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['When thunder clouds', 'Light a fire they', 'Carve your name into'];
/** The book's edge — the same on every plate (see `open.ts`). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];

/** The rain: ONE lattice for the whole plate — the type is cut from it (see `inkHatch`). */
const RAIN_A = 1.86;   // 106.6° from +x: rain falling steeply to the left
const RAIN_SP = 9;     // the lattice's spacing, px
/** The live line: em 140 (cap 88 px), two rows, the widest block that fits the band 116…384. */
const TYPE = 140, MAXW = 1340, LEAD = 134, GAP = 42;
const ROW_Y = [220, 354];
const RIB = 7;         // the woven ribbon's half-width: the glyph stroke the rain is inked into

/** The hearth and its fire — the cross-plate contract with `ember` (see its head comment). */
const FX = 960, FY = 600;
const RING = [28, 76, 124, 172, 216];
/** The tears and the stars (the last line's instrument); the carve is `tech`, cap 0.677 em = 57 px. */
const TEAR: V2[] = [v2(620, 210), v2(960, 196), v2(1300, 210)];
const TEAR_R = 62, STAR_R = 52, CARVE = 84;
const NAME = ['S', 'O', 'N'];
/** Where a line that is over lives: small, hatched into the wet ground. */
const SUNK_Y = [706, 754, 802];
/** The three storm cells: the front's tonal masses, sliding in from off the left, one per beat. */
const CELLS = [
  { x0: 20, x1: 780, hem: 372, seed: 11 },
  { x0: 640, x1: 1330, hem: 380, seed: 23 },
  { x0: 1180, x1: 1920, hem: 366, seed: 37 },
];
/**
 * Camera sub-shots (cx, cy, zoom, roll). A whip between two of these is a cut that costs nothing
 * (`03-animation.md §2`). While a full line is on the band its framing must hold it (see the head).
 */
const SHOT: [number, number, number, number][] = [
  [700, 540, 1.30, 0.022],   // 1 the front slams in from the left (no full line yet)
  [960, 480, 1.24, 0.010],   // 2 line 1's hatch
  [1010, 520, 1.18, -0.014], // 3 line 2's hatch and the fire blooming
  [960, 420, 1.22, 0.012],   // 4 the tears and the stars
  [960, 330, 1.20, -0.010],  // 5 the crane up to the stars
  [960, 470, 1.06, 0],       // 6 the pull back: the front closes
];

/** One laid-out word: its own x (already centred in its row) and its advance width. */
interface Cell { w: Word; x: number; wd: number }
interface Row { y: number; cells: Cell[] }

export default class Thunder extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const L = this.lines;
    // movement boundaries: the film's beats, never round seconds (manifest: 166/167/170/173/176/179)
    const b0 = Math.floor(a.beatAt(this.ctx.start + 0.01));
    const MOV = [0, 1, 4, 7, 10, 13].map((k) => a.timeOfBeat(b0 + k));
    let mk = 0;
    for (let i = MOV.length - 1; i >= 0; i--) { if (t >= MOV[i]!) { mk = i; break; } }
    this.shot(s, t, MOV, mk);

    // movement 6: the front closes over everything but the fire and the star being named
    const close = clamp(prog(t, MOV[5]!, a.timeOfBeat(b0 + 15) - 0.08, ease.inOutCubic));

    this.frame(s);
    this.ground(s, t);
    this.sunk(s, t, 0);            // what the rain has already washed into the ground
    this.sunk(s, t, 1);
    this.front(s, t, MOV[0]!, close);
    this.fire(s, t, L[1]!);
    this.live(s, t, 0);            // line 1, hatched into the rain
    this.live(s, t, 1);            // line 2
    this.carve(s, t, L[2]!);       // line 3: the tears, the stars and S-O-N
    this.sparks(s, t);
    return CEL.flat;
  }

  /** The camera: hold the movement's shot, whip into the next with outExpo — a cut, not a drift. */
  private shot(s: Sheet, t: number, MOV: number[], k: number) {
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const w = clamp(prog(t, MOV[k]! - 0.18, MOV[k]! + 0.30, ease.outExpo));
    const phase = this.ctx.audio.beatAt(t) % 1;   // the kick-driven zoom, off the beat (not a sine of t)
    const z = lerp(A[2], B[2], w) * (1 + 0.020 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(A[0], B[0], w), lerp(A[1], B[1], w), z, lerp(A[3], B[3], w));
  }

  /** The sheet: its edge and the folio only (v1's writing rules are gone on purpose, `04-plates §5`). */
  private frame(s: Sheet) {
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('star', 0.34), amp: 1.6, overshoot: 9 });
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('star', 0.16) });
    s.text('ix.', 176, 966, { size: 26, fam: 'Plex-400', color: rgba('star', 0.4) });
  }

  /**
   * The storm front. The rain field is ONE lattice (drawn once, 9 px of `cool`): it is the paper the
   * live line is hatched from. The three cells are solid `night2` masses that slide in from off the
   * left, one per beat, so the front's silhouette changes while the type is being inked. `close` is
   * movement 6: the hem falls to the ground everywhere but the hearth's notch.
   */
  private front(s: Sheet, t: number, t0: number, close: number) {
    const field = [v2(40, 40), v2(1880, 40), v2(1880, 376), v2(40, 376)];
    s.fill(field, 5, rgba('night2', 0.5), { amp: 2.4 });
    // the rain itself is the CELLS' hatch: the three of them overlap into one mass across the sheet
    // (20…1920), so a second pass of lines on the field behind them would be paid for and never seen —
    // and it is the same lattice either way (RAIN_A / RAIN_SP), which is what matters: the type's rain
    // is cut from the rain that is on screen.
    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i]!;
      const arrive = clamp(prog(t, t0 + i * 0.16, t0 + 0.44 + i * 0.16, ease.outCubic));
      if (arrive <= 0.001) continue;
      const slide = (1 - arrive) * -760;
      const pts: V2[] = [v2(c.x0 + slide - 60, 40), v2(c.x1 + slide + 60, 40)];
      for (let k = 20; k >= 0; k--) {
        const x = lerp(c.x1 + slide + 60, c.x0 + slide - 60, k / 20);
        // the hem: ragged by hand, and (movement 6) falling to the ground away from the hearth's notch
        const notch = clamp((Math.abs(x - FX) - 250) / 250);
        pts.push(v2(x, c.hem + 13 * noise1(k * 0.75 + c.seed, c.seed + 3) + (934 - c.hem) * close * notch * notch));
      }
      s.fill(pts, 20 + i, rgba('night2', 0.94), { amp: 2.6 });
      s.stroke(pts, 20 + i, { w: 2.2, color: rgba('graphite', 0.45), amp: 2.4, taper: false });
      s.hatch(pts, 40 + i, { spacing: RAIN_SP, angle: RAIN_A, color: rgba('cool', 0.34), w: 1.8 });
    }
    // the curtain of rain below the front's hem: the weather the fire stands in (drawn behind it)
    const veil = [v2(40, 372), v2(1880, 372), v2(1880, 618), v2(40, 618)];
    s.hatch(veil, 70, { spacing: 17, angle: RAIN_A, color: rgba('cool', 0.28), w: 1.6 });
  }

  /**
   * The ground: the wet paper under the hearth line, hatched by the rain that has run off the front.
   * The lines that are over sink into it (see `sunk`) — the world keeping them.
   */
  private ground(s: Sheet, t: number) {
    const k = clamp(prog(t, this.ctx.start + 0.2, this.ctx.start + 1.2));
    if (k <= 0.01) return;
    const pts: V2[] = [v2(40, 984), v2(1880, 984)];
    for (let i = 24; i >= 0; i--) {
      const x = lerp(40, 1880, i / 24);
      pts.push(v2(x, 664 + 16 * noise1(i * 0.5 + 3, 6) + 8 * noise1(i * 1.7, 12)));
    }
    s.fill(pts, 600, rgba('night2', 0.45 * k), { amp: 3 });
    s.stroke(pts.slice(2), 601, { w: 2, color: rgba('graphite', 0.45 * k), amp: 2.4 });
    s.hatch(pts, 602, { spacing: 16, angle: RAIN_A, color: rgba('cool', 0.26 * k), w: 1.6 });
    // the hearth line: the one straight rule in the plate, and the fire stands on it
    s.stroke([v2(150, FY), v2(1770, FY)], 610, {
      w: 1.6, sketch: true, color: rgba('star', 0.22), overshoot: 14, a: k,
    });
  }

  /**
   * THE FIRE — the contract with `ember`, drawn exactly as `ember` draws it: solid bands, the outermost
   * live ring the pale `shade` skirt and the rest solid `lantern`, each hatched inside and outlined, and
   * a solid ember with a hot `star` core. One ring per beat from the beat the word "fire" is sung on.
   */
  private fire(s: Sheet, t: number, L2: Line) {
    const a = this.ctx.audio;
    const fw = L2.words.find((w) => w.w.toLowerCase().startsWith('fire'));
    const b1 = fw ? Math.floor(a.beatAt(fw.start)) : 0;
    const lit = clamp(prog(t, this.ctx.start + 0.05, this.ctx.start + 0.55));
    if (lit <= 0 || !fw) return;
    const nz = 0.5 + 0.5 * noise1(heldT(t) * 7, 11);   // a fire is never still: it steps on the drawings
    const breathe = 0.955 + 0.045 * nz;                // <= 1: the dome's apex never enters the live band

    const sweep = [1, 0, 0, 0, 0];
    let live = 0;
    for (let k = 1; k <= 4; k++) {
      const bt = a.timeOfBeat(b1 + k - 1);
      sweep[k] = clamp(prog(t, bt, bt + 0.26, ease.outCubic));
      if (sweep[k]! > 0.001) live = k;
    }
    for (let i = live; i >= 1; i--) {
      const r = RING[i]! * breathe, ri = RING[i - 1]! * breathe;
      const band = this.bandOut(r, ri, sweep[i]!);
      const skirt = i === live;
      s.fill(band, 300 + i, rgba(skirt ? 'shade' : 'lantern', 1), { amp: 3 });
      s.hatch(band, 300 + i, {
        spacing: 19, angle: -Math.PI / 3.4, w: 1.6,
        color: skirt ? rgba('lantern', 0.5) : rgba('shade', 0.45),
      });
      s.stroke(band, 300 + i, { w: 2.4, amp: 2.4, taper: false, color: rgba(skirt ? 'graphite' : 'ink', 0.55) });
    }
    // the ember itself: solid, with a hot core; its flicker is a drawing, never a smooth pulse
    const r0 = RING[0]! * breathe * lit;
    const disc = this.sector(r0, 1);
    s.fill(disc, 299, rgba('lantern', 1), { amp: 2 });
    s.hatch(disc, 299, { spacing: 12, angle: -Math.PI / 3.4, w: 1.4, color: rgba('shade', 0.4) });
    s.stroke(disc, 299, { w: 3.2, taper: false, color: rgba('ink', 0.6) });
    const hot = r0 * 0.55 * (0.78 + 0.22 * nz);
    if (hot > 2) s.blob(FX, FY - r0 * 0.42, hot, 298, { colour: rgba('star', clamp(0.7 + 0.3 * nz, 0, 1)), n: 9, jag: 0.32 });
  }

  /** The upper half-arc of a disc of radius `r` about the hearth, swept on up to `sweep` of π. */
  private sector(r: number, sweep: number): V2[] {
    const n = Math.max(2, Math.round(20 * Math.max(0.05, sweep)));
    const out: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const ang = Math.PI + Math.PI * sweep * (i / n);
      out.push(v2(FX + Math.cos(ang) * r, FY + Math.sin(ang) * r));
    }
    return out;
  }

  /** One ring's band: the outer arc out, the inner arc back (the annulus between two contours). */
  private bandOut(ro: number, ri: number, sweep: number): V2[] {
    const out = this.sector(ro, sweep);
    const inn = this.sector(ri, sweep);
    for (let i = inn.length - 1; i >= 0; i--) out.push(inn[i]!);
    return out;
  }

  /**
   * The fire's sparks: five embers on the DRAWING clock (`03-animation.md §6.1`) — each lives a handful
   * of drawings, rises and dies, and none of them ever enters the live band (their ceiling is y 392).
   */
  private sparks(s: Sheet, t: number) {
    const lit = clamp(prog(t, this.ctx.start + 0.4, this.ctx.start + 1.4));
    if (lit <= 0.01) return;
    const dd = drawing(t);
    for (let j = 0; j < 5; j++) {
      const life = 11 + 3 * j;
      const age = ((((dd + j * 7) % life) + life) % life) / life;
      const x = FX + (hash(j, 3) * 2 - 1) * 175 * (1 - 0.35 * age) + noise1(j * 5.1 + dd * 0.3, 2) * 18;
      const y = FY - 30 - age * (FY - 30 - 392) * lit;
      const al = Math.sin(Math.PI * age) * lit;
      if (al <= 0.02) continue;
      const r = 4.2 - 2.2 * age;
      s.blob(x, y, r, 700 + j, { colour: rgba('lantern', 0.95 * al), n: 6, jag: 0.45, outline: { w: 1, color: rgba('lantern', 0.5 * al), taper: false } });
      if (age < 0.35) s.blob(x, y, r * 0.45, 730 + j, { colour: rgba('star', 0.9 * al), n: 5, jag: 0.4, outline: { w: 0.6, color: rgba('star', 0.4 * al), taper: false } });
    }
  }

  /**
   * The live line — one at a time, and the one that is over has been erased before the next one's
   * ghost appears. The envelope: the ghost ramps in 0.07 s before the line's first word, and the ink
   * is gone 0.04 s after its last one — so line 1's type (out by 80.73) and line 2's (in from 80.76)
   * never share the band, which is the whole point of the band.
   */
  private live(s: Sheet, t: number, i: number) {
    const l = this.lines[i]!;
    if (i === 2) return;   // the last line is not hatched: it is carved (see `carve`)
    const k = clamp(prog(t, l.start - 0.07, l.start - 0.015)) * (1 - clamp(prog(t, l.end, l.end + 0.04)));
    if (k <= 0.02) return;
    for (const row of this.layout(s, l)) {
      for (const c of row.cells) {
        const seed = 100 * (i + 1) + c.w.index;
        // the ghost: the shape the line will take (a hand knows where it is going, `03-animation §7`)
        s.letter(c.w.w, c.x, row.y, TYPE, seed, { font: 'readable', color: rgba('star', 0.13 * k), w: 2 });
        const p = Lyrics.wordProgress(c.w, t);
        if (p > 0.01) this.inkHatch(s, c.w.w, c.x, row.y, TYPE, seed, p, k);
      }
    }
  }

  /** Lay the line's words out as rows of at most MAXW px, centred; the rows' baselines are ROW_Y. */
  private layout(s: Sheet, l: Line): Row[] {
    const rows: Row[] = [];
    let cells: Cell[] = [];
    let x = 0;
    const flush = () => {
      if (!cells.length) return;
      const len = x - GAP;
      const x0 = (W - len) / 2;
      rows.push({ y: ROW_Y[Math.min(rows.length, ROW_Y.length - 1)]!, cells: cells.map((c) => ({ w: c.w, x: x0 + c.x, wd: c.wd })) });
      cells = [];
      x = 0;
    };
    for (const w of l.words) {
      const wd = s.measureLetter(w.w, 'readable', TYPE);
      if (cells.length && x + GAP + wd > MAXW) flush();
      cells.push({ w, x, wd });
      x += wd + GAP;
    }
    flush();
    return rows;
  }

  /**
   * THE DEVICE. Ink `text` as rain. The glyph centre-lines are the ribbon's axis (RIB = 7 px); walking
   * one at a 3-px step, each sample inks the lattice line it stands on plus the two half-steps k ± 0.5,
   * and consecutive inks that land on the same line are merged by `last` — so the cost is
   * (centre-line length / dash length), not (length / step). `upto` is the word's own `wordProgress`
   * (character by character, never by arc length, `03-animation §7`), so no letter is ever ahead of it.
   */
  private inkHatch(s: Sheet, text: string, x0: number, y0: number, size: number, seed: number, upto: number, a: number) {
    const st = strokeText(text, 'readable', size);
    const chars = Array.from(text);
    const done = clamp(upto, 0, 1) * chars.length;
    const full = Math.floor(done), frac = done - full;
    const ca = Math.cos(RAIN_A), sa = Math.sin(RAIN_A);
    const nx = -sa, ny = ca;                          // the lattice's normal
    const seen = new Map<number, number>();           // lattice line -> last along-lattice coordinate
    for (let si = 0; si < st.strokes.length; si++) {
      const ci = st.charOf[si] ?? 0;
      const u = ci < full ? 1 : ci > full ? 0 : frac;
      if (u <= 0.02) continue;
      const P = resample(st.strokes[si]!, 3);
      const cut = Math.max(1, Math.round(P.length * u));
      for (let i = 0; i < cut - 1; i++) {
        const p = P[i]!, q = P[i + 1]!;
        let tx = q.x - p.x, ty = q.y - p.y;
        const L = Math.hypot(tx, ty) || 1;
        tx /= L; ty /= L;
        const sn = Math.abs(ca * ty - sa * tx);       // sine of the angle between the rain and the stroke
        const h = clamp(RIB / Math.max(sn, 0.25), RIB * 0.7, RIB * 1.5);
        const sx = x0 + p.x, sy = y0 + p.y;
        const dperp = sx * nx + sy * ny;
        for (let m = -1; m <= 1; m++) {
          const kk = Math.round(dperp / RAIN_SP) + m * 0.5;
          const shift = kk * RAIN_SP - dperp;
          const cx = sx + nx * shift, cy = sy + ny * shift;
          const ua = cx * ca + cy * sa;
          const last = seen.get(kk);
          if (last !== undefined && Math.abs(ua - last) < h * 1.4) continue;
          seen.set(kk, ua);
          s.stroke([v2(cx - ca * h, cy - sa * h), v2(cx + ca * h, cy + sa * h)], seed + kk, {
            w: 2.6, color: rgba('star', 0.92), a, taper: false,
          });
        }
      }
    }
  }

  /**
   * The last line: three tears in the front, one `star` in each, and S-O-N cut into them — a `night`
   * letter inside a bright dot reads as CARVED, not as written on top (v1's device, kept). The chisel
   * is the line's own words: every word of a group advances that letter, so nothing is cut early.
   */
  private carve(s: Sheet, t: number, L3: Line) {
    const w = L3.words;
    const groups: [number, number][] = [[0, 2], [3, 4], [5, w.length - 1]];
    for (let k = 0; k < 3; k++) {
      const g = groups[k]!;
      const from = w[g[0]]!;
      const born = clamp(prog(t, from.start - 0.16, from.start + 0.10, ease.outBack));
      if (born <= 0.001) continue;
      const x = TEAR[k]!.x, y = TEAR[k]!.y;
      // the tear: the front is torn away and the night shows through (the same tear band as the type,
      // but the type has been off since 82.64 and the first tear opens at 82.78)
      s.blob(x, y, TEAR_R * born, 500 + k, {
        colour: rgba('night', 0.96), n: 11, jag: 0.22, rot: 0.7 * k,
        outline: { w: 2, color: rgba('star', 0.32), taper: false },
      });
      for (let j = 0; j < 5; j++) {              // threads of cloud still hanging in the tear
        const ang = 0.4 + j * 1.26 + 0.3 * k;
        const r0 = TEAR_R * born, r1 = r0 + 14 + 9 * hash(j, k + 2);
        s.stroke([v2(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0), v2(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1)], 510 + k * 6 + j, {
          w: 1.8, color: rgba('graphite', 0.45), taper: false,
        });
      }
      // the star, and the letter cut into it
      s.blob(x, y, STAR_R * born, 520 + k, {
        colour: rgba('star', 0.95), n: 12, jag: 0.18, rot: 0.3 * k,
        outline: { w: 2, color: rgba('star', 0.6), taper: false },
      });
      let p = 0;
      const n = Math.min(w.length - 1, g[1]);
      for (let i = g[0]; i <= n; i++) p += Lyrics.wordProgress(w[i]!, t);
      p /= (n - g[0] + 1);
      if (p <= 0.01) continue;
      s.letterWritten(NAME[k]!, x, y + CARVE * 0.33, CARVE, 540 + k, p, {
        font: 'tech', color: rgba('night', 0.95), w: 5, align: 'center',
      });
      if (p < 1) s.blob(x - 22 + 44 * p, y - CARVE * 0.36, 4.5, 560 + k, { colour: rgba('lantern', 0.95), n: 6, jag: 0.4 });
    }
  }

  /** A line that is over sinks into the wet ground: small, crossed by the rain, and it stays there. */
  private sunk(s: Sheet, t: number, i: number) {
    const l = this.lines[i]!;
    if (i === 2) return;   // the last line's `end` runs past the plate: it is carved, never sunk
    const k = clamp(prog(t, l.end + 0.2, l.end + 1.2, ease.inOutCubic));
    if (k <= 0.01) return;
    const y = SUNK_Y[i]!, size = 40 - i * 3, x = 190 + i * 70;
    const wd = s.measureLetter(l.text, 'readable', size);
    s.letter(l.text, x, y, size, 900 + i, { font: 'readable', color: rgba('star', 0.34 * k), w: 2 });
    s.hatch([v2(x - 12, y - 30), v2(x + wd + 12, y - 30), v2(x + wd + 12, y + 16), v2(x - 12, y + 16)], 910 + i, {
      spacing: 11, angle: RAIN_A, color: rgba('cool', 0.36 * k), w: 1.2,
    });
  }
}

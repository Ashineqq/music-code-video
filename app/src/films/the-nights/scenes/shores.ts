/*!plate
{
  "id": "shores",
  "window": [85.7664, 93.3854],
  "device": "typed",
  "staging": "instrument",
  "typePx": 120,
  "bands": [
    { "name": "land", "y": [96, 296] },
    { "name": "live", "y": [300, 610] },
    { "name": "sea", "y": [610, 1010] }
  ],
  "movements": [
    { "at": 85.7664, "camera": "crane-in" },
    { "at": 87.1949, "camera": "whip-right" },
    { "at": 88.6235, "camera": "punch-in" },
    { "at": 90.0521, "camera": "pull-back" },
    { "at": 91.0045, "camera": "tilt-down" },
    { "at": 92.4330, "camera": "hold" }
  ]
}
*/
// Plate 10 — `shores` (85.7664 → 93.3854 s, 16 beats, three lines). The page becomes a sea chart: a
// coast, a flat sea, one plotted course — and the lyric **as the chart's own lettering**. Lines 1 and 2
// are lettered along bearing lines (the brief's device: *typed in / annotated*, the father's sentence
// printed on paper); the last line is spelled by the route's own dots, dot by dot. The `lantern` thread
// from the chart's far corner to the boat is the only warmth in the frame: `lantern` is spent on exactly
// two objects — the lamp and the line of light it casts — and every pen in the plate writes in `star`.
//
// THE CHART, in measured numbers. Two bearing lanes cross the sea; each lane is a real line of the
// chart (a `star` hairline, an arrowhead, and its course in degrees at the far end — the one typeset
// voice of the plate, 20 px). The live line is laid out as a block of TWO rows riding those two lanes,
// em 120 → **cap = 0.630 em = 76 px** (measured off the stroke font's 'H' outline: y 22.1 → 652 of
// 1000 upm). Rows are fitted to LANE_W = 1400 px and measured at run time; every line in this window
// comes out as two rows (the widest measured: line 1 1253 + 1132, line 2 1261 + 491, line 3
// 1170 + 1233 px), which clears every framing below — the tightest is zoom 1.16 with the block
// centred at 900, so 960/1.16 = 828 ≥ 1261/2 + 40 + |900 − 860| = 710.
// The last line is not lettered: it is **made of the route's dots** — the glyph centre-lines are walked
// at the route's own pitch (DOT_STEP = 12 px) and a `star` marker of 4.4 px sits at every step, so the
// words are the same dots, at the same rhythm, that walked in from the boat: 610 markers for line 3
// (its measured `tech` centre-line is 6531 px at em 120, and `resample` lands 610 points on it), plus
// the route's own marching track.
//
// BANDS (manifest above). The land holds the chart's legend — a line that is over is filed there,
// small, numbered, in `tech` (its three slots' ink sits at y 98…168, and the coast's own ink never
// crosses y 179, so the legend and the coast do not fight). The live band holds the sung line and
// nothing else: no other element's ink is drawn in it, and the two lettered lines never overlap inside
// it (the envelope: the ink is gone 0.04 s after a line's last word, the next line's ghost starts
// 0.07 s before its first). The sea holds the boat, the rose, the route's approach, the thread and the
// lamp; the sea's own wash is the live band's paper (the device: a chart is what lettering is printed
// on). One declared override, at the very end: movement 6's roll starts when the last word is done
// (93.27) and covers the sheet from x 1660 rightwards — the chart rolling up, ink and paper together.
//
// THE SIX SHOTS (one movement = one re-draw or one reframe; boundaries are the film's beats
// 181/184/187/190/192/195 = 85.7664 · 87.1949 · 88.6235 · 90.0521 · 91.0045 · 92.4330):
//   1 crane-in   85.7664  the coast draws itself and the sea floods in behind the pen; line 1's first
//                          words are lettered along the 087° lane.                        (1150,700,0.94,+0.012)
//   2 whip-right 87.1949  line 1's second row lands, and the boat is built — keel, mast, sail, boy —
//                          as "beyond these shores" is sung.                              (1010,570,1.12,−0.012)
//   3 punch-in   88.6235  line 1 is filed into the legend; line 2 is lettered along the 088° lane;
//                          the rose appears and the route's dots start walking.            (860,620,1.16,+0.014)
//   4 pull-back  90.0521  the whole sea: the last line begins, spelled by the dots.         (980,570,1.10,+0.006)
//   5 tilt-down  91.0045  the dots spell on; the thread leaves the lamp.                    (940,640,1.10,−0.010)
//   6 hold       92.4330  the last words land, the thread reaches the boat's bow, and the chart starts
//                          to roll up from the right edge.                                 (990,560,1.12,+0.004)
//
// Everything that moves or wobbles is a function of the drawing clock (`s.d` / `heldT`) — the boat's
// sway, the rose's needles, every contour; only the camera, the reveal ramps, the dots' march (a step
// function of the beat index) and `Lyrics.wordProgress` read time. No cross-frame state.
import { InkedScene, Sheet, rgba, v2, clamp, lerp, ease, prog, noise1, hash, heldT, resample, CEL } from './_ink';
import type { V2 } from './_ink';
import { strokeText } from '../../../engine/stroke';
import { Lyrics, type Line, type Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

/** The three lines this plate serves, in order. Queried by fragment, never by time. */
const Q = ['He said go venture far', 'Don’t forsake this life', 'I’ll guide you home'];
/** The book's edge — the same on every plate (see `open.ts`). */
const FRAME: [number, number, number, number] = [72, 62, 1848, 1018];
/** The chart: the coast's mean height (the land is above it) and the sea's foot. */
const COAST = 218, SEA_FOOT = 984;
/** The live line: chart lettering at em 120 (cap 76 px), two rows riding two bearings. */
const TYPE = 120, MAXW = 1400, GAP = 36, LANE_W = 1400;
/** The two bearing lanes: their left anchor and their bearing in radians (the letters ride them). */
const LANE: { a: V2; ang: number }[] = [
  { a: v2(280, 440), ang: -0.045 },
  { a: v2(300, 580), ang: -0.038 },
];
/** The route: the dot pitch (one rhythm for the whole plate) and the marker's radius. */
const DOT_STEP = 12, DOT_R = 4.4;
/** The chart's furniture: the boat, the lamp at the far corner, the rose. */
const BOAT: V2 = v2(330, 880);
const LAMP: V2 = v2(1560, 872);
const ROSE: V2 = v2(620, 762);
/** The legend's slots on the land: where a line that is over is filed (ink 98…168, clear of the coast). */
const LEG_Y = [124, 158, 192];
/**
 * Camera sub-shots (cx, cy, zoom, roll). A whip between two of these is a cut that costs nothing
 * (`03-animation.md §2`), and every one of them holds the live block (see the head comment).
 */
const SHOT: [number, number, number, number][] = [
  [1150, 700, 0.94, 0.012],  // 1 the crane in from the sea
  [1010, 570, 1.12, -0.012], // 2 the whip right along the coast
  [860, 620, 1.16, 0.014],   // 3 the punch-in, with the rose coming up
  [980, 570, 1.10, 0.006],   // 4 the pull back to the whole sea
  [940, 640, 1.10, -0.010],  // 5 the tilt down, along the thread
  [990, 560, 1.12, 0.004],   // 6 the hold, and the chart starts to roll
];

/** One laid-out word of a row: how far along its lane it sits, and its advance width. */
interface Cell { w: Word; off: number; wd: number }
interface Row { lane: number; cells: Cell[]; len: number }

export default class Shores extends InkedScene {
  private lines: Line[] = Q.map((q) => this.ctx.lyrics.get(q));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    const a = this.ctx.audio;
    const L = this.lines;
    // movement boundaries: the film's beats, never round seconds (manifest: 181/184/187/190/192/195)
    const b0 = Math.floor(a.beatAt(this.ctx.start + 0.01));
    const MOV = [0, 3, 6, 9, 11, 14].map((k) => a.timeOfBeat(b0 + k));
    let mk = 0;
    for (let i = MOV.length - 1; i >= 0; i--) { if (t >= MOV[i]!) { mk = i; break; } }
    this.shot(s, t, MOV, mk);

    this.frame(s);
    this.chart(s, t, MOV[0]!);
    this.sea(s, t, MOV[0]!);
    this.legend(s, t, 0);
    this.legend(s, t, 1);
    this.boat(s, t, L[0]!, f.a.kick);
    this.rose(s, t, MOV[2]!);
    this.route(s, t, MOV[2]!, L[2]!, f.a.kick);
    this.lit(s, t, 0);                        // lines 1 and 2: chart lettering along the bearings
    this.lit(s, t, 1);
    this.dotted(s, t, L[2]!);                 // line 3: the route's dots spell it
    this.thread(s, t, L[2]!);
    this.roll(s, t, MOV[5]!, a.timeOfBeat(b0 + 16));
    // the sheet's own edge stays on top of the roll: it is a chart, not a torn page
    s.rect(FRAME[0], FRAME[1], FRAME[2], FRAME[3], 2, { w: 2.6, color: rgba('star', 0.34), amp: 1.6, overshoot: 9 });
    return CEL.flat;
  }

  /** The camera: hold the movement's shot, whip into the next with outExpo — a cut, not a drift. */
  private shot(s: Sheet, t: number, MOV: number[], k: number) {
    const A = SHOT[Math.max(0, k - 1)]!, B = SHOT[k]!;
    const w = clamp(prog(t, MOV[k]! - 0.18, MOV[k]! + 0.30, ease.outExpo));
    const phase = this.ctx.audio.beatAt(t) % 1;
    const z = lerp(A[2], B[2], w) * (1 + 0.018 * Math.max(0, 1 - phase * 3));
    s.setCam(lerp(A[0], B[0], w), lerp(A[1], B[1], w), z, lerp(A[3], B[3], w));
  }

  /** The sheet: its inner edge and the folio only (v1's writing rules are gone, `04-plates §5`). */
  private frame(s: Sheet) {
    s.rect(FRAME[0] + 9, FRAME[1] + 9, FRAME[2] - 9, FRAME[3] - 9, 3, { w: 1, sketch: true, color: rgba('star', 0.16) });
    s.text('x.', 176, 966, { size: 26, fam: 'Plex-400', color: rgba('star', 0.4) });
  }

  /** The coast: one line across the sheet, drawn left to right by the pen (movement 1). */
  private coast(): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      out.push(v2(lerp(40, 1880, u), COAST + 30 * noise1(u * 3.1, 5) + 9 * noise1(u * 8.3, 11)));
    }
    return out;
  }

  /**
   * The land and its shoreline: the sheet above the coast is a solid `night2` mass and the shore is a
   * `cool` hatch band hanging just under the pen. The pen is also movement 1's clock.
   */
  private chart(s: Sheet, t: number, t0: number) {
    const p = clamp(prog(t, t0 + 0.10, t0 + 0.95, ease.inOutQuad));
    const coast = this.coast();
    const shown = Math.max(2, Math.ceil(coast.length * p));
    // the land is one solid mass on the page's own shape; the gesture is the pen, not the fill
    const land = [v2(40, 40), v2(1880, 40), ...coast.slice().reverse()];
    s.fill(land, 10, rgba('night2', 0.9 * clamp(0.35 + 0.65 * p, 0, 1)), { amp: 2.6 });
    s.stroke(coast.slice(0, shown), 12, { w: 2.4, color: rgba('graphite', 0.55), amp: 2, taper: false, overshoot: 12 });
    // the shore: a real band under the coast, hatched `cool`, arriving with the pen
    const c2 = coast.slice(0, shown);
    const shore = [...c2.map((q) => v2(q.x, q.y + 6)), ...c2.map((q) => v2(q.x, q.y + 34)).reverse()];
    s.hatch(shore, 14, { spacing: 13, angle: -0.5, color: rgba('cool', 0.4 * clamp(0.3 + 0.7 * p, 0, 1)), w: 1.5 });
    if (p > 0.02 && p < 0.999) {
      const q = coast[Math.min(coast.length - 1, shown - 1)]!;
      s.blob(q.x + 5, q.y - 5, 6.5, 16, { colour: rgba('star', 0.95), n: 7, jag: 0.45 });
    }
    // the chart's own marginal note: cold, and the plate's only other typeset voice
    s.text('soundings in fathoms · not for navigation', 1780, 118, {
      size: 20, fam: 'Plex-400', color: rgba('star', 0.42), align: 'right', a: p,
    });
  }

  /**
   * The sea: a flat `cool` wash south of the coast — the live lettering's paper — with the chart's own
   * furniture on it: three hairlines of the graticule and three soundings.
   */
  private sea(s: Sheet, t: number, t0: number) {
    const flood = clamp(prog(t, t0 + 0.45, t0 + 1.25));
    const coast = this.coast();
    s.fill([...coast, v2(1880, SEA_FOOT), v2(40, SEA_FOOT)], 20, rgba('cool', 0.42 * flood), { amp: 2.4 });
    for (let i = 0; i < 3; i++) {
      const y = 660 + i * 100;
      s.stroke([v2(60, y), v2(1860, y + 26)], 30 + i, {
        w: 1, sketch: true, color: rgba('star', 0.1), overshoot: 20, a: flood,
      });
    }
    const marks: [string, number, number][] = [['24', 1290, 700], ['18', 1620, 806], ['31', 806, 686]];
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i]!;
      s.text(m[0], m[1], m[2], { size: 20, fam: 'Plex-400', color: rgba('star', 0.34), a: flood });
    }
  }

  /** The chart's legend: a line that is over is filed on the land, small, numbered, in `tech`. */
  private legend(s: Sheet, t: number, i: number) {
    const l = this.lines[i]!;
    const k = clamp(prog(t, l.end + 0.25, l.end + 1.25, ease.inOutCubic));
    if (k <= 0.01) return;
    const size = 46 - i * 2, x = 200, y = LEG_Y[i]!;
    const wd = s.measureLetter(l.text, 'tech', size);
    s.text(`${i + 1}.`, x - 36, y - 2, { size: 22, fam: 'Plex-400', color: rgba('star', 0.42 * k) });
    s.letter(l.text, x, y, size, 900 + i, { font: 'tech', color: rgba('star', 0.4 * k), w: 2, rot: -0.018 });
    s.stroke([v2(x - 8, y + 12), v2(x + wd + 12, y + 9)], 910 + i, {
      w: 1.2, sketch: true, color: rgba('star', 0.2 * k), overshoot: 8,
    });
  }

  /**
   * The boat: four parts, one per word of the line's tail ("beyond", "these", "shores"), so the chart
   * gains its subject exactly as the father's sentence is finished. Its sway is on twos, never smooth.
   */
  private boat(s: Sheet, t: number, L1: Line, kick: number) {
    const w = L1.words;
    const from = w[Math.min(w.length - 1, 5)]!.start, to = w[w.length - 1]!.end;
    const p = clamp((t - from) / Math.max(0.2, to - from));
    if (p <= 0) return;
    const sway = Math.sin(heldT(t) * 1.6) * 2.4 + kick * 1.6;
    const x = BOAT.x, y = BOAT.y + sway;
    const ink = rgba('star', 0.8), warm = rgba('star', 0.95);
    const hull = [v2(x - 58, y + 14), v2(x + 58, y + 14), v2(x + 38, y - 10), v2(x - 38, y - 10)];
    s.fill(hull, 60, rgba('night2', 0.95), { amp: 1.6 });
    s.stroke(hull, 60, { w: 3.6, closed: true, color: ink, taper: false });
    if (p > 0.3) s.stroke([v2(x - 4, y - 8), v2(x - 4, y - 78)], 61, { w: 3.4, color: ink });
    if (p > 0.55) {
      const sail = [v2(x - 1, y - 72), v2(x + 36, y - 16), v2(x - 1, y - 16)];
      s.fill(sail, 62, rgba('star', 0.22), { amp: 1.4 });
      s.stroke(sail, 62, { w: 3.4, closed: true, color: warm, taper: false });
    }
    if (p > 0.8) {
      s.blob(x + 14, y - 46, 6.5, 63, { colour: rgba('star', 0.9), n: 8, jag: 0.15 });
      s.stroke([v2(x + 14, y - 39), v2(x + 14, y - 12)], 64, { w: 3.4, color: warm });
      s.stroke([v2(x + 6, y - 32), v2(x + 14, y - 27), v2(x + 22, y - 33)], 65, { w: 3.2, color: warm });
    }
  }

  /** The compass rose (movement 3): the chart's grammar, on the sea where the punch-in can hold it. */
  private rose(s: Sheet, t: number, t0: number) {
    const rise = clamp(prog(t, t0 - 0.15, t0 + 0.7, ease.outCubic));
    if (rise <= 0.01) return;
    const x = ROSE.x, y = ROSE.y, r = 46;
    // the needles step on the drawing clock: a chart is printed, but this one is drawn by hand
    const spin = 0.012 * noise1(heldT(t) * 3.1, 4);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI + spin;
      const len = i === 2 ? r * 1.25 : r * 0.82;
      s.stroke([v2(x - Math.cos(ang) * len, y - Math.sin(ang) * len), v2(x + Math.cos(ang) * len, y + Math.sin(ang) * len)], 50 + i, {
        w: 1.8, sketch: true, color: rgba('graphite', 0.5 * rise), taper: false,
      });
    }
    s.stroke(this.circlePts(x, y, r * 0.5, 16), 55, { w: 1.4, closed: true, color: rgba('star', 0.3 * rise), taper: false });
    s.fill([v2(x, y - 10), v2(x + 10, y), v2(x, y + 10), v2(x - 10, y)], 56, rgba('star', 0.8 * rise), { amp: 1 });
    s.text('N 27°E', x + 42, y + 6, { size: 20, fam: 'Plex-400', color: rgba('star', 0.45 * rise) });
  }

  /** A circle as a closed polyline (for the rose's inner ring). */
  private circlePts(cx: number, cy: number, r: number, n: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      out.push(v2(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
    }
    return out;
  }

  /**
   * The route. Its approach (from the boat's bow up to the sea's edge) is paid out one pitch per beat
   * from movement 3 — "the route's dots start walking" — and its tail (from the last lane down to the
   * lamp) is paid out with the last line's own words. Inside the lanes the dots ARE the words (see
   * `dotted`). Both are step functions of the beat index / word progress, so they never smear.
   */
  private route(s: Sheet, t: number, t0: number, L3: Line, kick: number) {
    const a = this.ctx.audio;
    const march = Math.max(0, Math.floor(a.beatAt(t)) - Math.floor(a.beatAt(t0))) * 44;
    this.routeDots(s, [v2(BOAT.x + 70, BOAT.y - 16), v2(302, 636)], march, 400, kick, false);
    let p = 0;
    for (const e of L3.words) p += Lyrics.wordProgress(e, t);
    p /= L3.words.length;
    const tail = [v2(1530, 548), v2(1612, 700), v2(LAMP.x - 14, LAMP.y - 26)];
    this.routeDots(s, tail, this.pathLen(tail) * p, 420, kick, true);
  }

  /** Lay a dotted track along `path` up to `len` px, the newest marker taking the kick. */
  private routeDots(s: Sheet, path: V2[], len: number, seed: number, kick: number, lastTakesKick: boolean) {
    if (len <= 1) return;
    const pts = resample(path, DOT_STEP);
    const n = Math.min(pts.length, Math.max(1, Math.round(len / DOT_STEP)));
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const newest = lastTakesKick && i === n - 1;
      const r = DOT_R * (newest ? 1.1 : 0.82) + (newest ? 2.2 * kick : 0);
      s.fill(this.dotPts(p.x, p.y, r), seed + i, rgba('star', 0.9), { amp: 0.8 });
    }
  }

  /** A chart marker: a small irregular dot (a plotted position, not a circle). */
  private dotPts(x: number, y: number, r: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.4;
      const rr = r * (1 + 0.24 * noise1(i * 1.3 + x * 0.01 + y * 0.01, 3));
      out.push(v2(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr));
    }
    return out;
  }

  /** The path's length (so the tail's dots can be laid as a fraction of it). */
  private pathLen(path: V2[]): number {
    let n = 0;
    for (let i = 0; i + 1 < path.length; i++) n += Math.hypot(path[i + 1]!.x - path[i]!.x, path[i + 1]!.y - path[i]!.y);
    return n;
  }

  /**
   * Lines 1 and 2: chart lettering riding their bearing lanes. Each lane is drawn as the chart's own
   * line — hairline, arrowhead, and its course in degrees — and the words are written along it word by
   * word (`Lyrics.wordProgress`). One line at full size at a time: the ink is gone 0.04 s after a line's
   * last word and the next line's ghost starts 0.07 s before its first, so the two rows that share
   * these lanes are never on the band together.
   */
  private lit(s: Sheet, t: number, i: number) {
    const l = this.lines[i]!;
    const k = clamp(prog(t, l.start - 0.07, l.start - 0.015)) * (1 - clamp(prog(t, l.end, l.end + 0.04)));
    if (k <= 0.02) return;
    for (const row of this.layout(s, l)) {
      const lane = LANE[row.lane]!;
      const dx = Math.cos(lane.ang), dy = Math.sin(lane.ang);
      const sh = (LANE_W - row.len) / 2;
      const s0 = lane.a.x + dx * sh, y0 = lane.a.y + dy * sh;
      // the bearing: the chart's hairline under the row, its arrowhead, and its course
      const ex = s0 + dx * (row.len + 96), ey = y0 + dy * (row.len + 96);
      const sd = 200 + i * 8 + row.lane;
      s.stroke([v2(s0 - 120 * dx, y0 - 120 * dy), v2(ex, ey)], sd, {
        w: 1.3, sketch: true, color: rgba('star', 0.3 * k), overshoot: 10,
      });
      s.stroke([v2(ex, ey), v2(ex - 22 * dx - 10 * dy, ey - 22 * dy + 10 * dx)], sd + 1, {
        w: 1.6, color: rgba('star', 0.4 * k), taper: false,
      });
      s.stroke([v2(ex, ey), v2(ex - 22 * dx + 10 * dy, ey - 22 * dy - 10 * dx)], sd + 2, {
        w: 1.6, color: rgba('star', 0.4 * k), taper: false,
      });
      const deg = String(Math.round(90 + (lane.ang * 180) / Math.PI)).padStart(3, '0');
      s.text(`${deg}°`, ex + 14 * dx + 4, ey + 26, { size: 20, fam: 'Plex-400', color: rgba('star', 0.5 * k) });
      for (let c = 0; c < row.cells.length; c++) {
        const cell = row.cells[c]!;
        const ox = s0 + cell.off * dx, oy = y0 + cell.off * dy;
        // the ghost: what the row will be (a chart's lettering is set before it is inked)
        s.letter(cell.w.w, ox, oy, TYPE, 100 * (i + 1) + cell.w.index, {
          font: 'tech', color: rgba('star', 0.12 * k), w: 2, rot: lane.ang,
        });
        const p = Lyrics.wordProgress(cell.w, t);
        if (p <= 0.01) continue;
        s.letterWritten(cell.w.w, ox, oy, TYPE, 150 * (i + 1) + cell.w.index, p, {
          font: 'tech', w: 3.4, amp: 1.8, color: p >= 1 ? rgba('star', 0.92) : rgba('star', 0.66), rot: lane.ang,
        });
        if (p < 1) {
          s.blob(ox + dx * cell.wd * p, oy + dy * cell.wd * p, 4.6, sd + 3 + c, { colour: rgba('star', 0.95), n: 6, jag: 0.4 });
        }
      }
    }
  }

  /**
   * THE LAST LINE, spelled by the route's dots: the glyph centre-lines of each row are walked at the
   * route's own pitch and a `star` marker sits at every step. Revealed word by word, so the dots arrive
   * in the order they are sung, at the rhythm they walked in with.
   */
  private dotted(s: Sheet, t: number, L3: Line) {
    for (const row of this.layout(s, L3)) {
      const lane = LANE[row.lane]!;
      const dx = Math.cos(lane.ang), dy = Math.sin(lane.ang);
      const sh = (LANE_W - row.len) / 2;
      const s0 = lane.a.x + dx * sh, y0 = lane.a.y + dy * sh;
      for (const cell of row.cells) {
        const p = Lyrics.wordProgress(cell.w, t);
        if (p <= 0.01) continue;
        this.dotWord(s, cell.w.w, s0 + cell.off * dx, y0 + cell.off * dy, lane.ang, p, 300 + cell.w.index);
      }
    }
  }

  /** One word as dots: its glyph centre-lines walked at DOT_STEP, a marker at every step. */
  private dotWord(s: Sheet, text: string, ox: number, oy: number, ang: number, upto: number, seed: number) {
    const st = strokeText(text, 'tech', TYPE);
    const chars = Array.from(text);
    const done = clamp(upto, 0, 1) * chars.length;
    const full = Math.floor(done), frac = done - full;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let si = 0; si < st.strokes.length; si++) {
      const ci = st.charOf[si] ?? 0;
      const u = ci < full ? 1 : ci > full ? 0 : frac;
      if (u <= 0.02) continue;
      const P = resample(st.strokes[si]!, DOT_STEP);
      const cut = Math.max(1, Math.round(P.length * u));
      for (let i = 0; i < cut; i++) {
        const q = P[i]!;
        s.fill(this.dotPts(ox + q.x * ca - q.y * sa, oy + q.x * sa + q.y * ca, DOT_R), seed * 97 + i, rgba('star', 0.92), { amp: 0.8 });
      }
    }
  }

  /**
   * The thread — the frame's only warmth. It is paid out from the lamp at the chart's far corner as the
   * last line is sung (one pull per word) and lands on the boat's bow as the line ends. `lantern` is
   * spent on exactly this: the lamp, and the line of light it casts across the sea.
   */
  private thread(s: Sheet, t: number, L3: Line) {
    const w = L3.words;
    let p = 0;
    for (const e of w) p += Lyrics.wordProgress(e, t);
    p /= w.length;
    const lit = clamp(prog(t, w[0]!.start - 0.12, w[0]!.start + 0.2));
    if (lit > 0.001) {
      const fl = 0.85 + 0.15 * hash(0, s.d);
      const x = LAMP.x, y = LAMP.y;
      const body = [v2(x - 26, y - 30), v2(x + 26, y - 30), v2(x + 30, y), v2(x - 30, y)];
      s.fill(body, 70, rgba('lantern', 0.95 * lit), { amp: 2 });
      s.stroke(body, 70, { w: 3.4, closed: true, color: rgba('star', 0.8), taper: false });
      s.stroke([v2(x - 18, y - 30), v2(x, y - 58), v2(x + 18, y - 30)], 71, { w: 3.2, color: rgba('star', 0.8) });
      s.blob(x, y - 15, 11 * lit * fl, 72, { colour: rgba('star', 0.95), n: 9, jag: 0.5 });
    }
    if (p <= 0.01) return;
    const path = this.qbez(v2(LAMP.x - 6, LAMP.y - 4), v2(920, 950), v2(BOAT.x + 26, BOAT.y - 6), 34);
    const shown = Math.max(2, Math.ceil(path.length * p));
    s.stroke(path.slice(0, shown), 75, { w: 4.6, color: rgba('lantern', 0.98), amp: 1.8, overshoot: 5 });
    if (p < 1) {
      const head = path[Math.min(path.length - 1, shown - 1)]!;
      s.blob(head.x, head.y, 6.6, 76, { colour: rgba('star', 0.95), n: 7, jag: 0.4 });
    }
  }

  /** A quadratic bezier as a polyline (the thread's sag across the sea). */
  private qbez(a: V2, c: V2, b: V2, n: number): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push(v2(v * v * a.x + 2 * v * u * c.x + u * u * b.x, v * v * a.y + 2 * v * u * c.y + u * u * b.y));
    }
    return out;
  }

  /**
   * Movement 6's closing gesture: the chart rolls up from the right edge. A roll, not a page — a
   * cylinder with the chart's own ink curling round it, and the sheet's `night` behind it. It starts
   * after the line's last word (93.27) so nothing that is being sung is ever rolled away.
   */
  private roll(s: Sheet, t: number, t0: number, t1: number) {
    const p = clamp(prog(t, t0 + 0.5, t1, ease.inOutCubic));
    if (p <= 0.01) return;
    const x = lerp(1860, 1660, p);
    s.fill([v2(x, 40), v2(1900, 40), v2(1900, 1010), v2(x, 1010)], 800, rgba('night', 1), { amp: 2.2 });
    s.fill([v2(x, 40), v2(x + 78, 40), v2(x + 78, 1010), v2(x, 1010)], 801, rgba('night2', 0.92), { amp: 2.4 });
    for (let i = 0; i < 3; i++) {
      const pts: V2[] = [];
      for (let j = 0; j <= 12; j++) {
        const u = j / 12;
        pts.push(v2(x + 8 + i * 26 + Math.sin(u * Math.PI) * 5, lerp(60, 1000, u)));
      }
      s.stroke(pts, 802 + i, { w: 1.4, sketch: true, color: rgba('star', 0.26), overshoot: 8 });
    }
    s.stroke([v2(x, 40), v2(x, 1010)], 806, { w: 2.4, color: rgba('star', 0.4), amp: 2.2 });
    s.stroke([v2(x + 78, 40), v2(x + 78, 1010)], 807, { w: 1.8, color: rgba('star', 0.3), amp: 2.2 });
  }

  /**
   * Lay the live line out as rows riding the bearing lanes: words are packed up to MAXW px per row and
   * each row is centred in its lane. The row count comes from the measurement at run time — every line
   * in this window measures two rows (see the head comment).
   */
  private layout(s: Sheet, l: Line): Row[] {
    const rows: Row[] = [];
    let cells: Cell[] = [];
    let x = 0;
    const flush = () => {
      if (!cells.length) return;
      const len = x - GAP;
      // the cells' offsets stay relative to the row's start; the caller centres the row in its lane
      rows.push({ lane: Math.min(rows.length, LANE.length - 1), len, cells: cells.slice() });
      cells = [];
      x = 0;
    };
    for (const w of l.words) {
      const wd = s.measureLetter(w.w, 'tech', TYPE);
      if (cells.length && x + GAP + wd > MAXW) flush();
      cells.push({ w, off: x, wd });
      x += wd + GAP;
    }
    flush();
    return rows;
  }
}

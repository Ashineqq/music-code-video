// Plate 12 — "Sharp left turn and there you are" / "Without a single CDR"
//
// A hand-drawn engineering roadmap on a drawing sheet: one long dashed trajectory ruled across the
// paper, milestones ringed and lettered SRR / PDR / CDR / TRR / LAUNCH, and a travel dot crawling
// along it. On "sharp left turn" the trajectory ITSELF swerves 90° and the camera whips with it — the
// whip is sold the hand-drawn way: the whole roadmap is re-drawn three times in a row, each copy
// further offset and more smeared, so the frame is the drawing being dragged. "and there you are":
// the dot brakes to a stop inside a crater that opens on a contour map, a survey marker drops on the
// kick, the camera cranes out and the contours turn out to be the mask as terrain — the crater is one
// eye, there is a second eye crater and a smile groove, YOU / ARE are stamped as map labels and an
// UNPLANNED OBJECT · not on roadmap callout slams in on the object nobody scheduled. "Without a single
// CDR": cut to a hand-ruled review schedule — SRR and PDR are drawn in as the TODAY playhead runs, the
// CDR slot is left empty and blinking at ~2 Hz (STATUS: NOT HELD), the playhead stalls in it, then
// zips past TRR (SKIPPED) to LAUNCH (AHEAD OF SCHEDULE).
//
// Everything that moves boils on the drawing clock (RULE 1): the swerve, the whip and the stall are
// all read from heldT, so the corner steps from drawing to drawing exactly as the whip does, and every
// wobble seed is the drawing index. The sheet's frame, the lyric and the production slug are built
// from the camera's own inverse, so no camera move can drag them out of the title-safe area.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, TAU, heldT } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import { pointAtLength, polylineLengths } from '../../../engine/util';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ---------------------------------------------------------------- small hand tools
/** Where the lyric sits on SCREEN, pinned: no camera move (the whip, the crane) can drag it out.
 *  At 922 its ink clears the schedule strip's bottom rule (up to y 878 with the punch) and still
 *  sits inside the safe area, with the descenders above the bottom-right HUD band (y >= 940). */
const LYRIC_SY = 922;
/** A camera, as the plate records it, so anything pinned can be built in the same sheet space. */
interface Cam { cx: number; cy: number; z: number; roll: number }

function circlePts(cx: number, cy: number, r: number, n = 20, sy = 1): V2[] {
  const p: V2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; p.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy)); }
  return p;
}

/** A circle the hand never quite joins up. */
function dashedCircle(s: Sheet, cx: number, cy: number, r: number, seed: number, color: string, w: number, segs = 8, frac = 0.52) {
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * TAU;
    const pts: V2[] = [];
    for (let j = 0; j < 5; j++) {
      const a = lerp(a0, a0 + (TAU / segs) * frac, j / 4);
      pts.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    s.stroke(pts, seed + i * 3.1, { w, color, amp: 1.8 });
  }
}

function dashedRect(s: Sheet, x0: number, y0: number, x1: number, y1: number, seed: number, color: string, w: number) {
  const sides: [V2, V2][] = [
    [v2(x0, y0), v2(x1, y0)],
    [v2(x1, y0), v2(x1, y1)],
    [v2(x1, y1), v2(x0, y1)],
    [v2(x0, y1), v2(x0, y0)],
  ];
  let k = 0;
  for (const sd of sides) {
    const a = sd[0], b = sd[1];
    for (let j = 0; j < 3; j++) {
      const u0 = j / 3, u1 = u0 + 0.24;
      s.stroke([v2(lerp(a.x, b.x, u0), lerp(a.y, b.y, u0)), v2(lerp(a.x, b.x, u1), lerp(a.y, b.y, u1))], seed + k * 4.7, { w, color, amp: 1.6 });
      k++;
    }
  }
}

/**
 * The lyric: hand-lettered, written stroke by stroke as it is sung, ghosted first. It is PINNED — the
 * screen point (960, sy) is mapped back through the camera, drawn at a constant screen size — so the
 * whip and the crane move the drawing under it and never the words themselves.
 */
function writeLine(s: Sheet, cam: Cam, line: Line, t: number, sy: number, size: number, seedBase: number) {
  const fam = 'readable';
  const words = line.words;
  const sc = size / cam.z;
  const widths = words.map((w) => s.measureLetter(w.w, fam, sc));
  const gap = sc * 0.3;
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, words.length - 1);
  const at = s.pin(W / 2, sy);
  let x = at.x - total / 2;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const p = Lyrics.wordProgress(w, t);
    if (p > 0) {
      const sway = noise1(s.d * 0.41 + i * 1.7, 55) * 2.2;
      if (p < 1) s.letterWritten(w.w, x, at.y + sway, sc, seedBase + i * 3, 1, { font: fam, ghost: true });
      s.letterWritten(w.w, x, at.y + sway, sc, seedBase + i * 3, p, {
        font: fam,
        color: p >= 1 ? rgba('ink') : rgba('signal'),
        w: sc * 0.085,
      });
    }
    x += widths[i]! + gap;
  }
}

// ---------------------------------------------------------------- the roadmap
const SEG2 = 560;
const MILESTONES: [number, string, boolean][] = [
  [0.08, 'SRR', false],
  [0.24, 'PDR', false],
  [0.4, 'CDR', true], // never staffed — the plate's running gag
  [0.52, 'TRR', false],
  [0.86, 'LAUNCH', false],
];

interface RoadCopy {
  ox: number; oy: number; amp: number; color: string;
  dot: boolean; dotF: number; crater: number;
}

/** One pass of the roadmap. Returns the far endpoint, so the caller can hang the map off it. */
function roadPass(s: Sheet, turnU: number, o: RoadCopy): V2 {
  const A = v2(150 + o.ox, 780 + o.oy);
  const C = v2(980 + o.ox, 780 + o.oy);
  const th = -Math.PI / 2 * turnU;
  const B = v2(C.x + Math.cos(th) * SEG2, C.y + Math.sin(th) * SEG2);
  const path = [A, C, B];
  const L = polylineLengths(path);
  const total = L[2]!;
  const sd = o.ox * 0.013 + o.amp * 17;

  // graphite construction lines through the corner — the drawing underneath the drawing
  const con = rgba('graphite', 0.26 / o.amp);
  s.stroke([v2(C.x - 320, C.y - 320), v2(C.x + 320, C.y + 320)], 200 + sd, { w: 1.2, color: con, amp: 3.4, sketch: true });
  s.stroke([v2(C.x - 320, C.y + 320), v2(C.x + 320, C.y - 320)], 201 + sd, { w: 1.2, color: con, amp: 3.4, sketch: true });

  // the dashed trajectory: ruled, not printed
  let a = 0, k = 0;
  while (a < total) {
    const b = Math.min(total, a + 22);
    const pts: V2[] = [];
    for (let j = 0; j < 4; j++) { const q = pointAtLength(path, L, lerp(a, b, j / 3)); pts.push(v2(q.x, q.y)); }
    s.stroke(pts, 300 + k * 6.7 + sd, { w: 3.6, color: o.color, amp: 2.4 * o.amp, overshoot: 2 });
    a = b + 30;
    k++;
  }

  // milestones
  for (let i = 0; i < MILESTONES.length; i++) {
    const fr = MILESTONES[i]![0], lab = MILESTONES[i]![1], empty = MILESTONES[i]![2];
    const q = pointAtLength(path, L, fr * total);
    if (empty) dashedCircle(s, q.x, q.y, 27, 400 + i * 90 + sd, o.color, 2.8);
    else s.stroke(circlePts(q.x, q.y, 27, 18), 420 + i * 90 + sd, { closed: true, w: 3.2, color: o.color, amp: 2.2 * o.amp });
    s.letter(lab, q.x, q.y + 54, 24, 460 + i * 77 + sd, { font: 'tech', color: o.color, align: 'center', amp: 1.3 * o.amp });
  }

  if (!o.dot) return B;

  // the travel dot
  const dp = pointAtLength(path, L, clamp(o.dotF) * total);
  if (o.dotF < 0.995) {
    const q2 = pointAtLength(path, L, Math.max(0, clamp(o.dotF) * total - 52));
    s.stroke([v2(q2.x, q2.y), v2(dp.x, dp.y)], 940 + sd, { w: 3.0, color: rgba('signal', 0.45), amp: 2.2 });
  }
  s.blob(dp.x, dp.y, 15, 900 + sd, { colour: rgba('signal'), jag: 0.1, n: 18, outline: { w: 3.0, color: rgba('ink') } });

  craterAt(s, B.x, B.y, o.crater, sd);
  if (o.crater > 0.4) {
    s.letter('there you are', B.x + 46, B.y + 8, 26, 1100, { font: 'hscript', color: rgba('blood', 0.9) });
  }
  return B;
}

/** Concentric wobbly contour rings and a small hatched crater — the destination, as a map would draw it. */
function craterAt(s: Sheet, cx: number, cy: number, grow: number, sd: number) {
  if (grow <= 0.01) return;
  const g = clamp(grow);
  const radii = [30, 64, 100, 138, 178];
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i]! * g;
    const cxo = cx + 16 * g * noise1(i * 2.7 + s.d * 0.5, 31 + sd);
    const cyo = cy + 11 * g * noise1(i * 3.9 + s.d * 0.5, 51 + sd);
    const n = 30;
    const pts: V2[] = [];
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * TAU;
      const rr = r * (1 + 0.075 * noise1(j * 0.8 + s.d * 1.4 + i * 3, 71 + sd));
      pts.push(v2(cxo + Math.cos(ang) * rr, cyo + Math.sin(ang) * rr * 0.88));
    }
    s.stroke(pts, 960 + i * 9 + sd, { closed: true, w: 2.2, color: rgba('graphite', 0.85 * g), amp: 3.6 });
  }
  s.blob(cx, cy, 30 * g, 1000 + sd, { colour: rgba('shade', g), jag: 0.18, n: 22, outline: { w: 2.8, color: rgba('ink', g) } });
  s.hatch(circlePts(cx, cy, 30 * g), 1010 + sd, { spacing: 8, angle: -Math.PI / 4, color: rgba('blood', 0.5 * g), w: 1.3 });
}

/**
 * The map's destination, resolving into THE MASK AS TERRAIN as the camera cranes out: the crater the
 * spark braked into is one eye, and the survey contours around it are the bland face — a second eye
 * crater and a smile groove. Pure contour work, boiling on the drawing index like every other line.
 * `bx, by` is the crater the spark stopped in (the near eye); `g` is the crane-out progress.
 */
function maskTerrain(s: Sheet, bx: number, by: number, g: number, sd: number) {
  const M = v2(bx + 210, by + 20);
  // the face itself: two concentric survey contours
  for (let i = 0; i < 2; i++) {
    const n = 48, rx = (580 - i * 80) * g, ry = (400 - i * 56) * g;
    const pts: V2[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU;
      const rr = 1 + 0.05 * noise1(j * 0.7 + s.d * 1.3 + i * 5, 33 + sd);
      pts.push(v2(M.x + Math.cos(a) * rx * rr, M.y + Math.sin(a) * ry * rr));
    }
    s.stroke(pts, 1200 + i * 11 + sd, { closed: true, w: i ? 1.6 : 2.2, color: rgba('graphite', (i ? 0.5 : 0.8) * g), amp: 3.2 });
  }
  // the far eye: the same crater, so the face reads as two of them
  craterAt(s, M.x + 210, M.y - 20, g, sd);
  // the smile groove, ruled like a contour and dropped clear of the eye craters
  const smile: V2[] = [];
  for (let j = 0; j <= 22; j++) {
    const a = lerp(0.72, 2.42, j / 22);
    smile.push(v2(M.x + Math.cos(a) * 300 * g, M.y + 60 + Math.sin(a) * 170 * g));
  }
  s.stroke(smile, 1250 + sd, { w: 2.4, color: rgba('graphite', 0.8 * g), amp: 2.6 });
  return M;
}

/** The survey marker, dropped onto the crater on the kick: a pin with a stem to the point. */
function marker(s: Sheet, x: number, y: number, squash: number) {
  s.blob(x, y - 74 * squash, 26 * squash, 1300, { colour: rgba('signal', 0.9), jag: 0.1, n: 20, outline: { w: 2.8, color: rgba('ink') } });
  s.stroke([v2(x, y - 50 * squash), v2(x, y - 8)], 1301, { w: 2.6, color: rgba('ink', 0.9), amp: 1.3, taper: false });
  s.stroke([v2(x - 30, y - 100 * squash), v2(x + 30, y - 100 * squash)], 1302, { w: 2.2, color: rgba('ink', 0.65), amp: 1.6 });
}

// ---------------------------------------------------------------- the plate
export default class Leftturn extends InkedScene {
  private l1 = this.ctx.lyrics.get('Sharp left turn');
  private l2 = this.ctx.lyrics.get('Without a single CDR');
  /** The camera we last handed the sheet — needed to pin the frame, the lyric and the slug. */
  private cam: Cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
  /**
   * The kick the survey marker drops on: the first beat after the crater opens. Read off the beat
   * grid, so "the marker drops on the kick" is the grid's answer and not a guessed number.
   */
  private mkDrop = this.ctx.audio.timeOfBeat(Math.ceil(this.ctx.audio.beatAt(82.95)));

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, wt = heldT(t);
    const CUT = 85.0;

    let flash = 0;
    if (t < CUT) flash = this.road(s, wt);
    else this.schedule(s, wt);

    // the sheet's own frame, ruled once per drawing (it boils with the rest). It is built from the
    // camera's own inverse, so it is a deliberate FULL-FRAME rule pinned to the screen — drawn after
    // the camera is set, never with whatever framing the previous frame happened to leave behind.
    const fr = [s.pin(64, 48), s.pin(W - 64, 48), s.pin(W - 64, H - 48), s.pin(64, H - 48)];
    s.stroke(fr, 90, { closed: true, w: 3.4, color: rgba('ink', 0.7), overshoot: 6, amp: 3.0 });

    writeLine(s, this.cam, t < CUT ? this.l1 : this.l2, t, LYRIC_SY, 54, 700);
    this.slug(s, t < CUT ? '12A — TRAJECTORY, REVISED' : '12B — SCHEDULE, REV C');

    return { flash: 0.03 * f.a.snare + flash, zoom: 1 + 0.005 * f.a.kick };
  }

  private road(s: Sheet, wt: number): number {
    // the 90° swerve is the plate's headline event, so it steps on drawings exactly as the whip does:
    // read off the drawing clock, the far endpoint moves ~130 px a drawing instead of crawling 26 px
    // into every shutter and smearing the corner.
    const turnU = ease.inOutCubic(clamp((wt - 82.05) / 0.57));
    const whip = clamp((wt - 81.95) / 0.95);
    const whipE = Math.sin(Math.PI * whip);
    // a shallow crane: the lyric is pinned, but the map's own labels, the marker and the face have to
    // stay inside the frame, so the camera drops 46 px over the turn and 30 more on the whip
    this.setCam(s, 900 - 26 * whipE, 578 - 46 * turnU - 30 * whipE, 0.965, -0.06 * whipE);

    // the title block, hand-ruled in the corner of the sheet
    s.rect(96, 72, 470, 236, 120, { w: 2.4, color: rgba('ink', 0.6), overshoot: 4 });
    s.stroke([v2(96, 118), v2(470, 118)], 121, { w: 1.8, color: rgba('ink', 0.45) });
    s.stroke([v2(96, 176), v2(470, 176)], 122, { w: 1.8, color: rgba('ink', 0.45) });
    s.text('TRAJECTORY — REV C', 108, 106, { size: 20, fam: 'Plex-400', color: rgba('graphite', 0.95) });
    s.text('PLATE 12   SCALE 1:1', 108, 162, { size: 18, fam: 'Plex-400', color: rgba('graphite', 0.8) });
    s.text('DRAWN BY HAND', 108, 218, { size: 18, fam: 'Plex-400', color: rgba('graphite', 0.8) });

    // the dot runs the straight fast, then carries the swerve and brakes into the crater
    const pre = ease.inOutQuad(clamp((wt - 81.28) / 0.78));
    const post = ease.inOutCubic(clamp((wt - 82.05) / 2.15));
    const dotF = 0.44 * pre + 0.56 * post;
    const crater = clamp((wt - 82.95) / 0.95);

    // where the road ends: the swerve's far endpoint, which the destination hangs off
    const C = v2(980, 780), th = -Math.PI / 2 * turnU;
    const B = v2(C.x + Math.cos(th) * SEG2, C.y + Math.sin(th) * SEG2);

    // the map resolves as the camera cranes out: the contours are the mask
    const terr = clamp((wt - 83.0) / 1.2);
    const M = terr > 0.01 ? maskTerrain(s, B.x, B.y, terr, 0) : null;

    // THE WHIP. The roadmap is re-drawn behind itself, each copy further along the pan and looser,
    // then the real one lands on top. Three extra drawings is enough to read as a smear.
    const N = 3;
    for (let k = N; k >= 1; k--) {
      const kk = k / N;
      const off = 130 * kk * whipE;
      const al = 0.5 * (1 - 0.55 * kk) * whipE;
      if (al < 0.03) continue;
      roadPass(s, turnU, {
        ox: Math.cos(0.92) * off, oy: Math.sin(0.92) * off,
        amp: 1 + 2.6 * kk, color: rgba('ink', al),
        dot: false, dotF, crater: 0,
      });
    }
    roadPass(s, turnU, { ox: 0, oy: 0, amp: 1, color: rgba('ink'), dot: true, dotF, crater });

    if (M) {
      // the map's own lettering: YOU / ARE stamped either side of the face, and the callout for the
      // object nobody put on the roadmap
      if (wt > 83.6) {
        s.letter('YOU', M.x - 430, M.y - 40, 54, 1350, { font: 'tech', align: 'center', color: rgba('ink', 0.85), tracking: 6 });
        s.letter('ARE', M.x + 430, M.y - 40, 54, 1352, { font: 'tech', align: 'center', color: rgba('ink', 0.85), tracking: 6 });
      }
      if (wt > 83.5) {
        const ca = clamp((wt - 83.5) / 0.22);
        s.rect(1350, 640, 1740, 730, 1360, { w: 2.6, color: rgba('ink', 0.8), overshoot: 5 });
        s.letter('UNPLANNED OBJECT', 1370, 686, 30, 1361, { font: 'tech', color: rgba('signal', 0.75 + 0.25 * ca) });
        s.letter('not on roadmap', 1370, 722, 22, 1362, { font: 'tech', color: rgba('graphite', 0.95) });
        s.stroke([v2(1346, 668), v2(B.x + 96, B.y + 128)], 1363, { w: 1.8, color: rgba('ink', 0.6), amp: 2.0 });
      }
      // the marker, dropped on the kick and squashing into the crater
      const md = (wt - this.mkDrop) / 0.32;
      if (md > 0) {
        const f0 = clamp(md);
        const y = B.y - (1 - ease.inQuart(f0)) * 460;
        marker(s, B.x, y, clamp(f0 >= 1 ? 1 - 0.38 * Math.max(0, 1 - (md - 1) * 5) : 1, 0.62, 1));
      }
    }

    return 0.05 * whipE;
  }

  private schedule(s: Sheet, wt: number) {
    // the camera punches on the syllable the plate stalls on, and keeps a nervous throb while the
    // schedule waits for a review that never happens (both on the drawing clock)
    const hit = Math.max(0, 1 - (wt - 86.43) * 6);
    const wait = clamp((wt - 86.5) / 0.8) * (1 - clamp((wt - 87.3) / 0.25));
    const throb = wait > 0 ? Math.max(0, Math.sin(wt * TAU * 1.5)) * wait : 0;
    this.setCam(s, 960, 560, 1 + 0.05 * hit + 0.022 * throb, 0.005 * throb);
    // the empty slot blinks at about 2 Hz — a blink, not the ~15 Hz strobe it was
    const blink = Math.floor(wt * 2) % 2 === 0;

    s.rect(200, 300, 1740, 875, 60, { w: 3.0, color: rgba('ink', 0.75), overshoot: 6 });
    s.text('SCHEDULE — REV C', 216, 288, { size: 20, fam: 'Plex-400', color: rgba('graphite', 0.95) });
    for (let i = 0; i <= 6; i++) {
      const x = lerp(320, 1660, i / 6);
      s.stroke([v2(x, 300), v2(x, 330)], 70 + i, { w: 2.0, color: rgba('graphite', 0.65) });
      s.text(`W${i + 1}`, x, 356, { size: 15, fam: 'Plex-400', color: rgba('graphite', 0.65), align: 'center' });
    }

    // the strip the playhead runs: SRR and PDR were held, CDR never was, TRR was skipped and LAUNCH
    // went off early. The bars are drawn in by the pen on the drawing clock, like everything else.
    const rows: { lab: string; y: number; x0: number; x1: number; p: number; kind: 'bar' | 'empty' | 'skipped' | 'ahead' }[] = [
      { lab: 'SRR', y: 452, x0: 340, x1: 780, p: prog(wt, 85.15, 85.75), kind: 'bar' },
      { lab: 'PDR', y: 548, x0: 620, x1: 1180, p: prog(wt, 85.35, 86.2), kind: 'bar' },
      { lab: 'CDR', y: 644, x0: 900, x1: 1480, p: 0, kind: 'empty' },
      { lab: 'TRR', y: 740, x0: 1180, x1: 1560, p: 0, kind: 'skipped' },
      { lab: 'LAUNCH', y: 836, x0: 1400, x1: 1740, p: prog(wt, 87.35, 87.75), kind: 'ahead' },
    ];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const sd = 200 + i * 37;
      s.letter(r.lab, 300, r.y + 11, 30, sd, { font: 'tech', align: 'right', color: rgba('ink') });

      if (r.kind === 'bar') {
        s.rect(r.x0, r.y - 26, r.x1, r.y + 26, sd + 1, { w: 2.2, color: rgba('graphite', 0.8) });
        if (r.p > 0.01) {
          const xr = lerp(r.x0, r.x1, r.p);
          const box = [v2(r.x0, r.y - 26), v2(xr, r.y - 26), v2(xr, r.y + 26), v2(r.x0, r.y + 26)];
          s.fill(box, sd + 2, rgba('signal', 0.28));
          s.hatch(box, sd + 3, { spacing: 12, angle: -Math.PI / 3, color: rgba('ink', 0.5), w: 1.4 });
          s.stroke(box, sd + 4, { closed: true, w: 3.0, color: rgba('ink') });
          // the pen, still drawing the bar in
          if (r.p < 1) s.blob(xr, r.y, 9, sd + 5, { colour: rgba('signal'), jag: 0.14, n: 14, outline: { w: 2.2 } });
        }
      } else if (r.kind === 'empty') {
        // the slot that was never filled: a box that blinks, a question the sheet cannot answer, and
        // the status the review actually has
        if (blink) dashedRect(s, r.x0, r.y - 28, r.x1, r.y + 28, sd + 1, rgba('signal', 0.9), 2.6);
        else s.rect(r.x0, r.y - 28, r.x1, r.y + 28, sd + 1, { w: 1.3, color: rgba('graphite', 0.3) });
        s.letter('?', (r.x0 + r.x1) / 2, r.y + 18, 46, sd + 2, { font: 'readable', align: 'center', color: rgba('signal', blink ? 0.95 : 0.35) });
        s.letter('STATUS: NOT HELD', (r.x0 + r.x1) / 2, r.y - 40, 22, sd + 3, { font: 'tech', align: 'center', color: rgba('blood', 0.9) });
      } else if (r.kind === 'skipped') {
        // the review that was planned, then quietly not held
        dashedRect(s, r.x0, r.y - 26, r.x1, r.y + 26, sd + 1, rgba('graphite', 0.65), 2.2);
        s.letter('SKIPPED', (r.x0 + r.x1) / 2, r.y + 11, 30, sd + 2, { font: 'tech', align: 'center', color: rgba('blood', 0.9), rot: -0.03 });
      } else {
        // LAUNCH: the planned window, and the bar that arrives a week early
        dashedRect(s, r.x0, r.y - 26, r.x1, r.y + 26, sd + 1, rgba('graphite', 0.55), 2.2);
        if (r.p > 0.01) {
          const x0 = r.x0 - 220, x1 = r.x1 - 220, xr = lerp(x0, x1, r.p);
          const box = [v2(x0, r.y - 26), v2(xr, r.y - 26), v2(xr, r.y + 26), v2(x0, r.y + 26)];
          s.fill(box, sd + 2, rgba('signal', 0.28));
          s.hatch(box, sd + 3, { spacing: 12, angle: -Math.PI / 3, color: rgba('ink', 0.5), w: 1.4 });
          s.stroke(box, sd + 4, { closed: true, w: 3.0, color: rgba('ink') });
          if (r.p > 0.9) {
            s.letter('AHEAD OF SCHEDULE', (x0 + x1) / 2, r.y + 9, 22, sd + 6, { font: 'tech', align: 'center', color: rgba('signal', 0.95) });
          }
        }
      }
    }

    // the TODAY playhead (the spark): it runs the strip, stalls in the empty CDR slot, then zips past
    // TRR to LAUNCH. All three phases are read off the drawing clock, so the stall is a hold.
    const run = ease.inOutQuad(clamp((wt - 85.05) / 1.35));
    const zip = ease.outExpo(clamp((wt - 87.35) / 0.45));
    const px = lerp(320, 1140, run) + 330 * zip;
    const py = lerp(452, 644, run) + 192 * zip;
    s.stroke([v2(px, 316), v2(px, 864)], 310, { w: 1.6, color: rgba('signal', 0.4), amp: 2.0 });
    s.stroke([v2(px - 52, py), v2(px, py)], 311, { w: 2.0, color: rgba('signal', 0.45), amp: 2.0 });
    s.blob(px, py, 13, 300, { colour: rgba('signal'), jag: 0.12, n: 16, outline: { w: 2.6, color: rgba('ink') } });
  }

  /** Camera + a record of it, so the frame, the lyric and the slug can be pinned in screen space. */
  private setCam(s: Sheet, cx: number, cy: number, z: number, roll = 0) {
    this.cam = { cx, cy, z, roll };
    s.setCam(cx, cy, z, roll);
    return this.cam;
  }

  /** The production slug, pinned to the screen so no camera move can drag it out of the safe area. */
  private slug(s: Sheet, label: string) {
    const k = this.cam;
    const a = s.pin(96, 936), b = s.pin(W - 96, 936);
    s.text(label, a.x, a.y, { size: 19 / k.z, fam: 'Plex-400', color: rgba('graphite', 0.9), rot: -k.roll });
    s.text(`d${s.d}`, b.x, b.y, { size: 19 / k.z, fam: 'Plex-400', color: rgba('graphite', 0.55), rot: -k.roll, align: 'right' });
  }
}


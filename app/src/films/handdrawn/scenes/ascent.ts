// Plate — ASCENT (60.23 → 69.78). Four escalating drawings, each a full redraw with its own framing,
// so every cut reads as a new cel:
//
//   1. THE BASILISK (60.23–62.54) — rings, a vertically slit pupil and rows of scales; the lids snap
//      open on "boom" with a shake and a shedding of ink spatter.
//   2. NVDA TO THE MOON (62.54–64.10) — a hand-ruled stock chart whose line rises so steeply the
//      drawing tilts and the line runs off the top of the paper; the camera follows it up onto a moon.
//   3. THE OMEGA POINT (64.10–66.22) — every line in the drawing is redrawn as a curve that runs into
//      one white-hot dot, and the lyric shrinks into it.
//   4. ONE E THIRTY (66.22–69.78) — a hand-drawn mechanical odometer: 31 digit wheels, each a circle
//      with a hand-written digit, rolling over one another, settling on 1 followed by thirty zeros.
//
// The two rules hold throughout: every outline is re-drawn out of s.d so nothing is mechanically
// still, and every snap, hold and tick is quantised to the drawing clock (heldT) rather than to raw
// time, so no stroke smears across the export's motion-blur sub-frames. Raw t drives only slow camera
// moves and the lyric's own sung progress.
import {
  InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, TAU, heldT,
} from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Word } from '../../../engine/lyrics';
import { springStep } from '../../../engine/util';
import { strokeText, type StrokeFontName } from '../../../engine/stroke';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ hand-drawn primitives

/** A wobbly circle as points (the Sheet's blob is for solid discs). */
function ring(cx: number, cy: number, r: number, n = 40, rot = 0, jag = 0.02, seed = 0): V2[] {
  const p: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot;
    const rr = r * (1 + jag * noise1(i * 0.7 + seed, seed + 3));
    p.push(v2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return p;
}

/** One scale of the hide: a chevron that bulges away from the eye. */
function scaleChevron(cx: number, cy: number, r: number, a: number, wa: number, bulge: number): V2[] {
  const at = (rr: number, aa: number) => v2(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
  return [
    at(r - bulge, a - wa),
    at(r + bulge * 0.2, a - wa * 0.6),
    at(r + bulge * 0.62, a),
    at(r + bulge * 0.2, a + wa * 0.6),
    at(r - bulge, a + wa),
  ];
}

/** A slanted quad (rotated about its centre) as a point list. */
function quad(ox: number, oy: number, hw: number, hh: number, rot = 0): V2[] {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const at = (dx: number, dy: number) => v2(ox + dx * cs - dy * sn, oy + dx * sn + dy * cs);
  return [at(-hw, -hh), at(hw, -hh), at(hw, hh), at(-hw, hh)];
}

// ------------------------------------------------------------------ the plate

export default class Ascent extends InkedScene {
  private l1 = this.ctx.lyrics.get('I hear the basilisk boom');
  private l2 = this.ctx.lyrics.get('NVDA to the moon');
  private l3 = this.ctx.lyrics.get("The Omega Point's coming soon");
  private l4 = this.ctx.lyrics.get('One E thirty FLOPs a second');
  /** The camera we last handed the sheet — needed to build clips in the same sheet space. */
  private cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
  private cap = 28;

  override init() {
    // cap height of the odometer's digit font, so each wheel can be centred on it
    this.cap = strokeText('0', 'tech', 40).capHeight;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t;
    if (t < 62.54) return this.basilisk(s, t, f);
    if (t < 64.1) return this.moon(s, t, f);
    if (t < 66.22) return this.omega(s, t, f);
    return this.odometer(s, t, f);
  }

  // ------------------------------------------------------------------ 1. the basilisk

  private basilisk(s: Sheet, t: number, f: Frame): PostOverrides {
    const d = s.d;
    const td = heldT(t);
    const BOOM = 62.02;
    const since = td - BOOM;
    // the lids snap open ON THE DRAWING CLOCK: the whole opening is 4-5 drawings, so it reads as a
    // hard cut on "boom" and never smears in the export.
    const open = clamp(springStep(since, 3.4, 0.5), 0, 1.16);
    const ap = 0.03 + 0.97 * open;
    const shake = since <= 0 ? 0 : 32 * Math.pow(0.5, since / 0.048);
    const punch = since > 0 ? 0.055 * Math.max(0, 1 - since * 5.5) : 0;
    const push = ease.inOutCubic(prog(t, 60.4, 62.5));
    const cx = 960 + noise1(d * 1.7, 11) * shake;
    const cy = 460 + noise1(d * 2.3 + 5, 12) * shake;
    const zoom = lerp(0.88, 1.14, push) * (1 + punch);
    this.setCam(s, cx, cy, zoom, noise1(d * 1.3 + 2, 13) * shake * 0.0011);

    const EX = 960, EY = 430, R = 430;

    // ---- the hide: two rows of scales around the eye, each band hatched at its own angle
    // (closed/long outlines are stroked untapered: a loop has no lifted ends, and it costs a
    // quarter of the canvas work of the tapered path — the wobble still boils every drawing)
    const rows: [number, number][] = [[R + 46, R + 240], [R + 240, R + 520]];
    for (let k = 0; k < rows.length; k++) {
      const [r0, r1] = rows[k]!;
      const seed = 220 + k * 31;
      s.hatch(
        [...ring(EX, EY, r1, 44, 0, 0.014, k + 1), ...ring(EX, EY, r0, 44, 0, 0.014, k + 1).reverse()],
        seed,
        { spacing: 30 + k * 6, angle: k % 2 === 0 ? -0.38 : 1.16, color: rgba(k % 2 === 0 ? 'ink' : 'graphite', 0.36), w: 1.3 },
      );
      const rm = (r0 + r1) * 0.5;
      const step = k === 0 ? 152 : 132;
      const n = Math.max(10, Math.round((TAU * rm) / step));
      const wa = (step / rm) * 0.6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + k * 0.11 + noise1(i * 1.3 + k * 7, 3) * 0.03;
        const excite = since > 0 && since < 0.5 && hash(i, k + 40) < 0.16;
        const col = excite ? rgba('signal', 0.85) : rgba('ink', k === 0 ? 0.88 : 0.7);
        if (k === 0) {
          // the hero row: a chevron scale, drawn like a pen (tapered at both ends)
          s.stroke(scaleChevron(EX, EY, rm, a, wa, (r1 - r0) * 0.34), seed + i, { w: 2.3, color: col, amp: 1.5, freq: 3.2 });
        } else {
          // an overlapping arc reads as the same row of scales for a quarter of the work
          const pts: V2[] = [];
          for (let j = 0; j <= 4; j++) {
            const aa = a + lerp(-wa, wa, j / 4);
            const rr = rm + (r1 - r0) * 0.3 * Math.cos((j / 4 - 0.5) * Math.PI);
            pts.push(v2(EX + Math.cos(aa) * rr, EY + Math.sin(aa) * rr));
          }
          s.stroke(pts, seed + i, { w: 2.2, color: col, amp: 1.4, freq: 3.2, taper: false });
        }
      }
    }

    // ---- the eye: an ink rim, concentric iris rings, two hatched toned bands
    s.stroke(ring(EX, EY, R, 60, 0, 0.012, 1), 300, { closed: true, taper: false, w: 5.6, amp: 3.4 });
    s.stroke(ring(EX, EY, R - 30, 60, 0, 0.012, 2), 302, { closed: true, taper: false, w: 2.4, color: rgba('ink', 0.72), amp: 3.0 });
    const irisR = [356, 292, 232, 176, 120];
    for (let i = 0; i < irisR.length; i++) {
      s.stroke(ring(EX, EY, irisR[i]!, 48, i * 0.05, 0.017, 10 + i), 320 + i, {
        closed: true,
        taper: false,
        w: 2.9 - i * 0.3,
        color: rgba(i % 3 === 0 ? 'ink' : 'graphite', 0.92),
        amp: 2.2,
      });
    }
    s.hatch([...ring(EX, EY, 356, 40, 0, 0.012, 11), ...ring(EX, EY, 292, 40, 0, 0.012, 11).reverse()], 360, {
      spacing: 22, angle: -0.5, color: rgba('cool', 0.5), w: 1.2,
    });
    s.hatch([...ring(EX, EY, 232, 34, 0, 0.012, 12), ...ring(EX, EY, 176, 34, 0, 0.012, 12).reverse()], 362, {
      spacing: 19, angle: 1.2, color: rgba('signal', 0.32), w: 1.2,
    });

    // ---- the vertically slit pupil (it flares flat signal for two drawings on the snap)
    const slitH = 152, slitW = 23;
    const slit: V2[] = [
      v2(EX, EY - slitH), v2(EX + slitW, EY - slitH * 0.42), v2(EX + slitW * 0.9, EY),
      v2(EX + slitW, EY + slitH * 0.42), v2(EX, EY + slitH), v2(EX - slitW, EY + slitH * 0.42),
      v2(EX - slitW * 0.9, EY), v2(EX - slitW, EY - slitH * 0.42),
    ];
    const flare = since > 0 && since < 0.1;
    s.fill(slit, 380, flare ? rgba('signal') : rgba('ink'), { amp: 1.5 });
    s.stroke(slit, 381, { closed: true, w: 3.0, amp: 1.7 });
    // a single pale glint, kept graphic — no glow anywhere in this film
    s.fill([v2(EX - 12, EY - slitH * 0.6), v2(EX - 3, EY - slitH * 0.3), v2(EX - 4, EY + slitH * 0.16), v2(EX - 13, EY - slitH * 0.1)], 382, rgba('paper', 0.55), { amp: 1.2 });

    // ---- the lids: two bands that hug the eyeball and retract as it opens
    const gap = R * 0.99 * ap;
    const upY = EY - gap, loY = EY + gap;
    const bowAmp = 34 * clamp(ap * 1.6);
    const bow = (y: number, dir: number): V2[] => {
      const p: V2[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        p.push(v2(lerp(-140, W + 140, u), y + Math.cos((u - 0.5) * Math.PI) * bowAmp * dir));
      }
      return p;
    };
    const lidBand = (y: number, thick: number, dir: number): V2[] => [...bow(y, dir), ...bow(y - thick * dir, dir).reverse()];
    const up = lidBand(upY, 300, 1);
    s.fill(up, 400, rgba('paper2', 0.97), { amp: 2.6 });
    s.stroke(bow(upY, 1), 401, { w: 5.0, amp: 3.2, overshoot: 8, taper: false });
    const lo = lidBand(loY, 320, -1);
    s.fill(lo, 410, rgba('shade', 0.5), { amp: 2.6 });
    s.stroke(bow(loY, -1), 411, { w: 4.4, amp: 3.2, overshoot: 8, taper: false });
    if (ap < 0.45) {
      // the eye is shut: one heavy seam, wider the tighter the lids are
      s.stroke(bow(EY, 1), 420, { w: 7.5 * (1 - ap * 2.2), color: rgba('ink', 0.95), amp: 2.4, overshoot: 10, taper: false });
    }

    // ---- the snap: ink spatter shed outward from the rim
    if (since > 0 && since < 0.6) {
      const age = since / 0.6;
      for (let i = 0; i < 20; i++) {
        const a = hash(i, 3) * TAU;
        const r0 = R + 10 + age * (420 + hash(i, 7) * 780);
        const len = (26 + hash(i, 11) * 96) * (1 - age);
        if (len < 4) continue;
        s.stroke([v2(EX + Math.cos(a) * r0, EY + Math.sin(a) * r0), v2(EX + Math.cos(a) * (r0 + len), EY + Math.sin(a) * (r0 + len))], 460 + i, {
          w: 2.4 * (1 - age) + 0.8,
          color: rgba(i % 2 ? 'ink' : 'signal', 0.9 * (1 - age)),
          amp: 1.6,
        });
      }
      s.stroke(ring(EX, EY, R + 30 + age * 300, 46, 0.2, 0.05, 30), 490, {
        closed: true, taper: false, w: 2.8 * (1 - age) + 0.5, color: rgba('ink', 0.7 * (1 - age)), amp: 3.4,
      });
    }

    // ---- the lyric, written stroke by stroke on a paper clearing over the iris
    this.line(s, this.l1.words, t, {
      x: 960, y: 652, size: 58, align: 'center', seedBase: 100, rule: true,
      band: { halfH: 50, pad: 44 },
    });

    // the word "boom" gets its own burst behind it
    if (since > 0 && since < 0.7) {
      const k = 1 - since / 0.7;
      const bx = 960 + 210, by = 618;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3;
        const r0 = 60 + (1 - k) * 130, r1 = r0 + 44 * k;
        s.stroke([v2(bx + Math.cos(a) * r0, by + Math.sin(a) * r0), v2(bx + Math.cos(a) * r1, by + Math.sin(a) * r1)], 520 + i, {
          w: 2.6 * k + 0.7, color: rgba('ink', 0.85 * k), amp: 1.8,
        });
      }
    }

    this.slug(s, '1 — BASILISK');
    return { flash: 0.05 * f.a.snare + (since > 0 && since < 0.1 ? 0.04 : 0), zoom: 1 + 0.005 * f.a.kick };
  }

  // ------------------------------------------------------------------ 2. NVDA to the moon

  private moon(s: Sheet, t: number, f: Frame): PostOverrides {
    const d = s.d;
    const tilt = ease.inOutCubic(prog(t, 62.88, 63.5));
    const up = ease.inOutCubic(prog(t, 63.42, 64.08));
    this.setCam(
      s,
      lerp(902, 1186, up),
      lerp(792, -236, up),
      lerp(0.92, 0.8, up),
      lerp(0.03, -0.2, tilt) + 0.028 * up + noise1(d * 0.5, 71) * 0.004,
    );

    // the chart's own sheet, ruled by hand; the line runs off its top edge
    s.rect(64, 48, W - 64, H - 48, 90, { w: 3.4, color: rgba('ink', 0.72), taper: false, amp: 3.0 });
    for (let i = 1; i <= 3; i++) {
      const y = 1010 - i * 165;
      s.stroke([v2(300, y), v2(1668, y)], 100 + i, { w: 1.3, color: rgba('graphite', 0.38), amp: 2.6, freq: 2.4, taper: false });
    }
    // axes and ticks
    s.stroke([v2(300, 1026), v2(300, 486)], 110, { w: 3.6, amp: 2.8, taper: false });
    s.stroke([v2(292, 1026), v2(1668, 1026)], 111, { w: 3.6, amp: 2.8, taper: false });
    for (let i = 0; i <= 12; i++) {
      const x = 300 + i * 114;
      s.stroke([v2(x, 1026), v2(x, 1010)], 120 + i, { w: 2.0, color: rgba('graphite', 0.75), amp: 1.6, taper: false });
    }
    for (let i = 0; i <= 5; i++) {
      const y = 1026 - i * 130;
      s.stroke([v2(300, y), v2(316, y)], 140 + i, { w: 2.0, color: rgba('graphite', 0.75), amp: 1.6, taper: false });
    }
    s.letter('NVDA', 336, 466, 40, 150, { font: 'tech', color: rgba('ink', 0.9) });
    s.letter('P/FLOP', 300, 1066, 22, 152, { font: 'tech', color: rgba('graphite', 0.9) });

    // candlesticks: hatched bodies, wicks above and below, boiling like everything else
    const NC = 13;
    for (let i = 0; i < NC; i++) {
      const x = 356 + i * 76;
      const rise = ease.inQuad(i / (NC - 1));
      const yT = 984 - 348 * rise + noise1(i * 2.3, 5) * 24;
      const h = 26 + hash(i, 9) * 26;
      const rising = hash(i, 13) > 0.3;
      const body = quad(x, yT + h / 2, 15, h / 2);
      s.fill(body, 520 + i, rgba('paper', 0.95), { amp: 1.8, inset: 1 });
      s.hatch(body, 522 + i, { spacing: 9, angle: rising ? -0.55 : 0.95, color: rgba(rising ? 'sage' : 'blood', 0.6), w: 1.2 });
      s.stroke(body, 521 + i, { closed: true, w: 2.4, amp: 1.9, taper: false });
      s.stroke([v2(x, yT - 30), v2(x, yT + 1)], 523 + i, { w: 1.9, amp: 1.4, taper: false });
      s.stroke([v2(x, yT + h - 1), v2(x, yT + h + 26)], 524 + i, { w: 1.9, amp: 1.4, taper: false });
    }

    // the line: flat enough, then a rocket; it crosses the sheet's top edge and keeps going
    const px: V2[] = [];
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      const x = lerp(338, 1392, u);
      const y = 986 - 140 * u - 1560 * Math.pow(Math.max(0, (u - 0.55) / 0.45), 2.4);
      px.push(v2(x, y + noise1(u * 9, 31) * 13));
    }
    px.push(v2(1352, -470));
    s.stroke(px, 560, { w: 5.0, color: rgba('ink'), amp: 2.0, freq: 2.0, overshoot: 4 });

    // the moon: a big wobbly circle with hatched craters
    const MX = 1360, MY = -520, MR = 206;
    const mp = ring(MX, MY, MR, 42, 0.3, 0.032, 5);
    s.fill(mp, 600, rgba('paper2', 0.92), { amp: 3.0 });
    s.stroke(mp, 601, { closed: true, w: 4.2, amp: 3.2, taper: false });
    s.stroke(ring(MX, MY, MR - 24, 38, 0.1, 0.03, 6), 602, { closed: true, w: 2.0, color: rgba('graphite', 0.65), amp: 2.6, taper: false });
    const craters: [number, number, number][] = [[-72, -54, 44], [40, 26, 56], [-14, 96, 30], [96, -78, 26], [-116, 52, 22]];
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i]!;
      const cp = ring(MX + c[0], MY + c[1], c[2], 22, i * 0.4, 0.07, 20 + i);
      s.hatch(cp, 610 + i, { spacing: 13, angle: i % 2 ? 0.7 : -0.5, color: rgba('ink', 0.42), w: 1.3 });
      s.stroke(cp, 614 + i, { closed: true, w: 2.2, color: rgba('ink', 0.85), amp: 2.2, taper: false });
    }
    s.letter('THE MOON', MX, MY + MR + 54, 30, 620, { font: 'tech', align: 'center', color: rgba('ink', 0.85) });
    // the landing: three short strokes where the line strikes the surface
    for (let i = 0; i < 3; i++) {
      const a = -2.2 + i * 0.5;
      s.stroke([v2(1352 + Math.cos(a) * 26, -470 + Math.sin(a) * 26), v2(1352 + Math.cos(a) * 70, -470 + Math.sin(a) * 70)], 630 + i, { w: 2.4, color: rgba('signal', 0.9), amp: 1.8 });
    }

    // the lyric: pinned level on the paper, so it stays legible while the chart tilts and the camera
    // follows the line up onto the moon
    this.caption(s, this.l2.words, t, 960, 918, 56, { seedBase: 130, rule: true });

    this.slug(s, '2 — NVDA');
    return { zoom: 1 + 0.006 * f.a.kick + 0.02 * up };
  }

  // ------------------------------------------------------------------ 3. the Omega Point

  private omega(s: Sheet, t: number, f: Frame): PostOverrides {
    const td = heldT(t);
    const P = v2(1146, 492);
    const push = ease.inOutCubic(prog(t, 64.14, 66.2));
    this.setCam(s, lerp(986, P.x, push * 0.55), lerp(546, P.y, push * 0.8), lerp(0.9, 1.24, push), lerp(0.02, -0.05, push));

    // every line in the drawing — chart lines, moon rings, scales — redrawn as a curve into the point
    const NL = 12;
    for (let i = 0; i < NL; i++) {
      const kind = i % 5;
      const a0 = (i / NL) * TAU + 0.35 + hash(i, 3) * 0.22;
      const r0 = 700 + hash(i, 7) * 540;
      const A = v2(P.x + Math.cos(a0) * r0, P.y + Math.sin(a0) * r0 * 0.84);
      const C = v2(
        lerp(A.x, P.x, 0.46) + (hash(i, 11) - 0.5) * 460,
        lerp(A.y, P.y, 0.46) + (hash(i, 17) - 0.5) * 300,
      );
      const N = 22;
      const curve: V2[] = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N, mu = 1 - u;
        curve.push(v2(mu * mu * A.x + 2 * mu * u * C.x + u * u * P.x, mu * mu * A.y + 2 * mu * u * C.y + u * u * P.y));
      }
      // the curve grows along the drawing clock (never raw t), like every other reveal in the film
      const tip = clamp(prog(td, 64.24 + i * 0.04, 65.8 + i * 0.022, ease.inOutQuad));
      const k = Math.max(2, Math.round(tip * N));
      s.stroke(curve.slice(0, k + 1), 700 + i * 5, { w: 2.7, color: rgba('ink', 0.82), amp: 2.4, taper: false });
      const at = curve[k]!;
      const prev = curve[Math.max(0, k - 1)]!;
      const ang = Math.atan2(at.y - prev.y, at.x - prev.x);
      const seed = 760 + i * 9;
      if (kind === 0) {
        // a candlestick body
        const body = quad(at.x, at.y, 13, 21, 0);
        s.hatch(body, seed, { spacing: 9, angle: -0.55, color: rgba('sage', 0.6), w: 1.2 });
        s.stroke(body, seed + 1, { closed: true, w: 2.2, amp: 1.8, taper: false });
      } else if (kind === 1) {
        // two rings of the moon
        s.arc(at.x, at.y, 26, ang - 2.2, ang + 2.0, seed, { w: 2.4, amp: 2.0, taper: false });
        s.arc(at.x, at.y, 36, ang - 2.6, ang + 2.4, seed + 1, { w: 1.6, color: rgba('graphite', 0.8), amp: 2.0, taper: false });
      } else if (kind === 2) {
        // an axis with a tick
        s.stroke([v2(at.x - Math.cos(ang) * 60, at.y - Math.sin(ang) * 60), v2(at.x, at.y)], seed, { w: 2.4, amp: 1.8, taper: false });
        s.stroke([v2(at.x, at.y), v2(at.x + Math.cos(ang + 1.4) * 18, at.y + Math.sin(ang + 1.4) * 18)], seed + 1, { w: 2.0, amp: 1.6, taper: false });
      } else if (kind === 3) {
        // a scale off the basilisk's hide
        s.stroke(scaleChevron(at.x, at.y, 26, ang, 0.75, 12), seed, { w: 2.4, amp: 1.6, taper: false });
      } else {
        // a numeral off the odometer
        s.letter(hash(i, 23) > 0.5 ? '7' : '3', at.x, at.y + 9, 30, seed, { font: 'tech', align: 'center', rot: ang + Math.PI / 2 });
      }
    }

    // the dot: bare paper, an ink ring, a flat ember fleck — white-hot, never glowing
    const warm = prog(t, 64.6, 66.1);
    s.fill(ring(P.x, P.y, 25 + 5 * (1 - push), 22, 0, 0.05, 40), 800, rgba('paper', 1), { amp: 1.5 });
    s.stroke(ring(P.x, P.y, 25 + 5 * (1 - push), 22, 0, 0.05, 41), 801, { closed: true, w: 3.4, amp: 1.8 });
    s.stroke(ring(P.x, P.y, 36, 26, 0.2, 0.06, 42), 802, { closed: true, w: 1.6, color: rgba('signal', 0.5 + 0.4 * warm), amp: 2.2 });
    s.blob(P.x, P.y, 8, 803, { colour: rgba('signal', 0.9), jag: 0.35, n: 12, outline: { w: 0 } });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.4;
      s.stroke([v2(P.x + Math.cos(a) * 42, P.y + Math.sin(a) * 42), v2(P.x + Math.cos(a) * (58 + 26 * warm), P.y + Math.sin(a) * (58 + 26 * warm))], 810 + i, {
        w: 2.2 * warm + 0.6, color: rgba(i % 2 ? 'ember' : 'signal', 0.85), amp: 1.6,
      });
    }

    // the line shrinks into the dot as it is sung, and goes out with it
    const sh = ease.inOutCubic(prog(t, 65.15, 66.2));
    this.line(s, this.l3.words, t, {
      x: 960, y: 884, size: 56, align: 'center', seedBase: 160,
      place: (_i, x, size) => ({
        x: lerp(x, P.x, sh),
        y: lerp(884, P.y, sh),
        size: lerp(size, 5, sh),
        rot: sh * 0.5 * (x < 960 ? -1 : 1),
      }),
    });

    // the last beat throws one expanding ring off the dot
    const ex = prog(t, 65.9, 66.2, ease.outQuad);
    if (ex > 0.01) {
      s.stroke(ring(P.x, P.y, 30 + ex * 620, 52, 0, 0.05, 44), 830, { closed: true, w: 3.4 - ex * 2.2, color: rgba('ink', 0.75 * (1 - ex)), amp: 3.4 });
    }

    this.slug(s, '3 — OMEGA POINT');
    return { zoom: 1 + 0.02 * push + 0.006 * f.a.kick, flash: 0.05 * f.a.snare };
  }

  // ------------------------------------------------------------------ 4. one E thirty

  private odometer(s: Sheet, t: number, f: Frame): PostOverrides {
    const td = heldT(t);
    const push = ease.inOutCubic(prog(t, 68.45, 69.7));
    this.setCam(s, lerp(960, 236, push), lerp(652, 646, push), lerp(0.96, 1.92, push), 0.006 * (1 - push));

    const N = 31, X0 = 118, DX = 56, WY = 640, R = 27;
    const wheel = (i: number) => X0 + i * DX;

    // ---- the housing: two ruled rails and the separators between the windows
    s.stroke([v2(X0 - 34, WY - 34), v2(wheel(N - 1) + 34, WY - 34)], 900, { w: 4.0, amp: 2.6, taper: false });
    s.stroke([v2(X0 - 34, WY + 34), v2(wheel(N - 1) + 34, WY + 34)], 901, { w: 4.0, amp: 2.6, taper: false });
    s.stroke([v2(X0 - 34, WY - 34), v2(X0 - 34, WY + 34)], 902, { w: 3.4, amp: 2.0, taper: false });
    s.stroke([v2(wheel(N - 1) + 34, WY - 34), v2(wheel(N - 1) + 34, WY + 34)], 903, { w: 3.4, amp: 2.0, taper: false });
    for (let i = 1; i < N; i++) {
      if (i % 5 !== 0) continue;
      const x = (wheel(i - 1) + wheel(i)) / 2;
      s.stroke([v2(x, WY - 33), v2(x, WY + 33)], 910 + i, { w: 1.8, color: rgba('graphite', 0.7), amp: 1.6, taper: false });
    }
    s.letter('HAND-DRAWN ODOMETER', 130, 566, 26, 950, { font: 'tech', color: rgba('ink', 0.85) });

    // ---- 31 digit wheels, each rolling on the drawing clock (never on raw t)
    for (let i = 0; i < N; i++) {
      const x = wheel(i);
      // the wheel train: the least significant drum spins most and settles last. The clock is anchored
      // to THIS movement's own window — the plate only cuts here at 66.22 — so the train is still
      // rolling when it arrives and the settle on 1-followed-by-thirty-zeros is actually seen, instead
      // of the leading drum arriving already 87% rolled.
      const t0 = 66.3 + i * 0.03;
      const settle = 68.1 + i * 0.024;
      const q = clamp((td - t0) / (settle - t0));
      const roll = (1 - ease.outCubic(q)) * (3 + i * 1.5);
      const fr = roll - Math.floor(roll);
      const dig = i === 0 ? 1 : 0;
      const hot = i === 0 && push > 0.35;

      s.blob(x, WY, R, 400 + i * 3, { colour: rgba('paper', 0.97), jag: 0.035, n: 20, outline: { w: 2.3, color: rgba('ink', 0.92), taper: false } });
      s.stroke(ring(x, WY, R * 0.74, 16, 0, 0.04, 30 + i), 430 + i, { closed: true, w: 1.2, color: rgba('graphite', 0.45), amp: 1.2, taper: false });
      // rim ticks that turn with the drum
      for (let k = 0; k < 3; k++) {
        const a = fr * TAU + (k / 3) * TAU;
        s.stroke(
          [v2(x + Math.cos(a) * R * 0.8, WY + Math.sin(a) * R * 0.8), v2(x + Math.cos(a) * R * 0.98, WY + Math.sin(a) * R * 0.98)],
          460 + i * 4 + k,
          { w: 1.7, color: rgba('graphite', 0.8), amp: 1.0, taper: false },
        );
      }
      // the digits themselves, clipped to the drum so they roll out of sight
      const c = s.c;
      c.save();
      this.applyCam(c);
      c.beginPath();
      c.arc(x, WY, R - 1.6, 0, TAU);
      c.clip();
      const hh = this.cap * 1.22;
      const col = hot ? rgba('signal') : rgba('ink');
      s.letter(String(dig), x, WY + this.cap / 2 + fr * hh, 40, 470 + i * 2, {
        font: 'tech', align: 'center', color: col, w: 2.4, amp: 0.9,
      });
      // the incoming digit is only drawn while the drum is actually between two of them
      if (fr > 0.04 && fr < 0.96) {
        s.letter(String((dig + 1) % 10), x, WY + this.cap / 2 - (1 - fr) * hh, 40, 471 + i * 2, {
          font: 'tech', align: 'center', color: rgba('ink', 0.5), w: 2.0, amp: 0.9,
        });
      }
      c.restore();
    }

    // ---- the payoff: the leading 1, ringed, with its exponent written under it
    if (push > 0.2) {
      const a = clamp(prog(t, 68.7, 69.3));
      s.stroke(ring(wheel(0), WY, R + 26 + 6 * (1 - a), 30, 0.3, 0.05, 88), 980, {
        closed: true, taper: false, w: 3.0, color: rgba('signal', 0.6 + 0.35 * a), amp: 2.4,
      });
      s.stroke([v2(wheel(0) + 12, WY + R + 34), v2(wheel(0) + 46, WY + R + 62)], 981, { w: 2.0, color: rgba('ink', 0.8), amp: 1.6 });
      s.letter('x 10', wheel(0) + 50, WY + R + 74, 30, 982, { font: 'tech', color: rgba('ink', 0.9) });
      s.letter('30', wheel(0) + 116, WY + R + 56, 20, 983, { font: 'tech', color: rgba('ink', 0.9) });
      s.letter('.', wheel(0) + 136, WY + R + 74, 30, 984, { font: 'tech', color: rgba('ink', 0.9) });
    }

    // ---- the little "a second" dial, its hand stepping on the drawing clock
    const DX0 = 430, DY0 = 812, DR = 58;
    s.blob(DX0, DY0, DR, 990, { colour: rgba('paper', 0.9), jag: 0.03, n: 24, outline: { w: 3.0, taper: false } });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      s.stroke(
        [v2(DX0 + Math.cos(a) * (DR - 10), DY0 + Math.sin(a) * (DR - 10)), v2(DX0 + Math.cos(a) * (DR + 4), DY0 + Math.sin(a) * (DR + 4))],
        995 + i,
        { w: i % 3 === 0 ? 2.6 : 1.6, color: rgba('graphite', 0.85), amp: 1.2, taper: false },
      );
    }
    const na = ((td % 1) + 1) % 1 * TAU - Math.PI / 2;
    s.stroke([v2(DX0, DY0), v2(DX0 + Math.cos(na) * (DR - 14), DY0 + Math.sin(na) * (DR - 14))], 1010, { w: 3.2, color: rgba('signal'), amp: 1.4, taper: false });
    s.stroke(ring(DX0, DY0, 5, 12, 0, 0.06, 1011), 1012, { closed: true, w: 2.4, amp: 1.2, taper: false });
    s.letter('FLOPs / s', DX0 + DR + 26, DY0 + 12, 32, 1013, { font: 'tech', color: rgba('ink', 0.9) });

    // ---- the lyric, pinned flat on the paper while the drawing is pushed into. It sits high enough
    // (and far enough left) that neither the words nor the karaoke rule under them reach the
    // bottom-right HUD band: at y 910 the rule runs at 933 and the line's right end at x ~1300, both
    // clear of the band's x >= 1220, y >= 940.
    this.caption(s, this.l4.words, t, 900, 910, 56, { seedBase: 190, rule: true });

    this.slug(s, '4 — 1e30');
    return { zoom: 1 + 0.012 * push + 0.005 * f.a.kick, grain: 0.03 };
  }

  // ------------------------------------------------------------------ shared

  /** Camera + a record of it, so clips and pins can be built in the same sheet space. */
  private setCam(s: Sheet, cx: number, cy: number, z: number, roll = 0) {
    this.cam = { cx, cy, z, roll };
    s.setCam(cx, cy, z, roll);
    return this.cam;
  }

  /** The camera transform, applied by hand (Sheet keeps its own; this is for clip paths). */
  private applyCam(c: CanvasRenderingContext2D) {
    const k = this.cam;
    c.setTransform(k.z, 0, 0, k.z, W / 2, H / 2);
    c.translate(-k.cx, -k.cy);
    c.rotate(k.roll);
  }

  /**
   * Write one lyric line word by word, in sung order: a ghost of the word first, then the live one
   * drawn stroke by stroke. `place` lets a cut re-position and resize every word (the Omega Point
   * shrinks the line into its dot); `band` clears a patch of paper behind it so it stays legible
   * over whatever the drawing is doing.
   */
  private line(
    s: Sheet, words: Word[], t: number,
    o: {
      x: number; y: number; size: number;
      align?: 'center' | 'left';
      font?: StrokeFontName;
      rot?: number;
      gapF?: number;
      seedBase?: number;
      rule?: boolean;
      band?: { halfH: number; pad?: number };
      place?: (i: number, x: number, size: number) => { x: number; y: number; size: number; rot: number };
    },
  ) {
    const fam = o.font ?? 'readable';
    const gap = (o.gapF ?? 0.3) * o.size;
    const widths = words.map((w) => s.measureLetter(w.w, fam, o.size));
    const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, words.length - 1);
    const x0 = o.x - (o.align === 'center' ? total / 2 : 0);
    const seedBase = o.seedBase ?? 100;

    if (o.band) {
      const rot = o.rot ?? 0;
      const hw = total / 2 + (o.band.pad ?? 40);
      const hh = o.band.halfH;
      const cy = o.y - o.size * 0.3;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const at = (dx: number, dy: number) => v2(o.x + dx * cs - dy * sn, cy + dx * sn + dy * cs);
      const pts = [at(-hw, -hh), at(hw, -hh), at(hw, hh), at(-hw, hh)];
      s.fill(pts, 700, rgba('paper', 0.95), { amp: 3.0 });
      s.stroke(pts, 701, { closed: true, w: 2.0, color: rgba('graphite', 0.5), amp: 3.0, overshoot: 5 });
    }

    let dx = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      const at = o.place
        ? o.place(i, x0 + dx, o.size)
        : { x: x0 + dx, y: o.y, size: o.size, rot: o.rot ?? 0 };
      const seed = seedBase + i * 3;
      const weight = Math.max(1.4, at.size * 0.09);
      if (p < 1) s.letterWritten(w.w, at.x, at.y, at.size, seed, 1, { font: fam, rot: at.rot, ghost: true });
      s.letterWritten(w.w, at.x, at.y, at.size, seed, p, {
        font: fam, rot: at.rot, w: weight, color: p >= 1 ? rgba('ink') : rgba('signal'),
      });
      dx += widths[i]! + gap;
    }

    if (o.rule) {
      const l = this.curLine(words);
      const lineP = clamp(Lyrics.lineCharProgress(l, t) / Math.max(1, l.text.length));
      if (lineP > 0.02) {
        const rot = o.rot ?? 0;
        const y = o.y + 0.42 * o.size;
        const sx = o.x - total / 2 - 10;
        const len = (total + 20) * lineP;
        s.stroke([v2(sx, y), v2(sx + Math.cos(rot) * len, y + Math.sin(rot) * len)], 704, {
          w: 2.6, color: rgba('signal', 0.75), amp: 2.4, overshoot: 5,
        });
      }
    }
    return total;
  }

  /** A lyric line pinned to the screen (level, constant size) while the drawing moves under it. */
  private caption(s: Sheet, words: Word[], t: number, sx: number, sy: number, size: number, o: { seedBase?: number; rule?: boolean; band?: boolean } = {}) {
    const cam = this.cam;
    const p = s.pin(sx, sy);
    this.line(s, words, t, {
      x: p.x, y: p.y, size: size / cam.z, align: 'center', rot: -cam.roll,
      seedBase: o.seedBase ?? 100, rule: o.rule,
      band: o.band === false ? undefined : { halfH: (size / cam.z) * 0.86, pad: (size / cam.z) * 0.8 },
    });
  }

  /** One line of the lyric set, from any of its words (the loader gives lines and words together). */
  private curLine(words: Word[]) {
    return this.ctx.lyrics.lines[words[0]!.line]!;
  }

  /** The production slug, pinned to the sheet corner under any camera. */
  private slug(s: Sheet, label: string) {
    const cam = this.cam;
    const a = s.pin(96, 1006), b = s.pin(W - 118, 1006);
    s.text(label, a.x, a.y, { size: 19 / cam.z, fam: 'Plex-400', color: rgba('graphite', 0.9), rot: -cam.roll });
    s.text(`d${s.d}`, b.x, b.y, { size: 19 / cam.z, fam: 'Plex-400', color: rgba('graphite', 0.55), rot: -cam.roll });
  }
}

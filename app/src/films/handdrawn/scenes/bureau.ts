// Plate — BUREAU (69.78 → 81.14). The bureaucratic drawing: the whole plate is a form on paper.
//
//   "That was safe enough, we reckoned"  — hand-ruled boxes, dotted fill-in lines and checkboxes;
//        the lyric is written into field 1 as it is sung, and an orange rubber stamp slams down on
//        "reckoned": a wobbly rounded rectangle reading SAFE ENOUGH, orange spatter, and a shake.
//   "Forward MLP, backward, repeat"      — Attachment A: three columns of circles joined by straight
//        ruled arrows; a hand-drawn pulse runs left→right on "Forward", right→left on "backward",
//        and stutters three times on "repeat". "backward" is set MIRRORED (a true left-right flip)
//        with the pen crossing it right-to-left, which is what the word is doing in the song.
//   "Now von Neumann's obsolete"         — the form answers with Attachment B: a textbook von Neumann
//        machine (control, ALU, registers, memory, I/O, its bus) ruled in as "Now von Neumann's" is
//        sung, then struck through in orange on "obsolete"; the paper tears along a wobbling line and
//        the two halves fall away, leaving bare paper and the lyric.
//
// THE CAMERA HOLDS THE WHOLE FORM. All three fill-in rules are lyric, so all three baselines have to
// sit inside the title-safe area (and clear of the HUD bands) for the whole of their karaoke windows;
// the rules span 940 sheet px, which caps the zoom at 0.76. So the three framings are a slow crane
// across one document rather than the jumps the plate first had, and the drama is the stamp, the
// pulse, the strike and the tear.
//
// Every outline is re-drawn out of s.d (so the form boils like everything else in the film) and every
// slam, tick, strike and fall is quantised to the drawing clock, never to raw time.
import {
  InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, wobble, TAU, heldT,
} from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Word } from '../../../engine/lyrics';
import { polylineLengths, pointAtLength } from '../../../engine/util';
import { strokeText, type StrokeFontName } from '../../../engine/stroke';
import type { Frame, PostOverrides } from '../../../engine/scene';

// ------------------------------------------------------------------ hand-drawn primitives

/** A quad rotated about its centre, as a point list (hatch and rect only take points). */
function quad(ox: number, oy: number, hw: number, hh: number, rot = 0): V2[] {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const at = (dx: number, dy: number) => v2(ox + dx * cs - dy * sn, oy + dx * sn + dy * cs);
  return [at(-hw, -hh), at(hw, -hh), at(hw, hh), at(-hw, hh)];
}

/** A point offset from (ox,oy) by (dx,dy), rotated by `rot` — for text set inside a tilted stamp. */
function rotAt(ox: number, oy: number, dx: number, dy: number, rot: number): V2 {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return v2(ox + dx * cs - dy * sn, oy + dx * sn + dy * cs);
}

/** A circle as a wobbling point list. */
function ring(cx: number, cy: number, r: number, n = 26, rot = 0, jag = 0.04, seed = 0): V2[] {
  const p: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot;
    p.push(v2(cx + Math.cos(a) * r * (1 + jag * noise1(i * 0.9 + seed, seed + 3)), cy + Math.sin(a) * r * (1 + jag * noise1(i * 1.3 + seed, seed + 7))));
  }
  return p;
}

/** The first `p` of a polyline, so a stroke can be drawn by a pen that is still moving. */
function partial(pts: V2[], p: number): V2[] {
  if (p <= 0.001 || pts.length < 2) return [];
  if (p >= 0.999) return pts;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  let want = total * p;
  const out: V2[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= want) { out.push(b); want -= d; continue; }
    const u = d > 0 ? want / d : 0;
    out.push(v2(lerp(a.x, b.x, u), lerp(a.y, b.y, u)));
    break;
  }
  return out;
}

/** A "dotted" fill-in rule: short ruled dashes with hand-drawn gaps. */
function dots(x0: number, y: number, x1: number, seed: number, n = 22): V2[][] {
  const out: V2[][] = [];
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step;
    out.push([v2(a, y + noise1(i * 1.1 + seed, seed) * 2.6), v2(a + step * 0.66, y + noise1(i * 1.1 + seed + 1, seed) * 2.6)]);
  }
  return out;
}

// ------------------------------------------------------------------ the form's layout (sheet px)

const F = { x0: 120, y0: 60, x1: 1800, y1: 1360 };
const ATT = { x0: 200, y0: 430, x1: 1760, y1: 1010 };
const COLX = [560, 980, 1400];
const ROWY = [670, 770, 870];
const R1 = 278, R2 = 1098, R3 = 1218;   // the three fill-in rules, one per sung line
const SLAM = 71.45;                      // the stamp hits the paper here
const NV = 77.72;                        // "Now von Neumann's" starts: Attachment B replaces A
const TEAR_Y = 700;

export default class Bureau extends InkedScene {
  private l1 = this.ctx.lyrics.get('That was safe enough');
  private l2 = this.ctx.lyrics.get('Forward MLP');
  private l3 = this.ctx.lyrics.get("Now von Neumann's obsolete");
  private cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
  private cap = 28;

  override init() {
    this.cap = strokeText('0', 'tech', 40).capHeight;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, td = heldT(t);

    // ---- camera: one document, held in frame, craning back. The framings are all near z=0.76
    // because the three fill-in rules span 940 sheet px and every one of them has to stay inside the
    // title-safe area while it is being sung (see the plate notes): at z=0.76 the three baselines sit
    // at screen y ~190 / ~814 / ~905, so the drop from the second framing cannot lift field 1 into the
    // top margin, fields 2 and 3 stay clear of the bottom HUD bands (the bands start at y 940), and
    // even the masthead stays inside 96 px.
    const C1 = { cx: 958, cy: 726, z: 0.76, roll: 0.006 };
    const C2 = { cx: 962, cy: 731, z: 0.76, roll: -0.005 };
    const C3 = { cx: 960, cy: 737, z: 0.75, roll: 0.004 };
    const blend = (a: typeof C1, b: typeof C1, u: number) => ({
      cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: lerp(a.z, b.z, u), roll: lerp(a.roll, b.roll, u),
    });
    let k = t < 74.06 ? blend(C1, C2, prog(t, 73.5, 74.3)) : t < NV ? C2 : blend(C2, C3, prog(t, 77.2, 78.0));
    const since = td - SLAM;
    const quake = since < 0 ? 0 : 30 * Math.pow(0.5, since / 0.05);
    k = {
      cx: k.cx + noise1(s.d * 1.9, 11) * quake + noise1(td * 0.22, 5) * 6,
      cy: k.cy + noise1(s.d * 2.6 + 3, 12) * quake,
      z: k.z,
      roll: k.roll + noise1(s.d * 1.4 + 1, 13) * quake * 0.0009,
    };
    this.setCam(s, k.cx, k.cy, k.z, k.roll);

    // ---- the form itself: whole, or torn in two and falling
    const fall = clamp(prog(td, 80.78, 81.02, ease.inQuad));
    if (fall <= 0.002) {
      this.drawForm(s, t, td);
    } else {
      const tear = this.tearLine(s.d);
      const halves = [
        { dx: -120 * fall, dy: 1420 * fall, ro: -0.09 * fall, poly: [...tear, v2(W + 300, -600), v2(-300, -600)] },
        { dx: 190 * fall, dy: 1620 * fall, ro: 0.11 * fall, poly: [...tear.slice().reverse(), v2(-300, H + 900), v2(W + 300, H + 900)] },
      ];
      const c = s.c;
      for (const h of halves) {
        this.setCam(s, k.cx + h.dx, k.cy + h.dy, k.z, k.roll + h.ro);
        c.save();
        this.applyCam(c);
        c.beginPath();
        c.moveTo(h.poly[0]!.x, h.poly[0]!.y);
        for (let i = 1; i < h.poly.length; i++) c.lineTo(h.poly[i]!.x, h.poly[i]!.y);
        c.closePath();
        c.clip();
        this.drawForm(s, t, td);
        // the torn edge, inked, travels with its own half
        s.stroke(tear, 99, { w: 2.0, color: rgba('graphite', 0.55), amp: 1.6, freq: 3.4, taper: false });
        c.restore();
      }
      this.setCam(s, k.cx, k.cy, k.z, k.roll);   // back on the paper for the lyric
    }

    // ---- the lyric, written into the fields as it is sung (on the ruled lines, in the form's hand).
    // The camera holds all three rules, so the guards are only about not paying to write a line before
    // it is being sung. Each rule is inside the title-safe area for the whole of its own window.
    const fam = 'tech' as const;
    const size = 50;
    if (t > 77.4) this.line(s, this.l3.words, t, { x: 648, y: R3 - 12, size: this.fit(s, this.l3.words, fam, size, 1070), seedBase: 190, font: fam });
    // "backward" is the one word in the film set MIRRORED: the pass back through the network, and the
    // pen crosses it right-to-left, against the run of every other word on the form.
    if (t > 73.95) this.line(s, this.l2.words, t, {
      x: 648, y: R2 - 12, size: this.fit(s, this.l2.words, fam, size, 1070), seedBase: 160, font: fam,
      mirror: (i) => /^backward/i.test(this.l2.words[i]!.w),
    });
    this.line(s, this.l1.words, t, { x: 648, y: R1 - 12, size: this.fit(s, this.l1.words, fam, size, 1070), seedBase: 130, font: fam });

    this.slug(s, '5 — BUREAU');
    return {
      grain: 0.032,
      zoom: 1 + 0.02 * Math.max(0, 1 - since * 5) + 0.004 * f.a.kick,
      flash: 0.03 * f.a.snare,
    };
  }

  // ------------------------------------------------------------------ the form

  /** The whole drawing. Called once, or twice under two tear clips. */
  private drawForm(s: Sheet, t: number, td: number) {
    // the sheet, ruled by hand (long ruled outlines are stroked untapered: a ruled border has no
    // lifted pen ends, and it costs a quarter of the canvas work — the wobble still boils it)
    s.rect(F.x0, F.y0, F.x1, F.y1, 20, { w: 3.4, amp: 2.8, taper: false });

    // ---- header and the form number in the corner
    s.letter('BUREAU OF AUTOMATED SAFETY', 200, 148, 42, 30, { font: 'tech', color: rgba('ink') });
    s.letter('FORM B-3021', 1758, 148, 30, 32, { font: 'tech', align: 'right' });
    s.stroke([v2(F.x0 + 18, 210), v2(F.x1 - 18, 210)], 35, { w: 4.2, amp: 2.6, taper: false });

    // ---- three fill-in rules, one per sung line
    const field = (label: string, y: number, seed: number) => {
      s.letter(label, 210, y - 10, 26, seed, { font: 'tech', color: rgba('ink', 0.92) });
      for (const d of dots(624, y, 1748, seed, 18)) s.stroke(d, seed + 1, { w: 2.2, color: rgba('graphite', 0.85), amp: 1.5, taper: false });
    };
    field('1.  RECKONED:', 282, 40);
    field('2.  PASS:', 1102, 44);
    field('3.  STATUS:', 1222, 48);

    // ---- checkboxes, ticked by hand as the filing proceeds
    const boxes: [number, string, number][] = [
      [640, 'SAFE', 71.7], [1030, 'PERMITTED', 75.5], [1420, 'REVIEWED', 77.0],
    ];
    for (let i = 0; i < boxes.length; i++) {
      const [x, label, when] = boxes[i]!;
      s.rect(x, 328, x + 36, 364, 200 + i * 3, { w: 2.6, amp: 1.8, taper: false });
      s.letter(label, x + 52, 356, 22, 210 + i * 3, { font: 'tech', color: rgba('ink', 0.85) });
      const p = clamp(prog(td, when, when + 0.16, ease.outQuad));
      if (p > 0.01) {
        const tick = [v2(x + 7, 345), v2(x + 15, 357), v2(x + 30, 331)];
        const part = partial(tick, p);
        if (part.length >= 2) s.stroke(part, 220 + i * 3, { w: 3.4, amp: 1.6 });
      }
    }

    // ---- the attachments. Movement 2's line is about the MLP, and the form's Attachment A IS that
    // drawing: three columns of circles joined by straight ruled arrows. Movement 3's line is about
    // von Neumann, so the panel is redrawn as Attachment B — a textbook machine, which is what the
    // orange strike then crosses out. The cut between the two is the movement's own cut.
    if (t < NV) {
      s.rect(ATT.x0, ATT.y0, ATT.x1, ATT.y1, 60, { w: 2.6, color: rgba('ink', 0.82), amp: 2.6, taper: false });
      s.letter('ATTACHMENT A — MLP', 220, 470, 23, 62, { font: 'tech', color: rgba('ink', 0.9) });
      const heads = ['IN', 'HIDDEN', 'OUT'];
      for (let c = 0; c < 3; c++) s.letter(heads[c]!, COLX[c]! - 24, 630, 22, 64 + c, { font: 'tech', color: rgba('graphite', 0.95) });
      for (let c = 0; c < 2; c++) {
        for (let r = 0; r < 3; r++) {
          for (let r2 = 0; r2 < 3; r2++) {
            const a = v2(COLX[c]! + 33, ROWY[r]!), b = v2(COLX[c + 1]! - 36, ROWY[r2]!);
            const seed = 300 + c * 20 + r * 4 + r2;
            s.stroke([a, b], seed, { w: 1.7, color: rgba('ink', 0.5), amp: 1.6, taper: false });
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            s.stroke([v2(b.x, b.y), v2(b.x - Math.cos(ang - 0.4) * 16, b.y - Math.sin(ang - 0.4) * 16)], seed + 100, { w: 1.8, color: rgba('ink', 0.7), amp: 1.2 });
            s.stroke([v2(b.x, b.y), v2(b.x - Math.cos(ang + 0.4) * 16, b.y - Math.sin(ang + 0.4) * 16)], seed + 60, { w: 1.8, color: rgba('ink', 0.7), amp: 1.2 });
          }
        }
      }
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          s.blob(COLX[c]!, ROWY[r]!, 30, 400 + c * 3 + r, { colour: rgba('paper', 0.92), jag: 0.05, n: 18, outline: { w: 2.6, taper: false } });
        }
      }
    } else {
      // the same panel, answered with the machine: the pen rules it in on the drawing clock, so it is
      // complete before "obsolete" strikes through it
      s.rect(ATT.x0, ATT.y0, ATT.x1, ATT.y1, 60, { w: 2.6, color: rgba('ink', 0.82), amp: 2.6, taper: false });
      this.vonNeumann(s, clamp(prog(td, 77.85, 79.6, ease.outQuad)));
    }

    // ---- footer: the form's own small print
    s.stroke([v2(F.x0 + 18, 1264), v2(F.x1 - 18, 1264)], 51, { w: 1.8, color: rgba('graphite', 0.6), amp: 2.4, taper: false });

    // ---- the stamp, on its way down and then pressed onto the form
    const q = clamp((td - (SLAM - 0.18)) / 0.18);
    const impact = clamp(sinceStamp(td), 0, 1);
    const squash = td < SLAM ? 1 : 1 - 0.16 * (1 - impact);   // it flattens on contact, then comes back
    this.stamp(s, 1330, 492 - (1 - ease.inQuad(q)) * 1180, -0.115, 26, squash);
    if (impact < 1) {
      // the spatter the impression throws off, on the drawing clock and in the stamp's own orange
      const age = 1 - impact;
      for (let i = 0; i < 16; i++) {
        const a = hash(i, 5) * TAU;
        const r0 = 330 + age * (300 + hash(i, 9) * 520);
        const len = (12 + hash(i, 13) * 44) * age;
        if (len < 3) continue;
        s.stroke([v2(1330 + Math.cos(a) * r0, 492 + Math.sin(a) * r0 * 0.6), v2(1330 + Math.cos(a) * (r0 + len), 492 + Math.sin(a) * (r0 + len) * 0.6)], 900 + i, {
          w: 2.2 * age + 0.7, color: rgba('signal', 0.85 * age), amp: 1.6,
        });
      }
    }

    // ---- the pulse: forward, backward, then three stutters on "repeat" (Attachment A only)
    const u = t < NV ? this.pulseU(t) : -1;
    if (u >= 0) {
      const path: V2[] = [
        v2(COLX[0]!, ROWY[0]!), v2(COLX[0]!, ROWY[1]!), v2(COLX[0]!, ROWY[2]!),
        v2(COLX[1]!, ROWY[2]!), v2(COLX[1]!, ROWY[1]!), v2(COLX[1]!, ROWY[0]!),
        v2(COLX[2]!, ROWY[0]!), v2(COLX[2]!, ROWY[1]!), v2(COLX[2]!, ROWY[2]!),
      ];
      const L = polylineLengths(path);
      const total = L[L.length - 1]!;
      const at = pointAtLength(path, L, u * total);
      if (u > 0.02) {
        // the comet's tail, sampled back along the same path
        for (let i = 1; i <= 4; i++) {
          const b = pointAtLength(path, L, clamp(u * total - i * 30, 0, total));
          const a = pointAtLength(path, L, clamp(u * total - (i - 1) * 30 - 2, 0, total));
          s.stroke([v2(a.x, a.y), v2(b.x, b.y)], 1000 + i, { w: 4.2 - i * 0.7, color: rgba('signal', 0.5 - i * 0.1), amp: 1.2, taper: false });
        }
      }
      s.blob(at.x, at.y, 14, 1010, { colour: rgba('signal'), jag: 0.22, n: 14, outline: { w: 1.8 } });
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          if (Math.hypot(at.x - COLX[c]!, at.y - ROWY[r]!) < 44) {
            s.stroke(ring(COLX[c]!, ROWY[r]!, 44, 18, 0.2, 0.05, 1020 + c * 3 + r), 1050 + c * 3 + r, {
              closed: true, w: 2.2, color: rgba('signal', 0.85), amp: 2.0,
            });
          }
        }
      }
    }

    // ---- the strike-out: one diagonal stroke in ORANGE (the treatment's own colour for it), drawn by
    // a hand already moving. It runs on the drawing clock like every other reveal on the form, so its
    // 1550 px step from drawing to drawing instead of smearing 40 px across every shutter.
    const sp = clamp(prog(td, 80.02, 80.66, ease.inOutQuad));
    if (sp > 0.01) {
      const strike = [v2(250, 954), v2(700, 800), v2(1100, 640), v2(1400, 542), v2(1712, 450)];
      const part = partial(strike, sp);
      if (part.length >= 2) {
        s.stroke(part, 1100, { w: 10.5, color: rgba('signal', 0.95), amp: 2.6, overshoot: 9 });
        s.stroke(part, 1101, { w: 2.6, color: rgba('ember', 0.65), amp: 2.2, overshoot: 6 });
      }
    }
  }

  /**
   * The rubber stamp: a wobbly rounded rectangle with its words inside, rotated a few degrees. It
   * prints ORANGE, as the treatment asks — the plate inverts to bone paper and ink, and the stamp is
   * the one thing on the form that arrives in the film's colour.
   */
  private stamp(s: Sheet, cx: number, cy: number, rot: number, seed: number, squash: number) {
    const hw = 336, hh = 108 * squash;
    s.fill(quad(cx, cy, hw, hh, rot), seed, rgba('paper', 0.78), { amp: 3.4 });
    s.stroke(quad(cx, cy, hw, hh, rot), seed + 1, { closed: true, w: 5.2, color: rgba('signal', 0.95), amp: 3.4, overshoot: 8 });
    // worn rubber: two rubbed-out gaps in the border, and the words themselves
    for (let i = 0; i < 2; i++) {
      const a = i === 0 ? 0.35 : 3.5;
      const p = rotAt(cx, cy, Math.cos(a) * (hw - 4), Math.sin(a) * (hh - 4), rot);
      s.stroke([v2(p.x - 44, p.y), v2(p.x + 44, p.y)], seed + 10 + i, { w: 8, color: rgba('paper', 0.95), amp: 1.8 });
    }
    const size = 62, track = 8;
    const w = s.measureLetter('SAFE ENOUGH', 'tech', size, track);
    const at = rotAt(cx, cy, -w / 2, this.cap * 0.6, rot);
    s.letter('SAFE ENOUGH', at.x, at.y, size, seed + 20, {
      font: 'tech', color: rgba('signal', 0.92), tracking: track, rot, w: 4.6,
    });
  }

  /**
   * Movement 3's drawing: the form's answer to "Now von Neumann's obsolete" — a textbook von Neumann
   * machine, control, ALU and registers inside the CPU, memory on the right, I/O on the left, and the
   * system bus under them all. `p` is the pen's progress on the drawing clock, so the machine is ruled
   * in while the words are sung and is complete before "obsolete" strikes through it.
   */
  private vonNeumann(s: Sheet, p: number) {
    if (p <= 0.01) return;
    s.letter('ATTACHMENT B — VON NEUMANN', 220, 470, 23, 62, { font: 'tech', color: rgba('ink', 0.9) });

    // each unit is a ruled box the pen is still walking round; the paint lands when the outline closes
    const unit = (x0: number, y0: number, x1: number, y1: number, seed: number, at: number, label: string, ls: number) => {
      const q = clamp((p - at) / 0.14);
      if (q <= 0.01) return;
      const box = [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
      if (q > 0.9) s.fill(box, seed, rgba('paper', 0.94), { amp: 2.2 });
      s.stroke(partial([...box, v2(x0, y0)], q), seed + 1, { w: 2.4, amp: 2.2, taper: false });
      if (label && q > 0.55) {
        s.letter(label, (x0 + x1) / 2, (y0 + y1) / 2 + ls * 0.36, ls, seed + 2, { font: 'tech', align: 'center', color: rgba('ink', 0.9) });
      }
    };

    unit(240, 560, 420, 860, 1200, 0.00, 'I/O', 30);
    unit(520, 520, 1180, 880, 1204, 0.14, '', 24);              // the CPU's own frame
    unit(550, 555, 830, 700, 1208, 0.28, 'CONTROL', 26);
    unit(870, 555, 1150, 700, 1212, 0.42, 'ALU', 26);
    unit(550, 750, 1150, 830, 1216, 0.56, 'REGISTERS', 22);
    unit(1300, 560, 1720, 860, 1220, 0.70, '', 28);
    if (p > 0.86) {
      // memory: a hatched bank of cells, with its name lettered over the hatching
      s.hatch([v2(1300, 560), v2(1720, 560), v2(1720, 860), v2(1300, 860)], 1224, {
        spacing: 58, angle: -Math.PI / 2.4, color: rgba('graphite', 0.28), w: 1.1,
      });
      s.letter('MEMORY', 1510, 716, 28, 1225, { font: 'tech', align: 'center', color: rgba('ink', 0.9) });
    }

    // ---- the bus: three ruled lines under the machine, a double-headed stub into each unit
    const q = clamp((p - 0.84) / 0.14);
    if (q <= 0.01) return;
    for (let i = 0; i < 3; i++) {
      const y = 912 + i * 16;
      s.stroke([v2(240, y), v2(240 + 1480 * q, y)], 1230 + i, {
        w: i === 0 ? 3.0 : 1.6, color: rgba('ink', i === 0 ? 0.85 : 0.55), amp: 1.8, taper: false,
      });
    }
    if (q > 0.9) {
      s.letter('SYSTEM BUS', 250, 902, 20, 1240, { font: 'tech', color: rgba('ink', 0.8) });
      s.letter('DATA · ADDRESS · CONTROL', 1720, 902, 18, 1241, { font: 'tech', align: 'right', color: rgba('graphite', 0.95) });
    }
    if (q > 0.96) {
      const head = (x: number, y: number, dir: number, seed: number) =>
        s.stroke([v2(x - 9, y + 12 * dir), v2(x, y), v2(x + 9, y + 12 * dir)], seed, { w: 2.0, amp: 1.0 });
      const stubs: [number, number, number][] = [[330, 860, 1250], [850, 880, 1254], [1510, 860, 1258]];
      for (const st of stubs) {
        s.stroke([v2(st[0], st[1]), v2(st[0], 910)], st[2], { w: 2.2, amp: 1.3, taper: false });
        head(st[0], st[1] + 2, 1, st[2] + 1);       // up into the unit
        head(st[0], 908, -1, st[2] + 2);            // and down into the bus
      }
    }
  }

  /** Where the pulse is along the network at t: forward, back, then three stutters. */
  private pulseU(t: number) {
    if (t < 74.06) return -1;
    if (t < 74.9) return prog(t, 74.06, 74.9, ease.inOutQuad);
    if (t < 76.12) return 1;
    if (t < 76.72) return 1 - prog(t, 76.12, 76.72, ease.inOutQuad);
    if (t < 76.84) return 0;
    if (t < 77.68) {
      const c = (prog(t, 76.84, 77.68) * 3) % 1;
      return c < 0.5 ? c * 2 : 2 - 2 * c;
    }
    return 0;
  }

  /** The wobbling line the paper tears along — the same line for both halves, re-drawn each drawing. */
  private tearLine(d: number): V2[] {
    const p: V2[] = [];
    for (let x = -300; x <= W + 300; x += 120) {
      p.push(v2(x, TEAR_Y + noise1(x * 0.007 + d * 0.09, 21) * 44));
    }
    return p;
  }

  // ------------------------------------------------------------------ shared

  private setCam(s: Sheet, cx: number, cy: number, z: number, roll = 0) {
    this.cam = { cx, cy, z, roll };
    s.setCam(cx, cy, z, roll);
    return this.cam;
  }

  /** The camera transform, applied by hand, for building clip paths in the same sheet space. */
  private applyCam(c: CanvasRenderingContext2D) {
    const k = this.cam;
    c.setTransform(k.z, 0, 0, k.z, W / 2, H / 2);
    c.translate(-k.cx, -k.cy);
    c.rotate(k.roll);
  }

  /** A size that makes the line fit its field. */
  private fit(s: Sheet, words: Word[], font: StrokeFontName, size: number, maxW: number) {
    let w = 0;
    for (const x of words) w += s.measureLetter(x.w, font, size) + size * 0.3;
    w -= size * 0.3;
    return w > maxW ? size * (maxW / w) : size;
  }

  /**
   * One lyric line: a ghost of each word, then the word written stroke by stroke as it is sung.
   * `mirror` picks the words the form sets MIRRORED (the "backward" pass): they are flipped left to
   * right and the pen crosses them from their right edge.
   */
  private line(
    s: Sheet, words: Word[], t: number,
    o: { x: number; y: number; size: number; font?: StrokeFontName; seedBase?: number; mirror?: (i: number) => boolean },
  ) {
    const fam = o.font ?? 'tech';
    const gap = o.size * 0.3;
    let x = o.x;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      const seed = (o.seedBase ?? 100) + i * 3;
      const wd = s.measureLetter(w.w, fam, o.size);
      const weight = Math.max(1.4, o.size * 0.088);
      if (o.mirror?.(i)) {
        if (p < 1) this.mirrorWord(s, w.w, x + wd, o.y, o.size, seed, 1, { font: fam, ghost: true });
        this.mirrorWord(s, w.w, x + wd, o.y, o.size, seed, p, {
          font: fam, w: weight, color: p >= 1 ? rgba('ink') : rgba('signal'),
        });
      } else {
        if (p < 1) s.letterWritten(w.w, x, o.y, o.size, seed, 1, { font: fam, ghost: true });
        s.letterWritten(w.w, x, o.y, o.size, seed, p, {
          font: fam, w: weight, color: p >= 1 ? rgba('ink') : rgba('signal'),
        });
      }
      x += wd + gap;
    }
  }

  /**
   * One word set MIRRORED. `Sheet.letterWritten` can only rotate, so the flip is built here on the
   * same camera transform the Sheet uses (xRight is the word's right edge; the letters run back
   * leftwards from it, and the karaoke pen crosses the word in that same direction).
   */
  private mirrorWord(
    s: Sheet, text: string, xRight: number, y: number, size: number, seed: number, p: number,
    o: { font?: StrokeFontName; color?: string; w?: number; ghost?: boolean } = {},
  ) {
    const st = strokeText(text, o.font ?? 'tech', size, 0);
    const k = this.cam;
    const c = s.c;
    c.save();
    c.setTransform(k.z, 0, 0, k.z, W / 2, H / 2);
    c.translate(-k.cx, -k.cy);
    c.rotate(k.roll);
    c.translate(xRight, y);
    c.scale(-1, 1);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = o.color ?? rgba('ink');
    c.globalAlpha = o.ghost ? 0.16 : 1;
    const w0 = (o.w ?? size * 0.075) * (o.ghost ? 0.7 : 1);
    // characters, not arc length — a hand finishes a letter before it starts the next one
    const chars = Array.from(text);
    const done = clamp(p) * chars.length;
    const full = Math.floor(done), frac = done - full;
    for (let si = 0; si < st.strokes.length; si++) {
      const raw = st.strokes[si]!;
      const ci = st.charOf[si] ?? 0;
      const upto = o.ghost ? 1 : ci < full ? 1 : ci > full ? 0 : frac;
      if (upto <= 0.001) continue;
      const P = wobble(raw.map((q) => v2(q.x, q.y)), s.d + seed + raw.length, size * 0.012, 6.5);
      const cut = Math.max(1, Math.round(P.length * upto));
      const total = cut - 1;
      for (let i = 0; i < total; i++) {
        const u = total > 0 ? i / total : 0;
        const tip = !o.ghost && upto < 1 ? Math.min(1, (1 - u) * 5 + 0.25) : 1;
        c.lineWidth = Math.max(0.5, w0 * (0.5 + 0.5 * Math.sin(Math.PI * clamp(u, 0.02, 0.98)) ** 0.4) * tip);
        c.beginPath();
        c.moveTo(P[i]!.x, P[i]!.y);
        c.lineTo(P[i + 1]!.x, P[i + 1]!.y);
        c.stroke();
      }
      // the pen head itself, while the letter is still being written
      if (!o.ghost && upto < 1 && P.length > 1) {
        const a = P[Math.max(0, cut - 1)]!, b = P[Math.min(P.length - 1, cut)]!;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const pensz = w0 * 2.4;
        c.lineWidth = Math.max(1, pensz * 0.35);
        c.beginPath();
        c.moveTo(a.x - Math.sin(ang) * pensz, a.y + Math.cos(ang) * pensz);
        c.lineTo(a.x + Math.sin(ang) * pensz, a.y - Math.cos(ang) * pensz);
        c.stroke();
      }
    }
    c.restore();
    c.globalAlpha = 1;
  }

  /** The production slug, pinned to the sheet corner under any camera. */
  private slug(s: Sheet, label: string) {
    const k = this.cam;
    const a = s.pin(96, 1006), b = s.pin(W - 118, 1006);
    s.text(label, a.x, a.y, { size: 19 / k.z, fam: 'Plex-400', color: rgba('graphite', 0.9), rot: -k.roll });
    s.text(`d${s.d}`, b.x, b.y, { size: 19 / k.z, fam: 'Plex-400', color: rgba('graphite', 0.55), rot: -k.roll });
  }
}

/** 0 at the slam, 1 once the impression has settled (on the drawing clock). */
function sinceStamp(td: number) {
  return clamp((td - SLAM) / 0.12);
}

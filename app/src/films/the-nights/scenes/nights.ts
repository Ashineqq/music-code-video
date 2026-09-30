// Plate — `nights`, the album page. ONE module serves the film's two entries for this drawing
// (`ctx.params.n`), because they are the same page seen twice:
//
//   * `nights1` (40.05 → 59.10, n = 1) — the long one. The page comes up out of the night the chorus
//     left it in (a page turn, drawn as a fade, so the cut is not a jump). Three remembered snapshots
//     are laid down one per sung line: a kite, a doorway, and a third that is drawn and left EMPTY.
//     On "My father told me" — the drop, its four words stretched over eleven seconds and written one
//     at a time — the page tears along the HORIZON (the film's thread, drawn where `open` draws it) and
//     the night pours up and down through the slit. It eats the page from the tear outward: the snapshots
//     from the bottom up and the writing rules as it reaches them (each line turns to starlight where the
//     night has passed), the empty frame last of the three — then the page itself, leaving only the tear.
//
//   * `nights2` (116.24 → 123.39, n = 2) — the album page again, and it is the same page: the night took
//     it here and the chorus kept it, so this entry opens on night with no flash. The same three mounts
//     stand in the same three places; the third is now FULL — the father and the boy standing at the
//     same height. That is the film's turn, so nothing else happens: the hand makes the two of them
//     while the first line is sung, and then holds. On "These are the nights that never die" the third
//     frame's border is redrawn in `rose` and the line itself is lettered in it (one of the film's two);
//     the plate ends on the chorus's three windows of light, in the chorus's three positions.
//
// The page is furniture and is drawn as `open` draws it, so the book reads as one book; every word is
// written by the pen as it is sung (Lyrics.wordProgress); every wobble is seeded with the drawing index
// s.d; the tear and the flood are pure functions of f.t and s.d (no state, no history).
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, CEL } from './_ink';
import type { V2, InkOpts } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import type { StrokeFontName } from '../../../engine/stroke';
import { WINDOWS } from './chorus';

// ------------------------------------------------------------------ the album page (one layout, both entries)
/** The book's page edge — the same furniture as `open`, so every plate is the same book. */
const PAGE: [number, number, number, number] = [72, 62, 1848, 1018];
/** How far past the sheet a flat mass may run. It rolls off the canvas: the frame is the page's edge. */
const OUT = 60;
/** The film's horizon — the thread that runs through every plate — and the line this page tears along. */
const HZ = 520;
/** The thread's ends, exactly as `open` and `chorus` draw it. */
const HX0 = 210, HX1 = 1736;
/** The three writing rules, and where `open` rules them. */
const RULES = [720, 818, 916];
const RX0 = 238, RX1 = 1690;
/** The three remembered snapshots: one size, three places, the same in both entries. */
const MNT_W = 300, MNT_H = 150;
const MNT_X = [336, 810, 1310];
/** Their tops step upward, so the flood reaches them in order and the third is swallowed last. */
const MNT_Y = [356, 310, 264];
/** Pinned in by hand: no album photo sits square. */
const MNT_A = [-0.016, 0.013, -0.011];
/** The sung line's size, and the widest it may run (the pen never crosses the safe area). */
const SUNG = 56, MAX_W = 1250;
/** The film's two voices: the father's remembered words, and the chorus's own line. */
const FATHER: StrokeFontName = 'hscript';
const PLAIN: StrokeFontName = 'readable';

// ---- the page's furniture inks, shared with `open`/`chorus` (the same seeds, so it is the same page,
// and the same line — the frame is drawn edge by edge: one closed rect costs five times the wobble of
// its four sides, and the wobble is quadratic in the resampled point count).
const PAGE_DAY: InkOpts = { w: 2.6, color: rgba('ink', 0.5), amp: 1.6, overshoot: 9 };
const PAGE_NIGHT: InkOpts = { w: 2.8, color: rgba('paper', 0.78), amp: 1.6, overshoot: 9 };
const THIN_DAY: InkOpts = { w: 1, sketch: true, color: rgba('graphite', 0.4) };
const THIN_NIGHT: InkOpts = { w: 1, sketch: true, color: rgba('paper', 0.26) };
const THREAD_DAY: InkOpts = { w: 3.4, color: rgba('ink', 0.92), overshoot: 14 };
const THREAD_NIGHT: InkOpts = { w: 3.6, color: rgba('paper', 0.85), overshoot: 14 };
const RULE_DAY: InkOpts = { w: 1.6, sketch: true, color: rgba('graphite', 0.5), overshoot: 12 };
const RULE_NIGHT: InkOpts = { w: 1.8, sketch: true, color: rgba('paper', 0.32), overshoot: 12 };

/** A snapshot's frame: the ring of its border, and the map from its local (0,0)–(300,150) into the page. */
interface Mnt { ring: V2[]; map: (x: number, y: number) => V2 }

export default class Nights extends InkedScene {
  /** Which stage of the story this entry is: 1 = the empty frame, 2 = the frame full. */
  private readonly n = Number(this.ctx.params?.n ?? 1);
  private readonly A = this.ctx.audio;
  /** Line metrics, shaped once (they cannot change: see `measure`). */
  private readonly metrics = new Map<string, { size: number; gap: number; widths: number[] }>();
  /**
   * The lines this module serves, by occurrence (the same sentence is sung twice — the film's second
   * telling is the point of the pair, so the index is deliberate): three in `nights1`, two in `nights2`.
   */
  private readonly lines: Line[] = (() => {
    const k = this.n === 2 ? 1 : 0;
    const out = [
      this.ctx.lyrics.get('My father told me when I was just a child', k),
      this.ctx.lyrics.get('These are the nights that never die', k),
    ];
    // the long entry's third line is the stretched one (47.24 → 58.52): four words over eleven seconds.
    if (this.n === 1) out.push(this.ctx.lyrics.get('My father told me', 1));
    return out;
  })();

  draw(s: Sheet, f: Frame): PostOverrides {
    if (this.n === 2) this.albumFull(s, f); else this.albumTorn(s, f);
    // Flat cel throughout. `CEL.hot` is reserved for the lantern and the one or two moments that earn
    // it; the drop here is a flood, not a fire, so the plate stays flat and lets the page do the work.
    return CEL.flat;
  }

  // ---------------------------------------------------------------- entry 1: the album page, torn (40.05 → 59.10)
  private albumTorn(s: Sheet, f: Frame) {
    const t = f.t, d = s.d, A = this.A;
    const L1 = this.lines[0]!, L2 = this.lines[1]!, L3 = this.lines[2]!;
    const beatAfter = (x: number) => A.timeOfBeat(Math.ceil(A.beatAt(x)));

    // ---- the drop. The tear opens on the third line's downbeat; the night comes through after it.
    const tDrop = beatAfter(L3.start - 0.02);                        // 47.671 — the drop's own downbeat
    const ripP = clamp((t - tDrop) / 3.33);                          // the rip crosses the page in 7 beats
    const tFlood = A.downbeats.find((b) => b > tDrop + 3.3) ?? tDrop + 3.4;   // 51.481 — the next bar line
    // how far the night has come out of the fold: slow to start, and the whole page by the last beat
    const fp = clamp((t - tFlood) / Math.max(0.5, f.end - tFlood));
    const h = 640 * Math.pow(fp, 1.8);
    const night = (y: number) => h > Math.abs(y - HZ);               // has it taken that height yet?

    // ---- camera: the page breathes while it is still a page; on the drop it pushes in once, then holds.
    const push = prog(t, tDrop, tFlood + 2.6, ease.inOutCubic);
    const br = 1 - push;
    s.setCam(
      W / 2 + 7 * Math.sin(t * 0.33) * br + 5 * push,
      H / 2 + 5 * Math.cos(t * 0.24) * br - 10 * push,
      1.004 + 0.05 * push,
      0,
    );

    // 1. the page: the book's edge, the horizon (the film's thread), the three rules
    this.page(s, false);

    // 2. three memories, one per line — the third drawn EMPTY
    const m1 = beatAfter(L1.start + 0.02), m2 = beatAfter(L2.start + 0.02), m3 = beatAfter(L3.start + 0.02);
    this.snapshot(s, 0, t, m1, m1 + 0.5, h > HZ - MNT_Y[0]! + 40);
    this.snapshot(s, 1, t, m2, m2 + 0.5, h > HZ - MNT_Y[1]! + 40);
    this.snapshot(s, 2, t, m3, m3 + 0.5, h > HZ - MNT_Y[2]! + 40);

    // 3. the sung lines. The pen is the film's one light; the night turns what it has passed to starlight.
    this.writeLine(s, f, L1, RULES[0]!, night, FATHER, false);
    this.writeLine(s, f, L2, RULES[1]!, night, PLAIN, false);
    this.writeLine(s, f, L3, RULES[2]!, night, FATHER, false);

    // 4. the page comes up out of the night the chorus left it in (the page turn the film cuts on):
    //    one solid flat mass over everything, lifted in the first second — so the cut is not a jump
    const veil = 0.94 * (1 - prog(t, f.start, f.start + 0.85, ease.outQuad));
    if (veil > 0.012) s.fill(this.wholePage(), 5, rgba('night'), { amp: 2.0, a: veil });

    // 5. the night through the slit: the cut, then the flood (both solid, both flat)
    if (h < 14) this.slit(s, d, ripP, h);
    if (h > 0.5) this.flood(s, d, h);
    this.tear(s, d, ripP, h);
  }

  // ---------------------------------------------------------------- entry 2: the album page, complete (116.24 → 123.39)
  private albumFull(s: Sheet, f: Frame) {
    const t = f.t, A = this.A;
    const L1 = this.lines[0]!, L2 = this.lines[1]!;
    const beatAfter = (x: number) => A.timeOfBeat(Math.ceil(A.beatAt(x)));

    // one mount per beat, as the first line is sung
    const b1 = beatAfter(f.start + 0.02), b2 = b1 + 0.4762, b3 = b1 + 0.9524;
    // the third frame fills at the end of the first line ("…when I was just a child"), and not before
    const tFill = L1.words[L1.words.length - 1]!.start - 0.9;

    // ---- camera: a small push while the page settles, then dead still — the turn is held, not staged
    const push = prog(t, f.start, f.start + 2.2, ease.inOutCubic);
    s.setCam(W / 2 + 8 * push, H / 2 - 5 * push, 1 + 0.045 * push, 0);

    // the page, and the night it is now: one solid flat mass
    s.fill(this.wholePage(), 5, rgba('night'), { amp: 2.0, a: 0.98 });

    // the same page, the same three places — and the third one is full
    this.page(s, true);
    this.snapshot(s, 0, t, b1, b1 + 0.5, false);
    this.snapshot(s, 1, t, b2, b2 + 0.5, false);
    this.snapshot(s, 2, t, b3, tFill, false);

    // the two sung lines: on the night page the pen's light is the only warm thing
    this.writeLine(s, f, L1, RULES[0]!, () => true, FATHER, false);
    this.writeLine(s, f, L2, RULES[1]!, () => true, PLAIN, true);   // the `rose` line — one of the film's two

    // "These are the nights that never die": the third frame's border is redrawn in rose as it is sung
    const rp = clamp((t - L2.start) / 1.15);
    if (rp > 0.01) {
      const m = this.mount(2);
      this.hand(s, [...m.ring, m.ring[0]!], 420, rp, rgba('rose', 0.95), 3.6, true);
    }

    // …and the plate ends on the chorus's three windows of light, in the chorus's own three positions
    const last = L2.words[L2.words.length - 1]!;
    const ht = heldT(t);
    for (let i = 0; i < WINDOWS.length; i++) {
      const win = WINDOWS[i]!;
      const p = clamp((t - last.start - i * 0.10) / 0.22);
      if (p <= 0.008) continue;
      const on = ease.outCubic(p);
      const flash = 0.72 + 0.28 * Math.sin(ht * 1.1 + i * 0.9);       // they breathe on the drawing clock
      const r = 9.6 * on * (0.85 + 0.15 * flash);
      s.blob(win[0], win[1], r, 430 + i, {
        colour: rgba('star'), fillA: on, n: 12, jag: 0.16,
        outline: { w: 2, color: rgba('star', 0.72), a: on },
      });
      // four short cross strokes — the light is drawn, never glowed
      const ry = r * (2.2 + 1.5 * flash);
      s.stroke([v2(win[0] - ry, win[1]), v2(win[0] + ry, win[1])], 440 + i, { w: 2, color: rgba('star', 0.55), a: on });
      s.stroke([v2(win[0], win[1] - ry), v2(win[0], win[1] + ry)], 450 + i, { w: 2, color: rgba('star', 0.55), a: on });
    }
  }

  // ------------------------------------------------------------------ the page
  /** The whole sheet, as one flat polygon (the film's night is full bleed: the page is the frame). */
  private wholePage(): V2[] {
    return [v2(-OUT, -OUT), v2(W + OUT, -OUT), v2(W + OUT, H + OUT), v2(-OUT, H + OUT)];
  }

  /**
   * The page's furniture, drawn as `open` and `chorus` draw it — the same seeds, so it is the same
   * page: the book's edge and its inner line (edge by edge, for the wobble's cost), the horizon (the
   * film's thread, one line through every plate), and the three rules. `night` draws the same page after
   * the night has taken it: paper-coloured lines on dark.
   */
  private page(s: Sheet, night: boolean) {
    const [x0, y0, x1, y1] = PAGE;
    const M = night ? PAGE_NIGHT : PAGE_DAY;
    const T = night ? THIN_NIGHT : THIN_DAY;
    s.stroke([v2(x0, y0), v2(x1, y0), v2(x1, y1)], 2, M);
    s.stroke([v2(x0, y0), v2(x0, y1)], 3, M);
    s.stroke([v2(x1, y1), v2(x0, y1)], 4, M);
    s.stroke([v2(x0 + 9, y0 + 9), v2(x1 - 9, y0 + 9)], 12, T);
    s.stroke([v2(x1 - 9, y0 + 9), v2(x1 - 9, y1 - 9)], 13, T);
    s.stroke([v2(x1 - 9, y1 - 9), v2(x0 + 9, y1 - 9)], 14, T);
    s.stroke([v2(x0 + 9, y1 - 9), v2(x0 + 9, y0 + 9)], 15, T);
    // the thread: the opening plate's horizon, the same 47 samples, the same seed, the same ends
    const pts: V2[] = [];
    for (let i = 0; i <= 46; i++) {
      const x = lerp(HX0, HX1, i / 46);
      pts.push(v2(x, HZ + Math.sin(i * 0.18) * 7 + (hash(i * 3.3, 7) - 0.5) * 5));
    }
    s.stroke(pts, 11, night ? THREAD_NIGHT : THREAD_DAY);
    for (let i = 0; i < RULES.length; i++) {
      s.stroke([v2(RX0, RULES[i]! + 12), v2(RX1, RULES[i]! + 12)], 40 + i, night ? RULE_NIGHT : RULE_DAY);
    }
  }

  // ------------------------------------------------------------------ the snapshots
  /** A mount's frame: its border ring, and its local space mapped into the page (pinned slightly crooked). */
  private mount(i: number): Mnt {
    const cx = MNT_X[i]! + MNT_W / 2, cy = MNT_Y[i]! + MNT_H / 2;
    const a = MNT_A[i]!, ca = Math.cos(a), sa = Math.sin(a);
    const map = (x: number, y: number): V2 => {
      const dx = x - MNT_W / 2, dy = y - MNT_H / 2;
      return v2(cx + dx * ca - dy * sa, cy + dx * sa + dy * ca);
    };
    return { map, ring: [map(0, 0), map(MNT_W, 0), map(MNT_W, MNT_H), map(0, MNT_H)] };
  }

  /**
   * One remembered snapshot: the print is laid down left to right as a solid flat mass, the mount's
   * border is written round it, and then the memory inside is drawn — or, for the third frame of the
   * long entry, deliberately not: it is drawn and left empty. `skip` retires the whole thing once the
   * flood has already covered it (drawing under a solid night is free, so it is not done).
   */
  private snapshot(s: Sheet, i: number, t: number, t0: number, tInk: number, skip: boolean) {
    if (skip) return;
    const k = clamp((t - t0) / 0.42);
    if (k <= 0.004) return;
    const m = this.mount(i);
    // the print: a solid tone (paper2) inside the mount's margin — the mount never leaves it empty
    if (k > 0.02) {
      s.fill(
        [m.map(12, 12), m.map(12 + (MNT_W - 24) * k, 12), m.map(12 + (MNT_W - 24) * k, MNT_H - 12), m.map(12, MNT_H - 12)],
        200 + i, rgba('paper2'), { amp: 2.0, a: 0.96 },
      );
    }
    // the mount's border, written round by the pen, and its inner bevel
    this.hand(s, [...m.ring, m.ring[0]!], 210 + i, k, rgba('graphite', 0.55), 2.2, true);
    if (k > 0.5) {
      const inn = [m.map(9, 9), m.map(MNT_W - 9, 9), m.map(MNT_W - 9, MNT_H - 9), m.map(9, MNT_H - 9)];
      this.hand(s, [...inn, inn[0]!], 216 + i, clamp((k - 0.5) / 0.5), rgba('graphite', 0.3), 1.4, true);
    }
    // the memory itself
    if (t < tInk) return;
    if (i === 0) this.kite(s, m, tInk, t);
    else if (i === 1) this.doorway(s, m, tInk, t);
    else if (this.n === 2) this.portrait(s, m, tInk, t);
    // i === 2 and n === 1: nothing is drawn inside. That is the frame.
  }

  /** Snapshot 1 — a kite, drawn in the page's own three tones on the print. */
  private kite(s: Sheet, m: Mnt, t0: number, t: number) {
    let k = 0;
    const P = () => { const p = clamp((t - t0 - k * 0.13) / 0.3); k++; return p; };
    const ink = rgba('ink', 0.94);
    const sail = [m.map(150, 18), m.map(196, 54), m.map(150, 92), m.map(104, 54)];
    this.hand(s, [...sail, sail[0]!], 214, P(), ink, 2.8, true);
    const f = P();                                            // the tone goes in after the outline
    if (f > 0.01) s.fill(sail, 215, rgba('shade'), { amp: 2.0, a: 0.95 * f });
    this.hand(s, [m.map(150, 18), m.map(150, 92)], 216, P(), ink, 2.4);
    this.hand(s, [m.map(104, 54), m.map(196, 54)], 217, P(), ink, 2.4);
    const tail: V2[] = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16; tail.push(m.map(150 + Math.sin(u * 6.4) * 6, 92 + u * 44)); }
    this.hand(s, tail, 218, P(), ink, 2.2);
    const str: V2[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; str.push(m.map(lerp(150, 52, u), lerp(92, 132, u))); }
    this.hand(s, str, 220, P(), rgba('graphite', 0.8), 1.8);
  }

  /** Snapshot 2 — a doorway: the wall is one flat tone, and the door is the brightest thing on the page. */
  private doorway(s: Sheet, m: Mnt, t0: number, t: number) {
    let k = 0;
    const P = () => { const p = clamp((t - t0 - k * 0.15) / 0.32); k++; return p; };
    const ink = rgba('ink', 0.9);
    const wall = [m.map(22, 16), m.map(278, 16), m.map(278, 134), m.map(22, 134)];
    const wf = P();
    if (wf > 0.01) s.fill(wall, 230, rgba('shade'), { amp: 2.4, a: 0.95 * wf });
    const door = [m.map(122, 40), m.map(186, 40), m.map(186, 118), m.map(122, 118)];
    this.hand(s, [...door, door[0]!], 231, P(), ink, 2.8, true);
    const dp = P();
    if (dp > 0.01) s.fill([m.map(126, 44), m.map(182, 44), m.map(182, 118), m.map(126, 118)], 232, rgba('paper'), { amp: 1.8, a: dp });
    const lp = P();                                            // the light coming out of it, on the step
    if (lp > 0.01) s.fill([m.map(122, 118), m.map(186, 118), m.map(230, 134), m.map(78, 134)], 233, rgba('paper'), { amp: 2.2, a: 0.9 * lp });
    this.hand(s, [m.map(108, 118), m.map(202, 118)], 234, P(), ink, 2.4);
    this.hand(s, [m.map(112, 40), m.map(196, 40)], 235, P(), ink, 2.4);
  }

  /**
   * Snapshot 3, `n = 2` — the father and the boy, standing at the same height. This is the film's turn,
   * so the drawing is the whole event: two ink figures at 70 px (legible, not a scribble), the same
   * ground line, the same eye level, one line joining their hands. Nothing else happens in the frame.
   */
  private portrait(s: Sheet, m: Mnt, t0: number, t: number) {
    let k = 0;
    const P = () => { const p = clamp((t - t0 - k * 0.085) / 0.28); k++; return p; };
    const ink = rgba('ink', 0.95);
    // the ground they both stand on
    this.hand(s, [m.map(46, 122), m.map(254, 122)], 300, P(), rgba('graphite', 0.7), 2.0);
    // the father: a coat (the print's one flat mass), his head, his arms
    const coat = [m.map(94, 74), m.map(130, 74), m.map(136, 106), m.map(88, 106)];
    this.hand(s, [...coat, coat[0]!], 302, P(), ink, 3.4, true);
    const cf = P();
    if (cf > 0.01) s.fill([m.map(97, 77), m.map(127, 77), m.map(132, 104), m.map(92, 104)], 303, rgba('shade'), { amp: 1.8, a: 0.95 * cf });
    this.hand(s, this.circ(m, 112, 62, 10), 304, P(), ink, 3.4, true);
    this.hand(s, [m.map(94, 82), m.map(80, 98), m.map(78, 106)], 305, P(), ink, 3.2);
    this.hand(s, [m.map(130, 82), m.map(150, 94)], 306, P(), ink, 3.2);
    // the boy: the same height, the same ground — that is the whole point of the frame
    const body = [m.map(176, 76), m.map(188, 76), m.map(190, 106), m.map(174, 106)];
    this.hand(s, [...body, body[0]!], 310, P(), ink, 3.4, true);
    const bf = P();
    if (bf > 0.01) s.fill([m.map(178, 78), m.map(186, 78), m.map(188, 104), m.map(176, 104)], 311, rgba('shade'), { amp: 1.6, a: 0.9 * bf });
    this.hand(s, this.circ(m, 182, 62, 9), 312, P(), ink, 3.4, true);
    this.hand(s, [m.map(174, 84), m.map(152, 94)], 313, P(), ink, 3.2);
    this.hand(s, [m.map(190, 84), m.map(204, 98), m.map(206, 106)], 314, P(), ink, 3.2);
    // four legs, four feet on the one ground line
    this.hand(s, [m.map(100, 106), m.map(98, 122)], 316, P(), ink, 3.2);
    this.hand(s, [m.map(124, 106), m.map(126, 122)], 317, P(), ink, 3.2);
    this.hand(s, [m.map(179, 106), m.map(178, 122)], 318, P(), ink, 3.2);
    this.hand(s, [m.map(186, 106), m.map(187, 122)], 319, P(), ink, 3.2);
  }

  // ------------------------------------------------------------------ the drop: the slit, the flood, the tear
  /** The night showing through the cut: a thin flat mass along the horizon, opening as the rip runs. */
  private slit(s: Sheet, d: number, ripP: number, h: number) {
    if (ripP <= 0.004) return;
    const x1 = lerp(HX0, HX1, ripP);
    const half = 2.2 + 5.5 * ripP + 10 * clamp(h / 90);
    const N = 30;
    const poly: V2[] = [], back: V2[] = [];
    for (let i = 0; i <= N; i++) { const x = lerp(HX0, x1, i / N); poly.push(v2(x, HZ - half + noise1(x / 46, d) * 2.4)); }
    for (let i = N; i >= 0; i--) { const x = lerp(HX0, x1, i / N); back.push(v2(x, HZ + half + noise1(x / 46 + 9, d) * 2.4)); }
    s.fill([...poly, ...back], 340, rgba('night'), { amp: 1.6, a: 0.97 });
  }

  /** The flood: the night poured in through the slit, a flat cel mass on a moving edge. */
  private flood(s: Sheet, d: number, h: number) {
    const yT = Math.max(-OUT, HZ - h), yB = Math.min(H + OUT, HZ + h);
    const amp = 6.5 * Math.min(1, h / 60);
    const N = 24;
    const lo: V2[] = [], hi: V2[] = [];
    for (let i = 0; i <= N; i++) { const x = lerp(-OUT, W + OUT, i / N); lo.push(v2(x, yT + noise1(x / 78, d) * amp)); }
    for (let i = N; i >= 0; i--) { const x = lerp(-OUT, W + OUT, i / N); hi.push(v2(x, yB + noise1(x / 78 + 31, d) * amp)); }
    s.fill([...lo, ...hi], 350, rgba('night'), { amp: 3.0, a: 0.97 });
    // the wet edge: the shadow of the poured night on the paper it has not reached yet
    if (h < 420) s.stroke(lo, 352, { w: 2.2, color: rgba('ink', 0.34), amp: 1.4, a: 1 - clamp(h / 420) });
  }

  /** The tear's remains: the page's two frayed lips, and the fibres the cut lifted off them. */
  private tear(s: Sheet, d: number, ripP: number, h: number) {
    if (ripP <= 0.004) return;
    const x1 = lerp(HX0, HX1, ripP);
    const off = 4 + 7 * clamp(h / 170);
    const f = clamp((h - 1) / 12);                       // how much night is behind the lips now
    const inkA = 0.62 * (1 - f), papA = 0.92 * f;
    const N = 52;
    const up: V2[] = [], dn: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const x = lerp(HX0, x1, i / N);
      up.push(v2(x, HZ - off + noise1(x / 30, d) * 2.6));
      dn.push(v2(x, HZ + off + noise1(x / 30 + 17, d) * 2.6));
    }
    if (inkA > 0.02) {
      s.stroke(up, 360, { w: 2.4, color: rgba('ink', inkA), amp: 2.0, taper: false });
      s.stroke(dn, 361, { w: 2.4, color: rgba('ink', inkA), amp: 2.0, taper: false });
    }
    if (papA > 0.02) {
      s.stroke(up, 362, { w: 4.4, color: rgba('paper', papA), amp: 2.6, taper: false });
      s.stroke(dn, 363, { w: 4.4, color: rgba('paper2', papA), amp: 2.6, taper: false });
      for (let i = 0; i < 15; i++) {
        const x = lerp(HX0, x1, (i + 0.5) / 15);
        const len = 7 + 10 * hash(i, d);
        s.stroke([v2(x, HZ - off), v2(x + 3, HZ - off - len)], 370 + i, { w: 1.8, color: rgba('paper', 0.8 * papA), amp: 1.6 });
        s.stroke([v2(x, HZ + off), v2(x - 3, HZ + off + len)], 386 + i, { w: 1.8, color: rgba('paper2', 0.7 * papA), amp: 1.6 });
      }
    }
  }

  // ------------------------------------------------------------------ the sung words
  /**
   * Write one line of the song on its rule, word by word. The word being sung is written by the moving
   * nib and is the film's one light; the words already sung stay as the page's ink — or as starlight,
   * if the night has taken that rule. `rose` is the film's warm memory red, used on one line only.
   */
  private writeLine(s: Sheet, f: Frame, l: Line, y: number, night: (y: number) => boolean, font: StrokeFontName, rose: boolean) {
    const t = f.t;
    if (t < l.start - 2.4) return;
    const { size, gap, widths } = this.measure(s, l, font);
    const words = l.words;
    const total = widths.reduce((a, w) => a + w, 0) + gap * (words.length - 1);
    let x = (W - total) / 2;
    // the pencil layout of the whole line, while the line is still waiting to be written
    if (t < l.end) {
      const g0 = Math.max(f.start, l.start - 1.8);
      const rise = clamp(prog(t, g0, g0 + 0.9));
      s.letter(l.text, W / 2, y, size, 60, { font, align: 'center', color: rgba('graphite', 0.20 * rise), w: 3, amp: 1.6 });
    }
    const live = rose ? rgba('rose', 0.98) : rgba('lantern', 0.95);
    const done = rose ? rgba('rose', 0.95) : night(y) ? rgba('star', 0.96) : rgba('ink', 0.96);
    let penX = x;
    for (let k = 0; k < words.length; k++) {
      const w = words[k]!;
      const p = Lyrics.wordProgress(w, t);
      if (p > 0) {
        s.letterWritten(w.w, x, y, size, 70 + k * 3, p, { font, w: size * 0.078, amp: 2, color: p >= 1 ? done : live });
        if (p < 1) penX = x + widths[k]! * p;
      }
      x += widths[k]! + gap;
    }
    // the nib: the lantern tick that rides the word being sung
    if (t >= l.start - 0.15 && t <= l.end + 0.25) {
      s.stroke([v2(penX - 3, y - 6), v2(penX + 1, y + 16)], rose ? 92 : 90, { w: 4.2, color: live });
    }
  }

  // ------------------------------------------------------------------ the hand
  /**
   * The measured shape of a line: the same every frame (the string never changes), so it is shaped once
   * and remembered — the cost rule's "cache per element, not per frame". Pure: it cannot alter a frame.
   */
  private measure(s: Sheet, l: Line, font: StrokeFontName) {
    const key = `${l.i}|${font}`;
    const hit = this.metrics.get(key);
    if (hit) return hit;
    const size = SUNG * Math.min(1, MAX_W / Math.max(1, s.measureLetter(l.text, font, SUNG)));
    const gap = size * 0.30;
    const widths = l.words.map((w) => s.measureLetter(w.w, font, size));
    const m = { size, gap, widths };
    this.metrics.set(key, m);
    return m;
  }

  /** Draw a line as if an unseen hand were making it: only the first p of its length is on the page yet. */
  private hand(s: Sheet, pts: V2[], seed: number, p: number, col: string, w = 2.8, closed = false) {
    if (p <= 0.004 || pts.length < 2) return;
    if (p >= 0.996) { s.stroke(pts, seed, { w, color: col, closed, amp: 2.0 }); return; }
    let tot = 0;
    for (let i = 0; i + 1 < pts.length; i++) tot += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
    const want = p * tot;
    const seg: V2[] = [pts[0]!];
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (acc + len <= want) { seg.push(b); acc += len; continue; }
      const k = len > 1e-6 ? (want - acc) / len : 1;
      seg.push(v2(lerp(a.x, b.x, k), lerp(a.y, b.y, k)));
      break;
    }
    if (seg.length > 1) s.stroke(seg, seed, { w, color: col, amp: 2.0 });
  }

  /** A hand-drawn ring in a mount's local space (a head). */
  private circ(m: Mnt, cx: number, cy: number, r: number, n = 11): V2[] {
    const out: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU - 0.7;
      out.push(m.map(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.06));
    }
    return out;
  }
}

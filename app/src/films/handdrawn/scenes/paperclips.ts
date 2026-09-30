// Plate 13 — "as paperclips fill the room" / "Killswitch guy's on PTO" / "Now there's nowhere left to go"
//
// The quiet, hypnotic one, and the film's best hand-drawn joke: the duplication IS the drawing being
// copied. One paperclip is drawn as a single unbroken wobbly wire — a long U with two nested turns.
// On every beat the whole drawing is laid down again: one, two, four, eight, sixteen, thirty-two,
// sixty-four. Each copy carries its own wobble seed, its own slight rotation and scale, so no two
// agree and none of them reads as a machine's clone. They scatter into a sunflower lattice: the near
// ones big and clean, the far ones tiny and dense. On "Killswitch guy's on PTO" a hand-ruled
// out-of-office card floats through the lattice, a clip still holding its corner. On "Now there's
// nowhere left to go" the clips press in until the lyric is squeezed into a narrowing corridor and
// the sheet is nearly solid ink.
//
// The lattice answers to the copies' own size (SMAX/SMIN/CELL below): a sunflower's spacing is one
// number for the whole sheet, so a 2.44*BASE px wire on a 72*sqrt(i) grid has its inner dozen copies
// lying on top of each other. Here the radius is grown out of the areas the placed copies have already
// taken, so neighbours are always about a clip apart and the near-to-far depth cue survives.
//
// RULE 1: every copy's seed is the drawing index; nothing here is seeded by raw time. The doubling
// clock and the fade of a freshly laid copy are quantised to the drawing too — a copy that arrived
// mid-drawing would smear across the export's motion-blur sub-frames.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, prog, heldT, noise1, hash, TAU } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';
import type { StrokeFontName } from '../../../engine/stroke';

const BASE = 132;          // px for a clip at scale 1 (local height is ~2.44 units)
const BEAT = 60 / 132;     // the song's beat — the duplication clock
const CYCLE0 = 96.72;      // where the clock starts
const MAXCLIPS = 64;
const LY = 900;            // the lyric's baseline
const GA = TAU * 0.381966; // the golden angle: an even scatter that still looks hand-arranged
// The lattice. Three numbers hold 64 copies of one 330 px-tall wire apart: SMAX caps the copy nearest
// the lens — at the old 1.6 it stood 515 px tall with its neighbour 80 px away, which is the mush —
// SMIN is how small the far ones may get, and CELL is the lattice area one unit of scale claims, so
// the spacing a copy sees is CELL*sc: it tracks the copy's own size instead of the sheet's.
const SMAX = 0.68, SMIN = 0.15, RT = 700, CELL = 560;
const SQ = 0.62;           // the treatment's squeeze: the last line is condensed to this width
const COND = -0.12;        // the advance condensation (per letter, in units of the size) at SQ
const HERO = 2;            // copies still stroked with a lifted pen — a taper costs one path PER segment

// ---------------------------------------------------------------- one paperclip, one unbroken wire
function buildClip(): V2[] {
  const W1 = 0.50, W2 = 0.24;              // outer / inner half-width
  const T = -0.95, T2 = -0.60;             // the two nested top turns
  const B = 0.95, B2 = 0.62;               // the long left wire and the bottom turn
  const p: V2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  };
  p.push(v2(-W1, B));          // start at the bottom of the outer wire
  p.push(v2(-W1, T));
  arc(0, T, W1, Math.PI, TAU, 12);          // big turn over the top, right
  p.push(v2(W1, B2));
  arc((W1 - W2) / 2, B2, (W1 + W2) / 2, 0, Math.PI, 12); // the turn underneath
  p.push(v2(-W2, T2));
  arc(0, T2, W2, Math.PI, TAU, 10);         // the small turn inside
  p.push(v2(W2, 0.44));                     // the loose end, resting on the wire
  return p;
}
const CLIP = buildClip();

/** The wire's half-extents in local units: the lattice's spacing and the lyric's corridor both measure against it. */
const EXT = (() => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of CLIP) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return { hx: (x1 - x0) / 2, hy: (y1 - y0) / 2 };
})();

/** A copy's half-height in sheet px, with its own tilt folded in (the wire is tall, so tilting it shortens it). */
const halfUp = (sc: number, cf: number, sf: number) => sc * BASE * Math.hypot(EXT.hx * sf, EXT.hy * cf);

// ---------------------------------------------------------------- the lyric
/**
 * The lyric, hand-lettered and written stroke by stroke as it is sung — never a rectangular wipe.
 * `squeeze` (< 1) condenses the line: the treatment squeezes the last one between the closing clips,
 * and a single-stroke font has no width axis, so the size carries most of it and a negative tracking
 * the rest. `measureLetter` is affine in the tracking (one advance per letter), which makes the size
 * a division rather than a search.
 */
function writeLine(s: Sheet, line: Line, t: number, y: number, size: number, seedBase: number, squeeze = 1) {
  const fam = 'readable';
  const words = line.words;
  const gaps = Math.max(0, words.length - 1);
  // Condensation per unit size: none at full width, COND at the treatment's SQ
  const cond = COND * (1 - squeeze) / (1 - SQ);
  const advs = words.reduce((n, w) => n + Math.max(0, Array.from(w.w).length - 1), 0);
  const u0 = words.reduce((n, w) => n + s.measureLetter(w.w, fam, 1), 0) + 0.3 * gaps; // width per unit size
  const sz = Math.min(size, (size * squeeze * u0) / (u0 + cond * advs));
  const track = cond * sz;
  const widths = words.map((w) => s.measureLetter(w.w, fam, sz, track));
  const gap = sz * 0.3;
  const total = widths.reduce((a, b) => a + b, 0) + gap * gaps;
  let x = (W - total) / 2;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const p = Lyrics.wordProgress(w, t);
    if (p > 0) {
      const sway = noise1(s.d * 0.41 + i * 1.7, 55) * 2.0;
      if (p < 1) s.letterWritten(w.w, x, y + sway, sz, seedBase + i * 3, 1, { font: fam, tracking: track, ghost: true });
      s.letterWritten(w.w, x, y + sway, sz, seedBase + i * 3, p, {
        font: fam,
        tracking: track,
        color: p >= 1 ? rgba('ink') : rgba('signal'),
        w: sz * 0.085,
      });
    }
    x += widths[i]! + gap;
  }
}

/** A ruled index card, rotated into the sheet, drifting through the lattice. */
function drawCard(s: Sheet, cx: number, cy: number, rot: number, d: number) {
  const cf = Math.cos(rot), sf = Math.sin(rot);
  const P = (x: number, y: number): V2 => v2(cx + (x * cf - y * sf), cy + (x * sf + y * cf));
  const w = 470, h = 286;
  const box = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];

  // a hand-scratched shadow, offset down-right and looser than the card
  for (let i = 0; i < 3; i++) {
    const o = 7 + i * 6;
    s.stroke([P(-w / 2 + o, h / 2 + o), P(w / 2 + o, h / 2 + o)], 701 + i, { w: 3, color: rgba('graphite', 0.16), amp: 3.4 });
    s.stroke([P(w / 2 + o, -h / 2 + o), P(w / 2 + o, h / 2 + o)], 704 + i, { w: 3, color: rgba('graphite', 0.16), amp: 3.4 });
  }
  s.fill(box, 700, rgba('paper', 0.97));
  s.stroke(box, 710, { closed: true, w: 3.2, color: rgba('ink'), amp: 3.0 });

  // the heading
  const hd = P(0, -h / 2 + 56);
  s.letter('OUT OF OFFICE', hd.x, hd.y, 40, 730, { font: 'readable', align: 'center', rot, color: rgba('ink'), w: 3.2 });
  s.stroke([P(-w / 2 + 26, -h / 2 + 70), P(w / 2 - 26, -h / 2 + 70)], 735, { w: 2.4, color: rgba('signal', 0.8), amp: 2.0 });

  // ruled lines with the note written on them
  const rows: [string, number, number, StrokeFontName][] = [
    ['KILLSWITCH GUY', -h / 2 + 108, 26, 'tech'],
    ['STATUS: ON PTO', -h / 2 + 156, 24, 'tech'],
    ['RETURN: — — —', -h / 2 + 204, 24, 'tech'],
  ];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    s.stroke([P(-w / 2 + 26, r[1] + 12), P(w / 2 - 26, r[1] + 12)], 740 + i, { w: 1.4, color: rgba('cool', 0.5), amp: 1.8 });
    const q = P(-w / 2 + 34, r[1]);
    s.letter(r[0], q.x, q.y, r[2], 745 + i, { font: r[3], rot, color: rgba('ink2') });
  }
  // the clip still holding the card together
  const cq = CLIP.map((p) => P(p.x * 44 - w / 2 + 44, p.y * 44 - h / 2 + 10));
  s.stroke(cq, 760, { w: 2.6, color: rgba('cool'), amp: 1.6 });
  void d;
}

// ---------------------------------------------------------------- the plate
export default class Paperclips extends InkedScene {
  private l1 = this.ctx.lyrics.get('as paperclips fill the room');
  private l2 = this.ctx.lyrics.get("Killswitch guy's on PTO");
  private l3 = this.ctx.lyrics.get("Now there's nowhere left to go");

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d;
    s.setCam(960, 540, 1.0, 0);

    // --- the duplication clock: one, two, four, eight ... read off the drawing, not the video frame,
    // so a copy and its fade arrive on a whole drawing instead of growing inside a blurred one
    const ht = heldT(t);
    const beatIdx = Math.max(0, Math.floor((ht - CYCLE0) / BEAT));
    const count = Math.min(MAXCLIPS, Math.pow(2, beatIdx));
    const prevCount = beatIdx >= 1 ? Math.min(MAXCLIPS, Math.pow(2, beatIdx - 1)) : count;
    const since = ((ht - CYCLE0) % BEAT + BEAT) % BEAT;
    const fresh = clamp(1 - since / 0.22);   // the copies laid down on THIS beat

    // --- the squeeze
    const cin = ease.inOutCubic(prog(t, 100.72, 102.15));
    const bandHalf = lerp(130, 54, cin);
    const shrink = lerp(1, 0.78, cin);

    // --- the lattice. Nothing rounds to a machine's grid: a golden-angle phyllotaxis with hand error
    // on it. Each copy claims lattice area in proportion to its own size, so the radius the next copy
    // lands on already has room for it — the sunflower's even scatter without the sunflower's one
    // spacing for every size, which is what let the inner copies lie on top of each other.
    let area = 0;
    for (let i = 0; i < count; i++) {
      const rr = Math.sqrt(area / Math.PI);
      const sc = clamp(SMAX * (1 - rr / RT), SMIN, SMAX) * lerp(1, 1.25, cin);
      const a = i * GA;
      area += (CELL * sc) ** 2;
      if (rr > RT || sc < 0.12) continue;             // past the extent the constants allow: a guard, not a cull
      const cx = 960 + Math.cos(a) * rr * shrink * 1.32;
      let cy = 540 + Math.sin(a) * rr * shrink * 0.84;

      const rot = (hash(i, 7) - 0.5) * 0.44;
      const cf = Math.cos(rot), sf = Math.sin(rot);
      const hy = halfUp(sc, cf, sf);

      // Keep the lyric's corridor clear — narrower every beat as the room runs out. A copy is pushed
      // out by the overlap IT has with the band, so the row it lands on is its own footprint's: two
      // copies only share a y by being the same size. (A copy that cannot clear the band and still sit
      // on the sheet is dropped rather than drawn half off it.)
      const off = cy - LY;
      if (Math.abs(off) < bandHalf + hy) cy = LY + (off >= 0 ? 1 : -1) * (bandHalf + hy);
      if (cy - hy < 6 || cy + hy > H - 6) continue;

      const isNew = i >= prevCount && fresh > 0;
      const col = isNew ? rgba('signal', 0.35 + 0.65 * fresh) : rgba('ink');
      // the near ones read clean and the far ones loose, so the two ends never agree
      const amp = 2.0 + 1.6 * (1 - sc / SMAX);
      const wdt = clamp(6.2 * sc, 1.0, 6.0);
      const pts = CLIP.map((p) => v2(cx + (p.x * cf - p.y * sf) * sc * BASE, cy + (p.x * sf + p.y * cf) * sc * BASE));
      // A tapered stroke is one canvas path PER SEGMENT, and the inner copies are ~45 segments of wire
      // each: tapering all 64 is ~3k paths a frame before the export multiplies it by the shutter. Only
      // the couple of copies nearest the lens (where the pen would actually be lifted) are tapered; the
      // rest go down as one unbroken path, which the wobble still boils every drawing.
      s.stroke(pts, i * 13.7, { w: wdt, color: col, amp, taper: i < HERO, sketch: sc < 0.3 });

      // the metal: one lifted highlight along the nearest, cleanest ones only (untapered — it is a
      // reflection, not a pen stroke, and it is the same wire, so it costs the same again if tapered)
      if (sc > SMAX * 0.6) {
        s.stroke(pts.map((p) => v2(p.x + 3.2, p.y + 2.4)), 900 + i * 5, { w: 2.4, color: rgba('cool', 0.4), amp: 1.6, taper: false });
      }
    }

    // --- when the room is full: extra small copies crowding the corridors shut. Each one is sized to
    // the strip it has to live in — the room below the lyric is only as tall as the corridor leaves it,
    // which is far less than a full copy — so the crowd below the line is on the sheet, not under it.
    if (cin > 0.22) {
      const n = Math.floor(24 * clamp((cin - 0.22) / 0.5));
      for (let i = 0; i < n; i++) {
        const top = hash(i, 902) < 0.5;
        const y0 = top ? 40 : LY + bandHalf + 14;
        const y1 = top ? LY - bandHalf - 14 : H - 40;
        const sc = Math.min(0.16 + hash(i, 904) * 0.3, (y1 - y0) / (2 * EXT.hy * BASE));
        if (sc < 0.11) continue;                      // this strip cannot hold even a small copy
        const hh = EXT.hy * BASE * sc;
        const fx = hash(i, 901) * W;
        const fy = lerp(y0 + hh, y1 - hh, hash(i, 903));
        const rot = (hash(i, 905) - 0.5) * 0.7;
        const cf = Math.cos(rot), sf = Math.sin(rot);
        const pts = CLIP.map((p) => v2(fx + (p.x * cf - p.y * sf) * sc * BASE, fy + (p.x * sf + p.y * cf) * sc * BASE));
        s.stroke(pts, 3000 + i * 3.3, { w: clamp(5 * sc, 1, 2), color: rgba('ink', 0.85), amp: 2.4, sketch: true });
      }
    }

    // --- nearly solid: hatch the sheet outside the lyric's corridor
    if (cin > 0.2) {
      const ha = 0.45 * clamp((cin - 0.2) / 0.8);
      const nt = v2(-40, -40), nt2 = v2(W + 40, -40), nt3 = v2(W + 40, LY - bandHalf), nt4 = v2(-40, LY - bandHalf);
      const nb1 = v2(-40, LY + bandHalf), nb2 = v2(W + 40, LY + bandHalf), nb3 = v2(W + 40, H + 40), nb4 = v2(-40, H + 40);
      s.hatch([nt, nt2, nt3, nt4], 5000, { spacing: 26, angle: -1.1, color: rgba('ink', ha), w: 1.3 });
      s.hatch([nb1, nb2, nb3, nb4], 5001, { spacing: 26, angle: -1.1, color: rgba('ink', ha), w: 1.3 });
    }

    // --- the out-of-office card, drifting through on "Killswitch guy's on PTO"
    const cp = prog(t, 98.86, 100.66);
    if (cp > 0 && cp < 1) {
      const ccx = lerp(-420, W + 420, ease.inOutQuad(cp));
      const ccy = 400 + Math.sin(cp * TAU) * 58 + noise1(d * 0.5, 3) * 6;
      const rot = -0.07 + Math.sin(cp * TAU) * 0.05 + noise1(d * 0.4, 8) * 0.012;
      drawCard(s, ccx, ccy, rot, d);
    }

    // --- the lyric, squeezed between the closing clips as the room runs out
    const line = t < 98.82 ? this.l1 : t < 100.72 ? this.l2 : this.l3;
    writeLine(s, line, t, LY, 52, 700, lerp(1, SQ, cin));

    s.text('13 — PAPERCLIPS', 96, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`n=${count}  d${d}`, W - 200, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55) });

    return { flash: 0.02 * f.a.snare };
  }
}

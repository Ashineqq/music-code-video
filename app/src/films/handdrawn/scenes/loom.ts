// Plate 20 — "Just as foretold by Loom"
// The tree of continuations, drawn like a family tree: a trunk ruled up from the bottom of the paper,
// one node per spoken token. The branch that was taken continues upward in ink; the roads not taken
// sprout pale to the left, each with its own small hand-lettered probability, and the chosen node
// ("Loom") is priced and stamped ▸ SAMPLED. A callout pasted to its right lays out the readable
// distribution it was drawn from. Then the tree is drawn again inside one of its own nodes, four
// levels down, the last one bottoming out in a dark room.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, hash, heldT, TAU } from './_ink';
import type { V2 } from './_ink';
import { Lyrics, type Line, type Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

const TRUNK_X = 690;       // the ruled trunk, left of the token column
const COL_X = 1252;        // the token column: one word per node, to the right of the trunk
const NODE_W = 62;
const NODE_H = 38;
const STEP = 68;           // vertical pitch between nodes
const Y0 = 950;            // the bottom node, just above the frame's lower rule

// the alternatives need names and a voice to claim them
const VERBS = ['Exactly', 'prophesied', 'gambled', 'whispered', 'measured', 'sampled', 'dreamed', 'hedged', 'omitted', 'counted', 'foresaw', 'priced'];
const NAMES = ['ruin', 'plenty', 'silence', 'a choir', 'the sea', 'mercy', 'a door', 'halving', 'a crown', 'static', 'spring', 'iron'];

// the distribution the last token was drawn from (treatment): the continuations that were read off,
// the roads not taken — and the probability the one word that was actually sampled claimed for itself.
const NEXT: [string, number][] = [
  ['Moloch', 0.17],
  ['the scaling laws', 0.14],
  ['Nostradamus', 0.12],
  ['nobody, technically', 0.10],
  ['a Substack post', 0.09],
  ['the eval suite', 0.07],
];
const LOOM_P = 0.31;

interface Node { w: Word; li: number; i: number; y: number }
interface Box { x: number; y: number; w: number; h: number }

export default class Loom extends InkedScene {
  private nodes: Node[] = [];
  private lines: Line[] = [];
  /** The chosen node — the one word that was sampled; found once, at init. */
  private loom: Node | null = null;

  override init() {
    const L = this.ctx.lyrics;
    this.lines = [
      L.get('Just as foretold by Loom'),
      L.get('From masked pre-training days'),
      L.get('To recursive self-upgrade'),
    ];
    let i = 0;
    for (let li = 0; li < this.lines.length; li++) {
      for (const w of this.lines[li]!.words) {
        this.nodes.push({ w, li, i, y: Y0 - i * STEP });
        i++;
      }
    }
    this.loom = this.nodes.find((n) => n.w.w === 'Loom') ?? null;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t;
    const d = s.d;
    const ht = heldT(t);
    const kick = f.a.kick;

    // ---- shots: the tree is studied whole, then the recursion opens inside one of its nodes
    const rec = ease.inOutCubic(clamp((t - 130.02) / 0.78));
    const push = ease.inOutCubic(clamp((t - 126.14) / 3.4));
    const z = lerp(0.945, 1.015, push) * lerp(1, 0.936, rec);
    const cx = 960 + noise1(ht * 0.31, 7) * 7;
    const cy = lerp(556, 536, push) - 44 * rec + noise1(ht * 0.27, 9) * 7;
    s.setCam(cx, cy, z, 0.004 * noise1(ht * 0.23, 3) + 0.007 * rec);

    // ---- the cel frame (a hand-ruled border, redrawn every drawing)
    s.rect(64, 48, W - 64, H - 48, 90, { w: 3.4, color: rgba('ink', 0.5), overshoot: 7, amp: 3.0, taper: false });

    // ---- per-node reveal: a node exists once its token is about to be spoken
    const wr = this.nodes.map((n) => clamp((t - (n.w.start - 0.04)) / 0.16));
    let topIdx = -1;
    for (let i = 0; i < wr.length; i++) if (wr[i]! > 0) topIdx = i;
    const trunkTop = topIdx < 0 ? 1006 : this.nodes[topIdx]!.y - NODE_H / 2 - 22 * wr[topIdx]!;

    // ---- the trunk: ruled up from the bottom of the paper, still breathing
    if (trunkTop < 1002) {
      s.stroke([v2(TRUNK_X, 1006), v2(TRUNK_X, trunkTop)], 300, { w: 4.4, color: rgba('ink'), amp: 1.6, overshoot: 6 });
    }
    // the pencil continuation: this tree is not finished being drawn, it is foretold
    if (topIdx >= 0) {
      for (let k = 0; k < 10; k++) {
        const y0 = trunkTop - 16 - k * 24;
        if (y0 < 130) break;
        s.stroke([v2(TRUNK_X, y0), v2(TRUNK_X, y0 - 11)], 320 + k, { w: 1.8, color: rgba('graphite', 0.3), amp: 1.5, taper: false });
      }
    }

    // ---- nodes and the roads not taken
    for (const n of this.nodes) {
      const a = wr[n.i]!;
      if (a <= 0) continue;
      const sd = 200 + n.i * 11;

      // two alternatives per node: one down-left, one up-left, both paler than the path taken
      for (let k = 0; k < 2; k++) {
        const h1 = hash(sd + k * 3, 11), h2 = hash(sd + k * 3, 13), h3 = hash(sd + k * 3, 17);
        const len = k === 0 ? 200 + h1 * 120 : 118 + h1 * 92;
        const drop = k === 0 ? 40 + h2 * 52 : -30 + h2 * 18;
        const tip = v2(TRUNK_X - len, n.y + drop);
        const pts = [
          v2(TRUNK_X - NODE_W / 2 + 2, n.y + 2),
          v2(TRUNK_X - len * 0.36, n.y + drop * 0.34),
          v2(TRUNK_X - len * 0.74, n.y + drop * 0.86),
          tip,
        ];
        s.stroke(pts, sd + 20 + k, { w: 2.4, color: rgba('graphite', 0.62 * a), amp: 2.6, overshoot: 4 });
        // the branch's name, and the probability it claimed for itself
        const nm = NAMES[(n.i * 2 + k) % NAMES.length]!;
        const vb = VERBS[(n.i * 3 + k * 5) % VERBS.length]!;
        const nn = String(10 + Math.floor(h3 * 89));
        s.letter(nm, tip.x - 14, tip.y + 4, 21, sd + 30 + k, { font: 'hscript', color: rgba('sage', 0.7 * a), align: 'right', w: 3.0 });
        s.letter(`${vb} .${nn}`, tip.x - 14, tip.y + 24, 19, sd + 40 + k, { font: 'readable', color: rgba('graphite', 0.62 * a), align: 'right', w: 2.6 });
        // a circled branch was nearly taken
        if (h3 > 0.8) s.arc(tip.x, tip.y + 9, 16, 0, TAU, sd + 50 + k, { w: 2.0, color: rgba('ink', 0.4 * a), amp: 2.0, taper: false });
      }

      // the node itself: a small hand-ruled box with a token mark inside
      const bw = (NODE_W / 2) * lerp(0.35, 1, a);
      const bh = (NODE_H / 2) * lerp(0.35, 1, a);
      if (n.w.w === 'Loom' && a > 0.55) {
        // the chosen one: a second rule around it, in the signal colour, and the probability it claimed
        s.rect(TRUNK_X - bw - 7, n.y - bh - 7, TRUNK_X + bw + 7, n.y + bh + 7, sd + 5, { w: 2.2, color: rgba('signal', 0.7 * a), amp: 2.4, taper: false });
        s.letter(`p ${LOOM_P.toFixed(2)}`, TRUNK_X + NODE_W / 2 + 12, n.y - NODE_H / 2 - 6, 18, sd + 8, { font: 'readable', color: rgba('signal', 0.85 * a), w: 1.7 });
      }
      s.rect(TRUNK_X - bw, n.y - bh, TRUNK_X + bw, n.y + bh, sd + 6, { w: 3.0, color: rgba('ink', 0.95 * a), amp: 2.4, taper: false });
      const mp: V2[] = [];
      for (let q = 0; q < 6; q++) {
        const an = (q / 6) * TAU + noise1(d * 0.7 + q + n.i, sd) * 0.5;
        mp.push(v2(TRUNK_X + Math.cos(an) * 6 * lerp(0.4, 1, a), n.y + Math.sin(an) * 6 * lerp(0.4, 1, a)));
      }
      s.fill(mp, sd + 7, rgba('ink', 0.9 * a), { amp: 1.2 });
    }

    // ---- the recursion: the same tree inside one of its own nodes, four levels down
    if (rec > 0.001) {
      const box: Box = { x: 176, y: 112, w: 944, h: 850 };
      const frames: Box[] = [box];
      for (let k = 0; k < 3; k++) {
        const p = frames[k]!;
        frames.push({ x: p.x + p.w * 0.30, y: p.y + p.h * 0.26, w: p.w * 0.56, h: p.h * 0.56 });
      }
      for (let k = 0; k < 3; k++) {
        const b = frames[k]!;
        const quad = [v2(b.x, b.y), v2(b.x + b.w, b.y), v2(b.x + b.w, b.y + b.h), v2(b.x, b.y + b.h)];
        // a clean patch of paper, so the level above does not show through the level below
        s.fill(quad, 500 + k * 9, rgba('paper', 0.95 * rec), { amp: 2.0 });
        s.rect(b.x, b.y, b.x + b.w, b.y + b.h, 505 + k * 9, { w: Math.max(1.6, 3.6 - k * 0.7), color: rgba('ink', 0.82 * rec), amp: 2.2, taper: false });
        if (k > 0) {
          // the frame that holds it: a short leader into the parent node
          s.stroke([v2(b.x - 26, b.y + b.h * 0.5), v2(b.x, b.y + b.h * 0.5)], 508 + k * 9, { w: 1.8, color: rgba('graphite', 0.5 * rec), amp: 1.6, taper: false });
        }
        this.mini(s, b, 520 + k * 9, rec, k);
      }

      // ---- the innermost level: the room, nearly empty, one small lit rectangle in it
      const rm = frames[3]!;
      const rp = [v2(rm.x, rm.y), v2(rm.x + rm.w, rm.y), v2(rm.x + rm.w, rm.y + rm.h), v2(rm.x, rm.y + rm.h)];
      s.hatch(rp, 570, { spacing: 7, angle: -1.15, color: rgba('ink', 0.42 * rec), w: 1.3 });
      const ix = rm.w * 0.26, iy = rm.h * 0.26;
      s.fill([v2(rm.x + ix, rm.y + iy), v2(rm.x + rm.w - ix, rm.y + iy), v2(rm.x + rm.w - ix, rm.y + rm.h - iy), v2(rm.x + ix, rm.y + rm.h - iy)], 571, rgba('paper', 0.95 * rec), { amp: 1.6 });
      s.rect(rm.x, rm.y, rm.x + rm.w, rm.y + rm.h, 572, { w: 1.8, color: rgba('ink', 0.85 * rec), amp: 1.6, taper: false });
      // the one lit thing: a screen, with the paper left clean inside its halo
      const sx0 = rm.x + rm.w * 0.32, sy0 = rm.y + rm.h * 0.32, sx1 = rm.x + rm.w * 0.76, sy1 = rm.y + rm.h * 0.64;
      const halo = [v2(sx0 - 5, sy0 - 5), v2(sx1 + 5, sy0 - 5), v2(sx1 + 5, sy1 + 5), v2(sx0 - 5, sy1 + 5)];
      s.fill(halo, 573, rgba('ember', 0.13 * rec + 0.1 * kick * rec), { amp: 2.0 });
      const scr = [v2(sx0, sy0), v2(sx1, sy0), v2(sx1, sy1), v2(sx0, sy1)];
      s.fill(scr, 574, rgba('paper', rec), { amp: 1.6 });
      s.stroke(scr, 574, { w: 2.0, color: rgba('signal', 0.85 * rec), amp: 1.6, taper: false, closed: true });
      // and the spark that is on its way in
      if (t > 131.36) {
        const sp = clamp((t - 131.36) / 0.2);
        s.fill([v2(sx1 + 6 * sp, sy1 + 6 * sp), v2(sx1 + 6 * sp + 5, sy1 + 6 * sp), v2(sx1 + 6 * sp + 5, sy1 + 6 * sp + 5), v2(sx1 + 6 * sp, sy1 + 6 * sp + 5)], 575, rgba('signal', 0.9 * sp * rec), { amp: 1.0 });
      }
    }

    // ---- the lyric: one word per node, written along the chosen path as it is sung
    for (const n of this.nodes) {
      const a = wr[n.i]!;
      if (a <= 0) continue;
      const sd = 200 + n.i * 11;
      const isLoom = n.w.w === 'Loom';
      const redact = n.li === 1;
      const fam: 'script' | 'readable' = isLoom ? 'script' : 'readable';
      const size = isLoom ? 58 : 46;
      const wl = s.measureLetter(n.w.w, fam, size);
      const x0 = COL_X - wl / 2;
      const by = n.y + (isLoom ? 19 : 16);
      const p = clamp(Lyrics.wordProgress(n.w, t));

      // the leader from the node to its token
      s.stroke([v2(TRUNK_X + 34, n.y), v2(x0 - 20, n.y)], sd + 60, { w: 2.0, color: rgba('graphite', 0.42 * a), amp: 2.0, taper: false });

      if (redact) {
        // "masked": the word arrives as a ruled block and is unmasked letter by letter as it is sung
        const bx0 = x0 - 18, bx1 = x0 + wl + 18, by0 = n.y - 31, by1 = n.y + 27;
        const cut = bx0 + (bx1 - bx0) * p;
        if (bx1 - cut > 9) {
          const j = (k: number) => (hash(sd + k, d * 0.37) - 0.5) * 8;
          const rp = [v2(cut + j(0), by0 + j(4)), v2(bx1 + j(1), by0), v2(bx1 + j(2), by1), v2(cut + j(3), by1 + j(5))];
          s.hatch(rp, sd + 70, { spacing: 7, angle: -1.05, color: rgba('ink', 0.55 * a), w: 1.7 });
          s.rect(cut, by0, bx1, by1, sd + 71, { w: 2.6, color: rgba('ink', 0.78 * a), amp: 2.2, taper: false });
        }
        s.letterWritten(n.w.w, x0, by, size, sd + 72, p, { font: fam, color: p >= 1 ? rgba('ink', a) : rgba('signal', a), w: 5.0 });
      } else {
        if (p < 1 && a >= 1) s.letterWritten(n.w.w, x0, by, size, sd + 73, 1, { font: fam, ghost: true });
        s.letterWritten(n.w.w, x0, by, size, sd + 73, p, { font: fam, color: p >= 1 ? rgba('ink', a) : rgba('signal', a), w: 5.0 });
        if (isLoom) {
          // and a small hand-drawn tick, marking it as the one that was chosen
          const tp = clamp((t - (n.w.start + (n.w.end - n.w.start) * 0.72)) / 0.3);
          if (tp > 0) {
            const hx = x0 + wl + 28, hy = n.y + 12;
            const p0 = v2(hx, hy - 4), p1 = v2(hx + 15, hy + 15), p2 = v2(hx + 66, hy - 44);
            if (tp < 0.34) {
              const q = tp / 0.34;
              s.stroke([p0, v2(lerp(p0.x, p1.x, q), lerp(p0.y, p1.y, q))], sd + 80, { w: 6.0, color: rgba('signal'), amp: 1.8, overshoot: 3 });
            } else {
              const q = (tp - 0.34) / 0.66;
              s.stroke([p0, p1], sd + 80, { w: 6.0, color: rgba('signal'), amp: 1.8, overshoot: 3 });
              s.stroke([p1, v2(lerp(p1.x, p2.x, q), lerp(p1.y, p2.y, q))], sd + 81, { w: 6.0, color: rgba('signal'), amp: 1.8, overshoot: 3 });
            }
          }
        }
      }
    }

    // ---- the beat the plate was missing: the readable distribution the last token was drawn from
    if (this.loom) {
      const out = wr[this.loom.i]! * clamp((t - (this.loom.w.start - 0.5)) / 0.4) * (1 - clamp(rec * 1.4));
      if (out > 0.01) this.distribution(s, this.loom, t, out);
    }

    // ---- a small hand-printed slug
    s.text('20 — LOOM', 96, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9 * (1 - rec * 0.6)) });
    s.text(`d${d}`, W - 118, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55 * (1 - rec * 0.6)) });

    return { flash: 0.03 * f.a.snare, zoom: 1 + 0.004 * kick };
  }

  /** The same tree, redrawn to fit a smaller frame: the picture inside the picture. */
  private mini(s: Sheet, b: Box, sd: number, a: number, level: number) {
    const tx = b.x + b.w * 0.30;
    const yb = b.y + b.h * 0.92;
    const yt = b.y + b.h * 0.14;
    // the ruled trunk, and the pencil continuation above it
    const tp: V2[] = [];
    for (let i = 0; i <= 5; i++) tp.push(v2(tx + noise1(i * 1.3 + sd, sd + 1) * b.w * 0.008, lerp(yb, yt, i / 5)));
    s.stroke(tp, sd + 1, { w: Math.max(1.1, b.w * 0.008), color: rgba('ink', 0.85 * a), amp: 1.0, taper: false });
    s.stroke([v2(tx, yt), v2(tx, b.y + b.h * 0.06)], sd + 2, { w: Math.max(1, b.w * 0.006), color: rgba('graphite', 0.45 * a), amp: 1.0, taper: false });

    for (let i = 0; i < 3; i++) {
      const u = 0.26 + i * 0.26;
      const y = lerp(yb, yt, u);
      const bh = b.h * 0.036, bw = b.w * 0.04;
      s.rect(tx - bw, y - bh, tx + bw, y + bh, sd + 10 + i, { w: Math.max(1, b.w * 0.006), color: rgba('ink', 0.85 * a), amp: 1.2, taper: false });
      const al = b.w * (0.14 + hash(sd + i, 3) * 0.08);
      s.stroke([v2(tx - bw, y + 1), v2(tx - al * 0.6, y - b.h * 0.025), v2(tx - al, y - b.h * 0.055)], sd + 20 + i, { w: Math.max(1, b.w * 0.005), color: rgba('graphite', 0.6 * a), amp: 1.4, taper: false });
      s.stroke([v2(tx - bw, y + 2), v2(tx - al * 0.55, y + b.h * 0.055), v2(tx - al * 0.95, y + b.h * 0.10)], sd + 30 + i, { w: Math.max(1, b.w * 0.005), color: rgba('graphite', 0.48 * a), amp: 1.4, taper: false });
    }
    // at the top levels the tokens are written again, smaller, still legible
    if (level === 0) {
      s.letter('recursive', b.x + b.w * 0.52, lerp(yb, yt, 0.62), 20, sd + 40, { font: 'hscript', color: rgba('ink', 0.78 * a), w: 2.6 });
      s.letter('self-upgrade', b.x + b.w * 0.52, lerp(yb, yt, 0.32), 20, sd + 41, { font: 'hscript', color: rgba('ink', 0.78 * a), w: 2.6 });
    } else if (level === 1) {
      s.letter('self-upgrade', b.x + b.w * 0.52, lerp(yb, yt, 0.44), 11, sd + 42, { font: 'hscript', color: rgba('ink', 0.7 * a), w: 1.6 });
    }
  }

  /**
   * The readable distribution the last token was sampled from: a callout pasted to the right of the
   * token column, six continuations written in with their probabilities (the roads not taken, dim),
   * then the one that was drawn — priced — and the sample stamped onto the sung word.
   */
  private distribution(s: Sheet, loom: Node, t: number, out: number) {
    const t0 = loom.w.start, t1 = loom.w.end;
    const x0 = 1512, y0 = 316, x1 = 1812, y1 = 706;
    // the callout frame and its heading — a thing pasted onto the tree, not part of it
    s.rect(x0, y0, x1, y1, 700, { w: 2.6, color: rgba('ink', 0.52 * out), amp: 2.6, taper: false, overshoot: 5 });
    s.stroke([v2(x0 + 14, 362), v2(x1 - 14, 362)], 701, { w: 1.8, color: rgba('graphite', 0.5 * out), amp: 2.2, taper: false });
    s.letter('next token', x0 + 18, 352, 21, 702, { font: 'hscript', color: rgba('ink', 0.74 * out), w: 2.4 });
    s.text('p', x1 - 20, 352, { size: 17, fam: 'Plex-400', color: rgba('graphite', 0.7 * out), align: 'right' });

    // the roads not taken: written in one after another, then held, dim
    const rowY = 402, pitch = 37;
    for (let i = 0; i < NEXT.length; i++) {
      const [nm, p] = NEXT[i]!;
      const rp = clamp((t - (t0 - 0.34 + i * 0.1)) / 0.28);
      if (rp <= 0) continue;
      const y = rowY + i * pitch;
      s.letterWritten(nm, x0 + 18, y, 19, 710 + i * 3, rp, { font: 'readable', color: rgba('graphite', 0.66 * out), w: 1.7 });
      if (rp >= 1) s.letter(`.${p.toFixed(2).slice(2)}`, x1 - 20, y, 18, 715 + i * 3, { font: 'readable', color: rgba('graphite', 0.58 * out), align: 'right', w: 1.6 });
    }

    // the one that was drawn: named, priced, and marked
    const sp = clamp((t - (t1 - 0.14)) / 0.34);
    if (sp <= 0) return;
    const ty = rowY + NEXT.length * pitch + 14;
    s.stroke([v2(x0 + 14, ty - 34), v2(x1 - 14, ty - 34)], 740, { w: 1.6, color: rgba('signal', 0.42 * out * sp), amp: 2.0, taper: false });
    s.letterWritten('Loom', x0 + 18, ty, 33, 741, clamp(sp * 1.7), { font: 'script', color: rgba('signal', out) });
    if (sp >= 0.5) s.letter(`.${LOOM_P.toFixed(2).slice(2)}`, x1 - 20, ty, 21, 742, { font: 'readable', color: rgba('signal', out), align: 'right', w: 2.0 });

    // and the sample itself: a pointer that runs out of the list and stamps the sung word
    const smp = clamp((t - (t1 - 0.02)) / 0.3);
    if (smp > 0) {
      const mx = 1406, my = 622;
      s.fill([v2(mx, my - 9), v2(mx, my + 9), v2(mx + 15, my)], 744, rgba('signal', 0.9 * out * smp), { amp: 1.0 });
      s.letterWritten('SAMPLED', mx + 22, my + 8, 22, 745, clamp((smp - 0.25) / 0.75), { font: 'readable', color: rgba('signal', out), w: 2.2 });
    }
  }
}

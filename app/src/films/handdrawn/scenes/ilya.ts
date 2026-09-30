// Plate 21 — "What did Ilya see? We'll never know"
// A room in pale ink line: a desk, a chair pulled out, a laptop. The camera circles round from behind
// the lid — wearing its stickers, a third dimmer than the room: the mask, the unicorn, and the words —
// to the front, where the screen is the only filled shape on the sheet (the paper left clean inside a
// hatch-free region, never a glow). Then the lid is pushed shut, one sung word at a time, "know" is
// served its own WITHHELD bar, and the film cuts to an empty theatre whose seam's light dies onto the
// spark at the frame centre — the spark the outro detonates.
import { InkedScene, Sheet, rgba, v2, W, H, clamp, lerp, ease, noise1, heldT, TAU } from './_ink';
import type { V2, InkOpts } from './_ink';
import { Lyrics, type Line, type Word } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

type V3 = { x: number; y: number; z: number };
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
const sub3 = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross3 = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const unit3 = (a: V3): V3 => { const L = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / L, y: a.y / L, z: a.z / L }; };

// the room, in world units (y up, the desk surface at y = 0)
const FLOOR_Y = -72;
const DESK_X = 420, DESK_Z0 = -150, DESK_Z1 = 290, DESK_T = 26;
const LID_W = 300, LID_H = 190;
const FOCAL = 900;

export default class Ilya extends InkedScene {
  private line1: Line | null = null;
  private line2: Line | null = null;

  // camera basis
  private cpos = v3(0, 190, 640);
  private fwd = v3(0, 0, -1);
  private rgt = v3(1, 0, 0);
  private up = v3(0, 1, 0);
  // the lid
  private hinge = v3(0, 2, -30);
  private dir = v3(0, 1, 0);

  private get l1(): Line {
    if (!this.line1) this.line1 = this.ctx.lyrics.get('What did Ilya');
    return this.line1;
  }
  private get l2(): Line {
    if (!this.line2) this.line2 = this.ctx.lyrics.get('Was it all for show?');
    return this.line2;
  }

  /** The word whose letters match `tok`, else the word at `fallback` — clamped, so a lyric edit cannot crash. */
  private wordAt(words: Word[], tok: string, fallback: number): Word | null {
    const q = tok.toLowerCase().replace(/[^a-z]/g, '');
    for (const w of words) if (w.w.toLowerCase().replace(/[^a-z]/g, '') === q) return w;
    return words[Math.min(fallback, Math.max(0, words.length - 1))] ?? null;
  }

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t;
    if (t < 136.96) return this.room(s, f);
    return this.theatre(s, f);
  }

  // ------------------------------------------------------------------ the room
  private room(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, ht = heldT(t);
    const kick = f.a.kick, snare = f.a.snare;

    // ---- the camera: it circles from behind the lid to the front, then the lid is pushed shut
    const whip = ease.inOutCubic(clamp((t - 132.42) / 0.62));
    const yaw = Math.PI * (1 - whip) - 0.14 * ease.inOutCubic(clamp((t - 133.2) / 2.6));
    const dist = lerp(700, 640, whip) * lerp(1, 0.86, ease.inOutCubic(clamp((t - 133.4) / 3.2)));
    const hgt = lerp(168, 196, whip) + 20 * ease.inOutCubic(clamp((t - 133.4) / 3.2));
    this.setCam3(yaw, dist, hgt, lerp(78, 92, whip), lerp(18, -12, whip));

    // the sheet's own transform: a slow drift, quantised to the drawing
    const dz = 1.02 + 0.05 * noise1(ht * 0.23, 5);
    s.setCam(960 + noise1(ht * 0.29, 11) * 8, 540 + noise1(ht * 0.26, 13) * 7, dz, 0.004 * noise1(ht * 0.2, 17));

    // ---- the lid angle: open at the start, pushed down word by word on "We'll never know".
    // The words are looked up by token (not by a hard-coded index) so a lyric edit cannot crash the plate.
    const wds = this.l1.words;
    const wWell = this.wordAt(wds, "We'll", 4);
    const wNever = this.wordAt(wds, 'never', 5);
    const wKnow = this.wordAt(wds, 'know', 6);
    let q = 0;
    if (wWell) q = lerp(q, 0.30, clamp(Lyrics.wordProgress(wWell, t)));
    if (wNever) q = lerp(q, 0.64, clamp(Lyrics.wordProgress(wNever, t)));
    if (wKnow) q = lerp(q, 1.00, ease.inOutCubic(clamp(Lyrics.wordProgress(wKnow, t))));
    const theta = lerp(1.83, 0.13, q);
    this.dir = v3(0, Math.sin(theta), -Math.cos(theta));

    const a = clamp((t - f.start) / 0.5);   // the room draws itself in

    // ---- the floor: ruled boards, darkening toward the wall, clean where the screen spills
    const floorInk = rgba('ink2', 0.4 * a);
    for (let i = -8; i <= 8; i++) {
      const z = i * 100;
      this.line3(s, [v3(-1800, FLOOR_Y, z), v3(1800, FLOOR_Y, z)], 400 + i, { w: 2.0, color: floorInk, amp: 1.6, taper: false });
    }
    for (let i = -4; i <= 4; i++) {
      const x = i * 400;
      this.line3(s, [v3(x, FLOOR_Y, -820), v3(x, FLOOR_Y, 880)], 430 + i, { w: 2.0, color: rgba('ink2', 0.26 * a), amp: 1.6, taper: false });
    }
    // the shadow at the back of the room: hatched. The paper left clean in front of it is the light.
    const back = this.poly3([v3(-1800, FLOOR_Y, -820), v3(1800, FLOOR_Y, -820), v3(1800, FLOOR_Y, -560), v3(-1800, FLOOR_Y, -560)]);
    if (back) s.hatch(back, 460, { spacing: 13, angle: -1.15, color: rgba('ink', 0.3 * a), w: 1.3 });
    const back2 = this.poly3([v3(-1800, FLOOR_Y, -560), v3(1800, FLOOR_Y, -560), v3(1800, FLOOR_Y, -400), v3(-1800, FLOOR_Y, -400)]);
    if (back2) s.hatch(back2, 461, { spacing: 24, angle: -1.15, color: rgba('ink', 0.22 * a), w: 1.3 });

    // ---- depth: whichever of the two groups is further away is drawn first
    // the stickers live on the back of the lid, so they go as the camera comes round
    const stickA = clamp((yaw / Math.PI - 0.52) / 0.22);
    const zDesk = this.zOf(v3(0, 20, 40));
    const zChair = this.zOf(v3(140, 40, -400));
    const chair = () => this.chair(s, a);
    const desk = () => { this.desk(s, a, q, stickA, t, kick); };
    if (zChair > zDesk) { chair(); desk(); } else { desk(); chair(); }

    // ---- the lyric, in a clean band at the foot of the sheet
    s.fill([v2(250, 926), v2(1670, 926), v2(1670, 1030), v2(250, 1030)], 480, rgba('paper', 0.86), { amp: 2.4 });
    const baseY = 986;
    const row = this.writeRow(s, wds, 960, baseY, 46, t, ht, 700);
    const lp = clamp(Lyrics.lineCharProgress(this.l1, t) / this.l1.text.length);
    if (lp > 0.02) {
      s.stroke([v2(row.x0 - 10, baseY + 26), v2(row.x0 - 10 + (row.total + 20) * lp, baseY + 26)], 760, { w: 2.8, color: rgba('signal', 0.75), amp: 2.6, overshoot: 5 });
    }
    // "know" gets its own WITHHELD bar, drawn across the word as the lid comes down on it
    const knowCell = wKnow ? row.cells[wds.indexOf(wKnow)] : undefined;
    const held = clamp((q - 0.82) / 0.18);
    if (knowCell && held > 0.02) this.withheld(s, knowCell.x, knowCell.w, baseY, held);
    s.text('21 — ILYA', 96, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9) });
    s.text(`d${d}`, W - 118, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55) });

    // the whip is fast enough to shake the drawing on its way round
    const wv = clamp((t - 132.42) / 0.62);
    const sh = wv > 0 && wv < 1 ? Math.sin(wv * Math.PI) : 0;
    return { flash: 0.03 * snare, zoom: 1 + 0.004 * kick, shake: [sh * 9 * noise1(d * 1.7, 21), sh * 4 * noise1(d * 2.3, 23)] };
  }

  /** The desk group: the slab, the deck of the laptop, and on it the lid. */
  private desk(s: Sheet, a: number, q: number, stickA: number, t: number, kick: number) {
    const ink = (k: number) => rgba('ink2', k * a);
    // the slab
    this.quad3(s, [v3(-DESK_X, 0, DESK_Z0), v3(DESK_X, 0, DESK_Z0), v3(DESK_X, 0, DESK_Z1), v3(-DESK_X, 0, DESK_Z1)], 100, { w: 3.0, color: ink(0.85), amp: 1.8 });
    this.line3(s, [v3(-DESK_X, 0, DESK_Z1), v3(-DESK_X, -DESK_T, DESK_Z1), v3(DESK_X, -DESK_T, DESK_Z1), v3(DESK_X, 0, DESK_Z1)], 101, { w: 3.0, color: ink(0.85), amp: 1.8 });
    for (const sx of [-DESK_X, DESK_X]) {
      this.line3(s, [v3(sx, -DESK_T, DESK_Z1), v3(sx, 0, DESK_Z1)], 102, { w: 2.6, color: ink(0.8), amp: 1.6, taper: false });
      for (const lz of [DESK_Z0 + 40, DESK_Z1 - 40]) {
        this.line3(s, [v3(sx * 0.94, -DESK_T, lz), v3(sx * 0.94, FLOOR_Y, lz)], 103, { w: 2.6, color: ink(0.7), amp: 1.6 });
      }
    }
    // the light that got away, on the desk top: a clean patch inside light hatching
    const top = this.poly3([v3(-DESK_X, 0, DESK_Z0), v3(DESK_X, 0, DESK_Z0), v3(DESK_X, 0, DESK_Z1), v3(-DESK_X, 0, DESK_Z1)]);
    if (top) s.hatch(top, 104, { spacing: 22, angle: -1.2, color: rgba('ink', 0.16 * a), w: 1.2 });
    const spill = this.poly3([v3(-330, 0, 60), v3(330, 0, 60), v3(430, 0, 300), v3(-430, 0, 300)]);
    if (spill) s.fill(spill, 105, rgba('paper', 0.8 * a), { amp: 2.2 });

    // the deck of the laptop
    this.quad3(s, [v3(-150, 12, -40), v3(150, 12, -40), v3(150, 12, 150), v3(-150, 12, 150)], 110, { w: 2.8, color: ink(0.9), amp: 1.6 });
    this.line3(s, [v3(-150, 12, 150), v3(-150, 0, 150), v3(150, 0, 150), v3(150, 12, 150)], 111, { w: 2.6, color: ink(0.85), amp: 1.6 });
    for (let k = 1; k <= 4; k++) {
      const z = -10 + k * 22;
      this.line3(s, [v3(-118, 12, z), v3(118, 12, z)], 112 + k, { w: 1.7, color: rgba('graphite', 0.55 * a), amp: 1.4, taper: false });
    }
    this.quad3(s, [v3(-46, 12, 112), v3(46, 12, 112), v3(46, 12, 142), v3(-46, 12, 142)], 118, { w: 1.7, color: rgba('graphite', 0.55 * a), amp: 1.4 });

    // the lid: from behind we see its back and the stickers, from the front the screen
    const top2 = this.lidPt(0, LID_H, false);
    this.quad3(s, [v3(-LID_W / 2, 2, -30), v3(LID_W / 2, 2, -30), v3(LID_W / 2, top2.y, top2.z), v3(-LID_W / 2, top2.y, top2.z)], 120, { w: 3.0, color: ink(0.9), amp: 1.8 });

    if (stickA > 0.01) this.stickers(s, stickA, a);

    // the screen: the only filled shape in the room, with the paper left clean around it
    const sB = 6 + (LID_H - 12) * clamp(1 - q * 1.04, 0.012, 1);
    const scr = this.poly3([this.lidPt(-140, 6, false), this.lidPt(140, 6, false), this.lidPt(140, sB, false), this.lidPt(-140, sB, false)]);
    const halo = this.poly3([this.lidPt(-152, 0, false), this.lidPt(152, 0, false), this.lidPt(152, Math.min(LID_H, sB + 14), false), this.lidPt(-152, Math.min(LID_H, sB + 14), false)]);
    if (halo) s.fill(halo, 130, rgba('ember', 0.11 + 0.15 * kick), { amp: 2.2 });
    if (scr) {
      s.fill(scr, 131, rgba('paper', 1), { amp: 1.8 });
      s.stroke(scr, 132, { w: 2.2, color: rgba('signal', 0.85), amp: 1.6, taper: false, closed: true });
    }

    // "What did Ilya see?": the screen is redacted, and then the lid starts to come down
    const red = ease.inOutCubic(clamp((t - 132.86) / 0.42)) * clamp(1 - q * 1.1);
    if (red > 0.01) {
      const cut = clamp(1 - red) * 280;
      const rr = this.poly3([this.lidPt(-140 + cut, 8, false), this.lidPt(140, 8, false), this.lidPt(140, sB - 2, false), this.lidPt(-140 + cut, sB - 2, false)]);
      if (rr) s.hatch(rr, 140, { spacing: 6.5, angle: -1.05, color: rgba('ink', 0.6 * red), w: 1.6 });
      // a bar across it, hand-lettered, so the answer is officially not there
      const b0 = this.p2(this.lidPt(-124, 74, false));
      const b1 = this.p2(this.lidPt(124, 74, false));
      const bar = this.poly3([this.lidPt(-124, 74, false), this.lidPt(124, 74, false), this.lidPt(124, 116, false), this.lidPt(-124, 116, false)]);
      if (bar) s.fill(bar, 141, rgba('ink', clamp(red * 1.6 - 0.6)), { amp: 2.0 });
      if (b0 && b1) {
        const len = Math.hypot(b1.x - b0.x, b1.y - b0.y);
        const sz = clamp(len / 8.2, 9, 46);
        const ang = Math.atan2(b1.y - b0.y, b1.x - b0.x);
        const shown = clamp(red * 2.4 - 1.4);
        if (shown > 0) {
          s.letterWritten('redacted', (b0.x + b1.x) / 2, (b0.y + b1.y) / 2 + sz * 0.34, sz, 150, shown,
            { font: 'readable', color: rgba('paper', 0.95), w: sz * 0.085, align: 'center', rot: ang });
        }
      }
    }
    // and the last of the light: the strip narrows to a slit, then to a small dot
    if (q > 0.6 && scr) {
      const dot = this.p2(this.lidPt(0, sB * 0.5, false));
      const vis = clamp((q - 0.6) / 0.4);
      if (dot) s.blob(dot.x, dot.y, 5 + 14 * vis, 165, { colour: rgba('ember', 0.85 * vis), jag: 0.22, n: 12, outline: { w: 0 } });
    }
  }

  /** The chair, pulled out behind the desk. */
  private chair(s: Sheet, a: number) {
    const ink = (k: number) => rgba('ink2', k * a);
    const x0 = -40, x1 = 220, z0 = -470, z1 = -300;
    this.quad3(s, [v3(x0, 34, z0), v3(x1, 34, z0), v3(x1, 34, z1), v3(x0, 34, z1)], 200, { w: 2.6, color: ink(0.8), amp: 1.6 });
    this.line3(s, [v3(x0, 34, z1), v3(x0, 26, z1), v3(x1, 26, z1), v3(x1, 34, z1)], 201, { w: 2.4, color: ink(0.75), amp: 1.6 });
    // the back
    this.line3(s, [v3(x0, 34, z0), v3(x0, 196, z0), v3(x1, 196, z0), v3(x1, 34, z0)], 202, { w: 2.8, color: ink(0.85), amp: 1.8 });
    this.line3(s, [v3(x0 + 34, 44, z0 - 18), v3(x0 + 34, 186, z0 - 18)], 203, { w: 2.0, color: rgba('graphite', 0.5 * a), amp: 1.6, taper: false });
    this.line3(s, [v3(x1 - 34, 44, z0 - 18), v3(x1 - 34, 186, z0 - 18)], 204, { w: 2.0, color: rgba('graphite', 0.5 * a), amp: 1.6, taper: false });
    for (const [lx, lz] of [[x0 + 14, z0 + 20], [x1 - 14, z0 + 20], [x0 + 14, z1 - 20], [x1 - 14, z1 - 20]]) {
      this.line3(s, [v3(lx!, 26, lz!), v3(lx!, FLOOR_Y, lz!)], 205, { w: 2.4, color: ink(0.7), amp: 1.6 });
    }
  }

  /** The lid's back: the treatment's sticker set — the mask, the unicorn, and tiny words — a third dimmer than the room. */
  private stickers(s: Sheet, al: number, a: number) {
    const self = this;
    const dim = 0.66 * al * a;   // rev 5: the stickers stay a third under the room's linework
    const ink = (k: number) => rgba('ink', k * dim);
    // a bland disc with a face: the mask the film keeps meeting again
    const cx = -80, cy = 124, r = 27;
    const ring: V2[] = [];
    for (let i = 0; i < 20; i++) {
      const an = (i / 20) * TAU;
      const q = self.lid2(cx + Math.cos(an) * r, cy + Math.sin(an) * r, true);
      if (q) ring.push(q);
    }
    if (ring.length === 20) {
      s.fill(ring, 300, rgba('ember', 0.85 * dim), { amp: 1.4 });
      s.stroke(ring, 301, { w: 2.4, color: ink(0.8), amp: 1.4, taper: false, closed: true });
      for (const ex of [-9, 9]) {
        const e = self.lid2(cx + ex, cy - 6, true);
        if (e) s.fill([v2(e.x - 2.4, e.y - 2.4), v2(e.x + 2.4, e.y - 2.4), v2(e.x + 2.4, e.y + 2.4), v2(e.x - 2.4, e.y + 2.4)], 302, ink(0.85));
      }
      const smile: V2[] = [];
      for (let i = 0; i <= 8; i++) {
        const an = lerp(0.5, 2.6, i / 8);
        const q = self.lid2(cx + Math.cos(an) * 14, cy + 6 + Math.sin(an) * 10, true);
        if (q) smile.push(q);
      }
      if (smile.length === 9) s.stroke(smile, 303, { w: 2.2, color: ink(0.8), amp: 1.2, taper: false });
    }
    // the TikZ unicorn: body, four legs, a neck, a horn, a tail
    const U = (pts: [number, number][]) => self.lidPath(pts.map(([x, y]) => [x + 34, y + 96] as [number, number]), true);
    s.stroke(U([[-34, 6], [-28, -14], [-6, -22], [18, -18], [30, -4], [26, 12], [4, 18], [-22, 16], [-34, 6]]), 310, { w: 2.2, color: ink(0.75), amp: 1.2, taper: false, closed: true });
    s.stroke(U([[-22, 16], [-24, 36]]), 311, { w: 2.0, color: ink(0.75), amp: 1.2, taper: false });
    s.stroke(U([[-6, 18], [-8, 38]]), 312, { w: 2.0, color: ink(0.75), amp: 1.2, taper: false });
    s.stroke(U([[10, 17], [12, 36]]), 313, { w: 2.0, color: ink(0.75), amp: 1.2, taper: false });
    s.stroke(U([[24, 12], [28, 34]]), 314, { w: 2.0, color: ink(0.75), amp: 1.2, taper: false });
    s.stroke(U([[22, -16], [34, -34], [48, -40], [50, -30], [40, -26], [30, -6]]), 315, { w: 2.2, color: ink(0.75), amp: 1.2, taper: false });
    s.stroke(U([[36, -36], [40, -58], [46, -36]]), 316, { w: 2.2, color: rgba('signal', 0.85 * dim), amp: 1.2, taper: false });
    s.stroke(U([[-34, 2], [-48, 10], [-44, 24]]), 317, { w: 2.0, color: ink(0.75), amp: 1.2, taper: false });
    const eye = self.lid2(44, -32, true);
    if (eye) s.fill([v2(eye.x - 1.6, eye.y - 1.6), v2(eye.x + 1.6, eye.y - 1.6), v2(eye.x + 1.6, eye.y + 1.6), v2(eye.x - 1.6, eye.y + 1.6)], 318, ink(0.8));
    // the words, stuck on at angles: the treatment's set, tiny but legible at this size
    const words: [string, number, number, number][] = [
      ['FEEL THE AGI', -136, 64, 14],
      ['SLIGHTLY CONSCIOUS', -60, 176, 11],
      ['Q*', 112, 150, 22],
      ['attention is all', -132, 30, 10],
      ['you need', -132, 14, 10],
    ];
    for (let i = 0; i < words.length; i++) {
      const [w, ax, ay, sz] = words[i]!;
      const p1 = self.lid2(ax, ay, true), p2b = self.lid2(ax + 14, ay, true);
      if (p1 && p2b) s.letter(w, p1.x, p1.y, sz, 320 + i, { font: 'hscript', color: ink(0.8), rot: Math.atan2(p2b.y - p1.y, p2b.x - p1.x), w: sz * 0.1 });
    }
  }

  // ------------------------------------------------------------------ the theatre
  private theatre(s: Sheet, f: Frame): PostOverrides {
    const t = f.t, d = s.d, ht = heldT(t);
    const kick = f.a.kick, snare = f.a.snare;
    const enter = clamp((t - 136.96) / 0.4);
    s.setCam(960 + noise1(ht * 0.27, 31) * 6, 540 + noise1(ht * 0.24, 33) * 5, 1.0 + 0.03 * ease.inOutCubic(clamp((t - 137.0) / 3.0)), 0.003 * noise1(ht * 0.2, 37));

    const SL = 430, SR = 1490, ST = 330, SB = 900;
    const ink = (k: number) => rgba('ink2', k * enter);

    // the proscenium, and the frieze the question is written on
    s.rect(356, 246, 1564, 934, 800, { w: 4.0, color: ink(0.85), amp: 2.6, taper: false });
    s.rect(430, 330, 1490, 900, 801, { w: 2.6, color: ink(0.7), amp: 2.4, taper: false });
    s.stroke([v2(356, 330), v2(1564, 330)], 802, { w: 2.2, color: ink(0.6), amp: 2.4, taper: false });
    s.stroke([v2(356, 258), v2(1564, 258)], 803, { w: 1.8, color: rgba('graphite', 0.45 * enter), amp: 2.4, taper: false });
    // the crest above it
    s.fill([v2(934, 208), v2(986, 208), v2(998, 246), v2(922, 246)], 804, rgba('paper', 0.9 * enter), { amp: 2.0 });
    s.stroke([v2(934, 208), v2(986, 208), v2(998, 246), v2(922, 246)], 804, { w: 2.4, color: ink(0.8), amp: 2.2, closed: true, taper: false });

    // the stage: dark, except the beam and the pool it lands on, which are clean paper
    s.hatch([v2(SL, ST), v2(SR, ST), v2(SR, SB), v2(SL, SB)], 810, { spacing: 17, angle: -1.2, color: rgba('ink', 0.34 * enter), w: 1.5 });
    const cone = [v2(938, 384), v2(982, 384), v2(1330, 792), v2(590, 792)];
    s.fill(cone, 811, rgba('paper', 0.95 * enter), { amp: 2.6 });
    s.stroke([v2(938, 384), v2(590, 792)], 812, { w: 2.0, color: rgba('signal', 0.4 * enter), amp: 2.4, taper: false });
    s.stroke([v2(982, 384), v2(1330, 792)], 813, { w: 2.0, color: rgba('signal', 0.4 * enter), amp: 2.4, taper: false });

    // the curtains: two big hatched panels sliding in, the light of their seam collapsing onto the
    // spark that waits at the frame centre — the same spark the outro detonates
    const cv = ease.inOutCubic(clamp((t - 138.95) / 1.15));
    const g = lerp(1060, 0, cv);
    const poolRy = lerp(206, 3, Math.pow(cv, 1.5));
    const CY = 540;   // the frame centre: where the seam's light dies and the outro's spark is born
    const pool: V2[] = [];
    for (let i = 0; i < 24; i++) {
      const an = (i / 24) * TAU;
      pool.push(v2(960 + Math.cos(an) * (g / 2), CY + Math.sin(an) * poolRy));
    }
    s.fill(pool, 820, rgba('paper', 0.96 * enter), { amp: 2.0 });
    s.stroke(pool, 821, { w: 2.0, color: rgba('signal', 0.5 * enter), amp: 2.0, taper: false, closed: true });

    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 306 : 960 + g / 2;
      const x1 = side < 0 ? 960 - g / 2 : 1614;
      const quad = [v2(x0, 334), v2(x1, 334), v2(x1, 916), v2(x0, 916)];
      s.hatch(quad, 830 + (side < 0 ? 0 : 1), { spacing: 10, angle: -1.22, color: rgba('blood', 0.5 * enter), w: 1.6 });
      s.stroke(quad, 832 + (side < 0 ? 0 : 1), { w: 3.0, color: rgba('ink', 0.7 * enter), amp: 2.4, taper: false, closed: true });
      // folds
      for (let k = 1; k <= 3; k++) {
        const xf = lerp(x0, x1, k / 4);
        s.stroke([v2(xf, 338), v2(xf + noise1(k + d * 0.2, 41) * 6, 912)], 840 + k, { w: 2.0, color: rgba('ink', 0.3 * enter), amp: 2.2, taper: false });
      }
    }
    // the valance across the top of the opening: a scalloped swag, hung below the frieze
    s.fill([v2(SL - 30, 330), v2(SR + 30, 330), v2(SR + 30, 378), v2(SL - 30, 378)], 850, rgba('paper', 0.92 * enter), { amp: 2.2 });
    for (let i = 0; i < 6; i++) {
      const x0 = lerp(SL - 30, SR + 30, i / 6), x1 = lerp(SL - 30, SR + 30, (i + 1) / 6);
      const pts: V2[] = [];
      for (let k = 0; k <= 7; k++) {
        const u = k / 7;
        pts.push(v2(lerp(x0, x1, u), 378 + Math.sin(u * Math.PI) * 32));
      }
      s.stroke(pts, 851 + i, { w: 2.4, color: rgba('blood', 0.6 * enter), amp: 2.2, taper: false });
    }

    // the seats, closer than the stage: repeated short strokes, getting bigger toward us
    for (let r = 0; r < 5; r++) {
      const yy = 906 + r * 33;
      const n = 15 - r;
      for (let i = 0; i <= n; i++) {
        const x = 300 + (1320 / n) * i;
        const hgt = 16 + r * 5;
        s.stroke([v2(x, yy), v2(x, yy - hgt)], 860 + r * 20 + i, { w: 2.6 + r * 0.4, color: rgba('ink', 0.62 * enter), amp: 2.0, taper: false });
      }
      s.stroke([v2(280, yy), v2(1640, yy)], 870 + r, { w: 1.8, color: rgba('ink2', 0.4 * enter), amp: 2.4, taper: false });
    }

    // the question, written on the frieze. The plate is cut before "show?" is sung out, so this line's
    // last stroke is compressed to finish exactly at the cut: it begins with the voice, never early.
    this.writeRow(s, this.l2.words, 960, 318, 54, t, ht, 900, (w, tt) => {
      const pk = Lyrics.wordProgress(w, f.end);
      return pk < 1 ? clamp(Lyrics.wordProgress(w, tt) / Math.max(1e-3, pk)) : Lyrics.wordProgress(w, tt);
    });
    // the last of the light: it closes onto the spark at the frame centre and STAYS there — a live
    // ember and a hairline, so the outro picks the spark up where this plate left it
    if (cv > 0.86) {
      const spark = clamp((cv - 0.86) / 0.14);
      s.blob(960, CY, lerp(26, 5.5, spark), 880, { colour: rgba('ember', 0.95 * enter), jag: 0.15, n: 12, outline: { w: 0 } });
      s.stroke([v2(960, CY - lerp(26, 11, spark)), v2(960, CY + lerp(26, 11, spark))], 881, { w: 1.6, color: rgba('signal', 0.7 * enter * spark), amp: 1.4, taper: false });
    }
    s.text('21 — ILYA', 96, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.9 * enter) });
    s.text(`d${d}`, W - 118, 1004, { size: 19, fam: 'Plex-400', color: rgba('graphite', 0.55 * enter) });
    return { flash: 0.03 * snare, zoom: 1 + 0.003 * kick };
  }

  // ------------------------------------------------------------------ lyric
  /**
   * A row of hand-lettered words, centred, written as they are sung, with an under-rule.
   * `warp` (optional) remaps a word's progress — the last line needs it where the plate cuts mid-word.
   */
  private writeRow(s: Sheet, words: Word[], cx: number, baseY: number, size: number, t: number, ht: number, seed0: number, warp?: (w: Word, t: number) => number) {
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const gap = size * 0.34;
    const total = widths.reduce((x, y) => x + y, 0) + gap * Math.max(0, words.length - 1);
    const x0 = cx - total / 2;
    let x = x0;
    const cells: { x: number; w: number }[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = clamp(warp ? warp(w, t) : Lyrics.wordProgress(w, t));
      cells.push({ x, w: widths[i]! });
      const sway = noise1(ht * 0.9 + i * 1.7, 55) * 3.2;
      if (p < 1) s.letterWritten(w.w, x, baseY + sway, size, seed0 + i * 3, 1, { font: 'readable', ghost: true });
      s.letterWritten(w.w, x, baseY + sway, size, seed0 + i * 3, p, { font: 'readable', color: p >= 1 ? rgba('ink') : rgba('signal'), w: size * 0.085 });
      x += widths[i]! + gap;
    }
    return { total, x0, cells };
  }

  /** The WITHHELD bar: a censored block that slides across the sung word as the lid reaches full. */
  private withheld(s: Sheet, wx: number, ww: number, baseY: number, p: number) {
    const x0 = wx - 14, x1 = wx + ww + 14;
    const y0 = baseY - 44, y1 = baseY + 16;
    const bx0 = lerp(x1, x0, ease.outCubic(clamp(p * 1.25)));
    s.fill([v2(bx0, y0), v2(x1, y0), v2(x1, y1), v2(bx0, y1)], 900, rgba('ink', 0.92 * p), { amp: 2.2 });
    s.stroke([v2(bx0, y0), v2(x1, y0), v2(x1, y1), v2(bx0, y1)], 901, { w: 2.6, color: rgba('ink', 0.9 * p), amp: 2.0, taper: false, closed: true });
    const wp = clamp((p - 0.45) / 0.55);
    if (wp > 0) {
      const sz = 30;
      s.letterWritten('WITHHELD', (bx0 + x1) / 2, baseY + 4, sz, 902, wp, { font: 'readable', color: rgba('paper', 0.96 * p), w: sz * 0.09, align: 'center' });
    }
  }

  // ------------------------------------------------------------------ the little 3D
  private setCam3(yaw: number, dist: number, hgt: number, aimY: number, aimZ: number) {
    this.cpos = v3(dist * Math.sin(yaw), hgt, dist * Math.cos(yaw));
    const f = unit3(sub3(v3(0, aimY, aimZ), this.cpos));
    this.fwd = f;
    this.rgt = unit3(cross3(f, v3(0, 1, 0)));
    this.up = cross3(this.rgt, f);
  }
  private p2(p: V3): V2 | null {
    const dx = p.x - this.cpos.x, dy = p.y - this.cpos.y, dz = p.z - this.cpos.z;
    const zc = dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z;
    if (zc < 60) return null;
    const s = FOCAL / zc;
    return v2(960 + (dx * this.rgt.x + dy * this.rgt.y + dz * this.rgt.z) * s, 540 - (dx * this.up.x + dy * this.up.y + dz * this.up.z) * s);
  }
  private zOf(p: V3) { return sub3(p, this.cpos).x * this.fwd.x + sub3(p, this.cpos).y * this.fwd.y + sub3(p, this.cpos).z * this.fwd.z; }
  private poly3(pts: V3[]): V2[] | null {
    const out: V2[] = [];
    for (const p of pts) { const q = this.p2(p); if (!q) return null; out.push(q); }
    return out;
  }
  private line3(s: Sheet, pts: V3[], seed: number, o: InkOpts) {
    const q = this.poly3(pts);
    if (q) s.stroke(q, seed, o);
  }
  private quad3(s: Sheet, pts: V3[], seed: number, o: InkOpts) {
    const q = this.poly3(pts);
    if (q) s.stroke(q, seed, { ...o, closed: true });
  }
  /** A point on the lid, in the lid's own plane. `back` flips u so the back face reads the right way round. */
  private lidPt(a: number, b: number, back: boolean): V3 {
    const ux = back ? -1 : 1;
    return v3(this.hinge.x + ux * a, this.hinge.y + this.dir.y * b, this.hinge.z + this.dir.z * b);
  }
  private lid2(a: number, b: number, back: boolean): V2 | null { return this.p2(this.lidPt(a, b, back)); }
  private lidPath(locals: [number, number][], back: boolean): V2[] {
    const out: V2[] = [];
    for (const [a, b] of locals) { const q = this.lid2(a, b, back); if (!q) return []; out.push(q); }
    return out;
  }
}

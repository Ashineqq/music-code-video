// The hand-drawn layer for *The Nights*: the same cel machinery as the P(doom) re-shoot (paper, wobbling
// ink, flat fills, hand lettering, exposure on twos), with this song's palette — a storybook of warm
// pages that keep turning into night, one lantern for the signal, stars for the chorus.
//
// RULE 1 — EXPOSURE ON TWOS. Hand-drawn animation is not drawn 60 times a second; it is drawn 12 times
//   a second and each drawing is held for 2 frames ("on twos"). Everything that moves or wobbles must
//   therefore be a function of the DRAWING INDEX, not of time:
//       const d = drawing(f.t)        // = floor(frameIdx(t) / 2)
//   frameIdx() is constant across a frame's whole motion-blur shutter, so a drawing stays one drawing
//   in the export too. Using t directly here would smear every line into several lines per frame.
//
// RULE 2 — NOTHING IS EVER MECHANICALLY STILL. Every outline is re-drawn for each new drawing, so it
//   boils slightly even when the subject is not moving. That is the single most recognisable trait of
//   hand-drawn animation, and it costs nothing: pass the drawing index as the wobble seed.
//
// Everything is drawn into one Canvas2D layer (flat cel fills + ink outlines), over a paper pass.
// There is no additive glow anywhere: cel animation is flat.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../../engine/gl';
import { strokeText, type StrokeFontName } from '../../../engine/stroke';
import { clamp, lerp, ease, prog, noise1, hash, frameIdx, TAU } from '../../../engine/util';
import { hexToLinear } from '../../../engine/util';

export { W, H, clamp, lerp, ease, prog, noise1, hash, TAU };
export type V2 = { x: number; y: number };
export const v2 = (x = 0, y = 0): V2 => ({ x, y });

// ------------------------------------------------------------------ palette
/**
 * The palette: a warm page by day, a deep night sky by chorus, one lantern for the signal colour.
 * Deliberately small, and the only colours allowed anywhere in the film (the gate checks).
 */
export const HEX = {
  paper: '#F3EAD9',   // the page, in daylight
  paper2: '#E7DAC2',  // second paper tone (hatching fills)
  shade: '#C7B590',   // third tone: shadow under a fold
  night: '#141C33',   // the sky the pages turn into
  night2: '#232F4E',  // one step up from it (distant hills, cloud mass)
  ink: '#191612',     // every outline
  graphite: '#6A6152',// secondary lines, far things
  lantern: '#F2A03C', // THE signal: the father's lamp, the fire, a warm star
  star: '#FBF6E6',    // starlight, moonlight, the page's brightest note
  cool: '#3E5C86',    // cold fills inside the night
  rose: '#C0523F',    // the warm memory red — used in exactly two places (the "never die" beats)
} as const;
export type InKey = keyof typeof HEX;
export function rgba(k: InKey, a = 1): string {
  const n = parseInt(HEX[k].slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const lin = (k: InKey) => hexToLinear(HEX[k]);
const v3 = (c: number[]) => `vec3(${c.map((x) => x.toFixed(5)).join(', ')})`;

// ------------------------------------------------------------------ exposure clock
/** Drawings per second. 12 = "on twos" at 24 fps, the classic rate; the export is 60 fps. */
export const DRAWINGS_PER_SEC = 12;
/** The drawing index at time t — the seed for everything hand-made. See RULE 1. */
export const drawing = (t: number) => Math.floor(frameIdx(t) / 2);
/** Time quantised to the current drawing, for things that should step rather than slide. */
export const heldT = (t: number) => (frameIdx(t) - (frameIdx(t) % 2)) / 60;

// ------------------------------------------------------------------ wobble
/** Resample a polyline so every step is about `step` px long (wobble needs material to work with). */
export function resample(pts: V2[], step = 14, closed = false): V2[] {
  if (pts.length < 2) return pts.slice();
  const src = closed ? [...pts, pts[0]!] : pts;
  const out: V2[] = [src[0]!];
  for (let i = 0; i + 1 < src.length; i++) {
    const a = src[i]!, b = src[i + 1]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 1; k <= n; k++) out.push({ x: lerp(a.x, b.x, k / n), y: lerp(a.y, b.y, k / n) });
  }
  return out;
}

/**
 * The hand: displace a polyline along its normal with smooth noise seeded by the drawing index.
 * Re-rolled every drawing, so the line boils. `freq` is in cycles per 1000 px.
 */
export function wobble(pts: V2[], d: number, amp = 2.2, freq = 2.2, closed = false): V2[] {
  const P = resample(pts, 14, closed);
  const n = P.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p = P[i]!;
    const a = P[Math.max(0, i - 1)]!, b = P[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x, ty = b.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    tx /= L; ty /= L;
    // arc-length parameter so the wobble does not stretch with the segment length
    let s = 0;
    for (let k = 0; k < i; k++) s += Math.hypot(P[k + 1]!.x - P[k]!.x, P[k + 1]!.y - P[k]!.y);
    const u = s / 1000 * freq;
    const o1 = noise1(u + d * 7.31, d * 3 + 1);
    const o2 = noise1(u * 2.7 + d * 3.17, d * 5 + 2);
    const off = (o1 * 0.72 + o2 * 0.28) * amp;
    const along = noise1(u * 1.3 + d * 11.1, d * 9 + 4) * amp * 0.35;
    out.push({ x: p.x + -ty * off + tx * along, y: p.y + tx * off + ty * along });
  }
  return out;
}

// ------------------------------------------------------------------ stroke options
export interface InkOpts {
  /** line width in px */
  w?: number;
  color?: string;
  /** wobble amplitude / frequency */
  amp?: number;
  freq?: number;
  /** taper the ends (a lifted pen). Default true. */
  taper?: boolean;
  /** alpha */
  a?: number;
  /** draw as a loose under-drawing (thin, pale, no taper) */
  sketch?: boolean;
  closed?: boolean;
  /** over/undershoot the ends by this many px — hand lines rarely stop exactly on the mark */
  overshoot?: number;
}

// ------------------------------------------------------------------ the sheet
/**
 * One Canvas2D surface in sheet px (1920x1080, y down), drawn with a hand.
 * `begin()` must be called once per frame; the drawing index it is given seeds every wobble.
 */
export class Sheet {
  readonly layer = new Layer2D();
  d = 0;
  t = 0;
  /** camera: sheet-space point (cx,cy) at screen centre, zoom z, roll r (radians) */
  private cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };

  get c() { return this.layer.ctx; }

  /** Clear and start a new drawing. `seed` is the drawing index (see RULE 1). */
  begin(d: number, t: number) {
    this.d = d; this.t = t;
    // the camera is per-frame state: reset it so a plate that draws before calling setCam() gets the
    // default framing instead of the previous frame's (which would make the frame depend on history)
    this.cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
    this.layer.clear();
  }

  setCam(cx: number, cy: number, z = 1, roll = 0) { this.cam = { cx, cy, z, roll }; return this; }
  /** Put the context into sheet space with the camera applied. Called for you by `stroke`/`fill`. */
  private xf() {
    const c = this.c, k = this.cam;
    c.setTransform(k.z, 0, 0, k.z, W / 2, H / 2);
    c.translate(-k.cx, -k.cy);
    c.rotate(k.roll);
  }
  /** Inverse of the camera, for pinning UI to the screen while the drawing moves. */
  pin(x: number, y: number): V2 {
    const k = this.cam, cs = Math.cos(-k.roll), sn = Math.sin(-k.roll);
    const dx = x - W / 2, dy = y - H / 2;
    return { x: (dx * cs - dy * sn) / k.z + k.cx, y: (dx * sn + dy * cs) / k.z + k.cy };
  }

  private prep(o: InkOpts) {
    const c = this.c;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.globalAlpha = o.a ?? 1;
    c.strokeStyle = o.color ?? rgba('ink');
    c.lineWidth = o.w ?? (o.sketch ? 1.6 : 3.2);
    c.setLineDash([]);
  }

  /** A hand-drawn polyline (or closed outline). */
  stroke(pts: V2[], seed: number, o: InkOpts = {}) {
    if (pts.length < 2) return;
    const c = this.c;
    const amp = o.amp ?? (o.sketch ? 3.4 : 2.2);
    const freq = o.freq ?? (o.sketch ? 3.2 : 2.2);
    const closed = !!o.closed;
    let P = wobble(pts, this.d + seed, amp, freq, closed);
    if (closed) P = [...P, P[0]!];
    if (o.overshoot) {
      const a = P[0]!, b = P[1]!, y = P[P.length - 1]!, z = P[P.length - 2]!;
      const push = (p: V2, q: V2, k: number): V2 => {
        const L = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        return { x: p.x + (p.x - q.x) / L * k, y: p.y + (p.y - q.y) / L * k };
      };
      P = [push(a, b, o.overshoot), ...P, push(y, z, o.overshoot)];
    }
    this.xf();
    this.prep(o);
    const w0 = o.w ?? (o.sketch ? 1.6 : 3.2);
    const taper = o.taper ?? !o.sketch;
    if (!taper) {
      c.beginPath();
      c.moveTo(P[0]!.x, P[0]!.y);
      for (let i = 1; i < P.length; i++) c.lineTo(P[i]!.x, P[i]!.y);
      c.stroke();
    } else {
      // stroke it piecewise so it can thin out at the ends: a pen lifts, a machine does not
      const total = P.length - 1;
      for (let i = 0; i < total; i++) {
        const u = total > 0 ? i / total : 0;
        const w = w0 * (0.42 + 0.58 * Math.sin(Math.PI * clamp(u, 0.02, 0.98)) ** 0.45);
        c.lineWidth = Math.max(0.6, w);
        c.beginPath();
        c.moveTo(P[i]!.x, P[i]!.y);
        c.lineTo(P[i + 1]!.x, P[i + 1]!.y);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }

  /** A flat cel fill: the outline drawn as a filled path, a shade smaller/offset — paint and line never quite agree. */
  fill(pts: V2[], seed: number, colour: string, o: { amp?: number; a?: number; inset?: number } = {}) {
    if (pts.length < 3) return;
    const c = this.c;
    let P = wobble(pts, this.d + seed, o.amp ?? 2.6, 2.0, true);
    if (o.inset) {
      const cx = P.reduce((s, p) => s + p.x, 0) / P.length, cy = P.reduce((s, p) => s + p.y, 0) / P.length;
      P = P.map((p) => { const L = Math.hypot(p.x - cx, p.y - cy) || 1; return { x: p.x - (p.x - cx) / L * o.inset!, y: p.y - (p.y - cy) / L * o.inset! }; });
    }
    this.xf();
    c.globalAlpha = o.a ?? 1;
    c.fillStyle = colour;
    c.beginPath();
    c.moveTo(P[0]!.x, P[0]!.y);
    for (let i = 1; i < P.length; i++) c.lineTo(P[i]!.x, P[i]!.y);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  /** Convenience: a wobbly blob (circle with hand error and optional irregularity). */
  blob(cx: number, cy: number, r: number, seed: number, o: { colour?: string; outline?: InkOpts; fillA?: number; n?: number; jag?: number; rot?: number } = {}) {
    const n = o.n ?? 26, jag = o.jag ?? 0.06;
    const pts: V2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.rot ?? 0);
      const rr = r * (1 + jag * noise1(i * 0.9 + this.d * 2.3 + seed, seed + 7));
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    if (o.colour) this.fill(pts, seed, o.colour, { a: o.fillA ?? 1, amp: r * 0.03 });
    this.stroke(pts, seed, { closed: true, amp: r * 0.035, ...(o.outline ?? {}) });
    return pts;
  }

  /** A hand-drawn rectangle. */
  rect(x0: number, y0: number, x1: number, y1: number, seed: number, o: InkOpts & { fill?: string } = {}) {
    const pts = [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
    if (o.fill) this.fill(pts, seed, o.fill, { amp: 2.4 });
    const { fill: _f, ...rest } = o;
    void _f;
    this.stroke(pts, seed, { closed: true, ...rest });
  }

  /** Loose hatching inside a polygon — the cel stand-in for a second tone. */
  hatch(pts: V2[], seed: number, o: { spacing?: number; angle?: number; color?: string; w?: number; a?: number } = {}) {
    const spacing = o.spacing ?? 13, ang = o.angle ?? -Math.PI / 3.4;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const cxy = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    const diag = Math.hypot(x1 - x0, y1 - y0);
    this.xf();
    this.c.save();
    // clip to the (wobbly) shape so hatching respects the hand-drawn edge
    const P = wobble(pts, this.d + seed, 2.4, 2.0, true);
    const c = this.c;
    c.beginPath();
    c.moveTo(P[0]!.x, P[0]!.y);
    for (let i = 1; i < P.length; i++) c.lineTo(P[i]!.x, P[i]!.y);
    c.closePath();
    c.clip();
    c.lineCap = 'round';
    c.strokeStyle = o.color ?? rgba('ink', 0.5);
    c.lineWidth = o.w ?? 1.5;
    for (let s = -diag; s <= diag; s += spacing) {
      const ax = cxy.x + nx * s, ay = cxy.y + ny * s;
      c.beginPath();
      c.moveTo(ax - dx * diag, ay - dy * diag);
      c.lineTo(ax + dx * diag, ay + dy * diag);
      c.stroke();
    }
    c.restore();
    void o.a;
  }

  /**
   * Hand-lettered text from the single-stroke fonts: real polylines, wobbled per drawing.
   * Returns the advance width. `align` positions relative to (x,y) on the baseline.
   */
  letter(text: string, x: number, y: number, size: number, seed: number, o: { font?: StrokeFontName; color?: string; w?: number; amp?: number; tracking?: number; align?: 'left' | 'center' | 'right'; rot?: number; a?: number } = {}) {
    const st = strokeText(text, o.font ?? 'readable', size, o.tracking ?? 0);
    const w = st.width;
    const ox = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
    const c = this.c;
    this.xf();
    c.save();
    c.translate(x + ox, y);
    if (o.rot) c.rotate(o.rot);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.globalAlpha = o.a ?? 1;
    c.strokeStyle = o.color ?? rgba('ink');
    const scale = o.font === 'script' || o.font === 'hscript' ? 1.0 : 1.0;
    void scale;
    for (const raw of st.strokes) {
      const pts = raw.map((p) => v2(p.x, p.y));
      const P = wobble(pts, this.d + seed + raw.length, o.amp ?? size * 0.012, 6.5);
      const w0 = o.w ?? size * 0.075;
      const total = P.length - 1;
      for (let i = 0; i < total; i++) {
        const u = total > 0 ? i / total : 0;
        c.lineWidth = Math.max(0.5, w0 * (0.5 + 0.5 * Math.sin(Math.PI * clamp(u, 0.02, 0.98)) ** 0.4));
        c.beginPath();
        c.moveTo(P[i]!.x, P[i]!.y);
        c.lineTo(P[i + 1]!.x, P[i + 1]!.y);
        c.stroke();
      }
    }
    c.restore();
    c.globalAlpha = 1;
    return w;
  }

  /**
   * Hand-lettered text, written up to `p` (0..1 of the total stroke length). This is how the lyric
   * syncs: the word is literally drawn by an unseen hand as it is sung, which reads far better in
   * this style than a rectangular karaoke wipe.
   */
  letterWritten(text: string, x: number, y: number, size: number, seed: number, p: number, o: { font?: StrokeFontName; color?: string; w?: number; amp?: number; tracking?: number; align?: 'left' | 'center' | 'right'; rot?: number; a?: number; ghost?: boolean } = {}) {
    const st = strokeText(text, o.font ?? 'readable', size, o.tracking ?? 0);
    const w = st.width;
    const ox = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
    const c = this.c;
    this.xf();
    c.save();
    c.translate(x + ox, y);
    if (o.rot) c.rotate(o.rot);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (o.ghost) {
      // the not-yet-written text, faint: shows the shape waiting to be drawn
      c.globalAlpha = 0.16;
      c.strokeStyle = o.color ?? rgba('ink');
      c.lineWidth = Math.max(0.5, (o.w ?? size * 0.075) * 0.7);
      for (const raw of st.strokes) {
        c.beginPath();
        c.moveTo(raw[0]!.x, raw[0]!.y);
        for (let i = 1; i < raw.length; i++) c.lineTo(raw[i]!.x, raw[i]!.y);
        c.stroke();
      }
    }
    c.globalAlpha = o.a ?? 1;
    c.strokeStyle = o.color ?? rgba('ink');
    const w0 = o.w ?? size * 0.075;
    // Write CHARACTER BY CHARACTER, not by total stroke length: a hand finishes a letter before it
    // starts the next one. Cutting by arc length instead leaves every letter as a dashed fragment.
    const chars = Array.from(text);
    const done = clamp(p) * chars.length;
    const full = Math.floor(done);
    const frac = done - full;
    for (let si = 0; si < st.strokes.length; si++) {
      const raw = st.strokes[si]!;
      const ci = st.charOf[si] ?? 0;
      let upto: number;
      if (ci < full) upto = 1;
      else if (ci > full) upto = 0;
      else upto = frac;
      if (upto <= 0.001) continue;
      // wobble first, then take the slice of the wobbled polyline actually drawn this frame
      const P = wobble(raw.map((q) => v2(q.x, q.y)), this.d + seed + raw.length, o.amp ?? size * 0.012, 6.5);
      const n = P.length;
      const cut = Math.max(1, Math.round(n * upto));
      const total = cut - 1;
      for (let i = 0; i < total; i++) {
        const u = total > 0 ? i / total : 0;
        // thin into the wet end, where the pen currently is
        const tip = upto < 1 ? Math.min(1, (1 - u) * 5 + 0.25) : 1;
        c.lineWidth = Math.max(0.5, w0 * (0.5 + 0.5 * Math.sin(Math.PI * clamp(u, 0.02, 0.98)) ** 0.4) * tip);
        c.beginPath();
        c.moveTo(P[i]!.x, P[i]!.y);
        c.lineTo(P[i + 1]!.x, P[i + 1]!.y);
        c.stroke();
      }
      // the pen head itself, while the letter is still being written
      if (upto < 1 && n > 1) {
        const a = P[Math.max(0, cut - 1)]!, b = P[Math.min(n - 1, cut)]!;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const pensz = w0 * 2.4;
        c.strokeStyle = o.color ?? rgba('ink');
        c.lineWidth = Math.max(1, pensz * 0.35);
        c.beginPath();
        c.moveTo(a.x - Math.sin(ang) * pensz, a.y + Math.cos(ang) * pensz);
        c.lineTo(a.x + Math.sin(ang) * pensz, a.y - Math.cos(ang) * pensz);
        c.stroke();
      }
    }
    c.restore();
    c.globalAlpha = 1;
    return w;
  }

  /** Advance width of hand-lettered text, without drawing it (for centring a line). */
  measureLetter(text: string, font: StrokeFontName = 'readable', size = 100, tracking = 0) {
    return strokeText(text, font, size, tracking).width;
  }

  /** Typeset text (small labels only — the film's voice is the hand-lettered one). */
  text(s: string, x: number, y: number, o: { size?: number; fam?: string; color?: string; align?: CanvasTextAlign; a?: number; rot?: number } = {}) {
    const c = this.c;
    this.xf();
    c.save();
    if (o.rot) { c.translate(x, y); c.rotate(o.rot); c.translate(-x, -y); }
    c.font = `${o.size ?? 22}px "${o.fam ?? 'Plex-400'}"`;
    c.fillStyle = o.color ?? rgba('night2', 0.85);
    c.globalAlpha = o.a ?? 1;
    c.textAlign = o.align ?? 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(s, x, y);
    c.restore();
    c.globalAlpha = 1;
  }

  /** An arc as a wobbly polyline. */
  arc(cx: number, cy: number, r: number, a0: number, a1: number, seed: number, o: InkOpts = {}) {
    const n = Math.max(6, Math.round(Math.abs(a1 - a0) * r / 12));
    const pts: V2[] = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
    this.stroke(pts, seed, o);
    return pts;
  }

  upload() { return this.layer.upload(); }
}

// ------------------------------------------------------------------ paper
const PAPER_FRAG = /* glsl */ `
uniform float t;
uniform float warm;      // 0 = plain paper, 1 = a warm tint (for hot moments)
void main() {
  vec2 px = FRAG_PX;
  const vec3 PAPER  = ${v3(lin('paper'))};
  const vec3 PAPER2 = ${v3(lin('paper2'))};
  const vec3 SHADE  = ${v3(lin('shade'))};
  const vec3 SIGNAL = ${v3(lin('lantern'))};
  // two scales of tooth, plus a few fibres
  float tooth = snoise(px * 0.55) * 0.5 + snoise(px * 0.13) * 0.5;
  float fine  = hash12(floor(px * 1.7)) - 0.5;
  vec3 col = mix(PAPER, PAPER2, 0.45 + 0.35 * tooth);
  col -= SHADE * (0.055 * (1.0 - tooth));
  col += (fine * 0.012);
  // sparse fibres
  float fib = step(0.9975, hash12(floor(px * 0.32)));
  col -= SIGNAL * 0.0 + vec3(0.05, 0.045, 0.04) * fib;
  // lantern-warm pulse on the beat, and a gentle edge burn
  col += SIGNAL * warm * 0.05;
  vec2 dc = (px - vec2(960.0, 540.0)) / vec2(960.0, 540.0);
  col -= SHADE * 0.16 * smoothstep(0.55, 1.25, length(dc));
  fragColor = vec4(col, 1.0);
}`;

/** The paper pass. It is also what clears the render target — see InkedScene.render. */
export function paperPass() {
  return new FSPass(PAPER_FRAG, { t: { value: 0 }, warm: { value: 0 } });
}

// ------------------------------------------------------------------ the scene base
/**
 * Base class for every plate. It owns the paper pass and the sheet, and it enforces the engine's
 * "render() must fully overwrite `out`" contract so a scene cannot forget to clear (a missing clear
 * does not show up while paused — 'max' blending is idempotent — and only appears later, as frames
 * piling up). Subclasses implement `draw()` and never touch the render targets.
 */
export abstract class InkedScene extends Scene {
  protected bg = paperPass();
  protected sheet = new Sheet();
  /** Extra post tweaks merged over the cel defaults. */
  protected post: PostOverrides = {};

  /** Draw one frame. Everything must be a function of `s.d` (the drawing index) and `f.t`. */
  abstract draw(s: Sheet, f: Frame): PostOverrides | void;

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    this.bg.u.t!.value = f.t;
    this.bg.render(renderer, out);            // MUST run first: this is the clear
    this.sheet.begin(drawing(f.t), f.t);
    const o = this.draw(this.sheet, f) ?? {};
    comp.draw(renderer, this.sheet.upload(), out);
    // cel defaults: flat paper, no glow, no halation, no colour fringing (a drawn line stays one line).
    // bloom is exactly 0, not "a little": the cel palette tops out near 0.86 linear (aged paper), far
    // under any sensible bloom threshold, so a small bloom would cost the pyramid's 13 passes and
    // still draw black. A plate that wants a glow asks for CEL.hot.
    return { bloom: 0, bloomThreshold: 1.4, halation: 0, ca: 0, grain: 0.028, vignette: 0.16, ...this.post, ...o };
  }
}

/** Post tweaks a plate can ask for by name. */
export const CEL = {
  flat: { bloom: 0, bloomThreshold: 1.4, halation: 0, ca: 0, grain: 0.028, vignette: 0.16 } as PostOverrides,
  hot: { bloom: 0.16, bloomThreshold: 0.95, halation: 0.05, ca: 0, grain: 0.035, vignette: 0.2 } as PostOverrides,
  dark: { bloom: 0.10, bloomThreshold: 1.1, halation: 0.02, ca: 0, grain: 0.04, vignette: 0.3 } as PostOverrides,
};

// Writes placeholder plates for every entry of the hand-drawn film's edit, so the app could boot while
// the plates were being authored in parallel. It was the authoring bootstrap; every plate is now
// authored, so this script REFUSES to overwrite a real plate. Pass --force only to deliberately reset a
// plate to a stub.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');

const DIR = path.resolve(import.meta.dirname, '../app/src/films/handdrawn/scenes');
const PLATES = [
  ['loss', 'sudden drop in your training loss', 'Training loss, suddenly'],
  ['prompt', 'ChatGPT, please', 'Prompt — params {variant}'],
  ['hook', "I'm upping my P(doom)", 'Hook — params {n}'],
  ['room', "'cause the future goes FOOM", 'FOOM / the Chinese room'],
  ['shoggoth', "See through the shoggoth's lies", "The shoggoth, masked"],
  ['spacetime', 'We had a stable training run', 'Spacetime'],
  ['ascent', 'I hear the basilisk boom', 'Ascent'],
  ['bureau', 'That was safe enough', 'Paperwork'],
  ['leftturn', 'Sharp left turn', 'Trajectory, revised'],
  ['paperclips', 'as paperclips fill the room', 'Paperclips'],
  ['fuse', 'Too late now, we lit the fuse', 'The fuse'],
  ['stack', 'transformers all the way', 'Architecture, recursive'],
  ['dense', 'Post-Chinchilla', 'Scale'],
  ['loom', 'Just as foretold by Loom', 'Loom'],
  ['ilya', 'What did Ilya', 'What was seen'],
  ['outro', '', 'Outro'],
];

const T = (name, query, title) => `// PLACEHOLDER — ${title}. Replace this whole file with the real plate.
// It is a valid InkedScene so the film boots and every other plate can be judged in context.
import { InkedScene, Sheet, rgba, W, H, clamp, lerp, ease, noise1 } from './_ink';
import { Lyrics } from '../../../engine/lyrics';
import type { Frame, PostOverrides } from '../../../engine/scene';

export default class ${name[0].toUpperCase() + name.slice(1)} extends InkedScene {
${query ? `  private line = this.ctx.lyrics.get(${JSON.stringify(query)});` : '  private line = null;'}

  draw(s: Sheet, f: Frame): PostOverrides {
    const t = f.t;
    s.setCam(W / 2, H / 2, 1, 0);
    // a placeholder mark, hand-ruled
    s.rect(220, 300, W - 220, H - 300, 1, { w: 3.2, color: rgba('graphite', 0.8), overshoot: 5 });
    s.letter(${JSON.stringify(title)}, W / 2, 470, 60, 2, { font: 'readable', align: 'center' });
    s.text('PLACEHOLDER — not yet drawn', W / 2, 540, { size: 22, fam: 'Plex-400', color: rgba('signal', 0.9), align: 'center' });
${query ? `    const words = this.line!.words;
    const size = 52;
    const widths = words.map((w) => s.measureLetter(w.w, 'readable', size));
    const gap = 15;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let x = (W - total) / 2;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      const p = Lyrics.wordProgress(w, t);
      if (p < 1) s.letterWritten(w.w, x, 760, size, 40 + i, 1, { font: 'readable', ghost: true });
      s.letterWritten(w.w, x, 760, size, 40 + i, p, { font: 'readable', color: p >= 1 ? rgba('ink') : rgba('signal'), w: 4.4 });
      x += widths[i]! + gap;
    }` : '    void clamp; void lerp; void ease; void noise1;'}
    return {};
  }
}
`;

let n = 0, kept = 0;
for (const [name, query, title] of PLATES) {
  const f = path.join(DIR, `${name}.ts`);
  if (name === 'sparks') continue;
  // a real plate is anything that is not one of our own stubs
  if (!FORCE && existsSync(f) && !readFileSync(f, 'utf8').startsWith('// PLACEHOLDER')) { kept++; continue; }
  writeFileSync(f, T(name, query, title));
  n++;
}
console.log(`wrote ${n} placeholder plate${n === 1 ? '' : 's'}${kept ? `, left ${kept} authored plate${kept === 1 ? '' : 's'} alone (use --force to reset)` : ''}`);

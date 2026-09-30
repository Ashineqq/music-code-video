// The edit. Every boundary is derived from the aligned lyric data and snapped to the beat grid — the
// same mechanism (and the same reason) as the other two films in this repo: change a lyric and the
// whole cut follows.
//
// 17 windows tile 0 → 176.658 s with no gap. Sixteen boundaries are lyric lines; the three that are not
// are the middle of the long instrumental drop and the end of it, snapped to a downbeat (`nearDown`),
// because nothing is being sung there and the split still has to land on a bar.
//
// Four pairs of plates are the same drawing at two stages ("father"/"father2", "older"/"older2",
// "chorus"/"chorus2", "nights"/"nights2"): one module serves both entries through `ctx.params.n`.
import type { TimelineEntry } from '../../engine/engine';
import type { SceneClass } from '../../engine/scene';
import type { Lyrics } from '../../engine/lyrics';
import type { AudioData } from '../../engine/audio';

// Scene modules are discovered lazily so a missing or broken plate never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut on the last beat at/before the first word of the matching line (never after the word). */
  const cut = (q: string, nth = 0, tol = 0.02) => {
    const s = ly.get(q, nth).words[0]!.start;
    return au.timeOfBeat(Math.floor(au.beatAt(s + tol)));
  };
  /** The downbeat nearest t — a boundary has to come from the music where nothing is sung. */
  const nearDown = (t: number) => au.downbeats.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), au.downbeats[0] ?? t);
  /** Midpoint of two boundaries, snapped to a downbeat: how the wordless drop is split in two. */
  const mid = (a: number, b: number) => nearDown((a + b) / 2);

  const b = {
    shadows: cut('When face to face'),
    father1: cut('One day my father', 0),
    older1: cut('When you get older', 0),
    chorus1: cut('He said, one day', 0),
    nights1: cut('My father told me when', 0),
    thunder: cut('When thunder clouds'),
    shores: cut('He said go venture far'),
    father2: cut('One day my father', 1),
    older2: cut('When you get older', 1),
    chorus2: cut('He said, one day', 1),
    nights2: cut('My father told me when', 1),
    // "My father told me" is the most repeated line in the song (six occurrences: 40.04, 47.24,
    // 116.32, 123.35, 138.76, 169.15), so these two boundaries count occurrences deliberately.
    ember: cut('My father told me', 3),          // 123.35 — the line that ends the second chorus
    never: cut('These are the nights', 2),       // 135.30 — after the 12 s interlude
    outro: cut('My father told me', 4),          // 138.76 — the last line of the sung part
    end: au.duration,
  };
  // the 31.5 s drop (47.2 → 78.7) has no words: split it on bar lines into two plates
  const drop1 = mid(b.nights1, b.thunder);
  const drop2 = mid(drop1, b.thunder);

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  return [
    E('open', 'open', 0, b.shadows),
    E('shadows', 'shadows', b.shadows, b.father1),
    E('father1', 'father', b.father1, b.older1, { params: { n: 1 } }),
    E('older1', 'older', b.older1, b.chorus1, { params: { n: 1 } }),
    E('chorus1', 'chorus', b.chorus1, b.nights1, { params: { n: 1 } }),
    E('nights1', 'nights', b.nights1, drop1, { params: { n: 1 } }),
    E('climb', 'climb', drop1, drop2),
    E('sky', 'sky', drop2, b.thunder),
    E('thunder', 'thunder', b.thunder, b.shores),
    E('shores', 'shores', b.shores, b.father2),
    E('father2', 'father', b.father2, b.older2, { params: { n: 2 } }),
    E('older2', 'older', b.older2, b.chorus2, { params: { n: 2 } }),
    E('chorus2', 'chorus', b.chorus2, b.nights2, { params: { n: 2 } }),
    E('nights2', 'nights', b.nights2, b.ember, { params: { n: 2 } }),
    E('ember', 'ember', b.ember, b.never),
    E('never', 'never', b.never, b.outro),
    E('outro', 'outro', b.outro, b.end),
  ];
}

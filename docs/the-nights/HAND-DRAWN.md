# The Nights — how this film is drawn

Third film in this repo and the second one in the cel language: `handdrawn` re-shot *P(doom)* as
ink-and-paper, and this one draws Avicii's *The Nights* with the same machinery (paper pass, wobbling
ink, flat cel fills, hand lettering, exposure on twos) in a different palette and a different
vocabulary. The idea, the plate-by-plate table and the house rules are in
[`data/the-nights/TREATMENT.src.md`](../../data/the-nights/TREATMENT.src.md); the plate brief the plates
were written against is [`app/src/films/the-nights/plans/pages-brief.md`](../../app/src/films/the-nights/plans/pages-brief.md).

## What is shared, what is this film's

- **Shared with `handdrawn`**: the engine (`app/src/engine/`), the offline renderer, the timing of the
  cel clock, and the *shape* of the drawing layer. The two films each keep their own copy of that layer
  (`scenes/_ink.ts`) because the palette is compiled into it — see "Known trade-off" below.
- **This film's**: its palette, its page furniture (frame + three practice rules), its motifs, its
  seventeen plates, its data (`data/the-nights/`) and its song (`audio/the-nights.mp3`, not committed).

## Palette (eleven colours, and the gate enforces it)

| key | hex | role |
|---|---|---|
| `paper` | `#F3EAD9` | the page in daylight |
| `paper2` | `#E7DAC2` | second tone: hatching, flat fills on paper |
| `shade` | `#C7B590` | the shadow under a fold |
| `night` | `#141C33` | the sky the pages turn into |
| `night2` | `#232F4E` | distant hills, cloud mass, typed labels |
| `ink` | `#191612` | every outline |
| `graphite` | `#6A6152` | secondary lines, pencil under-drawing, fading things |
| `lantern` | `#F2A03C` | **the signal**: the father's lamp, the fire, the pen nib, a warm star |
| `star` | `#FBF6E6` | starlight, the chorus' three windows of light |
| `cool` | `#3E5C86` | cold fills inside the night (sea, cloud undersides) |
| `rose` | `#C0523F` | the memory red — **exactly two moments**: the "never die" line in `nights` (n = 2) and the stamp in `never` |

The film's light/dark rhythm is the point: the verses are `paper`, and every chorus plate floods the
page to `night` so the same ink lines read as sky. A plate never invents a colour.

## The page (every plate draws it)

A wobbled ink frame just inside the safe area, a second sketchy frame 9 px inside it, and — before the
night floods — three practice-page rules at the canonical baselines **720 / 818 / 916** (chosen so a
descender under the third one still lands inside the safe area, and identical on every plate so the sung
line cannot jump at a cut). The picture happens above the rules; the sung line is written
*on* a rule, word by word, and stays there. Copy the `page()` block from
[`scenes/open.ts`](../../app/src/films/the-nights/scenes/open.ts) (the reference plate) rather than
re-inventing it.

## Motifs

1. **The thread** — one line that starts as the horizon in `open`, comes back as a vertical line of
   light to climb in `climb`, a constellation in `sky`, a coastline in `shores`, a road in `outro`, and
   is finally the line the pen starts to draw in the film's last frame.
2. **The lantern** — a flat `lantern` lamp with an ink handle. `CEL.hot` (the palette's only whisper of
   bloom) is for the lantern and nothing else.
3. **The three windows of light** — three `star` dots in the upper third, always at the same three
   positions; they appear in both chorus plates, at the end of `nights2`, and in `never`.
4. **The boy** — a five-stroke ink figure with no face, one size step bigger per chorus, grown by the
   `outro`.
5. **The page turn** — a cut is a page turn: `outro` opens by turning the sheet onto a new landscape.

## Typography

Letters are drawn, never typeset: `readable` for the boy's own hand (the default), `hscript` for the
father's voice, `tech` for carved/etched things, `script` only for the memory lines. Sung words are
written with `letterWritten` driven by `Lyrics.wordProgress`, so no word is legible before it is sung;
`Plex-400` (via `s.text`) is for the odd machine label.

## Gates and commands

```sh
node tools/check-plates.mjs --film the-nights    # edit tiles the song, lyric coverage, cel rules, palette
cd app && npx tsc --noEmit                       # one type gate over every film
cd app && bun scripts/render.ts sheet --film the-nights --times 4.8,13.4,… --cols 4 --out ../out/the-nights/check.png
```

The film's data is the *approximate* tier: `data/the-nights/lyrics.json` was built from the song's LRC
by `tools/import-song.mjs` (line-level times, word times spread inside each line, `conf: 0`) and
`data/the-nights/audio.json` comes from `tools/beat-grid.mjs` (a constant-tempo grid: 126.000 BPM, kick
band autocorrelation, bar phase from the lyric lines). Word-level precision would need the alignment
toolchain in `analysis/`, which is a property of the other film's pipeline.

One artifact of that tier, worth knowing before changing anything: a line whose *next* line is far away
gets its words spread over the whole gap. "My father told me" at 47.24 s is followed by 31 s of
instrumental, so its four words are held ~2.8 s each (the same happens, mildly, to the lines before the
12 s and 30 s instrumentals). `nights` absorbs this by staging the line as one long pen stroke over the
drop; every other plate reveals by `wordProgress`, so it simply follows the data. Tightening it means
capping the spread in `toLyricsJson` (`tools/import-song.mjs`) and re-running the importer — the plates
need no change, since they never hard-code a word's time.

## What the acceptance pass showed

The first shoot passed every gate and still failed as a film: one static page per plate, the lyric written
at 52 px on ruled lines at the bottom — a subtitle bar, which `04-plates.md §5` and `03-animation.md §4.4`
both forbid, and a composition that changed twice per plate instead of every 1.1–1.5 s. It was re-shot
with the plate re-planned around two things the gates now enforce:

- **every plate declares a `/*!plate` manifest** — `device` (one of the six ways a lyric becomes an
  object), `staging` + `typePx` + `maxWidth`, `bands[]`, and `movements[]` with a camera per movement;
- **the lyric is staged in the world, one device per plate**, and no two plates use the same one:
  riding the ground as a ridge (`open`), stamped on figures' chests (`shadows`), written across a giant
  palm (`father`/`father2`), riding a heartbeat trace (`older`), **cut out of the night as holes**
  (`chorus`), stamped into prints (`nights`), letters inside the rain hatch (`thunder`), chart lettering
  (`shores`), a stamp (`never`), chalked on the road in perspective and carved into a milestone (`outro`).

The acceptance sheet (one frame per plate plus three consecutive bars of the close) reads as one film:
the palette, the paper and the cel clock hold, and the framing now changes constantly — the 38 s close
cuts every bar (1.905 s), which is what that long instrumental needed.

Measured on the modern plates: `perf` was 17.9 ms/frame average before the re-shoot; the re-shoot adds
bands and camera work rather than geometry, so the cost class is unchanged (the gate counts movements
and bands; `perf` should be re-measured before a final export).

Soft spots, left as they are (each is one knob, none is a defect):

- `shadows` (9.6–17.2 s) is the plainest plate: a flat wall, two figures, the stamped words small.
- `shores` (85.8–93.4 s) is the palest: chart lettering in `star` on `cool` at low contrast.
- `older` (24.8–32.4 s) is sparse in its middle movement (the trace alone before the words ride it).

## Known trade-off

`scenes/_ink.ts` exists in two copies (this film and `handdrawn`) because the palette is baked into the
module rather than passed in. The machinery is identical apart from the palette, so the honest fix is a
shared `app/src/styles/cel.ts` with the palette injected per film, leaving each film a thin wrapper.
That refactor touches nineteen files of a finished film, so it is deliberately deferred rather than done
quietly; until then, a change to the paper shader or the wobble has to be made in both copies.

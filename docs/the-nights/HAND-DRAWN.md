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

## What the acceptance pass showed

One contact sheet (18 frames: one per plate plus the closing frame) was rendered from the final plates and
read; `perf` measured five seconds of the busiest stretch. Verdict: the vocabulary holds across all
seventeen plates — the page furniture, the rules, the word-by-word writing, the flat cel masses and the
night flood all read as one film, from nine authors.

Measured: **avg 17.9 ms/frame, p50 17.4, p95 30.4, max 40.1** at 1080p (target was under 25 ms on
average; the export is unaffected by the tail, the live preview may dip under 60 fps on the heaviest
plates).

Known soft spots, left as they are deliberately (each is a one-knob change, none is a defect):

- `ember` (123.4–135.3 s) is the film's quietest stretch: a dark page and one ember. That is the design
  (the fire burns down and hands the page back), but twelve seconds of near-black is a long time for it.
- `thunder`'s clouds are `night2` on `night` — legible, but the softest contrast in the film.
- `nights1`'s tear (the drop at ~47.2 s) is subtle at a still; it is a moving edge.
- In `outro` the dusk hill is a large flat mass and the two figures are small: at 1080p the handover is
  quiet, which suits the moment but does not read from across a room.
- The sung lines are lettered at 52–56 px; consistent everywhere, deliberately modest — the page is the
  film's voice, not a subtitle bar.

## Known trade-off

`scenes/_ink.ts` exists in two copies (this film and `handdrawn`) because the palette is baked into the
module rather than passed in. The machinery is identical apart from the palette, so the honest fix is a
shared `app/src/styles/cel.ts` with the palette injected per film, leaving each film a thin wrapper.
That refactor touches nineteen files of a finished film, so it is deliberately deferred rather than done
quietly; until then, a change to the paper shader or the wobble has to be made in both copies.

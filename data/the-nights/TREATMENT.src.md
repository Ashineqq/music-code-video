# The Nights — treatment & style bible

Avicii · Nicholas Furlong, "The Nights" (176.66 s, 126.000 BPM, 4/4). Second film in this repo built
by the `code-music-video` skill, and the third plate-for-plate telling of a song here: `pdoom` is the
engraved original, `handdrawn` its cel re-shoot, this one is **a night book drawn in the same cel
language** — warm pages, ink outlines, exposure on twos, no glow anywhere.

## The idea in one paragraph

The song is a father's advice, remembered at night. The film is a **picture book about night**: each
plate is a spread drawn in ink on warm paper, and the book has one light — **a lantern** (the palette's
only signal colour). The lantern is the father while he is on the page, becomes the fire in the thunder
verse, and becomes the warm stars in the chorus. The book's spine is the child: a small figure low in
the frame in verse 1, bigger and further out by the second chorus, and by the outro a grown figure
walking off the last page. **The page itself is the second character**: in the verses it is daylight
paper; when the chorus arrives the paper floods to night and the same ink lines read as a night sky.
The last frame of the film is its first frame, so it loops.

## Tone

- **Warm, not cute.** A father's voice, a lantern, a real fire, weather. Nothing glossy, no sparkles for
  their own sake, no cartoon mascots — this is a hand-drawn book about growing up, not a lullaby ad.
- **Drawn, not rendered.** Every line wobbles on its own drawing. Flat cel fills only. If something
  wants to glow, it gets a lantern-coloured flat shape and maybe `CEL.hot`, never an additive line.
- **Concrete images, one idea per line.** A pencil drawing itself, shadows sliding off the page's edge,
  a frieze of animals in the margin, a hand the size of the page, a stethoscope on a scribbled heart, a
  map's coastline, a name carved into stars, a fire that will not go out, a boat, a hill at dusk.
- **No lyric subtitle bar.** Every line is staged inside the world (lettered by hand, written, carved,
  stamped, sewn) — see the house rules.

## Palette (the only colours in the film; the gate enforces it)

| key | hex | what it is for |
|---|---|---|
| `paper` | `#F3EAD9` | the page in daylight — the film's base |
| `paper2` | `#E7DAC2` | second paper tone: hatching and flat fills on paper |
| `shade` | `#C7B590` | the shadow under a fold |
| `night` | `#141C33` | **the sky the pages turn into** (flood the frame with it for chorus plates) |
| `night2` | `#232F4E` | one step up: distant hills, cloud mass, typed labels |
| `ink` | `#191612` | every outline |
| `graphite` | `#6A6152` | secondary lines, far things, pencil under-drawing |
| `lantern` | `#F2A03C` | **THE signal**: the father's lamp, the fire, a warm star. Rare and owned |
| `star` | `#FBF6E6` | starlight, moonlight, the page's brightest note |
| `cool` | `#3E5C86` | cold fills inside the night (water, shadow, cloud undersides) |
| `rose` | `#C0523F` | the warm memory red — used in **exactly two places** (the two "never die" beats) |

Rules that follow from it: night plates are `night`-flooded with `star`/`lantern` ink; paper plates stay
`paper`. `rose` appears on "These are the nights that never die" (both times) and nowhere else.

## Type

- **Letters are drawn, never typeset.** Everything sung is written with the single-stroke fonts:
  - `readable` — the default lyric voice (clean single-line sans, the boy's own hand).
  - `hscript` — the father's voice, quotes and remembered lines ("he said…", "my father told me").
  - `tech` — carved/etched things: the name in the stars, a chart, a stencil.
  - `script` — warm cursive, only for the two lines about memory fading.
- Small machine labels (a date, a counter, a coordinate) may use `s.text(…, { fam: 'Plex-400' })` — at
  most a handful in the whole film, and never for sung lyrics.
- Letters are written **stroke by stroke**, in sync with the singing: `letterWritten(text, x, y, size,
  seed, p, …)` with `p` driven by `Lyrics.wordProgress(word, t)` — never all-at-once `letter()` for a
  line that is being sung.

## Motifs (used in more than one plate, so they must look identical)

1. **The lantern** — a flat `lantern` shape with an ink handle; the only object allowed to use `CEL.hot`.
2. **The page** — every plate is a page: a thin ink frame just inside the safe area, and a "fold" line
   where the spread meets. Page turns are a cut: the new plate starts with the sheet mid-turn if it
   wants to.
3. **The thread** — one continuous ink line that starts in the opening plate, runs through several
   plates (as a horizon, a coastline, a road, a power line) and is finally carved into the stars.
4. **The three windows of light** — when the chorus says "these are the nights that never die", three
   `star` dots in the upper third. Same three positions every time.
5. **The boy** — a small ink figure: one line for the head, four for the limbs, no face. Grows by one
   size step per chorus.

## The plates

Seventeen windows. Lyric times are line-level (from the LRC), so every boundary is a **beat**:
`cut('lyric fragment')` = the last beat at/before the line's first word (`timeOfBeat(floor(beatAt(s +
0.02)))`), the same maths as the other two films. Windows tile `0 → 176.658 s` with no gap.

| # | id | lyrics it opens on | instrumental? | world / instrument | owner |
|---|---|---|---|---|---|
| 1 | `open` | `Hey, once upon a younger year` → 3 lines | intro (0–2.4) | **the reference plate.** A pencil draws the page's first line and the line becomes a horizon; a lantern is lit in the margin | lead |
| 2 | `shadows` | `Hey, When face to face` → 3 lines | — | flat ink silhouettes peel off the paper's edge and slide away; what is left is a frieze of animals in the margin | agent |
| 3 | `father` | `One day my father` → 3 lines | — | the page tilts; a hand the size of the spread reaches in, and the boy sits in its palm | agent |
| 4 | `older` | `When you get older` → 3 lines | — | a scribbled heart on the page, drawn over and over, growing; a wild line escapes the heart and becomes the horizon | agent |
| 5 | `chorus1` | `He said, one day you'll leave` → 2 lines | — | **the page floods to night**: the same lines now read as sky; the three windows of light appear; lettering turns `star` | agent |
| 6 | `nights1` | `My father told me when` → 3 lines | — | the night page becomes a photo album page: three remembered snapshots drawn as small bordered frames, the last one empty | agent |
| 7 | `climb` | — | 47.2–63.0 (the drop) | the drop: the boy climbs the thread of light up the page; the paper around him tears into sky as he rises | agent |
| 8 | `sky` | — | 63.0–78.7 | alone in the night: constellations drawn as one continuous line; the lantern small and far below | agent |
| 9 | `thunder` | `When thunder clouds` → 3 lines | — | ink clouds pour; a fire is hatched into the page; the boy carves his name into three stars | agent |
| 10 | `shores` | `He said go venture far` → 3 lines | — | the page becomes a chart: a coastline, a dotted route, a boat the size of a thumbnail | agent |
| 11 | `father2` | `One day my father` → 3 lines | — | the same hand as plate 3, but the boy no longer fits in it — he stands on the palm | agent |
| 12 | `older2` | `When you get older` → 3 lines | — | the heart has grown into a tree; the horizon line is now a road | agent |
| 13 | `chorus2` | `He said, one day you'll leave` → 2 lines | — | the night again, wider: the page's frame breaks and the sky runs off the sheet | agent |
| 14 | `nights2` | `My father told me when` → 3 lines | — | the album page again, the empty frame now full: the father and the boy, same height | agent |
| 15 | `ember` | — | 123.4–135.3 | the fire from plate 9 burns down to one ember; everything else goes to flat night | agent |
| 16 | `never` | `These are the nights that never die` (135.30) | — | 3.3 s, one line: a rubber stamp comes down and the phrase refuses to lift (the film's first `rose` moment) | lead |
| 17 | `outro` | `My father told me` (138.76 and 169.15) | 171–176.66 | the long close: the page turns, a grown figure walks the road over the crest, the lantern is handed over, the last line is carved into a milestone — and the last drawing is the opening plate's first drawing, so the film loops | lead |

## House rules (every plate, no exceptions)

1. **Deterministic.** No `Math.random()`, `Date.now()`, `performance.now()`; no state carried between
   frames (`Scenes` here are stateless — the export renders sub-frames out of order). Randomness comes
   from `hash()`, `noise1()` seeded by the **drawing index** `s.d`.
2. **On twos.** Anything that moves or wobbles is a function of the drawing index, not of `t`
   (`const d = s.d`). The only things allowed to move continuously are camera moves and shapes whose
   motion is meant to be smooth — and they must still be re-drawn with a `s.d`-seeded wobble.
3. **Overwrite the frame.** `paperPass()` runs first (it is the clear), then the sheet is composited.
   A plate never touches render targets; it only draws into the `Sheet`.
4. **Karaoke.** Every lyric line that starts inside the plate's window must be queried by the plate
   (`this.ctx.lyrics.get('…')`, matched on a fragment, never hard-coded times), and every sung word
   must be revealed by `Lyrics.wordProgress(w, t)` — never lead the voice.
5. **Safety.** Keep everything inside `x ∈ [96, 1824]`, `y ∈ [96, 984]` (1920×1080 logical). Titles and
   sung words sit inside `y ∈ [200, 940]`.
6. **Cost.** Under 25 ms/frame at 1080p. The sheet's wobble is O(points) — resample at ~14 px, keep the
   points you hand it honest, and cache anything expensive per (element, drawing) instead of per frame.
7. **One idea per plate, 4–9 movements.** A movement is a full re-draw or a camera move; cut between
   them on beats, not on arbitrary times.

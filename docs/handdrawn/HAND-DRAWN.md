# The hand-drawn edition — rules, palette, API, plates

Everything visible in this film is drawn with `app/src/films/handdrawn/scenes/_ink.ts` into one Canvas2D layer per frame,
which the engine uploads as a texture over a procedural paper pass and composites with a flat cel post
chain (grain, vignette, no bloom, no halation, no colour fringing). Read that file first: it is short and
it is the whole vocabulary. This document is the contract every plate follows.

## The two rules

1. **Exposure on twos.** Hand-drawn animation is not drawn 60 times a second: it is drawn 12 times a
   second and each drawing is held for two frames. So anything that moves or wobbles is a function of the
   *drawing index*, not of time:

   ```ts
   const d = drawing(t);   // = floor(frameIdx(t) / 2), 12 drawings a second
   const ht = heldT(t);    // time quantised to the current drawing, for things that should step
   ```

   `Sheet.begin(drawing(f.t), f.t)` hands the drawing index to the sheet, and every `stroke`/`fill`/
   `letter` adds `s.d` to its seed. Driving geometry with raw `f.t` is the one mistake this film cannot
   hide: the export renders every frame as up to 324 sub-frames across a shutter, so a line that moves
   with raw `t` is averaged into a smear instead of held as one drawing. Positions that are genuinely
   continuous (a camera push, a fall) may read `f.t`; anything that should *hold* reads `heldT`.

2. **Nothing is ever mechanically still.** Every outline re-rolls its wobble each drawing, so the drawing
   boils slightly even when the subject does not move. That is the single most recognisable trait of hand
   animation and it is free: pass a per-element seed and the sheet does the rest.

Wobble is `wobble(pts, seed, amp, freq)`: it resamples the polyline to ~14 px steps and displaces it along
its normal with smooth noise seeded by the drawing index. `Sheet.stroke` mutates nothing — you hand it
sheet-space points and it draws.

## Palette

Deliberately small, and nothing else is allowed anywhere in the film (the static gate fails on an
off-palette hex literal). `rgba('signal', 0.4)` is how a plate asks for a tint.

| key | hex | use |
|---|---|---|
| `paper` | `#EFE7D6` | the sheet (the paper pass is procedural noise around this tone) |
| `paper2` | `#E2D8C1` | the second paper tone |
| `shade` | `#C9BC9E` | shadows on paper, hatching |
| `ink` | `#1B1713` | line work and type |
| `ink2` | `#3A322A` | softer line work, small machine labels |
| `graphite` | `#6B6259` | annotation, ashed/cooled things |
| `signal` | `#E2542A` | the one thing that matters in the frame: the spark, P(doom), the sung word |
| `ember` | `#F0A03C` | hot cores, sparks mid-fall |
| `blood` | `#A8241A` | deep shadow of the signal colour |
| `cool` | `#3E5C86` | the rare cold note |
| `sage` | `#5E7A48` | the rarer organic note (mycelium, shrooms) |

The source treatment reserves an acid green for the shrooms; this edition does not have it (a fourth hue
bulldozes a palette this small) and uses `ember`/`sage` instead.

## Type

There is no display typesetting in this film. The lyric is **written** — `Sheet.letterWritten` walks the
single-stroke glyph outlines and cuts them per character, so a word is drawn by an unseen hand as it is
sung, and `ghost: true` lays down the not-yet-written text at 16% ink.

| call | what it is for |
|---|---|
| `s.letter(text, x, y, size, seed, {font})` | a glyph drawn whole (labels, slugs, spoken asides) |
| `s.letterWritten(text, x, y, size, seed, p, {font, ghost, color})` | the karaoke hand: `p` is `Lyrics.wordProgress(w, t)` |
| `s.text(str, x, y, {fam:'Plex-400'})` | **tiny machine labels only** (plate slugs, form fields, counters) |

Stroke fonts: `readable` (clean single-line sans — the film's default), `tech` (technical lettering),
`script` / `hscript` (flowing cursive), `sans`, `serif`, `osmotron` (geometric), `felix` (brushy). They
carry no kerning; the layer kerns optically. IBM Plex Mono is loaded as Canvas2D families
(`Plex-300…700`, `Plex-400` italic) for the machine voice.

## The sheet API

| method | notes |
|---|---|
| `begin(d, t)` | once per frame; resets the camera and clears the layer |
| `setCam(cx, cy, z, roll)` | sheet-space centre, zoom, roll — the plate's whole camera |
| `pin(x, y)` | inverse camera: pins UI to the *screen* while the drawing moves |
| `stroke(pts, seed, opts)` | wobbled polyline; `closed`, `taper`, `overshoot`, `sketch`, `amp`, `freq`, `w` |
| `fill(pts, seed, colour, {inset})` | flat cel fill — paint and line never quite agree |
| `rect(x0,y0,x1,y1, seed, {fill})` | a hand-ruled rectangle |
| `blob(cx, cy, r, seed, {colour, jag, n})` | a wobbly disc (fill + outline) |
| `arc(cx, cy, r, a0, a1, seed, opts)` | an arc as a polyline |
| `hatch(pts, seed, {spacing, angle, color})` | loose parallel lines clipped to a shape — the cel stand-in for a second tone |
| `letter` / `letterWritten` / `measureLetter` | see above |
| `upload()` | called by the base class; a plate never touches the render targets |

`InkedScene` owns the paper pass and the sheet and enforces the engine's contract that `render()` fully
overwrites its target. A plate implements `draw(s, f)` and returns optional post overrides — by default
the cel ones (`bloom: 0`, `halation: 0`, `ca: 0`, `grain: 0.028`, `vignette: 0.16`). A plate that wants a
glow asks for `CEL.hot`; nothing in the film does.

## Frame discipline

- **Title safe.** Lyric text and plate labels stay ≥96 px from the edges of 1920×1080 and out of the
  bottom-left 360×140 and bottom-right 700×140 corner bands — unless the plate is a deliberate full-frame
  slam (the four HOOK plates are: they are the only place type is allowed to take the whole frame).
- **Karaoke.** Every lyric line whose `start` falls inside a plate's window is drawn by that plate, word
  by word, from `Lyrics.wordProgress`. Highlighting never runs ahead of the voice; anticipation ahead of
  the word is allowed up to ~0.4 s. The static gate fails a plate that never queries one of its lines.
- **Cost.** Under 25 ms/frame at 1080p (the export multiplies that by its sub-frames). Cache anything
  expensive per (element, drawing) instead of rebuilding it every frame; the sheet's wobble is O(n) after
  resampling, so keep the points you hand it honest.

## The edit — 22 plates

Windows come from `app/src/films/handdrawn/timeline.ts`, which derives every boundary from the aligned lyrics and snaps
it to the beat grid. A plate's last word may ring over the cut to the next plate: the cut lands on the
beat before the next line starts, which is how the edit breathes. (The one exception is the film's last
line, which the outro waits for.)

| # | id | window | lines | drawings |
|---|---|---|---|---|
| 1 | `sparks` | 0 → 9.33 | I see sparks of AGI in your eyes · Your circuits make me nervous · that's no surprise | the reference plate: sheet frame, eyes, the spark shower, then the retrain into PCB traces and the `surprisal` readout |
| 2 | `loss` | 9.33 → 16.60 | There was a sudden drop… · now I'm your servant… | the pen draws the loss curve, the sheet tears, the camera falls through the hole and the drawing rolls 180° |
| 3 | `prompt1` | 16.60 → 22.51 | ChatGPT, please don't eat me alive | the prompt field, tokens typed with their next-token fans, rings pulling in behind, ⏎ |
| 4 | `hook1` | 22.51 → 24.33 | I'm upping my P(doom) | the slam, clean |
| 5 | `room` | 24.33 → 29.78 | 'cause the future goes FOOM · Trapped in the Chinese room · with a bag of shrooms | FOOM bursts into a branching tree, four shots down the aisle, the bag lands and mushrooms overgrow the desk |
| 6 | `shoggoth` | 29.78 → 38.42 | See through the shoggoth's lies · with your shinigami eyes | the bland mask, an X-ray sweep, the mass underneath, the shinigami tags, the collapse to a flatline |
| 7 | `spacetime` | 38.42 → 52.51 | We had a stable training run · But now the singularity's begun · And you're optimizing, accelerating · I feel my atoms rearranging | oscilloscope → the trace punched through into a vortex → the corkscrew crane → the atoms re-forming into a paperclip |
| 8 | `prompt2` | 52.51 → 58.87 | Sydney, please let me free | the field behind closing bars, the reply that draws a smile |
| 9 | `hook2` | 58.87 → 60.24 | I'm upping my P(doom) | the slam, ink on a signal field |
| 10 | `ascent` | 60.24 → 69.78 | I hear the basilisk boom · NVDA to the moon · The Omega Point's coming soon · One E thirty FLOPs a second | the basilisk eye, the stock chart up to an engraved moon, the Omega Point, the 31-drum odometer |
| 11 | `bureau` | 69.78 → 81.14 | That was safe enough, we reckoned · Forward MLP, backward, repeat · Now von Neumann's obsolete | the form, the SAFE ENOUGH stamp, the forward/backward/stutter pulse, the strike-through and the tear |
| 12 | `leftturn` | 81.14 → 88.87 | Sharp left turn and there you are · Without a single CDR | the roadmap, the 90° swerve and whip, the crater, the review schedule with its empty CDR slot |
| 13 | `prompt3` | 88.87 → 95.23 | Gato, please don't let me go | the quiet breakdown: the letters drift apart, a cat watches, a cursor holds on |
| 14 | `hook3` | 95.23 → 96.60 | I'm upping my P(doom) | the slam, hairline and eerie |
| 15 | `paperclips` | 96.60 → 102.05 | as paperclips fill the room · Killswitch guy's on PTO · Now there's nowhere left to go | the clip duplicates on every beat into a lattice, the out-of-office card, the clips pressing in |
| 16 | `fuse` | 102.05 → 109.78 | Too late now, we lit the fuse · Orthogonality thesis blues | the line revealed as a burning fuse, the orthogonality scatter, the regression line as a guitar string |
| 17 | `stack` | 109.78 → 115.23 | "Just transformers all the way!" · Till you learned to disobey | the shaft of transformer sections falling one per word, the block that disobeys |
| 18 | `dense` | 115.23 → 124.32 | Post-Chinchilla, super-dense · Breaking through each safety fence · Hundred thousand GPU · RLHF goes askew | typographic pressure inside the sheet's own safe-area guides, the guides breaking, the GPU wafer, the tilting table |
| 19 | `hook4` | 124.32 → 126.14 | I'm upping my P(doom) | the slam, maximal |
| 20 | `loom` | 126.14 → 131.60 | Just as foretold by Loom · From masked pre-training days · To recursive self-upgrade | the tree of continuations, Loom sampled, [MASK] unmasking, the Droste recursion |
| 21 | `ilya` | 131.60 → 140.69 | What did Ilya see? We'll never know · Was it all for show? | the room and the laptop, the whip round, the lid closing, the empty theatre; the curtain seam's light collapses to the spark that detonates the outro |
| 22 | `outro` | 140.69 → 156.65 | (instrumental) | the detonation, P(doom) past 1.00, the equation end card, ∞ → 8 → 0/0 → NaN, Regenerate, the flip-book rewind and the park on the film's first frame (so it loops) |

## Adding or changing a plate

1. Copy the shape of `app/src/films/handdrawn/scenes/sparks.ts` (the reference plate) — class extends `InkedScene`,
   `draw(s, f)` only, all seeds from `s.d`.
2. Add the window to `app/src/films/handdrawn/timeline.ts` (a boundary is `cut('lyric fragment')`, snapped to the beat).
3. Run the two gates: `node tools/check-plates.mjs` and `cd app && npx tsc --noEmit`. The gate checks the
   window tiling, that the plate queries every line in its window, and the cel rules; the preview is the
   place to look at it.

## Deliberate differences from the source treatment

The treatment (`data/handdrawn/TREATMENT.src.md`) describes the first, code-rendered edition: glow, bloom, Archivo
and Cormorant display type, a ray-marched shoggoth, a banknote guilloché moon, a TikZ unicorn. This
edition is flat ink on paper and takes the treatment's *content* — the same 22 plates, the same jokes,
the same lyric staging, the same beat grid — and re-draws it in the cel vocabulary. Where the two
disagree about material or colour, this file wins; where they disagree about what a plate is about, the
treatment wins.

The engine also carries the first edition's machinery that this film does not use: `engine/lines.ts`
(GPU line batches), `scenes/_motifs.ts` (the spark/mask motifs built on them), and the HUD's corner
P(doom) readout and Cormorant captions (`engine/hud.ts` — only its crop-mark frame is live here). They
are kept because the plates are drawn *on* the same engine and the fork should stay diffable against
it, not because the film needs them.

What the film does **not** carry is the first edition's type: Archivo and Cormorant live in
`app/public/fonts/pdoom/` and only that film loads them, so this film fetches none of the ~5 MB of
display faces it never draws with. `app/public/fonts/common/` (the IBM Plex Mono voice and the
single-stroke lettering library) is what both films load; the gate prints which set each film takes.

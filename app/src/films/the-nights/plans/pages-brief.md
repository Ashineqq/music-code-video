# The Nights — plate brief (for the plate agents)

Read `data/the-nights/TREATMENT.src.md` first (the idea, the palette, the motifs), then
`app/src/films/the-nights/scenes/_ink.ts` (the drawing layer) and the reference plate
`app/src/films/the-nights/scenes/open.ts` — **that file is the pattern**: a page, the rules, the sung
line written word by word, the horizon as the film's thread, the lantern as the only signal colour.

You write **one plate file** (or the two named in your task). Everything else is read-only: the engine,
`_ink.ts`, `timeline.ts`, the data, the palette, other plates. Do not run the dev server, the renderer,
the build, or a browser; do not take screenshots. The lead runs the gates and one contact sheet at the
end.

## The film in one breath

A picture book about night, drawn in ink on warm paper. Verses are daylight `paper`; the chorus floods
the page to `night` and the same ink lines read as sky. One lantern is the signal colour (the father's
lamp → the fire → the warm stars). The boy grows one size step per chorus; the last frame is the first.

## The API you will actually use (from `_ink.ts`)

```ts
const d = s.d;                        // THE DRAWING INDEX. Every wobble seed and every step comes from it.
s.setCam(cx, cy, zoom, roll);         // camera in sheet px (1920×1080, y down); default is centred, z=1
s.pin(x, y): V2;                      // screen-space point -> sheet space, for UI that must not move
s.stroke(pts: V2[], seed: number, { w, color, amp, sketch, closed, overshoot, a, taper });
s.fill(pts: V2[], seed: number, colour: string, { amp, a, inset });   // a flat cel fill
s.blob(cx, cy, r, seed, { colour, n, jag, outline, rot });            // an irregular flat shape
s.rect(x0, y0, x1, y1, seed, { w, color, fill, overshoot, sketch });  // has `fill` on top of InkOpts
s.hatch(pts: V2[], seed, { spacing, angle, color, w });               // the second tone of a cel
s.arc(cx, cy, r, a0, a1, seed, InkOpts);
s.letter(text, x, y, size, seed, { font, color, w, amp, tracking, align, rot, a });        // all at once
s.letterWritten(text, x, y, size, seed, p, { ...same, ghost });       // p = 0..1, written by the pen
s.measureLetter(text, font, size, tracking): number;
s.text(str, x, y, { size, fam, color, align, a });                    // typeset: machine labels only
```
Colours: `rgba('paper'|'paper2'|'shade'|'night'|'night2'|'ink'|'graphite'|'lantern'|'star'|'cool'|'rose', a)`.
Nothing else — a hex literal outside the palette fails the gate.

Helpers exported by `_ink.ts`: `W, H, clamp, lerp, ease, prog, noise1, hash, heldT, TAU, drawing, v2`,
and `CEL.flat | CEL.hot | CEL.dark` (post tweaks; return `CEL.flat` unless the frame earns more).

## House rules (the gate and the eye both check these)

1. **Deterministic.** No `Math.random`, `Date.now`, `performance.now`. Randomness = `hash(a, b)`,
   `noise1(x, seed)` seeded by the drawing index `s.d`.
2. **On twos.** Anything that moves, wobbles or flickers is a function of `s.d` (use `heldT(f.t)` when
   you need a *time* that steps with the drawing). Continuous time is only for camera moves, reveal
   ramps (`prog`) and `Lyrics.wordProgress`.
3. **The sung words drive the picture.** Every line in your window must be queried
   (`this.ctx.lyrics.get('<fragment>')`, matched case-insensitively on a fragment of the line) and its
   words revealed with `Lyrics.wordProgress(w, f.t)` — the standard block is in the reference plate
   (`writeRules`). Never show a word before it is sung.
4. **Safety.** Everything inside `x ∈ [96, 1824]`, `y ∈ [96, 984]`; sung words inside `y ∈ [200, 940]` — which is why the three writing rules are canonically **`720 / 818 / 916`** (a descender under the third baseline reaches ~938). Same values on every plate: the sung line must not jump at a cut.
5. **Cost.** < 25 ms/frame at 1080p: resample long polylines at ~14 px, cache per (element, drawing)
   instead of per frame, keep Canvas2D passes to one sheet.
6. **No glow, no additive.** Flat fills and ink lines only. `CEL.hot` (a whisper of bloom) is reserved
   for the lantern and one or two other earned moments in the whole film.

## The edit — exact windows (from the gate; snap nothing, use `f.t`)

| entry | window | lyric lines starting inside | notes |
|---|---|---|---|
| `open` | 0.00 → 9.58 | 3 lines | **written (reference)** |
| `shadows` | 9.58 → 17.19 | "Hey, When face to face with all our fears" / "Learned our lessons through the tears" / "Made memories we knew would never fade" | |
| `father1` | 17.19 → 24.81 | "One day my father he told me" / "Son, don't let it slip away" / "He took me in his arms,I heard him say" | `params.n = 1` |
| `older1` | 24.81 → 32.43 | "When you get older" / "Your wild heart will live for younger days" / "Think of me if ever you're afraid" | `params.n = 1` |
| `chorus1` | 32.43 → 40.05 | "He said, one day you'll leave this world behind" / "So live a life you will remember" | `params.n = 1` |
| `nights1` | 40.05 → 59.10 | "My father told me when I was just a child" / "These are the nights that never die" / "My father told me" | **the music drops at ~47.2 s**, inside this window: the last line rings and the page tears into sky |
| `climb` | 59.10 → 68.62 | — instrumental | the drop, full |
| `sky` | 68.62 → 78.62 | — instrumental | alone in the night |
| `thunder` | 78.62 → 85.77 | "When thunder clouds start pouring down" / "Light a fire they can't put out" / "Carve your name into those shining stars" | |
| `shores` | 85.77 → 93.39 | "He said go venture far beyond these shores" / "Don't forsake this life of yours" / "I'll guide you home no matter where you are" | |
| `father2` | 93.39 → 101.00 | same three lines as `father1` (the later verses) | `params.n = 2` |
| `older2` | 101.00 → 108.62 | same three as `older1` | `params.n = 2` |
| `chorus2` | 108.62 → 116.24 | same two as `chorus1` | `params.n = 2` |
| `nights2` | 116.24 → 123.39 | "My father told me when I was just a child" / "These are the nights that never die" | `params.n = 2` |
| `ember` | 123.39 → 135.29 | — instrumental | |
| `never` | 135.29 → 138.62 | "These are the nights that never die" | **the `rose` beat** — one stamp, no more |
| `outro` | 138.62 → 176.66 | "My father told me" (138.76) … "My father told me" (169.15) | **written (lead)** |

Beat grid: 126.000 BPM, `this.ctx.audio.beats` / `.downbeats` / `.timeOfBeat(i)` / `.beatAt(t)`. Cut your
movements on beats and bars (`timeOfBeat`), never on round seconds.

## Per plate: what happens (the movements)

**`shadows`** (9.58 → 17.19, 3 lines, paper) — flat ink silhouettes peel off the paper's edge and slide
away; what is left is a frieze of animals in the margin.
1. 9.58: the page as the opening left it (frame + rules), the horizon still there.
2. "face to face with all our fears": two silhouettes stand *on* the horizon facing the viewer, growing.
3. "Learned our lessons through the tears": hatching rain falls on them (cel hatch, not a shader);
   they shrink.
4. "Made memories we knew would never fade": the silhouettes walk off the right edge and fade to
   `graphite`; in the empty margin a frieze of small animals is drawn, left to right, one per beat.

**`father`** (2 entries, 2 × 7.6 s, paper) — *the same drawing at two stages*, one module, `params.n`.
1. Movement A (both n): the page tilts (`setCam` roll ~ -0.03 n) and a giant hand reaches in from the
   right: a wrist, four fingers, drawn as ink outlines with flat fills.
2. Movement B, `n = 1` ("One day my father he told me" … "He took me in his arms"): the boy — a small
   ink figure, five strokes, no face — sits in the middle of the palm and the fingers close.
3. Movement B, `n = 2` ("…When I was just a kid, I heard him say"): the same hand, but the boy now
   stands on the palm and is too tall for it — the fingers curl behind him instead of closing.
4. The father's words are letters, so letter them with `hscript` on the rules, written word by word.
   (The lines are the plate's to query; the *hand* is what the picture does with them.)

**`older`** (2 entries, 2 × 7.6 s, paper) — a scribbled heart that grows into a tree; one module, `n`.
1. `n = 1`: a heart drawn over and over (three passes, each looser) on the page's upper half; the last
   pass escapes and one line of it runs off as the horizon of the next movement. "Your wild heart will
   live for younger days" gets the escape.
2. `n = 2`: the same heart, but with a trunk: the scribble has become a tree whose canopy is still
   heart-shaped; under it the boy (one size bigger) and a small figure sitting.
3. "Think of me if ever you're afraid": the tree's shadow is drawn as a large flat `night2` shape and
   the small figure stands inside it, protected.

**`chorus`** (2 entries, 2 × 7.6 s) — the page floods to night; one module, `n`.
1. The flood: from the first downbeat of the window, a flat `night` shape sweeps down the page like ink
   poured from above (a moving edge, on the drawing clock). By the first sung word the page is night.
2. The horizon, the hills and any figure from before are re-drawn *in reverse* (paper-coloured lines on
   night) — the same shapes, negative.
3. **The three windows of light**: three `star` dots in the upper third, always the same three
   positions, blinking on the beat (`heldT`), brighter in `n = 2`.
4. The sung lines are written in `star` on the rules; the lantern is now the only warm thing.
5. `n = 2` only: the page's frame breaks on the last line — the frame's ink runs off the sheet and the
   night extends past the safe area to the very edge of the frame.

**`nights`** (2 entries, `n = 1`: 19.0 s, `n = 2`: 7.1 s) — the album page; one module, `n`.
1. `n = 1`: three remembered snapshots: small bordered frames drawn on the page (a kite, a doorway, a
   road) appearing one per line; the third frame is drawn *empty*.
2. `n = 1`, second half (the drop at ~47.2): the page tears along the horizon; through the tear the
   night floods in (the `chorus` flood, but from a slit), and the empty frame is the last thing to go.
3. `n = 2`: the same three frames, and the third one is now full — the father and the boy standing at
   the same height. This is the film's emotional turn: hold it, don't decorate it.
4. End of `n = 2` ("These are the nights that never die"): three `star` dots again, in the same three
   positions as `chorus`.

**`climb`** (59.10 → 68.62, instrumental, night) — the drop, full.
1. The page is already night (the previous plate left it there). Open on the tear, widening.
2. The boy climbs the **thread**: the horizon line from the opening plate is now a vertical line of
   light going up the page, and he climbs it — hands alternating, one move per bar.
3. As he rises the paper below him tears into strips (flat `paper`/`paper2` shapes falling away); the
   stars he passes get bigger as he goes up (scale in depth: `lerp` the radius).
4. No letters at all in this plate (nothing is sung). The rhythm is the drums: the climb steps on
   `beatAt`, and the tears happen on downbeats.

**`sky`** (68.62 → 78.62, instrumental, night) — alone in the night.
1. Wide: the boy tiny in the lower third, holding the thread's end; the night fills everything.
2. One continuous line draws a constellation — a single ink stroke that visits 7-9 stars and returns
   (draw it progressively off `f.t`, no letters).
3. The lantern, far below, is a single `lantern` dot; it pulses once per bar (`heldT`).
4. Last movement: the constellation's line, followed back, becomes a road (a two-point perspective
   wedge of `night2`) heading to the horizon — the set-up for `thunder`.

**`thunder`** (78.62 → 85.77, 3 lines, night) — ink clouds pour; a fire is hatched into the page; the
name is carved into three stars.
1. Clouds: three flat `night2` masses sliding in from the left, each one drawing rain as cel hatch
   underneath (one hatch pass per drawing, never per frame).
2. "Light a fire they can't put out": a fire is hatched in the lower third — concentric half-circles
   filled with `lantern` hatch, one ring per beat; it does not go out (the rain passes it by).
3. "Carve your name into those shining stars": `tech` lettering cut into three `star` dots — the letters
   are the boy's name; carve them with short strokes, on the drawing clock, in sync with the words.

**`shores`** (85.77 → 93.39, 3 lines, night) — the page becomes a chart.
1. A coastline drawn as one line across the page; the sea is flat `cool` cel; the land stays `night`.
2. A dotted route walks across the map (dots appear one per beat, not per frame).
3. A boat the size of a thumbnail is drawn at the route's start ("go venture far beyond these shores"),
   a small ink figure in it.
4. "I'll guide you home no matter where you are": a `lantern` line from the far corner of the page to
   the boat — a thread, again. It is the only warm element in the frame.

**`ember`** (123.39 → 135.29, instrumental, night→paper) — the fire from `thunder` burns down.
1. The hatch rings shrink, one ring lost per bar, until one ember is left in the middle of the page.
2. The night starts to lift from the edges: a growing `paper` shape closes in over the night (the
   reverse of the `chorus` flood) — by the plate's end the page is paper again.
3. On the last bar the ember is blown out: three ink sparks, drawn on three consecutive drawings.
4. No letters.

## Report back (fixed format, short)

1. `file:line` list of what you changed (one line each).
2. What you did **not** do, and why.
3. What you verified **arithmetically** (positions, safety-area extremes, beat alignment) — not "looks fine".
4. Your per-frame cost estimate (how many strokes/fills/letters per drawing, and why it is < 25 ms).
5. Any place where the brief was ambiguous and what you chose.

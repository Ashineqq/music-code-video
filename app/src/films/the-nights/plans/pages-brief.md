# The Nights — plate brief **v2** (re-shoot: density + in-world lyric)

**Why v2.** The first shoot passed every static gate and still failed the film: watching it, the picture
holds one static page per plate while three small lines of text sit on ruled lines at the bottom. That is
the two things this skill forbids:

- `references/04-plates.md §5` — *do not copy one motif into every plate.* v1 made "paper page + three
  writing rules" shared furniture, so all seventeen plates had the same language. **The rules are gone.**
- `references/03-animation.md §3` — *change the composition every 1.1–1.5 s; 4–9 sub-shots in a 5–8 s
  plate.* v1 had 1–3, so the film reads as "one drawing moving slowly".
- `references/03-animation.md §4.4` — *the lyric is part of the picture; a bottom subtitle bar is
  forbidden.* v1 wrote every line at 52–56 px on a rule: a subtitle bar with extra steps.

**The style is not the problem.** The palette, the paper, the wobbling ink, the lantern, the drawn
letters and the cel clock stay exactly as they are. What changes is the *planning*: each plate gets its
own world, its own way of making the lyric into an object, and a movement table that reframes every
1.1–1.5 s.

## 你的产物 = 一个带 manifest 的版式文件

版式的设计不写在报告里，写在文件里，并且由门校验。文件第一段必须是（字段名照抄）：

```ts
/*!plate
{
  "id": "shadows",                    // 或 ["father1","father2"]：一个模块服务多个条目就全列
  "window": [9.5759, 17.1949],        // 你这段窗口（门的表里就有）
  "device": "stamped",                // written | riding | typed | stamped | woven | masked
  "staging": "subject",               // 唱词是画面主角：subject；只是某个仪器的一部分：instrument
  "typePx": 132,                      // 唱词实际画多大（subject 必须 >= 140）
  "bands": [ { "name": "sky", "y": [200, 430] }, { "name": "live", "y": [606, 736] } ],
  "movements": [                      // >= 4 段；首段 at == 窗口起点；递增；平均间隔 <= 1.5 s；
    { "at": 9.5759, "camera": "crane-in-left" },    // 相邻两段的 camera 必须不同
    { "at": 11.30,  "camera": "whip-right" },
    { "at": 13.00,  "camera": "tilt-down" },
    { "at": 14.20,  "camera": "punch-in" },
    { "at": 15.80,  "camera": "crane-out" }
  ]
}
*/
```

`node tools/check-plates.mjs --film the-nights` 会把 manifest 与代码、剪辑表对齐：字段缺失、数字对不上、`bands`
重叠、`movements` 太稀、或 `subject` 的 `typePx < 140`，都直接失败。字段的取值含义见 `_ink.ts` 的注释与
`data/the-nights/TREATMENT.src.md` 的版式表；写不出这些字段，说明这一段还没设计好。

## The contract

1. **Each plate invents its world.** Read the world column and the movement table below. If an element of
   your plate could be moved into another plate unchanged, your plate has no language of its own —
   invent again.
2. **The lyric is an object in that world**, using one of the six devices (`04-plates.md §3`): written /
   riding a path / typed in / stamped / woven-hatched-carved / masked out. **Never on a rule, never
   centred in a bottom band, never a floating caption.** The device is named for your plate below.
3. **Type scale.** When the line is the subject it is **150–240 px**; when it is part of an instrument
   (chart annotation, stamp, carved name) **46–90 px** is fine. 52 px centred at the bottom is banned.
4. **Density.** A movement = one full re-draw or one reframe. Your plate has 4–6 of them, one per
   ~1.1–1.5 s, cut **on beats** (`timeOfBeat`, `beatAt`). Between movements the composition must visibly
   change — the camera sub-shot table below is the cheapest way (see `03-animation.md §2`).
5. **Camera sub-shots.** Give your plate a table of `(cx, cy, zoom, roll)` and whip between entries with
   `ease.outExpo`, a little roll, and a kick-driven zoom. A camera move is a cut that costs nothing.
6. **Element count.** 12–19 kinds of element in the plate (a hill, a fence, a bird, a lamp, a hatched
   cloud, a watermark…), and at least three of them moving at any moment. One object + text is not a
   plate.
7. **Still not negotiable**: determinism (seeds from `s.d`, no `Math.random`/`Date.now`/`performance.now`,
   no cross-frame state); exposure on twos; the eleven-colour palette; safety (content inside
   `[96,1824]×[96,984]`, and the sung line readable — full-frame type may cross it deliberately);
   `< 25 ms/frame`; every lyric line in your window queried and revealed by `Lyrics.wordProgress`.

## The three checks the gate makes (they used to be self-checks; now they are fields)

- `staging: "subject"` with `typePx < 140` → fail. A sung line that is the frame's subject is not a caption.
- Fewer than 4 `movements`, a mean gap over 1.5 s, or two consecutive movements sharing a `camera` → fail.
- Two `bands` whose y ranges overlap, or a band outside `[0, 1080]` → fail.

## Models to read before writing (they are the standard)

- `app/src/films/handdrawn/scenes/hook.ts` — one word per sung word at **224 px, full frame**, the words
  *fly in* from below and land on the beat; the readout blows up to full frame on its own beat; four
  stages of the same drawing via `params.n`.
- `app/src/films/pdoom/scenes/loss.ts` — a world with four movements: hairline chart → the curve falls
  off a cliff → the camera falls with it into an engraved 3D landscape → the world rolls 180° on "boss".
  Note the head comment: it is a *shot list*, not a description.
- `app/src/films/the-nights/scenes/_ink.ts` — the drawing layer you already know.

## Your plate: world, device, movement table

Every window is exact (from the gate). Beats are 0.476 s; bars 1.905 s.

---

### `open` — 0.00 → 9.58 · 3 lines · paper — **lead (reference)**

**World**: a drawing hand turning a blank sheet into land. **Device**: *riding a path* — each of the three
lines is written **along the ground**: the words are the landscape. Their baselines wobble like a ridge
line, at **140 px**, and where a word ends the ink keeps going and becomes the horizon.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | 0 → 2.4 (intro) | blank paper; a pen nib enters from the left and *starts* a line | zoom 1.35 → 1.0, drift with the nib |
| 2 | 2.4 → 4.5 (line 1) | the words rise out of the line one at a time, each landing as a low hill range | punch-in on the last word, roll +0.01 |
| 3 | 4.5 → 6.3 (line 2) | the hills tilt up into a frieze; three silhouettes step out of the ridge and walk right | whip right, zoom 1.0 → 1.12 |
| 4 | 6.3 → 8.6 (line 3) | animals walk the margin, their tracks drawing the letters of the line into the ground | crane out to the whole ridge, roll −0.012 |
| 5 | 8.6 → 9.58 | the lantern is lit at the ridge's left end; the ink of the last word runs on and becomes the horizon | hold, one kick-zoom |

---

### `shadows` — 9.58 → 17.19 · 3 lines · paper

**World**: a row of tall figures against a dusk wall. **Device**: *stamped* — each sung word is pressed
onto a figure's chest as it peels off the wall.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | 9.58 → 11.3 | the wall + five figures, seen small; word 1 stamped on figure 1 | crane in from the left, zoom 0.9 → 1.15 |
| 2 | 11.3 → 13.0 | figure 1 peels off and slides right; words 2–3 land on figures 2–3 | whip right, roll +0.015 |
| 3 | 13.0 → 14.2 | hatched rain across the wall; the figures shrink; the words on them stay their size | tilt down, zoom 1.15 → 1.0 |
| 4 | 14.2 → 15.8 | the figures are gone; the words are left standing as objects on the ground | punch-in on the words, roll −0.02 |
| 5 | 15.8 → 17.19 | the words' strokes unravel into a frieze of animals that walks off the right edge | crane out to full width |

### `father` — 17.19 → 24.81 (n=1) and 93.39 → 101.00 (n=2) · paper

**World**: a giant hand, and the boy it is talking to. **Device**: *written on the palm* — the father's
words are lettered in `hscript` at **120 px across the palm**, and each word curls one finger as it is
finished. At n = 1 the boy stands on a word like a ledge; at n = 2 he is taller than the hand and the
words are carved on the wall behind instead.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | first 1.6 s | the hand whips in from the right, palm open, blotting the page | crash-dolly in, roll +0.03 |
| 2 | +1.6 → line 1 = 2.4 s | word 1 written across the palm; finger 1 curls on its last stroke | punch-in to the palm, zoom 1.0 → 1.25 |
| 3 | next 2.2 s | word 2, finger 2; at n = 2 the same beat is the boy *standing* on the word | orbit a little, roll −0.02 |
| 4 | next 2.2 s | word 3, the hand closing; the boy's shadow is cast across the words | crane out, zoom → 1.0 |
| 5 | last 1.4 s | the hand leaves; the words stay on the page, larger, as the only objects | hold with a kick-zoom |

### `older` — 24.81 → 32.43 (n=1) and 101.00 → 108.62 (n=2) · paper

**World**: a heartbeat monitor scribbled by hand. **Device**: *riding a path* — the line *is* the trace:
the words are spaced along the scribble's own path, rotating with it, and each kick inflates the loop
under the word being sung.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | first 1.8 s | the trace draws itself, loop after loop; a flat line at the left | follow the pen, zoom 1.2 → 1.0 |
| 2 | lines 1–2 | words ride the loops; each kick swells the loop under the live word | whip along the trace, roll +0.02 |
| 3 | line 3 | the loop under the last word blows up to full frame and escapes the page | punch-in then outExpo out, roll −0.04 |
| 4 | last 1.2 s | the escaped loop returns as a *tree* (n = 2: the tree is already there and the words hang in it) | crane out wide |
| 5 | n = 2 only | the small figure stands inside a solid `night2` shadow thrown by the canopy | tilt up to the canopy, hold |

### `chorus` — 32.43 → 40.05 (n=1) and 108.62 → 116.24 (n=2) · night

**World**: the night as a printed sheet. **Device**: *masked out* — the night is a stencil and the words
are **holes cut in it**: each word opens as a window onto the paper (light) under the night, at **180 px**.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | first 0.9 s | the night pours down over the page (v1's move — keep, faster) | crash-dolly down, roll +0.03 |
| 2 | line 1 | the stencil opens word by word; the three windows of light ignite on the beat | punch-in per word, zoom 1.0 → 1.3 |
| 3 | between lines | the reverse drawing: the day page's hills re-drawn as paper-coloured outlines on night | whip, roll −0.02 |
| 4 | line 2 | the words open wider than the page; the frame's ink runs off the sheet (n = 2) | crane out past the frame |
| 5 | last 1.0 s | the holes close one by one, the last one holding the frame | hold, kick-zoom |

### `nights` — 40.05 → 59.10 (n=1, long) and 116.24 → 123.39 (n=2) · paper → night

**World**: an album of three photographs whose frames are the words' containers. **Device**: *stamped* —
each line is stamped into a print as it develops, and the prints are objects you can count. At the drop
(≈47.2 s, inside n = 1) the page tears along the horizon and the night pours in through the slit.

| movement | window (n = 1) | what changes | camera |
|---|---|---|---|
| 1 | 40.05 → 42.5 | the album page with three mounts; print 1 develops, line 1 stamped into it | crane in, zoom 0.95 → 1.2 |
| 2 | 42.5 → 45.5 | print 2, the kite; line 2 stamped; the shelf underneath catches the light | whip right, roll +0.015 |
| 3 | 45.5 → 47.2 | the empty third mount; the words land on the page itself | punch-in on the empty frame |
| 4 | 47.2 → 52 (drop) | the tear opens along the horizon; night floods up through the prints | crash-dolly through the slit, roll −0.05 |
| 5 | 52 → 59.10 | prints 1–2 swallowed, the empty frame last; the page fully night | crane out wide, hold |
| — | n = 2 (116.24 → 123.39) | the same page on night: print 3 is now full (father and son the same height), the line in `rose` | crane in slowly, hold at the end |

### `climb` — 59.10 → 68.62 · instrumental · night (no words)

**World**: a torn page as a cliff. Five movements: the tear widens; the boy climbs hand over hand, one
reach per bar (2-beat steps); the camera **orbits** him as he passes the torn strips; strips fall in
pairs per downbeat; the last movement is the reach out of frame. Add: the stars he passes swell in
depth, and the thread he climbs is the opening plate's horizon, now vertical.

### `sky` — 68.62 → 78.62 · instrumental · night (no words)

**World**: a constellation drawn as one line, then walked. Five movements: (1) wide night, the boy tiny
with the thread's end; (2) the line draws star to star, each star igniting as the pen arrives (one
continuous polyline slice); (3) the camera **orbits/rolls** to reveal the line as a figure; (4) the line
retraces; (5) the retrace lands and the same line opens as a road wedge to the horizon.

### `thunder` — 78.62 → 85.77 · 3 lines · night

**World**: a storm front with a fire under it. **Device**: *woven* — the rain-hatch inside the clouds is
drawn so that the **letters of the line appear inside the hatching** (the cloud is the paper, the hatch
is the type), then the name S-O-N is carved into three stars.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | first 1.6 s | three cloud masses slide in, each hatched; the fire's rings start | whip left, roll +0.02 |
| 2 | line 1 | the letters of "When thunder clouds…" appear *inside* the hatch of cloud 1 | punch-in to the cloud, zoom 1.0 → 1.35 |
| 3 | line 2 | the fire blooms ring by ring; the hatch of cloud 2 spells the line | tilt down to the fire, roll −0.015 |
| 4 | line 3 | the three stars ignite; S, O, N carved, one letter per star | crane up to the stars, zoom 1.2 |
| 5 | last 1.2 s | the clouds close over everything but the fire | pull back wide, hold |

### `shores` — 85.77 → 93.39 · 3 lines · night

**World**: a sea chart. **Device**: *typed in / annotated* — the words are chart lettering along bearing
lines, and the route's dotted line spells the last line's words dot by dot.

| movement | window | what changes | camera |
|---|---|---|---|
| 1 | first 1.5 s | the coast draws; the sea floods in as a flat `cool` mass | crane in from the sea, roll +0.01 |
| 2 | line 1 | the boat is drawn and the chart's lettering runs along the coast | whip along the coast, zoom 1.1 |
| 3 | line 2 | the compass rose appears; the route's dots start walking | punch-in on the compass |
| 4 | line 3 | the `lantern` thread from the far corner to the boat; the dots spell the words | crane out along the thread |
| 5 | last 1.2 s | the chart rolls up from the right edge (a chart, not a page) | hold, kick-zoom |

### `ember` — 123.39 → 135.29 · instrumental · night → paper (no words)

Five movements: the rings die one per bar; the camera **cranes** slowly as the night lifts from the
edges; a kick-driven pulse on the ember; the blow-out on three consecutive drawings; the last movement
is bare paper with the fire's scorch mark left as the only trace.

### `never` — 135.29 → 138.62 · 1 line · paper **(lead)**

**World**: a stamp. **Device**: *stamped* — v1's move, kept and sharpened: the block falls, hits on the
line's first beat, the phrase bleeds in word by word at 140 px, the splat freezes, the three windows of
light are stamped above. Two movements v1 lacked: the block **lifts and exits frame** (so the plate ends
on the impression alone), and the page takes one kick-driven shudder.

### `outro` — 138.62 → 176.66 · 2 lines (138.76, 169.15) · paper/night **(lead)**

**World**: the road at dusk, walked. **Device**: *written in the world* — line A is chalked on the road
at **110 px in perspective** (it recedes with the road), line B is carved into the milestone in
`hscript`. Movements: (1) the page turns onto the landscape (keep); (2) the walk, one step per beat;
(3) the meeting and the lantern's handover on the beat; (4) the camera cranes out as the son goes over
the crest, the road's perspective flattening; (5) the return: the film's first frame, with the pen
starting the line — the loop.

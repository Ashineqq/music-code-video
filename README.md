# I'm Upping My P(doom) — one song, two films

Two generative, code-rendered music videos of the same song, told from **one engine**. Every frame is a
deterministic function of song time, so the live preview in the browser and the offline 1080p60 (or
4K60) export are identical, and a frame is reproducible from its timestamp alone.

| film | look | plates | runtime |
|---|---|---|---|
| **`pdoom`** — the code-rendered original | plates of an illustrated treatise: engraving, raymarched 3D, blooming signal orange, one palette | 22 | 156.65 s |
| **`handdrawn`** — the hand-drawn edition | ink and flat cel paint on aged paper, every outline re-drawn 12 times a second, no glow anywhere | 22 | 156.65 s |

The two editions share the engine, the song, the word-level timing data, the fonts and the offline
renderer. Each owns its own edit (which plate plays when) and its own plates. They were two repos until
they were merged into this one: `pdoom` was the original, `handdrawn` is the re-shoot of it, and the
merge is what makes the shared engine a single source instead of two copies of it.

**Watch the original film in 4K on YouTube:** https://www.youtube.com/watch?v=5EoO5413dBY

The YouTube upload is an earlier render: it averages only 4 sub-frames per frame for motion blur, so fast
motion shows stepped copies, and YouTube's compression smears the film grain. For the best version, render
it locally (see [Render a film](#render-a-film)): the current code picks up to 324 sub-frames per frame
where the motion needs them.

The films were made with Claude in Claude Code: the concept and treatment, the lyric alignment and audio
analysis, the renderer, every plate and the renders were all worked out in conversation with Claude.

The song is not ours: see [Credits](#credits) for who wrote and made it.

## Layout

Shared by both films:

- `audio/pdoom.mp3` — the song (the Claude-Pop version, see Credits).
- `app/src/engine/` — the renderer core: timeline playback, deterministic sub-frame motion blur with
  adaptive sampling, the post chain (bloom, halation, grain), typography (Archivo, IBM Plex Mono,
  Cormorant Garamond, single-stroke plotter fonts), GPU line batches, HUD. Both films render through it
  unchanged; a film only asks for different post parameters.
- `app/src/main.ts` — the app entry. It picks the film and hosts the preview player and the export API.
- `app/scripts/render.ts` — the offline renderer (headless Chrome → raw frames over WebSocket → ffmpeg).
- `app/public/fonts/` — the type, split by owner: `common/` is what every film loads (the IBM Plex
  Mono voice, which the engine's own HUD readout needs, and the single-stroke EMS/Hershey lettering
  library), `pdoom/` is the code-rendered film's own (32 Archivo/Cormorant instances, the OpenType
  sources `analysis/make_fonts.py` cuts them from, and the Archivo license). The first path segment is
  the owner, so a film never fetches another film's type: the hand-drawn film takes none of the ~5 MB of
  display faces it never draws with.
- `app/public/plates/` — 14 stills of the original film. Its outro's rewind montage loads them by number
  (`plates/figNN.jpg`); the hand-drawn film draws its own flip-book and reads none of them.
- `docs/ENGINE.md` — the engine and scene API, for authors of either film's plates.
  `tools/check-plates.mjs` — the static gate (`--film pdoom` for the original's edit table).

Per film (its own edit, its own plates, its own data, its own written rules):

- `app/src/films/<film>/timeline.ts` — **the edit**: 22 windows anchored to lyric lines and snapped to
  the beat grid, so changing a lyric moves the whole cut.
- `app/src/films/<film>/scenes/` — one module per plate, plus that film's shared helpers.
  - `pdoom/scenes/` — the original's plates with their per-plate helpers (`open-geo.ts`,
    `shoggoth-glsl.ts`, `_motifs.ts`, …). `app/src/films/pdoom/plates.json` holds the hand-picked times
    `render.ts plates` uses when it regenerates the stills above.
  - `handdrawn/scenes/` — the cel plates, and `_ink.ts`: the hand-drawn layer (the paper shader, the cel
    palette and `Sheet` — wobbled strokes, flat fills, hatching, hand-lettering).
- `data/<film>/` — the song data that film cuts on: `lyrics.json` (word-level timings) and `audio.json`
  (tempo 132.007 BPM, beats, downbeats, sections, onsets, loudness envelopes), plus `*.approx.json`, the
  approximate pair the engine falls back to when the precise file is missing. The two films' folders are
  byte-identical today — they are free to diverge, and the gate says so when they do.
  `data/handdrawn/TREATMENT.src.md` is the hand-drawn edition's plate-by-plate creative brief.
- `docs/pdoom/TREATMENT.md` — the original's concept, style bible and plate-by-plate treatment.
  `docs/handdrawn/HAND-DRAWN.md` — the hand-drawn edition's rules (exposure on twos, the boil, the
  palette, the lettering).
- `tools/make-stubs.mjs` — the hand-drawn edition's authoring bootstrap: writes placeholder plates for
  every entry of its edit (it refuses to overwrite a real plate).

The original film's analysis toolchain, which produces `data/pdoom/*.json`:

- `lyrics/lyrics.src.js` — the original line-level lyrics (approximate timings).
- `analysis/` — Python (uv) tools: Demucs stem separation, CTC forced alignment cross-checked with
  Whisper, beat/downbeat/onset analysis. See `analysis/align.py` and `analysis/analyze.py`.
- `out/` — renders and stills (not committed).

## Requirements

[bun](https://bun.sh), Google Chrome (the offline renderer drives it headless through `playwright-core`)
and ffmpeg with libx264. The preview needs neither Chrome nor ffmpeg. The analysis tools need
[uv](https://docs.astral.sh/uv/); the renderer doesn't.

## Look at it

```sh
cd app
bun install
bunx vite
```

Open http://localhost:5173 — `?film=handdrawn` for the cel edition (`pdoom` is the default, and
`VITE_FILM=handdrawn bunx vite` makes it the default for the session). `?t=23` starts at 23 s.

| Key | Action |
|---|---|
| space | play / pause |
| ← / → | seek ±1 s (±5 s with shift) |
| `,` / `.` | step one frame |
| `[` / `]` | previous / next plate |
| `l` | loop the current plate |
| `h` | hide the player UI |

The preview renders in real time (60 fps on a recent Mac). The export is not real time and is heavier.

## Render a film

```sh
cd app
bun scripts/render.ts video --film pdoom     --samples auto --shutter 0.2 --out ../out/pdoom.mp4
bun scripts/render.ts video --film handdrawn --samples auto --shutter 0.2 --out ../out/pdoom-handdrawn.mp4
```

`--film` picks the edition (default `pdoom`) in every mode.

- **Output:** 1920×1080 at 60 fps, x264 CRF 16, AAC audio.
- **Motion blur:** every frame is the average of many sub-frames spread over a short shutter
  (`--shutter 0.2`, a fifth of the frame time), so fast motion leaves a continuous streak instead of a
  few stepped copies. `--samples auto` picks the count per frame (4, 12, 36, 108 or 324) and stops once
  more sub-frames would no longer change the image by more than `--tol` levels of 255 (default 3);
  `--samples N` takes a fixed N instead (`--samples 4` makes a quick draft). The hand-drawn edition wants
  this too: its drawing clock is 12 drawings a second, so without a shutter the 60 fps output would show
  each drawing twice as a hard step. How it works: "Motion blur and sampling" in
  [`docs/ENGINE.md`](docs/ENGINE.md).
- **Other modes:** `stills --t 1.5,40.2`, `sheet --from 20 --to 35` (contact sheets, `--cuts` for every
  plate boundary), `perf --from 20 --to 25` (frame cost), `gpu` (which renderer), and `plates`. Working
  files land in `out/<film>/`; videos land in `out/`. `plates` writes one still per plate into
  `app/public/plates/` — for `pdoom` it regenerates the 14 stills its outro rewinds through (rerun it
  after changing one of those plates), for `handdrawn` it writes `<n>-<id>.jpg` for glancing at the
  whole film.

### 4K

```sh
cd app
bun scripts/render.ts video --film pdoom --scale 2 --samples auto --shutter 0.2 --x264 aq-mode=3:rc-lookahead=30 --out ../out/pdoom-4k.mp4
```

- **Output:** a true 3840×2160 render (not an upscale): every layer, line and shader is rendered at the
  physical resolution. Plates are laid out in 1920×1080 logical pixels, so the 4K frame looks like the
  1080p one, only sharper.
- **Cost:** GPU-bound. A frame takes from about 40 ms (a still frame) to over 10 s (the ray-marched rooms
  at 108–324 sub-frames). The whole song took about 2.5 hours on an M5 Pro, rendered as segments in two
  parallel pipelines (`--from`/`--to`, then a lossless concat). Each pipeline uses about 5 GB for headless
  Chrome plus about 4 GB for ffmpeg; the shorter x264 lookahead above keeps ffmpeg's memory down.
- **Encoding:** the film grain is rendered per 4K pixel, which is expensive to encode: at the default
  CRF 16 the file runs at about 670 Mbit/s (13 GB for the song, 8× the 1080p file), `--crf 18` gives
  about 450 Mbit/s and `--crf 20` about 230 Mbit/s.
- `--scale 2` works with every mode. `stills` then saves full-resolution PNGs, and `perf` measures 4K
  frame times. In the browser preview, add `&scale=2` to the URL.

## Check it

Two gates, no browser involved:

```sh
node tools/check-plates.mjs                    # the hand-drawn film's edit table and cel rules (0.1 s)
node tools/check-plates.mjs --film pdoom       # the original film's edit table (cel rules don't apply)
cd app && npx tsc --noEmit                     # the type gate over both films (~1 s)
```

`tools/check-plates.mjs` rebuilds the film's edit table from `data/<film>/*.json` with the same maths as its
`timeline.ts` and checks that the 22 windows tile `0 → 156.65 s` with no gap, overlap or dangling scene
file, and that every lyric line starting inside a plate's window is actually queried by that plate. For
the hand-drawn film it also checks that every plate is an `InkedScene` with a `draw()`, and that no plate
uses additive blending, the glow-era line batch, a non-deterministic clock or a colour outside the cel
palette. It cannot tell you whether a plate *looks* right — that is what the preview and the contact
sheet are for.

`tools/probe-*.mjs` are two optional preview probes (they do drive a browser; nothing in the normal
workflow needs them).

## Regenerate the timing data

The committed `data/<film>/*.json` files are all the renderer needs. Regenerating them needs the stems
and intermediates, which are not in the repo:

- **Stems:** Demucs `htdemucs_ft` into `analysis/stems/htdemucs_ft/pdoom/`
  (`uv run python -m demucs -n htdemucs_ft -o stems ../audio/pdoom.mp3`), plus the lead vocal from a
  mel-band-roformer karaoke model (audio-separator) in `analysis/stems/karaoke/lead.wav`.
- **Intermediates:** `ctc_emissions.py`, `whisper_run.py` and `vocal_feats.py` write them to
  `analysis/work/`. The pipeline is described at the top of `analysis/align.py`.

```sh
cd analysis
uv run python align.py      # data/pdoom/lyrics.json
uv run python analyze.py    # data/pdoom/audio.json
```

They write the original film's data set. If the hand-drawn edition should follow a new alignment, copy
it across too (`cp data/pdoom/lyrics.json data/pdoom/audio.json data/handdrawn/`); the gate prints
whether the two films' copies still agree.

The models download about 4 GB of weights into `analysis/.cache/`; delete that folder afterwards.

## Credits

- **Song:** "I'm Upping My P(doom)". The lyrics are by [osmarks](https://docs.osmarks.net/hypha/p%28doom%29_song_objectively_correct_interpretation),
  built on an opening verse and chorus by [MusicPerson](https://www.udio.com/creators/MusicPerson), with
  lines suggested on the EleutherAI Discord and help from Claude on the outro and final chorus. The
  original was generated with Udio and released in November 2024
  ([YouTube](https://www.youtube.com/watch?v=uEB5E67vcPA)). These films use the "Claude-Pop" version made
  with Suno, posted by [deckard (@slimer48484)](https://x.com/slimer48484/status/2097752569212756134) in
  September 2026.
- **Fonts:** Archivo, IBM Plex Mono and Cormorant Garamond (SIL Open Font License). Single-stroke EMS and
  Hershey fonts via the `hersheytext` package (OFL / public domain).

## License

The code is released under the [MIT License](LICENSE). The fonts in `app/public/fonts/` keep their own
licenses (see Credits), and the song and lyrics (`audio/`, `lyrics/`, `data/*/lyrics.json`) are not covered
by it: they belong to their authors (see Credits).

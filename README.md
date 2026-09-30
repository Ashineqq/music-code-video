# music-code-video — 三支代码生成的 MV，一套引擎

两支同一首歌的生成式代码渲染 MV + 第三支别的歌的，共三支，由**一套引擎**渲染（`pdoom` 原片、它的手绘重拍 `handdrawn`、以及手绘风的《The Nights》）。每一帧都是歌时间的确定性函数：浏览器里的实时预览与离线的 1080p60（或 4K60）导出完全一致，任何一帧都能凭时间戳复现。

| 片子 | 画面 | 版式 | 时长 |
|---|---|---|---|
| **`pdoom`** — 代码渲染原片 | 一册图解末日论的版画集：雕刻感、raymarch 3D、会发光的信号橙、只用一套调色板 | 22 | 156.65 s |
| **`handdrawn`** — 手绘重拍版 | 旧纸上的墨线与平涂 cel：每秒钟把每根轮廓重画 12 遍，全片没有一处发光 | 22 | 156.65 s |
| **`the-nights`** — 第三支（另一首歌） | 同一套 cel 语言的夜之绘本：暖纸、一盏提灯、合唱时整页化入夜空 | 17 | 176.66 s |

两支片子共享引擎、歌曲、逐词时间数据、字体与离线渲染器；各自拥有自己的剪辑表（哪一段在什么时候放）和自己的版式。它们原本是两个仓库，现在合并成一个：`pdoom` 是原片，`handdrawn` 是它的重拍——合并之后共享的引擎只有一份，而不是两份拷贝。

**原片 4K 观看（YouTube）：** https://www.youtube.com/watch?v=5EoO5413dBY

YouTube 上那版是较早的渲染：每帧只平均 4 个子帧，因此快速运动能看到阶梯状的重影，而且 YouTube 的压缩把颗粒抹糊了。想要最好的版本就在本地渲染（见 [渲染成片](#渲染成片)）：现在的代码在需要的地方每帧最多取 324 个子帧。

片子是用 Claude 在 Claude Code 里做的：概念与导演稿、歌词对齐与音频分析、渲染器、每一段版式、以及最终渲染，都是在与 Claude 的对话中做出来的。

歌不是我们的：词曲作者见 [Credits](#credits)。

## 目录

两支片子共享：

- `audio/<film>.mp3` — 每支片子一首歌：`audio/pdoom.mp3`（Claude-Pop 版本，见 Credits）、`audio/the-nights.mp3`（导入的，不入库）。
- `app/src/engine/` — 渲染器核心：时间表播放、带自适应采样的确定性子帧运动模糊、后处理链（bloom / halation / grain）、排版（Archivo、IBM Plex Mono、Cormorant Garamond、单线绘图仪字体）、GPU 线批、HUD。两支片子都原样走这条链，片子只是要求不同的后处理参数。
- `app/src/main.ts` — 应用入口：选片子，并承载预览播放器与导出接口。
- `app/scripts/render.ts` — 离线渲染器（无头 Chrome → WebSocket 传原始帧 → ffmpeg）。
- `app/public/fonts/` — 字体，按归属分开：`common/` 是每支片子都加载的（IBM Plex Mono——引擎自己的 HUD 读数也要用它——以及单线 EMS/Hershey 笔迹字体库）；`pdoom/` 是原片专属的（32 个 Archivo/Cormorant 实例，加上 `analysis/make_fonts.py` 切这些实例用的可变字体源，和 Archivo 的授权文本）。**归属就是第一层目录名**，所以一支片子不会去取另一支的字体：手绘版因此完全不下载它一个笔画都不画的约 5 MB 展示字体。
- `app/public/plates/` — 原片的 14 张静帧。原片 outro 的倒卷蒙太奇按编号读它们（`plates/figNN.jpg`）；手绘版自己画翻页动画，一张都不读。
- `docs/ENGINE.md` — 引擎与场景 API（写给两支片子的版式作者看）。
- `tools/check-plates.mjs` — 静态门（`--film pdoom` 检查原片的剪辑表）。
- `tools/import-song.mjs`、`tools/beat-grid.mjs` — 导入一首新歌（网易云 `.ncm` → MP3、`.lrc` → 数据）与估一条恒定速度的拍网格。见 [导入一首歌](#导入一首歌网易云-ncm--lrc)。

每支片子各有（自己的剪辑表、自己的版式、自己的数据、自己的画风文档）：

- `app/src/films/<film>/timeline.ts` — **剪辑表**：22 个窗口，边界锚在歌词上并吸附到拍网格，所以改一句词整条剪辑会跟着走。
- `app/src/films/<film>/scenes/` — 一版式一模块，外加该片子的共享构件。
  - `pdoom/scenes/` — 原片的版式与其各自的辅助模块（`open-geo.ts`、`shoggoth-glsl.ts`、`_motifs.ts` …）。`app/src/films/pdoom/plates.json` 存着 `render.ts plates` 重新生成上面那批静帧时用的手选时刻。
  - `handdrawn/scenes/` — cel 版式，以及 `_ink.ts`：手绘层（纸的着色器、cel 调色板，和 `Sheet`——抖动的笔线、平涂、排线、手写字）。
- `data/<film>/` — 该片子据以剪辑的歌曲数据：`lyrics.json`（逐词时间）与 `audio.json`（132.007 BPM、拍、强拍、段落、onset、响度包络），外加 `*.approx.json`（精确文件缺失时引擎回退用的近似档）。两支片子的这两份今天是逐字节相同的——允许以后分化，静态门会提示是否还一致。`data/handdrawn/TREATMENT.src.md` 是手绘版的逐版式创作稿。
- `docs/pdoom/TREATMENT.md` — 原片的概念、风格圣经与逐版式 treatment；`docs/handdrawn/HAND-DRAWN.md` — 手绘版的规则（一拍两张、抖动、调色板、字体）。
- `tools/make-stubs.mjs` — 手绘版的版式脚手架：为它剪辑表里的每个条目写占位版式（不会覆盖已写好的版式）。

原片的分析工具链（产出 `data/pdoom/*.json`）：

- `lyrics/lyrics.src.js` — 原始的行级歌词（时间粗略）。
- `analysis/` — Python（uv）工具：Demucs 分轨、CTC 强制对齐并用 Whisper 交叉验证、节拍/强拍/onset 分析。见 `analysis/align.py` 与 `analysis/analyze.py`。
- `out/` — 渲染与静帧（不入库）。

## 环境要求

[bun](https://bun.sh)、Google Chrome（离线渲染器通过 `playwright-core` 驱动无头 Chrome）和带 libx264 的 ffmpeg。**预览这两样都不需要**。分析工具链需要 [uv](https://docs.astral.sh/uv/)，渲染器不需要。

## 看片

```sh
cd app
bun install
bunx vite
```

打开 http://localhost:5173 —— 手绘版加 `?film=handdrawn`（默认是 `pdoom`；也可以 `VITE_FILM=handdrawn bunx vite` 让这一次启动默认就是手绘版）。`?t=23` 表示从 23 秒开始。

| 按键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | ±1 秒（按住 shift 为 ±5 秒）|
| `,` / `.` | 前后一帧 |
| `[` / `]` | 上一段 / 下一段版式 |
| `l` | 循环当前版式 |
| `h` | 隐藏播放器 UI |

预览在近年的 Mac 上是实时的（60 fps）。导出不是实时的，而且重得多。

## 渲染成片

```sh
cd app
bun scripts/render.ts video --film pdoom     --samples auto --shutter 0.2 --out ../out/pdoom.mp4
bun scripts/render.ts video --film handdrawn --samples auto --shutter 0.2 --out ../out/pdoom-handdrawn.mp4
```

`--film` 在每一个模式里都用来选片子（默认 `pdoom`）。

- **输出**：1920×1080、60 fps、x264 CRF 16、AAC 音频。
- **运动模糊**：每一帧是许多子帧在很短快门内的平均（`--shutter 0.2`，即帧长的五分之一），所以快速运动会拉出连续的拖影，而不是几个阶梯。`--samples auto` 逐帧决定子帧数（4、12、36、108 或 324），当再加子帧对画面的改变已不超过 `--tol`（默认 3 个 255 级）时停下；`--samples N` 用固定值（`--samples 4` 出草稿）。手绘版同样需要它：它的作画时钟是每秒 12 张，不加模糊的话 60 fps 输出里每张画会硬邦邦地停两帧。原理见 `docs/ENGINE.md` 的 “Motion blur and sampling”。
- **其他模式**：`stills --t 1.5,40.2`、`sheet --from 20 --to 35`（接触表，`--cuts` 出每一个版式边界）、`perf --from 20 --to 25`（单帧耗时）、`gpu`（用的是哪个渲染器）、`plates`。工作文件落在 `out/<film>/`，成片落在 `out/`。`plates` 往 `app/public/plates/` 写“一版式一帧”：对 `pdoom` 而言是重新生成它 outro 倒卷要读的那 14 张静帧（改过对应版式后要重跑），对 `handdrawn` 则是写 `<n>-<id>.jpg`，供一眼看全片。

### 4K

```sh
cd app
bun scripts/render.ts video --film pdoom --scale 2 --samples auto --shutter 0.2 --x264 aq-mode=3:rc-lookahead=30 --out ../out/pdoom-4k.mp4
```

- **输出**：真正的 3840×2160（不是放大）：每一层、每一根线、每一个着色器都按物理分辨率渲染。版式仍按 1920×1080 的逻辑像素排版，所以 4K 帧与 1080p 构图相同，只是更锐。
- **代价**：吃 GPU。一帧从约 40 ms（静止帧）到 10 秒以上（raymarch 房间在 108–324 子帧时）。整首歌在 M5 Pro 上约 2.5 小时，做法是切成段、跑两条并行流水线（`--from`/`--to`，最后无损拼接）。每条流水线约占 5 GB（无头 Chrome）加约 4 GB（ffmpeg）；上面那个更短的 x264 lookahead 就是为了压住 ffmpeg 的内存。
- **编码**：颗粒是按 4K 单像素渲染的，编码很贵：默认 CRF 16 下码率约 670 Mbit/s（整首歌 13 GB，是 1080p 文件的 8 倍），`--crf 18` 约 450 Mbit/s，`--crf 20` 约 230 Mbit/s。
- `--scale 2` 对所有模式都有效：`stills` 会存全分辨率 PNG，`perf` 量的是 4K 单帧耗时。浏览器预览则在 URL 后加 `&scale=2`。

## 静态门

两道门，都不需要浏览器：

```sh
node tools/check-plates.mjs                    # 手绘版的剪辑表 + cel 规则（约 0.1 秒）
node tools/check-plates.mjs --film pdoom       # 原片的剪辑表（cel 规则不适用）
cd app && npx tsc --noEmit                     # 一次过两支片子的类型门（约 1 秒）
```

`tools/check-plates.mjs` 用与 `timeline.ts` 相同的算术、从 `data/<film>/*.json` 重建该片子的剪辑表，检查 22 个窗口无缝无重叠地铺满 `0 → 156.65 s`、没有指向不存在的版式文件，并检查每个窗口内开始的歌词行确实被那一版式查询过。对手绘版还会检查：每个版式都是带 `draw()` 的 `InkedScene`，且没有任何版式使用叠加混合、发光时代的线批、不确定的时钟，或 cel 调色板以外的颜色。此外会检查字体目录与“归属 = 第一层目录名”的规则一致，并提示两支片子的数据是否还一致。它证明不了“好不好看”——那要靠预览和接触表。

`tools/probe-*.mjs` 是两个可选的预览探针（它们确实会驱动浏览器；日常流程用不到）。

## 导入一首歌（网易云 `.ncm` + `.lrc`）

`tools/import-song.mjs` 把网易云下载的 `.ncm` 还原成 MP3，并把它的歌词文件整理成这个工程读得懂的数据。不联网、无依赖：

```sh
bun tools/import-song.mjs ~/Music/网易云音乐/"Avicii,Nicholas Furlong - The Nights.ncm"
# 也可显式指定歌词 / 输出目录 / 恒定拍网格（默认会自动找同目录同名的 .lrc）
bun tools/import-song.mjs <song>.ncm --lrc <song>.lrc --out songs/<slug> --bpm 126 --offset 0.12
```

产物都在 `songs/<slug>/`（`<slug>` 取自歌曲标题；**这个目录在 `.gitignore` 里**）：

| 文件 | 是什么 |
|---|---|
| `<slug>.mp3` | 还原出的音频（下载的是 FLAC 就是 `.flac`）。`.ncm` 是容器不是编码：里面的音频就是普通 MP3，用 AES-128-ECB 保护密钥、再与一条 keybox 流异或。 |
| `<slug>.lrc` | 整理过的歌词：网易云那种 `{"t":…,"c":[…]}` 版权行丢掉、时间戳保留，与音频同名，所以播放器能自己配对。 |
| `lyrics.json` | 引擎读的那份（`data/<film>/lyrics.approx.json` 的形状）：行时间来自 LRC，词时间在行内按时长均分、`conf: 0`。 |
| `audio.approx.json` | 只在给了 `--bpm` 时写：恒定速度的拍网格（`silent-mv` 那一档，没有 onset 与包络）。 |
| `cover.jpg`/`cover.png`、`meta.json` | 容器里带的封面，以及元数据（曲名/艺人/专辑/时长/码率/歌词文件里的版权行）。 |

**这份数据的上限是行级同步**：LRC 只有行时间，所以 `lyrics.json` 里每个词的起止是按词长均分的，`conf: 0`。要精确到词，得走 `analysis/align.py` 那条工具链（需要分轨与模型），把它的输出放到 `data/<film>/lyrics.json`——引擎优先读精确档，缺失才回退到 `*.approx.json`。

歌与歌词不是我们的，不在本仓库的 MIT 授权范围内：`songs/` 不入库，也别把带音轨的成片推到公开仓库。

## 重新生成时间数据

入库的 `data/<film>/*.json` 就是渲染器需要的全部。重新生成它们需要分轨与中间产物，仓库里没有：

- **分轨**：Demucs `htdemucs_ft` 输出到 `analysis/stems/htdemucs_ft/pdoom/`（`uv run python -m demucs -n htdemucs_ft -o stems ../audio/pdoom.mp3`），再用 mel-band-roformer 的 karaoke 模型（audio-separator）取主唱，放到 `analysis/stems/karaoke/lead.wav`。
- **中间产物**：`ctc_emissions.py`、`whisper_run.py`、`vocal_feats.py` 写在 `analysis/work/`；整条流程描述在 `analysis/align.py` 开头。

```sh
cd analysis
uv run python align.py      # data/pdoom/lyrics.json
uv run python analyze.py    # data/pdoom/audio.json
```

它们写的是原片那份数据。若手绘版也要跟着新对齐走，就一起拷过去（`cp data/pdoom/lyrics.json data/pdoom/audio.json data/handdrawn/`）；静态门会打印两支片子的数据是否还一致。

模型会往 `analysis/.cache/` 下约 4 GB 权重，跑完可以删掉。

## Credits

- **歌曲**："I'm Upping My P(doom)"。歌词由 [osmarks](https://docs.osmarks.net/hypha/p%28doom%29_song_objectively_correct_interpretation) 所作，基于 [MusicPerson](https://www.udio.com/creators/MusicPerson) 的开场主歌与副歌，另有一些句子来自 EleutherAI Discord 上的建议，outro 与最后一段副歌有 Claude 参与。原曲由 Udio 生成、2024 年 11 月发布（[YouTube](https://www.youtube.com/watch?v=uEB5E67vcPA)）。这两支片子用的是 Suno 生成的 "Claude-Pop" 版本，由 [deckard (@slimer48484)](https://x.com/slimer48484/status/2097752569212756134) 于 2026 年 9 月发布。
- **字体**：Archivo、IBM Plex Mono、Cormorant Garamond（SIL Open Font License）。单线 EMS 与 Hershey 字体来自 `hersheytext` 包（OFL / 公有领域）。

## 授权

代码以 [MIT License](LICENSE) 发布。`app/public/fonts/` 里的字体各自保留其授权（见 Credits），歌与歌词（`audio/`、`lyrics/`、`data/*/lyrics.json`）不在 MIT 覆盖范围内：它们属于各自的作者（见 Credits）。

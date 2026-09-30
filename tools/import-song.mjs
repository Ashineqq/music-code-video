#!/usr/bin/env bun
// Import a song into the project: NetEase Cloud Music `.ncm` -> MP3, and a lyric file -> the data the
// engine reads.
//
//   bun tools/import-song.mjs "<song>.ncm" [--lrc "<song>.lrc"] [--out songs/<slug>]
//                              [--bpm 129] [--offset 0.15] [--keep-credits]
//
// What it writes into the output folder (default `songs/<slug>/`, `<slug>` from the song's own name):
//
//   <slug>.mp3          the decrypted audio (`<slug>.flac` if the download was FLAC). `.ncm` is a
//                       container, not a codec: inside is a plain MP3, AES-128-ECB'd for the key and
//                       XOR'd with a keybox stream. Decrypting it is a format conversion of a file you
//                       already have; nothing is downloaded.
//   <slug>.lrc          the lyric file cleaned up, line-level: credit lines out, timestamps kept, and
//                       named after the audio so a player pairs the two by itself.
//   cover.png|jpg       the cover art the container carries, if any.
//   meta.json           title / artist / album / duration / bitrate, plus the credits the lyric file listed.
//   lyrics.json         the same lyrics in the shape the engine loads (`data/<film>/lyrics.approx.json`):
//                       line times from the LRC, word times spread evenly inside each line, confidence 0.
//                       This is the **approximate** tier — the engine's fallback data. Exact word timing
//                       comes from the alignment toolchain (`analysis/align.py`), which needs stems and
//                       the models, not the LRC.
//   audio.approx.json   only with `--bpm`: a constant-tempo beat grid (`data/<film>/audio.approx.json`),
//                       the same tier `silent-mv` uses (BPM + phase, no onsets, no envelopes). This one
//                       IS made up — it has no idea where the drums are. For a grid that follows the
//                       music, run `analysis/analyze.py` (needs Demucs stems).
//
// `songs/` is in .gitignore: the song and its lyrics are not ours and are not covered by this repo's
// MIT license. Keep them out of any public push.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createDecipheriv } from 'node:crypto';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const ROOT = path.resolve(import.meta.dirname, '..');

// ------------------------------------------------------------------ the .ncm container
/** The two AES keys are fixed constants of the format (hex, to keep them printable). */
const KEY_AES = Buffer.from('687a4852416d736f356b496e62617857', 'hex'); // "hzHRAmso5kInbaxW"
const META_AES = Buffer.from('2331346c6a6b5f215c5d2630553c2728', 'hex'); // "#14ljk_!\]&0U<'("
const PREFIX_KEY = 'neteasecloudmusic';
const PREFIX_META = '163 key(Don\'t modify):';

const aesEcb = (buf, key) => {
  const d = createDecipheriv('aes-128-ecb', key, null);
  d.setAutoPadding(false);
  return Buffer.concat([d.update(buf), d.final()]);
};
const xor = (buf, k) => { const o = Buffer.allocUnsafe(buf.length); for (let i = 0; i < buf.length; i++) o[i] = buf[i] ^ k; return o; };
/** PKCS#7 unpad. The reference implementations' AES strips it, so both the key and the metadata need it. */
const unpad = (buf) => {
  const n = buf[buf.length - 1];
  return n >= 1 && n <= 16 && buf.subarray(buf.length - n).every((x) => x === n) ? buf.subarray(0, buf.length - n) : buf;
};

/** RC4-style key schedule over 0..255 — the stream the audio is XOR'd with. */
function keyBox(key) {
  const box = new Uint8Array(256);
  for (let i = 0; i < 256; i++) box[i] = i;
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + box[i] + key[i % key.length]) & 0xff;
    const t = box[i]; box[i] = box[j]; box[j] = t;
  }
  return box;
}

function parseNcm(buf) {
  if (buf.subarray(0, 8).toString('latin1') !== 'CTENFDAM') throw new Error('not an .ncm file (magic CTENFDAM missing)');
  let o = 8 + 2;
  const klen = buf.readUInt32LE(o); o += 4;
  const key = unpad(aesEcb(xor(buf.subarray(o, o + klen), 0x64), KEY_AES)).subarray(PREFIX_KEY.length); o += klen;
  const box = keyBox(key); // the keybox is scheduled over the key only — "neteasecloudmusic" and the padding are out

  const mlen = buf.readUInt32LE(o); o += 4;
  const raw = xor(buf.subarray(o, o + mlen), 0x63); o += mlen;
  const inner = Buffer.from(raw.subarray(PREFIX_META.length).toString('latin1'), 'base64');
  const json = unpad(aesEcb(inner, META_AES)).subarray(6).toString('utf8'); // past "music:"
  const meta = JSON.parse(json);

  // After the metadata: 5 bytes, then the cover section as two uint32s — how much room it takes and
  // how many bytes are actually written — then the audio. Miss this and the keybox stream is out of
  // step for the whole file (the mask repeats every 256 bytes, so everything decrypts to noise).
  o += 5;
  const imageRoom = buf.readUInt32LE(o); o += 4;
  const imageLength = buf.readUInt32LE(o); o += 4;
  const image = imageLength > 0 ? buf.subarray(o, o + imageLength) : null;
  o += Math.max(imageRoom, imageLength);

  const audio = Buffer.allocUnsafe(buf.length - o);
  for (let i = 0; i < audio.length; i++) {
    const j = (i + 1) & 0xff;
    audio[i] = buf[o + i] ^ box[(box[j] + box[(box[j] + j) & 0xff]) & 0xff];
  }
  return { meta, audio, image };
}

// ------------------------------------------------------------------ the lyric file
/** `[mm:ss.xx]`, `[mm:ss.xxx]` or `[mm:ss]` -> seconds. */
const timeOf = (mm, ss, frac) => +mm * 60 + +ss + (frac ? +`0.${frac}` : 0);

/** Player tags the file may carry: `[ti:…]`, `[ar:…]`, `[offset:…]`. */
const TAGS = /^\[(ti|ar|al|by|offset|re|ve|length|kana):(.*)\]$/i;
/** Lines that are credits, not lyrics — 网易云 ships them as timed lines too. */
const CREDITS = /^\s*(作词|作曲|编曲|制作人|出品|监制|混音|母带|录音|和声|吉他|贝斯|鼓|键盘|编程|produced by|written by|composed by|lyrics by|music by|mixed by|mastered by|arranged by)\s*[:：]/i;

/**
 * Parse both shapes 网易云 puts in a `.lrc`: plain `[mm:ss.xx]text` lines, and their JSON credit
 * lines (`{"t":800,"c":[{"tx":"作词: "},{"tx":"Tim Bergling"}]}`) which carry no lyric at all.
 */
function parseLrc(text) {
  const meta = {}; const credits = []; const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('{')) {
      try {
        const j = JSON.parse(line);
        credits.push({ t: (j.t ?? 0) / 1000, text: (j.c ?? []).map((c) => c.tx ?? '').join('').trim() });
        continue;
      } catch { /* not one of theirs — fall through and treat it as text */ }
    }
    const tag = TAGS.exec(line);
    if (tag) { meta[tag[1].toLowerCase()] = tag[2].trim(); continue; }

    // one line may carry several timestamps: "[00:10.00][01:20.00]text"
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    const text_ = line.replace(/\[[^\]]*\]/g, '').trim();
    if (stamps.length === 0) { if (text_) lines.push({ t: null, text: text_ }); continue; }
    for (const s of stamps) lines.push({ t: timeOf(s[1], s[2], s[3]), text: text_ });
  }
  const offset = +(meta.offset ?? 0) / 1000; // the tag is in ms; a positive offset means "play earlier"
  const dropped = [];
  const kept = [];
  for (const l of lines) {
    if (l.t === null || !l.text) continue;
    if (!flag('keep-credits') && CREDITS.test(l.text)) { dropped.push(l); continue; }
    kept.push({ t: Math.max(0, l.t - offset), text: l.text });
  }
  kept.sort((a, b) => a.t - b.t);
  return { meta, credits, lines: kept, dropped };
}

const stamp = (t) => {
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  return `${mm}:${ss}.${String(Math.round((t % 1) * 1000)).padStart(3, '0')}`;
};

// ------------------------------------------------------------------ the engine's data shapes
/**
 * `lyrics.json` in the shape `Lyrics` loads: line times from the LRC, word times spread inside the line
 * in proportion to word length, confidence 0. Deliberately crude — this is the fallback tier, and it
 * says so through `conf`. Word times never leave their line (`end` is inside the next line's start).
 */
function toLyricsJson(lines, duration) {
  const at = (i) => lines[i]?.t ?? duration;
  return {
    song: slug,
    duration: +duration.toFixed(3),
    source: 'lrc (line-level; word times are spread evenly inside each line)',
    lines: lines.map((l, i) => {
      const start = l.t;
      const end = Math.min(i + 1 < lines.length ? at(i + 1) : duration, start + 12);
      const words = l.text.split(/\s+/).filter(Boolean);
      // 94% of the line is the sung span: the words share 90% of it by length, the rest is the gap
      // between them, half a gap of air before the first word.
      const usable = Math.max(0.2, (end - start) * 0.94);
      const total = words.reduce((a, w) => a + w.length, 0) || 1;
      const gap = (usable * 0.1) / words.length;
      let x = start + gap / 2;
      const spoken = words.map((w) => {
        const d = usable * 0.9 * (w.length / total);
        const o = { w, start: +x.toFixed(3), end: +(x + d).toFixed(3), conf: 0 };
        x += d + gap;
        return o;
      });
      return { i, text: l.text, start: +start.toFixed(3), end: +(start + usable).toFixed(3), words: spoken };
    }),
  };
}

/** A constant-tempo grid: `silent-mv`'s tier. Beats from `--bpm` + `--offset`, bars of four. */
function toAudioJson(bpm, offset, duration, lines) {
  const period = 60 / bpm;
  const beats = [];
  for (let t = offset; t < duration; t += period) beats.push(+t.toFixed(4));
  const downbeats = beats.filter((_, i) => i % 4 === 0);
  const sections = [{ name: 'song', start: 0 }];
  return {
    duration: +duration.toFixed(3),
    bpm: +bpm.toFixed(3),
    fps: 100,
    beat_period: +period.toFixed(5),
    time_signature: 4,
    beats,
    downbeats,
    sections,
    features: {},
    onsets: { kick: [], snare: [], hat: [], vocal: [] },
    notes: 'constant-tempo grid from --bpm/--offset; no onsets or envelopes (run analysis/analyze.py for those)',
    lyric_lines: lines.length,
  };
}

// ------------------------------------------------------------------ run
const src = process.argv[2];
if (!src || src.startsWith('--')) {
  console.error('usage: bun tools/import-song.mjs "<song>.ncm" [--lrc "<song>.lrc"] [--out dir] [--bpm N] [--offset S] [--keep-credits]');
  process.exit(2);
}
const ncm = readFileSync(src);
const { meta, audio, image } = parseNcm(ncm);

/** The song's own name, not the download's file name, is what the folder should be called. */
const cleanName = (s) => s.replace(/[/\\:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
const slug = (arg('slug') ?? cleanName(meta.musicName ?? '') ?? '').toLowerCase()
  || cleanName(path.basename(src, path.extname(src))).toLowerCase()
  || path.basename(src, path.extname(src));
const OUT = path.resolve(arg('out', path.join(ROOT, 'songs', slug)));
mkdirSync(OUT, { recursive: true });

// Inside the container the audio is a plain file again; its own magic says which.
const isId3 = audio.subarray(0, 3).toString('latin1') === 'ID3';
const fmt = isId3 ? 'mp3' : audio.subarray(0, 4).toString('latin1') === 'fLaC' ? 'flac' : 'mp3';
const audioName = `${slug}.${fmt}`;
writeFileSync(path.join(OUT, audioName), audio);
const tagBytes = isId3 ? (audio[6] << 21) | (audio[7] << 14) | (audio[8] << 7) | audio[9] : 0;
let coverName = null;
if (image && image.length) {
  const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  coverName = png ? 'cover.png' : 'cover.jpg';
  writeFileSync(path.join(OUT, coverName), image);
}

const duration = (meta.duration ?? 0) / 1000;

const lrcPath = arg('lrc', path.join(path.dirname(src), `${path.basename(src).replace(/\.ncm$/i, '')}.lrc`));
let lrc = null;
try { lrc = parseLrc(readFileSync(lrcPath, 'utf8')); } catch { console.error(`! no lyric file at ${lrcPath} (pass --lrc)`); }

const report = {
  file: src, slug, out: OUT,
  audio: { file: audioName, format: fmt, bytes: audio.length, id3_tag_bytes: tagBytes, duration_s: +duration.toFixed(3), bitrate: meta.bitrate ?? null },
  cover: coverName,
  meta: { musicId: meta.musicId, name: meta.musicName, artist: (meta.artist ?? []).map((a) => (Array.isArray(a) ? a[0] : a)).join(' / '), album: meta.album, albumId: meta.albumId },
};
if (lrc) {
  const lyrics = toLyricsJson(lrc.lines, duration);
  writeFileSync(path.join(OUT, 'lyrics.json'), JSON.stringify(lyrics, null, 1) + '\n');
  // named after the audio, so a player that opens the mp3 finds the lyrics by itself
  writeFileSync(path.join(OUT, `${slug}.lrc`), lrc.lines.map((l) => `[${stamp(l.t)}]${l.text}`).join('\n') + '\n');
  report.lyrics = {
    kept: lrc.lines.length,
    dropped: { lookLikeCredits: lrc.dropped.length, jsonMetadata: lrc.credits.length },
    credits: lrc.credits.map((c) => c.text), // 制作人: … / 作词: … — the file's credits, not lyrics
    tags: lrc.meta,
    first: lrc.lines[0], last: lrc.lines[lrc.lines.length - 1],
    covered_to_s: +lrc.lines[lrc.lines.length - 1].t.toFixed(2), duration_s: +duration.toFixed(2),
  };
  const bpm = +arg('bpm', '0');
  if (bpm > 0) {
    const grid = toAudioJson(bpm, +arg('offset', '0'), duration, lrc.lines);
    writeFileSync(path.join(OUT, 'audio.approx.json'), JSON.stringify(grid) + '\n');
    report.grid = { bpm, beats: grid.beats.length, downbeats: grid.downbeats.length };
  }
}
writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(report, null, 1) + '\n');

console.log(JSON.stringify(report, null, 1));
console.log(`\nwritten to ${OUT}`);
console.log(`  ${audioName} ${(audio.length / 1048576).toFixed(2)} MB · ${fmt} · ${(duration / 60).toFixed(2)} min${isId3 ? ` · ID3 tag ${tagBytes} B` : ''}`);
if (coverName) console.log(`  ${coverName} ${(image.length / 1024).toFixed(0)} KB`);
if (lrc) console.log(`  lyrics: ${lrc.lines.length} lines kept, ${lrc.dropped.length + lrc.credits.length} credit/metadata lines dropped`);
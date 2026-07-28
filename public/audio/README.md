# Audio

This folder is intentionally empty.

All ambience — lofi, rain, wind, birds and thunder — is **synthesised live in the
browser** by `lib/audio/engine.ts`. Nothing is downloaded, so the app ships with
working sound at 0 KB of bandwidth and no licensing to track.

## What used to be here

Five files named `*.mp3` that were actually uncompressed RIFF/WAV data (1.2 MB
for ~14 seconds of content), produced by a `generate_audio.js` script:

- `lofi.mp3` — three static sine waves, a 4-second chord drone
- `rain.mp3` — raw `Math.random()` white noise, 2 seconds
- `wind.mp3` — lightly filtered white noise, 2 seconds
- `birds.mp3` — a 2500 Hz sine beep once per second
- `thunder.mp3` — **byte-identical to `rain.mp3`**

They were removed in favour of generation, which has no loop seam and never
repeats.

## Using a real lofi recording instead

The lofi channel is the one layer where a real recording beats synthesis.

1. Drop your file at `public/audio/lofi.mp3`.
2. In `lib/audio/engine.ts`, set:
   ```ts
   export const LOFI_SAMPLE_URL: string | null = '/audio/lofi.mp3';
   ```

It is then used on the first play, falling back to the generated chord
progression if the fetch or decode fails. The constant defaults to `null` so the
app makes no audio request at all out of the box.

Recommended: a 60–180 s seamless loop, mono, ~96 kbps. Sources that are free and
require no attribution:

- [Pixabay Audio](https://pixabay.com/music/) — filter to royalty-free
- [Freesound](https://freesound.org/) — filter the licence facet to CC0

If you add a file, also add it to `ASSETS_TO_CACHE` in `public/sw.js` so it is
available offline, and record the source and licence below.

## Attributions

None — nothing in this folder is third-party content.

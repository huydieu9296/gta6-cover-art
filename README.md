# Vice Panels

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/huydieu9296/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/huydieu9296/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos into a GTA-style multi-panel cover, in the browser, offline.

Vice Panels takes up to three of your photos and lays them out as slanted
panels — the way a Grand Theft Auto cover does — with a colour grade (sunset,
neon, dusk or clean), a sun emblem, and a bold outlined caption with a
letterspaced subtitle. Every panel's crop is adjustable (zoom and position),
the layout switches between three panels and two, and the cover exports as a
real PNG at 1920×1080, 1080×1080 or 1080×1350.

## Run it

```sh
node serve.ts          # serves app/ on http://localhost:8080
```

Open the page, load photos (or use the three built-in samples), pick a grade
and a size, and press **Export PNG**. No photo ever leaves the machine: the
app is plain static files with no network requests.

## Layout

- `app/` — the editor: `index.html`, `style.css`, `src/cover.js` (the
  renderer), `src/main.js` (the editor), `src/shots.js` (screenshot scenes),
  and three sample photos in `app/samples/`.
- `screenshots/` — the entry's four screenshots: the landscape cover, the
  editor with a photo loaded, the square cover, and the portrait cover.
- `main.ts` — hands the entry in: it copies `app/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `serve.ts` — a small static server for local testing.
- `shots.json` — the four screenshot scenes (`?shot=cover` or `?shot=editor`).

An entry for the [GTA 6 Cover Art bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01).

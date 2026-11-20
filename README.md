# Vice Panels — GTA-Style Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wildhanry/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wildhanry/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA 6-style cover art:
the iconic multi-panel poster layout with leaning dividers, a Vice City neon-sunset
colour grade, bold condensed lettering, and a one-click PNG export in the common
post sizes (1080 × 1350, 1080 × 1080, 1920 × 1080, plus a 1080 × 1920 story size).

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty ($250 in USDC,
50 paid places). Everything is original work: no Rockstar Games logos, artwork or
fonts are used anywhere.

## Why it is different

- **Real multi-panel covers** — six layouts (Hero Grid, Nine Grid, Film Strip,
  Top Hero, Duo Split, Full Bleed) with the genre's slanted panel dividers, not a
  single photo in a frame.
- **Any photo, framed your way** — one photo per panel or one photo spread across
  all of them; click a panel to select it, drag on the cover to reframe, scroll or
  slide to zoom. Portrait and landscape photos both cover-fit cleanly.
- **A real colour grade** — five grades (Vice Sunset, Neon Nights, Golden Hour,
  Poster Ink, Clean) applied per pixel with a gradient map, plus per-panel grade
  overrides, an intensity slider, film grain and a vignette.
- **Poster lettering** — a huge outlined title with a sunset gradient fill, a neon
  script subtitle, a caption bar, wanted stars and a corner badge, all editable.
- **Private by design** — the app is static files only and makes no network
  request. Photos are read on your own machine and never uploaded anywhere.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Any static file server pointed at `app/` works just as well — there is no build
step and nothing to install.

## Run it locally

From the kit folder, run `node serve.ts --port 8123` and open http://localhost:8123 in your browser.
Load a photo into a panel, adjust the framing and title, then click Export PNG to save your cover.

## Hand it in (what main.ts does)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-app.ts`, the make.fun kit library.

## Layout of this repository

- `app/index.html`, `app/style.css` — the editor page and its styling
- `app/src/panels.js` — the six cover layouts as leaning polygons
- `app/src/grade.js` — the five colour grades (gradient map + washes)
- `app/src/render.js` — the cover renderer shared by preview and PNG export
- `app/src/main.js` — editor wiring: uploads, drag reframing, export
- `app/src/shots.js` — reproducible `?shot=` scenes used for the screenshots
- `app/samples/` — demo photographs made with an image model for this app
- `screenshots/` — captures of the running app and covers it exported

## License

MIT — see `LICENSE`.

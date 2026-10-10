# Lumen Gallery

An art-mode screensaver for LG webOS TVs, like the art mode on Samsung's The Frame: paintings and Islamic art shown full screen in a real-looking
frame, with a slideshow. Companion to [Lumen](https://github.com/ammar027/lumen-webos), the launcher.

## Features

- **Pictures:** about 7,000 public-domain works: European and American paintings, Asian paintings and prints (Cleveland Museum of Art, CC0) and Islamic art,
  such as calligraphy, Quran manuscripts, tiles, carpets, domes and geometric ornament (Cleveland Museum of Art and Wikimedia Commons).
  The pictures are loaded from the internet when they are shown; nothing is stored on the TV.
- **People in art:** hidden by default (works with people or faces are filtered out; a work counts as people-free only when its title or description says it is a
  landscape, sea, flowers, still life, ornament or similar). It is best effort, not a guarantee. It can be switched on.
- **Look:** fill the screen or keep the whole picture; mattes (modern, wide, flexible, shadowbox) in 16 colours; 10 frame finishes (real wood and metal photo textures),
  4 widths and an inner liner; a canvas-weave and picture-light "real painting" effect; warmer tone at night; dimming; clock; caption with credit.
- **Slideshow:** 15 seconds to a day, shuffle or in order, collections, favourites.
- **As the TV screensaver:** with the TV-side watcher from [Lumen](https://github.com/ammar027/lumen-webos) (`tools/tv/watch.sh`) and a flag file, Lumen Gallery
  takes over when the TV's screensaver would start. It can be switched in the app's settings.

## Keys

Left/Right: previous/next. Up: add to favourites. Down: show the caption. OK: settings. Back: leave. Magic Remote: click opens settings, wheel changes picture.

## Build and install

Needs Node 18+ and the webOS CLI (`@webos-tools/cli`).

```sh
npm install
npm run build && npm run package
npx -p @webos-tools/cli ares-install --device lgtv build/*.ipk
```

## The art list

`src/config/art.ts` is generated from public APIs; rebuild it with:

```sh
python3 tools/harvest_cma.py        # Cleveland Museum of Art Open Access API -> tools/cma.json
python3 tools/harvest_commons.py    # Wikimedia Commons Islamic categories -> tools/commons.json
python3 tools/build_art.py          # sorts into collections, flags works with people -> src/config/art.ts
```

## Credits and licence

Code: [MIT](LICENSE). Pictures and other material: see [NOTICES.md](NOTICES.md). Not affiliated with Samsung, Apple or LG Electronics.

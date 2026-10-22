# Doom

Doom (1993) for the **Nokia 8110 4G** (KaiOS 2.5 / GerdaOS). It is the real engine, Chocolate
Doom by way of [doomgeneric](https://github.com/ozkl/doomgeneric), compiled to JavaScript and
bundled with the free shareware episode, *Knee-Deep in the Dead*.

![Doom](app/icons/icon112x112.png)

## Features

- The full shareware episode (E1M1-E1M9), with the demos, menus, automap and screen melt.
- The original 4:3 picture: 320x200 shown at 240x180, centred on the upright screen.
- Always run is on to start, and you can switch it off.
- Settings and saved games are kept between launches.
- No sound yet.

## Keys

| Key | Action |
|-----|--------|
| Arrows | Move and turn |
| OK | Fire; choose in menus; answer "yes" |
| `5` / Call | Open doors, use switches |
| `4` / `6` | Strafe |
| `1` / `3` | Previous / next weapon |
| `0` / Right softkey | Automap |
| `#` | Always run on / off |
| Left softkey / Back | Menu; answer "no" |
| `*` | Show the keys |

Quit Game in the menu closes the app.

## How it works

KaiOS 2.5 runs Gecko 48, which has no WebAssembly. Emscripten builds the C source to plain
JavaScript (`WASM=0`, `LEGACY_VM_SUPPORT`) instead, as `app/js/doom.js`.

- `doomgeneric/`: doomgeneric at commit e257a09, without the other platforms' backends. The
  KaiOS changes are behind defines:
  - `DG_CANVAS_RGBA`: frames are written as canvas RGBA bytes through a palette lookup.
  - `DG_NONBLOCKING_WIPE`: the screen melt runs one step per frame. The original busy-wait
    loop would freeze the browser.
  - `DG_KEYPAD_PROMPTS`: prompts say "press ok or back".
  - `I_Quit` also hands control back to the page.
- `port/doomgeneric_kaios.c`: the platform layer. It provides the key queue and weapon
  cycling, and runs the main loop only when a game tic is due.
- `app/js/keys.js`: maps phone keys to Doom keys.
- `app/js/files.js`: copies the config and savegames to and from localStorage.
  IndexedDB never answers in sideloaded apps on the phone.
- `app/js/main.js`: loads the WAD, draws the frames and handles keys, pausing and quitting.

## Build and install

Compiling needs Docker (it uses the `emscripten/emsdk:3.1.74` image). The compiled
`app/js/doom.js` is checked in, so installing does not.

```
npm run compile        # doomgeneric -> app/js/doom.js
npm test               # unit tests (node --test)
npm run build          # dist/application.zip
npm run install-phone  # push, register, restart b2g
npm run uninstall-phone
```

## Licence

The engine (doomgeneric, based on Chocolate Doom and id Software's source release) and this
port are under the GNU GPL v2; see `LICENSE`.

`app/doom1.wad` is id Software's shareware Doom 1.9 IWAD (MD5
`f0cefca49926d00903cf57551d901abe`), included unmodified. id allowed the shareware episode to be
freely shared, but it is not under the GPL. Doom is a trademark of id Software, and this project
is not affiliated with id Software or ZeniMax.

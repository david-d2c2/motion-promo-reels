# Engine internals

Read this only when you must adapt the engine itself (a new gag, a new format, a template change). For normal batches, edit data, not the engine. Back to [SKILL.md](../SKILL.md) section 4.

Technical keys:
- **Determinism:** every frame is computed from `t = f/FPS`. No `requestAnimationFrame`, no unseeded randomness (use `hash(n)`).
- Helpers: `clamp`, `P(t,a,b)` (progress), easings (`eOC`, `eIOC`, `eOX`, `eIX`, `eOB` with bounce), `T_()` for text with letterSpacing and alpha, `fit()` to shrink text until it fits, `rr()` for rounded rectangles.
- Scenes are functions that receive local time `u = t - T.scene`. In v1 templates, transitions are a ±0.16 s background-color wipe at every cut. In the catalog template, each scene is painted to an offscreen canvas and two of them are composited during a cut, so any transition shape works (push, iris, diagonal, blinds, zoom).
- **Preload every font face** before rendering (`document.fonts` → `load()` for each). Loading only a few weights lets the first frames of other weights fall back to a system font — invisible in a single still, glaring in a batch.
- `render.js`: `page.evaluateOnNewDocument(spec => window.SPEC = spec)`, wait for `window.READY` (fonts and images loaded), then `canvas.toDataURL('image/jpeg', .93)` → stdin of `ffmpeg -f image2pipe -c:v mjpeg -i - -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p`.
  - Launch Chrome with `--allow-file-access-from-files`; otherwise local images taint the canvas.
  - Look for Chrome or Edge in their standard paths, or in `CHROME_PATH`.
  - Keep a `--stills t1,t2,…` mode for review.
- Mux: `-af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -movflags +faststart -shortest`.
- Audio (v3): `sonido.py` is shared; each `audio.py` declares sections (`intro`, `tension`, `lleno`, `ligero`, `pausa`, `final`) at scene times and calls `s.efecto(type, t)` (`corte`, `aparece`, `tick`, `check`, `precio`, `cierre`, `golpe`, `golpe_suave`, `subida`, `tecla`, `error`, `glitch`, `barrido`) at the animation's instants. Load the voice (`s.voz`) **before** `s.musica` so melody and chords make room.
  - Per-gag effects stay in the template (`s.sonido(signal, t)`): zipper = an accelerating burst of clicks; machine = a click train + hum; scissors = two snaps; shine = a high arpeggio.
  - Sidechain under four-on-the-floor kicks, a gentle cut below 110 Hz for phone speakers, `tanh` to limit, normalize, then `loudnorm` to −14 LUFS.
- Shared files (`variacion.js`, `variar.js`, `hoja.py`, `sonido.py`, `voz.js`, `comprobar.js`) live once in `core/comun/`; `render.js` for both 9:16 templates in `core/9x16/`. A project carries copies made by `core/nuevo.js`: never fork them inside a project — improve them in `core/` and run `node core/nuevo.js --actualizar <project>`.
- On Windows the scripts call `python`; on Linux and macOS, `python3`.

## Working on the engine itself

- The source of truth is `core/` (`comun/` for all three templates, `9x16/` for `render.js` of the vertical ones) plus each template's own files (`motor.html`/`anim.html`, `audio.py`, data). Never edit an engine file inside a project to improve it: change it in `core/`, then `node core/nuevo.js --actualizar <project>`.
- To run a template straight from the repo: `node core/nuevo.js --dev` copies the engine into `templates/*` (git ignores those copies). Or create a throwaway project with `node core/nuevo.js <template> /tmp/x`.
- Bump `core/VERSION` when the engine changes: projects record it in `.motor.json`.
- The release workflow creates a project from each template and runs `comprobar.js`, `variar.js` and the contact sheet before packaging; it also checks that `sonido.py` and `variacion.js` list the same music styles.

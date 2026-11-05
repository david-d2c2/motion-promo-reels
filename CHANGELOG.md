# Changelog

## v3.1 · 2026-11

**Choosing the look.** Until now the options were only documented in tables, and nothing told the agent to offer them.

- `node variar.js --opciones`: a menu of everything that can be chosen in the template (music styles with tempo, effect packs, colors, transitions, layouts per scene), one line each, with the current restrictions and the themes the brand's colors can't support. `--json` for tools.
- `node variar.js --preferencias musica=tranquila efectos=sutiles colores=claro movimiento=suave`: plain-word preferences translated into `variacion.json` (exact names also work; `limpiar` removes them). Earlier preferences are kept.
- `SKILL.md` section 3a: the format comes from the template; if a request says nothing about tone, ask one question, translate it, never invent option names; a table from common phrases to preferences.
- Fixed: plans kept from earlier runs now must comply with the current restrictions. Before, changing `variacion.json` left existing plans untouched. Now visuals that don't comply are re-planned, music that doesn't comply gets new music only, and the rest stays as it was.
- `comprobar.js` accepts a person's own palettes from `CFG.paletas` in `variacion.json`.

## v3 · 2026-11

**They don't sound alike either, and they can talk.** v2 varied the picture, but the music was still one loop with a different tempo or timbre, and the sound effects were the same in every video.

### Music (`sonido.py`, shared by the three templates)
- **Ten styles** with their own instruments, drums, groove, mode and harmony: `piano`, `pizzicato`, `electro`, `lofi`, `funk`, `synthwave`, `acustico`, `cinematico`, `ambiente`, `house`.
- A **seed** per video composes the melody (a two-bar motif with variations) and picks the drum pattern, fills, harmonic rhythm, arpeggio pattern and register. Measured on the same style, two seeds plus the plan's key and progression bring spectral correlation down to about 0.75.
- **Arrangement by scenes**: sections (`intro`, `tension`, `lleno`, `ligero`, `pausa`, `final`) follow the scene timeline, with a drum fill before each cut, a cymbal into the full band and a final chord. Voice-leading between chords, swing, sidechain for four-on-the-floor styles, and a gentle cut below 110 Hz for phone speakers.
- `python3 sonido.py --demo <folder>` renders every style; `--estilos` lists them.

### Sound effects
- Five packs (`digital`, `organico`, `cinematico`, `minimo`, `juguete`) for every effect type (cut by transition, appear, tick, check, price, outro, impact, riser, key, error, glitch, whoosh). Chimes are tuned to the music's key.
- Each template's `audio.py` now only says *when* things happen; gag sounds (zipper, sewing machine, scissors, shine) stay in the template.

### Variation
- `plan.musica` gains `estilo`, `sfx`, `bpm` (inside the style's range) and `semilla`; the planner balances styles and packs across the batch and keeps neighbours apart. `VARIACION.md` reports neighbours sharing a music style.
- Plans kept from v2 (no style) get music only; their visuals stay as they were.
- `variacion.json` (any template) restricts options to the brand and takes priority over the `variacion` blocks.

### Voice-over (`voz.js`, optional)
- Providers: `elevenlabs`, `voicebox` (local, OpenAI-compatible endpoint), `openai` (any `/v1/audio/speech` server), `comando` (any local TTS), `ninguna`.
- The default script only uses on-screen text (hook, name, price, website); prices and domains are written as they are spoken. Hand-written scripts per product or per person video.
- One take per sentence, cached by provider, voice, model and text; ElevenLabs runs stop at `tope_caracteres` unless `--confirmar`, and spending is logged. Neighbouring sentences are sent as context. Keys come from the environment or `~/.config/motion-promo-reels/env`, never from the project.
- Silence trimming, placement without overlaps (up to 15 % faster, then low-priority lines dropped, with warnings), ducking of music (~−10 dB) and effects, `.srt` next to each MP4, and an optional "Voz generada con IA" label in the outro.
- Tested against servers that implement the documented ElevenLabs and Voicebox requests (headers, paths, bodies, errors), and with a local command. Not tested against the live services from the build environment.

### Any model
- `comprobar.js`: environment (Node, ffmpeg, Python, Chrome, dependencies, style lists in sync) and every data file, with "where → what → how to fix" messages. `render.js` runs the data check first and stops on errors.
- `SKILL.md` opens with a step-by-step quick path and stop conditions.
- `install.sh --agents` / `install.ps1 -Agents` install into `~/.agents/skills` (agents such as pi); installer messages no longer assume Claude Code.
- The release workflow also checks `sonido.py`, `voz.js` and `comprobar.js` are identical in the three templates, and that the music styles match between Python and JavaScript.

### Compatibility
- No new dependencies. Without `locucion.json`, no voice. The visuals are unchanged; the audio of existing plans now uses the style engine (the v2 plans' music is regenerated with a style).

## v2 · 2026-11

**No two videos built the same way.** In v1 every video of a template shared the timeline, layout, transition, colors, music and, within a catalog category, the hook text. v2 gives every video a construction plan, in all three templates.

### Shared variation core
- `variacion.js` (profiles, options, color themes derived from the brand palette with WCAG contrast checks, timeline, seeded planner), `variar.js` (CLI + `VARIACION.md` report) and `hoja.py` (contact sheets) are the **same file in all three templates**; `render.js` is the same in both 9:16 templates. Each template declares its profile in `package.json` (`perfilVariacion`).
- The release workflow fails if the shared files drift apart.
- Brand restrictions in `variacion.json` (any template), or in the `variacion` block of `config.json` / `productos.json`.

### `catalogo-9x16`
- **Plan per product**: order of range/facts/price, 3 layouts per scene (product `tarjeta`/`difuso`/`arco`, range `pildoras`/`regla`/`rejilla`, facts `lista`/`numerada`/`apiladas`, price `grande`/`sello`/`etiqueta`), 6 transitions (+ crossfade for sensitive categories), light/dark/accent theme, text entrance, hook variant and music.
- Anti-repetition against the previous reels in publishing order and balanced use of every option. `--temporada` re-plans for re-publishing; `extraer.js` plans only new products.
- **Hook variants per category** (`variantes`), rotating within the category. New condition `si_colores`; placeholders `{ncolores}`, `{nrango}`, `{nvariantes}`.
- `render.js all --hoja`: contact sheets of the batch.

### `producto-9x16`
- Same planner and axes, with layouts of its own: product `tarjeta`/`abajo`/`polaroid`, colors `contador`/`fila`/`abanico` (fan deck), facts `lista`/`numerada`/`etiquetas` (sewn labels), price `grande`/`sello`/`etiqueta`. Hand-written gags and product drawings are kept.
- Optional `hooks` per product (phrase variants that change per season) and `marca.colores` for the palette.
- `audio.py` follows the plan: tempo, progression, key, timbre (pizzicato, marimba, celesta), arpeggio pattern and transition sounds.

### `persona-16x9`
- **Versions of the same video**: `node variar.js 3` → `versiones.json` with A/B/C as different as possible; `node render.js video promo_B.mp4 --version B`; `node render.js hoja`.
- Palettes `neon` (v1) / `tinta` / `lima`, or the person's own in `CFG.paletas`. All colors are now tokens (no hard-coded `rgba`).
- Headline `golpe`/`mascara`/`maquina`, stats `columnas`/`foco`/`rejilla`, method `letras`/`linea`/`escalera`, stack `marquesina`/`cuadricula`, background `reticula`/`puntos`/`limpio`, music progression/key/timbre.
- The story order and key instants are fixed; `audio.py` follows the layouts that move a beat (stats every 0.7 s in `foco`, key clicks for `maquina`).
- "LINES OF CODE" now also counts `variacion.js`, which runs to make the video.

### Fixed (all found by pixel-comparing v1 and v2)
- Font faces not preloaded: catalog loaded 3 of 9, product 2 of 4, person 3 of 5. Headlines, pills, notes and the role line could render in a fallback font. All faces are now loaded before the first frame.
- Catalog `ritmo` gag dropped words at 112 BPM while the kick played at 96 BPM.
- Catalog range layouts left an empty lower half when a product had few attributes.

### Compatibility
- Without a plan (or without `--version`), every template renders v1's construction: pixel-identical except for the fixes above.

## v1
- Initial release: `persona-16x9`, `producto-9x16`, `catalogo-9x16`.

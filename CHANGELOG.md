# Changelog

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

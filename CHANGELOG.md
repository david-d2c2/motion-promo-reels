# Changelog

## v2 · 2026-11

**Catalog reels no longer look alike.** In v1 every reel of a batch shared the timeline, layout, transition, colors, music and, within a category, the hook text.

### Added (`templates/catalogo-9x16`)
- **Plan per product** (`plan` in `productos.json`): scene order, product/range/facts/price layouts (3 each), transition (6 + crossfade for sensitive categories), color theme (light, dark, accent), text entrance, hook variant and music (progression, key, tempo, timbre, arpeggio pattern).
- `variacion.js`: options, color themes derived from the brand palette with WCAG contrast checks, timeline and planner. Shared by the browser engine and Node.
- `variar.js`: seeded batch planner with anti-repetition against the previous reels in publishing order and balanced use of every option. Keeps existing plans; `--temporada` gives the catalog fresh plans for re-publishing; `--rehacer`; `--informe`. Writes `VARIACION.md`.
- **Hook variants per category** (`variantes` in `config.json`), rotating within each category. New condition `si_colores` and placeholders `{ncolores}`, `{nrango}`, `{nvariantes}`.
- Optional `variacion` block in `config.json` to restrict any axis to what the brand allows.
- `render.js all --hoja` + `hoja.py`: contact sheets of the whole batch, one row per reel.
- Transitions composite two offscreen scenes, so any shape works.
- `extraer.js` plans new products after each extraction and keeps existing plans (price updates don't reshuffle reels).

### Fixed
- All font faces are preloaded. v1 preloaded 3 of 9, so some headlines, pills and the closing note could render in a fallback font.
- The `ritmo` gag dropped words at 112 BPM while the kick played at 96 BPM. Picture and sound now read the same tempo.
- Range layouts center vertically on what they show, instead of leaving an empty lower half when a product has few attributes.

### Compatibility
- A product without `plan` renders with v1's structure (with the fixes above). `audio.py` without a plan sounds like v1.
- `persona-16x9` and `producto-9x16` are unchanged.

## v1
- Initial release: `persona-16x9`, `producto-9x16`, `catalogo-9x16`.

# Templates

**English** · [Español](README.es.md)

Three complete implementations of the method. All of them render as they are, using **fictional** sample data. Copy the one closest to your case and replace the data.

| Folder | Case | Format | What to change |
|---|---|---|---|
| `persona-16x9/` | Person or personal brand | 1920×1080, 27 s | The `CFG` object at the top of `anim.html`: name, real namesakes, stats, method, stack, quote and CTA. Everything else adapts on its own. |
| `producto-9x16/` | A few products, one hand-written gag each | 1080×1920, 15.5 s | `productos.json`: brand and products. Available gags: `contador`, `invisible`, `diagonal`, `brillo`. New ones go in `hook()` in `motor.html` and in `gag_sfx()` in `audio.py`. The palette is the `C` object in `motor.html`. |
| `catalogo-9x16/` | WooCommerce catalog, one gag per category, a different construction per reel (v2) | 1080×1920, 15.5 s | `config.json`: store, brands to strip, attributes (range, variants, colors, material), labels, palette, categories with their gag and phrase variants (conditions supported) and the optional `variacion` block. Then run `node extraer.js` (it also plans each reel). |

## Usage

```bash
npm install                      # puppeteer-core
pip install numpy scipy          # audio
# ffmpeg on your PATH · Chrome or Edge installed (or CHROME_PATH)

# persona-16x9
node render.js stills 1.9,6.6,9.5,14,17.3,20,25
node render.js video promo.mp4

# producto-9x16 and catalogo-9x16
node render.js all --stills 1,3.4,7.4,10.4,12.4,14.4   # review frames in out/stills
node render.js all                                      # final videos in out/
node render.js <id> ...                                 # a single product

# catalogo-9x16 only: real data from the store
node extraer.js            # productos.json + photos in img/ + REVISAR.md + plans + VARIACION.md
node variar.js             # (re)plan only: new products get a plan, existing ones keep theirs
node variar.js --temporada 2027-01   # new season: fresh plans for the whole catalog
node render.js all --hoja  # contact sheets out/hoja_NN.jpg: one row per reel, one frame per scene (needs Pillow)
```

`catalogo-9x16/ejemplo_api.json` mimics a WooCommerce Store API response, so you can test `catalogo.js` offline.

## Conditional phrases (catalog)

In `config.json`, a phrase can be fixed text or a condition:

```json
{ "si": "elástic", "texto": "Elástico y listo.", "sino": "Se calza y listo." }
{ "si_variantes": 2, "texto": "Aquí, del {vmin} al {vmax}.", "sino": "Ancho {vmin}, hasta la talla {rmax}." }
```

- `si`: a regular expression matched against the product description.
- `si_variantes`: a minimum number of variants. `si_colores`: a minimum number of colors.
- Available placeholders: `{vmin}`, `{vmax}`, `{rmin}`, `{rmax}`, `{modelo}`, `{ncolores}`, `{nrango}`, `{nvariantes}`.

## Hook variants and variation (catalog, v2)

Give each category two or three phrase sets. `frases` is variant 1; `variantes` adds more. They rotate **within the category**, so two products of the same category never repeat a hook until the variants run out:

```json
{ "nombre": "Sin cordones", "gag": "cortar",
  "frases": ["Este texto no lleva cordones.", "Y aquí sigue.", "Se calza y listo."],
  "variantes": [["Este texto iba atado.", "Ya no.", "Nada que atar."]] }
```

`node variar.js` stores a `plan` in each product of `productos.json`: scene order, layout of each scene, transition, color theme, text entrance, hook variant and music. The order of `productos.json` is treated as the **publishing order**: each plan is picked to differ as much as possible from the ones published just before it, while keeping every option evenly used. `VARIACION.md` reports the result.

The optional `variacion` block in `config.json` narrows the options when the brand asks for it. Any key you leave out allows everything:

```json
"variacion": {
  "temporada": "2026-11",
  "ventana": 12,
  "tema": ["claro", "oscuro"],
  "trans": ["barrido", "empuje", "iris", "zoom"],
  "bpm": [90, 96, 102]
}
```

Keys: `orden`, `hero` (`tarjeta`, `difuso`, `arco`), `rango` (`pildoras`, `regla`, `rejilla`), `datos` (`lista`, `numerada`, `apiladas`), `precio` (`grande`, `sello`, `etiqueta`), `trans` (`barrido`, `empuje`, `iris`, `diagonal`, `persiana`, `zoom`), `tema` (`claro`, `oscuro`, `acento`), `entrada` (`subir`, `mascara`, `letras`), `alin`, `prog`, `tono`, `bpm`, `timbre` (`piano`, `celesta`, `pizzicato`), `patron`; plus `ventana` (how many previous reels to compare with) and `temporada`.

- A theme is only used if its text and accent pass WCAG contrast against its background with the brand palette.
- `calma` (sensitive) products stay in a quiet lane: light theme, crossfade/flash/zoom, no percussion.
- To lock a reel, edit its `plan` and set `"manual": true` on the product.

## Interface strings

Every fixed on-screen string has a Spanish default and can be overridden through a `textos` block. Only include the keys you want to change.

| Template | Where | Keys |
|---|---|---|
| `persona-16x9` | `CFG.textos` in `anim.html` | `hud`, `rec`, `buscando`, `resultados` (`{n}`), `no_es`, `cero_de` (`{n}`), `fuente`, `datos_web`, `verificado`, `stack` (`{n}`), `contado`, `este_video`, `filas` (array of 4) |
| `producto-9x16` | `marca.textos` in `productos.json` | `puntada`, `aqui`, `foto`, `colores`, `lo_que_es`, `desde`, `oferta`, `precio_real`, `decimal` |
| `catalogo-9x16` | `tienda.textos` in `config.json` | `midiendo`, `remate`, `ia`, `foto`, `un_color`, `colores` (`{n}`), `datos`, `desde`, `decimal` |

English example for `producto-9x16`:

```json
"textos": { "puntada": "stitch", "aqui": "(here)", "foto": "product photo", "colores": "colors",
            "lo_que_es": "What it is", "desde": "from", "oferta": "On sale",
            "precio_real": "Real price, straight from the page.", "decimal": "." }
```

In `persona-16x9`, set `no_es` to match the person (`'✕ NOT HIM'`, `'✕ NOT HER'`, `'✕ NOT THEM'`).

## Fonts and images

Each `fonts/` folder holds the woff2 files the template uses, plus their OFL license. To switch fonts: `npm pack @fontsource/<family>@<version>` and copy the `.woff2` files (and their `LICENSE`).

The `img/` folders are empty: drop in your photos and point to them in `productos.json` (`foto`) or in the config (`logo`). With no photo, the engine shows a placeholder card. With no logo, it writes the brand name.

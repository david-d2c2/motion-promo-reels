# Templates

**English** · [Español](README.es.md)

Three complete implementations of the method. All of them render as they are, using **fictional** sample data. Copy the one closest to your case and replace the data.

| Folder | Case | Format | What to change |
|---|---|---|---|
| `persona-16x9/` | Person or personal brand | 1920×1080, 27 s | The `CFG` object at the top of `anim.html`: name, real namesakes, stats, method, stack, quote and CTA. Everything else adapts on its own. |
| `producto-9x16/` | A few products, one hand-written gag each | 1080×1920, 15.5 s | `productos.json`: brand and products. Available gags: `contador`, `invisible`, `diagonal`, `brillo`. New ones go in `hook()` in `motor.html` and in `gag_sfx()` in `audio.py`. The palette is the `C` object in `motor.html`. |
| `catalogo-9x16/` | WooCommerce catalog, one gag per category | 1080×1920, 15.5 s | `config.json`: store, brands to strip, attributes (range, variants, colors, material), labels, palette and categories with their gag and phrases (conditions supported). Then run `node extraer.js`. |

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
node extraer.js            # productos.json + photos in img/ + REVISAR.md
```

`catalogo-9x16/ejemplo_api.json` mimics a WooCommerce Store API response, so you can test `catalogo.js` offline.

## Conditional phrases (catalog)

In `config.json`, a phrase can be fixed text or a condition:

```json
{ "si": "elástic", "texto": "Elástico y listo.", "sino": "Se calza y listo." }
{ "si_variantes": 2, "texto": "Aquí, del {vmin} al {vmax}.", "sino": "Ancho {vmin}, hasta la talla {rmax}." }
```

- `si`: a regular expression matched against the product description.
- `si_variantes`: a minimum number of variants.
- Available placeholders: `{vmin}`, `{vmax}`, `{rmin}`, `{rmax}`, `{modelo}`.

## Fonts and images

Each `fonts/` folder holds the woff2 files the template uses, plus their OFL license. To switch fonts: `npm pack @fontsource/<family>@<version>` and copy the `.woff2` files (and their `LICENSE`).

The `img/` folders are empty: drop in your photos and point to them in `productos.json` (`foto`) or in the config (`logo`). With no photo, the engine shows a placeholder card. With no logo, it writes the brand name.

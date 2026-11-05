# Templates

**English** · [Español](README.es.md)

Three complete implementations of the method. All of them render as they are, using **fictional** sample data. Copy the one closest to your case and replace the data.

| Folder | Case | Format | What to change |
|---|---|---|---|
| `persona-16x9/` | Person or personal brand, A/B/C versions (v2) | 1920×1080, 27 s | The `CFG` object at the top of `anim.html`: name, real namesakes, stats, method, stack, quote and CTA (and optionally `paletas` with the person's colors). Everything else adapts on its own. Versions: `node variar.js 3`. |
| `producto-9x16/` | A few products, one hand-written gag each, a different construction per reel (v2) | 1080×1920, 15.5 s | `productos.json`: brand (optional `colores`) and products (optional `hooks` with phrase variants). Available gags: `contador`, `invisible`, `diagonal`, `brillo`. New ones go in `hook()` in `motor.html` and in `gag_sfx()` in `audio.py`. Plans: `node variar.js`. |
| `catalogo-9x16/` | WooCommerce catalog, one gag per category, a different construction per reel (v2) | 1080×1920, 15.5 s | `config.json`: store, brands to strip, attributes (range, variants, colors, material), labels, palette, categories with their gag and phrase variants (conditions supported) and the optional `variacion` block. Then run `node extraer.js` (it also plans each reel). |

## Usage

```bash
npm install                      # puppeteer-core
pip install numpy scipy          # audio
# ffmpeg on your PATH · Chrome or Edge installed (or CHROME_PATH)
node comprobar.js                # v3: checks all of the above and your data, with fix-it messages

# persona-16x9
node render.js stills 1.9,6.6,9.5,14,17.3,20,25
node render.js video promo.mp4
node variar.js 3                                  # v2: versions A, B, C -> versiones.json
node render.js video promo_B.mp4 --version B      # one version
node render.js hoja                               # contact sheet of all versions (needs Pillow)

# producto-9x16 and catalogo-9x16
node variar.js                                          # v2: one construction plan per reel -> VARIACION.md
node render.js all --hoja                               # contact sheets out/hoja_NN.jpg (needs Pillow)
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

## Variation in the other templates (v2)

`variacion.js`, `variar.js` and `hoja.py` are the same file in all three templates, and `render.js` is the same in both 9:16 ones. Each template picks its profile in `package.json` (`perfilVariacion`). If you edit a shared file, copy it to the other folders: the release workflow checks that they match.

**`producto-9x16`** works like the catalog: `node variar.js` writes a `plan` into each product of `productos.json`, and a `variacion` block in that file can restrict the options. Its layouts: product `tarjeta` · `abajo` · `polaroid`; colors `contador` · `fila` · `abanico`; facts `lista` · `numerada` · `etiquetas`; price `grande` · `sello` · `etiqueta`. Gags and product drawings are untouched. Add `"hooks": [[...], [...]]` to a product to give it phrase variants (they change with each `--temporada`). The brand palette goes in `marca.colores` (`fondo`, `fondo_cierre`, `tinta`, `texto`, `acento`, `acento_suave`).

**`persona-16x9`** makes versions of the same video. `node variar.js 3` writes `versiones.json` with versions A, B and C chosen to differ from each other as much as possible: palette (`neon`, `tinta`, `lima`), headline (`golpe`, `mascara`, `maquina`), stats (`columnas`, `foco`, `rejilla`), method (`letras`, `linea`, `escalera`), stack (`marquesina`, `cuadricula`), background (`reticula`, `puntos`, `limpio`) and music. The story order and the key instants never change, so the sound effects stay in sync. To use the person's own colors, add a palette to `CFG.paletas` with the same keys as `neon` (for example `marca`) and allow it in a `variacion.json` next to `anim.html`: `{ "paleta": ["marca", "neon"] }`.

In any template, a `variacion.json` file takes priority over the `variacion` block in `config.json` or `productos.json`.

## Choosing the look (v3.1)

The format comes from the template (products and catalogs: vertical 9:16; personal brand: horizontal 16:9). Everything else is chosen per video; you can steer it in plain words:

```bash
node variar.js --opciones                      # menu of everything that can be chosen, with descriptions (--json for tools)
node variar.js --preferencias musica=tranquila efectos=sutiles colores=claro movimiento=suave
node variar.js --preferencias estilo=lofi,piano tema=claro       # exact names
node variar.js --preferencias limpiar                            # back to everything
```

| Preference | Values |
|---|---|
| `musica` | `tranquila`, `elegante`, `energica`, `divertida`, `tecnologica`, `acustica`, `epica`, `variada` |
| `efectos` | `sutiles`, `divertidos`, `tecnologicos`, `cinematograficos`, `variados` |
| `colores` | `claro`, `oscuro`, `color` (brand accent), `variado` |
| `movimiento` | `suave`, `dinamico`, `variado` |

It writes `variacion.json`, keeps earlier preferences, and re-plans only the videos that no longer comply (the rest stay as they were). A theme the brand's colors can't support with enough contrast is announced and skipped. In `persona-16x9`, `colores` picks palettes, and your own palette from `CFG.paletas` can be named directly (`paleta=marca,neon`); then run `node variar.js 3`.

## Music and sound effects (v3)

`sonido.py` (shared) builds the soundtrack; each `audio.py` only says *when* things happen. `node variar.js` writes into every plan a music **style**, a tempo inside its range, key, progression, a **seed** and a **sound-effects pack**, and keeps neighbouring videos in different styles.

| Style | Character | Tempo |
|---|---|---|
| `piano` | elegant: piano, strings, brushes | 88–104 |
| `pizzicato` | craft: pizzicato, marimba, shaker | 104–120 |
| `electro` | tech: kick, clap, saw bass, pluck | 120–128 |
| `lofi` | electric piano, swing, vinyl crackle | 76–90 |
| `funk` | slap bass, clavinet, sixteenth hats | 98–112 |
| `synthwave` | octave bass, gated snare, saws | 96–112 |
| `acustico` | strummed guitar, claps, stomps | 92–108 |
| `cinematico` | string ostinato, toms, bells | 80–96 |
| `ambiente` | pads and bells, no percussion | 70–84 |
| `house` | four on the floor, organ, open hats | 118–124 |

Sound-effect packs: `digital`, `organico`, `cinematico`, `minimo`, `juguete`. Listen to every style: `python3 sonido.py --demo out/demo`.

Restrict both to the brand in `variacion.json` (next to `render.js`; it takes priority over the `variacion` blocks):

```json
{ "estilo": ["piano", "lofi", "acustico", "ambiente"], "sfx": ["organico", "minimo"] }
```

Sensitive categories (`calma`) always get `ambiente`, `piano` or `acustico`, without drums or bass. Plans from v2 keep their visuals: `node variar.js` adds only the music.

## Voice-over (v3)

Optional. With no `locucion.json`, or `"proveedor": "ninguna"`, nothing changes. Settings in `locucion.json`:

```json
{ "proveedor": "elevenlabs", "voz": "VOICE_ID", "modelo": "eleven_multilingual_v2", "velocidad": 1.0,
  "tope_caracteres": 3000, "etiqueta": "Voz generada con IA" }
```

| `proveedor` | Notes |
|---|---|
| `elevenlabs` | Key in `ELEVENLABS_API_KEY` or in `~/.config/motion-promo-reels/env` as `ELEVENLABS_API_KEY=...` (`chmod 600`). Never in the project. |
| `voicebox` | Local and free. `"voz"`: profile name or id; `"url"` defaults to `http://127.0.0.1:17493`. The language comes from the profile. |
| `openai` | Any `POST /v1/audio/speech` server: `"url"`, `"modelo"`, `"voz"`; key in `OPENAI_API_KEY` if needed. |
| `comando` | Any local program: `"comando": "piper --model es_ES.onnx --output_file {salida}"` (text on stdin, or use `{texto}`). |

- The narration only uses what is on screen: hook, product name, price and website (9:16), or `"lineas": [{"t": 2.4, "texto": "..."}]` (person). Per product: `"locucion": [{"escena": "precio", "texto": "Desde 9,90 €"}]` or `"locucion": false`.
- Takes are cached per sentence, so re-rendering costs nothing. ElevenLabs stops at `tope_caracteres` unless you add `--confirmar`.
- Lines are placed without overlapping (up to 15 % faster, then the least important are dropped, with a warning). Music ducks about 10 dB under the voice. An `.srt` is written next to each MP4.
- `node voz.js <id>` tests the voice without rendering; `--sin-voz` renders without it.

## Checking (v3)

`node comprobar.js` checks Node, ffmpeg, Python with numpy and scipy, Chrome, the dependencies and every data file, and says for each problem where it is, what is wrong and how to fix it. `render.js` runs the data part before rendering and stops on errors.

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

# Plantillas

[English](README.md) · **Español**

Tres implementaciones completas del método. Todas renderizan tal cual, con datos de ejemplo **ficticios**. Copia la que más se parezca a tu caso y sustituye los datos.

| Carpeta | Caso | Formato | Qué cambiar |
|---|---|---|---|
| `persona-16x9/` | Persona o marca personal | 1920×1080, 27 s | El objeto `CFG` al principio de `anim.html`: nombre, homónimos reales, cifras, método, stack, frase y CTA. Todo lo demás se adapta solo. |
| `producto-9x16/` | Pocos productos, un gag escrito a mano por producto | 1080×1920, 15,5 s | `productos.json`: marca y productos. Los gags disponibles son `contador`, `invisible`, `diagonal` y `brillo`; los nuevos van en `hook()` de `motor.html` y en `gag_sfx()` de `audio.py`. La paleta está en el objeto `C` de `motor.html`. |
| `catalogo-9x16/` | Catálogo WooCommerce, gag por categoría | 1080×1920, 15,5 s | `config.json`: tienda, marcas a quitar, atributos (rango, variantes, colores, material), etiquetas, paleta y categorías con su gag y sus frases (admite condiciones). Después, `node extraer.js`. |

## Uso

```bash
npm install                      # puppeteer-core
pip install numpy scipy          # audio
# ffmpeg en el PATH · Chrome o Edge instalado (o CHROME_PATH)

# persona-16x9
node render.js stills 1.9,6.6,9.5,14,17.3,20,25
node render.js video promo.mp4

# producto-9x16 y catalogo-9x16
node render.js all --stills 1,3.4,7.4,10.4,12.4,14.4   # revisar fotogramas en out/stills
node render.js all                                      # vídeos finales en out/
node render.js <id> ...                                 # un solo producto

# solo catalogo-9x16: datos reales de la tienda
node extraer.js            # productos.json + fotos en img/ + REVISAR.md
```

`catalogo-9x16/ejemplo_api.json` imita la respuesta de la Store API de WooCommerce. Sirve para probar `catalogo.js` sin conexión.

## Frases condicionales (catálogo)

En `config.json`, una frase puede ser un texto fijo o una condición:

```json
{ "si": "elástic", "texto": "Elástico y listo.", "sino": "Se calza y listo." }
{ "si_variantes": 2, "texto": "Aquí, del {vmin} al {vmax}.", "sino": "Ancho {vmin}, hasta la talla {rmax}." }
```

- `si`: expresión regular que se busca en la descripción del producto.
- `si_variantes`: número mínimo de variantes.
- Marcadores disponibles: `{vmin}`, `{vmax}`, `{rmin}`, `{rmax}` y `{modelo}`.

## Fuentes e imágenes

En cada `fonts/` están los woff2 que usa la plantilla y su licencia OFL. Para cambiar de fuente: `npm pack @fontsource/<familia>@<versión>` y copia los `.woff2` (y su `LICENSE`).

Las carpetas `img/` están vacías: pon tus fotos y apunta a ellas en `productos.json` (`foto`) o en la configuración (`logo`). Sin foto, el motor muestra una tarjeta de marcador. Sin logo, escribe el nombre de la marca.

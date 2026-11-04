# Plantillas

[English](README.md) · **Español**

Tres implementaciones completas del método. Todas renderizan tal cual, con datos de ejemplo **ficticios**. Copia la que más se parezca a tu caso y sustituye los datos.

| Carpeta | Caso | Formato | Qué cambiar |
|---|---|---|---|
| `persona-16x9/` | Persona o marca personal | 1920×1080, 27 s | El objeto `CFG` al principio de `anim.html`: nombre, homónimos reales, cifras, método, stack, frase y CTA. Todo lo demás se adapta solo. |
| `producto-9x16/` | Pocos productos, un gag escrito a mano por producto | 1080×1920, 15,5 s | `productos.json`: marca y productos. Los gags disponibles son `contador`, `invisible`, `diagonal` y `brillo`; los nuevos van en `hook()` de `motor.html` y en `gag_sfx()` de `audio.py`. La paleta está en el objeto `C` de `motor.html`. |
| `catalogo-9x16/` | Catálogo WooCommerce, gag por categoría y construcción distinta en cada reel (v2) | 1080×1920, 15,5 s | `config.json`: tienda, marcas a quitar, atributos (rango, variantes, colores, material), etiquetas, paleta, categorías con su gag y sus variantes de frase (admite condiciones) y el bloque opcional `variacion`. Después, `node extraer.js` (también planifica cada reel). |

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
node extraer.js            # productos.json + fotos en img/ + REVISAR.md + planes + VARIACION.md
node variar.js             # solo planificar: los productos nuevos reciben plan y los demás conservan el suyo
node variar.js --temporada 2027-01   # temporada nueva: planes nuevos para todo el catálogo
node render.js all --hoja  # hojas de contactos out/hoja_NN.jpg: una fila por reel, un fotograma por escena (requiere Pillow)
```

`catalogo-9x16/ejemplo_api.json` imita la respuesta de la Store API de WooCommerce. Sirve para probar `catalogo.js` sin conexión.

## Frases condicionales (catálogo)

En `config.json`, una frase puede ser un texto fijo o una condición:

```json
{ "si": "elástic", "texto": "Elástico y listo.", "sino": "Se calza y listo." }
{ "si_variantes": 2, "texto": "Aquí, del {vmin} al {vmax}.", "sino": "Ancho {vmin}, hasta la talla {rmax}." }
```

- `si`: expresión regular que se busca en la descripción del producto.
- `si_variantes`: número mínimo de variantes. `si_colores`: número mínimo de colores.
- Marcadores disponibles: `{vmin}`, `{vmax}`, `{rmin}`, `{rmax}`, `{modelo}`, `{ncolores}`, `{nrango}` y `{nvariantes}`.

## Variantes de gancho y variación (catálogo, v2)

Da a cada categoría dos o tres juegos de frases. `frases` es la variante 1 y `variantes` añade más. Rotan **dentro de la categoría**: dos productos de la misma categoría no repiten gancho hasta agotar las variantes.

```json
{ "nombre": "Sin cordones", "gag": "cortar",
  "frases": ["Este texto no lleva cordones.", "Y aquí sigue.", "Se calza y listo."],
  "variantes": [["Este texto iba atado.", "Ya no.", "Nada que atar."]] }
```

`node variar.js` guarda un `plan` en cada producto de `productos.json`: orden de escenas, layout de cada escena, transición, tema de color, entrada del texto, variante del gancho y música. El orden de `productos.json` se toma como **orden de publicación**: cada plan se elige para parecerse lo menos posible a los que se publican justo antes, y a la vez repartir todas las opciones por igual. `VARIACION.md` resume el resultado.

El bloque opcional `variacion` de `config.json` acota las opciones si la marca lo pide. Lo que no pongas queda permitido:

```json
"variacion": {
  "temporada": "2026-11",
  "ventana": 12,
  "tema": ["claro", "oscuro"],
  "trans": ["barrido", "empuje", "iris", "zoom"],
  "bpm": [90, 96, 102]
}
```

Claves: `orden`, `hero` (`tarjeta`, `difuso`, `arco`), `rango` (`pildoras`, `regla`, `rejilla`), `datos` (`lista`, `numerada`, `apiladas`), `precio` (`grande`, `sello`, `etiqueta`), `trans` (`barrido`, `empuje`, `iris`, `diagonal`, `persiana`, `zoom`), `tema` (`claro`, `oscuro`, `acento`), `entrada` (`subir`, `mascara`, `letras`), `alin`, `prog`, `tono`, `bpm`, `timbre` (`piano`, `celesta`, `pizzicato`), `patron`; además de `ventana` (con cuántos reels anteriores se compara) y `temporada`.

- Un tema solo se usa si, con la paleta de la marca, su texto y su acento pasan el contraste WCAG sobre su fondo.
- Los productos `calma` (sensibles) van por un carril tranquilo: tema claro, fundido/destello/zoom y sin percusión.
- Para fijar un reel, edita su `plan` y pon `"manual": true` en el producto.

## Textos de interfaz

Cada texto fijo de pantalla tiene un valor por defecto en español y se puede cambiar con un bloque `textos`. Pon solo las claves que quieras cambiar.

| Plantilla | Dónde | Claves |
|---|---|---|
| `persona-16x9` | `CFG.textos` en `anim.html` | `hud`, `rec`, `buscando`, `resultados` (`{n}`), `no_es`, `cero_de` (`{n}`), `fuente`, `datos_web`, `verificado`, `stack` (`{n}`), `contado`, `este_video`, `filas` (lista de 4) |
| `producto-9x16` | `marca.textos` en `productos.json` | `puntada`, `aqui`, `foto`, `colores`, `lo_que_es`, `desde`, `oferta`, `precio_real`, `decimal` |
| `catalogo-9x16` | `tienda.textos` en `config.json` | `midiendo`, `remate`, `ia`, `foto`, `un_color`, `colores` (`{n}`), `datos`, `desde`, `decimal` |

En `persona-16x9`, ajusta `no_es` a la persona: `'✕ NO ES ÉL'` o `'✕ NO ES ELLA'`.

## Fuentes e imágenes

En cada `fonts/` están los woff2 que usa la plantilla y su licencia OFL. Para cambiar de fuente: `npm pack @fontsource/<familia>@<versión>` y copia los `.woff2` (y su `LICENSE`).

Las carpetas `img/` están vacías: pon tus fotos y apunta a ellas en `productos.json` (`foto`) o en la configuración (`logo`). Sin foto, el motor muestra una tarjeta de marcador. Sin logo, escribe el nombre de la marca.

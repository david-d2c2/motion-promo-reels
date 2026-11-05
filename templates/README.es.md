# Plantillas

[English](README.md) · **Español**

Tres implementaciones completas del método. Todas renderizan tal cual, con datos de ejemplo **ficticios**. Copia la que más se parezca a tu caso y sustituye los datos.

| Carpeta | Caso | Formato | Qué cambiar |
|---|---|---|---|
| `persona-16x9/` | Persona o marca personal, con versiones A/B/C (v2) | 1920×1080, 27 s | El objeto `CFG` al principio de `anim.html`: nombre, homónimos reales, cifras, método, stack, frase y CTA (y, si quieres, `paletas` con los colores de la persona). Todo lo demás se adapta solo. Versiones: `node variar.js 3`. |
| `producto-9x16/` | Pocos productos, un gag escrito a mano por producto y una construcción distinta en cada reel (v2) | 1080×1920, 15,5 s | `productos.json`: marca (con `colores` opcional) y productos (con `hooks` opcional para variantes de frase). Los gags disponibles son `contador`, `invisible`, `diagonal` y `brillo`; los nuevos van en `hook()` de `motor.html` y en `gag_sfx()` de `audio.py`. Planes: `node variar.js`. |
| `catalogo-9x16/` | Catálogo WooCommerce, gag por categoría y construcción distinta en cada reel (v2) | 1080×1920, 15,5 s | `config.json`: tienda, marcas a quitar, atributos (rango, variantes, colores, material), etiquetas, paleta, categorías con su gag y sus variantes de frase (admite condiciones) y el bloque opcional `variacion`. Después, `node extraer.js` (también planifica cada reel). |

## Uso

```bash
npm install                      # puppeteer-core
pip install numpy scipy          # audio
# ffmpeg en el PATH · Chrome o Edge instalado (o CHROME_PATH)
node comprobar.js                # v3: comprueba todo lo anterior y tus datos, con mensajes de cómo arreglarlo

# persona-16x9
node render.js stills 1.9,6.6,9.5,14,17.3,20,25
node render.js video promo.mp4
node variar.js 3                                  # v2: versiones A, B y C -> versiones.json
node render.js video promo_B.mp4 --version B      # una versión
node render.js hoja                               # hoja de contactos de todas las versiones (requiere Pillow)

# producto-9x16 y catalogo-9x16
node variar.js                                          # v2: un plan de construcción por reel -> VARIACION.md
node render.js all --hoja                               # hojas de contactos out/hoja_NN.jpg (requiere Pillow)
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

## Variación en las otras plantillas (v2)

`variacion.js`, `variar.js` y `hoja.py` son el mismo archivo en las tres plantillas, y `render.js` es el mismo en las dos 9:16. Cada plantilla elige su perfil en `package.json` (`perfilVariacion`). Si editas un archivo común, cópialo a las otras carpetas: el flujo de publicación comprueba que coincidan.

**`producto-9x16`** funciona como el catálogo: `node variar.js` escribe un `plan` en cada producto de `productos.json`, y un bloque `variacion` en ese mismo archivo acota las opciones. Sus layouts: producto `tarjeta` · `abajo` · `polaroid`; colores `contador` · `fila` · `abanico`; datos `lista` · `numerada` · `etiquetas`; precio `grande` · `sello` · `etiqueta`. Los gags y los dibujos de producto no cambian. Añade `"hooks": [[...], [...]]` a un producto para darle variantes de frase (cambian con cada `--temporada`). La paleta de la marca va en `marca.colores` (`fondo`, `fondo_cierre`, `tinta`, `texto`, `acento`, `acento_suave`).

**`persona-16x9`** hace versiones del mismo vídeo. `node variar.js 3` escribe `versiones.json` con las versiones A, B y C, elegidas para diferenciarse todo lo posible: paleta (`neon`, `tinta`, `lima`), titular (`golpe`, `mascara`, `maquina`), cifras (`columnas`, `foco`, `rejilla`), método (`letras`, `linea`, `escalera`), stack (`marquesina`, `cuadricula`), fondo (`reticula`, `puntos`, `limpio`) y música. El orden de la historia y los instantes clave no cambian, así que los efectos de sonido siguen sincronizados. Para usar los colores de la persona, añade una paleta en `CFG.paletas` con las mismas claves que `neon` (por ejemplo `marca`) y permítela en un `variacion.json` junto a `anim.html`: `{ "paleta": ["marca", "neon"] }`.

En cualquier plantilla, un archivo `variacion.json` tiene prioridad sobre el bloque `variacion` de `config.json` o `productos.json`.

## Elegir el aspecto (v3.1)

El formato lo pone la plantilla (producto y catálogo: vertical 9:16; marca personal: horizontal 16:9). Todo lo demás se elige vídeo a vídeo, y se puede orientar con palabras normales:

```bash
node variar.js --opciones                      # menú de todo lo que se puede elegir, con descripción (--json para herramientas)
node variar.js --preferencias musica=tranquila efectos=sutiles colores=claro movimiento=suave
node variar.js --preferencias estilo=lofi,piano tema=claro       # nombres exactos
node variar.js --preferencias limpiar                            # volver a permitirlo todo
```

| Preferencia | Valores |
|---|---|
| `musica` | `tranquila`, `elegante`, `energica`, `divertida`, `tecnologica`, `acustica`, `epica`, `variada` |
| `efectos` | `sutiles`, `divertidos`, `tecnologicos`, `cinematograficos`, `variados` |
| `colores` | `claro`, `oscuro`, `color` (el acento de la marca), `variado` |
| `movimiento` | `suave`, `dinamico`, `variado` |

Escribe `variacion.json`, conserva las preferencias anteriores y replanifica solo los vídeos que ya no las cumplen (el resto se queda como estaba). Si los colores de la marca no dan contraste suficiente para un tema, lo avisa y no lo usa. En `persona-16x9`, `colores` elige paletas, y una paleta propia de `CFG.paletas` se puede nombrar directamente (`paleta=marca,neon`); después, `node variar.js 3`.

## Música y efectos (v3)

`sonido.py` (común) hace la banda sonora; cada `audio.py` solo dice *cuándo* pasa cada cosa. `node variar.js` escribe en cada plan un **estilo** de música, un tempo dentro de su rango, tonalidad, progresión, una **semilla** y un **paquete de efectos**, y evita que dos vídeos vecinos compartan estilo.

| Estilo | Carácter | Tempo |
|---|---|---|
| `piano` | elegante: piano, cuerdas, escobillas | 88–104 |
| `pizzicato` | artesanal: pizzicato, marimba, shaker | 104–120 |
| `electro` | tecnológico: bombo, palmas, bajo de sierra, pluck | 120–128 |
| `lofi` | piano eléctrico, swing, vinilo | 76–90 |
| `funk` | bajo slap, clavinet, semicorcheas | 98–112 |
| `synthwave` | bajo en octavas, caja gated, sierras | 96–112 |
| `acustico` | guitarra rasgueada, palmas, pisotones | 92–108 |
| `cinematico` | ostinato de cuerdas, tambores, campanas | 80–96 |
| `ambiente` | pads y campanas, sin percusión | 70–84 |
| `house` | cuatro en el suelo, órgano, charles abierto | 118–124 |

Paquetes de efectos: `digital`, `organico`, `cinematico`, `minimo`, `juguete`. Para escuchar todos los estilos: `python3 sonido.py --demo out/demo`.

Acota los dos a la marca en `variacion.json` (junto a `render.js`; tiene prioridad sobre los bloques `variacion`):

```json
{ "estilo": ["piano", "lofi", "acustico", "ambiente"], "sfx": ["organico", "minimo"] }
```

Las categorías sensibles (`calma`) siempre van con `ambiente`, `piano` o `acustico`, sin batería ni bajo. Los planes de la v2 conservan lo visual: `node variar.js` solo les añade la música.

## Locución (v3)

Opcional. Sin `locucion.json`, o con `"proveedor": "ninguna"`, no cambia nada. Ajustes en `locucion.json`:

```json
{ "proveedor": "elevenlabs", "voz": "VOICE_ID", "modelo": "eleven_multilingual_v2", "velocidad": 1.0,
  "tope_caracteres": 3000, "etiqueta": "Voz generada con IA" }
```

| `proveedor` | Notas |
|---|---|
| `elevenlabs` | Clave en `ELEVENLABS_API_KEY` o en `~/.config/motion-promo-reels/env` como `ELEVENLABS_API_KEY=...` (`chmod 600`). Nunca en el proyecto. |
| `voicebox` | Local y gratis. `"voz"`: nombre o id del perfil; `"url"` por defecto `http://127.0.0.1:17493`. El idioma lo pone el perfil. |
| `openai` | Cualquier servidor con `POST /v1/audio/speech`: `"url"`, `"modelo"`, `"voz"`; clave en `OPENAI_API_KEY` si hace falta. |
| `comando` | Cualquier programa local: `"comando": "piper --model es_ES.onnx --output_file {salida}"` (texto por la entrada estándar, o usa `{texto}`). |

- La locución solo dice lo que sale en pantalla: gancho, nombre, precio y web (9:16), o `"lineas": [{"t": 2.4, "texto": "..."}]` (persona). Por producto: `"locucion": [{"escena": "precio", "texto": "Desde 9,90 €"}]` o `"locucion": false`.
- Las tomas se guardan en caché por frase: volver a renderizar no cuesta nada. ElevenLabs se para en `tope_caracteres` salvo que añadas `--confirmar`.
- Las frases se colocan sin pisarse (hasta un 15 % más rápidas; si no caben, se quitan las menos importantes y se avisa). La música baja unos 10 dB bajo la voz. Junto a cada MP4 se escribe un `.srt`.
- `node voz.js <id>` prueba la voz sin renderizar; `--sin-voz` renderiza sin ella.

## Comprobación (v3)

`node comprobar.js` revisa Node, ffmpeg, Python con numpy y scipy, Chrome, las dependencias y todos los archivos de datos, y de cada problema dice dónde está, qué pasa y cómo se arregla. `render.js` hace la parte de datos antes de renderizar y para si hay errores.

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

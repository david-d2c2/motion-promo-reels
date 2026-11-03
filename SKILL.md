---
name: motion-promo-reels
description: Vídeos promocionales con motion graphics y audio generados por código (canvas + ffmpeg) para una persona, web o ecommerce, uno o en lote por producto, con datos reales y gag ingenioso.
---

# Reels promocionales con motion graphics por código

Vídeos de 15 a 30 segundos generados íntegramente con código: canvas 2D → fotogramas → ffmpeg, y audio sintetizado con numpy. No hay plantillas de vídeo, ni After Effects, ni música de terceros. Sirve para tres casos:
- una persona o marca personal (16:9),
- unos pocos productos (9:16),
- un catálogo entero de una tienda (9:16, decenas o cientos de vídeos).

**Principio rector: nada inventado.** Cada cifra, precio, color o característica que aparezca en el vídeo sale de una fuente comprobada (web, API de la tienda, ficha de producto o documentos del proyecto). Si un dato no se puede confirmar, se marca como pendiente y se dice.

Este paquete incluye tres plantillas completas en `templates/`. **Parte de la más parecida a tu caso** en lugar de reconstruir el motor (ver el punto 4).

## 0. Decidir el caso

| Caso | Plantilla | Formato | Duración | Unidad de gag |
|---|---|---|---|---|
| Persona o marca personal | `persona-16x9` | 1920×1080 | 27 s | Uno, escrito a mano |
| Web o servicio | `persona-16x9` adaptada | 16:9 o 9:16 | 20–30 s | Uno, escrito a mano |
| Pocos productos (≤10) | `producto-9x16` | 1080×1920 | 15,5 s | Uno por producto, escrito a mano |
| Catálogo (decenas o cientos) | `catalogo-9x16` | 1080×1920 | 15,5 s | **Uno por categoría**, con frases plantilla rellenadas con los datos de cada producto |

Si el usuario no especifica nada, para producto elige 9:16 y dilo en una línea.

## 1. Investigación (antes de escribir una sola línea de guion)

Orden de fuentes:
1. **Carpeta del proyecto, si existe.** Lee `CLAUDE.md`, `AGENTS.md`, decisiones, informes y planes de redes. Ahí están las reglas de marca y de copy (por ejemplo: «sin nombres de marcas de terceros», «tuteo», «nada de superlativos»), los tokens de diseño, las reglas de moderación y los avisos legales (etiquetado de IA). **Estas reglas mandan sobre cualquier idea creativa.**
2. **La web oficial.** Hero, servicios, cifras, método, stack, credenciales. En una web con JS, usa un navegador y lee `document.body.innerText` por secciones.
3. **Ecommerce:**
   - WooCommerce: `/wp-json/wc/store/v1/products?per_page=100&page=N` y `/products/<id>`. Precios en céntimos; `prices.price_range` con mínimo distinto de máximo → «desde»; `on_sale` + `regular_price` → precio tachado; `attributes` (colores, tallas, medidas); `description` (a menudo con viñetas estructuradas); `permalink`.
   - Shopify: `/products.json` y `/products/<handle>.json`.
   - **Nunca adivines slugs ni URLs:** léelos del `permalink`.
4. **Buscador.** Útil para personas, pero con nombres comunes devuelve homónimos. Si pasa, conviértelo en material para el guion (ver el punto 2) en vez de esconderlo.
5. **Fotos:** primero las del proyecto local. Los entornos en la nube suelen tener bloqueadas las descargas de la tienda: no insistas. O usas las fotos locales o dibujas el producto con código (franjas, ondas satinadas y formas simples quedan mejor de lo que parece).

Apunta la fecha de lectura de los datos: los precios caducan.

## 2. Concepto: el gag

**Un gag es una propiedad real del producto o de la persona convertida en algo que hace el propio vídeo.** No es un chiste puesto encima. Ejemplos de mecánicas (todas implementadas en las plantillas):

| Mecánica | Propiedad real | Lo que hace el vídeo |
|---|---|---|
| `invisible` | Transparente, oculto, discreto | Marco vacío: «Aquí hay una funda. ¿No la ves? Normal. Es transparente.» La pantalla se abre como una cremallera. |
| `contador` | Una cantidad grande (metros, horas, unidades) | «Este reel dura 15 s. Este rollo, 50 m. No te va a dar tiempo a gastarlo.» Corre un contador. |
| `diagonal` | Corte, rayas o diseño en diagonal | El texto gira 45° y cruzan franjas. |
| `brillo` | Acabado brillante o satinado | «Este texto es mate. / Este brilla.» (con reflejo) |
| `cortar` | Sin cordones, sin cables, sin ataduras | Dos hilos sujetan el texto, se cortan y el texto se queda. |
| `elevar` | Plataforma, realce, altura | El texto sube sobre un «cojín». |
| `secuencia` | Muchas tallas, anchos o variantes | Las variantes reales pasan una a una: «Aquí, del E al H.» |
| `quitar` | «Sin X» | Dos aros se dibujan y salen disparados: «Fuera.» |
| `ritmo` | Deporte, movimiento | Las palabras entran al ritmo de la música. |
| `reordenar` | Multiusos, convertible | Dos líneas cambian de posición: paralelas, cruzadas, en V. |
| `patron` | Bordado, estampado, encaje | Un patrón decorativo se dibuja. |
| `calma` | Categorías sensibles (salud, posoperatorio, maternidad…) | Sin gag, sin golpes de sonido ni percusión: tono sereno. |
| `homonimos` (persona) | Nombre común en Google | `investigar("Nombre")` muestra los homónimos tachados con «NO ES ÉL/ELLA» y después «FUENTE ENCONTRADA». |

Reglas:
1. Una propiedad **real y comprobable**.
2. Tres frases: planteamiento, giro y remate (el remate en cursiva o con color de acento).
3. **El remate no puede ser falso.** Si la ficha no lo dice, no se afirma. Las frases condicionales (`si`/`sino` en el config) sirven para que el remate solo aparezca cuando la descripción lo respalda.
4. **Elemento autorreferencial fijo durante todo el vídeo**, ligado al sector: un HUD con timecode y fotogramas (tecnología), una costura con contador de puntadas (oficios, textil), una cinta métrica que «mide» el reel (moda y tallas). Remátalo en el cierre («Este reel mide 15,5 s. Talla única»).
5. **Nunca bromas sobre cuerpos.** Las categorías sensibles van con `calma`. Repasa también que ningún dibujo abstracto pueda leerse como una silueta corporal.
6. Nada de superlativos vacíos ni comparaciones con la competencia.

## 3. Estructura

**9:16 producto (15,5 s a 30 fps = 465 fotogramas)**

| Escena | Tiempo | Contenido |
|---|---|---|
| Gancho | 0–3,0 | El gag |
| Producto | 3,0–5,6/5,8 | Nombre + foto con rebote (o dibujo procedural, o tarjeta de marcador) |
| Surtido | ~2,8 s | Contador real de colores, o rango (tallas), variantes y colores con su nombre |
| Datos | ~2,6 s | Tres datos de la ficha con check animado |
| Precio | ~1,8 s | Precio real, «desde» u oferta, nota fiscal si aplica |
| Cierre | 13,2–15,5 | Logo o marca, web en una píldora, envío o CTA, y el guiño final |

**16:9 persona o marca (27 s):** terminal → homónimos tachados con glitch → drop (fuente encontrada + titular) → cifras con contador → método por fases → stack en marquesina (se congela en un elemento autorreferencial: «↑ ese soy yo») → «ESTE VÍDEO: 0 plantillas · N líneas de código» (recuento real) → frase de la persona → cierre con monograma, nombre y CTA.

## 4. Motor

```
<proyecto>/<carpeta-reels>/
├── METODO.md        método, reglas y checklist (para humanos)
├── CLAUDE.md        estado y pendientes (para la próxima sesión)
├── config.json      (catálogo) tienda, atributos, etiquetas, paleta y categorías → gag + frases
├── productos.json   marca + un bloque por producto
├── motor.html       canvas 1080×1920 o 1920×1080; window.renderFrame(f) DETERMINISTA
├── render.js        puppeteer-core → JPEG por fotograma → ffmpeg image2pipe; después audio y mux
├── audio.py         síntesis numpy/scipy con la MISMA tabla de cues que motor.html
├── catalogo.js      (catálogo) API → ficha: gag, frases, datos, limpieza de marcas
├── extraer.js       (catálogo) descarga catálogo y fotos con UA de navegador y pausas; REVISAR.md
├── fonts/           woff2 locales + su licencia (fontsource: `npm pack @fontsource/<familia>@<versión>`)
├── img/             fotos locales
└── out/             vídeos finales
```

Claves técnicas:
- **Determinismo:** cada fotograma se calcula desde `t = f/FPS`. Nada de `requestAnimationFrame` ni de aleatoriedad sin semilla (usa `hash(n)`).
- Helpers: `clamp`, `P(t,a,b)` (progreso), easings (`eOC`, `eIOC`, `eOX`, `eIX`, `eOB` con rebote), `T_()` para texto con letterSpacing y alfa, `fit()` para reducir el tamaño hasta que el texto quepa, `rr()` para rectángulos redondeados.
- Escenas como funciones que reciben el tiempo local `u = t - T.escena`; transición con un barrido del color de fondo de ±0,16 s en cada corte.
- `render.js`: `page.evaluateOnNewDocument(spec => window.SPEC = spec)`, esperar a `window.READY` (fuentes e imágenes cargadas), `canvas.toDataURL('image/jpeg', .93)` → stdin de `ffmpeg -f image2pipe -c:v mjpeg -i - -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p`. Lanza Chrome con `--allow-file-access-from-files` (si no, el canvas queda «tainted» con imágenes locales). Busca Chrome o Edge en sus rutas estándar o en `CHROME_PATH`. Ten un modo `--stills t1,t2,…` para revisar.
- Mux: `-af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -movflags +faststart -shortest`.
- Audio: progresión de 4 acordes acorde al tono de marca (tecnología: 128 BPM con kick, bajo y pluck; artesanal: 112 BPM pizzicato y marimba; elegante: 96 BPM piano y cuerdas). Efectos por gag (cremallera = ráfaga de clics que acelera; máquina = tren de clics + zumbido; tijera = dos chasquidos; brillo = arpegio agudo) más efectos comunes (whoosh en los cortes, ticks en los contadores, chime en el precio). Sidechain ligero bajo el kick, `tanh` para limitar y normalizar.
- En Windows el script llama a `python` y en Linux o Mac a `python3`.

## 5. Datos de catálogo sin inventar (catalogo.js + config.json)

- Nombre visible: el nombre del producto sin las `marcas_a_quitar` (si la regla de copy lo pide) y sin las `palabras_tipo` (Zapatilla, Bota…). Si queda un código, usa el nombre sin marca.
- Datos: las viñetas bajo `titulo_datos` en la descripción (sin la composición). Si no hay, frases de la descripción corta partidas por «.» y «:». El tercer dato, la composición desde el atributo de material (respetando siglas como EVA).
- Recortar frases a unos 54 caracteres: primero en una coma; si no hay, antes de la última subordinada («con», «para», «que», «y»); nunca terminar en preposición o artículo.
- Colores: tabla nombre → hex en `motor.html`. Para los bicolores («Negro/Blanco») se dibuja la muestra partida. Si el color no está en la tabla, gris neutro con su nombre real.
- `"manual": true` en un producto lo protege de ser sobrescrito al volver a extraer.
- `REVISAR.md`: tono sensible, fichas sin viñetas, productos sin foto o sin atributos.
- **Prueba la transformación con el catálogo real** pegando la función en la consola de la tienda (navegador) antes de dar el extractor por bueno. Si la descarga no se ha podido probar, dilo.

## 6. Control de calidad (obligatorio antes de entregar)

1. Renderiza fotogramas sueltos de cada escena, haz una hoja de contactos con PIL (no con `xstack` de muchos inputs: ffmpeg puede petar) y **mírala**. Busca:
   - solapes de texto y frases cortadas;
   - tildes de titulares grandes que chocan con la línea de encima;
   - elementos que invaden otra línea;
   - letras que desaparecen en reflejos demasiado blancos;
   - bloques vacíos («—») cuando falta un atributo;
   - huecos en la mitad inferior en formato vertical.
2. Zonas seguras 9:16: nada importante por encima de unos 250 px (interfaz de Reels) ni en los últimos ~320 px (caption). Ahí abajo solo va el elemento decorativo.
3. Datos: precios del día, «desde» cuando hay rango, ofertas que pueden caducar, unidades no confirmadas (marcarlas), URLs verificadas.
4. Legal y moderación:
   - Fotos con personas generadas o modificadas con IA → etiqueta visible en el vídeo (AI Act, art. 50; `ia.mostrar_si_foto` en el config) y declararlo al publicar.
   - Productos que se muestran sobre el cuerpo: foto completa, estilo catálogo, sin recortes agresivos y poco tiempo en pantalla.
   - Nunca prometer devoluciones o garantías que no apliquen.
5. Audio: `ffmpeg -af ebur128` → alrededor de −14 LUFS. Duración y resolución con `ffprobe`.

## 7. Entrega

- Si trabajas sobre el ordenador del usuario, escribe todo en una subcarpeta de su proyecto, conservando los finales de línea de los archivos que edites. **No toques los `CLAUDE.md` ni los documentos que ya existan:** crea los tuyos dentro de la subcarpeta.
- `METODO.md`: qué hay, cómo se ejecuta, de dónde sale cada dato, reglas de marca aplicadas, cómo añadir un producto o un gag, checklist antes de publicar y límites conocidos.
- `CLAUDE.md` de la subcarpeta: estado, pendientes y reglas no negociables, en pocas líneas.
- Enseña los vídeos y resume: los gags (uno por línea), dónde está todo, el comando para regenerar y los datos pendientes de confirmar.

## Errores frecuentes (evítalos)

- Inventar slugs de producto. Léelos del `permalink`.
- Gag de texto girado que pisa las frases siguientes: recoloca las líneas cuando el texto rota.
- Reflejo satinado demasiado blanco: se come letras. Usa un tono claro de la marca, no blanco puro.
- Sombreados de muestras con stops de gradiente que colapsan: quedan bandas diagonales. Mejor una capa de brillo aparte con recorte.
- Precio tachado en un producto con rango de precios: usa «desde» + etiqueta de oferta, sin tachado.
- Unidades ausentes en la ficha (por ejemplo, medidas sin «cm»): o se omiten o se marcan para confirmar.
- Formas abstractas que, juntas, sugieren una silueta corporal: cámbialas por figuras inequívocas.

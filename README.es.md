# motion-promo-reels

[English](README.md) · **Español**

![motion-promo-reels: vídeos promocionales con motion graphics generados por código](assets/cover.png)

Skill para Claude que genera **vídeos promocionales con motion graphics y audio, 100 % por código**: canvas 2D → fotogramas → ffmpeg, y música y efectos sintetizados con numpy. Sin plantillas de vídeo, sin After Effects y sin música de terceros.

Sirve para:
- una **persona o marca personal**: vídeo de 27 s en 16:9, ahora con versiones A/B/C;
- **unos pocos productos**: reels de 15,5 s en 9:16, un gag escrito a mano por producto y, desde la v2, una construcción distinta en cada reel;
- desde la v3, **estilos de música, paquetes de efectos y locución opcional** en las tres;
- **un catálogo entero** (WooCommerce): un reel por producto, gag por categoría, datos leídos de la tienda y, desde la v2, **una construcción distinta en cada reel**.

> Método probado en producción con proyectos reales: una marca personal, una tienda online pequeña y un catálogo de más de cien productos. Los datos de ejemplo de este repositorio son ficticios.

## Qué la hace distinta

<p align="center"><img src="assets/demo.gif" alt="Tres ganchos generados por las plantillas: invisible, diagonal y secuencia de anchos" width="720"></p>

- **Nada inventado.** Precios, colores, tallas y características salen de la web o de la API de la tienda, y lo que no se puede confirmar se marca como pendiente.
- **Un gag que es lo que hace el vídeo, no un chiste encima.** Un producto transparente → «Aquí hay una funda. ¿No la ves?». Uno con cuerpo en diagonal → el reel gira 45°. Uno de 50 metros → «Este reel dura 15 s. No te va a dar tiempo a gastarlo».
- **Elemento autorreferencial** durante todo el vídeo: HUD con fotogramas, costura con contador de puntadas o cinta métrica que «mide» el reel.
- **Control de calidad incluido:**
  - revisión de fotogramas;
  - zonas seguras de Instagram;
  - −14 LUFS;
  - etiqueta de IA (AI Act, art. 50) cuando las fotos llevan personas generadas con IA;
  - tono sereno para categorías sensibles.

## v3: tampoco suenan igual, y pueden hablar

La v2 variaba la imagen; la música seguía siendo un mismo loop con otro tempo u otro timbre. La v3 la sustituye:

- **Diez estilos de música** con instrumentos, batería, groove y armonía propios: no son ajustes del mismo loop. Una **semilla** compone la melodía de cada vídeo y elige su batería, rellenos, ritmo armónico y arpegio, así que dos vídeos del mismo estilo tampoco suenan igual.
- **El arreglo sigue las escenas**: intro despejada bajo el gag, la banda entera con el producto, una base más ligera mientras se leen los datos, un relleno de batería antes de cada corte y un acorde final.
- **Cinco paquetes de efectos** (`digital`, `organico`, `cinematico`, `minimo`, `juguete`), con las campanas afinadas en la tonalidad de la música.
- **Locución opcional** con una voz gratis y local ([Piper](https://github.com/OHF-Voice/piper1-gpl), en español o inglés, que solo se instala si dices que sí: `node voz.js --instalar piper es`), ElevenLabs, [Voicebox](https://github.com/jamiepine/voicebox) o cualquier comando de voz. Solo dice lo que sale en pantalla, guarda cada frase en caché (volver a renderizar es gratis), se para en un tope de caracteres, baja la música unos 10 dB y escribe un `.srt`.
- **Elige el aspecto con palabras** (v3.1): `node variar.js --opciones` enseña el menú; `node variar.js --preferencias musica=tranquila colores=claro` orienta todos los vídeos sin fijarlos. Si el encargo no dice nada del tono, la skill hace una sola pregunta.
- **Pensada para cualquier modelo:** `node comprobar.js` revisa el entorno y los datos y dice dónde está cada problema y cómo arreglarlo; `SKILL.md` empieza con una ruta rápida paso a paso, y `install.sh --agents` la instala en `~/.agents/skills` para agentes como pi.

<p align="center"><img src="assets/estilos.jpg" alt="Espectrogramas del mismo reel de 15,5 segundos en los diez estilos de música: cada uno tiene textura, batería y densidad distintas" width="820"></p>

Nada nuevo es obligatorio: no hay dependencias nuevas y, sin `locucion.json`, no hay voz.

## v2: cincuenta reels que no parecen uno

En la v1 todos los vídeos de una plantilla compartían línea de tiempo, maquetación, transición, colores, música y, dentro de una categoría del catálogo, el mismo texto de gancho. Cincuenta productos daban cincuenta copias de la misma película con otros números.

La v2 asigna a cada vídeo un **plan**, elegido por un planificador con semilla que lo compara con los vídeos que se publican justo antes. Las tres plantillas comparten el mismo núcleo de variación (`variacion.js`) y se comportan igual. En el catálogo:

| Eje | Opciones |
|---|---|
| Orden de escenas | 6 órdenes de surtido, datos y precio tras presentar el producto |
| Escena de producto | tarjeta · fondo desenfocado + foto entera · marco en arco |
| Surtido | píldoras · regla + franjas de color · rejilla de casillas |
| Datos | lista · numerada 01–03 · tarjetas apiladas |
| Precio | grande · sello circular · etiqueta colgada |
| Transición | destello · empuje · iris · diagonal · persiana · zoom (fundido en categorías sensibles) |
| Tema de color | claro · oscuro · acento, derivados de la paleta de la marca y solo si pasan el contraste WCAG |
| Gancho | entrada del texto (subir · máscara · letras) y **variantes de frase que rotan dentro de cada categoría** |
| Música | progresión · tono · tempo · timbre · patrón de arpegio (el audio lee el mismo plan: imagen y sonido van sincronizados) |

La firma de marca se queda fija a propósito: la cinta métrica autorreferencial y el cierre.

<p align="center"><img src="assets/variacion.jpg" alt="Hoja de contactos de seis reels seguidos del catálogo, cada uno con una construcción distinta" width="820"></p>

**Unos pocos productos** tienen los mismos ejes con layouts propios (una polaroid que cae, un abanico de colores, datos en etiquetas cosidas, un precio en etiqueta colgada) y conservan el gag escrito a mano de cada producto.

**Un vídeo personal** es una historia y su orden no cambia (el gag de los homónimos depende de él). A cambio, hay **versiones** (para distintos canales o para volver a publicar) que cambian la paleta, la entrada del titular, la maquetación de cifras, método y stack, el fondo y la música:

<p align="center"><img src="assets/versiones.jpg" alt="Tres versiones del mismo vídeo de marca personal: paletas neón, tinta sobre papel y lima con distintas maquetaciones" width="820"></p>

```bash
# catálogo y producto
node variar.js                       # planifica los productos nuevos y conserva el resto → VARIACION.md (informe del lote)
node variar.js --temporada 2027-01   # otra cara para todos los reels, para volver a publicar
node render.js all --hoja            # hojas de contactos: una fila por reel, un fotograma por escena

# persona
node variar.js 3                     # versiones A, B y C, lo más distintas posible → versiones.json
node render.js video promo_B.mp4 --version B
node render.js hoja                  # hoja de contactos de todas las versiones
```

Los planes son reproducibles y editables a mano (`"manual": true` protege el plan de un producto). Sin plan, cada plantilla se renderiza exactamente como en la v1, salvo los fallos de la v1 corregidos por el camino. Detalle en [CHANGELOG.md](CHANGELOG.md).

## Estructura

```
motion-promo-reels/
├── SKILL.md                    instrucciones para Claude (el método completo)
├── install.sh / install.ps1    instaladores de una línea (curl / PowerShell)
├── assets/                     imágenes de este README
└── templates/
    ├── README.md               qué tocar primero en cada plantilla
    ├── persona-16x9/           marca personal (config CFG al inicio de anim.html + versiones.json)
    ├── producto-9x16/          pocos productos (productos.json + variar.js)
    └── catalogo-9x16/          catálogo WooCommerce (config.json + extraer.js + variar.js)
```

## Idiomas y textos

Claude te responde en tu idioma y escribe el texto del vídeo en el idioma de tu público. Los datos de ejemplo y los comentarios del código están en español. Todo el texto en pantalla se cambia sin tocar código:
- **Copy de marca y producto:** en `CFG` (persona), `productos.json` (producto) o `config.json` (catálogo).
- **Textos de interfaz** («desde», «colores», «NO ES ÉL», «midiendo este reel…»…): en un bloque `textos`. Vienen en español por defecto y solo cambias las claves que necesites. Ver [templates/README.es.md](templates/README.es.md#textos-de-interfaz).

## Instalación

**Claude Code**: elige el método que prefieras. Todos dejan la skill en `~/.claude/skills/motion-promo-reels` salvo que indiques otra carpeta.

```bash
# npx (Node 18+), con la CLI abierta de skills
npx skills add david-d2c2/motion-promo-reels -g -a claude-code   # para todos tus proyectos
npx skills add david-d2c2/motion-promo-reels -a claude-code      # solo en el proyecto actual

# curl (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash -s -- --dir /ruta/a/skills
curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash -s -- --project
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1 | iex
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1))) -Dir "D:\skills"
```

Opciones de `install.sh` / `install.ps1`:

| Opción | Efecto |
|---|---|
| `--dir RUTA` / `-Dir RUTA` | Instala en `RUTA/motion-promo-reels` |
| `--project` / `-Project` | Instala en `./.claude/skills/` de la carpeta actual |
| `--agents` / `-Agents` | Instala en `~/.agents/skills/`, para agentes que leen esa carpeta (como pi) |
| `--force` / `-Force` | Sustituye una instalación existente (para actualizar) |
| `--version TAG` / `-Version TAG` | Instala una *release* concreta en vez de la última |

Los dos scripts descargan el mismo zip de la *release* que se indica abajo. Son cortos: léelos antes de ejecutarlos con una tubería.

O con git:

```bash
git clone https://github.com/david-d2c2/motion-promo-reels ~/.claude/skills/motion-promo-reels
```

**claude.ai**: descarga [`motion-promo-reels.zip`](https://github.com/david-d2c2/motion-promo-reels/releases/latest/download/motion-promo-reels.zip) de la última *release*, súbelo en **Customize → Skills** (en la interfaz en español, el apartado de skills de Personalizar) y actívalo.

> Para esto no uses el botón verde *Code → Download ZIP* de GitHub: nombra la carpeta `motion-promo-reels-main`, y claude.ai exige que la carpeta se llame igual que la skill (`motion-promo-reels`). El zip de la *release* ya tiene la estructura correcta.

Después basta con pedirlo: *«hazme un reel promocional de este producto»*, *«investiga a [nombre] y crea un vídeo promocional con motion graphics»*, *«genera un reel por cada producto de mi tienda»*.

## Requisitos para renderizar

El render usa herramientas reales, así que donde mejor funciona es en Claude Code, Cowork o cualquier agente de código en tu propio equipo. En un entorno en la nube, el agente instala lo que falte cuando puede.

- Node 18+ y `npm install` (instala `puppeteer-core`) en la plantilla que uses
- Chrome o Edge (o `CHROME_PATH`)
- ffmpeg en el PATH
- Python 3 con `numpy` y `scipy` (y `Pillow` para las hojas de contactos del lote)

```bash
cd templates/producto-9x16
npm install
node comprobar.js                                        # comprueba entorno y datos, con mensajes para arreglarlo
node render.js all --stills 1.6,3.4,7.4,10.4,12.4,14.4   # revisar
node render.js all                                       # vídeos en out/
```

## Licencias

- Código: [MIT](LICENSE).
- Fuentes incluidas (Inter, Gelasio, Playfair Display y Outfit): SIL Open Font License 1.1. Cada carpeta `fonts/` lleva su texto de licencia.
- Los vídeos que generes son tuyos. La música y los efectos se sintetizan en `sonido.py`: no usan samples ni pistas de terceros. La locución queda sujeta a las condiciones del proveedor que elijas (ElevenLabs, los motores de Voicebox…), y una voz clonada necesita el consentimiento de su dueño.

---
name: motion-promo-reels
description: Promotional videos with motion graphics and audio generated entirely by code (canvas + ffmpeg) for a person, website or online store — one video or a batch per product, built on real data and a clever, self-referential gag. Catalog batches vary the construction of every reel (scene order, layouts, transitions, theme, hook variant, music) so fifty videos don't look like one.
---

# Promotional reels with code-generated motion graphics

15–30 second videos generated entirely by code: 2D canvas → frames → ffmpeg, with audio synthesized in numpy. No video templates, no After Effects, no third-party music. It covers three cases:
- a person or personal brand (16:9);
- a handful of products (9:16);
- a store's entire catalog (9:16, dozens or hundreds of videos).

**Guiding principle: nothing made up.** Every figure, price, color or feature shown in the video comes from a verified source: website, store API, product page or project documents. If something can't be confirmed, flag it as pending and say so.

This package ships three complete templates in `${CLAUDE_SKILL_DIR}/templates/` (in chat on claude.ai: `templates/`, next to this file). **Copy the closest one into the user's project and adapt it** instead of rebuilding the engine (see section 4). `templates/README.md` lists what to change in each one.

Write all on-screen copy in the language of the brand's audience, and reply to the user in their language. Fixed interface strings ("from", "colors", "NOT HIM"…) are overridden through the template's `textos` block, never by editing the engine. Match the person's gender in `no_es`.

## 0. Pick the case

| Case | Template | Format | Length | Gag unit |
|---|---|---|---|---|
| Person or personal brand | `persona-16x9` | 1920×1080 | 27 s | One, hand-written |
| Website or service | `persona-16x9`, adapted | 16:9 or 9:16 | 20–30 s | One, hand-written |
| A few products (≤10) | `producto-9x16` | 1080×1920 | 15.5 s | One per product, hand-written |
| Catalog (dozens to hundreds) | `catalogo-9x16` | 1080×1920 | 15.5 s | **One per category**, with 2–3 phrase variants that rotate, filled from each product's data; every reel gets its own construction plan (section 3b) |

If the user doesn't specify, use 9:16 for products and say so in one line.

## 1. Research (before writing a single line of script)

Sources, in order:
1. **The project folder, if there is one.** Read `CLAUDE.md`, `AGENTS.md`, decision logs, reports and social-media plans. That's where brand and copy rules live (e.g. "no third-party brand names", "informal tone", "no empty superlatives"), along with design tokens, moderation rules and legal notices (AI labelling). **These rules override any creative idea.**
2. **The official website.** Hero, services, stats, method, stack, credentials. On a JS-heavy site, use a browser and read `document.body.innerText` section by section.
3. **Online stores:**
   - WooCommerce: `/wp-json/wc/store/v1/products?per_page=100&page=N` and `/products/<id>`. Prices are in cents. `prices.price_range` with min ≠ max → "from"; `on_sale` + `regular_price` → struck-through price; `attributes` (colors, sizes, measurements); `description` (often with structured bullet lists); `permalink`.
   - Shopify: `/products.json` and `/products/<handle>.json`.
   - **Never guess slugs or URLs:** read them from `permalink`.
4. **Web search.** Useful for people, but common names return namesakes. If that happens, turn it into script material (see section 2) instead of hiding it.
5. **Photos:** local project files first. Cloud sandboxes often can't download from the store; don't keep retrying. Either use local photos or draw the product in code (stripes, satin waves and simple shapes look better than you'd expect).

Write down the date you read the data: prices go stale.

## 2. Concept: the gag

**A gag is a real property of the product or person, turned into something the video itself does.** It is not a joke pasted on top. Example mechanics, all implemented in the templates (gag ids are Spanish in the code):

| Mechanic | Real property | What the video does |
|---|---|---|
| `invisible` | Transparent, hidden, discreet | An empty frame: "There's a case here. Can't see it? Of course not, it's transparent." The screen then unzips like a zipper. |
| `contador` (counter) | A big quantity (metres, hours, units) | "This reel lasts 15 s. This roll, 50 m. You won't have time to use it up." A counter runs. |
| `diagonal` | Bias cut, stripes or a diagonal design | The text tilts 45° and stripes cross the screen. |
| `brillo` (shine) | Glossy or satin finish | "This text is matte. / This one shines." (with a sheen) |
| `cortar` (cut) | No laces, no cables, no ties | Two threads hold the text up, get cut, and the text stays put. |
| `elevar` (lift) | Platform, push-up, height | The text rises on a "cushion". |
| `secuencia` (sequence) | Many sizes, widths or variants | The real variants flip one by one: "Here, from E to H." |
| `quitar` (remove) | "Without X" | Two rings get drawn and fly off: "Gone." |
| `ritmo` (rhythm) | Sport, movement | Words land on the beat. |
| `reordenar` (rearrange) | Multi-use, convertible | Two lines switch position: parallel, crossed, V-shape. |
| `patron` (pattern) | Embroidery, print, lace | A decorative pattern draws itself. |
| `calma` (calm) | Sensitive categories (health, post-surgery, maternity…) | No gag, no sound hits, no percussion: a serene tone. |
| `homonimos` (namesakes, person) | A common name on Google | `investigar("Name")` shows the namesakes crossed out with "NOT THEM", then "SOURCE FOUND". |

Rules:
1. One **real, verifiable** property.
2. Three lines: setup, twist, punchline (the punchline in italics or the accent color).
3. **The punchline must not be false.** If the product page doesn't say it, don't claim it. Conditional phrases (`si`/`sino` in the config) let a punchline appear only when the description backs it up.
4. **A fixed self-referential element across the whole video**, tied to the industry: a HUD with timecode and frame counter (tech), a stitch line with a stitch counter (crafts, textiles), a tape measure that "measures" the reel (fashion, sizing). Pay it off in the outro ("This reel measures 15.5 s. One size fits all.").
5. **Never joke about bodies.** Sensitive categories use `calma`. Also check that no abstract drawing could read as a body silhouette.
6. No empty superlatives, no comparisons with competitors.

## 3. Structure

**9:16 product (15.5 s at 30 fps = 465 frames)**

| Scene | Time | Content |
|---|---|---|
| Hook | 0–3.0 | The gag |
| Product | 3.0–5.6/5.8 | Name + photo with a bounce (or a procedural drawing, or a placeholder card) |
| Range | ~2.8 s | Real color count, or range (sizes), variants and colors with their names |
| Facts | ~2.6 s | Three facts from the product page, with animated checkmarks |
| Price | ~1.8 s | Real price, "from" or sale, tax note if it applies |
| Outro | 13.2–15.5 | Logo or brand, website in a pill, shipping or CTA, and the closing wink |

In the catalog template the middle scenes (range, facts, price) change order and layout per reel; durations stay the same and the total is always 15.5 s (see 3b).

**16:9 person or brand (27 s):** terminal → namesakes crossed out with a glitch → drop (source found + headline) → stats with counters → method in phases → tool stack marquee (freezes on a self-referential item: "↑ that's me") → "THIS VIDEO: 0 templates · N lines of code" (real count) → the person's quote → outro with monogram, name and CTA.

## 3b. Variation across a batch (catalog, v2)

A batch fails when every reel is the same film with different numbers. The catalog template prevents it with a **plan per product**, stored in `productos.json`:

- **What varies:** order of the middle scenes (6), product scene (`tarjeta`, `difuso`, `arco`), range scene (`pildoras`, `regla`, `rejilla`), facts scene (`lista`, `numerada`, `apiladas`), price scene (`grande`, `sello`, `etiqueta`), transition (`barrido`, `empuje`, `iris`, `diagonal`, `persiana`, `zoom`), color theme (`claro`, `oscuro`, `acento`), text entrance (`subir`, `mascara`, `letras`), hook variant and music (progression, key, tempo, timbre, arpeggio pattern).
- **What doesn't:** the self-referential element and the closing card. They are the brand's signature across the batch.
- **How it's chosen:** `node variar.js` treats the order of `productos.json` as the publishing order. Each candidate plan is scored by its distance to the last ~12 reels (closest neighbours weigh most) minus how overused its options already are. Seeded by product id + season: reproducible.
- **Hooks rotate within each category**, not at random: two products of a category never repeat a hook until its variants run out. **Write 2–3 phrase variants per category** (`frases` + `variantes` in `config.json`), all backed by the data — conditions (`si`, `si_variantes`, `si_colores`) and placeholders (`{ncolores}`, `{nrango}`, `{vmin}`…) let one variant adapt to each product.
- **Themes** are derived from the brand palette and only used when text and accent pass WCAG contrast (4.5 and 3) on their background. A brand can restrict any axis in the `variacion` block of `config.json`; respect the brand's rules first.
- **Sensitive categories** (`calma`) stay in a quiet lane: light theme, crossfade/flash/zoom, no percussion.
- **Re-publishing:** `node variar.js --temporada <name>` gives the whole catalog fresh plans. Without `--temporada`, existing plans are kept and only new products are planned (`extraer.js` does this after every extraction, so price updates never reshuffle the reels).
- **Locking:** edit a product's `plan` by hand and set `"manual": true`.
- Products without a plan render exactly like v1's structure (`planBase`).
- `motor.html`, `audio.py` and `variar.js` all read the same plan (`variacion.js` holds options, themes and the timeline): never hard-code timings in one of them.

## 4. Engine

```
<project>/<reels-folder>/
├── METODO.md        method, rules and checklist (for humans)
├── CLAUDE.md        status and to-dos (for the next session)
├── config.json      (catalog) store, attributes, labels, palette and categories → gag + phrases
├── productos.json   brand + one block per product
├── motor.html       1080×1920 or 1920×1080 canvas; window.renderFrame(f) is DETERMINISTIC
├── render.js        puppeteer-core → one JPEG per frame → ffmpeg image2pipe; then audio and mux
├── audio.py         numpy/scipy synthesis using the SAME cue table as motor.html
├── catalogo.js      (catalog) API → product sheet: gag, phrase variants, facts, brand stripping
├── extraer.js       (catalog) downloads catalog and photos with a browser UA and pauses; REVISAR.md; then plans
├── variacion.js     (catalog) shared by browser and Node: options, color themes + contrast, timeline, planner
├── variar.js        (catalog) assigns a plan to each product → VARIACION.md (batch report)
├── hoja.py          (catalog) contact sheets of the batch for `render.js all --hoja`
├── fonts/           local woff2 + their license (fontsource: `npm pack @fontsource/<family>@<version>`)
├── img/             local photos
└── out/             final videos
```

Technical keys:
- **Determinism:** every frame is computed from `t = f/FPS`. No `requestAnimationFrame`, no unseeded randomness (use `hash(n)`).
- Helpers: `clamp`, `P(t,a,b)` (progress), easings (`eOC`, `eIOC`, `eOX`, `eIX`, `eOB` with bounce), `T_()` for text with letterSpacing and alpha, `fit()` to shrink text until it fits, `rr()` for rounded rectangles.
- Scenes are functions that receive local time `u = t - T.scene`. In v1 templates, transitions are a ±0.16 s background-color wipe at every cut. In the catalog template, each scene is painted to an offscreen canvas and two of them are composited during a cut, so any transition shape works (push, iris, diagonal, blinds, zoom).
- **Preload every font face** before rendering (`document.fonts` → `load()` for each). Loading only a few weights lets the first frames of other weights fall back to a system font — invisible in a single still, glaring in a batch.
- `render.js`: `page.evaluateOnNewDocument(spec => window.SPEC = spec)`, wait for `window.READY` (fonts and images loaded), then `canvas.toDataURL('image/jpeg', .93)` → stdin of `ffmpeg -f image2pipe -c:v mjpeg -i - -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p`.
  - Launch Chrome with `--allow-file-access-from-files`; otherwise local images taint the canvas.
  - Look for Chrome or Edge in their standard paths, or in `CHROME_PATH`.
  - Keep a `--stills t1,t2,…` mode for review.
- Mux: `-af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -movflags +faststart -shortest`.
- Audio: a 4-chord progression matching the brand's tone (tech: 128 BPM with kick, bass and pluck; craft: 112 BPM pizzicato and marimba; elegant: 96 BPM piano and strings).
  - Per-gag effects: zipper = an accelerating burst of clicks; machine = a click train + hum; scissors = two snaps; shine = a high arpeggio.
  - Shared effects: whoosh on cuts, ticks on counters, chime on the price.
  - Light sidechain under the kick, `tanh` to limit, then normalize.
- On Windows the scripts call `python`; on Linux and macOS, `python3`.

## 5. Catalog data without making anything up (catalogo.js + config.json)

- **Display name:** the product name without `marcas_a_quitar` (brands to strip, if the copy rules require it) and without `palabras_tipo` (generic type words such as "Sneaker" or "Boot"). If only a code remains, use the name without the brand.
- **Facts:** the bullets under `titulo_datos` in the description, excluding composition. If there are none, take phrases from the short description split on "." and ":". The third fact is the composition from the material attribute, keeping acronyms like EVA.
- **Trimming:** cut phrases to ~54 characters. Cut at a comma first; otherwise before the last subordinate clause ("with", "for", "that", "and"). Never end on a preposition or article.
- **Colors:** name → hex table in `motor.html`. Two-tone colors ("Black/White") get a split swatch. Unknown colors render neutral grey with their real name.
- **Manual edits:** `"manual": true` on a product protects it from being overwritten on the next extraction.
- **`REVISAR.md`** (review list): sensitive tone, pages without bullets, products without photo or attributes.
- **Test the transformation against the real catalog** by pasting the function into the store's browser console before trusting the extractor. If the download step couldn't be tested, say so.

## 6. Quality control (mandatory before delivery)

1. For a catalog, run `node render.js all --hoja` and **look at the contact sheets of the whole batch**: if two consecutive rows look alike, the batch looks alike. Check `VARIACION.md` too (minimum distance between neighbours, pairs with the same construction: should be 0).
2. Render stills for every scene, build a contact sheet with PIL (not `xstack` with many inputs: ffmpeg can crash) and **look at it**. Check for:
   - overlapping text or truncated phrases;
   - accents on large headlines colliding with the line above;
   - elements intruding on another line;
   - letters vanishing under an overly white sheen;
   - empty "—" blocks when an attribute is missing;
   - empty lower halves in vertical format (the catalog's range layouts center themselves on what they actually show);
   - in every theme: dark swatches on a dark background, accent text on an accent background.
3. 9:16 safe zones: nothing important above ~250 px (Reels UI) or in the last ~320 px (caption). Only the decorative element goes down there.
4. Data: today's prices, "from" when there's a range, sales that may expire, unconfirmed units (flag them), verified URLs.
5. Legal and moderation:
   - Photos with AI-generated or AI-modified people → a visible label in the video (EU AI Act, art. 50; `ia.mostrar_si_foto` in the config). Disclose it when publishing too.
   - Products shown on the body: full photo, catalog style, no aggressive crops, little screen time.
   - Never promise returns or warranties that don't apply.
6. Audio: `ffmpeg -af ebur128` → about −14 LUFS. Check duration and resolution with `ffprobe`.

## 7. Delivery

- When working on the user's machine, write everything into a subfolder of their project and keep the line endings of any file you edit. **Don't touch existing `CLAUDE.md` files or documents:** create your own inside the subfolder.
- `METODO.md`: what's there, how to run it, where each piece of data comes from, brand rules applied, how to add a product or a gag, a pre-publishing checklist and known limits.
- The subfolder's `CLAUDE.md`: status, to-dos and non-negotiable rules, in a few lines.
- Show the videos and summarize: the gags (one per line), where everything lives, the command to regenerate, and any data still to confirm.

## Common mistakes (avoid them)

- Guessing product slugs. Read them from `permalink`.
- A rotated-text gag that runs over the following lines: reposition the lines when the text rotates.
- A satin sheen that's too white eats letters. Use a light brand tone, not pure white.
- Swatch gradients whose color stops collapse leave diagonal bands. Use a separate, clipped sheen layer instead.
- A struck-through price on a product with a price range: use "from" + a sale badge, without the strike-through.
- Units missing from the product page (e.g. measurements without "cm"): omit them or flag them for confirmation.
- Abstract shapes that together suggest a body silhouette: replace them with unambiguous figures.
- One hook per category: with 30 products in a category, 30 reels open with the same sentence. Write variants and let them rotate.
- Picture tempo and audio tempo defined separately (v1's `ritmo` gag dropped words at 112 BPM over a 96 BPM kick). Both must read the plan's tempo.
- Tinting a light photo with a dark theme to make a backdrop: it turns grey. Lay the blurred photo over the theme color at low opacity instead.

# Catalog data without making anything up (catalogo.js + config.json)

Read this when extracting or fixing a store catalog. Back to [SKILL.md](../SKILL.md) section 5.

- **Display name:** the product name without `marcas_a_quitar` (brands to strip, if the copy rules require it) and without `palabras_tipo` (generic type words such as "Sneaker" or "Boot"). If only a code remains, use the name without the brand.
- **Facts:** the bullets under `titulo_datos` in the description, excluding composition. If there are none, take phrases from the short description split on "." and ":". The third fact is the composition from the material attribute, keeping acronyms like EVA.
- **Trimming:** cut phrases to ~54 characters. Cut at a comma first; otherwise before the last subordinate clause ("with", "for", "that", "and"). Never end on a preposition or article.
- **Colors:** name → hex table in `motor.html`. Two-tone colors ("Black/White") get a split swatch. Unknown colors render neutral grey with their real name.
- **Manual edits:** `"manual": true` on a product protects it from being overwritten on the next extraction.
- **`REVISAR.md`** (review list): sensitive tone, pages without bullets, products without photo or attributes.
- **Test the transformation against the real catalog** by pasting the function into the store's browser console before trusting the extractor. If the download step couldn't be tested, say so.

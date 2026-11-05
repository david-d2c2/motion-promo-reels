# Choosing the look (v3.1)

Read this when the user talks about tone, music, colors or movement, or asks what can be chosen. Back to [SKILL.md](../SKILL.md) section 3a.

The **format** comes from the template: products and catalogs are vertical 9:16 (Reels, TikTok, Shorts); a personal brand is horizontal 16:9. If the user asks for a format a template doesn't have (a vertical personal video, a horizontal product reel), say so in one line: it needs adapting the engine by hand.

Everything else (music, sound effects, colors, transitions, layouts) is chosen per video by the planner. The user only steers it:

- **The request already says it** ("calm music", "dark background", "no silly sounds") → translate it directly, don't ask.
- **It says nothing about tone** → ask **one** question before planning (multiple choice if your tools allow it), for example: music *calm / energetic / elegant / doesn't matter* · colors *light / dark / mixed* · sound effects *subtle / playful / doesn't matter*. "Doesn't matter" means no restriction: the planner varies everything.
- **The user asks what can be chosen** → run `node variar.js --opciones` and show its menu (it lists every option with a one-line description, and marks themes the brand's colors can't support).
- **A specific video** ("the case one with synthwave and the polaroid") → edit that product's `plan` (`musica.estilo`, `hero`…) and set `"manual": true`.

Translate with one command — it writes `variacion.json`, keeps what it already had, and re-plans only the videos that no longer comply:

```bash
node variar.js --preferencias musica=tranquila efectos=sutiles colores=claro movimiento=suave
node variar.js --preferencias estilo=lofi,piano tema=claro      # exact names also work
node variar.js --preferencias limpiar                           # back to everything
```

| The user says | Preference |
|---|---|
| calm, relaxed, soft · elegant, premium · energetic, upbeat · fun, playful · techy · acoustic, handmade · epic | `musica=tranquila` · `elegante` · `energica` · `divertida` · `tecnologica` · `acustica` · `epica` |
| subtle / no silly sounds · playful · techy · cinematic | `efectos=sutiles` · `divertidos` · `tecnologicos` · `cinematograficos` |
| light / white · dark · in the brand color | `colores=claro` · `oscuro` · `color` |
| smooth cuts · dynamic cuts | `movimiento=suave` · `dinamico` |

Brand rules beat preferences: if the brand guide says "never dark backgrounds", `colores=claro` stays even if a later request says otherwise — tell the user. Sensitive categories keep their quiet lane whatever the preferences.

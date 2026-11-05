# Voice-over (optional, v3)

Read this only when the user wants a voice. Back to [SKILL.md](../SKILL.md) section 3c.

A video without `locucion.json` (or with `"proveedor": "ninguna"`) renders exactly as before. With it, `render.js` writes a narration, synthesizes it, ducks music (~−10 dB) and effects under it, and saves an `.srt` next to the MP4.

**If the user wants a voice and none is set up, ask before installing anything** — one question:
*No voice* · *Free and local (Piper, Spanish or English; downloads ~240 MB once, then works offline; sounds clear but less natural)* · *ElevenLabs (paid, the most natural; needs their API key)* · *Voicebox (if they already use it)*.
Only after an explicit yes to the free option: `node voz.js --instalar piper es` (or `en`). It installs Piper into its own Python environment under `~/.cache/motion-promo-reels/piper` (the system Python is not touched; deleting that folder uninstalls it), downloads the voice and sets `locucion.json`. It needs internet once (pypi.org and huggingface.co); in a sandbox without it, say so and give the user the same command to run on their machine.

| `proveedor` | What it is | Setup |
|---|---|---|
| `piper` | Piper: free, local, offline once installed | `node voz.js --instalar piper es\|en\|<voice>` (with the user's consent). `"idioma"` picks `es_ES-davefx-medium` or `en_US-lessac-medium`; any other voice from huggingface.co/rhasspy/piper-voices goes in `"voz"`. Each voice has its own license (MODEL_CARD): check it before commercial use. |
| `elevenlabs` | ElevenLabs API | `"voz"`: voice_id. Key in `ELEVENLABS_API_KEY` or `~/.config/motion-promo-reels/env` (`chmod 600`). `"modelo"` defaults to `eleven_multilingual_v2`. |
| `voicebox` | Voicebox, local and free (`http://127.0.0.1:17493`, OpenAI-compatible endpoint) | `"voz"`: profile name or id. The language comes from the profile: create it in the target language. Open the app before rendering. |
| `openai` | Any server with `POST /v1/audio/speech` | `"url"`, `"modelo"`, `"voz"`; key in `OPENAI_API_KEY` if it needs one. |
| `comando` | Any local program (piper, `say`, espeak…) | `"comando"` with `{salida}` (output file) and optionally `{texto}`; otherwise the text arrives on stdin. |

Rules:
- **The script only says what is on screen.** By default (9:16): the hook, the product name, the price ("Desde 39,90 €" is spoken as "desde 39 euros con 90") and the website. To write it by hand: `"locucion": [{"escena": "hook", "texto": "..."}, ...]` in the product, or `"locucion": false` for no voice. Person: `"lineas": [{"t": 2.4, "texto": "..."}]` in `locucion.json`, with facts from `CFG` only.
- Lines are placed in their scene without overlapping. If they don't fit, the voice speeds up to 15 %, then the least important lines are dropped (hook > price > website > name). Warnings are printed: read them.
- **Cost:** takes are cached per sentence (`~/.cache/motion-promo-reels/voz`), so re-rendering is free. ElevenLabs runs stop at `tope_caracteres` (default 3000) unless you pass `--confirmar`; spending is logged in `gasto.jsonl`.
- **Keys never go in the project**, in logs or in the chat. If the user pastes a key, tell them to store it in the env file instead.
- **Cloned voices:** only with the voice owner's consent. The outro shows `"etiqueta"` ("Voz generada con IA" by default); keep it unless the user decides otherwise, and disclose AI voice when publishing.
- `node voz.js <id>` generates and places the voice without rendering, to check timings; `node render.js all --sin-voz` skips it.

"""Hojas de contactos: una fila por vídeo (reel o versión), una columna por escena (en el orden de ese vídeo).

Uso (lo llama render.js):  python hoja.py out/hoja/indice.json out
Archivo común a las tres plantillas.
Sirve para el control de calidad de la v2: si dos filas seguidas se parecen, el lote se parece.
Requisitos: Pillow.
"""
import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

POR_HOJA = 10
ROTULO = 300
TW, TH = 162, 288  # miniaturas 9:16; para 16:9 (persona) se ajusta solo al leer la primera imagen


def fuente(sz):
    for f in ("DejaVuSans.ttf", "Arial.ttf", "arial.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    idx = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    global TW, TH
    metas = json.loads(idx.read_text(encoding="utf-8"))
    w0, h0 = Image.open(idx.parent / metas[0]["escenas"][0]["f"]).size
    if w0 > h0:
        TW, TH = 288, 162
    cols = max(len(m["escenas"]) for m in metas)
    f1, f2 = fuente(20), fuente(15)
    for h in range(0, len(metas), POR_HOJA):
        grupo = metas[h:h + POR_HOJA]
        img = Image.new("RGB", (ROTULO + cols * (TW + 8) + 8, len(grupo) * (TH + 12) + 12), "#202020")
        d = ImageDraw.Draw(img)
        for r, m in enumerate(grupo):
            y = 12 + r * (TH + 12)
            d.text((14, y + 8), f"{h + r + 1:02d} · {m['modelo']}", fill="#FFFFFF", font=f1)
            linea, yy = "", y + 40
            for palabra in m["plan"].split(" · "):
                d.text((14, yy), palabra, fill="#BBBBBB", font=f2)
                yy += 22
            for c, e in enumerate(m["escenas"]):
                th = Image.open(idx.parent / e["f"]).convert("RGB").resize((TW, TH), Image.LANCZOS)
                img.paste(th, (ROTULO + 8 + c * (TW + 8), y))
                d.text((ROTULO + 12 + c * (TW + 8), y + TH - 20), e["n"], fill="#FFFFFF", font=f2)
        dest = out / f"hoja_{h // POR_HOJA + 1:02d}.jpg"
        img.save(dest, quality=88)
        print("OK", dest)


if __name__ == "__main__":
    main()

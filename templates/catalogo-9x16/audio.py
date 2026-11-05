"""Música, efectos y voz para reels de catálogo (9:16).

Uso:  python audio.py <id-producto> salida.wav [--voz out/voz/<id>.json]
v3: el sonido sale de sonido.py (común a las tres plantillas). Este archivo solo decide CUÁNDO pasa cada cosa:
las secciones de la música siguen las escenas del plan, los efectos caen en los mismos instantes que la animación
y los gags tienen su sonido propio. Estilo de música, tempo, tonalidad, semilla y paquete de efectos: plan.musica
(node variar.js). Las categorías sensibles (gag "calma") van sin percusión, sin golpes y con estilos tranquilos.
Requisitos: numpy, scipy.
"""
import json
import pathlib
import sys

import numpy as np

import sonido as S

ROOT = pathlib.Path(__file__).resolve().parent
DUR = 15.5
V1 = [("hook", 0.0), ("hero", 3.0), ("rango", 5.8), ("datos", 8.8), ("precio", 11.4), ("outro", 13.2)]


def tijera():
    """Dos chasquidos metálicos rápidos (gag "cortar")."""
    out = np.zeros(int(.12 * S.SR))
    ru = S.Ruido(5)
    for k in (0, .05):
        c = S.filt(ru(.02), "high", 4000) * np.exp(-S.tt(.02) * 300)
        i = int(k * S.SR)
        out[i:i + len(c)] += c
    return out


def muelle(arriba=True):
    t = S.tt(.35)
    f = 220 * (1 + (1.2 if arriba else -.4) * (1 - np.exp(-t * 12)))
    return np.sin(2 * np.pi * np.cumsum(f) / S.SR) * np.exp(-t * 8) * (1 + .3 * np.sin(2 * np.pi * 18 * t))


def gag_sfx(s, gag):
    B = 60 / s.bpm
    if gag == "quitar":
        s.efecto("barrido", .3, .25)
        s.sonido(muelle(False), 1.05, .35, -.5)
        s.sonido(muelle(False), 1.1, .35, .5)
        s.efecto("aparece", 1.1, .25, f=640)
    elif gag == "secuencia":
        for i in range(4):
            s.efecto("aparece", .9 + i * 1.1 / 4, .3, f=520 + i * 110)
        s.efecto("check", 2.1, .4)
    elif gag == "cortar":
        s.sonido(tijera(), .95, .6, -.4)
        s.sonido(tijera(), 1.0, .6, .4)
        s.sonido(muelle(True), 1.25, .2)
    elif gag == "elevar":
        s.sonido(muelle(True), .9, .45)
        s.efecto("check", 1.4, .3)
    elif gag == "ritmo":  # las palabras caen al tempo del plan (motor.html usa el mismo BPM)
        for i in range(5):
            s.sonido(S.bombo("seco"), .1 + i * B / 2, .4)
    elif gag == "reordenar":
        for i in range(3):
            s.efecto("barrido", .9 + i * .5, .25, d=.3)
    elif gag == "patron":
        s.efecto("cierre", .5, .3)


def main():
    pid, out = sys.argv[1], sys.argv[2]
    voz = sys.argv[sys.argv.index("--voz") + 1] if "--voz" in sys.argv else None
    p = next(x for x in json.loads((ROOT / "productos.json").read_text(encoding="utf-8"))["productos"] if x["id"] == pid)
    calma = p["gag"] == "calma"
    plan = p.get("plan") or {}
    v2 = plan.get("v") == 2 and plan.get("tiempos")
    escenas = [(sg["n"], sg["a"]) for sg in plan["tiempos"]] if v2 else V1
    T = dict(escenas)

    s = S.Sesion(DUR, plan, defecto="piano", semilla=pid, calma=calma)
    if voz:
        s.voz(voz)  # antes de la música: con voz, la melodía y los acordes bajan un poco

    # música: intro durante el gag, entra entera con el producto, respira en los datos (se leen), acorde al cierre
    secciones = []
    for n, a in escenas:
        secciones.append((a, {"hook": "intro", "datos": "ligero", "outro": "final"}.get(n, "ligero" if calma else "lleno")))
    s.musica(secciones)

    # efectos comunes
    cortes = [(plan.get("trans", "barrido") if v2 else "barrido", a) for n, a in escenas[1:]] if v2 else \
        [("barrido", T[n]) for n in ("rango", "datos", "precio")]
    for kind, c in cortes:
        s.efecto("corte", c - (0.3 if kind in ("iris", "zoom", "fundido") else 0.2), .3, trans=kind)
    s.efecto("aparece", T["hero"] + .2, .3, f=480)
    for i in range(7):
        s.efecto("tick", T["rango"] + .3 + i * .07, .15)
    for i in range(min(8, max(1, len(p.get("colores", []))))):
        s.efecto("aparece", T["rango"] + 1.3 + i * .12, .14, f=700 + i * 60)
    for i in range(min(3, len(p.get("datos", [])))):
        s.efecto("check", T["datos"] + .2 + i * .55, .22)
    s.efecto("precio", T["precio"] + .2, .3)
    s.efecto("cierre", T["outro"] + .6, .28)
    if not calma:
        gag_sfx(s, p["gag"])
    s.escribir(out, fade=.6)


if __name__ == "__main__":
    main()

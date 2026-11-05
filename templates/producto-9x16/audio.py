"""Música, efectos y voz para reels de producto (9:16).

Uso:  python audio.py <id-producto> salida.wav [--voz out/voz/<id>.json]
v3: el sonido sale de sonido.py (común a las tres plantillas). Este archivo solo decide CUÁNDO pasa cada cosa y
conserva el sonido propio de cada gag (máquina de coser, cremallera, brillo). Estilo de música, tempo, tonalidad,
semilla y paquete de efectos: plan.musica (node variar.js). Sin plan, estilo "pizzicato" como en la v1.
Todo es síntesis: no hay derechos que gestionar. Requisitos: numpy, scipy.
"""
import json
import pathlib
import sys

import numpy as np

import sonido as S

ROOT = pathlib.Path(__file__).resolve().parent
DUR = 15.5
V1 = [("hook", 0.0), ("hero", 3.0), ("colores", 5.6), ("datos", 8.6), ("precio", 11.4), ("outro", 13.2)]
RU = S.Ruido(3)


def tick():
    t = S.tt(.02)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300) * .5


def coser(d, rate=26):
    """Máquina en marcha: tren de clics mecánicos con zumbido de motor."""
    out = np.zeros(int(d * S.SR))
    for k in range(int(d * rate)):
        c = tick() * (0.8 + 0.4 * RU.r.random())
        i = int(k / rate * S.SR)
        out[i:i + len(c)] += c[: len(out) - i]
    t = S.tt(d)
    motor = S.filt(RU(d), "band", [180, 420]) * 0.25
    return (out + motor) * np.minimum(1, t * 20) * np.minimum(1, (d - t) * 20)


def cremallera(d):
    """Cremallera: ráfaga de clics que acelera + fricción."""
    out = np.zeros(int(d * S.SR))
    pos = 0.0
    while pos < d:
        c = S.filt(RU(0.006), "high", 2500) * np.exp(-S.tt(0.006) * 600)
        i = int(pos * S.SR)
        out[i:i + len(c)] += c[: len(out) - i]
        pos += 0.022 * (1 - 0.7 * pos / d)
    return out + S.filt(RU(d), "band", [2000, 6000]) * 0.15 * np.sin(np.pi * S.tt(d) / d)


def brillo(d=1.0):
    t = S.tt(d)
    s = np.zeros_like(t)
    for i, m in enumerate([86, 90, 93, 98, 102]):
        st = i * 0.06
        s += np.sin(2 * np.pi * S.mtof(m) * t) * np.exp(-np.clip(t - st, 0, None) * 5) * (t >= st)
    return s * 0.35


def gag_sfx(s, gag, T, oferta):
    if gag == "contador":
        s.sonido(coser(2.9), .05, .35)
        for t0 in (.1, 1.0, 1.9):
            s.efecto("aparece", t0, .25)
    elif gag == "invisible":
        for t0 in (.1, 1.0):
            s.efecto("aparece", t0, .25)
        s.efecto("check", 1.8, .3)
        s.sonido(cremallera(.7), T["hero"], .6)
    elif gag == "diagonal":
        s.efecto("aparece", .1, .25)
        s.efecto("barrido", .75, .5, -.5, d=.5)
        for i in range(3):
            s.efecto("barrido", 1.25 + i * .12, .3, .5, d=.3)
        s.efecto("aparece", 1.55, .25, f=560)
        s.efecto("aparece", 2.15, .25, f=640)
    elif gag == "brillo":
        s.efecto("aparece", .1, .25, f=380)
        s.sonido(brillo(1.2), 1.0, .5)
        s.efecto("aparece", 1.9, .25, f=640)
        s.efecto("barrido", 2.1, .3, d=.6)
    else:  # gag nuevo sin sonido propio
        for t0 in (.1, 1.0, 1.9):
            s.efecto("aparece", t0, .25)
    if oferta:
        s.efecto("aparece", T["precio"] + .75, .3, f=980)


def main():
    pid, out = sys.argv[1], sys.argv[2]
    voz = sys.argv[sys.argv.index("--voz") + 1] if "--voz" in sys.argv else None
    p = next(x for x in json.loads((ROOT / "productos.json").read_text(encoding="utf-8"))["productos"] if x["id"] == pid)
    calma = p.get("gag") == "calma"
    plan = p.get("plan") or {}
    v2 = plan.get("v") == 2 and plan.get("tiempos")
    escenas = [(sg["n"], sg["a"]) for sg in plan["tiempos"]] if v2 else V1
    T = dict(escenas)

    s = S.Sesion(DUR, plan, defecto="pizzicato", semilla=pid, calma=calma)
    if voz:
        s.voz(voz)
    s.musica([(a, {"hook": "intro", "datos": "ligero", "outro": "final"}.get(n, "ligero" if calma else "lleno")) for n, a in escenas])

    cortes = [(plan.get("trans", "barrido"), a) for n, a in escenas[1:]] if v2 else [("barrido", T[n]) for n in ("colores", "datos", "precio")]
    for kind, c in cortes:
        s.efecto("corte", c - (0.3 if kind in ("iris", "zoom", "fundido") else 0.2), .35, trans=kind)
    s.efecto("aparece", T["hero"] + .05, .4, f=480)
    s.efecto("aparece", T["hero"] + .3, .3, f=620)
    for i in range(18):  # muestras de color apareciendo
        s.efecto("aparece", T["colores"] + .1 + i * 1.5 / 18, .14, (i % 3 - 1) * .5, f=700 + (i % 6) * 90)
    for i in range(30):  # contador
        s.efecto("tick", T["colores"] + .1 + i * .05, .18 * (1 - i / 32))
    s.efecto("check", T["colores"] + 1.65, .25)
    for i in range(3):
        s.efecto("golpe_suave", T["datos"] + .2 + i * .6, .4)
        s.efecto("check", T["datos"] + .38 + i * .6, .2)
    s.efecto("golpe_suave", T["precio"] + .15, .6)
    s.efecto("precio", T["precio"] + .2, .35)
    s.efecto("cierre", T["outro"] + .75, .3)
    gag_sfx(s, p.get("gag"), T, p.get("oferta"))
    s.escribir(out)


if __name__ == "__main__":
    main()

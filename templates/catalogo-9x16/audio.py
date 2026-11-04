"""Música y efectos sintetizados para reels de catálogo (9:16).

Uso:  python audio.py <id-producto> salida.wav
Todo es síntesis (sin samples ni música de terceros).
v2: los cues, el tempo, la progresión, el tono, el timbre y el patrón salen del "plan" del producto
(productos.json, generado por variar.js), el mismo que lee motor.html: imagen y sonido no pueden desincronizarse.
Sin plan, suena como la v1 (piano + cuerdas, Fa mayor, 96 BPM).
Los productos con gag "calma" (categorías sensibles) llevan una versión sin percusión ni golpes.
Requisitos: numpy, scipy.
"""
import json
import pathlib
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent
SR = 48000
DUR = 15.5
N = int(SR * DUR)
# se rellenan en main() a partir del plan
T = dict(hook=0.0, hero=3.0, rango=5.8, datos=8.8, precio=11.4, outro=13.2)
CORTES = []
BPM = 96
B = 60 / BPM
TONO = 0
TIMBRE = "piano"
PATRON = "corcheas"
rng = np.random.default_rng(11)
mus = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def tt(d):
    return np.arange(int(d * SR)) / SR


def add(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    st = np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(1 + pan)], 1)
    j = min(N, i + len(st))
    buf[i:j] += st[: j - i] * gain


def filt(x, kind, fc):
    fc = np.atleast_1d(fc) / (SR / 2)
    return sosfilt(butter(2, fc if len(fc) > 1 else fc[0], kind, output="sos"), x)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def piano(m, d=1.4, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (2.2 + h * 1.4)) for h, a in ((1, 1), (2, .45), (3, .2), (4, .1)))
    return s * np.minimum(1, t * 400) * vel


def celesta(m, d=1.2, vel=1.0):
    t = tt(d)
    f = mtof(m + 12)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + .35 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t * 9)
    return s * np.minimum(1, t * 600) * vel


def pizz(m, d=0.5, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in ((1, 1), (2, .5), (3, .25)))
    return filt(s * np.exp(-t * 11), "low", 2500) * np.minimum(1, t * 800) * vel


def nota(m, d, vel):
    return {"celesta": celesta, "pizzicato": pizz}.get(TIMBRE, piano)(m + TONO, d, vel)


def strings(ms, d):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * mtof(m) * dt * t + 0.3 * np.sin(2 * np.pi * 5 * t)) for m in ms for dt in (0.997, 1.0, 1.004))
    s = filt(s / (len(ms) * 3), "low", 1800)
    return s * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6)


def kick():
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 12)


def brush():
    return filt(noise(0.18), "band", [3000, 9000]) * np.exp(-tt(0.18) * 16)


def pop(f0=520, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.2 * t / d)) / SR) * np.exp(-t * 30)


def whoosh(d):
    n = noise(d)
    out = np.zeros_like(n)
    seg = 1024
    for i in range(0, len(n), seg):
        fc = 400 + 3500 * (i / len(n)) ** 2
        out[i:i + seg] = filt(n[max(0, i - 2048):i + seg], "band", [max(100, fc * .6), fc * 1.6])[-len(n[i:i + seg]):]
    return out * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 2


def chime(f=1568, d=1.0):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 4)


def snap_cut():
    """Tijera: dos chasquidos metálicos rápidos."""
    out = np.zeros(int(.12 * SR))
    for k in (0, .05):
        c = filt(noise(.02), "high", 4000) * np.exp(-tt(.02) * 300)
        i = int(k * SR)
        out[i:i + len(c)] += c
    return out


def boing(up=True):
    t = tt(.35)
    f = 220 * (1 + (1.2 if up else -.4) * (1 - np.exp(-t * 12)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) * (1 + .3 * np.sin(2 * np.pi * 18 * t))


def tick():
    t = tt(.02)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300) * .5


F_, DM, BB, C_, AM = (41, [65, 69, 72]), (38, [62, 65, 69]), (46, [62, 65, 70]), (36, [64, 67, 72]), (45, [64, 69, 72])
PROGS = [[F_, DM, BB, C_], [F_, C_, DM, BB], [DM, BB, F_, C_], [F_, AM, BB, C_]]  # 0 = la de la v1
PROG = PROGS[0]
# patrones de arpegio por corchea (índices sobre las 3 notas del acorde; 3 = octava del grave)
PATRONES = {"corcheas": [0, 1, 2, 1], "alberti": [0, 2, 1, 2], "saltos": [0, 3, 2, 3]}


def music(calm):
    nb = int(DUR / B)
    for b in range(nb):
        tb = b * B
        root, ch = PROG[(b // 4) % 4]
        if b % 4 == 0:
            add(mus, strings([root + 12 + TONO] + [c + TONO for c in ch], 4 * B + .3), tb, .10 if calm else .08)
            add(mus, piano(root + TONO, 2.4, .5), tb, .25)
        # arpegio en corcheas con el timbre y el patrón del plan
        pat = PATRONES.get(PATRON, PATRONES["corcheas"])
        for e in range(2):
            i = pat[(b * 2 + e) % len(pat)]
            n = (root + 24 if i == 3 else ch[i]) + 12
            add(mus, nota(n, 1.0, .7 if e else 1.0), tb + e * B / 2, .10, -.3 if e else .3)
        if not calm and T["hero"] - .05 <= tb < T["outro"] + 1.2:
            add(mus, kick(), tb, .35)
            add(mus, brush(), tb + B / 2, .10, .3)
    for m in (65, 69, 72, 77):
        add(mus, piano(m + TONO, 2.4, .9), T["outro"] + .6, .14)


def swell(d):
    """Subida suave de ruido filtrado (iris, zoom, fundido)."""
    return filt(noise(d), "low", 1800) * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 3


def trans_sfx(kind, c, g):
    """Sonido de cada corte según la transición del plan."""
    if kind in ("barrido", "empuje", "diagonal"):
        add(sfx, whoosh(.35 if kind != "diagonal" else .45), c - .2, .25 * g)
    elif kind == "persiana":
        for i in range(8):
            add(sfx, tick(), c - .12 + i * .045, .18 * g, (-1) ** i * .4)
    elif kind in ("iris", "zoom", "fundido"):
        add(sfx, swell(.6), c - .3, .18 * g)


def common_sfx(calm):
    g = .5 if calm else 1.0
    for kind, c in CORTES:
        trans_sfx(kind, c, g)
    add(sfx, pop(480), T["hero"] + .2, .3 * g)
    for i in range(7):
        add(sfx, tick(), T["rango"] + .3 + i * .07, .15 * g)
    for i in range(5):
        add(sfx, pop(700 + i * 60, .07), T["rango"] + 1.3 + i * .12, .14 * g)
    for i in range(3):
        add(sfx, pop(900, .08), T["datos"] + .2 + i * .55, .18 * g)
    add(sfx, chime(1760, .8), T["precio"] + .2, .22 * g)
    add(sfx, chime(1397, 1.2), T["outro"] + .6, .2)


def gag_sfx(gag):
    if gag == "quitar":
        add(sfx, whoosh(.5), .3, .25)
        add(sfx, boing(False), 1.05, .35, -.5)
        add(sfx, boing(False), 1.1, .35, .5)
        add(sfx, pop(640), 1.1, .25)
    elif gag == "secuencia":
        for i in range(4):
            add(sfx, pop(520 + i * 110), .9 + i * 1.1 / 4, .3)
        add(sfx, chime(2093, .6), 2.1, .2)
    elif gag == "cortar":
        add(sfx, snap_cut(), .95, .6, -.4)
        add(sfx, snap_cut(), 1.0, .6, .4)
        add(sfx, boing(True), 1.25, .2)
    elif gag == "elevar":
        add(sfx, boing(True), .9, .45)
        add(sfx, chime(1760, .6), 1.4, .15)
    elif gag == "ritmo":
        for i in range(5):
            add(sfx, kick(), .1 + i * B / 2, .4)
    elif gag == "reordenar":
        for i in range(3):
            add(sfx, whoosh(.3), .9 + i * .5, .25)
    elif gag == "patron":
        add(sfx, chime(2349, 1.4), .5, .15)


def main():
    pid, out = sys.argv[1], sys.argv[2]
    global BPM, B, TONO, TIMBRE, PATRON, PROG
    p = next(x for x in json.loads((ROOT / "productos.json").read_text(encoding="utf-8"))["productos"] if x["id"] == pid)
    calm = p["gag"] == "calma"
    plan = p.get("plan") or {}
    if plan.get("v") == 2 and plan.get("tiempos"):
        segs = plan["tiempos"]
        for sg in segs:
            T[sg["n"]] = sg["a"]
        mu = plan.get("musica", {})
        BPM, TONO = mu.get("bpm", 96), mu.get("tono", 0)
        TIMBRE, PATRON = mu.get("timbre", "piano"), mu.get("patron", "corcheas")
        PROG = PROGS[mu.get("prog", 0) % len(PROGS)]
        B = 60 / BPM
        # cortes: el primero (gancho -> producto) también suena en la v2
        CORTES.extend((plan.get("trans", "barrido"), sg["a"]) for sg in segs[1:])
    else:  # v1: destello en los cortes intermedios, sin sonido de corte al producto ni al cierre
        CORTES.extend(("barrido", T[n]) for n in ("rango", "datos", "precio"))
    music(calm)
    common_sfx(calm)
    if not calm:
        gag_sfx(p["gag"])
    mix = mus * .85 + sfx * .9
    fo = int((DUR - .6) * SR)
    mix[fo:] *= np.linspace(1, 0, N - fo)[:, None]
    mix = np.tanh(mix * 1.1)
    mix /= np.max(np.abs(mix)) / .95
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    main()

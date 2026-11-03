"""Banda sonora + efectos de sonido sintetizados para reels de producto (9:16).

Uso:  python audio.py <id-producto> salida.wav
Todo se genera por síntesis (sin samples ni música de terceros): no hay derechos que gestionar.
Los cues coinciden con los de motor.html (objeto T). Si cambias tiempos allí, cámbialos aquí.
Requisitos: numpy, scipy.
"""
import json
import pathlib
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent
T = dict(hook=0.0, hero=3.0, colors=5.6, facts=8.6, price=11.4, outro=13.2, end=15.5)
SR = 48000
DUR = T["end"]
N = int(SR * DUR)
BPM = 112
B = 60 / BPM
rng = np.random.default_rng(3)
mus = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def tt(d):
    return np.arange(int(d * SR)) / SR


def add(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    st = np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(1 + pan)], 1) if sig.ndim == 1 else sig
    j = min(N, i + len(st))
    buf[i:j] += st[: j - i] * gain


def filt(x, kind, fc):
    fc = np.atleast_1d(fc) / (SR / 2)
    return sosfilt(butter(2, fc if len(fc) > 1 else fc[0], kind, output="sos"), x)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------------- instrumentos (cálidos, acústicos: pizzicato/marimba)
def pluck(m, d=0.45):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t)
    return s * np.exp(-t * 9) * np.minimum(1, t * 800)


def marimba(m, d=0.6):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)
    return s * np.minimum(1, t * 900)


def bass(m, d):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.exp(-t * 3.5) * np.minimum(1, t * 300)


def kick():
    t = tt(0.3)
    s = np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 30)) / SR) * np.exp(-t * 10)
    return np.tanh(s * 1.4)


def shaker():
    return filt(noise(0.08), "high", 6000) * np.exp(-tt(0.08) * 45)


def snap():
    return filt(noise(0.12), "band", [1500, 4000]) * np.exp(-tt(0.12) * 35)


# ---------------- efectos
def pop(f0=520, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.4 * t / d)) / SR) * np.exp(-t * 32)


def tick():
    t = tt(0.02)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 320) * 0.5


def whoosh(d, up=True):
    n = noise(d)
    out = np.zeros_like(n)
    seg = 1024
    for i in range(0, len(n), seg):
        k = i / len(n)
        fc = 400 + 4500 * (k if up else 1 - k) ** 2
        out[i:i + seg] = filt(n[max(0, i - 2048):i + seg], "band", [max(100, fc * 0.6), fc * 1.6])[-len(n[i:i + seg]):]
    t = tt(d)
    return out * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2


def chime(f=1568, d=0.9):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.01 * t) + 0.2 * np.sin(2 * np.pi * f * 3.02 * t)) * np.exp(-t * 4.5)


def thud():
    t = tt(0.35)
    return np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t * 30)) / SR) * np.exp(-t * 11)


def sewing(d, rate=26):
    """Máquina en marcha: tren de clics mecánicos con zumbido de motor."""
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        c = tick() * (0.8 + 0.4 * rng.random())
        i = int(k / rate * SR)
        out[i:i + len(c)] += c[: len(out) - i]
    t = tt(d)
    motor = filt(noise(d), "band", [180, 420]) * 0.25
    return (out + motor) * np.minimum(1, t * 20) * np.minimum(1, (d - t) * 20)


def zipper(d):
    """Cremallera: ráfaga de clics que acelera + fricción."""
    out = np.zeros(int(d * SR))
    k, pos = 0, 0.0
    while pos < d:
        c = filt(noise(0.006), "high", 2500) * np.exp(-tt(0.006) * 600)
        i = int(pos * SR)
        out[i:i + len(c)] += c[: len(out) - i]
        pos += 0.022 * (1 - 0.7 * pos / d)
        k += 1
    return out + filt(noise(d), "band", [2000, 6000]) * 0.15 * np.sin(np.pi * tt(d) / d)


def shimmer(d=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for i, m in enumerate([86, 90, 93, 98, 102]):
        st = i * 0.06
        s += np.sin(2 * np.pi * mtof(m) * t) * np.exp(-np.clip(t - st, 0, None) * 5) * (t >= st)
    return s * 0.35


# ---------------- música: Re mayor, I–V–vi–IV, entra por capas
PROG = [(50, [62, 66, 69]), (45, [61, 64, 69]), (47, [62, 66, 71]), (43, [62, 67, 71])]  # D A Bm G
nb = int(DUR / B)
for b in range(nb):
    tb = b * B
    root, ch = PROG[(b // 4) % 4]
    full = tb >= T["hero"] - 0.05
    if tb < T["outro"] + 1.6:
        add(mus, shaker(), tb + B / 2, 0.10 if full else 0.05, 0.3)
    if full and tb < T["outro"] + 1.6:
        add(mus, kick(), tb, 0.55)
        if b % 2 == 1:
            add(mus, snap(), tb, 0.30)
        add(mus, bass(root - 12, B * 0.95), tb, 0.30)
    # arpegio pizzicato: corcheas
    for e in range(2):
        n = ch[(b * 2 + e) % 3] + (12 if (b + e) % 5 == 0 else 0)
        add(mus, pluck(n), tb + e * B / 2, 0.16 if full else 0.12, -0.35 if e else 0.35)
    if full and b % 4 == 0:
        add(mus, marimba(ch[2] + 12, 1.2), tb, 0.10)
# acorde final
for m in [62, 66, 69, 74]:
    add(mus, marimba(m, 2.0), T["outro"] + 1.65, 0.12)

# ---------------- efectos comunes (mismos cues que motor.html)
for c in (T["colors"], T["facts"], T["price"]):
    add(sfx, whoosh(0.35), c - 0.2, 0.35)
add(sfx, pop(480), T["hero"] + 0.05, 0.4)
add(sfx, pop(620), T["hero"] + 0.3, 0.3)
for i in range(18):  # muestras de color apareciendo
    add(sfx, pop(700 + (i % 6) * 90, 0.06), T["colors"] + 0.1 + i * 1.5 / 18, 0.14, (i % 3 - 1) * 0.5)
for i in range(30):  # contador
    add(sfx, tick(), T["colors"] + 0.1 + i * 0.05, 0.18 * (1 - i / 32))
add(sfx, chime(2093, 0.5), T["colors"] + 1.65, 0.18)
for i in range(3):  # datos con check
    add(sfx, thud(), T["facts"] + 0.2 + i * 0.6, 0.45)
    add(sfx, pop(900, 0.08), T["facts"] + 0.38 + i * 0.6, 0.2)
add(sfx, thud(), T["price"] + 0.15, 0.7)
add(sfx, chime(1760, 0.8), T["price"] + 0.2, 0.28)
add(sfx, chime(2637, 0.6), T["price"] + 0.26, 0.15)
add(sfx, whoosh(0.5), T["outro"] - 0.2, 0.4)
add(sfx, chime(1175, 1.2), T["outro"] + 0.75, 0.25)
add(sfx, pop(560), T["outro"] + 0.75, 0.3)


# ---------------- efectos propios de cada gag
def gag_sfx(gag, oferta):
    if gag == "contador":
        add(sfx, sewing(2.9), 0.05, 0.35)
        for t0 in (0.1, 1.0, 1.9):
            add(sfx, pop(520), t0, 0.25)
    elif gag == "invisible":
        for t0 in (0.1, 1.0):
            add(sfx, pop(520), t0, 0.25)
        add(sfx, chime(1318, 0.6), 1.8, 0.2)
        add(sfx, zipper(0.7), T["hero"], 0.6)
    elif gag == "diagonal":
        add(sfx, pop(520), 0.1, 0.25)
        add(sfx, whoosh(0.5), 0.75, 0.5, -0.5)
        for i in range(3):
            add(sfx, whoosh(0.3), 1.25 + i * 0.12, 0.3, 0.5)
        add(sfx, pop(560), 1.55, 0.25)
        add(sfx, pop(640), 2.15, 0.25)
    elif gag == "brillo":
        add(sfx, pop(380), 0.1, 0.25)
        add(sfx, shimmer(1.2), 1.0, 0.5)
        add(sfx, pop(640), 1.9, 0.25)
        add(sfx, whoosh(0.6), 2.1, 0.3)
    if oferta:
        add(sfx, pop(980), T["price"] + 0.75, 0.3)


def main():
    pid, out = sys.argv[1], sys.argv[2]
    data = json.loads((ROOT / "productos.json").read_text(encoding="utf-8"))
    p = next(x for x in data["productos"] if x["id"] == pid)
    gag_sfx(p["gag"], p.get("oferta"))
    mix = mus * 0.8 + sfx * 0.9
    fo = int((DUR - 0.5) * SR)
    mix[fo:] *= np.linspace(1, 0, N - fo)[:, None]
    mix = np.tanh(mix * 1.2)
    mix /= np.max(np.abs(mix)) / 0.95
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    main()

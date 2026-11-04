"""Banda sonora + efectos sintetizados para el vídeo de marca personal (16:9), sincronizados con los cues de anim.html.

Uso: python audio.py [--version B]  (escribe audio.wav en esta carpeta; render.js lo llama solo en modo video)
v2: con --version, la progresión, el tono, el timbre y los efectos de las escenas que cambian de layout salen de
versiones.json (el mismo plan que lee anim.html). Sin versión, suena como la v1.
"""
import json
import pathlib
import sys

import numpy as np
from scipy.signal import butter, sosfilt
import wave

SR = 48000
DUR = 27.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
mus = np.zeros((N, 2))
sfx = np.zeros((N, 2))
BPM = 128
B = 60 / BPM

# ---------- versión (v2)
PLAN = {}
if "--version" in sys.argv:
    _v = sys.argv[sys.argv.index("--version") + 1]
    PLAN = json.loads((pathlib.Path(__file__).resolve().parent / "versiones.json").read_text(encoding="utf-8"))["versiones"][_v]
MU = PLAN.get("musica", {})
TONO = MU.get("tono", 0)
TIMBRE = MU.get("timbre", "pulso")


def tt(d):
    return np.arange(int(d * SR)) / SR


def add(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def saw(f, d):
    t = tt(d)
    return 2 * ((f * t) % 1) - 1


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- instruments
def kick(d=0.45):
    t = tt(d)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7)
    s[:240] += noise(0.005) * np.linspace(1, 0, 240) * 0.5
    return np.tanh(s * 1.6)


def clap():
    n = bp(noise(0.25), 900, 3500)
    t = tt(0.25)
    env = np.exp(-t * 18)
    for k in (0.0, 0.011, 0.022):
        env += 0.6 * np.exp(-np.clip(t - k, 0, None) * 140) * (t >= k)
    return n * env * 0.8


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    return hp(noise(d), 7000) * np.exp(-tt(d) * (14 if open_ else 70))


def bass(m, d):
    f = mtof(m)
    s = saw(f, d) + 0.5 * saw(f * 1.005, d)
    t = tt(d)
    e = np.exp(-t * 22)
    s = lp(s, 300) * (1 - e) + lp(s, 1700) * e
    return s * np.minimum(1, t * 300) * np.exp(-t * 3)


def pluck(m, d=0.22):
    t = tt(d)
    f = mtof(m)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + saw(f * 2.001, d) * 0.3
    e = np.exp(-t * 30)
    return (lp(s, 900) * (1 - e) + lp(s, 5900) * e) * np.exp(-t * 14)


def pad(ms, d):
    t = tt(d)
    s = sum(saw(mtof(m) * dt, d) for m in ms for dt in (0.995, 1.0, 1.006))
    s = lp(s / (len(ms) * 3), 1400)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return s * env


# ---------- SFX
def click():
    s = hp(noise(0.018), 2500) * np.exp(-tt(0.018) * 260)
    s[:60] += 0.8
    return s * 0.5


def ding(f=1320):
    t = tt(0.6)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 7)


def buzz():
    t = tt(0.2)
    s = np.sign(np.sin(2 * np.pi * 98 * t)) + 0.5 * np.sign(np.sin(2 * np.pi * 103 * t))
    return lp(s, 1800) * np.exp(-t * 9) * 0.5


def whoosh(d, up=True):
    t = tt(d)
    n = noise(d)
    out = np.zeros_like(n)
    seg = 512
    for i in range(0, len(n), seg):
        k = i / len(n)
        fc = 300 + 5000 * (k if up else 1 - k) ** 2
        out[i:i + seg] = bp(n[max(0, i - 2048):i + seg], max(80, fc * 0.5), fc * 1.5 + 200)[-len(n[i:i + seg]):]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 if not up else (t / d) ** 2
    return out * env


def riser(d):
    t = tt(d)
    f = 200 * 2 ** (3 * t / d)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + whoosh(d) * 1.2
    return s * (t / d) ** 1.5


def impact(big=1.0):
    d = 1.8
    t = tt(d)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    crash = hp(noise(d), 3000) * np.exp(-t * 3.5) * 0.35
    k = np.zeros_like(t)
    k[: int(0.45 * SR)] = kick() * 0.8
    return np.tanh((boom * 1.2 + crash + k) * big)


def pop(f0=500):
    t = tt(0.12)
    f = f0 * (1 + 1.2 * t / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def tick():
    t = tt(0.02)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300) * 0.5


def thud():
    t = tt(0.35)
    return np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t * 35)) / SR) * np.exp(-t * 10) + hp(noise(0.35), 4000) * np.exp(-t * 40) * 0.2


def glitch(d):
    n = noise(d)
    out = np.zeros_like(n)
    seg = int(0.02 * SR)
    for i in range(0, len(n), seg):
        r = rng.random()
        if r < 0.4:
            f = 200 + rng.random() * 3000
            out[i:i + seg] = np.sign(np.sin(2 * np.pi * f * tt(seg / SR)))[: len(out[i:i + seg])]
        elif r < 0.7:
            out[i:i + seg] = np.round(n[i:i + seg] * 3) / 3
    return out * 0.35


# ---------- MUSIC
AM, F_, C_, G_, EM = (57, [69, 72, 76]), (53, [69, 72, 77]), (48, [67, 72, 76]), (55, [67, 71, 74]), (52, [67, 71, 76])
PROGS = [[AM, F_, C_, G_], [AM, C_, G_, F_], [F_, G_, AM, AM], [AM, EM, F_, G_]]  # 0 = la de la v1
PROG = [(r + TONO, [n + TONO for n in ch]) for r, ch in PROGS[MU.get("prog", 0) % len(PROGS)]]


def lead(m, d=0.22):
    """Voz del arpegio según el timbre de la versión: pulso (v1), sierra o campana."""
    if TIMBRE == "sierra":
        t = tt(d)
        s = saw(mtof(m), d) * 0.6 + saw(mtof(m) * 1.005, d) * 0.4
        return lp(s, 3200) * np.exp(-t * 16)
    if TIMBRE == "campana":
        t = tt(0.5)
        f = mtof(m)
        return np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 7) * 0.8
    return pluck(m, d)


ARP = [0, 1, 2, 1, 2, 0, 1, 2]


def groove(t0, t1, kick_on=True, full=True, gain=1.0):
    nb = int((t1 - t0) / B)
    for b in range(nb):
        tb = t0 + b * B
        bar = (b // 4) % 4
        root, ch = PROG[bar]
        if kick_on:
            add(mus, kick(), tb, 0.9 * gain)
        add(mus, hat(True), tb + B / 2, 0.22 * gain, 0.3)
        add(mus, hat(), tb + B / 4, 0.12 * gain, -0.3)
        add(mus, hat(), tb + 3 * B / 4, 0.12 * gain, -0.3)
        if full and b % 2 == 1:
            add(mus, clap(), tb, 0.45 * gain)
        for e in range(2):
            add(mus, bass(root - 12 + (12 if e == 1 and b % 2 else 0), B / 2 * 0.9), tb + e * B / 2, 0.38 * gain)
        if full:
            for s in range(4):
                n = ch[ARP[(b * 4 + s) % 8] % 3] + (12 if (b + s) % 7 == 0 else 0)
                add(mus, lead(n), tb + s * B / 4, 0.12 * gain, 0.4 if s % 2 else -0.4)
        if b % 4 == 0:
            add(mus, pad([root - 12] + ch, 4 * B), tb, 0.16 * gain)


# intro drone
add(mus, pad([45 + TONO, 52 + TONO, 57 + TONO], 2.4), 0.0, 0.12)
# tension 2.2 - 5.1 : bass pulse + soft kick
for b in range(int((5.1 - 2.2) / (B / 2))):
    tb = 2.2 + b * B / 2
    add(mus, bass(33 + TONO, B / 2 * 0.8), tb, 0.3 + 0.2 * b / 12)
    if b % 2 == 0:
        add(mus, kick(0.3), tb, 0.45)
    add(mus, hat(), tb + B / 4, 0.08 + 0.1 * b / 12)
# drop
groove(5.1, 16.75)
# tape stop 16.4 -> 16.8
a, z = int(16.4 * SR), int(16.8 * SR)
seg = mus[a:z].copy()
speed = np.linspace(1, 0, z - a) ** 1.3
pos = np.cumsum(speed)
pos = np.clip(pos, 0, len(seg) - 1)
for c in range(2):
    mus[a:z, c] = np.interp(pos, np.arange(len(seg)), seg[:, c]) * np.linspace(1, 0.2, z - a)
mus[z:int(18.9 * SR)] = 0
add(mus, pad([45 + TONO, 57 + TONO, 64 + TONO], 2.1), 16.8, 0.08)
# section B 18.9 - 22.6
groove(18.9, 22.55)
# section C outro 22.6 - 25.6 (kick-less, lush)
groove(22.6, 25.6, kick_on=False, full=True, gain=0.85)
add(mus, pad([m + TONO for m in (33, 45, 57, 64, 69, 72)], 3.4), 25.6, 0.22)
add(mus, impact(0.7), 25.6, 0.5)

# sidechain on music (duck pads/bass under kicks)
env = np.ones(N)
for t0, t1 in ((5.1, 16.75), (18.9, 22.55)):
    for b in range(int((t1 - t0) / B)):
        i = int((t0 + b * B) * SR)
        L = int(0.22 * SR)
        j = min(N, i + L)
        env[i:j] = np.minimum(env[i:j], 0.45 + 0.55 * (np.arange(j - i) / L) ** 0.7)
mus *= env[:, None]

# ---------- SFX cues (mirror anim.html)
CMD_LEN = 29
for i in range(1, CMD_LEN + 1):
    add(sfx, click(), 0.25 + i / CMD_LEN * 1.3, 0.5, rng.uniform(-0.3, 0.3))
add(sfx, click(), 1.7, 0.8)
add(sfx, ding(1760), 1.72, 0.18)
add(sfx, whoosh(0.4), 1.85, 0.3)
for i in range(3):
    st = 2.2 + 0.15 + i * 0.4
    add(sfx, whoosh(0.35, up=False), st - 0.05, 0.45, 0.5)
    add(sfx, buzz(), st + 0.45, 0.45)
add(sfx, glitch(0.5), 4.1, 0.6)
add(sfx, riser(0.8), 4.3, 0.55)
add(sfx, whoosh(0.35), 4.75, 0.5)
add(sfx, impact(1.0), 5.1, 0.9)
add(sfx, pop(700), 5.2, 0.3)
for i in range(27):
    add(sfx, click(), 5.3 + i * 0.55 / 27, 0.3)
if PLAN.get("titulo") == "maquina":  # el titular se teclea: teclas en vez de golpe
    for i in range(14):
        add(sfx, click(), 6.04 + i * 0.045 + (0.11 if i >= 6 else 0), 0.55, rng.uniform(-0.3, 0.3))
else:
    add(sfx, impact(0.6), 6.04, 0.55)
    add(sfx, thud(), 6.27, 0.7)
add(sfx, whoosh(0.25, up=False), 6.2, 0.35)
PASO_CIFRAS = 0.7 if PLAN.get("cifras") == "foco" else 0.4  # en "foco" cada cifra ocupa 0,7 s
for i in range(4):
    st = 7.6 + 0.1 + i * PASO_CIFRAS
    add(sfx, pop(420 + i * 90), st, 0.4)
    for k in range(14):
        add(sfx, tick(), st + k * 0.055, 0.12 * (1 - k / 16))
add(sfx, ding(1568), 10.5, 0.2)
add(sfx, ding(2093), 10.58, 0.12)
add(sfx, whoosh(0.4), 11.0, 0.5)
for i in range(5):
    add(sfx, thud(), 11.82 + i * 0.28, 0.7)
add(sfx, whoosh(0.3), 13.85, 0.3)
add(sfx, whoosh(0.35), 14.85, 0.45)
add(sfx, riser(1.15), 15.2, 0.35)
add(sfx, ding(1760), 16.8, 0.35)
add(sfx, pop(900), 16.95, 0.3)
add(sfx, riser(0.9), 18.0, 0.55)
add(sfx, impact(0.7), 18.9, 0.5)
for i in range(4):
    add(sfx, pop(500 + i * 120), 19.1 + i * 0.22, 0.3)
add(sfx, whoosh(0.35), 20.45, 0.45)
add(sfx, impact(0.5), 20.6, 0.45)
for i in range(24):
    add(sfx, tick(), 21.1 + i * 0.025, 0.25)
add(sfx, thud(), 21.12, 0.5)
add(sfx, whoosh(0.4), 22.2, 0.5)
add(sfx, impact(0.6), 22.6, 0.6)
t = tt(0.45)
add(sfx, np.sin(2 * np.pi * np.cumsum(300 + 2400 * t / 0.45) / SR) * np.exp(-t * 4) * 0.3, 22.6, 0.5)  # spike zip
add(sfx, whoosh(0.35), 22.65, 0.4, -0.6)
add(sfx, whoosh(0.35), 22.65, 0.4, 0.6)
add(sfx, impact(1.0), 23.0, 0.9)   # D + C clash
add(sfx, ding(2637), 23.05, 0.15)
for i in range(4):
    add(sfx, pop(1200 + i * 200), 23.15 + i * 0.03, 0.15, -0.5 if i % 2 else 0.5)
add(sfx, glitch(0.6), 23.5, 0.35)
add(sfx, thud(), 24.1, 0.6)
add(sfx, whoosh(0.3), 24.05, 0.3)
add(sfx, pop(600), 24.5, 0.35)
add(sfx, pop(750), 24.65, 0.35)
add(sfx, tick(), 25.1, 0.4)

# ---------- mix + master
mix = mus * 0.75 + sfx * 0.85
# simple reverb-ish (multi-tap) for space
rev = np.zeros_like(mix)
for d, g in ((0.031, 0.25), (0.047, 0.2), (0.071, 0.15), (0.113, 0.1)):
    k = int(d * SR)
    rev[k:, 0] += mix[:-k, 1] * g
    rev[k:, 1] += mix[:-k, 0] * g
mix = mix + lp(rev.T, 5000).T * 0.6
# fade out tail
fo = int(26.4 * SR)
mix[fo:] *= np.linspace(1, 0, N - fo)[:, None]
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 0.95
pcm = (mix * 32767).astype(np.int16)
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')

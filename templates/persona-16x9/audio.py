"""Banda sonora + efectos sintetizados para el vídeo de marca personal (16:9), sincronizados con los cues de anim.html.

Uso: python audio.py [--version B] [--voz out/voz/B.json]   (escribe audio.wav en esta carpeta; render.js lo llama)
v3: el sonido sale de sonido.py (común a las tres plantillas). Aquí solo está la historia en el tiempo: intro,
tensión, drop a los 5,1 s, parada de cinta, sección B y cierre, y cada efecto en el instante de su animación.
Con --version, el estilo de música, el tempo, la tonalidad, la semilla y el paquete de efectos salen de
versiones.json (node variar.js 3). Sin versión: estilo "electro" con efectos "digital", como en la v1.
Requisitos: numpy, scipy.
"""
import json
import pathlib
import sys

import numpy as np

import sonido as S

ROOT = pathlib.Path(__file__).resolve().parent
DUR = 27.0
CMD_LEN = 29  # caracteres de investigar("…") que se teclean

PLAN = {}
version = None
if "--version" in sys.argv:
    version = sys.argv[sys.argv.index("--version") + 1]
    PLAN = json.loads((ROOT / "versiones.json").read_text(encoding="utf-8"))["versiones"][version]
voz = sys.argv[sys.argv.index("--voz") + 1] if "--voz" in sys.argv else None

s = S.Sesion(DUR, PLAN, defecto="electro", semilla="persona-" + (version or "v1"))
if voz:
    s.voz(voz)

# ---------- música: la historia manda (los instantes no cambian entre versiones)
s.musica([(0, "intro"), (2.2, "tension"), (5.1, "lleno"), (16.8, "pausa"), (18.9, "lleno"), (22.6, "ligero"), (25.6, "final")])
s.parada(16.4, 16.8, 16.8)  # el stack se congela: la música se frena como una cinta

# ---------- efectos (mismos instantes que anim.html)
r = np.random.default_rng(7)
for i in range(1, CMD_LEN + 1):  # se teclea investigar("…")
    s.efecto("tecla", 0.25 + i / CMD_LEN * 1.3, 0.5, r.uniform(-0.3, 0.3))
s.efecto("tecla", 1.7, 0.8)
s.efecto("check", 1.72, 0.3)
s.efecto("barrido", 1.85, 0.3, d=0.4)
for i in range(3):  # homónimos tachados
    st = 2.2 + 0.15 + i * 0.4
    s.efecto("barrido", st - 0.05, 0.45, 0.5, arriba=False)
    s.efecto("error", st + 0.45, 0.45)
s.efecto("glitch", 4.1, 0.6, d=0.5)
s.efecto("subida", 4.3, 0.55, d=0.8)
s.efecto("barrido", 4.75, 0.5)
s.efecto("golpe", 5.1, 0.9)  # drop: fuente encontrada
s.efecto("aparece", 5.2, 0.3, f=700)
for i in range(27):  # la URL se escribe
    s.efecto("tecla", 5.3 + i * 0.55 / 27, 0.3)
if PLAN.get("titulo") == "maquina":  # el titular se teclea: teclas en vez de golpe
    for i in range(14):
        s.efecto("tecla", 6.04 + i * 0.045 + (0.11 if i >= 6 else 0), 0.55, r.uniform(-0.3, 0.3))
else:
    s.efecto("golpe", 6.04, 0.55, fuerza=0.6)
    s.efecto("golpe_suave", 6.27, 0.7)
s.efecto("barrido", 6.2, 0.35, d=0.25, arriba=False)
paso = 0.7 if PLAN.get("cifras") == "foco" else 0.4  # en "foco" cada cifra ocupa 0,7 s
for i in range(4):  # cifras con contador
    st = 7.6 + 0.1 + i * paso
    s.efecto("aparece", st, 0.4, f=420 + i * 90)
    for k in range(14):
        s.efecto("tick", st + k * 0.055, 0.12 * (1 - k / 16))
s.efecto("check", 10.5, 0.3)
s.efecto("barrido", 11.0, 0.5, d=0.4)
for i in range(5):  # fases del método
    s.efecto("golpe_suave", 11.82 + i * 0.28, 0.7)
s.efecto("barrido", 13.85, 0.3, d=0.3)
s.efecto("barrido", 14.85, 0.45)
s.efecto("subida", 15.2, 0.35, d=1.15)
s.efecto("check", 16.8, 0.4)  # «↑ ese soy yo»
s.efecto("aparece", 16.95, 0.3, f=900)
s.efecto("subida", 18.0, 0.55, d=0.9)
s.efecto("golpe", 18.9, 0.5, fuerza=0.7)
for i in range(4):
    s.efecto("aparece", 19.1 + i * 0.22, 0.3, f=500 + i * 120)
s.efecto("barrido", 20.45, 0.45)
s.efecto("golpe", 20.6, 0.45, fuerza=0.5)
for i in range(24):  # frase letra a letra
    s.efecto("tick", 21.1 + i * 0.025, 0.25)
s.efecto("golpe_suave", 21.12, 0.5)
s.efecto("barrido", 22.2, 0.5, d=0.4)
s.efecto("golpe", 22.6, 0.6, fuerza=0.6)
t = S.tt(0.45)  # chispa del aro del monograma
s.sonido(np.sin(2 * np.pi * np.cumsum(300 + 2400 * t / 0.45) / S.SR) * np.exp(-t * 4) * 0.3, 22.6, 0.5)
s.efecto("barrido", 22.65, 0.4, -0.6)
s.efecto("barrido", 22.65, 0.4, 0.6)
s.efecto("golpe", 23.0, 0.9)
s.efecto("precio", 23.05, 0.3)
for i in range(4):
    s.efecto("aparece", 23.15 + i * 0.03, 0.15, -0.5 if i % 2 else 0.5, f=1200 + i * 200)
s.efecto("glitch", 23.5, 0.35, d=0.6)
s.efecto("golpe_suave", 24.1, 0.6)
s.efecto("barrido", 24.05, 0.3, d=0.3)
s.efecto("aparece", 24.5, 0.35, f=600)
s.efecto("aparece", 24.65, 0.35, f=750)
s.efecto("tick", 25.1, 0.4)

s.escribir(ROOT / "audio.wav", fade=0.6)
print("ok")

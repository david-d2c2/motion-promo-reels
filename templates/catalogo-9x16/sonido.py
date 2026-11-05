"""Motor de sonido común (v3): música, efectos, voz y mezcla, todo sintetizado (sin samples ni música de terceros).

Archivo COMÚN a las tres plantillas (catalogo-9x16, producto-9x16, persona-16x9): si lo cambias, cópialo a las otras.
Cada audio.py de plantilla solo decide CUÁNDO pasa cada cosa (secciones y efectos); aquí está CÓMO suena.

    import sonido as S
    s = S.Sesion(dur=15.5, plan=plan, defecto="piano", semilla="mi-producto")
    s.musica([(0, "intro"), (3.0, "lleno"), (8.6, "ligero"), (13.2, "final")])
    s.efecto("corte", 5.6, trans="empuje")      # corte · aparece · tick · check · precio · cierre · golpe ...
    s.voz("out/voz/mi-producto.json")            # opcional: líneas de locución (voz.js) con ducking
    s.escribir("salida.wav")

Por qué ya no suena siempre igual (lo que pedía la v3):
  - ESTILOS: diez estilos con instrumentos, batería, groove, modo y armonía propios (no un mismo loop con otro timbre).
  - La SEMILLA compone una melodía, elige patrón de batería, rellenos e inversiones: dos vídeos del mismo estilo
    tampoco suenan igual.
  - El ARREGLO sigue las escenas: entra por capas, respira en las escenas "ligero", hace un relleno antes de cada corte.
  - PAQUETES de efectos (organico, digital, cinematico, minimo, juguete), afinados en la tonalidad de la música.

    python3 sonido.py --estilos           # JSON con los estilos y sus tempos (lo usa la comprobación de sincronía)
    python3 sonido.py --demo carpeta/      # un WAV de 15 s por estilo, para escucharlos
Requisitos: numpy, scipy.
"""
import hashlib
import json
import pathlib
import sys
import wave

import numpy as np
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, sosfilt

SR = 48000


# ============================================================== utilidades
def tt(d):
    return np.arange(max(1, int(d * SR))) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, kind, fc, order=2):
    fc = np.atleast_1d(np.asarray(fc, dtype=float))
    fc = np.clip(fc, 20, SR / 2 - 200) / (SR / 2)
    return sosfilt(butter(order, fc if len(fc) > 1 else fc[0], kind, output="sos"), x)


def semilla_de(*partes):
    return int(hashlib.sha1("|".join(str(p) for p in partes).encode()).hexdigest()[:8], 16)


def fin_suave(x, ms=8):
    n = min(len(x), int(SR * ms / 1000))
    if n:
        x[-n:] *= np.linspace(1, 0, n)
    return x


# ============================================================== instrumentos (mono, devuelven np.array)
def piano(m, d=1.4, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (2.2 + h * 1.4)) for h, a in ((1, 1), (2, .45), (3, .2), (4, .1)))
    return fin_suave(s * np.minimum(1, t * 400) * vel)


def epiano(m, d=1.2, vel=1.0):
    """Piano eléctrico (FM con trémolo): lofi, funk."""
    t = tt(d)
    f = mtof(m)
    idx = 1.6 * np.exp(-t * 4) * vel
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t * 1.6)
    s *= 1 + 0.18 * np.sin(2 * np.pi * 4.8 * t)
    return fin_suave(s * np.minimum(1, t * 600) * vel)


def guitarra(m, d=1.0, vel=1.0, rng=None):
    """Cuerda pulsada: armónicos que caen antes cuanto más agudos + golpe de púa."""
    t = tt(d)
    f = mtof(m)
    s = sum((1 / h ** 1.15) * np.sin(2 * np.pi * f * h * t * (1 + 0.0007 * h)) * np.exp(-t * (1.4 + 1.6 * h)) for h in range(1, 9))
    r = rng or np.random.default_rng(int(m))
    pua = filt(r.uniform(-1, 1, len(t)), "high", 2500) * np.exp(-t * 300) * 0.3
    return fin_suave((s * 0.5 + pua) * np.minimum(1, t * 900) * vel)


def marimba(m, d=0.6, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)
    return fin_suave(s * np.minimum(1, t * 900) * vel)


def celesta(m, d=1.0, vel=1.0):
    t = tt(d)
    f = mtof(m + 12)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 4) + 0.3 * np.sin(2 * np.pi * 4.01 * f * t) * np.exp(-t * 11)
    return fin_suave(s * np.minimum(1, t * 700) * vel)


def campana(m, d=1.6, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t * 3) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 3.2)
    return fin_suave(s * np.minimum(1, t * 800) * vel)


def pizz(m, d=0.5, vel=1.0):
    t = tt(d)
    f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in ((1, 1), (2, .5), (3, .25)))
    return fin_suave(filt(s * np.exp(-t * 11), "low", 2500) * np.minimum(1, t * 800) * vel)


def organo(m, d=0.5, vel=1.0):
    """Órgano de barras: house, funk."""
    t = tt(d + 0.05)
    f = mtof(m) * (1 + 0.003 * np.sin(2 * np.pi * 6 * t))
    s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in ((0.5, .5), (1, 1), (2, .6), (3, .35), (4, .25), (6, .12)))
    g = np.minimum(1, t / 0.006) * np.where(t < d, 1, np.exp(-(t - d) * 40))
    return fin_suave(s * g * vel * 0.35)


def clav(m, d=0.25, vel=1.0):
    """Clavinet: pulso estrecho con filtro que se cierra (funk)."""
    t = tt(d)
    f = mtof(m)
    s = np.where((f * t) % 1 < 0.22, 1.0, -0.3)
    s = filt(s, "low", 3500) * 0.6 + filt(s, "band", [800, 3000]) * np.exp(-t * 25)
    return fin_suave(s * np.exp(-t * 9) * np.minimum(1, t * 1500) * vel * 0.6)


def saw(f, t):
    return 2 * ((f * t) % 1) - 1


def sierra(m, d=0.3, vel=1.0, brillo=3200):
    """Sierra doble desafinada (synthwave, electro)."""
    t = tt(d)
    f = mtof(m)
    s = saw(f, t) * 0.55 + saw(f * 1.006, t) * 0.45
    return fin_suave(filt(s, "low", brillo) * np.exp(-t * 7) * np.minimum(1, t * 800) * vel)


def pulso(m, d=0.22, vel=1.0):
    """Pluck cuadrado con filtro que se cierra (electro de la v1)."""
    t = tt(d)
    f = mtof(m)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + saw(f * 2.001, t) * 0.3
    e = np.exp(-t * 30)
    return fin_suave((filt(s, "low", 900) * (1 - e) + filt(s, "low", 5900) * e) * np.exp(-t * 14) * vel)


def cuerdas(ms, d):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * mtof(m) * dt * t + 0.3 * np.sin(2 * np.pi * 5 * t)) for m in ms for dt in (0.997, 1.0, 1.004))
    s = filt(s / (len(ms) * 3), "low", 1800)
    return s * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6).clip(0)


def pad(ms, d, brillo=1400):
    t = tt(d)
    s = sum(saw(mtof(m) * dt, t) for m in ms for dt in (0.995, 1.0, 1.006))
    s = filt(s / (len(ms) * 3), "low", brillo)
    return s * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4).clip(0)


# ---- bajos
def bajo_sub(m, d):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return fin_suave(s * np.exp(-t * 3.5) * np.minimum(1, t * 300))


def bajo_sierra(m, d):
    t = tt(d)
    f = mtof(m)
    s = saw(f, t) * 0.6 + np.sin(2 * np.pi * f * t) * 0.6
    e = np.exp(-t * 22)
    s = filt(s, "low", 300) * (1 - e) + filt(s, "low", 1700) * e
    return fin_suave(s * np.minimum(1, t * 300) * np.exp(-t * 3))


def bajo_slap(m, d):
    t = tt(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 18) + 0.3 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 30)
    return fin_suave(s * np.exp(-t * 6) * np.minimum(1, t * 2000))


def bajo_808(m, d):
    t = tt(max(d, 0.5))
    f = mtof(m) * (1 + 0.6 * np.exp(-t * 35))
    s = np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR))
    return fin_suave(s * np.exp(-t * 2.2) * np.minimum(1, t * 600) * 0.8)


def bajo_pizz(m, d):
    return pizz(m, max(d, 0.5)) * 1.2


BAJOS = {"sub": bajo_sub, "sierra": bajo_sierra, "slap": bajo_slap, "808": bajo_808, "pizz": bajo_pizz}


# ---- batería
class Ruido:
    def __init__(self, seed):
        self.r = np.random.default_rng(seed)

    def __call__(self, d):
        return self.r.uniform(-1, 1, max(1, int(d * SR)))


def bombo(tipo="seco"):
    if tipo == "grande":  # electro, house
        t = tt(0.45)
        s = np.sin(2 * np.pi * np.cumsum(45 + 120 * np.exp(-t * 28)) / SR) * np.exp(-t * 7)
        return np.tanh(s * 1.5)
    if tipo == "lofi":
        t = tt(0.3)
        s = np.sin(2 * np.pi * np.cumsum(50 + 60 * np.exp(-t * 25)) / SR) * np.exp(-t * 11)
        return filt(s, "low", 900)
    if tipo == "toma":  # cinemático: bombo grave y largo
        t = tt(0.8)
        return np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 14)) / SR) * np.exp(-t * 4.5)
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 12)


def caja(ru, tipo="normal"):
    if tipo == "gated":  # synthwave: cola de reverb cortada en seco
        t = tt(0.32)
        s = filt(ru(0.32), "band", [900, 7000]) * np.where(t < 0.24, 0.8, 0.8 * np.exp(-(t - 0.24) * 120))
        return s + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    if tipo == "lofi":
        t = tt(0.2)
        return filt(ru(0.2), "band", [700, 3500]) * np.exp(-t * 22) + np.sin(2 * np.pi * 170 * t) * np.exp(-t * 35) * 0.4
    t = tt(0.22)
    return filt(ru(0.22), "band", [1200, 8000]) * np.exp(-t * 20) * 0.8 + np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.5


def palmas(ru):
    t = tt(0.25)
    g = sum(np.where(t >= dd, np.exp(-(t - dd) * 33), 0) for dd in (0, 0.011, 0.023)) / 3
    return filt(ru(0.25), "band", [900, 2600]) * g * 1.4


def charles(ru, abierto=False):
    d = 0.3 if abierto else 0.06
    return filt(ru(d), "high", 7000) * np.exp(-tt(d) * (9 if abierto else 55))


def shaker(ru):
    t = tt(0.09)
    return filt(ru(0.09), "band", [4000, 10000]) * np.sin(np.pi * t / 0.09) ** 2


def escobilla(ru):
    return filt(ru(0.18), "band", [3000, 9000]) * np.exp(-tt(0.18) * 16)


def aro(ru):  # rim / caja de madera
    t = tt(0.05)
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + filt(ru(0.05), "band", [1500, 5000]) * 0.4) * np.exp(-t * 80)


def tom(ru, f=110):
    t = tt(0.4)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-t * 20))) / SR) * np.exp(-t * 7) + filt(ru(0.4), "low", 2000) * np.exp(-t * 30) * 0.2


def plato(ru, d=1.6):
    t = tt(d)
    return filt(ru(d), "high", 4500) * np.exp(-t * 2.6) * 0.5


def pisoton(ru):  # acústico: golpe de pie / palmas
    t = tt(0.25)
    return np.sin(2 * np.pi * 70 * t) * np.exp(-t * 16) + filt(ru(0.25), "low", 900) * np.exp(-t * 25) * 0.5


def cama_vinilo(ru, d):
    """Crujido de vinilo (lofi): ruido muy bajo + chasquidos dispersos."""
    s = filt(ru(d), "band", [800, 6000]) * 0.02
    n = len(s)
    for i in ru.r.integers(0, n, int(d * 9)):
        k = min(n - i, 60)
        s[i:i + k] += ru.r.uniform(-0.25, 0.25) * np.exp(-np.arange(k) / 6)
    return s


# ============================================================== estilos
# bpm: rango (variacion.js lo copia para elegir el tempo del plan). modos: mayor/menor. progs: grados de la escala.
# capas: instrumento de acordes, cómo se tocan, arpegio, melodía, bajo y su patrón, batería (patrones en 16 pasos).
P_POP = {"mayor": [[0, 4, 5, 3], [0, 5, 3, 4], [3, 4, 0, 5], [0, 3, 4, 4]], "menor": [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 6], [5, 6, 0, 0]]}
P_JAZZ = {"mayor": [[1, 4, 0, 0], [0, 5, 1, 4], [3, 2, 1, 4]], "menor": [[0, 3, 6, 2], [3, 4, 0, 5], [0, 5, 1, 4]]}
P_EPICO = {"menor": [[0, 5, 2, 6], [0, 5, 3, 4], [5, 3, 0, 6], [0, 2, 5, 4]], "mayor": [[0, 3, 5, 4], [5, 3, 0, 4]]}

ESTILOS = {
    "piano": dict(desc="elegante: piano, cuerdas y escobillas", bpm=(88, 104), modos=["mayor"], raiz=53, progs=P_POP,
                  acordes="cuerdas", arpegio="piano", subdiv=2, melodia="celesta", densidad=0.35,
                  bajo=("sub", "negras"), kit=dict(bombo="seco", caja=None),
                  bateria=[{"bombo": [0, 8], "escobilla": [4, 12]}, {"bombo": [0, 10], "escobilla": [4, 12, 14]}]),
    "pizzicato": dict(desc="artesanal: pizzicato, marimba y shaker", bpm=(104, 120), modos=["mayor"], raiz=50, progs=P_POP,
                      acordes=None, arpegio="pizz", subdiv=2, melodia="marimba", densidad=0.4,
                      bajo=("sub", "negras"), kit=dict(bombo="seco"),
                      bateria=[{"bombo": [0, 4, 8, 12], "shaker": [2, 6, 10, 14], "palmas": [4, 12]},
                               {"bombo": [0, 8], "shaker": [2, 6, 10, 14], "aro": [4, 12]}]),
    "electro": dict(desc="tecnológico: bombo, clap, bajo de sierra y pluck", bpm=(120, 128), modos=["menor"], raiz=57, progs=P_POP,
                    acordes="pad", arpegio="pulso", subdiv=4, melodia=None, densidad=0,
                    bajo=("sierra", "corcheas"), kit=dict(bombo="grande"), lateral=True,
                    bateria=[{"bombo": [0, 4, 8, 12], "palmas": [4, 12], "charles": [2, 6, 10, 14], "charles_c": [1, 3, 5, 7, 9, 11, 13, 15]},
                             {"bombo": [0, 4, 8, 12], "caja": [4, 12], "charles": [2, 6, 10, 14]}]),
    "lofi": dict(desc="lofi: piano eléctrico, swing y vinilo", bpm=(76, 90), modos=["mayor", "menor"], raiz=55, progs=P_JAZZ, septimas=True,
                 acordes="epiano", ritmo_acordes="golpes", arpegio=None, subdiv=2, melodia="epiano", densidad=0.3,
                 bajo=("sub", "sincopado"), kit=dict(bombo="lofi", caja="lofi"), swing=0.22, cama="vinilo",
                 bateria=[{"bombo": [0, 7, 10], "caja": [4, 12], "charles_c": [0, 2, 4, 6, 8, 10, 12, 14]},
                          {"bombo": [0, 3, 8, 11], "caja": [4, 12], "charles_c": [2, 6, 10, 14]}]),
    "funk": dict(desc="funk: bajo slap, clavinet y semicorcheas", bpm=(98, 112), modos=["menor", "mayor"], raiz=52, progs=P_JAZZ, septimas=True,
                 acordes="clav", ritmo_acordes="funk", arpegio=None, subdiv=4, melodia="organo", densidad=0.3,
                 bajo=("slap", "funk"), kit=dict(bombo="seco"), swing=0.08,
                 bateria=[{"bombo": [0, 3, 8, 10], "caja": [4, 12], "charles_c": list(range(16)), "fantasma": [7, 15]},
                          {"bombo": [0, 6, 8, 11], "caja": [4, 12], "charles_c": list(range(0, 16, 2)), "charles": [14]}]),
    "synthwave": dict(desc="synthwave: bajo en octavas, caja gated y sierras", bpm=(96, 112), modos=["menor"], raiz=52, progs=P_EPICO,
                      acordes="pad", arpegio="sierra", subdiv=4, melodia="sierra", densidad=0.25,
                      bajo=("sierra", "octavas"), kit=dict(bombo="grande", caja="gated"), lateral=True,
                      bateria=[{"bombo": [0, 8], "caja": [4, 12], "charles_c": [0, 2, 4, 6, 8, 10, 12, 14]},
                               {"bombo": [0, 4, 8, 12], "caja": [4, 12], "charles_c": [2, 6, 10, 14]}]),
    "acustico": dict(desc="acústico: guitarra rasgueada, palmas y pisotones", bpm=(92, 108), modos=["mayor"], raiz=52, progs=P_POP,
                     acordes="guitarra", ritmo_acordes="rasgueo", arpegio=None, subdiv=2, melodia="campana", densidad=0.25,
                     bajo=("sub", "negras"), kit=dict(bombo=None),
                     bateria=[{"pisoton": [0, 8], "palmas": [4, 12], "shaker": [2, 6, 10, 14]},
                              {"pisoton": [0, 6, 8], "palmas": [4, 12]}]),
    "cinematico": dict(desc="cinemático: ostinato de cuerdas, tambores y campanas", bpm=(80, 96), modos=["menor"], raiz=50, progs=P_EPICO,
                       acordes="cuerdas", arpegio="pizz", subdiv=4, melodia="campana", densidad=0.2,
                       bajo=("sub", "ostinato"), kit=dict(bombo="toma"),
                       bateria=[{"bombo": [0, 10], "tom": [6, 14]}, {"bombo": [0, 3, 8], "tom": [12, 14]}]),
    "ambiente": dict(desc="ambiente: pads y campanas, sin percusión (tono sereno)", bpm=(70, 84), modos=["mayor"], raiz=53, progs=P_POP,
                     acordes="pad", arpegio="celesta", subdiv=1, melodia="campana", densidad=0.2,
                     bajo=("sub", "larga"), kit=dict(bombo=None), bateria=None),
    "house": dict(desc="house: cuatro en el suelo, órgano y charles abierto", bpm=(118, 124), modos=["menor", "mayor"], raiz=53, progs=P_POP, septimas=True,
                  acordes="organo", ritmo_acordes="contra", arpegio=None, subdiv=4, melodia="piano", densidad=0.25,
                  bajo=("sub", "contra"), kit=dict(bombo="grande"), lateral=True,
                  bateria=[{"bombo": [0, 4, 8, 12], "palmas": [4, 12], "charles": [2, 6, 10, 14], "shaker": [1, 3, 5, 7, 9, 11, 13, 15]},
                           {"bombo": [0, 4, 8, 12], "palmas": [4, 12], "charles": [2, 6, 10, 14]}]),
}
CALMA = ["ambiente", "piano", "acustico"]  # estilos admitidos en categorías sensibles (y sin percusión en ellas)
ESCALAS = {"mayor": [0, 2, 4, 5, 7, 9, 11], "menor": [0, 2, 3, 5, 7, 8, 10]}

# Capas que suenan en cada tipo de sección (ganancia relativa). Las secciones las decide cada audio.py.
CAPAS = {
    "intro": dict(acordes=0.6, arpegio=0.55),
    "tension": dict(acordes=0.5, bajo=0.9, bateria=0.45, subida=1),
    "lleno": dict(acordes=1, arpegio=1, melodia=1, bajo=1, bateria=1),
    "ligero": dict(acordes=1, arpegio=0.8, melodia=0.9, bajo=0.7, bateria=0.35),
    "pausa": dict(acordes=0.6),
    "final": dict(),
    "silencio": dict(),
}


class Musica:
    def __init__(self, estilo, bpm, tono, prog, semilla, calma=False):
        self.E = ESTILOS[estilo]
        self.nombre = estilo
        self.bpm = bpm
        self.B = 60 / bpm
        self.r = np.random.default_rng(semilla)
        self.ru = Ruido(semilla + 1)
        self.calma = calma
        self.modo = self.E["modos"][int(self.r.integers(len(self.E["modos"])))]
        self.tonica = self.E["raiz"] + tono
        progs = self.E["progs"][self.modo]
        self.prog = progs[prog % len(progs)]
        self.patron = (self.E["bateria"] or [None])[int(self.r.integers(len(self.E["bateria"] or [None])))]
        self.arp = [[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 2, 3], [2, 1, 0, 3], [0, 3, 1, 2], [2, 0, 1, 0]][int(self.r.integers(6))]
        self.cambio = int(self.r.choice([1, 1, 2]))       # compases por acorde: el ritmo armónico también varía
        self.registro = int(self.r.choice([0, 12, 12]))   # octava del arpegio
        self.dens = self.E.get("densidad", 0.3) * float(self.r.uniform(0.7, 1.5))
        self.motivo = self._motivo()

    # ---- armonía
    def grado(self, g, octava=0):
        esc = ESCALAS[self.modo]
        return self.tonica + esc[g % 7] + 12 * (g // 7) + 12 * octava

    def acorde(self, g):
        notas = [self.grado(g + p) for p in ((0, 2, 4, 6) if self.E.get("septimas") else (0, 2, 4))]
        return notas

    def voicing(self, notas, previo):
        """Inversión más cercana al acorde anterior (voces que se mueven poco)."""
        cands = []
        for inv in range(len(notas)):
            v = sorted(n + (12 if i < inv else 0) for i, n in enumerate(notas))
            while v[0] < 57:
                v = [n + 12 for n in v]
            while v[0] > 66:
                v = [n - 12 for n in v]
            cands.append(v)
        if not previo:
            return cands[0]
        return min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(v, previo)))

    # ---- melodía: un motivo de dos compases por semilla, que luego se varía
    def _motivo(self):
        dens = self.dens
        pasos, g = [], int(self.r.integers(2, 7))
        for i in range(16):  # corcheas en 2 compases
            if i == 0 or (self.r.random() < dens + (0.15 if i % 4 == 0 else 0)):
                g += int(self.r.choice([-2, -1, -1, 0, 1, 1, 2]))
                g = int(np.clip(g, 0, 9))
                pasos.append((i, g))
        return pasos

    # ---- render por secciones
    def render(self, dur, secciones, voz_presente=False):
        N = int(SR * dur)
        armonia = np.zeros((N, 2))
        bateria = np.zeros((N, 2))
        lados = []  # golpes de bombo para el sidechain
        E, B = self.E, self.B
        secs = sorted(secciones) + [(dur, "silencio")]

        def seccion(t):
            tipo = "silencio"
            for a, s in secs:
                if t >= a - 1e-6:
                    tipo = s
            return tipo

        def add(buf, sig, t0, g=1.0, pan=0.0):
            i = int(t0 * SR)
            if i >= N or i < 0 or g <= 0:
                return
            st = np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(1 + pan)], 1) / np.sqrt(2) * 1.414
            j = min(N, i + len(st))
            buf[i:j] += st[: j - i] * g

        swing = E.get("swing", 0)
        paso = B / 4

        def t_paso(t_compas, s):  # posición del paso s (16 por compás) con swing en las semicorcheas impares
            return t_compas + s * paso + (swing * paso if s % 2 else 0)

        compases = int(np.ceil(dur / (4 * B))) + 1
        previo = None
        cortes = [a for a, _ in secs[1:-1]]
        for c in range(compases):
            tc = c * 4 * B
            if tc >= dur:
                break
            g = self.prog[(c // self.cambio) % len(self.prog)]
            notas = self.voicing(self.acorde(g), previo)
            previo = notas
            raiz = self.grado(g) - 24
            while raiz < 33:
                raiz += 12
            for s in range(16):
                t = t_paso(tc, s)
                if t >= dur:
                    break
                tipo = seccion(t)
                capa = CAPAS.get(tipo, {})
                if tipo == "final":
                    continue
                # --- acordes
                ga = capa.get("acordes", 0) * (0.75 if voz_presente else 1)
                inst = E.get("acordes")
                ritmo = E.get("ritmo_acordes", "sostenido")
                if ga and inst:
                    if ritmo == "sostenido" and s == 0:
                        d = min(4 * B, dur - t) + 0.3
                        sig = cuerdas(notas, d) if inst == "cuerdas" else pad(notas, d, 1100 if tipo == "intro" else 1600)
                        add(armonia, sig, t, 0.10 * ga)
                    elif ritmo == "golpes" and s in (0, 6, 10):
                        for k, n in enumerate(notas):
                            add(armonia, epiano(n, 1.4 if s == 0 else 0.6, 0.8), t + k * 0.012, 0.07 * ga, (k - 1.5) * 0.2)
                    elif ritmo == "funk" and s in (2, 3, 7, 10, 11, 14):
                        for k, n in enumerate(notas[:3]):
                            add(armonia, clav(n, 0.18), t, 0.09 * ga, (k - 1) * 0.3)
                    elif ritmo == "rasgueo" and s in (0, 4, 6, 10, 12, 14):
                        baja = s in (0, 6, 12)
                        for k, n in enumerate(notas if baja else notas[::-1]):
                            add(armonia, guitarra(n - 12, 1.1, 0.9 if baja else 0.6, self.r), t + k * 0.011, 0.11 * ga, (k - 1) * 0.25)
                    elif ritmo == "contra" and s in (2, 6, 10, 14):
                        for k, n in enumerate(notas):
                            add(armonia, organo(n, 0.16), t, 0.09 * ga, (k - 1.5) * 0.2)
                # --- arpegio
                garp = capa.get("arpegio", 0)
                sub = E.get("subdiv", 2)
                if garp and E.get("arpegio") and s % (4 // sub) == 0:
                    if not (tipo == "intro" and s % 4):  # en la intro, más espaciado
                        k = (c * 16 + s) // (4 // sub)
                        i = self.arp[k % len(self.arp)]
                        n = (notas[0] + 12) if i == 3 else notas[i % len(notas)]
                        n += self.registro
                        f = {"piano": piano, "pizz": pizz, "pulso": pulso, "sierra": sierra, "celesta": celesta}[E["arpegio"]]
                        dd = {"pulso": 0.22, "sierra": 0.25, "pizz": 0.45, "piano": 1.0, "celesta": 0.9}[E["arpegio"]]
                        add(armonia, f(n, dd, 1.0 if s % 4 == 0 else 0.7), t, 0.075 * garp, 0.35 if k % 2 else -0.35)
                # --- bajo
                gb = capa.get("bajo", 0)
                if gb and not self.calma or (gb and E["bajo"][1] == "larga"):
                    fb, patron = BAJOS[E["bajo"][0]], E["bajo"][1]
                    golpes = {"negras": [0, 4, 8, 12], "corcheas": [0, 2, 4, 6, 8, 10, 12, 14], "sincopado": [0, 6, 10],
                              "funk": [0, 3, 6, 8, 10, 13], "octavas": [0, 2, 4, 6, 8, 10, 12, 14], "ostinato": list(range(16)),
                              "contra": [2, 6, 10, 14], "larga": [0]}[patron]
                    if tipo == "tension":
                        golpes = [0, 2, 4, 6, 8, 10, 12, 14]
                    if s in golpes:
                        n = raiz + (12 if patron == "octavas" and s % 4 == 2 else 0) + (7 if patron == "funk" and s == 13 else 0)
                        d = {"larga": 4 * B, "negras": B * 0.9, "sincopado": B * 0.9}.get(patron, paso * 1.8)
                        add(armonia, fb(n, d), t, 0.26 * gb * (0.8 if patron == "ostinato" else 1))
                # --- melodía
                gm = capa.get("melodia", 0) * (0.5 if voz_presente else 1)
                if gm and E.get("melodia") and s % 2 == 0:
                    i8 = (c % 2) * 8 + s // 2
                    variar = c % 4 == 3  # cada cuatro compases, respuesta: el motivo baja una tercera
                    for p, gr in self.motivo:
                        if p == i8:
                            nota = self.grado(gr + (-2 if variar else 0), 1)
                            # en los tiempos fuertes, la nota del acorde más cercana
                            if s % 8 == 0:
                                nota = min(notas, key=lambda x: abs((x + 12) - nota)) + 12
                            f = {"celesta": celesta, "marimba": marimba, "epiano": epiano, "campana": campana, "sierra": sierra,
                                 "organo": organo, "piano": piano}[E["melodia"]]
                            add(armonia, f(nota, 0.7, 0.9), t, 0.07 * gm, 0.1)
                # --- batería
                gd = capa.get("bateria", 0)
                if gd and self.patron and not self.calma:
                    P = self.patron
                    kit = E.get("kit", {})
                    ultimo = any(0 < (cc - t) <= B and abs(cc - t) > 1e-6 for cc in cortes)
                    if ultimo and tipo in ("lleno", "tension") and s % 2 == 0:  # relleno antes del corte
                        if E.get("kit", {}).get("bombo") == "toma" or "tom" in P:
                            add(bateria, tom(self.ru, 90 + 20 * (s % 8)), t, 0.35 * gd)
                        else:
                            add(bateria, caja(self.ru, kit.get("caja") or "normal"), t, 0.22 * gd * (0.6 + 0.1 * (s % 8)), 0.1)
                        continue
                    if s in P.get("bombo", []) and kit.get("bombo"):
                        add(bateria, bombo(kit["bombo"]), t, 0.5 * gd)
                        lados.append(t)
                    if s in P.get("caja", []):
                        add(bateria, caja(self.ru, kit.get("caja") or "normal"), t, 0.3 * gd, 0.05)
                    if s in P.get("palmas", []):
                        add(bateria, palmas(self.ru), t, 0.28 * gd, -0.1)
                    if s in P.get("charles", []):
                        add(bateria, charles(self.ru, True), t, 0.12 * gd, 0.3)
                    if s in P.get("charles_c", []):
                        add(bateria, charles(self.ru), t, (0.10 if s % 4 == 0 else 0.06) * gd, -0.3)
                    if s in P.get("shaker", []):
                        add(bateria, shaker(self.ru), t, 0.08 * gd, 0.4)
                    if s in P.get("escobilla", []):
                        add(bateria, escobilla(self.ru), t, 0.12 * gd, 0.3)
                    if s in P.get("aro", []):
                        add(bateria, aro(self.ru), t, 0.12 * gd)
                    if s in P.get("fantasma", []):
                        add(bateria, caja(self.ru), t, 0.07 * gd)
                    if s in P.get("tom", []):
                        add(bateria, tom(self.ru, 100 if s % 8 else 130), t, 0.3 * gd)
                    if s in P.get("pisoton", []):
                        add(bateria, pisoton(self.ru), t, 0.45 * gd)
        # --- golpes de sección: plato al entrar en "lleno" desde algo más suave, acorde final, subida en "tension"
        for k, (a, tipo) in enumerate(secs[:-1]):
            antes = secs[k - 1][1] if k else None
            if tipo == "lleno" and antes in ("intro", "tension", "pausa", "ligero") and E.get("bateria") and not self.calma:
                add(bateria, plato(self.ru), a, 0.18)
            if tipo == "tension":
                fin = secs[k + 1][0]
                d = max(0.3, fin - a)
                t = tt(d)
                sub = filt(self.ru(d), "band", [300, 5000]) * (t / d) ** 2
                add(armonia, sub, a, 0.12)
            if tipo == "final":
                d = min(3.0, dur - a + 0.2)
                notas = self.voicing(self.acorde(0), previo)
                add(armonia, (cuerdas(notas + [self.tonica + 12], d) if E.get("acordes") != "pad" else pad(notas, d, 1300)), a, 0.12)
                f = {"celesta": celesta, "marimba": marimba, "epiano": epiano, "campana": campana, "sierra": sierra,
                     "organo": piano, "piano": piano}.get(E.get("melodia") or "piano", piano)
                for i, n in enumerate(notas):
                    add(armonia, f(n + 12, 1.8, 0.8), a + 0.08 * i, 0.08)
        # --- sidechain (estilos de bombo a negras): la armonía se aparta bajo cada bombo
        if E.get("lateral") and lados:
            env = np.ones(N)
            L = int(0.22 * SR)
            for t in lados:
                i = int(t * SR)
                j = min(N, i + L)
                env[i:j] = np.minimum(env[i:j], 0.5 + 0.5 * (np.arange(j - i) / L) ** 0.7)
            armonia *= env[:, None]
        if E.get("cama") == "vinilo":
            v = cama_vinilo(self.ru, dur)[:N]
            armonia[: len(v)] += np.stack([v, v], 1)
        return armonia + bateria


# ============================================================== efectos: paquetes
PAQUETES = ["digital", "organico", "cinematico", "minimo", "juguete"]


class Efectos:
    """Cada tipo de efecto suena distinto según el paquete; las notas se afinan en la tonalidad de la música."""

    def __init__(self, paquete, tonica, semilla):
        self.p = paquete if paquete in PAQUETES else "digital"
        self.tonica = tonica
        self.ru = Ruido(semilla + 7)
        self.r = np.random.default_rng(semilla + 11)

    def nota(self, grado_oct):  # tónica, tercera y quinta en agudo
        return self.tonica + [0, 4, 7, 12, 16, 19, 24][grado_oct % 7] + 24

    def whoosh(self, d, lo=400, hi=3900, sub=False):
        n = self.ru(d)
        out = np.zeros_like(n)
        seg = 1024
        for i in range(0, len(n), seg):
            fc = lo + (hi - lo) * (i / len(n)) ** 2
            out[i:i + seg] = filt(n[max(0, i - 2048):i + seg], "band", [max(60, fc * .6), fc * 1.6])[-len(n[i:i + seg]):]
        out *= np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 2
        if sub:
            t = tt(d)
            out += np.sin(2 * np.pi * 45 * t) * np.sin(np.pi * t / d) ** 2 * 0.6
        return out

    def sintonia(self, notas, d=0.12, f=None):
        f = f or campana
        out = np.zeros(int(SR * (d * len(notas) + 1.2)))
        for i, n in enumerate(notas):
            s = f(n, 1.0, 0.9)
            k = int(i * d * SR)
            out[k:k + len(s)] += s[: len(out) - k]
        return out

    def __call__(self, tipo, **kw):
        p, ru = self.p, self.ru
        if tipo == "corte":
            k = kw.get("trans", "barrido")
            if k == "persiana":
                out = np.zeros(int(0.5 * SR))
                for i in range(8):
                    s = self(tipo="tick")
                    j = int(i * 0.045 * SR)
                    out[j:j + len(s)] += s[: len(out) - j] * 0.8
                return out
            if k in ("iris", "zoom", "fundido"):
                d = 0.6
                t = tt(d)
                base = filt(ru(d), "low", 1800 if p != "minimo" else 900) * np.sin(np.pi * t / d) ** 3
                if p == "cinematico":
                    base += np.sin(2 * np.pi * 40 * t) * np.sin(np.pi * t / d) ** 2 * 0.7
                if p == "juguete":
                    base = np.sin(2 * np.pi * np.cumsum(500 + 900 * t / d) / SR) * np.sin(np.pi * t / d) * 0.5
                return base * (0.5 if p == "minimo" else 1)
            return {"digital": lambda: self.whoosh(0.4),
                    "organico": lambda: self.whoosh(0.3, 600, 2200) * 0.8,
                    "cinematico": lambda: self.whoosh(0.6, 200, 3000, sub=True),
                    "minimo": lambda: self.whoosh(0.22, 900, 2500) * 0.45,
                    "juguete": lambda: np.sin(2 * np.pi * np.cumsum(400 + 1400 * (tt(0.3) / 0.3) ** 1.5) / SR) * np.sin(np.pi * tt(0.3) / 0.3) * 0.45}[p]()
        if tipo == "aparece":
            t = tt(0.12)
            f0 = kw.get("f", 520) * (1 + 0.04 * self.r.uniform(-1, 1))
            if p == "organico":
                return (np.sin(2 * np.pi * f0 * 1.2 * t) * 0.6 + filt(ru(0.12), "band", [800, 3000]) * 0.4) * np.exp(-t * 45)
            if p == "cinematico":
                t = tt(0.3)
                return np.sin(2 * np.pi * 60 * t) * np.exp(-t * 14) + campana(self.nota(4), 0.3, 0.3) * 0.25
            if p == "minimo":
                return filt(ru(0.02), "band", [2000, 6000]) * np.exp(-tt(0.02) * 300) * 0.5
            if p == "juguete":
                return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * t / 0.12)) / SR) * np.exp(-t * 18)
            return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.2 * t / 0.12)) / SR) * np.exp(-t * 30)
        if tipo == "tick":
            t = tt(0.02)
            if p == "organico":
                return aro(ru) * 0.5
            if p == "juguete":
                return marimba(self.nota(int(self.r.integers(3, 6))), 0.15) * 0.4
            if p == "minimo":
                return filt(ru(0.01), "high", 4000) * np.exp(-tt(0.01) * 400) * 0.3
            f = 3200 if p == "cinematico" else 2400
            return np.sin(2 * np.pi * f * t) * np.exp(-t * 300) * 0.5
        if tipo == "check":
            if p == "digital":
                return np.concatenate([np.sin(2 * np.pi * mtof(self.nota(1)) * tt(0.06)) * 0.4, np.sin(2 * np.pi * mtof(self.nota(2)) * tt(0.12)) * np.exp(-tt(0.12) * 20) * 0.4])
            if p == "organico":
                return marimba(self.nota(2), 0.5) * 0.6
            if p == "cinematico":
                return np.sin(2 * np.pi * 80 * tt(0.3)) * np.exp(-tt(0.3) * 14) * 0.8
            if p == "juguete":
                t = tt(0.3)
                return np.sin(2 * np.pi * np.cumsum(300 * (1 + 0.8 * (1 - np.exp(-t * 12)))) / SR) * np.exp(-t * 9) * 0.5
            return celesta(self.nota(2), 0.4) * 0.3
        if tipo in ("precio", "cierre"):
            base = [0, 1, 2] if tipo == "precio" else [3, 2, 0]
            notas = [self.nota(g) for g in base]
            if p == "digital":
                return campana(notas[2] + 12, 0.9) * 0.5 if tipo == "precio" else campana(notas[0], 1.4) * 0.6
            if p == "organico":
                return self.sintonia(notas, 0.09, marimba) * 0.6
            if p == "cinematico":
                t = tt(1.6)
                return campana(notas[0] - 12, 1.6) * 0.6 + np.sin(2 * np.pi * 50 * t) * np.exp(-t * 3) * 0.6
            if p == "juguete":
                sq = lambda f, d: np.sign(np.sin(2 * np.pi * f * tt(d))) * np.exp(-tt(d) * 6) * 0.25
                return np.concatenate([sq(mtof(notas[1]), 0.08), sq(mtof(notas[2] + 5), 0.4)])
            return celesta(notas[0], 1.0) * 0.4
        if tipo == "golpe":
            t = tt(0.9)
            fuerza = kw.get("fuerza", 1.0)
            if p == "organico":
                return pisoton(ru) * fuerza
            if p == "minimo":
                return np.sin(2 * np.pi * 70 * tt(0.25)) * np.exp(-tt(0.25) * 18) * 0.6 * fuerza
            if p == "juguete":
                tb = tt(0.35)
                return np.sin(2 * np.pi * np.cumsum(220 * (1 - 0.5 * (1 - np.exp(-tb * 12)))) / SR) * np.exp(-tb * 8) * fuerza
            sub = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-t * 18)) / SR) * np.exp(-t * (3.5 if p == "cinematico" else 5))
            ruido = filt(ru(0.9), "low", 3000) * np.exp(-t * 9) * 0.5
            return (sub + ruido) * fuerza
        if tipo == "golpe_suave":
            t = tt(0.25)
            return np.sin(2 * np.pi * (70 if p != "juguete" else 160) * t) * np.exp(-t * 18) + filt(ru(0.25), "low", 1200) * np.exp(-t * 40) * 0.3
        if tipo == "subida":
            d = kw.get("d", 0.8)
            t = tt(d)
            s = filt(ru(d), "band", [400, 6000]) * (t / d) ** 2
            if p in ("digital", "cinematico"):
                s += np.sin(2 * np.pi * np.cumsum(200 + 1600 * (t / d) ** 2) / SR) * (t / d) ** 2 * 0.3
            if p == "juguete":
                s = np.sin(2 * np.pi * np.cumsum(300 + 1500 * (t / d)) / SR) * (t / d) * 0.4
            return s * (0.5 if p == "minimo" else 1)
        if tipo == "tecla":
            t = tt(0.018)
            if p == "organico":
                return aro(ru)[: len(t)] * 0.8
            return filt(ru(0.018), "high", 2500) * np.exp(-t * 260)
        if tipo == "error":
            t = tt(0.25)
            f = 110 if p != "juguete" else 220
            return (np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * 2 * t) * 0.2) * np.exp(-t * 6)
        if tipo == "glitch":
            d = kw.get("d", 0.5)
            s = ru(d)
            n = len(s)
            out = np.zeros(n)
            i = 0
            while i < n:
                k = int(self.r.integers(400, 3000))
                if self.r.random() < 0.6:
                    f = self.r.uniform(200, 3000)
                    out[i:i + k] = np.sign(np.sin(2 * np.pi * f * np.arange(min(k, n - i)) / SR)) * 0.4
                i += k
            return filt(out, "low", 6000) * (0.5 if p == "minimo" else 1)
        if tipo == "barrido":  # whoosh suelto (no de corte); arriba=False baja de agudo a grave
            d = kw.get("d", 0.35)
            return self.whoosh(d, 400, 3900) if kw.get("arriba", True) else self.whoosh(d, 3900, 400)
        raise ValueError("Efecto desconocido: " + tipo)


# ============================================================== sesión: música + efectos + voz + mezcla
def leer_wav(ruta):
    with wave.open(str(ruta), "rb") as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(float) / 32768
    if ch > 1:
        a = a.reshape(-1, ch).mean(1)
    if sr != SR:  # remuestreo lineal (voz.js ya entrega 48 kHz; esto es por si acaso)
        x = np.linspace(0, len(a) - 1, int(len(a) * SR / sr))
        a = np.interp(x, np.arange(len(a)), a)
    return a


ESTILO_V2 = {"catalogo": "piano", "producto": "pizzicato", "persona": "electro"}


class Sesion:
    def __init__(self, dur, plan=None, defecto="piano", semilla="0", calma=False):
        self.dur = dur
        self.N = int(SR * dur)
        self.mus = np.zeros((self.N, 2))
        self.sfx = np.zeros((self.N, 2))
        self.vox = np.zeros(self.N)
        plan = plan or {}
        mu = plan.get("musica") or {}
        self.estilo = mu.get("estilo") or defecto
        if calma and self.estilo not in CALMA:
            self.estilo = "ambiente"
        E = ESTILOS[self.estilo]
        bpm = mu.get("bpm") or int(np.mean(E["bpm"]))
        if not (E["bpm"][0] - 12 <= bpm <= E["bpm"][1] + 12):  # tempo de otro estilo (planes v2): el del estilo
            bpm = int(np.mean(E["bpm"]))
        self.semilla = semilla_de(semilla, mu.get("semilla", 0), plan.get("temporada", ""))
        self.calma = calma
        self.M = Musica(self.estilo, bpm, int(mu.get("tono", 0)), int(mu.get("prog", 0)), self.semilla, calma)
        self.F = Efectos(mu.get("sfx") or ("minimo" if calma else "digital"), self.M.tonica, self.semilla)
        self.hay_voz = False

    @property
    def bpm(self):
        return self.M.bpm

    def _add(self, buf, sig, t0, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= self.N or i < 0 or gain == 0:
            return
        if sig.ndim == 1:
            sig = np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(1 + pan)], 1)
        j = min(self.N, i + len(sig))
        buf[i:j] += sig[: j - i] * gain

    def musica(self, secciones, ganancia=1.0):
        self.secciones = secciones
        self.mus += self.M.render(self.dur, secciones, voz_presente=self.hay_voz) * ganancia

    def parada(self, a, b, hasta):
        """Parada de cinta: la música se frena entre a y b y queda en silencio hasta 'hasta' (persona)."""
        i, j, k = int(a * SR), int(b * SR), int(hasta * SR)
        seg = self.mus[i:j].copy()
        vel = np.linspace(1, 0, j - i) ** 1.3
        pos = np.clip(np.cumsum(vel), 0, len(seg) - 1)
        for c in range(2):
            self.mus[i:j, c] = np.interp(pos, np.arange(len(seg)), seg[:, c]) * np.linspace(1, 0.2, j - i)
        self.mus[j:k] = 0

    def efecto(self, tipo, t, gain=1.0, pan=0.0, **kw):
        g = gain * (0.55 if self.calma and tipo in ("golpe", "subida", "glitch") else 1)
        self._add(self.sfx, self.F(tipo, **kw), t, g, pan)

    def sonido(self, sig, t, gain=1.0, pan=0.0):
        """Efecto propio de la plantilla (gags): se suma tal cual."""
        self._add(self.sfx, sig, t, gain, pan)

    def voz(self, ruta_lineas):
        """Coloca las líneas de locución (JSON de voz.js: [{t, wav}]) y activa el ducking."""
        p = pathlib.Path(ruta_lineas)
        if not p.exists():
            return
        lineas = json.loads(p.read_text(encoding="utf-8"))
        for ln in lineas:
            a = leer_wav(p.parent / ln["wav"])
            i = int(ln["t"] * SR)
            j = min(self.N, i + len(a))
            self.vox[i:j] += a[: j - i] * ln.get("ganancia", 1.0)
            self.hay_voz = True

    def escribir(self, out, fade=0.5):
        mus, sfx = self.mus, self.sfx
        if self.hay_voz:  # ducking: música ~ −10 dB y efectos ~ −4 dB mientras habla la voz
            # envolvente con retención: máximo móvil de 150 ms (no se abre entre sílabas) y suavizado (sin bombeo)
            env = maximum_filter1d(np.abs(self.vox), int(0.15 * SR))
            umbral = 0.05 * env.max()  # relativo: vale igual para una voz fuerte que para una floja
            env = np.clip(env / (np.percentile(env[env > umbral], 90) + 1e-12), 0, 1) if env.max() > 0 else env
            env = np.clip(filt(env, "low", 8), 0, 1)
            mus = mus * (1 - 0.7 * env)[:, None]
            sfx = sfx * (1 - 0.4 * env)[:, None]
        # móvil: los altavoces pequeños no reproducen el grave profundo. Se recorta lo que no se oye (< 35 Hz) y se
        # rebaja ~3 dB la zona de 35-110 Hz para que melodía y acordes no queden enterrados.
        mus = filt(mus.T, "high", 35).T
        mus = mus - 0.3 * filt(mus.T, "low", 110).T
        mix = mus * 0.85 + sfx * 0.9
        rev = np.zeros_like(mix)  # espacio: ecos cruzados cortos
        for d, g in ((0.031, 0.22), (0.047, 0.18), (0.071, 0.12), (0.113, 0.08)):
            k = int(d * SR)
            rev[k:, 0] += mix[:-k, 1] * g
            rev[k:, 1] += mix[:-k, 0] * g
        mix = mix + filt(rev.T, "low", 5000).T * 0.5
        if self.hay_voz:
            v = filt(self.vox, "high", 80)
            mix = mix + np.stack([v, v], 1) * 1.1
        fo = int((self.dur - fade) * SR)
        mix[fo:] *= np.linspace(1, 0, self.N - fo)[:, None]
        mix = np.tanh(mix * 1.1)
        mix /= np.max(np.abs(mix)) / 0.95 + 1e-9
        with wave.open(str(out), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((mix * 32767).astype(np.int16).tobytes())


# ============================================================== línea de comandos
def _demo(carpeta):
    carpeta = pathlib.Path(carpeta)
    carpeta.mkdir(parents=True, exist_ok=True)
    secs = [(0, "intro"), (3.0, "lleno"), (8.6, "ligero"), (11.4, "lleno"), (13.2, "final")]
    for nombre in ESTILOS:
        s = Sesion(15.5, {"musica": {"estilo": nombre}}, semilla=nombre)
        s.musica(secs)
        for t in (5.6, 8.6, 11.4):
            s.efecto("corte", t - 0.2)
        s.efecto("precio", 11.6)
        s.escribir(carpeta / f"{nombre}.wav")
        print("OK", carpeta / f"{nombre}.wav", s.bpm, "BPM", s.M.modo)


if __name__ == "__main__":
    if "--estilos" in sys.argv:
        print(json.dumps({k: {"bpm": list(v["bpm"]), "desc": v["desc"]} for k, v in ESTILOS.items()}, ensure_ascii=False))
    elif "--demo" in sys.argv:
        _demo(sys.argv[sys.argv.index("--demo") + 1])
    else:
        print(__doc__)

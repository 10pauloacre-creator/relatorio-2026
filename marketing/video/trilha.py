#!/usr/bin/env python3
"""
trilha.py — música e efeitos sonoros do vídeo de marketing do RELATORIO SKIN.

Tudo é sintetizado do zero com numpy/scipy (nenhuma amostra de áudio externa):
bateria, baixo, pads, arpejos, melodia, piano e sinos; e os efeitos sonoros
(tique do relógio, papel, whoosh, riser, impacto, cliques, digitação, carimbo…)
nos instantes exportados pelas cenas (eventos.json), então som e imagem batem.

Estrutura (120 BPM, compasso = 2 s):
  0–4 s    zumbido grave (os tiques são efeitos)
  4–14 s   o problema: acordes menores, batida de coração, chimbal acelerando
  14–16 s  tensão (riser) → silêncio → impacto em 16 s
  16–46 s  a solução: Dó maior (C G Am F), bateria, baixo, arpejo, melodia
  46–50 s  respiro: piano e pads (F → G)
  50–56 s  refrão final → acorde de Dó em 56 s, cauda até 60 s

Uso: python trilha.py eventos.json saida.wav [duracao]
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
BPM = 120
BEAT = 60.0 / BPM          # 0,5 s
BAR = 4 * BEAT             # 2 s
rng = np.random.default_rng(2026)


# ---------------------------------------------------------------- utilidades
def T(d):
    return np.arange(int(round(d * SR))) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def filtro(x, tipo, f, ordem=2):
    ny = SR / 2
    if tipo == 'bp':
        wn = [max(20.0, f[0]) / ny, min(f[1], ny * 0.95) / ny]
    else:
        wn = min(f, ny * 0.95) / ny
    sos = signal.butter(ordem, wn, btype={'lp': 'low', 'hp': 'high', 'bp': 'band'}[tipo], output='sos')
    return signal.sosfilt(sos, x)


def envelope(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = min(n, max(1, int(a * SR))), min(n, max(1, int(r * SR)))
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, t, kmax=40):
    k_lim = int(min(kmax, (SR / 2 - 500) / max(f, 1)))
    y = np.zeros_like(t)
    for k in range(1, max(1, k_lim) + 1):
        y += np.sin(2 * np.pi * k * f * t) / k
    return y * (2 / np.pi)


def quadrada(f, t, kmax=15):
    y = np.zeros_like(t)
    for k in range(1, kmax * 2, 2):
        if k * f > SR / 2 - 500:
            break
        y += np.sin(2 * np.pi * k * f * t) / k
    return y * (4 / np.pi)


def ruido(n):
    return rng.standard_normal(n)


def norm(x, pico=1.0):
    m = np.max(np.abs(x))
    return x * (pico / m) if m > 0 else x


class Mix:
    """Barramento estéreo (2 × N)."""

    def __init__(self, dur):
        self.n = int(round(dur * SR))
        self.b = np.zeros((2, self.n))

    def add(self, x, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n:
            return
        if x.ndim == 1:
            a = (pan + 1) * np.pi / 4
            x = np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
        if i < 0:
            x = x[:, -i:]
            i = 0
        j = min(self.n, i + x.shape[1])
        self.b[:, i:j] += g * x[:, :j - i]


def varredura(d, f0, f1, largura=0.6):
    """Ruído filtrado por uma faixa que passa de f0 a f1 Hz (base de whoosh, riser, rebobinar)."""
    n = int(d * SR)
    f, tt, Z = signal.stft(ruido(n), SR, nperseg=1024, noverlap=768)
    frac = np.clip(tt / d, 0, 1)
    fc = f0 * (f1 / f0) ** frac
    lf = np.log2(np.maximum(f, 1))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / largura) ** 2)
    _, y = signal.istft(Z * mask, SR, nperseg=1024, noverlap=768)
    y = y[:n]
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    return norm(y)


def resposta_reverb(dur=2.4, decai=0.55, brilho=6500):
    t = T(dur)
    ir = np.vstack([ruido(len(t)), ruido(len(t))]) * np.exp(-t / decai)
    ir = np.vstack([filtro(ir[0], 'lp', brilho), filtro(ir[1], 'lp', brilho)])
    ir[:, :int(0.012 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir):
    return np.vstack([signal.fftconvolve(x[0], ir[0])[:x.shape[1]], signal.fftconvolve(x[1], ir[1])[:x.shape[1]]])


# ------------------------------------------------------------ instrumentos
def bumbo(forte=1.0):
    t = T(0.5)
    f = 46 + 120 * np.exp(-t / 0.04)
    corpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.23)
    clique = filtro(ruido(len(t)), 'lp', 5000) * np.exp(-t / 0.003) * 0.35
    return (corpo + clique) * forte


def palmas():
    t = T(0.4)
    e = np.zeros_like(t)
    for off in (0.0, 0.011, 0.023):
        e += (t >= off) * np.exp(-np.maximum(t - off, 0) / 0.007)
    e += (t >= 0.03) * np.exp(-np.maximum(t - 0.03, 0) / 0.11) * 0.75
    return filtro(ruido(len(t)), 'bp', (850, 3600)) * e


def chimbal(aberto=False):
    d = 0.32 if aberto else 0.07
    t = T(d)
    return filtro(ruido(len(t)), 'hp', 7500) * np.exp(-t / (0.1 if aberto else 0.016))


def prato():
    t = T(2.6)
    x = filtro(ruido(len(t)), 'hp', 4500) * np.exp(-t / 0.7)
    return x + filtro(ruido(len(t)), 'bp', (3000, 9000)) * np.exp(-t / 0.18) * 0.6


def baixo(f, d):
    t = T(d)
    x = saw(f, t, 18) * 0.6 + np.sin(2 * np.pi * f * t) * 0.8
    x = filtro(x, 'lp', 650)
    return x * envelope(len(t), 0.005, 0.05) * (0.55 + 0.45 * np.exp(-t / 0.12))


def pad(notas, d, brilho=2600, ataque=0.35, soltura=0.6):
    t = T(d)
    esq, dir_ = np.zeros_like(t), np.zeros_like(t)
    for n in notas:
        for cents, pan in ((-14, -0.7), (-6, -0.3), (0, 0.0), (6, 0.3), (14, 0.7)):
            v = saw(midi(n) * 2 ** (cents / 1200), t, 24)
            esq += v * (1 - pan) / 2
            dir_ += v * (1 + pan) / 2
    e = envelope(len(t), ataque, soltura)
    x = np.vstack([filtro(esq, 'lp', brilho), filtro(dir_, 'lp', brilho)]) * e
    return x / (len(notas) * 3.2)


def pluck(f, d=0.42):
    t = T(d)
    x = np.zeros_like(t)
    for k in range(1, 11):
        if k * f > SR / 2 - 500:
            break
        x += np.sin(2 * np.pi * k * f * t) / k * np.exp(-t / (0.32 / k ** 0.8))
    return x * envelope(len(t), 0.002, 0.05)


def melodia(f, d):
    t = T(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    fase = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.zeros_like(t)
    for k in range(1, 12, 2):
        x += np.sin(k * fase) / k
    x += 0.35 * np.sin(2 * fase)
    x = filtro(x, 'lp', 4200)
    return x * envelope(len(t), 0.015, 0.12) * (0.75 + 0.25 * np.exp(-t / 0.2))


def piano(f, d=1.6, forte=1.0):
    t = T(d)
    x = np.zeros_like(t)
    for k, a in zip(range(1, 9), (1, .55, .32, .22, .14, .09, .06, .04)):
        fk = f * k * (1 + 0.0004 * k * k)
        if fk > SR / 2 - 500:
            break
        x += a * np.sin(2 * np.pi * fk * t) * np.exp(-t / (1.3 / k ** 0.7))
    x += filtro(ruido(len(t)), 'bp', (1500, 5000)) * np.exp(-t / 0.004) * 0.08
    return x * envelope(len(t), 0.002, 0.2) * forte


def sino(f, d=1.8):
    t = T(d)
    x = np.zeros_like(t)
    for r, a, dec in ((1, 1, 1.4), (2.0, .5, .9), (2.76, .35, .55), (4.07, .22, .35), (5.4, .13, .22)):
        if f * r < SR / 2 - 500:
            x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / dec)
    return x * envelope(len(t), 0.001, 0.1)


def zumbido(f, d):
    t = T(d)
    x = np.sin(2 * np.pi * f * t) + 0.5 * filtro(saw(f, t, 12), 'lp', 320)
    x *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * t)
    return x * envelope(len(t), 2.5, 0.4)


# ------------------------------------------------------------ efeitos sonoros
def fx_tick(p=0):
    t = T(0.05)
    f = 2400 if p % 2 == 0 else 1900
    return filtro(ruido(len(t)), 'bp', (2500, 7500)) * np.exp(-t / 0.004) + 0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01)


def fx_baque(p=0):
    t = T(0.6)
    f = (95 - p * 8) * np.exp(-t / 0.25) + 40
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
    return x + filtro(ruido(len(t)), 'lp', 500) * np.exp(-t / 0.04) * 0.5


def fx_papel(p=0):
    t = T(0.42)
    baque = filtro(ruido(len(t)), 'lp', 220 + p * 15) * np.exp(-t / 0.05) * 1.6
    am = np.abs(filtro(ruido(len(t)), 'lp', 40))
    folha = filtro(ruido(len(t)), 'bp', (1400, 7000)) * np.exp(-t / 0.13) * (0.4 + am * 3)
    return baque + folha * 0.55


def fx_rumble(dur=1.4):
    t = T(dur)
    x = filtro(ruido(len(t)), 'lp', 140) * 3
    return x * np.clip(t / dur, 0, 1) ** 1.5 * envelope(len(t), 0.05, 0.15)


def fx_desaba():
    x = np.zeros(int(1.3 * SR))
    for i in range(7):
        s = fx_papel(i % 8)
        o = int((0.05 + i * 0.09 + rng.random() * 0.04) * SR)
        x[o:o + len(s)] += s[:len(x) - o] * (1 - i * 0.08)
    x += np.pad(fx_rumble(0.9), (0, len(x) - int(0.9 * SR))) * 0.6
    return x


def fx_whoosh(dur=0.7, up=1):
    f0, f1 = (300, 4000) if up else (4000, 300)
    x = varredura(dur, f0, f1, 0.55)
    t = np.linspace(0, 1, len(x))
    return x * np.sin(np.pi * t) ** 1.6


def fx_swipe():
    x = varredura(0.34, 900, 7000, 0.5)
    t = np.linspace(0, 1, len(x))
    return x * np.sin(np.pi * t ** 0.7) ** 2 * 0.8


def fx_riser(dur=1.66):
    t = T(dur)
    x = varredura(dur, 180, 9000, 0.45) * (t / dur) ** 2.2
    f = 110 * 2 ** (3 * t / dur)
    tom = filtro(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR), 'lp', 3000) * (t / dur) ** 2
    y = x * 0.8 + tom * 0.45
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return y


def fx_impacto(leve=0):
    t = T(2.4)
    f = 32 + 40 * np.exp(-t / 0.18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 if not leve else 0.5))
    estouro = filtro(ruido(len(t)), 'lp', 2500) * np.exp(-t / 0.09)
    brilho = filtro(ruido(len(t)), 'hp', 3000) * np.exp(-t / 0.35) * 0.35
    x = sub * 1.2 + estouro * 0.7 + brilho
    return x * (0.55 if leve else 1.0)


def fx_pop(p=0):
    t = T(0.14)
    base = 520 + p * 110
    f = base + base * 1.3 * np.exp(-t / 0.018)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    return x + filtro(ruido(len(t)), 'hp', 3000) * np.exp(-t / 0.002) * 0.2


def fx_clique():
    t = T(0.05)
    return filtro(ruido(len(t)), 'bp', (2000, 7000)) * np.exp(-t / 0.0035) * 1.2 + 0.5 * np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.008)


def fx_digitar(dur=1.5, suave=0):
    x = np.zeros(int((dur + 0.1) * SR))
    t0 = 0.0
    while t0 < dur:
        n = int(0.05 * SR)
        tt = np.arange(n) / SR
        g = 0.5 + rng.random() * 0.5
        k = filtro(ruido(n), 'bp', (1600, 4800)) * np.exp(-tt / 0.009) * g
        k += 0.4 * np.sin(2 * np.pi * (160 + rng.random() * 60) * tt) * np.exp(-tt / 0.015) * g
        i = int(t0 * SR)
        x[i:i + n] += k[:len(x) - i]
        t0 += 0.055 + rng.random() * 0.06
    return x * (0.45 if suave else 0.8)


def fx_ticker(dur=1.3, p=0):
    x = np.zeros(int((dur + 0.1) * SR))
    t0, i = 0.0, 0
    while t0 < dur:
        c = fx_tick(i) * 0.55 if not p else fx_clique() * 0.5
        j = int(t0 * SR)
        x[j:j + len(c)] += c[:len(x) - j]
        t0 += 0.03 + 0.1 * (t0 / dur) ** 2
        i += 1
    return x


def fx_glitch():
    x = np.zeros(int(0.42 * SR))
    for i in range(12):
        n = int(0.035 * SR)
        tt = np.arange(n) / SR
        if rng.random() < 0.5:
            s = quadrada(200 + rng.random() * 1800, tt, 6)
        else:
            s = ruido(n)
        s = np.round(s * 4) / 4
        j = int(i * 0.034 * SR)
        x[j:j + n] += s[:len(x) - j] * (0.35 + rng.random() * 0.4)
    return filtro(x, 'lp', 9000)


def fx_carimbo():
    t = T(0.7)
    grave = np.sin(2 * np.pi * np.cumsum(60 + 50 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.2)
    madeira = filtro(ruido(len(t)), 'bp', (250, 1200)) * np.exp(-t / 0.035)
    clique = np.pad(fx_clique(), (0, len(t) - int(0.05 * SR)))
    return grave * 1.2 + madeira * 1.4 + clique * 0.6


def fx_blip(p=0):
    t = T(0.12)
    return quadrada(midi(76 + p * 4), t, 5) * np.exp(-t / 0.04) * 0.5


def fx_subida(dur=1.2):
    t = T(dur)
    f = 300 * 2 ** (2 * t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t))
    return x * np.sin(np.pi * t / dur) * 0.35


def fx_cascata(dur=1.0):
    x = np.zeros(int((dur + 0.3) * SR))
    n = 22
    for i in range(n):
        tt = dur * i / n
        t2 = T(0.12)
        f = midi(72 + i * 1.1)
        s = np.sin(2 * np.pi * f * t2) * np.exp(-t2 / 0.035)
        j = int(tt * SR)
        x[j:j + len(s)] += s[:len(x) - j] * 0.35
    return x


def fx_ping():
    t = T(1.2)
    x = (np.sin(2 * np.pi * 1320 * t) + 0.5 * np.sin(2 * np.pi * 1980 * t)) * np.exp(-t / 0.28)
    eco = np.zeros_like(x)
    d = int(0.13 * SR)
    eco[d:] = x[:-d] * 0.4
    return (x + eco) * 0.6


def fx_ding():
    x = sino(midi(88), 1.6)
    y = sino(midi(95), 1.6) * 0.5
    d = int(0.07 * SR)
    x[d:] += y[:-d]
    return x * 0.7


def fx_sucesso():
    x = np.zeros(int(2.0 * SR))
    for i, n in enumerate((84, 88, 91, 96)):
        s = sino(midi(n), 1.6) * (0.8 - i * 0.08)
        j = int(i * 0.075 * SR)
        x[j:j + len(s)] += s[:len(x) - j]
    return x * 0.6


def fx_brilho(dur=0.8):
    x = np.zeros((2, int((dur + 0.3) * SR)))
    for _ in range(34):
        t2 = T(0.08 + rng.random() * 0.12)
        s = np.sin(2 * np.pi * (3000 + rng.random() * 5000) * t2) * np.exp(-t2 / (0.02 + rng.random() * 0.04))
        j = int(rng.random() * dur * SR)
        pan = rng.random() * 2 - 1
        a = (pan + 1) * np.pi / 4
        x[0, j:j + len(s)] += s[:x.shape[1] - j] * np.cos(a) * 0.25
        x[1, j:j + len(s)] += s[:x.shape[1] - j] * np.sin(a) * 0.25
    return x


def fx_risco():
    x = varredura(0.2, 1500, 6000, 0.35)
    t = np.linspace(0, 1, len(x))
    return x * np.exp(-t * 3) * 0.8


def fx_rebobinar(dur=1.8):
    t = T(dur)
    x = varredura(dur, 5000, 250, 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    f = 900 * 2 ** (-2.5 * t / dur)
    tom = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (x * 0.7 + tom) * np.sin(np.pi * t / dur) ** 0.8


EFEITOS = {
    'tick': (lambda e: fx_tick(e.get('p', 0)), 0.55, 0.3),
    'baque': (lambda e: fx_baque(e.get('p', 0)), 0.85, 0.2),
    'papel': (lambda e: fx_papel(e.get('p', 0)), 0.8, 0.15),
    'rumble': (lambda e: fx_rumble(e.get('dur', 1.4)), 0.7, 0.1),
    'desaba': (lambda e: fx_desaba(), 0.8, 0.2),
    'whoosh': (lambda e: fx_whoosh(e.get('dur', 0.7), e.get('up', 1)), 0.55, 0.35),
    'swipe': (lambda e: fx_swipe(), 0.4, 0.3),
    'riser': (lambda e: fx_riser(e.get('dur', 1.66)), 0.75, 0.3),
    'impacto': (lambda e: fx_impacto(e.get('leve', 0)), 1.0, 0.45),
    'pop': (lambda e: fx_pop(e.get('p', 0)), 0.5, 0.2),
    'clique': (lambda e: fx_clique(), 0.6, 0.1),
    'digitar': (lambda e: fx_digitar(e.get('dur', 1.5), e.get('suave', 0)), 0.55, 0.05),
    'ticker': (lambda e: fx_ticker(e.get('dur', 1.3), e.get('p', 0)), 0.55, 0.1),
    'glitch': (lambda e: fx_glitch(), 0.5, 0.2),
    'carimbo': (lambda e: fx_carimbo(), 0.95, 0.25),
    'blip': (lambda e: fx_blip(e.get('p', 0)), 0.45, 0.25),
    'subida': (lambda e: fx_subida(e.get('dur', 1.2)), 0.5, 0.3),
    'cascata': (lambda e: fx_cascata(e.get('dur', 1.0)), 0.6, 0.35),
    'ping': (lambda e: fx_ping(), 0.55, 0.4),
    'ding': (lambda e: fx_ding(), 0.6, 0.45),
    'sucesso': (lambda e: fx_sucesso(), 0.65, 0.45),
    'brilho': (lambda e: fx_brilho(e.get('dur', 0.8)), 0.8, 0.45),
    'risco': (lambda e: fx_risco(), 0.6, 0.15),
    'rebobinar': (lambda e: fx_rebobinar(e.get('dur', 1.8)), 0.55, 0.4),
    'sino': (lambda e: sino(midi(e.get('p', 84)), 1.8) * 0.5, 0.6, 0.5),
}


# ------------------------------------------------------------ composição
ACORDES = {  # voicings (pad) e fundamental (baixo)
    'C': ([60, 64, 67, 72], 36), 'G': ([59, 62, 67, 71], 43), 'Am': ([57, 60, 64, 69], 45), 'F': ([57, 60, 65, 69], 41),
    'Am_d': ([57, 60, 64], 33), 'F_d': ([53, 57, 60], 29), 'Dm_d': ([50, 53, 57], 38), 'E_d': ([52, 56, 59], 28),
}
GANCHO = {  # melodia (tempo dentro do compasso, nota, duração)
    'C': [(0, 76, .5), (.5, 79, .5), (1.0, 84, .75), (1.75, 83, .25)],
    'G': [(0, 83, .5), (.5, 81, .5), (1.0, 79, 1.0)],
    'Am': [(0, 81, .5), (.5, 84, .5), (1.0, 88, .75), (1.75, 86, .25)],
    'F': [(0, 84, .5), (.5, 81, .5), (1.0, 79, .5), (1.5, 77, .5)],
}


def compor(dur):
    bat, sint, envio = Mix(dur), Mix(dur), Mix(dur)
    bumbos = []

    def kick(t, g=1.0):
        bat.add(bumbo(), t, 0.95 * g)
        bumbos.append(t)

    # 0–4 s: zumbido grave de tensão (vai até o silêncio antes do impacto)
    z = zumbido(midi(33), 15.7)
    sint.add(z, 0.0, 0.28)

    # 4–14 s: o problema — acordes menores e batida de coração
    for t0, nome in ((4, 'Am_d'), (6, 'F_d'), (8, 'Dm_d'), (10, 'E_d'), (12, 'E_d')):
        notas, fund = ACORDES[nome]
        p = pad(notas, 2.3, brilho=900 + (t0 - 4) * 90, ataque=0.5, soltura=0.5)
        sint.add(p, t0, 0.55)
        envio.add(p, t0, 0.35)
        sint.add(baixo(midi(fund + 12), 1.8), t0, 0.35)
    for b in np.arange(4, 14, BAR):
        bat.add(bumbo(0.8), b, 0.7)
        bat.add(bumbo(0.6), b + 0.28, 0.55)
    # piano triste: arpejo descendente de Lá menor
    for i, t0 in enumerate(np.arange(4, 12, BEAT)):
        n = [69, 72, 76, 72][i % 4] - (2 if 6 <= t0 < 8 else 0)
        pp = piano(midi(n), 1.2, 0.55)
        sint.add(pp, t0, 0.3, pan=-0.25)
        envio.add(np.vstack([pp, pp]), t0, 0.25)
    # chimbal acelerando (10–15,7 s)
    t0 = 10.0
    while t0 < 15.65:
        passo = 0.25 if t0 < 12 else 0.125 if t0 < 14.5 else 0.0625
        bat.add(chimbal(), t0, 0.18 + 0.25 * (t0 - 10) / 5.7)
        t0 += passo

    # 16–46 s: a solução (C G Am F)
    seq = ['C', 'G', 'Am', 'F'] * 4
    for i in range(15):
        t0 = 16 + i * BAR
        nome = seq[i]
        notas, fund = ACORDES[nome]
        p = pad(notas, BAR + 0.3, brilho=2800, ataque=0.08, soltura=0.3)
        sint.add(p, t0, 0.42)
        envio.add(p, t0, 0.3)
        for b in range(4):
            tb = t0 + b * BEAT
            kick(tb)
            if b in (1, 3):
                bat.add(palmas(), tb, 0.5)
            bat.add(chimbal(), tb + BEAT / 2, 0.28)
            if i >= 4:
                bat.add(chimbal(), tb + BEAT / 4, 0.12)
                bat.add(chimbal(), tb + 3 * BEAT / 4, 0.12)
            if b == 3:
                bat.add(chimbal(True), tb + BEAT / 2, 0.16)
            # baixo em oitavas (colcheias)
            sint.add(baixo(midi(fund), 0.23), tb, 0.55)
            sint.add(baixo(midi(fund + 12), 0.23), tb + BEAT / 2, 0.42)
        # arpejo em semicolcheias
        tons = [n + 12 for n in notas]
        ordem = [0, 1, 2, 3, 2, 1, 2, 3]
        for s in range(16):
            n = tons[ordem[s % 8] % len(tons)]
            pl = pluck(midi(n), 0.35)
            pan = -0.45 if s % 2 else 0.45
            sint.add(pl, t0 + s * BEAT / 4, 0.16, pan=pan)
            envio.add(np.vstack([pl, pl]), t0 + s * BEAT / 4, 0.12)
        # melodia a partir de 24 s
        if t0 >= 24:
            for (dt, n, d) in GANCHO[nome]:
                m = melodia(midi(n), d * 0.95)
                sint.add(m, t0 + dt, 0.2)
                envio.add(np.vstack([m, m]), t0 + dt, 0.22)
        if i % 4 == 0:
            bat.add(prato(), t0, 0.35)
    # virada de caixa antes de 32 s
    for k in range(8):
        bat.add(palmas(), 31.5 + k * 0.0625, 0.18 + k * 0.03)

    # 46–50 s: respiro (F → G), piano e pads, sem bateria
    for t0, nome in ((46, 'F'), (48, 'G')):
        notas, fund = ACORDES[nome]
        p = pad(notas, BAR + 0.4, brilho=1800, ataque=0.4, soltura=0.5)
        sint.add(p, t0, 0.5)
        envio.add(p, t0, 0.45)
        sint.add(baixo(midi(fund - 12), BAR), t0, 0.35)
        for k, n in enumerate([notas[0], notas[1], notas[2], notas[3], notas[2], notas[1], notas[2], notas[3]]):
            pp = piano(midi(n + 12), 1.4, 0.6)
            sint.add(pp, t0 + k * BEAT / 2, 0.3, pan=0.2 * (-1) ** k)
            envio.add(np.vstack([pp, pp]), t0 + k * BEAT / 2, 0.3)
    for k in range(16):  # rufar crescente até 50 s
        bat.add(palmas(), 49.0 + k * 0.0625, 0.05 + k * 0.022)

    # 50–56 s: refrão final (C G Am F)
    for t0, nome, dur_ac in ((50, 'C', 2), (52, 'G', 2), (54, 'Am', 1), (55, 'F', 1)):
        notas, fund = ACORDES[nome]
        p = pad(notas, dur_ac + 0.3, brilho=3200, ataque=0.05, soltura=0.3)
        sint.add(p, t0, 0.45)
        envio.add(p, t0, 0.3)
        for b in range(int(dur_ac / BEAT)):
            tb = t0 + b * BEAT
            kick(tb)
            if b % 2 == 1:
                bat.add(palmas(), tb, 0.5)
            bat.add(chimbal(), tb + BEAT / 2, 0.3)
            bat.add(chimbal(), tb + BEAT / 4, 0.12)
            sint.add(baixo(midi(fund), 0.23), tb, 0.55)
            sint.add(baixo(midi(fund + 12), 0.23), tb + BEAT / 2, 0.42)
        tons = [n + 12 for n in notas]
        for s in range(int(dur_ac / (BEAT / 4))):
            pl = pluck(midi(tons[[0, 1, 2, 3, 2, 1, 2, 3][s % 8] % len(tons)]), 0.35)
            sint.add(pl, t0 + s * BEAT / 4, 0.17, pan=-0.45 if s % 2 else 0.45)
        base = 'C' if nome == 'C' else nome
        for (dt, n, d) in GANCHO[base]:
            if dt < dur_ac:
                m = melodia(midi(n), min(d, dur_ac - dt) * 0.95)
                sint.add(m, t0 + dt, 0.22)
                envio.add(np.vstack([m, m]), t0 + dt, 0.22)
    bat.add(prato(), 50.0, 0.4)

    # 56 s: acorde final de Dó, com sinos e cauda
    final = [48, 55, 60, 64, 67, 72, 76]
    p = pad(final, 4.0, brilho=3000, ataque=0.02, soltura=2.5)
    sint.add(p, 56.0, 0.6)
    envio.add(p, 56.0, 0.6)
    sint.add(baixo(midi(36), 3.5), 56.0, 0.5)
    kick(56.0)
    bat.add(prato(), 56.0, 0.45)
    for k, n in enumerate((72, 76, 79, 84)):
        s = sino(midi(n), 3.0) * 0.4
        sint.add(s, 56.0 + k * 0.06, 0.5, pan=(k - 1.5) * 0.3)
        envio.add(np.vstack([s, s]), 56.0 + k * 0.06, 0.5)

    # "sidechain": os sintetizadores respiram a cada bumbo (efeito de pulso)
    lado = np.ones(sint.n)
    for tk in bumbos:
        i = int(tk * SR)
        n = min(int(0.4 * SR), sint.n - i)
        if n > 0:
            lado[i:i + n] = np.minimum(lado[i:i + n], 1 - 0.5 * np.exp(-np.arange(n) / SR / 0.12))
    sint.b *= lado

    return bat, sint, envio


def efeitos(dur, eventos):
    fx, envio = Mix(dur), Mix(dur)
    for e in eventos:
        nome = e['som']
        if nome not in EFEITOS:
            print('  (efeito desconhecido ignorado: %s)' % nome)
            continue
        fn, ganho, rev = EFEITOS[nome]
        x = fn(e)
        pan = float(e.get('pan', 0.0))
        fx.add(x, e['t'], ganho, pan)
        if rev > 0:
            envio.add(x, e['t'], ganho * rev, pan)
    return fx, envio


def main():
    ev_path, saida = sys.argv[1], sys.argv[2]
    dados = json.load(open(ev_path, encoding='utf-8'))
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else float(dados.get('duracao', 60))
    eventos = dados['eventos']

    print('  compondo a música…')
    bat, sint, envio_m = compor(dur)
    print('  sintetizando %d efeitos sonoros…' % len(eventos))
    fx, envio_fx = efeitos(dur, eventos)

    print('  mixando (reverb, compressão, volume)…')
    ir = resposta_reverb(2.6, 0.6)
    musica = bat.b * 0.9 + sint.b * 1.0 + reverb(envio_m.b, ir) * 0.28
    sfx = fx.b + reverb(envio_fx.b, ir) * 0.25
    musica = norm(musica, 0.6)
    sfx = norm(sfx, 0.75)
    # a música abaixa um pouco quando entra efeito forte
    env = np.abs(sfx).max(axis=0)
    env = filtro(env, 'lp', 8)
    abaixa = 1 - 0.35 * np.clip(env / 0.5, 0, 1)
    mix = musica * abaixa + sfx
    # silêncio dramático antes do impacto: 15,70–15,99 s (a imagem fica preta)
    a, b = int(15.62 * SR), int(15.70 * SR)
    mix[:, a:b] *= np.linspace(1, 0, b - a) ** 2
    mix[:, b:int(15.995 * SR)] = 0.0
    # compressão suave + limitador
    mix = norm(mix, 1.0)
    mix = np.tanh(mix * 1.6) / np.tanh(1.6)
    n = mix.shape[1]
    ini = int(0.01 * SR)
    mix[:, :ini] *= np.linspace(0, 1, ini)
    fim = int(1.2 * SR)
    mix[:, n - fim:] *= np.linspace(1, 0, fim) ** 1.5
    mix = norm(mix, 0.93)

    pcm = (mix.T * 32767).astype('<i2')
    with wave.open(saida, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('  trilha salva: %s (%.1f s, %d Hz, estéreo)' % (saida, n / SR, SR))


if __name__ == '__main__':
    main()

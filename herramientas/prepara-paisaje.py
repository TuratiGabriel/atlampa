"""Paisajismo y columnas de planta baja → atlampa-paisaje.js

    python herramientas/prepara-paisaje.py      (desde diagrama/)

Fuentes (no se tocan):
  ../Paisaje planta.html               planta de paisajismo (SVG 1570 × 2330 + un script
                                       que reparte la vegetación con semilla 1191)
  ../Rhino/PB siluetas y estructura.pdf  planta baja con las columnas que bajan al piso
                                       (imagen: los cuadritos son las columnas; ya leídas
                                       en herramientas/columnas-pb.json)

Las dos plantas comparten el marco (el rectángulo punteado = las guarniciones
del predio). El marco se sacó calzando las 212 columnas del PDF contra las
esquinas de los módulos (mediana 6 cm): u 447.51–558.58, v 321.81–488.12; el
2026-10-09 se corrió con los módulos (+0.4056, +0.3694: van donde están en
Rhino/Contexto.3dm), y así el marco cae en el predio de Rhino (±0.2 m).

Salida: window.ATLAMPA_PAISAJE = {
  tezontle   [[u, v, …]]  manchas de cubresuelos (polígonos)
  plantas    [[u0, v0, u1, v1, ancho, alta]]  franjas de plantas (alta = > 1.1 m)
  senderos   [[u0, v0, u1, v1]]
  estanques  [[u, v, …]]  estanques con fuente
  filtros    [[u, v, …]]  filtros vegetados (humedales)
  jardines   [u0, v0, u1, v1]  jardines inundables (sobre la nave norte)
  rio        [[u, v, …]]  la guía de agua, como cinta
  estanqueNave [u, v, r]
  laguna     {c, r, borde}  centro y radio de la planta; la forma la hace el visor
  rayos      [[ang, r1, r2]]  pavimento radial del hito, alrededor de la laguna
  columnas   [[u, v, z]]  columnas que llegan al piso, hasta el fondo del módulo de arriba
}
"""
import json
import math
import os
import re

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
ATLAMPA = os.path.dirname(RAIZ)
HTML = os.path.join(ATLAMPA, 'Paisaje planta.html')
# sin la carpeta del proyecto (colaboradores): la copia que va en el repo, diagrama/modelo/
if not os.path.exists(HTML):
    HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelo', 'Paisaje planta.html')
PDF = os.path.join(ATLAMPA, 'Rhino', 'PB siluetas y estructura.pdf')

# marco de la planta (SVG) y del predio (diagrama)
SX0, SY0, SW, SH = 18, 18, 1532, 2290
U0, U1, V0, V1 = 447.9156, 558.9856, 322.1794, 488.4894
KU, KV = (U1 - U0) / SW, (V1 - V0) / SH   # m por unidad del SVG


def uv(x, y):
    return (U0 + (x - SX0) * KU, V1 - (y - SY0) * KV)


def r1(n):
    return round(n, 1)


def plano(pts):
    return [r1(c) for q in pts for c in q]


def rect_redondo(x, y, w, h, rx, n=3):
    """Rectángulo de esquinas redondeadas (SVG) → polígono en metros."""
    rx = min(rx, w / 2, h / 2)
    pts = []
    for cx, cy, a0 in ((x + w - rx, y + rx, -90), (x + w - rx, y + h - rx, 0), (x + rx, y + h - rx, 90), (x + rx, y + rx, 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append(uv(cx + math.cos(a) * rx, cy + math.sin(a) * rx))
    return pts


class Azar:
    """El generador de la planta: s = s·16807 mod (2³¹ − 1), semilla 1191."""
    def __init__(self, s):
        self.s = s

    def __call__(self):
        self.s = (self.s * 16807) % 2147483647
        return self.s / 2147483647


def arreglo(src, firma):
    i = src.index(firma)
    j = src.rindex('[[', 0, i)
    return json.loads(src[j:i])


def paisaje():
    src = open(HTML, encoding='utf-8').read()
    r = Azar(1191)
    tez, plantas, senderos = [], [], []

    def linea(x1, y1, x2, y2, w, color):
        a, b = uv(x1, y1), uv(x2, y2)
        if color == 'path':
            senderos.append([r1(a[0]), r1(a[1]), r1(b[0]), r1(b[1])])
        else:
            plantas.append([r1(a[0]), r1(a[1]), r1(b[0]), r1(b[1]), r1(w * KU), 1 if color == 'alta' else 0])

    def col():
        return 'alta' if r() < .45 else 'baja'

    # masas verticales: tezontle de fondo y franjas de plantas
    for a, b, t, d in arreglo(src, '.forEach(([a,b,t,d])'):
        tez.append(rect_redondo(a - 6, t + (d - t) * .15, b - a + 12, (d - t) * .75, 14))
        x = a
        while x <= b:
            y1 = t + r() * (d - t) * .4
            y2 = d - r() * (d - t) * .3
            w = 22 + r() * 14
            linea(x, y1, x, y2, w, col())
            x += 14 + r() * 10
    # bandas horizontales (con senderos cada cuarta línea)
    for a, b, t, d, camino in arreglo(src, '.forEach(([a,b,t,d,path])'):
        tez.append(rect_redondo(a, t, b - a, d - t, 14))
        y, i = t, 0
        while y <= d:
            if camino and i % 4 == 3:
                linea(a, y, b, y, 12, 'path')
            else:
                x1 = a + r() * (b - a) * .35
                x2 = b - r() * (b - a) * .35
                linea(x1, y, x2, y, 20, col())
            y += 22 + r() * 10
            i += 1
    linea(725, 1555, 725, 2110, 14, 'path')
    linea(155, 2130, 240, 2190, 22, 'baja')
    # hito radial: 80 rayos alrededor del estanque principal
    rayos = []
    for i in range(80):
        a = i / 80 * 2 * math.pi + r() * .05
        R2 = 230 + r() * 170
        r()   # el grueso del trazo
        rayos.append([round(-a, 3), r1(170 * KU), r1(R2 * KU)])   # y del SVG hacia abajo: el ángulo cambia de signo

    def rects(bloque):
        return [tuple(float(v) for v in m) for m in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"', bloque)]

    ponds = src[src.index('<g id="ponds"'):]
    ponds = ponds[:ponds.index('</g>')]
    filtros = src[src.index('<g fill="var(--filter)">'):]
    filtros = filtros[:filtros.index('</g>')]
    m = re.search(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#dfe8f5"', src)
    jx, jy, jw, jh = (float(v) for v in m.groups())
    a, b = uv(jx, jy + jh), uv(jx + jw, jy)
    # la guía: polilínea de la curva del SVG
    d = re.search(r'<path id="river" d="([^"]+)"', src).group(1)
    rio = cinta(curva(d), 14 * KU)
    c = re.search(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="80"', src)
    en = uv(float(c.group(1)), float(c.group(2)))
    lc = uv(611, 1168)
    return {
        'tezontle': [plano(p) for p in tez],
        'plantas': plantas,
        'senderos': senderos,
        'estanques': [plano(rect_redondo(*q)) for q in rects(ponds)],
        'filtros': [plano(rect_redondo(*q)) for q in rects(filtros)],
        'jardines': [r1(a[0]), r1(a[1]), r1(b[0]), r1(b[1])],
        'rio': plano(rio),
        'estanqueNave': [r1(en[0]), r1(en[1]), r1(80 * KU)],
        'laguna': {'c': [r1(lc[0]), r1(lc[1])], 'r': r1(145 * KU), 'borde': r1(180 * KU)},
        'rayos': rayos,
    }


def curva(d):
    """Camino SVG con M, L y C → puntos (cada curva en 16 tramos)."""
    tok = re.findall(r'[MLC]|-?[\d.]+', d)
    pts, i, cmd = [], 0, None
    while i < len(tok):
        if tok[i] in 'MLC':
            cmd = tok[i]
            i += 1
            continue
        if cmd in 'ML':
            pts.append((float(tok[i]), float(tok[i + 1])))
            i += 2
        else:
            p0 = pts[-1]
            p1, p2, p3 = [(float(tok[i + k]), float(tok[i + k + 1])) for k in (0, 2, 4)]
            for k in range(1, 17):
                t = k / 16
                pts.append(tuple((1 - t) ** 3 * p0[j] + 3 * (1 - t) ** 2 * t * p1[j] + 3 * (1 - t) * t * t * p2[j] + t ** 3 * p3[j] for j in range(2)))
            i += 6
    return [uv(*p) for p in pts]


def cinta(pts, ancho):
    """Polilínea → polígono de una cinta de ese ancho (m)."""
    P = np.array(pts)
    izq, der = [], []
    for k in range(len(P)):
        a, b = P[max(0, k - 1)], P[min(len(P) - 1, k + 1)]
        t = (b - a) / (np.linalg.norm(b - a) or 1)
        n = np.array([-t[1], t[0]]) * ancho / 2
        izq.append(P[k] + n)
        der.append(P[k] - n)
    return [tuple(q) for q in izq + der[::-1]]


def columnas():
    """Las columnas de planta baja, cada una hasta el fondo del módulo más bajo
    que se apoya en ella. Se sacaron el 2026-10-07 de los cuadritos del PDF
    (en esquinas de módulo); el PDF cambió después (hoy trae 68 cuadritos que no
    caen en esquinas de módulo: pendiente con Gabriel), así que se leen de
    columnas-pb.json (marco de entonces) y se pasan a la esquina del mismo
    módulo en su posición de Rhino/Contexto.3dm (atlampa-modulos.js)."""
    viejas = json.load(open(os.path.join(AQUI, 'columnas-pb.json'), encoding='utf-8'))['columnas']
    s = open(os.path.join(RAIZ, 'atlampa-modulos.js'), encoding='utf-8').read()
    i = s.index('ATLAMPA_MODULOS = ') + len('ATLAMPA_MODULOS = ')
    M = json.loads(s[i:s.rindex('}') + 1])
    g = math.radians(M['giro'])
    A, B = M['a'] / 2, M['b'] / 2
    esq = []
    for c in M['cajas']:
        for x, y in ((-A, -B), (A, -B), (A, B), (-A, B)):
            esq.append((c[0] + math.cos(g) * x - math.sin(g) * y, c[1] + math.sin(g) * x + math.cos(g) * y, c[2]))
    E = np.array(esq)
    out, lejos = [], 0
    for u, v, z in viejas:
        u, v = u + 0.4056, v + 0.3694          # el corrimiento de los módulos (prepara-modulos.py)
        d = np.hypot(E[:, 0] - u, E[:, 1] - v)
        j = int(np.argmin(d))
        if d[j] > 1.2:                         # (1.2: los 33 de B1 que en Contexto están 1 m más allá)
            lejos += 1
            continue
        cerca = d < max(0.8, d[j] + 0.05)
        j = int(np.argmin(np.where(cerca, E[:, 2], 99)))   # hasta el fondo del módulo más bajo (como se sacaron del PDF)
        out.append([r1(E[j, 0]), r1(E[j, 1]), round(M['z0'] + E[j, 2] * M['alto'], 2)])
    unicas = {}
    for c in out:
        unicas.setdefault((c[0], c[1]), c)
    print('columnas', len(viejas), '· en esquina de módulo', len(out), '· sin módulo', lejos, '· únicas', len(unicas))
    return sorted(unicas.values())


def main():
    datos = paisaje()
    datos['columnas'] = columnas()
    L = sum(math.hypot(p[2] - p[0], p[3] - p[1]) for p in datos['plantas'])
    print('franjas', len(datos['plantas']), 'largo total %.0f m' % L, '· tezontle', len(datos['tezontle']),
          '· senderos', len(datos['senderos']), '· estanques', len(datos['estanques']), '· filtros', len(datos['filtros']))
    cab = ('/* Paisajismo y columnas de planta baja. Generado por herramientas/prepara-paisaje.py: no editar a mano.\n'
           '   Fuentes: Paisaje planta.html (planta de paisajismo) y Rhino/PB siluetas y estructura.pdf (columnas).\n'
           '   Metros en el marco del diagrama; el visor reparte las plantas sobre cada franja. */\n')
    ruta = os.path.join(RAIZ, 'atlampa-paisaje.js')
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(cab + 'window.ATLAMPA_PAISAJE = ' + json.dumps(datos, separators=(',', ':')) + ';\n')
    print('escrito', ruta, os.path.getsize(ruta), 'bytes')


if __name__ == '__main__':
    main()

"""La vivienda del Modo historia (etapa 2) → atlampa-historia-vivienda.js.

    python herramientas/prepara-vivienda-historia.py      (desde la raíz del repo; con numpy y shapely)

El proceso de diseño de la vivienda (Diego, 2026-11-27), en cuatro slides: 1) dos volumetrías orgánicas que se doblan
y se moldean según el sol; 2) el recorrido del sol del 21 de diciembre y, sobre la superficie, un diagrama cuadriculado
de horas de sol; 3) la volumetría se llena de módulos (con los pisos extra, que no estaban en ella) y se quitan los
que no convenían; 4) queda el edificio del Revit y se arman las ventanas, los pasillos y los núcleos.

Fuentes (en el repo):
- modelo/vivienda-organica.json: las dos SubD de Diego (dac1.3dm, capa subd) como mallas, ya en coordenadas del visor.
- modelo/vivienda-modulos-dac.json: los módulos de dac.3dm, antes de quitar (923, sin entrepisos).
- atlampa-modulos.js (los módulos del edificio final, sólo los que dan al exterior) y atlampa-revit.js / .bin.

Qué sale:
- torres: la malla de cada volumetría (cm, relativa a su origen) y su cuadrícula: cada cara cae en un cuadro según
  hacia dónde mira (arriba/abajo: a × b; costados: a × z; cabeceras: b × z, en el marco de la torre: a a lo largo,
  b a lo ancho), y cada cuadro trae, por cada muestra del día (cada 20 min), qué tanto le da el sol (0-9, con la sombra
  de las dos torres). El visor colorea cada cuadro con las horas acumuladas.
- modulos: los que quedan (los del edificio final más los de los pisos extra, niveles 8 a 10, sacados de las losas del
  Revit) y los que se quitan: los de dac.3dm que no están en el final, llevados a la retícula de su barra (en dac.3dm
  algunas barras están corridas 1 m). Los que caerían dentro del edificio (rodeados por los seis lados) no se ponen.
- losas: por nivel, la losa del Revit partida en lo que queda bajo y sobre los módulos (losa) y lo demás (pasillo).
- nucleos: las cajas en planta de los seis núcleos (los muros del nivel 0 que bajan a la planta baja).
"""
import json
import math
import os

import numpy as np
from shapely.geometry import MultiPolygon, Polygon, box
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SALIDA = os.path.join(RAIZ, 'atlampa-historia-vivienda.js')


def lee_js(rel, var):
    t = open(os.path.join(RAIZ, rel), encoding='utf-8').read()
    i = t.index('{', t.index(var))
    return json.loads(t[i:t.rindex('}') + 1])


ORG = json.load(open(os.path.join(RAIZ, 'modelo', 'vivienda-organica.json'), encoding='utf-8'))
DAC = json.load(open(os.path.join(RAIZ, 'modelo', 'vivienda-modulos-dac.json'), encoding='utf-8'))['modulos']
MOD = lee_js('atlampa-modulos.js', 'ATLAMPA_MODULOS')
REV = lee_js('atlampa-revit.js', 'ATLAMPA_REVIT')
BIN = open(os.path.join(RAIZ, 'atlampa-revit.bin'), 'rb').read()
O_REV = REV['origen']


def tris_revit(cat, nivel):
    g = next((g for g in REV['grupos'] if g['programa'] == 'vivienda' and g['categoria'] == cat and g['nivel'] == nivel), None)
    if not g:
        return np.zeros((0, 3, 3))
    a = np.frombuffer(BIN, dtype='<f4', count=g['floats'], offset=g['offset']).astype(float).reshape(-1, 3, 3)
    return a + np.array(O_REV)


# ---------- el sol del 21 de diciembre (como G.solEn de atlampa-geo.js) ----------
LAT, LON, HUSO, RAD = 19.4582, -99.1589, -6, math.pi / 180
DIA = 355   # 21 de diciembre (año no bisiesto, como G.diaDelAno)


def sol_en(dia, hora):
    g = 2 * math.pi / 365 * (dia - 1 + (hora - 12) / 24)
    ec = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    de = 0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g)
    solar = hora * 60 + ec + 4 * LON - 60 * HUSO
    H, fi = (solar / 4 - 180) * RAD, LAT * RAD
    cz = math.sin(fi) * math.sin(de) + math.cos(fi) * math.cos(de) * math.cos(H)
    alt = math.asin(max(-1, min(1, cz)))
    az = math.atan2(math.sin(H), math.cos(H) * math.sin(fi) - math.tan(de) * math.cos(fi)) / RAD + 180
    return alt / RAD, (az + 360) % 360


GIRO = 9.96 * RAD   # G.GIRO: del norte geográfico a los ejes del visor


def dir_sol(alt, az):   # (u, v, z) hacia el sol
    c = math.cos(alt * RAD)
    E, N = c * math.sin(az * RAD), c * math.cos(az * RAD)
    cg, sg = math.cos(GIRO), math.sin(GIRO)
    return np.array([E * cg - N * sg, E * sg + N * cg, math.sin(alt * RAD)])


h_sale = next(h / 60 for h in range(5 * 60, 12 * 60) if sol_en(DIA, h / 60)[0] > 0.5)
h_pone = next(h / 60 for h in range(20 * 60, 12 * 60, -1) if sol_en(DIA, h / 60)[0] > 0.5)
DT = 1 / 3   # cada 20 minutos
S = int(math.ceil((h_pone - h_sale) / DT))
DT = (h_pone - h_sale) / S
MUESTRAS = [h_sale + (i + 0.5) * DT for i in range(S)]
SOLES = [dir_sol(*sol_en(DIA, h)) for h in MUESTRAS]

# ---------- las volumetrías ----------
ZB, SA, SB, SZ = 10.84, 2.2, 2.2, 1.65   # la cuadrícula: el z arranca en el primer nivel de los módulos
torres = []
for t in ORG['torres']:
    V = np.array(t['v'], float)
    F = np.array(t['f'], int)
    torres.append({'V': V, 'F': F})
TODAS = np.concatenate([T['V'][T['F']] for T in torres])   # (n, 3, 3) para las sombras


PX = 0.25   # el mapa de sombras: metros por pixel
_b = np.array([(i / 7, j / 7) for i in range(8) for j in range(8 - i)])   # puntos de cada cara (baricéntricas)
PUNTOS = TODAS[:, 0][:, None] + _b[:, 0][None, :, None] * (TODAS[:, 1] - TODAS[:, 0])[:, None] + _b[:, 1][None, :, None] * (TODAS[:, 2] - TODAS[:, 0])[:, None]
PUNTOS = PUNTOS.reshape(-1, 3)


def mapa_sombra(d):
    """La profundidad hacia el sol de lo más cercano a él, por pixel, en el plano perpendicular a d."""
    e1 = np.cross(d, [0, 0, 1.0]); e1 /= np.linalg.norm(e1)
    e2 = np.cross(d, e1)
    x, y, z = PUNTOS @ e1, PUNTOS @ e2, PUNTOS @ d
    x0, y0 = x.min() - 1, y.min() - 1
    W_, H_ = int((x.max() - x0) / PX) + 2, int((y.max() - y0) / PX) + 2
    prof = np.full(W_ * H_, -1e9)
    np.maximum.at(prof, ((y - y0) / PX).astype(int) * W_ + ((x - x0) / PX).astype(int), z)
    return e1, e2, x0, y0, W_, H_, prof


def sombra(orig, nrm, d, M):
    """¿Algo de las torres le tapa el sol a cada punto orig (con su normal nrm)?"""
    e1, e2, x0, y0, W_, H_, prof = M
    x, y, z = orig @ e1, orig @ e2, orig @ d
    i, j = ((x - x0) / PX).astype(int), ((y - y0) / PX).astype(int)
    cos = np.clip(nrm @ d, 0.05, 1)
    tol = 0.3 + np.minimum(1.4, 0.35 * np.sqrt(1 - cos ** 2) / cos)   # más holgura en lo que el sol pega de lado
    out = np.zeros(len(orig), bool)
    for di in (-1, 0, 1):   # (el vecino más alto alrededor: que no se cuele luz entre pixeles)
        for dj in (-1, 0, 1):
            ii, jj = np.clip(i + di, 0, W_ - 1), np.clip(j + dj, 0, H_ - 1)
            out |= prof[jj * W_ + ii] > z + tol
    return out


MAPAS = [mapa_sombra(d) for d in SOLES]
salida_torres = []
for T in torres:
    V, F = T['V'], T['F']
    # el marco de la torre: a, a lo largo (componente principal en planta, hacia el norte); b, a lo ancho
    c = V[:, :2].mean(0)
    w, vec = np.linalg.eigh(np.cov((V[:, :2] - c).T))
    ax = vec[:, np.argmax(w)]
    if ax[1] < 0:
        ax = -ax
    ang = math.atan2(ax[1], ax[0])
    A = np.array([math.cos(ang), math.sin(ang)])
    B = np.array([-math.sin(ang), math.cos(ang)])
    la, lb = (V[:, :2] - c) @ A, (V[:, :2] - c) @ B
    amin, bmin = la.min() - 0.01, lb.min() - 0.01
    zmin = ZB + math.floor((V[:, 2].min() - ZB) / SZ) * SZ
    nA, nB = int(math.ceil((la.max() - amin) / SA)), int(math.ceil((lb.max() - bmin) / SB))
    nZ = int(math.ceil((V[:, 2].max() - zmin) / SZ))
    base = [0, nA * nB, 2 * nA * nB, 2 * nA * nB + nA * nZ, 2 * nA * nB + 2 * nA * nZ, 2 * nA * nB + 2 * nA * nZ + nB * nZ]
    total = base[5] + nB * nZ
    # cada cara: su centro, su normal, su área y su cuadro
    P = V[F]
    cen = P.mean(1)
    nn = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
    area = np.linalg.norm(nn, axis=1) / 2
    nn = nn / np.maximum(1e-12, np.linalg.norm(nn, axis=1))[:, None]
    # la malla viene cerrada: que las normales miren hacia afuera (el volumen con signo, positivo)
    if (np.cross(P[:, 1], P[:, 2]) * P[:, 0]).sum() < 0:
        F = F[:, [0, 2, 1]]
        nn = -nn
    na, nb, nz = nn[:, :2] @ A, nn[:, :2] @ B, nn[:, 2]
    ca, cb = (cen[:, :2] - c) @ A, (cen[:, :2] - c) @ B
    ia = np.clip(((ca - amin) / SA).astype(int), 0, nA - 1)
    ib = np.clip(((cb - bmin) / SB).astype(int), 0, nB - 1)
    iz = np.clip(((cen[:, 2] - zmin) / SZ).astype(int), 0, nZ - 1)
    arriba = np.abs(nz) >= np.maximum(np.abs(na), np.abs(nb))
    costado = ~arriba & (np.abs(nb) >= np.abs(na))
    idx = np.where(arriba, np.where(nz > 0, base[0], base[1]) + ia + ib * nA,
                   np.where(costado, np.where(nb > 0, base[2], base[3]) + ia + iz * nA,
                            np.where(na > 0, base[4], base[5]) + ib + iz * nB))
    # el sol en cada cara (con la sombra de las dos torres) y, en cada cuadro, la parte iluminada (por área)
    luz = np.zeros((S, total))
    peso = np.bincount(idx, weights=area, minlength=total)
    for s, d in enumerate(SOLES):
        lit = (nn @ d) > 0.02
        cand = np.nonzero(lit)[0]
        if len(cand):
            somb = sombra(cen[cand], nn[cand], d, MAPAS[s])
            lit[cand[somb]] = False
        luz[s] = np.bincount(idx, weights=area * lit, minlength=total)
    con = peso > 1e-6
    frac = np.where(con[None], luz / np.where(con, peso, 1)[None], 0)
    q = np.rint(frac * 9).astype(int)
    # los cuadros vacíos junto a uno con caras toman el promedio de sus vecinos (el visor elige el cuadro por fragmento)
    dims = [(nA, nB), (nA, nB), (nA, nZ), (nA, nZ), (nB, nZ), (nB, nZ)]
    lleno = con.copy()
    for _ in range(2):
        nuevo_q, nuevo = q.copy(), lleno.copy()
        for k, (n0, n1) in enumerate(dims):
            for j in range(n1):
                for i in range(n0):
                    x = base[k] + i + j * n0
                    if lleno[x]:
                        continue
                    vec_ = [base[k] + ii + jj * n0 for ii, jj in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)) if 0 <= ii < n0 and 0 <= jj < n1]
                    vec_ = [y for y in vec_ if lleno[y]]
                    if vec_:
                        nuevo_q[:, x] = np.rint(q[:, vec_].mean(1)).astype(int)
                        nuevo[x] = True
        q, lleno = nuevo_q, nuevo
    celdas = [''.join(str(int(x)) for x in q[:, i]) if lleno[i] else '' for i in range(total)]
    o = [round(float(c[0]), 2), round(float(c[1]), 2), ZB]
    vs = np.rint((V - np.array(o)) * 100).astype(int)
    horas = (q.sum(0) / 9 * DT)
    print('torre: %d vértices, %d caras, %d × %d × %d cuadros (%d con caras), horas máx %.1f' % (len(V), len(F), nA, nB, nZ, int(con.sum()), horas.max()))
    salida_torres.append({'o': o, 'v': vs.ravel().tolist(), 'f': F.ravel().tolist(),
                          'marco': {'ang': round(ang, 6), 'amin': round(float(amin), 3), 'bmin': round(float(bmin), 3), 'zmin': round(zmin, 3),
                                    'SA': SA, 'SB': SB, 'SZ': SZ, 'nA': nA, 'nB': nB, 'nZ': nZ, 'base': base, 'total': total},
                          'celdas': celdas})

# ---------- los módulos ----------
G_M = MOD['giro'] * RAD
CG, SG = math.cos(G_M), math.sin(G_M)
MA, MB, Z0, PASO, ALTO = MOD['a'], MOD['b'], MOD['z0'], MOD['paso'], MOD['alto']
loc = lambda du, dv: (du * CG + dv * SG, -du * SG + dv * CG)
glob = lambda x, y: (x * CG - y * SG, x * SG + y * CG)
clave = lambda u, v, n: (round(u * 2), round(v * 2), n)   # medio metro


def huella(u, v, m=0.0):
    pts = [glob(x, y) for x, y in ((-MA / 2 + m, -MB / 2 + m), (MA / 2 - m, -MB / 2 + m), (MA / 2 - m, MB / 2 - m), (-MA / 2 + m, MB / 2 - m))]
    return Polygon([(u + x, v + y) for x, y in pts])


finales = [(k[0], k[1], k[2]) for k in MOD['cajas'] if MOD['tipos'][k[3]] != 'comercio']
hay = {clave(*f) for f in finales}
# los pisos extra (niveles 8 a 10): sobre la retícula de las columnas del edificio, donde la losa de arriba (L + 1) del
# Revit cubre el módulo y hay módulo abajo (la vivienda se escalona: lo de arriba sale de lo de abajo)
columnas = {}
for u, v, n in finales:
    columnas.setdefault((round(u * 2), round(v * 2)), (u, v))
losa_rev = {}
for L in range(0, 12):
    T3 = tris_revit('floors', L)
    pols = [Polygon(t[:, :2]) for t in T3]
    pols = [p for p in pols if p.is_valid and p.area > 1e-4]
    if pols:
        losa_rev[L] = (unary_union([p.buffer(0.02) for p in pols]).buffer(-0.02), float(T3[:, :, 2].min()), float(T3[:, :, 2].max()))
extra = []
for L in (8, 9, 10):
    if L + 1 not in losa_rev:
        continue
    techo = losa_rev[L + 1][0]
    for (ku, kv), (u, v) in columnas.items():
        if clave(u, v, L - 1) not in hay:
            continue
        h = huella(u, v, 0.3)
        if techo.intersection(h).area >= 0.85 * h.area:
            extra.append((u, v, L))
            hay.add(clave(u, v, L))
print('pisos extra: %s' % {L: sum(1 for e in extra if e[2] == L) for L in (8, 9, 10)})
quedan = finales + extra
# los que se quitan: los de dac.3dm, en la retícula de su barra (la del módulo final más cercano de su torre)
por_torre = {0: [f for f in quedan if f[1] < 410], 1: [f for f in quedan if f[1] >= 410]}
quitan, vistos = [], set()
for u, v, n, capa in DAC:
    fs = por_torre[0 if v < 410 else 1]
    mismo = [f for f in fs if f[2] == n] or fs
    f = min(mismo, key=lambda f: (f[0] - u) ** 2 + (f[1] - v) ** 2)
    x, y = loc(u - f[0], v - f[1])
    gx, gy = glob(round(x / MA) * MA, round(y / MB) * MB)
    su, sv = f[0] + gx, f[1] + gy
    k = clave(su, sv, n)
    if k in hay or k in vistos:
        continue
    # rodeado por los seis lados: quedaría dentro del edificio (es uno de los módulos interiores, que no vienen)
    vec_ = [(su + a_, sv + b_, n) for a_, b_ in (glob(MA, 0), glob(-MA, 0), glob(0, MB), glob(0, -MB))] + [(su, sv, n - 1), (su, sv, n + 1)]
    if all(clave(*w) in hay for w in vec_):
        continue
    vistos.add(k)
    quitan.append((su, sv, n))
print('módulos: quedan %d (%d de los pisos extra), se quitan %d' % (len(quedan), len(extra), len(quitan)))

# ---------- las losas: la del Revit, en lo que va con los módulos y los pasillos ----------
def poligonos(g):   # los polígonos de cualquier geometría (las colecciones traen también líneas y puntos)
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [p for x in getattr(g, 'geoms', []) for p in poligonos(x)]


def sin_hoyos_chicos(g, a_max=70):
    return unary_union([Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area >= a_max]) for p in poligonos(g)])


def anillos(g):
    r = []
    for p in poligonos(g):
        if p.is_empty or p.area < 1.5:
            continue
        p = p.simplify(0.03)
        r.append([[round(x, 2) for xy in p.exterior.coords[:-1] for x in xy]] + [[round(x, 2) for xy in h.coords[:-1] for x in xy] for h in p.interiors])
    return r


por_nivel = {}
for u, v, n in quedan:
    por_nivel.setdefault(n, []).append(huella(u, v, -0.03))
losas = []
for L, (F_L, zb, zt) in sorted(losa_rev.items()):
    mods = unary_union(por_nivel.get(L, []) + por_nivel.get(L - 1, []))
    mods = sin_hoyos_chicos(mods.buffer(0.08).buffer(-0.08))
    pas = F_L.difference(mods).buffer(-0.12).buffer(0.12)
    pas = unary_union([p for p in poligonos(pas) if p.area >= 3])
    los = F_L.difference(pas)
    losas.append({'n': L, 'z': [round(zb, 3), round(zt, 3)], 'losa': anillos(los), 'pasillo': anillos(pas)})
    print('losa %2d: %6.0f m², pasillo %5.0f m²' % (L, los.area, pas.area))

# ---------- los núcleos: los muros del nivel 0 que bajan a la planta baja ----------
W0 = tris_revit('walls', 0)
bajos = W0[W0[:, :, 2].min(1) < 8].reshape(-1, 3)
grupos = []
for p in bajos:
    g = next((g for g in grupos if abs(g[0] - p[0]) < 6 and abs(g[1] - p[1]) < 6), None)
    if g is None:
        grupos.append([p[0], p[1], p[0], p[1], p[0], p[1]])
        continue
    g[2], g[3], g[4], g[5] = min(g[2], p[0]), min(g[3], p[1]), max(g[4], p[0]), max(g[5], p[1])
    g[0], g[1] = (g[2] + g[4]) / 2, (g[3] + g[5]) / 2
nucleos = [[round(g[2], 2), round(g[3], 2), round(g[4], 2), round(g[5], 2)] for g in grupos]
print('núcleos: %d' % len(nucleos))

r2 = lambda t: [round(t[0], 2), round(t[1], 2), t[2]]
datos = {
    'nota': 'Generado por herramientas/prepara-vivienda-historia.py: no editar a mano.',
    'sol': {'dia': DIA, 'h0': round(h_sale, 4), 'h1': round(h_pone, 4), 'dt': round(DT, 5), 'muestras': S},
    'torres': salida_torres,
    'modulos': {'giro': MOD['giro'], 'a': MA, 'b': MB, 'alto': ALTO, 'paso': PASO, 'z0': Z0,
                'quedan': [r2(f) for f in quedan], 'quitan': [r2(f) for f in quitan]},
    'losas': losas,
    'nucleos': nucleos,
}
with open(SALIDA, 'w', encoding='utf-8') as f:
    f.write('/* Vivienda del Modo historia (etapa 2). Generado por herramientas/prepara-vivienda-historia.py: no editar a mano.\n'
            '   Fuentes: modelo/vivienda-organica.json (las volumetrías orgánicas de Diego, dac1.3dm), modelo/vivienda-modulos-dac.json\n'
            '   (los módulos antes de quitar, dac.3dm), atlampa-modulos.js y el Revit (atlampa-revit.js). */\n')
    f.write('window.ATLAMPA_HISTORIA_VIVIENDA = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('→ %s (%.0f KB)' % (SALIDA, os.path.getsize(SALIDA) / 1024))

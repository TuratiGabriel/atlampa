"""Departamentos de las plantas «Atlampa Vivienda Modular» → departamentos.json

    python herramientas/departamentos.py <plantas.html>      (desde diagrama/)

<plantas.html> es el HTML del artifact de distribución de viviendas
(claude.ai/artifact/P4EQf1AUHAHTvYDWXB7pb1). Cada planta (nivel N04–N11,
volumen norte y sur) dibuja cada departamento como un solo contorno
(uA 44 SOC, uB 44, uC 66, uD 88), las amenidades agrupadas (amf), y los
módulos extra y los de 66 sin agrupar uno por uno (xtr, lft). La
circulación (g.circ) no se toma en cuenta.

Las plantas están en el marco del modelo con la y invertida, corridas: la
traslación de cada planta sale por votación (vértices de los contornos
contra esquinas de los módulos de ese nivel). Cada módulo queda en el
contorno que contiene su centro.

Salida: {"capa|X|Y|nivel": "N04uD3", ...}, con X, Y el centro del módulo en
nuevos bloques.3dm redondeado a 0.1 m y nivel 0 = N04.
"""
import collections
import json
import os
import re
import sys

import rhino3dm
from shapely.geometry import Point, Polygon

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELO = os.path.join(AQUI, '..', '..', 'Rhino', 'nuevos bloques.3dm')
SALIDA = os.path.join(AQUI, 'departamentos.json')
CAPAS = ['modulos44', '44SOC', 'modulos66', 'modulos88', 'modulosamenidades', 'modulosextra']
CLASES = ('uA', 'uB', 'uC', 'uD', 'amf', 'xtr', 'lft')
ALTO = 3.0


def llave(capa, x, y, k):
    return '%s|%.1f|%.1f|%d' % (capa, x, y, k)


def modulos():
    m = rhino3dm.File3dm.Read(MODELO)
    mods = []
    for o in m.Objects:
        capa = m.Layers[o.Attributes.LayerIndex].FullPath.split('::')[-1]
        if capa not in CAPAS:
            continue
        g = o.Geometry
        vs = [(g.Vertices[i].X, g.Vertices[i].Y, g.Vertices[i].Z) for i in range(len(g.Vertices))]
        z0 = min(v[2] for v in vs)
        base = [v[:2] for v in vs if abs(v[2] - z0) < 1e-3]
        mods.append({'capa': capa, 'z0': z0, 'base': base,
                     'c': (sum(b[0] for b in base) / len(base), sum(b[1] for b in base) / len(base))})
    z = min(x['z0'] for x in mods)
    for x in mods:
        x['k'] = round((x['z0'] - z) / ALTO)
    return mods


def main():
    html = open(sys.argv[1], encoding='utf-8').read()
    mods = modulos()
    asigna = {}
    for nn, cuerpo in re.findall(r'<article class="sheet" id="n(\d+)">(.*?)</article>', html, re.S):
        k = int(nn) - 4
        nivel = [x for x in mods if x['k'] == k]
        for lab, s in re.findall(r'<svg class="plan"[^>]*aria-label="([^"]+)"(.*?)</svg>', cuerpo, re.S):
            s = re.sub(r'<g class="circ.*?</g>', '', s, flags=re.S)
            vol = lab.split()[-1][0].upper()
            polis = []
            for cl, d in re.findall(r'<path class="([^"]+)"(?: fill-rule="evenodd")? d="([^"]+)"', s):
                cl = cl.split()[0]
                if cl in CLASES:
                    polis.append((cl, [tuple(map(float, q.split(','))) for q in re.findall(r'[\d.]+,[\d.]+', d)]))
            votos = collections.Counter()
            for _, pts in polis:
                for px, py in pts:
                    for x in nivel:
                        for bx, by in x['base']:
                            votos[(round(bx - px, 1), round(by + py, 1))] += 1
            (tx, ty), _ = votos.most_common(1)[0]
            for n, (cl, pts) in enumerate(polis):
                P = Polygon([(px + tx, ty - py) for px, py in pts]).buffer(0)
                for x in nivel:
                    if P.contains(Point(x['c'])):
                        asigna[llave(x['capa'], x['c'][0], x['c'][1], k)] = '%s%s%s%d' % (vol, nn, cl, n)
    faltan = [x for x in mods if llave(x['capa'], x['c'][0], x['c'][1], x['k']) not in asigna]
    if faltan:
        sys.exit('%d módulos sin departamento' % len(faltan))
    cuenta = collections.Counter(re.sub(r'^\w\d\d(\w+?)\d+$', r'\1', d) for d in set(asigna.values()))
    print(len(asigna), 'módulos;', dict(cuenta))
    with open(SALIDA, 'w', encoding='utf-8') as f:
        json.dump(asigna, f, indent=0, sort_keys=True)


if __name__ == '__main__':
    main()

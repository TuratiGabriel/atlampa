"""Estacionamiento de 'Sotanos y PB para HTML.dwg' → atlampa-estacionamiento.js

    python herramientas/prepara-estacionamiento.py      (desde diagrama/)

El DWG se pasa a DXF con la consola de AutoCAD 2024 (accoreconsole, en una
carpeta temporal; el DWG no se toca) y se lee con ezdxf.

El plano trae dos dibujos lado a lado: «Planta tipo sotanos» (x 0–111) y
«Planta Baja» (el mismo marco corrido 270 m en x). Están en metros, con
Fresno a la izquierda y Eulalia Guzmán arriba, como u y v del diagrama: basta
una traslación. Se calzó la proyección de los edificios de la planta baja
(capa 'proyeccion') contra las esquinas de los módulos de atlampa-modulos.js:
(447.52, 322.60), con el 63 % de los vértices a menos de 10 cm.

Lo que se guarda (planta tipo, en el marco del diagrama):
  bloques   dos estacionamientos independientes (norte y sur): el contorno
            exterior del muro (capa 'Muro') y sus cajones (capa
            'Estacionamiento', rectángulos de 5 × 2.7–2.8 m)
  rampas    helicoidales dobles: centro y radios de los muros (interior,
            entre carriles, exterior); dos carriles concéntricos
  accesos   las curvas y los muros rectos de las rampas en planta baja
  cuartos   cisterna, cuarto de máquinas y biodigestores (polígono y nombre)
Cada estacionamiento: 4 sótanos de 3.5 m (dato de Gabriel, 2026-10-07); las
helicoidales parten de la planta baja.
"""
import json
import math
import os
import subprocess
import sys
import tempfile

import ezdxf
from shapely.geometry import Point, Polygon

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DWG = os.path.join(RAIZ, '..', 'Sotanos y PB para HTML.dwg')
SALIDA = os.path.join(RAIZ, 'atlampa-estacionamiento.js')
ACAD = r'C:\Program Files\Autodesk\AutoCAD 2024\accoreconsole.exe'
TU, TV = 447.52, 322.60          # plano → diagrama
SOTANOS, ENTREPISO = 4, 3.5
X_MAX = 200                      # la planta tipo de sótanos (la planta baja está en x > 270)


def a_dxf():
    tmp = tempfile.mkdtemp(prefix='atlampa-dwg-')
    dwg = os.path.join(tmp, 'plano.dwg')
    dxf = os.path.join(tmp, 'plano.dxf')
    with open(os.path.abspath(DWG), 'rb') as f, open(dwg, 'wb') as g:
        g.write(f.read())
    scr = os.path.join(tmp, 'a-dxf.scr')
    with open(scr, 'w') as f:
        f.write('FILEDIA 0\n_.SAVEAS DXF V 2018 16 "%s"\n' % dxf)
    p = subprocess.Popen([ACAD, '/i', dwg, '/s', scr, '/l', 'en-US'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # la consola se queda esperando al terminar el guion: se cierra en cuanto aparece el DXF
    for _ in range(240):
        try:
            p.wait(timeout=0.5)
            break
        except subprocess.TimeoutExpired:
            if os.path.exists(dxf) and os.path.getsize(dxf) > 0:
                tam = os.path.getsize(dxf)
                try:
                    p.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    if os.path.getsize(dxf) == tam:
                        p.kill()
                        break
    if not os.path.exists(dxf):
        sys.exit('AutoCAD no generó el DXF')
    return dxf


def uv(x, y):
    return [round(x + TU, 2), round(y + TV, 2)]


def lazos(trazos):
    """Une polilíneas abiertas por sus extremos; devuelve los lazos cerrados."""
    trazos = [list(t) for t in trazos]
    cerrados = []
    while trazos:
        a = trazos.pop()
        cambio = True
        while cambio and math.dist(a[0], a[-1]) > 0.05:
            cambio = False
            for i, b in enumerate(trazos):
                for bb in (b, b[::-1]):
                    if math.dist(a[-1], bb[0]) < 0.05:
                        a += bb[1:]
                        trazos.pop(i)
                        cambio = True
                        break
                if cambio:
                    break
        if math.dist(a[0], a[-1]) < 0.05 and len(a) > 3:
            cerrados.append(a[:-1])
    return cerrados


def main():
    dxf = sys.argv[1] if len(sys.argv) > 1 else a_dxf()
    m = ezdxf.readfile(dxf).modelspace()

    def izq(e):
        return e.dxf.layer and all(p[0] < X_MAX for p in e.get_points('xy'))

    # muros: polilíneas de más de dos puntos → contornos de los dos bloques
    largas = [[tuple(p) for p in e.get_points('xy')] for e in m.query('LWPOLYLINE[layer=="Muro"]') if izq(e) and len(e) > 2]
    contornos = sorted((Polygon(l) for l in lazos(largas)), key=lambda p: -p.area)
    bloques = []
    for p in contornos:
        if any(p.within(q.buffer(0.5)) for q in (b['P'] for b in bloques)):
            continue                                  # la cara interior del mismo muro
        bloques.append({'P': p})
    bloques = sorted(bloques[:2], key=lambda b: -b['P'].centroid.y)
    for b, n in zip(bloques, ('norte', 'sur')):
        b['nombre'] = n
        b['cajones'] = []
    # cajones
    for e in m.query('LWPOLYLINE[layer=="Estacionamiento"]'):
        if not izq(e):
            continue
        pts = list(e.get_points('xy'))
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        c = Point((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
        for b in bloques:
            if b['P'].buffer(0.3).contains(c):
                b['cajones'].append(uv(min(xs), min(ys)) + uv(max(xs), max(ys)))
                break
        else:
            print('cajón fuera de los bloques', c)
    # rampas: los arcos se agrupan por centro; los centros con muro interior (r < 6) son las helicoidales
    arcos = {}
    for e in m.query('ARC CIRCLE[layer=="Muro"]'):
        c = e.dxf.center
        if c.x > X_MAX:
            continue
        k = (round(c.x, 1), round(c.y, 1))
        arcos.setdefault(k, []).append(e)
    rampas, accesos = [], []
    for k, es in arcos.items():
        radios = sorted({round(e.dxf.radius, 2) for e in es})
        if min(radios) < 6:
            # muros de 15 cm: interior, entre carriles y exterior; los carriles van entre ellos
            medio = [x for x in radios if 8 < x < 9.5]
            rampas.append({'c': uv(*k), 'r': [radios[0], radios[-1]],
                           'carriles': [[max(x for x in radios if x < 6), min(medio)], [max(medio), min(x for x in radios if x > 12)]],
                           'bloque': min(bloques, key=lambda b: b['P'].distance(Point(k)))['nombre']})
        else:
            for e in es:
                accesos.append(['a'] + uv(*k) + [round(e.dxf.radius, 2), round(e.dxf.start_angle, 1), round(e.dxf.end_angle, 1)])
    for e in m.query('LWPOLYLINE[layer=="Muro"]'):
        if izq(e) and len(e) == 2:
            a, b = e.get_points('xy')
            accesos.append(['l'] + uv(*a) + uv(*b))
    # cuartos: polígonos con nombre (el texto más cercano)
    textos = []
    for e in m.query('MTEXT'):
        if e.dxf.insert.x < X_MAX:
            textos.append((e.plain_text().replace('\n', ' ').strip(), e.dxf.insert.x, e.dxf.insert.y))

    def nombre(x, y):
        return min(textos, key=lambda t: math.dist((x, y), t[1:]))[0]

    cuartos = []
    for e in m.query('LWPOLYLINE[layer=="Agua" | layer=="Banqueta"]'):
        pts = list(e.get_points('xy'))
        if not izq(e) or len(pts) != 4:
            continue
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        if max(xs) - min(xs) > 40 or max(ys) - min(ys) > 40 or min(xs) < -1:
            continue                                  # banquetas y calles
        c = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
        cuartos.append({'n': nombre(*c), 'pol': [v for p in pts for v in uv(*p)]})
    for e in m.query('CIRCLE[layer=="Banqueta" | layer=="Agua"]'):
        c = e.dxf.center
        if c.x < X_MAX:
            cuartos.append({'n': nombre(c.x, c.y), 'c': uv(c.x, c.y), 'r': round(e.dxf.radius, 2)})

    datos = {
        'sotanos': SOTANOS, 'entrepiso': ENTREPISO,
        'bloques': [{'nombre': b['nombre'], 'planta': [v for p in list(b['P'].exterior.coords)[:-1] for v in uv(*p)],
                     'cajones': b['cajones']} for b in bloques],
        'rampas': rampas, 'accesos': accesos, 'cuartos': cuartos,
    }
    for b in datos['bloques']:
        print(b['nombre'], len(b['planta']) // 2, 'vértices', len(b['cajones']), 'cajones por sótano')
    print('rampas', [(r['bloque'], r['c'], r['carriles']) for r in rampas])
    print('accesos', len(accesos), '· cuartos', [c['n'] for c in cuartos])
    cab = ('/* Estacionamiento. Generado por herramientas/prepara-estacionamiento.py: no editar a mano.\n'
           '   Fuente: Sotanos y PB para HTML.dwg (planta tipo de sótanos), trasladada al marco del diagrama.\n'
           '   bloques: planta = contorno exterior del muro [u, v, …]; cajones = [u0, v0, u1, v1].\n'
           '   rampas: helicoidales dobles, centro, radio interior y exterior, carriles [r0, r1].\n'
           '   accesos: ["a", u, v, r, ángulo inicial, final] (arco, grados) o ["l", u0, v0, u1, v1].\n'
           '   ' + str(SOTANOS) + ' sótanos de ' + str(ENTREPISO) + ' m en cada bloque. */\n')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write(cab + 'window.ATLAMPA_ESTACIONAMIENTO = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('escrito', SALIDA, os.path.getsize(SALIDA), 'bytes')


if __name__ == '__main__':
    main()

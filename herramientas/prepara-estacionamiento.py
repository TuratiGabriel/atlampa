"""Estacionamiento de 'Sotanos y PB para HTML.dwg' → atlampa-estacionamiento.js

    python herramientas/prepara-estacionamiento.py      (desde diagrama/)

El DWG se pasa a DXF con la consola de AutoCAD 2024 (accoreconsole, en una
carpeta temporal; el DWG no se toca) y se lee con ezdxf.

El plano trae dos dibujos lado a lado: «Planta Baja» (x 0–126) y «Sotano
(Planta tipo)» (el mismo marco corrido 197.2482 m en x; ver ORIGEN_X). Están en
metros, con Fresno a la izquierda y Eulalia Guzmán arriba, como u y v del
diagrama: basta una traslación. Hasta el 2026-10-09 la planta tipo estaba en
x 0–111 y la planta baja corrida 270 m; se calzó con la proyección de los edificios.
2026-10-11 (DWG nuevo de Andre): las dos plantas cambiaron de lugar y el marco se
midió otra vez con las columnas de la capa 'R-Estructura' (217, 0.7 × 0.7) contra
las esquinas de los módulos de atlampa-modulos.js (Contexto.3dm): TU, TV =
(444.1892, 320.1543); 159 de 217 columnas a menos de 10 cm (73 %, mediana 2.9 cm);
la planta baja y la planta tipo dan lo mismo con 0.3 mm de diferencia.

Lo que se guarda (planta tipo, en el marco del diagrama):
  bloques   dos estacionamientos independientes (norte y sur): el contorno
            exterior del muro (capa 'Muro') y sus cajones (capa
            'Estacionamiento', rectángulos de 5 × 2.7–2.8 m; y las capas de
            cajones accesibles, ver CAPAS_CAJONES). Cada cajón se guarda con sus
            4 esquinas, TAL CUAL el CAD (van girados como el bloque), no como caja.
  elevadores el desplante de cada elevador: el rectángulo cerrado de la capa 'Muro' (≈ 2 × 2.3 m) que lleva
            el texto «Elevador» (MTEXT, capa '0') del plano. El visor lo sube desde el último sótano hasta
            el nivel más alto del edificio y, encima, el espacio reglamentario (ESPACIO_ELEVADOR).
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
from shapely import snap
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DWG = os.path.join(RAIZ, '..', 'Sotanos y PB para HTML.dwg')
SALIDA = os.path.join(RAIZ, 'atlampa-estacionamiento.js')
ACAD = r'C:\Program Files\Autodesk\AutoCAD 2024\accoreconsole.exe'
TU, TV = 444.1892, 320.1543      # plano → diagrama (calzado con las columnas contra los módulos, 2026-10-11)
ORIGEN_X = 197.2482              # x del plano donde empieza la planta tipo de sótanos (la planta baja empieza en 0)
SOTANOS, ENTREPISO = 4, 3.5
X_MIN, X_MAX = 150, 400          # la planta tipo de sótanos (la planta baja está en x < 150)
# Capas del DWG que son cajones. 2026-10-11 (Andre): P01_CAJONES_N (16 cajones de 2.35 × 4.77) y
# P01_ACCESIBILIDAD (16 franjas de 4.77 × 1.34 junto a ellos) son los cajones de estacionamiento
# ACCESIBLES (personas con discapacidad). En el visor van como cajones más, sin distinguirlos de los demás.
CAPAS_CAJONES = ('Estacionamiento', 'P01_CAJONES_N', 'P01_ACCESIBILIDAD')

# ================= PROPUESTA — todo editable =================
# Espacio reglamentario de los elevadores sobre el nivel más alto (sobrerrecorrido / cuarto de máquinas), en m.
# SUPUESTO SIN VERIFICAR: no se encontró la cifra en las NTC Proyecto Arquitectónico CDMX (Gaceta 12/12/2024) ni en
# NOM-053-SCFI-2000; 4.20 m es sólo la referencia de un manual (sobrerrecorrido mínimo hasta la losa de la sala de
# máquinas) y depende del equipo (velocidad, con o sin cuarto de máquinas). Corregir con la norma o el fabricante.
ESPACIO_ELEVADOR = 4.20
RADIO_TEXTO_ELEVADOR = 2.0                # m: el texto «Elevador» y su rectángulo van a menos de esto
ACCESIBLES = ('P01_CAJONES_N', 'P01_ACCESIBILIDAD')


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
    return [round(x - ORIGEN_X + TU, 2), round(y + TV, 2)]


def contornos_muro(m, tol=0.2):
    """Los contornos cerrados que forman las líneas de la capa 'Muro' (polilíneas y arcos de la planta
    tipo): se pegan los extremos a menos de tol y se polígonizan. Cada bloque queda como un polígono
    con hueco (el grosor del muro), junto con las rampas y los cuartos pequeños."""
    trazos = []
    for e in m.query('LWPOLYLINE[layer=="Muro"]'):
        pts = [tuple(p) for p in e.get_points('xy')]
        if all(X_MIN < p[0] < X_MAX for p in pts):
            trazos.append(LineString(pts + [pts[0]] if e.closed else pts))
    for e in m.query('ARC[layer=="Muro"]'):
        c = e.dxf.center
        if not X_MIN < c.x < X_MAX:
            continue
        a0, a1 = math.radians(e.dxf.start_angle), math.radians(e.dxf.end_angle)
        if a1 < a0:
            a1 += 2 * math.pi
        n = max(8, int((a1 - a0) * e.dxf.radius / 0.3))
        trazos.append(LineString([(c.x + e.dxf.radius * math.cos(a0 + (a1 - a0) * i / n),
                                   c.y + e.dxf.radius * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]))
    red = unary_union(trazos)
    return list(polygonize(unary_union(snap(red, red, tol))))


def main():
    dxf = sys.argv[1] if len(sys.argv) > 1 else a_dxf()
    m = ezdxf.readfile(dxf).modelspace()

    def izq(e):
        return e.dxf.layer and all(X_MIN < p[0] < X_MAX for p in e.get_points('xy'))

    # muros: los contornos cerrados de la capa Muro; los dos más grandes son los bloques
    contornos = sorted((Polygon(p.exterior) for p in contornos_muro(m)), key=lambda p: -p.area)
    bloques = []
    for p in contornos:
        if any(p.within(q.buffer(0.5)) for q in (b['P'] for b in bloques)):
            continue                                  # la cara interior del mismo muro
        bloques.append({'P': p})
    bloques = sorted(bloques[:2], key=lambda b: -b['P'].centroid.y)
    for b, n in zip(bloques, ('norte', 'sur')):
        b['nombre'] = n
        b['cajones'] = []
    # cajones (incluye los accesibles: ver CAPAS_CAJONES)
    for e in m.query('LWPOLYLINE[layer=="%s"]' % '" | layer=="'.join(CAPAS_CAJONES)):
        if not izq(e):
            continue
        pts = list(e.get_points('xy'))
        if len(pts) > 4 and math.dist(pts[0], pts[-1]) < 1e-6:
            pts = pts[:-1]                                # (algunas vienen cerradas con el primer punto repetido)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        c = Point((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
        for b in bloques:
            if b['P'].buffer(0.3).contains(c):
                b['cajones'].append([v for p in pts for v in uv(*p)])   # las 4 esquinas, como el CAD
                break
        else:
            print('cajón fuera de los bloques', c)
    # rampas: los arcos se agrupan por centro; los centros con muro interior (r < 6) son las helicoidales
    arcos = {}
    for e in m.query('ARC CIRCLE[layer=="Muro"]'):
        c = e.dxf.center
        if not X_MIN < c.x < X_MAX:
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
        if X_MIN < e.dxf.insert.x < X_MAX:
            textos.append((e.plain_text().replace('\n', ' ').strip(), e.dxf.insert.x, e.dxf.insert.y))

    def nombre(x, y):
        return min(textos, key=lambda t: math.dist((x, y), t[1:]))[0]

    cuartos = []
    for e in m.query('LWPOLYLINE[layer=="Agua" | layer=="Banqueta"]'):
        pts = list(e.get_points('xy'))
        if not izq(e) or len(pts) != 4:
            continue
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        if max(xs) - min(xs) > 40 or max(ys) - min(ys) > 40 or min(xs) < ORIGEN_X - 1:
            continue                                  # banquetas y calles
        c = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
        cuartos.append({'n': nombre(*c), 'pol': [v for p in pts for v in uv(*p)]})
    for e in m.query('CIRCLE[layer=="Banqueta" | layer=="Agua"]'):
        c = e.dxf.center
        if X_MIN < c.x < X_MAX:
            cuartos.append({'n': nombre(c.x, c.y), 'c': uv(c.x, c.y), 'r': round(e.dxf.radius, 2)})

    # elevadores: el rectángulo cerrado de 'Muro' (4 puntos, < 3 m) más cercano a cada texto «Elevador»
    cajas_ascensor = []
    for e in m.query('LWPOLYLINE[layer=="Muro"]'):
        pts = list(e.get_points('xy'))
        if e.closed and len(pts) == 4 and izq(e):
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            if max(xs) - min(xs) < 3.5 and max(ys) - min(ys) < 3.5:
                cajas_ascensor.append(pts)
    elevadores, usados = [], set()
    for nom, x, y in textos:
        if not nom.lower().startswith('elevador'):
            continue
        cand = [(math.dist((x, y), (sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4)), i) for i, q in enumerate(cajas_ascensor) if i not in usados]
        d, i = min(cand)
        if d > RADIO_TEXTO_ELEVADOR:
            print('texto «Elevador» sin rectángulo a menos de', RADIO_TEXTO_ELEVADOR, 'm:', (round(x, 1), round(y, 1)))
            continue
        usados.add(i)
        q = cajas_ascensor[i]
        c = Point(sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4)
        bl = min(bloques, key=lambda b: b['P'].distance(c))['nombre']
        elevadores.append({'bloque': bl, 'pol': [v for p in q for v in uv(*p)]})
    elevadores.sort(key=lambda x: (x['bloque'], -x['pol'][1]))
    print('elevadores', [(x['bloque'], x['pol'][:2]) for x in elevadores])

    datos = {
        'sotanos': SOTANOS, 'entrepiso': ENTREPISO, 'elevadores': elevadores, 'espacioElevador': ESPACIO_ELEVADOR,
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
           '   bloques: planta = contorno exterior del muro [u, v, …]; cajones = las 4 esquinas [u, v, …] (como el CAD)\n'
           '   (incluyen los accesibles: capas ' + ' y '.join(ACCESIBLES) + ', sin distinguirlos).\n'
           '   elevadores: [{bloque, pol: 4 esquinas [u, v, …]}] (desplante; suben hasta el nivel más alto y el espacio\n'
           '   reglamentario espacioElevador, supuesto: ver PROPUESTA en prepara-estacionamiento.py).\n'
           '   rampas: helicoidales dobles, centro, radio interior y exterior, carriles [r0, r1].\n'
           '   accesos: ["a", u, v, r, ángulo inicial, final] (arco, grados) o ["l", u0, v0, u1, v1].\n'
           '   ' + str(SOTANOS) + ' sótanos de ' + str(ENTREPISO) + ' m en cada bloque. */\n')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write(cab + 'window.ATLAMPA_ESTACIONAMIENTO = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('escrito', SALIDA, os.path.getsize(SALIDA), 'bytes')


if __name__ == '__main__':
    main()

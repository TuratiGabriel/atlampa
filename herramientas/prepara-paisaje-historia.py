"""El paisaje, el estacionamiento y el cierre del Modo historia (etapa 2) → atlampa-historia-paisaje.js.

    python herramientas/prepara-paisaje-historia.py      (desde la raíz del repo; con numpy y shapely)

Diego, 2026-11-28: el paisaje se presenta en cuatro slides: 1) el agua (jardines inundables y espejos de agua); 2) los
pisos (la plaza y los andadores, el pasto y los pétreos); 3) los árboles, las arbustivas, los pastos y las flores; 4) el
año: pasan los doce meses (3 s cada uno) y cambian el tono, las flores y el aroma, como la rueda de floración del
paquete del Boceto 01d (rueda_floracion_atlampa.html), con el nombre del mes escrito sobre el contexto. Luego el
estacionamiento y la slide final, con el proyecto completo y personas caminando por todo el desarrollo.

Fuentes (en el repo):
- modelo/paisaje-boceto01d.json: el Boceto 01d de Atlampa Landscape (BOCETO_01d_Atlampa.3dm, árbol de capas
  BOCETO_01_BurleMarx), exportado con el MCP de Rhino y ya en coordenadas del visor (ver su nota): las franjas
  (hatches, cada una de una especie o un pétreo), los espejos de agua, los 25 árboles, las guarniciones y los contornos.
- atlampa-revit.js / .bin: los muros de la planta baja (para que las personas no los atraviesen).

Qué sale:
- especies: la paleta vigente (17 especies y 4 pétreos), con los meses de floración de la rueda (m: un carácter por
  mes; M, X o S en flor, r registro parcial, . sin floración), el color de la flor, el del boceto y el del follaje
  (en lluvias y en secas) y cómo se dibuja cada planta.
- manchas, agua: como en el boceto (cada polígono [ext, hoyo, …], simplificado a 3 cm); arboles: centro y radio de copa.
- piso: la plaza y los andadores (el predio menos los parques, el agua y las naves que no corta el aro), con huecos,
  y sus juntas (cada 1.8 m, en los ejes del predio); guarniciones: el anillo de 0.20 m de cada parque.
- plantas: por especie, dónde va cada planta [u, v, escala], repartidas en tresbolillo con su separación.
- rutas: recorridos de las personas por la plaza y los andadores (sin cruzar muros ni parques); rutasAlto: por los
  pasillos de la vivienda [u0, v0, u1, v1, z] (de atlampa-historia-vivienda.js).
- fondos: anillos hacia dentro de cada espejo de agua (como la laguna del visor).
"""
import json
import math
import os
import random

import numpy as np
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union
from shapely.prepared import prep

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SALIDA = os.path.join(RAIZ, 'atlampa-historia-paisaje.js')

BOC = json.load(open(os.path.join(RAIZ, 'modelo', 'paisaje-boceto01d.json'), encoding='utf-8'))
PRED = box(447.963, 322.265, 558.963, 488.265)
NAVES = [(504.601, 323.872, 558.546, 396.366), (522.782, 417.865, 558.81, 488.333)]   # G.NAVES
ANILLO, CORTE = (505.75, 409.05), 47   # G.ANILLO (centro) y G.CORTE: el aro corta las naves

# ---------- la paleta (rueda_floracion_atlampa.html y los colores del boceto) ----------
# forma: cómo se dibuja (arbol, domo, roseta, pasto, cana, junco, espiga); alto y sep en m (sep: entre plantas)
ESPECIES = {
    'E-046': dict(nombre='Tepozán', m='.......MMM..', flor='#EFA92F', tags=['poli'], forma='arbol', alto=9.0, follaje='#c4dc8e'),
    'E-052': dict(nombre='Tejocote', m='.MMM........', flor='#EFEAD8', tags=['poli'], forma='arbol', alto=7.0, follaje='#a8e063'),
    'E-047': dict(nombre='Capulín', m='............', flor='#2F6B4F', tags=['estructura'], forma='arbol', alto=8.0, follaje='#7fd88c'),
    'E-019': dict(nombre='Trompetilla', m='rr..MMMMXXXr', flor='#DB2437', tags=['colibri'], forma='domo', alto=1.0, sep=0.9, boceto='#ec6024', follaje='#5f8a48'),
    'E-015': dict(nombre='Tlacote', m='.......SSSS.', flor='#4A4FD8', tags=['colibri', 'poli'], forma='domo', alto=1.6, sep=1.3, boceto='#483aa8', follaje='#557f45'),
    'E-016': dict(nombre='Mirto', m='rrrrSrrrSSSr', flor='#C8265A', tags=['colibri', 'poli'], forma='domo', alto=1.1, sep=1.0, boceto='#cc265c', follaje='#5a8546'),
    'E-034': dict(nombre='Salvia piña', m='.......SSSS.', flor='#C21F33', tags=['colibri', 'aroma'], forma='domo', alto=1.2, sep=1.0, boceto='#b01828', follaje='#6a9446'),
    'E-032': dict(nombre='Pericón', m='.......SSSS.', flor='#F2C20D', tags=['aroma'], forma='domo', alto=0.7, sep=0.8, boceto='#f6b816', follaje='#73923c'),
    'E-043': dict(nombre='Lavanda', m='......SS....', flor='#8E7CC3', tags=['aroma', 'poli'], forma='domo', alto=0.7, sep=0.8, boceto='#9884cc', follaje='#8a9d86'),
    'E-055': dict(nombre='Maguey pulquero', m='.MM.........', flor='#B9B53A', tags=['colibri', 'poli'], forma='roseta', alto=1.3, sep=2.4, boceto='#56808c', follaje='#7b979b'),
    'E-059': dict(nombre='Cucharilla', m='.....SSS....', flor='#D9D0A8', tags=['estructura'], forma='roseta', alto=1.0, sep=1.8, boceto='#7a9280', follaje='#8c9a72'),
    'E-061': dict(nombre='Liendrilla de venado', m='...XXXXXX...', flor='#BDB078', tags=['agua', 'poli'], forma='pasto', alto=1.2, sep=0.8, boceto='#b8b070', follaje='#9fa86e', seco='#cdb984'),
    'E-060': dict(nombre='Pasto navajita', m='......XXXX..', flor='#C4A25E', tags=['poli'], forma='pasto', alto=0.35, sep=0.5, boceto='#c4ce78', follaje='#9db55c', seco='#cdbd8a'),
    'E-065': dict(nombre='Zacatón', m='............', flor='#B5A46A', tags=['agua'], forma='pasto', alto=1.1, sep=0.8, boceto='#a0965a', follaje='#96a068', seco='#c4b282'),
    'E-013': dict(nombre='Caña de indias', m='............', flor='#E2502A', tags=['agua'], forma='cana', alto=1.8, sep=1.0, boceto='#d67834', follaje='#4f8a3a'),
    'E-005': dict(nombre='Junco', m='....XXXX....', flor='#7F8F45', tags=['agua'], forma='junco', alto=0.9, sep=0.5, boceto='#285a3a', follaje='#4d7a3c'),
    'E-009': dict(nombre='Espigas de agua', m='.....XXXX...', flor='#6A5BD0', tags=['agua', 'poli'], forma='espiga', alto=0.8, sep=0.6, boceto='#5c6ebe', follaje='#5e8f4a'),
}
PETREOS = {
    'PT-1': dict(nombre='Tezontle rojo', color='#9e3e2c'), 'PT-2': dict(nombre='Tezontle negro', color='#3a3636'),
    'PT-3': dict(nombre='Mármol blanco', color='#ece9e0'), 'PT-4': dict(nombre='Canto rodado gris', color='#8c8e8a'),
}
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def pares(a):
    return [(a[i], a[i + 1]) for i in range(0, len(a), 2)]


def poligono(ext, hoyos=()):
    p = Polygon(pares(ext), [pares(h) for h in hoyos if len(h) >= 6])
    return p if p.is_valid else p.buffer(0)


def poligonos(g):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [x for x in getattr(g, 'geoms', []) if isinstance(x, Polygon)]


def plano(p, nd=2):
    """[ext, hoyo, …] de un polígono, cada anillo plano [u, v, …] sin repetir el primer punto."""
    def anillo(r):
        c = list(r.coords)[:-1]
        return [round(x, nd) for q in c for x in q]
    return [anillo(p.exterior)] + [anillo(i) for i in p.interiors]


# ---------- el piso: la plaza y los andadores ----------
manchas = [poligono(m['ext'][0], m['int']) for m in BOC['manchas']]
agua = [poligono(a['ext'][0], a['int']) for a in BOC['agua']]
contornos = [poligono(c['p']) for c in BOC['contornos']]
parques = unary_union(manchas + agua + contornos).buffer(0.02)
naves = unary_union([box(*n) for n in NAVES]).difference(Point(ANILLO).buffer(CORTE, 128))
piso = PRED.difference(parques).difference(naves)
piso_pols = [p for p in poligonos(piso) if p.area > 4]

# las juntas, cada 1.8 m en los ejes del predio
P_PISO = prep(piso)
juntas = []
PASO = 1.8
x0, y0, x1, y1 = PRED.bounds
for eje in (0, 1):
    t = (x0 if eje == 0 else y0) + PASO
    while t < (x1 if eje == 0 else y1):
        ln = LineString([(t, y0), (t, y1)]) if eje == 0 else LineString([(x0, t), (x1, t)])
        cor = ln.intersection(piso)
        for s in getattr(cor, 'geoms', [cor]):
            if isinstance(s, LineString) and s.length > 0.3:
                (a, b), (c, d) = s.coords[0], s.coords[-1]
                juntas += [round(a, 2), round(b, 2), round(c, 2), round(d, 2)]
        t += PASO

# las guarniciones: cada contorno menos su guarnición (0.20 m hacia dentro)
guarn = [poligono(g['p']) for g in BOC['guarniciones']]
anillos_g = []
for gp in guarn:
    cs = [c for c in contornos if c.contains(gp.representative_point()) and c.area > gp.area]
    if not cs:
        continue
    c = min(cs, key=lambda c: c.area - gp.area)
    r = c.difference(gp)
    anillos_g += [plano(p) for p in poligonos(r) if p.area > 0.05]

# ---------- las plantas: en tresbolillo, con su separación ----------
rnd = random.Random(28)
plantas = {k: [] for k, e in ESPECIES.items() if e['forma'] != 'arbol'}
for m, pol in zip(BOC['manchas'], manchas):
    e = ESPECIES.get(m['id'])
    if not e or e['forma'] == 'arbol':
        continue
    s = e['sep']
    zona = pol.buffer(-0.22 * s)
    if zona.is_empty or zona.area < 0.2 * pol.area:
        zona = pol.buffer(-0.08)
    if zona.is_empty:
        continue
    pz = prep(zona)
    a0, b0, a1, b1 = zona.bounds
    dy = s * math.sqrt(3) / 2
    j = 0
    y = b0 + dy * rnd.random()
    while y < b1:
        x = a0 + (s / 2 if j % 2 else 0) + s * rnd.random() * 0.3
        while x < a1:
            u, v = x + (rnd.random() - 0.5) * 0.35 * s, y + (rnd.random() - 0.5) * 0.35 * s
            if pz.contains(Point(u, v)):
                plantas[m['id']] += [round(u, 2), round(v, 2), round(0.8 + 0.4 * rnd.random(), 2)]
            x += s
        y += dy
        j += 1

# ---------- las rutas de las personas ----------
t = open(os.path.join(RAIZ, 'atlampa-revit.js'), encoding='utf-8').read()
REV = json.loads(t[t.index('{', t.index('ATLAMPA_REVIT')):t.rindex('}') + 1])
BIN = open(os.path.join(RAIZ, 'atlampa-revit.bin'), 'rb').read()
O_REV = np.array(REV['origen'])
muros = []
for g in REV['grupos']:
    if g['categoria'] != 'walls' or g['programa'] == 'estacionamiento':
        continue
    a = np.frombuffer(BIN, dtype='<f4', count=g['floats'], offset=g['offset']).astype(float).reshape(-1, 3, 3) + O_REV
    sel = a[(a[:, :, 2].min(axis=1) < 2.2) & (a[:, :, 2].max(axis=1) > 0.4)]
    for tr in sel:
        p = Polygon(tr[:, :2])
        if p.area > 1e-4:
            muros.append(p)
        else:   # un triángulo vertical: su huella es un segmento
            muros.append(LineString(tr[:, :2]).buffer(0.05))
obst = unary_union(muros).buffer(0.6)
libre = PRED.buffer(-0.8).difference(parques.buffer(0.8)).difference(obst)
P_LIB = prep(libre)
rutas = []
intentos = 0
while len(rutas) < 70 and intentos < 40000:
    intentos += 1
    a = (x0 + rnd.random() * (x1 - x0), y0 + rnd.random() * (y1 - y0))
    if not P_LIB.contains(Point(a)):
        continue
    ang = rnd.choice([0, 90, 180, 270, 45, 135, 225, 315]) + 9.96 * rnd.choice([0, 1]) + (rnd.random() - 0.5) * 12
    L = 14 + rnd.random() * 34
    b = (a[0] + L * math.cos(math.radians(ang)), a[1] + L * math.sin(math.radians(ang)))
    if P_LIB.contains(LineString([a, b])):
        rutas.append([round(a[0], 2), round(a[1], 2), round(b[0], 2), round(b[1], 2)])

# y por los pasillos de la vivienda (las losas 'pasillo' de atlampa-historia-vivienda.js), a lo largo de cada tramo
t = open(os.path.join(RAIZ, 'atlampa-historia-vivienda.js'), encoding='utf-8').read()
VIV = json.loads(t[t.index('{', t.index('ATLAMPA_HISTORIA_VIVIENDA')):t.rindex('}') + 1])
rutas_alto = []
for L in VIV['losas']:
    for pol in L['pasillo']:
        p = poligono(pol[0], pol[1:])
        zona = p.buffer(-0.45)
        if zona.is_empty or p.area < 8:
            continue
        pz = prep(zona)
        caja = p.minimum_rotated_rectangle.exterior.coords
        lados = [(caja[i], caja[i + 1]) for i in range(4)]
        (ax, ay), (bx, by) = max(lados, key=lambda s: math.dist(s[0], s[1]))
        eje = math.atan2(by - ay, bx - ax)
        hechas, n = 0, max(1, round(p.area / 30))
        for _ in range(60 * n):
            if hechas >= n:
                break
            a0, b0, a1, b1 = zona.bounds
            a = (a0 + rnd.random() * (a1 - a0), b0 + rnd.random() * (b1 - b0))
            if not pz.contains(Point(a)):
                continue
            ang, Lr = eje + (rnd.random() - 0.5) * 0.08 + (math.pi if rnd.random() < 0.5 else 0), 4 + rnd.random() * 14
            b = (a[0] + Lr * math.cos(ang), a[1] + Lr * math.sin(ang))
            if pz.contains(LineString([a, b])):
                rutas_alto.append([round(a[0], 2), round(a[1], 2), round(b[0], 2), round(b[1], 2), round(L['z'][1], 2)])
                hechas += 1

# el fondo de los espejos de agua: anillos hacia dentro, como la laguna del visor
fondos = []
for p in agua:
    for d in (0.6, 1.4, 2.4):
        for q in poligonos(p.buffer(-d).simplify(0.05)):
            if q.area > 1:
                fondos.append(plano(q)[0])

out = {
    'nota': 'Generado por herramientas/prepara-paisaje-historia.py: no editar a mano. ' + BOC['nota'],
    'meses': MESES,
    'especies': ESPECIES,
    'petreos': PETREOS,
    # (simplificadas a 3 cm, en cm)
    'manchas': [dict({k: m[k] for k in ('id', 'cat', 'parque', 'figura', 'zona', 'area')}, pol=[plano(q) for q in poligonos(p.simplify(0.03))])
                for m, p in zip(BOC['manchas'], manchas)],
    'agua': [{'pol': [plano(q) for q in poligonos(p.simplify(0.03))], 'area': a['area']} for a, p in zip(BOC['agua'], agua)],
    'arboles': BOC['arboles'],
    'piso': [plano(p) for p in piso_pols],
    'juntas': juntas,
    'guarniciones': anillos_g,
    'plantas': plantas,
    'rutas': rutas,
    'rutasAlto': rutas_alto,
    'fondos': fondos,
}
txt = ('/* El paisaje del Modo historia (etapa 2). Generado por herramientas/prepara-paisaje-historia.py: no editar a mano.\n'
       '   Fuente: modelo/paisaje-boceto01d.json (Boceto 01d, Atlampa Landscape) y los muros de planta baja del Revit. */\n'
       'window.ATLAMPA_HISTORIA_PAISAJE = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(SALIDA, 'w', encoding='utf-8', newline='\n').write(txt)
cuenta = {k: len(v) // 3 for k, v in plantas.items()}
print('piso: %d polígonos, %.0f m²; juntas %d; guarniciones %d' % (len(piso_pols), sum(p.area for p in piso_pols), len(juntas) // 4, len(anillos_g)))
print('plantas', cuenta, 'total', sum(cuenta.values()))
print('rutas %d (%d intentos); libre %.0f m²; en los pasillos %d; fondos del agua %d' % (len(rutas), intentos, libre.area, len(rutas_alto), len(fondos)))
print('%s: %.0f KB' % (os.path.basename(SALIDA), os.path.getsize(SALIDA) / 1024))

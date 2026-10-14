"""Módulos de vivienda (ponerestructura_LRFD_v2.3dm) → atlampa-modulos.js.

    python herramientas/prepara-modulos.py      (desde diagrama/)

2026-10-13: la fuente pasó a ser el Rhino de la estructura (ponerestructura_LRFD_v2.3dm, capas Módulos::…): es el
modelo bueno, con los módulos y los niveles correctos, y el visor lo copia TAL CUAL. El archivo (62 MB) no va al repo:
se busca junto a la carpeta diagrama/. Ya no se usan nuevos bloques.3dm ni los gemelos de Contexto.3dm (sólo la
industria, que sigue saliendo de Contexto.3dm).

Cada objeto de las capas Módulos::44m2, 66m2, 88m2, loft44m2, modulosamenidades, modulosextra y moduloscomercio es un
DEPARTAMENTO (varios módulos juntos en un mismo nivel): se parte en módulos de 5.5 × 4 m sobre la retícula girada
−10° y cada uno hereda el departamento (las aristas entre módulos del mismo departamento no se dibujan).
Niveles: el módulo mide 2.70 de alto y el nivel sube cada 3.30 (0.60 de entrepiso: Módulos::entrepiso, que el
visor dibuja con losas, ver prepara-estructura.py). Primer nivel en z 3.683 del archivo.
Marco: archivo (m) → diagrama: u = x + 497.99562, v = y + 392.09942, z = z + 7.1601 (medido contra el predio y
130 módulos de Contexto.3dm, ver prepara-estructura.py --calce). NO se quita ningún módulo por el aro: el modelo ya lo
respeta; los de la capa moduloscomercio van como «comercio» y se abren hacia el aro.

Qué sigue siendo de antes (de Gabriel): la salida (cajas con muros por tramos y tapa, juntas, sectores de visibilidad,
industria y chimenea) y el formato; la chimenea se toma del atlampa-modulos.js anterior (nuevos bloques.3dm no está).
"""
import base64
import json
import math
import os
import sys
from collections import Counter, defaultdict

import numpy as np
import rhino3dm
from PIL import Image, ImageDraw
from shapely.geometry import Point, Polygon, box as sbox
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
MODELO = os.path.join(os.path.dirname(RAIZ), 'ponerestructura_LRFD_v2.3dm')   # junto a la carpeta diagrama/ (62 MB, fuera del repo)
CHIMENEA_RHINO = os.path.join(RAIZ, '..', 'Rhino', 'nuevos bloques.3dm')
CONTEXTO = os.path.join(RAIZ, '..', 'Rhino', 'Contexto.3dm')
# sin la carpeta del proyecto (colaboradores): la copia que va en el repo, diagrama/modelo/
if not os.path.exists(CONTEXTO):
    CONTEXTO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelo', 'Contexto.3dm')
SALIDA = os.path.join(RAIZ, 'atlampa-modulos.js')
DEPTOS = os.path.join(AQUI, 'departamentos.json')   # de herramientas/departamentos.py

CAPAS = ['44m2', '66m2', '88m2', 'loft44m2', 'modulosamenidades', 'modulosextra']   # subcapas de 'Módulos' (tipos); moduloscomercio va como 'comercio'
CAPA_COMERCIO = 'moduloscomercio'
ALTO, PASO = 2.7, 3.3                     # alto del módulo y de nivel a nivel (0.60 de entrepiso)
CELDA = (5.5, 4.0)                        # un módulo
GIRO = math.radians(-10)
RX, RY, RZ = 503.255, 404.153, 0.11       # Contexto.3dm (mm) → marco del diagrama (como el mercado y el sitio)
DU, DV, DZ = 497.99562, 392.09942, 7.1601  # archivo de la estructura (m) → diagrama (medido contra Contexto.3dm)
EU, EV = 497.59, 391.73                    # lo existente de nuevos bloques (chimenea): calza así con las naves de Contexto
TOL = 0.03
SECTOR, MARGEN = 10, 3                    # grados
PX = 0.15                                 # m por píxel en la prueba de visibilidad
MIN_PX = 3                                # píxeles para contar una caja como visible
ELEVACIONES = [(6, 2), (15, 2), (30, 1), (48, 2), (70, 3)]   # alturas de cámara (°) y paso de azimut
BANDAS = {'baja': (6, 15, 30), 'alta': (30, 48, 70)}           # el navegador usa 'baja' bajo 30°
CORTE_BANDA = 30
ANILLO = (505.75, 409.05, 39.5, 46.55, 10.03)   # u, v, radio interior y exterior, cubierta (como en atlampa-geo.js)
# el chipote: el borde de adentro del aro sigue la curva del edificio de arte y cultura (como en atlampa-geo.js)
CULT = ((5.3 + 497.9986, 14.85 + 392.0954), 38.27, 1.8, 138, 58, 10)


def _r_cult(t):
    d = (t - CULT[3] + 540) % 360 - 180
    return CULT[1] + CULT[2] + (CULT[5] * math.cos(math.pi / 2 * d / CULT[4]) ** 2 if abs(d) < CULT[4] else 0)


def _tabla():
    tb, k = [], 1.5
    for t in range(360):
        a, lo, hi = math.radians(t), 20.0, 80.0
        for _ in range(40):
            m = (lo + hi) / 2
            p = (ANILLO[0] + math.cos(a) * m, ANILLO[1] + math.sin(a) * m)
            tc = math.degrees(math.atan2(p[1] - CULT[0][1], p[0] - CULT[0][0]))
            if math.hypot(p[0] - CULT[0][0], p[1] - CULT[0][1]) < _r_cult(tc):
                lo = m
            else:
                hi = m
        x = (lo + hi) / 2 - ANILLO[2]
        y = x if x >= k else 0 if x <= -k else (x + k) ** 2 / (4 * k)
        w = 0 if t < 60 else 1 if t <= 172 else 0 if t >= 205 else math.cos(math.pi / 2 * (t - 172) / 33) ** 2
        tb.append(y * w)
    return tb


TB = _tabla()


def bulto(t):
    t %= 360
    i = int(t)
    f = t - i
    return TB[i] * (1 - f) + TB[(i + 1) % 360] * f


def azotea_cultura():
    # la azotea de arte y cultura (el aro se ensancha sobre ella), de los datos del concepto
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'atlampa-3d-cultura.js'), encoding='utf-8').read().split('\n')[3]
    d = json.loads(src[src.index('{'):src.rindex('}') + 1])
    return Polygon([(p[0] + 497.9986, p[1] + 392.0954) for p in d['RF']]).buffer(0)   # (DX, DY de prepara-cultura.py)


def aro_poli(r, n=720):
    return [(ANILLO[0] + (r + bulto(i * 360 / n)) * math.cos(math.radians(i * 360 / n)),
             ANILLO[1] + (r + bulto(i * 360 / n)) * math.sin(math.radians(i * 360 / n))) for i in range(n)]
LIBRE = 2.5                                   # altura libre sobre la cubierta
JUNTO = 1.5                                   # a menos de esto del paso, un módulo da al aro


def _triangulos(g):
    out = []
    for f in g.Faces:
        m = f.GetMesh(rhino3dm.MeshType.Any)
        if not m:
            continue
        V = m.Vertices
        for i in range(len(m.Faces)):
            q = m.Faces[i]
            P = [(V[k].X, V[k].Y, V[k].Z) for k in (q[0], q[1], q[2], q[3])]
            out.append(P[:3])
            if q[2] != q[3]:
                out.append([P[0], P[2], P[3]])
    return out


def lee():
    """Los módulos del Rhino de la estructura: cada departamento (objeto) se parte en celdas de 5.5 × 4 sobre la
    retícula girada −10°. c = centro (x, y) en el marco del archivo; depto = el objeto; z0/h en el marco del archivo."""
    if not os.path.exists(MODELO):
        sys.exit('Falta %s: copia el archivo junto a la carpeta diagrama/.' % MODELO)
    m = rhino3dm.File3dm.Read(MODELO)
    eu, ev = (math.cos(GIRO), math.sin(GIRO)), (-math.sin(GIRO), math.cos(GIRO))
    cajas, raros, entre = [], [], defaultdict(list)
    for n, o in enumerate(m.Objects):
        lp = m.Layers[o.Attributes.LayerIndex].FullPath
        if not lp.startswith('M') or '::' not in lp:
            continue
        capa = lp.split('::')[-1]
        g = o.Geometry
        if capa == 'entrepiso':
            # losas del entrepiso (extrusión del contorno, con huecos): para saber qué tapas ya cubre
            z0 = min(g.PathStart.Z, g.PathEnd.Z) + DZ
            perf = []
            for i in range(g.ProfileCount):
                c = g.Profile3d(i, 0.0)
                if c is not None:
                    perf.append([(c.Point(k).X + DU, c.Point(k).Y + DV) for k in range(c.PointCount)])
            pol = Polygon(perf[0]).buffer(0)
            for h in perf[1:]:
                pol = pol.difference(Polygon(h))
            entre[round(z0, 2)].append(pol)
            continue
        if capa not in CAPAS + [CAPA_COMERCIO]:
            continue
        T = _triangulos(g)
        zmin = min(p[2] for t in T for p in t)
        zmax = max(p[2] for t in T for p in t)
        pols = [Polygon([(p[0] * eu[0] + p[1] * eu[1], p[0] * ev[0] + p[1] * ev[1]) for p in t]).buffer(1e-4, join_style=2)
                for t in T if all(abs(p[2] - zmin) < 1e-3 for p in t)]
        pie = unary_union([q for q in pols if q.area > 1e-8]).buffer(-1e-4, join_style=2)
        u0, v0, u1, v1 = pie.bounds
        nu, nv = max(1, round((u1 - u0) / CELDA[0])), max(1, round((v1 - v0) / CELDA[1]))
        su, sv = (u1 - u0) / nu, (v1 - v0) / nv
        if abs(su - CELDA[0]) > 0.1 or abs(sv - CELDA[1]) > 0.1 or abs(zmax - zmin - ALTO) > 0.01:
            raros.append((capa, round(su, 2), round(sv, 2), round(zmax - zmin, 2)))
        for i in range(nu):
            for j in range(nv):
                cu, cv = u0 + (i + 0.5) * su, v0 + (j + 0.5) * sv
                if pie.contains(Point(cu, cv)):
                    cajas.append({'capa': capa, 'depto': n, 'c': (cu * eu[0] + cv * ev[0], cu * eu[1] + cv * ev[1]),
                                  'z0': zmin, 'h': zmax - zmin, 'ang': GIRO, 'a': CELDA[0], 'b': CELDA[1]})
    if raros:
        print('módulos que NO son 5.5 × 4 × 2.7 (van como estándar; el visor sólo maneja una medida):', raros)
    print('departamentos', len({c['depto'] for c in cajas}), '· módulos', len(cajas))
    return cajas, {z: unary_union(v) for z, v in entre.items()}


def industria():
    """La industria de Contexto.3dm (capa 'industry_bake - Copy'): un prisma; su
    planta (el contorno de la cara de abajo) y sus alturas, ya en el marco del diagrama."""
    m = rhino3dm.File3dm.Read(CONTEXTO)
    for o in m.Objects:
        if m.Layers[o.Attributes.LayerIndex].FullPath != 'industry_bake - Copy':
            continue
        b = o.Geometry
        bb = b.GetBoundingBox()
        z0 = bb.Min.Z
        segs = []
        for e in b.Edges:
            a, c = e.PointAtStart, e.PointAtEnd
            if abs(a.Z - z0) < 1 and abs(c.Z - z0) < 1:
                segs.append(((round(a.X / 1000 + RX, 3), round(a.Y / 1000 + RY, 3)), (round(c.X / 1000 + RX, 3), round(c.Y / 1000 + RY, 3))))
        s = segs.pop()
        lazo = [s[0], s[1]]
        while lazo[-1] != lazo[0]:
            for i, t in enumerate(segs):
                if t[0] == lazo[-1] or t[1] == lazo[-1]:
                    lazo.append(t[1] if t[0] == lazo[-1] else t[0])
                    segs.pop(i)
                    break
            else:
                sys.exit('la planta de la industria no cierra')
        if segs:
            sys.exit('la industria tiene más de un contorno')
        return {'planta': [round(v, 2) for p in lazo[:-1] for v in p],
                'z0': round(z0 / 1000 + RZ, 2), 'z1': round(bb.Max.Z / 1000 + RZ, 2)}
    return None


def chimenea():
    if not os.path.exists(CHIMENEA_RHINO):
        s = open(SALIDA, encoding='utf-8').read()
        return json.loads(s[s.index('window.ATLAMPA_MODULOS = ') + len('window.ATLAMPA_MODULOS = '):].strip().rstrip(';'))['chimenea']
    """La chimenea existente (capa 'site::existing - Copy'): el prisma que se
    afila, de 8 vértices. Base y remate como rectángulos en el marco del diagrama."""
    m = rhino3dm.File3dm.Read(CHIMENEA_RHINO)
    for o in m.Objects:
        if m.Layers[o.Attributes.LayerIndex].FullPath != 'site::existing - Copy':
            continue
        pts = [(v.Location.X, v.Location.Y, v.Location.Z) for v in o.Geometry.Vertices]
        if len(pts) != 8:
            continue
        z0 = min(p[2] for p in pts)
        z1 = max(p[2] for p in pts)

        def caja(z):
            q = [p for p in pts if abs(p[2] - z) < 1e-3]
            return [round(min(p[0] for p in q) + EU, 2), round(min(p[1] for p in q) + EV, 2),
                    round(max(p[0] for p in q) + EU, 2), round(max(p[1] for p in q) + EV, 2)]
        return {'base': caja(z0), 'remate': caja(z1), 'z0': round(z0 + DZ, 2), 'z1': round(z1 + DZ, 2)}
    return None


def main():
    cajas, entrepisos = lee()
    giro = sum(c['ang'] for c in cajas) / len(cajas)
    A = round(sum(c['a'] for c in cajas) / len(cajas), 3)
    B = round(sum(c['b'] for c in cajas) / len(cajas), 3)
    H = ALTO
    print('cajas', len(cajas), 'giro', round(math.degrees(giro), 3), 'medidas', A, B, H)
    assert all(abs(c['ang'] - giro) < 0.002 and abs(c['a'] - A) < 0.02 and abs(c['b'] - B) < 0.02 for c in cajas)
    A, B = CELDA
    Z0 = min(c['z0'] for c in cajas)
    eg, sg = math.cos(giro), math.sin(giro)
    for c in cajas:
        c['k'] = round((c['z0'] - Z0) / PASO)
        assert abs(Z0 + c['k'] * PASO - c['z0']) < 0.01
        # marco local girado: X a lo largo del lado largo
        c['X'] = c['c'][0] * eg + c['c'][1] * sg
        c['Y'] = -c['c'][0] * sg + c['c'][1] * eg

    # duplicados (la misma caja en dos capas)
    vistos, unicas = {}, []
    for c in cajas:
        llave = (round(c['X'], 1), round(c['Y'], 1), c['k'])
        if llave in vistos:
            print('  duplicada', c['capa'], 'y', vistos[llave]['capa'], llave)
            continue
        vistos[llave] = c
        unicas.append(c)
    cajas = unicas

    # 0. El aro: NO se quita nada (el Rhino ya lo respeta). Los de la capa moduloscomercio son los de junto al
    # aro: van como «comercio» y se abren las caras que miran al paso.
    AU, AV, RI, RE, AZ = ANILLO
    banda = Point(AU, AV).buffer(RE, 256).difference(Point(AU, AV).buffer(RI, 256)).union(azotea_cultura())   # con la azotea de arte y cultura
    ex0, ey0 = (eg, sg), (-sg, eg)

    def esquina(c, lx, ly):
        return (c['c'][0] + DU + ex0[0] * lx + ey0[0] * ly, c['c'][1] + DV + ex0[1] * lx + ey0[1] * ly)
    cruzan = 0
    for c in cajas:
        c['abre'] = []
        z0 = Z0 + DZ + c['k'] * PASO
        pol = Polygon([esquina(c, x * A / 2, y * B / 2) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        if not (z0 + H <= AZ - 0.35 or z0 >= AZ + LIBRE) and pol.intersection(banda).area > 0.3:
            cruzan += 1
        if c['capa'] != CAPA_COMERCIO:
            continue
        c['comercio'] = True
        for lado, (mx, my, nx, ny) in enumerate(((0, -B / 2, 0, -1), (A / 2, 0, 1, 0), (0, B / 2, 0, 1), (-A / 2, 0, -1, 0))):
            m = esquina(c, mx, my)
            fuera = esquina(c, mx + nx, my + ny)
            if Point(m).distance(banda) < JUNTO + 1 and Point(fuera).distance(banda) < Point(m).distance(banda) - 0.3:
                c['abre'].append(lado)
    print('aro: no se quita ninguno · a comercio', sum(1 for c in cajas if c.get('comercio')), '· cruzan la banda del aro a su altura (sólo informativo)', cruzan)

    por_nivel = defaultdict(list)
    for c in cajas:
        por_nivel[c['k']].append(c)
    # traslapes dentro de un nivel
    for k, cs in por_nivel.items():
        for i, a in enumerate(cs):
            for b in cs[i + 1:]:
                if abs(a['X'] - b['X']) < A - TOL and abs(a['Y'] - b['Y']) < B - TOL:
                    print('  traslape en nivel', k, a['capa'], b['capa'])

    # 1. Shell. Lados: 0 (−Y), 1 (+X), 2 (+Y), 3 (−X); intervalos en coordenadas locales
    def resta(a0, a1, cubre):
        libres = [(a0, a1)]
        for c0, c1 in cubre:
            nuevo = []
            for l0, l1 in libres:
                if c1 <= l0 + TOL or c0 >= l1 - TOL:
                    nuevo.append((l0, l1))
                    continue
                if c0 > l0 + TOL:
                    nuevo.append((l0, c0))
                if c1 < l1 - TOL:
                    nuevo.append((c1, l1))
            libres = nuevo
        return libres

    for c in cajas:
        x, y = c['X'], c['Y']
        mismos = [o for o in por_nivel[c['k']] if o is not c]
        muros = []
        for lado in range(4):
            if lado in (0, 2):
                s = -1 if lado == 0 else 1
                cubre = [(o['X'] - A / 2 - x, o['X'] + A / 2 - x) for o in mismos if abs((o['Y'] - y) - s * B) < TOL]
                muros.append(resta(-A / 2, A / 2, cubre))
            else:
                s = 1 if lado == 1 else -1
                cubre = [(o['Y'] - B / 2 - y, o['Y'] + B / 2 - y) for o in mismos if abs((o['X'] - x) - s * A) < TOL]
                muros.append(resta(-B / 2, B / 2, cubre))
        arriba = [sbox(o['X'] - A / 2 - x, o['Y'] - B / 2 - y, o['X'] + A / 2 - x, o['Y'] + B / 2 - y)
                  for o in por_nivel[c['k'] + 1] if abs(o['X'] - x) < A - TOL and abs(o['Y'] - y) < B - TOL]
        tapa = sbox(-A / 2, -B / 2, A / 2, B / 2)
        if arriba:
            tapa = tapa.difference(unary_union(arriba))
        # la losa del entrepiso (0.60, a ras de la tapa) ya cubre casi todas: sólo queda lo que ella no tapa
        ent = entrepisos.get(round(Z0 + DZ + c['k'] * PASO + H, 2))
        if ent is not None and not tapa.is_empty:
            ex, ey = (eg, sg), (-sg, eg)
            huella = Polygon([(c['c'][0] + DU + ex[0] * lx + ey[0] * ly, c['c'][1] + DV + ex[1] * lx + ey[1] * ly) for lx, ly in ((-A / 2, -B / 2), (A / 2, -B / 2), (A / 2, B / 2), (-A / 2, B / 2))])
            if huella.intersection(ent).area >= 0.95 * huella.area:
                tapa = sbox(0, 0, 0, 0)
        polis = []
        geoms = getattr(tapa, 'geoms', [tapa])
        for gm in geoms:
            if gm.is_empty or gm.area < 0.05:
                continue
            gm = gm.simplify(0.01)
            pts = list(gm.exterior.coords)[:-1]
            polis.append(pts)
        c['muros'], c['tapa'] = muros, polis
        c['u'] = c['c'][0] + DU
        c['v'] = c['c'][1] + DV

    shell = [c for c in cajas if c['tapa'] or any(c['muros'])]
    print('con cara exterior', len(shell), 'de', len(cajas))
    caras = sum(len(c['tapa']) + sum(len(m) for m in c['muros']) for c in shell)
    print('caras del shell', caras, '(cajas completas:', len(cajas) * 5, ')')

    # caras en coordenadas del diagrama (u, v, z), con normal
    ex = (eg, sg)
    ey = (-sg, eg)
    Zb = Z0 + DZ

    def uv(c, lx, ly):
        return (c['u'] + ex[0] * lx + ey[0] * ly, c['v'] + ex[1] * lx + ey[1] * ly)

    NORMALES = [(-ey[0], -ey[1]), ex, ey, (-ex[0], -ex[1])]
    for c in shell:
        z0 = Zb + c['k'] * PASO
        z1 = z0 + H
        c['z0d'] = z0
        lista = []
        for lado, ints in enumerate(c['muros']):
            for s0, s1 in ints:
                if lado == 0:
                    a, b = uv(c, s0, -B / 2), uv(c, s1, -B / 2)
                elif lado == 2:
                    a, b = uv(c, s0, B / 2), uv(c, s1, B / 2)
                elif lado == 1:
                    a, b = uv(c, A / 2, s0), uv(c, A / 2, s1)
                else:
                    a, b = uv(c, -A / 2, s0), uv(c, -A / 2, s1)
                lista.append((NORMALES[lado], [(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)]))
        for pts in c['tapa']:
            lista.append(((0, 0, 1), [(*uv(c, p[0], p[1]), z1) for p in pts]))
        c['caras'] = lista

    # 2. Visibilidad por grado, a varias alturas de cámara (la cámara sube y
    # baja): cada grado guarda la unión de lo visible a esas alturas.
    n = len(shell)
    vis_alt = {}
    for elev, paso in ELEVACIONES:
        vis_grado = vis_alt.setdefault(elev, [set() for _ in range(360)])
        sp, cp = math.sin(math.radians(elev)), math.cos(math.radians(elev))
        for az in range(0, 360, paso):
            a = math.radians(az)
            ct, st = math.cos(a), math.sin(a)
            orden = sorted(range(n), key=lambda i: (-(shell[i]['u'] * st + shell[i]['v'] * ct), shell[i]['z0d']))
            polis = []
            xs, ys = [], []
            for i in orden:
                for nrm, pts in shell[i]['caras']:
                    if len(nrm) == 2 and nrm[0] * st + nrm[1] * ct >= -1e-6:
                        continue      # mira hacia atrás
                    pp = [(p[0] * ct - p[1] * st, -(p[0] * st + p[1] * ct) * sp - p[2] * cp) for p in pts]
                    polis.append((i, pp))
                    xs += [q[0] for q in pp]
                    ys += [q[1] for q in pp]
            x0, y0 = min(xs) - 2, min(ys) - 2
            w = int((max(xs) + 2 - x0) / PX) + 1
            h = int((max(ys) + 2 - y0) / PX) + 1
            img = Image.new('I', (w, h), 0)
            d = ImageDraw.Draw(img)
            for i, pp in polis:
                d.polygon([((q[0] - x0) / PX, (q[1] - y0) / PX) for q in pp], fill=i + 1)
            ids, cuenta = np.unique(np.asarray(img), return_counts=True)
            ve = {int(k) - 1 for k, c in zip(ids, cuenta) if k > 0 and c >= MIN_PX}
            for g in range(az, az + paso):
                vis_grado[g % 360] |= ve
        print('  altura', elev, 'visibles por grado: mín', min(map(len, vis_grado)), 'máx', max(map(len, vis_grado)))

    # por banda de altura (cámara baja / alta; se comparte la de 30°): por
    # sector de azimut, la unión con su margen
    sectores = {}
    for banda, alturas in BANDAS.items():
        sectores[banda] = []
        for s0 in range(0, 360, SECTOR):
            u = set()
            for elev in alturas:
                for g in range(s0 - MARGEN, s0 + SECTOR + MARGEN):
                    u |= vis_alt[elev][g % 360]
            bits = bytearray((n + 7) // 8)
            for i in u:
                bits[i >> 3] |= 1 << (i & 7)
            sectores[banda].append(base64.b64encode(bytes(bits)).decode())
        print('  banda', banda, 'cajas por sector: mín', min(bin(int.from_bytes(base64.b64decode(x), 'little')).count('1') for x in sectores[banda]),
              'máx', max(bin(int.from_bytes(base64.b64decode(x), 'little')).count('1') for x in sectores[banda]))
    vistas = set().union(*(v for vs in vis_alt.values() for v in vs))
    print('cajas del shell que nunca se ven', n - len(vistas))

    # 3. Salida
    def r2(x):
        return round(x, 2)

    def caja_js(c):
        muros = []
        for lado, ints in enumerate(c['muros']):
            L = A / 2 if lado in (0, 2) else B / 2
            if not ints:
                muros.append(0)
            elif len(ints) == 1 and abs(ints[0][0] + L) < TOL and abs(ints[0][1] - L) < TOL:
                muros.append(1)
            else:
                muros.append([r2(v) for iv in ints for v in iv])
        if not c['tapa']:
            tapa = 0
        elif len(c['tapa']) == 1 and abs(sbox(-A / 2, -B / 2, A / 2, B / 2).area - abs(_area(c['tapa'][0]))) < 0.01:
            tapa = 1
        else:
            tapa = [[r2(v) for p in pts for v in p] for pts in c['tapa']]
        tipo = len(CAPAS) if c.get('comercio') else CAPAS.index(c['capa'])
        return [r2(c['u']), r2(c['v']), c['k'], tipo] + muros + [tapa]

    # 4. Juntas: las aristas entre caras coplanares de módulos del mismo
    # departamento no se dibujan; sólo se marca el cambio de departamento.
    cajas_js = [caja_js(c) for c in shell]
    LADOS = [(0, -B / 2, A / 2), (1, A / 2, B / 2), (0, B / 2, A / 2), (1, -A / 2, B / 2)]   # eje del tramo, coordenada fija, medio largo

    def aristas(c, js):
        """(código, plano, p, q) de cada arista de cada cara, en el orden en que
        el navegador arma las caras; código = cara × 100 + número de arista."""
        X, Y = c['X'], c['Y']
        out = []
        for i, (eje, fijo, L) in enumerate(LADOS):
            m = js[4 + i]
            if not m:
                continue
            t = [-L, L] if m == 1 else m
            plano = ('muro', i, round((X + fijo) if eje else (Y + fijo), 2))
            for k in range(0, len(t), 2):
                a = (fijo, t[k]) if eje else (t[k], fijo)
                b = (fijo, t[k + 1]) if eje else (t[k + 1], fijo)
                pts = [(a, 0), (b, 0), (b, H), (a, H)]
                for e in range(4):
                    (p, zp), (q, zq) = pts[e], pts[(e + 1) % 4]
                    out.append((i * 100 + 2 * k + e, plano, (X + p[0], Y + p[1], zp), (X + q[0], Y + q[1], zq)))
        tp = js[8]
        polis = [[-A / 2, -B / 2, A / 2, -B / 2, A / 2, B / 2, -A / 2, B / 2]] if tp == 1 else (tp or [])
        n = 0
        for pl in polis:
            pts = [(pl[j], pl[j + 1]) for j in range(0, len(pl), 2)]
            for j in range(len(pts)):
                p, q = pts[j], pts[(j + 1) % len(pts)]
                out.append((400 + n, ('tapa',), (X + p[0], Y + p[1], H), (X + q[0], Y + q[1], H)))
                n += 1
        return out

    def recta(p, q):
        eje = max(range(3), key=lambda j: abs(q[j] - p[j]))
        fijo = tuple(p[j] for j in range(3) if j != eje)
        return eje, fijo, min(p[eje], q[eje]), max(p[eje], q[eje])

    grupos = defaultdict(list)
    for n, (c, js) in enumerate(zip(shell, cajas_js)):
        d = c['depto']   # el departamento es el objeto del Rhino
        for cod, plano, p, q in aristas(c, js):
            grupos[(d, plano)].append((n, cod, p, q, recta(p, q)))
    quita = defaultdict(list)
    juntas = parciales = 0
    for lista in grupos.values():
        for n, cod, p, q, (eje, fijo, lo, hi) in lista:
            cubre = [(o[4][2], o[4][3]) for o in lista
                     if o[0] != n and o[4][0] == eje and all(abs(f - g) < 0.05 for f, g in zip(o[4][1], fijo))]
            if not cubre:
                continue
            quedan = resta(lo, hi, sorted(cubre))
            if quedan == [(lo, hi)]:
                continue
            if not quedan:
                quita[n].append(cod)
                juntas += 1
                continue
            # tramos que sí se dibujan, como fracción de p a q
            t = sorted(((a - p[eje]) / (q[eje] - p[eje]), (b - p[eje]) / (q[eje] - p[eje])) for a, b in quedan)
            quita[n].append([cod] + [round(v, 3) for iv in t for v in sorted(iv)])
            parciales += 1
    for n, js in enumerate(cajas_js):
        js.append(sorted(quita[n], key=lambda x: x if isinstance(x, int) else x[0]) or 0)
        if shell[n]['abre']:
            js.append(shell[n]['abre'])
    print('juntas sin dibujar', juntas, '· aristas cortadas en parte', parciales)

    datos = {
        'giro': round(math.degrees(giro), 4), 'a': A, 'b': B, 'alto': H, 'paso': PASO, 'z0': round(Zb, 2),
        'tipos': CAPAS + ['comercio'], 'sector': SECTOR, 'banda': CORTE_BANDA,
        'cajas': cajas_js,
        'sectores': sectores,
        'industria': industria(),
        'chimenea': chimenea(),
    }
    cuenta = Counter(c['capa'] for c in cajas)
    cab = ('/* Módulos de vivienda. Generado por herramientas/prepara-modulos.py: no editar a mano.\n'
           '   Fuente: ponerestructura_LRFD_v2.3dm, capas Módulos::' + ', '.join(CAPAS + [CAPA_COMERCIO]) + ' (partidos en módulos); industria de Contexto.3dm.\n'
           '   alto = módulo (2.70); paso = de nivel a nivel (3.30: 0.60 de entrepiso); z0 = primer nivel.\n'
           '   ' + str(len(cajas)) + ' módulos (' + ', '.join('%s %d' % (k, cuenta[k]) for k in CAPAS + [CAPA_COMERCIO]) + '); '
           'aquí sólo los ' + str(len(shell)) + ' con alguna cara al exterior, y sólo esas caras.\n'
           '   cajas: [u, v, nivel, tipo, muro −Y, muro +X, muro +Y, muro −X, tapa, juntas(, abiertas)]; muro 1 = completo,\n'
           '   0 = tapado, lista = tramos descubiertos (coordenadas locales). juntas: aristas que no se\n'
           '   dibujan por ser del mismo departamento (cara × 100 + arista; cara 0-3 muros, 4 tapa), o\n'
           '   [código, t0, t1, …] con los tramos que sí se dibujan. sectores {baja, alta}: bits de las\n'
           '   cajas visibles desde cada sector de ' + str(SECTOR) + '° de azimut, con la cámara bajo o sobre\n'
           '   ' + str(CORTE_BANDA) + '° de altura. Tipo comercio: junto al aro, con las caras de la lista\n'
           '   «abiertas» (0-3) hacia él; los que estorbaban su paso ya no están. */\n')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write(cab + 'window.ATLAMPA_MODULOS = ' + json.dumps(datos, separators=(',', ':')) + ';\n')
    print('escrito', SALIDA, os.path.getsize(SALIDA), 'bytes')


def _area(pts):
    s = 0
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        s += a[0] * b[1] - b[0] * a[1]
    return s / 2


if __name__ == '__main__':
    main()

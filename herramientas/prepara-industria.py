"""Industria (geometría del usuario en Rhino) → atlampa-industria.js.

    python herramientas/prepara-industria.py             (desde diagrama/)
    python herramientas/prepara-industria.py --calce     además mide el calce contra Contexto.3dm
    python herramientas/prepara-industria.py --capas     sólo lista las capas y los objetos del .3dm
    python herramientas/prepara-industria.py archivo.3dm usa otro archivo

Fuente: la entrega más reciente de industry_geometry/upload/industria_upload_NNN.3dm (carpeta hermana de
diagrama/; sólo lectura) o, si no está, modelo/Industria.3dm. Milímetros y las coordenadas de Contexto.3dm: se pasa al
visor con la transformación general (la del mercado): u = x/1000 + 503.255, v = y/1000 + 404.153, z = z/1000 + 0.11
(ver handoff/procesos/sitio-y-coordenadas.md). El .3dm no va al repo.

Se lee la capa industry_claude::volumen (muros de fachada y de celosía por nivel, losas, cantos de volado, chacuacos y
chimenea) y la capa industry_claude::trazo (zonas de planta baja). No se dibuja la capa referencia. El archivo se
guarda SIN mallas de render, así que cada Brep se triangula aquí desde su topología: todas las aristas son rectas, las
caras planas (con huecos las losas) se triangulan con shapely y las 57 caras alabeadas (una por chacuaco, de 4
esquinas) como parche bilineal.

Calce (decisión del usuario, 2026-10-13): la geometría va a −10° y sólo se trasladó (centroide sobre centroide) a la
industria existente de Contexto.3dm, que está a −8.99°; las esquinas difieren hasta 47.5 cm. La regla de < 1 cm vale
para el centroide (--calce lo mide). PB ±0.00 = 0.00 de Contexto (el prisma anterior del visor arrancaba en +0.40).
"""
import glob
import json
import math
import os
import re
import sys
from collections import OrderedDict, defaultdict

import numpy as np
import rhino3dm as r
import shapely
from shapely.geometry import Polygon

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
UPLOADS = os.path.join(os.path.dirname(RAIZ), 'industry_geometry', 'upload')
MODELO = os.path.join(RAIZ, 'modelo', 'Industria.3dm')
CONTEXTO = os.path.join(RAIZ, 'modelo', 'Contexto.3dm')
SALIDA = os.path.join(RAIZ, 'atlampa-industria.js')

DX, DY, DZ = 503.255, 404.153, 0.11      # Rhino (mm → m) → diagrama, como el mercado y el sitio
CAPA_VOLUMEN, CAPA_TRAZO, CAPA_REF = 'industry_claude::volumen', 'industry_claude::trazo', 'industry_claude::referencia'
PRISMA = 'industry_bake - Copy'          # la industria de Contexto.3dm (referencia del calce)
TOL_CENTROIDE = 0.01                     # m
NIVELES = ('PB', 'N1', 'N2')

# ============ partes (para aislar en el visor): del nombre del objeto ============
# (patrón del nombre, clave, rótulo). El primero que coincide.
PARTES = [
    (r'^MURO_fachada_(PB|N1|N2)', 'muros_{0}', 'Muros {0}'),
    (r'^MURO_celosia_.*_(PB|N1|N2)(_\d+)?$', 'celosias_{0}', 'Celosías {0}'),
    (r'^LOSA_piso_(N1|N2)', 'losa_{0}', 'Losa {0}'),
    (r'^LOSA_azotea', 'losa_azotea', 'Losa de azotea'),
    (r'^CANTO_volado', 'cantos', 'Cantos de volado'),
    (r'^CHACUACO_(ALTO|MEDIO|BAJO)', 'chacuacos_{0}', 'Chacuacos {0}'),
    (r'^CHIMENEA', 'chimenea', 'Chimenea'),
]


def parte_de(nombre):
    for pat, clave, rotulo in PARTES:
        m = re.match(pat, nombre)
        if m:
            g = [x.lower() if clave.startswith('chacuacos') else x for x in m.groups()]
            return clave.format(*g), rotulo.format(*[x.capitalize() if rotulo.startswith('Chacuacos') else x for x in m.groups()])
    return None, None


def busca_fuente(arg):
    if arg:
        return arg
    ups = sorted(glob.glob(os.path.join(UPLOADS, 'industria_upload_*.3dm')))
    if ups:
        return ups[-1]
    if os.path.exists(MODELO):
        return MODELO
    sys.exit('No hay entrega en %s ni %s: pasa la ruta del .3dm.' % (UPLOADS, MODELO))


def al_diagrama(p):
    return (p[0] / 1000 + DX, p[1] / 1000 + DY, p[2] / 1000 + DZ)


# ============ triangulación de Breps ============
def vertices_lazo(g, lazo):
    return [np.array([g.Vertices[t.StartVertexIndex].Location.X, g.Vertices[t.StartVertexIndex].Location.Y,
                      g.Vertices[t.StartVertexIndex].Location.Z]) for t in lazo.Trims]


def normal_cara(f):
    """Normal de Rhino de la cara (con su orientación) en el centro del dominio."""
    a, b = f.Domain(0), f.Domain(1)
    n = f.NormalAt((a.T0 + a.T1) / 2, (b.T0 + b.T1) / 2)
    n = np.array([n.X, n.Y, n.Z])
    return -n if f.OrientationIsReversed else n


def newell(P):
    n = np.zeros(3)
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        n += np.array([(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])])
    return n


def orienta(tri, n):
    a, b, c = tri
    return tri if np.dot(np.cross(b - a, c - a), n) >= 0 else (a, c, b)


def triangulos_cara(g, f):
    lazos = list(f.Loops)
    exterior = f.OuterLoop
    polis = [vertices_lazo(g, l) for l in lazos]
    ext = vertices_lazo(g, exterior)
    n_rh = normal_cara(f)
    if not f.IsPlanar(1e-3):
        if len(ext) != 4:
            raise ValueError('cara alabeada que no es de 4 esquinas')
        p00, p10, p11, p01 = ext   # parche bilineal en 4 × 4
        N = 4
        P = lambda s, t: (1 - s) * (1 - t) * p00 + s * (1 - t) * p10 + s * t * p11 + (1 - s) * t * p01
        out = []
        for i in range(N):
            for j in range(N):
                a, b, c, d = P(i / N, j / N), P((i + 1) / N, j / N), P((i + 1) / N, (j + 1) / N), P(i / N, (j + 1) / N)
                out += [orienta((a, b, c), n_rh), orienta((a, c, d), n_rh)]
        return out
    n = newell(ext)
    n /= np.linalg.norm(n)
    e1 = np.cross(n, [0, 0, 1.0] if abs(n[2]) < 0.9 else [1.0, 0, 0])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(n, e1)
    o = ext[0]
    plano = lambda P: [((p - o) @ e1, (p - o) @ e2) for p in P]
    huecos = [plano(p) for l, p in zip(lazos, polis) if l is not exterior and l.LoopType == r.BrepLoopType.Inner]
    pol = Polygon(plano(ext), huecos).buffer(0)
    out = []
    for t in getattr(shapely.constrained_delaunay_triangles(pol), 'geoms', []):
        q = list(t.exterior.coords)[:3]
        out.append(orienta(tuple(o + x * e1 + y * e2 for x, y in q), n_rh))
    return out


def triangulos(g):
    out = []
    for f in g.Faces:
        out += triangulos_cara(g, f)
    return out


# ============ lectura ============
def abre(ruta):
    m = r.File3dm.Read(ruta)
    if m is None:
        sys.exit('no se pudo leer ' + ruta)
    return m, {l.Index: l.FullPath for l in m.Layers}


def lista_capas(m, capas):
    cuenta = defaultdict(int)
    for o in m.Objects:
        cuenta[capas[o.Attributes.LayerIndex]] += 1
    print('capas del archivo (objetos):')
    for l in sorted(capas.values()):
        marca = '→ ' if l in (CAPA_VOLUMEN, CAPA_TRAZO) else '  '
        print('  %s%s (%d)' % (marca, l, cuenta.get(l, 0)))
    print('Las capas con → son las que lee el script.')


def centroide_planta(tris):
    """Centroide (x, y) ponderado por área de las caras horizontales de abajo (mm)."""
    zmin = min(p[2] for t in tris for p in t)
    A, C = 0.0, np.zeros(2)
    for a, b, c in tris:
        if all(abs(p[2] - zmin) < 1 for p in (a, b, c)):
            u, v = (b - a)[:2], (c - a)[:2]
            ar = abs(u[0] * v[1] - u[1] * v[0]) / 2
            A += ar
            C += ar * (a + b + c)[:2] / 3
    return C / A, A


def calce(m, capas):
    """Centroide de la huella (REF_volumen_original de la entrega) contra la industria de Contexto.3dm: < 1 cm."""
    if not os.path.exists(CONTEXTO):
        print('calce: no está', CONTEXTO)
        return
    ref = [o for o in m.Objects if o.Attributes.Name.startswith('REF_volumen_original') and isinstance(o.Geometry, r.Brep)]
    c, cc = abre(CONTEXTO)
    pr = [o for o in c.Objects if cc[o.Attributes.LayerIndex] == PRISMA]
    if not ref or not pr:
        print('calce: faltan REF_volumen_original (entrega) o', PRISMA, '(Contexto)')
        return
    ca, aa = centroide_planta(triangulos(ref[0].Geometry))
    cb, ab = centroide_planta(triangulos(pr[0].Geometry))
    d = math.dist(ca, cb) / 1000
    print('huella de la entrega: centroide (%.1f, %.1f) mm · %.3f m²' % (ca[0], ca[1], aa / 1e6))
    print('huella de Contexto:   centroide (%.1f, %.1f) mm · %.3f m²' % (cb[0], cb[1], ab / 1e6))
    print('diferencia de centroides: %.1f mm → %s' % (d * 1000, 'OK (< 1 cm)' if d < TOL_CENTROIDE else 'NO CALZA (> 1 cm)'))
    print('(el giro −10° contra −8.99° de Contexto es decisión del usuario: las esquinas difieren hasta ~47 cm)')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    fuente = busca_fuente(args[0] if args else None)
    m, capas = abre(fuente)
    if 'Millimeters' not in str(m.Settings.ModelUnitSystem):
        sys.exit('se esperaban milímetros: %s' % m.Settings.ModelUnitSystem)
    print('fuente', fuente)
    if '--capas' in sys.argv:
        lista_capas(m, capas)
        return
    if '--calce' in sys.argv:
        calce(m, capas)

    partes = OrderedDict()
    sin_parte, fallas = [], []
    for o in m.Objects:
        if capas[o.Attributes.LayerIndex] != CAPA_VOLUMEN:
            continue
        nombre = o.Attributes.Name
        clave, rotulo = parte_de(nombre)
        if not clave:
            sin_parte.append(nombre)
            continue
        try:
            tris = triangulos(o.Geometry)
        except Exception as e:
            fallas.append((nombre, str(e)))
            continue
        p = partes.setdefault(clave, {'nombre': rotulo, 'objetos': 0, 't': []})
        p['objetos'] += 1
        p['t'].extend(tuple(al_diagrama(v) for v in t) for t in tris)

    trazo = []
    for o in m.Objects:
        if capas[o.Attributes.LayerIndex] == CAPA_TRAZO and isinstance(o.Geometry, r.PolylineCurve):
            pts = [al_diagrama((o.Geometry.Point(i).X, o.Geometry.Point(i).Y, o.Geometry.Point(i).Z)) for i in range(o.Geometry.PointCount)]
            trazo.append({'n': o.Attributes.Name, 'p': [round(c, 3) for q in pts for c in q]})

    todas = [v for p in partes.values() for t in p['t'] for v in t]
    bbox = [[round(min(v[k] for v in todas), 3) for k in range(3)], [round(max(v[k] for v in todas), 3) for k in range(3)]]
    datos = {'fuente': os.path.basename(fuente), 'dz': DZ, 'bbox': bbox,
             'partes': OrderedDict((k, {'nombre': p['nombre'], 'tris': [round(c, 3) for t in p['t'] for q in t for c in q]}) for k, p in partes.items()),
             'trazo': trazo}
    js = ('/* Generado por herramientas/prepara-industria.py desde ' + os.path.basename(fuente) + ' (industry_geometry/upload): no editar a mano.\n'
          '   partes[clave] = { nombre, tris (u, v, z de a tres vértices) } (muros y celosías por nivel, losas, cantos, chacuacos,\n'
          '   chimenea); trazo = zonas de planta baja [{ n, p: [u, v, z, …] }]; bbox [[u, v, z], [u, v, z]]. Triangulado desde los\n'
          '   Breps (el archivo no trae mallas de render). */\n'
          'window.ATLAMPA_INDUSTRIA = ' + json.dumps(datos, separators=(',', ':'), ensure_ascii=False) + ';\n')
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    for k, p in partes.items():
        print('%-18s %3d objetos %6d triángulos' % (k, p['objetos'], len(p['t'])))
    print('trazo:', [t['n'] for t in trazo])
    print('bbox del visor: u %.2f–%.2f  v %.2f–%.2f  z %.2f–%.2f' % (bbox[0][0], bbox[1][0], bbox[0][1], bbox[1][1], bbox[0][2], bbox[1][2]))
    if sin_parte:
        print('SIN PARTE (no se dibujan):', sin_parte)
    if fallas:
        print('FALLAS:', fallas)
    print('escrito', SALIDA, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()

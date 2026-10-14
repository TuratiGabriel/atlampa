"""Estructura de acero de la vivienda (ponerestructura_LRFD_v2.3dm) → atlampa-estructura.js.

    python herramientas/prepara-estructura.py [archivo.3dm]      (desde diagrama/)
    python herramientas/prepara-estructura.py --calce            además mide el calce contra Contexto.3dm

Lee el .3dm con rhino3dm (sin abrir Rhino) y guarda los MIEMBROS, no triángulos: cada columna, trabe,
vigueta, amarre y miembro de cubo como su eje (inicio y fin) y su sección (ancho × peralte); el visor
arma las cajas y sus aristas. Además las losas de losacero, los volúmenes de los cubos de circulación y
las áreas de entrepiso (polígonos con hueco). Todo en el marco del diagrama.

El archivo (62 MB) no va al repo: se busca en ../ponerestructura_LRFD_v2.3dm (junto a la carpeta
diagrama/, como el DWG del estacionamiento) o en el modelo/ del repo, o se pasa la ruta.

Capas leídas:
  Estructura::Base::B1…B8::{Columnas, Trabes U, Trabes V, Viguetas (losacero), Amarre planta libre (opcional)}
  Estructura::Cubos de circulacion::B1…B8::{Estructura del cubo, Elevadores (volumen), Escalera (volumen)}
  Estructura::Losacero 12 cm (referencia)::B1…B8
  Módulos::entrepiso
NO se leen (a propósito, 2026-10-13, el usuario): «Estructura::Indicadores - no alcanza (cubo rojo)» (354 cubos con
el índice de uso > 1; quedan en el .3dm), los elevadores, TODOS (2026-10-13: su volumen «Cubos de circulacion::Bn::Elevadores
(volumen)» y los 704 miembros de «Estructura del cubo» con cubo = elevadores; quedan las escaleras) ni site::polygon. Los módulos van por prepara-modulos.py.

Marco: el archivo está en METROS y en el marco de «nuevos bloques» (el mismo de prepara-modulos.py):
  u = x + 497.9956, v = y + 392.0994, z = z + 7.16
medido el 2026-10-13: en planta Contexto = archivo + (−5.2594, −12.0536) m (130 módulos emparejados con
residuo 0; el polígono del predio coincide), y en altura el suelo del archivo (−6.96) es el +0.09 de
Contexto: +7.05 m (+7.16 en el visor). Los niveles NO coinciden con los de los módulos del visor: los
del archivo suben cada 3.30 m (3.68, 6.98, 10.28 …) y los de Contexto cada 3.00 (7.88, 10.88 …).
"""
import json
import math
import os
import re
import sys
from collections import defaultdict

import numpy as np
import rhino3dm as r

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
NOMBRE = 'ponerestructura_LRFD_v2.3dm'
CONTEXTO = os.path.join(RAIZ, 'modelo', 'Contexto.3dm')
SALIDA = os.path.join(RAIZ, 'atlampa-estructura.js')

# archivo (m) → diagrama (m)
DU, DV, DZ = 497.99562, 392.09942, 7.1601
GIRO = -10.0                              # los miembros van en la retícula girada de la vivienda
EU = np.array([math.cos(math.radians(GIRO)), math.sin(math.radians(GIRO)), 0.0])
EV = np.array([-math.sin(math.radians(GIRO)), math.cos(math.radians(GIRO)), 0.0])
Z = np.array([0.0, 0.0, 1.0])

# tipo del atributo «tipo» de cada objeto → grupo que se dibuja
TIPOS = ('columna', 'cubo_columna', 'trabe_u', 'trabe_v', 'cubo_trabe', 'amarre', 'vigueta', 'cubo_diag')
BLOQUES = ['B%d' % k for k in range(1, 9)]


def busca_fuente(arg):
    for ruta in ([arg] if arg else []) + [os.path.join(os.path.dirname(RAIZ), NOMBRE), os.path.join(RAIZ, 'modelo', NOMBRE)]:
        if ruta and os.path.exists(ruta):
            return ruta
    sys.exit('Falta %s: copia el archivo junto a la carpeta diagrama/ o pasa su ruta.' % NOMBRE)


def al_diagrama(p):
    return np.array([p[0] + DU, p[1] + DV, p[2] + DZ])


def punto(p):
    return np.array([p.X, p.Y, p.Z])


def seccion_texto(us):
    """(ancho, peralte) de la sección según el atributo seccion_m «0.166 x 0.528»."""
    m = re.match(r'\s*([\d.]+)\s*x\s*([\d.]+)', us.get('seccion_m') or '')
    return (float(m.group(1)), float(m.group(2))) if m else None


def marco(a):
    """Ejes de la sección de un miembro con eje a (unitario): s horizontal ⟂ al eje, n el otro.
    En una columna s es el eje u de la retícula. (El visor arma las cajas igual.)"""
    if abs(a[2]) > 0.999:
        return EU, EV
    s = np.cross(Z, a); s /= np.linalg.norm(s)
    return s, np.cross(a, s)


def miembro(o, g):
    """[u0, v0, z0, u1, v1, z1, ancho, peralte] del miembro, en el marco del diagrama."""
    us = dict(o.Attributes.GetUserStrings())
    p0, p1 = al_diagrama(punto(g.PathStart)), al_diagrama(punto(g.PathEnd))
    a = p1 - p0
    L = np.linalg.norm(a)
    a = a / L
    s, n = marco(a)
    m = g.GetMesh(r.MeshType.Any)
    if m is not None:
        P = np.array([al_diagrama((v.X, v.Y, v.Z)) for v in m.Vertices])
        w, h = float(np.ptp(P @ s)), float(np.ptp(P @ n))
    else:                                    # los amarres no guardaron malla: sale del atributo
        w, h = seccion_texto(us)
    return [p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], w, h], us, L, (w, h)


def caja_girada(g):
    """[u, v, z0, z1, du, dv] de un cajón alineado con la retícula (losacero, volúmenes de cubos)."""
    P = np.array([al_diagrama(punto(v.Location)) for v in g.Vertices])
    pu, pv = P @ EU, P @ EV
    c = (P.min(0) + P.max(0)) / 2
    cu, cv = (pu.min() + pu.max()) / 2, (pv.min() + pv.max()) / 2
    return [cu * EU[0] + cv * EV[0], cu * EU[1] + cv * EV[1], P[:, 2].min(), P[:, 2].max(), pu.max() - pu.min(), pv.max() - pv.min()]


def poli_perfil(g, i):
    c = g.Profile3d(i, 0.0)
    if c is None:
        return None
    pts = [al_diagrama(punto(c.Point(k))) for k in range(c.PointCount)]
    if np.linalg.norm(pts[0] - pts[-1]) < 1e-6:
        pts = pts[:-1]
    return [round(float(q), 3) for p in pts for q in p[:2]]


def r3(x):
    return round(float(x), 3)


def calce(m, capas):
    """Mide el calce contra Contexto.3dm: el polígono del predio (site::polygon) debe coincidir (< 1 cm)."""
    if not os.path.exists(CONTEXTO):
        print('calce: no está', CONTEXTO)
        return
    c = r.File3dm.Read(CONTEXTO)
    cc = {l.Index: l.FullPath for l in c.Layers}

    def caja(f, k, nom, caps):
        for o in f.Objects:
            if caps[o.Attributes.LayerIndex] == nom:
                b = o.Geometry.GetBoundingBox()
                return np.array([b.Min.X, b.Min.Y, b.Min.Z, b.Max.X, b.Max.Y, b.Max.Z]) * k
    a = caja(m, 1.0, 'site::polygon', capas)
    b = caja(c, 0.001, 'site::polygon', cc)
    d = b - a
    print('site::polygon  Contexto − archivo (m):', np.round(d, 4), '→ dx %.4f dy %.4f dz %.4f' % (d[0], d[1], d[2]))
    print('constantes del script: dx %.4f dy %.4f dz %.4f' % (DU - 503.255, DV - 404.153, DZ - 0.11))
    e = [abs(d[0] - (DU - 503.255)), abs(d[1] - (DV - 404.153)), abs(d[2] - (DZ - 0.11))]
    print('diferencia (mm): x %.1f  y %.1f  z %.1f → %s' % (e[0] * 1000, e[1] * 1000, e[2] * 1000, 'OK (< 1 cm)' if max(e) < 0.01 else 'NO CALZA'))


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    fuente = busca_fuente(args[0] if args else None)
    m = r.File3dm.Read(fuente)
    if m is None:
        sys.exit('no se pudo leer ' + fuente)
    if 'Meters' not in str(m.Settings.ModelUnitSystem):
        sys.exit('el archivo no está en metros: %s' % m.Settings.ModelUnitSystem)
    capas = {l.Index: l.FullPath for l in m.Layers}
    if '--calce' in sys.argv:
        calce(m, capas)

    por_bloque = {b: defaultdict(list) for b in BLOQUES}
    losas = {b: [] for b in BLOQUES}
    cubos = {b: [] for b in BLOQUES}
    entrepiso = []
    cuenta = defaultdict(int)
    err_long, err_sec, saltados = 0.0, 0.0, defaultdict(int)
    for o in m.Objects:
        lp = capas[o.Attributes.LayerIndex]
        p = lp.split('::')
        g = o.Geometry
        if lp.startswith('Estructura::Base::') or lp.endswith('::Estructura del cubo'):
            if not isinstance(g, r.Extrusion):
                saltados[lp] += 1
                continue
            bl = p[2] if lp.startswith('Estructura::Base::') else p[2]
            t = o.Attributes.GetUserString('tipo')
            if o.Attributes.GetUserString('cubo') == 'elevadores':   # sin elevadores: ni su estructura (704 miembros) ni su volumen
                saltados['cubos de elevadores (a propósito)'] += 1
                continue
            if t not in TIPOS or bl not in por_bloque:
                saltados[lp] += 1
                continue
            fila, us, L, (w, h) = miembro(o, g)
            por_bloque[bl][t].append([r3(x) for x in fila])
            cuenta[t] += 1
            # verificación contra los atributos del archivo
            if us.get('longitud_m'):
                err_long = max(err_long, abs(L - float(us['longitud_m'])))
            sec = seccion_texto(us)
            if sec:
                err_sec = max(err_sec, abs(w - sec[0]), abs(h - sec[1]))
        elif lp.startswith('Estructura::Losacero 12 cm') and isinstance(g, r.Brep):
            losas[p[-1]].append([r3(x) for x in caja_girada(g)])
            cuenta['losacero'] += 1
        elif lp.startswith('Estructura::Cubos de circulacion::') and isinstance(g, r.Brep) and not p[3].startswith('Elevadores'):
            cubos[p[2]].append([p[3].split(' ')[0].lower()] + [r3(x) for x in caja_girada(g)])
            cuenta['volumen de cubo'] += 1
        elif lp == 'Módulos::entrepiso' and isinstance(g, r.Extrusion):
            z0, z1 = r3(g.PathStart.Z + DZ), r3(g.PathEnd.Z + DZ)
            perfiles = [poli_perfil(g, i) for i in range(g.ProfileCount)]
            entrepiso.append([min(z0, z1), max(z0, z1)] + [q for q in perfiles if q])
            cuenta['entrepiso'] += 1
    datos = {'fuente': os.path.basename(fuente), 'giro': GIRO, 'dz': DZ,
             'bloques': {b: {'miembros': dict(por_bloque[b]), 'losas': losas[b], 'cubos': cubos[b]} for b in BLOQUES},
             'entrepiso': entrepiso}
    js = ('/* Estructura de acero de la vivienda. Generado por herramientas/prepara-estructura.py desde ' + os.path.basename(fuente) + ': no editar a mano.\n'
          '   PREDIMENSIONAMIENTO (LRFD v2): todo es orden de magnitud. Marco del diagrama (u, v, z). bloques[Bn]:\n'
          '   miembros[tipo] = [u0, v0, z0, u1, v1, z1, ancho, peralte] (eje de inicio a fin; sección centrada en el eje;\n'
          '   ancho horizontal, peralte ⟂ al eje), tipo = columna | cubo_columna | trabe_u | trabe_v | cubo_trabe |\n'
          '   cubo_diag | amarre | vigueta; losas = [u, v, z0, z1, du, dv] (losacero de 12 cm, caja girada a «giro»);\n'
          '   cubos = [cubo, u, v, z0, z1, du, dv] (volumen de escalera). entrepiso = [z0, z1, contorno [u, v, …],\n'
          '   huecos…]. No incluye los indicadores «no alcanza». */\n'
          'window.ATLAMPA_ESTRUCTURA = ' + json.dumps(datos, separators=(',', ':')) + ';\n')
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('miembros', dict(cuenta))
    print('por bloque (miembros):', {b: sum(len(v) for v in por_bloque[b].values()) for b in BLOQUES})
    print('verificación contra atributos del archivo: longitud máx. %.1f mm · sección máx. %.1f mm' % (err_long * 1000, err_sec * 1000))
    if saltados:
        print('saltados:', dict(saltados))
    print('escrito', SALIDA, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()

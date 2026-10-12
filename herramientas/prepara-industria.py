"""Industria (el programa del compañero de Gabriel en Rhino) → atlampa-industria.js.

    python herramientas/prepara-industria.py            (desde diagrama/)
    python herramientas/prepara-industria.py --capas    sólo lista las capas y los objetos del .3dm
    python herramientas/prepara-industria.py --calce    además mide el calce contra Contexto.3dm

Lee modelo/Industria.3dm con rhino3dm (sin abrir Rhino), en el MISMO sistema de
coordenadas de Contexto.3dm, y saca las mallas de render guardadas en el archivo
de las capas
  Layer 01::INDUSTRIA::<nave>::<parte>      (p. ej. …::nave 1::muros, …::cubierta)
Cada <nave> y cada <parte> pasan tal cual al visor: son las piezas que se aíslan
(muros por lado, cubierta por faldón…). Un objeto en …::INDUSTRIA::<parte> (sin
nave) cae en la nave «general».

Paso 1 (lo existente tal cual): se copia TAL CUAL de Rhino, sin recortes ni
propuestas. La estructura de acero y el programa interior vienen después, en un
bloque PROPUESTA — todo editable, como en prepara-mercado.py.

Sistema: Rhino (mm) → diagrama (m): u = x + 503.255, v = y + 404.153 (el mismo que
el mercado y el sitio; ver handoff/procesos/sitio-y-coordenadas.md) y z = z + 0.11
(el 0.00 de Rhino es z 0.11 en el visor).
"""
import argparse
import json
import math
import os
import sys

import rhino3dm as r

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
MODELO = os.path.join(RAIZ, 'modelo')
FUENTE = os.path.join(MODELO, 'Industria.3dm')
CONTEXTO = os.path.join(MODELO, 'Contexto.3dm')
SALIDA = os.path.join(RAIZ, 'atlampa-industria.js')

DX, DY, DZ = 503.255, 404.153, 0.11      # Rhino (mm) → diagrama (m), como el mercado
PREFIJO = 'Layer 01::INDUSTRIA'          # las capas del usuario: PREFIJO::<nave>::<parte>
PRISMA = 'industry_bake - Copy'          # la industria de Contexto.3dm (el prisma del visor): referencia para el calce
TOL_CALCE = 0.01                         # m: lo nuevo debe calzar con Contexto.3dm a < 1 cm


def malla_de(g):
    """Triángulos (en mm) de la malla de render guardada en el archivo."""
    mallas = []
    if isinstance(g, r.Mesh):
        mallas.append(g)
    elif isinstance(g, r.Brep):
        for f in g.Faces:
            m = f.GetMesh(r.MeshType.Any)
            if m:
                mallas.append(m)
    elif isinstance(g, r.Extrusion):
        m = g.GetMesh(r.MeshType.Any)
        if m:
            mallas.append(m)
    tris = []
    for m in mallas:
        V = m.Vertices
        for i in range(len(m.Faces)):
            f = m.Faces[i]
            a, b, c, d = f[0], f[1], f[2], f[3]
            P = [(V[k].X, V[k].Y, V[k].Z) for k in (a, b, c, d)]
            tris.append((P[0], P[1], P[2]))
            if c != d:
                tris.append((P[0], P[2], P[3]))
    return tris


def malla_nueva(g):
    """Si el objeto no guardó malla de render, la calcula (Brep y Extrusion)."""
    if isinstance(g, r.Extrusion):
        g = g.ToBrep(True)
    if not isinstance(g, r.Brep):
        return []
    try:
        ms = r.Mesh.CreateFromBrep(g, r.MeshingParameters.Default)
    except Exception:
        return []
    return [t for m in (ms or []) for t in malla_de(m)]


def al_diagrama(p):
    return (p[0] / 1000 + DX, p[1] / 1000 + DY, p[2] / 1000 + DZ)


def normal(t):
    u = [t[1][k] - t[0][k] for k in range(3)]
    w = [t[2][k] - t[0][k] for k in range(3)]
    n = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
    L = math.sqrt(sum(c * c for c in n))
    return None if L < 1e-12 else tuple(c / L for c in n)


def aristas(tris, umbral=12):
    """Aristas de la malla original: bordes y dobleces de más de umbral grados
    (las mallas de cada cara de Rhino van sueltas: la orientación no cuenta)."""
    def k(p):
        return (round(p[0], 3), round(p[1], 3), round(p[2], 3))
    mapa = {}
    for t in tris:
        n = normal(t)
        if n is None:
            continue
        for i in range(3):
            a, b = k(t[i]), k(t[(i + 1) % 3])
            if a != b:
                mapa.setdefault((a, b) if a < b else (b, a), []).append(n)
    c = math.cos(math.radians(umbral))
    return [e for e, ns in mapa.items()
            if len(ns) == 1 or any(abs(sum(ns[0][j] * n[j] for j in range(3))) < c for n in ns[1:])]


def plano(piezas):
    return [round(c, 3) for t in piezas for p in t for c in p]


def abre(ruta):
    m = r.File3dm.Read(ruta)
    if m is None:
        sys.exit('no se pudo leer ' + ruta)
    return m, {l.Index: l.FullPath for l in m.Layers}


def caja_m(g):
    """Caja (u0, v0, z0, u1, v1, z1) de una geometría, en el marco del diagrama. Sale de
    la malla (la caja de un Brep con superficies curvas viene inflada por sus puntos de control)."""
    P = [al_diagrama(p) for t in (malla_de(g) or malla_nueva(g)) for p in t]
    if not P:
        b = g.GetBoundingBox()
        return al_diagrama((b.Min.X, b.Min.Y, b.Min.Z)) + al_diagrama((b.Max.X, b.Max.Y, b.Max.Z))
    return tuple(min(p[k] for p in P) for k in range(3)) + tuple(max(p[k] for p in P) for k in range(3))


def lista_capas(m, capas):
    cuenta = {}
    for o in m.Objects:
        lp = capas[o.Attributes.LayerIndex]
        cuenta[lp] = cuenta.get(lp, 0) + 1
    print('capas del archivo (objetos):')
    for l in sorted(capas.values()):
        print('  %s%s' % ('→ ' if l.startswith(PREFIJO) else '  ', l), '(%d)' % cuenta.get(l, 0))
    print('Las capas con → son las que lee el script (%s::<nave>::<parte>).' % PREFIJO)


def calce(m, capas):
    """Mide el calce contra la industria de Contexto.3dm: si Industria.3dm trae su prisma
    (capa industry_bake - Copy) tiene que coincidir con el de Contexto a < 1 cm."""
    if not os.path.exists(CONTEXTO):
        print('calce: no está', CONTEXTO)
        return
    mc, cc = abre(CONTEXTO)
    ref = [caja_m(o.Geometry) for o in mc.Objects if cc[o.Attributes.LayerIndex] == PRISMA]
    if not ref:
        print('calce: Contexto.3dm no tiene la capa', PRISMA)
        return
    ref = ref[0]
    print('Contexto (prisma): u %.3f–%.3f  v %.3f–%.3f  z %.2f–%.2f' % (ref[0], ref[3], ref[1], ref[4], ref[2], ref[5]))
    propio = [caja_m(o.Geometry) for o in m.Objects if capas[o.Attributes.LayerIndex] == PRISMA]
    if propio:
        d = max(abs(a - b) for a, b in zip(propio[0], ref))
        print('calce con el prisma de Contexto: máx. diferencia %.1f mm → %s' % (d * 1000, 'OK' if d < TOL_CALCE else 'NO CALZA (> 1 cm)'))
    mias = [caja_m(o.Geometry) for o in m.Objects if capas[o.Attributes.LayerIndex].startswith(PREFIJO)]
    if mias:
        u0, v0, z0 = min(b[0] for b in mias), min(b[1] for b in mias), min(b[2] for b in mias)
        u1, v1, z1 = max(b[3] for b in mias), max(b[4] for b in mias), max(b[5] for b in mias)
        print('Industria (capas %s): u %.3f–%.3f  v %.3f–%.3f  z %.2f–%.2f' % (PREFIJO, u0, u1, v0, v1, z0, z1))
        dentro = u0 >= ref[0] - 1 and u1 <= ref[3] + 1 and v0 >= ref[1] - 1 and v1 <= ref[4] + 1
        print('¿cae sobre la huella del prisma (±1 m)?', 'sí' if dentro else 'NO: revisa que esté en el sistema de Contexto.3dm')
    elif not propio:
        print('calce: no hay objetos en', PREFIJO, 'ni la capa', PRISMA, 'para comparar')


def main():
    global FUENTE, SALIDA, PREFIJO
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--capas', action='store_true', help='sólo lista las capas del .3dm')
    ap.add_argument('--calce', action='store_true', help='mide el calce contra Contexto.3dm')
    ap.add_argument('--fuente', help='otro .3dm (por defecto modelo/Industria.3dm)')
    ap.add_argument('--salida', help='otro .js de salida')
    ap.add_argument('--prefijo', help='otra capa raíz (por defecto %s)' % PREFIJO)
    a = ap.parse_args()
    FUENTE = a.fuente or FUENTE
    SALIDA = a.salida or SALIDA
    PREFIJO = a.prefijo or PREFIJO
    if not os.path.exists(FUENTE):
        sys.exit('Falta %s\nCopia tu Industria.3dm a diagrama/modelo/ (en el sistema de coordenadas de Contexto.3dm).' % FUENTE)
    m, capas = abre(FUENTE)
    if a.capas:
        lista_capas(m, capas)
        return
    if a.calce:
        calce(m, capas)

    naves = {}      # nave → parte → {'t': triángulos, 'l': segmentos}
    sin_malla = []
    for o in m.Objects:
        lp = capas[o.Attributes.LayerIndex]
        if lp != PREFIJO and not lp.startswith(PREFIJO + '::'):
            continue
        resto = lp[len(PREFIJO):].strip(':').split('::') if lp != PREFIJO else []
        nave, parte = (resto[0], '::'.join(resto[1:]) or 'general') if len(resto) > 1 else ('general', resto[0] if resto else 'general')
        tris = malla_de(o.Geometry) or malla_nueva(o.Geometry)
        if not tris:
            sin_malla.append('%s (%s)' % (lp, str(o.Attributes.Id)[:8]))
            continue
        T3 = [[al_diagrama(p) for p in t] for t in tris]
        pz = naves.setdefault(nave, {}).setdefault(parte, {'t': [], 'l': []})
        pz['t'].extend(T3)
        pz['l'].extend(aristas(T3))
    if not naves:
        sys.exit('No hay objetos en %s::<nave>::<parte>. Corre con --capas para ver cómo están tus capas.' % PREFIJO)

    salida, resumen = {}, {}
    for nave, partes in naves.items():
        us = [p[0] for pz in partes.values() for t in pz['t'] for p in t]
        vs = [p[1] for pz in partes.values() for t in pz['t'] for p in t]
        zs = [p[2] for pz in partes.values() for t in pz['t'] for p in t]
        salida[nave] = {
            'huella': [round(min(us), 3), round(min(vs), 3), round(max(us), 3), round(max(vs), 3)],
            'z': [round(min(zs), 3), round(max(zs), 3)],
            'partes': {p: {'tris': plano(pz['t']), 'lineas': plano([e for e in pz['l']])} for p, pz in partes.items()},
        }
        resumen[nave] = {p: len(pz['t']) for p, pz in partes.items()}
    datos = {'fuente': os.path.relpath(FUENTE, RAIZ).replace('\\', '/'), 'dz': DZ, 'naves': salida}
    js = ('/* Generado por herramientas/prepara-industria.py desde modelo/Industria.3dm: no editar a mano.\n'
          '   naves[<nave>] = { huella [u0, v0, u1, v1], z [z0, z1], partes[<parte>] = { tris (u, v, z de a tres\n'
          '   vértices), lineas (aristas, de a dos vértices) } }. Copiado tal cual de Rhino (capas\n'
          '   ' + PREFIJO + '::<nave>::<parte>), sin recortes. */\n'
          'window.ATLAMPA_INDUSTRIA = ' + json.dumps(datos, separators=(',', ':')) + ';\n')
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    for nave, partes in resumen.items():
        print(nave, salida[nave]['huella'], 'z', salida[nave]['z'], '·', ', '.join('%s %d tri' % kv for kv in partes.items()))
    if sin_malla:
        print('SIN MALLA (no se copiaron; en Rhino: guardar con mallas de render):', *sin_malla, sep='\n  ')
    print('escrito', SALIDA, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()

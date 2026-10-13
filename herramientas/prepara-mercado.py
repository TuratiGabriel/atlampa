"""Mercado (naves de comercio de Gabriel en Rhino) → atlampa-mercado.js.

    python herramientas/prepara-mercado.py      (desde diagrama/)

Lee ../Rhino/Contexto.3dm con rhino3dm (sin abrir Rhino) y saca las mallas de
render guardadas en el archivo de las capas del mercado:
  · Layer 01::COMERCIO::mercado::perímetro  (muros, postes y paneles; los que
    se levantan del piso dejan pasar el agua a la zanja)
  · Layer 01::COMERCIO::mercado::cubierta   (las cubiertas a dos aguas; donde
    no llegan al perímetro, el agua cae a la zanja)
  · y el panel del muro oeste que quedó en la capa padre (63d7d0d9).
Se copian TAL CUAL (también lo oculto en Rhino), aunque el perímetro llegue a
~1 m de la guarnición: el visor ajusta la banqueta a esa huella (sólo en el
apartado Comercio). Lo único que se quita es lo que cae dentro del círculo de
corte del aro (CORTE, r 47 m, como las naves de siempre): ahí van los patios
de humedales.

Sistema: Rhino (mm) → diagrama (m): u = x + 503.255, v = y + 404.153 (sale del
centro del aro de Diag::ring; la nave sur calza al cm) y z = z + 0.11 (el 0.00
de Rhino, z 90 mm, es el piso del predio del visor, +0.20).
"""
import json
import math
import os
import sys

import rhino3dm as r

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FUENTE = os.path.join(os.path.dirname(RAIZ), 'Rhino', 'Contexto.3dm')
# sin la carpeta del proyecto (colaboradores): la copia que va en el repo, diagrama/modelo/
if not os.path.exists(FUENTE):
    FUENTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelo', 'Contexto.3dm')
SALIDA = os.path.join(RAIZ, 'atlampa-mercado.js')

DX, DY, DZ = 503.255, 404.153, 0.11
ARO = (505.75, 409.05)      # centro del aro (atlampa-geo.js, ANILLO)
CORTE = 47.0                # radio de corte de las naves (atlampa-geo.js, CORTE)
N_CIRC = 240                # lados del círculo de corte (≈1.2 m)

CAPAS = {
    'Layer 01::COMERCIO::mercado::perímetro': 'perimetro',
    'Layer 01::COMERCIO::mercado::cubierta': 'cubierta',
}
SUELTOS = {'63d7d0d9': 'perimetro'}   # panel del muro oeste, en la capa padre

# ================= PROPUESTA (nave norte) — todo editable =================
# Tramo del perímetro: los postes de la fachada este van cada 6.364 m desde y 13.713
# (v 417.866); las líneas de postes ordenan los marcos de acero y el hoyo.
TRAMO = 6.3636
V_POSTES = [417.866 + k * TRAMO for k in range(12)]          # … 481.50, 487.87 (muro norte)
# Zanja (capa excavación de Rhino): canal de 0.80 m dentro de los muros; la
# estructura del mercado no pasa de su borde interior.
ZANJA = (523.385, 417.863, 557.745, 484.613)                  # borde interior [u0, v0, u1, v1]
MUROS = {'o': 522.585, 'e': 558.545, 'n': 487.866}             # caras interiores de los muros (u, u, v)
# Hoyo del jardín inundable: un círculo «pixelado» de franjas paralelas a la
# cumbrera de ¼ de tramo, cada una tan larga como la cuerda del círculo en su
# centro; el borde este cae en la cumbrera este (u 549.755). La lluvia que entra
# con viento (LLUVIA_ANG desde la vertical) se abre (Z_LLUVIA − z)·tan del borde
# del hoyo; el jardín visible (sin plataformas encima) es el hoyo más ese margen,
# y el hoyo queda < 75 % de él (Gabriel: «al menos 25 % más chico que el jardín»).
# 2026-10-09 (Gabriel: «más pequeño, más centralizado»): Ø 1 tramo (antes 2), de
# línea de postes a línea de postes (6 y 7), 12.7 m más al centro de la nave. Más
# al centro ya no se puede: ahí lo tapa la vivienda (el cielo libre es el lado este).
HOYO = {'D': TRAMO, 'franja': TRAMO / 4}
HOYO['c'] = (549.755 - 2 * HOYO['franja'], (V_POSTES[6] + V_POSTES[7]) / 2)   # (546.57, 459.23)
# 2026-10-12: ritmo nuevo (ver franjas_hoyo): 9 franjas de ⅛ de tramo; largo y corrimiento en v de cada una (m)
HOYO['franja'] = TRAMO / 8
HOYO['franja'] = TRAMO / 4   # 2026-10-12 (Gabriel: minimizar el jardín): 3 franjas de ¼ de tramo
HOYO['ritmo'] = [2.4, 3.8, 2.6]
HOYO['corrido'] = [0.4, -0.3, 0.3]
LLUVIA_ANG, Z_LLUVIA = 20.0, 9.3        # supuestos: lluvia con viento a 20°; cara de arriba de la cubierta en el hoyo
# Niveles (relativos al 0.00 del mercado; en el visor + 0.2). Jardín inundable y
# profundo: fondo −1.50, espejo de agua normal −0.45; se desborda hasta −0.20
# (la zanja). Bajo las plataformas sigue sin verse; sólo algunos parches de
# rejilla, junto a la orilla con luz, dejan verlo.
NIVEL = lambda n: n + 0.2
Z_JARDIN, Z_AGUA = NIVEL(-1.50), NIVEL(-0.45)
M = TRAMO / 4                            # submódulo de la retícula (1.591)
# Canal del valle: la ranura entre las dos cubiertas (u 540.835–541.245) se queda
# abierta salvo en estos tramos, donde las cubiertas se tocan y abajo se cruza en seco.
VALLE = (540.835, 541.245)
CIERRES = [(V_POSTES[5], V_POSTES[6]), (V_POSTES[10], V_POSTES[11])]   # frente al acceso este y el último tramo norte
# Retícula de acero (independiente de la vivienda): ejes a lo largo de la nave
# (muro oeste —dentro de la zanja—, cumbrera O, valle, cumbrera E, muro este) y
# un marco en cada línea de postes. Las vigas llegan perpendiculares a los postes
# del muro (y un puntal más abajo): la retícula rigidiza la nave desde adentro.
EJES_U = [ZANJA[0] + 0.2, 531.755, 541.04, 549.755, ZANJA[2] - 0.2]
Z_PISO, Z_VIGA, PERALTE, Z_PUNTAL = 0.2, 6.0, 0.5, 3.0
COL, VIGA_B, PUNTAL, PAR = 0.30, 0.25, 0.15, 0.15                # secciones (m)
JUNTA = 0.05                                                    # holgura con las columnas de la vivienda
COLS_VIVIENDA = os.path.join(os.path.dirname(RAIZ), 'analisis', 'mercado', 'columnas_vivienda.json')


def malla_de(g):
    """Triángulos (en mm) de la malla de render guardada en el archivo."""
    mallas = []
    if isinstance(g, r.Brep):
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


def al_diagrama(p):
    return (p[0] / 1000 + DX, p[1] / 1000 + DY, p[2] / 1000 + DZ)


# ---- recorte por el círculo del aro (se queda lo de afuera) ----
CIRC = [(ARO[0] + math.cos(2 * math.pi * k / N_CIRC) * CORTE, ARO[1] + math.sin(2 * math.pi * k / N_CIRC) * CORTE) for k in range(N_CIRC)]


def lado(p, a, b):   # > 0: a la izquierda de a→b (adentro del círculo, que va antihorario)
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])


def recorta(pol, a, b, adentro):
    """Sutherland–Hodgman en planta contra la recta a→b; z se interpola (cara plana)."""
    out = []
    n = len(pol)
    for i in range(n):
        p, q = pol[i], pol[(i + 1) % n]
        sp, sq = lado(p, a, b), lado(q, a, b)
        ip, iq = (sp >= 0) if adentro else (sp < 0), (sq >= 0) if adentro else (sq < 0)
        if ip:
            out.append(p)
        if ip != iq:
            t = sp / (sp - sq)
            out.append(tuple(p[k] + (q[k] - p[k]) * t for k in range(3)))
    return out


def fuera_del_circulo(tri, cortes=None):
    """Partes del triángulo fuera del círculo de corte, como polígonos convexos.
    En cortes se juntan los segmentos donde el círculo corta al triángulo."""
    d = [math.hypot(p[0] - ARO[0], p[1] - ARO[1]) for p in tri]
    if min(d) >= CORTE:
        # todos afuera: ¿algún lado pasa por adentro?
        cruza = False
        for i in range(3):
            p, q = tri[i], tri[(i + 1) % 3]
            dx, dy = q[0] - p[0], q[1] - p[1]
            L2 = dx * dx + dy * dy
            t = 0 if L2 == 0 else max(0, min(1, ((ARO[0] - p[0]) * dx + (ARO[1] - p[1]) * dy) / L2))
            if math.hypot(p[0] + dx * t - ARO[0], p[1] + dy * t - ARO[1]) < CORTE:
                cruza = True
        if not cruza:
            return [list(tri)]
    if max(d) <= CORTE:
        return []
    return parte(list(tri), [(CIRC[k], CIRC[(k + 1) % N_CIRC]) for k in range(N_CIRC)], cortes)


def parte(pol, lados, cortes=None):
    """Lo de pol fuera de la región convexa de lados (a→b, antihorario), en
    polígonos convexos. En cortes, los tramos del borde de la región que lo cortan."""
    piezas, resto = [], pol
    for a, b in lados:
        if not resto:
            break
        # sólo los lados que tocan lo que queda
        if all(lado(p, a, b) >= 0 for p in resto):
            continue
        afuera = recorta(resto, a, b, False)
        if len(afuera) >= 3:
            piezas.append(afuera)
            if cortes is not None:
                # el lado de la pieza sobre la recta del borde, sólo dentro del
                # tramo a→b (lo demás de la recta es costura entre piezas, no corte)
                n, ab = len(afuera), (b[0] - a[0], b[1] - a[1])
                L2 = ab[0] * ab[0] + ab[1] * ab[1]
                for i in range(n):
                    p, q = afuera[i], afuera[(i + 1) % n]
                    if abs(lado(p, a, b)) < 1e-6 and abs(lado(q, a, b)) < 1e-6:
                        tp = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2
                        tq = ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1]) / L2
                        lo, hi = max(0, min(tp, tq)), min(1, max(tp, tq))
                        if hi - lo < 1e-6 or tp == tq:
                            continue
                        P = lambda t: tuple(p[j] + (q[j] - p[j]) * (t - tp) / (tq - tp) for j in range(3))
                        cortes.append((P(lo), P(hi)))
        resto = recorta(resto, a, b, True)
        if len(resto) < 3:
            resto = []
    return piezas


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


def segmento_fuera(a, b):
    """Las partes del segmento a→b fuera del círculo de corte (en planta)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    fx, fy = a[0] - ARO[0], a[1] - ARO[1]
    A = dx * dx + dy * dy
    if A < 1e-12:
        return [(a, b)] if math.hypot(fx, fy) >= CORTE else []
    B = 2 * (fx * dx + fy * dy)
    disc = B * B - 4 * A * (fx * fx + fy * fy - CORTE * CORTE)
    if disc <= 0:
        return [(a, b)]
    s = math.sqrt(disc)
    t0, t1 = (-B - s) / (2 * A), (-B + s) / (2 * A)
    P = lambda t: tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
    out = []
    if t0 > 0:
        out.append((a, P(min(t0, 1))))
    if t1 < 1:
        out.append((P(max(t1, 0)), b))
    return [q for q in out if math.dist(q[0], q[1]) > 1e-4]


# ================= PROPUESTA: hoyo, cierres del valle y retícula de acero =================
def franjas_hoyo():
    """El hoyo pixelado: [u0, v0, u1, v1] de cada franja (paralela a la cumbrera).
    2026-10-12 (Gabriel: «muy cuadrado, sin ritmo»): franjas de ⅛ de tramo con largos
    que crecen y decrecen sin simetría y centros corridos en v (se lee como una nube
    de píxeles, no como un círculo de escalera). El borde este sigue en la cumbrera E."""
    w = HOYO['franja']
    n = len(HOYO['ritmo'])
    u0 = 549.755 - n * w
    cv = HOYO['c'][1]
    return [(u0 + i * w, cv + dv - l / 2, u0 + (i + 1) * w, cv + dv + l / 2) for i, (l, dv) in enumerate(zip(HOYO['ritmo'], HOYO['corrido']))]


def fuera_de_rect(pol, q, cortes=None):
    u0, v0, u1, v1 = q
    if max(p[0] for p in pol) <= u0 or min(p[0] for p in pol) >= u1 or max(p[1] for p in pol) <= v0 or min(p[1] for p in pol) >= v1:
        return [pol]
    return parte(pol, [((u0, v0), (u1, v0)), ((u1, v0), (u1, v1)), ((u1, v1), (u0, v1)), ((u0, v1), (u0, v0))], cortes)


def segmento_fuera_rect(a, b, q):
    """Las partes del segmento fuera del rectángulo q (Liang–Barsky)."""
    u0, v0, u1, v1 = q
    t0, t1, d = 0.0, 1.0, (b[0] - a[0], b[1] - a[1])
    for p, s in ((-d[0], a[0] - u0), (d[0], u1 - a[0]), (-d[1], a[1] - v0), (d[1], v1 - a[1])):
        if abs(p) < 1e-12:
            if s <= 0:
                return [(a, b)]
        elif p < 0:
            t0 = max(t0, s / p)
        else:
            t1 = min(t1, s / p)
    if t0 >= t1:
        return [(a, b)]
    P = lambda t: tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
    return ([(a, P(t0))] if t0 > 1e-9 else []) + ([(P(t1), b)] if t1 < 1 - 1e-9 else [])


def costuras_fuera(a, b, rects):
    """Parte el corte a→b en los bordes de las franjas y quita los tramos con
    hueco de los dos lados (las juntas entre franjas abiertas)."""
    if not rects:
        return [(a, b)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    if L < 1e-9:
        return []
    ts = {0.0, 1.0}
    for q in rects:
        for x in (q[0], q[2]):
            if abs(dx) > 1e-9:
                ts.add((x - a[0]) / dx)
        for y in (q[1], q[3]):
            if abs(dy) > 1e-9:
                ts.add((y - a[1]) / dy)
    ts = sorted(t for t in ts if 0 <= t <= 1)
    nx, ny = -dy / L * 0.01, dx / L * 0.01
    hueco = lambda u, v: any(q[0] < u < q[2] and q[1] < v < q[3] for q in rects)
    P = lambda t: tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
    out = []
    for t0, t1 in zip(ts, ts[1:]):
        if t1 - t0 < 1e-9:
            continue
        mu, mv = a[0] + dx * (t0 + t1) / 2, a[1] + dy * (t0 + t1) / 2
        if not (hueco(mu + nx, mv + ny) and hueco(mu - nx, mv - ny)):
            out.append((P(t0), P(t1)))
    return out


def prisma8(tris, lins, P):
    """Sólido de 8 esquinas (0-3 abajo, 4-7 arriba, mismo orden)."""
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        tris.append((P[f[0]], P[f[1]], P[f[2]]))
        tris.append((P[f[0]], P[f[2]], P[f[3]]))
    for e in ((0, 1), (1, 2), (2, 3), (3, 0), (4, 5), (5, 6), (6, 7), (7, 4), (0, 4), (1, 5), (2, 6), (3, 7)):
        lins.append((P[e[0]], P[e[1]]))


def caja(tris, lins, u0, v0, z0, u1, v1, z1):
    prisma8(tris, lins, [(u0, v0, z0), (u1, v0, z0), (u1, v1, z0), (u0, v1, z0), (u0, v0, z1), (u1, v0, z1), (u1, v1, z1), (u0, v1, z1)])


def barra(tris, lins, a, b, ancho, alto):
    """Barra de a a b, sección ancho (horizontal) × alto (perpendicular, en el plano vertical)."""
    d = [b[j] - a[j] for j in range(3)]
    L = math.sqrt(sum(c * c for c in d))
    d = [c / L for c in d]
    h = (d[1], -d[0], 0.0)
    hl = math.hypot(h[0], h[1])
    h = (1.0, 0.0, 0.0) if hl < 1e-9 else (h[0] / hl, h[1] / hl, 0.0)
    n = (h[1] * d[2] - h[2] * d[1], h[2] * d[0] - h[0] * d[2], h[0] * d[1] - h[1] * d[0])
    esq = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    P = [tuple(p[j] + h[j] * sx * ancho / 2 + n[j] * sy * alto / 2 for j in range(3)) for p in (a, b) for sx, sy in esq]
    prisma8(tris, lins, [P[0], P[1], P[5], P[4], P[3], P[2], P[6], P[7]])


def z_bajo(u, v, tris):
    """Altura de la cara de abajo de la cubierta en (u, v) (o None si no hay)."""
    zs = []
    for t in tris:
        (x1, y1, z1), (x2, y2, z2), (x3, y3, z3) = t
        den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
        if abs(den) < 1e-12:
            continue
        l1 = ((y2 - y3) * (u - x3) + (x3 - x2) * (v - y3)) / den
        l2 = ((y3 - y1) * (u - x3) + (x1 - x3) * (v - y3)) / den
        l3 = 1 - l1 - l2
        if min(l1, l2, l3) >= -1e-6:
            zs.append(l1 * z1 + l2 * z2 + l3 * z3)
    return min(zs) if zs else None


def adentro(u, v, margen=0.3):
    return (ZANJA[0] <= u <= ZANJA[2] and ZANJA[1] <= v <= ZANJA[3]
            and math.hypot(u - ARO[0], v - ARO[1]) >= CORTE + margen)


def corta_por_aro(a, b):
    """El tramo del segmento horizontal a→b fuera del círculo de corte (el más largo)."""
    s = segmento_fuera((a[0], a[1], 0), (b[0], b[1], 0))
    if not s:
        return None
    p, q = max(s, key=lambda x: math.dist(x[0], x[1]))
    return (p[0], p[1]), (q[0], q[1])


COLUMNAS_ACERO = []   # (u, v) de las columnas de la retícula del mercado (las llena reticula; los puestos las esquivan)


def reticula(techo):
    """Acero del mercado (nave norte) y las columnas de la vivienda que lo cruzan.
    techo: triángulos originales de las cubiertas de la nave norte (para la altura)."""
    tris, lins = [], []
    viv = [c for c in json.load(open(COLS_VIVIENDA)) if c['z0'] < 1 and adentro(c['u'], c['v'], 0)]
    rv = max(c['lado'] for c in viv) * math.sqrt(2) / 2 if viv else 0.3   # radio de la columna girada
    libre = rv + JUNTA + COL / 2                                          # de centro a centro, pegadas
    zc1 = Z_VIGA - PERALTE
    cuenta = {'columnas': 0, 'gemelas': 0, 'vigas': 0, 'puntales': 0, 'montantes': 0, 'pares': 0}

    def columna(u, v):
        COLUMNAS_ACERO.append((u, v))
        caja(tris, lins, u - COL / 2, v - COL / 2, Z_PISO, u + COL / 2, v + COL / 2, zc1)
        cuenta['columnas'] += 1

    def viga(a, b, eje):
        """Viga de a a b (en planta) a Z_VIGA; se parte donde pasa una columna de la
        vivienda y en cada corte la sostiene una columna gemela, pegada con junta."""
        cortes = []
        for c in viv:
            dentro_tramo = min(a[eje], b[eje]) < c['uv'[eje]] < max(a[eje], b[eje])
            if dentro_tramo and abs(c['vu'[eje]] - a[1 - eje]) < rv + JUNTA + VIGA_B / 2:
                cortes.append(c['uv'[eje]])
        tramos, ini = [], min(a[eje], b[eje])
        for x in sorted(cortes):
            tramos.append((ini, x - libre)); ini = x + libre
            for s in (-1, 1):
                p = [0, 0]; p[eje] = x + s * libre; p[1 - eje] = a[1 - eje]
                columna(*p); cuenta['gemelas'] += 1
        tramos.append((ini, max(a[eje], b[eje])))
        for t0, t1 in tramos:
            p0, p1 = [0, 0], [0, 0]
            p0[eje], p1[eje], p0[1 - eje], p1[1 - eje] = t0, t1, a[1 - eje], a[1 - eje]
            barra(tris, lins, (p0[0], p0[1], Z_VIGA - PERALTE / 2), (p1[0], p1[1], Z_VIGA - PERALTE / 2), VIGA_B, PERALTE)
            cuenta['vigas'] += 1

    # marcos: una viga por línea de postes, de muro a muro (o del corte del aro al muro)
    filas = [v for v in V_POSTES if ZANJA[1] <= v <= ZANJA[3]]
    for v in filas:
        tramo = corta_por_aro((MUROS['o'], v), (MUROS['e'], v))
        if not tramo:
            continue
        a, b = tramo
        viga(a, b, 0)
        # columnas en los ejes, si caen adentro y lejos de la vivienda
        for u in EJES_U:
            if not adentro(u, v):
                continue
            if any(math.hypot(u - c['u'], v - c['v']) < libre for c in viv):
                continue   # ahí ya hay gemelas
            columna(u, v)
        # puntales perpendiculares a los postes del muro (donde la viga llega al muro)
        for uc, um, llega in ((EJES_U[0], MUROS['o'], abs(a[0] - MUROS['o']) < 1e-6), (EJES_U[-1], MUROS['e'], abs(b[0] - MUROS['e']) < 1e-6)):
            if adentro(uc, v) and llega:
                barra(tris, lins, (uc, v, Z_PUNTAL), (um, v, Z_PUNTAL), PUNTAL, PUNTAL)
                x0, x1 = (um, um + 0.03) if um == MUROS['o'] else (um - 0.03, um)
                caja(tris, lins, x0, v - 0.3, Z_PUNTAL - 0.3, x1, v + 0.3, Z_PUNTAL + 0.3)   # placa al poste
                cuenta['puntales'] += 1
        # la cubierta montada en el marco: pares bajo la cubierta y montantes en las cumbreras
        pts = []
        u = a[0]
        while u <= b[0] + 1e-9:
            z = z_bajo(u, v, techo)
            if z is not None:
                pts.append((u, v, z - PAR / 2))
            u += 0.25
        # tramos continuos (sin huecos de cubierta), y en cada uno sólo los quiebres
        tramos, act = [], [pts[0]] if pts else []
        for p, q in zip(pts, pts[1:]):
            if abs(q[0] - p[0]) < 0.26 and abs(q[2] - p[2]) < 0.5:
                act.append(q)
            else:
                tramos.append(act); act = [q]
        if act:
            tramos.append(act)
        for t in tramos:
            if len(t) < 2:
                continue
            ks = [t[0]]
            for i in range(1, len(t) - 1):
                s0 = (t[i][2] - t[i - 1][2]) / (t[i][0] - t[i - 1][0])
                s1 = (t[i + 1][2] - t[i][2]) / (t[i + 1][0] - t[i][0])
                if abs(s1 - s0) > 0.02:
                    ks.append(t[i])
            ks.append(t[-1])
            for p, q in zip(ks, ks[1:]):
                barra(tris, lins, p, q, PAR, PAR)
        cuenta['pares'] += 1
        for u in (EJES_U[1], EJES_U[3]):
            z = z_bajo(u, v, techo)
            if z is not None and adentro(u, v, 0) and z - Z_VIGA > 0.3:
                barra(tris, lins, (u, v, Z_VIGA), (u, v, z - PAR), 0.2, 0.2)
                cuenta['montantes'] += 1
    # largueros: a lo largo de cada eje, del primer marco al muro norte
    for u in EJES_U:
        vs = [v for v in filas if adentro(u, v)]
        if vs:
            viga((u, vs[0]), (u, MUROS['n']), 1)
            # puntal al muro norte desde el último marco
            barra(tris, lins, (u, vs[-1], Z_PUNTAL), (u, MUROS['n'], Z_PUNTAL), PUNTAL, PUNTAL)
            cuenta['puntales'] += 1
    # cierres del canal del valle: las cubiertas se tocan
    cub_t, cub_l = [], []
    for v0, v1 in CIERRES:
        z = z_bajo((VALLE[0] + VALLE[1]) / 2 - 0.3, (v0 + v1) / 2, techo) or 6.3
        caja(cub_t, cub_l, VALLE[0] - 0.05, v0, z, VALLE[1] + 0.05, v1, z + 0.2)
    # las columnas de la vivienda que cruzan el mercado (de referencia, hasta donde empieza la vivienda)
    viv_t, viv_l = [], []
    g = math.radians(-10)
    for c in viv:
        h = c['lado'] / 2
        P = [(c['u'] + math.cos(g) * x - math.sin(g) * y, c['v'] + math.sin(g) * x + math.cos(g) * y) for x, y in ((-h, -h), (h, -h), (h, h), (-h, h))]
        prisma8(viv_t, viv_l, [(p[0], p[1], Z_PISO) for p in P] + [(p[0], p[1], 7.79) for p in P])
    print('acero', cuenta, '· columnas de vivienda en el mercado', len(viv))
    return tris, lins, cub_t, cub_l, viv_t, viv_l


def canalon(tris, lins):
    """Canalón bajo la ranura del valle (pendiente: la lluvia de la ranura caía junto a las
    plataformas): una U de lámina de 0.60 × 0.30 sobre el larguero (+6.00), del corte del aro al muro
    norte; baja por los extremos: al norte a la zanja y al sur a los patios del aro (humedales)."""
    u = (VALLE[0] + VALLE[1]) / 2
    v0 = ARO[1] + math.sqrt(CORTE ** 2 - (u - ARO[0]) ** 2) + 0.3
    v1 = ZANJA[3]
    z0 = Z_VIGA
    for a, b, za, zb in ((u - 0.3, u + 0.3, z0, z0 + 0.03), (u - 0.3, u - 0.27, z0, z0 + 0.3), (u + 0.27, u + 0.3, z0, z0 + 0.3)):
        caja(tris, lins, a, v0, za, b, v1, zb)
    for v in (v0 + 0.15, v1 - 0.15):   # bajantes
        caja(tris, lins, u - 0.06, v - 0.06, NIVEL(-0.2) if v > 470 else NIVEL(0), u + 0.06, v + 0.06, z0)


def plano(tris):
    return [round(c, 3) for t in tris for p in t for c in p]


# ================= Fachada al aro: la cara curva del corte =================
# Donde el círculo de corte (r 47) parte las naves queda una cara curva que NO
# es muro. Por ahora va de vidrio (podría ser lámina perforada o una fachada
# interior: Gabriel no lo ha decidido): del piso (0.00) a la cara de abajo de
# la cubierta, con parteluces cada 2 submódulos, un travesaño a +3.00 y, en
# algunos paños, los trazos del reflejo. Se arma por nave (sólo donde hay
# cubierta encima); los huecos cortos (el canal del valle) se cubren.
VIDRIO_PASO, VIDRIO_TRAVESANO, VIDRIO_MUESTRA = 2 * M, NIVEL(3.0), 0.5


def vidrio_aro(techos):
    tris, marco, reflejo = [], [], []
    n = int(2 * math.pi * CORTE / VIDRIO_MUESTRA)
    for techo in techos:
        if not techo:
            continue
        P = []
        for k in range(n):
            a = 2 * math.pi * k / n
            u, v = ARO[0] + math.cos(a) * CORTE, ARO[1] + math.sin(a) * CORTE
            z = z_bajo(u, v, techo)
            P.append((u, v, None if z is None else z - 0.02))
        # huecos de menos de 1 m (el canal del valle): la altura más baja de los lados
        for k in range(n):
            if P[k][2] is not None:
                continue
            izq = next((P[(k - j) % n][2] for j in range(1, 3) if P[(k - j) % n][2] is not None), None)
            der = next((P[(k + j) % n][2] for j in range(1, 3) if P[(k + j) % n][2] is not None), None)
            if izq is not None and der is not None:
                P[k] = (P[k][0], P[k][1], min(izq, der))
        # tramos continuos alrededor del círculo
        ini = next((k for k in range(n) if P[k][2] is None), None)
        if ini is None:
            continue
        tramos, act = [], []
        for j in range(1, n + 1):
            p = P[(ini + j) % n]
            if p[2] is None:
                if len(act) > 1:
                    tramos.append(act)
                act = []
            else:
                act.append(p)
        for t in tramos:
            z0 = NIVEL(0)
            for p, q in zip(t, t[1:]):
                # tramos abiertos (VIDRIO_VANOS): el vidrio sólo queda fuera de [za, zb]
                th = math.atan2((p[1] + q[1]) / 2 - ARO[1], (p[0] + q[0]) / 2 - ARO[0])
                huecos = sorted((za, zb) for t0, t1, za, zb in VIDRIO_VANOS if t0 <= th <= t1)
                tramos_z, ini = [], z0
                for za, zb in huecos:
                    if za > ini:
                        tramos_z.append((ini, za))
                    ini = max(ini, zb)
                tramos_z.append((ini, None))
                for ya, yb in tramos_z:
                    pa_, qa_ = (yb if yb is not None else p[2]), (yb if yb is not None else q[2])
                    if pa_ <= ya + 0.05 or qa_ <= ya + 0.05:
                        continue
                    tris.append(((p[0], p[1], ya), (q[0], q[1], ya), (q[0], q[1], qa_)))
                    tris.append(((p[0], p[1], ya), (q[0], q[1], qa_), (p[0], p[1], pa_)))
                    marco.append(((p[0], p[1], ya), (q[0], q[1], ya)))
                marco.append(((p[0], p[1], p[2]), (q[0], q[1], q[2])))
                if p[2] > VIDRIO_TRAVESANO and q[2] > VIDRIO_TRAVESANO:
                    marco.append(((p[0], p[1], VIDRIO_TRAVESANO), (q[0], q[1], VIDRIO_TRAVESANO)))
            # parteluces cada VIDRIO_PASO a lo largo del arco (y en las puntas)
            s, sig, paños = 0.0, 0.0, []
            for i, p in enumerate(t):
                if i:
                    s += math.dist(p[:2], t[i - 1][:2])
                if i == 0 or i == len(t) - 1 or s >= sig:
                    marco.append(((p[0], p[1], z0), (p[0], p[1], p[2])))
                    paños.append(i)
                    sig = s + VIDRIO_PASO
            # reflejo: dos trazos diagonales paralelos en uno de cada tres paños
            for j, (i0, i1) in enumerate(zip(paños, paños[1:])):
                if j % 3 != 1 or i1 - i0 < 2:
                    continue
                a, b = t[i0], t[i1]
                h = min(a[2], b[2]) - z0
                P2 = lambda f, g: (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z0 + h * g)
                reflejo.append((P2(0.22, 0.38), P2(0.52, 0.78)))
                reflejo.append((P2(0.42, 0.34), P2(0.6, 0.58)))
    return tris, marco, reflejo


# ================= PROPUESTA paso 3 (v2, 2026-10-09): sobre los niveles de Gabriel =================
# Las plataformas suben hacia el sur: son las de Gabriel en Rhino (capas niveles y
# escaleras de la nave norte): +1.42 al norte, gradas a +2.40 al centro y al sur,
# escalera de +2.40 a +4.40. Aquí sólo se detallan: losa de lámina de 15 cm sobre
# postes, contrahuellas donde el escalón es de ≤ 30 cm, barandal de 0.90 donde el
# vacío pasa de 30 cm; las ranuras de < 2.6 m entre plataformas del mismo nivel se
# cierran (se ve menos jardín) y se recortan donde llega la lluvia del hoyo.
from shapely.geometry import Point, LineString, Polygon, box as caja2d
from shapely.geometry.polygon import orient
from shapely.ops import unary_union, transform as shp_transform
from shapely.prepared import prep
import random
import shapely

ZANJA_EXT = (522.585, 417.063, 558.545, 485.413)                              # borde exterior del canal perimetral
CAJA_N = (522.585, 417.063, 558.545, 487.866)                                 # huella interior de la nave norte (hasta el muro norte)
PISO = 0.40          # el piso del mercado en Rhino (capa mercado), +0.20 sobre el predio
HE_N = 410.0         # al norte de Heliotropo: la nave norte
CIERRA = 1.3         # ranuras de hasta 2 × CIERRA entre plataformas del mismo nivel: se cierran
# Normativa: NTC para el Proyecto Arquitectónico (Gaceta CDMX, 12/12/2024)
PUESTO = (2.5, 2.0, 3.0)   # frente × fondo × alto; Tabla 2.2.1.2, puestos en mercados: ≥ 4 m², lado ≥ 2.00, alto ≥ 3.00
PUESTO_MIN = 4.0           # (m²) el mínimo de la norma: los que el corte deja más chicos se juntan con el vecino
BARANDAL, VACIO = 0.90, 0.30   # 2.2.2.14.1 a) ≥ 0.90; donde el vacío pasa de 0.30 (2.2.2.3.2 d, 2.2.2.5.1 e)
PASILLO_MIN = 1.10         # Tabla 4.3.5.1b, abasto y comercio: pasillos en áreas de ventas ≥ 1.10
FRENTE = 2.0               # frente de atención de los puestos (pasillo, ≥ 1.10)
# comedores: mesa 1.80 × 0.75 a 0.75, bancas de 0.35 a 0.45; 1.20 libre entre bancas (≥ 1.10), 0.90 entre cabeceras
MESA = {'largo': 1.8, 'ancho': 0.75, 'banca': 0.35, 'entre': 1.2, 'cabecera': 0.9}
MESAS_POR_PUESTO = 1.0   # (2026-10-12) proporción: una mesa (6 plazas) por puesto; ≈ 1.5 por puesto de comida (2/3 de los puestos)
# Puestos: la estructura de la vivienda da la traza (Gabriel, capa Locales). Sus
# columnas que llegan al piso forman una retícula de 11 × 8 m girada −10° (dos
# módulos de 5.5 × 4). Cada bloque es un claro, con las columnas en las esquinas:
# dos filas de 4 puestos espalda con espalda (2 por módulo de 5.5 y 0.5 m en la
# línea de la retícula); una fila abre al sur y otra al norte, cada una a su comedor.
GIRO = float(os.environ.get('ATLAMPA_GIRO', '0'))   # giro de la retícula de la vivienda/estacionamiento (0 = ortogonal a la nave)
GV = math.radians(GIRO)
CLARO = (11.0, 8.0)
# (nombre, esquina a, esquina b del claro, hacia dónde abren las filas). B es el claro de Gabriel (su A cae casi
# toda en el corte del aro: ahí va el comedor poniente de B); D, un claro al sureste; C, el suyo del noroeste un
# claro al este (el suyo cruzaba el muro oeste).
BLOQUES = [('B', 447.52, 529.73, 'a'), ('D', 458.52, 521.73, 'b'), ('C', 436.52, 554.73, 'b')]
# 2026-10-12 (Gabriel: «más locales»): dos claros más en la crujía de sombra (oeste) y uno al norte; C baja un claro
# para compartir comedor con E (el claro de en medio, 436.52/545.73, es comedor de los dos)
BLOQUES = [('B', 447.52, 529.73, 'a'), ('D', 458.52, 521.73, 'b'), ('C', 436.52, 553.73, 'b'), ('E', 436.52, 537.73, 'b'), ('F', 447.52, 561.73, 'a')]
# Terrazas (2026-10-12, Gabriel: «el jardín dentro del cambio de plataformas, que solito se genere el desnivel»):
# las plataformas ya no son las de Rhino; se arman por distancia a la orilla del jardín. Junto al agua, el piso
# (+0.40); de ahí escalinatas de peralte 0.15 y huella 0.40 (NTC: ≤ 0.18 / ≥ 0.25) hasta cada terraza. Lejos del
# jardín se llega a +2.40 (donde baja la cinta del aro). Los claros de puestos quedan planos, a su nivel.
JARDIN_MAX = 110.0   # m² de jardín inundable (Gabriel, 2026-10-12)
TERRAZAS = [(1.2, 1.00), (8.0, 1.60), (15.0, 2.40)]   # (distancia a la orilla del jardín donde arranca la escalinata, nivel de la terraza)
ESCALON = (0.15, 0.40)                                 # peralte, huella
MACETAS = 5                                            # pocas: árboles jóvenes en maceta en las terrazas con sol
# lo de Rhino que no entra: la escalera de +2.40 a +4.40 (la cinta del aro ya conecta la nave sur con la norte)
QUITAR = {'36743530'}
BANOS = (551.0, 476.0, 557.5, 484.2)   # clientes (H, M) y locatarios, a +1.42 junto al acceso noreste (por confirmar)


def de_ret(a, b):
    """De la retícula de la vivienda (a a lo largo de los módulos, b a lo ancho) al diagrama (u, v)."""
    return (a * math.cos(GV) - b * math.sin(GV), a * math.sin(GV) + b * math.cos(GV))


def poli_ret(a0, b0, a1, b1):
    return Polygon([de_ret(a0, b0), de_ret(a1, b0), de_ret(a1, b1), de_ret(a0, b1)])


def caja_ret(tris, lins, a0, b0, a1, b1, z0, z1, aristas=True):
    """Caja en la retícula girada (de z0 a z1)."""
    P = [de_ret(a, b) for a, b in ((a0, b0), (a1, b0), (a1, b1), (a0, b1))]
    prisma8(tris, lins if aristas else [], [(p[0], p[1], z0) for p in P] + [(p[0], p[1], z1) for p in P])


def tri_poligono(pol, z, abajo=False):
    """Triángulos de un polígono (con huecos) horizontal a la altura z."""
    out = []
    for t in shapely.constrained_delaunay_triangles(pol).geoms:
        a, b, c = list(t.exterior.coords)[:3]
        s = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if (s < 0) != abajo:
            b, c = c, b
        out.append(((a[0], a[1], z), (b[0], b[1], z), (c[0], c[1], z)))
    return out


def poligonos(g):
    if g.is_empty:
        return []
    return [p for p in getattr(g, 'geoms', [g]) if p.geom_type == 'Polygon' and p.area > 0.05]


def losa(tris, lins, g, z0, z1):
    """Extruye la geometría g (polígonos con huecos) de z0 a z1, con sus aristas."""
    for p in poligonos(g):
        tris += tri_poligono(p, z1) + tri_poligono(p, z0, True)
        for anillo in [p.exterior] + list(p.interiors):
            c = list(anillo.coords)
            for a, b in zip(c, c[1:]):
                tris.append(((a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1)))
                tris.append(((a[0], a[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)))
                lins += [((a[0], a[1], z1), (b[0], b[1], z1)), ((a[0], a[1], z0), (b[0], b[1], z0))]
                lins.append(((a[0], a[1], z0), (a[0], a[1], z1)))


def rayas(lins, g, z, paso, eje=0, desfase=0.0):
    """Líneas paralelas (eje 0: a lo largo de v, en u constante) dentro de g, a la altura z."""
    if g.is_empty:
        return
    u0, v0, u1, v1 = g.bounds
    a0, a1 = (u0, u1) if eje == 0 else (v0, v1)
    x = math.floor((a0 - desfase) / paso) * paso + desfase + paso
    while x < a1:
        ln = LineString([(x, v0 - 1), (x, v1 + 1)] if eje == 0 else [(u0 - 1, x), (u1 + 1, x)])
        s = g.intersection(ln)
        for p in getattr(s, 'geoms', [s]):
            if p.geom_type == 'LineString' and p.length > 0.05:
                (a, b) = (p.coords[0], p.coords[-1])
                lins.append(((a[0], a[1], z), (b[0], b[1], z)))
        x += paso


def zanja_rhino(m, capas):
    """Fondos y paredes interiores del canal perimetral (capa excavación), recortados por el aro."""
    tris = []
    for o in m.Objects:
        if not capas[o.Attributes.LayerIndex].endswith('excavación'):
            continue
        for t in malla_de(o.Geometry):
            T = [al_diagrama(p) for p in t]
            zs = [p[2] for p in T]
            n = normal(T)
            if n is None or min(zs) > NIVEL(0) - 1e-3 or max(zs) > NIVEL(0) + 1e-3 or min(zs) < -4:   # sólo el canal (ni la tapa ni el bloque de abajo)
                continue
            if abs(n[2]) < 0.5 and all(abs(p[0] - ZANJA_EXT[0]) < 0.01 or abs(p[0] - ZANJA_EXT[2]) < 0.01 or abs(p[1] - ZANJA_EXT[1]) < 0.01
                                       or abs(p[1] - ZANJA_EXT[3]) < 0.01 for p in T):
                continue   # la pared de afuera es el muro
            for pol in fuera_del_circulo(T):
                for i in range(1, len(pol) - 1):
                    tris.append((pol[0], pol[i], pol[i + 1]))
    # la pared de afuera del canal (en Rhino es el bloque de abajo): de −2.0 al piso
    u0, v0, u1, v1 = ZANJA_EXT
    for a, b in (((u0, v0), (u1, v0)), ((u1, v0), (u1, v1)), ((u1, v1), (u0, v1)), ((u0, v1), (u0, v0))):
        for p, q in segmento_fuera((a[0], a[1], 0), (b[0], b[1], 0)):
            tris.append(((p[0], p[1], -2.0), (q[0], q[1], -2.0), (q[0], q[1], NIVEL(0))))
            tris.append(((p[0], p[1], -2.0), (q[0], q[1], NIVEL(0)), (p[0], p[1], NIVEL(0))))
    return tris


def pisos_gabriel(m, capas):
    """Los pisos de la nave norte que modeló Gabriel (capas niveles y escaleras):
    {z: geometría} de las caras de arriba (plataformas, huellas y descansos)."""
    pisos = {}
    for o in m.Objects:
        lp = capas[o.Attributes.LayerIndex]
        if not (lp.endswith('::niveles') or lp.endswith('::escaleras')) or str(o.Attributes.Id)[:8] in QUITAR:
            continue
        T3 = [[al_diagrama(p) for p in t] for t in malla_de(o.Geometry)]
        if not T3:
            continue
        us = [p[0] for t in T3 for p in t]
        vs = [p[1] for t in T3 for p in t]
        if min(vs) < HE_N or max(us) > MUROS['e'] + 1:   # la planta alta de la sur va aparte; lo que quedó fuera de la nave no
            continue
        for T in T3:
            n = normal(T)
            if n and n[2] > 0.99 and T[0][2] > PISO + 0.05:
                pol = Polygon([(p[0], p[1]) for p in T])
                if pol.area > 1e-6:
                    pisos.setdefault(round(T[0][2], 2), []).append(pol.buffer(1e-4, join_style='mitre'))
    return {z: unary_union(g).buffer(-1e-4, join_style='mitre') for z, g in pisos.items()}


def terrazas(planta, jardin):
    """{z: geometría} de las terrazas que bajan al jardín, con sus escalinatas, y los claros de los bloques planos."""
    pe, hu = ESCALON
    bandas = []   # (d0, d1, z)
    z_ant = PISO
    for d0, z in TERRAZAS:
        n = max(1, math.ceil((z - z_ant) / pe - 1e-9))
        h = (z - z_ant) / n
        for k in range(1, n):
            bandas.append((d0 + (k - 1) * hu, d0 + k * hu, round(z_ant + k * h, 3)))
        bandas.append((d0 + (n - 1) * hu, None, z))   # (la terraza: hasta la siguiente escalinata)
        z_ant = z
    for i, (d0, d1, z) in enumerate(bandas):
        if d1 is None:
            bandas[i] = (d0, bandas[i + 1][0] if i + 1 < len(bandas) else 1e3, z)
    pisos = {}
    nivel_en = lambda p: max([PISO] + [z for d0, d1, z in bandas if jardin.distance(p) >= d0])
    for d0, d1, z in bandas:
        g = jardin.buffer(min(d1, 200), join_style='mitre').difference(jardin.buffer(d0, join_style='mitre')).intersection(planta)
        if not g.is_empty:
            pisos[z] = unary_union([pisos[z], g]) if z in pisos else g
    # los claros de los bloques: planos, al nivel de su centro
    for nombre, a0, b0, eje in BLOQUES:
        c = poli_ret(a0 - 0.5, b0 - 0.5, a0 + CLARO[0] + 0.5, b0 + CLARO[1] + 0.5).intersection(planta)
        zc = nivel_en(c.centroid)
        # alrededor del claro, escalinata hacia lo que haya: a k huellas del claro, el nivel queda a ≤ k peraltes del suyo
        K = 7
        piso_libre = planta.difference(unary_union(list(pisos.values())))
        nuevo = {}
        for k in range(K, 0, -1):
            anillo = c.buffer(k * hu, join_style='mitre').difference(c.buffer((k - 1) * hu, join_style='mitre'))
            for z, g in list(pisos.items()) + [(PISO, piso_libre)]:
                pz = g.intersection(anillo)
                if pz.is_empty or pz.area < 1e-3:
                    continue
                z2 = round(min(max(z, zc - k * pe), zc + k * pe), 3)
                if z2 != z:
                    if z in pisos:
                        pisos[z] = pisos[z].difference(pz)
                    if z == PISO:
                        piso_libre = piso_libre.difference(pz)
                    nuevo.setdefault(z2, []).append(pz)
        for z in list(pisos):
            pisos[z] = pisos[z].difference(c)
        for z2, gs in nuevo.items():
            if z2 > PISO + 1e-3:
                pisos[z2] = unary_union([pisos.get(z2, Polygon())] + gs)
        if zc > PISO:
            pisos[zc] = unary_union([pisos.get(zc, Polygon()), c])
    return {z: g for z, g in pisos.items() if not g.is_empty}


def altura_en(x, y, pisos, interior, jardin):
    """El piso más alto en (x, y): una plataforma, el piso del mercado, el jardín o (fuera) la zanja."""
    p = Point(x, y)
    zs = [z for z, g in pisos.items() if g.contains(p)]
    if zs:
        return max(zs)
    if jardin.contains(p):
        return Z_AGUA
    if interior.contains(p):
        return PISO
    return NIVEL(-0.2)   # la zanja o el aro: hay vacío


def barandal(lins, a, b, z):
    """Barandal de 0.90 (NTC 2.2.2.14.1): pasamanos, travesaño, zoclo y barrotes (a cada 0.30 en el dibujo)."""
    L = math.dist(a, b)
    if L < 0.05:
        return
    for h in (0.1, 0.5, BARANDAL):
        lins.append(((a[0], a[1], z + h), (b[0], b[1], z + h)))
    n = max(1, round(L / 0.3))
    for i in range(n + 1):
        x, y = a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n
        lins.append(((x, y, z + (0.0 if i % 4 == 0 else 0.1)), (x, y, z + BARANDAL)))


def bordes(pisos, interior, jardin):
    """Cada borde de cada piso: si el de al lado está ≤ 30 cm abajo, contrahuella;
    si más, barandal. Devuelve (triángulos de contrahuella, segmentos de barandal (a, b, z), metros de barandal)."""
    tris, barr = [], []
    for z, g in pisos.items():
        for p in poligonos(orient(g, 1) if g.geom_type == 'Polygon' else g):
            p = orient(p, 1)
            for anillo in [p.exterior] + list(p.interiors):
                c = list(anillo.coords)
                for a, b in zip(c, c[1:]):
                    L = math.dist(a, b)
                    if L < 0.02:
                        continue
                    n = max(1, math.ceil(L / 0.5))
                    nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L     # hacia afuera (anillos orientados)
                    tramo = None
                    for i in range(n):
                        f0, f1 = i / n, (i + 1) / n
                        mx, my = a[0] + (b[0] - a[0]) * (f0 + f1) / 2, a[1] + (b[1] - a[1]) * (f0 + f1) / 2
                        zl = altura_en(mx + nx * 0.08, my + ny * 0.08, pisos, interior, jardin)
                        d = z - zl
                        tipo = None if d <= 0.005 else ('escalon' if d <= VACIO + 1e-6 else 'barandal')
                        p0 = (a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0)
                        p1 = (a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1)
                        if tipo == 'escalon':
                            tris.append(((p0[0], p0[1], zl), (p1[0], p1[1], zl), (p1[0], p1[1], z - 0.15)))
                            tris.append(((p0[0], p0[1], zl), (p1[0], p1[1], z - 0.15), (p0[0], p0[1], z - 0.15)))
                        if tramo and tramo[0] == tipo == 'barandal':
                            tramo[2] = p1
                        else:
                            if tramo and tramo[0] == 'barandal':
                                barr.append((tramo[1], tramo[2], z))
                            tramo = [tipo, p0, p1]
                    if tramo and tramo[0] == 'barandal':
                        barr.append((tramo[1], tramo[2], z))
    return tris, barr


def libre_en(pisos, z):
    """El piso a la altura z sin lo que tiene encima (otro piso más alto: escaleras, gradas)."""
    arriba = [g for z2, g in pisos.items() if z2 > z + 0.05]
    return pisos[z].difference(unary_union(arriba)) if arriba else pisos[z]


def a_ret(u, v):
    """Del diagrama (u, v) a la retícula de la vivienda (a, b)."""
    return (u * math.cos(GV) + v * math.sin(GV), -u * math.sin(GV) + v * math.cos(GV))


def tira(p, q, d0, d1, acorta=0.0, adentro=None):
    """Franja a lo largo de p→q (recortada `acorta` en cada punta), de d0 a d1 m hacia
    `adentro` (vector unitario); negativo: hacia afuera."""
    L_ = math.dist(p, q)
    if L_ < 2 * acorta + 0.05:
        return None
    t = ((q[0] - p[0]) / L_, (q[1] - p[1]) / L_)
    a = (p[0] + t[0] * acorta, p[1] + t[1] * acorta)
    b = (q[0] - t[0] * acorta, q[1] - t[1] * acorta)
    n = adentro
    return Polygon([(a[0] + n[0] * d0, a[1] + n[1] * d0), (b[0] + n[0] * d0, b[1] + n[1] * d0),
                    (b[0] + n[0] * d1, b[1] + n[1] * d1), (a[0] + n[0] * d1, a[1] + n[1] * d1)])


def puesto_geo(S, L, pol, frentes, z):
    """Un puesto con la forma que le toque (rectángulo, o recortado por la curva del
    aro: ahí el vidrio es su fondo): muros de 6 cm donde no hay frente, techo, y en
    cada frente mostrador (0.95), letrero y cortina enrollada arriba."""
    H, e = PUESTO[2], 0.06
    pol = orient(pol, 1)
    zona_f = unary_union([f.buffer(0.03, cap_style=2) for f in frentes]) if frentes else None
    c = list(pol.exterior.coords)
    for a, b in zip(c, c[1:]):
        seg = LineString([a, b])
        if seg.length < 0.03:
            continue
        tx, ty = (b[0] - a[0]) / seg.length, (b[1] - a[1]) / seg.length
        n = (-ty, tx)   # adentro (anillo antihorario)
        piezas_f = seg.intersection(zona_f) if zona_f is not None else LineString()
        piezas_m = seg.difference(zona_f) if zona_f is not None else seg
        for g, es_frente in ((piezas_f, True), (piezas_m, False)):
            for pz in getattr(g, 'geoms', [g]):
                if pz.is_empty or pz.geom_type != 'LineString' or pz.length < 0.05:
                    continue
                p0, p1 = pz.coords[0], pz.coords[-1]
                if es_frente:
                    for t_, za, zb in ((tira(p0, p1, 0, 0.45, 0.15, n), z, z + 0.95),          # mostrador
                                       (tira(p0, p1, -0.05, 0, 0, n), z + H - 0.45, z + H),     # letrero
                                       (tira(p0, p1, 0, 0.3, e, n), z + H - 0.75, z + H - 0.45)):   # cortina enrollada
                        if t_ is not None:
                            losa(S['local'], L['local'], t_, za, zb)
                    for h in (0.1, 0.2):
                        L['local'].append(((p0[0] - n[0] * 0.01, p0[1] - n[1] * 0.01, z + H - 0.75 + h), (p1[0] - n[0] * 0.01, p1[1] - n[1] * 0.01, z + H - 0.75 + h)))
                else:
                    t_ = tira(p0, p1, 0, e, 0, n)
                    if t_ is not None:
                        losa(S['local'], L['local'], t_, z, z + H)
    losa(S['local'], L['local'], pol, z + H, z + H + 0.1)   # techo


def puestos(S, L, pisos, interior, ocupa):
    """Los bloques de puestos (ver BLOQUES), resueltos contra lo que estorba:
      · la columna de acero del mercado que cae en una fila queda dentro de un
        muro: la división más cercana se recorre hasta ella;
      · un puesto que quedaría de menos de 2.0 de frente se junta con el vecino;
      · el corte curvo del aro (el vidrio) recorta los puestos: el vidrio es su
        fondo; se quedan si conservan ≥ 4 m² y 2.0 de frente (NTC tabla 2.2.1.2),
        y si no, se juntan con el de al lado;
      · los de cada punta de fila abren también al costado (dos frentes: dan a
        dos comedores).
    Devuelve [(bloque, z, puestos, zonas de comedor)] y cuenta los casos."""
    hechos = []
    W, F, H = PUESTO
    cols = COLUMNAS_ACERO
    for nombre, a0, b0, eje in BLOQUES:
        a1, b1 = a0 + CLARO[0], b0 + CLARO[1]
        claro = poli_ret(a0, b0, a1, b1)
        z = max(pisos, key=lambda zz: pisos[zz].intersection(claro).area)
        cabe = libre_en(pisos, z).buffer(0.02).intersection(interior)
        if eje == 'b':   # dos filas a lo largo de a; una abre a −b y otra a +b (2 puestos por módulo de 5.5)
            filas = [((a0 + 0.5, b0 + FRENTE), (1, 0), (0, -1), CLARO[0] - 1.0), ((a0 + 0.5, b1 - FRENTE), (1, 0), (0, 1), CLARO[0] - 1.0)]
            zonas = [poli_ret(a0 - 4, b0 - 9, a1 + 4, b0), poli_ret(a0 - 4, b1, a1 + 4, b1 + 9)]
        else:            # dos filas a lo largo de b, espalda con espalda en la línea del módulo (a0 + 5.5)
            filas = [((a0 + 5.5 - F, b0 + 0.25), (0, 1), (-1, 0), CLARO[1] - 0.5), ((a0 + 5.5 + F, b0 + 0.25), (0, 1), (1, 0), CLARO[1] - 0.5)]
            zonas = [poli_ret(a0 + 5.5 - F - FRENTE - 9, b0 - 4, a0 + 5.5 - F - FRENTE, b1 + 4), poli_ret(a0 + 5.5 + F + FRENTE, b0 - 4, a0 + 5.5 + F + FRENTE + 9, b1 + 4)]
        cuenta = {'puestos': 0, 'dos_frentes': 0, 'recortados': 0, 'columnas': 0, 'juntados': 0}
        for (pa, pb), t, nn, largo in filas:
            def uv(x, y):   # x a lo largo del frente, y hacia el fondo (0 = el frente)
                return de_ret(pa + t[0] * x - nn[0] * y, pb + t[1] * x - nn[1] * y)

            def en_fila(u, v):
                aa, bb = a_ret(u, v)
                return ((aa - pa) * t[0] + (bb - pb) * t[1], -((aa - pa) * nn[0] + (bb - pb) * nn[1]))
            # las divisiones (2.5) y las columnas de acero que caen en la fila: cada una, dentro de un muro
            cortes = [i * W for i in range(int(largo / W + 1e-6) + 1)]
            if cortes[-1] < largo - 0.3:
                cortes.append(largo)
            for x, y in (en_fila(u, v) for u, v in cols):
                if -0.2 < y < F + 0.2 and 0.3 < x < largo - 0.3:
                    k = min(range(1, len(cortes) - 1), key=lambda i: abs(cortes[i] - x)) if len(cortes) > 2 else None
                    if k is not None:
                        cortes[k] = x
                        cuenta['columnas'] += 1
            cortes = sorted(set(round(c, 3) for c in cortes))

            def pieza(x0, x1):
                g = Polygon([uv(x0, 0), uv(x1, 0), uv(x1, F), uv(x0, F)]).intersection(cabe)
                g = max(poligonos(g), key=lambda q: q.area) if poligonos(g) else None
                return g
            # se juntan los de menos de 2.0 de frente, o los que el corte dejó de < 4 m²
            while len(cortes) > 2:
                malos = [i for i in range(len(cortes) - 1)
                         if cortes[i + 1] - cortes[i] < 2.0 - 1e-6 or (pieza(cortes[i], cortes[i + 1]) is not None and pieza(cortes[i], cortes[i + 1]).area < PUESTO_MIN)]
                if not malos:
                    break
                i = malos[0]
                j = i + 1 if i + 1 < len(cortes) - 1 else i
                del cortes[max(j, 1) if len(cortes) > 2 else j]
                cuenta['juntados'] += 1
            for i in range(len(cortes) - 1):
                x0, x1 = cortes[i], cortes[i + 1]
                g = pieza(x0, x1)
                rect = Polygon([uv(x0, 0), uv(x1, 0), uv(x1, F), uv(x0, F)])
                if g is None or g.area < PUESTO_MIN:
                    continue
                frente = LineString([uv(x0, 0), uv(x1, 0)]).intersection(g.buffer(0.01))
                if frente.is_empty or frente.length < 2.0 - 1e-6:
                    continue
                frentes = [frente]
                # las puntas de la fila abren también al costado, si da a piso libre
                for xs, fuera in ((x0, -0.7), (x1, 0.7)):
                    if (i == 0 and xs == x0) or (i == len(cortes) - 2 and xs == x1):
                        q = Point(uv(xs + fuera, F / 2))
                        if cabe.contains(q) and not claro.buffer(-0.01).contains(q) or (cabe.contains(q) and eje == 'a'):
                            lado = LineString([uv(xs, 0.45), uv(xs, F - 0.06)]).intersection(g.buffer(0.01))
                            if not lado.is_empty and lado.length > 1.0:
                                frentes.append(lado)
                if len(frentes) > 1:
                    cuenta['dos_frentes'] += 1
                if g.area < rect.area - 0.05:
                    cuenta['recortados'] += 1
                puesto_geo(S, L, g, frentes, z)
                DIBUJO['puestos'].append(g)
                cuenta['puestos'] += 1
        if cuenta['puestos']:
            hechos.append((nombre, z, cuenta['puestos'], zonas, cuenta))
            ocupa.append(claro.buffer(0.05))
    return hechos


DIBUJO = {'puestos': [], 'mesas': []}   # huellas para la planta rotulada (se llenan al armar)


def comedores(S, L, pisos, hechos, ocupa, jardin_lluvia):
    """Mesas con bancas en una sola rejilla (la de la vivienda, girada −10°), en las
    franjas a las que abren los puestos, al nivel del bloque. Devuelve, por bloque y
    por frente, cuántas mesas le tocan (cada bloque da servicio al menos a dos comedores)."""
    M_ = MESA
    paso_a, paso_b = M_['largo'] + M_['cabecera'], M_['ancho'] + 2 * M_['banca'] + M_['entre']
    prof = M_['ancho'] + 2 * M_['banca']
    libre = unary_union(ocupa + [Point(u, v).buffer(0.35) for u, v in COLUMNAS_ACERO])
    puestas = []
    a_ret = lambda x, y: (x * math.cos(-GV) - y * math.sin(-GV), x * math.sin(-GV) + y * math.cos(-GV))
    # (2026-10-12) con terrazas, una mesa va en la terraza plana donde quepa entera (no sólo al nivel del bloque)
    bases = [(z2, libre_en(pisos, z2).buffer(-0.3, join_style='mitre')) for z2 in pisos if pisos[z2].area > 20]
    piso_b = caja2d(*ZANJA).difference(Point(ARO).buffer(CORTE + 0.3, 256)).difference(unary_union(list(pisos.values()))).buffer(-0.3, join_style='mitre')
    bases.append((PISO, piso_b))   # y el piso del mercado (+0.40), junto al jardín
    # 2.ª pasada (zona = toda la nave): hasta MESAS_POR_PUESTO × puestos, en lo plano más cercano a los puestos
    tope = round(MESAS_POR_PUESTO * sum(h[2] for h in hechos))
    cerca = unary_union(DIBUJO['puestos']) if DIBUJO['puestos'] else Point(0, 0)
    for nombre, z_bloque, _, zonas, _c in hechos + [('*', None, 0, sorted(poligonos(caja2d(*CAJA_N).difference(unary_union(ocupa)).buffer(0)), key=lambda q: -q.area)[:1], None)]:
        if nombre == '*':
            # (la nave entera, de lo más cercano a los puestos hacia afuera: anillos de 3 m)
            zonas = [caja2d(*CAJA_N).intersection(cerca.buffer(d + 3)).difference(cerca.buffer(d)) for d in range(0, 30, 3)]
        for zona in zonas:
            if nombre == '*' and len(puestas) >= tope:
                break
            if zona.is_empty:
                continue
            ab = [a_ret(x, y) for x, y in zona.envelope.exterior.coords]
            a = math.floor(min(q[0] for q in ab) / paso_a) * paso_a
            while a < max(q[0] for q in ab):
                b = math.floor(min(q[1] for q in ab) / paso_b) * paso_b
                while b < max(q[1] for q in ab):
                    q = poli_ret(a - 0.1, b - 0.1, a + M_['largo'] + 0.1, b + prof + 0.1)
                    zs = [z2 for z2, bz in bases if bz.contains(q)]
                    if zs and not (nombre == "*" and len(puestas) >= tope) and zona.contains(q.centroid) and not q.intersects(libre) and not q.intersects(jardin_lluvia)                             and not any(q.intersects(x) for x in puestas):
                        z = zs[0]
                        puestas.append(q)
                        DIBUJO['mesas'].append(q)
                        bm = b + M_['banca']
                        caja_ret(S['mesa'], L['mesa'], a, bm, a + M_['largo'], bm + M_['ancho'], z + 0.70, z + 0.75)       # cubierta de la mesa
                        for bb in (b, bm + M_['ancho']):                                                                 # bancas
                            caja_ret(S['mesa'], L['mesa'], a + 0.05, bb + 0.05, a + M_['largo'] - 0.05, bb + M_['banca'] - 0.05, z + 0.40, z + 0.45)
                        for aa in (a + 0.15, a + M_['largo'] - 0.15):                                                    # patas
                            for bb, h in ((b + 0.17, 0.4), (bm + 0.37, 0.7), (bm + M_['ancho'] + 0.18, 0.4)):
                                pp = de_ret(aa, bb)
                                L['mesa'].append(((pp[0], pp[1], z), (pp[0], pp[1], z + h)))
                    b += paso_b if nombre != "*" else 0.6
                a += paso_a if nombre != "*" else 0.6
    # cuántas mesas da cada frente (cerca de él: hasta 9 m)
    return [(nombre, [sum(1 for q in puestas if zona.contains(q.centroid)) for zona in zonas]) for nombre, z, _, zonas, _c in hechos]


def banos(S, L, pisos):
    """Baños de clientes (H, M) y de locatarios: un bloque cerrado de 3.0 con sus tres puertas."""
    u0, v0, u1, v1 = BANOS
    zs = [z for z, g in pisos.items() if g.contains(Point((u0 + u1) / 2, (v0 + v1) / 2))]
    z = max(zs) if zs else PISO
    caja(S['local'], L['local'], u0, v0, z, u1, v1, z + 3.0)
    for k in range(1, 3):
        v = v0 + (v1 - v0) * k / 3
        L['local'].append(((u0, v, z + 3.0), (u1, v, z + 3.0)))
    for k in range(3):   # las puertas (0.90 × 2.10) al oeste
        vm = v0 + (v1 - v0) * (k + 0.5) / 3
        for (a, b) in (((u0 - 0.01, vm - 0.45, z), (u0 - 0.01, vm - 0.45, z + 2.1)), ((u0 - 0.01, vm + 0.45, z), (u0 - 0.01, vm + 0.45, z + 2.1)),
                       ((u0 - 0.01, vm - 0.45, z + 2.1), (u0 - 0.01, vm + 0.45, z + 2.1))):
            L['local'].append((a, b))
    return z


def mercado_norte(m, capas):
    viv = [c for c in json.load(open(COLS_VIVIENDA)) if c['z0'] < 1 and adentro(c['u'], c['v'], 0)]
    rng = random.Random(7)
    tan = math.tan(math.radians(LLUVIA_ANG))
    disco = Point(ARO).buffer(CORTE, 256)
    disco_m = Point(ARO).buffer(CORTE + 0.3, 256)
    interior = caja2d(*ZANJA).difference(disco_m)
    planta = caja2d(ZANJA[0], ZANJA[1], ZANJA[2], MUROS['n']).difference(disco_m)   # (hasta el muro norte: los escalones de los accesos)
    hoyo = unary_union([caja2d(*q) for q in franjas_hoyo()])
    alcance = lambda z: hoyo.buffer((Z_LLUVIA - z) * tan, join_style='mitre')   # hasta dónde llega la lluvia del hoyo a la altura z
    col_viv = unary_union([Point(c['u'], c['v']).buffer(c['lado'] * 0.71 + JUNTA, 16) for c in viv])
    # el jardín: sólo donde la lluvia del hoyo llega al agua (y un poco más, bajo las orillas)
    # (2026-10-12, Gabriel: jardín inundable ≤ JARDIN_MAX m²): el margen bajo las orillas se achica hasta caber;
    # nunca menos que el alcance de la lluvia (su regla)
    margen = 0.6
    while True:
        jardin = alcance(Z_AGUA).buffer(margen, join_style='mitre').intersection(interior)
        if jardin.area <= JARDIN_MAX or margen <= 0:
            break
        margen = max(0.0, margen - 0.05)
    if jardin.area > JARDIN_MAX:
        print('OJO: el alcance de la lluvia del hoyo ya pasa de', JARDIN_MAX, 'm²: hay que achicar el hoyo')
    print('jardín', round(jardin.area, 1), 'm², margen bajo las orillas', round(margen, 2))
    # los pisos de Gabriel: ranuras cerradas, recortados a la nave, a la lluvia del hoyo y a las columnas de la vivienda
    pisos = {}
    for z, g in sorted(terrazas(planta.difference(jardin), jardin).items()):   # (antes: pisos_gabriel(m, capas), los de Rhino)
        g = g.buffer(CIERRA, join_style='mitre').buffer(-CIERRA, join_style='mitre')
        g = g.intersection(planta).difference(alcance(z)).difference(col_viv.buffer(0.05))
        if g.area > 0.1:
            pisos[z] = g
    S = {k: [] for k in ('piso', 'resto', 'zanja', 'jardin', 'agua', 'plataforma', 'escalera', 'local', 'mesa', 'banca', 'humedal', 'agua_p')}
    L = {k: [] for k in ('piso', 'agua', 'plataforma', 'lamina', 'local', 'mesa', 'escalera', 'baranda', 'junco', 'pasto', 'banca', 'humedal')}
    # piso del mercado (+0.40, una losa de 0.20 sobre el 0.00 de la zanja) con el jardín abierto; lo de dentro del aro, aparte
    piso = unary_union([caja2d(*ZANJA), caja2d(ZANJA_EXT[0], ZANJA_EXT[3], ZANJA_EXT[2], CAJA_N[3])]).difference(disco).difference(jardin)
    losa(S['piso'], L['piso'], piso, NIVEL(0), PISO)
    for p in poligonos(caja2d(*CAJA_N).intersection(disco)):
        S['resto'] += tri_poligono(p, NIVEL(0))
    S['zanja'] = zanja_rhino(m, capas)
    # jardín inundable: paredes del hueco hasta el fondo y el espejo de agua
    for p in poligonos(jardin):
        for anillo in [p.exterior] + list(p.interiors):
            c = list(anillo.coords)
            for a, b in zip(c, c[1:]):
                S['jardin'] += [((a[0], a[1], Z_JARDIN), (b[0], b[1], Z_JARDIN), (b[0], b[1], PISO)),
                                ((a[0], a[1], Z_JARDIN), (b[0], b[1], PISO), (a[0], a[1], PISO))]
        S['agua'] += tri_poligono(p, Z_AGUA)
        c = list(p.exterior.coords)
        L['agua'] += [((a[0], a[1], Z_AGUA), (b[0], b[1], Z_AGUA)) for a, b in zip(c, c[1:])]
    # plataformas: losa de lámina de 15 cm (acanalada: rayas a cada 0.40) y postes a cada 2 submódulos
    for z, g in pisos.items():
        losa(S['plataforma'], L['plataforma'], g, z - 0.15, z)
        rayas(L['lamina'], g, z + 0.005, 0.4)
        for p in poligonos(g):
            if p.area < 12:
                continue   # (huellas y descansos chicos: van sobre sus zancas)
            u0, v0, u1, v1 = p.bounds
            x = math.ceil(u0 / (2 * M)) * 2 * M
            while x < u1:
                y = math.ceil(v0 / (2 * M)) * 2 * M
                while y < v1:
                    if p.buffer(-0.2).contains(Point(x, y)) and not col_viv.buffer(0.3).contains(Point(x, y)):
                        zb = Z_JARDIN if jardin.contains(Point(x, y)) else max([PISO] + [z2 for z2, g2 in pisos.items() if z2 < z - 0.2 and g2.contains(Point(x, y))])
                        if z - 0.15 - zb > 0.3:
                            caja(S['plataforma'], L['plataforma'], x - 0.05, y - 0.05, zb, x + 0.05, y + 0.05, z - 0.15)
                    y += 2 * M
                x += 2 * M
    # contrahuellas y barandales (NTC: barandal de 0.90 donde el vacío pasa de 0.30)
    esc_t, barr = bordes(pisos, interior, jardin)
    S['escalera'] += esc_t
    for a, b, z in barr:
        barandal(L['baranda'], a, b, z)
    m_barandal = sum(math.dist(a, b) for a, b, z in barr)
    # puestos (la estructura de la vivienda da la traza), sus comedores y los baños
    ocupa = []
    hechos = puestos(S, L, pisos, interior, ocupa)
    z_banos = banos(S, L, pisos)
    ocupa.append(caja2d(*BANOS).buffer(1.2))
    mesas = comedores(S, L, pisos, hechos, ocupa, unary_union([alcance(z) for z in pisos]))
    for nombre, cuenta in mesas:
        if sum(1 for c in cuenta if c >= 2) < 2:
            print('OJO: el bloque', nombre, 'no da a dos comedores', cuenta)
    # árboles jóvenes (Gabriel: «no tienen tanto tiempo ahí»): en el jardín, de 2.5 a 4 m; y unos en maceta
    arboles, cand = [], []
    vis = jardin.difference(unary_union(list(pisos.values())))
    for p in poligonos(vis.buffer(-0.6)):
        u0, v0, u1, v1 = p.bounds
        for x in [u0 + 0.6 * i for i in range(int((u1 - u0) / 0.6) + 1)]:
            for y in [v0 + 0.6 * j for j in range(int((v1 - v0) / 0.6) + 1)]:
                if p.contains(Point(x, y)):
                    cand.append((x, y))
    rng.shuffle(cand)
    for x, y in cand:
        if len(arboles) >= 4 or any(math.hypot(x - a[0], y - a[1]) < 3.0 for a in arboles):
            continue
        arboles.append((x, y, Z_AGUA, rng.uniform(2.5, 4.0)))
    # plantas: juncos en el agua que se ve; pastos en la orilla de las plataformas que dan al jardín
    for p in poligonos(vis):
        n = int(p.area * 1.2)
        u0, v0, u1, v1 = p.bounds
        k = 0
        while k < n:
            x, y = rng.uniform(u0, u1), rng.uniform(v0, v1)
            if not p.contains(Point(x, y)):
                continue
            h = rng.uniform(0.5, 1.1)
            dx, dy = rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15)
            L['junco'] += [((x, y, Z_AGUA), (x + dx, y + dy, Z_AGUA + h)), ((x + dx * 0.7, y + dy * 0.7, Z_AGUA + h * 0.7), (x + dx, y + dy, Z_AGUA + h))]
            k += 1
    # pocas macetas (MACETAS): árboles jóvenes en las terrazas con sol (crujía este), lejos de puestos y mesas
    estorba = unary_union(DIBUJO['puestos'] + DIBUJO['mesas']).buffer(1.0) if DIBUJO['puestos'] else Polygon()
    macetas = []
    for z in sorted(pisos, reverse=True):
        if z < 0.99:
            continue
        g = libre_en(pisos, z).buffer(-0.7, join_style='mitre').difference(alcance(z)).difference(estorba)
        u0, v0, u1, v1 = g.bounds if not g.is_empty else (0, 0, 0, 0)
        y = v0
        while y < v1:
            x = max(u0, VALLE[1] + 1.0)
            while x < u1:
                if len(macetas) < MACETAS and g.contains(Point(x, y)) and all(math.hypot(x - a, y - b) > 8 for a, b, _ in macetas):
                    macetas.append((x, y, z))
                x += 1.0
            y += 1.0
    for x, y, z in macetas:
        caja(S['plataforma'], L['plataforma'], x - 0.45, y - 0.45, z, x + 0.45, y + 0.45, z + 0.6)
        arboles.append((x, y, z + 0.6, rng.uniform(2.0, 3.0)))
    # los patios del aro (bancas, estanque, árboles)
    patios = patios_aro(S, L, arboles)
    # métricas para el reporte
    total = unary_union(list(pisos.values()))
    occ = total.area / 5.6 + piso.difference(total).area / 3.0    # NTC tabla 3.2: venta en PB 3 m²/persona, en pisos altos 5.6
    resumen = {'hoyo_m2': round(hoyo.area, 1), 'jardin_m2': round(jardin.area, 1), 'jardin_visible_m2': round(vis.area, 1),
               'hoyo/jardin_visible': round(hoyo.area / max(vis.area, 1e-6), 2), 'margen_lluvia_m': round((Z_LLUVIA - Z_AGUA) * tan, 2),
               'volumen_hasta_-0.20_m3': round(jardin.area * (NIVEL(-0.20) - Z_JARDIN), 1),
               'plataformas_m2': round(total.area, 1), 'niveles': sorted(pisos), 'barandal_m': round(m_barandal, 1),
               'puestos': sum(h[2] for h in hechos), 'bloques': {h[0]: dict(h[4], z=h[1]) for h in hechos},
               'mesas': len(DIBUJO['mesas']), 'comedores': mesas, 'banos_z': z_banos, 'arboles': len(arboles),
               'ocupantes': round(occ), 'ancho_salidas_m': round(occ * 0.005, 2), 'patios': patios}
    print('paso 3', json.dumps(resumen, ensure_ascii=False))
    planta_png(pisos, hoyo, vis, jardin, arboles, viv, hechos, barr)
    return S, L, arboles, resumen


# ================= Patios del aro (2026-10-12) =================
# Lo que el aro cortó de las naves (r < 47): patios de baja intensidad, sólo con
# conexión visual al mercado (sin puestos ni mesas). Una senda libre junto al
# vidrio (y bajo la cinta), un estanque chico de humedal con bordillo para
# sentarse, y estancias de bancas que miran al estanque, con un árbol joven atrás.
# 2026-10-12 (Gabriel): del vidrio hacia el centro del aro, en franjas: circulación frente a los locales que abren al
# patio, mesitas (una por local, con su mismo ritmo), otra circulación (con el anillo de columnas del aro), los humedales
# como límite y, detrás, las bancas recreativas. Radios desde el centro del aro.
PATIO = {'senda': 2.5,          # libre desde el corte (r 47) hacia adentro: ≥ 1.20 de paso, y la cinta encima (r 44.55–46.55)
         # franjas (r0, r1). (2026-10-12, Gabriel: «más grueso el buffer de mesas, otra hilera; la circulación la veo grande»):
         # antes 2.40 | una hilera en 2.00 | 4.00 con las columnas; ahora 1.80 | dos hileras de mesitas en tresbolillo en 3.60 |
         # 3.00 con las columnas del aro. Libres reales: del vidrio a las mesitas 2.35 (adentro van las columnas de afuera del aro,
         # r 46.12–46.92: quedan 1.47 entre ellas y las mesitas, NTC ≥ 1.10); de la 2a hilera a las columnas de adentro, 2.23
         'circ1': (45.2, 47.0), 'mesas': (41.6, 45.2), 'circ2': (38.6, 41.6),
         'hum_r': 36.4,         # radio del centro de los humedales (tangenciales, 12 × 4: de r 34.4 a 38.4)
         'bancas_r': 33.4,      # las bancas, sólo de este radio hacia adentro
         'col': (38.9, 40.1),   # anillo de las columnas interiores del aro: sin bancas
         'hum': (12.0, 4.0), 'hum_alto': 1.0,   # humedales: 12 × 4 = 48 m², 1 m sobre el piso (Gabriel, 2026-10-12)
         'm2_banca': 32.0,      # una banca cada tantos m² de patio libre
         'tezontle': 0.03}      # (2026-10-12, Gabriel: «área abierta permeable», ref. bancas de lámina de colores sobre tezontle)
HE_LIM_P = (401.0, 409.0)   # Heliotropo (v)
NAVES_P = [(522.181, 417.865, 558.945, 488.266), (504.601, 323.588, 558.946, 396.78)]
BANCAS_P = []   # [u, v, ángulo°, tipo] para los planos (planos-dwg.py)
MESITA = {'lado': 0.70, 'banco': 0.34, 'sep': 0.62, 'r': 44.3, 'r2': 42.5}   # r: hilera de los locales; r2: la segunda, en tresbolillo   # mesita de 0.70 con dos bancos a los lados (a lo largo del arco)
MESITAS_TH = []   # ángulo (rad) del centro de cada local que abre al patio (lo llenan las naves): una mesita por local
VIDRIO_VANOS = []   # (θ0, θ1 en rad, z0, z1): tramos del vidrio del aro que se abren (locales al patio, llegadas de la cinta)


def mesita(S, L, c, t, z):
    """Mesita cuadrada (tablero a 0.75, pata central) con dos bancos a los lados; t = tangente al arco."""
    M_ = MESITA
    losa(S['mesa'], L['mesa'], rect_rot(c, t, M_['lado'], M_['lado']), z + 0.72, z + 0.75)
    caja(S['mesa'], L['mesa'], c[0] - 0.04, c[1] - 0.04, z, c[0] + 0.04, c[1] + 0.04, z + 0.72)
    for s_ in (-1, 1):
        b = (c[0] + t[0] * s_ * M_['sep'], c[1] + t[1] * s_ * M_['sep'])
        losa(S['mesa'], L['mesa'], rect_rot(b, t, M_['banco'], M_['banco']), z, z + 0.45)

# Banca «onda»: soleras de acero de 5 cm cada 7 cm sobre dos largueros de tubo que siguen el perfil, y un patín
# al piso (como las bancas de la referencia). Perfil z(x), x a lo largo de 2.20 m:
#   'doble'  = dos asientos espalda con espalda: lomo al centro (se recargan los dos)
#   'chaise' = camastro: respaldo reclinado en un extremo
BANCA_ONDA = {'largo': 2.2, 'ancho': 0.75, 'paso': 0.07, 'solera': (0.05, 0.015)}


def perfil_banca(tipo, x, L):
    if tipo == 'doble':
        return 0.36 + 0.52 * math.exp(-((x - L / 2) / 0.32) ** 2) + 0.04 * math.cos(x / L * 2 * math.pi)
    t = max(0.0, (x - L * 0.55) / (L * 0.45))
    return 0.34 + 0.06 * math.sin(x / L * math.pi) + 0.55 * t * t


def rect_rot(c, t, largo, fondo):
    n = (-t[1], t[0])
    return Polygon([(c[0] + t[0] * sx * largo / 2 + n[0] * sy * fondo / 2, c[1] + t[1] * sx * largo / 2 + n[1] * sy * fondo / 2)
                    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])


def banca_onda(S, L, c, ang, tipo, z0):
    B = BANCA_ONDA
    Lg, W = B['largo'], B['ancho']
    t = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
    n = (-t[1], t[0])
    P = lambda x, y, z: (c[0] + t[0] * (x - Lg / 2) + n[0] * y, c[1] + t[1] * (x - Lg / 2) + n[1] * y, z0 + z)
    k = int(Lg / B['paso'])
    for i in range(k + 1):   # soleras a lo ancho
        x = i * B['paso']
        z = perfil_banca(tipo, x, Lg)
        barra(S['banca'], L['banca'], P(x, -W / 2, z), P(x, W / 2, z), B['solera'][1], B['solera'][0])
    for y in (-W / 2 + 0.06, W / 2 - 0.06):   # largueros siguiendo el perfil, y el patín al piso
        pts = [P(i * Lg / 16, y, perfil_banca(tipo, i * Lg / 16, Lg) - 0.03) for i in range(17)]
        for a, b in zip(pts, pts[1:]):
            barra(S['banca'], L['banca'], a, b, 0.03, 0.03)
        barra(S['banca'], L['banca'], P(0.15, y, 0.02), P(Lg - 0.15, y, 0.02), 0.03, 0.03)
        for x in (0.15, Lg - 0.15):
            barra(S['banca'], L['banca'], P(x, y, 0.02), P(x, y, perfil_banca(tipo, x, Lg) - 0.03), 0.03, 0.03)


def patios_aro(S, L, arboles):
    """Patios del corte del aro (2026-10-12, Gabriel): área abierta y permeable de tezontle, sin estanques;
    humedales rectangulares dispersos y bancas «onda» sueltas, en grupos de dos o tres con ángulos distintos."""
    P_ = PATIO
    rng = random.Random(11)
    disco = Point(ARO).buffer(CORTE, 256)
    libre = Point(ARO).buffer(P_['bancas_r'], 256)
    cols = Point(ARO).buffer(P_['col'][1], 256).difference(Point(ARO).buffer(P_['col'][0], 256))
    calle = caja2d(400, HE_LIM_P[0], 700, HE_LIM_P[1])
    res = {'m2': 0.0, 'tezontle_m2': 0.0, 'arriates_m2': 0.0, 'humedales': 0, 'mesitas': 0, 'bancas': 0, 'plazas_sentado': 0}
    bancas, n_arb = [], 0
    for nave in NAVES_P:
        for pat in poligonos(caja2d(*nave).intersection(disco).difference(calle)):
            res['m2'] += pat.area
            # humedales (Gabriel, 2026-10-12: 48 m² c/u, 2 por patio, 1 m de peralte, «para separar el uso de las mesas del de
            # las banquitas recreativas»): 12 × 4 tangenciales al aro, dentro del anillo de columnas, a 1/3 y 2/3 del arco
            # en que caben; entre ellos y en las puntas queda paso hacia las bancas.
            for dims in (P_['hum'], (10.0, 4.8), (9.0, 48 / 9.0)):   # 48 m²: 12 × 4; si no caben dos, más cortos y anchos
                rc = P_['col'][0] - 0.5 - dims[1] / 2
                caben = []
                for k in range(1440):
                    th = -math.pi + 2 * math.pi * k / 1440
                    t = (-math.sin(th), math.cos(th))
                    q = rect_rot((ARO[0] + rc * math.cos(th), ARO[1] + rc * math.sin(th)), t, *dims)
                    if pat.buffer(-0.6).contains(q) and not q.intersects(cols):
                        caben.append((th, q))
                hums = []
                if caben:
                    th0_, th1_ = caben[0][0], caben[-1][0]
                    w_ = dims[0] / rc
                    g_ = (th1_ - th0_ - w_) / 3   # mismos pasos en las puntas y entre los dos
                    for ob in (th0_ + g_, th1_ - g_) if g_ > 0 else ((th0_ + th1_) / 2,):
                        th, q = min(caben, key=lambda c: abs(c[0] - ob))
                        if not any(q.buffer(PASILLO).intersects(h) for h in hums):
                            hums.append(q)
                if len(hums) >= 2:
                    break
            if len(hums) < 2:
                print('OJO: sólo', len(hums), 'humedales en el patio', [round(x) for x in pat.bounds])
            arr = unary_union(hums) if hums else Polygon()
            INFO.setdefault('_patios', {'hums': [], 'mesitas': [], 'bancas': [], 'pat': []})
            INFO['_patios']['hums'] += hums; INFO['_patios']['pat'].append(pat)
            tez = pat.difference(arr)
            S['humedal'] += tri_poligono(tez, NIVEL(0) + P_['tezontle'])
            res['tezontle_m2'] += tez.area
            for q in hums:
                res['arriates_m2'] += q.area
                res['humedales'] += 1
                zt = NIVEL(0) + P_['hum_alto']
                losa(S['humedal'], L['humedal'], q.difference(q.buffer(-0.20, join_style='mitre')), NIVEL(0), zt)   # muro de 20 cm, 1 m de peralte
                S['agua_p'] += tri_poligono(q.buffer(-0.20, join_style='mitre'), zt - 0.15)                        # espejo de agua
                u0, v0, u1, v1 = q.bounds
                for _ in range(int(q.area * 4)):   # juncos y carrizos
                    x, y = rng.uniform(u0, u1), rng.uniform(v0, v1)
                    if q.buffer(-0.3).contains(Point(x, y)):
                        h = rng.uniform(0.5, 1.4)
                        L['junco'].append(((x, y, zt - 0.15), (x + rng.uniform(-0.12, 0.12), y + rng.uniform(-0.12, 0.12), zt - 0.15 + h)))
                if n_arb < 8:
                    c = q.centroid
                    arboles.append((c.x, c.y, zt - 0.15, rng.uniform(3.0, 4.5)))
                    n_arb += 1
            # juntas de piso donde cambia la franja (circulación | mesitas | circulación | humedales y bancas)
            for r_ in (P_['circ1'][0], P_['mesas'][0], P_['circ2'][0]):
                arco = LineString([(ARO[0] + r_ * math.cos(2 * math.pi * k / 720), ARO[1] + r_ * math.sin(2 * math.pi * k / 720)) for k in range(721)]).intersection(pat)
                for g in getattr(arco, 'geoms', [arco]):
                    if g.geom_type == 'LineString':
                        c = list(g.coords)
                        L['humedal'] += [((a[0], a[1], NIVEL(0) + P_['tezontle'] + 0.005), (b[0], b[1], NIVEL(0) + P_['tezontle'] + 0.005)) for a, b in zip(c, c[1:])]
            # mesitas: una por cada local que abre al patio, en su mismo radio (mismo ritmo); la segunda hilera, a medio paso
            # entre dos locales vecinos (tresbolillo)
            dth_ = 2 * math.asin(CELDA[0] / 2 / R_VID)
            ths_ = sorted(MESITAS_TH)
            medios = [(a + b) / 2 for a, b in zip(ths_, ths_[1:]) if b - a < 1.5 * dth_]
            for th, r_m in [(t_, MESITA['r']) for t_ in MESITAS_TH] + [(t_, MESITA['r2']) for t_ in medios]:
                c = (ARO[0] + r_m * math.cos(th), ARO[1] + r_m * math.sin(th))
                t = (-math.sin(th), math.cos(th))
                if pat.buffer(-0.2).contains(rect_rot(c, t, 2 * MESITA['sep'] + MESITA['banco'], MESITA['lado'])):
                    mesita(S, L, c, t, NIVEL(0) + P_['tezontle'])
                    INFO['_patios']['mesitas'].append(rect_rot(c, t, 2 * MESITA['sep'] + MESITA['banco'], MESITA['lado']))
                    res['mesitas'] += 1
            util = tez.difference(arr.buffer(0.6)).intersection(libre).difference(cols).buffer(-0.5, join_style='mitre')
            if util.is_empty:
                continue
            # bancas: centros de grupo repartidos (distancia mínima), 2–3 bancas por grupo con giros distintos
            n_g = max(1, round(util.area / (P_['m2_banca'] * 2.5)))
            centros = []
            u0, v0, u1, v1 = util.bounds
            for _ in range(3000):
                if len(centros) >= n_g:
                    break
                p = Point(rng.uniform(u0, u1), rng.uniform(v0, v1))
                if util.buffer(-1.5).contains(p) and all(p.distance(c) > 7.0 for c in centros):
                    centros.append(p)
            for c in centros:
                base = rng.uniform(0, 180)
                for j in range(rng.choice((2, 3))):
                    for _ in range(25):
                        d, a = rng.uniform(1.2, 2.6), rng.uniform(0, 2 * math.pi)
                        q = (c.x + math.cos(a) * d * (j > 0), c.y + math.sin(a) * d * (j > 0))
                        ang = base + rng.choice((0, 25, -30, 90, 160)) * (j > 0)
                        tipo = 'doble' if (j + len(bancas)) % 3 else 'chaise'
                        t = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
                        g = rect_rot(q, t, BANCA_ONDA['largo'], BANCA_ONDA['ancho'])
                        if util.contains(g) and not any(g.buffer(0.9).intersects(x) for x in bancas):
                            banca_onda(S, L, q, ang, tipo, NIVEL(0) + P_['tezontle'])
                            bancas.append(g)
                            INFO['_patios']['bancas'].append(g)
                            BANCAS_P.append([round(q[0], 3), round(q[1], 3), round(ang, 2), tipo])
                            res['plazas_sentado'] += 2 if tipo == 'doble' else 1
                            break
    res['bancas'] = len(bancas)
    res = {k: (round(v, 1) if isinstance(v, float) else v) for k, v in res.items()}
    senda = disco.difference(libre)   # las franjas de circulación, mesitas y humedales quedan libres de bancas
    assert not any(b.intersects(senda) for b in bancas), 'banca en la senda'
    return res


# ================= Nave sur (2026-10-12; mercado «barrio» 2026-10-12) =================
# PB: carga y descarga en la esquina SE (los dos primeros tramos de postes desde el
# muro sur; el camión de 7.5 t entra en reversa por la fachada este), un andén de
# servicio a nivel medio (+1.20, la cama del camión) con su rampa dentro del patio de
# servicio, el biodigestor, y la acuaponia como vitrina en la esquina SO. Todo lo demás
# es mercado: manzanas cortas en aparejo (ver Barrio), la plaza del tragaluz (patio de
# luz con la escalera abierta y la fonda), la plazuela de la vitrina, el borde del aro.
# PA: UNA plataforma a +4.28 que nace donde llega la cinta del aro (esquina NE), con el
# vacío del patio de luz; fondas y barras-mirador alrededor del vacío, terraza-mirador
# junto al vidrio, manzanas; baños y servicio tras el muro ciego de lado a lado.
# Todo editable aquí; cotas en u, v (m) y z del visor.
SUR = {
    'int': (505.2, 324.2, 558.1, 396.0),            # caras interiores de los muros (o, s, e, n)
    'postes': [323.6 + 6.6 * k for k in range(12)],  # líneas de postes (fachada este, cada ~6.6)
    'valles': (522.6, 540.7),                       # líneas de columnas entre crujías (bajo los valles)
    'cumbres': (513.5, 531.5, 549.5),               # columnas intermedias de la PA (bajo las cumbreras)
    'piso': 0.40, 'anden': 1.20, 'pa': 4.28, 'losa': 0.30,
    # carga: circulación vehicular (cajón 3.5 × 10 + maniobra, altura libre ≥ 4.2: sin PA encima)
    'vehiculo': (543.0, 324.2, 558.1, 337.0),
    'anden_caja': (537.0, 324.6, 543.0, 336.6),     # andén de descarga (+1.20)
    'servicio': (530.5, 324.6, 537.0, 336.6),        # patio de servicio (PB): montacargas, base de la escalera
    'montacargas': (531.0, 333.4, 533.4, 335.8),     # abre al vestíbulo de servicio (PA) y al patio de servicio (PB) (2026-10-12: al oeste de la rampa)
    'biodigestor': (517.0, 324.6, 527.2, 336.6),     # mitad oeste de lo no vehicular (hasta la escalera de servicio)
    'tubo': 1.5,                                     # Ø de los biodigestores tubulares (medio enterrados)
    # (2026-10-12) rampa de servicio DENTRO del patio de servicio, pegada al andén (u0, v0, u1): descanso a +1.20 junto al
    # andén (v 324.6 → v0), baja al norte al 8 % con descanso a los 6 m y llega a +0.40 en la banda de macetas, donde arranca
    # la calle de abasto. El abasto ya no baja en rampa dentro del mercado (Toyosu, Sydney: logística y público separados).
    'rampa': (535.4, 326.1, 537.0),
    # (2026-10-12, Gabriel: «es demasiada acuaponia y poco mercado») la acuaponia deja la crujía 1 (432 m²) y queda como
    # VITRINA de producción en la esquina SO, bajo los baños de la PA, junto al biodigestor y al servicio; su cara norte es de
    # vidrio hacia la plazuela de la vitrina: se ve trabajar, no se cruza (Toyosu / Sydney Fish Market).
    'vitrina': (507.55, 324.6, 516.8, 337.4),
    # (2026-10-12) acceso desde Clavel: un pasaje cubierto de 2.05 junto al muro oeste, con la vitrina de un lado (vidrio):
    # se entra viendo trabajar la acuaponia y se llega a la plazuela de la vitrina, con su fonda
    'pasaje_clavel': (505.35, 324.2, 507.4, 337.6),
    # PA
    # (2026-10-12, Gabriel: «toda la potencia a los baños»): un muro ciego de lado a lado de la nave delimita la franja de
    # servicios de la PA; un solo vano: a la derecha (oeste) los baños públicos, a la izquierda (este) la circulación
    # vertical de servicio (escalera y montacargas) y los baños y vestidores de locatarios.
    'muro_ciego': (505.2, 338.2, 558.1, 338.45), 'vano': (525.0, 527.4), 'muro_alto': 3.6, 'vano_alto': 2.7,
    'vestibulo': (505.2, 335.8, 543.0, 338.2),      # pasillo detrás del muro, del vano a cada lado
    # (2026-10-12, Gabriel: «los baños están algo grandes»): una franja de 4.10 libres a lo largo del vestíbulo (el módulo de
    # baños de la nave norte) con mujeres, hombres, familiar accesible, lactario, primeros auxilios y aseo; atrás, sólo desde
    # el servicio, bodegas, cámaras frías y orgánicos; la administración junto al montacargas
    'banos_pub': (505.2, 331.4, 527.4, 335.8),
    'servicio_pa': {'pasillo': (505.35, 324.35, 533.6, 326.2), 'cuartos_v': (326.35, 331.4), 'bodegas': 4,
                    'admin': (533.6, 326.4, 537.0, 333.2)},
    'locatarios': (537.2, 324.6, 542.8, 333.0),      # baños y vestidores de locatarios (sobre el andén)
    'escalera': (527.6, 329.6, 530.4, 335.8),        # escalera de servicio (PB +0.40 → PA), llega al vestíbulo
    # PB: banda de macetas entre la doble altura de la descarga y el mercado (con un paso: la calle de abasto)
    'macetas': (517.0, 337.6, 558.1, 339.8), 'macetas_pasos': [(534.6, 537.6)],
    # ---- mercado «barrio» (2026-10-12, ver Barrio): manzanas cortas en aparejo sobre las líneas de postes ----
    'espinas': [343.4 + 6.6 * k for k in range(8)],  # espinas de las filas (v): una por línea de postes, 343.4 … 389.6
    'cols_u': (513.5, 522.6, 531.5, 540.7, 549.5),  # líneas de columnas (u): los pasajes van entre ellas, en aparejo
    # patio de luz (San Antón): un vacío en la PA entre cuatro columnas, con la escalera abierta adentro (borde sur, sube
    # al oeste) y un arriate con un árbol que crece por el vacío hacia el tragaluz de la cubierta (Nicolás Bravo)
    'vacio': (531.5, 356.6, 540.7, 363.2), 'esc_vacio': (356.8, 358.6), 'arriate_vacio': ((536.1, 361.2), 2.8),
    'ascensor': (529.1, 354.2, 531.3, 356.4),        # cubo del elevador accesible (cabina 1.50 × 1.50): esquina SO del vacío, junto a la llegada de la escalera
    'calle_ns': (534.6, 339.8, 537.6, 353.3),        # calle de abasto: de la rampa al patio de luz
    # ACCESOS (2026-10-12, Gabriel: «aún no queda claro el acceso»; San Antón: la escalera se ve desde la puerta; Huimanguillo y
    # Matamoros: de la calle a la plaza; Sydney: escaleras que conectan la calle con lo alto; Toyosu: la carga, aparte):
    #  · Sabino (principal): en el eje del patio de luz; el pasillo entre las filas 3 y 4 es el pasaje de entrada y remata en
    #    el árbol y la escalera del vacío; de ahí la plaza sigue a la boca del patio del aro (calle → mercado → aro).
    #  · Heliotropo (paso peatonal): plazuela en la esquina NE con una escalera a la PA, donde llega la cinta del aro.
    #  · Clavel: el pasaje de la vitrina. · El patio del aro: la boca de la plaza y los pasos del borde. · Carga: SE, Sabino.
    'puerta_e': (358.25, 361.55),                    # Sabino (v): 3.30, en el eje del vacío (v 359.9)
    'puerta_n': (552.4, 557.4),                      # Heliotropo (u), en el muro norte
    'esc_heliotropo': (556.3, 386.2, 558.0, 393.6),  # escalera PB → PA pegada al muro este: arranca junto a la puerta, sube al sur
    # plazuelas de PB (Huimanguillo, Matamoros: los puestos dan a una plaza; la del tragaluz abre su boca al patio del aro)
    # (la del tragaluz es una sola plaza con la fonda del lado del acceso este; su boca, sólo frente al vacío)
    'plazas_pb': {'tragaluz': [(527.0, 353.3, 548.0, 366.5)], 'boca': [(531.5, 362.0, 540.7, 382.0)],
                  'vitrina': [(505.2, 337.6, 517.4, 347.3)], 'heliotropo': [(545.5, 383.8, 558.1, 396.0)]},
    'racimos_pb': {'vitrina': (510.9, 343.4)},       # fonda con barra (Tepotzotlán); la plaza del tragaluz queda libre en el eje
    'arriates_pb': [((528.8, 364.6), 2.0), ((543.6, 355.2), 1.8), ((543.6, 364.6), 1.8), ((552.6, 389.4), 1.8)],
    # PA: las fondas alrededor del vacío (Markthal, Mercado Roma: un motivo para subir), terraza-mirador junto al vidrio
    'plazas_pa': {'balcon': [(517.0, 352.6, 553.2, 366.4)], 'boca': [(531.5, 362.0, 540.7, 390.0)], 'cinta': [(545.0, 383.4, 558.1, 396.0)], 'vano': [(520.6, 338.45, 531.8, 342.4)]},
    'racimos_pa': 4,                                 # (caben 2: uno a cada lado del vacío)
    'arriates_pa': [((553.6, 390.6), 2.0), ((529.4, 340.4), 1.6), ((522.6, 340.4), 1.6)],
    'terraza': 3.4,                                  # PA: franja junto al vidrio (barra-mirador al patio + paseo)
    # acuaponia (supuestos: cultivo flotante)
    'tanques_frac': 1 / 3, 'tanque_prof': 1.2, 'kg_m3': 40.0, 'cosechas_peces': 2, 'lechuga_m2': 20, 'ciclos_lechuga': 52 / 5,
    'otras_kg_m2': 8.0, 'otras_frac': 0.30, 'lluvia_m': 0.80, 'escurre': 0.85,
    'org_kg_puesto': 0.5, 'trh': 30,                 # biodigestor: kg/día de orgánicos por puesto de comida; días de retención
}


def tubo(tris, lins, a, b, r, n=10):
    """Cilindro horizontal de a a b (u, v, z), radio r."""
    d = [b[j] - a[j] for j in range(3)]
    L_ = math.sqrt(sum(c * c for c in d))
    t = [c / L_ for c in d]
    h = (-t[1], t[0], 0.0)
    anillo = lambda p: [tuple(p[j] + h[j] * r * math.cos(2 * math.pi * k / n) + (0, 0, 1)[j] * r * math.sin(2 * math.pi * k / n) for j in range(3)) for k in range(n)]
    A, B = anillo(a), anillo(b)
    for k in range(n):
        k1 = (k + 1) % n
        tris += [(A[k], A[k1], B[k1]), (A[k], B[k1], B[k])]
        lins.append((A[k], B[k]) if k % (n // 2) == n // 4 else (A[k], A[k1]))
        lins.append((B[k], B[k1]))
    for C, s in ((A, 1), (B, -1)):
        for k in range(1, n - 1):
            tris.append((C[0], C[k], C[k + 1]) if s > 0 else (C[0], C[k + 1], C[k]))


def recinto(S, L, k, g, z, puerta=None, H=3.0, e=0.12):
    """Cuarto cerrado (muros de e en el contorno de la caja g = (u0, v0, u1, v1)) con una puerta: (lado 's'|'n'|'o'|'e', x0, x1)
    con dintel a 2.10."""
    u0, v0, u1, v1 = g
    lados = {'s': ((u0, v0), (u1, v0), 0), 'n': ((u0, v1 - e), (u1, v1 - e), 0), 'o': ((u0, v0), (u0, v1), 1), 'e': ((u1 - e, v0), (u1 - e, v1), 1)}
    for nom, (a, b, eje) in lados.items():
        tramos = [(a[eje], b[eje])]
        if puerta and puerta[0] == nom:
            tramos = [(a[eje], puerta[1]), (puerta[2], b[eje])]
            x0, x1 = puerta[1], puerta[2]
            if eje == 0:
                caja(S[k], L[k], x0, a[1], z + 2.1, x1, a[1] + e, z + H)
            else:
                caja(S[k], L[k], a[0], x0, z + 2.1, a[0] + e, x1, z + H)
        for t0, t1 in tramos:
            if t1 - t0 < 0.02:
                continue
            if eje == 0:
                caja(S[k], L[k], t0, a[1], z, t1, a[1] + e, z + H)
            else:
                caja(S[k], L[k], a[0], t0, z, a[0] + e, t1, z + H)
    return caja2d(u0, v0, u1, v1)


def banos_publicos(S, L, caja_, z, _):
    """Baños públicos de la nave sur (PA) en el módulo de 4.10 libres (cubículo accesible 1.70 + circulación 0.90 + lavabos
    1.50, el de la nave norte), en una franja a lo largo del vestíbulo, detrás del muro ciego. (2026-10-12, Gabriel: «están
    algo grandes»): del tamaño que pide la norma con holgura (antes 222 m²); en la misma franja, el sanitario familiar, el
    lactario y primeros auxilios; atrás, bodegas y cámaras de los locatarios (servicios_pa). Cada recinto entra en codo
    desde el vestíbulo (mampara: no se ve el interior, NTC 3.1.4.1 b); cubículos contra el muro de atrás, lavabos del lado
    del vestíbulo."""
    u0, v0, u1, v1 = caja_   # v1: el vestíbulo
    e, H = 0.15, 3.0
    ocup = 1839 / 3.0 + 2358 / 5.6   # PB de mercado y PA de la nave sur (ver resumen): para la tabla 3.1.1.1
    req, dis, _m = banos_ntc(ocup)
    B = BANO
    largo = [('mujeres', B['vest'] + B['acc'] + (dis['M_inodoros'] - 1) * B['wc']),
             ('hombres', B['vest'] + B['acc'] + (dis['H_inodoros'] - 1) * B['wc'] + dis['H_mingitorios'] * B['ming']),
             ('familiar', 2.6), ('lactario', 2.6), ('primeros auxilios', 3.0), ('aseo', 1.4)]
    vi0, vi1 = v0 + e, v1 - e
    rec, x = [], u0 + e
    caja(S['local'], L['local'], u0, v0, z, u0 + e, v1, z + H)                 # muro oeste
    for nom, w in largo:
        rec.append((nom, x, x + w))
        x += w + e
    caja(S['local'], L['local'], u0, v0, z, x, vi0, z + H)                     # muro de atrás
    for nom, a, b in rec:
        pu = (b - 1.25, b - 0.25) if nom in ('mujeres', 'hombres') else (a + 0.25, a + 1.25) if b - a >= 1.9 else (a + 0.1, b - 0.1)
        caja(S['local'], L['local'], a, vi1, z, pu[0], v1, z + H)             # muro al vestíbulo, con su puerta y dintel
        caja(S['local'], L['local'], pu[1], vi1, z, b, v1, z + H)
        caja(S['local'], L['local'], pu[0], vi1, z + 2.1, pu[1], v1, z + H)
        caja(S['local'], L['local'], b, v0, z, b + e, v1, z + H)              # muro divisorio
        if nom in ('mujeres', 'hombres'):
            caja(S['local'], L['local'], b - B['vest'], vi1 - 1.5, z, b - B['vest'] + 0.06, vi1 - 0.9, z + 2.1)   # mampara del codo
            caja(S['local'], L['local'], b - B['vest'], vi1 - 1.5, z, b - 0.1, vi1 - 1.44, z + 2.1)
            n_wc = dis['M_inodoros'] if nom == 'mujeres' else dis['H_inodoros']
            xx = b - B['vest']
            for k, w in enumerate([B['acc']] + [B['wc']] * (n_wc - 1)):            # cubículos contra el muro de atrás
                fondo = B['acc'] if k == 0 else 1.50
                x0 = xx - w
                caja(S['local'], L['local'], x0 - 0.02, vi0, z + 0.15, x0 + 0.02, vi0 + fondo, z + 2.0)
                L['local'].append(((x0 + 0.05, vi0 + fondo, z + 2.0), (xx - 0.05, vi0 + fondo, z + 2.0)))
                caja(S['local'], L['local'], (x0 + xx) / 2 - 0.2, vi0, z, (x0 + xx) / 2 + 0.2, vi0 + 0.65, z + 0.45)   # inodoro
                xx = x0
            if nom == 'hombres':
                for k in range(dis['H_mingitorios']):
                    xm = xx - B['ming'] * (k + 0.5)
                    caja(S['local'], L['local'], xm - 0.2, vi0, z + 0.6, xm + 0.2, vi0 + 0.35, z + 1.25)
                    caja(S['local'], L['local'], xm - B['ming'] / 2, vi0, z + 0.3, xm - B['ming'] / 2 + 0.04, vi0 + 0.45, z + 1.5)
            n_lav = dis['M_lavabos'] if nom == 'mujeres' else dis['H_lavabos']
            caja(S['local'], L['local'], a + 0.1, vi1 - 0.55, z + 0.80, a + 0.1 + 0.8 * n_lav, vi1, z + 0.85)   # barra de lavabos
        elif nom == 'familiar':
            caja(S['local'], L['local'], b - 0.95, vi0, z, b - 0.15, vi0 + 0.65, z + 0.45)        # inodoro con barras
            caja(S['local'], L['local'], a + 0.1, vi0 + 0.2, z + 0.85, a + 0.65, vi0 + 1.4, z + 0.90)   # cambiador
            caja(S['local'], L['local'], b - 0.9, vi1 - 0.55, z + 0.80, b - 0.1, vi1, z + 0.85)   # lavabo
        elif nom == 'lactario':
            caja(S['local'], L['local'], a + 0.3, vi0 + 0.3, z, a + 1.1, vi0 + 1.1, z + 0.45)      # sillón
            caja(S['local'], L['local'], b - 0.65, vi0, z, b - 0.1, vi0 + 1.6, z + 0.9)           # barra con tarja y refrigerador
        elif nom == 'primeros auxilios':
            caja(S['local'], L['local'], a + 0.4, vi0 + 0.3, z, a + 1.1, vi0 + 2.2, z + 0.75)      # camilla
            caja(S['local'], L['local'], b - 0.6, vi0, z, b - 0.1, vi0 + 1.8, z + 0.9)            # mueble
        elif nom == 'aseo':
            caja(S['local'], L['local'], a + 0.2, vi0, z, a + 0.8, vi0 + 0.6, z + 0.9)            # tarja
    recs = [(caja2d(a, v0, b, v1), nom) for nom, a, b in rec]
    return {'NTC': req, 'proyecto': dict(dis, familiar=1, lactario=1, primeros_auxilios=1, aseo=1), 'ocupantes': round(ocup),
            'm2_franja': round((x - u0) * (v1 - v0), 1), 'antes_m2': 222, 'recintos': recs}


def servicios_pa(S, L, z, u_fin):
    """Atrás de los baños, sólo desde el servicio: un pasillo pegado al muro de Clavel lleva del montacargas a las bodegas de
    los locatarios, a las cámaras de refrigeración y congelación y al cuarto de orgánicos (bajan directo al biodigestor, que
    está abajo); la administración, junto al montacargas y a los locatarios (Toyosu / Sydney: la logística no se cruza
    con el público). Devuelve [(polígono, nombre)]."""
    P_ = SUR['servicio_pa']
    pu0, pv0, pu1, pv1 = P_['pasillo']
    c0, c1 = P_['cuartos_v']
    caja(S['local'], L['local'], SUR['int'][0], SUR['int'][1], z, SUR['locatarios'][0], pv0, z + 3.0)   # muro a Clavel (la PA llega a la fachada)
    out, x = [], pu0
    for nom, w in [('bodega', 2.5)] * P_['bodegas'] + [('cámara de refrigeración', 4.4), ('cámara de congelación', 3.4), ('orgánicos (al biodigestor)', 1.8)]:
        if x + w > u_fin:
            break
        e = 0.20 if nom.startswith('cámara') else 0.12
        g = recinto(S, L, 'local', (x, c0, x + w, c1), z, ('s', x + 0.3, x + min(1.3, w - 0.3)), e=e)
        out.append((g, nom))
        x += w
    out.append((recinto(S, L, 'local', P_['admin'], z, ('n', P_['admin'][0] + 0.4, P_['admin'][0] + 1.4)), 'administración'))
    a0, b0, a1, b1 = P_['admin']
    caja(S['local'], L['local'], a0 + 0.5, b0 + 0.5, z, a0 + 2.1, b0 + 1.2, z + 0.75)   # escritorio
    caja(S['local'], L['local'], a0 + 0.6, b0 + 3.0, z, a1 - 0.6, b0 + 4.2, z + 0.75)    # mesa de juntas de locatarios
    out.append((caja2d(pu0, pv0, pu1, pv1), 'pasillo de servicio'))
    return out


def mercado_sur():
    P_ = SUR
    rng = random.Random(5)
    S = {k: [] for k in ('piso', 'anden', 'bio', 'tanque', 'cama', 'agua', 'pa', 'local', 'mesa', 'muro', 'tarima', 'maceta', 'columna', 'escalera', 'cubo', 'local_pb', 'mesa_pb', 'jardinera')}
    L = {k: [] for k in ('piso', 'anden', 'bio', 'tanque', 'cama', 'pa', 'local', 'mesa', 'muro', 'tarima', 'maceta', 'columna', 'escalera', 'baranda', 'planta', 'pasto', 'cubo', 'local_pb', 'mesa_pb', 'jardinera')}
    arboles = []
    disco = Point(ARO).buffer(CORTE + 0.3, 256)
    nave = caja2d(*P_['int']).difference(disco)
    z0, za, zp, e = P_['piso'], P_['anden'], P_['pa'], P_['losa']
    W, F = CELDA
    I0, I1, I2, I3 = P_['int']
    # ---- PB: servicio (carga, andén, rampa, montacargas, biodigestor) ----
    losa(S['piso'], L['piso'], nave, NIVEL(0), z0)
    rayas(L['piso'], caja2d(*P_['vehiculo']), z0 + 0.005, 3.5, eje=1, desfase=P_['vehiculo'][1])   # el cajón de carga
    caja(S['anden'], L['anden'], *P_['anden_caja'][:2], z0, *P_['anden_caja'][2:], za)
    caja(S['anden'], L['anden'], *P_['montacargas'][:2], z0, *P_['montacargas'][2:], zp + 2.4)   # cubo del montacargas
    # rampa de servicio: descanso a +1.20 pegado al andén, baja al norte al 8 % (descanso de 1.50 a los 6 m) hasta +0.40
    u0r, v0r, u1r = P_['rampa']
    caja(S['anden'], L['anden'], u0r, P_['anden_caja'][1], z0, u1r, v0r, za)
    zm = za - 6.0 * 0.08
    v1 = v0r + 6.0; v2 = v1 + 1.5; v3 = v2 + (zm - z0) / 0.08
    for (va, zA), (vb, zB) in (((v0r, za), (v1, zm)), ((v1, zm), (v2, zm)), ((v2, zm), (v3, z0))):
        prisma8(S['anden'], L['anden'], [(u0r, va, z0), (u1r, va, z0), (u1r, vb, z0), (u0r, vb, z0), (u0r, va, zA), (u1r, va, zA), (u1r, vb, zB), (u0r, vb, zB)])
        for h in (0.1, 0.5, BARANDAL):
            L['baranda'].append(((u0r, va, zA + h), (u0r, vb, zB + h)))   # (el otro lado es el andén)
    # biodigestor: tubos de geomembrana a lo largo de u, medio enterrados
    b0, b1 = P_['biodigestor'][1], P_['biodigestor'][3]
    n_t = int((b1 - b0) / (P_['tubo'] + 1.6))
    for v in [b0 + (b1 - b0) * (k + 0.5) / n_t for k in range(n_t)]:
        tubo(S['bio'], L['bio'], (P_['biodigestor'][0] + 0.6, v, z0), (P_['biodigestor'][2] - 0.6, v, z0), P_['tubo'] / 2)
    vol_bio = n_t * math.pi * (P_['tubo'] / 2) ** 2 * (P_['biodigestor'][2] - P_['biodigestor'][0] - 1.2) * 0.75   # 3/4 líquido, 1/4 gas
    # ---- acuaponia: vitrina de producción en la esquina SO (ver SUR['vitrina']) ----
    vu0, vv0, vu1, vv1 = P_['vitrina']
    vit = caja2d(*P_['vitrina'])
    util = vit.buffer(-0.6, join_style='mitre')
    A_acu = vit.area
    A_cult_obj = A_acu * 0.75 / (1 + P_['tanques_frac'])   # 25 % circulación; tanques = 1/3 del cultivo
    A_t = A_c = 0.0
    camas, tanques = [], []
    u = vu0 + 0.9
    while u + 1.2 < vu1 - 0.6:   # franjas de 1.20 a lo largo de v: tanque de peces al sur (junto al servicio), camas al norte (a la vista)
        for p in poligonos(util.intersection(caja2d(u, vv0, u + 1.2, vv1))):
            p0, q0, p1, q1 = p.bounds
            if q1 - q0 < 2:
                continue
            if A_t < A_cult_obj * P_['tanques_frac']:
                t = p.intersection(caja2d(p0, q0, p1, q0 + 4.0))
                tanques.append(t); A_t += t.area
                p = p.difference(caja2d(p0, q0, p1, q0 + 4.9))
            for q in poligonos(p):
                camas.append(q); A_c += q.area
        u += 1.2 + 0.9
    for t in tanques:
        losa(S['tanque'], L['tanque'], t.difference(t.buffer(-0.08)), z0, z0 + 1.2)
        S['agua'] += tri_poligono(t.buffer(-0.08), z0 + 1.1) if t.buffer(-0.08).area > 0.1 else []
    for q in camas:
        losa(S['cama'], L['cama'], q.difference(q.buffer(-0.06)), z0, z0 + 0.6)
        S['agua'] += tri_poligono(q.buffer(-0.06), z0 + 0.5) if q.buffer(-0.06).area > 0.1 else []
        p0, q0, p1, q1 = q.bounds
        y = q0 + 0.25
        while y < q1 - 0.2:
            for x in (p0 + 0.3, p1 - 0.3):
                if q.contains(Point(x, y)):
                    L['planta'] += [((x, y, z0 + 0.5), (x - 0.12, y, z0 + 0.72)), ((x, y, z0 + 0.5), (x + 0.12, y, z0 + 0.72))]
            y += 0.45
    # muros de la vitrina: el este (al biodigestor) hasta la losa; el norte (a la plazuela) y el oeste (al pasaje de Clavel),
    # de vidrio: antepecho, parteluces y cerramiento
    caja(S['cubo'], L['cubo'], vu1, vv0, z0, vu1 + 0.15, vv1 + 0.15, zp - e)
    caja(S['cubo'], L['cubo'], vu0 - 0.15, vv1, z0, vu1, vv1 + 0.15, z0 + 0.5)
    caja(S['cubo'], L['cubo'], vu0 - 0.15, vv1, z0 + 3.0, vu1, vv1 + 0.15, zp - e)
    caja(S['cubo'], L['cubo'], vu0 - 0.15, vv0, z0, vu0, vv1, z0 + 0.5)
    caja(S['cubo'], L['cubo'], vu0 - 0.15, vv0, z0 + 3.0, vu0, vv1, zp - e)
    x = vu0
    while x <= vu1 + 1e-6:
        L['cubo'].append(((x, vv1 + 0.075, z0 + 0.5), (x, vv1 + 0.075, z0 + 3.0)))
        x += 1.2
    y = vv0
    while y <= vv1 + 1e-6:
        L['cubo'].append(((vu0 - 0.075, y, z0 + 0.5), (vu0 - 0.075, y, z0 + 3.0)))
        y += 1.2
    rayas(L['piso'], caja2d(*P_['pasaje_clavel']), z0 + 0.005, 0.6, eje=1)   # el pasaje de Clavel
    # ---- PB: banda de macetas entre la descarga (doble altura) y el mercado ----
    mu0, mv0, mu1, mv1 = P_['macetas']
    banda = caja2d(*P_['macetas']).difference(unary_union([caja2d(a, mv0 - 1, b, mv1 + 1) for a, b in P_['macetas_pasos']]))
    x, vr = mu0 + 0.6, (mv0 + mv1) / 2
    while x < mu1 - 0.5:
        q = caja2d(x - 0.45, vr - 0.45, x + 0.45, vr + 0.45)
        if banda.contains(q):
            losa(S['jardinera'], L['jardinera'], q.difference(q.buffer(-0.06)), z0, z0 + 0.6)
            if int(x * 7) % 3 == 0:
                arboles.append((x, vr, z0 + 0.55, rng.uniform(1.8, 2.8)))
            else:
                for _ in range(7):   # matas y pastos
                    dx, dy = rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)
                    L['planta'].append(((x + dx, vr + dy, z0 + 0.55), (x + dx * 1.4, vr + dy * 1.4, z0 + 0.55 + rng.uniform(0.3, 0.8))))
        x += 1.5
    # ---- PB: mercado «barrio» (ver Barrio) ----
    mer = nave.intersection(caja2d(I0, 337.6, I2, 400))
    piso_m = mer.difference(banda)
    cols_s = [(u, v) for u in P_['cols_u'] for v in P_['postes'][1:-1] if nave.buffer(-0.3).contains(Point(u, v))]
    cols_m = [c for c in cols_s if mer.buffer(-0.3).contains(Point(c))]
    S_m, L_m = {'local': [], 'mesa': []}, {'local': [], 'mesa': []}
    # patio de luz: escalera abierta adentro (dos tiros de 11 peraltes de 0.176 ≤ 0.18 y huellas de 0.28 ≥ 0.25, descanso
    # de 1.80; sube al oeste y llega a la PA en el borde oeste del vacío), elevador junto al vacío, el árbol en su arriate
    vac = caja2d(*P_['vacio'])
    asc = caja2d(*P_['ascensor'])
    losa(S['cubo'], L['cubo'], asc, z0, zp + 2.8)
    ev0, ev1 = P_['esc_vacio']
    n_p, hu_p, desc = 22, 0.28, 1.80
    h_p = (zp - z0) / n_p
    u_top = P_['vacio'][0]
    ud = u_top + 10 * hu_p + desc          # donde arranca el descanso (lado este)
    u_bot = ud + 10 * hu_p                  # arranque del primer tiro
    for kk in range(10):
        ua = u_bot - (kk + 1) * hu_p        # tiro 1: huellas flotadas de 0.18 (escalera abierta: se ve a través)
        losa(S['escalera'], L['escalera'], caja2d(ua, ev0, ua + hu_p, ev1), z0 + (kk + 1) * h_p - 0.18, z0 + (kk + 1) * h_p)
        ua = ud - desc - (kk + 1) * hu_p    # tiro 2
        losa(S['escalera'], L['escalera'], caja2d(ua, ev0, ua + hu_p, ev1), z0 + (12 + kk) * h_p - 0.18, z0 + (12 + kk) * h_p)
    z_d = z0 + 11 * h_p
    losa(S['escalera'], L['escalera'], caja2d(ud - desc, ev0, ud, ev1), z_d - 0.2, z_d)
    caja(S['escalera'], L['escalera'], ud - desc / 2 - 0.08, (ev0 + ev1) / 2 - 0.08, z0, ud - desc / 2 + 0.08, (ev0 + ev1) / 2 + 0.08, z_d - 0.2)   # poste del descanso
    for vv in (ev0 + 0.03, ev1 - 0.03):   # zancas (líneas) y pasamanos a 0.90
        for (pa_, za_), (pb_, zb_) in (((u_bot, z0), (ud, z_d)), ((ud, z_d), (ud - desc, z_d)), ((ud - desc, z_d), (u_top, zp))):
            L['escalera'].append(((pa_, vv, za_ - 0.1), (pb_, vv, zb_ - 0.1)))
            L['baranda'].append(((pa_, vv, za_ + 0.9), (pb_, vv, zb_ + 0.9)))
    esc_v = caja2d(u_top, ev0, u_bot, ev1)
    arr_v = arriate(S, L, 'jardinera', 'planta', P_['arriate_vacio'][0], P_['arriate_vacio'][1], z0, arboles, rng, arbol=(5.5, 7.0))
    # escalera de Heliotropo (PB → PA, sube al sur pegada al muro este, a la plazuela de la cinta): 22 peraltes de 0.176,
    # dos tiros de 10 huellas de 0.28 y descanso de 1.80; arranca junto a la puerta (se ve al entrar)
    hu0, hv0, hu1, hv1 = P_['esc_heliotropo']
    for kk in range(10):
        va = hv1 - (kk + 1) * hu_p
        losa(S['escalera'], L['escalera'], caja2d(hu0, va, hu1, va + hu_p), z0, z0 + (kk + 1) * h_p)
        va = hv1 - 10 * hu_p - desc - (kk + 1) * hu_p
        losa(S['escalera'], L['escalera'], caja2d(hu0, va, hu1, va + hu_p), z0, z0 + (12 + kk) * h_p)
    losa(S['escalera'], L['escalera'], caja2d(hu0, hv1 - 10 * hu_p - desc, hu1, hv1 - 10 * hu_p), z0, z0 + 11 * h_p)
    for (va_, za_), (vb_, zb_) in (((hv1, z0), (hv1 - 10 * hu_p, z_d)), ((hv1 - 10 * hu_p, z_d), (hv1 - 10 * hu_p - desc, z_d)), ((hv1 - 10 * hu_p - desc, z_d), (hv0, zp))):
        L['baranda'].append(((hu0 + 0.03, va_, za_ + 0.9), (hu0 + 0.03, vb_, zb_ + 0.9)))
    esc_h = caja2d(*P_['esc_heliotropo'])
    plazas = {nom: unary_union([caja2d(*q) for q in qs]).intersection(piso_m) for nom, qs in P_['plazas_pb'].items()}
    calle = caja2d(*P_['calle_ns'])
    # borde del aro: doble fila (la de afuera abre al patio), con la boca de la plaza y un paso al patio cada 5
    th_a = math.atan2(-math.sqrt(R_VID ** 2 - (I0 + 0.15 - ARO[0]) ** 2), I0 + 0.15 - ARO[0])
    pts_s = arco_pts(R_VID, th_a, -0.05, W)
    borde_s = isla_borde(S_m, L_m, pts_s, radial, piso_m.difference(plazas['boca']).difference(plazas['heliotropo']), piso_m, z0, cada=BOCA_CADA)
    for g in borde_s[0::2]:
        MESITAS_TH.append(math.atan2(g.centroid.y - ARO[1], g.centroid.x - ARO[0]))
    dth = 2 * math.asin(W / 2 / R_VID)
    if borde_s:
        ths = [math.atan2(g.centroid.y - ARO[1], g.centroid.x - ARO[0]) for g in borde_s]
        VIDRIO_VANOS.append((min(ths) - dth, max(ths) + dth, NIVEL(0) - 0.1, zp - e))
    banda_aro = Point(ARO).buffer(R_VID + 2 * F + 1.2, 256)   # el borde del aro y su pasillo
    # fondas con barra en las plazuelas (Tepotzotlán)
    rac, rac_g = [], []
    for nom, c in P_['racimos_pb'].items():
        pos, _ = poner_racimos(plazas[nom].difference(banda_aro), 1, c)
        for cc in pos:
            h_, g_ = racimo(S_m, L_m, cc, z0)
            rac += h_; rac_g.append(g_)
    duro = unary_union([esc_v, esc_h, asc, arr_v, banda] + rac_g + borde_s)
    arrs = poner_arriates(S, L, 'jardinera', 'planta', P_['arriates_pb'], piso_m.difference(duro.buffer(0.05)).difference(Point(ARO).buffer(R_VID + 2 * F, 256)), z0, arboles, rng)
    duro = unary_union([duro] + arrs)
    # filas contra los muros oeste y este (el acceso este, abierto)
    libre = piso_m.difference(duro)
    puerta = caja2d(I2 - 3, P_['puerta_e'][0], I2, P_['puerta_e'][1])
    lejos = unary_union([banda_aro, duro.buffer(PASILLO)] + list(plazas.values()))
    filas_m = manzanas(S_m, L_m, piso_m.intersection(caja2d(I0, 337.6, I0 + F + 0.01, 400)).difference(lejos), libre, [I0], [], z0, lados=(1,), eje=1, pasajes=False)
    filas_m += manzanas(S_m, L_m, piso_m.intersection(caja2d(I2 - F - 0.01, 337.6, I2, 400)).difference(lejos).difference(puerta), libre, [I2], [], z0, lados=(-1,), eje=1, pasajes=False)
    duro = unary_union([duro] + filas_m)
    libre = piso_m.difference(duro)
    # manzanas en aparejo sobre las líneas de postes
    region = piso_m.difference(unary_union([lejos, calle, banda.buffer(1.4), caja2d(I0, 300, I0 + F + PASILLO, 400), caja2d(I2 - F - PASILLO, 300, I2, 400)]))
    celdas = manzanas(S_m, L_m, region, libre, P_['espinas'], P_['cols_u'], z0, cols=cols_m, fase=0)
    loc_pb = celdas + filas_m + borde_s + rac
    INFO['sur_pb'] = {'piso': piso_m, 'celdas': celdas, 'filas': filas_m, 'bordes': borde_s, 'racimos': rac, 'arriates': arrs + [arr_v],
                      'plazas': [(g, n) for n, g in plazas.items()], 'escaleras': [esc_v, esc_h, asc], 'vacios': [vac],
                      'calles': [calle, caja2d(P_['plazas_pb']['tragaluz'][0][2], 358.65, I2, 361.15), caja2d(*P_['pasaje_clavel'])],
                      'servicio': [vit, banda, caja2d(*P_['vehiculo']), caja2d(*P_['anden_caja']), caja2d(*P_['biodigestor']), caja2d(u0r, P_['anden_caja'][1], u1r, v3)],
                      'cols': cols_s}
    print('nave sur PB', {'manzanas': len(celdas), 'contra_muros': len(filas_m), 'borde_aro': len(borde_s), 'racimos': len(rac_g), 'arriates': len(arrs) + 1,
                          'locales': len(loc_pb), 'm2_locales': round(sum(g.area for g in loc_pb))})
    S['local_pb'], S['mesa_pb'], L['local_pb'], L['mesa_pb'] = S_m['local'], S_m['mesa'], L_m['local'], L_m['mesa']
    # ---- PA: una sola plataforma con el vacío del patio de luz ----
    cinta_llega = Polygon([(ARO[0] + r_ * math.cos(math.radians(th)), ARO[1] + r_ * math.sin(math.radians(th)))
                           for r_, ths in ((ARO_RE - CINTA['ancho'], (-22.6, -18.6)), (CORTE + 0.6, (-18.6, -22.6))) for th in [ths[0] + (ths[1] - ths[0]) * k / 8 for k in range(9)]])
    vac_esc = caja2d(*P_['escalera'])
    pa = nave.difference(caja2d(*P_['vehiculo']).buffer(0.01)).difference(vac).difference(vac_esc).difference(caja2d(*P_['montacargas'])).difference(asc).difference(esc_h)
    pa = unary_union([pa, cinta_llega.difference(Point(ARO).buffer(ARO_RE - CINTA['ancho'], 256))]).buffer(0)
    losa(S['pa'], L['pa'], pa, zp - e, zp)
    rayas(L['pa'], pa, zp + 0.005, 0.4)
    # columnas de la PA: en las líneas de columnas, a cada línea de postes (no en la carga; las del vacío, en sus esquinas)
    n_col = 0
    for u, v in cols_s:
        if not caja2d(*P_['vehiculo']).buffer(0.5).contains(Point(u, v)) and not asc.buffer(0.2).contains(Point(u, v)):
            caja(S['columna'], L['columna'], u - 0.15, v - 0.15, z0, u + 0.15, v + 0.15, zp - e)
            n_col += 1
    # barandal en todo borde con vacío (> 0.30) que no sea muro ni vidrio (la llegada de las escaleras queda abierta)
    muros_ext = caja2d(*P_['int']).exterior.buffer(0.05).union(disco.exterior.buffer(0.35))
    abiertos = unary_union([LineString([(u_top, ev0), (u_top, ev1)]).buffer(0.05),
                            LineString([(P_['escalera'][0], P_['escalera'][3]), (P_['escalera'][2], P_['escalera'][3])]).buffer(0.05),
                            asc.exterior.buffer(0.05), LineString([(hu0, hv0), (hu1, hv0)]).buffer(0.05)])
    m_bar = barandal_bordes(L, pa, zp, unary_union([muros_ext.difference(LineString([(I2, 300), (I2, 400)]).buffer(0.06)), abiertos]))
    # franja de servicios: muro ciego de lado a lado con un vano; baños públicos a la derecha, servicio a la izquierda
    banos_s = banos_publicos(S, L, P_['banos_pub'], zp, None)
    cuartos = banos_s.pop('recintos') + servicios_pa(S, L, zp, P_['escalera'][0] - 0.1)
    lu0, lv0, lu1, lv1 = P_['locatarios']
    caja(S['local'], L['local'], lu0, lv0, zp, lu1, lv1, zp + 3.0)
    L['local'].append((((lu0 + lu1) / 2, lv0, zp + 3.0), ((lu0 + lu1) / 2, lv1, zp + 3.0)))
    for x in (lu0 + 0.5, (lu0 + lu1) / 2 + 0.5):   # puertas al vestíbulo de servicio
        L['local'] += [((x, lv1 + 0.01, zp), (x, lv1 + 0.01, zp + 2.1)), ((x + 0.9, lv1 + 0.01, zp), (x + 0.9, lv1 + 0.01, zp + 2.1)), ((x, lv1 + 0.01, zp + 2.1), (x + 0.9, lv1 + 0.01, zp + 2.1))]
    mu0_, mv0_, mu1_, mv1_ = P_['muro_ciego']
    va_, vb_ = P_['vano']
    alto = P_['muro_alto']
    caja(S['muro'], L['muro'], mu0_, mv0_, zp, va_, mv1_, zp + alto)
    caja(S['muro'], L['muro'], vb_, mv0_, zp, mu1_, mv1_, zp + alto)
    caja(S['muro'], L['muro'], va_, mv0_, zp + P_['vano_alto'], vb_, mv1_, zp + alto)   # dintel
    se0, sv0, se1, sv1 = P_['escalera']
    n_esc = math.ceil((zp - z0) / 0.18)
    h_esc = (zp - z0) / n_esc
    huella = (sv1 - sv0) / (n_esc - 1)
    for k in range(n_esc - 1):   # un tiro de sur a norte; el último peralte llega al vestíbulo
        v = sv0 + k * huella
        caja(S['escalera'], L['escalera'], se0, v, z0, se1, v + huella, z0 + (k + 1) * h_esc)
    # ---- PA: el mercado de arriba (fondas alrededor del vacío, terraza-mirador al patio del aro, manzanas) ----
    piso_pa = pa.intersection(caja2d(I0, mv1_, I2, 400))
    plazas_a = {nom: unary_union([caja2d(*q) for q in qs]).intersection(piso_pa) for nom, qs in P_['plazas_pa'].items()}
    S_a, L_a = {'local': [], 'mesa': []}, {'local': [], 'mesa': []}
    # terraza junto al vidrio: barra corrida mirando al patio del aro (sin la llegada de la cinta) y paseo
    T = P_['terraza']
    barras = []
    th_c = (math.radians(-23.2), math.radians(-18.0))
    pts_b = arco_pts(R_VID + 0.05, th_a, -0.05, 1.2)
    for p, q in zip(pts_b, pts_b[1:]):
        thm = math.atan2((p[1] + q[1]) / 2 - ARO[1], (p[0] + q[0]) / 2 - ARO[0])
        if th_c[0] <= thm <= th_c[1]:
            continue
        t_ = tira(p, q, 0.0, 1.0, 0.0, radial(p, q))
        if t_ is not None and piso_pa.buffer(0.02).contains(t_):
            barras.append(barra_mirador(S_a, L_a, 'mesa', p, q, radial(p, q), zp))
    pts_t = arco_pts(R_VID + T, th_a, -0.05, W)
    borde_t = isla_borde(S_a, L_a, pts_t, radial, piso_pa.difference(plazas_a['boca']).difference(plazas_a['balcon']).difference(plazas_a['cinta']), piso_pa, zp, cada=BOCA_CADA)
    # barras-mirador en tres bordes del vacío (en el cuarto llega la escalera)
    vu0_, vv0_, vu1_, vv1_ = P_['vacio']
    for a, b, n in (((vu0_, vv1_), (vu1_, vv1_), (0, 1)), ((vu1_, vv0_), (vu1_, vv1_), (1, 0)), ((vu0_, ev1 + 0.6), (vu0_, vv1_), (-1, 0))):
        barras.append(barra_mirador(S_a, L_a, 'mesa', a, b, n, zp))
    llegada = caja2d(u_top - 2.4, ev0 - 0.6, u_top, ev1 + 0.6)
    llegada_h = caja2d(hu0 - 1.4, hv0 - 2.4, I2, hv1)   # la llegada de la escalera de Heliotropo
    duro_a = unary_union(barras + borde_t + [vac.buffer(0.05), asc, llegada, vac_esc, llegada_h])
    # fondas con barra alrededor del vacío
    pos_a, _ = poner_racimos(plazas_a['balcon'].difference(vac.buffer(2.4, join_style='mitre')).difference(llegada.buffer(0.5)).difference(asc.buffer(1.2)).difference(duro_a),
                             P_['racimos_pa'], ((vu0_ + vu1_) / 2, (vv0_ + vv1_) / 2))
    rac_a, rac_ag = [], []
    for c in pos_a:
        h_, g_ = racimo(S_a, L_a, c, zp)
        rac_a += h_; rac_ag.append(g_)
    duro_a = unary_union([duro_a] + rac_ag)
    arrs_a = poner_arriates(S, L, 'maceta', 'pasto', P_['arriates_pa'], piso_pa.difference(duro_a.buffer(0.05)), zp, arboles, rng, arbol=(2.2, 3.2))
    duro_a = unary_union([duro_a] + arrs_a)
    libre_a = piso_pa.difference(duro_a)
    banda_t = Point(ARO).buffer(R_VID + T + 2 * F + 1.2, 256)
    lejos_a = unary_union([banda_t, duro_a.buffer(PASILLO)] + list(plazas_a.values()))
    filas_a = manzanas(S_a, L_a, piso_pa.intersection(caja2d(I0, mv1_, I0 + F + 0.01, 400)).difference(lejos_a), libre_a, [I0], [], zp, lados=(1,), eje=1, pasajes=False)
    filas_a += manzanas(S_a, L_a, piso_pa.intersection(caja2d(I2 - F - 0.01, mv1_, I2, 400)).difference(lejos_a), libre_a, [I2], [], zp, lados=(-1,), eje=1, pasajes=False)
    duro_a = unary_union([duro_a] + filas_a)
    libre_a = piso_pa.difference(duro_a)
    region_a = piso_pa.difference(unary_union([lejos_a, caja2d(I0, 300, I2, mv1_ + 1.4), caja2d(I0, 300, I0 + F + PASILLO, 400), caja2d(I2 - F - PASILLO, 300, I2, 400)]))
    celdas_a = manzanas(S_a, L_a, region_a, libre_a, P_['espinas'], P_['cols_u'], zp, cols=cols_s, fase=1)
    loc_pa = celdas_a + filas_a + borde_t + rac_a
    for k in ('local', 'mesa'):
        S[k] += S_a[k]; L[k] += L_a[k]
    INFO['sur_pa'] = {'piso': piso_pa, 'celdas': celdas_a, 'filas': filas_a, 'bordes': borde_t, 'racimos': rac_a, 'arriates': arrs_a,
                      'plazas': [(g, n) for n, g in plazas_a.items()], 'calles': [], 'escaleras': [llegada, asc, esc_h], 'vacios': [vac], 'barras': barras,
                      'servicio': [caja2d(I0, I1, I2, mv1_).intersection(pa)], 'cuartos': cuartos, 'cols': cols_s}
    print('nave sur PA', {'manzanas': len(celdas_a), 'contra_muros': len(filas_a), 'terraza': len(borde_t), 'racimos': len(rac_ag), 'arriates': len(arrs_a),
                          'locales': len(loc_pa), 'barra_m': round(sum(b.length / 2 - 1.0 for b in barras if not b.is_empty)), 'm2_locales': round(sum(g.area for g in loc_pa))})
    # ---- cuentas ----
    lluvia = (caja2d(504.6, 323.6, 558.9, 396.8).difference(disco).area + caja2d(*CAJA_N).difference(disco).area) * P_['lluvia_m'] * P_['escurre']
    biomasa = A_t * P_['tanque_prof'] * P_['kg_m3']
    cult_lech = A_c * (1 - P_['otras_frac'])
    comida = round(len(loc_pa) * 2 / 3)
    org = (comida + 25) * P_['org_kg_puesto']   # + los ~25 de comida de la nave norte (supuesto)
    vol_req = org * P_['trh'] / 1000 * 1.25 * 4   # mezcla 1:3 con agua
    pb_util = nave.area - caja2d(*P_['vehiculo']).area
    res = {'carga_m2': round(caja2d(*P_['vehiculo']).area + caja2d(*P_['anden_caja']).area + caja2d(*P_['servicio']).area, 1),
           'biodigestor_m2': round(caja2d(*P_['biodigestor']).area, 1), 'biodigestor_m3': round(vol_bio, 1), 'biodigestor_m3_requerido': round(vol_req, 1),
           'tubos': n_t, 'acuaponia_m2': round(A_acu, 1), 'tanques_m2': round(A_t, 1), 'cultivo_m2': round(A_c, 1),
           'peces_kg_año': round(biomasa * P_['cosechas_peces']), 'lechugas_año': round(cult_lech * P_['lechuga_m2'] * P_['ciclos_lechuga']),
           'otras_kg_año': round(A_c * P_['otras_frac'] * P_['otras_kg_m2']), 'lluvia_m3_año': round(lluvia),
           'agua_sistema_m3': round(A_t * P_['tanque_prof'] + A_c * 0.3), 'reposicion_m3_año': round((A_t * P_['tanque_prof'] + A_c * 0.3) * 0.015 * 365),
           'pa_m2': round(pa.area, 1), 'puestos': len(loc_pa), 'puestos_comida': comida, 'racimos_pa': len(rac_ag), 'racimos_pb': len(rac_g), 'columnas_pa': n_col, 'banos': banos_s,
           'barandal_m': round(m_bar, 1), 'ocupantes_pa': round(pa.area / 5.6), 'ancho_salidas_m': round(pa.area / 5.6 * 0.005, 2),
           'acuaponia/pb_util': round(A_acu / pb_util, 2), 'puestos_pb': len(loc_pb), 'm2_locales_pb': round(sum(g.area for g in loc_pb)),
           'm2_locales_pa': round(sum(g.area for g in loc_pa)), 'mercado_pb_m2': round(piso_m.area, 1), 'arboles': len(arboles)}
    print('nave sur', json.dumps(res, ensure_ascii=False))
    return {**{k: plano(v) for k, v in S.items() if v}, **{k + 'L': plano(v) for k, v in L.items() if v}}, arboles, res


# ================= Cinta del aro (Gabriel, 2026-10-09) =================
# Una franja de 2 m del borde de afuera del aro se desprende y baja: arranca pegada
# al aro (+10.03, su piso en Rhino: el mismo canto y el mismo barandal; «que se vea como el mismo
# objeto y sólo se empieza a separar»), baja en rampa (≤ 8 %, descansos de 1.20 a
# cada 6 m: NTC 2.2.2.4.1 y tabla 2.2.2.4.1), descansa a la altura de la planta
# alta de la nave sur (+4.28) y termina a +2.40 en las plataformas de la nave
# norte, cruzando Heliotropo (2026-10-12: a +4.28, la de la P3 norte: sigue plana). Va en sentido antihorario. El aro, donde se
# desprendió, queda 2 m más angosto (eso lo dibuja el visor con th0…th1).
ARO_Z, ARO_CANTO, ARO_RE = 10.03, 0.35, 46.55
CINTA = {'plano': 27.6, 'ancho': 2.0, 'pa': 4.28, 'fin': 4.28, 'th_fin': 18.0, 'pendiente': 0.08, 'tramo': 6.0, 'descanso': 1.2, 'desc_pa': 3.0, 'desc_fin': 1.6}


def cinta_aro():
    ri, re = ARO_RE - CINTA['ancho'], ARO_RE
    rc = (ri + re) / 2
    perfil, s, z = [(0.0, ARO_Z)], 0.0, ARO_Z
    pendientes = []

    def baja(dz):
        nonlocal s, z
        n = math.ceil(dz / (CINTA['pendiente'] * CINTA['tramo']) - 1e-9)
        h = dz / n
        pendientes.append(round(h / CINTA['tramo'] * 100, 2))
        for i in range(n):
            s += CINTA['tramo']; z -= h; perfil.append((s, z))
            if i < n - 1:
                s += CINTA['descanso']; perfil.append((s, z))
    baja(ARO_Z - CINTA['pa'])
    s_pa0 = s
    s += CINTA['desc_pa']; perfil.append((s, z))
    if CINTA['pa'] - CINTA['fin'] > 1e-6:
        baja(CINTA['pa'] - CINTA['fin'])
    else:   # (2026-10-12) la PA sur y la P3 de la nave norte están a +4.28: la cinta sigue plana, cruzando Heliotropo
        s += CINTA['plano']; perfil.append((s, z))
    s_fin0 = s
    s += CINTA['desc_fin']; perfil.append((s, z))
    Ltot = s
    th1 = CINTA['th_fin']
    th0 = th1 - math.degrees(Ltot / rc)
    th = lambda s: th0 + math.degrees(s / rc)

    def z_en(x):
        for (s0, z0), (s1, z1) in zip(perfil, perfil[1:]):
            if s0 <= x <= s1:
                return z0 + (z1 - z0) * (x - s0) / (s1 - s0) if s1 > s0 else z1
        return perfil[-1][1]
    P = lambda t, r, zz: (ARO[0] + math.cos(math.radians(t)) * r, ARO[1] + math.sin(math.radians(t)) * r, zz)
    # muestras a lo largo (cada ~0.6 m y en cada quiebre del perfil)
    ss = sorted(set([round(x, 4) for x, _ in perfil] + [i * 0.6 for i in range(int(Ltot / 0.6) + 1)]))
    tris, lins = [], []
    for s0, s1 in zip(ss, ss[1:]):
        t0, t1, z0, z1 = th(s0), th(s1), z_en(s0), z_en(s1)
        for (ra, za0, za1), (rb, zb0, zb1) in (((ri, z0, z1), (re, z0, z1)), ((ri, z0 - ARO_CANTO, z1 - ARO_CANTO), (re, z0 - ARO_CANTO, z1 - ARO_CANTO))):
            A, B, C, D = P(t0, ra, za0), P(t1, ra, za1), P(t1, rb, zb1), P(t0, rb, zb0)
            tris += [(A, B, C), (A, C, D)]
        for r in (ri, re):   # cantos
            A, B, C, D = P(t0, r, z0 - ARO_CANTO), P(t1, r, z1 - ARO_CANTO), P(t1, r, z1), P(t0, r, z0)
            tris += [(A, B, C), (A, C, D)]
            lins += [(P(t0, r, z0), P(t1, r, z1)), (P(t0, r, z0 - ARO_CANTO), P(t1, r, z1 - ARO_CANTO))]
    for s0 in (0.0, Ltot):   # tapas
        t, zz = th(s0), z_en(s0)
        A, B, C, D = P(t, ri, zz - ARO_CANTO), P(t, re, zz - ARO_CANTO), P(t, re, zz), P(t, ri, zz)
        tris += [(A, B, C), (A, C, D)]
        lins += [(A, B), (B, C), (C, D), (D, A)]
    # cada quiebre (arranque y fin de los descansos): una raya de lado a lado
    for x, zz in perfil[1:-1]:
        lins.append((P(th(x), ri, zz), P(th(x), re, zz)))
    # barandal (como el del aro: pasamanos a +0.90 y balaustres a cada 2.40; aquí también zoclo y travesaño)
    # El de adentro empieza donde la cinta ya bajó más de 0.30 respecto al aro.
    for r, desde in ((re, 0.0), (ri, next((x for x in ss if ARO_Z - z_en(x) > VACIO), 0.0))):
        prev = None
        for x in [v for v in ss if v >= desde]:
            q = P(th(x), r, z_en(x))
            if prev:
                for h in (0.1, BARANDAL):
                    lins.append(((prev[0], prev[1], prev[2] + h), (q[0], q[1], q[2] + h)))
            prev = q
        x = desde
        while x <= Ltot:
            q = P(th(x), r, z_en(x)); lins.append((q, (q[0], q[1], q[2] + BARANDAL)))
            x += 2.4
    # llegadas: a la planta alta de la nave sur (por el descanso) y a la plataforma +2.40 de la nave norte
    for (sa, sb), r1 in (((s_pa0, s_pa0 + CINTA['desc_pa']), CORTE + 0.6), ((s_fin0, Ltot), CORTE + 0.9)):
        za = z_en(sa)
        VIDRIO_VANOS.append((math.radians(th(sa)), math.radians(th(sb)), za - ARO_CANTO, za + 2.5))   # se cruza el vidrio
        n = 6
        borde = [P(th(sa + (sb - sa) * i / n), re, za) for i in range(n + 1)] + [P(th(sb - (sb - sa) * i / n), r1, za) for i in range(n + 1)]
        g = Polygon([(q[0], q[1]) for q in borde])
        losa(tris, lins, g, za - ARO_CANTO, za)
    cruce = [round(z_en((math.radians(t - th0)) * rc), 2) for t in (math.degrees(math.asin((HE_LIM[1] - ARO[1]) / rc)), math.degrees(math.asin((HE_LIM[0] - ARO[1]) / rc)))]
    datos = {'ri': ri, 're': re, 'th0': round(th0, 3), 'th1': round(th1, 3), 'canto': ARO_CANTO,
             'perfil': [[round(th(x), 3), round(zz, 3)] for x, zz in perfil], 'largo': round(Ltot, 2), 'pendientes': pendientes,
             'pa': [round(th(s_pa0), 3), round(th(s_pa0 + CINTA['desc_pa']), 3)], 'heliotropo_z': cruce}
    print('cinta del aro', json.dumps(datos))
    return tris, lins, datos


HE_LIM = (401.0, 409.0)   # Heliotropo (v)


def planta_png(pisos, hoyo, vis, jardin, arboles, viv, hechos, barr):
    """Planta rotulada de la nave norte (analisis/mercado/planta_mercado_norte.png), norte arriba del modelo."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon as Pol, Circle, Rectangle
    fig, ax = plt.subplots(figsize=(9, 14))
    ax.set_facecolor('#111'); fig.patch.set_facecolor('#111')

    def pinta(g, **kw):
        for p in poligonos(g):
            ax.add_patch(Pol(list(p.exterior.coords), closed=True, **kw))
            for h in p.interiors:
                ax.add_patch(Pol(list(h.coords), closed=True, fc='#111', ec=kw.get('ec', 'none'), lw=kw.get('lw', 0.5)))

    ax.add_patch(Rectangle((ZANJA_EXT[0], ZANJA_EXT[1]), ZANJA_EXT[2] - ZANJA_EXT[0], ZANJA_EXT[3] - ZANJA_EXT[1], fc='#1d3a4a', ec='none'))
    ax.add_patch(Rectangle((ZANJA[0], ZANJA[1]), ZANJA[2] - ZANJA[0], ZANJA[3] - ZANJA[1], fc='#2a2a2a', ec='none'))
    pinta(jardin, fc='#1f4d2b', ec='none')
    pinta(vis, fc='#3f8f4f', ec='none')
    zs = sorted(pisos)
    for z in zs:
        t = (z - zs[0]) / max(1e-6, zs[-1] - zs[0])
        pinta(pisos[z], fc=plt.cm.Greys(0.25 + 0.55 * t), ec='k', lw=0.4, alpha=0.95)
    for z in zs:
        if pisos[z].area > 20:
            c = pisos[z].representative_point()
            ax.text(c.x, c.y, '+%.2f' % z, ha='center', va='center', fontsize=7, color='#111')
    for a, b, z in barr:
        ax.plot([a[0], b[0]], [a[1], b[1]], color='#ffcc33', lw=1.2)
    for nombre, z, n, zonas, _c in hechos:
        a0, b0 = [(x[1], x[2]) for x in BLOQUES if x[0] == nombre][0]
        pinta(poli_ret(a0, b0, a0 + CLARO[0], b0 + CLARO[1]), fc='none', ec='#ff5cb0', lw=1, ls='--')
        c = de_ret(a0 + CLARO[0] / 2, b0 + CLARO[1] / 2)
        ax.text(c[0], c[1], 'puestos %s\n%d · +%.2f' % (nombre, n, z), ha='center', va='center', fontsize=7, color='w')
        for zona in zonas:
            pinta(zona, fc='none', ec='#ffd27f', lw=0.6, ls=':')
            c = zona.centroid
            ax.text(c.x, c.y, 'comedor', ha='center', va='center', fontsize=6, color='#ffd27f')
    for q in DIBUJO['puestos']:
        pinta(q, fc='#8a98ff', ec='w', lw=0.5)
    for q in DIBUJO['mesas']:
        pinta(q, fc='#ffd27f', ec='#111', lw=0.3)
    ax.add_patch(Rectangle((BANOS[0], BANOS[1]), BANOS[2] - BANOS[0], BANOS[3] - BANOS[1], fc='#555', ec='w', lw=0.6))
    ax.text((BANOS[0] + BANOS[2]) / 2, (BANOS[1] + BANOS[3]) / 2, 'baños\nH · M ·\nlocatarios', ha='center', va='center', fontsize=6, color='w')
    pinta(hoyo, fc='none', ec='#7CFC00', lw=2)
    for x, y, z, h in arboles:
        ax.add_patch(Circle((x, y), 0.25 + h * 0.12, fc='none', ec='#b6ff7a', lw=1))
    for c in viv:
        ax.add_patch(Rectangle((c['u'] - 0.2, c['v'] - 0.2), 0.4, 0.4, fc='m', ec='none'))
    for u, v in COLUMNAS_ACERO:
        ax.add_patch(Rectangle((u - 0.15, v - 0.15), 0.3, 0.3, fc='w', ec='none'))
    ax.add_patch(Circle(ARO, CORTE, fc='none', ec='orange', ls='--'))
    ax.set_xlim(521, 560); ax.set_ylim(415, 490); ax.set_aspect('equal')
    ax.tick_params(colors='#888'); ax.set_xlabel('u (m)', color='#888'); ax.set_ylabel('v (m)', color='#888')
    ax.set_title('Nave norte — plataformas de Gabriel (gris: más oscuro, más alto), barandales 0.90 (amarillo),\n'
                 'puestos sobre la retícula de la vivienda (azul; sus columnas en magenta; las de acero del mercado en blanco, dentro de los muros),\n'
                 'comedores (mesas en amarillo), hoyo Ø 6.36 (verde) y jardín',
                 color='w', fontsize=8)
    salida = os.path.join(os.path.dirname(RAIZ), 'analisis', 'mercado', 'planta_mercado_norte.png')
    fig.savefig(salida, dpi=110, facecolor='#111', bbox_inches='tight')
    print('planta', salida)


# ================= Mercado plano en cruz (2026-10-12, Gabriel) =================
# «Plano, más locales, algo más tradicional mexicano: pasillos y ejes en cruz; los locales siguen la retícula del
# estacionamiento; minimiza el jardín; circulaciones en lo que marcan las NTC.»
# Locales de 2.75 × 2.0 (5.5 m²: ≥ 4 m² y lado ≥ 2.00, NTC 2.2.1.2) en islas de dos filas espalda con espalda; las
# islas se apilan en b con pasillos de 1.10 (NTC tabla 4.3.5.1b: mínimo en áreas de ventas) y van de 2.75 en 2.75
# sobre la retícula de la vivienda/estacionamiento (columnas cada 5.5 en a y cada 8.0 en b, girada GIRO°). Dos ejes
# en cruz de 2.75 (un módulo) se cruzan en una plaza de 8.25 × 8 con mesas; el eje largo cae en la línea de módulos
# y el corto en una línea de columnas (b). La alineación en b entre islas no es completa (5.1 m de periodo, no 8).
A0, B0 = 447.52, 529.73      # esquina de un claro de la vivienda (BLOQUES): columnas en A0 + 5.5 k, B0 + 8 k
# Baños (NTC Proyecto Arquitectónico, Gaceta 12/12/2024): cubículo de inodoro accesible con lavabo dentro 1.70 × 1.70
# (3.1.4.2 / tabla 3.1.6.1), cubículos de 0.90 × 1.50 con inodoro de caja (3.1.4.1 d), mingitorio 0.75 con mampara,
# lavabo accesible 0.80 × 1.50 con su área de uso, circulación interior ≥ 0.90 (3.1.4.1 f), vestíbulo en codo para que
# al abrir no se vea el interior (3.1.4.1 b). Ancho libre = cubículo accesible + circulación + lavabo con su área de uso.
# Los baños se reparten entre las dos naves (Gabriel): cada nave tiene los suyos para sus propios ocupantes.
BANO = {'acc': 1.70, 'wc': 0.90, 'ming': 0.75, 'lav': (0.80, 1.50), 'circ': 0.90, 'vest': 1.50, 'aseo': 1.20, 'muro': 0.15}
ANCHO_BANO = BANO['acc'] + BANO['circ'] + BANO['lav'][1]          # 4.10 m libres
# (Gabriel: «de lo que salga ese ancho de los baños, para la retícula del mercado cambiaremos la tipología»): el fondo de una
# isla de dos locales espalda con espalda = el ancho de los baños; cada local 2.50 × 2.05 = 5.1 m² (≥ 4 m², lado ≥ 2.00).
CELDA = (2.5, ANCHO_BANO / 2)
GRUPO = 6                    # puestos seguidos antes de un pasillo transversal de 1.10
PASILLO = 1.10               # NTC: pasillos en áreas de ventas, mínimo
EJE = 2.75                   # ancho de cada eje en cruz
MESAS_FRAC = 0.0             # (2026-10-12, Gabriel: «no me gusta el comedor frente al local»): se come en las barras de los racimos
INFO = {}                    # para la planta rotulada


def mesa_ret(S, L, a, b, z):
    M_ = MESA
    bm = b + M_['banca']
    caja_ret(S['mesa'], L['mesa'], a, bm, a + M_['largo'], bm + M_['ancho'], z + 0.70, z + 0.75)
    for bb in (b, bm + M_['ancho']):
        caja_ret(S['mesa'], L['mesa'], a + 0.05, bb + 0.05, a + M_['largo'] - 0.05, bb + M_['banca'] - 0.05, z + 0.40, z + 0.45)
    for aa in (a + 0.15, a + M_['largo'] - 0.15):
        for bb, h in ((b + 0.17, 0.4), (bm + 0.37, 0.7), (bm + M_['ancho'] + 0.18, 0.4)):
            pp = de_ret(aa, bb)
            L['mesa'].append(((pp[0], pp[1], z), (pp[0], pp[1], z + h)))


def trama(S, L, nombre, piso, duro, cols, centro, z, escalera=None, tope_mesas=None, ejes_cruz=True):
    """Locales, ejes en cruz y mesas sobre `piso` (polígono uv libre de muros, jardín, vidrio).
    duro: obstáculos que ni locales ni ejes pisan; escalera: remate del cruce (los locales la esquivan, los ejes llegan a ella);
    cols: columnas (puntos) que pueden quedar dentro de un local pero no en un pasillo de 1.10."""
    W, F = CELDA
    libre = piso.difference(duro)
    if escalera is not None:
        libre = libre.difference(escalera.buffer(PASILLO))
    cols_b = unary_union([Point(u, v).buffer(0.25) for u, v in cols]) if cols else Polygon()
    pts = [a_ret(*p) for p in piso.envelope.exterior.coords]
    amin, amax = min(p[0] for p in pts), max(p[0] for p in pts)
    bmin, bmax = min(p[1] for p in pts), max(p[1] for p in pts)
    ca, cb = a_ret(*centro)
    banda_a = lambda k: poli_ret(A0 + k * W, bmin - 5, A0 + (k + 1) * W, bmax + 5)
    banda_b = lambda b: poli_ret(amin - 5, b - EJE / 2, amax + 5, b + EJE / 2)
    banda_a = lambda a_c: poli_ret(a_c - EJE / 2, bmin - 5, a_c + EJE / 2, bmax + 5)
    a_ax = min([ca + 0.25 * i for i in range(-28, 29)],
               key=lambda a_c: banda_a(a_c).intersection(duro).area * 10 + banda_a(a_c).intersection(cols_b).area * 4 + abs(a_c - ca) * 0.5)
    mb = min(range(round((cb - B0) / 8) - 3, round((cb - B0) / 8) + 4),
             key=lambda m_: banda_b(B0 + 8 * m_).intersection(duro).area * 10 + abs(B0 + 8 * m_ - cb) * 0.5)
    b_ax = B0 + 8 * mb
    if not ejes_cruz:   # sin cruz: las islas corren de lado a lado (los ejes quedan fuera de la nave)
        a_ax, b_ax = amin - 50.0, bmin - 50.0
    plaza = Polygon() if not ejes_cruz else poli_ret(a_ax - EJE / 2 - 5.5, b_ax - EJE / 2 - 5.4, a_ax + EJE / 2 + 5.5, b_ax + EJE / 2 + 5.4)   # plaza del cruce: cuatro comedores de 2 × 2 mesas
    filas = []   # (b inferior de la fila, lado del frente: −1 abre a −b, +1 a +b)
    s = b_ax + EJE / 2
    while s < bmax + F:
        filas += [(s, -1), (s + F, 1)]
        s += 2 * F + PASILLO
    e = b_ax - EJE / 2
    while e > bmin - F:
        filas += [(e - 2 * F, -1), (e - F, 1)]
        e -= 2 * F + PASILLO
    zona = libre.buffer(-0.02)
    celdas = []
    cols_a = []   # a de cada puesto: desde cada borde del eje hacia afuera, GRUPO puestos y un pasillo transversal de 1.10
    a = a_ax + EJE / 2
    while a < amax:
        for _ in range(GRUPO):
            cols_a.append(a); a += W
        a += PASILLO
    a = a_ax - EJE / 2
    while a > amin:
        for _ in range(GRUPO):
            a -= W; cols_a.append(a)
        a -= PASILLO
    for bl, lado in filas:
        for a0 in cols_a:
            g = poli_ret(a0, bl, a0 + W, bl + F)
            if (not plaza.is_empty and g.intersects(plaza)) or not zona.contains(g):
                continue
            bf = bl if lado < 0 else bl + F
            strip = poli_ret(a0, bf - PASILLO, a0 + W, bf) if lado < 0 else poli_ret(a0, bf, a0 + W, bf + PASILLO)
            if not piso.buffer(0.01).contains(strip) or strip.intersects(duro) or strip.intersects(cols_b) or (escalera is not None and strip.intersects(escalera)):
                continue
            celdas.append((g, LineString([de_ret(a0, bf), de_ret(a0 + W, bf)])))
    for g, frente in celdas:
        puesto_geo(S, L, g, [frente], z)
    # mesas: en los huecos (cruce, cuñas, donde se cayó un local), a ≥ 1.10 de los locales y fuera de los ejes
    ocupado = unary_union([g for g, _ in celdas]) if celdas else Polygon()
    ejes = unary_union([banda_a(a_ax), banda_b(b_ax)])
    vacio = piso.buffer(-0.4, join_style='mitre').difference(ocupado.buffer(PASILLO - 0.05, join_style='mitre')).difference(duro.buffer(0.3)).difference(cols_b.buffer(0.3)).difference(ejes)
    if escalera is not None:
        vacio = vacio.difference(escalera.buffer(PASILLO))
    M_ = MESA
    paso_a, paso_b = M_['largo'] + M_['cabecera'], M_['ancho'] + 2 * M_['banca'] + M_['entre']
    prof = M_['ancho'] + 2 * M_['banca']
    cand = []
    a = math.floor(amin / paso_a) * paso_a + A0 % paso_a
    while a < amax:
        b = math.floor(bmin / paso_b) * paso_b + B0 % paso_b
        while b < bmax:
            q = poli_ret(a - 0.1, b - 0.1, a + M_['largo'] + 0.1, b + prof + 0.1)
            if vacio.contains(q):
                cand.append((q.centroid.distance(Point(centro)), a, b, q))
            b += paso_b
        a += paso_a
    # los cuatro comedores de la plaza: 2 × 2 mesas pegadas a las esquinas de cada cuadrante
    pri = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for i in range(2):
                for j in range(2):
                    aa = a_ax + sx * (EJE / 2 + 0.45) + (i * paso_a if sx > 0 else -M_['largo'] - i * paso_a)
                    bb = b_ax + sy * (EJE / 2 + 0.45) + (j * paso_b if sy > 0 else -prof - j * paso_b)
                    q = poli_ret(aa - 0.1, bb - 0.1, aa + M_['largo'] + 0.1, bb + prof + 0.1)
                    if piso.buffer(-0.3).contains(q) and not q.intersects(duro) and not q.intersects(cols_b):
                        pri.append((-1.0, aa, bb, q))
    cand = pri + cand
    cand.sort(key=lambda t: t[0])
    tope = tope_mesas if tope_mesas is not None else round(MESAS_FRAC * len(celdas))
    mesas = []
    for _, a, b, q in cand:
        if len(mesas) >= tope:
            break
        if any(q.intersects(m_) for m_ in mesas):
            continue
        mesas.append(q)
        mesa_ret(S, L, a, b, z)
    INFO.setdefault(nombre, {}).update({'celdas': [g for g, _ in celdas], 'mesas': mesas, 'ejes': ejes, 'plaza': plaza, 'duro': duro, 'cols': cols, 'piso': piso})
    print('trama', nombre, {'locales': len(celdas), 'm2_locales': round(sum(g.area for g, _ in celdas)), 'mesas': len(mesas),
                            'cruce_uv': [round(x, 1) for x in de_ret(a_ax, b_ax)], 'plaza': None if plaza.is_empty else [round(x, 1) for x in plaza.centroid.coords[0]]})
    return len(celdas), len(mesas), sum(g.area for g, _ in celdas)


# ---- Nave norte con tres plataformas (Gabriel, 2026-10-12) ----
# P1: franja de 12 m contra el muro oeste, de dos pisos: abajo locales que dan servicio hacia afuera (abren al muro
#     oeste) y espalda con espalda otros hacia la nave; arriba (+4.28, la altura de la PA sur) se conecta al mercado.
# P2: a medio piso (+2.40, donde termina la cinta del aro), de los 12 m al muro este y unos 20 m de largo (al norte);
#     escaleras de P1 a P2 y de P2 al piso.
# P3: a la altura de P1 (+4.28), a lo largo del vidrio del aro; abajo, locales que dan al patio del aro.
Z_P1 = Z_P3 = 4.28
Z_P2 = 2.40
P1_ANCHO, P2_LARGO, P3_ANCHO = 12.0, 20.0, 8.0
LOSA_P = 0.30
ESC = {'ancho': 2.4, 'huella': 0.30}
RACIMO = {'n': 4, 'barra': 0.45, 'banco': 0.60}   # 4 locales espalda con espalda con una barra alrededor (Tepotzotlán)
R_VID = CORTE + 0.3                                 # cara de la nave en el corte del aro


def banos_ntc(ocupantes):
    """Muebles para los ocupantes de UNA nave (los baños se reparten entre las dos; tabla 3.1.1.1, comercio y abasto:
    mujeres 1 inodoro / 375, hombres 1 / 750; lavabos 1 / 750; 1 mingitorio por cada 5 inodoros de hombres;
    1 de cada 5 muebles accesible) y el tamaño del bloque."""
    m = h = ocupantes / 2   # 3.1.1.2 a): 50 % mujeres, 50 % hombres
    req = {'M_inodoros': math.ceil(m / 375), 'H_inodoros': math.ceil(h / 750), 'M_lavabos': math.ceil(m / 750), 'H_lavabos': math.ceil(h / 750)}
    req['H_mingitorios'] = math.ceil(req['H_inodoros'] / 5)
    # lo que se proyecta (más que el mínimo: el mercado tiene fondas): clientes y locatarios
    dis = {'M_inodoros': max(3, req['M_inodoros']), 'H_inodoros': max(2, req['H_inodoros']), 'H_mingitorios': max(2, req['H_mingitorios']),
           'M_lavabos': max(2, req['M_lavabos']), 'H_lavabos': max(2, req['H_lavabos'])}
    B = BANO
    largo_m = B['vest'] + B['acc'] + (dis['M_inodoros'] - 1) * B['wc']
    largo_h = B['vest'] + B['acc'] + (dis['H_inodoros'] - 1) * B['wc'] + dis['H_mingitorios'] * B['ming']
    return req, dis, {'ancho_libre': round(ANCHO_BANO, 2), 'ancho_total': round(ANCHO_BANO + 2 * B['muro'], 2),
                      'largo_mujeres': round(largo_m, 2), 'largo_hombres': round(largo_h, 2), 'aseo': B['aseo'],
                      'largo_total': round(largo_m + largo_h + B['aseo'] + 4 * B['muro'], 2)}


def bloque_banos(S, L, u1, v0, med, z):
    """Bloque de baños contra el muro este (u1), de v0 hacia el norte: mujeres, hombres, aseo; puertas al oeste."""
    B = BANO
    u0 = u1 - med['ancho_total']
    v1 = v0 + med['largo_total']
    caja(S['local'], L['local'], u0, v0, z, u1, v1, z + 3.0)
    cortes = [v0 + B['muro'] + med['largo_mujeres'], v0 + 2 * B['muro'] + med['largo_mujeres'] + med['largo_hombres']]
    for v in cortes:
        L['local'].append(((u0, v, z + 3.0), (u1, v, z + 3.0)))
    for a, b in ((v0, cortes[0]), (cortes[0], cortes[1]), (cortes[1], v1)):   # una puerta de 0.90 por recinto, en su extremo sur
        vm = a + 0.3 + 0.45
        for (p, q) in (((u0 - 0.01, vm - 0.45, z), (u0 - 0.01, vm - 0.45, z + 2.1)), ((u0 - 0.01, vm + 0.45, z), (u0 - 0.01, vm + 0.45, z + 2.1)),
                       ((u0 - 0.01, vm - 0.45, z + 2.1), (u0 - 0.01, vm + 0.45, z + 2.1))):
            L['local'].append((p, q))
    return caja2d(u0, v0, u1, v1)


def isla_borde(S, L, pts, hacia, zona, piso, z, cada=None):
    """Fila doble de locales a lo largo de la polilínea `pts` (la cara exterior): los de afuera abren hacia afuera (sobre
    la polilínea), los de atrás hacia la nave. hacia(p, q) = vector unitario hacia adentro. cada: tras ese número de
    pares seguidos, un paso libre (2026-10-12: del mercado al patio, sin rodear toda la fila)."""
    W, F = CELDA
    hechos, seguidos = [], 0
    for p, q in zip(pts, pts[1:]):
        if cada and seguidos >= cada:
            seguidos = 0
            continue
        n = hacia(p, q)
        P = lambda x, d: (x[0] + n[0] * d, x[1] + n[1] * d)
        A = Polygon([p, q, P(q, F), P(p, F)])
        B_ = Polygon([P(p, F), P(q, F), P(q, 2 * F), P(p, 2 * F)])
        if not zona.contains(A.buffer(-0.02)) or not zona.contains(B_.buffer(-0.02)):
            seguidos = 0
            continue
        frente_b = LineString([P(p, 2 * F), P(q, 2 * F)])
        if not piso.buffer(0.01).contains(Polygon([P(p, 2 * F), P(q, 2 * F), P(q, 2 * F + PASILLO), P(p, 2 * F + PASILLO)])):
            seguidos = 0
            continue
        puesto_geo(S, L, A, [LineString([p, q])], z)
        puesto_geo(S, L, B_, [frente_b], z)
        hechos += [A, B_]
        seguidos += 1
    return hechos


def racimo(S, L, c, z):
    """Cuatro locales espalda con espalda (2 × 2) que abren a una barra corrida alrededor, con bancos (Tepotzotlán)."""
    W, F = CELDA
    a, b = a_ret(*c)
    nucleo = poli_ret(a - W, b - F, a + W, b + F)
    hechos = []
    for i in (-1, 0):
        for j in (-1, 0):
            g = poli_ret(a + i * W, b + j * F, a + (i + 1) * W, b + (j + 1) * F)
            fb = b + (j + 1) * F if j == 0 else b + j * F
            fa = a + (i + 1) * W if i == 0 else a + i * W
            frentes = [LineString([de_ret(a + i * W, fb), de_ret(a + (i + 1) * W, fb)]), LineString([de_ret(fa, b + j * F), de_ret(fa, b + (j + 1) * F)])]
            puesto_geo(S, L, g, frentes, z)
            hechos.append(g)
    br, bc = RACIMO['barra'], RACIMO['banco']
    anillo = nucleo.buffer(br, join_style='mitre').difference(nucleo)
    losa(S['mesa'], L['mesa'], anillo, z + 0.90, z + 0.95)                                       # cubierta de la barra
    losa(S['mesa'], L['mesa'], nucleo.buffer(br, join_style='mitre').difference(nucleo.buffer(br - 0.05, join_style='mitre')), z, z + 0.90)   # frente
    ext = list(nucleo.buffer(br + 0.3, join_style='mitre').exterior.coords)
    for p, q in zip(ext, ext[1:]):   # bancos a cada 0.60
        Lg = math.dist(p, q)
        nb = int(Lg / bc)
        for k in range(nb):
            x, y = p[0] + (q[0] - p[0]) * (k + 0.5) / nb, p[1] + (q[1] - p[1]) * (k + 0.5) / nb
            caja(S['mesa'], L['mesa'], x - 0.15, y - 0.15, z, x + 0.15, y + 0.15, z + 0.70)
    return hechos, nucleo.buffer(br + bc, join_style='mitre')


def poner_racimos(region, n, centro):
    """Hasta n racimos en `region`, del más cercano a `centro` hacia afuera, con 1.10 libres alrededor de sus bancos."""
    W, F = CELDA

    def foot(c, pas=PASILLO):
        a, b = a_ret(*c)
        return poli_ret(a - W, b - F, a + W, b + F).buffer(RACIMO['barra'] + RACIMO['banco'] + pas, join_style='mitre')
    u0, v0, u1, v1 = region.bounds
    cand = sorted(((x, y) for x in [u0 + 0.5 * i for i in range(int((u1 - u0) / 0.5) + 1)] for y in [v0 + 0.5 * j for j in range(int((v1 - v0) / 0.5) + 1)]),
                  key=lambda c: math.dist(c, centro))
    puestos, ocup = [], []
    for c in cand:
        if len(puestos) >= n:
            break
        f, f2 = foot(c), foot(c, PASILLO / 2)   # 1.10 a la orilla; entre dos racimos, el pasillo se comparte
        if region.contains(f) and not any(f2.intersects(o) for o in ocup):
            puestos.append(c); ocup.append(f2)
    return puestos, unary_union(ocup).buffer(PASILLO / 2, join_style='mitre') if ocup else Polygon()


def escalera_recta(S, L, x0, y0, d, ancho, z0, z1, huella, grueso=None):
    """Escalera recta que arranca en (x0, y0) a z0 y sube en la dirección d (unitaria) hasta z1; peralte ≤ 0.18.
    grueso: huellas flotadas de ese espesor (escalera volada: se pasa por debajo) en vez de escalones macizos."""
    n = math.ceil((z1 - z0) / 0.18 - 1e-9)
    h = (z1 - z0) / n
    w = (-d[1], d[0])
    for k in range(n - 1):   # el último peralte llega al piso de arriba
        a = (x0 + d[0] * huella * k, y0 + d[1] * huella * k)
        b = (x0 + d[0] * huella * (k + 1), y0 + d[1] * huella * (k + 1))
        g = Polygon([(a[0] - w[0] * ancho / 2, a[1] - w[1] * ancho / 2), (b[0] - w[0] * ancho / 2, b[1] - w[1] * ancho / 2),
                     (b[0] + w[0] * ancho / 2, b[1] + w[1] * ancho / 2), (a[0] + w[0] * ancho / 2, a[1] + w[1] * ancho / 2)])
        losa(S['escalera'], L['escalera'], g, z0 + (k + 1) * h - grueso if grueso else z0, z0 + (k + 1) * h)
    fin = (x0 + d[0] * huella * (n - 1), y0 + d[1] * huella * (n - 1))
    for s_ in (-1, 1):   # pasamanos a 0.90
        L['baranda'].append(((x0 + s_ * w[0] * ancho / 2, y0 + s_ * w[1] * ancho / 2, z0 + 0.9), (fin[0] + s_ * w[0] * ancho / 2, fin[1] + s_ * w[1] * ancho / 2, z1 + 0.9)))
    huella_pol = Polygon([(x0 - w[0] * ancho / 2, y0 - w[1] * ancho / 2), (fin[0] - w[0] * ancho / 2, fin[1] - w[1] * ancho / 2),
                          (fin[0] + w[0] * ancho / 2, fin[1] + w[1] * ancho / 2), (x0 + w[0] * ancho / 2, y0 + w[1] * ancho / 2)])
    return huella_pol, LineString([(fin[0] - w[0] * ancho / 2, fin[1] - w[1] * ancho / 2), (fin[0] + w[0] * ancho / 2, fin[1] + w[1] * ancho / 2)]), n


def barandal_bordes(L, g, z, sin):
    """Barandal de 0.90 en los bordes de g a la altura z, menos donde toca `sin` (muros, vidrio, llegadas de escalera)."""
    m = 0.0
    for p in poligonos(g):
        for anillo in [p.exterior] + list(p.interiors):
            c = list(anillo.coords)
            for a, b in zip(c, c[1:]):
                seg = LineString([a, b]).difference(sin)
                for s_ in getattr(seg, 'geoms', [seg]):
                    if s_.geom_type == 'LineString' and s_.length > 0.2:
                        barandal(L['baranda'], s_.coords[0], s_.coords[-1], z); m += s_.length
    return m


def trama_orientada(S, L, nombre, *args, **kw):
    """trama() con la cuadrícula a 0° y a 90°: se queda con la que da más locales."""
    global GV
    g0, mejor = GV, None
    for g in (g0, g0 + math.pi / 2):
        GV = g
        n = trama({'local': [], 'mesa': []}, {'local': [], 'mesa': []}, nombre, *args, **kw)[0]
        if mejor is None or n > mejor[0]:
            mejor = (n, g)
    GV = mejor[1]
    try:
        return trama(S, L, nombre, *args, **kw)
    finally:
        GV = g0


# ================= Barrio (2026-10-12) =================
# Gabriel: «métele mucho coco: es demasiada acuaponia y poco mercado; hay claros muy largos que se vuelven cansados; el
# chiste es un mercado que maximice los locales pero promueva la interacción social; aunque sean pocas áreas verdes; los
# tragaluces están súper; toma más de arquitectos y proyectos reales». Lo que se toma de cada referente:
#  · Tepoztlán (LRA + Ramírez Suárez): retícula de 2.50 y puestos de ~5 m²; el abasto con su propio recorrido.
#  · Nicolás Bravo (AIDIA Studio): patios verdes que interrumpen la cubierta de una retícula regular → arriates con árbol
#    bajo los vacíos y los tragaluces; el jardín inundable bajo el hoyo.
#  · San Antón (QVE): el vacío con lucernario y la escalera abierta adentro como punto de orientación → patio de luz.
#  · Huimanguillo (128) y Matamoros (C733): una plaza a la que dan los puestos, abierta a un patio arbolado → la plaza
#    del tragaluz abre su boca al patio del aro.
#  · Mercado Roma (Rojkind): recorridos que reinterpretan la retícula → pasajes en aparejo, no pasillos infinitos.
#  · Markthal (MVRDV) y Sydney Fish Market (3XN): un motivo para subir, comida y mirador → fondas y barras arriba.
#  · Toyosu y Sydney: la logística separada y a la vista → abasto por una sola calle; la acuaponia, vitrina.
#  · Metropol Parasol (J. Mayer H.) y Tepoztlán: plataformas a distintas alturas → la gradería del jardín (nave norte).
# Reglas:
#  1. Manzana corta: hasta 3 locales por lado (≤ ~8 m) y un pasaje de 1.40 (NTC ≥ 1.10; cabe el diablito).
#  2. Aparejo: en filas vecinas los pasajes no se alinean (a media crujía y a un cuarto): cada pasaje remata en el
#     frente de una manzana; a cada ~20 m, una plazuela con motivo (fondas con barra, árbol, escalera, vitrina, acceso).
#  3. La espina de cada fila va sobre una línea de columnas: la columna queda en el muro de fondo, nunca en un pasillo.
#  4. Los locales de punta tienen dos frentes; en el borde del aro, un paso al patio cada 5 locales.
PASAJE = 1.40
CEL_MAX = 2.60
BOCA_CADA = 5


def _sw(g):
    return shp_transform(lambda x, y, z=None: (y, x), g)


def pasajes_fila(cols, k, fase, a0, a1):
    """Pasajes (intervalos) de la fila k: a media crujía en las pares y a un cuarto en las nones (aparejo)."""
    cu = sorted(cols)
    if len(cu) < 2:
        return []
    bay = (cu[-1] - cu[0]) / (len(cu) - 1)
    off = 0.5 if (k + fase) % 2 == 0 else 0.25
    xs = [c0 + (c1 - c0) * off for c0, c1 in zip(cu, cu[1:])]
    x = cu[0] - bay * (1 - off)
    while x > a0:
        xs.insert(0, x)
        x -= bay
    x = cu[-1] + bay * off
    while x < a1:
        xs.append(x)
        x += bay
    return [(x - PASAJE / 2, x + PASAJE / 2) for x in xs]


def manzanas(S, L, region, libre, espinas, cols_eje, z, cols=(), fase=0, eje=0, lados=(-1, 1), pasajes=True):
    """Filas de locales espalda con espalda (o una sola: `lados`) sobre las `espinas`, cortadas en manzanas cortas por
    pasajes en aparejo (ver Barrio). eje 0: las filas corren en u (espinas en v); eje 1: corren en v (espinas en u).
    region: donde caben locales; libre: el piso transitable (cada frente pide 1.10 libres, sin columnas).
    Cada manzana se reparte en locales iguales de 2.00 a 2.60 de frente (NTC: lado ≥ 2.00, ≥ 4 m²)."""
    W, F = CELDA
    sw = _sw if eje else (lambda g: g)
    reg = sw(region)
    if reg.is_empty:
        return []
    R, Lb = prep(reg.buffer(0.01)), prep(sw(libre).buffer(0.01))
    cb = unary_union([Point((p[1], p[0]) if eje else p).buffer(0.2) for p in cols]) if cols else Polygon()
    a0, _, a1, _ = reg.bounds
    hechos = []
    for k, e in enumerate(espinas):
        pas = pasajes_fila(cols_eje, k, fase, a0 - 1, a1 + 1) if pasajes else []
        for lado in lados:
            b0, b1 = (e - F, e) if lado < 0 else (e, e + F)
            fb = b0 if lado < 0 else b1
            tramos, run, x = [], None, a0
            while x <= a1 + 1e-9:
                ok = R.contains(caja2d(x, b0 + 0.01, x + 0.05, b1 - 0.01))
                if ok and run is None:
                    run = x
                elif not ok and run is not None:
                    tramos.append((run, x))
                    run = None
                x += 0.05
            if run is not None:
                tramos.append((run, x))
            for A, B in tramos:
                cortes = [A]
                for p0, p1 in pas:
                    if p0 - cortes[-1] >= 2.0 and B - p1 >= 2.0:
                        cortes += [p0, p1]
                cortes.append(B)
                for i in range(0, len(cortes), 2):
                    m0, m1 = cortes[i], cortes[i + 1]
                    G = m1 - m0
                    if G < 2.0:
                        continue
                    n = math.ceil(G / CEL_MAX - 1e-9)
                    if G / n < 2.0:
                        n = int(G / 2.0)
                    w = G / n
                    fila = []
                    for j in range(n):
                        x0, x1 = m0 + j * w, m0 + (j + 1) * w
                        g = caja2d(x0, b0, x1, b1)
                        t_ = caja2d(x0 + 0.02, fb - PASILLO, x1 - 0.02, fb - 0.02) if lado < 0 else caja2d(x0 + 0.02, fb + 0.02, x1 - 0.02, fb + PASILLO)
                        t2 = caja2d(x0 + 0.02, fb - 2.6, x1 - 0.02, fb - 0.02) if lado < 0 else caja2d(x0 + 0.02, fb + 0.02, x1 - 0.02, fb + 2.6)
                        sin_col = not t_.intersects(cb) or Lb.contains(t2)   # (una columna en un pasillo de ≥ 2.6 se rodea)
                        fila.append([g, [LineString([(x0, fb), (x1, fb)])] if Lb.contains(t_) and sin_col else []])
                    for j, xe, s_ in ((0, m0, -1), (n - 1, m1, 1)):   # puntas: segundo frente al pasaje o a la calle
                        lat = caja2d(xe - PASILLO, b0 + 0.02, xe - 0.02, b1 - 0.02) if s_ < 0 else caja2d(xe + 0.02, b0 + 0.02, xe + PASILLO, b1 - 0.02)
                        if Lb.contains(lat) and not lat.intersects(cb):
                            fila[j][1].append(LineString([(xe, b0), (xe, b1)]))
                    hechos += [(g, fr) for g, fr in fila if fr]
    out = []
    for g, fr in hechos:
        g2 = sw(g)
        puesto_geo(S, L, g2, [sw(f) for f in fr], z)
        out.append(g2)
    return out


def arriate(S, L, ks, kl, c, lado, z, arboles, rng, alto=0.45, arbol=(2.8, 4.2)):
    """Arriate de plaza de barrio: jardinera cuadrada con orilla de 0.35 para sentarse, tierra, matas y un árbol."""
    g = caja2d(c[0] - lado / 2, c[1] - lado / 2, c[0] + lado / 2, c[1] + lado / 2)
    t = g.buffer(-0.35, join_style='mitre')
    losa(S[ks], L[ks], g.difference(t), z, z + alto)
    S[ks] += tri_poligono(t, z + alto - 0.08)
    if arbol:
        arboles.append((c[0], c[1], z + alto - 0.08, rng.uniform(*arbol)))
    u0, v0, u1, v1 = t.bounds
    for _ in range(int(t.area * 6)):
        x, y = rng.uniform(u0, u1), rng.uniform(v0, v1)
        L[kl].append(((x, y, z + alto - 0.08), (x + rng.uniform(-0.12, 0.12), y + rng.uniform(-0.12, 0.12), z + alto + rng.uniform(0.15, 0.55))))
    return g


def poner_arriates(S, L, ks, kl, lista, libre, z, arboles, rng, **kw):
    """Los arriates de `lista` [(c, lado)] que caben en `libre` con 1.10 libres alrededor."""
    hechos = []
    for c, lado in lista:
        q = caja2d(c[0] - lado / 2, c[1] - lado / 2, c[0] + lado / 2, c[1] + lado / 2)
        if libre.contains(q.buffer(PASILLO, join_style='mitre')):
            hechos.append(arriate(S, L, ks, kl, c, lado, z, arboles, rng, **kw))
    return hechos


def barra_mirador(S, L, ks, a, b, n, z):
    """Barra corrida en una orilla con vista (el vacío, el jardín, el patio del aro): cubierta a 1.05, frente lleno del
    lado del vacío (hace de pretil, ≥ 0.90), bancos altos cada 0.60. n: hacia la plataforma (unitario).
    Devuelve lo que ocupa (barra y bancos)."""
    t = tira(a, b, 0.0, 0.45, 0.0, n)
    if t is None:
        return Polygon()
    losa(S[ks], L[ks], t, z + 1.00, z + 1.05)
    losa(S[ks], L[ks], tira(a, b, 0.0, 0.06, 0.0, n), z, z + 1.00)
    k = int(math.dist(a, b) / 0.6)
    for i in range(k):
        s = (i + 0.5) / k
        x, y = a[0] + (b[0] - a[0]) * s + n[0] * 0.8, a[1] + (b[1] - a[1]) * s + n[1] * 0.8
        caja(S[ks], L[ks], x - 0.16, y - 0.16, z, x + 0.16, y + 0.16, z + 0.75)
    return tira(a, b, 0.0, 1.0, 0.0, n)


def graderia(S, L, ks, u0, u1, v0, n, z0, z1, pasos):
    """Gradería que sube hacia +v desde v0 (a z0) hasta z1 en n gradas de 0.80 de huella, para sentarse; en `pasos`
    [(u0, u1)] cada grada se parte en 3 escalones (peralte ≤ 0.18, huella 0.27 ≥ 0.25, NTC) con pasamanos."""
    h, hu = (z1 - z0) / n, 0.80
    corte = sorted(pasos)
    asientos, x = [], u0
    for a, b in corte:
        if a > x:
            asientos.append((x, a))
        x = b
    if x < u1:
        asientos.append((x, u1))
    for i in range(n):
        va, vb = v0 + i * hu, v0 + (i + 1) * hu
        for a, b in asientos:
            losa(S[ks], L[ks], caja2d(a, va, b, vb), z0, z0 + (i + 1) * h)
        for a, b in corte:
            for j in range(3):
                losa(S[ks], L[ks], caja2d(a, va + j * hu / 3, b, va + (j + 1) * hu / 3), z0, z0 + i * h + (j + 1) * h / 3)
    for a, b in corte:
        for x in (a + 0.05, b - 0.05):
            L['baranda'].append(((x, v0, z0 + 0.9), (x, v0 + n * hu, z1 + 0.9)))
    return caja2d(u0, v0, u1, v0 + n * hu)


def arco_pts(r, th0, th1, paso):
    """Puntos del arco del aro de radio r de th0 a th1 (rad), cada `paso` m de cuerda."""
    d = 2 * math.asin(paso / 2 / r)
    n = int((th1 - th0) / d)
    return [(ARO[0] + r * math.cos(th0 + k * d), ARO[1] + r * math.sin(th0 + k * d)) for k in range(n + 1)]


def radial(p, q):
    """Hacia afuera del aro (hacia la nave) en el punto medio de p→q."""
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    d = math.hypot(mx - ARO[0], my - ARO[1])
    return ((mx - ARO[0]) / d, (my - ARO[1]) / d)


def mercado_norte_plano(m, capas):
    """Nave norte (2026-10-12, «barrio»): piso +0.40 con el jardín bajo el hoyo; P1 (+4.28, 12 m al oeste, dos pisos: abajo
    locales que dan afuera), P2 (+2.40 al norte: la terraza de las fondas, con una gradería que baja al jardín) y P3
    (+4.28, a lo largo del vidrio); baños en el resto que no corta el aro (SE); elevador a los tres niveles; manzanas
    cortas en aparejo (ver Barrio)."""
    viv = [c for c in json.load(open(COLS_VIVIENDA)) if c['z0'] < 1 and adentro(c['u'], c['v'], 0)]
    rng = random.Random(7)
    arboles = []
    tan = math.tan(math.radians(LLUVIA_ANG))
    disco = Point(ARO).buffer(CORTE, 256)
    disco_m = Point(ARO).buffer(R_VID, 256)
    interior = caja2d(*ZANJA).difference(disco_m)
    hoyo = unary_union([caja2d(*q) for q in franjas_hoyo()])
    alcance = lambda z: hoyo.buffer((Z_LLUVIA - z) * tan, join_style='mitre')
    margen = 0.6
    while True:
        jardin = alcance(Z_AGUA).buffer(margen, join_style='mitre').intersection(interior)
        if jardin.area <= JARDIN_MAX or margen <= 0:
            break
        margen = max(0.0, margen - 0.05)
    S = {k: [] for k in ('piso', 'resto', 'zanja', 'jardin', 'agua', 'plataforma', 'escalera', 'local', 'mesa', 'banca', 'humedal', 'agua_p', 'arriate')}
    L = {k: [] for k in ('piso', 'agua', 'plataforma', 'lamina', 'local', 'mesa', 'escalera', 'baranda', 'junco', 'pasto', 'banca', 'humedal', 'arriate')}
    piso = unary_union([caja2d(*ZANJA), caja2d(ZANJA_EXT[0], ZANJA_EXT[3], ZANJA_EXT[2], CAJA_N[3])]).difference(disco).difference(jardin)
    losa(S['piso'], L['piso'], piso, NIVEL(0), PISO)
    for p in poligonos(caja2d(*CAJA_N).intersection(disco)):
        S['resto'] += tri_poligono(p, NIVEL(0))
    S['zanja'] = zanja_rhino(m, capas)
    for p in poligonos(jardin):
        for anillo in [p.exterior] + list(p.interiors):
            c = list(anillo.coords)
            for a, b in zip(c, c[1:]):
                S['jardin'] += [((a[0], a[1], Z_JARDIN), (b[0], b[1], Z_JARDIN), (b[0], b[1], PISO)),
                                ((a[0], a[1], Z_JARDIN), (b[0], b[1], PISO), (a[0], a[1], PISO))]
                barandal(L['baranda'], a, b, PISO)
        S['agua'] += tri_poligono(p, Z_AGUA)
    u0n, v0n, u1n, v1n = ZANJA
    W, F = CELDA
    hu = ESC['huella']
    # ---- plataformas ----
    x12 = u0n + P1_ANCHO
    P1 = interior.intersection(caja2d(u0n, v0n, x12, v1n))
    p2v0 = jardin.bounds[3] + 1.2          # (un paso de 1.20 entre el barandal del jardín y el primer escalón de la gradería)
    # (2026-10-12) ACCESO PRINCIPAL desde la Av. Eulalia Guzmán: la «calle de las plantas», de 3.60, entre P1 (con sus locales y
    # su balcón arriba) y la cara de la P2 (con plantas que cuelgan); la cruzan por arriba la escalera P2 → P1 y el puente del
    # elevador, y remata en el jardín bajo el hoyo y, más allá, en los pasos al patio del aro (calle → jardín → aro). Por eso
    # la P2 empieza 2 m al este de P1.
    p2u0 = x12 + 2.0
    P2 = caja2d(p2u0, p2v0, u1n, v1n).intersection(interior)
    P3 = Point(ARO).buffer(R_VID + P3_ANCHO, 256).difference(disco_m).intersection(interior).intersection(caja2d(x12, v0n, u1n, v1n))
    PA = unary_union([P1, P3])
    # ---- baños de esta nave (la sur tiene los suyos): en el resto que el aro no corta (SE), contra el muro este ----
    occ = interior.difference(jardin).area / 3.0 + (PA.area + P2.area) / 5.6
    req, dis, med = banos_ntc(occ)
    banos_g = bloque_banos(S, L, u1n, v0n + 0.3, med, PISO)
    print('baños nave norte', json.dumps({'ocupantes': round(occ), 'NTC': req, 'proyecto': dis, 'medidas': med}, ensure_ascii=False))
    # ---- P2: la gradería del jardín (Metropol Parasol, Tepoztlán: el desnivel se vuelve lugar): cinco gradas de 0.40 × 0.80
    # que bajan de la P2 al paso junto al jardín, mirando al agua y al hoyo; tres pasos con escalones de 0.13 × 0.27 ----
    gu0 = p2u0
    pasos_g = [(gu0, gu0 + 1.2), (547.4, 548.6), (u1n - 1.2, u1n)]
    grad = graderia(S, L, 'plataforma', gu0, u1n, p2v0, 5, PISO, Z_P2, pasos_g)
    P2f = P2.difference(grad)
    losa(S['plataforma'], L['plataforma'], P2f, PISO, Z_P2)
    rayas(L['lamina'], P2f, Z_P2 + 0.005, 0.4)
    losa(S['plataforma'], L['plataforma'], PA, Z_P1 - LOSA_P, Z_P1)
    rayas(L['lamina'], PA, Z_P1 + 0.005, 0.4)
    # ---- escalera P2 → P1 (sube al oeste, llega a la orilla de P1) y elevador a los tres niveles (PB, P2, P1) ----
    vc = grad.bounds[3] + 1.3
    n12 = math.ceil((Z_P1 - Z_P2) / 0.18 - 1e-9)
    e12, l12, _ = escalera_recta(S, L, x12 + hu * (n12 - 1), vc, (-1, 0), ESC['ancho'], Z_P2, Z_P1, hu, grueso=0.22)   # volada sobre la calle: debajo quedan ≥ 2.30
    # elevador en la esquina NO de la P2, junto a la puerta: abre a la calle (PB), a la P2 (+2.40) y, por un puente sobre la
    # calle, a P1 (+4.28)
    asc_n = caja2d(p2u0, v1n - 2.4, p2u0 + 2.2, v1n - 0.2)
    caja(S['local'], L['local'], *asc_n.bounds[:2], PISO, *asc_n.bounds[2:], Z_P1 + 2.8)
    puente = caja2d(x12, asc_n.bounds[1], p2u0, asc_n.bounds[3])
    PA = unary_union([PA, puente])
    losa(S['plataforma'], L['plataforma'], puente, Z_P1 - LOSA_P, Z_P1)
    # la puerta en el muro norte y su puente sobre el canal perimetral
    pn0, pn1 = PUERTA_NORTE
    losa(S['plataforma'], L['plataforma'], caja2d(pn0, v1n - 0.05, pn1, ZANJA_EXT[3] + 0.05), PISO - 0.12, PISO)
    muros = interior.exterior.buffer(0.08)
    m_bar = barandal_bordes(L, PA, Z_P1, unary_union([muros, l12.buffer(0.08), asc_n.exterior.buffer(0.08)]))
    tope_g = LineString([(gu0, grad.bounds[3]), (u1n, grad.bounds[3])]).buffer(0.08)
    m_bar += barandal_bordes(L, P2f, Z_P2, unary_union([muros, tope_g, asc_n.exterior.buffer(0.08)]))
    # ---- columnas de P1 (espina de los locales de borde y orilla, a cada línea de postes) y de P3 (espina y orilla) ----
    cols_p = []
    for u in (u0n + F, x12):
        for v in V_POSTES:
            q = Point(u, v)
            if P1.buffer(0.05).contains(q) and not P2.buffer(0.3).contains(q) and not asc_n.buffer(0.3).contains(q):
                cols_p.append((u, v))
    dth = 2 * math.asin(W / 2 / R_VID)
    du = x12 - ARO[0]
    th0 = math.atan2(math.sqrt(R_VID ** 2 - du ** 2), du)
    for r_ in (R_VID + F, R_VID + P3_ANCHO):
        k = 0
        while th0 - k * dth > 0:
            th = th0 - k * dth
            q = (ARO[0] + r_ * math.cos(th), ARO[1] + r_ * math.sin(th))
            if P3.buffer(0.05).contains(Point(q)) and not P1.buffer(0.3).contains(Point(q)) and not banos_g.buffer(0.3).contains(Point(q)):
                cols_p.append(q)
            k += 3
    for u, v in cols_p:
        caja(S['plataforma'], L['plataforma'], u - 0.15, v - 0.15, PISO, u + 0.15, v + 0.15, Z_P1 - LOSA_P)
    cols_v = [(c['u'], c['v']) for c in viv]
    cols = cols_v + list(COLUMNAS_ACERO) + cols_p
    # ---- PB: locales que dan afuera (bajo P1, contra el muro oeste) y al patio del aro (bajo P3, con un paso cada 5) ----
    zona_borde = interior.difference(banos_g.buffer(PASILLO))
    pts_o = [(u0n, v1n - W * k) for k in range(int((v1n - v0n) / W) + 1)]
    borde_o = isla_borde(S, L, pts_o, lambda p, q: (1.0, 0.0), zona_borde, interior, PISO)
    du = u0n + 2 * F + PASILLO - ARO[0]
    th0a = math.atan2(math.sqrt(R_VID ** 2 - du ** 2), du)
    pts_a = [(ARO[0] + R_VID * math.cos(th0a - k * dth), ARO[1] + R_VID * math.sin(th0a - k * dth)) for k in range(int(th0a / dth) + 1)]
    zona_a = zona_borde.difference(unary_union(borde_o).buffer(PASILLO)) if borde_o else zona_borde
    borde_a = isla_borde(S, L, pts_a, radial, zona_a, interior, PISO, cada=BOCA_CADA)
    # ---- PB: la fonda del jardín (racimo con barra centrado en la columna de la vivienda: queda en su núcleo) ----
    suelo = interior.difference(jardin)
    rac, rac_g = [], []
    for c in ((544.93, 449.0),):
        h_, g_ = racimo(S, L, c, PISO)
        rac += h_; rac_g.append(g_)
    plaza_e = caja2d(*PLAZA_SABINO_N)   # acceso Sabino (el panel de Gabriel levantado a +3.09 en el tramo del cierre del valle)
    duro = unary_union([jardin, banos_g, P2, asc_n] + borde_o + borde_a + rac_g)
    arrs = poner_arriates(S, L, 'arriate', 'pasto', [((553.6, 449.4), 2.0), ((537.8, 459.6), 1.8)], suelo.difference(duro.buffer(0.05)), PISO, arboles, rng)
    duro = unary_union([duro] + arrs)
    libre = suelo.difference(duro)
    # bajo P1: isla doble sobre la línea de columnas 531.755 (la columna en la espina), con pasajes a media crujía
    lejos = unary_union([Point(ARO).buffer(R_VID + 2 * F + 1.2, 256), duro.buffer(PASILLO), plaza_e])
    isla_p1 = manzanas(S, L, suelo.intersection(caja2d(u0n + 2 * F + 2.2, v0n, x12 - 1.55, v1n)).difference(lejos), libre, [EJES_U[1]], V_POSTES, PISO, cols=cols, eje=1)
    libre = libre.difference(unary_union(isla_p1)) if isla_p1 else libre
    # crujías del centro y este: manzanas en aparejo sobre las líneas de postes (entre la isla de P1 y el muro este)
    region = suelo.intersection(caja2d(x12 - 0.4, v0n, u1n, p2v0 - 1.2)).difference(lejos).difference(unary_union(isla_p1).buffer(PASILLO) if isla_p1 else Polygon())
    celdas = manzanas(S, L, region, libre, [v for v in V_POSTES if v < p2v0], EJES_U[1:], PISO, cols=cols, fase=1)
    n_pb = len(isla_p1) + len(celdas)
    # ---- P1 y P3 (+4.28): filas en u sobre las líneas de postes (las columnas de acero quedan en las espinas), balcón con
    # barra-mirador en la orilla de P1 (mira a la P2 y al mercado), paseo junto al vidrio en P3 (sigue la cinta) ----
    barras = []
    v_p3 = ARO[1] + math.sqrt((R_VID + P3_ANCHO) ** 2 - (x12 - ARO[0]) ** 2)   # (al sur de aquí P1 sigue en P3: no hay orilla)
    for a_, b_ in ((v_p3 + 0.5, vc - ESC['ancho'] / 2 - 0.3), (vc + ESC['ancho'] / 2 + 0.3, asc_n.bounds[1] - 0.3)):
        a, b = (x12 - 0.02, a_), (x12 - 0.02, b_)
        if b_ - a_ > 1.5 and PA.buffer(0.05).contains(tira(a, b, 0, 1.0, 0, (-1, 0)) or Polygon()):
            barras.append(barra_mirador(S, L, 'mesa', a, b, (-1, 0), Z_P1))
    pts_3 = arco_pts(R_VID + 2.4, 0.0, math.pi / 2, W)
    llega = unary_union([l12.buffer(2.0), puente.buffer(1.6)])
    borde_3 = isla_borde(S, L, pts_3, radial, PA.difference(llega), PA, Z_P1, cada=BOCA_CADA)
    duro_pa = unary_union(barras + borde_3 + [llega])
    libre_pa = PA.difference(duro_pa)
    region_pa = P1.difference(unary_union([Point(ARO).buffer(R_VID + 2.4 + 2 * F + 1.2, 256), duro_pa.buffer(PASILLO), caja2d(x12 - 1.0 - PASILLO, v0n, x12, v1n)]))
    celdas_pa = manzanas(S, L, region_pa, libre_pa, V_POSTES, [u0n, EJES_U[1]], Z_P1, cols=cols, fase=0)
    # ---- P2 (+2.40): la terraza de las fondas: dos racimos centrados en columnas de acero, filas contra los muros norte y
    # este, arriates bajo los tragaluces y una jardinera corrida en la orilla oeste (las plantas se asoman al desnivel) ----
    rac2, rac2_g = [], []
    for c in ((EJES_U[2], V_POSTES[9]), (EJES_U[3], V_POSTES[9])):
        h_, g_ = racimo(S, L, c, Z_P2)
        rac2 += h_; rac2_g.append(g_)
    duro2 = unary_union(rac2_g + [e12.buffer(0.6), asc_n])
    arrs2 = []   # (no caben con 1.10 alrededor: el verde de la P2 es la jardinera de la orilla y el jardín de enfrente)
    duro2 = unary_union([duro2] + arrs2)
    libre2 = P2f.difference(duro2)
    lejos2 = duro2.buffer(PASILLO)
    filas2 = manzanas(S, L, P2f.intersection(caja2d(asc_n.bounds[2] + 0.2, v1n - F - 0.01, u1n, v1n)).difference(lejos2), libre2, [v1n], [], Z_P2, cols=cols, lados=(-1,), pasajes=False)
    libre2 = libre2.difference(unary_union(filas2)) if filas2 else libre2
    filas2 += manzanas(S, L, P2f.intersection(caja2d(u1n - F - 0.01, grad.bounds[3] + 1.2, u1n, v1n - F - PASILLO)).difference(lejos2), libre2, [u1n], [], Z_P2, cols=cols, lados=(-1,), eje=1, pasajes=False)
    for a_, b_ in ((grad.bounds[3] + 0.2, vc - ESC['ancho'] / 2 - 0.2), (vc + ESC['ancho'] / 2 + 0.2, asc_n.bounds[1] - 0.2)):
        if b_ - a_ > 1.0:   # jardinera de 0.45 en la orilla oeste de la P2: matas que cuelgan sobre la calle de abajo
            losa(S['arriate'], L['arriate'], caja2d(p2u0, a_, p2u0 + 0.45, b_), Z_P2, Z_P2 + 0.45)
            for _ in range(int((b_ - a_) * 5)):
                y = rng.uniform(a_, b_)
                L['pasto'].append(((p2u0 + 0.1, y, Z_P2 + 0.4), (p2u0 - rng.uniform(0.05, 0.25), y + rng.uniform(-0.1, 0.1), Z_P2 - rng.uniform(0.3, 1.2))))
    INFO['norte_pb'] = {'piso': suelo, 'celdas': celdas + isla_p1, 'filas': [], 'bordes': borde_o + borde_a, 'racimos': rac, 'arriates': arrs,
                        'plazas': [(plaza_e, 'sabino')], 'calles': [caja2d(x12 - 1.55, p2v0, p2u0, v1n)], 'escaleras': [asc_n], 'vacios': [],
                        'servicio': [banos_g, jardin], 'cuartos': [(banos_g, 'baños')], 'cols': cols_v + list(COLUMNAS_ACERO) + cols_p,
                        'plataformas': [(P2, 'P2 +2.40 (encima)')]}
    INFO['norte_alto'] = {'piso': unary_union([PA, P2f]), 'celdas': celdas_pa + filas2, 'filas': [], 'bordes': borde_3, 'racimos': rac2, 'arriates': arrs2,
                          'plazas': [], 'calles': [], 'escaleras': [e12, asc_n, grad, puente], 'vacios': [], 'servicio': [], 'barras': barras, 'cols': [],
                          'plataformas': [(P1, 'P1 +4.28'), (P2, 'P2 +2.40'), (P3, 'P3 +4.28')]}
    # árboles jóvenes y juncos en el jardín
    for p in poligonos(jardin.buffer(-0.6)):
        u0, v0, u1, v1 = p.bounds
        cand = [(x, y) for x in [u0 + 0.6 * i for i in range(int((u1 - u0) / 0.6) + 1)] for y in [v0 + 0.6 * j for j in range(int((v1 - v0) / 0.6) + 1)] if p.contains(Point(x, y))]
        rng.shuffle(cand)
        n_j = 0
        for x, y in cand:
            if n_j < 2 and all(math.hypot(x - a[0], y - a[1]) >= 3.0 for a in arboles):
                arboles.append((x, y, Z_AGUA, rng.uniform(2.5, 4.0)))
                n_j += 1
    for p in poligonos(jardin):
        u0, v0, u1, v1 = p.bounds
        k = 0
        while k < int(p.area * 1.2):
            x, y = rng.uniform(u0, u1), rng.uniform(v0, v1)
            if not p.contains(Point(x, y)):
                continue
            h = rng.uniform(0.5, 1.1)
            dx, dy = rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15)
            L['junco'] += [((x, y, Z_AGUA), (x + dx, y + dy, Z_AGUA + h)), ((x + dx * 0.7, y + dy * 0.7, Z_AGUA + h * 0.7), (x + dx, y + dy, Z_AGUA + h))]
            k += 1
    for g in borde_a[0::2]:   # los que abren al patio
        c = g.centroid
        MESITAS_TH.append(math.atan2(c.y - ARO[1], c.x - ARO[0]))
    if borde_a:
        ths = [math.atan2(g.centroid.y - ARO[1], g.centroid.x - ARO[0]) for g in borde_a]
        VIDRIO_VANOS.append((min(ths) - dth, max(ths) + dth, NIVEL(0) - 0.1, Z_P3 - LOSA_P))
    loc = {'PB_manzanas': len(celdas), 'PB_isla_bajo_P1': len(isla_p1), 'PB_hacia_afuera': len(borde_o), 'PB_al_patio': len(borde_a), 'PB_fonda_del_jardin': len(rac),
           'P1_P3_manzanas': len(celdas_pa), 'P3_junto_al_vidrio': len(borde_3), 'P2_racimos': len(rac2), 'P2_filas': len(filas2)}
    todos = celdas + isla_p1 + borde_o + borde_a + rac + celdas_pa + borde_3 + rac2 + filas2
    resumen = {'hoyo_m2': round(hoyo.area, 1), 'jardin_m2': round(jardin.area, 1), 'plataformas_m2': round(PA.area + P2.area, 1),
               'plataformas': {'P1_m2': round(P1.area, 1), 'P2_m2': round(P2.area, 1), 'P3_m2': round(P3.area, 1), 'graderia_m2': round(grad.area, 1), 'z': [Z_P1, Z_P2, Z_P3]},
               'puestos': len(todos), 'locales': loc, 'm2_locales': round(sum(g.area for g in todos)), 'mesas': 0, 'arboles': len(arboles),
               'arriates': len(arrs) + len(arrs2), 'barra_mirador_m': round(sum(b.length / 2 - 1.0 for b in barras)),
               'ocupantes': round(occ), 'ancho_salidas_m': round(occ * 0.005, 2), 'patios': None,
               'banos': {'NTC': req, 'proyecto': dis, 'medidas': med}, 'barandal_m': round(m_bar, 1), 'columnas_plataformas': len(cols_p)}
    print('nave norte', json.dumps(resumen, ensure_ascii=False))
    return S, L, arboles, resumen


# ---- Accesos (2026-10-12): puertas en los muros de Rhino ----
# Gabriel abre los accesos levantando el panel del muro (en Rhino, el acceso este de la nave norte a +3.09): aquí se hace
# igual, quitando el muro de la caja (u0, v0, z0, u1, v1, z1) hasta +3.20 del visor. La nave sur no tiene muros sur ni
# oeste en Rhino (Clavel y el pasaje de la vitrina quedan abiertos).
PUERTA_NORTE = (534.0, 537.2)                     # u: la calle de las plantas, en el muro norte (Av. Eulalia Guzmán)
PLAZA_SABINO_N = (549.6, 445.4, 557.745, 453.5)   # nave norte: la plazuela del acceso Sabino (cierre del valle)
PUERTAS_MURO = [(PUERTA_NORTE[0], 487.4, -1.0, PUERTA_NORTE[1], 489.0, 3.2),   # norte · Eulalia Guzmán
                (557.6, 358.25, -1.0, 559.6, 361.55, 3.2),                      # sur · Sabino (en el eje del vacío)
                (552.4, 395.6, -1.0, 557.4, 397.4, 3.2)]                        # sur · Heliotropo
# (nombre, punto en la puerta, hacia adentro, nivel) para la planta
ACCESOS = [('Av. Eulalia Guzmán', (535.6, 488.6), (0, -1), 'pb'), ('Sabino', (559.6, 452.9), (-1, 0), 'pb'),
           ('Sabino', (559.6, 359.9), (-1, 0), 'pb'), ('Heliotropo', (554.9, 397.2), (0, -1), 'pb'),
           ('Clavel', (506.4, 322.8), (0, 1), 'pb'), ('carga', (559.6, 330.6), (-1, 0), 'pb'),
           ('patio del aro', (534.2, 380.6), (0.55, -0.83), 'pb'), ('patio del aro', (533.0, 446.4), (0.6, 0.8), 'pb'),
           ('cinta +4.28', (546.9, 392.4), (0.5, -0.86), 'alto'), ('cinta +4.28', (549.6, 423.6), (0.3, 0.95), 'alto')]


def _corta(pol, eje, val, s):
    """La parte del polígono convexo pol (puntos 3D) donde s·(p[eje] − val) ≥ 0."""
    out, n = [], len(pol)
    for i in range(n):
        a, b = pol[i], pol[(i + 1) % n]
        da, db = s * (a[eje] - val), s * (b[eje] - val)
        if da >= 0:
            out.append(a)
        if (da >= 0) != (db >= 0):
            t = da / (da - db)
            out.append(tuple(a[j] + (b[j] - a[j]) * t for j in range(3)))
    return out if len(out) >= 3 else []


def fuera_de_caja3(pol, q):
    """Las partes de pol (convexo, 3D) fuera de la caja q = (u0, v0, z0, u1, v1, z1)."""
    if any(max(p[k] for p in pol) <= q[k] or min(p[k] for p in pol) >= q[k + 3] for k in range(3)):
        return [pol]
    out, resto = [], pol
    for k in range(3):
        for val, s in ((q[k], -1), (q[k + 3], 1)):
            f = _corta(resto, k, val, s)
            if f:
                out.append(f)
            resto = _corta(resto, k, val, -s)
            if not resto:
                return out
    return out


def segmento_fuera_caja3(a, b, q):
    t0, t1, d = 0.0, 1.0, [b[k] - a[k] for k in range(3)]
    for k in range(3):
        for p_, s_ in ((-d[k], a[k] - q[k]), (d[k], q[k + 3] - a[k])):
            if abs(p_) < 1e-12:
                if s_ <= 0:
                    return [(a, b)]
            elif p_ < 0:
                t0 = max(t0, s_ / p_)
            else:
                t1 = min(t1, s_ / p_)
    if t0 >= t1:
        return [(a, b)]
    P = lambda t: tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
    return ([(a, P(t0))] if t0 > 1e-9 else []) + ([(P(t1), b)] if t1 < 1 - 1e-9 else [])


# Tragaluces (2026-10-12, Gabriel: «los tragaluces están súper»): dos nubes de franjas de vidrio con el lenguaje del hoyo
# (franjas de ¼ de tramo paralelas a la cumbrera, largos y corrimientos sin simetría) sobre las fondas de la P2, en la
# crujía este (donde la vivienda no tapa el cielo), una a cada lado de la cumbrera E y ninguna sobre el valle. Llevan
# vidrio: la lluvia no cae en las plataformas (regla de Gabriel); el hoyo del jardín sigue abierto.
TRAGALUCES = [{'u0': 541.6, 'v': 475.14, 'ritmo': [2.2, 3.6, 2.8], 'corrido': [0.5, -0.2, 0.3]},
              {'u0': 550.1, 'v': 475.14, 'ritmo': [3.0, 2.4, 3.4], 'corrido': [-0.3, 0.4, 0.0]}]


def franjas_tragaluz():
    w = TRAMO / 4
    return [(t['u0'] + i * w, t['v'] + dv - l / 2, t['u0'] + (i + 1) * w, t['v'] + dv + l / 2)
            for t in TRAGALUCES for i, (l, dv) in enumerate(zip(t['ritmo'], t['corrido']))]


def vidrio_tragaluces(techo):
    """El vidrio de cada franja de tragaluz, sobre la cara de arriba de la cubierta (un faldón: plano), con su marco."""
    tris, lins = [], []

    def z_arriba(u, v):
        zs = []
        for t in techo:
            (x1, y1, z1), (x2, y2, z2), (x3, y3, z3) = t
            den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
            if abs(den) < 1e-12:
                continue
            l1 = ((y2 - y3) * (u - x3) + (x3 - x2) * (v - y3)) / den
            l2 = ((y3 - y1) * (u - x3) + (x1 - x3) * (v - y3)) / den
            if min(l1, l2, 1 - l1 - l2) >= -1e-6:
                zs.append(l1 * z1 + l2 * z2 + (1 - l1 - l2) * z3)
        return max(zs) if zs else None
    for u0, v0, u1, v1 in franjas_tragaluz():
        # (la franja ya no tiene cubierta: la altura se toma justo afuera, del mismo faldón)
        P = []
        for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1)):
            z = None
            for d in (0.05, 0.3, 0.8, 1.5):
                z = z_arriba(u, v - d if v == v0 else v + d)
                if z is not None:
                    break
            P.append((u, v, (z or 9.0) + 0.04))
        tris += [(P[0], P[1], P[2]), (P[0], P[2], P[3])]
        lins += [(P[i], P[(i + 1) % 4]) for i in range(4)]
        um = (u0 + u1) / 2
        lins.append(((um, v0, (P[0][2] + P[1][2]) / 2 + 0.01), (um, v1, (P[3][2] + P[2][2]) / 2 + 0.01)))
    return tris, lins


def planta_plano_png():
    """Plantas rotuladas del mercado (2026-10-12): la PB de las dos naves y lo alto (PA sur +4.28; P1 y P3 +4.28, P2 +2.40
    en la norte). analisis/mercado/planta_mercado_plano.png"""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon as Pol, Circle, Rectangle, Patch
    fig, axs = plt.subplots(1, 2, figsize=(15, 21))
    fig.patch.set_facecolor('#111')

    def pinta(ax, g, **kw):
        for p in poligonos(g):
            ax.add_patch(Pol(list(p.exterior.coords), closed=True, **kw))
            for h in p.interiors:
                ax.add_patch(Pol(list(h.coords), closed=True, fc='#111', ec=kw.get('ec', 'none'), lw=kw.get('lw', 0.3)))
    paneles = ((axs[0], ('sur_pb', 'norte_pb'), 'Planta baja (+0.40)'),
               (axs[1], ('sur_pa', 'norte_alto'), 'Arriba: PA sur +4.28 · norte P1 y P3 +4.28, P2 +2.40'))
    for ax, claves, titulo in paneles:
        ax.set_facecolor('#111')
        Pt = INFO.get('_patios')
        if Pt and ax is axs[0]:
            for g in Pt['pat']:
                pinta(ax, g, fc='#3a2a22', ec='none')
            for r_ in (PATIO['circ1'][0], PATIO['mesas'][0], PATIO['circ2'][0]):
                ax.add_patch(Circle(ARO, r_, fc='none', ec='#777', lw=0.4, ls=':'))
            for g in Pt['hums']:
                pinta(ax, g, fc='#2f7f4f', ec='w', lw=0.5)
            for g in Pt['mesitas']:
                pinta(ax, g, fc='#ffd27f', ec='none')
            for g in Pt['bancas']:
                pinta(ax, g, fc='#ff6bd0', ec='none')
        n_tot = 0
        for nombre in claves:
            I = INFO.get(nombre)
            if not I:
                continue
            pinta(ax, I['piso'], fc='#2a2a2a', ec='none')
            for g in I.get('servicio', []):
                pinta(ax, g, fc='#7a2a2a', ec='none', alpha=0.5)
            for g, nom in I.get('plazas', []):
                pinta(ax, g, fc='#5a4a2a', ec='none', alpha=0.9)
                if not g.is_empty:
                    q = g.representative_point()
                    ax.text(q.x, q.y, nom, color='#ffcc88', fontsize=7, ha='center', style='italic')
            for g in I.get('calles', []):
                pinta(ax, g, fc='#4a4a4a', ec='none')
            for g in I.get('vacios', []):
                pinta(ax, g, fc='#0b0b0b', ec='#ffcc33', lw=0.8, ls='--')
            for k, col in (('celdas', '#8a98ff'), ('filas', '#a7b2ff'), ('bordes', '#7fd0ff'), ('racimos', '#ff9f6b')):
                for g in I.get(k, []):
                    pinta(ax, g, fc=col, ec='w', lw=0.25)
            for g in I.get('barras', []):
                pinta(ax, g, fc='#ffd27f', ec='none')
            for g in I.get('arriates', []):
                pinta(ax, g, fc='#3f9f5f', ec='w', lw=0.4)
            for g in I.get('escaleras', []):
                pinta(ax, g, fc='#ddd', ec='k', lw=0.3)
            for g, nom in I.get('cuartos', []):
                pinta(ax, g, fc='#4a4a4a', ec='#bbb', lw=0.4)
                q = g.centroid
                ax.text(q.x, q.y, nom, color='#eee', fontsize=4.5, ha='center', va='center', rotation=90 if g.bounds[2] - g.bounds[0] < g.bounds[3] - g.bounds[1] - 1 else 0)
            for g, nom in I.get('plataformas', []):
                pinta(ax, g, fc='none', ec='#ffcc33', lw=1.0)
                q = g.representative_point()
                ax.text(q.x, q.y, nom, color='#ffcc33', fontsize=8, ha='center')
            for u, v in I.get('cols', []):
                ax.add_patch(Rectangle((u - 0.18, v - 0.18), 0.36, 0.36, fc='m', ec='none'))
            n = sum(len(I.get(k, [])) for k in ('celdas', 'filas', 'bordes', 'racimos'))
            n_tot += n
            ax.text(I['piso'].centroid.x, I['piso'].bounds[3] + 1.5, '%s: %d locales' % (nombre.replace('_', ' '), n), color='w', ha='center', fontsize=9)
        for q in (franjas_tragaluz() if ax is axs[1] else []) + [list(x) for x in franjas_hoyo()]:
            ax.add_patch(Rectangle((q[0], q[1]), q[2] - q[0], q[3] - q[1], fc='none', ec='#9fe8ff', lw=0.6, ls=':'))
        for nom, (u, v), (du, dv), niv in ACCESOS:   # los accesos: flecha hacia adentro
            if (niv == 'pb') != (ax is axs[0]):
                continue
            ax.annotate('', xy=(u + du * 3.2, v + dv * 3.2), xytext=(u - du * 0.8, v - dv * 0.8), arrowprops=dict(arrowstyle='-|>', color='#ff8c1a', lw=2.2))
            ax.text(u - du * 1.8, v - dv * 1.8, nom, color='#ff8c1a', fontsize=7, ha='center', va='center', rotation=90 if abs(du) > abs(dv) else 0, fontweight='bold')
        ax.add_patch(Circle(ARO, CORTE, fc='none', ec='orange', ls='--'))
        ax.set_xlim(503, 562); ax.set_ylim(320, 492); ax.set_aspect('equal')
        ax.tick_params(colors='#888')
        ax.set_title('%s · %d locales' % (titulo, n_tot), color='w', fontsize=10)
    ley = [Patch(fc='#8a98ff', label='manzanas en aparejo'), Patch(fc='#a7b2ff', label='filas contra muro'), Patch(fc='#7fd0ff', label='borde del aro / vidrio'),
           Patch(fc='#ff9f6b', label='fondas con barra (racimos)'), Patch(fc='#ffd27f', label='barras-mirador y mesitas'), Patch(fc='#3f9f5f', label='arriates con árbol, humedales'),
           Patch(fc='#5a4a2a', label='plazuelas'), Patch(fc='#7a2a2a', label='servicio, vitrina, baños, jardín'), Patch(fc='none', ec='#9fe8ff', label='hoyo y tragaluces')]
    fig.legend(handles=ley, loc='lower center', ncol=5, facecolor='#111', labelcolor='w', fontsize=8, frameon=False)
    salida = os.path.join(os.path.dirname(RAIZ), 'analisis', 'mercado', 'planta_mercado_plano.png')
    fig.savefig(salida, dpi=90, facecolor='#111', bbox_inches='tight')
    print('planta', salida)


def main():
    m = r.File3dm.Read(FUENTE)
    if m is None:
        sys.exit('no se pudo leer ' + FUENTE)
    capas = {l.Index: l.FullPath for l in m.Layers}
    sal = {'perimetro': [], 'cubierta': [], 'pa': []}
    lin = {'perimetro': [], 'cubierta': [], 'pa': []}   # aristas (segmentos)
    cuenta = {'perimetro': 0, 'cubierta': 0, 'pa': 0}
    huellas = []   # cajas en planta de cada objeto (para la banqueta)
    techo = []     # triángulos originales de las cubiertas de la nave norte (alturas para la retícula)
    techo_s = []   # los de la nave sur (para la fachada al aro)
    franjas = franjas_hoyo()
    for o in m.Objects:
        lp = capas[o.Attributes.LayerIndex]
        papel = CAPAS.get(lp) or SUELTOS.get(str(o.Attributes.Id)[:8])
        if lp.endswith('::niveles'):
            papel = 'pa'   # la planta alta de la nave sur (los niveles de la norte van en el paso 3)
        if not papel:
            continue
        tris = malla_de(o.Geometry)
        if not tris:
            continue
        if papel == 'pa' and min(al_diagrama(p)[1] for t in tris for p in t) > HE_LIM[0]:
            continue
        cuenta[papel] += 1
        xs, ys = [], []
        T3 = [[al_diagrama(p) for p in t] for t in tris]
        # las cubiertas de la nave norte llevan el hoyo pixelado del jardín
        norte = papel == 'cubierta' and min(p[1] for t in T3 for p in t) > 405
        if norte:
            techo.extend(T3)
        elif papel == 'cubierta':
            techo_s.extend(T3)
            huellas.append((min(p[0] for t in T3 for p in t), min(p[1] for t in T3 for p in t), max(p[0] for t in T3 for p in t), max(p[1] for t in T3 for p in t)))
            continue   # (2026-10-12, Gabriel: la cubierta de la nave sur se quita; luego se genera. Sólo da alturas al vidrio)
        if papel == 'pa':
            continue   # (la PA de Rhino se reemplaza por la plataforma de mercado_sur)
        rects = (franjas + franjas_tragaluz()) if norte else []
        puertas = PUERTAS_MURO if papel == 'perimetro' else []
        cortes = []
        for T in T3:
            piezas = fuera_del_circulo(T, cortes)
            for q in rects:
                piezas = [x for pz in piezas for x in fuera_de_rect(pz, q, cortes)]
            for q in puertas:
                piezas = [x for pz in piezas for x in fuera_de_caja3(pz, q)]
            for pol in piezas:
                for i in range(1, len(pol) - 1):
                    for p in (pol[0], pol[i], pol[i + 1]):
                        sal[papel].extend(round(c, 3) for c in p)
                        xs.append(p[0]); ys.append(p[1])
        for a, b in aristas(T3):
            segs = segmento_fuera(a, b)
            for q in rects:
                segs = [x for s in segs for x in segmento_fuera_rect(s[0], s[1], q)]
            for q in puertas:
                segs = [x for s in segs for x in segmento_fuera_caja3(s[0], s[1], q)]
            for s in segs:
                lin[papel].extend(round(c, 3) for p in s for c in p)
        for a, b in cortes:
            # un corte entre dos franjas abiertas es costura, no borde: se parte en los
            # extremos de las franjas y se deja sólo lo que tiene cubierta de un lado
            for s in costuras_fuera(a, b, rects):
                lin[papel].extend(round(c, 3) for p in s for c in p)
        if xs and papel != 'pa':
            huellas.append((min(xs), min(ys), max(xs), max(ys)))
    for q in PUERTAS_MURO:   # el marco de cada puerta (jambas y dintel, al centro del muro)
        u0, v0, z0_, u1, v1, z1 = q
        if u1 - u0 >= v1 - v0:   # muro a lo largo de u
            a, b = (u0, (v0 + v1) / 2), (u1, (v0 + v1) / 2)
        else:
            a, b = ((u0 + u1) / 2, v0), ((u0 + u1) / 2, v1)
        for (x, y) in (a, b):
            lin['perimetro'].extend(round(c, 3) for c in (x, y, 0.2, x, y, z1))
        lin['perimetro'].extend(round(c, 3) for c in (a[0], a[1], z1, b[0], b[1], z1))
    acero_t, acero_l, cie_t, cie_l, viv_t, viv_l = reticula(techo)
    tra_t, tra_l = vidrio_tragaluces(techo)
    canalon(cie_t, cie_l)
    sal['cubierta'].extend(plano(cie_t))
    lin['cubierta'].extend(plano(cie_l))
    S3, L3, arboles, resumen = mercado_norte_plano(m, capas)
    sur, arb_s, resumen['sur'] = mercado_sur()
    resumen['patios'] = patios_aro(S3, L3, arboles)   # (después de las dos naves: las mesitas siguen a sus locales)
    print('paso 3', json.dumps({k: v for k, v in resumen.items() if k != 'sur'}, ensure_ascii=False))
    cin_t, cin_l, cinta = cinta_aro()
    vid_t, vid_l, vid_r = vidrio_aro([techo, techo_s])
    print('fachada al aro (vidrio)', len(vid_t), 'triángulos', len(vid_l), 'marcos', '· vanos', len(VIDRIO_VANOS))
    planta_plano_png()
    disco_c = Point(ARO).buffer(CORTE, 256)
    comercio = {'vivienda_junto_al_aro (18 módulos × 22)': 396, 'norte_PB': round(caja2d(*NAVES_P[0]).difference(disco_c).area), 'sur_PB': round(caja2d(*NAVES_P[1]).difference(disco_c).area), 'sur_PA': round(resumen['sur']['pa_m2']), 'norte_plataformas': round(resumen['plataformas_m2'])}
    comercio['TOTAL'] = sum(comercio.values()); comercio['falta_para_7500'] = 7500 - comercio['TOTAL']
    resumen['comercio_m2'] = comercio
    print('comercio', json.dumps(comercio, ensure_ascii=False))
    arboles = list(arboles) + arb_s
    cinta.update({'tris': plano(cin_t), 'lineas': plano(cin_l)})
    # huella de cada nave: la caja de todo lo copiado al norte y al sur de Heliotropo
    naves = []
    for cond in (lambda h: h[1] > 405, lambda h: h[3] < 405):
        hs = [h for h in huellas if cond(h)]
        if hs:
            naves.append([round(min(h[0] for h in hs), 3), round(min(h[1] for h in hs), 3),
                          round(max(h[2] for h in hs), 3), round(max(h[3] for h in hs), 3)])
    datos = {'fuente': 'Rhino/Contexto.3dm', 'dz': DZ, 'naves': naves,
             'perimetro': sal['perimetro'], 'cubierta': sal['cubierta'],
             'perimetroL': lin['perimetro'], 'cubiertaL': lin['cubierta'],
             'acero': plano(acero_t), 'aceroL': plano(acero_l),
             'vivienda': plano(viv_t), 'viviendaL': plano(viv_l),
             # la cara curva del corte del aro: vidrio por ahora (marco y reflejo, líneas)
             'vidrio': plano(vid_t), 'vidrioL': plano(vid_l), 'vidrioR': plano(vid_r),
             # la planta alta de la nave sur (Rhino, capa niveles) y la cinta que se desprende del aro
             'pa': sal['pa'], 'paL': lin['pa'], 'cinta': cinta,
             # nave sur (mercado_sur): PB de carga, biodigestor y acuaponia; PA con puestos, comedores y baños
             'sur': sur,
             # tragaluces de la nave norte (vidrio sobre la cubierta, en el lenguaje del hoyo)
             'tragaluz': plano(tra_t), 'tragaluzL': plano(tra_l),
             'hoyo': {'c': [round(x, 3) for x in HOYO['c']], 'D': round(HOYO['D'], 3), 'franjas': [[round(x, 3) for x in q] for q in franjas]},
             'zanja': ZANJA, 'cierres': [[round(a, 3), round(b, 3)] for a, b in CIERRES],
             # paso 3: piso, zanja, jardín, plataformas, locales…: triángulos (k) y líneas (kL); árboles [u, v, z, alto]
             'paso3': {**{k: plano(v) for k, v in S3.items() if v}, **{k + 'L': plano(v) for k, v in L3.items() if v}},
             'arboles': [[round(x, 2) for x in a] for a in arboles], 'cajaN': CAJA_N, 'bancas_patio': BANCAS_P, 'resumen': resumen}
    js = ('/* Generado por herramientas/prepara-mercado.py desde Rhino/Contexto.3dm: no editar a mano.\n'
          '   Triángulos (u, v, z) del perímetro y las cubiertas del mercado (con el hoyo pixelado y los\n'
          '   cierres del valle), la retícula de acero propuesta y las columnas de la vivienda que la\n'
          '   cruzan; vidrio = la cara curva del corte del aro (vidrio por ahora; vidrioL marcos, vidrioR\n'
          '   reflejos); pa = la planta alta de la nave sur; cinta = la franja del aro que se desprende y baja\n'
          '   (th0…th1: donde el aro queda angosto; perfil [θ, z]); …L = sus aristas (segmentos) ya recortadas\n'
          '   por el aro; naves = huella [u0, v0, u1, v1]. */\n'
          'window.ATLAMPA_MERCADO = ' + json.dumps(datos, separators=(',', ':')) + ';\n')
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('objetos', cuenta, 'triángulos', {k: len(v) // 9 for k, v in sal.items()})
    print('huellas de nave', naves)
    print('escrito', SALIDA, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()

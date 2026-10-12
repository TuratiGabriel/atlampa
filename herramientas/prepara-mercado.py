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
HOYO['ritmo'] = [1.6, 3.4, 5.8, 7.4, 5.2, 6.6, 4.2, 2.6, 1.4]
HOYO['corrido'] = [1.1, 0.5, -0.5, 0.0, 0.9, -0.7, 0.3, 1.2, -0.3]
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
                tris.append(((p[0], p[1], z0), (q[0], q[1], z0), (q[0], q[1], q[2])))
                tris.append(((p[0], p[1], z0), (q[0], q[1], q[2]), (p[0], p[1], p[2])))
                marco.append(((p[0], p[1], z0), (q[0], q[1], z0)))
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
from shapely.ops import unary_union
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
GV = math.radians(-10)
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
JARDIN_MAX = 200.0   # m² de jardín inundable (Gabriel, 2026-10-12)
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
PATIO = {'senda': 2.5,          # libre desde el corte (r 47) hacia adentro: ≥ 1.20 de paso, y la cinta encima (r 44.55–46.55)
         'col': (38.9, 40.1),   # anillo de las columnas interiores del aro: sin bancas
         'arriate': 1.6,        # franja plantada junto a los bordes rectos (muros de la nave, Heliotropo)
         'm2_banca': 32.0,      # una banca cada tantos m² de patio libre
         'tezontle': 0.03}      # (2026-10-12, Gabriel: «área abierta permeable», ref. bancas de lámina de colores sobre tezontle)
HE_LIM_P = (401.0, 409.0)   # Heliotropo (v)
NAVES_P = [(522.181, 417.865, 558.945, 488.266), (504.601, 323.588, 558.946, 396.78)]
BANCAS_P = []   # [u, v, ángulo°, tipo] para los planos (planos-dwg.py)

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
    arriates junto a los bordes rectos y bancas «onda» sueltas, en grupos de dos o tres con ángulos distintos."""
    P_ = PATIO
    rng = random.Random(11)
    disco = Point(ARO).buffer(CORTE, 256)
    libre = Point(ARO).buffer(CORTE - P_['senda'], 256)
    cols = Point(ARO).buffer(P_['col'][1], 256).difference(Point(ARO).buffer(P_['col'][0], 256))
    calle = caja2d(400, HE_LIM_P[0], 700, HE_LIM_P[1])
    res = {'m2': 0.0, 'tezontle_m2': 0.0, 'arriates_m2': 0.0, 'bancas': 0, 'plazas_sentado': 0}
    bancas, n_arb = [], 0
    for nave in NAVES_P:
        for pat in poligonos(caja2d(*nave).intersection(disco).difference(calle)):
            res['m2'] += pat.area
            # arriates: la franja junto a los bordes rectos (no la curva del vidrio, que es senda)
            arr = pat.difference(pat.buffer(-P_['arriate'], join_style='mitre')).intersection(libre.buffer(-0.5))
            arr = unary_union([q for q in poligonos(arr) if q.area > 3])
            tez = pat.difference(arr)
            S['humedal'] += tri_poligono(tez, NIVEL(0) + P_['tezontle'])
            res['tezontle_m2'] += tez.area
            for q in poligonos(arr):
                res['arriates_m2'] += q.area
                losa(S['humedal'], L['humedal'], q.difference(q.buffer(-0.12)), NIVEL(0), NIVEL(0) + 0.15)   # guarnición
                u0, v0, u1, v1 = q.bounds
                for _ in range(int(q.area * 2.5)):   # pastos y matas
                    x, y = rng.uniform(u0, u1), rng.uniform(v0, v1)
                    if q.buffer(-0.15).contains(Point(x, y)):
                        h = rng.uniform(0.3, 1.0)
                        L['junco'].append(((x, y, NIVEL(0) + 0.1), (x + rng.uniform(-0.12, 0.12), y + rng.uniform(-0.12, 0.12), NIVEL(0) + 0.1 + h)))
                if n_arb < 8 and q.area > 12:
                    pt = q.representative_point()
                    arboles.append((pt.x, pt.y, NIVEL(0), rng.uniform(3.0, 4.5)))
                    n_arb += 1
            util = tez.intersection(libre).difference(cols).buffer(-0.5, join_style='mitre')
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
                            BANCAS_P.append([round(q[0], 3), round(q[1], 3), round(ang, 2), tipo])
                            res['plazas_sentado'] += 2 if tipo == 'doble' else 1
                            break
    res['bancas'] = len(bancas)
    res = {k: (round(v, 1) if isinstance(v, float) else v) for k, v in res.items()}
    senda = disco.difference(libre)   # la senda junto al vidrio queda libre
    assert not any(b.intersects(senda) for b in bancas), 'banca en la senda'
    return res


# ================= Nave sur (2026-10-12): la base del programa =================
# PB: carga y descarga en la esquina SE (los dos primeros tramos de postes desde el
# muro sur; el camión de 7.5 t entra en reversa por la fachada este), un andén de
# servicio a nivel medio (+1.20, la cama del camión), el biodigestor en la mitad
# oeste de lo que no es circulación vehicular, y acuaponia en todo lo demás.
# PA: UNA plataforma a +4.28 que nace donde llega la cinta del aro (esquina NE);
# los puestos calzan la estructura (filas espalda con espalda en las líneas de
# columnas de los valles, 2 puestos por tramo de postes); comedores y tarimas
# con macetas en las crujías E y O; baños sobre el biodigestor y, tras un muro
# ciego que reparte a izquierda y derecha, la escalera de servicio.
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
    'montacargas': (534.4, 334.2, 536.8, 336.6),
    'biodigestor': (517.0, 324.6, 527.2, 336.6),     # mitad oeste de lo no vehicular (hasta la escalera de servicio)
    'tubo': 1.5,                                     # Ø de los biodigestores tubulares (medio enterrados)
    'rampa': (537.4, 337.0, 539.8),                  # rampa de servicio del andén a la acuaponia (u0, v0, u1), al 8 %
    # PA
    'baños': (518.0, 324.6, 527.0, 336.6),
    'escalera': (527.6, 324.6, 530.4, 336.6),        # escalera de servicio (PB +0.40 → PA)
    'muro_ciego': (516.0, 338.2, 532.0, 338.4),      # de frente a la llegada: reparte a baños (izq.) y servicio (der.)
    'luz': (527.6, 345.2, 535.6, 383.0),             # vacío de luz sobre la acuaponia (con barandal)
    'puesto': (3.3, 2.0),                            # 2 por tramo de postes (6.6): ≥ 4 m², lado ≥ 2 (NTC)
    'cada': 4,                                       # cada 4 puestos, un paso transversal de 3.3
    'filas': (513.5, 522.6, 540.7, 549.5),           # líneas de columnas con filas de puestos espalda con espalda (la 531.5 da al vacío de luz)
    'tarimas': [((552.4, 352.0, 557.4, 358.6), 0.30), ((552.4, 365.2, 557.4, 371.8), 0.45), ((552.4, 378.4, 557.4, 385.0), 0.30),
                ((506.0, 341.0, 511.0, 347.6), 0.45), ((506.0, 352.0, 511.0, 358.6), 0.30)],
    'mesas_por_puesto': 1.5,                         # proporción: mesas por puesto de comida (≈ 2/3 de los puestos)
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


def mercado_sur():
    P_ = SUR
    rng = random.Random(5)
    S = {k: [] for k in ('piso', 'anden', 'bio', 'tanque', 'cama', 'agua', 'pa', 'local', 'mesa', 'muro', 'tarima', 'maceta', 'columna', 'escalera')}
    L = {k: [] for k in ('piso', 'anden', 'bio', 'tanque', 'cama', 'pa', 'local', 'mesa', 'muro', 'tarima', 'maceta', 'columna', 'escalera', 'baranda', 'planta', 'pasto')}
    arboles = []
    disco = Point(ARO).buffer(CORTE + 0.3, 256)
    nave = caja2d(*P_['int']).difference(disco)
    z0, za, zp, e = P_['piso'], P_['anden'], P_['pa'], P_['losa']
    # ---- PB ----
    losa(S['piso'], L['piso'], nave, NIVEL(0), z0)
    rayas(L['piso'], caja2d(*P_['vehiculo']), z0 + 0.005, 3.5, eje=1, desfase=P_['vehiculo'][1])   # el cajón de carga
    caja(S['anden'], L['anden'], *P_['anden_caja'][:2], z0, *P_['anden_caja'][2:], za)
    for k in range(4):   # escalones del andén al patio de servicio (peralte 0.20 → 4 de 0.20; huella 0.30)
        u = P_['anden_caja'][0] - 0.3 * (k + 1)
        caja(S['anden'], L['anden'], u, 324.6, z0, u + 0.3, 327.6, za - 0.2 * (k + 1))
    caja(S['anden'], L['anden'], *P_['montacargas'][:2], z0, *P_['montacargas'][2:], zp + 2.4)   # cubo del montacargas
    # rampa de servicio: del andén (+1.20) a la acuaponia (+0.40) al 8 %, con descanso a los 6 m
    u0r, v0r, u1r = P_['rampa']
    caida = za - z0
    t1 = min(6.0, caida / 0.08)
    v1 = v0r + t1; zm = za - t1 * 0.08
    v2 = v1 + 1.5; v3 = v2 + (zm - z0) / 0.08
    for (va, zA), (vb, zB) in (((v0r, za), (v1, zm)), ((v1, zm), (v2, zm)), ((v2, zm), (v3, z0))):
        Pp = [(u0r, va, zA - 0.15), (u1r, va, zA - 0.15), (u1r, vb, zB - 0.15), (u0r, vb, zB - 0.15), (u0r, va, zA), (u1r, va, zA), (u1r, vb, zB), (u0r, vb, zB)]
        prisma8(S['anden'], L['anden'], Pp)
        for u in (u0r, u1r):
            for h in (0.1, 0.5, BARANDAL):
                L['baranda'].append(((u, va, zA + h), (u, vb, zB + h)))
    rampa_huella = caja2d(u0r - 0.2, v0r, u1r + 0.2, v3 + 1.2)
    # biodigestor: tubos de geomembrana a lo largo de u, medio enterrados, y su gasómetro
    b0, b1 = P_['biodigestor'][1], P_['biodigestor'][3]
    n_t = int((b1 - b0) / (P_['tubo'] + 1.6))
    vs_t = [b0 + (b1 - b0) * (k + 0.5) / n_t for k in range(n_t)]
    for v in vs_t:
        tubo(S['bio'], L['bio'], (P_['biodigestor'][0] + 0.6, v, z0), (P_['biodigestor'][2] - 0.6, v, z0), P_['tubo'] / 2)
    vol_bio = n_t * math.pi * (P_['tubo'] / 2) ** 2 * (P_['biodigestor'][2] - P_['biodigestor'][0] - 1.2) * 0.75   # 3/4 líquido, 1/4 gas
    # acuaponia: lo que queda de la PB al norte de la carga, sin la rampa
    acu = nave.difference(caja2d(P_['int'][0], P_['int'][1], P_['int'][2], 337.6)).difference(rampa_huella)
    util = acu.buffer(-0.6, join_style='mitre')
    A_acu = acu.area
    A_cult_obj = A_acu * 0.75 / (1 + P_['tanques_frac'])   # 25 % circulación; tanques = 1/3 del cultivo
    # tanques de peces al sur (junto al servicio: alimento y cosecha), camas flotantes al norte; ambos a lo largo de v
    A_t = A_c = 0.0
    u = P_['int'][0] + 1.0
    camas, tanques = [], []
    while u + 1.2 < P_['int'][2] - 0.8:
        franja = util.intersection(caja2d(u, 337.6, u + 1.2, 400))
        for p in poligonos(franja):
            p0, q0, p1, q1 = p.bounds
            if q1 - q0 < 2:
                continue
            corte_t = q0 + 6.6   # el primer tramo de cada franja: tanque
            if A_t < A_cult_obj * P_['tanques_frac']:
                t = p.intersection(caja2d(p0, q0, p1, corte_t))
                tanques.append(t); A_t += t.area
                p = p.difference(caja2d(p0, q0, p1, corte_t + 0.9))
            for q in poligonos(p):
                camas.append(q); A_c += q.area
        u += 1.2 + 0.9
    for t in tanques:
        losa(S['tanque'], L['tanque'], t.difference(t.buffer(-0.08)), z0, z0 + 1.2)
        S['agua'] += tri_poligono(t.buffer(-0.08), z0 + 1.1) if t.buffer(-0.08).area > 0.1 else []
    for q in camas:
        losa(S['cama'], L['cama'], q.difference(q.buffer(-0.06)), z0, z0 + 0.6)
        S['agua'] += tri_poligono(q.buffer(-0.06), z0 + 0.5) if q.buffer(-0.06).area > 0.1 else []
        p0, q0, p1, q1 = q.bounds   # lechugas: un brote cada 0.45 (en el dibujo; la cuenta va con 20/m²)
        y = q0 + 0.25
        while y < q1 - 0.2:
            for x in (p0 + 0.3, p1 - 0.3):
                if q.contains(Point(x, y)):
                    L['planta'] += [((x, y, z0 + 0.5), (x - 0.12, y, z0 + 0.72)), ((x, y, z0 + 0.5), (x + 0.12, y, z0 + 0.72))]
            y += 0.45
    # ---- PA: una sola plataforma ----
    cinta_llega = Polygon([(ARO[0] + r_ * math.cos(math.radians(th)), ARO[1] + r_ * math.sin(math.radians(th)))
                           for r_, ths in ((ARO_RE - CINTA['ancho'], (-22.6, -18.6)), (CORTE + 0.6, (-18.6, -22.6))) for th in [ths[0] + (ths[1] - ths[0]) * k / 8 for k in range(9)]])
    vac_luz = caja2d(*P_['luz'])
    vac_esc = caja2d(*P_['escalera'])
    pa = nave.difference(caja2d(*P_['vehiculo']).buffer(0.01)).difference(vac_luz).difference(vac_esc).difference(caja2d(*P_['montacargas']))
    pa = unary_union([pa, cinta_llega.difference(Point(ARO).buffer(ARO_RE - CINTA['ancho'], 256))]).buffer(0)
    losa(S['pa'], L['pa'], pa, zp - e, zp)
    rayas(L['pa'], pa, zp + 0.005, 0.4)
    # columnas de la PA: en las líneas de valles y cumbreras, a cada línea de postes (no en la carga ni en los vacíos)
    n_col = 0
    for u in list(P_['valles']) + list(P_['cumbres']):
        for v in P_['postes'][1:-1]:
            q = Point(u, v)
            if pa.buffer(-0.3).contains(q) and not caja2d(*P_['vehiculo']).buffer(0.5).contains(q):
                caja(S['columna'], L['columna'], u - 0.15, v - 0.15, z0, u + 0.15, v + 0.15, zp - e)
                n_col += 1
    # barandal: lado largo (fachada este) y todo borde de la PA con vacío (> 0.30) que no sea muro ni vidrio
    muros_ext = caja2d(*P_['int']).exterior.buffer(0.05).union(disco.exterior.buffer(0.35))
    m_bar = 0.0
    for p in poligonos(pa):
        for anillo in [p.exterior] + list(p.interiors):
            c = list(anillo.coords)
            for a, b in zip(c, c[1:]):
                seg = LineString([a, b]).difference(muros_ext.difference(LineString([(P_['int'][2], 300), (P_['int'][2], 400)]).buffer(0.06)))
                for s in getattr(seg, 'geoms', [seg]):
                    if s.geom_type == 'LineString' and s.length > 0.2:
                        barandal(L['baranda'], s.coords[0], s.coords[-1], zp); m_bar += s.length
    # baños (H, M, locatarios), muro ciego y escalera de servicio
    bu0, bv0, bu1, bv1 = P_['baños']
    caja(S['local'], L['local'], bu0, bv0, zp, bu1, bv1, zp + 3.0)
    for k in (1, 2):
        L['local'].append(((bu0 + (bu1 - bu0) * k / 3, bv0, zp + 3.0), (bu0 + (bu1 - bu0) * k / 3, bv1, zp + 3.0)))
    for k in range(3):   # puertas al norte, detrás del muro ciego
        um = bu0 + (bu1 - bu0) * (k + 0.5) / 3
        L['local'] += [((um - 0.45, bv1 + 0.01, zp), (um - 0.45, bv1 + 0.01, zp + 2.1)), ((um + 0.45, bv1 + 0.01, zp), (um + 0.45, bv1 + 0.01, zp + 2.1)),
                       ((um - 0.45, bv1 + 0.01, zp + 2.1), (um + 0.45, bv1 + 0.01, zp + 2.1))]
    caja(S['muro'], L['muro'], P_['muro_ciego'][0], P_['muro_ciego'][1], zp, P_['muro_ciego'][2], P_['muro_ciego'][3], zp + 3.0)
    eu0, ev0, eu1, ev1 = P_['escalera']
    sube = zp - z0
    n_esc = math.ceil(sube / 0.18)
    h_esc = sube / n_esc
    huella = min(0.28, (ev1 - ev0 - 1.2) / n_esc)
    for k in range(n_esc):   # un solo tramo a lo largo de v, de sur a norte (peralte ≤ 0.18, huella ≥ 0.25)
        v = ev0 + k * huella
        caja(S['escalera'], L['escalera'], eu0, v, z0 + k * h_esc, eu1, v + huella, z0 + (k + 1) * h_esc)
    # puestos: filas espalda con espalda en las líneas de columnas (la columna queda en el muro de fondo)
    W_, F_ = P_['puesto']
    libre_pa = pa.buffer(-0.05)
    ocupa = [caja2d(*P_['baños']).buffer(1.2), caja2d(*P_['muro_ciego']).buffer(2.0), vac_esc.buffer(1.2), caja2d(*P_['montacargas']).buffer(1.5)]
    puestos_s = []
    for uc in P_['filas']:
        for lado in (-1, 1):
            k = 0
            v = 337.8 + 0.6
            while v + W_ <= P_['int'][3]:
                k += 1
                if k % (P_['cada'] + 1) == 0:   # paso transversal
                    v += W_; continue
                g = caja2d(min(uc, uc + lado * F_), v, max(uc, uc + lado * F_), v + W_)
                frente = LineString([(uc + lado * F_, v), (uc + lado * F_, v + W_)])
                if libre_pa.contains(g) and libre_pa.contains(frente.buffer(1.1, cap_style=2)) and not any(g.intersects(o) for o in ocupa):
                    puesto_geo(S, L, g, [frente], zp)
                    puestos_s.append(g)
                v += W_
    # tarimas (+0.30 / +0.45) con macetas en sus orillas y mesas encima; las mesas, también en el piso de las crujías E y O
    tarimas = []
    for (q, h) in P_['tarimas']:
        g = caja2d(*q)
        if not libre_pa.contains(g):
            continue
        tarimas.append((g, h))
        losa(S['tarima'], L['tarima'], g, zp, zp + h)
        n_e = round(h / 0.15)
        for i in range(1, n_e):   # escalones de 0.15 a lo largo del lado largo sur
            caja(S['tarima'], L['tarima'], q[0], q[1] - 0.3 * i, zp, q[2], q[1] - 0.3 * (i - 1), zp + h - 0.15 * i)
        for x in (q[0] + 0.4, q[2] - 0.4):   # dos macetas por tarima, en las esquinas norte
            caja(S['maceta'], L['maceta'], x - 0.4, q[3] - 0.8, zp + h, x + 0.4, q[3], zp + h + 0.6)
            arboles.append((x, q[3] - 0.4, zp + h + 0.6, rng.uniform(1.8, 2.6)))
            for _ in range(6):
                dx, dy = rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)
                L['pasto'].append(((x + dx, q[3] - 0.4 + dy, zp + h + 0.6), (x + dx * 1.3, q[3] - 0.4 + dy * 1.3, zp + h + 0.6 + rng.uniform(0.25, 0.5))))
    M_ = MESA
    largo, ancho, banca, entre, cab = M_['largo'], M_['ancho'], M_['banca'], M_['entre'], M_['cabecera']
    prof = ancho + 2 * banca
    estorba = unary_union(puestos_s + ocupa + [p.buffer(2.0) for p in puestos_s] + [Point(u, v).buffer(0.4) for u in list(P_['valles']) + list(P_['cumbres']) for v in P_['postes']])
    mesas_s = []
    base_m = pa.buffer(-0.9, join_style='mitre')
    for (g, h) in [(None, 0.0)] + tarimas:
        zona = (base_m.difference(unary_union([t.buffer(0.6) for t, _ in tarimas])) if g is None else g.buffer(-0.3).difference(caja2d(g.bounds[0], g.bounds[3] - 1.0, g.bounds[2], g.bounds[3])))
        u0, v0, u1, v1 = zona.bounds
        x = u0
        while x + largo <= u1:
            y = v0
            while y + prof <= v1:
                q = caja2d(x, y, x + largo, y + prof)
                if zona.contains(q) and not q.intersects(estorba) and not any(q.buffer(0.05).intersects(m[0]) for m in mesas_s):
                    mesas_s.append((q, zp + h, g is not None))
                    y += prof + entre
                else:
                    y += 0.5
            x += largo + cab
    # proporción: sólo las más cercanas a los puestos (las de las tarimas siempre), hasta mesas_por_puesto × los de comida
    cerca = unary_union(puestos_s)
    tope = round(P_['mesas_por_puesto'] * round(len(puestos_s) * 2 / 3))
    mesas_s.sort(key=lambda m: (not m[2], m[0].distance(cerca)))
    mesas_s = mesas_s[:tope]
    for q, zz, _ in mesas_s:
        x, y = q.bounds[0], q.bounds[1]
        caja(S['mesa'], L['mesa'], x, y + banca, zz + 0.70, x + largo, y + banca + ancho, zz + 0.75)
        for yy in (y, y + banca + ancho):
            caja(S['mesa'], L['mesa'], x + 0.05, yy + 0.05, zz + 0.40, x + largo - 0.05, yy + banca - 0.05, zz + 0.45)
        for xx in (x + 0.15, x + largo - 0.15):
            L['mesa'].append(((xx, y + banca + ancho / 2, zz), (xx, y + banca + ancho / 2, zz + 0.70)))
    # ---- cuentas ----
    lluvia = (caja2d(504.6, 323.6, 558.9, 396.8).difference(disco).area + caja2d(*CAJA_N).difference(disco).area) * P_['lluvia_m'] * P_['escurre']
    biomasa = A_t * P_['tanque_prof'] * P_['kg_m3']
    cult_lech = A_c * (1 - P_['otras_frac'])
    comida = round(len(puestos_s) * 2 / 3)
    org = (comida + 25) * P_['org_kg_puesto']   # + los ~25 de comida de la nave norte (supuesto)
    vol_req = org * P_['trh'] / 1000 * 1.25 * 4   # mezcla 1:3 con agua
    pb_util = nave.area - caja2d(*P_['vehiculo']).area
    res = {'carga_m2': round(caja2d(*P_['vehiculo']).area + caja2d(*P_['anden_caja']).area + caja2d(*P_['servicio']).area, 1),
           'biodigestor_m2': round(caja2d(*P_['biodigestor']).area, 1), 'biodigestor_m3': round(vol_bio, 1), 'biodigestor_m3_requerido': round(vol_req, 1),
           'tubos': n_t, 'acuaponia_m2': round(A_acu, 1), 'tanques_m2': round(A_t, 1), 'cultivo_m2': round(A_c, 1),
           'peces_kg_año': round(biomasa * P_['cosechas_peces']), 'lechugas_año': round(cult_lech * P_['lechuga_m2'] * P_['ciclos_lechuga']),
           'otras_kg_año': round(A_c * P_['otras_frac'] * P_['otras_kg_m2']), 'lluvia_m3_año': round(lluvia),
           'agua_sistema_m3': round(A_t * P_['tanque_prof'] + A_c * 0.3), 'reposicion_m3_año': round((A_t * P_['tanque_prof'] + A_c * 0.3) * 0.015 * 365),
           'pa_m2': round(pa.area, 1), 'puestos': len(puestos_s), 'puestos_comida': comida, 'mesas': len(mesas_s), 'tarimas': len(tarimas),
           'macetas': 2 * len(tarimas), 'columnas_pa': n_col, 'banos': 3, 'barandal_m': round(m_bar, 1),
           'ocupantes_pa': round(pa.area / 5.6), 'ancho_salidas_m': round(pa.area / 5.6 * 0.005, 2),
           'acuaponia/pb_util': round(A_acu / pb_util, 2)}
    res['ACUAPONIA_GRANDE'] = res['acuaponia/pb_util'] > 0.5
    print('nave sur', json.dumps(res, ensure_ascii=False))
    return {**{k: plano(v) for k, v in S.items() if v}, **{k + 'L': plano(v) for k, v in L.items() if v}}, arboles, res


# ================= Cinta del aro (Gabriel, 2026-10-09) =================
# Una franja de 2 m del borde de afuera del aro se desprende y baja: arranca pegada
# al aro (+10.03, su piso en Rhino: el mismo canto y el mismo barandal; «que se vea como el mismo
# objeto y sólo se empieza a separar»), baja en rampa (≤ 8 %, descansos de 1.20 a
# cada 6 m: NTC 2.2.2.4.1 y tabla 2.2.2.4.1), descansa a la altura de la planta
# alta de la nave sur (+4.28) y termina a +2.40 en las plataformas de la nave
# norte, cruzando Heliotropo. Va en sentido antihorario. El aro, donde se
# desprendió, queda 2 m más angosto (eso lo dibuja el visor con th0…th1).
ARO_Z, ARO_CANTO, ARO_RE = 10.03, 0.35, 46.55
CINTA = {'ancho': 2.0, 'pa': 4.28, 'fin': 2.40, 'th_fin': 18.0, 'pendiente': 0.08, 'tramo': 6.0, 'descanso': 1.2, 'desc_pa': 3.0, 'desc_fin': 1.6}


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
    baja(CINTA['pa'] - CINTA['fin'])
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
    for (sa, sb), r1 in (((s_pa0, s_pa0 + CINTA['desc_pa']), CORTE + 0.05), ((s_fin0, Ltot), CORTE + 0.6)):
        za = z_en(sa)
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
        rects = franjas if norte else []
        cortes = []
        for T in T3:
            piezas = fuera_del_circulo(T, cortes)
            for q in rects:
                piezas = [x for pz in piezas for x in fuera_de_rect(pz, q, cortes)]
            for pol in piezas:
                for i in range(1, len(pol) - 1):
                    for p in (pol[0], pol[i], pol[i + 1]):
                        sal[papel].extend(round(c, 3) for c in p)
                        xs.append(p[0]); ys.append(p[1])
        for a, b in aristas(T3):
            segs = segmento_fuera(a, b)
            for q in rects:
                segs = [x for s in segs for x in segmento_fuera_rect(s[0], s[1], q)]
            for s in segs:
                lin[papel].extend(round(c, 3) for p in s for c in p)
        for a, b in cortes:
            # un corte entre dos franjas abiertas es costura, no borde: se parte en los
            # extremos de las franjas y se deja sólo lo que tiene cubierta de un lado
            for s in costuras_fuera(a, b, rects):
                lin[papel].extend(round(c, 3) for p in s for c in p)
        if xs and papel != 'pa':
            huellas.append((min(xs), min(ys), max(xs), max(ys)))
    acero_t, acero_l, cie_t, cie_l, viv_t, viv_l = reticula(techo)
    canalon(cie_t, cie_l)
    sal['cubierta'].extend(plano(cie_t))
    lin['cubierta'].extend(plano(cie_l))
    vid_t, vid_l, vid_r = vidrio_aro([techo, techo_s])
    print('fachada al aro (vidrio)', len(vid_t), 'triángulos', len(vid_l), 'marcos')
    S3, L3, arboles, resumen = mercado_norte(m, capas)
    sur, arb_s, resumen['sur'] = mercado_sur()
    arboles = list(arboles) + arb_s
    cin_t, cin_l, cinta = cinta_aro()
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

"""Planos del mercado de Atlampa en DWG (90 × 60 cm, vertical), estilo de lámina de
exposición: línea negra fina, poché gris, agua en curvas de nivel, árboles a mano.

Entra:  Plantas/dwg/_datos-mercado.json  (planos-extrae.py: prepara-mercado.py sin tocar el visor)
        Plantas/dwg/_contexto.json       (paisaje, aro, calles, predio: del visor, con node)
Sale:   Plantas/dwg/Atlampa_Mercado.dxf → .dwg (AutoCAD 2024, accoreconsole)

Model space en metros, origen (u 505, v 405) del marco del diagrama; cada plano está corrido
en X (PLANOS). Layouts A-01…A-04 de 600 × 900 mm con sus viewports a escala.
Locales y mesas son bloques (LOCAL_…, MESA_6P) con el número del local como atributo."""
import json
import math
import os
import random
import subprocess

import ezdxf
from ezdxf import units
from ezdxf.enums import TextEntityAlignment as AL
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
SAL = os.path.join(os.path.dirname(os.path.dirname(AQUI)), 'Plantas', 'dwg')
D = json.load(open(os.path.join(SAL, '_datos-mercado.json'), encoding='utf-8'))
C = json.load(open(os.path.join(SAL, '_contexto.json'), encoding='utf-8'))
K = D['const']
P3, SU, CI = D['paso3'], D['sur'], D['cinta']
AN = C['ANILLO']
U0, V0 = 505.0, 405.0
rng = random.Random(7)

doc = ezdxf.new('R2018', setup=True)
doc.units = units.M
doc.header['$INSUNITS'] = 6
doc.header['$MEASUREMENT'] = 1
doc.header['$PSLTSCALE'] = 1
doc.header['$LTSCALE'] = 1
doc.header['$LWDISPLAY'] = 1
msp = doc.modelspace()
doc.styles.add('ARQ', font='ARIALN.TTF')
doc.styles.get('Standard').dxf.font = 'ARIALN.TTF'
# tipos de línea en mm de papel (PSLTSCALE = 1: el viewport los escala)
doc.linetypes.add('OCULTA', pattern=[3.0, 2.0, -1.0], description='Oculta / por encima __ __')
doc.linetypes.add('EJE', pattern=[9.0, 6.0, -1.5, 0.0, -1.5], description='Eje ____ . ____')
doc.linetypes.add('PUNTOS', pattern=[1.0, 0.0, -1.0], description='Puntos . . .')

# ---- capas: (nombre, color ACI, grosor 1/100 mm, tipo de línea) — imprimir con Grayscale.ctb ----
CAPAS = [
    ('A-MURO-CORTE', 7, 50, 'Continuous'), ('A-MURO-POCHE', 252, 0, 'Continuous'),
    ('A-ESTR-COLUMNA', 7, 35, 'Continuous'), ('A-ESTR-COL-RELL', 250, 0, 'Continuous'),
    ('A-ESTR-VIGA', 7, 25, 'Continuous'), ('A-ESTR-PUNTAL', 7, 18, 'OCULTA'), ('A-ESTR-EJES', 8, 13, 'EJE'),
    ('A-VIVIENDA-COL', 8, 18, 'Continuous'), ('A-VIVIENDA-RELL', 253, 0, 'Continuous'),
    ('A-PISOS', 7, 18, 'Continuous'), ('A-LAMINA', 8, 5, 'Continuous'), ('A-ESCALERA', 7, 13, 'Continuous'),
    ('A-BARANDAL', 7, 13, 'Continuous'), ('A-LOCALES', 7, 25, 'Continuous'), ('A-LOCALES-POCHE', 251, 0, 'Continuous'),
    ('A-LOCALES-MOSTRADOR', 7, 13, 'Continuous'), ('A-MOBILIARIO', 7, 9, 'Continuous'), ('A-SERVICIOS', 7, 18, 'Continuous'),
    ('A-ACUAPONIA', 7, 9, 'Continuous'), ('A-SOBRE', 7, 13, 'OCULTA'), ('A-ABAJO', 9, 5, 'Continuous'),
    ('A-ARO', 7, 35, 'Continuous'), ('A-ARO-RELL', 254, 0, 'Continuous'), ('A-CINTA', 7, 25, 'Continuous'),
    ('A-VIDRIO', 7, 13, 'Continuous'), ('A-CUBIERTA', 7, 13, 'Continuous'),
    ('P-AGUA', 8, 9, 'Continuous'), ('P-AGUA-BORDE', 7, 18, 'Continuous'), ('P-VEGETACION', 8, 9, 'Continuous'),
    ('P-ARBOLES', 8, 5, 'Continuous'), ('P-SUELO', 9, 5, 'Continuous'), ('P-HUMEDAL', 8, 9, 'Continuous'), ('P-PAVIMENTO', 8, 9, 'Continuous'),
    ('C-PREDIO', 7, 25, 'Continuous'), ('C-GUARNICION', 8, 13, 'Continuous'), ('C-CALLES', 9, 9, 'EJE'),
    ('C-EDIFICIOS', 8, 13, 'Continuous'), ('C-VIAS', 8, 9, 'Continuous'),
    ('T-TEXTO', 7, 13, 'Continuous'), ('T-NIVELES', 7, 13, 'Continuous'), ('T-COTAS', 7, 9, 'Continuous'),
    ('T-CORTE', 7, 35, 'EJE'), ('X-HOJA', 7, 13, 'Continuous'), ('X-VIEWPORT', 7, 9, 'Continuous'),
]
for n, c, lw, lt in CAPAS:
    ly = doc.layers.add(n, color=c, linetype=lt)
    ly.dxf.lineweight = lw if lw else 0
doc.layers.get('X-VIEWPORT').off()
doc.layers.get('X-VIEWPORT').dxf.plot = 0


def segs(a):
    return [(a[i:i + 3], a[i + 3:i + 6]) for i in range(0, len(a) - 5, 6)]


def tris(a):
    return [(a[i:i + 3], a[i + 3:i + 6], a[i + 6:i + 9]) for i in range(0, len(a) - 8, 9)]


def huella(a, filtro=lambda zs: True, plano=True):
    """Unión de la proyección de los triángulos (los horizontales, si plano)."""
    ps = []
    for t in tris(a):
        zs = [p[2] for p in t]
        if plano and max(zs) - min(zs) > 0.01:
            continue
        if not filtro(zs):
            continue
        g = Polygon([(p[0], p[1]) for p in t])
        if g.area > 1e-5:
            ps.append(g.buffer(0.002))
    return unary_union(ps).buffer(-0.002) if ps else Polygon()


def poligonos(g):
    if g.is_empty:
        return []
    return [p for p in getattr(g, 'geoms', [g]) if p.geom_type == 'Polygon' and not p.is_empty]


# ================= bloques =================
def bloque_arbol(nombre, semilla, denso):
    """Copa a mano alzada (rulos encimados) y ramas: radio 1, se inserta escalado."""
    b = doc.blocks.new(nombre)
    r = random.Random(semilla)
    at = {'layer': 'P-ARBOLES'}
    for _ in range(denso):
        a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random()) * 0.88
        cx, cy, rr = math.cos(a) * d, math.sin(a) * d, r.uniform(0.05, 0.13)
        n = r.randint(7, 11)
        pts = []
        for k in range(n + 2):
            t = k / n * 2 * math.pi + r.uniform(-0.2, 0.2)
            q = rr * r.uniform(0.6, 1.3)
            pts.append((cx + math.cos(t) * q, cy + math.sin(t) * q))
        b.add_spline(pts, dxfattribs=at)
    for k in range(r.randint(6, 9)):   # ramas
        a = k / 7 * 2 * math.pi + r.uniform(-0.3, 0.3)
        p, pts = (0, 0), [(0, 0)]
        for s in range(3):
            a += r.uniform(-0.35, 0.35)
            d = (s + 1) / 3 * r.uniform(0.75, 0.95)
            pts.append((math.cos(a) * d, math.sin(a) * d))
        b.add_lwpolyline(pts, dxfattribs=at)
    b.add_circle((0, 0), 0.06, dxfattribs={'layer': 'P-VEGETACION'})
    contorno = []
    for k in range(48):   # contorno suelto
        t = k / 48 * 2 * math.pi
        q = 1 + r.uniform(-0.06, 0.04)
        contorno.append((math.cos(t) * q, math.sin(t) * q))
    b.add_spline(contorno + contorno[:3], dxfattribs={'layer': 'P-ARBOLES'})


for i in range(3):
    bloque_arbol('ARBOL_%d' % (i + 1), 11 + i, 70 + 20 * i)

b = doc.blocks.new('PLANTA')            # mata en planta: asterisco irregular (radio 0.25)
for k in range(7):
    a = k / 7 * 2 * math.pi + rng.uniform(-0.2, 0.2)
    b.add_line((0, 0), (math.cos(a) * rng.uniform(0.14, 0.25), math.sin(a) * rng.uniform(0.14, 0.25)), dxfattribs={'layer': 'P-VEGETACION'})
b = doc.blocks.new('JUNCO')             # junco / tule: tres trazos
for a in (80, 95, 110):
    b.add_line((0, 0), (math.cos(math.radians(a)) * 0.3, math.sin(math.radians(a)) * 0.3), dxfattribs={'layer': 'P-HUMEDAL'})

M_ = K['MESA']
b = doc.blocks.new('MESA_6P')           # mesa 1.80 × 0.75 con dos bancas (6 plazas); origen al centro
hl, ha = M_['largo'] / 2, M_['ancho'] / 2
b.add_lwpolyline([(-hl, -ha), (hl, -ha), (hl, ha), (-hl, ha)], close=True, dxfattribs={'layer': 'A-MOBILIARIO'})
for s in (-1, 1):
    y0, y1 = s * (ha + 0.05), s * (ha + M_['banca'] - 0.05)
    b.add_lwpolyline([(-hl + 0.05, y0), (hl - 0.05, y0), (hl - 0.05, y1), (-hl + 0.05, y1)], close=True, dxfattribs={'layer': 'A-MOBILIARIO'})

b = doc.blocks.new('NIVEL')             # marca de nivel en planta: cuadro con cruz (texto aparte)
b.add_lwpolyline([(-0.2, -0.2), (0.2, -0.2), (0.2, 0.2), (-0.2, 0.2)], close=True, dxfattribs={'layer': 'T-NIVELES'})
b.add_line((-0.2, -0.2), (0.2, 0.2), dxfattribs={'layer': 'T-NIVELES'})
b.add_line((-0.2, 0.2), (0.2, -0.2), dxfattribs={'layer': 'T-NIVELES'})
h = doc.blocks.new('NIVEL_C')           # marca de nivel en corte (triángulo)
h.add_lwpolyline([(0, 0), (-0.15, 0.25), (0.15, 0.25)], close=True, dxfattribs={'layer': 'T-NIVELES'})
h.add_hatch(color=7, dxfattribs={'layer': 'T-NIVELES'}).paths.add_polyline_path([(0, 0), (-0.15, 0.25), (0, 0.25)], is_closed=True)


def rellena(lay, g, capa, patron=None, escala=1.0, angulo=0.0, color=None):
    for p in poligonos(g):
        if p.area < 1e-4:
            continue
        h = lay.add_hatch(color=color if color is not None else 256, dxfattribs={'layer': capa})
        if patron:
            h.set_pattern_fill(patron, scale=escala, angle=angulo)
        h.paths.add_polyline_path(list(p.exterior.coords)[:-1], is_closed=True, flags=1)
        for r in p.interiors:
            h.paths.add_polyline_path(list(r.coords)[:-1], is_closed=True, flags=0)


# locales: un bloque por forma (rectángulos tipo, o los recortados/juntados), origen en el frente
TIPOS_LOCAL = {}


def bloque_local(rec):
    pol = Polygon(rec['pol'])
    frentes = [LineString(f) for f in rec['frentes'] if len(f) >= 2] or [max((LineString([a, b]) for a, b in zip(pol.exterior.coords, pol.exterior.coords[1:])), key=lambda s: s.length)]
    f0 = frentes[0]
    a, b_ = f0.coords[0], f0.coords[-1]
    L_ = f0.length
    t = ((b_[0] - a[0]) / L_, (b_[1] - a[1]) / L_)
    n = (-t[1], t[0])
    c = pol.centroid
    if (c.x - a[0]) * n[0] + (c.y - a[1]) * n[1] < 0:
        a, b_ = b_, a
        t, n = (-t[0], -t[1]), (t[1], -t[0])
    loc = lambda p: (round((p[0] - a[0]) * t[0] + (p[1] - a[1]) * t[1], 3), round((p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1], 3))
    lp = Polygon([loc(p) for p in pol.exterior.coords])
    lf = [LineString([loc(p) for p in f.coords]) for f in frentes]
    clave = (tuple((round(x, 2), round(y, 2)) for x, y in lp.exterior.coords), tuple(tuple((round(x, 2), round(y, 2)) for x, y in f.coords) for f in lf))
    if clave not in TIPOS_LOCAL:
        x0, y0, x1, y1 = lp.bounds
        rect = abs(lp.area - (x1 - x0) * (y1 - y0)) < 0.02
        nombre = ('LOCAL_%.2fx%.2f' % (x1 - x0, y1 - y0)) if rect else 'LOCAL_ESP'
        nombre += '_%dF' % len(lf)
        base, k = nombre, 1
        while nombre in [v for v in TIPOS_LOCAL.values()]:
            k += 1
            nombre = '%s_%d' % (base, k)
        TIPOS_LOCAL[clave] = nombre
        bl = doc.blocks.new(nombre)
        zona_f = unary_union([f.buffer(0.03, cap_style=2) for f in lf])
        muros = lp.difference(lp.buffer(-0.06, join_style=2)).difference(zona_f.buffer(0.04, cap_style=2))
        rellena(bl, muros, 'A-LOCALES-POCHE', color=251)
        for p in poligonos(muros):
            bl.add_lwpolyline(list(p.exterior.coords), dxfattribs={'layer': 'A-LOCALES'})
        cen = lp.centroid
        for f in lf:
            p0, p1 = f.coords[0], f.coords[-1]
            l = f.length
            if l < 0.5:
                continue
            tx, ty = (p1[0] - p0[0]) / l, (p1[1] - p0[1]) / l
            nx, ny = -ty, tx
            if (cen.x - p0[0]) * nx + (cen.y - p0[1]) * ny < 0:
                nx, ny = -nx, -ny
            q0 = (p0[0] + tx * 0.15, p0[1] + ty * 0.15)
            q1 = (p1[0] - tx * 0.15, p1[1] - ty * 0.15)
            mo = Polygon([q0, q1, (q1[0] + nx * 0.45, q1[1] + ny * 0.45), (q0[0] + nx * 0.45, q0[1] + ny * 0.45)]).intersection(lp.buffer(-0.06))
            for p in poligonos(mo):
                bl.add_lwpolyline(list(p.exterior.coords), dxfattribs={'layer': 'A-LOCALES-MOSTRADOR'})
            bl.add_line(p0, p1, dxfattribs={'layer': 'A-SOBRE'})   # cortina enrollada (arriba)
        bl.add_attdef('NUM', (cen.x, cen.y), dxfattribs={'height': 0.22, 'layer': 'T-TEXTO', 'style': 'ARQ'}).set_placement((cen.x, cen.y + 0.25), align=AL.MIDDLE_CENTER)
    return TIPOS_LOCAL[clave], a, math.degrees(math.atan2(t[1], t[0]))


# ================= planos =================
class Plano:
    def __init__(self, ox, oy=0.0):
        self.ox, self.oy, self.vistos = ox, oy, set()

    def p(self, u, v):
        return (u - U0 + self.ox, v - V0 + self.oy)

    def linea(self, a, b, capa):
        k = (capa,) + tuple(sorted([(round(a[0], 2), round(a[1], 2)), (round(b[0], 2), round(b[1], 2))]))
        if k in self.vistos or math.hypot(a[0] - b[0], a[1] - b[1]) < 0.012:
            return
        self.vistos.add(k)
        msp.add_line(self.p(a[0], a[1]), self.p(b[0], b[1]), dxfattribs={'layer': capa})

    def lineas(self, arr, capa, filtro=lambda z0, z1: True, fuera=None):
        for a, b in segs(arr):
            if filtro(min(a[2], b[2]), max(a[2], b[2])) and not (fuera and fuera(a, b)):
                self.linea(a, b, capa)

    def poli(self, pts, capa, cerrada=True):
        msp.add_lwpolyline([self.p(*q) for q in pts], close=cerrada, dxfattribs={'layer': capa})

    def geom(self, g, capa, relleno=None, patron=None, escala=1.0, angulo=0.0):
        g2 = mueve(g, self)
        if relleno is not None or patron:
            rellena(msp, g2, capa if not patron else capa, patron, escala, angulo, relleno)
        else:
            for p in poligonos(g2):
                msp.add_lwpolyline(list(p.exterior.coords), dxfattribs={'layer': capa})
                for r in p.interiors:
                    msp.add_lwpolyline(list(r.coords), dxfattribs={'layer': capa})

    def contorno(self, g, capa):
        for p in poligonos(mueve(g, self)):
            msp.add_lwpolyline(list(p.exterior.coords), dxfattribs={'layer': capa})
            for r in p.interiors:
                msp.add_lwpolyline(list(r.coords), dxfattribs={'layer': capa})

    def agua(self, g, paso=0.45, capa='P-AGUA'):
        """Agua como curvas de nivel hacia adentro (como la lámina de referencia)."""
        self.contorno(g, 'P-AGUA-BORDE')
        k = 1
        while True:
            gi = g.buffer(-paso * k * (1 + 0.15 * k), join_style=1)
            if gi.is_empty or k > 40:
                break
            self.contorno(gi.simplify(0.05), capa)
            k += 1

    def texto(self, s, u, v, h=0.6, rot=0.0, capa='T-TEXTO', al=AL.MIDDLE_CENTER):
        msp.add_text(s, height=h, rotation=rot, dxfattribs={'layer': capa, 'style': 'ARQ'}).set_placement(self.p(u, v), align=al)

    def nivel(self, z, u, v, h=0.5):
        msp.add_blockref('NIVEL', self.p(u, v), dxfattribs={'layer': 'T-NIVELES', 'xscale': h / 0.5, 'yscale': h / 0.5})
        self.texto(('N %+.2f' % z).replace('+-', '−'), u + 0.35 * h / 0.5, v, h, al=AL.MIDDLE_LEFT, capa='T-NIVELES')

    def arbol(self, u, v, r, k):
        msp.add_blockref('ARBOL_%d' % (k % 3 + 1), self.p(u, v), dxfattribs={'layer': 'P-ARBOLES', 'xscale': r, 'yscale': r, 'rotation': (k * 47) % 360})


def mueve(g, pl):
    from shapely.affinity import translate
    return translate(g, pl.ox - U0, pl.oy - V0)


# marco de cada plano (lo que cabe en la hoja a 1:250) y recortes
VISTA = box(U0 - 70, V0 - 98, U0 + 70, V0 + 98)
ARO_C = (AN['u'], AN['v'])
NAVE_N = box(*D['naves'][0])
NAVE_S = box(*D['naves'][1])
NAVES = unary_union([NAVE_N, NAVE_S])
CORTE_ARO = Point(ARO_C).buffer(47.0, 256)


def adentro_vista(pts, m=0):
    return any(VISTA.buffer(m).contains(Point(p)) for p in pts)


# muros del mercado: la huella al piso (caras horizontales hasta +1.3)
MUROS = huella(D['perimetro'], lambda zs: max(zs) <= 1.3)
COL_SUR = huella(SU['columna'], lambda zs: max(zs) < 1.0)
VIV_COL = huella(D['vivienda'], lambda zs: max(zs) < 1.0)
COL_AC = unary_union([box(u - K['COL'] / 2, v - K['COL'] / 2, u + K['COL'] / 2, v + K['COL'] / 2) for u, v in K['COLUMNAS_ACERO']])


def contexto(pl, tenue=False):
    """Predio, guarniciones, calles, vecinos, espuela."""
    pl.poli(C['GUP'], 'C-GUARNICION')
    pl.poli(C['PRED'], 'C-PREDIO')
    for tipo, lst in C['DAT']['calles'].items():
        for l in lst:
            pts = [(l[i], l[i + 1]) for i in range(0, len(l) - 1, 2)]
            g = LineString(pts).intersection(VISTA.buffer(-1)) if len(pts) > 1 else None
            for s in getattr(g, 'geoms', [g]) if g is not None and not g.is_empty else []:
                if s.geom_type == 'LineString':
                    pl.poli(list(s.coords), 'C-CALLES' if tipo != 'tren' else 'C-VIAS', False)
    for e in C['DAT']['edificios']:
        pts = [(e[i], e[i + 1]) for i in range(1, len(e) - 1, 2)]
        if len(pts) < 3:
            continue
        g = Polygon(pts).buffer(0)
        if g.intersects(box(*[C['PRED'][0][0], C['PRED'][0][1], C['PRED'][2][0], C['PRED'][2][1]]).buffer(-1)):
            continue
        g = g.intersection(VISTA.buffer(-1))
        if not g.is_empty:
            pl.contorno(g, 'C-EDIFICIOS')
                # espuela: rieles (1.435) y durmientes; sólo dentro de la vista
    esp = LineString(C['ESPUELA']).intersection(VISTA.buffer(-1))
    for s in getattr(esp, 'geoms', [esp]):
        if s.is_empty or s.geom_type != 'LineString':
            continue
        for d in (-0.72, 0.72):
            o = s.offset_curve(d)
            pl.poli(list(o.coords), 'C-VIAS', False)
        n = int(s.length / 0.6)
        for k in range(n):
            p0, p1 = s.interpolate(k * 0.6), s.interpolate(k * 0.6 + 0.05)
            dx, dy = p1.x - p0.x, p1.y - p0.y
            l = math.hypot(dx, dy) or 1
            nx, ny = -dy / l, dx / l
            pl.linea((p0.x + nx * 1.25, p0.y + ny * 1.25), (p0.x - nx * 1.25, p0.y - ny * 1.25), 'C-VIAS')
    gu = C['GU']
    pl.texto('CALLE SABINO', gu['e'] + 4.5, 400, 0.9, 90)
    pl.texto('CALLE DEL FRESNO', gu['o'] - 4.5, 400, 0.9, 90)
    pl.texto('CALLE CLAVEL', 470, gu['s'] - 4.0, 0.9)
    pl.texto('AV. PROFRA. EULALIA GUZMÁN', 490, gu['n'] + 4.0, 0.9)
    pl.texto('CALLE HELIOTROPO', 462, 405, 0.7)


def paisaje(pl, completo=True):
    PAI = C['PAI']
    fuera = NAVES.union(CORTE_ARO.difference(Point(ARO_C).buffer(46.6))).buffer(0.2)
    for t in PAI['tezontle']:
        g = Polygon([(t[i], t[i + 1]) for i in range(0, len(t) - 1, 2)]).buffer(0)
        pl.contorno(g, 'P-SUELO')
        if completo:
            rellena(msp, mueve(g, pl), 'P-SUELO', 'AR-SAND', 0.05)
    for t in PAI['estanques']:
        pl.agua(Polygon([(t[i], t[i + 1]) for i in range(0, len(t) - 1, 2)]).buffer(0), 0.35)
    for t in PAI['filtros']:
        g = Polygon([(t[i], t[i + 1]) for i in range(0, len(t) - 1, 2)]).buffer(0)
        pl.contorno(g, 'P-AGUA-BORDE')
        juncos(pl, g, 0.8)
    rio = PAI['rio']
    g = Polygon([(rio[i], rio[i + 1]) for i in range(0, len(rio) - 1, 2)]).buffer(0)
    if not g.is_empty:
        pl.agua(g.difference(fuera), 0.3)
    en = PAI['estanqueNave']
    pl.agua(Point(en[0], en[1]).buffer(en[2], 64).difference(NAVES), 0.35)
    lag = Polygon(C['laguna']).buffer(0)
    pl.agua(lag, 0.5)
    pl.contorno(Polygon(C['lagunaB']).buffer(0), 'P-PAVIMENTO')
    lc = PAI['laguna']['c']
    for a, r1, r2 in PAI['rayos']:
        s = LineString([(lc[0] + math.cos(a) * r1, lc[1] + math.sin(a) * r1), (lc[0] + math.cos(a) * r2, lc[1] + math.sin(a) * r2)])
        s = s.difference(lag.buffer(0.3))
        for q in getattr(s, 'geoms', [s]):
            if not q.is_empty:
                pl.poli(list(q.coords), 'P-PAVIMENTO', False)
    for s in PAI['senderos']:
        l = LineString([(s[0], s[1]), (s[2], s[3])])
        for d in (-0.75, 0.75):
            o = l.offset_curve(d)
            pl.poli(list(o.coords), 'P-PAVIMENTO', False)
    if completo:
        for f in PAI['plantas']:
            l = LineString([(f[0], f[1]), (f[2], f[3])])
            filas = max(1, int(f[4] / 0.9))
            for j in range(filas):
                d = (j - (filas - 1) / 2) * 0.9
                o = l.offset_curve(d) if abs(d) > 1e-6 else l
                n = int(o.length / 0.9)
                for k in range(n):
                    q = o.interpolate(k * 0.9 + rng.uniform(0, 0.4))
                    if fuera.contains(q):
                        continue
                    msp.add_blockref('PLANTA', pl.p(q.x, q.y), dxfattribs={'layer': 'P-VEGETACION', 'rotation': rng.uniform(0, 360), 'xscale': 1.3 if f[5] else 0.9, 'yscale': 1.3 if f[5] else 0.9})
        for k, a in enumerate(C['arboles']):
            if not fuera.contains(Point(a[0], a[1])):
                pl.arbol(a[0], a[1], a[3], k)
    # columnas de la vivienda que llegan al piso (referencia, girada −10°)
    if completo:
        for u, v, _ in PAI['columnas']:
            g = Polygon([(u + math.cos(math.radians(-10)) * x - math.sin(math.radians(-10)) * y, v + math.sin(math.radians(-10)) * x + math.cos(math.radians(-10)) * y) for x, y in ((-.2, -.2), (.2, -.2), (.2, .2), (-.2, .2))])
            pl.geom(g, 'A-VIVIENDA-RELL', 253)
            pl.contorno(g, 'A-VIVIENDA-COL')


def juncos(pl, g, paso):
    x0, y0, x1, y1 = g.bounds
    y = y0 + paso / 2
    i = 0
    while y < y1:
        x = x0 + (paso / 2 if i % 2 else 0)
        while x < x1:
            q = Point(x + rng.uniform(-0.15, 0.15), y + rng.uniform(-0.15, 0.15))
            if g.contains(q):
                msp.add_blockref('JUNCO', pl.p(q.x, q.y), dxfattribs={'layer': 'P-HUMEDAL'})
            x += paso
        y += paso * 0.8
        i += 1


def aro(pl, modo):
    """modo 'sobre': proyección punteada (plantas bajas); 'corte': el nivel del aro."""
    c = ARO_C
    th0, th1 = CI['th0'], CI['th1']
    if modo == 'sobre':
        for r in (AN['ri'], AN['re']):
            msp.add_circle(pl.p(*c), r, dxfattribs={'layer': 'A-SOBRE'})
        return
    # losa: anillo ri–re, angosto (ri–cinta.ri) donde la cinta se desprende
    ext = [(c[0] + math.cos(math.radians(t)) * (AN['re'] if not (th0 < t < th1) else CI['ri']), c[1] + math.sin(math.radians(t)) * (AN['re'] if not (th0 < t < th1) else CI['ri'])) for t in [x * 0.5 for x in range(-360, 360)]]
    losa = Polygon(ext).difference(Point(c).buffer(AN['ri'], 256))
    pl.geom(losa, 'A-ARO-RELL', 254)
    pl.contorno(losa, 'A-ARO')
    for r in (AN['ri'] + 0.05,):
        msp.add_circle(pl.p(*c), r, dxfattribs={'layer': 'A-BARANDAL'})
    pl.contorno(Polygon(ext).buffer(-0.05), 'A-BARANDAL')
    for k, (u, v) in enumerate(C['ACOL']):
        g = Point(u, v).buffer(0.3, 24)
        pl.geom(g, 'A-ESTR-COL-RELL', 250)
        pl.contorno(g, 'A-ESTR-COLUMNA')
    pl.texto('ARO  N +%.2f' % AN['z'], c[0] + math.cos(math.radians(160)) * 43, c[1] + math.sin(math.radians(160)) * 43, 0.8, 160 - 90)


def cinta(pl, capa='A-CINTA', niveles=True):
    for a, b in segs(CI['lineas']):
        pl.linea(a, b, capa)
    if niveles:
        c = ARO_C
        for k, (t, z) in enumerate(CI['perfil']):
            if k % 4 == 0 or k == len(CI['perfil']) - 1:
                r = (CI['ri'] + CI['re']) / 2
                pl.texto(('%+.2f' % z), c[0] + math.cos(math.radians(t)) * (CI['re'] + 1.3), c[1] + math.sin(math.radians(t)) * (CI['re'] + 1.3), 0.45, t - 90, 'T-NIVELES')
        # flechas de subida (sube hacia el aro: sentido horario desde th1)
        for t in range(-120, 15, 20):
            r = (CI['ri'] + CI['re']) / 2
            p0 = (c[0] + math.cos(math.radians(t + 3)) * r, c[1] + math.sin(math.radians(t + 3)) * r)
            p1 = (c[0] + math.cos(math.radians(t)) * r, c[1] + math.sin(math.radians(t)) * r)
            pl.linea(p0, p1, 'T-NIVELES')


def puestos_y_mesas(pl, alto):
    nn = ns = 0
    for rec in D['REC']['puestos']:
        if (rec['z'] >= 4.0) != alto:
            continue
        nombre, o, rot = bloque_local(rec)
        if rec['z'] >= 4.0:
            ns += 1; num = 'S-%02d' % ns
        else:
            nn += 1; num = 'N-%02d' % nn
        br = msp.add_blockref(nombre, pl.p(*o), dxfattribs={'layer': 'A-LOCALES', 'rotation': rot})
        br.add_auto_attribs({'NUM': num})
    for m in D['REC']['mesas']:
        if (m['z'] >= 4.0) != alto:
            continue
        msp.add_blockref('MESA_6P', pl.p(*m['c']), dxfattribs={'layer': 'A-MOBILIARIO', 'rotation': m['rot']})


PUESTOS_G = unary_union([Polygon(r['pol']).buffer(0.12) for r in D['REC']['puestos']])
fuera_puesto = lambda a, b: PUESTOS_G.contains(Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))


def muros_y_columnas(pl, gris=False):
    pl.geom(MUROS, 'A-MURO-POCHE', 252)
    pl.contorno(MUROS, 'A-MURO-CORTE')
    for g, capa in ((COL_AC, 'A-ESTR-COLUMNA'), (COL_SUR, 'A-ESTR-COLUMNA')):
        pl.geom(g, 'A-ESTR-COL-RELL', 250)
        pl.contorno(g, capa)
    pl.geom(VIV_COL, 'A-VIVIENDA-RELL', 253)
    pl.contorno(VIV_COL, 'A-VIVIENDA-COL')
    # vidrio del corte del aro (r 47) a la altura de corte
    pl.lineas(D['vidrioL'], 'A-VIDRIO', lambda z0, z1: z0 < 1.5 and z1 - z0 < 0.05)


def niveles_plataformas(pl, arr, zmax):
    """Una marca de nivel por cada mancha plana grande de plataforma."""
    por_z = {}
    for t in tris(arr):
        zs = [p[2] for p in t]
        if max(zs) - min(zs) > 0.01 or max(zs) > zmax:
            continue
        g = Polygon([(p[0], p[1]) for p in t])
        if g.area > 1e-4:
            por_z.setdefault(round(zs[0], 2), []).append(g.buffer(0.002))
    hechos = []
    for z, gs in por_z.items():
        for p in poligonos(unary_union(gs)):
            if p.area < 12:
                continue
            q = p.representative_point()
            if any(q.distance(h) < 6 for h in hechos):
                continue
            hechos.append(q)
            pl.nivel(z - 0.2 + 0.2, q.x, q.y, 0.35)


# ---------- A-01 planta baja ----------
PLANOS = {}
pb = PLANOS['A-01'] = Plano(0)
contexto(pb)
paisaje(pb)
aro(pb, 'sobre')
for a, b in segs(CI['lineas']):
    pb.linea(a, b, 'A-SOBRE')
muros_y_columnas(pb)
bajo = lambda z0, z1: z0 < 3.0
pb.lineas(P3['pisoL'], 'A-PISOS', bajo)
pb.lineas(P3['plataformaL'], 'A-PISOS', bajo)
pb.lineas(P3['laminaL'], 'A-LAMINA', bajo)
pb.lineas(P3['escaleraL'] if 'escaleraL' in P3 else [], 'A-ESCALERA', bajo)
pb.lineas(P3['barandaL'], 'A-BARANDAL', bajo)
pb.lineas(P3['localL'], 'A-SERVICIOS', lambda z0, z1: z0 < 3.0 and z1 - z0 < 0.01 and z0 < 2.0, fuera_puesto)   # baños (los puestos van en bloque)
pb.lineas(P3['bancaL'], 'A-MOBILIARIO', bajo)
pb.lineas(P3['humedalL'], 'P-HUMEDAL', bajo)
pb.lineas(P3['juncoL'], 'P-HUMEDAL', lambda z0, z1: z1 - z0 < 0.05)
zan = huella(P3['zanja'], plano=False)
pb.contorno(zan, 'A-PISOS')
pb.agua(huella(P3['agua'], plano=False), 0.4)
pb.contorno(huella(P3['jardin'], plano=False), 'A-PISOS')
hum = huella(P3['humedal'], lambda zs: True, plano=False)
juncos(pb, huella(P3['agua_p'], plano=False).buffer(-0.3), 0.9)
pb.agua(huella(P3['agua_p'], plano=False), 0.35)
for q in D['hoyo']['franjas']:   # el hoyo de la cubierta, arriba
    pb.poli([(q[0], q[1]), (q[2], q[1]), (q[2], q[3]), (q[0], q[3])], 'A-SOBRE')
for u0_, v0_, u1_, v1_ in D['naves']:   # alero / cubierta, arriba
    pb.poli([(u0_, v0_), (u1_, v0_), (u1_, v1_), (u0_, v1_)], 'A-SOBRE')
# nave sur PB
for k in ('pisoL', 'andenL', 'bioL', 'tanqueL', 'camaL', 'barandaL', 'escaleraL'):
    pb.lineas(SU.get(k, []), 'A-ACUAPONIA' if k in ('camaL', 'tanqueL') else ('A-ESCALERA' if k == 'escaleraL' else 'A-PISOS'), lambda z0, z1: z1 < 2.2)
pb.lineas(SU['plantaL'], 'P-VEGETACION', lambda z0, z1: z1 < 2.2 and z1 - z0 < 0.05)
pb.agua(huella(SU['agua'], plano=False), 0.3)
puestos_y_mesas(pb, False)
for k, a in enumerate(D['arboles']):
    if a[2] < 3.0:
        pb.arbol(a[0], a[1], max(1.0, a[3] * 0.4), k + 5)
niveles_plataformas(pb, P3['plataforma'], 3.0)
SUR = K['SUR']
pb.nivel(0.40, 530, 350); pb.nivel(1.20, 540, 330); pb.nivel(-1.50 + 0.0, D['hoyo']['c'][0] - 2, D['hoyo']['c'][1] - 6)
pb.texto('JARDÍN INUNDABLE', D['hoyo']['c'][0], D['hoyo']['c'][1] - 3.5, 0.55)
pb.texto('ACUAPONIA', 520, 368, 0.7); pb.texto('BIODIGESTOR', 522, 330.6, 0.55)
pb.texto('ANDÉN DE CARGA', 540, 333.5, 0.45, 90); pb.texto('ACCESO DE CARGA', 550.5, 330.6, 0.55)
pb.texto('PATIOS DE HUMEDALES', 528, 425, 0.6, 40)
pb.texto('LAGUNA', C['PAI']['laguna']['c'][0], C['PAI']['laguna']['c'][1], 0.7)

# ---------- A-02 planta alta (+4.28) ----------
pa = PLANOS['A-02'] = Plano(300)
contexto(pa, True)
paisaje(pa, False)
muros_y_columnas(pa)
pa.lineas(P3['plataformaL'], 'A-ABAJO', bajo)    # la nave norte, abajo (sin planta alta)
pa.lineas(P3['pisoL'], 'A-ABAJO', bajo)
alto = lambda z0, z1: z0 >= 4.0
for k in ('paL', 'muroL', 'tarimaL', 'macetaL', 'pastoL'):
    pa.lineas(SU.get(k, []), {'paL': 'A-LAMINA', 'pastoL': 'P-VEGETACION'}.get(k, 'A-PISOS'), alto)
pa.lineas(SU['escaleraL'], 'A-ESCALERA', lambda z0, z1: z0 >= 2.2)
pa.lineas(SU['barandaL'], 'A-BARANDAL', alto)
pa.lineas(SU['localL'], 'A-SERVICIOS', lambda z0, z1: z0 >= 4.0 and z1 - z0 < 0.01 and z0 < 4.6, fuera_puesto)
pa.lineas(SU['camaL'], 'A-ABAJO', lambda z0, z1: z1 - z0 < 0.05)   # acuaponia vista por el vacío de luz
puestos_y_mesas(pa, True)
for k, a in enumerate(D['arboles']):
    if 4.0 <= a[2] < 8.0:
        pa.arbol(a[0], a[1], max(0.9, a[3] * 0.4), k)
cinta(pa)
aro(pa, 'sobre')
pa.nivel(4.28, 530, 372); pa.nivel(4.28, 548, 340)
pa.texto('VACÍO DE LUZ', 531.6, 364, 0.55, 90)
pa.texto('BAÑOS', 522.5, 330.6, 0.55)
pa.texto('CINTA DEL ARO · RAMPA ≤ 8 %', ARO_C[0] + math.cos(math.radians(-60)) * 49, ARO_C[1] + math.sin(math.radians(-60)) * 49, 0.6, -60 + 90)

# ---------- A-03 nivel del aro (+10.03) y cubiertas ----------
ar = PLANOS['A-03'] = Plano(600)
contexto(ar, True)
paisaje(ar, False)
ar.lineas(D['cubiertaL'], 'A-CUBIERTA')
ar.lineas(D['perimetroL'], 'A-CUBIERTA', lambda z0, z1: z1 - z0 < 0.05 and z0 > 5.0)
for k in ('paL', 'tarimaL'):
    ar.lineas(SU.get(k, []), 'A-ABAJO', alto)
puestos_y_mesas(ar, True)
for k, a in enumerate(D['arboles']):
    if a[2] + a[3] > 6.0:
        ar.arbol(a[0], a[1], max(1.0, a[3] * 0.4), k)
ar.lineas(P3['humedalL'], 'A-ABAJO', bajo)
aro(ar, 'corte')
cinta(ar)
ar.texto('CUBIERTA NAVE NORTE', 532, 476, 0.7, 90)
ar.texto('NAVE SUR (CUBIERTA POR DEFINIR)', 531.5, 388, 0.6)
ar.texto('HOYO DEL JARDÍN', D['hoyo']['c'][0], D['hoyo']['c'][1] + 3.6, 0.5)

# ---------- A-04 estructura del mercado ----------
OXE = 900.0
es = PLANOS['A-04'] = Plano(OXE)
es.geom(MUROS, 'A-MURO-POCHE', 252)
es.contorno(MUROS, 'A-MURO-CORTE')
viga = lambda z0, z1: z0 >= K['Z_VIGA'] - K['PERALTE'] - 0.01 and z1 <= K['Z_VIGA'] + 0.01
es.lineas(D['aceroL'], 'A-ESTR-VIGA', viga)
es.lineas(D['aceroL'], 'A-ESTR-PUNTAL', lambda z0, z1: z0 >= 2.6 and z1 <= 3.35)
es.geom(COL_AC, 'A-ESTR-COL-RELL', 250)
es.contorno(COL_AC, 'A-ESTR-COLUMNA')
es.geom(VIV_COL, 'A-VIVIENDA-RELL', 253)
es.contorno(VIV_COL, 'A-VIVIENDA-COL')
es.lineas(D['vidrioL'], 'A-VIDRIO', lambda z0, z1: z0 < 1.5 and z1 - z0 < 0.05)
es.contorno(box(*K['ZANJA']), 'A-SOBRE')
# ejes
Z = K['ZANJA']
vfil = [v for v in K['V_POSTES'] if Z[1] <= v <= Z[3]]
LET = 'ABCDE'
for i, u in enumerate(K['EJES_U']):
    es.linea((u, Z[1] - 4), (u, Z[3] + 6), 'A-ESTR-EJES')
    msp.add_circle(es.p(u, Z[3] + 7.0), 0.9, dxfattribs={'layer': 'A-ESTR-EJES'})
    es.texto(LET[i], u, Z[3] + 7.0, 0.9)
for j, v in enumerate(vfil):
    es.linea((Z[0] - 6, v), (Z[2] + 3, v), 'A-ESTR-EJES')
    msp.add_circle(es.p(Z[0] - 7.0, v), 0.9, dxfattribs={'layer': 'A-ESTR-EJES'})
    es.texto(str(j + 1), Z[0] - 7.0, v, 0.9)
ds = doc.dimstyles.new('PL150')
ds.dxf.dimtxt, ds.dxf.dimasz, ds.dxf.dimexe, ds.dxf.dimexo, ds.dxf.dimgap = 0.38, 0.3, 0.3, 0.3, 0.15
ds.dxf.dimtsz = 0.25
ds.dxf.dimdec = 2
ds.dxf.dimtxsty = 'ARQ'
ds.dxf.dimclrd = ds.dxf.dimclre = 7
for a, b in zip(K['EJES_U'], K['EJES_U'][1:]):
    msp.add_linear_dim(base=es.p(a, Z[3] + 4.5), p1=es.p(a, Z[3] + 3), p2=es.p(b, Z[3] + 3), dimstyle='PL150', dxfattribs={'layer': 'T-COTAS'}).render()
for a, b in zip(vfil, vfil[1:]):
    msp.add_linear_dim(base=es.p(Z[0] - 4.5, a), p1=es.p(Z[0] - 3, a), p2=es.p(Z[0] - 3, b), angle=90, dimstyle='PL150', dxfattribs={'layer': 'T-COTAS'}).render()
# línea del corte A-A'
VC = vfil[7] if len(vfil) > 7 else vfil[len(vfil) // 2]
for pl_ in (es, pb):
    pl_.linea((Z[0] - 2, VC), (Z[2] + 2, VC), 'T-CORTE')
    pl_.texto('A', Z[0] - 2.8, VC, 1.0); pl_.texto("A'", Z[2] + 2.8, VC, 1.0)
es.texto('ESTRUCTURA DE ACERO · NAVE NORTE', 540.5, Z[1] - 7, 0.9)
es.texto('Columnas HSS 300 × 300 · vigas y largueros 250 × 500 a N +6.00 · puntales HSS 150 a N +3.00 · columnas gemelas con junta de 5 cm junto a la vivienda (independiente)', 540.5, Z[1] - 8.6, 0.45)
es.texto('Secciones de propuesta del modelo: falta predimensionar con la bajada de cargas definitiva.', 540.5, Z[1] - 9.5, 0.45)

# corte A-A' (1:100): triángulos cortados por el plano v = VC
CX, CY = OXE + 300.0, 0.0


def corte(arr, capa, zmin=-9, zmax=99):
    vistos = set()
    for t in tris(arr):
        pts = []
        for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if (p[1] - VC) * (q[1] - VC) < 0:
                f = (VC - p[1]) / (q[1] - p[1])
                pts.append((p[0] + f * (q[0] - p[0]), p[2] + f * (q[2] - p[2])))
        if len(pts) == 2 and zmin <= min(pts[0][1], pts[1][1]) <= zmax:
            k = tuple(sorted((round(x, 2), round(y, 2)) for x, y in pts))
            if k in vistos or math.dist(*pts) < 0.005:
                continue
            vistos.add(k)
            msp.add_line((pts[0][0] - 540 + CX, pts[0][1] + CY), (pts[1][0] - 540 + CX, pts[1][1] + CY), dxfattribs={'layer': capa})


corte(D['perimetro'], 'A-MURO-CORTE')
corte(D['cubierta'], 'A-CUBIERTA')
corte(D['acero'], 'A-ESTR-VIGA')
corte(D['vivienda'], 'A-VIVIENDA-COL')
for k in ('piso', 'zanja', 'jardin', 'plataforma', 'escalera'):
    if k in P3:
        corte(P3[k], 'A-PISOS')
corte(P3['agua'], 'P-AGUA-BORDE')
corte(P3['local'], 'A-LOCALES')
corte(P3['mesa'], 'A-MOBILIARIO')
cs = lambda u, z: (u - 540 + CX, z + CY)
msp.add_line(cs(512, 0.2), cs(568, 0.2), dxfattribs={'layer': 'A-PISOS'})
tierra = Polygon([cs(512, 0.2), cs(568, 0.2), cs(568, -3.2), cs(512, -3.2)])
rellena(msp, tierra, 'P-SUELO', 'EARTH', 0.05, 45)
for i, u in enumerate(K['EJES_U']):
    msp.add_line(cs(u, -3.0), cs(u, 11.0), dxfattribs={'layer': 'A-ESTR-EJES'})
    msp.add_circle(cs(u, 11.8), 0.6, dxfattribs={'layer': 'A-ESTR-EJES'})
    msp.add_text(LET[i], height=0.6, dxfattribs={'layer': 'T-TEXTO', 'style': 'ARQ'}).set_placement(cs(u, 11.8), align=AL.MIDDLE_CENTER)
for z, s in ((0.2, 'N +0.20 predio'), (0.4, 'N +0.40 piso mercado'), (3.0, 'N +3.00 puntales'), (6.0, 'N +6.00 vigas'), (-0.45, 'N −0.45 agua'), (-1.5, 'N −1.50 fondo jardín')):
    msp.add_blockref('NIVEL_C', cs(566, z), dxfattribs={'layer': 'T-NIVELES'})
    msp.add_line(cs(565.5, z), cs(567.5, z), dxfattribs={'layer': 'T-NIVELES'})
    msp.add_text(s, height=0.3, dxfattribs={'layer': 'T-NIVELES', 'style': 'ARQ'}).set_placement(cs(566.4, z + 0.18), align=AL.BOTTOM_LEFT)
msp.add_text("CORTE A-A'  (marco tipo, eje %d)" % (vfil.index(VC) + 1), height=0.6, dxfattribs={'layer': 'T-TEXTO', 'style': 'ARQ'}).set_placement(cs(514, -4.8), align=AL.BOTTOM_LEFT)

# detalles 1:20 (geometría dibujada; secciones de propuesta)
DX, DY = OXE + 400.0, 0.0
d20 = doc.dimstyles.new('D20')
d20.dxf.dimtxt, d20.dxf.dimasz, d20.dxf.dimexe, d20.dxf.dimexo, d20.dxf.dimgap, d20.dxf.dimtsz = 0.05, 0.04, 0.04, 0.04, 0.02, 0.03
d20.dxf.dimdec = 3
d20.dxf.dimtxsty = 'ARQ'


def det_poli(pts, capa, ox, oy, cerrada=True):
    msp.add_lwpolyline([(x + ox, y + oy) for x, y in pts], close=cerrada, dxfattribs={'layer': capa})


def det_txt(s, x, y, ox, oy, h=0.07, al=AL.BOTTOM_LEFT):
    msp.add_text(s, height=h, dxfattribs={'layer': 'T-TEXTO', 'style': 'ARQ'}).set_placement((x + ox, y + oy), align=al)


def hss(x, y, lado, e, ox, oy, capa='A-ESTR-COLUMNA'):
    h = lado / 2
    out = [(x - h, y - h), (x + h, y - h), (x + h, y + h), (x - h, y + h)]
    inn = [(x - h + e, y - h + e), (x + h - e, y - h + e), (x + h - e, y + h - e), (x - h + e, y + h - e)]
    det_poli(out, capa, ox, oy); det_poli(inn, capa, ox, oy)
    g = Polygon(out).difference(Polygon(inn))
    rellena(msp, Polygon([(a + ox, b + oy) for a, b in g.exterior.coords]).difference(Polygon([(a + ox, b + oy) for a, b in inn])), 'A-ESTR-COL-RELL', color=250)


# D1 · planta: columna gemela junto a la columna de la vivienda (junta 5 cm)
ox, oy = DX, DY
lado_v = 0.405
rv = lado_v * math.sqrt(2) / 2
libre = rv + K['JUNTA'] + K['COL'] / 2
gv = math.radians(-10)
vc = [(math.cos(gv) * x - math.sin(gv) * y, math.sin(gv) * x + math.cos(gv) * y) for x, y in ((-lado_v / 2, -lado_v / 2), (lado_v / 2, -lado_v / 2), (lado_v / 2, lado_v / 2), (-lado_v / 2, lado_v / 2))]
det_poli(vc, 'A-VIVIENDA-COL', ox, oy)
rellena(msp, Polygon([(x + ox, y + oy) for x, y in vc]), 'A-VIVIENDA-RELL', 'ANSI31', 0.02, 45)
for s in (-1, 1):
    hss(s * libre, 0, K['COL'], 0.0095, ox, oy)
    x0 = s * (libre + K['COL'] / 2)
    det_poli([(s * (libre - K['COL'] / 2), -K['VIGA_B'] / 2), (s * 1.6, -K['VIGA_B'] / 2)], 'A-SOBRE', ox, oy, False)
    det_poli([(s * (libre - K['COL'] / 2), K['VIGA_B'] / 2), (s * 1.6, K['VIGA_B'] / 2)], 'A-SOBRE', ox, oy, False)
msp.add_circle((ox, oy), rv, dxfattribs={'layer': 'T-COTAS'})
msp.add_linear_dim(base=(ox, oy - 0.45), p1=(ox + rv, oy - 0.3), p2=(ox + libre - K['COL'] / 2, oy - 0.3), dimstyle='D20', dxfattribs={'layer': 'T-COTAS'}).render()
msp.add_linear_dim(base=(ox, oy - 0.65), p1=(ox - libre, oy - 0.3), p2=(ox + libre, oy - 0.3), dimstyle='D20', dxfattribs={'layer': 'T-COTAS'}).render()
det_txt('Columna de vivienda %.3f (girada −10°): pasa sin tocar el acero' % lado_v, -1.6, 0.55, ox, oy)
det_txt('Columna gemela HSS 300 × 300 × 9.5', -1.6, 0.42, ox, oy)
det_txt('Junta 5 cm al círculo que barre la columna girada', -1.6, 0.29, ox, oy)
det_txt('Viga 250 × 500 (arriba, N +6.00) se interrumpe', -1.6, -0.95, ox, oy)
det_txt('D1 · COLUMNA GEMELA (PLANTA)  1:20', -1.6, -1.35, ox, oy, 0.1)

# D2 · alzado: puntal HSS 150 a poste existente con placa (N +3.00)
ox, oy = DX, DY - 4.2
det_poli([(-0.2, -1.3), (0.2, -1.3), (0.2, 1.3), (-0.2, 1.3)], 'A-MURO-CORTE', ox - 1.2, oy)
rellena(msp, box(ox - 1.4, oy - 1.3, ox - 1.0, oy + 1.3), 'A-MURO-POCHE', 'AR-CONC', 0.01)
det_poli([(-1.0, -0.3), (-0.97, -0.3), (-0.97, 0.3), (-1.0, 0.3)], 'A-ESTR-COLUMNA', ox, oy)
for y in (-0.22, 0.22):
    det_poli([(-1.12, y), (-0.95, y)], 'A-ESTR-COLUMNA', ox, oy, False)
det_poli([(-0.97, -0.075), (1.4, -0.075), (1.4, 0.075), (-0.97, 0.075)], 'A-ESTR-COLUMNA', ox, oy)
det_poli([(-0.97, -0.0655), (1.4, -0.0655)], 'A-SOBRE', ox, oy, False)
det_poli([(-0.97, 0.0655), (1.4, 0.0655)], 'A-SOBRE', ox, oy, False)
for x, y in ((-0.97, 0.075), (-0.97, -0.075)):
    det_poli([(x, y), (x + 0.12, y + (0.12 if y > 0 else -0.12))], 'A-ESTR-COLUMNA', ox, oy, False)
det_txt('Poste existente de la nave', -1.4, 1.4, ox, oy)
det_txt('Placa 600 × 600 × 30, 4 anclas químicas Ø19', -0.9, 0.38, ox, oy)
det_txt('Puntal HSS 150 × 150 × 6.4 a N +3.00 (hacia el eje A / E)', -0.5, 0.15, ox, oy)
msp.add_linear_dim(base=(ox - 0.75, oy), p1=(ox - 0.9, oy - 0.3), p2=(ox - 0.9, oy + 0.3), angle=90, dimstyle='D20', dxfattribs={'layer': 'T-COTAS'}).render()
det_txt('D2 · PUNTAL AL POSTE EXISTENTE (ALZADO)  1:20', -1.6, -1.6, ox, oy, 0.1)

# D3 · alzado: unión viga–columna a N +6.00
ox, oy = DX, DY - 8.6
c, pv, vb = K['COL'], K['PERALTE'], K['VIGA_B']
det_poli([(-c / 2, -1.6), (c / 2, -1.6), (c / 2, -pv), (-c / 2, -pv)], 'A-ESTR-COLUMNA', ox, oy)
det_poli([(-c / 2 + 0.0095, -1.6), (-c / 2 + 0.0095, -pv)], 'A-SOBRE', ox, oy, False)
det_poli([(c / 2 - 0.0095, -1.6), (c / 2 - 0.0095, -pv)], 'A-SOBRE', ox, oy, False)
det_poli([(-c / 2 - 0.05, -pv - 0.025), (c / 2 + 0.05, -pv - 0.025), (c / 2 + 0.05, -pv), (-c / 2 - 0.05, -pv)], 'A-ESTR-COLUMNA', ox, oy)
det_poli([(-1.5, -pv), (1.5, -pv), (1.5, 0), (-1.5, 0)], 'A-ESTR-VIGA', ox, oy)
for y in (-pv + 0.016, -0.016):
    det_poli([(-1.5, y), (1.5, y)], 'A-ESTR-VIGA', ox, oy, False)
for x in (-c / 2, c / 2):
    det_poli([(x, -pv + 0.016), (x, -0.016)], 'A-ESTR-VIGA', ox, oy, False)
for x in (-0.06, 0.06):
    msp.add_circle((ox + x, oy - pv - 0.0125), 0.011, dxfattribs={'layer': 'A-ESTR-COLUMNA'})
msp.add_blockref('NIVEL_C', (ox + 1.65, oy), dxfattribs={'layer': 'T-NIVELES', 'xscale': 0.3, 'yscale': 0.3})
det_txt('N +6.00', 1.72, 0.03, ox, oy)
msp.add_linear_dim(base=(ox - 1.75, oy), p1=(ox - 1.5, oy - pv), p2=(ox - 1.5, oy), angle=90, dimstyle='D20', dxfattribs={'layer': 'T-COTAS'}).render()
det_txt('Viga / larguero 250 × 500 continua sobre la columna, atiesadores en el apoyo', -1.5, 0.1, ox, oy)
det_txt('Placa de capitel 400 × 400 × 25, 4 tornillos A325 Ø19', 0.25, -0.62, ox, oy)
det_txt('Columna HSS 300 × 300 × 9.5', 0.25, -1.1, ox, oy)
det_txt('D3 · UNIÓN VIGA–COLUMNA (ALZADO)  1:20', -1.6, -1.9, ox, oy, 0.1)


# ================= hojas (layouts 600 × 900 mm, vertical) =================
TITULOS = {'A-01': ('PLANTA BAJA · CONJUNTO Y PAISAJE', 'Mercado, patios de humedales, laguna, aro (proyección) · N +0.40 / −1.50'),
           'A-02': ('PLANTA ALTA · NAVE SUR', 'Locales y comedores a N +4.28 · cinta del aro'),
           'A-03': ('NIVEL DEL ARO Y CUBIERTAS', 'Aro a N +10.03 y cinta · sobre él empiezan los departamentos (no se dibujan)'),
           'A-04': ('ESTRUCTURA DEL MERCADO', "Planta estructural 1:150 · corte A-A' 1:100 · detalles 1:20")}
W, H = 600.0, 900.0
for i, (cod, (tit, sub)) in enumerate(TITULOS.items()):
    lay = doc.layouts.new(cod)
    lay.page_setup(size=(W, H), margins=(0, 0, 0, 0), units='mm', device='DWG To PDF.pc3', name='ISO_full_bleed_A1_(841.00_x_594.00_MM)')
    try:
        lay.dxf_layout.dxf.current_style_sheet = 'Grayscale.ctb'
    except Exception:
        pass
    at = {'layer': 'X-HOJA'}
    pl = PLANOS[cod]
    if cod != 'A-04':
        vp = lay.add_viewport(center=(W / 2, 480), size=(560, 780), view_center_point=(pl.ox, 0), view_height=780 / 1000 * 250)
        vp.dxf.layer = 'X-VIEWPORT'
        vp.dxf.flags |= 16384   # bloqueado
        esc = 250
    else:
        for (cx, cy, w_, h_, vc_, e) in ((175, 625, 310, 510, (OXE + 540.5 - U0, 452.5 - V0), 150),
                                         (300, 225, 560, 280, (CX + 0.0, 4.0), 100),
                                         (470, 790, 230, 150, (DX, DY - 0.3), 20),
                                         (470, 610, 230, 170, (DX, DY - 4.2), 20),
                                         (470, 430, 230, 150, (DX, DY - 8.6 - 0.7), 20)):
            vp = lay.add_viewport(center=(cx, cy), size=(w_, h_), view_center_point=vc_, view_height=h_ / 1000 * e)
            vp.dxf.layer = 'X-VIEWPORT'
            vp.dxf.flags |= 16384
        esc = 150
    # pie: título a la izquierda, norte y escala gráfica a la derecha (como la lámina de referencia)
    lay.add_text('ATLAMPA · MERCADO', height=5, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((20, 52), align=AL.BOTTOM_LEFT)
    lay.add_text('%s  %s' % (cod, tit), height=3.5, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((20, 42), align=AL.BOTTOM_LEFT)
    lay.add_text(sub, height=2.5, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((20, 34), align=AL.BOTTOM_LEFT)
    lay.add_text('Escala 1:%d (a 900 × 600 mm) · cotas y niveles en metros' % esc, height=2.2, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((20, 27), align=AL.BOTTOM_LEFT)
    # norte (del proyecto: la retícula; el geográfico está ≈10° girado)
    nx, ny = 440, 40
    lay.add_circle((nx, ny), 5, dxfattribs=at)
    lay.add_line((nx, ny - 5), (nx, ny + 7), dxfattribs=at)
    lay.add_text('N', height=2.5, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((nx, ny + 9), align=AL.BOTTOM_CENTER)
    # escala gráfica 0 · 5 · 10 · 20 m
    x0 = 455
    marcas = (0, 5, 10, 20) if esc >= 150 else (0, 1, 2, 4)
    mm = lambda m: m * 1000 / esc
    lay.add_line((x0, ny - 2), (x0 + mm(marcas[-1]), ny - 2), dxfattribs=at)
    for m in marcas:
        lay.add_line((x0 + mm(m), ny - 2), (x0 + mm(m), ny + 1), dxfattribs=at)
        lay.add_text(str(m), height=2, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((x0 + mm(m), ny + 2.5), align=AL.BOTTOM_CENTER)
    for a, b in zip(marcas, marcas[1:]):
        if marcas.index(a) % 2 == 0:
            h = lay.add_hatch(color=7, dxfattribs={'layer': 'X-HOJA'})
            h.paths.add_polyline_path([(x0 + mm(a), ny - 2), (x0 + mm(b), ny - 2), (x0 + mm(b), ny - 0.8), (x0 + mm(a), ny - 0.8)], is_closed=True)
    lay.add_text('m', height=2, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((x0 + mm(marcas[-1]) + 3, ny - 2), align=AL.BOTTOM_LEFT)
    if cod == 'A-04':
        lay.add_text("Escalas: planta 1:150 · corte 1:100 · detalles 1:20", height=2.2, dxfattribs={'layer': 'X-HOJA', 'style': 'ARQ'}).set_placement((20, 21), align=AL.BOTTOM_LEFT)

for n in ('Layout1',):
    try:
        doc.layouts.delete(n)
    except Exception:
        pass

DXF = os.path.join(SAL, 'Atlampa_Mercado.dxf')
doc.saveas(DXF)
print('dxf', DXF, '· locales tipo', len(TIPOS_LOCAL), '· entidades', len(msp))

# ---- a DWG con AutoCAD 2024 (accoreconsole): DXFIN en un dibujo nuevo y SAVEAS 2018 ----
DWG = os.path.join(SAL, 'Atlampa_Mercado.dwg')
ACC = r'C:\Program Files\Autodesk\AutoCAD 2024\accoreconsole.exe'
if os.path.exists(ACC):
    scr = os.path.join(SAL, '_a_dwg.scr')
    with open(scr, 'w', encoding='utf-8') as f:
        f.write('FILEDIA 0\n_.DXFIN "%s"\n_.ZOOM _E\n_.SAVEAS 2018 "%s"\n' % (DXF, DWG))
    if os.path.exists(DWG):
        os.remove(DWG)
    r = subprocess.run([ACC, '/s', scr, '/l', 'es-MX'], capture_output=True, timeout=600)
    print('dwg', os.path.exists(DWG), DWG)

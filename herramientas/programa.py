"""Programa del predio de Atlampa: calcula las cifras desde las fuentes del repo y
escribe `programa.json` (lo lee la página publicada). Volver a correrlo cuando cambie
algún archivo fuente y republicar la página con el JSON nuevo.

Cada cifra lleva su `fuente`: archivo y capa o variable de donde sale.
Las que no salen de un archivo van marcadas `manual` con la referencia de origen.

Uso: python herramientas/programa.py   (desde diagrama/; necesita rhino3dm y shapely)
Escribe programa/programa.json. Lo manual vive en programa/datos/manual.json.
"""
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter

import rhino3dm

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)                      # .../diagrama
ATLAMPA = os.path.dirname(RAIZ)                   # .../Atlampa
CONTEXTO = os.path.join(ATLAMPA, 'Rhino', 'Contexto.3dm')
if not os.path.exists(CONTEXTO):
    CONTEXTO = os.path.join(RAIZ, 'modelo', 'Contexto.3dm')
PROG = os.path.join(RAIZ, 'programa')             # carpeta del sitio (Vercel: Root Directory = programa)
SALIDA = os.path.join(PROG, 'programa.json')
MANUAL = json.load(open(os.path.join(PROG, 'datos', 'manual.json'), encoding='utf-8'))   # cifras sin archivo fuente, con su fuente y estado


def M(grupo, clave):
    return MANUAL[grupo][clave]['valor']
RX, RY = 503.255, 404.153                         # Rhino (mm) → visor (m), ver handoff/procesos/sitio-y-coordenadas.md


def area_poligono(P):
    return abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2


def leer_js_var(nombre):
    """Lee una constante JSON de un .js generado (p. ej. window.ATLAMPA_PAISAJE = {...})."""
    txt = open(os.path.join(RAIZ, 'atlampa-paisaje.js'), encoding='utf-8').read()
    return txt


def figuras():
    F = {}
    fuentes = {}

    # ---- Vivienda: departamentos.json (un registro por módulo; el valor es la etiqueta del departamento)
    dep = json.load(open(os.path.join(AQUI, 'departamentos.json'), encoding='utf-8'))
    mods = Counter()
    for clave, etiqueta in dep.items():
        m = re.match(r'^[NS]\d\d(u[A-D])\d+$', etiqueta)
        if m:
            mods[m.group(1)] += 1
    tipos = {'uA': ('A · 44 m² social', 2, 44), 'uB': ('B · 44 m²', 2, 44), 'uC': ('C · 66 m²', 3, 66), 'uD': ('D · 88 m²', 4, 88)}
    vivienda = []
    for k, (nombre, modulos, m2) in tipos.items():
        n = mods[k] // modulos
        vivienda.append({'tipo': nombre, 'deptos': n, 'm2_c_u': m2, 'm2': n * m2})
    total_viv = sum(t['m2'] for t in vivienda)
    fuentes['vivienda'] = 'diagrama/herramientas/departamentos.json (etiquetas uA–uD por módulo; módulos ÷ tamaño)'
    F['vivienda'] = {'tipologias': vivienda, 'deptos': sum(t['deptos'] for t in vivienda), 'm2_vendible': total_viv,
                     'amenidades_m2': 22 * sum(1 for v in dep.values() if 'amf' in v),
                     'extra_m2': 22 * sum(1 for v in dep.values() if 'xtr' in v),
                     'sin_asignar_m2': 22 * sum(1 for v in dep.values() if 'lft' in v)}

    # ---- Predio: polígono site::polygon (mismo que PRED en atlampa-geo.js)
    geo = open(os.path.join(RAIZ, 'atlampa-geo.js'), encoding='utf-8').read()
    pred = re.search(r'var PRED = (\[\[.*?\]\]);', geo)
    P = json.loads(pred.group(1))
    F['predio_m2'] = round(area_poligono(P))
    fuentes['predio_m2'] = 'diagrama/atlampa-geo.js, PRED (= Contexto.3dm site::polygon)'

    # ---- Industria: huella de la capa industry_bake - Copy (cara de abajo)
    m = rhino3dm.File3dm.Read(CONTEXTO)
    nombres = {l.Index: l.FullPath for l in m.Layers}
    ind_huella = None
    ind_poly = None
    cultura_x = []
    for o in m.Objects:
        ln = nombres.get(o.Attributes.LayerIndex, '')
        g = o.Geometry
        if ln == 'industry_bake - Copy':
            bb = g.GetBoundingBox()
            z0 = bb.Min.Z
            segs = []
            for e in g.Edges:
                a, c = e.PointAtStart, e.PointAtEnd
                if abs(a.Z - z0) < 1 and abs(c.Z - z0) < 1:
                    segs.append(((a.X / 1000 + RX, a.Y / 1000 + RY), (c.X / 1000 + RX, c.Y / 1000 + RY)))
            lazo = [segs[0][0], segs[0][1]]
            segs.pop(0)
            while lazo[-1] != lazo[0] and segs:
                for i, t in enumerate(segs):
                    if t[0] == lazo[-1] or t[1] == lazo[-1]:
                        lazo.append(t[1] if t[0] == lazo[-1] else t[0])
                        segs.pop(i)
                        break
                else:
                    break
            ind_huella = round(area_poligono(lazo))
            ind_poly = lazo
            ind_z = [round(z0 / 1000, 2), round(bb.Max.Z / 1000, 2)]
    F['industria'] = {'huella_m2': ind_huella, 'z_m': ind_z}
    fuentes['industria'] = 'Rhino/Contexto.3dm, capa industry_bake - Copy (huella = cara inferior)'

    # ---- Estructura: miembros de la V4 en Contexto.3dm (conteo por capa)
    conteo = Counter()
    for o in m.Objects:
        ln = nombres.get(o.Attributes.LayerIndex, '')
        if ln.startswith('V4 claude::Base::'):
            tipo = ln.split('::')[-1]
            conteo['columnas' if tipo == 'Columnas' else 'trabes'] += 1
    F['estructura'] = {'columnas_v4': conteo['columnas'], 'trabes_v4': conteo['trabes'],
                       'tonelaje_v2_t': 2385, 'nota_tonelaje': 'Modelo V2 (nuevos bloques_V2 claude.3dm), no es la V4; ver handoff/procesos/estructura.md'}
    fuentes['estructura'] = 'Rhino/Contexto.3dm, capas V4 claude::Base::B1–B8 (Columnas / Trabes U / Trabes V); tonelaje: handoff/procesos/estructura.md'

    # ---- Mercado: se corre prepara-mercado.py a un archivo temporal (no toca atlampa-mercado.js)
    prep = open(os.path.join(AQUI, 'prepara-mercado.py'), encoding='utf-8').read()
    tmp = tempfile.mkdtemp()
    salida_tmp = os.path.join(tmp, 'mercado_tmp.js').replace('\\', '/')
    prep = re.sub(r"^SALIDA = .*$", "SALIDA = r'%s'" % salida_tmp, prep, flags=re.M)
    prep = re.sub(r"^AQUI = .*$", "AQUI = r'%s'" % AQUI.replace('\\', '/'), prep, flags=re.M)
    prep = re.sub(r"^RAIZ = .*$", "RAIZ = r'%s'" % RAIZ.replace('\\', '/'), prep, flags=re.M)
    prep = re.sub(r"^FUENTE = .*$", "FUENTE = r'%s'" % CONTEXTO.replace('\\', '/'), prep, flags=re.M)
    ruta = os.path.join(tmp, 'run_mercado.py')
    open(ruta, 'w', encoding='utf-8').write(prep)
    sal = subprocess.run([sys.executable, '-I', ruta], capture_output=True, text=True, cwd=tmp).stdout
    paso3 = next((json.loads(l[len('paso 3 '):]) for l in sal.splitlines() if l.startswith('paso 3 ')), {})
    huellas = next((l for l in sal.splitlines() if l.startswith('huellas de nave')), '')
    naves = re.findall(r'\[([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\]', huellas)
    naves_m2 = [round((float(b[2]) - float(b[0])) * (float(b[3]) - float(b[1]))) for b in naves]
    F['comercio'] = {'puestos': paso3.get('puestos'), 'puesto_nominal_m': [2.5, 2.0], 'puesto_nominal_m2': 5.0,
                     'puesto_min_m2': 4.0, 'naves_m2': naves_m2, 'naves_total_m2': sum(naves_m2),
                     'hoyo_m2': paso3.get('hoyo_m2'), 'jardin_m2': paso3.get('jardin_m2'),
                     'plataformas_m2': paso3.get('plataformas_m2'), 'arboles': paso3.get('arboles'),
                     'patios': paso3.get('patios')}   # patios del aro (tezontle, arriates, bancas): mismo script, 2026-10-12
    fuentes['comercio'] = 'diagrama/herramientas/prepara-mercado.py (corrido a temporal; paso 3 y huellas de nave). Huellas = rectángulos envolventes'

    # ---- Paisaje: laguna (atlampa-paisaje.js, laguna.r)
    pai = open(os.path.join(RAIZ, 'atlampa-paisaje.js'), encoding='utf-8').read()
    lg = re.search(r'"laguna":\{"c":\[[^\]]*\],"r":([\d.]+)', pai)
    F['paisaje'] = {'laguna_m2': round(math.pi * float(lg.group(1)) ** 2) if lg else None}
    fuentes['paisaje'] = 'diagrama/atlampa-paisaje.js, laguna.r (círculo)'

    # ---- Estacionamiento: cajones por sótano (handoff) × 4 sótanos
    F['estacionamiento'] = {'cajones_por_sotano': M('estacionamiento', 'cajones_por_sotano'), 'sotanos': M('estacionamiento', 'sotanos'),
                            'cajones_total': M('estacionamiento', 'cajones_por_sotano') * M('estacionamiento', 'sotanos'), 'entrepiso_m': M('estacionamiento', 'entrepiso_m')}
    fuentes['estacionamiento'] = 'programa/datos/manual.json (cajones norte 130 + sur 133 por sótano, DWG 2026-10-11; handoff/procesos/paisaje-y-estacionamiento.md)'

    # ---- Arte y cultura y aro: manual (no hay área en archivo)
    F['cultura'] = {k: M('cultura', k) for k in ('construido_m2', 'plaza_m2', 'lamina_m2', 'huella_m2')}
    fuentes['cultura'] = ('programa/datos/manual.json: ' + 'manual: 1,180 m² construidos (2 pabellones, fondo 12 m) y plaza 1,645 m² de la propuesta del visor '
                          '(handoff/procesos/arte-cultura-y-aro.md); lámina 2,000 m²; huella = mitad de 1,180 m² (supuesto)')

    # ---- Espacio público y áreas verdes: predio − construcciones en planta
    comercio_huella = F['comercio']['naves_total_m2']
    cultura_huella = F['cultura']['huella_m2']
    libre = F['predio_m2'] - comercio_huella - (ind_huella or 0) - cultura_huella
    F['publico'] = {'libre_m2': libre, 'pct': round(100 * libre / F['predio_m2'], 1), 'resta': {
        'naves_m2': comercio_huella, 'industria_m2': ind_huella, 'cultura_m2': cultura_huella}}
    fuentes['publico'] = 'predio − naves − industria − mitad de cultura (cálculo; ver figuras anteriores)'

    # ---- Árboles: en el predio y alrededor (banqueta/calle). Fuente: programa/datos/arboles.json (lista de árboles del visor)
    from shapely.geometry import Point as _Pt, Polygon as _Pg
    ctx = json.load(open(os.path.join(PROG, 'datos', 'arboles.json'), encoding='utf-8'))
    pred_pg, gup_pg = _Pg(ctx['PRED']), _Pg(ctx['GUP'])
    arb = ctx['arboles']
    en_predio = sum(pred_pg.contains(_Pt(a[0], a[1])) for a in arb)
    en_banqueta = sum(gup_pg.contains(_Pt(a[0], a[1])) and not pred_pg.contains(_Pt(a[0], a[1])) for a in arb)
    F['arboles'] = {'total': len(arb), 'en_predio': en_predio, 'en_banqueta': en_banqueta,
                    'fuera_del_predio': len(arb) - en_predio - en_banqueta,
                    'altura_m': [round(min(a[2] for a in arb), 1), round(max(a[2] for a in arb), 1)],
                    'copa_radio_m': [round(min(a[3] for a in arb), 1), round(max(a[3] for a in arb), 1)]}
    fuentes['arboles'] = 'programa/datos/arboles.json (arboles: u, v, altura, radio; copia de Plantas/dwg/_contexto.json), contra PRED y GUP. Árboles de banqueta: quitados en el visor (ver handoff/procesos/paisaje-y-estacionamiento.md)'

    # ---- Potencial: CAS, COS, CUS (ver potencial() abajo)
    F['potencial'] = potencial(m, ind_poly, F, P)
    fuentes['potencial'] = ('calculado: predio (PRED), proyección de módulos (Contexto.3dm, mallas), naves (prepara-mercado), '
                            'industria (Contexto.3dm), aro (Diag::ring, ANILLO en atlampa-geo.js), arte y cultura y estacionamiento en programa/datos/manual.json')

    return F, fuentes


# Naves de comercio (rectángulos envolventes, en el marco del visor): mismo dato que NAVES_P en prepara-mercado.py
NAVES_P = [(522.181, 417.865, 558.945, 488.266), (504.601, 323.588, 558.946, 396.78)]
ARO = {'u': 505.75, 'v': 409.05, 'ri': 39.5, 're': 46.55}   # aro: centro y radios del anillo (atlampa-geo.js, ANILLO)
CAJON_M2 = M('estacionamiento', 'm2_por_cajon')                                    # supuesto, ver datos/manual.json
CAS_MIN, COS_MAX, CUS_MAX = M('normas', 'CAS_min'), M('normas', 'COS_max'), M('normas', 'CUS_max')


def potencial(m, ind_poly, F, P):
    """CAS, COS y CUS del predio. Desplante = proyección en planta de lo construido.
    COS en PB = sólo lo que toca el piso (naves, industria, arte y cultura); COS proyección = incluye lo elevado (vivienda, aro)."""
    from shapely.geometry import Point, Polygon
    from shapely.ops import unary_union
    predio = Polygon(P).area
    predio_norma = round(predio)  # misma superficie de predio que publica el programa

    # Vivienda: proyección de las mallas de los 917 módulos
    tris = []
    nm = {l.Index: l.FullPath for l in m.Layers}
    for o in m.Objects:
        ln = nm.get(o.Attributes.LayerIndex, '')
        if 'dulo' not in ln or type(o.Geometry).__name__ != 'Mesh':
            continue
        g = o.Geometry
        V = [(p.X / 1000 + RX, p.Y / 1000 + RY) for p in g.Vertices]
        for f in g.Faces:
            tris.append(Polygon([V[f[0]], V[f[1]], V[f[2]]]))
            if f[2] != f[3]:
                tris.append(Polygon([V[f[0]], V[f[2]], V[f[3]]]))
    viv_proy = unary_union([t.buffer(0) for t in tris if t.is_valid and t.area > 0])

    # Naves, industria, aro
    naves = unary_union([Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]) for x0, y0, x1, y1 in NAVES_P])
    ind = Polygon(ind_poly) if ind_poly else Polygon()
    aro = Point(ARO['u'], ARO['v']).buffer(ARO['re'], 256).difference(Point(ARO['u'], ARO['v']).buffer(ARO['ri'], 256))
    cultura_huella = F['cultura']['huella_m2']          # manual: no hay polígono de arte y cultura en el repo

    desplante_pb = naves.union(ind).area + cultura_huella
    desplante_proy = unary_union([naves, ind, viv_proy, aro]).area + cultura_huella

    # Construido sobre el nivel del piso (m²)
    modulos = 917                                      # 917 cajas de 22 m² en 8 niveles (ver handoff/procesos/vivienda-modulos.md)
    construido = {
        'vivienda (917 módulos × 22 m²)': 22 * modulos,
        'naves de comercio (huella, 1 nivel)': round(naves.area),
        'plataformas de lámina del mercado': F['comercio']['plataformas_m2'],
        'industria (huella, 1 nivel: niveles por confirmar)': round(ind.area),
        'arte y cultura (manual)': F['cultura']['construido_m2'],
        'aro (losa anillo, puede traslapar cultura)': round(aro.area),
    }
    sobre_piso = sum(construido.values())
    sotanos_m2 = round(CAJON_M2 * F['estacionamiento']['cajones_total'])   # cajones × m² por cajón (supuesto); SOTANOS sólo informa
    cus_sobre = sobre_piso / predio
    cus_total = (sobre_piso + sotanos_m2) / predio

    cos_pb = desplante_pb / predio
    cos_proy = desplante_proy / predio
    return {
        'predio_m2': round(predio),
        'norma': {'CAS_min': CAS_MIN, 'COS_max': COS_MAX, 'CUS_max': CUS_MAX},
        'construido_m2': construido,
        'sobre_piso_m2': round(sobre_piso),
        'sotanos_m2': sotanos_m2,
        'desplante_max_m2': round(COS_MAX * predio_norma),
        'maximo_construible_m2': round(CUS_MAX * COS_MAX * predio_norma, 1),   # CUS × desplante máximo (COS_max × predio), no × predio
        'CUS_max_sobre_predio': round(CUS_MAX * COS_MAX, 2),
        'desplante_pb_m2': round(desplante_pb),
        'desplante_proy_m2': round(desplante_proy),
        'COS_pb': round(cos_pb, 5), 'COS_proy': round(cos_proy, 5),
        'CAS_proy': round(1 - cos_proy, 5), 'CAS_pb': round(1 - cos_pb, 5),
        'CUS_sobre_piso': round(cus_sobre, 2), 'CUS_con_sotanos': round(cus_total, 2),
        'cumple_CAS': (1 - cos_proy) >= CAS_MIN, 'cumple_COS': cos_proy <= COS_MAX,
        'cumple_CUS': sobre_piso <= CUS_MAX * COS_MAX * predio_norma,
        'nota': ('La proyección de vivienda y el aro son elevados: si la norma sólo cuenta lo que toca el piso, '
                 'usa COS_pb y CAS_pb. Los sótanos no cuentan para COS. El CUS máximo se aplica sobre el desplante máximo (COS_max × predio), no sobre el predio. Predio de geometría 18,305 m² (el dato del equipo, 18,200, difiere 0.6 %).'),
    }


if __name__ == '__main__':
    F, fuentes = figuras()
    out = {'generado': __import__('datetime').date.today().isoformat(), 'figuras': F, 'fuentes': fuentes}
    with open(SALIDA, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('escrito', SALIDA)
    print(json.dumps(F, ensure_ascii=False)[:1500])

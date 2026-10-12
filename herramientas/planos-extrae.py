"""Corre prepara-mercado.py sin tocar el visor y guarda, para los planos DWG, la
geometría (triángulos y aristas) más la lista de puestos y mesas (para hacerlos bloques).
Salida: Plantas/dwg/_datos-mercado.json"""
import importlib.util
import json
import math
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
SAL = os.path.join(RAIZ, 'Plantas', 'dwg')
os.makedirs(SAL, exist_ok=True)

spec = importlib.util.spec_from_file_location('pm', os.path.join(AQUI, 'prepara-mercado.py'))
pm = importlib.util.module_from_spec(spec)
sys.modules['pm'] = pm
spec.loader.exec_module(pm)

TMP = os.path.join(SAL, '_mercado.js')
pm.SALIDA = TMP
pm.planta_png = lambda *a, **k: None

REC = {'puestos': [], 'mesas': []}

_pg = pm.puesto_geo
def puesto_geo(S, L, pol, frentes, z):
    REC['puestos'].append({'pol': [list(map(lambda c: round(c, 3), p)) for p in pol.exterior.coords][:-1],
                           'frentes': [[list(map(lambda c: round(c, 3), p)) for p in f.coords] for f in frentes if f.geom_type == 'LineString'],
                           'z': round(z, 3)})
    return _pg(S, L, pol, frentes, z)
pm.puesto_geo = puesto_geo

ok = lambda a, b: abs(a - b) < 1e-3
_caja = pm.caja
def caja(tris, lins, u0, v0, z0, u1, v1, z1):
    if ok(abs(u1 - u0), pm.MESA['largo']) and ok(abs(v1 - v0), pm.MESA['ancho']) and ok(z1 - z0, 0.05):
        REC['mesas'].append({'c': [round((u0 + u1) / 2, 3), round((v0 + v1) / 2, 3)], 'rot': 0.0, 'z': round(z0 - 0.70, 3)})
    return _caja(tris, lins, u0, v0, z0, u1, v1, z1)
pm.caja = caja

_cr = pm.caja_ret
def caja_ret(tris, lins, a0, b0, a1, b1, z0, z1, aristas=True):
    if ok(a1 - a0, pm.MESA['largo']) and ok(b1 - b0, pm.MESA['ancho']) and ok(z1 - z0, 0.05):
        c = pm.de_ret((a0 + a1) / 2, (b0 + b1) / 2)
        REC['mesas'].append({'c': [round(c[0], 3), round(c[1], 3)], 'rot': math.degrees(pm.GV), 'z': round(z0 - 0.70, 3)})
    return _cr(tris, lins, a0, b0, a1, b1, z0, z1, aristas)
pm.caja_ret = caja_ret

pm.main()
txt = open(TMP, encoding='utf-8').read()
datos = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
os.remove(TMP)
datos['REC'] = REC
datos['const'] = {k: getattr(pm, k) for k in ('Z_PISO', 'Z_VIGA', 'PERALTE', 'Z_PUNTAL', 'COL', 'VIGA_B', 'PUNTAL', 'PAR', 'EJES_U', 'V_POSTES', 'MUROS', 'ZANJA', 'TRAMO', 'PUESTO', 'MESA', 'JUNTA', 'VALLE')}
datos['const']['COLUMNAS_ACERO'] = pm.COLUMNAS_ACERO
datos['const']['SUR'] = {k: v for k, v in pm.SUR.items() if isinstance(v, (int, float, tuple, list))}
json.dump(datos, open(os.path.join(SAL, '_datos-mercado.json'), 'w', encoding='utf-8'))
print('puestos', len(REC['puestos']), 'mesas', len(REC['mesas']))

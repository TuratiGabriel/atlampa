"""Arte y cultura detallado → atlampa-3d-cultura.js (módulo ES para el motor 3D).

    python herramientas/prepara-cultura.py      (desde diagrama/)

Lee dos hojas de Diego SIN modificarlas:
  · modelo/arte_y_cultura_plantas.html: el edificio vigente (hoja de plantas v22):
    placas N1, N2 y azotea, salas, auditorio, columnas, escaleras X1–X6, módulos de
    cada nivel, sombrillas (las del edificio y las del tramo este del aro) y la
    azotea con los descansos de X3 y X6 (RFg), donde se ensancha el aro.
  · modelo/arte_y_cultura_concepto.html: las funciones de geometría de su visor
    (extr, walls, ribbon, sector…) y la parte de window.AC que traza las escaleras
    (Rc, ringP, laneFn, flights). laneFn se ajusta para que las escaleras traseras
    (X4–X6) sigan el eje del aro de proyecto (C, R0, BULGE).
Encima va construye(): las mallas y líneas del edificio por papel (losa, núcleo,
estructura, sombrillas, escaleras, auditorio) en su sistema local (x, z arriba, −y).
Sin la azotea (es el aro del conjunto, que se ensancha sobre `azotea`), sin la
estructura en X (solo columnas) y sin rampas.
Su sistema es el de Rhino: al diagrama se pasa con la misma traslación que los
módulos (campo 'lat'): +497.9986, +392.0954 y +0.52 m.

prepara-modulos.py lee la línea 4 de la salida (window.DATA) para la azotea: no
cambiar el orden de las primeras líneas.
"""
import json
import math
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
MODELO = os.path.join(RAIZ, 'modelo')


def fuente(nombre):
    # la carpeta del proyecto (si está junto a diagrama/) o la copia del repo, diagrama/modelo/
    p = os.path.join(os.path.dirname(RAIZ), nombre)
    return p if os.path.exists(p) else os.path.join(MODELO, nombre)


CONCEPTO = fuente('arte_y_cultura_concepto.html')
PLANTAS = os.path.join(MODELO, 'arte_y_cultura_plantas.html')
SALIDA = os.path.join(RAIZ, 'atlampa-3d-cultura.js')

CONSTRUYE = r'''
// ---------- construcción para el visor de Atlampa (sin contexto ni vidrios) ----------
export const DX = 497.9986, DY = 392.0954, DZ = 0.52;   // con los módulos, donde están en Contexto.3dm (2026-10-09)
export function construye() {
  const P = { losa: [], nucleo: [], acero: [], aro: [], escalera: [], auditorio: [] }, L = { parteluz: [], huella: [], borde: [] };
  P.auditorio.push(walls(D.BOWL, F.zPit, 0), flat(D.BOWL, F.zPit));
  const rowD = (F.rout - F.rin) / F.rows;
  for (let k = 0; k < F.rows; k++) P.auditorio.push(extr(sector(S, F.rin + rowD * k, F.rin + rowD * (k + 1), F.b0, F.b1), F.zPit, F.zPit + F.rise * (k + 1)));
  P.auditorio.push(extr(sector(S, F.st0, F.st1, F.sb0, F.sb1), F.zPit, F.zStage));
  // (2026-10-13, hoja de plantas v22) solo columnas, sin estructura en X; las que llevan sombrilla siguen a +15.00 y abren una losa de un módulo
  const conUmb = new Set((D.umb || []).filter(p => !p.ring).map(p => p.i + ',' + p.j));
  for (const p of (D.umb || []).filter(p => p.ring)) { const g = new THREE.CylinderGeometry(.27, .22, LV.PAD - p.base, 12); g.translate(p.x, (p.base + LV.PAD) / 2, -p.y); P.acero.push(g); }
  for (const c of D.cols) for (const [a, b] of [[0, LV.N1 - LV.slab], [LV.N1, LV.N2 - LV.slab], [LV.N2, LV.RF - LV.slab]].concat(conUmb.has(c.i + ',' + c.j) ? [[LV.RF, LV.PAD]] : [])) { const g = new THREE.CylinderGeometry(.3, .3, b - a, 10); g.translate(c.x, (a + b) / 2, -c.y); P.acero.push(g); }
  // (su aro y sus columnas no van: en el diagrama manda el aro de siempre, más grande)
  for (const p of (D.umb || [])) P.aro.push(boxFrom(p.P, LV.PAD, LV.PAD + .4));
  // (la azotea no es losa suya: es el aro, que se ensancha sobre ella; sus vigas sí)
  for (const [Q, top] of [[D.N1, LV.N1], [D.N2, LV.N2], [D.RF, LV.RF]]) {
    if (Q !== D.RF) P.losa.push(extr(Q, top - LV.slab, top));
    const b = beamsUnder(Q, top - LV.slab); if (b) P.acero.push(b);
  }
  for (const [E, z0, z1] of [[D.E1, LV.N1, LV.N2 - LV.slab], [D.E2, LV.N2, LV.RF - LV.slab]]) L.parteluz.push(mullions(E, z0, z1, 2.75));
  for (const [Q, z] of [[D.N1, LV.N1], [D.N2, LV.N2]]) L.borde.push(new THREE.BufferGeometry().setFromPoints(Q.concat([Q[0]]).flatMap((p, i, a) => i ? [new THREE.Vector3(a[i - 1][0], z + 1, -a[i - 1][1]), new THREE.Vector3(p[0], z + 1, -p[1])] : [])));
  const zOf = { PIT: LV.PIT, PB: 0, N1: LV.N1, N2: LV.N2, RF: LV.RF };
  for (const m of D.mods) { const z0 = zOf[m.lv], h = m.u === 'ban0' ? .45 : LV.mod; (m.u === 'core' ? P.nucleo : P.losa).push(boxFrom(m.P, z0, z0 + h)); }
  // escaleras en X: X1–X3 al frente y X4–X6 atrás (las traseras siguen el eje del aro de proyecto); X3 y X6 llegan al aro
  for (const st of D.stairs) {
    for (const f of AC.flights(st)) {
      const n = Math.max(10, Math.ceil(Math.abs(f.a1 - f.a0) / 1)), s = [];
      for (let i = 0; i <= n; i++) { const a = f.a0 + (f.a1 - f.a0) * i / n; const q = f.fn(a); s.push({ p: q.p, n: q.n, z: f.z0 + (f.z1 - f.z0) * i / n }); }
      P.escalera.push(ribbon(s, .6, .3, .95)); L.huella.push(treads(f.fn, f.a0, f.a1, f.z0, f.z1, .6));
    }
    const am = (st.a0 + st.a1) / 2, zm = (st.z0 + st.z1) / 2, q0 = AC.laneFn(st, 0), q1 = AC.laneFn(st, 1), da = 1.3 / (st.ring ? AC.Rc(am) + st.lanes[0] : st.lanes[0]) / deg;
    const mid = a => { const p = q0(a), q = q1(a); return { p: [(p.p[0] + q.p[0]) / 2, (p.p[1] + q.p[1]) / 2], n: p.n }; }, hw = Math.abs(st.lanes[1] - st.lanes[0]) / 2 + .6, s2 = [];
    for (let i = 0; i <= 6; i++) { const a = am - da + 2 * da * i / 6; const q = mid(a); s2.push({ p: q.p, n: q.n, z: zm }); }
    P.escalera.push(ribbon(s2, hw, .3, 0));
  }

  const mallas = {}, lineas = {};
  for (const k in P) if (P[k].length) mallas[k] = mergeGeometries(P[k].map(g => g.index ? g.toNonIndexed() : g).map(g => { for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a); return g; }));
  for (const k in L) if (L[k].length) lineas[k] = mergeGeometries(L[k]);
  // lo que pisa en planta baja (para no poner paisaje ahí): el foso del
  // auditorio y los módulos de planta baja; y la huella del nivel 1 (los
  // árboles no caben bajo la losa)
  const enDiagrama = Q => Q.map(p => [p[0] + DX, p[1] + DY]);
  const pisa = [enDiagrama(D.BOWL)].concat(D.mods.filter(m => m.lv === 'PB' || m.lv === 'PIT').map(m => enDiagrama(m.P)));
  // columnas de la retícula, para el mapa Nolli
  const cols = D.cols.map(c => [c.x + DX, c.y + DY]);
  return { mallas, lineas, pisa, losa1: enDiagrama(D.N1), azotea: enDiagrama(D.RFg || D.RF), cols };
}
'''


def r2(v):
    return math.floor(v * 100 + 0.5) / 100


def datos_del_edificio():
    """window.DATA para el visor, a partir de los datos de la hoja de plantas."""
    s = open(PLANTAS, encoding='utf-8').read()
    i = s.index('const D=') + len('const D=')
    j = s.index(';const LY=D.LY', i)
    hoja = json.loads(s[i:j])
    v, ly = hoja['V3'], hoja['LY']
    # módulos de cada nivel (las islas de estar de la azotea van bajas, como bancas)
    mods = []
    for lv in ('PB', 'N1', 'N2', 'RF'):
        for m in ly[lv]['mods']:
            mods.append({'lv': lv, 'u': 'ban0' if m['type'] == 'est' else m['type'], 'i': m['i'], 'j': m['j'], 'P': m['P']})
    # sombrillas: losa de un módulo (5.5 × 4, girada −10°) centrada en su columna
    a = math.radians(-10)
    u, w = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    umb = []
    for p in v['pads']:
        P = [[r2(p['x'] + s1 * 2.75 * u[0] + s2 * 2 * w[0]), r2(p['y'] + s1 * 2.75 * u[1] + s2 * 2 * w[1])]
             for s1, s2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        q = {'x': p['x'], 'y': p['y'], 'ring': bool(p.get('ring')), 'base': p.get('base') or 0, 'P': P}
        for c in v['cols']:
            if math.hypot(c['x'] - p['x'], c['y'] - p['y']) < 0.05:
                q['i'], q['j'] = c['i'], c['j']
        umb.append(q)
    return {'C': v['C'], 'R0': v['R0'], 'RW': v['RW'], 'BULGE': v['BULGE'], 'S': v['S'], 'FAN': v['FAN'], 'lat': v['lat'], 'lv': v['lv'],
            'N1': v['N1'], 'N2': v['N2'], 'RF': v['RF'], 'RFg': v['RFg'], 'E1': v['E1'], 'E2': v['E2'], 'BOWL': v['BOWL'],
            'mods': mods, 'cols': [{'x': c['x'], 'y': c['y'], 'i': c['i'], 'j': c['j']} for c in v['cols']], 'par': [], 'umb': umb,
            'stairs': v['stairs'], 'grid': {'planes': []}}


def main():
    s = open(CONCEPTO, encoding='utf-8').read()
    clasicos = re.findall(r'<script>(.*?)</script>', s, re.S)
    ac = clasicos[1]
    corte = ac.index('window.AC=')
    corte = ac.index(';', corte) + 1
    ac = ac[:corte] + '\n})();\n'
    # escaleras traseras: carriles medidos desde el eje del aro de proyecto
    viejo = 'function laneFn(st,k){const r=st.lanes[k];return a=>'
    if viejo not in ac:
        raise SystemExit('No encontré laneFn en ' + CONCEPTO)
    ac = ac.replace(viejo, 'function laneFn(st,k){const r=st.lanes[k];if(st.ring)return a=>({p:ringP(a,r),n:[Math.cos(a*deg),Math.sin(a*deg)]});return a=>')
    modulo = re.search(r'<script type="module">(.*?)</script>', s, re.S).group(1)
    i = modulo.index('// ---------- geometría ----------')
    j = modulo.index('// ---------- materiales ----------')
    geo = modulo[i:j]
    k = modulo.index('function tube(')
    tube = modulo[k:modulo.index('\n', k)]
    datos = 'window.DATA=' + json.dumps(datos_del_edificio(), ensure_ascii=False, separators=(',', ':')) + ';'
    js = ('/* Generado por herramientas/prepara-cultura.py desde modelo/arte_y_cultura_plantas.html (el edificio) y arte_y_cultura_concepto.html (la geometría): no editar a mano. */\n'
          "import * as THREE from 'three';\n"
          "import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';\n"
          + datos + '\n' + ac + '\n'
          + 'const D=window.DATA, AC=window.AC, deg=Math.PI/180, LV=D.lv, C=D.C, S=D.S, F=D.FAN, RW=D.RW;\n'
          + geo + '\n' + tube + '\n' + CONSTRUYE)
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('escrito', SALIDA, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()

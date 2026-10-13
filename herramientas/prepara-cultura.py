"""Arte y cultura detallado → atlampa-3d-cultura.js (módulo ES para el motor 3D).

    python herramientas/prepara-cultura.py      (desde diagrama/)

Lee ../arte_y_cultura_concepto.html (el concepto de arte y cultura: el aro como
edificio de tres niveles con auditorio hundido) SIN modificarlo y saca:
  · window.DATA (los datos) y la parte de window.AC que define la geometría
    (Rc, flights, gridMembers…), sin lo que dibuja las láminas de la página;
  · las funciones de geometría de su visor (extr, walls, ribbon, sector…).
Encima va construye(): las mallas y líneas del edificio por papel (losa,
núcleo, estructura, parasoles, escalera, auditorio) — sin su aro, que en el
diagrama es el de siempre (más grande) — en su sistema
local (x, z arriba, −y). Su sistema es el de Rhino: al diagrama se pasa con
la misma traslación que los módulos (su retícula es la de ellos, campo 'lat'):
+497.9986, +392.0954 y +0.52 m (revisado 2026-10-09: los módulos van donde
están en Rhino/Contexto.3dm, 0.41 y 0.37 m más allá que en nuevos bloques, y
0.20 más arriba; ver prepara-modulos.py).

OJO (2026-10-09): atlampa-3d-cultura.js trae cambios hechos directamente en
él que este guion no tiene (la azotea no es losa: es el aro; rampas por fuera
pegadas a la curva; sin la escalera X3). Correrlo los borra: pasarlos aquí antes.
OJO (2026-10-13): DATA.mods, DATA.umb y lv.PAD también se cambiaron a mano con la
distribución de la hoja de plantas v21 (modelo/arte_y_cultura_plantas.html).
"""
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FUENTE = os.path.join(os.path.dirname(RAIZ), 'arte_y_cultura_concepto.html')
# sin la carpeta del proyecto (colaboradores): la copia que va en el repo, diagrama/modelo/
if not os.path.exists(FUENTE):
    FUENTE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modelo', 'arte_y_cultura_concepto.html')
SALIDA = os.path.join(RAIZ, 'atlampa-3d-cultura.js')

CONSTRUYE = r'''
// ---------- construcción para el visor de Atlampa (sin contexto ni vidrios) ----------
export const DX = 497.9986, DY = 392.0954, DZ = 0.52;
export function construye() {
  const P = { losa: [], nucleo: [], acero: [], aro: [], escalera: [], auditorio: [] }, L = { parteluz: [], huella: [], borde: [] };
  P.auditorio.push(walls(D.BOWL, F.zPit, 0), flat(D.BOWL, F.zPit));
  const rowD = (F.rout - F.rin) / F.rows;
  for (let k = 0; k < F.rows; k++) P.auditorio.push(extr(sector(S, F.rin + rowD * k, F.rin + rowD * (k + 1), F.b0, F.b1), F.zPit, F.zPit + F.rise * (k + 1)));
  P.auditorio.push(extr(sector(S, F.st0, F.st1, F.sb0, F.sb1), F.zPit, F.zStage));
  for (const c of D.cols) for (const [a, b] of [[0, LV.N1 - LV.slab], [LV.N1, LV.N2 - LV.slab], [LV.N2, LV.RF - LV.slab], [LV.RF, LV.PAR]]) { const g = new THREE.CylinderGeometry(.3, .3, b - a, 10); g.translate(c.x, (a + b) / 2, -c.y); P.acero.push(g); }
  // (su aro y sus columnas no van: en el diagrama manda el aro de siempre, más grande)
  for (const m of AC.gridMembers()) P.acero.push(tube(m.a, m.b, m.post ? .17 : .12));
  for (const p of D.par) P.aro.push(boxFrom(p.P, LV.PAR, LV.PAR + .15));
  for (const [Q, top] of [[D.N1, LV.N1], [D.N2, LV.N2], [D.RF, LV.RF]]) {
    P.losa.push(extr(Q, top - LV.slab, top));
    const b = beamsUnder(Q, top - LV.slab); if (b) P.acero.push(b);
  }
  for (const [E, z0, z1] of [[D.E1, LV.N1, LV.N2 - LV.slab], [D.E2, LV.N2, LV.RF - LV.slab]]) L.parteluz.push(mullions(E, z0, z1, 2.75));
  for (const [Q, z] of [[D.N1, LV.N1], [D.N2, LV.N2], [D.RF, LV.RF]]) L.borde.push(new THREE.BufferGeometry().setFromPoints(Q.concat([Q[0]]).flatMap((p, i, a) => i ? [new THREE.Vector3(a[i - 1][0], z + 1, -a[i - 1][1]), new THREE.Vector3(p[0], z + 1, -p[1])] : [])));
  const zOf = { PIT: LV.PIT, PB: 0, N1: LV.N1, N2: LV.N2, RF: LV.RF };
  for (const m of D.mods) { const z0 = zOf[m.lv], h = m.u === 'ban0' ? .45 : LV.mod; (m.u === 'core' ? P.nucleo : P.losa).push(boxFrom(m.P, z0, z0 + h)); }
  for (const st of D.stairs) {
    for (const f of AC.flights(st)) {
      const n = Math.max(10, Math.ceil(Math.abs(f.a1 - f.a0) / 1)), s = [];
      for (let i = 0; i <= n; i++) { const a = f.a0 + (f.a1 - f.a0) * i / n; const q = f.fn(a); s.push({ p: q.p, n: q.n, z: f.z0 + (f.z1 - f.z0) * i / n }); }
      P.escalera.push(ribbon(s, .6, .3, .95)); L.huella.push(treads(f.fn, f.a0, f.a1, f.z0, f.z1, .6));
    }
    const am = (st.a0 + st.a1) / 2, zm = (st.z0 + st.z1) / 2, q0 = AC.laneFn(st, 0), q1 = AC.laneFn(st, 1), da = 1.3 / st.lanes[0] / deg;
    const mid = a => { const p = q0(a), q = q1(a); return { p: [(p.p[0] + q.p[0]) / 2, (p.p[1] + q.p[1]) / 2], n: p.n }; }, hw = (st.lanes[1] - st.lanes[0]) / 2 + .6, s2 = [];
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
  return { mallas, lineas, pisa, losa1: enDiagrama(D.N1), cols };
}
'''


def main():
    s = open(FUENTE, encoding='utf-8').read()
    clasicos = re.findall(r'<script>(.*?)</script>', s, re.S)
    datos = clasicos[0].strip()
    ac = clasicos[1]
    corte = ac.index('window.AC=')
    corte = ac.index(';', corte) + 1
    ac = ac[:corte] + '\n})();\n'
    modulo = re.search(r'<script type="module">(.*?)</script>', s, re.S).group(1)
    i = modulo.index('// ---------- geometría ----------')
    j = modulo.index('// ---------- materiales ----------')
    geo = modulo[i:j]
    k = modulo.index('function tube(')
    tube = modulo[k:modulo.index('\n', k)]
    js = ('/* Generado por herramientas/prepara-cultura.py desde arte_y_cultura_concepto.html: no editar a mano. */\n'
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

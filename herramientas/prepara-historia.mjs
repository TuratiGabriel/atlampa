// Datos del Modo historia (etapa 1 de la presentación final): toda la colonia
// Atlampa desde OpenStreetMap, en las coordenadas del visor.
//
//   node herramientas/prepara-historia.mjs <osm.json> [verdes.json]
//
// <osm.json> es la respuesta de Overpass a esta consulta (2026-11-24):
//   [out:json][timeout:240];rel(16820531);out geom;
//   (way["building"](19.4515,-99.1665,19.4665,-99.1445);rel["building"](...););out geom;
//   way["highway"](...);out geom;  way["railway"](...);out geom;
// (16820531 = límite administrativo "Atlampa", admin_level 10.)
// [verdes.json] (2026-11-24): parques y avenidas en 1.9 km alrededor del predio:
//   (way["leisure"~"^(park|garden|playground)$"](around:1900,19.4582,-99.1589);
//    relation["leisure"~"^(park|garden)$"](around:...); way["landuse"~"^(grass|recreation_ground|village_green)$"](around:...););out geom;
//   way["highway"~"^(motorway|trunk|primary|secondary)$"](around:...);out geom;
//
// Paso latitud/longitud → visor: proyección local en metros y una semejanza
// (giro, escala y traslado) ajustada por ICP contra los edificios del
// contexto del visor (Contexto.3dm de Gabriel, que también viene de OSM).
// Escribe atlampa-historia-datos.js en la raíz del repo.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const osm = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ctxVm = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'atlampa-datos.js'), 'utf8'), ctxVm);
const D = ctxVm.window.ATLAMPA_DATOS;

// proyección local (m), centrada cerca del predio
const LAT0 = 19.4582, LON0 = -99.1589, RT = 6378137, RAD = Math.PI / 180;
const ll = (lat, lon) => [(lon - LON0) * RAD * RT * Math.cos(LAT0 * RAD), (lat - LAT0) * RAD * RT];

const centro = q => { let x = 0, y = 0; q.forEach(p => { x += p[0]; y += p[1]; }); return [x / q.length, y / q.length]; };
const area = q => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a / 2; };
const pares = (a, d) => { const r = []; for (let i = d || 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };

// --- edificios OSM (anillo exterior), en metros locales
const edOsm = [];
osm.elements.forEach(e => {
  const t = e.tags || {};
  if (!t.building) return;
  let anillo = null;
  if (e.type === 'way' && e.geometry) anillo = e.geometry;
  else if (e.type === 'relation' && e.members) { const m = e.members.find(x => x.role === 'outer' && x.geometry); if (m) anillo = m.geometry; }
  if (!anillo || anillo.length < 4) return;
  let q = anillo.map(g => ll(g.lat, g.lon));
  if (Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 0.01) q = q.slice(0, -1);
  const niveles = parseFloat(t['building:levels']), alto = parseFloat(t.height);
  edOsm.push({ id: e.id, q, c: centro(q), a: Math.abs(area(q)), niveles, alto, tipo: t.building });
});

// --- ajuste: semejanza m → visor por ICP con los centroides de D.edificios
const edVis = D.edificios.map(f => { const q = pares(f, 1); return { c: centro(q), a: Math.abs(area(q)) }; });
function aplica(T, p) { return [T.s * (T.c * p[0] - T.n * p[1]) + T.tx, T.s * (T.n * p[0] + T.c * p[1]) + T.ty]; }
function semejanza(A, B) {   // A → B, mínimos cuadrados (Umeyama 2D)
  const ca = centro(A), cb = centro(B);
  let sxx = 0, sxy = 0, va = 0;
  A.forEach((a, i) => {
    const x = a[0] - ca[0], y = a[1] - ca[1], u = B[i][0] - cb[0], v = B[i][1] - cb[1];
    sxx += x * u + y * v; sxy += x * v - y * u; va += x * x + y * y;
  });
  const th = Math.atan2(sxy, sxx), s = Math.hypot(sxx, sxy) / va, c = Math.cos(th), n = Math.sin(th);
  return { s, c, n, th, tx: cb[0] - s * (c * ca[0] - n * ca[1]), ty: cb[1] - s * (n * ca[0] + c * ca[1]) };
}
// arranque: la retícula del visor está girada ~9.96°; el centro del predio
// (503.6, 402.05) cae cerca de (LAT0, LON0). Se prueban giros alrededor.
let mejor = null;
for (const g0 of [-9.96, 9.96, -10.5, 10.5, -9.4, 9.4]) {
  let T = { s: 1, c: Math.cos(g0 * RAD), n: Math.sin(g0 * RAD), tx: 503.6, ty: 402.05 };
  let rms = Infinity, n = 0;
  for (let it = 0; it < 40; it++) {
    const radio = it < 10 ? 25 : it < 20 ? 10 : 4;
    const A = [], B = [];
    edOsm.forEach(o => {
      if (o.a < 30) return;
      const p = aplica(T, o.c);
      if (p[0] < D.rect.u0 || p[0] > D.rect.u1 || p[1] < D.rect.v0 || p[1] > D.rect.v1) return;
      let bi = null, bd = radio;
      edVis.forEach(v => { const d = Math.hypot(v.c[0] - p[0], v.c[1] - p[1]); if (d < bd && Math.abs(v.a - o.a) < 0.35 * Math.max(v.a, o.a)) { bd = d; bi = v; } });
      if (bi) { A.push(o.c); B.push(bi.c); }
    });
    if (A.length < 20) break;
    T = semejanza(A, B);
    rms = Math.sqrt(A.reduce((s, a, i) => { const p = aplica(T, a); return s + (p[0] - B[i][0]) ** 2 + (p[1] - B[i][1]) ** 2; }, 0) / A.length);
    n = A.length;
  }
  if (n > 20 && (!mejor || n > mejor.n || (n === mejor.n && rms < mejor.rms))) mejor = { T, rms, n, g0 };
}
if (!mejor) throw new Error('no se pudo ajustar OSM al visor');
const T = mejor.T;
console.log('ajuste: giro %s°, escala %s, %d pares, rms %s m', (T.th / RAD).toFixed(3), T.s.toFixed(5), mejor.n, mejor.rms.toFixed(2));
const V = (lat, lon) => aplica(T, ll(lat, lon));
const r2 = x => Math.round(x * 100) / 100;
const plano = q => q.flatMap(p => [r2(p[0]), r2(p[1])]);
const R = D.rect, dentroRect = p => p[0] > R.u0 && p[0] < R.u1 && p[1] > R.v0 && p[1] < R.v1;

// --- límite de la colonia: se encadenan los tramos exteriores en un anillo
const rel = osm.elements.find(e => e.type === 'relation' && e.id === 16820531);
const tramos = rel.members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry).map(m => m.geometry.map(g => V(g.lat, g.lon)));
let anillo = tramos.shift();
while (tramos.length) {
  const fin = anillo[anillo.length - 1];
  let k = -1, inv = false, bd = Infinity;
  tramos.forEach((t, i) => {
    const d0 = Math.hypot(t[0][0] - fin[0], t[0][1] - fin[1]), d1 = Math.hypot(t[t.length - 1][0] - fin[0], t[t.length - 1][1] - fin[1]);
    if (d0 < bd) { bd = d0; k = i; inv = false; }
    if (d1 < bd) { bd = d1; k = i; inv = true; }
  });
  let t = tramos.splice(k, 1)[0]; if (inv) t = t.slice().reverse();
  anillo = anillo.concat(t.slice(1));
}
if (Math.hypot(anillo[0][0] - anillo[anillo.length - 1][0], anillo[0][1] - anillo[anillo.length - 1][1]) < 0.5) anillo.pop();

// --- edificios fuera del contexto del visor (dentro manda Contexto.3dm)
// altura: la de OSM si la hay; si no, estimada por su tamaño (esquemática)
function altura(o, i) {
  if (o.alto > 0) return o.alto;
  if (o.niveles > 0) return o.niveles * 3.1;
  let r = Math.sin(o.id * 12.9898) * 43758.5453; r -= Math.floor(r);
  if (o.a > 2500) return 8 + 4 * r;          // naves y bodegas
  if (o.a > 900) return 6.5 + 6 * r;         // 2 a 4 niveles
  return 3.2 + 6.4 * r;                      // 1 a 3 niveles
}
const edificios = [];
let estimadas = 0;
edOsm.forEach((o, i) => {
  const q = o.q.map(p => aplica(T, p)), c = centro(q);
  if (dentroRect(c)) return;
  if (!(o.alto > 0 || o.niveles > 0)) estimadas++;
  const a = area(q) < 0 ? q.slice().reverse() : q;   // ccw
  edificios.push([r2(altura(o, i))].concat(plano(a)));
});

// --- calles: ejes de OSM, con su jerarquía y sentido (para los coches)
const CLASE = { motorway: 'via', motorway_link: 'via', trunk: 'via', primary: 'mayor', secondary: 'mayor', secondary_link: 'mayor', tertiary: 'media', tertiary_link: 'media', residential: 'menor', living_street: 'menor', unclassified: 'menor' };
const calles = [];
osm.elements.forEach(e => {
  const t = e.tags || {};
  if (e.type !== 'way' || !t.highway || !CLASE[t.highway] || !e.geometry) return;
  const q = e.geometry.map(g => V(g.lat, g.lon));
  const sentido = t.oneway === 'yes' || t.oneway === '1' || /motorway/.test(t.highway) ? 1 : t.oneway === '-1' ? -1 : 0;
  calles.push({ n: t.name || '', c: CLASE[t.highway], s: sentido, p: plano(sentido === -1 ? q.reverse() : q) });
});
// --- vías del tren (activas, y las abandonadas aparte)
const tren = [], trenViejo = [];
osm.elements.forEach(e => {
  const t = e.tags || {};
  if (e.type !== 'way' || !t.railway || !e.geometry) return;
  const q = plano(e.geometry.map(g => V(g.lat, g.lon)));
  (t.railway === 'rail' ? tren : trenViejo).push(q);
});

// --- áreas verdes y avenidas alrededor (para la slide de áreas verdes)
const verdes = [], avenidas = [];
if (process.argv[3]) {
  const ov = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const dentroLim = p => { let k = false; for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) { const a = anillo[i], b = anillo[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) k = !k; } return k; };
  ov.elements.forEach(e => {
    const t = e.tags || {};
    if (t.highway && e.geometry) { avenidas.push(plano(e.geometry.map(g => V(g.lat, g.lon)))); return; }
    const clase = t.leisure || t.landuse;
    if (!clase) return;
    let geo = e.geometry;
    if (e.type === 'relation' && e.members) { const m = e.members.find(x => x.role === 'outer' && x.geometry); geo = m && m.geometry; }
    if (!geo || geo.length < 4) return;
    let q = geo.map(g => V(g.lat, g.lon));
    if (Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 0.01) q = q.slice(0, -1);
    const a = Math.abs(area(q));
    // jardines privados y pastos chicos fuera; plazas y parques, sí
    if ((clase === 'garden' && (a < 800 || t['garden:type'] === 'residential' || t.access === 'private')) || (clase === 'grass' && a < 300)) return;
    const c = centro(q);
    verdes.push({ n: t.name || '', c: clase, a: Math.round(a), dentro: dentroLim(c), p: plano(area(q) < 0 ? q.slice().reverse() : q) });
  });
  console.log('verdes %d (%d dentro de la colonia: %s), avenidas %d', verdes.length, verdes.filter(v => v.dentro).length,
    verdes.filter(v => v.dentro).map(v => (v.n || v.c) + ' ' + v.a + ' m²').join(', '), avenidas.length);
}

// --- puntos por coordenada geográfica (para el guion): se exporta la función inversa también
const salida = {
  fuente: 'OpenStreetMap (© colaboradores, ODbL), Overpass 2026-11-24; relación 16820531',
  ajuste: { giro: r2(T.th / RAD * 1000) / 1000, escala: T.s, rms: r2(mejor.rms), pares: mejor.n, T: [T.s, T.c, T.n, T.tx, T.ty], LAT0, LON0 },
  limite: plano(anillo),
  edificios, estimadas,
  calles, tren, trenViejo, verdes, avenidas
};
const js = '/* Datos del Modo historia (etapa 1). Generado por herramientas/prepara-historia.mjs: no editar a mano.\n' +
  '   Colonia Atlampa completa: ' + salida.fuente + '.\n' +
  '   Edificios fuera del contexto del visor (dentro se usan los de Contexto.3dm). Alturas estimadas en ' + estimadas + ' de ' + edificios.length + '. */\n' +
  'window.ATLAMPA_HISTORIA_DATOS = ' + JSON.stringify(salida) + ';\n';
fs.writeFileSync(path.join(RAIZ, 'atlampa-historia-datos.js'), js);
console.log('edificios %d (alturas estimadas %d), calles %d, tren %d, límite %d vértices, %s KB', edificios.length, estimadas, calles.length, tren.length, anillo.length, (js.length / 1024).toFixed(0));
const us = anillo.map(p => p[0]), vs = anillo.map(p => p[1]);
console.log('caja del límite: u %s–%s, v %s–%s', Math.min(...us).toFixed(0), Math.max(...us).toFixed(0), Math.min(...vs).toFixed(0), Math.max(...vs).toFixed(0));

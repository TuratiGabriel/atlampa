/* ============================================================
   ATLAMPA — el dibujo en 3D (Three.js, WebGL)
   Misma interfaz que atlampa-contexto.js (crea(svg, {escena}) → vista,
   capa, acerca…), así que el tablero no cambia. La geometría se arma UNA vez
   en coordenadas del mundo y la tarjeta de video sólo mueve la cámara: girar
   no recalcula nada. Las líneas ocultas las resuelve el depth buffer.

   Datos y cálculos: los del motor SVG (window.AtlampaContexto.geo): naves
   recortadas por el aro, plantas, árboles, sol, laguna…

   Mundo: x = u − CEN.u (este-oeste del modelo), y = z (arriba),
          z = −(v − CEN.v). La cámara usa el mismo azimut y altura que el SVG.

   Estilos: cada cosa tiene un papel (suelo, predio, verde, agua, proyecto,
   módulos, vegetación…). Un estilo es una tabla papel → relleno, rayado y
   arista; cambiar de estilo es cambiar uniforms, no geometría.
     rayado  como la referencia: sin grises, el tono es la densidad de un
             rayado fino (más luz = más rayas); aristas blancas; perspectiva.
     plano   el de siempre: rellenos grises con luz y sombra, aristas.

   Fase 1: sitio, naves, industria, chimenea, cultura, aro, módulos,
   paisaje, estructura, estacionamiento (en rayos X) y sol. Pendiente:
   contexto urbano, personas, flujos, árboles de banqueta, rótulos de calles.
   ============================================================ */
import * as THREE from 'three';

const G = window.AtlampaContexto.geo;
// Extras (fase 2: contexto urbano, árboles de banqueta, postes, flujos,
// rótulos de calles) en su propio archivo; si no está, el motor sigue igual.
const VER = import.meta.url.split('?')[1] || '';
const EXTRAS = await import('./atlampa-3d-ctx.js' + (VER ? '?' + VER : '')).then(m => m, () => null);
// Arte y cultura detallado (arte_y_cultura_concepto.html, por herramientas/prepara-cultura.py):
// va en todas las escenas, en lugar de los pabellones simples.
const CULTURA_DET = await import('./atlampa-3d-cultura.js' + (VER ? '?' + VER : '')).then(m => m, e => { console.warn('Sin arte y cultura detallado:', e); return null; });
const { PB, GU, GF, S, HE, CEN, PIEZAS, ANILLO, CORTE, COLUMNAS, ESPUELA, ESP_FIN, CULTURA, PLAZA_C, GIRO, MOD, EST, PAI, MEX, MEY } = G;
const RAD = Math.PI / 180;

/* ---------- Coordenadas ---------- */
const W = (u, v, z) => [u - CEN[0], z, -(v - CEN[1])];

/* ---------- Estilos ---------- */
const PAPELES = ['suelo', 'calle', 'banqueta', 'predio', 'plaza', 'verde', 'tezontle', 'agua', 'filtro', 'proyecto', 'nave', 'industria', 'cultura', 'aro', 'modulo', 'arbusto', 'copa', 'est'];
const ESTILOS = {
  rayado: {
    // Croquis + rayado (lo que escogió Gabriel): los volúmenes sólo con sus
    // aristas a mano (un trazo delgado que se pasa de las esquinas), las caras
    // negras sin relleno; el piso con el rayado horizontal, tenue; el blanco,
    // bajado (blanco: lo que pesan las aristas).
    fondo: '#000000', perspectiva: true, blanco: 0.72,
    papel: {
      suelo: { tono: 0.13, paso: 2.6, arista: 0.2 }, calle: { tono: 0.06, paso: 3.4, arista: 0.25 }, banqueta: { tono: 0.18, paso: 2.2, arista: 0.4 },
      predio: { tono: 0.18, paso: 2.4, arista: 0.7 }, plaza: { tono: 0.25, paso: 2, arista: 0.5 }, verde: { tono: 0.16, paso: 2.6, arista: 0 },
      tezontle: { tono: 0.25, paso: 1.8, arista: 0 }, agua: { tono: 0.08, paso: 5, arista: 0.6 }, filtro: { tono: 0.2, paso: 2.2, arista: 0.4 },
      nave: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 }, industria: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 },
      cultura: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 }, aro: { modo: 2, tono: 0, gris: 0.025, arista: 0.95 },
      modulo: { modo: 2, tono: 0, gris: 0.02, arista: 0.8 }, arbusto: { tono: 0.5, paso: 2.2, grueso: 0.35, arista: 0 },
      copa: { tono: 0.5, paso: 2.4, grueso: 0.35, arista: 0 }, est: { tono: 0.1, paso: 6, arista: 0.4 }, proyecto: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 }
    },
    lineas: { pasto: 0.36, flor: 0.85, junco: 0.34, tronco: 0.45, sendero: 0.3, rayo: 0.14, columna: 0.4, est: 0.3, sol: 0.45 }
  },
  plano: {
    fondo: '#000000', perspectiva: false,
    // modo 1: relleno gris con luz
    papel: {
      suelo: { gris: 0.045, arista: 0.15 }, calle: { gris: 0.02, arista: 0.2 }, banqueta: { gris: 0.075, arista: 0.32 }, predio: { gris: 0.065, arista: 0.75 },
      plaza: { gris: 0.1, arista: 0.4 }, verde: { gris: 0.07, arista: 0 }, tezontle: { gris: 0.1, arista: 0 }, agua: { gris: 0.04, arista: 0.5 },
      filtro: { gris: 0.09, arista: 0.35 }, nave: { gris: 0.17, arista: 0.95 }, industria: { modo: 2, tono: 0.7, paso: 2.4, gris: 0.04, arista: 0.85 }, cultura: { gris: 0.18, arista: 0.95 },
      aro: { gris: 0.24, arista: 1 }, modulo: { gris: 0.55, arista: 0.6 }, arbusto: { gris: 0.12, arista: 0 }, copa: { gris: 0.1, arista: 0 },
      est: { gris: 0.05, arista: 0.4 }, proyecto: { gris: 0.17, arista: 1 }
    },
    lineas: { pasto: 0.32, flor: 0.85, junco: 0.3, tronco: 0.4, sendero: 0.3, rayo: 0.15, columna: 0.4, est: 0.3, sol: 0.45 }
  }
};
// colores del programa (lámina de usos), para el modo Color
// (en tonos claros: sobre el fondo negro tienen que leerse)
const PROGRAMA = { vivienda: '#ff5cb0', comercio: '#8a98ff', industria: '#d2d4d8', publico: '#ff6f63', cultura: '#c9a6ff', verde: '#a8e063', agua: '#8fd0ff', tez: '#ff9a6b', est: '#d2d4d8' };
// qué programa / espacio es cada papel
const PROG_DE = { nave: 'comercio', industria: 'industria', cultura: 'cultura', modulo: 'vivienda', aro: 'publico', predio: 'publico', plaza: 'publico', verde: 'verde', agua: 'agua', filtro: 'agua', tezontle: 'tez', arbusto: 'verde', copa: 'verde', est: 'est' };
// privado: los volúmenes de vivienda y la industria; lo demás es público
const ESPACIO_DE = { modulo: 'privado', industria: 'privado' };
// qué papeles resalta cada opción de Resaltar (y las líneas de plantas van con el paisaje)
const RESALTA_PAPELES = { modulos: ['modulo'], comercio: ['nave'], cultura: ['cultura', 'plaza'], industria: ['industria'], aro: ['aro'],
  paisajismo: ['verde', 'tezontle', 'agua', 'filtro', 'arbusto', 'copa'], estacionamiento: ['est'] };
const LINEAS_PAISAJE = ['pasto', 'flor', 'junco', 'tronco', 'sendero', 'rayo'];

const VERT = /* glsl */`
  varying vec3 vN; varying vec3 vW;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = m * instanceMatrix;
    #endif
    vec4 w = m * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(m) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const FRAG = /* glsl */`
  uniform vec3 uFondo; uniform vec3 uTinta; uniform float uModo; uniform float uTono; uniform float uPaso; uniform float uMundo;
  uniform float uGris; uniform float uOpacidad; uniform vec3 uLuz; uniform float uPx; uniform float uBrillo; uniform float uGrueso;
  varying vec3 vN; varying vec3 vW;
  // una raya cada periodo de c (antialias con fwidth; si es muy denso, el promedio)
  float raya(float c, float grueso) {
    float w = fwidth(c);
    float d = abs(fract(c + 0.5) - 0.5);
    float r = 1.0 - smoothstep(grueso * 0.5 - w * 0.5, grueso * 0.5 + w * 0.75, d);
    return mix(r, grueso * 1.4, smoothstep(0.25, 0.6, w));
  }
  void main() {
    // normal plana de la cara (de las derivadas): el rayado no hace anillos en las esferas
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
    if (dot(n, vN) < 0.0) n = -n;
    float lam = clamp(dot(n, normalize(uLuz)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col;
    if (uModo < 0.5) {
      // más luz, más rayas: el periodo se cierra en las caras iluminadas
      float k = mix(1.7, 0.75, lam);
      float r;
      if (abs(n.y) > 0.55 || uMundo <= 0.0) r = raya(gl_FragCoord.y / (uPaso * uPx * k), uGrueso);
      else r = raya(vW.y / (uMundo * k), uGrueso * 0.9);
      col = mix(uFondo, uTinta, clamp(r * uTono * uBrillo, 0.0, 1.0));
    } else if (uModo > 1.5) {
      // croquis: relleno oscuro y, sólo en lo que no ve la luz, un rayado
      // diagonal a mano (la raya se tuerce un poco con el lugar)
      float sombra = smoothstep(0.66, 0.38, lam);
      float mano = sin(vW.x * 1.7 + vW.z * 2.3) * 0.22 + sin(vW.y * 3.1 + vW.x * 0.7) * 0.14;
      float c = (gl_FragCoord.x + gl_FragCoord.y) / (uPaso * uPx * 1.6) + mano;
      float r = raya(c, 0.17) * sombra;
      col = mix(uFondo, uTinta, clamp((uGris + r * uTono) * uBrillo, 0.0, 1.0));
    } else {
      col = mix(uFondo, uTinta, clamp(uGris * mix(0.55, 1.15, lam) * uBrillo, 0.0, 1.0));
    }
    gl_FragColor = vec4(col, uOpacidad);
  }`;

/* ---------- Geometría: acumuladores ---------- */
class Malla {   // triángulos sueltos (normales planas)
  constructor() { this.p = []; }
  tri(a, b, c) { this.p.push(...a, ...b, ...c); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.computeVertexNormals();
    return g;
  }
}
class Lineas {
  constructor() { this.p = []; }
  seg(a, b) { this.p.push(...a, ...b); }
  poli(pts, cerrada) { for (let i = 1; i < pts.length; i++) this.seg(pts[i - 1], pts[i]); if (cerrada && pts.length > 2) this.seg(pts[pts.length - 1], pts[0]); }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); return g; }
}
function ccw(pol) { let s = 0; for (let i = 0; i < pol.length; i++) { const a = pol[i], b = pol[(i + 1) % pol.length]; s += a[0] * b[1] - b[0] * a[1]; } return s >= 0 ? pol : pol.slice().reverse(); }
// tapa horizontal de un polígono (u, v) a la altura z, o con altura por punto zf(u, v)
function tapa(m, pol, z, zf, abajo) {
  pol = ccw(pol);
  const tris = THREE.ShapeUtils.triangulateShape(pol.map(q => new THREE.Vector2(q[0], q[1])), []);
  const P = q => W(q[0], q[1], zf ? zf(q[0], q[1]) : z);
  tris.forEach(t => { const a = P(pol[t[0]]), b = P(pol[t[1]]), c = P(pol[t[2]]); if (abajo) m.tri(a, c, b); else m.tri(a, b, c); });
}
// muros de un polígono de z0 a z1 (o hasta zf(u, v)); filtro(a, b): qué lados
function muros(m, pol, z0, z1, zf, filtro) {
  pol = ccw(pol);
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i], b = pol[(i + 1) % pol.length];
    if (filtro && !filtro(a, b)) continue;
    const ta = zf ? zf(a[0], a[1]) : z1, tb = zf ? zf(b[0], b[1]) : z1;
    m.quad(W(a[0], a[1], z0), W(b[0], b[1], z0), W(b[0], b[1], tb), W(a[0], a[1], ta));
  }
}
function prisma(m, pol, z0, z1) { muros(m, pol, z0, z1); tapa(m, pol, z1); tapa(m, pol, z0, null, true); }
const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
const circ = (c, r, n) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos(i / n * 2 * Math.PI) * r, c[1] + Math.sin(i / n * 2 * Math.PI) * r]);

/* ---------- Sol ---------- */
const R_SOL = 150, CICLO_SOL = 24000;

/* ---------- Figuras que miran a la cámara (personas, árboles) ----------
   Un atlas de cols × filas cuadros; cada instancia: su base (aPos), tamaño en
   m (aEsc), columna (aTile), fila (aPose) y si se voltea (aVolt). Quedan
   derechas en pantalla y se tapan con lo que tengan delante (depth). */
function matAtlas(tex, cols, filas) {
  return new THREE.ShaderMaterial({
    uniforms: { uMapa: { value: tex }, uN: { value: cols }, uP: { value: filas }, uTinta: { value: new THREE.Color(1, 1, 1) }, uOpacidad: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aPos; attribute vec2 aEsc; attribute float aTile; attribute float aVolt; attribute float aPose;
      uniform float uN; uniform float uP; varying vec2 vUv;
      void main() {
        vec4 c = viewMatrix * vec4(aPos, 1.0);
        c.xy += position.xy * aEsc;
        gl_Position = projectionMatrix * c;
        float u = aVolt < 0.0 ? 1.0 - uv.x : uv.x;
        vUv = vec2((aTile + u) / uN, (uP - 1.0 - aPose + uv.y) / uP);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa; uniform vec3 uTinta; uniform float uOpacidad; varying vec2 vUv;
      void main() {
        vec4 t = texture2D(uMapa, vUv);
        if (t.a < 0.5) discard;
        gl_FragColor = vec4(t.rgb * uTinta, uOpacidad);
      }`
  });
}
function mallaAtlas(n, mat) {
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
  g.instanceCount = n;
  const at = {};
  [['aPos', 3], ['aEsc', 2], ['aTile', 1], ['aVolt', 1], ['aPose', 1]].forEach(([k, d]) => {
    at[k] = new THREE.InstancedBufferAttribute(new Float32Array(n * d), d);
    at[k].setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(k, at[k]);
  });
  for (let i = 0; i < n; i++) at.aVolt.setX(i, 1);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
  return Object.assign({ malla: m }, at);
}
/* Árboles de croquis, como la hoja de árboles de Gabriel: la copa hecha de
   varios racimos de hojas encimados (cada uno una nube de borde dentado,
   rellena de negro: no se ve a través; los de arriba primero, los de abajo
   encima), un rayado diagonal de sombra bajo los racimos de arriba, y el
   tronco con sus ramas que se asoman entre los racimos; pastos al pie. Cuatro
   variantes en un cuadro de 160 × 200 (la base en y = 196). */
const ARBOLES_TEX = (() => {
  const T = 160, A = 200, S = 2, N = 4, c = document.createElement('canvas');
  c.width = N * T * S; c.height = A * S;
  const x = c.getContext('2d'), azar = window.AtlampaContexto.geo.aleatorio(5);
  x.lineJoin = 'round'; x.lineCap = 'round';
  // un racimo: nube con el borde de hojitas (dientes y bucles chicos)
  function racimo(cx, cy, rx, ry) {
    const n = Math.max(10, Math.round(Math.PI * (rx + ry) / 3.6)), f1 = azar() * 6, f2 = azar() * 6, pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, r = 1 + 0.1 * Math.sin(3 * t + f1) + 0.06 * Math.sin(7 * t + f2), plano = Math.sin(t) > 0.55 ? 0.78 : 1;
      pts.push([cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r * plano]);
    }
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
      const b = 1 + azar() * 3.2;
      if (azar() < 0.22) {   // un bucle: hojita enroscada
        x.quadraticCurveTo(mx + dx / d * (b + 2.5) - dy / d * 2, my + dy / d * (b + 2.5) + dx / d * 2, mx + dx / d * 0.8, my + dy / d * 0.8);
        x.quadraticCurveTo(mx + dx / d * (b + 1) + dy / d * 2, my + dy / d * (b + 1) - dx / d * 2, q[0], q[1]);
      } else x.quadraticCurveTo(mx + dx / d * b, my + dy / d * b, q[0], q[1]);
    }
    x.closePath(); x.fill(); x.stroke();
  }
  // sombra: rayado diagonal apretado en una media luna bajo el racimo
  function sombra(cx, cy, rx, ry) {
    x.save();
    x.beginPath(); x.ellipse(cx, cy + ry * 0.62, rx * 0.72, ry * 0.42, 0, 0, Math.PI * 2); x.clip();
    x.lineWidth = 0.75;
    for (let t = -rx - ry; t < rx + ry; t += 2.8) { const j = (azar() - 0.5) * 1.4; x.beginPath(); x.moveTo(cx + t + j, cy + ry * 1.1); x.lineTo(cx + t + ry * 0.9 + j, cy + ry * 0.1); x.stroke(); }
    x.restore();
  }
  // tronco (dos trazos con rayitas) y ramas que suben entre los racimos
  function tronco(bx, by, tx, ty, g, ramas) {
    x.save(); x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(bx - g, by); x.quadraticCurveTo((bx + tx) / 2 - g * 0.8, (by + ty) / 2, tx - g * 0.5, ty);
    x.lineTo(tx + g * 0.5, ty); x.quadraticCurveTo((bx + tx) / 2 + g * 0.8, (by + ty) / 2, bx + g, by); x.closePath(); x.fill(); x.stroke();
    x.lineWidth = 0.8;
    for (let k = 0; k < 5; k++) { const t = 0.15 + k * 0.17, px = bx + (tx - bx) * t, py = by + (ty - by) * t; x.beginPath(); x.moveTo(px - g * 0.5, py); x.lineTo(px + g * 0.3, py - 6); x.stroke(); }
    x.lineWidth = 1.2;
    ramas.forEach(r => { x.beginPath(); x.moveTo(tx, ty + 2); x.quadraticCurveTo(tx + r[0] * 0.3, ty - r[1] * 0.6, tx + r[0], ty - r[1]); x.stroke(); });
    x.restore();
  }
  function pastos(bx, by) {
    x.save(); x.lineWidth = 1;
    x.beginPath(); x.moveTo(bx - 34, by); x.lineTo(bx + 34, by); x.stroke();
    for (let i = 0; i < 9; i++) { const u = bx - 22 + i * 5 + azar() * 3; x.beginPath(); x.moveTo(u, by); x.lineTo(u + (azar() - 0.5) * 5, by - 3 - azar() * 6); x.stroke(); }
    x.restore();
  }
  // racimos: [cx, cy, rx, ry] de arriba hacia abajo; con sombra los primeros
  function arbol(racimos, sombras, troncos) {
    troncos.forEach(t => tronco(...t));
    // cada racimo y su sombra; los de abajo tapan parte de la sombra de los de arriba
    racimos.forEach((r, i) => { racimo(...r); if (i < sombras) sombra(...r); });
    // las ramas se asoman otra vez entre los racimos de abajo
    x.save(); x.lineWidth = 1.2;
    troncos.forEach(t => t[5].forEach(r => { x.beginPath(); x.moveTo(t[2], t[3] + 14); x.quadraticCurveTo(t[2] + r[0] * 0.2, t[3], t[2] + r[0] * 0.55, t[3] - r[1] * 0.5); x.stroke(); }));
    x.restore();
  }
  const ARB = [
    () => arbol([[80, 48, 26.9, 20.2], [56, 72, 29.1, 22.4], [104, 70, 29.1, 22.4], [80, 84, 31.4, 22.4], [42, 104, 29.1, 20.2], [118, 102, 29.1, 20.2], [80, 114, 33.6, 20.2]], 4,
      [[80, 196, 80, 128, 4.5, [[-24, 30], [22, 34], [2, 44]]]]),                                                                                           // alto
    () => arbol([[50, 66, 33.6, 22.4], [96, 58, 35.8, 24.6], [130, 76, 26.9, 20.2], [24, 90, 24.6, 20.2], [70, 94, 38.1, 22.4], [118, 100, 33.6, 20.2]], 4,
      [[40, 196, 38, 138, 2.5, [[-8, 22]]], [62, 196, 66, 136, 2.6, [[8, 24]]], [86, 196, 84, 134, 2.4, [[-6, 22]]], [108, 196, 112, 138, 2.5, [[10, 20]]], [126, 196, 128, 142, 2.2, [[6, 18]]]]),   // ancho, de varios troncos
    () => arbol([[94, 52, 29.1, 20.2], [70, 74, 31.4, 22.4], [118, 76, 29.1, 22.4], [92, 92, 33.6, 22.4], [56, 108, 26.9, 17.9], [124, 108, 26.9, 17.9]], 3,
      [[62, 196, 84, 132, 4.5, [[-20, 30], [24, 34]]], [72, 196, 96, 144, 2.6, [[14, 24]]]]),                                                                  // inclinado, de dos troncos
    () => arbol([[60, 58, 33.6, 20.2], [104, 56, 33.6, 20.2], [34, 80, 26.9, 17.9], [82, 78, 38.1, 22.4], [128, 80, 26.9, 17.9]], 3,
      [[80, 196, 80, 124, 4.8, [[-34, 34], [32, 36], [-6, 46]]]])                                                                                            // sombrilla (acento)
  ];
  ARB.forEach((f, i) => { x.save(); x.scale(S, S); x.translate(i * T, 0); x.fillStyle = '#000'; x.strokeStyle = '#fff'; x.lineWidth = 1.3; f(); pastos(80, 196); x.restore(); });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  return { tex, N, alto: A / 196, ancho: T / 196 };   // por metro de alto del árbol
})();

/* ============================================================ */
function crea(svg, op) {
  op = op || {};
  const ESC = op.escena || 'general', GENERAL = ESC === 'general';
  const trabajo = svg.parentNode;
  svg.style.display = 'none';
  const lienzo = document.createElement('canvas');
  lienzo.className = 'ad-3d';
  trabajo.insertBefore(lienzo, svg);
  const capaRot = document.createElement('div');
  capaRot.className = 'ad-3d-rotulos';
  trabajo.insertBefore(capaRot, svg);

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const escena = new THREE.Scene();
  let estilo = ESTILOS.rayado;
  escena.background = new THREE.Color(estilo.fondo);

  const camO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
  const camP = new THREE.PerspectiveCamera(30, 1, 1, 6000);
  let cam = estilo.perspectiva ? camP : camO;

  /* ----- materiales: uno por (papel, programa) ----- */
  const MATS = {};      // clave → ShaderMaterial
  const ARISTAS = {};   // clave → LineBasicMaterial
  const LINEAS = {};    // nombre → LineBasicMaterial (plantas, columnas…)
  let conColor = false, resalta = null, espacioAct = null;
  const luz = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();
  function material(papel) {
    if (MATS[papel]) return MATS[papel];
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      uniforms: { uFondo: { value: new THREE.Color(0, 0, 0) }, uTinta: { value: new THREE.Color(1, 1, 1) }, uModo: { value: 0 }, uTono: { value: 0.5 },
        uPaso: { value: 3 }, uMundo: { value: 0 }, uGris: { value: 0.1 }, uOpacidad: { value: 1 }, uLuz: { value: luz }, uPx: { value: renderer.getPixelRatio() },
        uBrillo: { value: 1 }, uGrueso: { value: 0.22 } }
    });
    m.userData.papel = papel;
    return (MATS[papel] = m);
  }
  function arista(papel) {
    if (ARISTAS[papel]) return ARISTAS[papel];
    return (ARISTAS[papel] = Object.assign(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true }), { userData: { papel } }));
  }
  function linea(nombre, color) {
    if (LINEAS[nombre]) return LINEAS[nombre];
    const m = new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true });
    m.userData = { nombre, color: color || 0xffffff };
    return (LINEAS[nombre] = m);
  }
  const blanco = new THREE.Color(1, 1, 1);
  function tinta(papel) {
    const pr = PROG_DE[papel];
    if (!conColor || !pr) return blanco;
    return new THREE.Color(PROGRAMA[pr]).lerp(blanco, 0.15);
  }
  // ¿queda opaco con lo que está resaltado? (programa o espacio)
  // con algo resaltado (un programa, lo público o lo privado), todo lo demás baja al 15 %
  function apagado(papel) {
    if (espacioAct) return (ESPACIO_DE[papel] || 'publico') !== espacioAct;
    if (!resalta) return false;
    return (RESALTA_PAPELES[resalta] || []).indexOf(papel) < 0;
  }
  function apagadaLinea(base) {
    if (espacioAct) return espacioAct === 'privado';
    if (!resalta) return false;
    return !(resalta === 'paisajismo' && LINEAS_PAISAJE.indexOf(base) >= 0) && !(resalta === 'estacionamiento' && base === 'est');
  }
  const TENUE = 0.15;
  /* Nada es transparente: lo que no toca (ajeno al apartado o no resaltado)
     se queda opaco pero apagado, y tapa lo que tiene detrás. Sin nada
     elegido manda la planta baja: el paisaje, la plaza y lo que se desplanta
     en el piso suben; los módulos (arriba) bajan. */
  const PLANTA_BAJA = ['predio', 'plaza', 'verde', 'tezontle', 'agua', 'filtro', 'arbusto', 'copa', 'nave', 'cultura', 'industria'];
  function enfasis(papel, ref) {
    if (ref) return 0.28;
    if (apagado(papel)) return 1;
    if (!resalta && !espacioAct) {
      if (papel === 'modulo') return 0.5;
      if (PLANTA_BAJA.indexOf(papel) >= 0) return 1.3;
    }
    return 1;
  }
  function aplicaEstilo() {
    escena.background = new THREE.Color(estilo.fondo);
    const nada = !resalta && !espacioAct;
    Object.keys(MATS).forEach(k => {
      const m = MATS[k], e = estilo.papel[m.userData.papel] || estilo.papel.proyecto, u = m.uniforms;
      u.uModo.value = e.modo !== undefined ? e.modo : estilo === ESTILOS.plano ? 1 : 0;
      // con Color, más tinta: que contraste con el negro
      u.uTono.value = (e.tono || 0.4) * (conColor ? 1.35 : 1); u.uPaso.value = e.paso || 3; u.uGrueso.value = (e.grueso || 0.22) * (conColor ? 1.3 : 1); u.uMundo.value = e.mundo || 0; u.uGris.value = e.gris || 0.1;
      u.uTinta.value = tinta(m.userData.papel);
      u.uBrillo.value = enfasis(m.userData.papel, m.userData.ref);
      const ap = apagado(m.userData.papel);
      u.uOpacidad.value = ap ? TENUE : 1; m.transparent = ap; m.depthWrite = !ap; m.needsUpdate = true;
    });
    Object.keys(ARISTAS).forEach(k => {
      const m = ARISTAS[k], e = estilo.papel[m.userData.papel] || estilo.papel.proyecto;
      m.color.copy(tinta(m.userData.papel));
      m.opacity = Math.min(1, (e.arista || 0) * enfasis(m.userData.papel, m.userData.ref)) * (apagado(m.userData.papel) ? TENUE : 1) * (estilo.blanco || 1);
      m.visible = m.opacity > 0.001;
    });
    Object.keys(LINEAS).forEach(k => {
      const m = LINEAS[k], base = m.userData.nombre.split('-')[0];
      const pb = nada && ['pasto', 'flor', 'junco', 'tronco', 'sendero', 'rayo'].indexOf(base) >= 0 ? 1.3 : 1;
      m.opacity = Math.min(1, (estilo.lineas[base] !== undefined ? estilo.lineas[base] : 0.4) * (m.userData.ref ? 0.3 : pb)) * (apagadaLinea(base) ? TENUE : 1);
      if (conColor && m.userData.colorColor) m.color.set(m.userData.colorColor); else m.color.set(m.userData.color);
    });
    // árboles de croquis: con Color, verde claro; tenues como referencia o si se resalta otra cosa
    const refArb = !GENERAL && ESC !== 'paisajismo', apArb = apagadaLinea('pasto');
    matArbol.uniforms.uTinta.value.set(conColor ? '#c6ec8f' : '#ffffff').multiplyScalar(refArb ? 0.35 : 1);
    matArbol.uniforms.uOpacidad.value = apArb ? TENUE : 1; matArbol.transparent = apArb; matArbol.depthWrite = !apArb;
    pide();
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), suelos = [];
  function visiblesPicables() { return picables.filter(m => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; }); }
  /* ----- piezas: grupos que se arman / desarman y que se pican ----- */
  const raizG = new THREE.Group(); escena.add(raizG);
  const piezas = [];     // { g, z (orden de armado 0…1), ap }
  const picables = [];   // mallas con userData.ap
  function pieza(nombre, ap, orden) {
    const g = new THREE.Group(); g.name = nombre; g.userData.ap = ap; raizG.add(g);
    piezas.push({ g, z: orden || 0, ap });
    return g;
  }
  // Aristas de croquis: cada arista en dos trazos a mano (un poco chuecos, con
  // un quiebre a la mitad) que se pasan de las esquinas, como en un dibujo.
  const CROQUIS = ['nave', 'industria', 'cultura', 'aro', 'modulo', 'proyecto'];
  function aristasCroquis(eg) {
    const p = eg.attributes.position.array, l = new Lineas(), azar = G.aleatorio(31);
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    for (let i = 0; i < p.length; i += 6) {
      const a = new THREE.Vector3(p[i], p[i + 1], p[i + 2]), b = new THREE.Vector3(p[i + 3], p[i + 4], p[i + 5]), d = b.clone().sub(a), L = d.length();
      if (L < 0.05) continue;
      d.normalize();
      const n = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), m = new THREE.Vector3().crossVectors(d, n).normalize();
      for (let k = 0; k < 1; k++) {   // un solo trazo: delgado
        const pasa = Math.min(0.6, L * 0.08) * (0.6 + azar()), j = () => (azar() - 0.5) * Math.min(0.12, L * 0.02) * (k + 1);
        const a2 = a.clone().addScaledVector(d, -pasa * (k ? 0.4 : 1)).addScaledVector(m, j()), b2 = b.clone().addScaledVector(d, pasa * (k ? 1 : 0.4)).addScaledVector(m, j());
        const mid = a2.clone().lerp(b2, 0.4 + azar() * 0.2).addScaledVector(m, j() * 1.5).addScaledVector(n, j());
        l.seg(a2.toArray(), mid.toArray()); l.seg(mid.toArray(), b2.toArray());
      }
    }
    return l.geo();
  }
  // malla + sus aristas (las que doblan más de umbral grados)
  function pon(grupo, malla, papel, ap, umbral, extraAristas) {
    const ref = !GENERAL && ap && ap !== ESC && !(ESC === 'paisajismo' && ap === 'paisajismo');
    const clave = papel + (ref ? '-ref' : '');
    const mat = material(clave); mat.userData.papel = papel; mat.userData.ref = ref;
    const g = malla.geo ? malla.geo() : malla;
    const me = new THREE.Mesh(g, mat);
    me.userData.ap = ap;
    grupo.add(me);
    if (ap) picables.push(me);
    if (umbral !== false) {
      let eg = new THREE.EdgesGeometry(g, umbral || 25);
      if (CROQUIS.indexOf(papel) >= 0) eg = aristasCroquis(eg);
      const am = arista(clave); am.userData.papel = papel; am.userData.ref = ref;
      grupo.add(new THREE.LineSegments(eg, am));
    }
    if (extraAristas) {
      const am = arista(clave); am.userData.papel = papel; am.userData.ref = ref;
      const eg = extraAristas.geo();
      grupo.add(new THREE.LineSegments(CROQUIS.indexOf(papel) >= 0 ? aristasCroquis(eg) : eg, am));
    }
    return me;
  }
  function ponLineas(grupo, lin, nombre, color, colorColor, ap, extra) {
    if (!lin.p.length) return null;
    const ref = !GENERAL && ap && ap !== ESC;
    const m = linea(nombre + (ref ? '-ref' : ''), color);
    m.userData.ref = ref; if (colorColor) m.userData.colorColor = colorColor;
    Object.assign(m, extra || {});
    const l = new THREE.LineSegments(lin.geo(), m);
    grupo.add(l);
    return l;
  }

  const matArbol = matAtlas(ARBOLES_TEX.tex, ARBOLES_TEX.N, 1);
  // Arte y cultura detallado: el paisaje sólo se quita donde estorba de verdad
  // (el foso del auditorio, los módulos de planta baja); los árboles, además,
  // bajo la losa del nivel 1. Lo demás del suelo sigue debajo del edificio.
  const CD = CULTURA_DET ? CULTURA_DET.construye() : null;
  const pisado = (u, v) => !!CD && CD.pisa.some(q => G.dentro(u, v, q));
  const bajoLosa = (u, v) => !!CD && G.dentro(u, v, CD.losa1);

  /* ===== 1. Sitio ===== */
  const gSitio = pieza('sitio', null, 0);
  {
    // el suelo del bloque; en el estacionamiento, con el hueco del predio (se ve la excavación)
    const m = new Malla();
    if (ESC === 'estacionamiento') [rect(S.u0, S.v0, S.u1, PB.v0), rect(S.u0, PB.v1, S.u1, S.v1), rect(S.u0, PB.v0, PB.u0, PB.v1), rect(PB.u1, PB.v0, S.u1, PB.v1)].forEach(r => tapa(m, r, 0));
    else tapa(m, rect(S.u0, S.v0, S.u1, S.v1), 0);
    suelos.push(pon(gSitio, m, 'suelo', null));
    const ar = new Malla();
    [rect(GF.o, S.v0, GU.o, S.v1), rect(GU.e, S.v0, GF.e, S.v1), rect(S.u0, GF.s, S.u1, GU.s), rect(S.u0, GU.n, S.u1, GF.n)].forEach(r => tapa(ar, r, 0.02));
    pon(gSitio, ar, 'calle', null, false);
    const bq = new Malla();
    [rect(S.u0, GU.s, GF.o, GU.n), rect(GF.e, GU.s, S.u1, GU.n), rect(GU.o, S.v0, GU.e, GF.s), rect(GU.o, GF.n, GU.e, S.v1),
      rect(S.u0, S.v0, GF.o, GF.s), rect(GF.e, S.v0, S.u1, GF.s), rect(S.u0, GF.n, GF.o, S.v1), rect(GF.e, GF.n, S.u1, S.v1)].forEach(r => prisma(bq, r, 0, 0.15));
    // la banqueta del predio: un marco (de la guarnición a la fachada)
    [rect(GU.o, GU.s, GU.e, PB.v0), rect(GU.o, PB.v1, GU.e, GU.n), rect(GU.o, PB.v0, PB.u0, PB.v1), rect(PB.u1, PB.v0, GU.e, PB.v1)].forEach(r => prisma(bq, r, 0, 0.15));
    pon(gSitio, bq, 'banqueta', null, 30);
  }
  // predio, área verde, plaza y Heliotropo
  const gPredio = pieza('predio', null, 0.02);
  {
    const m = new Malla();
    if (CD) {   // con el hueco del foso del auditorio
      const hueco = ccw(CD.pisa[0]).reverse(), pol = ccw(rect(PB.u0, PB.v0, PB.u1, PB.v1)), todos = pol.concat(hueco);
      THREE.ShapeUtils.triangulateShape(pol.map(q => new THREE.Vector2(q[0], q[1])), [hueco.map(q => new THREE.Vector2(q[0], q[1]))])
        .forEach(t => m.tri(...t.map(k => W(todos[k][0], todos[k][1], 0.2))));
    } else tapa(m, rect(PB.u0, PB.v0, PB.u1, PB.v1), 0.2);
    suelos.push(pon(gPredio, m, PAI ? 'verde' : 'predio', null, 1));
    // plaza cultural: rectángulo menos el disco exterior del aro
    const r = ANILLO.re, cu = ANILLO.u, cv = ANILLO.v, P = PLAZA_C;
    const aN = Math.acos((P.u1 - cu) / r), aS = Math.PI - Math.asin((P.v0 - cv) / r), pl = [[P.u0, P.v1], [P.u1, P.v1]];
    for (let i = 0; i <= 40; i++) { const t = aN + (aS - aN) * i / 40; pl.push([cu + Math.cos(t) * r, cv + Math.sin(t) * r]); }
    pl.push([P.u0, P.v0]);
    const mp = new Malla(); tapa(mp, pl, 0.22); pon(gPredio, mp, 'plaza', 'cultura', 1);
    const mh = new Malla(); tapa(mh, rect(GU.o, HE[0], GU.e, HE[1]), 0.23); pon(gPredio, mh, 'calle', null, 1);
    // espuela por Heliotropo
    const VH = (HE[0] + HE[1]) / 2, le = new Lineas();
    le.seg(W(S.u0, VH - 0.72, 0.27), W(ESP_FIN, VH - 0.72, 0.27)); le.seg(W(S.u0, VH + 0.72, 0.27), W(ESP_FIN, VH + 0.72, 0.27));
    for (let u = S.u0 + 0.8; u < ESP_FIN - 0.5; u += 1.6) le.seg(W(u, VH - 1.3, 0.26), W(u, VH + 1.3, 0.26));
    ponLineas(gPredio, le, 'columna-espuela', 0xffffff);
  }

  /* ===== 2. Paisaje ===== */
  const gPai = pieza('paisaje', 'paisajismo', 0.08);
  const gPlantas = pieza('plantas', 'paisajismo', 0.3);
  if (PAI) {
    const Z = 0.25, pares = G.pares;
    const tz = new Malla(); PAI.tezontle.forEach(t => tapa(tz, pares(t), Z)); pon(gPai, tz, 'tezontle', 'paisajismo', false);
    const fi = new Malla(); PAI.filtros.forEach(t => tapa(fi, pares(t), Z + 0.01)); pon(gPai, fi, 'filtro', 'paisajismo', 1);
    // agua: estanques, guía, estanque de la nave y la laguna (orilla orgánica)
    const ag = new Malla();
    PAI.estanques.forEach(t => tapa(ag, pares(t), Z + 0.02));
    tapa(ag, pares(PAI.rio), Z + 0.015);
    const en = PAI.estanqueNave; tapa(ag, circ([en[0], en[1]], en[2], 32), Z + 0.02);
    tapa(ag, G.laguna(1), Z + 0.03);
    pon(gPai, ag, 'agua', 'paisajismo', 1);
    const fo = new Lineas(); [0.74, 0.5, 0.27].forEach(k => fo.poli(G.laguna(k, [-1.6, 1.1]).map(q => W(q[0], q[1], Z + 0.04)), true));
    fo.poli(G.laguna(PAI.laguna.borde / PAI.laguna.r).map(q => W(q[0], q[1], Z + 0.01)), true);
    ponLineas(gPai, fo, 'rayo-fondo', 0xffffff, PROGRAMA.agua, 'paisajismo');
    const se = new Lineas(); PAI.senderos.forEach(s => se.seg(W(s[0], s[1], Z + 0.01), W(s[2], s[3], Z + 0.01)));
    ponLineas(gPai, se, 'sendero', 0xffffff, null, 'paisajismo');
    const ry = new Lineas(), L = PAI.laguna, R = L.borde / L.r;
    PAI.rayos.forEach(y => {
      const a = y[0], r0 = Math.max(y[1], L.r * R * G.orilla(a) + 0.8), r1 = y[2] + r0 - y[1], c = Math.cos(a), s = Math.sin(a);
      ry.seg(W(L.c[0] + c * r0, L.c[1] + s * r0, Z), W(L.c[0] + c * r1, L.c[1] + s * r1, Z));
    });
    ponLineas(gPai, ry, 'rayo', 0xffffff, null, 'paisajismo');

    // plantas: todo estático
    const pasto = new Lineas(), tallo = new Lineas(), junco = new Lineas(), flores = [[], [], []];
    const domo = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), arb = [];
    G.plantasDe(ESC === 'paisajismo' ? 2 : 1).forEach(c => {
      let a = c.pasto;
      for (let i = 0; i < a.length; i += 4) {
        const u = a[i], v = a[i + 1], h = a[i + 2], w = a[i + 3] * h, b = W(u, v, Z), ang = (u * 7.3 + v * 3.1) % Math.PI;
        if (pisado(u, v)) continue;
        const du = Math.cos(ang) * w, dv = Math.sin(ang) * w;
        pasto.seg(b, W(u - du, v - dv, Z + h * 0.8)); pasto.seg(b, W(u + du * 0.2, v + dv * 0.2, Z + h)); pasto.seg(b, W(u + du, v + dv, Z + h * 0.8));
      }
      a = c.agave;
      for (let i = 0; i < a.length; i += 4) {
        const u = a[i], v = a[i + 1], r = a[i + 2], b = W(u, v, Z);
        if (pisado(u, v)) continue;
        for (let k = 0; k < 6; k++) { const t = k / 6 * 2 * Math.PI; pasto.seg(b, W(u + Math.cos(t) * r, v + Math.sin(t) * r, Z + r * 0.9)); }
      }
      a = c.arbusto;
      for (let i = 0; i < a.length; i += 4) if (!pisado(a[i], a[i + 1])) arb.push([a[i], a[i + 1], a[i + 2], a[i + 3]]);
      ['flor', 'junco'].forEach(tipo => {
        const a = c[tipo];
        for (let i = 0; i < a.length; i += 7) {
          const u = a[i], v = a[i + 1], h = a[i + 2], tu = u + a[i + 4], tv = v + a[i + 5], top = W(tu, tv, Z + h);
          if (pisado(u, v)) continue;
          (tipo === 'junco' ? junco : tallo).seg(W(u, v, Z), top);
          if (tipo === 'junco') junco.seg(W(tu, tv, Z + h * 0.7), top);
          else flores[a[i + 6]].push(...top);
        }
      });
    });
    ponLineas(gPlantas, pasto, 'pasto', 0xffffff, PROGRAMA.verde, 'paisajismo');
    ponLineas(gPlantas, tallo, 'pasto-tallo', 0xffffff, PROGRAMA.verde, 'paisajismo');
    ponLineas(gPlantas, junco, 'junco', 0xffffff, PROGRAMA.agua, 'paisajismo');
    ['#ff9ccb', '#ffe066', '#d9b8ff'].forEach((cc, k) => {
      if (!flores[k].length) return;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(flores[k], 3));
      const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true });
      m.userData = { nombre: 'flor-' + k, color: 0xffffff, colorColor: cc };
      LINEAS['flor-' + k] = m;
      gPlantas.add(new THREE.Points(g, m));
    });
    // arbustos: domos instanciados
    if (arb.length) {
      const im = new THREE.InstancedMesh(domo, material('arbusto'), arb.length), M = new THREE.Matrix4();
      arb.forEach((q, i) => { const p = W(q[0], q[1], Z); M.makeScale(q[2], q[3], q[2]).setPosition(p[0], p[1], p[2]); im.setMatrixAt(i, M); });
      im.userData.ap = 'paisajismo'; gPlantas.add(im); picables.push(im);
    }
    // árboles: de croquis, mirando a la cámara (ver ARBOLES_TEX)
    const ar = G.arbolesPai().filter(t => !pisado(t[0], t[1]) && !bajoLosa(t[0], t[1]));
    if (ar.length) {
      const b = mallaAtlas(ar.length, matArbol);
      ar.forEach((t, i) => {
        const p = W(t[0], t[1], Z), H = t[2] + t[3] * 0.25, tile = t[4] ? 3 : Math.floor(((t[0] * 13.7 + t[1] * 7.1) % 3 + 3) % 3);
        b.aPos.setXYZ(i, p[0], p[1], p[2]); b.aEsc.setXY(i, ARBOLES_TEX.ancho * H, ARBOLES_TEX.alto * H); b.aTile.setX(i, tile); b.aVolt.setX(i, (i % 2) ? 1 : -1);
      });
      gPlantas.add(b.malla);
    }
  }

  /* ===== 3. Naves (cortadas por el aro) ===== */
  NAVESG: {
    const porNave = new Map();
    PIEZAS.forEach(pz => {
      const nv = pz.nv, L = pz.L;
      if (!porNave.has(nv)) porNave.set(nv, new Malla());
      const m = porNave.get(nv);
      const zf = (u) => nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - pz.um) / pz.run);
      [true, false].forEach(izq => {
        const h = G.cortaU(pz.pol, pz.um, izq);
        if (!h) return;
        tapa(m, h, 0, (u) => zf(u));
        const e = 1e-3;
        muros(m, h, 0, 0, (u) => zf(u), (a, b) =>
          (Math.abs(a[0] - L.u0) < e && Math.abs(b[0] - L.u0) < e) || (Math.abs(a[0] - L.u1) < e && Math.abs(b[0] - L.u1) < e) ||
          (Math.abs(a[1] - L.v0) < e && Math.abs(b[1] - L.v0) < e) || (Math.abs(a[1] - L.v1) < e && Math.abs(b[1] - L.v1) < e) || (a[2] && b[2]));
      });
    });
    let i = 0;
    porNave.forEach((m, nv) => { const g = pieza('nave' + i, 'comercio', 0.35 + 0.05 * i++); pon(g, m, 'nave', 'comercio', 12); });
  }

  /* ===== 4. Industria y chimenea ===== */
  if (MOD && MOD.industria) {
    const g = pieza('industria', 'industria', 0.4), m = new Malla(), I = MOD.industria;
    prisma(m, G.pares(I.planta), I.z0, I.z1); pon(g, m, 'industria', 'industria', 20);
  }
  if (MOD && MOD.chimenea) {
    const g = pieza('chimenea', 'industria', 0.55), m = new Malla(), C = MOD.chimenea;
    const b = rect(C.base[0], C.base[1], C.base[2], C.base[3]), t = rect(C.remate[0], C.remate[1], C.remate[2], C.remate[3]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; m.quad(W(b[i][0], b[i][1], C.z0), W(b[j][0], b[j][1], C.z0), W(t[j][0], t[j][1], C.z1), W(t[i][0], t[i][1], C.z1)); }
    tapa(m, t, C.z1); pon(g, m, 'industria', 'industria', 20);
  }

  /* ===== 5. Arte y cultura ===== */
  {
    const g = pieza('cultura', 'cultura', 0.42), m = new Malla(), ln = new Lineas(), CZ = ANILLO.z - ANILLO.canto;
    CULTURA.pabellones.forEach(pb => {
      const n = 40, pol = [];
      for (let i = 0; i <= n; i++) { const t = (pb[0] + (pb[1] - pb[0]) * i / n) * RAD; pol.push([ANILLO.u + Math.cos(t) * CULTURA.r1, ANILLO.v + Math.sin(t) * CULTURA.r1]); }
      for (let i = n; i >= 0; i--) { const t = (pb[0] + (pb[1] - pb[0]) * i / n) * RAD; pol.push([ANILLO.u + Math.cos(t) * CULTURA.r0, ANILLO.v + Math.sin(t) * CULTURA.r0]); }
      prisma(m, pol, 0, CZ);
      // entrepiso: la línea a media altura
      ln.poli(pol.map(q => W(q[0], q[1], CZ / 2)), true);
    });
    pon(g, m, 'cultura', 'cultura', 20, ln);
  }

  /* ===== 6. Aro ===== */
  {
    const g = pieza('aro', 'aro', 0.6), m = new Malla(), n = 160, z1 = ANILLO.z, z0 = z1 - ANILLO.canto;
    const ext = circ([ANILLO.u, ANILLO.v], ANILLO.re, n), int = circ([ANILLO.u, ANILLO.v], ANILLO.ri, n);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, A = ext[i], B = ext[j], a = int[i], b = int[j];
      m.quad(W(a[0], a[1], z1), W(b[0], b[1], z1), W(B[0], B[1], z1), W(A[0], A[1], z1));
      m.quad(W(a[0], a[1], z0), W(A[0], A[1], z0), W(B[0], B[1], z0), W(b[0], b[1], z0));
      m.quad(W(A[0], A[1], z0), W(A[0], A[1], z1), W(B[0], B[1], z1), W(B[0], B[1], z0));
      m.quad(W(a[0], a[1], z0), W(b[0], b[1], z0), W(b[0], b[1], z1), W(a[0], a[1], z1));
    }
    // barandal: pasamanos y balaustres cada 2.4 m
    const ln = new Lineas(), zb = z1 + ANILLO.baranda;
    [ANILLO.ri, ANILLO.re].forEach(r => {
      const pts = circ([ANILLO.u, ANILLO.v], r, n).map(q => W(q[0], q[1], zb));
      ln.poli(pts, true);
      const k = Math.round(2 * Math.PI * r / 2.4);
      circ([ANILLO.u, ANILLO.v], r, k).forEach(q => ln.seg(W(q[0], q[1], z1), W(q[0], q[1], zb)));
    });
    pon(g, m, 'aro', 'aro', 30, ln);
    // columnas (las que no caen dentro de un pabellón)
    const col = new THREE.CylinderGeometry(0.4, 0.4, z0, 10, 1), cs = COLUMNAS.filter(c => !G.enEdificio(c[0], c[1]));
    const im = new THREE.InstancedMesh(col, material('aro'), cs.length), M = new THREE.Matrix4();
    cs.forEach((c, i) => { const p = W(c[0], c[1], z0 / 2); M.makeTranslation(p[0], p[1], p[2]); im.setMatrixAt(i, M); });
    im.userData.ap = 'aro'; g.add(im); picables.push(im);
  }

  /* ===== 6b. Arte y cultura (el concepto detallado) =====
     Reemplaza a los pabellones simples en todas las escenas: un edificio de
     tres niveles con auditorio hundido, escaleras en X, fachada de diagonales
     y parasoles a +12, bajo el aro de siempre (el suyo, más chico, no va).
     Viene en el sistema de Rhino: se traslada como los módulos. Los vidrios
     no se dibujan (nada transparente): la fachada se lee por sus parteluces. */
  if (CD) {
    piezas.forEach(p => { if (p.g.name === 'cultura') p.g.userData.oculto = true; });
    const g = pieza('cultura-detalle', 'cultura', 0.45), d = [CULTURA_DET.DX - CEN[0], CULTURA_DET.DZ, -(CULTURA_DET.DY - CEN[1])];
    const papel = { losa: 'cultura', nucleo: 'cultura', auditorio: 'cultura', aro: 'cultura', escalera: 'cultura', acero: 'cultura' };
    Object.keys(CD.mallas).forEach(k => {
      const geo = CD.mallas[k]; geo.translate(d[0], d[1], d[2]); geo.computeVertexNormals();
      pon(g, geo, papel[k] || 'cultura', 'cultura', k === 'acero' ? false : 20);
    });
    Object.keys(CD.lineas).forEach(k => {
      const geo = CD.lineas[k]; geo.translate(d[0], d[1], d[2]);
      const lin = new Lineas(); lin.p = Array.from(geo.attributes.position.array);
      ponLineas(g, lin, 'columna-' + k, 0xffffff, PROGRAMA.cultura, 'cultura');
    });
  }

  /* ===== 7. Módulos de vivienda ===== */
  const gMods = [];
  if (MOD) {
    const A = MOD.a / 2, Bm = MOD.b / 2, porNivel = {};
    MOD.cajas.forEach(r => {
      const nivel = r[2], z0 = MOD.z0 + nivel * MOD.alto, z1 = z0 + MOD.alto;
      if (!porNivel[nivel]) porNivel[nivel] = { m: new Malla(), l: new Lineas() };
      const { m, l } = porNivel[nivel];
      const P = (x, y, z) => W(r[0] + MEX[0] * x + MEY[0] * y, r[1] + MEX[1] * x + MEY[1] * y, z);
      const junta = {};
      if (r[9]) r[9].forEach(j => { if (typeof j === 'number') junta[j] = true; else junta[j[0]] = j.slice(1); });
      function aristaM(cod, a, b) {
        const j = junta[cod];
        if (j === true) return;
        const t = j || [0, 1];
        for (let k = 0; k < t.length; k += 2) {
          const f = (s) => P(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s);
          l.seg(f(t[k]), f(t[k + 1]));
        }
      }
      [[0, -Bm, A], [1, A, Bm], [0, Bm, A], [1, -A, Bm]].forEach((lado, i) => {
        const mm = r[4 + i];
        if (!mm) return;
        const t = mm === 1 ? [-lado[2], lado[2]] : mm;
        for (let k = 0; k < t.length; k += 2) {
          const a = lado[0] ? [lado[1], t[k]] : [t[k], lado[1]], b = lado[0] ? [lado[1], t[k + 1]] : [t[k + 1], lado[1]];
          m.quad(P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1));
          const c = [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]];
          for (let e = 0; e < 4; e++) aristaM(i * 100 + 2 * k + e, c[e], c[(e + 1) % 4]);
        }
      });
      let tp = r[8], na = 0;
      if (tp === 1) tp = [[-A, -Bm, A, -Bm, A, Bm, -A, Bm]];
      if (tp) tp.forEach(q => {
        const pol = [];
        for (let k = 0; k < q.length; k += 2) {
          pol.push([q[k], q[k + 1]]);
          const s = (k + 2) % q.length;
          aristaM(400 + na++, [q[k], q[k + 1], z1], [q[s], q[s + 1], z1]);
        }
        const tris = THREE.ShapeUtils.triangulateShape(ccw(pol).map(p => new THREE.Vector2(p[0], p[1])), []), cp = ccw(pol);
        tris.forEach(t => m.tri(P(cp[t[0]][0], cp[t[0]][1], z1), P(cp[t[1]][0], cp[t[1]][1], z1), P(cp[t[2]][0], cp[t[2]][1], z1)));
      });
      // fondo de la caja (se ve desde abajo y en los volados)
      m.quad(P(-A, -Bm, z0), P(-A, Bm, z0), P(A, Bm, z0), P(A, -Bm, z0));
    });
    Object.keys(porNivel).sort((a, b) => a - b).forEach(n => {
      const g = pieza('modulos' + n, 'vivienda', 0.6 + n * 0.05);
      g.userData.capa = 'modulos';
      pon(g, porNivel[n].m, 'modulo', 'vivienda', false, porNivel[n].l);
      gMods.push(g);
    });
  }

  /* ===== 8. Estructura: columnas que llegan al piso ===== */
  const gCol = pieza('estructura', 'paisajismo', 0.5);
  gCol.userData.capa = 'estructura';
  if (PAI) {
    const l = new Lineas();
    PAI.columnas.forEach(c => {
      l.seg(W(c[0], c[1], 0.24), W(c[0], c[1], c[2]));
      const s = 0.175; l.poli(rect(c[0] - s, c[1] - s, c[0] + s, c[1] + s).map(q => W(q[0], q[1], 0.25)), true);
    });
    ponLineas(gCol, l, 'columna', 0xffffff, null, null);
  }

  /* ===== 9. Estacionamiento: en rayos X (se ve a través del piso) ===== */
  const gEst = pieza('estacionamiento', 'estacionamiento', 0.05);
  let estNivel = 0;
  const estLineas = [];
  if (EST) {
    const N = EST.sotanos, e = EST.entrepiso, xray = {};
    for (let k = 1; k <= N; k++) {
      const l = new Lineas(), z = -k * e;
      EST.bloques.forEach(b => {
        l.poli(G.pares(b.planta).map(q => W(q[0], q[1], z)), true);
        if (ESC === 'estacionamiento') b.cajones.forEach(c => l.poli(rect(c[0], c[1], c[2], c[3]).map(q => W(q[0], q[1], z)), true));
      });
      const ob = ponLineas(gEst, l, 'est-' + k, 0xffffff, PROGRAMA.est, 'estacionamiento', xray);
      if (ob) estLineas.push(ob);
    }
    // aristas que bajan y las helicoidales (una vuelta por sótano)
    const l = new Lineas(), fondo = -N * e;
    EST.bloques.forEach(b => G.pares(b.planta).forEach(q => l.seg(W(q[0], q[1], 0.2), W(q[0], q[1], fondo))));
    EST.rampas.forEach(r => (r.carriles || [r.r]).forEach(cr => {
      const rr = (cr[0] + cr[1]) / 2, pasos = 48 * N, pts = [];
      for (let i = 0; i <= pasos; i++) { const t = i / pasos, a = t * N * 2 * Math.PI; pts.push(W(r.c[0] + Math.cos(a) * rr, r.c[1] + Math.sin(a) * rr, -t * N * e)); }
      l.poli(pts);
    }));
    ponLineas(gEst, l, 'est-baja', 0xffffff, PROGRAMA.est, 'estacionamiento', xray);
  }

  // fuera de su apartado el estacionamiento no se ve (está bajo el piso); en
  // él, se quita el piso del predio para ver la excavación
  if (ESC !== 'estacionamiento') gEst.userData.oculto = true;
  else gPredio.userData.oculto = gPai.userData.oculto = gPlantas.userData.oculto = true;

  /* ===== 10. Sol: la bóveda ===== */
  const gSol = new THREE.Group(); gSol.visible = false; escena.add(gSol);
  const HOY = new Date(), DIA_HOY = G.diaDelAno(HOY);
  const DIAS = { verano: G.diaDelAno(new Date(HOY.getFullYear(), 5, 21)), equinoccio: G.diaDelAno(new Date(HOY.getFullYear(), 2, 20)), invierno: G.diaDelAno(new Date(HOY.getFullYear(), 11, 21)) };
  const cg = Math.cos(GIRO), sg = Math.sin(GIRO);
  function enCielo(alt, az, r) {
    const ca = Math.cos(alt * RAD), E = ca * Math.sin(az * RAD), N = ca * Math.cos(az * RAD);
    return W(CEN[0] + r * (E * cg - N * sg), CEN[1] + r * (E * sg + N * cg), r * Math.sin(alt * RAD));
  }
  function recorrido(dia, paso) { const r = []; for (let h = 4; h <= 21; h += paso) { const q = G.solEn(dia, h); if (q.alt > 0) r.push([h, enCielo(q.alt, q.az, R_SOL)]); } return r; }
  const HOY_P = recorrido(DIA_HOY, 1 / 30), rotSol = [];
  {
    const hz = new Lineas(), ar = new Lineas(), hr = new Lineas(), hoy = new Lineas();
    hz.poli(Array.from({ length: 97 }, (_, i) => enCielo(0, i / 96 * 360, R_SOL)));
    [0, 90, 180, 270].forEach(a => hz.seg(enCielo(0, a, R_SOL - 6), enCielo(0, a, R_SOL + 6)));
    const arcos = {};
    Object.keys(DIAS).forEach(n => { arcos[n] = recorrido(DIAS[n], 1 / 12).map(q => q[1]); ar.poli(arcos[n]); });
    for (let h = 6; h <= 18; h++) hr.poli(Object.keys(DIAS).map(n => { const q = G.solEn(DIAS[n], h); return q.alt > 0 ? enCielo(q.alt, q.az, R_SOL) : null; }).filter(Boolean));
    hoy.poli(HOY_P.map(q => q[1]));
    ponLineas(gSol, hz, 'sol-horizonte', 0xffffff);
    ponLineas(gSol, ar, 'sol-arco', 0xffffff, '#ffcf6b');
    ponLineas(gSol, hr, 'sol-hora', 0x888888);
    ponLineas(gSol, hoy, 'sol-hoy', 0xffffff, '#ffcf6b');
    // ventana solar: el velo entre los solsticios
    // una banda: los dos arcos remuestreados al mismo número de puntos
    const remuestrea = (a, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n * (a.length - 1), k = Math.min(a.length - 2, Math.floor(t)), f = t - k;
      return [0, 1, 2].map(j => a[k][j] + (a[k + 1][j] - a[k][j]) * f); });
    const v = remuestrea(arcos.verano, 80), w = remuestrea(arcos.invierno, 80), vm = new Malla();
    for (let i = 0; i < 80; i++) vm.quad(v[i], v[i + 1], w[i + 1], w[i]);
    const velo = new THREE.Mesh(vm.geo(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }));
    velo.userData.velo = true; gSol.add(velo);
    // rótulos
    [['N', 0], ['E', 90], ['S', 180], ['O', 270]].forEach(r => rotSol.push({ t: r[0], p: enCielo(0, r[1], R_SOL + 16), c: 'ad-3d-rot ad-3d-rot--rumbo' }));
    for (let h = 6; h <= 18; h += 2) { const q = G.solEn(DIAS.invierno, h); if (q.alt > 2) rotSol.push({ t: h + ' h', p: enCielo(q.alt - 3, q.az, R_SOL), c: 'ad-3d-rot' }); }
    [['21 jun', DIAS.verano], ['21 dic', DIAS.invierno]].forEach(r => { const q = G.solEn(r[1], 12); rotSol.push({ t: r[0], p: enCielo(q.alt + 4, q.az, R_SOL), c: 'ad-3d-rot' }); });
  }
  const discoTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 14, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: discoTex, transparent: true, depthWrite: false, sizeAttenuation: false }));
  sol.scale.set(0.05, 0.05, 1); gSol.add(sol);
  const horaSol = { t: '', p: [0, 0, 0], c: 'ad-3d-rot ad-3d-rot--hoy' }; rotSol.push(horaSol);
  rotSol.forEach(r => { r.el = document.createElement('span'); r.el.className = r.c; r.el.textContent = r.t; capaRot.appendChild(r.el); });

  /* ===== 11. Personas =====
     Siluetas como la hoja de referencia de Gabriel: cuerpo alargado y
     cerrado, cabeza ovalada, sin cara ni detalle; parejas, adulto con niño,
     con bolsa o maleta, con carrito, al teléfono, sentado. Cada figura se
     arma con piezas (torso, cabeza, piernas y brazos) y se dibuja en cuatro
     poses de la caminata (juntas, zancada, juntas, la otra zancada): al
     caminar cambia de pose cada 35 cm. Todo va en un atlas (relleno negro,
     trazo blanco: tapan lo de atrás) y cada persona es una instancia de un
     cuadro que mira a la cámara y queda derecho en pantalla: una sola llamada
     de dibujo para todas.
     Dónde: sólo en la banqueta y dentro del predio. El doble que antes como
     mínimo (banquetas, senderos, la plaza) y el doble de densidad sobre las
     circulaciones peatonales de la lámina (que no se dibujan); grupos quietos
     en los accesos peatonales. */
  const gPers = new THREE.Group(); gPers.visible = false; escena.add(gPers);
  const FIG = (() => {
    const T = 100, A = 160, S = 2, POSES = 4;
    // tipo → función de dibujo (x: el contexto 2D, p: la pose)
    const pierna = (x, hx, hy, ang, L, g0, g1) => {   // pierna afilada de la cadera al tobillo, con su pie
      const s = Math.sin(ang), c = Math.cos(ang), fx = hx + s * L, fy = hy + c * L, nx = c, ny = -s;
      x.beginPath();
      x.moveTo(hx - nx * g0, hy - ny * g0); x.lineTo(fx - nx * g1, fy - ny * g1); x.lineTo(fx + 6, fy); x.lineTo(fx + nx * g1, fy + ny * g1); x.lineTo(hx + nx * g0, hy + ny * g0);
      x.closePath(); x.fill(); x.stroke();
    };
    const brazo = (x, sx, sy, ang, L, g) => {
      const s = Math.sin(ang), c = Math.cos(ang), ex = sx + s * L, ey = sy + c * L, nx = c, ny = -s;
      x.beginPath();
      x.moveTo(sx - nx * g, sy - ny * g); x.quadraticCurveTo(ex - nx * g * 0.6, ey - ny * g * 0.6, ex, ey + 1.5); x.quadraticCurveTo(ex + nx * g * 0.6, ey + ny * g * 0.6, sx + nx * g, sy + ny * g);
      x.closePath(); x.fill(); x.stroke();
      return [ex, ey];
    };
    const ovalo = (x, cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); x.stroke(); };
    // una persona: cx (centro), k (escala: 1 adulto, 0.6 niño), p (pose), o: { abrigo, ancho, sinBrazos, brazo: ang fijo }
    function persona(x, cx, k, p, o = {}) {
      const sueloY = 156, H = (y) => sueloY - (156 - y) * k, X = (d) => cx + d * k, a = p.pierna, b = p.brazo, bob = p.bob * k;
      const cadera = H(88) + bob, hombro = H(38) + bob, w = (o.ancho || 1);
      x.save();
      // atrás: brazo y pierna del otro lado
      if (!o.sinBrazos) brazo(x, X(-3), hombro + 3 * k, o.brazoFijo !== undefined ? -o.brazoFijo : -b, 44 * k, 3.2 * k);
      pierna(x, X(-2), cadera, -a, (sueloY - cadera) / Math.cos(a), 5 * k, 2.4 * k);
      // torso alargado (o abrigo hasta abajo)
      const baja = o.abrigo ? H(128) + bob : cadera + 4 * k;
      x.beginPath();
      x.moveTo(X(0), H(30) + bob);
      x.bezierCurveTo(X(-9 * w), H(31) + bob, X(-14 * w), H(42) + bob, X(-14 * w), H(58) + bob);
      x.bezierCurveTo(X(-14 * w), (H(70) + baja) / 2, X((o.abrigo ? -17 : -11) * w), baja - 6 * k, X((o.abrigo ? -15 : -9) * w), baja);
      x.lineTo(X((o.abrigo ? 15 : 9) * w), baja);
      x.bezierCurveTo(X((o.abrigo ? 17 : 11) * w), baja - 6 * k, X(14 * w), (H(70) + baja) / 2, X(14 * w), H(58) + bob);
      x.bezierCurveTo(X(14 * w), H(42) + bob, X(9 * w), H(31) + bob, X(0), H(30) + bob);
      x.closePath(); x.fill(); x.stroke();
      pierna(x, X(2), cadera, a, (sueloY - cadera) / Math.cos(a), 5 * k, 2.4 * k);
      ovalo(x, X(1), H(20) + bob, 6.2 * k, 8.8 * k);
      let mano = null;
      if (!o.sinBrazos) mano = brazo(x, X(4), hombro + 3 * k, o.brazoFijo !== undefined ? o.brazoFijo : b, (o.brazoLargo || 44) * k, 3.2 * k);
      x.restore();
      return mano;
    }
    const TIPOS = [
      (x, p) => persona(x, 50, 1, p),                                                          // 0 alargado
      (x, p) => persona(x, 50, 1, p, { abrigo: true, ancho: 1.05 }),                           // 1 de abrigo
      (x, p) => { const m = persona(x, 48, 1, p, { ancho: 0.95 }); ovalo(x, m[0] + 2, m[1] + 7, 6.5, 7.5); },   // 2 con bolsa
      (x, p) => { const m = persona(x, 46, 1, p, { abrigo: true }); x.beginPath(); x.rect(m[0] - 2, m[1], 12, 15); x.fill(); x.stroke(); },   // 3 con maleta
      (x, p) => persona(x, 50, 0.62, p),                                                       // 4 niño
      (x, p) => {                                                                               // 5 adulto con niño de la mano
        persona(x, 64, 1, p, { brazoFijo: -0.25 });
        const m = persona(x, 30, 0.6, { pierna: p.pierna, brazo: 0, bob: p.bob }, { brazoFijo: 0.9, brazoLargo: 30 });
        x.beginPath(); x.moveTo(m[0], m[1]); x.lineTo(56, 110); x.stroke();
      },
      (x, p) => { persona(x, 60, 1.02, p); persona(x, 40, 0.95, { pierna: -p.pierna, brazo: -p.brazo, bob: p.bob }, { abrigo: true }); },   // 6 pareja
      (x, p) => persona(x, 50, 1, p, { ancho: 0.85, brazoFijo: Math.PI - 0.5, brazoLargo: 30 }), // 7 al teléfono (la mano a la cabeza)
      (x, p) => {                                                                               // 8 con carrito
        x.beginPath(); x.rect(62, 126, 34, 12); x.fill(); x.stroke();
        [[67, 112, 18], [75, 108, 22], [83, 114, 16]].forEach(q => { x.beginPath(); x.rect(q[0], q[1], 5, q[2]); x.fill(); x.stroke(); });
        ovalo(x, 68, 146, 5.5, 5.5); ovalo(x, 90, 146, 5.5, 5.5);
        persona(x, 36, 1, p, { brazoFijo: 0.95, brazoLargo: 34 });
        x.beginPath(); x.moveTo(56, 122); x.lineTo(62, 128); x.stroke();
      },
      (x) => {                                                                                  // 9 sentado en una banca
        x.beginPath(); x.moveTo(16, 118); x.lineTo(86, 118); x.moveTo(20, 118); x.lineTo(20, 156); x.moveTo(82, 118); x.lineTo(82, 156); x.stroke();
        x.beginPath(); x.moveTo(44, 72); x.bezierCurveTo(35, 74, 33, 86, 35, 100); x.lineTo(37, 116); x.lineTo(64, 116); x.lineTo(66, 154); x.lineTo(73, 156); x.lineTo(72, 108);
        x.lineTo(51, 106); x.lineTo(51, 88); x.bezierCurveTo(51, 78, 50, 72, 44, 72); x.closePath(); x.fill(); x.stroke();
        ovalo(x, 44, 61, 6, 8.5);
        brazo(x, 46, 80, 0.6, 26, 3);
      },
      (x, p) => persona(x, 50, 1.04, p, { ancho: 0.8 })                                          // 10 alto y delgado
    ];
    const N = TIPOS.length, c = document.createElement('canvas');
    c.width = N * T * S; c.height = POSES * A * S;
    const x = c.getContext('2d');
    x.lineJoin = 'round'; x.lineCap = 'round';
    for (let f = 0; f < POSES; f++) {
      const s = Math.sin(f * Math.PI / 2), pose = { pierna: s * 0.36, brazo: -s * 0.42, bob: f % 2 ? 1.5 : 0 };
      TIPOS.forEach((t, i) => {
        x.save(); x.scale(S, S); x.translate(i * T, f * A);
        x.fillStyle = '#000'; x.strokeStyle = '#fff'; x.lineWidth = 2.1;
        t(x, pose);
        x.restore();
      });
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return { tex, N, POSES, alto: A / 145 * 1.72, ancho: T / 145 * 1.72, camina: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10] };   // m: la figura (y 11 → 156) mide 1.72 m
  })();
  const matPers = matAtlas(FIG.tex, FIG.N, FIG.POSES);
  const PERS = [];   // { u, v, tile, esc, ruta, acc, largo, vel, s0, lado } o quieto { u, v, tile, esc, flip }
  {
    const azar = G.aleatorio(77), img = (r, x, y) => [PB.u0 + (x - r[0]) / (r[2] - r[0]) * (PB.u1 - PB.u0), PB.v1 - (y - r[1]) / (r[3] - r[1]) * (PB.v1 - PB.v0)];
    // sólo banqueta y predio: de guarnición a guarnición
    const dentro = q => [Math.max(GU.o + 0.6, Math.min(GU.e - 0.6, q[0])), Math.max(GU.s + 0.6, Math.min(GU.n - 0.6, q[1]))];
    const tipo = () => FIG.camina[Math.floor(azar() * FIG.camina.length)];
    function ruta(pts, n, vel) {   // n personas repartidas en la ruta, de ida y vuelta
      pts = pts.map(dentro);
      const acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = acc[acc.length - 1];
      for (let k = 0; k < n; k++) PERS.push({ ruta: pts, acc, largo: L, vel: (vel || 1.25) * (0.8 + azar() * 0.4) * (azar() < 0.5 ? 1 : -1), s0: azar() * L * 2,
        tile: tipo(), esc: 0.92 + azar() * 0.16, lado: (azar() - 0.5) * 2 });
    }
    function quieto(u, v, tile) { const q = dentro([u, v]); PERS.push({ u: q[0], v: q[1], tile, esc: 0.92 + azar() * 0.16, flip: azar() < 0.5 ? 1 : -1 }); }
    // circulaciones peatonales de la lámina (marco del predio: x 543–677, y 121–322): doble densidad
    const R3 = [543, 121, 677, 322], dens = 2 * 0.055;
    [[[527, 140], [548, 138], [575, 140], [600, 150], [622, 165], [640, 185], [658, 205], [678, 216], [702, 219]],
      [[625, 106], [624, 130], [622, 160], [616, 200], [612, 230], [610, 255], [600, 280], [580, 295], [560, 308], [552, 330], [551, 355]],
      [[556, 210], [575, 205], [592, 190], [605, 170], [620, 160], [632, 158]]].forEach(p => {
      const pts = p.map(q => dentro(img(R3, q[0], q[1])));
      let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      ruta(pts, Math.round(L * dens));
    });
    // el resto: el doble que antes (16 → 32) en las banquetas y los senderos
    const m = 2;
    ruta([[PB.u0 - m, PB.v0 - m], [PB.u1 + m, PB.v0 - m], [PB.u1 + m, PB.v1 + m], [PB.u0 - m, PB.v1 + m], [PB.u0 - m, PB.v0 - m]], 22, 1.3);
    if (PAI) PAI.senderos.forEach((s, i) => { if (i % 2 === 0) ruta([[s[0], s[1]], [s[2], s[3]]], 1, 0.9); });
    // grupos quietos en los accesos peatonales (lámina 1: x 76–210, y 115–316) y en la plaza
    const R1 = [76, 115, 210, 316];
    [[150, 99, 0, -1], [229, 155, -1, 0], [229, 215, -1, 0], [50, 220, 1, 0], [106, 328, 0, 1]].forEach(a => {
      const q = img(R1, a[0], a[1]);
      for (let k = 0; k < 3; k++) quieto(q[0] - a[2] * (1 + azar() * 3) + (azar() - 0.5) * 3, q[1] + a[3] * (1 + azar() * 3) + (azar() - 0.5) * 3, tipo());
    });
    for (let k = 0; k < 8; k++) quieto(PLAZA_C.u0 + 6 + azar() * (PLAZA_C.u1 - PLAZA_C.u0 - 18), PLAZA_C.v0 + 14 + azar() * (PLAZA_C.v1 - PLAZA_C.v0 - 20), k < 3 ? 9 : tipo());
  }
  const nP = PERS.length;
  const geoP = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
  geoP.instanceCount = nP;
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(nP * 3), 3), aEsc = new THREE.InstancedBufferAttribute(new Float32Array(nP * 2), 2);
  const aTile = new THREE.InstancedBufferAttribute(new Float32Array(nP), 1), aVolt = new THREE.InstancedBufferAttribute(new Float32Array(nP), 1);
  const aPose = new THREE.InstancedBufferAttribute(new Float32Array(nP), 1);
  aPos.setUsage(THREE.DynamicDrawUsage); aVolt.setUsage(THREE.DynamicDrawUsage); aPose.setUsage(THREE.DynamicDrawUsage);
  PERS.forEach((p, i) => { aEsc.setXY(i, FIG.ancho * p.esc, FIG.alto * p.esc); aTile.setX(i, p.tile); aVolt.setX(i, p.flip || 1); });
  geoP.setAttribute('aPos', aPos); geoP.setAttribute('aEsc', aEsc); geoP.setAttribute('aTile', aTile); geoP.setAttribute('aVolt', aVolt); geoP.setAttribute('aPose', aPose);
  const mallaP = new THREE.Mesh(geoP, matPers); mallaP.frustumCulled = false; gPers.add(mallaP);
  const derecha = new THREE.Vector3();
  function enRuta(p, s) {   // posición y dirección a la distancia s (ida y vuelta)
    const L = p.largo, t = ((s % (2 * L)) + 2 * L) % (2 * L), d = t <= L ? t : 2 * L - t, va = t <= L ? 1 : -1;
    let i = 1; while (i < p.acc.length - 1 && p.acc[i] < d) i++;
    const a = p.ruta[i - 1], b = p.ruta[i], f = (d - p.acc[i - 1]) / ((p.acc[i] - p.acc[i - 1]) || 1);
    const du = (b[0] - a[0]) * va, dv = (b[1] - a[1]) * va, n = Math.hypot(du, dv) || 1;
    return [a[0] + (b[0] - a[0]) * f - dv / n * p.lado * va, a[1] + (b[1] - a[1]) * f + du / n * p.lado * va, du / n, dv / n];
  }
  function camina(ms) {
    if (!capas.personas) return;
    const t = ms / 1000;
    derecha.setFromMatrixColumn(cam.matrixWorld, 0);
    PERS.forEach((p, i) => {
      let u = p.u, v = p.v, volt = p.flip || 1, pose = 0;
      if (p.ruta) {
        const s = p.s0 + p.vel * t, r = enRuta(p, s);
        pose = Math.floor(Math.abs(s) / 0.35) % 4;   // un paso cada 35 cm
        u = r[0]; v = r[1];
        const w = W(r[0] + r[2], r[1] + r[3], 0), o = W(r[0], r[1], 0);
        volt = (w[0] - o[0]) * derecha.x + (w[2] - o[2]) * derecha.z >= 0 ? 1 : -1;
      }
      const q = W(u, v, 0.25);
      aPos.setXYZ(i, q[0], q[1], q[2]); aVolt.setX(i, volt); aPose.setX(i, pose);
    });
    aPos.needsUpdate = true; aVolt.needsUpdate = true; aPose.needsUpdate = true;
    pide();
  }

  /* ===== 12. Accesos (lámina): peatonales en rojo, vehiculares en azul =====
     Un triángulo sobre la banqueta, apuntando hacia adentro del predio. */
  const gAcc = new THREE.Group(); gAcc.visible = false; escena.add(gAcc);
  {
    const img = (r, x, y) => [PB.u0 + (x - r[0]) / (r[2] - r[0]) * (PB.u1 - PB.u0), PB.v1 - (y - r[1]) / (r[3] - r[1]) * (PB.v1 - PB.v0)];
    // [x, y de la lámina, hacia adentro (du, dv)]
    const peat = [[150, 99, 0, -1], [229, 155, -1, 0], [229, 215, -1, 0], [50, 220, 1, 0], [106, 328, 0, 1]].map(a => [img([76, 115, 210, 316], a[0], a[1]), a[2], a[3]]);
    // vehiculares: la lámina corregida (marco x 26–160, y 76–277): norte, oriente (junto a la esquina sur) y sur
    const veh = [[49, 60, 0, -1], [168, 261, -1, 0], [84, 291, 0, 1]].map(a => [img([26, 76, 160, 277], a[0], a[1]), a[2], a[3]]);
    function flechas(lista, color) {
      const m = new Malla(), l = new Lineas(), z0 = 0.3, z1 = 0.9, L = 5.5, A = 2.6;
      lista.forEach(([q, du, dv]) => {
        // la punta toca la fachada; la base, sobre la banqueta
        const u = Math.max(PB.u0, Math.min(PB.u1, q[0])), v = Math.max(PB.v0, Math.min(PB.v1, q[1]));
        const pu = du ? (du > 0 ? PB.u0 : PB.u1) : u, pv = dv ? (dv > 0 ? PB.v0 : PB.v1) : v;
        const tri = [[pu, pv], [pu - du * L - dv * A, pv - dv * L + du * A], [pu - du * L + dv * A, pv - dv * L - du * A]];
        prisma(m, tri, z0, z1);
        l.poli(tri.map(p => W(p[0], p[1], z1 + 0.01)), true);
      });
      const me = new THREE.Mesh(m.geo(), new THREE.MeshBasicMaterial({ color }));
      gAcc.add(me);
      gAcc.add(new THREE.LineSegments(l.geo(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })));
    }
    flechas(peat, 0xe0393e);
    flechas(veh, 0x1f5fb4);
  }

  /* ===== 13. Mapa Nolli =====
     La planta como figura y fondo: el espacio público en blanco (calles,
     banquetas, el piso libre del predio, la plaza y el interior público de
     naves y pabellones, con su contorno), lo construido y lo privado en negro
     (los edificios del contexto, la industria, la chimenea). La cámara se va a
     planta, con el norte arriba; todo lo demás se esconde. */
  const gNolli = new THREE.Group(); gNolli.visible = false; escena.add(gNolli);
  let nolliHecho = false;
  function armaNolli() {
    if (nolliHecho) return;
    nolliHecho = true;
    const D = G.D, R = D.rect, blanco = new THREE.MeshBasicMaterial({ color: 0xeeeeea }), negro = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const piso = new Malla(); tapa(piso, rect(R.u0, R.v0, R.u1, R.v1), -0.05);
    gNolli.add(new THREE.Mesh(piso.geo(), blanco));
    const ed = new Malla();
    // los del contexto (no los que caen en el predio: ahí manda el proyecto)
    D.edificios.forEach(f => {
      const pol = G.pares(f, 1), cu = pol.reduce((a, q) => a + q[0], 0) / pol.length, cv = pol.reduce((a, q) => a + q[1], 0) / pol.length;
      if (!(cu > GU.o && cu < GU.e && cv > GU.s && cv < GU.n)) tapa(ed, pol, 0.05);
    });
    if (MOD && MOD.industria) tapa(ed, G.pares(MOD.industria.planta), 0.06);
    if (MOD && MOD.chimenea) { const c = MOD.chimenea.base; tapa(ed, rect(c[0], c[1], c[2], c[3]), 0.06); }
    gNolli.add(new THREE.Mesh(ed.geo(), negro));
    // interior público: naves y pabellones (blanco con contorno), el predio y Heliotropo
    const l = new Lineas();
    G.NAVES.forEach(nv => l.poli(rect(nv.L.u0, nv.L.v0, nv.L.u1, nv.L.v1).map(q => W(q[0], q[1], 0.08)), true));
    CULTURA.pabellones.forEach(pb => {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const t = (pb[0] + (pb[1] - pb[0]) * i / 20) * RAD; pts.push(W(ANILLO.u + Math.cos(t) * CULTURA.r1, ANILLO.v + Math.sin(t) * CULTURA.r1, 0.08)); }
      for (let i = 20; i >= 0; i--) { const t = (pb[0] + (pb[1] - pb[0]) * i / 20) * RAD; pts.push(W(ANILLO.u + Math.cos(t) * CULTURA.r0, ANILLO.v + Math.sin(t) * CULTURA.r0, 0.08)); }
      l.poli(pts, true);
    });
    l.poli(rect(PB.u0, PB.v0, PB.u1, PB.v1).map(q => W(q[0], q[1], 0.08)), true);
    gNolli.add(new THREE.LineSegments(l.geo(), new THREE.LineBasicMaterial({ color: 0x777777 })));
  }

  /* ----- capas ----- */
  const capas = { modulos: !!MOD, paisaje: !!PAI, estructura: false, sol: false, flujos: false, arboles: false, personas: false, accesos: false, nolli: false };
  function visibles() {
    // Nolli: sólo la figura y fondo (más los accesos y las personas, si están)
    const n = capas.nolli;
    piezas.forEach(p => { p.g.visible = !n && !p.g.userData.oculto; });
    gMods.forEach(g => { g.visible = !n && capas.modulos && !ocultos.has('vivienda'); });
    gPai.visible = gPlantas.visible = !n && capas.paisaje && !gPai.userData.oculto;
    gCol.visible = !n && capas.estructura;
    gEst.visible = !n && ESC === 'estacionamiento';
    gSol.visible = !n && capas.sol;
    gPers.visible = capas.personas;
    gAcc.visible = capas.accesos;
    gNolli.visible = n;
    // lo que se ocultó desde el menú de lo propuesto
    piezas.forEach(p => { if (ocultos.has(p.ap)) p.g.visible = false; });
    gPers.visible = capas.personas && !ocultos.has('personas');
    capaRot.classList.toggle('con-sol', capas.sol && !n);
    // sin paisaje, el predio es predio (no área verde)
    if (MATS.verde) MATS.verde.userData.papel = capas.paisaje ? 'verde' : 'predio';
  }

  /* ===== Cámara =====
     Libre, como en Rhino: gira alrededor del punto al que mira (base.c), se
     mueve sin topes y el zoom se acerca de verdad hacia lo que está bajo el
     cursor (el punto que mira se va con él). base.h es la media altura de lo
     que se ve a la distancia de ese punto (en perspectiva da la distancia).
     El encuadre de la caja (encuadra) sólo se usa al abrir, con doble clic y
     al prender el sol. */
  const EL_MIN = 2, EL_MAX = 89, H_MIN = 1.5, H_MAX = 3000;
  let AZ = 20, EL = 30, X = -1, ASP = 1;
  let base = { c: new THREE.Vector3(), h: 100 };
  function caja() {   // [u0, u1, v0, v1, z0, z1] de lo que se encuadra
    if (capas.nolli) return [S.u0 - 110, S.u1 + 110, S.v0 - 90, S.v1 + 90, 0, 1];
    if (capas.sol) return [CEN[0] - R_SOL, CEN[0] + R_SOL, CEN[1] - R_SOL, CEN[1] + R_SOL, 0, R_SOL];
    if (GENERAL) return [S.u0, S.u1, S.v0, S.v1, 0, MOD ? MOD.z0 + 8 * MOD.alto : 14];
    return cajaAp(ESC);
  }
  function cajaAp(ap) {
    const us = [], vs = []; let z0 = 0, z1 = 10;
    const mete = q => { us.push(q[0]); vs.push(q[1]); };
    if (ap === 'estacionamiento' && EST) { EST.bloques.forEach(b => G.pares(b.planta).forEach(mete)); z0 = -EST.sotanos * EST.entrepiso; z1 = 0; }
    else if (ap === 'comercio') { G.NAVES.forEach(nv => { mete([nv.L.u0, nv.L.v0]); mete([nv.L.u1, nv.L.v1]); }); z1 = 9; }
    else if (ap === 'industria' && MOD && MOD.industria) { G.pares(MOD.industria.planta).forEach(mete); if (MOD.chimenea) { mete(MOD.chimenea.base.slice(0, 2)); mete(MOD.chimenea.base.slice(2)); } z1 = MOD.chimenea ? MOD.chimenea.z1 : MOD.industria.z1; }
    else if (ap === 'cultura') { [[PLAZA_C.u0, PLAZA_C.v0], [PLAZA_C.u1, PLAZA_C.v1]].forEach(mete); mete([ANILLO.u - ANILLO.re, ANILLO.v - ANILLO.re]); z1 = ANILLO.z; }
    else if (ap === 'aro') { mete([ANILLO.u - ANILLO.re, ANILLO.v - ANILLO.re]); mete([ANILLO.u + ANILLO.re, ANILLO.v + ANILLO.re]); z1 = ANILLO.z + 1; }
    else { mete([PB.u0, PB.v0]); mete([PB.u1, PB.v1]); z1 = 2; }
    return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs), z0, z1];
  }
  function direccion() {   // de la cámara hacia el centro, en el mundo
    const a = AZ * RAD, e = EL * RAD, st = Math.sin(a), ct = Math.cos(a);
    return new THREE.Vector3(st * Math.cos(e), -Math.sin(e), -ct * Math.cos(e));
  }
  // encuadra la caja: centro y media altura en el plano de vista
  function encuadra() {
    const k = caja(), d = direccion(), up = new THREE.Vector3(0, 1, 0), r = new THREE.Vector3().crossVectors(d, up).normalize(), u = new THREE.Vector3().crossVectors(r, d).normalize();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const c0 = new THREE.Vector3(...W((k[0] + k[1]) / 2, (k[2] + k[3]) / 2, (k[4] + k[5]) / 2));
    [k[0], k[1]].forEach(uu => [k[2], k[3]].forEach(vv => [k[4], k[5]].forEach(zz => {
      const p = new THREE.Vector3(...W(uu, vv, zz)).sub(c0), px = p.dot(r), py = p.dot(u);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    })));
    const aire = GENERAL || capas.sol ? 1.06 : 1.25;
    let h = (y1 - y0) / 2 * aire, w = (x1 - x0) / 2 * aire;
    if (w / h > ASP) h = w / ASP;
    base = { c: c0.add(r.clone().multiplyScalar((x0 + x1) / 2)).add(u.clone().multiplyScalar((y0 + y1) / 2)), h };
    // en perspectiva lo cercano crece: se ajusta proyectando las esquinas con
    // la cámara de verdad (unas vueltas: centro y tamaño)
    if (cam === camP) {
      const esq = [];
      [k[0], k[1]].forEach(uu => [k[2], k[3]].forEach(vv => [k[4], k[5]].forEach(zz => esq.push(new THREE.Vector3(...W(uu, vv, zz))))));
      for (let it = 0; it < 4; it++) {
        ponCamara(true);
        let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
        esq.forEach(p => { const q = p.clone().project(camP); a0 = Math.min(a0, q.x); a1 = Math.max(a1, q.x); b0 = Math.min(b0, q.y); b1 = Math.max(b1, q.y); });
        base.c.add(r.clone().multiplyScalar((a0 + a1) / 2 * base.h * ASP)).add(u.clone().multiplyScalar((b0 + b1) / 2 * base.h));
        base.h *= Math.max((a1 - a0) / 2, (b1 - b0) / 2) * aire;
      }
    }
    // contexto (x): se aleja hasta ~450 m de media altura
    base.h = base.h * Math.pow(Math.max(1, 450 / base.h), Math.max(0, X));
  }
  function ponCamara() {
    const d = direccion(), up = new THREE.Vector3(0, 1, 0), r = new THREE.Vector3().crossVectors(d, up).normalize(), u = new THREE.Vector3().crossVectors(r, d).normalize();
    const h = base.h, c = base.c;
    camO.left = -h * ASP; camO.right = h * ASP; camO.top = h; camO.bottom = -h;
    camO.position.copy(c).addScaledVector(d, -1500); camO.up.set(0, 1, 0); camO.lookAt(c); camO.updateProjectionMatrix();
    const dist = h / Math.tan(camP.fov / 2 * RAD);
    camP.aspect = ASP; camP.position.copy(c).addScaledVector(d, -dist); camP.up.set(0, 1, 0); camP.lookAt(c);
    camP.near = Math.max(1, dist * 0.05); camP.far = dist * 20; camP.updateProjectionMatrix();
    pide();
  }

  /* ===== Pintado (sólo cuando algo cambió) ===== */
  let pedido = false, muerto = false;
  function pide() { if (!pedido && !muerto) { pedido = true; requestAnimationFrame(pinta); } }
  const tmp = new THREE.Vector3();
  function pinta() {
    pedido = false;
    if (muerto) return;
    renderer.render(escena, cam);
    if (ext.pinta) ext.pinta(cam);
    if (capas.sol) {
      const w = lienzo.clientWidth, h = lienzo.clientHeight;
      rotSol.forEach(r => {
        tmp.set(r.p[0], r.p[1], r.p[2]).project(cam);
        r.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - tmp.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-50%)';
      });
    }
  }
  function tamano() {
    const w = trabajo.clientWidth, h = trabajo.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    Object.keys(MATS).forEach(k => { MATS[k].uniforms.uPx.value = renderer.getPixelRatio(); });
    ASP = w / h;
  }

  /* ===== Interfaz (la misma que el motor SVG) ===== */
  function vista(x, az, el) {
    if (az !== undefined) AZ = ((az % 360) + 360) % 360;
    if (el !== undefined) EL = Math.max(EL_MIN, Math.min(EL_MAX, el));
    const nx = GENERAL ? Math.max(0, Math.min(1, x || 0)) : 0;
    if (nx !== X) { X = nx; encuadra(); if (ext.vista) ext.vista(X); }   // al abrir (y con el contexto)
    ponCamara();
  }
  // el punto del modelo bajo el cursor (o del piso; o el que se mira)
  function puntoEn(fx, fy) {
    ndc.set(fx * 2 - 1, -(fy * 2 - 1));
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(visiblesPicables().concat(suelos), false)[0];
    if (hit) return hit.point;
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : base.c.clone();
  }
  function acerca(f, fx, fy) {
    if (fx === undefined) { fx = 0.5; fy = 0.5; }
    const h = Math.max(H_MIN, Math.min(H_MAX, base.h / f)), k = h / base.h;
    if (k === 1) return;
    // el punto bajo el cursor se queda quieto: la cámara y lo que mira se le acercan
    const P = puntoEn(fx, fy);
    base.c.sub(P).multiplyScalar(k).add(P);
    base.h = h;
    ponCamara();
  }
  function mueve(dfx, dfy) {
    const d = direccion(), r = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, d).normalize();
    base.c.addScaledVector(r, -dfx * 2 * base.h * ASP).addScaledVector(u, dfy * 2 * base.h);
    ponCamara();
  }
  function reencuadra() { vuelaA(); }
  function aspecto(a) { tamano(); if (a) ASP = a; ponCamara(); }
  let ultimoMs = 0;
  function capa(nombre, si) {
    const era = capas[nombre];
    capas[nombre] = !!si;
    if (nombre === 'color') { conColor = !!si; aplicaEstilo(); return; }
    visibles();
    if (nombre === 'paisaje') aplicaEstilo();
    if (nombre === 'sol' && era !== capas.sol) { solea(ultimoMs || performance.now()); vuelaA(); }
    if (nombre === 'personas' && si) camina(ultimoMs || performance.now());
    if (nombre === 'nolli' && era !== capas.nolli) { if (si) armaNolli(); cam = si ? camO : (persp ? camP : camO); vuelaA(); }
    if (ext.capa) ext.capa(nombre, !!si);
    pide();
  }
  // la cámara se va al encuadre nuevo (sol prendido o apagado) en 0.9 s
  function vuelaA() {
    const de = { c: base.c.clone(), h: base.h };
    encuadra();
    const a = { c: base.c.clone(), h: base.h }, t0 = performance.now(), dur = 900;
    const suave = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    (function paso(ms) {
      if (muerto) return;
      const t = Math.min(1, (ms - t0) / dur), k = suave(t);
      base = { c: de.c.clone().lerp(a.c, k), h: de.h * Math.pow(a.h / de.h, k) };
      ponCamara();
      if (t < 1) requestAnimationFrame(paso); else { base = a; ponCamara(); }
    })(t0);
  }
  // Ocultar una parte de lo propuesto ('vivienda', 'comercio', 'industria',
  // 'cultura', 'aro', 'paisajismo', 'estacionamiento'); oculta(ap) sin si: ¿está oculta?
  const ocultos = new Set();
  function oculta(ap, si) {
    if (si === undefined) return ocultos.has(ap);
    if (si) ocultos.add(ap); else ocultos.delete(ap);
    visibles(); pide();
  }
  function seleccion(t) { resalta = t; espacioAct = null; aplicaEstilo(); }
  function espacio(e) { espacioAct = e; if (e) resalta = null; aplicaEstilo(); }
  function solea(ms) {
    ultimoMs = ms;
    if (!capas.sol || !HOY_P.length) return;
    const h0 = HOY_P[0][0], h1 = HOY_P[HOY_P.length - 1][0], h = h0 + (h1 - h0) * ((ms % CICLO_SOL) / CICLO_SOL), q = G.solEn(DIA_HOY, h);
    const p = enCielo(Math.max(0, q.alt), q.az, R_SOL);
    sol.position.set(p[0], p[1], p[2]);
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    horaSol.el.textContent = 'hoy ' + hh + ':' + (mm < 10 ? '0' : '') + mm;
    horaSol.p = [p[0], p[1] + 9, p[2]];
    pide();
  }
  // el estacionamiento: un sótano resaltado (0: todos)
  function sotano(k) {
    estNivel = k;
    estLineas.forEach((l, i) => { l.material = l.material.clone(); l.material.opacity = !k || k === i + 1 ? (k ? 0.9 : 0.4) : 0.08; });
    pide();
  }
  function apartadoEn(ev) {
    if (!ev || ev.clientX === undefined) return null;
    const r = lienzo.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(visiblesPicables(), false)[0];
    return hit ? hit.object.userData.ap : null;
  }

  /* ----- armar y desarmar (como un video: las piezas crecen del piso) ----- */
  function anima(dur, f, listo) {
    const t0 = performance.now();
    (function paso(ms) {
      if (muerto) return;
      const t = Math.min(1, Math.max(0, (ms - t0) / dur));
      f(t); pide();
      if (t < 1) requestAnimationFrame(paso); else if (listo) listo();
    })(t0);
  }
  const salida = t => 1 - Math.pow(1 - t, 3), entrada = t => t * t * t;
  function arma(desde, dur, listo) {
    dur = dur || 1100;
    piezas.forEach(p => { p.g.scale.y = 0.001; });
    anima(dur, t => piezas.forEach(p => {
      const k = Math.min(1, Math.max(0, (t - p.z * 0.55) / 0.45));
      p.g.scale.y = Math.max(0.001, salida(k));
    }), () => { piezas.forEach(p => { p.g.scale.y = 1; }); if (listo) listo(); });
  }
  function desarma(ap, dur, listo) {
    dur = dur || 650;
    anima(dur, t => piezas.forEach(p => {
      if (p.ap && p.ap === ap) return;
      const k = Math.min(1, Math.max(0, (t - (1 - p.z) * 0.4) / 0.6));
      p.g.scale.y = Math.max(0.001, 1 - entrada(k));
    }), listo);
  }
  function destruye() {
    muerto = true;
    if (ext.destruye) ext.destruye();
    escena.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    Object.values(MATS).forEach(m => m.dispose()); Object.values(ARISTAS).forEach(m => m.dispose()); Object.values(LINEAS).forEach(m => m.dispose());
    renderer.dispose();
    lienzo.remove(); capaRot.remove();
    svg.style.display = '';
  }
  function cambiaEstilo(n) {
    if (!ESTILOS[n]) return;
    estilo = ESTILOS[n];
    aplicaEstilo();
  }
  let persp = true;
  function perspectiva(si) { persp = !!si; if (!capas.nolli) cam = si ? camP : camO; ponCamara(); }

  /* ----- extras (atlampa-3d-ctx.js) -----
     ext = EXTRAS.crea(api): lo que el motor les presta (herramientas de
     geometría, piezas, materiales, capas, cámara). Devuelve, si quiere:
       capa(nombre, si)  · vista(x) (0 sitio → 1 contexto) · fluye(ms)
       preparaContexto(listo) · pinta(cam) (rótulos HTML) · destruye() */
  const ext = EXTRAS && EXTRAS.crea ? EXTRAS.crea({
    THREE, G, W, rect, circ, ccw, Malla, Lineas, tapa, muros, prisma, pieza, pon, ponLineas, material, arista, linea,
    escena, raizG, capaRot, trabajo, capas, pide, aplicaEstilo, ESTILOS, PROGRAMA, GENERAL, ESC,
    matAtlas, mallaAtlas, ARBOLES_TEX, matArbol,
    camara: () => cam, X: () => X
  }) || {} : {};

  // arranque
  tamano();
  visibles();
  aplicaEstilo();
  vista(0, AZ, EL);

  return {
    vista, solea, desarma, arma, destruye, apartadoEn, oculta, sotano, acerca, mueve, reencuadra, aspecto, capa, seleccion, espacio,
    preparaContexto(listo) { if (ext.preparaContexto) ext.preparaContexto(listo); else if (listo) listo(); }, separa() {},
    fluye(ms) { if (ext.fluye) ext.fluye(ms); }, camina, precarga() {}, suelo() {},
    minimapa: G.minimapa, limitesElevacion: [EL_MIN, EL_MAX], escena: ESC, tipos: MOD ? MOD.tipos : [],
    aumento: () => 1, azimut: () => AZ, elevacion: () => EL, estilo: cambiaEstilo, perspectiva, estilos: Object.keys(ESTILOS), motor: '3d'
  };
}

window.Atlampa3D = { crea, ESTILOS, ARBOLES_TEX };   // (ARBOLES_TEX: para revisar el atlas desde la consola)

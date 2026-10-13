/* ============================================================
   ATLAMPA — el dibujo en 3D (Three.js, WebGL)
   crea(svg, {escena}) → vista, capa, acerca… (la interfaz que usa el
   tablero, atlampa-pagina.js). La geometría se arma UNA vez
   en coordenadas del mundo y la tarjeta de video sólo mueve la cámara: girar
   no recalcula nada. Las líneas ocultas las resuelve el depth buffer.

   Datos y cálculos del sitio: atlampa-geo.js (window.AtlampaGeo): naves
   recortadas por el aro, plantas, árboles, sol, laguna, minimapa…

   Mundo: x = u − CEN.u (este-oeste del modelo), y = z (arriba),
          z = −(v − CEN.v). La cámara usa el mismo azimut y altura que el SVG.

   Estilos: cada cosa tiene un papel (suelo, predio, verde, agua, proyecto,
   módulos, vegetación…). Un estilo es una tabla papel → relleno, rayado y
   arista; cambiar de estilo es cambiar uniforms, no geometría.
     rayado  como la referencia: sin grises, el tono es la densidad de un
             rayado fino (más luz = más rayas); aristas blancas; perspectiva.
     plano   el de siempre: rellenos grises con luz y sombra, aristas.

   Fase 1: sitio, naves, industria, cultura, aro, módulos,
   paisaje, estructura, estacionamiento (en rayos X) y sol. Pendiente:
   contexto urbano, personas, flujos, árboles de banqueta, rótulos de calles.
   ============================================================ */
import * as THREE from 'three';

const G = window.AtlampaGeo;
// Extras (fase 2: contexto urbano, árboles de banqueta, postes, flujos,
// rótulos de calles) en su propio archivo; si no está, el motor sigue igual.
const VER = import.meta.url.split('?')[1] || '';
const EXTRAS = await import('./atlampa-3d-ctx.js' + (VER ? '?' + VER : '')).then(m => m, () => null);
// Arte y cultura detallado (arte_y_cultura_concepto.html, por herramientas/prepara-cultura.py):
// va en todas las escenas, en lugar de los pabellones simples.
const CULTURA_DET = await import('./atlampa-3d-cultura.js' + (VER ? '?' + VER : '')).then(m => m, e => { console.warn('Sin arte y cultura detallado:', e); return null; });
const { PB, GU, GF, S, HE, CEN, PIEZAS, ANILLO, CORTE, COLUMNAS, ESPUELA, ESP_FIN, CULTURA, PLAZA_C, GIRO, MOD, EST, PAI, MEX, MEY } = G;
// El mercado de Gabriel (Rhino, por herramientas/prepara-mercado.py): sólo en el apartado Comercio
const MERC = window.ATLAMPA_MERCADO || null;
const RAD = Math.PI / 180;
// caja [u0, v0, u1, v1] menos otra caja: las (hasta 4) cajas que quedan
function menosCaja(c, h) {
  if (h[0] >= c[2] || h[2] <= c[0] || h[1] >= c[3] || h[3] <= c[1]) return [c];
  const r = [], v0 = Math.max(c[1], h[1]), v1 = Math.min(c[3], h[3]);
  if (h[1] > c[1]) r.push([c[0], c[1], c[2], h[1]]);
  if (h[3] < c[3]) r.push([c[0], h[3], c[2], c[3]]);
  if (h[0] > c[0]) r.push([c[0], v0, h[0], v1]);
  if (h[2] < c[2]) r.push([h[2], v0, c[2], v1]);
  return r.filter(q => q[2] - q[0] > 1e-3 && q[3] - q[1] > 1e-3);
}

/* ---------- Coordenadas ---------- */
const W = (u, v, z) => [u - CEN[0], z, -(v - CEN[1])];

/* ---------- Estilos ---------- */
const PAPELES = ['suelo', 'calle', 'banqueta', 'predio', 'plaza', 'verde', 'tezontle', 'agua', 'filtro', 'proyecto', 'nave', 'industria', 'cultura', 'aro', 'modulo', 'social', 'modcom', 'arbusto', 'copa', 'est', 'rampa', 'vidrio'];
const ESTILOS = {
  clay: {
    // Maqueta editorial: masas mate, luz difusa y un solo protagonista azul.
    // El contexto se mantiene cálido, simplificado y casi monocromático.
    fondo: '#f7f7f4', cielo: '#fbfbf9', perspectiva: false,
    papel: {
      suelo: { modo: 1, gris: 0.28, arista: 0.08 }, calle: { modo: 1, gris: 0.56, grano: 0.018, arista: 0.16 },
      banqueta: { modo: 1, gris: 0.48, grano: 0.008, arista: 0.18 }, predio: { modo: 1, gris: 0.42, arista: 0.3 },
      plaza: { modo: 1, gris: 0.5, grano: 0.008, arista: 0.22 }, verde: { modo: 1, gris: 0.6, arista: 0.08 },
      tezontle: { modo: 1, gris: 0.58, grano: 0.014, arista: 0.08 }, agua: { modo: 1, gris: 0.68, arista: 0.2 },
      filtro: { modo: 1, gris: 0.62, arista: 0.16 }, nave: { modo: 1, gris: 0.96, arista: 0.72 },
      industria: { modo: 1, gris: 0.96, arista: 0.72 }, cultura: { modo: 1, gris: 0.96, arista: 0.72 },
      aro: { modo: 1, gris: 0.96, arista: 0.76 }, modulo: { modo: 1, gris: 0.96, arista: 0.68 },
      modcom: { modo: 1, gris: 0.96, arista: 0.72 }, arbusto: { modo: 1, gris: 0.7, arista: 0.08 },
      copa: { modo: 1, gris: 0.68, arista: 0.06 }, est: { modo: 1, gris: 0.66, arista: 0.28 },
      rampa: { modo: 1, gris: 0.68, arista: 0.22 }, proyecto: { modo: 1, gris: 0.96, arista: 0.72 },
      vidrio: { modo: 3, gris: 0.18, arista: 0.42 }
    },
    lineas: { pasto: 0.36, flor: 0.5, junco: 0.34, tronco: 0.46, sendero: 0.32, rayo: 0.18, columna: 0.5, est: 0.34, rampa: 0.58, sol: 0.4, vidrio: 0.42 }
  },
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
      modulo: { modo: 2, tono: 0, gris: 0.02, arista: 0.8 }, modcom: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 }, arbusto: { tono: 0.5, paso: 2.2, grueso: 0.35, arista: 0 },
      copa: { tono: 0.5, paso: 2.4, grueso: 0.35, arista: 0 }, est: { tono: 0.1, paso: 6, arista: 0.4 }, rampa: { tono: 0.3, paso: 2.2, arista: 0 }, proyecto: { modo: 2, tono: 0, gris: 0.02, arista: 0.9 },
      vidrio: { modo: 3, gris: 0.07, arista: 0.55 }
    },
    lineas: { pasto: 0.36, flor: 0.85, junco: 0.34, tronco: 0.45, sendero: 0.3, rayo: 0.14, columna: 0.4, est: 0.3, rampa: 0.75, sol: 0.45, vidrio: 0.5 }
  },
  plano: {
    fondo: '#000000', perspectiva: false,
    // modo 1: relleno gris con luz
    papel: {
      suelo: { gris: 0.045, arista: 0.15 }, calle: { gris: 0.02, arista: 0.2 }, banqueta: { gris: 0.075, arista: 0.32 }, predio: { gris: 0.065, arista: 0.75 },
      plaza: { gris: 0.1, arista: 0.4 }, verde: { gris: 0.07, arista: 0 }, tezontle: { gris: 0.1, arista: 0 }, agua: { gris: 0.04, arista: 0.5 },
      filtro: { gris: 0.09, arista: 0.35 }, nave: { gris: 0.17, arista: 0.95 }, industria: { modo: 2, tono: 0.7, paso: 2.4, gris: 0.04, arista: 0.85 }, cultura: { gris: 0.18, arista: 0.95 },
      aro: { gris: 0.24, arista: 1 }, modulo: { gris: 0.55, arista: 0.6 }, modcom: { gris: 0.17, arista: 0.95 }, arbusto: { gris: 0.12, arista: 0 }, copa: { gris: 0.1, arista: 0 },
      est: { gris: 0.05, arista: 0.4 }, rampa: { gris: 0.12, arista: 0 }, proyecto: { gris: 0.17, arista: 1 }, vidrio: { modo: 3, gris: 0.09, arista: 0.6 }
    },
    lineas: { pasto: 0.32, flor: 0.85, junco: 0.3, tronco: 0.4, sendero: 0.3, rayo: 0.15, columna: 0.4, est: 0.3, rampa: 0.75, sol: 0.45, vidrio: 0.5 }
  }
};
// colores del programa (lámina de usos), para el modo Color
// (en tonos claros: sobre el fondo negro tienen que leerse)
const PROGRAMA = { vivienda: '#ff5cb0', comercio: '#8a98ff', industria: '#d2d4d8', publico: '#ff6f63', cultura: '#c9a6ff', verde: '#a8e063', agua: '#8fd0ff', tez: '#ff9a6b', est: '#d2d4d8', aro: '#f2c14e', social: '#e8ff5a' };
const CLAY_PROGRAMA = {
  vivienda: '#dc3e8d', comercio: '#4056b5', industria: '#9da1a7', publico: '#dd554d', cultura: '#9271c9',
  verde: '#77a350', agua: '#63a2bd', tez: '#b87855', est: '#9da1a7', aro: '#d1a536', social: '#a7b94a'
};
const CLAY_TINTA = {
  suelo: '#deded9', calle: '#cfd1d0', banqueta: '#dedfdb', predio: '#e6e5df', plaza: '#deded9',
  verde: '#b7bbb5', tezontle: '#c4c2bc', agua: '#aebbc1', filtro: '#b7bbb5', arbusto: '#9ea49e', copa: '#979d98',
  est: '#b8bbbd', rampa: '#b8bbbd', contexto: '#e7e4dc', ctxsuelo: '#dadbd8', carro: '#aeb2b5'
};
// qué programa / espacio es cada papel
const PROG_DE = { social: 'social', nave: 'comercio', vidrio: 'comercio', industria: 'industria', cultura: 'cultura', modulo: 'vivienda', modcom: 'comercio', social: 'social', aro: 'aro', predio: 'publico', plaza: 'publico', verde: 'verde', agua: 'agua', filtro: 'agua', tezontle: 'tez', arbusto: 'verde', copa: 'verde', est: 'est', rampa: 'est' };
// Público / privado (un solo botón, dos colores): privado, los volúmenes de
// vivienda y la industria; lo demás del proyecto, público (también los módulos
// que se abren al aro, que son comercio). Lo que no es del proyecto (calles,
// contexto, estacionamiento) no se colorea.
const ESPACIO_DE = { modulo: 'privado', industria: 'privado' };
const ESPACIO_COLOR = { publico: '#35d0c4', privado: '#ff7a3d' };
const DEL_PROYECTO = ['predio', 'plaza', 'verde', 'tezontle', 'agua', 'filtro', 'banqueta', 'nave', 'vidrio', 'industria', 'cultura', 'aro', 'modulo', 'social', 'modcom', 'arbusto', 'copa', 'proyecto'];
const espacioDe = papel => DEL_PROYECTO.indexOf(papel) >= 0 ? (ESPACIO_DE[papel] || 'publico') : null;
// qué papeles resalta cada opción de Resaltar (y las líneas de plantas van con el paisaje)
const RESALTA_PAPELES = { modulos: ['modulo', 'social'], comercio: ['nave', 'modcom', 'vidrio'], cultura: ['cultura', 'plaza'], industria: ['industria'], aro: ['aro'],
  paisajismo: ['verde', 'tezontle', 'agua', 'filtro', 'arbusto', 'copa'], estacionamiento: ['est', 'rampa'] };
const LINEAS_PAISAJE = ['pasto', 'flor', 'junco', 'tronco', 'sendero', 'rayo'];
// los árboles que se plantan con el proyecto son jóvenes (Gabriel: «no tienen tanto tiempo ahí»): 60 % del porte
// de antes; los de banqueta (existentes) no cambian
const ARBOL_JOVEN = 0.6;

/* Corte en planta: un plano horizontal a CORTE_ALTO m (la planta baja, a la
   altura de la vista). Lo de arriba se descarta; donde el corte abre un sólido
   se ve su interior (las caras de atrás) en un gris liso, y el contorno del
   corte (donde el plano cruza cada cara) en blanco, como una sección; las
   columnas que lo cruzan, un cuadrito. Las líneas se recortan con el plano
   de la cámara (clippingPlanes). */
const CORTE_ALTO = 1.75;
const CORTE_Y = { value: 1e5 };   // altura del corte (m, y del mundo; enorme = sin corte)

/* Dibujar como a mano (las transiciones): cada arista se traza desde una de
   sus puntas, en un orden que mezcla un barrido (desde un punto, radial, o en
   una dirección), el largo (primero los trazos largos, como al encajar un
   croquis) y un poco de azar; después las caras se rellenan con el mismo
   barrido: al frente del relleno va una banda de rayado, como si se sombreara.
   Mientras las caras no se rellenan, se ve a través: primero el croquis en
   alambre, luego tapa lo de atrás. Todo en la tarjeta de video (uniforms):
     uDib  x: avance de las líneas (0…1) · y: del relleno · z: 0 dirección, 1 radial
     uDibO origen del barrido (mundo) · uDibV dirección / largo (o r0, r1 si es radial)
   Hay un canal para el sitio ('base') y otro para el contexto urbano ('ctx'). */
const DIB_GLSL = /* glsl */`
  uniform vec4 uDib; uniform vec3 uDibO; uniform vec3 uDibV;
  float dibBarrido(vec3 p) {
    if (uDib.z > 0.5) return clamp((length(p.xz - uDibO.xz) - uDibV.x) / max(1.0, uDibV.y - uDibV.x), 0.0, 1.0);
    return clamp(dot(p - uDibO, uDibV), 0.0, 1.0);
  }
  float dibAzar(vec3 p) { return fract(sin(dot(p.xz + p.y * 0.37, vec2(12.9898, 78.233))) * 43758.5453); }
  // cuándo empieza (0…0.9) y cuánto dura el trazo de largo L con centro en m
  float dibInicio(vec3 m, float L) { return (0.62 * dibBarrido(m) + 0.24 * (1.0 - smoothstep(0.5, 14.0, L)) + 0.14 * dibAzar(m)) * 0.9; }
  float dibDura(float L) { return 0.1 * clamp(L / 18.0, 0.2, 1.0); }`;
// las líneas: el extremo que no es el de inicio corre hacia su lugar (aOtro: la
// otra punta del segmento; aLado: 1 inicio, 2 final; sin ellos, la línea va entera)
const DIB_LINEA = /* glsl */`
  vec3 transformed = vec3(position);
  if (uDib.x < 0.999 && aLado > 0.5) {
    vec3 dS = aLado < 1.5 ? position : aOtro, dE = aLado < 1.5 ? aOtro : position;
    vec3 dM = (modelMatrix * vec4((dS + dE) * 0.5, 1.0)).xyz;
    float dL = length((modelMatrix * vec4(dE - dS, 0.0)).xyz);
    float dk = clamp((uDib.x - dibInicio(dM, dL)) / dibDura(dL), 0.0, 1.0);
    transformed = aLado < 1.5 ? dS : mix(dS, dE, dk);
  }`;
function dibujable(mat, U) {   // un LineBasicMaterial que se dibuja con el canal U
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aOtro; attribute float aLado;' + DIB_GLSL)
      .replace('#include <begin_vertex>', DIB_LINEA);
  };
  mat.customProgramCacheKey = () => 'dib';
  return mat;
}
function canalDib() { return { uDib: { value: new THREE.Vector4(1, 1, 1, 0) }, uDibO: { value: new THREE.Vector3() }, uDibV: { value: new THREE.Vector3(0, 300, 0) } }; }
// a cada segmento, su pareja: la otra punta y cuál es (para dibujarlo)
function pareja(g) {
  if (g.attributes.aOtro) return g;
  const p = g.attributes.position.array, n = p.length / 3, o = new Float32Array(p.length), l = new Float32Array(n);
  for (let i = 0; i + 1 < n; i += 2) {
    o[i * 3] = p[i * 3 + 3]; o[i * 3 + 1] = p[i * 3 + 4]; o[i * 3 + 2] = p[i * 3 + 5];
    o[i * 3 + 3] = p[i * 3]; o[i * 3 + 4] = p[i * 3 + 1]; o[i * 3 + 5] = p[i * 3 + 2];
    l[i] = 1; l[i + 1] = 2;
  }
  g.setAttribute('aOtro', new THREE.BufferAttribute(o, 3)); g.setAttribute('aLado', new THREE.BufferAttribute(l, 1));
  return g;
}

/* Un solo lienzo y un solo renderer para todas las escenas: cambiar de
   apartado no crea otro contexto WebGL ni recompila los shaders. Y lo que no
   depende de la escena (el aro, arte y cultura, los módulos, el mercado) se
   arma una vez por sesión: CACHE (clave → geometrías; no se liberan al destruir). */
let RENDERER = null, LIENZO = null;
const CACHE = new Map();
function fijas(c) {   // marca (en todo lo que contenga) las geometrías de la CACHE
  if (!c || typeof c !== 'object' || ArrayBuffer.isView(c)) return c;
  if (c.isBufferGeometry) c.userData.fija = true;
  else if (!c.isObject3D) Object.values(c).forEach(fijas);
  return c;
}
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
  uniform float uGris; uniform float uGrano; uniform float uOpacidad; uniform vec3 uLuz; uniform float uPx; uniform float uBrillo; uniform float uGrueso; uniform float uCorte;
  varying vec3 vN; varying vec3 vW;` + DIB_GLSL + `
  // una raya cada periodo de c (antialias con fwidth; si es muy denso, el promedio)
  float raya(float c, float grueso) {
    float w = fwidth(c);
    float d = abs(fract(c + 0.5) - 0.5);
    float r = 1.0 - smoothstep(grueso * 0.5 - w * 0.5, grueso * 0.5 + w * 0.75, d);
    return mix(r, grueso * 1.4, smoothstep(0.25, 0.6, w));
  }
  void main() {
    if (vW.y > uCorte) discard;
    // dibujándose: lo que no se ha rellenado no tapa; al frente del relleno, una banda de rayado
    if (uDib.y < 0.999) {
      float s = dibBarrido(vW) * 0.82 + 0.18 * dibAzar(floor(vW * 0.6));
      if (s > uDib.y) discard;
      if (s > uDib.y - 0.12) {
        if (raya((gl_FragCoord.x - gl_FragCoord.y) / (4.5 * uPx), 0.3) < 0.4) discard;
        gl_FragColor = vec4(mix(uFondo, uTinta, 0.42 * uBrillo), uOpacidad); return;
      }
    }
    // lo cortado: el interior del sólido, liso (poché)
    if (uCorte < 1e4 && !gl_FrontFacing) { gl_FragColor = vec4(uTinta * 0.2 * uBrillo, uOpacidad); return; }
    // normal plana de la cara (de las derivadas): el rayado no hace anillos en las esferas
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
    if (dot(n, vN) < 0.0) n = -n;
    float lam = clamp(dot(n, normalize(uLuz)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col;
    // vidrio: se ve a través (lo único transparente); más reflejo de canto
    if (uModo > 2.5) {
      vec3 ver = normalize(cameraPosition - vW);
      float f = pow(1.0 - abs(dot(n, ver)), 2.0);
      gl_FragColor = vec4(uTinta * (0.55 + 0.45 * f) * uBrillo, (uGris + 0.22 * f) * uOpacidad); return;
    }
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
      float ruido = fract(sin(dot(floor(gl_FragCoord.xy * 0.55), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      col += ruido * uGrano;
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
// tapa con un hueco (el hueco, todo adentro del polígono)
function tapaHueco(m, pol, hueco, z) {
  pol = ccw(pol); hueco = ccw(hueco).reverse();
  const todos = pol.concat(hueco);
  THREE.ShapeUtils.triangulateShape(pol.map(q => new THREE.Vector2(q[0], q[1])), [hueco.map(q => new THREE.Vector2(q[0], q[1]))])
    .forEach(t => m.tri(...t.map(k => W(todos[k][0], todos[k][1], z))));
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
// (U: canal de dibujo; dibujándose, cada figura aparece de abajo hacia arriba)
function matAtlas(tex, cols, filas, U) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uMapa: { value: tex }, uN: { value: cols }, uP: { value: filas }, uTinta: { value: new THREE.Color(1, 1, 1) }, uPlano: { value: 0 }, uOpacidad: { value: 1 }, uCorte: CORTE_Y }, U || canalDib()),
    vertexShader: /* glsl */`
      attribute vec3 aPos; attribute vec2 aEsc; attribute float aTile; attribute float aVolt; attribute float aPose;
      uniform float uN; uniform float uP; varying vec2 vUv; varying float vY; varying float vK; varying float vAlto;` + DIB_GLSL + `
      void main() {
        vY = aPos.y + position.y * aEsc.y;
        vec4 c = viewMatrix * vec4(aPos, 1.0);
        c.xy += position.xy * aEsc;
        gl_Position = projectionMatrix * c;
        float u = aVolt < 0.0 ? 1.0 - uv.x : uv.x;
        vUv = vec2((aTile + u) / uN, (uP - 1.0 - aPose + uv.y) / uP);
        vAlto = uv.y;
        vK = uDib.x < 0.999 ? clamp((uDib.x - dibInicio(aPos, 6.0)) / 0.09, 0.0, 1.0) : 1.0;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa; uniform vec3 uTinta; uniform float uPlano; uniform float uOpacidad; uniform float uCorte; varying vec2 vUv; varying float vY; varying float vK; varying float vAlto;
      void main() {
        if (vY > uCorte || vAlto > vK) discard;
        vec4 t = texture2D(uMapa, vUv);
        if (t.a < 0.5) discard;
        gl_FragColor = vec4(mix(t.rgb * uTinta, uTinta, uPlano), uOpacidad);
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
  const x = c.getContext('2d'), azar = window.AtlampaGeo.aleatorio(5);
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
  /* El mercado de Rhino: completo inspeccionando Comercio; en la vista general,
     ligero, como fachada de papel (2026-10-12, Gabriel: «que ya se note un poco más
     del detalle, no todo»): lo exterior y los cambios (muros, cubiertas con el hoyo,
     vidrio, cinta, patios del aro y la planta alta de la nave sur), sin el acero ni
     el interior de la nave norte. */
  const subconj = (o, ks) => { if (!o) return null; const r = {}; ks.forEach(k => { if (o[k]) r[k] = o[k]; if (o[k + 'L']) r[k + 'L'] = o[k + 'L']; }); return r; };
  const LIGERO = GENERAL && MERC;
  const MERCADO = ESC === 'comercio' ? MERC : LIGERO ? Object.assign({}, MERC, {
    acero: null, aceroS: null, vivienda: null, paso3: subconj(MERC.paso3, ['banca', 'humedal', 'agua_p']),
    sur: subconj(MERC.sur, ['pa', 'local', 'muro', 'tarima', 'maceta']), arboles: (MERC.arboles || []).filter(t => t[2] > 3)
  }) : null;
  const trabajo = svg.parentNode;
  svg.style.display = 'none';
  // el lienzo y el renderer son de la sesión (ver RENDERER): la escena vieja se
  // queda pintada hasta que la nueva pinta su primer cuadro
  if (!RENDERER) {
    LIENZO = document.createElement('canvas');
    LIENZO.className = 'ad-3d';
    RENDERER = new THREE.WebGLRenderer({ canvas: LIENZO, antialias: true, alpha: false, powerPreference: 'high-performance' });
    RENDERER.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }
  const lienzo = LIENZO, renderer = RENDERER;
  if (lienzo.parentNode !== trabajo) trabajo.insertBefore(lienzo, svg);
  renderer.clippingPlanes = [];
  // los canales del dibujo a mano (ver DIB_GLSL): el sitio y el contexto urbano
  const DIB = { base: canalDib(), ctx: canalDib() };
  const canalDe = n => /^(ctx|contexto|carro|flecha-ctx)/.test(n) ? DIB.ctx : DIB.base;
  const capaRot = document.createElement('div');
  capaRot.className = 'ad-3d-rotulos';
  trabajo.insertBefore(capaRot, svg);
  const lienzoEsq = document.createElement('canvas');   // el esquema compositivo (2D, encima)
  lienzoEsq.className = 'ad-3d-esquema';
  trabajo.insertBefore(lienzoEsq, svg);

  const escena = new THREE.Scene();
  let estilo = ESTILOS.clay;
  escena.background = new THREE.Color(estilo.cielo || estilo.fondo);

  const camO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
  const camP = new THREE.PerspectiveCamera(30, 1, 1, 6000);
  let cam = estilo.perspectiva ? camP : camO;

  /* ----- materiales: uno por (papel, programa) ----- */
  const MATS = {};      // clave → ShaderMaterial
  const ARISTAS = {};   // clave → LineBasicMaterial
  const LINEAS = {};    // nombre → LineBasicMaterial (plantas, columnas…)
  let conColor = false, resalta = null, espacioAct = null, conEsquema = false, matPersEsq = null;
  // con el esquema compositivo, el modelo entero queda muy tenue (pero se lee: no se va a negro)
  const TENUE_ESQ = 0.32;
  // Inspeccionando la estructura (no sólo mostrándola): de lo demás sólo
  // quedan los contornos (las aristas; las caras no se dibujan, no tapan), y
  // la estructura se ve entera por dentro de los volúmenes. El aro, con su
  // color, se queda siempre que se inspecciona algo: todo se conecta con él.
  let enEstr = false;
  let aisl = null;   // lo aislado (ver aisla): { ap, grupos, partes, caja }
  const conAro = () => enEstr || !!resalta || !GENERAL;
  for (const e of Object.values(ESTILOS)) if (e.papel && e.papel.modulo) e.papel.social = e.papel.modulo;
const luz = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();
  function material(papel) {
    if (MATS[papel]) return MATS[papel];
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      uniforms: Object.assign({ uFondo: { value: new THREE.Color(0, 0, 0) }, uTinta: { value: new THREE.Color(1, 1, 1) }, uModo: { value: 0 }, uTono: { value: 0.5 },
        uPaso: { value: 3 }, uMundo: { value: 0 }, uGris: { value: 0.1 }, uGrano: { value: 0 }, uOpacidad: { value: 1 }, uLuz: { value: luz }, uPx: { value: renderer.getPixelRatio() },
        uBrillo: { value: 1 }, uGrueso: { value: 0.22 }, uCorte: CORTE_Y }, canalDe(papel))
    });
    m.userData.papel = papel;
    return (MATS[papel] = m);
  }
  function arista(papel) {
    if (ARISTAS[papel]) return ARISTAS[papel];
    return (ARISTAS[papel] = Object.assign(dibujable(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true }), canalDe(papel)), { userData: { papel } }));
  }
  function linea(nombre, color) {
    if (LINEAS[nombre]) return LINEAS[nombre];
    const m = dibujable(new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true }), canalDe(nombre));
    m.userData = { nombre, color: color || 0xffffff };
    return (LINEAS[nombre] = m);
  }
  const blanco = new THREE.Color(1, 1, 1);
  function tinta(papel) {
    if (estilo === ESTILOS.clay && !espacioAct) {
      if (papel === 'vidrio') return new THREE.Color(conColor ? PROGRAMA.agua : '#789dc9');
      const uso = PROG_DE[papel];
      if (uso) return new THREE.Color(conColor ? PROGRAMA[uso] : CLAY_PROGRAMA[uso]);
      return new THREE.Color(CLAY_TINTA[papel] || '#aeb1af');
    }
    // el vidrio, siempre un poco azul (con Color, más)
    if (papel === 'vidrio' && !espacioAct) return new THREE.Color(conColor ? PROGRAMA.agua : '#cfeaff');
    if (espacioAct) { const e = espacioDe(papel); return e ? new THREE.Color(ESPACIO_COLOR[e]) : blanco; }
    if (papel === 'aro' && conAro()) return new THREE.Color(PROGRAMA.aro);
    const pr = PROG_DE[papel];
    if (!conColor || !pr) return blanco;
    return new THREE.Color(PROGRAMA[pr]).lerp(blanco, 0.15);
  }
  // ¿queda opaco con lo que está resaltado? (programa o espacio)
  // con algo resaltado (un programa, lo público o lo privado), todo lo demás baja al 15 %
  function apagado(papel) {
    if (!resalta || espacioAct || papel === 'aro') return false;
    return (RESALTA_PAPELES[resalta] || []).indexOf(papel) < 0;
  }
  function apagadaLinea(base) {
    if (!resalta || espacioAct) return false;
    return !(resalta === 'paisajismo' && LINEAS_PAISAJE.indexOf(base) >= 0) && !(resalta === 'estacionamiento' && (base === 'est' || base === 'rampa'));
  }
  const TENUE = 0.15;
  /* Nada es transparente: lo que no toca (ajeno al apartado o no resaltado)
     se queda opaco pero apagado, y tapa lo que tiene detrás. Sin nada
     elegido manda la planta baja: el paisaje, la plaza y lo que se desplanta
     en el piso suben; los módulos (arriba) bajan. */
  const PLANTA_BAJA = ['predio', 'plaza', 'verde', 'tezontle', 'agua', 'filtro', 'arbusto', 'copa', 'nave', 'cultura', 'industria'];
  // Inspeccionando un apartado, lo demás casi desaparece (REF)
  const REF = 0.1;
  function enfasis(papel, ref) {
    if (aisl) return 1;   // aislado: lo que queda se ve entero
    if (ref) return REF;
    if (apagado(papel)) return 1;
    if (estilo === ESTILOS.clay) return 1;
    if (!resalta && !espacioAct) {
      if (papel === 'modulo' || papel === 'social') return 0.5;
      if (PLANTA_BAJA.indexOf(papel) >= 0) return 1.3;
    }
    return 1;
  }
  function aplicaEstilo() {
    escena.background = new THREE.Color(estilo.cielo || estilo.fondo);
    const nada = !resalta && !espacioAct;
    Object.keys(MATS).forEach(k => {
      const m = MATS[k], e = estilo.papel[m.userData.papel] || estilo.papel.proyecto, u = m.uniforms;
      u.uModo.value = e.modo !== undefined ? e.modo : estilo === ESTILOS.plano ? 1 : 0;
      // con Color, más tinta: que contraste con el negro
      u.uFondo.value.set(estilo.fondo); u.uTono.value = (e.tono || 0.4) * (conColor ? 1.35 : 1); u.uPaso.value = e.paso || 3; u.uGrueso.value = (e.grueso || 0.22) * (conColor ? 1.3 : 1); u.uMundo.value = e.mundo || 0; u.uGris.value = e.gris || 0.1; u.uGrano.value = e.grano || 0;
      u.uTinta.value = tinta(m.userData.papel);
      // Público / privado: las áreas se llenan de su color (el croquis sólo tenía aristas)
      if (espacioAct && espacioDe(m.userData.papel)) {
        if (u.uModo.value > 1.5) { u.uGris.value = Math.max(u.uGris.value, 0.2); u.uTono.value = Math.max(u.uTono.value, 0.45); }
        else u.uTono.value = Math.min(1, u.uTono.value * 2.2);
      }
      u.uBrillo.value = enfasis(m.userData.papel, m.userData.ref) * (conEsquema ? TENUE_ESQ : 1);
      const ap = apagado(m.userData.papel), vid = m.userData.papel === 'vidrio';
      u.uOpacidad.value = ap ? TENUE : 1; m.transparent = ap || vid; m.depthWrite = !ap && !vid;
      // inspeccionando la estructura: de lo demás, sólo el contorno (menos el aro)
      m.visible = !(enEstr && !m.userData.estr && m.userData.papel !== 'aro');
      if (enEstr && m.userData.estr) { u.uBrillo.value = 1; u.uModo.value = 0; u.uGris.value = 0.5; }
      m.needsUpdate = true;
    });
    Object.keys(ARISTAS).forEach(k => {
      const m = ARISTAS[k], e = estilo.papel[m.userData.papel] || estilo.papel.proyecto;
      m.color.copy(tinta(m.userData.papel));
      m.opacity = Math.min(1, (e.arista || 0) * enfasis(m.userData.papel, m.userData.ref)) * (apagado(m.userData.papel) ? TENUE : 1) * (estilo.blanco || 1) * (conEsquema ? TENUE_ESQ : 1);
      if (enEstr && m.userData.papel !== 'aro' && m.opacity > 0.001) m.opacity = 0.42;
      m.visible = m.opacity > 0.001;
    });
    Object.keys(LINEAS).forEach(k => {
      const m = LINEAS[k], base = m.userData.nombre.split('-')[0];
      const pb = nada && ['pasto', 'flor', 'junco', 'tronco', 'sendero', 'rayo'].indexOf(base) >= 0 ? 1.3 : 1;
      m.opacity = Math.min(1, (estilo.lineas[base] !== undefined ? estilo.lineas[base] : 0.4) * (m.userData.ref ? REF : pb)) * (apagadaLinea(base) ? TENUE : 1) * (conEsquema ? TENUE_ESQ : 1);
      if (enEstr) { const est = m.userData.nombre === 'columna'; m.opacity = est ? 1 : m.opacity * 0.6; m.depthTest = !est; m.renderOrder = est ? 5 : 0; }
      else { m.depthTest = true; m.renderOrder = 0; }
      if (espacioAct && LINEAS_PAISAJE.indexOf(base) >= 0) m.color.set(ESPACIO_COLOR.publico);
      else if (conColor && m.userData.colorColor) m.color.set(m.userData.colorColor);
      else if (estilo === ESTILOS.clay) m.color.set(base.indexOf('ctx') === 0 ? '#a9adae' : '#717779');
      else m.color.set(m.userData.color);
    });
    // árboles de croquis: con Color, verde claro; tenues como referencia o si se resalta otra cosa
    const refArb = !GENERAL && ESC !== 'paisajismo', apArb = apagadaLinea('pasto');
    matArbol.uniforms.uTinta.value.set(espacioAct ? ESPACIO_COLOR.publico : conColor ? '#c6ec8f' : estilo === ESTILOS.clay ? '#8f9691' : '#ffffff').multiplyScalar((refArb ? REF : 1) * (conEsquema ? TENUE_ESQ : 1));
    matArbol.uniforms.uPlano.value = estilo === ESTILOS.clay ? 1 : 0;
    if (matPersEsq) {
      matPersEsq.uniforms.uTinta.value.set(estilo === ESTILOS.clay ? '#777d80' : '#ffffff').multiplyScalar(conEsquema ? TENUE_ESQ : 1);
      matPersEsq.uniforms.uPlano.value = estilo === ESTILOS.clay ? 1 : 0;
    }
    matArbol.uniforms.uOpacidad.value = apArb ? TENUE : 1; matArbol.transparent = apArb; matArbol.depthWrite = !apArb;
    if (enEstr) { matArbol.uniforms.uOpacidad.value = 0.35; matArbol.transparent = true; matArbol.depthWrite = false; }
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
  /* Partes de cada uso, para aislarlo (ver aisla): cada una se oculta sola y,
     si tiene hacia dónde, se desplaza (despiece). objs: los grupos que mueve;
     dir: [x, y, z] en m (mundo) o, por grupo, en su userData.dir. */
  const PARTES = {};
  function parte(ap, id, nombre, objs, dir, oculta) {
    (PARTES[ap] = PARTES[ap] || []).push({ id, nombre, objs, dir: dir || null, oculta: !!oculta, oculto: !!oculta, desplazado: false, k: 0 });
  }
  // Aristas de croquis: cada arista en dos trazos a mano (un poco chuecos, con
  // un quiebre a la mitad) que se pasan de las esquinas, como en un dibujo.
  const CROQUIS = ['nave', 'industria', 'cultura', 'aro', 'modulo', 'social', 'modcom', 'proyecto', 'vidrio'];
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
  /* malla + sus aristas (las que doblan más de umbral grados). geos(): las
     geometrías (la malla, sus aristas y las extra), que no dependen de la
     escena; ponGeos(): las pone con los materiales de esta escena. pon() hace
     las dos; con fija(clave, …) las geometrías se arman una vez por sesión. */
  function geos(malla, papel, umbral, extraAristas) {
    const g = malla.geo ? malla.geo() : malla, c = { g };
    if (umbral !== false) {
      let eg = new THREE.EdgesGeometry(g, umbral || 25);
      if (CROQUIS.indexOf(papel) >= 0) eg = aristasCroquis(eg);
      c.eg = pareja(eg);
    }
    if (extraAristas) {
      const eg = extraAristas.isBufferGeometry ? extraAristas : extraAristas.geo();
      c.ex = pareja(CROQUIS.indexOf(papel) >= 0 ? aristasCroquis(eg) : eg);
    }
    return c;
  }
  // arma(): las geometrías (geos o {g, eg, ex}); sólo corre si no están en la CACHE
  function fija(clave, arma) {
    if (!CACHE.has(clave)) CACHE.set(clave, fijas(arma()));
    return CACHE.get(clave);
  }
  function ponGeos(grupo, c, papel, ap, estr) {
    const ref = !GENERAL && ap !== ESC && ap !== 'aro';   // inspeccionando: todo lo ajeno, hasta el piso (el aro no: siempre se ve)
    const clave = papel + (ref ? '-ref' : '') + (estr ? '-estr' : '');
    const mat = material(clave); mat.userData.papel = papel; mat.userData.ref = ref; mat.userData.estr = !!estr;
    const me = new THREE.Mesh(c.g, mat);
    me.userData.ap = ap; me.userData.estr = !!estr;
    grupo.add(me);
    if (ap) picables.push(me);
    [c.eg, c.ex].forEach(eg => {
      if (!eg) return;
      const am = arista(clave); am.userData.papel = papel; am.userData.ref = ref;
      grupo.add(new THREE.LineSegments(eg, am));
    });
    return me;
  }
  function pon(grupo, malla, papel, ap, umbral, extraAristas, estr) { return ponGeos(grupo, geos(malla, papel, umbral, extraAristas), papel, ap, estr); }
  // lin: Lineas o una BufferGeometry de segmentos
  function ponLineas(grupo, lin, nombre, color, colorColor, ap, extra) {
    if (lin.isBufferGeometry ? !lin.attributes.position.count : !lin.p.length) return null;
    const ref = !GENERAL && ap !== ESC && ap !== 'aro' && nombre.indexOf('sol') !== 0;   // (el sol no se apaga)
    const m = linea(nombre + (ref ? '-ref' : ''), color);
    m.userData.ref = ref; if (colorColor) m.userData.colorColor = colorColor;
    Object.assign(m, extra || {});
    const l = new THREE.LineSegments(pareja(lin.isBufferGeometry ? lin : lin.geo()), m);
    grupo.add(l);
    return l;
  }

  const matArbol = matAtlas(ARBOLES_TEX.tex, ARBOLES_TEX.N, 1, DIB.base);
  // Arte y cultura detallado: el paisaje sólo se quita donde estorba de verdad
  // (el foso del auditorio, los módulos de planta baja); los árboles, además,
  // bajo la losa del nivel 1. Lo demás del suelo sigue debajo del edificio.
  // (se arma una vez: ya trasladado al diagrama y con sus aristas)
  const CD = CULTURA_DET ? fija('cultura', () => {
    const cd = CULTURA_DET.construye(), d = [CULTURA_DET.DX - CEN[0], CULTURA_DET.DZ, -(CULTURA_DET.DY - CEN[1])], r = { cd };
    Object.keys(cd.mallas).forEach(k => { const g = cd.mallas[k]; g.translate(d[0], d[1], d[2]); g.computeVertexNormals(); r['m-' + k] = geos(g, 'cultura', k === 'acero' ? false : 20); });
    Object.keys(cd.lineas).forEach(k => { r['l-' + k] = pareja(cd.lineas[k].translate(d[0], d[1], d[2])); });
    Object.values(r).forEach(x => { if (x.g) fijas(x); });
    return r;
  }).cd : null;
  const CDG = CD ? CACHE.get('cultura') : null;
  // el aro se ensancha sobre la azotea de arte y cultura (son uno)
  if (CD) G.ponPlataforma(CD.azotea);
  const pisado = (u, v) => !!CD && CD.pisa.some(q => G.dentro(u, v, q));
  const bajoLosa = (u, v) => !!CD && G.dentro(u, v, CD.losa1);
  // Comercio: la huella de la nave norte trae su propio piso (con la zanja y el
  // jardín hundidos), así que el suelo y el predio se recortan ahí
  const CAJA_N = MERCADO && MERCADO.paso3 ? MERCADO.cajaN : null;
  function conHuecoN(c, z, m, recorte) {
    menosCaja(c, CAJA_N).forEach(q => {
      const r = recorte ? G.recortaConvexo(q, recorte) : rect(q[0], q[1], q[2], q[3]), F = CD && CD.pisa[0];
      if (!r) return;
      if (F && F.every(p => p[0] > q[0] && p[0] < q[2] && p[1] > q[1] && p[1] < q[3])) tapaHueco(m, r, F, z);
      else tapa(m, r, z);
    });
  }

  /* ===== 1. Sitio =====
     El predio y su banqueta son los de Gabriel en Rhino (atlampa-geo.js: PRED,
     GUP): la banqueta es un anillo de 1.80 m a ras del predio (+0.20), con la
     guarnición inclinada al sur; las calles van de ahí a las guarniciones de
     enfrente (GF), y las banquetas de enfrente como antes. */
  const gSitio = pieza('sitio', null, 0);
  const PRED = G.PRED, GUP = G.GUP;
  // un lado de la guarnición del predio, prolongado (eje 1: u en función de v; eje 0: v en función de u)
  const enLinea = (a, b, t, eje) => a[1 - eje] + (b[1 - eje] - a[1 - eje]) * (t - a[eje]) / (b[eje] - a[eje]);
  {
    // el suelo del bloque; en el estacionamiento, con el hueco del predio (se ve la excavación)
    const m = new Malla();
    if (ESC === 'estacionamiento') tapaHueco(m, rect(S.u0, S.v0, S.u1, S.v1), PRED, 0);
    else if (CAJA_N) conHuecoN([S.u0, S.v0, S.u1, S.v1], 0, m);   // Comercio: sin suelo bajo la nave norte (zanja y jardín hundidos)
    else if (CD) tapaHueco(m, rect(S.u0, S.v0, S.u1, S.v1), CD.pisa[0], 0);   // con el foso del auditorio abierto
    else tapa(m, rect(S.u0, S.v0, S.u1, S.v1), 0);
    suelos.push(pon(gSitio, m, 'suelo', null));
    const [SW, SE, NE, NW] = GUP;
    const uO = v => enLinea(SW, NW, v, 1), uE = v => enLinea(SE, NE, v, 1), vS = u => enLinea(SW, SE, u, 0), vN = u => enLinea(NW, NE, u, 0);
    // calles: Fresno, Sabino, Clavel y Eulalia Guzmán (de lado a lado del bloque)
    const ar = new Malla();
    [[[GF.o, S.v0], [uO(S.v0), S.v0], [uO(S.v1), S.v1], [GF.o, S.v1]],
      [[uE(S.v0), S.v0], [GF.e, S.v0], [GF.e, S.v1], [uE(S.v1), S.v1]],
      [[S.u0, GF.s], [S.u1, GF.s], [S.u1, vS(S.u1)], [S.u0, vS(S.u0)]],
      [[S.u0, vN(S.u0)], [S.u1, vN(S.u1)], [S.u1, GF.n], [S.u0, GF.n]]].forEach(q => tapa(ar, q, 0.02));
    pon(gSitio, ar, 'calle', null, false);
    // banquetas de enfrente (y las esquinas)
    const bq = new Malla();
    [[[S.u0, vS(S.u0)], [GF.o, vS(GF.o)], [GF.o, vN(GF.o)], [S.u0, vN(S.u0)]],
      [[GF.e, vS(GF.e)], [S.u1, vS(S.u1)], [S.u1, vN(S.u1)], [GF.e, vN(GF.e)]],
      [[uO(S.v0), S.v0], [uE(S.v0), S.v0], [uE(GF.s), GF.s], [uO(GF.s), GF.s]],
      [[uO(GF.n), GF.n], [uE(GF.n), GF.n], [uE(S.v1), S.v1], [uO(S.v1), S.v1]],
      rect(S.u0, S.v0, GF.o, GF.s), rect(GF.e, S.v0, S.u1, GF.s), rect(S.u0, GF.n, GF.o, S.v1), rect(GF.e, GF.n, S.u1, S.v1)].forEach(r => prisma(bq, r, 0, 0.15));
    // la banqueta del predio (Rhino): el anillo entre su guarnición y el predio, a ras (+0.20)
    tapaHueco(bq, GUP, PRED, 0.2);
    muros(bq, GUP, 0, 0.2);
    pon(gSitio, bq, 'banqueta', null, 30);
  }
  // predio, área verde, plaza y la espuela (Heliotropo ya no es calle: es predio)
  const gPredio = pieza('predio', null, 0.02);
  {
    const m = new Malla();
    if (CAJA_N) conHuecoN([PB.u0, PB.v0, PB.u1, PB.v1], 0.2, m, PRED);   // Comercio: la nave norte trae su propio piso
    else if (CD) tapaHueco(m, PRED, CD.pisa[0], 0.2);   // con el hueco del foso del auditorio
    else tapa(m, PRED, 0.2);
    // el área verde es del paisaje (se queda en su apartado) pero no se pica: picar el piso no abre nada
    const verde = pon(gPredio, m, PAI ? 'verde' : 'predio', PAI ? 'paisajismo' : null, 1);
    picables.splice(picables.indexOf(verde), 1);
    suelos.push(verde);
    // plaza cultural: rectángulo menos el aro (con su chipote): el borde de
    // afuera del aro entre donde cruza el lado oriente (u1) y el sur (v0) de la plaza
    const P = PLAZA_C, borde = t => G.aroPunto(t, ANILLO.re);
    const corta = (f, a, b) => { for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if ((f(a) > 0) === (f(m) > 0)) a = m; else b = m; } return (a + b) / 2; };
    const aN = corta(t => borde(t)[0] - P.u1, 60, 135), aS = corta(t => borde(t)[1] - P.v0, 135, 200), pl = [[P.u0, P.v1], [P.u1, P.v1]];
    for (let i = 0; i <= 60; i++) pl.push(borde(aN + (aS - aN) * i / 60));
    pl.push([P.u0, P.v0]);
    const mp = new Malla(); tapa(mp, pl, 0.22); pon(gPredio, mp, 'plaza', 'cultura', 1);
    {
    /* La espuela por Heliotropo ya no lleva tren: es un paso peatonal (Gabriel,
       2026-10-09) de 4 m sobre el que se siguen viendo los rieles y los
       durmientes. Donde cruza la laguna sube a un puente (+1.45, ≈ 1.2 m sobre el
       agua) por rampas al ≤ 8 % con descansos de 1.20 a cada 6 m (NTC 2.2.2.4) y
       barandal de 0.90 donde el vacío pasa de 0.30. */
    const VH = (HE[0] + HE[1]) / 2, Z0 = 0.27, ZP = 1.45, MED = 2.0, u0 = GU.o;
    const perfil = [[u0, Z0]];
    const LG = PAI && PAI.laguna, dv = LG ? VH - LG.c[1] : 0;
    if (LG && Math.abs(dv) < LG.borde) {
      const x = Math.sqrt(LG.borde * LG.borde - dv * dv), p0 = LG.c[0] - x - 1, p1 = LG.c[0] + x + 1;
      const nr = Math.ceil((ZP - Z0) / 0.48 - 1e-9), dz = (ZP - Z0) / nr, LR = nr * 6 + (nr - 1) * 1.2;
      const rampa = (ua, sentido) => {   // de ua, subiendo hacia el puente (sentido +1: hacia +u)
        let u = ua, z = Z0;
        for (let k = 0; k < nr; k++) { u += 6 * sentido; z += dz; perfil.push([u, z]); if (k < nr - 1) { u += 1.2 * sentido; perfil.push([u, z]); } }
      };
      perfil.push([p0 - LR, Z0]); rampa(p0 - LR, 1);
      perfil.push([p1, ZP]);
      const baja = []; { let u = p1, z = ZP; for (let k = 0; k < nr; k++) { u += 6; z -= dz; baja.push([u, z]); if (k < nr - 1) { u += 1.2; baja.push([u, z]); } } }
      perfil.push(...baja);
    }
    perfil.push([ESP_FIN, Z0]);
    const zEn = u => { for (let i = 1; i < perfil.length; i++) if (u <= perfil[i][0]) { const a = perfil[i - 1], b = perfil[i]; return a[1] + (b[1] - a[1]) * (u - a[0]) / ((b[0] - a[0]) || 1); } return Z0; };
    const m = new Malla(), le = new Lineas();
    const caja = (ua, ub, va, vb, za0, za1, zb0, zb1) => {   // caja inclinada a lo largo de u (z en ua y en ub)
      const P = [[ua, va, za0], [ub, va, zb0], [ub, vb, zb0], [ua, vb, za0], [ua, va, za1], [ub, va, zb1], [ub, vb, zb1], [ua, vb, za1]].map(q => W(q[0], q[1], q[2]));
      [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(f => m.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]]));
    };
    for (let i = 1; i < perfil.length; i++) {
      const [ua, za] = perfil[i - 1], [ub, zb] = perfil[i];
      if (ub - ua < 1e-3) continue;
      const alto = Math.max(za, zb) - Z0 > 0.05;
      caja(ua, ub, VH - MED, VH + MED, za - (alto ? 0.3 : 0.03), za, zb - (alto ? 0.3 : 0.03), zb);   // la losa del paso
      // los rieles (sobre los durmientes)
      [-0.72, 0.72].forEach(o => caja(ua, ub, VH + o - 0.035, VH + o + 0.035, za + 0.08, za + 0.2, zb + 0.08, zb + 0.2));
      // barandal donde el paso va en alto
      if (alto) [-MED, MED].forEach(o => {
        [0.1, 0.5, 0.9].forEach(h => le.seg(W(ua, VH + o, za + h), W(ub, VH + o, zb + h)));
        for (let u = ua; u < ub; u += 0.3) le.seg(W(u, VH + o, zEn(u)), W(u, VH + o, zEn(u) + 0.9));
      });
    }
    // durmientes a cada metro
    for (let u = u0 + 0.5; u < ESP_FIN - 0.3; u += 1.0) { const z = zEn(u); caja(u - 0.11, u + 0.11, VH - 1.3, VH + 1.3, z, z + 0.08, z, z + 0.08); }
    // pilas bajo el puente y las rampas, a cada 6 m
    for (let u = perfil[1] ? perfil[1][0] + 3 : u0; u < ESP_FIN; u += 6) {
      const z = zEn(u);
      if (z - Z0 > 0.5) [-1.5, 1.5].forEach(o => caja(u - 0.15, u + 0.15, VH + o - 0.15, VH + o + 0.15, 0.2, z - 0.3, 0.2, z - 0.3));
    }
    pon(gPredio, m, 'proyecto', null, 30);
    ponLineas(gPredio, le, 'columna-espuela', 0xffffff);
    }
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
        const p = W(t[0], t[1], Z), H = (t[2] + t[3] * 0.25) * ARBOL_JOVEN, tile = t[4] ? 3 : Math.floor(((t[0] * 13.7 + t[1] * 7.1) % 3 + 3) % 3);
        b.aPos.setXYZ(i, p[0], p[1], p[2]); b.aEsc.setXY(i, ARBOLES_TEX.ancho * H, ARBOLES_TEX.alto * H); b.aTile.setX(i, tile); b.aVolt.setX(i, (i % 2) ? 1 : -1);
      });
      gPlantas.add(b.malla);
    }
  }

  /* ===== 3. Naves (cortadas por el aro) =====
     Inspeccionando Comercio van las de Gabriel en Rhino (perímetro y
     cubiertas, atlampa-mercado.js) en lugar de las naves simples. */
  if (MERCADO) {
    // las geometrías, una vez por sesión (ver CACHE)
    const MG = fija(LIGERO ? 'mercado-ligero' : 'mercado', () => {
      const geo = a => {
        const p = new Float32Array(a.length);
        for (let i = 0; i < a.length; i += 3) { const w = W(a[i], a[i + 1], a[i + 2]); p[i] = w[0]; p[i + 1] = w[1]; p[i + 2] = w[2]; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.computeVertexNormals();
        return g;
      };
      // las aristas vienen de la malla original de Rhino (sin las costuras del recorte por el aro)
      const lineas = a => { const l = new Lineas(); for (let i = 0; i < a.length; i += 3) l.p.push(...W(a[i], a[i + 1], a[i + 2])); return l; };
      // reparte triángulos (n = 9) o segmentos (n = 6) según dónde cae su centro (u, v)
      const reparte = (a, n, clave) => {
        const r = {}, k = n / 3;
        for (let i = 0; i < a.length; i += n) {
          let u = 0, v = 0;
          for (let j = 0; j < n; j += 3) { u += a[i + j] / k; v += a[i + j + 1] / k; }
          const c = clave(u, v);
          (r[c] = r[c] || []).push(...a.slice(i, i + n));
        }
        return r;
      };
      const r = {};
      /* muros perimetrales, por nave y por lado (cada uno se pica, se mueve y se
         oculta solo): en el despiece cada lado sale hacia afuera (dir en el mundo: x = u, z = −v) */
      const LADO = { o: [-1, 0, 0], e: [1, 0, 0], n: [0, 0, -1], s: [0, 0, 1] };
      const LADO_N = { o: 'oeste', e: 'este', n: 'norte', s: 'sur' }, NAVE_N = { n: 'nave norte', s: 'nave sur' };
      const naveDe = v => v > HE[1] - 4 ? 'n' : 's';
      const ladoDe = (u, v) => naveDe(v) + (naveDe(v) === 'n'
        ? (u < 523.5 ? 'o' : u > 557.5 ? 'e' : v > 487 ? 'n' : 's')       // nave norte
        : (u > 557.5 ? 'e' : v > 396 ? 'n' : u < 505.5 ? 'o' : 's'));     // nave sur (su muro norte da a Heliotropo)
      const mt = reparte(MERCADO.perimetro, 9, ladoDe), ml = reparte(MERCADO.perimetroL, 6, ladoDe);
      r.muros = Object.keys(mt).sort().map(k => ({ id: 'muro-' + k, nombre: 'Muro ' + LADO_N[k[1]] + ' · ' + NAVE_N[k[0]], dir: LADO[k[1]], c: geos(geo(mt[k]), 'nave', false, ml[k] ? lineas(ml[k]) : null) }));
      /* cubiertas, por nave y por faldón: los faldones se leen de la geometría.
         Las cumbreras corren a lo largo de v; donde la pendiente cambia de lado
         (la normal pasa de −u a +u o al revés) hay una cumbrera o un valle. Cada
         triángulo (y cada arista) va al faldón en el que cae su centro. */
      const C = MERCADO.cubierta, faldon = {};
      ['n', 's'].forEach(nv => {
        const inclinados = [];   // [u del centro, lado (−1 cae al oeste, +1 al este), área]
        for (let i = 0; i < C.length; i += 9) {
          if (naveDe((C[i + 1] + C[i + 4] + C[i + 7]) / 3) !== nv) continue;
          const a = [C[i + 3] - C[i], C[i + 4] - C[i + 1], C[i + 5] - C[i + 2]], b = [C[i + 6] - C[i], C[i + 7] - C[i + 1], C[i + 8] - C[i + 2]];
          const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], L = Math.hypot(n[0], n[1], n[2]);
          if (!L) continue;
          const nu = n[0] / L * Math.sign(n[2] || 1);   // la normal hacia arriba
          if (Math.abs(nu) > 0.15 && Math.abs(nu) < 0.6) inclinados.push([(C[i] + C[i + 3] + C[i + 6]) / 3, nu > 0 ? 1 : -1, L / 2]);
        }
        // por franjas de 1 m: de qué lado cae la mayor parte; los cortes, donde cambia
        const franja = {};
        inclinados.forEach(([u, s, A]) => { const k = Math.floor(u); franja[k] = (franja[k] || 0) + s * A; });
        const ks = Object.keys(franja).map(Number).filter(k => Math.abs(franja[k]) > 0.5).sort((x, y) => x - y), cortes = [], lados = [];
        ks.forEach((k, j) => {
          const s = Math.sign(franja[k]);
          if (!j) { lados.push(s); return; }
          if (s === lados[lados.length - 1]) return;
          // el corte fino: entre el último centro del lado que acaba y el primero del que empieza
          const k0 = ks[j - 1], de = inclinados.filter(t => t[0] >= k0 && t[0] < k + 1);
          const fin = Math.max(...de.filter(t => t[1] !== s).map(t => t[0])), ini = Math.min(...de.filter(t => t[1] === s).map(t => t[0]));
          cortes.push(isFinite(fin) && isFinite(ini) && ini > fin ? (fin + ini) / 2 : k);
          lados.push(s);
        });
        faldon[nv] = { cortes, lados };
      });
      const faldonDe = (u, v) => { const nv = naveDe(v), f = faldon[nv]; let j = 0; while (j < f.cortes.length && u >= f.cortes[j]) j++; return nv + j; };
      const ct = reparte(C, 9, faldonDe), cl = reparte(MERCADO.cubiertaL, 6, faldonDe);
      r.cubiertas = Object.keys(ct).sort().map(k => {
        const j = +k.slice(1), s = faldon[k[0]].lados[j];
        return { id: 'cubierta-' + k, nombre: 'Cubierta · ' + NAVE_N[k[0]] + ' · faldón ' + (j + 1) + (s ? ' (cae al ' + (s < 0 ? 'oeste' : 'este') + ')' : ''), c: geos(geo(ct[k]), 'nave', false, cl[k] ? lineas(cl[k]) : null) };
      });
      if (MERCADO.acero) r.acero = geos(geo(MERCADO.acero), 'nave', false, lineas(MERCADO.aceroL));
      if (MERCADO.aceroS) r.aceroS = geos(geo(MERCADO.aceroS), 'nave', false, lineas(MERCADO.aceroSL));   // acero de la cubierta de la nave sur (propuesta)
      if (MERCADO.vivienda && MERCADO.vivienda.length) r.vivienda = geos(geo(MERCADO.vivienda), 'modulo', false, lineas(MERCADO.viviendaL));
      // la planta alta de la nave sur (Rhino): ahí llega el descanso de la cinta del aro
      if (MERCADO.pa && MERCADO.pa.length) r.pa = geos(geo(MERCADO.pa), 'nave', false, lineas(MERCADO.paL));
      // la cara curva del corte del aro (vidrio): un arco por nave; en el despiece se va hacia el centro del aro
      if (MERCADO.vidrio) {
        const nave = (u, v) => v > HE[0] ? 'n' : 's';
        const vt = reparte(MERCADO.vidrio, 9, nave), vl = reparte(MERCADO.vidrioL, 6, nave), vr = reparte(MERCADO.vidrioR || [], 6, nave);
        r.vidrio = Object.keys(vt).map(k => {
          const a = vt[k]; let u = 0, v = 0;
          for (let i = 0; i < a.length; i += 3) { u += a[i]; v += a[i + 1]; }
          u /= a.length / 3; v /= a.length / 3;
          const du = ANILLO.u - u, dv = ANILLO.v - v, L = Math.hypot(du, dv);
          return { dir: [du / L, 0, -dv / L], c: geos(geo(a), 'vidrio', false, vl[k] ? lineas(vl[k]) : null), r: vr[k] ? lineas(vr[k]).geo() : null };
        });
      }
      // paso 3: el piso (con la zanja, el canal y el jardín inundable hundidos), las
      // plataformas de lámina (con parches de rejilla), locales, baños, escaleras y la vegetación
      const P3 = MERCADO.paso3;
      if (P3) {
        r.p3 = {};
        [['piso', 'predio', 30], ['resto', 'predio', 30], ['zanja', 'filtro', 30], ['jardin', 'tezontle', 30], ['agua', 'agua', 1],
          ['plataforma', 'nave', 30], ['escalera', 'nave', 30], ['local', 'modcom', 30], ['mesa', 'nave', 30], ['banca', 'nave', 30], ['humedal', 'nave', 30], ['agua_p', 'agua', 1]].forEach(([k, papel, umbral]) => {
          if (P3[k]) r.p3[k] = geos(geo(P3[k]), papel, P3[k + 'L'] ? false : umbral, P3[k + 'L'] ? lineas(P3[k + 'L']) : null);
        });
        ['lamina', 'baranda', 'junco', 'pasto'].forEach(k => { if (P3[k + 'L']) r.p3[k] = lineas(P3[k + 'L']).geo(); });
      }
      // nave sur (mercado_sur): PB de carga, biodigestor y acuaponia; PA con puestos, comedores, tarimas y baños
      const SU = MERCADO.sur;
      if (SU) {
        r.sur = {};
        [['piso', 'predio'], ['anden', 'nave'], ['bio', 'filtro'], ['tanque', 'nave'], ['cama', 'nave'], ['agua', 'agua'], ['pa', 'nave'], ['local', 'modcom'],
          ['mesa', 'nave'], ['muro', 'modcom'], ['tarima', 'nave'], ['maceta', 'tezontle'], ['columna', 'nave'], ['escalera', 'nave']].forEach(([k, papel]) => {
          if (SU[k]) r.sur[k] = geos(geo(SU[k]), papel, SU[k + 'L'] ? false : (k === 'agua' ? 1 : 30), SU[k + 'L'] ? lineas(SU[k + 'L']) : null);
        });
        ['baranda', 'pasto', 'planta'].forEach(k => { if (SU[k + 'L']) r.sur[k + 'Lin'] = lineas(SU[k + 'L']).geo(); });
      }
      return r;
    });
    const sub = (padre, dir) => { const g = new THREE.Group(); g.userData.dir = dir; padre.add(g); return g; };
    // (userData.norte: es de la nave norte, ver naveNorteEn)
    const gMur = pieza('mercado-perimetro', 'comercio', 0.35);
    const murosG = MG.muros.map(m => { const g = sub(gMur, m.dir.map(x => x * 7)); g.userData.norte = m.id[5] === 'n'; ponGeos(g, m.c, 'nave', 'comercio'); return g; });
    const gCub = pieza('mercado-cubierta', 'comercio', 0.4);
    const cubG = MG.cubiertas.map(m => { const g = sub(gCub, [0, 9, 0]); g.userData.norte = m.id[9] === 'n'; ponGeos(g, m.c, 'nave', 'comercio'); return g; });
    // la retícula de acero que rigidiza la nave norte (y sobre la que va la cubierta)
    const gAce = MG.acero ? pieza('mercado-acero', 'comercio', 0.38) : null;
    if (gAce) ponGeos(gAce, MG.acero, 'nave', 'comercio', true);
    // y el de la nave sur: las columnas de la planta alta siguen hasta la cubierta propuesta
    const gAceS = MG.aceroS ? pieza('mercado-sur-acero', 'comercio', 0.39) : null;
    if (gAceS) ponGeos(gAceS, MG.aceroS, 'nave', 'comercio', true);
    // las columnas de la vivienda que cruzan el mercado (independientes: de referencia)
    const gViv = MG.vivienda ? pieza('mercado-vivienda', 'vivienda', 0.37) : null;
    if (gViv) ponGeos(gViv, MG.vivienda, 'modulo', 'vivienda');
    const gPA = MG.pa ? pieza('mercado-pa', 'comercio', 0.34) : null;
    if (gPA) ponGeos(gPA, MG.pa, 'nave', 'comercio');
    // la fachada al aro: vidrio (por ahora), con sus parteluces y el reflejo
    const gVid = MG.vidrio ? pieza('mercado-vidrio', 'comercio', 0.36) : null;
    const vidG = gVid ? MG.vidrio.map(v => {
      const g = sub(gVid, v.dir.map(x => x * 7));
      ponGeos(g, v.c, 'vidrio', 'comercio');
      if (v.r) ponLineas(g, v.r, 'vidrio-reflejo', 0xffffff, PROGRAMA.agua, 'comercio');
      return g;
    }) : [];
    let gP = null, gA = null, gL = null, gV = null, gT = null;
    if (MG.p3) {
      const Q = MG.p3;
      gP = pieza('mercado-piso', 'comercio', 0.05); gA = pieza('mercado-plataformas', 'comercio', 0.3); gL = pieza('mercado-locales', 'comercio', 0.33); gV = pieza('mercado-verde', 'comercio', 0.5);
      const pone = (g, k, papel, ap) => Q[k] ? ponGeos(g, Q[k], papel, ap) : null;
      const piso = pone(gP, 'piso', 'predio', 'comercio'); if (piso) suelos.push(piso);
      pone(gP, 'resto', 'predio', null);   // lo de la huella que cae dentro del aro (patios, pendiente)
      pone(gP, 'zanja', 'filtro', 'comercio');
      pone(gP, 'jardin', 'tezontle', 'comercio');
      pone(gP, 'agua', 'agua', 'comercio');
      pone(gA, 'plataforma', 'nave', 'comercio');
      pone(gA, 'escalera', 'nave', 'comercio');   // (las contrahuellas)
      pone(gL, 'local', 'modcom', 'comercio');     // puestos y baños
      pone(gL, 'mesa', 'nave', 'comercio');        // comedores
      // patios del aro: bancas, bordillo del estanque y su agua
      if (Q.banca || Q.humedal) { gT = pieza('mercado-patios', 'comercio', 0.06); pone(gT, 'banca', 'nave', 'comercio'); pone(gT, 'humedal', 'nave', 'comercio'); pone(gT, 'agua_p', 'agua', 'comercio'); }
      const pl = (k, nombre, color, colorColor, g) => { if (Q[k]) ponLineas(g, Q[k], nombre, color, colorColor, 'comercio'); };
      pl('lamina', 'rayo-lamina', 0xffffff, null, gA);
      pl('baranda', 'columna-baranda', 0xffffff, null, gA);
      pl('junco', 'junco', 0xffffff, PROGRAMA.agua, gV);
      pl('pasto', 'pasto', 0xffffff, PROGRAMA.verde, gA);   // (al pie de los escalones: van con las plataformas)
      // árboles: los de la hoja de árboles (su propio material: no se apagan como
      // los del paisaje); los del jardín y los de maceta (van con las plataformas)
      const A = MERCADO.arboles || [];
      [[gV, A.filter(t => t[2] < 0.3)], [gA, A.filter(t => t[2] >= 0.3)]].forEach(([g, lista]) => {
        if (!lista.length) return;
        const b = mallaAtlas(lista.length, matArbol);
        lista.forEach((t, i) => {
          const p = W(t[0], t[1], t[2]);
          b.aPos.setXYZ(i, p[0], p[1], p[2]); b.aEsc.setXY(i, ARBOLES_TEX.ancho * t[3] * 0.8, ARBOLES_TEX.alto * t[3]);
          b.aTile.setX(i, i % 3); b.aVolt.setX(i, i % 2 ? 1 : -1);
        });
        g.add(b.malla);
      });
    }
    // aislando el mercado: sus partes (las que se desplazan, hacia dónde)
    // cada cubierta (por nave y faldón) y cada muro (por nave y lado), sueltos
    MG.cubiertas.forEach((m, i) => parte('comercio', m.id, m.nombre, [cubG[i]]));
    MG.muros.forEach((m, i) => parte('comercio', m.id, m.nombre, [murosG[i]]));
    if (vidG.length) parte('comercio', 'vidrio', 'Fachada al aro (vidrio)', vidG);
    if (gAce) parte('comercio', 'acero', 'Estructura de acero', [gAce], [0, 4.5, 0]);
    if (gAceS) parte('comercio', 'acero-sur', 'Estructura de acero · nave sur', [gAceS], [0, 4.5, 0]);
    if (gA) parte('comercio', 'plataformas', 'Plataformas, escaleras y barandales', [gA], [0, 2.2, 0]);
    if (gL) parte('comercio', 'puestos', 'Puestos, comedores y baños', [gL], [0, 2.2, 0]);
    if (gPA) parte('comercio', 'pa', 'Planta alta de la nave sur', [gPA]);
    if (gP) parte('comercio', 'piso', 'Piso, zanja y jardín', [gP]);
    if (gV) parte('comercio', 'verde', 'Vegetación', [gV]);
    if (gT) parte('comercio', 'patios', 'Patios del aro (bancas y estanques)', [gT]);
    // nave sur: la PB (carga, biodigestor, acuaponia) y la PA (una plataforma), cada una suelta
    if (MG.sur) {
      const Q = MG.sur, pb = pieza('mercado-sur-pb', 'comercio', 0.07), pa = pieza('mercado-sur-pa', 'comercio', 0.32);
      const pon = (g, k, papel) => Q[k] ? ponGeos(g, Q[k], papel, 'comercio') : null;
      const piso = pon(pb, 'piso', 'predio'); if (piso) suelos.push(piso);
      [['anden', 'nave'], ['bio', 'filtro'], ['tanque', 'nave'], ['cama', 'nave'], ['agua', 'agua'], ['columna', 'nave'], ['escalera', 'nave']].forEach(([k, papel]) => pon(pb, k, papel));
      [['pa', 'nave'], ['local', 'modcom'], ['mesa', 'nave'], ['muro', 'modcom'], ['tarima', 'nave'], ['maceta', 'tezontle']].forEach(([k, papel]) => pon(pa, k, papel));
      if (Q.barandaLin) ponLineas(pa, Q.barandaLin, 'columna-baranda', 0xffffff, null, 'comercio');
      if (Q.pastoLin) ponLineas(pa, Q.pastoLin, 'pasto', 0xffffff, PROGRAMA.verde, 'comercio');
      if (Q.plantaLin) ponLineas(pb, Q.plantaLin, 'pasto', 0xffffff, PROGRAMA.verde, 'comercio');
      parte('comercio', 'sur-pa', 'Nave sur · planta alta (puestos, comedores, baños)', [pa], [0, 5, 0]);
      parte('comercio', 'sur-pb', 'Nave sur · planta baja (carga, biodigestor, acuaponia)', [pb]);
    }
    if (gViv) parte('comercio', 'vivienda', 'Columnas de la vivienda', [gViv], null, true);

    /* abriendo la nave norte (doble clic sobre ella, ver aisla('nave-norte')):
       sólo quedan ella y el aro; la cubierta sube y los muros bajan hasta
       dejar un antepecho, para ver el interior. Lo de la nave sur, oculto. */
    const SUBE_CUBIERTA = 8;     // m que sube la cubierta
    const ANTEPECHO = 0.9;       // m de muro que quedan sobre su desplante
    [gAce, gA, gL, gV, gP].forEach(g => { if (g) g.userData.norte = true; });   // (paso 3 y acero: todo de la nave norte)
    vidG.forEach(g => { g.userData.norte = g.userData.dir[2] > 0; });          // (el vidrio norte se va hacia el sur, al centro del aro: +z)
    const caja3 = new THREE.Box3();
    MG.cubiertas.forEach((m, i) => { if (cubG[i].userData.norte) parte('nave-norte', m.id, m.nombre, [cubG[i]], [0, SUBE_CUBIERTA, 0]); });
    MG.muros.forEach((m, i) => {
      if (!murosG[i].userData.norte) return;
      caja3.setFromObject(murosG[i]);
      parte('nave-norte', m.id, m.nombre, [murosG[i]], [0, -Math.max(0, caja3.max.y - caja3.min.y - ANTEPECHO), 0]);
    });
    const vidN = vidG.filter(g => g.userData.norte);
    if (vidN.length) parte('nave-norte', 'vidrio', 'Fachada al aro (vidrio)', vidN, [0, -Math.max(0, caja3.setFromObject(vidN[0]).max.y - caja3.min.y - ANTEPECHO), 0]);
    if (gAce) parte('nave-norte', 'acero', 'Estructura de acero', [gAce]);
    if (gA) parte('nave-norte', 'plataformas', 'Plataformas, escaleras y barandales', [gA]);
    if (gL) parte('nave-norte', 'puestos', 'Puestos, comedores y baños', [gL]);
    if (gP) parte('nave-norte', 'piso', 'Piso, zanja y jardín', [gP]);
    if (gV) parte('nave-norte', 'verde', 'Vegetación', [gV]);
    const sur = murosG.filter(g => !g.userData.norte).concat(cubG.filter(g => !g.userData.norte), vidG.filter(g => !g.userData.norte));
    if (sur.length) parte('nave-norte', 'nave-sur', 'Nave sur', sur, null, true);
  } else NAVESG: {
    // la cara curva del corte del aro no es muro: va de vidrio (por ahora), con un parteluz en cada quiebre
    const porNave = new Map();
    PIEZAS.forEach(pz => {
      const nv = pz.nv, L = pz.L;
      if (!porNave.has(nv)) porNave.set(nv, { m: new Malla(), vid: new Malla(), lv: new Lineas() });
      const { m, vid, lv } = porNave.get(nv);
      const zf = (u) => nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - pz.um) / pz.run);
      [true, false].forEach(izq => {
        const h = G.cortaU(pz.pol, pz.um, izq);
        if (!h) return;
        tapa(m, h, 0, (u) => zf(u));
        const e = 1e-3;
        muros(m, h, 0, 0, (u) => zf(u), (a, b) =>
          (Math.abs(a[0] - L.u0) < e && Math.abs(b[0] - L.u0) < e) || (Math.abs(a[0] - L.u1) < e && Math.abs(b[0] - L.u1) < e) ||
          (Math.abs(a[1] - L.v0) < e && Math.abs(b[1] - L.v0) < e) || (Math.abs(a[1] - L.v1) < e && Math.abs(b[1] - L.v1) < e));
        const corte = (a, b) => a[2] && b[2];
        muros(vid, h, 0, 0, (u) => zf(u) - 0.02, corte);
        ccw(h).forEach((a, k, q) => { const b = q[(k + 1) % q.length]; if (corte(a, b)) { lv.seg(W(a[0], a[1], 0), W(a[0], a[1], zf(a[0]))); lv.seg(W(b[0], b[1], 0), W(b[0], b[1], zf(b[0]))); } });
      });
    });
    let i = 0;
    porNave.forEach((q, nv) => {
      const g = pieza('nave' + i, 'comercio', 0.35 + 0.05 * i++);
      pon(g, q.m, 'nave', 'comercio', 12);
      if (q.vid.p.length) pon(g, q.vid, 'vidrio', 'comercio', 12, q.lv);
    });
  }

  /* ===== 4. Industria (la chimenea existente ya no va) ===== */
  if (MOD && MOD.industria) {
    const g = pieza('industria', 'industria', 0.4), m = new Malla(), I = MOD.industria;
    prisma(m, G.pares(I.planta), I.z0, I.z1); pon(g, m, 'industria', 'industria', 20);
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

  /* ===== 6. Aro =====
     Con la cinta (atlampa-mercado.js, cinta): una franja de 2 m del borde de
     afuera se desprende y baja de +10.03 a la planta alta de la nave sur (+4.28)
     y a las plataformas de la norte (+2.40). Entre th0 y th1 el aro queda
     2 m más angosto (de ahí salió la cinta), con su barandal en el borde nuevo;
     las columnas de afuera de ese tramo cargan la cinta (llegan a su lecho). */
  const CINTA = MERC && MERC.cinta ? MERC.cinta : null;
  const enCinta = t => { if (!CINTA) return false; const d = ((t - CINTA.th0) % 360 + 360) % 360; return d < CINTA.th1 - CINTA.th0; };
  const zCinta = t => {   // la altura de la cinta en el ángulo t (°)
    const P = CINTA.perfil, d = ((t - CINTA.th0) % 360 + 360) % 360 + CINTA.th0;
    for (let i = 1; i < P.length; i++) if (d <= P[i][0]) { const a = P[i - 1], b = P[i]; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]) : b[1]; }
    return P[P.length - 1][1];
  };
  {
    const g = pieza('aro', 'aro', 0.6), n = 720, z1 = ANILLO.z, z0 = z1 - ANILLO.canto;
    ponGeos(g, fija('aro', () => {
    const m = new Malla(), ln = new Lineas(), zb = z1 + ANILLO.baranda;
    // ángulos: cada medio grado y, si hay cinta, justo donde empieza y donde acaba
    const ts = Array.from({ length: n }, (_, i) => i / n * 360);
    if (CINTA) ts.push(((CINTA.th0 % 360) + 360) % 360, ((CINTA.th1 % 360) + 360) % 360);
    ts.sort((a, b) => a - b);
    const R = t => [G.aroPunto(t, ANILLO.ri), G.aroPunto(t, ANILLO.re)];
    const P = (t, r) => [ANILLO.u + Math.cos(t * RAD) * r, ANILLO.v + Math.sin(t * RAD) * r];
    let antes = null;
    ts.forEach((t, k) => {
      const t2 = k + 1 < ts.length ? ts[k + 1] : ts[0] + 360;
      if (t2 - t < 1e-6) return;
      const cin = enCinta((t + t2) / 2);   // este tramo, ¿angosto?
      const [a, A0] = R(t), [b, B0] = R(t2), A = cin ? P(t, CINTA.ri) : A0, B = cin ? P(t2, CINTA.ri) : B0;
      m.quad(W(a[0], a[1], z1), W(b[0], b[1], z1), W(B[0], B[1], z1), W(A[0], A[1], z1));
      m.quad(W(a[0], a[1], z0), W(A[0], A[1], z0), W(B[0], B[1], z0), W(b[0], b[1], z0));
      m.quad(W(A[0], A[1], z0), W(A[0], A[1], z1), W(B[0], B[1], z1), W(B[0], B[1], z0));
      m.quad(W(a[0], a[1], z0), W(b[0], b[1], z0), W(b[0], b[1], z1), W(a[0], a[1], z1));
      // donde cambia el ancho: la cara de la orilla (de un radio al otro), con su barandal
      if (antes !== null && antes !== cin) {
        const q0 = P(t, CINTA.ri), q1 = A0;
        m.quad(W(q0[0], q0[1], z0), W(q1[0], q1[1], z0), W(q1[0], q1[1], z1), W(q0[0], q0[1], z1));
        if (Math.abs(zCinta(t) - z1) > 0.3) ln.seg(W(q0[0], q0[1], zb), W(q1[0], q1[1], zb));
      }
      antes = cin;
      // barandal (pasamanos) por los dos bordes; en el tramo angosto, en el borde nuevo
      // sólo donde la cinta ya bajó más de 0.30 (antes es el mismo piso)
      ln.seg(W(a[0], a[1], zb), W(b[0], b[1], zb));
      if (!cin || z1 - zCinta((t + t2) / 2) > 0.3) ln.seg(W(A[0], A[1], zb), W(B[0], B[1], zb));
    });
    // balaustres cada 2.4 m a lo largo de cada borde
    [r => R(r)[0], r => R(r)[1]].forEach((borde, lado) => {
      let d = 0, q = null;
      for (let i = 0; i <= 1440; i++) {
        const t = i / 4, cin = lado === 1 && enCinta(t), p = cin ? P(t, CINTA.ri) : borde(t);
        if (q) d -= Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d <= 0 && (!cin || z1 - zCinta(t) > 0.3)) { ln.seg(W(p[0], p[1], z1), W(p[0], p[1], zb)); d += 2.4; }
        q = p;
      }
    });
    return geos(m, 'aro', 30, ln);
    }), 'aro', 'aro');
    // columnas (las que no caen dentro de un pabellón); las de afuera en el tramo
    // de la cinta llegan a su lecho (la cargan)
    const col = new THREE.CylinderGeometry(0.4, 0.4, 1, 10, 1).translate(0, 0.5, 0), cs = COLUMNAS.filter(c => !G.enEdificio(c[0], c[1]));
    const mcol = material('aro-estr'); mcol.userData.papel = 'aro'; mcol.userData.estr = true;
    const im = new THREE.InstancedMesh(col, mcol, cs.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Vector3(), V = new THREE.Vector3();
    cs.forEach((c, i) => {
      const t = Math.atan2(c[1] - ANILLO.v, c[0] - ANILLO.u) / RAD, r = Math.hypot(c[0] - ANILLO.u, c[1] - ANILLO.v);
      const h = CINTA && r > CINTA.ri && enCinta(t) ? zCinta(t) - CINTA.canto : z0, p = W(c[0], c[1], 0);
      M.compose(V.set(p[0], p[1], p[2]), Q, E.set(1, h, 1)); im.setMatrixAt(i, M);
    });
    im.userData.ap = 'aro'; im.userData.estr = true; g.add(im); picables.push(im);
  }
  // la cinta: el mismo objeto que el aro (mismo canto, mismo barandal)
  if (CINTA && CINTA.tris) {
    const gC = pieza('cinta', 'aro', 0.62);
    ponGeos(gC, fija('cinta', () => {
      const a = CINTA.tris, p = new Float32Array(a.length);
      for (let i = 0; i < a.length; i += 3) { const w = W(a[i], a[i + 1], a[i + 2]); p[i] = w[0]; p[i + 1] = w[1]; p[i + 2] = w[2]; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.computeVertexNormals();
      const l = new Lineas(), b = CINTA.lineas;
      for (let i = 0; i < b.length; i += 3) l.p.push(...W(b[i], b[i + 1], b[i + 2]));
      return geos(g, 'aro', false, l);
    }), 'aro', 'aro');
    if (MERCADO) parte('comercio', 'cinta', 'Cinta del aro', [gC]);
  }

  /* ===== 6b. Arte y cultura (el concepto detallado) =====
     Reemplaza a los pabellones simples en todas las escenas: un edificio de
     tres niveles con auditorio hundido, escaleras en X, fachada de diagonales
     y parasoles a +12, bajo el aro de siempre (el suyo, más chico, no va).
     Viene en el sistema de Rhino: se traslada como los módulos. Los vidrios
     no se dibujan (nada transparente): la fachada se lee por sus parteluces. */
  if (CD) {
    piezas.forEach(p => { if (p.g.name === 'cultura') p.g.userData.oculto = true; });
    // por partes (para aislarlo: cada una se oculta sola)
    const g = pieza('cultura-detalle', 'cultura', 0.45);
    const PARTES_CD = [['losa', 'Losas y módulos', ['m-losa', 'l-borde']], ['nucleo', 'Núcleos', ['m-nucleo']], ['acero', 'Estructura de acero', ['m-acero']],
      ['escalera', 'Escaleras y rampas', ['m-escalera', 'l-huella']], ['auditorio', 'Auditorio', ['m-auditorio']], ['aro', 'Parasoles', ['m-aro']], ['fachada', 'Fachada (parteluces)', ['l-parteluz']]];
    PARTES_CD.forEach(([id, nombre, ks]) => {
      const sg = new THREE.Group(); sg.name = 'cultura-' + id; g.add(sg);
      ks.forEach(k => {
        const c = CDG[k];
        if (!c) return;
        if (c.isBufferGeometry) ponLineas(sg, c, 'columna-' + k.slice(2), 0xffffff, PROGRAMA.cultura, 'cultura');
        else ponGeos(sg, c, 'cultura', 'cultura', k === 'm-acero');
      });
      if (sg.children.length) parte('cultura', id, nombre, [sg]);
    });
  }

  /* ===== 7. Módulos de vivienda ===== */
  const gMods = [];
  if (MOD) {
    // (las geometrías, una vez por sesión: por nivel, y aparte los de comercio)
    const NIVELES = fija('modulos', () => {
    const A = MOD.a / 2, Bm = MOD.b / 2, porNivel = {}, COM = MOD.tipos.indexOf('comercio'), SOC = MOD.tipos.indexOf('44SOC');
    MOD.cajas.forEach(r => {
      const nivel = r[2], z0 = MOD.z0 + nivel * MOD.alto, z1 = z0 + MOD.alto, com = r[3] === COM, soc = r[3] === SOC, clave = (com ? 'c' : '') + (soc ? 's' : '') + nivel;
      if (!porNivel[clave]) porNivel[clave] = { m: new Malla(), l: new Lineas(), com, soc, nivel };
      const { m, l } = porNivel[clave];
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
      // los de comercio (junto al aro): la caja entera, sin la cara que se abre
      // al paso (r[10]); de esa sólo queda el marco
      const abre = r[10] || [];
      if (com) r = r.slice(0, 4).concat([1, 1, 1, 1], r.slice(8, 9), [0]);
      [[0, -Bm, A], [1, A, Bm], [0, Bm, A], [1, -A, Bm]].forEach((lado, i) => {
        const mm = r[4 + i];
        if (!mm) return;
        if (abre.indexOf(i) >= 0) {
          const a = lado[0] ? [lado[1], -lado[2]] : [-lado[2], lado[1]], b = lado[0] ? [lado[1], lado[2]] : [lado[2], lado[1]];
          [[a, z0, b, z0], [b, z0, b, z1], [b, z1, a, z1], [a, z1, a, z0]].forEach(e => l.seg(P(e[0][0], e[0][1], e[1]), P(e[2][0], e[2][1], e[3])));
          return;
        }
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
    const r = {};
    Object.keys(porNivel).forEach(k => { const p = porNivel[k]; r[k] = { com: p.com, soc: p.soc, nivel: p.nivel, c: fijas(geos(p.m, p.com ? 'modcom' : p.soc ? 'social' : 'modulo', false, p.l)) }; });
    return r;
    });
    const porPiso = {};   // la vivienda de cada nivel (media y social juntas, para el despiece)
    Object.values(NIVELES).sort((a, b) => a.nivel - b.nivel).forEach(p => {
      const n = p.nivel;
      if (p.com) {   // comercio: se queda aunque se apaguen los módulos (es parte del comercio)
        const g = pieza('modcomercio' + n, 'comercio', 0.62 + n * 0.05);
        ponGeos(g, p.c, 'modcom', 'comercio');
        return;
      }
      const g = pieza('modulos' + n + (p.soc ? 's' : ''), 'vivienda', 0.6 + n * 0.05);
      g.userData.capa = 'modulos';
      ponGeos(g, p.c, p.soc ? 'social' : 'modulo', 'vivienda');
      gMods.push(g);
      (porPiso[n] = porPiso[n] || []).push(g);
    });
    // aislando la vivienda: cada nivel se oculta solo, y el despiece los separa
    Object.keys(porPiso).forEach(n => parte('vivienda', 'n' + n, 'Nivel ' + (+n + 1), porPiso[n], [0, n * 2.4, 0]));
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
  const estLineas = [], estRampas = [];
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
    ponLineas(gEst, l, 'est-baja', 0xffffff, PROGRAMA.est, 'estacionamiento', xray);
    /* helicoidales dobles: en cada rampa, dos losas helicoidales concéntricas
       (el carril de adentro y el de afuera: uno baja y el otro sube), una
       vuelta por sótano, con sus bordes y el muro del centro. Arrancan en 0°,
       donde llega el acceso, y giran en el mismo sentido: la norte (se entra
       desde el norte) baja en el sentido del reloj; la sur, al revés. Una
       vuelta por sótano en su propio grupo, para separar los niveles. */
    for (let k = 1; k <= N; k++) {
      const m = new Malla(), lr = new Lineas(), PASOS = 64;
      EST.rampas.forEach(r => {
        const giro = r.bloque === 'norte' ? -1 : 1, en = (rad, t) => { const a = giro * (k - 1 + t) * 2 * Math.PI; return W(r.c[0] + Math.cos(a) * rad, r.c[1] + Math.sin(a) * rad, -(k - 1 + t) * e); };
        (r.carriles || [r.r]).forEach(cr => {
          for (let i = 0; i < PASOS; i++) {
            const t0 = i / PASOS, t1 = (i + 1) / PASOS;
            m.quad(en(cr[0], t0), en(cr[1], t0), en(cr[1], t1), en(cr[0], t1));
            lr.seg(en(cr[0], t0), en(cr[0], t1)); lr.seg(en(cr[1], t0), en(cr[1], t1));
          }
          lr.seg(en(cr[0], 0), en(cr[1], 0));   // dónde empieza la vuelta
        });
        // el muro del centro: unas verticales
        for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI, u = r.c[0] + Math.cos(a) * r.r[0], v = r.c[1] + Math.sin(a) * r.r[0]; lr.seg(W(u, v, -(k - 1) * e), W(u, v, -k * e)); }
      });
      const g = new THREE.Group(); gEst.add(g);
      pon(g, m, 'rampa', 'estacionamiento', false);
      ponLineas(g, lr, 'rampa-borde', 0xffffff, PROGRAMA.est, 'estacionamiento');
      estRampas.push(g);
    }
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

  /* ===== Flechas de diagrama (de la lámina de flechas de Gabriel) =====
     doble: cinta de contorno blanco y relleno negro, con punta abierta (la
     cuarta); punteada: trazos gruesos y punta llena (la primera).
     pts: [u, v, z]; puntas: [al final, al inicio]. */
  function suaviza(p, n) {   // Chaikin, sin mover las puntas
    for (let k = 0; k < n; k++) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        q.push(a.map((x, j) => x * 0.75 + b[j] * 0.25), a.map((x, j) => x * 0.25 + b[j] * 0.75));
      }
      q.push(p[p.length - 1]); p = q;
    }
    return p;
  }
  // recorta la polilínea a [d0, L - d1] (deja sitio a las puntas)
  function recorta(p, d0, d1) {
    const acc = [0];
    for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const L = acc[acc.length - 1];
    const en = s => { let i = 1; while (i < p.length - 1 && acc[i] < s) i++; const f = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return p[i - 1].map((x, j) => x + (p[i][j] - x) * f); };
    const r = [en(d0)];
    p.forEach((q, i) => { if (acc[i] > d0 && acc[i] < L - d1) r.push(q); });
    r.push(en(L - d1));
    return r;
  }
  function normales(p) {   // normal (a la izquierda) por vértice, promediada
    return p.map((q, i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv) || 1;
      return [-dv / L, du / L];
    });
  }
  function punta(p, alFinal) {   // [la punta, dirección hacia ella]
    const n = p.length, a = alFinal ? p[n - 1] : p[0];
    let b = null;
    for (let i = 1; i < n && !b; i++) { const q = alFinal ? p[n - 1 - i] : p[i]; if (Math.hypot(q[0] - a[0], q[1] - a[1]) > 1.5) b = q; }
    b = b || (alFinal ? p[0] : p[n - 1]);
    const du = a[0] - b[0], dv = a[1] - b[1], L = Math.hypot(du, dv) || 1;
    return [a, du / L, dv / L];
  }
  function flechaDoble(m, l, pts, o) {
    const w = o.ancho / 2, wp = o.ancho * 1.35, lp = o.ancho * 2.1, z = q => q[2] + 0.02;
    let p = suaviza(pts, 3);
    const pf = o.puntas[0] ? punta(p, true) : null, pi = o.puntas[1] ? punta(p, false) : null;
    p = recorta(p, pi ? lp : 0, pf ? lp : 0);
    const nr = normales(p);
    const iz = p.map((q, i) => [q[0] + nr[i][0] * w, q[1] + nr[i][1] * w, z(q)]), de = p.map((q, i) => [q[0] - nr[i][0] * w, q[1] - nr[i][1] * w, z(q)]);
    for (let i = 1; i < p.length; i++) m.quad(W(...de[i - 1]), W(...de[i]), W(...iz[i]), W(...iz[i - 1]));
    l.poli(iz.map(q => W(...q))); l.poli(de.map(q => W(...q)));
    // puntas abiertas (contorno) con relleno; la cinta entra por la base
    [[pf, iz.length - 1], [pi, 0]].forEach(([t, k]) => {
      if (!t) { l.seg(W(...iz[k]), W(...de[k])); return; }
      const [a, du, dv] = t, b = p[k], nu = -dv, nv = du, zz = z(b);
      const L1 = [b[0] + nu * wp, b[1] + nv * wp, zz], R1 = [b[0] - nu * wp, b[1] - nv * wp, zz], T = [a[0], a[1], zz];
      m.tri(W(...R1), W(...T), W(...L1));
      const lI = Math.hypot(iz[k][0] - L1[0], iz[k][1] - L1[1]) < Math.hypot(iz[k][0] - R1[0], iz[k][1] - R1[1]);
      const aI = lI ? L1 : R1, aD = lI ? R1 : L1;
      l.seg(W(...iz[k]), W(...aI)); l.seg(W(...aI), W(...T)); l.seg(W(...T), W(...aD)); l.seg(W(...aD), W(...de[k]));
    });
  }
  function flechaPunteada(m, pts, o) {
    const w = o.ancho / 2, wp = o.ancho * 1.5, lp = o.ancho * 2.4, tr = o.ancho * 1.6, hueco = o.ancho * 0.9;
    let p = suaviza(pts, 3);
    const pf = punta(p, true);
    p = recorta(p, 0, lp);
    const nr = normales(p), lado = (q, n, s) => W(q[0] + n[0] * w * s, q[1] + n[1] * w * s, q[2] + 0.02);
    // trazos de tr, huecos de hueco
    let d = 0, lleno = true, ini = 0;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      if (lleno) m.quad(lado(a, nr[i - 1], 1), lado(b, nr[i], 1), lado(b, nr[i], -1), lado(a, nr[i - 1], -1));
      d += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d - ini > (lleno ? tr : hueco)) { lleno = !lleno; ini = d; }
    }
    const [a, du, dv] = pf, b = p[p.length - 1], nu = -dv, nv = du, zz = b[2] + 0.02;
    m.tri(W(b[0] - nu * wp, b[1] - nv * wp, zz), W(a[0], a[1], zz), W(b[0] + nu * wp, b[1] + nv * wp, zz));
  }

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
  matPersEsq = matPers;
  const PERS = [], RUTAS_PEAT = [];   // { u, v, tile, esc, ruta, acc, largo, vel, s0, lado } o quieto { u, v, tile, esc, flip }
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
      RUTAS_PEAT.push(pts);
      let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      ruta(pts, Math.round(L * dens));
    });
    // el resto: el doble que antes (16 → 32) en las banquetas y los senderos
    // (por la mitad de la banqueta del predio)
    const mitad = G.PRED.map((q, i) => [(q[0] + G.GUP[i][0]) / 2, (q[1] + G.GUP[i][1]) / 2]);
    ruta(mitad.concat([mitad[0]]), 22, 1.3);
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
  // el flujo de personas de la lámina: flechas dobles (cinta y punta abierta) en
  // los dos sentidos; la tercera es un ramal: sólo la punta de afuera
  {
    const m = new Malla(), l = new Lineas();
    RUTAS_PEAT.forEach((r, k) => flechaDoble(m, l, (k === 2 ? r.slice().reverse() : r).map(q => [q[0], q[1], 0.3]), { ancho: 2.2, puntas: [true, k !== 2] }));
    gPers.add(new THREE.Mesh(m.geo(), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    gPers.add(new THREE.LineSegments(l.geo(), new THREE.LineBasicMaterial({ color: 0xffffff })));
  }
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
  const gEstAcc = new THREE.Group(); gEstAcc.visible = false; escena.add(gEstAcc);
  {
    const img = (r, x, y) => [PB.u0 + (x - r[0]) / (r[2] - r[0]) * (PB.u1 - PB.u0), PB.v1 - (y - r[1]) / (r[3] - r[1]) * (PB.v1 - PB.v0)];
    // [x, y de la lámina, hacia adentro (du, dv)]
    const peat = [[150, 99, 0, -1], [229, 155, -1, 0], [229, 215, -1, 0], [50, 220, 1, 0], [106, 328, 0, 1]].map(a => [img([76, 115, 210, 316], a[0], a[1]), a[2], a[3]]);
    // vehiculares: la lámina corregida (marco x 26–160, y 76–277): norte, oriente (junto a la esquina sur) y sur
    const veh = [[49, 60, 0, -1], [168, 261, -1, 0], [84, 291, 0, 1]].map(a => [img([26, 76, 160, 277], a[0], a[1]), a[2], a[3]]);
    function flechas(lista, color) {
      const m = new Malla(), l = new Lineas(), z0 = 0.3, z1 = 0.9, L = 3.6, A = 2.2;
      lista.forEach(([q, du, dv]) => {
        // la punta toca la fachada; la base, sobre la banqueta
        const u = Math.max(PB.u0, Math.min(PB.u1, q[0])), v = Math.max(PB.v0, Math.min(PB.v1, q[1]));
        const sur = G.PRED[0][1] + (G.PRED[1][1] - G.PRED[0][1]) * (u - G.PRED[0][0]) / (G.PRED[1][0] - G.PRED[0][0]);
        const pu = du ? (du > 0 ? PB.u0 : PB.u1) : u, pv = dv ? (dv > 0 ? sur : PB.v1) : v;
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
    if (EST && ESC === 'estacionamiento') {
      // el acceso al estacionamiento: el camino de los carros de la calle a la
      // boca de la helicoidal (entrada) y de vuelta (salida), en flechas
      // punteadas; la bajada ya la dibuja la helicoidal. Con la circulación de la derecha: se entra por
      // el carril de la derecha. (Las bocas de las rampas no coinciden con los
      // triángulos de la lámina, que siguen en Accesos.)
      const m = new Malla(), z0 = 0.3;
      const arco = (c, r, a0, a1) => Array.from({ length: 25 }, (_, i) => { const a = (a0 + (a1 - a0) * i / 24) * RAD; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z0]; });
      const angV = (c, r, v) => Math.asin(Math.max(-1, Math.min(1, (v - c[1]) / r))) / RAD;   // ángulo (−90…90) donde el arco llega a v
      const rn = EST.rampas.find(r => r.bloque === 'norte'), rs = EST.rampas.find(r => r.bloque === 'sur');
      const ce = (GU.n + GF.n) / 2, cc = (GU.s + GF.s) / 2, ri = 6.7, re = 10.95;   // ejes de las calles; los carriles de la helicoidal
      const rutas = [];
      if (rn) {   // a Eulalia Guzmán (norte)
        const c = rn.c, vb = c[1] + 5.3;   // ahí empiezan los arcos del acceso
        const cA = [c[0] + ri - re, vb], ent = arco(cA, re, angV(cA, re, GU.n), 0);
        rutas.push([[ent[0][0], ce, z0], ...ent, [c[0] + ri, c[1], z0]]);
        const cB = [c[0] + 2 * re, vb], sal = arco(cB, re, 180, 180 - angV(cB, re, GU.n));
        rutas.push([[c[0] + re, c[1], z0], [c[0] + re, vb, z0], ...sal, [sal[sal.length - 1][0], ce, z0]]);
      }
      if (rs) {   // a Clavel (sur)
        const c = rs.c, vb = c[1] - 5.2;
        const cA = [c[0] + 2 * re, vb], ent = arco(cA, re, 180 - angV(cA, re, GU.s), 180);
        rutas.push([[ent[0][0], cc, z0], ...ent, [c[0] + re, c[1], z0]]);
        const cB = [c[0] + ri - re, vb], sal = arco(cB, re, 0, angV(cB, re, GU.s));
        rutas.push([[c[0] + ri, c[1], z0], [c[0] + ri, vb, z0], ...sal, [sal[sal.length - 1][0], cc, z0]]);
      }
      rutas.forEach(r => flechaPunteada(m, r, { ancho: 1.1 }));
      // en rayos X, como el estacionamiento: la bajada se ve a través del piso
      const me = new THREE.Mesh(m.geo(), new THREE.MeshBasicMaterial({ color: 0x3d7fe0, side: THREE.DoubleSide, depthTest: false }));
      me.renderOrder = 5; gEstAcc.add(me);
    }
  }

  /* ===== 13. Mapa Nolli =====
     La planta baja como figura y fondo, con lo que hay ahora: el espacio
     público en blanco (calles, banquetas, el piso libre, la plaza, el interior
     de las naves y de arte y cultura) y lo construido o privado en negro: los
     edificios del contexto y la industria, llenos; los muros de naves y de
     arte y cultura como bandas negras; la estructura (columnas del aro, de
     arte y cultura y las que bajan de los módulos) en puntos y cuadros. Lo que
     pasa por arriba (el aro, la losa de arte y cultura), punteado.
     Grosor: un muro de 20 cm no se lee a esta escala; se dibuja de MURO (el
     mínimo que se alcanza a ver). La cámara se va a planta, norte arriba. */
  const gNolli = new THREE.Group(); gNolli.visible = false; escena.add(gNolli);
  let nolliHecho = false;
  const MURO = 0.8;
  function armaNolli() {
    if (nolliHecho) return;
    nolliHecho = true;
    const D = G.D, R = D.rect, blanco = new THREE.MeshBasicMaterial({ color: 0xeeeeea }), negro = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const piso = new Malla(); tapa(piso, rect(R.u0, R.v0, R.u1, R.v1), -0.05);
    gNolli.add(new THREE.Mesh(piso.geo(), blanco));
    const ed = new Malla(), z = 0.06;
    // los edificios del contexto (no los que caen en el predio: ahí manda el proyecto)
    D.edificios.forEach(f => {
      const pol = G.pares(f, 1), cu = pol.reduce((a, q) => a + q[0], 0) / pol.length, cv = pol.reduce((a, q) => a + q[1], 0) / pol.length;
      if (!(cu > GU.o && cu < GU.e && cv > GU.s && cv < GU.n)) tapa(ed, pol, 0.05);
    });
    // la industria: privada, llena
    if (MOD && MOD.industria) tapa(ed, G.pares(MOD.industria.planta), z);
    // muros: una banda de MURO por dentro de cada lado del polígono
    function muro(pol, t) {
      const p = ccw(pol);
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length], du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv);
        if (L < 1e-3) continue;
        const nu = -dv / L * t, nv = du / L * t;   // hacia adentro (a la izquierda, en sentido antihorario)
        ed.quad(W(a[0], a[1], z), W(b[0], b[1], z), W(b[0] + nu, b[1] + nv, z), W(a[0] + nu, a[1] + nv, z));
      }
    }
    // naves: su planta (recortada a las fachadas y por el círculo del aro)
    G.NAVES.forEach(nv => { const pol = G.menosCirculo(rect(nv.L.u0, nv.L.v0, nv.L.u1, nv.L.v1), [ANILLO.u, ANILLO.v], CORTE); if (pol) muro(pol, MURO); });
    // arte y cultura: los módulos de planta baja (núcleos, oficinas…) y el foso del auditorio
    if (CD) CD.pisa.forEach((pol, k) => muro(pol, k ? MURO : MURO * 0.7));
    // estructura: columnas del aro (Ø 0.8), de arte y cultura (Ø 0.6) y las que bajan de los módulos (□ 0.5, exageradas un poco)
    const punto = (u, v, r) => { const c = circ([u, v], r, 12); for (let k = 0; k < 12; k++) ed.tri(W(u, v, z), W(c[k][0], c[k][1], z), W(c[(k + 1) % 12][0], c[(k + 1) % 12][1], z)); };
    COLUMNAS.forEach(c => punto(c[0], c[1], 0.45));
    if (CD) CD.cols.forEach(c => punto(c[0], c[1], 0.35));
    if (PAI) PAI.columnas.forEach(c => tapa(ed, rect(c[0] - 0.25, c[1] - 0.25, c[0] + 0.25, c[1] + 0.25), z));
    gNolli.add(new THREE.Mesh(ed.geo(), negro));
    // lo de arriba, punteado: el aro (sus dos bordes) y la losa de arte y cultura; y el límite del predio
    const l = new Lineas();
    [ANILLO.ri, ANILLO.re].forEach(r => l.poli(G.aroPoli(r, 720).map(q => W(q[0], q[1], 0.08)), true));
    if (CD) l.poli(CD.losa1.map(q => W(q[0], q[1], 0.08)), true);
    const lineas = new THREE.LineSegments(l.geo(), new THREE.LineDashedMaterial({ color: 0x555555, dashSize: 1.2, gapSize: 0.9 }));
    lineas.computeLineDistances();
    gNolli.add(lineas);
    const lp = new Lineas(); lp.poli(G.PRED.map(q => W(q[0], q[1], 0.08)), true);
    gNolli.add(new THREE.LineSegments(lp.geo(), new THREE.LineBasicMaterial({ color: 0x777777 })));
  }

  /* ===== 14. Esquema compositivo =====
     Sólo lo que se levantó (vivienda, naves, industria, arte y cultura y el
     aro), reducido a geometrías: el aro es el círculo que genera todo; cada
     masa, su envolvente más simple (cada volumen de vivienda es una franja
     diagonal de dos barras escalonadas: un rectángulo a lo largo de ella con
     la azotea que baja de un extremo al otro; el prisma de las naves cortadas
     por el círculo, el de la industria y el de arte y cultura). Las dos
     franjas son paralelas: sus ejes, punteados.
     Lo que se encontró en el modelo: los centros de los dos volúmenes de
     vivienda caen sobre el aro (a ~42 y ~47 m del centro) y casi opuestos (su
     recta pasa a ~2 m del centro): ese diámetro es el eje principal, el
     acento. Las naves (oriente) contra la industria y arte y cultura
     (poniente) dan el segundo eje; todas las masas giran alrededor del
     círculo (el polígono que une sus centros). El aro lleva el chipote del
     concepto de arte y cultura: el círculo de base, punteado, y el eje del
     chipote (hacia la plaza cultural).
     Se dibuja en 2D sobre la imagen (el mismo grueso en pantalla, encima de
     todo), proyectando los puntos 3D: al orbitar se mueve con el modelo. Los
     ejes y los centros, en el plano del aro (+10.03): ahí las relaciones son
     exactas y una recta en 3D sigue siendo recta en la imagen. */
  const ESQ = (() => {
    const zc = ANILLO.z, masas = [];
    const centroide = pol => {
      let a = 0, cu = 0, cv = 0;
      for (let i = 0; i < pol.length; i++) {
        const p = pol[i], q = pol[(i + 1) % pol.length], k = p[0] * q[1] - q[0] * p[1];
        a += k; cu += (p[0] + q[0]) * k; cv += (p[1] + q[1]) * k;
      }
      return { c: [cu / (3 * a), cv / (3 * a)], area: Math.abs(a / 2) };
    };
    // vivienda: los módulos (sin los de comercio) en dos grupos (k-medias), cada uno con su caja en la retícula de los módulos
    if (MOD) {
      const COM = MOD.tipos.indexOf('comercio'), cs = MOD.cajas.filter(r => r[3] !== COM);
      let g = [cs.filter(r => r[1] < ANILLO.v), cs.filter(r => r[1] >= ANILLO.v)];
      for (let it = 0; it < 12; it++) {
        const c = g.map(x => [x.reduce((s, r) => s + r[0], 0) / x.length, x.reduce((s, r) => s + r[1], 0) / x.length]);
        g = [[], []];
        cs.forEach(r => g[Math.hypot(r[0] - c[0][0], r[1] - c[0][1]) <= Math.hypot(r[0] - c[1][0], r[1] - c[1][1]) ? 0 : 1].push(r));
      }
      // cada volumen es una franja diagonal (dos barras escalonadas) que baja
      // de un extremo al otro: un rectángulo a lo largo de la franja (su eje
      // principal) con la azotea inclinada entre la altura de cada extremo
      g.forEach(x => {
        const c = [x.reduce((s, r) => s + r[0], 0) / x.length, x.reduce((s, r) => s + r[1], 0) / x.length];
        let suu = 0, svv = 0, suv = 0;
        x.forEach(r => { const du = r[0] - c[0], dv = r[1] - c[1]; suu += du * du; svv += dv * dv; suv += du * dv; });
        const t = 0.5 * Math.atan2(2 * suv, suu - svv), ea = [Math.cos(t), Math.sin(t)], eb = [-ea[1], ea[0]];
        // esquinas de las cajas en ese marco
        const pts = [];
        x.forEach(r => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(q => {
          const u = r[0] + MEX[0] * q[0] * MOD.a / 2 + MEY[0] * q[1] * MOD.b / 2, v = r[1] + MEX[1] * q[0] * MOD.a / 2 + MEY[1] * q[1] * MOD.b / 2;
          pts.push([(u - c[0]) * ea[0] + (v - c[1]) * ea[1], (u - c[0]) * eb[0] + (v - c[1]) * eb[1], MOD.z0 + (r[2] + 1) * MOD.alto]);
        }));
        const a0 = Math.min(...pts.map(p => p[0])), a1 = Math.max(...pts.map(p => p[0])), b0 = Math.min(...pts.map(p => p[1])), b1 = Math.max(...pts.map(p => p[1]));
        // la altura de cada extremo: la más alta en su cuarto de la franja
        const alto = lado => Math.max(...pts.filter(p => lado < 0 ? p[0] < a0 + (a1 - a0) * 0.25 : p[0] > a1 - (a1 - a0) * 0.25).map(p => p[2]));
        const z0a = alto(-1), z1a = alto(1), aUV = (p, q) => [c[0] + ea[0] * p + eb[0] * q, c[1] + ea[1] * p + eb[1] * q];
        const pol = [aUV(a0, b0), aUV(a1, b0), aUV(a1, b1), aUV(a0, b1)], ztop = [z0a, z1a, z1a, z0a];
        masas.push({ n: 'vivienda', c, peso: x.length * MOD.a * MOD.b, pol, z0: MOD.z0, ztop, eje: [aUV(a0, 0), aUV(a1, 0)] });
      });
    }
    // naves (cortadas por el círculo), industria y arte y cultura
    G.NAVES.forEach(nv => {
      const pol = G.menosCirculo(rect(nv.L.u0, nv.L.v0, nv.L.u1, nv.L.v1), [ANILLO.u, ANILLO.v], CORTE);
      if (!pol) return;
      const p = pol.map(q => [q[0], q[1]]), m = centroide(ccw(p));
      masas.push({ n: 'nave', c: m.c, peso: m.area, pol: p, z0: 0, z1: 9 });
    });
    if (MOD && MOD.industria) { const p = G.pares(MOD.industria.planta), m = centroide(ccw(p)); masas.push({ n: 'industria', c: m.c, peso: m.area, pol: p, z0: MOD.industria.z0, z1: MOD.industria.z1 }); }
    if (CD) { const p = CD.losa1.map(q => [q[0], q[1]]), m = centroide(ccw(p)); masas.push({ n: 'cultura', c: m.c, peso: m.area, pol: p, z0: 0, z1: ANILLO.z - 0.35 }); }
    // los ejes: el diámetro de la vivienda; y el de las naves contra la industria + arte y cultura
    const pesa = l => { const P = l.reduce((s, m) => s + m.peso, 0); return [l.reduce((s, m) => s + m.c[0] * m.peso, 0) / P, l.reduce((s, m) => s + m.c[1] * m.peso, 0) / P]; };
    const viv = masas.filter(m => m.n === 'vivienda');
    const ejes = [];
    if (viv.length === 2) ejes.push({ a: viv[0].c, b: viv[1].c, acento: true });
    const este = masas.filter(m => m.n === 'nave'), oeste = masas.filter(m => m.n === 'industria' || m.n === 'cultura');
    if (este.length && oeste.length) ejes.push({ a: pesa(este), b: pesa(oeste) });
    // el polígono de los centros, en orden alrededor del aro
    const giro = masas.map(m => m.c).sort((p, q) => Math.atan2(p[1] - ANILLO.v, p[0] - ANILLO.u) - Math.atan2(q[1] - ANILLO.v, q[0] - ANILLO.u));
    const P3 = (u, v, z) => new THREE.Vector3(...W(u, v, z));
    return {
      masas: masas.map(m => ({ pts: m.pol.flatMap((q, i) => [P3(q[0], q[1], m.z0), P3(q[0], q[1], m.ztop ? m.ztop[i] : m.z1)]), c: P3(m.c[0], m.c[1], zc) })),
      // los ejes de las dos franjas de vivienda (paralelas)
      franjas: masas.filter(m => m.eje).map(m => m.eje.map(q => P3(q[0], q[1], zc))),
      ejes: ejes.map(e => ({ a: P3(e.a[0], e.a[1], zc), b: P3(e.b[0], e.b[1], zc), acento: e.acento })),
      orbita: giro.map(c => P3(c[0], c[1], zc)),
      circulo: G.aroPoli((ANILLO.ri + ANILLO.re) / 2, 240).map(q => P3(q[0], q[1], zc)),
      centro: P3(ANILLO.u, ANILLO.v, zc)
    };
  })();
  const vC = new THREE.Vector3();
  // a pantalla (px); null si queda detrás de la cámara
  function enPantalla(p, w, h) {
    vC.copy(p).applyMatrix4(cam.matrixWorldInverse);
    if (cam.isPerspectiveCamera && vC.z > -cam.near) return null;
    vC.applyMatrix4(cam.projectionMatrix);
    return [(vC.x + 1) / 2 * w, (1 - vC.y) / 2 * h];
  }
  function envolvente(p) {   // cadena monótona
    p = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    p.forEach(q => { while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    p.slice().reverse().forEach(q => { while (hi.length > 1 && x(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); });
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // una recta de la imagen, de borde a borde
  function recta(x, a, b, w, h) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) return;
    const k = (w + h) * 2 / L;
    x.beginPath(); x.moveTo(a[0] - dx * k, a[1] - dy * k); x.lineTo(b[0] + dx * k, b[1] + dy * k); x.stroke();
  }
  let esqLimpio = true;
  function dibujaEsquema() {
    const pr = renderer.getPixelRatio(), w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (lienzoEsq.width !== Math.round(w * pr) || lienzoEsq.height !== Math.round(h * pr)) { lienzoEsq.width = Math.round(w * pr); lienzoEsq.height = Math.round(h * pr); }
    const x = lienzoEsq.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, lienzoEsq.width, lienzoEsq.height);
    esqLimpio = !conEsquema;
    if (!conEsquema) return;
    x.setTransform(pr, 0, 0, pr, 0, 0);
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 3;   // halo: se leen también sobre el cielo claro
    const B = '#ffffff', ACENTO = '#ff3b30', S = p => enPantalla(p, w, h);
    // las masas: su envolvente en la imagen
    x.strokeStyle = B; x.lineWidth = 1.2;
    ESQ.masas.forEach(m => {
      const p = m.pts.map(S).filter(Boolean);
      if (p.length < 3) return;
      const e = envolvente(p);
      x.beginPath(); e.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); x.stroke();
    });
    // el aro: el círculo generador
    const curva = (pts, cierra) => { x.beginPath(); let ab = false; (cierra ? pts.concat([pts[0]]) : pts).forEach(p => { const q = S(p); if (!q) { ab = false; return; } if (ab) x.lineTo(q[0], q[1]); else { x.moveTo(q[0], q[1]); ab = true; } }); x.stroke(); };
    x.lineWidth = 1.4; curva(ESQ.circulo, true);
    // la órbita: el polígono de los centros de las masas
    const o = ESQ.orbita.map(S);
    if (o.every(Boolean)) { x.lineWidth = 0.9; x.setLineDash([6, 5]); x.beginPath(); o.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); x.stroke(); x.setLineDash([]); }
    // las franjas de vivienda: sus ejes, paralelos, de borde a borde
    x.lineWidth = 0.8; x.setLineDash([2, 4]);
    ESQ.franjas.forEach(f => { const a = S(f[0]), b = S(f[1]); if (a && b) recta(x, a, b, w, h); });
    x.setLineDash([]);
    // los ejes, de borde a borde (el principal, en rojo)
    ESQ.ejes.forEach(e => {
      const a = S(e.a), b = S(e.b);
      if (!a || !b) return;
      x.strokeStyle = e.acento ? ACENTO : B; x.lineWidth = e.acento ? 2 : 1;
      recta(x, a, b, w, h);
    });
    // los centros: de las masas (círculos) y el del aro (una cruz)
    x.strokeStyle = B; x.lineWidth = 1.2;
    ESQ.masas.forEach(m => { const q = S(m.c); if (q) { x.beginPath(); x.arc(q[0], q[1], 3.5, 0, Math.PI * 2); x.stroke(); } });
    const c = S(ESQ.centro);
    if (c) { x.strokeStyle = ACENTO; x.lineWidth = 1.6; x.beginPath(); x.moveTo(c[0] - 7, c[1]); x.lineTo(c[0] + 7, c[1]); x.moveTo(c[0], c[1] - 7); x.lineTo(c[0], c[1] + 7); x.stroke(); }
  }

  /* ----- capas ----- */
  const capas = { modulos: !!MOD, paisaje: !!PAI, estructura: false, sol: false, flujos: false, arboles: false, postes: false, personas: false, accesos: false, nolli: false, planta: false, corte: false, esquema: false };
  function visibles() {
    // Nolli: sólo la figura y fondo (más los accesos y las personas, si están)
    const n = capas.nolli;
    piezas.forEach(p => { p.g.visible = !n && !p.g.userData.oculto; });
    // inspeccionando algo (un apartado), los módulos se van
    gMods.forEach(g => { g.visible = !n && GENERAL && capas.modulos && !ocultos.has('vivienda'); });
    gPai.visible = gPlantas.visible = !n && capas.paisaje && !gPai.userData.oculto;
    gCol.visible = !n && capas.estructura;
    gEst.visible = !n && ESC === 'estacionamiento';
    gSol.visible = !n && capas.sol;
    gPers.visible = capas.personas;
    gAcc.visible = capas.accesos;
    gEstAcc.visible = !n && ESC === 'estacionamiento' && !ocultos.has('estacionamiento');
    gNolli.visible = n;
    // lo que se ocultó desde el menú de lo propuesto
    piezas.forEach(p => { if (ocultos.has(p.ap)) p.g.visible = false; });
    gPers.visible = capas.personas && !ocultos.has('personas');
    capaRot.classList.toggle('con-sol', capas.sol && !n);
    // sin paisaje, el predio es predio (no área verde)
    if (MATS.verde) MATS.verde.userData.papel = capas.paisaje ? 'verde' : 'predio';
    // inspeccionando cualquier cosa, el aro no se oculta
    if (conAro()) piezas.forEach(p => { if (p.ap === 'aro') p.g.visible = !n; });
    aislaVisibles();
    if (capas.corte && !enCorte) { enCorte = true; armaCorte(); enCorte = false; }   // el contorno sigue lo que se ve
  }
  let enCorte = false;
  // aislado: sólo queda lo aislado (con sus partes, ocultas o no); lo demás se quita
  function aislaVisibles() {
    if (!aisl) return;
    raizG.children.forEach(o => { o.visible = aisl.grupos.has(o); });
    aisl.partes.forEach(pt => pt.objs.forEach(o => { o.visible = !pt.oculto; }));
    [gSol, gPers, gAcc, gEstAcc, gNolli, gCorte].forEach(g => { g.visible = false; });
    capaRot.classList.remove('con-sol');
  }

  /* ===== Cámara =====
     Libre, como en Rhino: gira alrededor del punto al que mira (base.c), se
     mueve sin topes y el zoom se acerca de verdad hacia lo que está bajo el
     cursor (el punto que mira se va con él). base.h es la media altura de lo
     que se ve a la distancia de ese punto (en perspectiva da la distancia).
     El encuadre de la caja (encuadra) sólo se usa al abrir, con doble clic y
     al prender el sol. */
  const EL_MIN = 2, EL_MAX = 89, H_MIN = 1.5, H_MAX = 3000, H_INT = 3;   // H_INT: desde ahí, inspeccionando, el zoom camina
  // (la cámara arranca con la altura y el giro del tablero: el primer encuadre ya es el bueno)
  let AZ = typeof op.az === 'number' ? ((op.az % 360) + 360) % 360 : 20, EL = typeof op.el === 'number' ? Math.max(2, Math.min(89, op.el)) : 30, X = -1, ASP = 1;
  let base = { c: new THREE.Vector3(), h: 100 };
  function caja() {   // [u0, u1, v0, v1, z0, z1] de lo que se encuadra
    if (aisl) return aisl.caja;
    if (capas.nolli) return [S.u0 - 110, S.u1 + 110, S.v0 - 90, S.v1 + 90, 0, 1];
    if (capas.sol) return [CEN[0] - R_SOL, CEN[0] + R_SOL, CEN[1] - R_SOL, CEN[1] + R_SOL, 0, R_SOL];
    if (GENERAL) return [S.u0, S.u1, S.v0, S.v1, 0, MOD ? MOD.z0 + 8 * MOD.alto : 14];
    return cajaAp(ESC);
  }
  function cajaAp(ap) {
    const us = [], vs = []; let z0 = 0, z1 = 10;
    const mete = q => { us.push(q[0]); vs.push(q[1]); };
    if (ap === 'estacionamiento' && EST) { EST.bloques.forEach(b => G.pares(b.planta).forEach(mete)); z0 = -EST.sotanos * EST.entrepiso; z1 = 0; }
    else if (ap === 'comercio') { G.NAVES.forEach(nv => { mete([nv.L.u0, nv.L.v0]); mete([nv.L.u1, nv.L.v1]); }); if (MERC) MERC.naves.forEach(h => { mete([h[0], h[1]]); mete([h[2], h[3]]); }); z1 = 9; }
    else if (ap === 'industria' && MOD && MOD.industria) { G.pares(MOD.industria.planta).forEach(mete); z1 = MOD.industria.z1; }
    else if (ap === 'cultura') { [[PLAZA_C.u0, PLAZA_C.v0], [PLAZA_C.u1, PLAZA_C.v1]].forEach(mete); mete([ANILLO.u - ANILLO.re, ANILLO.v - ANILLO.re]); z1 = ANILLO.z; }
    else if (ap === 'aro') { G.aroPoli(ANILLO.re, 72).forEach(mete); z1 = ANILLO.z + 1; }
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
    camP.near = dist < 100 ? Math.max(0.05, dist * 0.01) : Math.max(1, dist * 0.05);   // de cerca casi nada se recorta (se puede estar adentro) camP.far = Math.max(dist * 20, 3000); camP.updateProjectionMatrix();
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
    if (conEsquema || !esqLimpio) dibujaEsquema();
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
  // dentro (de cerca, en perspectiva): girar es mirar alrededor desde la cámara, no orbitar
  const dentro = () => cam === camP && base.h <= H_INT + 1e-6;
  const EL_DENTRO = [-60, 85];
  function vista(x, az, el) {
    const fija = dentro() ? camP.position.clone() : null;
    if (az !== undefined) AZ = ((az % 360) + 360) % 360;
    if (el !== undefined) EL = fija ? Math.max(EL_DENTRO[0], Math.min(EL_DENTRO[1], el)) : Math.max(EL_MIN, Math.min(EL_MAX, el));
    if (fija) base.c.copy(fija).addScaledVector(direccion(), base.h / Math.tan(camP.fov / 2 * RAD));
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
    // al llegar al tope del zoom la cámara sigue de frente: lo que mira avanza con ella y se mete al interior
    if (f > 1 && base.h / f < H_INT) {
      vueloTok++;
      const paso = Math.min(1.2, Math.max(0.3, Math.log(f) * 2.5));   // (m por golpe de rueda: se camina, no se salta)
      if (base.h > H_INT) { const P = puntoEn(fx, fy); base.c.sub(P).multiplyScalar(H_INT / base.h).add(P); base.h = H_INT; }
      // hacia donde apunta el cursor (en perspectiva) o al frente
      ndc.set(fx * 2 - 1, -(fy * 2 - 1)); ray.setFromCamera(ndc, cam);
      const dir = cam === camP ? ray.ray.direction.clone() : direccion();
      base.c.addScaledVector(dir, paso);
      alOjo();
      ponCamara(); return;
    }
    const h = Math.max(H_MIN, Math.min(H_MAX, base.h / f)), k = h / base.h;
    if (k === 1) return;
    // el punto bajo el cursor se queda quieto: la cámara y lo que mira se le acercan
    const P = puntoEn(fx, fy);
    vueloTok++;   // la mano manda: se corta el vuelo
    base.c.sub(P).multiplyScalar(k).add(P);
    base.h = h;
    ponCamara();
  }
  function mueve(dfx, dfy) {
    vueloTok++;
    const d = direccion(), r = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, d).normalize();
    base.c.addScaledVector(r, -dfx * 2 * base.h * ASP).addScaledVector(u, dfy * 2 * base.h);
    ponCamara();
  }
  // dentro, la cámara no se hunde bajo el piso: el ojo queda a ≥ 1.6 m del suelo del predio
  function alOjo() {
    const camY = base.c.y - direccion().y * base.h / Math.tan(camP.fov / 2 * RAD);
    if (camY < 1.6) base.c.y += 1.6 - camY;
  }
  // caminar (WASD / Q E): adelante y de lado en horizontal, arriba en vertical; dentro, a pasos de 0.5 m
  function pasea(adelante, lado, arriba) {
    vueloTok++;
    const d = direccion(), f = new THREE.Vector3(d.x, 0, d.z).normalize(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0));
    const paso = dentro() ? 0.5 : base.h * 0.1;
    base.c.addScaledVector(f, adelante * paso).addScaledVector(r, lado * paso).addScaledVector(new THREE.Vector3(0, 1, 0), arriba * paso);
    if (dentro()) alOjo();
    ponCamara();
  }
  function reencuadra() { vuelaA(); }
  function aspecto(a) { tamano(); if (a) ASP = a; ponCamara(); }
  let ultimoMs = 0;
  function capa(nombre, si) {
    const era = capas[nombre];
    capas[nombre] = !!si;
    if (nombre === 'color') { conColor = !!si; aplicaEstilo(); return; }
    if (nombre === 'esquema') { conEsquema = !!si; aplicaEstilo(); return; }
    if (nombre === 'estructura' && !si && enEstr) { enEstr = false; aplicaEstilo(); }
    if (nombre === 'corte') {
      CORTE_Y.value = si ? CORTE_ALTO : 1e5;
      renderer.clippingPlanes = si ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), CORTE_ALTO)] : [];
      camaraSegun(); if (era !== capas.corte) vuelaA();
      visibles(); gCorte.visible = !!si; if (si) armaCorte(); pide(); return;
    }
    visibles();
    if (nombre === 'paisaje') aplicaEstilo();
    if (nombre === 'sol' && era !== capas.sol) { solea(ultimoMs || performance.now()); vuelaA(); }
    if (nombre === 'personas' && si) camina(ultimoMs || performance.now());
    if (nombre === 'nolli' && era !== capas.nolli) { if (si) armaNolli(); camaraSegun(); vuelaA(); }
    // Planta: la misma escena, vista desde arriba en ortográfica (la página pone la cámara cenital, norte arriba)
    if (nombre === 'planta' && era !== capas.planta) { camaraSegun(); vuelaA(); }
    if (ext.capa) ext.capa(nombre, !!si);
    aislaVisibles();
    pide();
  }
  // el contorno del corte: donde el plano y = CORTE_ALTO cruza cada triángulo de lo que se ve
  const gCorte = new THREE.Group(); gCorte.visible = false; escena.add(gCorte);
  function armaCorte() {
    while (gCorte.children.length) { const o = gCorte.children.pop(); o.geometry.dispose(); o.material.dispose(); }
    const h = CORTE_ALTO, y = h - 0.02, seg = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), M = new THREE.Matrix4(), P = [];
    const corta = (p, q, r) => {
      const v = [p, q, r], pts = [];
      for (let i = 0; i < 3; i++) {
        const u = v[i], w = v[(i + 1) % 3];
        if ((u.y - h) * (w.y - h) < 0) { const t = (h - u.y) / (w.y - u.y); pts.push(u.x + (w.x - u.x) * t, u.z + (w.z - u.z) * t); }
      }
      if (pts.length === 4) seg.push(pts[0], y, pts[1], pts[2], y, pts[3]);
    };
    escena.updateMatrixWorld(true);
    escena.traverse(o => {
      if (!o.isMesh || !o.material.uniforms || !o.material.uniforms.uCorte || o.geometry.isInstancedBufferGeometry) return;
      for (let p = o; p; p = p.parent) if (!p.visible || p === gCorte || p === gNolli) return;
      const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
      const n0 = o.isInstancedMesh ? o.count : 1;
      for (let k = 0; k < n0; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, M); M.premultiply(o.matrixWorld); } else M.copy(o.matrixWorld);
        for (let i = 0; i < n; i += 3) {
          const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(M); b.fromBufferAttribute(pos, i1).applyMatrix4(M); c.fromBufferAttribute(pos, i2).applyMatrix4(M);
          if (Math.min(a.y, b.y, c.y) < h && Math.max(a.y, b.y, c.y) > h) corta(a, b, c);
        }
      }
    });
    // columnas (líneas verticales que cruzan el plano): un cuadrito de 0.5 m
    gCol.traverse(o => {
      if (!o.isLineSegments) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i + 1 < pos.count; i += 2) {
        a.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, i + 1).applyMatrix4(o.matrixWorld);
        if (Math.hypot(a.x - b.x, a.z - b.z) < 0.01 && Math.min(a.y, b.y) < h && Math.max(a.y, b.y) > h) {
          const q = 0.25, s4 = [[-q, -q], [q, -q], [q, q], [-q, q]];
          for (let j = 0; j < 4; j++) { const u = s4[j], w = s4[(j + 1) % 4]; seg.push(a.x + u[0], y, a.z + u[1], a.x + w[0], y, a.z + w[1]); }
        }
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
    m.renderOrder = 6; m.frustumCulled = false; gCorte.add(m);
  }
  // la cámara se va al encuadre nuevo (sol prendido o apagado) en 0.9 s
  /* La cámara vuela al encuadre (de la caja que toque) en dur ms. El zoom va
     en escala logarítmica (parejo a la vista) y, si el centro se mueve lejos
     para lo que se ve, la cámara sube un poco a medio camino (se ve de dónde
     viene y a dónde va). Zoom o mover con la mano cortan el vuelo. */
  let vueloTok = 0;
  function vuelaA(dur) {
    const de = { c: base.c.clone(), h: base.h };
    encuadra();
    const a = { c: base.c.clone(), h: base.h }, t0 = performance.now(), tok = ++vueloTok;
    dur = dur || 900;
    const salto = Math.min(0.9, de.c.distanceTo(a.c) / (2.5 * Math.max(de.h, a.h)));
    const suave = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    base = { c: de.c.clone(), h: de.h };
    (function paso(ms) {
      if (muerto || tok !== vueloTok) return;
      const t = Math.min(1, (ms - t0) / dur), k = suave(t);
      base = { c: de.c.clone().lerp(a.c, k), h: de.h * Math.pow(a.h / de.h, k) * (1 + salto * Math.sin(Math.PI * k)) };
      ponCamara();
      if (t < 1) requestAnimationFrame(paso); else { base = a; ponCamara(); }
    })(t0);
  }
  // la cámara de otra escena (al cambiar de apartado): se arranca de ella y se vuela al encuadre
  function camara(c) {
    if (!c) return { c: base.c.toArray(), h: base.h };
    base = { c: new THREE.Vector3().fromArray(c.c), h: c.h };
    ponCamara();
    vuelaA(1300);
  }
  // Ocultar una parte de lo propuesto ('vivienda', 'comercio', 'industria',
  // 'cultura', 'aro', 'paisajismo', 'estacionamiento'); oculta(ap) sin si: ¿está oculta?
  const ocultos = new Set();
  function oculta(ap, si) {
    if (si === undefined) return ocultos.has(ap);
    if (si) ocultos.add(ap); else ocultos.delete(ap);
    visibles(); pide();
  }
  function seleccion(t) { resalta = t; espacioAct = null; aplicaEstilo(); visibles(); }
  // inspeccionar la estructura: lo demás en contorno (mostrarla nada más no cambia lo demás)
  function inspeccionaEstructura(si) { enEstr = !!si; aplicaEstilo(); visibles(); pide(); }
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
  // Separar niveles del estacionamiento: cada sótano baja 6 m más que el de arriba
  function separa(si) {
    estLineas.forEach((l, i) => { l.position.y = si ? -(i + 1) * 6 : 0; });
    estRampas.forEach((g, i) => { g.position.y = si ? -(i + 1) * 6 : 0; });
    if (ESC === 'estacionamiento') { encuadra(); ponCamara(); }
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

  /* ----- armar y desarmar: se dibuja como a mano (ver DIB_GLSL) -----
     Una animación a la vez (la nueva corta a la anterior). arma: las líneas se
     trazan y luego las caras se rellenan, en un barrido radial que empieza en
     el apartado (o de donde se viene); desarma: al revés, de lo lejano hacia
     el apartado al que se va. */
  let animTok = 0;
  function anima(dur, f, listo) {
    const tok = ++animTok;
    // con la pestaña oculta no hay cuadros (requestAnimationFrame se detiene): se termina de una vez
    if (document.hidden) { f(1); pide(); if (listo) listo(); return; }
    const t0 = performance.now();
    (function paso(ms) {
      if (muerto || tok !== animTok) return;
      const t = Math.min(1, Math.max(0, (ms - t0) / dur));
      f(t); pide();
      if (t < 1) requestAnimationFrame(paso); else if (listo) listo();
    })(t0);
  }
  // barrido: { radial, O (mundo), V } → el canal U; luego se traza (o se borra) en dur ms
  function dibuja(U, b, dur, listo, borra) {
    U.uDib.value.z = b.radial ? 1 : 0; U.uDibO.value.copy(b.O); U.uDibV.value.copy(b.V);
    const avance = a => { U.uDib.value.x = Math.min(1, a / 0.7); U.uDib.value.y = Math.max(0, Math.min(1, (a - 0.32) / 0.68)); };
    avance(borra ? 1 : 0);
    anima(dur, t => avance(borra ? 1 - t : t), () => { avance(borra ? 0 : 1); if (listo) listo(); });
  }
  // radial desde el centro de la caja k [u0, u1, v0, v1, …] hasta la esquina más lejana del bloque
  function barridoDesde(k) {
    const cu = (k[0] + k[1]) / 2, cv = (k[2] + k[3]) / 2;
    const r1 = Math.max(...[[S.u0, S.v0], [S.u1, S.v0], [S.u0, S.v1], [S.u1, S.v1]].map(q => Math.hypot(q[0] - cu, q[1] - cv)));
    return { radial: true, O: new THREE.Vector3(...W(cu, cv, 0)), V: new THREE.Vector3(Math.min(r1 * 0.12, 12), r1, 0) };
  }
  // de abajo hacia arriba (y un poco en diagonal) sobre la caja k: como se dibuja una axonometría
  function barridoSube(k) {
    const O = new THREE.Vector3(k[0] - CEN[0], k[4], -(k[3] - CEN[1])), t = new THREE.Vector3(k[1] - k[0], k[5] - k[4], k[3] - k[2]);
    const w = new THREE.Vector3(0.3, 1, 0.3);
    return { radial: false, O, V: w.multiplyScalar(1 / Math.max(1, w.dot(t))) };
  }
  function arma(desde, dur, listo) { dibuja(DIB.base, barridoDesde(desde ? cajaAp(desde) : caja()), dur || 1400, listo); }
  function desarma(ap, dur, listo) { dibuja(DIB.base, barridoDesde(ap ? cajaAp(ap) : caja()), dur || 450, listo, true); }

  /* ----- aislar un uso -----
     aisla(ap): se queda sólo ese uso (todo lo demás se quita), la cámara vuela
     a encuadrarlo y se dibuja de nuevo, de abajo hacia arriba. Sus partes
     (PARTES[ap]) se ocultan o se desplazan (despiece) por separado.
     aisla(null): todo regresa y se vuelve a dibujar desde lo que estaba aislado.
     (La página pone la axonometría: perspectiva(false).) */
  function gruposDe(ap) {
    if (ap === 'comercio' && MERCADO) return piezas.filter(p => /^mercado-|^cinta$/.test(p.g.name)).map(p => p.g);
    // la nave norte abierta: el mercado sin la nave sur (ni su planta baja, planta alta y acero) ni las columnas de la vivienda, y el aro (sin la cinta)
    if (ap === 'nave-norte' && MERCADO) return piezas.filter(p => (/^mercado-/.test(p.g.name) && !/^mercado-(pa|vivienda|sur-.*)$/.test(p.g.name)) || (p.ap === 'aro' && p.g.name !== 'cinta')).map(p => p.g);
    if (ap === 'vivienda') return gMods.slice();
    if (ap === 'paisajismo') return [gPai, gPlantas];
    if (ap === 'estacionamiento') return [gEst];
    return piezas.filter(p => p.ap === ap && !p.g.userData.oculto).map(p => p.g);
  }
  const mueve3 = pt => !!(pt.dir || pt.objs.some(o => o.userData.dir));
  // (la de la parte manda: un mismo grupo se mueve distinto en el mercado y en la nave norte abierta)
  function dirDe(pt, o) { return pt.dir || o.userData.dir || [0, 0, 0]; }
  // dónde va cada grupo de una parte: el despiece (dir · k)
  function coloca(pt, o, k) { const d = dirDe(pt, o); o.position.set(d[0] * k, d[1] * k, d[2] * k); }
  // la caja (u, v, z) de lo que se ve de lo aislado (con las partes donde estén o donde van a quedar)
  function cajaAislado(final) {
    const b = new THREE.Box3(), bb = new THREE.Box3(), guarda = [];
    if (final) aisl.partes.forEach(pt => pt.objs.forEach(o => { guarda.push([o, o.position.clone()]); coloca(pt, o, pt.desplazado ? 1 : 0); }));
    aisl.grupos.forEach(g => {
      g.updateMatrixWorld(true);
      g.traverse(o => {
        if (!o.geometry || o.geometry.isInstancedBufferGeometry || o.isInstancedMesh) return;
        for (let p = o; p && p !== raizG; p = p.parent) if (!p.visible) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        b.union(bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
      });
    });
    guarda.forEach(([o, p]) => { o.position.copy(p); o.updateMatrixWorld(true); });
    if (b.isEmpty()) return cajaAp(aisl.ap);
    return [b.min.x + CEN[0], b.max.x + CEN[0], CEN[1] - b.max.z, CEN[1] - b.min.z, b.min.y, b.max.y];
  }
  function partes() {
    return aisl ? aisl.partes.map(pt => ({ id: pt.id, nombre: pt.nombre, oculto: pt.oculto, desplazado: pt.desplazado, mueve: mueve3(pt) })) : null;
  }
  // todo a su lugar (sin despiece)
  function reiniciaPartes(ocultas) {
    aisl.partes.forEach(pt => { pt.desplazado = false; pt.k = 0; pt.oculto = ocultas ? pt.oculta : false; pt.objs.forEach(o => o.position.set(0, 0, 0)); });
  }
  function aisla(ap) {
    if (!ap) {
      if (!aisl) return null;
      const k = aisl.caja;
      reiniciaPartes(false);
      aisl = null; despTok++;
      aplicaEstilo(); visibles();
      vuelaA(1100);
      dibuja(DIB.base, barridoDesde(k), 1400);
      return null;
    }
    const grupos = gruposDe(ap);
    if (!grupos.length) return null;
    if (aisl) reiniciaPartes(false);   // (de un aislado a otro: lo movido regresa)
    aisl = { ap, grupos: new Set(grupos), partes: PARTES[ap] || [] };
    reiniciaPartes(true);
    aplicaEstilo(); visibles();
    aisl.caja = cajaAislado();
    vuelaA(1000);
    dibuja(DIB.base, barridoSube(aisl.caja), 1700);
    return partes();
  }
  /* una parte: { oculto, desplazado }; despiece(si): todas las que se mueven.
     El desplazamiento se anima (750 ms); con el despiece completo la cámara
     se abre para que quepa todo. */
  let despTok = 0;
  function despliega(encuadrar) {
    if (!aisl) return;
    const tok = ++despTok, t0 = performance.now(), de = aisl.partes.map(pt => pt.k);
    if (encuadrar) { aisl.caja = cajaAislado(true); vuelaA(800); }
    (function paso(ms) {
      if (muerto || tok !== despTok || !aisl) return;
      const t = Math.min(1, (ms - t0) / 750), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      aisl.partes.forEach((pt, i) => {
        pt.k = de[i] + ((pt.desplazado ? 1 : 0) - de[i]) * e;
        pt.objs.forEach(o => coloca(pt, o, pt.k));
      });
      pide();
      if (t < 1) requestAnimationFrame(paso);
      else if (!encuadrar) aisl.caja = cajaAislado();
    })(t0);
  }
  function ponParte(id, c) {
    const pt = aisl && aisl.partes.find(p => p.id === id);
    if (!pt) return partes();
    if (c.oculto !== undefined) { pt.oculto = !!c.oculto; visibles(); pide(); }
    if (c.desplazado !== undefined && mueve3(pt)) { pt.desplazado = !!c.desplazado; despliega(false); }
    return partes();
  }
  function despiece(si) {
    if (!aisl) return null;
    aisl.partes.forEach(pt => { if (mueve3(pt)) pt.desplazado = !!si; });
    despliega(true);
    return partes();
  }

  /* ----- la nave norte bajo el cursor -----
     ¿El rayo toca primero algo de la nave norte del mercado (userData.norte en
     él o en sus grupos)? El doble clic la abre (aisla('nave-norte')). */
  function naveNorteEn(ev) {
    if (!MERCADO || !ev || ev.clientX === undefined) return false;
    const r = lienzo.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(visiblesPicables(), false)[0];
    for (let o = hit ? hit.object : null; o; o = o.parent) if (o.userData.norte) return true;
    return false;
  }
  function destruye() {
    muerto = true;
    if (ext.destruye) ext.destruye();
    // (las geometrías de la CACHE se quedan para la próxima escena; el lienzo y el renderer, también)
    escena.traverse(o => {
      if (o.geometry && !o.geometry.userData.fija) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(m => m.dispose());
    });
    Object.values(MATS).forEach(m => m.dispose()); Object.values(ARISTAS).forEach(m => m.dispose()); Object.values(LINEAS).forEach(m => m.dispose());
    renderer.renderLists.dispose();
    capaRot.remove(); lienzoEsq.remove();
  }
  function cambiaEstilo(n) {
    if (!ESTILOS[n]) return;
    estilo = ESTILOS[n];
    aplicaEstilo();
  }
  let persp = true;
  // en planta y en el Nolli, siempre ortográfica
  function camaraSegun() { cam = capas.nolli || capas.planta || capas.corte ? camO : persp ? camP : camO; }
  function perspectiva(si) { persp = !!si; camaraSegun(); ponCamara(); }

  /* ----- extras (atlampa-3d-ctx.js) -----
     ext = EXTRAS.crea(api): lo que el motor les presta (herramientas de
     geometría, piezas, materiales, capas, cámara, el canal de dibujo del
     contexto). Devuelve, si quiere:
       capa(nombre, si)  · vista(x) (0 sitio → 1 contexto) · fluye(ms)
       preparaContexto(listo) · listo() · pinta(cam) (rótulos HTML) · destruye() */
  const ext = EXTRAS && EXTRAS.crea ? EXTRAS.crea({
    THREE, G, W, rect, circ, ccw, Malla, Lineas, tapa, muros, prisma, pieza, pon, ponLineas, material, arista, linea,
    escena, raizG, capaRot, trabajo, capas, pide, aplicaEstilo, ESTILOS, PROGRAMA, GENERAL, ESC,
    matAtlas, mallaAtlas, ARBOLES_TEX, matArbol, dib: DIB.ctx,
    // pinta un cuadro ya (para que la tarjeta de video suba lo recién armado antes de usarlo)
    calienta: () => { if (!muerto) renderer.render(escena, cam); },
    camara: () => cam, X: () => X
  }) || {} : {};

  // arranque
  tamano();
  visibles();
  aplicaEstilo();
  vista(0, AZ, EL);

  return {
    vista, solea, desarma, arma, destruye, apartadoEn, oculta, sotano, acerca, mueve, reencuadra, aspecto, capa, seleccion, espacio, inspeccionaEstructura,
    aisla, partes, ponParte, despiece, aislado: () => aisl ? aisl.ap : null, camara,
    naveNorteEn,
    depura: () => ({ escena, capas }),   // para revisar desde la consola
    preparaContexto(listo) { if (ext.preparaContexto) ext.preparaContexto(listo); else if (listo) listo(); },
    contextoListo: () => !ext.listo || ext.listo(), separa,
    fluye(ms) { if (ext.fluye) ext.fluye(ms); }, camina, precarga() {}, suelo() {},
    minimapa: G.minimapa, limitesElevacion: [EL_MIN, EL_MAX], limitesDentro: EL_DENTRO, dentro, pasea, escena: ESC, tipos: MOD ? MOD.tipos : [],
    aumento: () => 1, azimut: () => AZ, elevacion: () => EL, estilo: cambiaEstilo, perspectiva, estilos: Object.keys(ESTILOS), motor: '3d'
  };
}

window.Atlampa3D = { crea, ESTILOS, ARBOLES_TEX };   // (ARBOLES_TEX: para revisar el atlas desde la consola)

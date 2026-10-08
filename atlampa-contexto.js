/* ============================================================
   ATLAMPA — Predio y contexto (axonometría, sketch técnico)
   Estilos en atlampa.css. Lo mueve atlampa-pagina.js.
   Datos en atlampa-datos.js (window.ATLAMPA_DATOS).

   Dos bloques en la misma axonometría ortogonal (escala vertical real):
     sitio     el predio, sus calles y las banquetas de los predios
               colindantes, con las naves existentes;
     contexto  890 × 800 m alrededor: edificios, calles y vías del
               modelo Contexto.3dm.
   Todo es opaco: sólo se ve lo que no queda tapado (orden de pintado
   de lejos a cerca, recalculado cuando la cámara gira).

   Escenas (crea(svg, { escena })): 'general', el predio entero con el
   contexto bajo pedido, o un apartado ('estacionamiento', 'comercio',
   'industria', 'cultura', 'aro', 'paisajismo'), cada uno en su página: lo
   suyo con todo el detalle y lo demás del predio como referencia tenue.

   API
     vista(x, az, el)  x: 0 sitio → 1 contexto; az: azimut; el: altura de la cámara (°)
     preparaContexto(listo)  arma el contexto en tandas (antes de alejarse)
     desarma(ap, ms, listo), arma(desde, ms, listo)  la animación entre apartados:
                    las piezas se levantan y se van; las de la escena nueva caen
                    a su lugar, de abajo hacia arriba
     destruye()     quita la escena del SVG (para armar otra en el mismo)
     apartadoEn(elemento)  el apartado bajo el cursor (general)
     sotano(n), separa(si)  estacionamiento: sótano resaltado, niveles separados
     fluye(ms)      mueve los carros
     camina(ms)     mueve a las personas (capa 'personas')
     capa(n, si)    'flujos', 'arboles', 'personas', 'modulos', 'inmediato',
                    'paisaje' o 'estructura'
     suelo(si)      caras de suelo (para el futuro botón de estacionamiento)
     minimapa(svg, alGirar)  plano con la cámara; arrastrar la gira
     capa('modulos', si)  módulos visibles
     seleccion(t)   programa resaltado (módulos, tipología, comercio, nave, industria)
     espacio(e)     'publico' o 'privado'
     acerca(f, fx, fy), mueve(dx, dy), reencuadra(), aspecto(a)  zoom del usuario
     precarga()     arma los módulos de los sectores vecinos (en ratos libres)

   Módulos de vivienda (atlampa-modulos.js, de nuevos bloques.3dm): sólo el
   shell, y de él sólo lo que se ve desde el sector de la cámara; lo demás
   no entra al dibujo.

   Medidas del sitio (imagen satelital rectificada, ±1 m): fachadas del
   predio, guarniciones y fachadas de enfrente. Naves y anillo de
   Contexto.3dm (capas COMERCIO y Diag::ring); las naves se recortan a las
   fachadas del predio y el círculo del anillo las corta. La espuela se
   trazó sobre la imagen satelital.
   El modelo está girado 9.96°: u corre a lo largo de Clavel y Eulalia
   Guzmán, v a lo largo de Fresno y Sabino.
   ============================================================ */
(function () {
  'use strict';

  var D = window.ATLAMPA_DATOS;
  var U0 = D.rect.u0, U1 = D.rect.u1, V0 = D.rect.v0, V1 = D.rect.v1;

  /* ---------- Sitio (m) ---------- */
  var PB = { u0: 452.7, u1: 554.5, v0: 326.8, v1: 477.3 };      // fachadas del predio
  var GU = { o: 448.0, e: 559.5, s: 325.0, n: 488.5 };          // guarniciones del lado del predio
  var GF = { o: 437.5, e: 567.0, s: 317.5, n: 500.5 };          // guarniciones de enfrente
  var S = { u0: 435.3, u1: 568.8, v0: 311.6, v1: 507.1 };       // fachadas de enfrente: el bloque del sitio
  var HE = [401, 409];                                          // Calle Heliotropo, dentro del predio
  var CEN = [(PB.u0 + PB.u1) / 2, (PB.v0 + PB.v1) / 2];
  // Naves (Contexto.3dm, COMERCIO): crujías de 17.97 m (tres al sur, dos al
  // norte: la crujía oeste del norte no va), alero +6.00, cumbrera
  // +9.00, la cumbrera a lo largo de v. En Rhino llegan a las guarniciones; aquí
  // se recortan a las fachadas del predio.
  var NAVES = [
    { u0: 504.6, u1: 558.5, v0: 323.9, v1: 396.4, n: 3, alero: 6, cumbre: 9 },   // sur
    { u0: 522.57, u1: 558.5, v0: 415.3, v1: 487.8, n: 2, alero: 6, cumbre: 9 }   // norte: sin la crujía oeste
  ];
  // Anillo (Contexto.3dm, Diag::ring): losa anular a +9.80 sobre dos filas de
  // columnas de 0.80 m, con barandal a +0.90. Corta las naves por fuera de sus columnas.
  var ANILLO = { u: 505.75, v: 409.05, ri: 39.5, re: 46.55, z: 9.8, canto: 0.35, baranda: 0.9 };
  var CORTE = 47;
  var COLUMNAS = pares([532.1, 379.6, 539.9, 389.2, 541.9, 425.0, 469.6, 393.1, 476.3, 382.7, 485.9, 374.9, 497.4, 370.4, 509.7, 369.7,
    521.7, 372.9, 535.2, 435.4, 525.6, 443.2, 514.1, 447.7, 489.8, 445.2, 479.4, 438.5, 471.6, 428.9, 467.1, 417.4,
    536.8, 374.4, 545.9, 385.7, 548.3, 427.9, 463.2, 390.3, 471.1, 378.0, 482.4, 368.8, 495.9, 363.6, 510.5, 362.8,
    524.5, 366.5, 540.4, 440.1, 529.1, 449.3, 515.5, 454.5, 501.0, 455.3, 486.9, 451.6, 474.7, 443.7, 465.5, 432.4, 460.3, 418.9]);
  // Espuela (satélite): sale de las vías al sur, sube junto a Calle Cedro, da la
  // vuelta y entra al predio por Heliotropo, donde termina.
  var ESPUELA = [[524, 126], [423, 127], [398, 127], [382, 129], [372, 134], [358, 142], [348, 151], [339, 162], [333, 173], [330.5, 184],
    [330.5, 330], [331.5, 340], [334, 348], [338, 358], [343, 370], [350, 381], [358, 390], [368, 397], [380, 401.8], [395, 404.2],
    [410, 405], [552, 405]];
  var ESP_FIN = 552;
  // Arte y cultura (propuesta, lámina "Arte y cultura": 2 pabellones curvos de
  // 2 niveles bajo el aro, pasaje entre ambos; 2,000 m² construidos y plaza
  // cultural de 1,641 m²). Aquí la cara exterior de los pabellones va al ras del
  // borde exterior del anillo, de frente a la plaza; el anillo se apoya en sus
  // azoteas. Fondo de 12 m y ángulos (grados, alrededor del centro del anillo)
  // escogidos para no tocar módulos, Heliotropo ni la industria.
  var CULTURA = { r0: 34.55, r1: 46.55, niveles: 2, pabellones: [[98, 132.8], [140.2, 175]] };
  // Plaza cultural: la esquina noroeste del predio hasta el anillo (≈1,645 m²)
  var PLAZA_C = { u0: 452.7, u1: 500, v0: 428, v1: 477.3 };
  var FONDO = -16;
  // Estratos de las caras: ESQUEMÁTICOS. Ocultos salvo con suelo(true).
  var ESTRATOS = [['relleno', 0, -2.5], ['arcilla', -2.5, -12], ['arena', -12, FONDO]];
  var GIRO = 9.96 * Math.PI / 180;
  var NORTE = [-Math.sin(GIRO), Math.cos(GIRO)];
  var CARRO_SITIO = 170, CARRO_CTX = 110;   // metros de calle por carro

  // Módulos de vivienda (nuevos bloques.3dm, atlampa-modulos.js): cajas iguales
  // de a × b × alto, todas con el mismo giro. Sólo vienen las caras del shell, y
  // por cada sector de azimut, qué cajas se alcanzan a ver: las demás no se
  // construyen ni se pintan.
  var MOD = window.ATLAMPA_MODULOS || null;
  // Estacionamiento (atlampa-estacionamiento.js, de Sotanos y PB para HTML.dwg):
  // dos bloques independientes de sótanos y sus helicoidales dobles.
  var EST = window.ATLAMPA_ESTACIONAMIENTO || null;
  // Paisajismo y columnas de planta baja (atlampa-paisaje.js, de Paisaje
  // planta.html y PB siluetas y estructura.pdf).
  var PAI = window.ATLAMPA_PAISAJE || null;
  var MG =MOD ? MOD.giro * Math.PI / 180 : 0, MEX = [Math.cos(MG), Math.sin(MG)], MEY = [-Math.sin(MG), Math.cos(MG)];
  var LUZ = [-0.62, -0.78];   // de dónde llega la luz (u, v): los muros de ese lado van más claros
  function bits(b64, n) {
    var s = atob(b64), r = [];
    for (var i = 0; i < n; i++) if (s.charCodeAt(i >> 3) & (1 << (i & 7))) r.push(i);
    return r;
  }

  /* ---------- Cámara ----------
     Escala vertical real. Arrastrar el dibujo orbita: de lado gira el azimut,
     arriba y abajo cambia la altura de la cámara (EL, de EL_MIN a EL_MAX°).
     La escala K no cambia y el centro del contexto queda fijo. */
  var EL_MIN = 6, EL_MAX = 70, EL = 30;
  var PH = EL * Math.PI / 180, sp = Math.sin(PH), cp = Math.cos(PH);
  var ct = 1, st = 0, AZ = 20, CAM = '';
  var B = 10, W = 1000 * B, H = Math.round(W * 0.56);
  var K = (W - 60 * B) / Math.hypot(U1 - U0, V1 - V0), OX = 0, OY = 0;
  var CU = (U0 + U1) / 2, CV = (V0 + V1) / 2;
  var zoom = 1;
  function q(n) { return n * B * zoom; }
  function xl(u, v) { return u * ct - v * st; }
  function yl(u, v, z) { return -(u * st + v * ct) * sp - z * cp; }
  function X(u, v) { return xl(u, v) * K + OX; }
  function Y(u, v, z) { return yl(u, v, z) * K + OY; }
  // a un décimo de unidad: Math.round y la conversión directa a texto son
  // varias veces más rápidas que toFixed, y aquí se escriben miles por cuadro
  function n1(n) { return Math.round(n * 10) / 10 + ''; }
  function p(u, v, z) { return Math.round((xl(u, v) * K + OX) * 10) / 10 + ' ' + Math.round((yl(u, v, z) * K + OY) * 10) / 10; }
  function camara(az, el) {
    if (el !== undefined) {
      EL = Math.max(EL_MIN, Math.min(EL_MAX, el));
      PH = EL * Math.PI / 180; sp = Math.sin(PH); cp = Math.cos(PH);
    }
    AZ = ((az % 360) + 360) % 360;
    CAM = AZ + '/' + EL;   // llave de la cámara: lo pintado con otra se repinta
    var a = AZ * Math.PI / 180;
    ct = Math.cos(a); st = Math.sin(a);
    OX = W / 2 - xl(CU, CV) * K; OY = H / 2 - yl(CU, CV, 0) * K;
  }
  camara(AZ);
  function hondo(u, v) { return u * st + v * ct; }   // más grande = más lejos

  /* ---------- Datos ---------- */
  function f2(n) { return n.toFixed(2); }
  function pares(a, desde) { var r = []; for (var i = desde || 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; }
  function antihorario(poli) {
    var s = 0;
    for (var i = 0, n = poli.length; i < n; i++) { var a = poli[i], b = poli[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; }
    return s < 0 ? poli.slice().reverse() : poli;
  }
  var EDIF = D.edificios.map(function (f) { return { h: f[0], pol: antihorario(pares(f, 1)) }; });
  var ARBOLES = D.arboles || [], POSTES = D.postes || [], ECOBICI = D.ecobici || [];
  function rect(u0, v0, u1, v1) { return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; }
  function circulo(c, r, n) { var a = []; for (var i = 0; i < n; i++) { var t = i / n * 2 * Math.PI; a.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); } return a; }

  /* ---------- Geometría ---------- */
  function fuera(pts, r) {   // partes de una polilínea fuera del rectángulo r
    var tramos = [], cur = [];
    function corta() { if (cur.length > 1) tramos.push(cur); cur = []; }
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], t0 = 0, t1 = 1, ok = true;
      var P = [-dx, dx, -dy, dy], Q = [a[0] - r.u0, r.u1 - a[0], a[1] - r.v0, r.v1 - a[1]];
      for (var k = 0; k < 4; k++) {
        if (P[k] === 0) { if (Q[k] < 0) ok = false; continue; }
        var t = Q[k] / P[k];
        if (P[k] < 0) { if (t > t1) ok = false; else if (t > t0) t0 = t; } else { if (t < t0) ok = false; else if (t < t1) t1 = t; }
      }
      if (!ok || t1 - t0 < 1e-9) { if (!cur.length) cur.push(a); cur.push(b); continue; }
      if (t0 > 0) { if (!cur.length) cur.push(a); cur.push([a[0] + dx * t0, a[1] + dy * t0]); }
      corta();
      if (t1 < 1) cur = [[a[0] + dx * t1, a[1] + dy * t1], b];
    }
    corta();
    return tramos;
  }
  function camino(pts, z, abierto) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + p(pts[i][0], pts[i][1], typeof z === 'number' ? z : pts[i][2]);
    return abierto ? d : d + 'Z';
  }
  function paredes(poli, zb, zt, P) {   // paredes visibles de un prisma, de lejos a cerca
    P = P || p;
    var caras = [];
    for (var i = 0, n = poli.length; i < n; i++) {
      var a = poli[i], b = poli[(i + 1) % n];
      if ((b[1] - a[1]) * st - (b[0] - a[0]) * ct >= -1e-6) continue;   // mira hacia atrás
      caras.push([a, b, (a[0] + b[0]) * st + (a[1] + b[1]) * ct]);
    }
    caras.sort(function (m, k) { return k[2] - m[2]; });
    var d = '';
    caras.forEach(function (c) {
      var a = c[0], b = c[1];
      d += 'M' + P(a[0], a[1], zb) + 'L' + P(b[0], b[1], zb) + 'L' + P(b[0], b[1], zt) + 'L' + P(a[0], a[1], zt) + 'Z';
    });
    return d;
  }
  // Trazo de croquis: la línea se pasa un poco de sus extremos (m)
  function trazo(a, b, pasa) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = (b[2] || 0) - (a[2] || 0), L = Math.hypot(dx, dy, dz) || 1, e = pasa / L;
    return 'M' + p(a[0] - dx * e, a[1] - dy * e, (a[2] || 0) - dz * e) + 'L' + p(b[0] + dx * e, b[1] + dy * e, (b[2] || 0) + dz * e);
  }
  // ¿Una cara con normal (nx, ny, nz) mira a la cámara?
  function mira(n) { return -(n[0] * st + n[1] * ct) * cp + n[2] * sp > 1e-6; }

  /* ---------- SVG ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, at, padre) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (padre) padre.appendChild(e);
    return e;
  }
  function texto(padre, cad, clase, ancla) {
    var t = el('text', { class: 'ad-rot ' + (clase || ''), 'text-anchor': ancla || 'start' }, padre);
    t.textContent = cad;
    return t;
  }
  // Copia el contenido de un <symbol> en un <g>: dentro de <use> Chrome no
  // respeta vector-effect y los trazos engordan con la escala.
  function copia(id, clase) {
    var g = el('g', { class: clase || '' }), s = document.getElementById(id);
    for (var c = s.firstChild; c; c = c.nextSibling) g.appendChild(c.cloneNode(true));
    return g;
  }
  function lienzo(g) {   // caminos que se reusan (sin crear nodos en cada cuadro)
    var pool = [], i = 0;
    return {
      inicia: function () { i = 0; },
      path: function (d, clase) {
        var e = pool[i++];
        if (!e) { e = el('path', {}, g); pool.push(e); }
        e.setAttribute('d', d);
        if (e.getAttribute('class') !== clase) e.setAttribute('class', clase);
        e.style.display = '';
      },
      cierra: function () { for (var j = i; j < pool.length; j++) pool[j].style.display = 'none'; }
    };
  }
  var marco = null;

  /* ---------- Símbolos (se dibujan una vez y se reusan con <use>) ---------- */
  var patrones = [];
  function aleatorio(semilla) { return function () { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }; }
  function caja(c, d, ancho, ade, atr) {
    var nx = -d[1], ny = d[0], w = ancho / 2;
    return antihorario([
      [c[0] - d[0] * atr - nx * w, c[1] - d[1] * atr - ny * w],
      [c[0] + d[0] * ade - nx * w, c[1] + d[1] * ade - ny * w],
      [c[0] + d[0] * ade + nx * w, c[1] + d[1] * ade + ny * w],
      [c[0] - d[0] * atr + nx * w, c[1] - d[1] * atr + ny * w]
    ]);
  }
  function caminoL(pts, z, P) { var d = ''; for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + P(pts[i][0], pts[i][1], z); return d + 'Z'; }
  var carrosSym = [];
  function defs(svg) {
    var d = el('defs', {}, svg);
    patrones = []; carrosSym = [];   // los de una escena anterior ya no están en el SVG
    function patron(id, w, h, hijos, rot) {
      var pt = el('pattern', { id: id, width: w, height: h, patternUnits: 'userSpaceOnUse' }, d);
      hijos.forEach(function (c) { el(c[0], c[1], pt); });
      patrones.push({ el: pt, rot: rot || 0 });
    }
    patron('ad-suelo', 7, 7, [['rect', { width: 7, height: 7, class: 'ad-f-suelo' }], ['circle', { cx: 3.5, cy: 3.5, r: 0.45, class: 'ad-p-suelo' }]]);
    patron('ad-banqueta', 4, 4, [['rect', { width: 4, height: 4, class: 'ad-f-banqueta' }], ['line', { x1: 0, y1: 0, x2: 0, y2: 4, class: 'ad-h-banqueta' }]], 90);
    patron('ad-relleno', 5, 5, [['rect', { width: 5, height: 5, class: 'ad-f-relleno' }], ['line', { x1: 0, y1: 0, x2: 0, y2: 5, class: 'ad-h' }]], 45);
    patron('ad-arcilla', 9, 4, [['rect', { width: 9, height: 4, class: 'ad-f-arcilla' }], ['line', { x1: 0, y1: 1, x2: 4, y2: 1, class: 'ad-h' }], ['line', { x1: 5, y1: 3, x2: 8, y2: 3, class: 'ad-h' }]]);
    patron('ad-arena', 6, 6, [['rect', { width: 6, height: 6, class: 'ad-f-arena' }], ['circle', { cx: 1, cy: 1.5, r: 0.5, class: 'ad-p' }], ['circle', { cx: 4.2, cy: 2.8, r: 0.35, class: 'ad-p' }]]);
    patron('ad-publico', 2.2, 2.2, [['rect', { width: 2.2, height: 2.2, class: 'ad-f-publico' }], ['line', { x1: 0, y1: 0, x2: 0, y2: 2.2, class: 'ad-h-publico' }]], 45);
    patron('ad-pasto', 6, 6, [['rect', { width: 6, height: 6, class: 'ad-f-pasto' }], ['line', { x1: 1, y1: 3.4, x2: 1.4, y2: 2.5, class: 'ad-h-pasto' }],
      ['line', { x1: 1.5, y1: 3.4, x2: 1.5, y2: 2.4, class: 'ad-h-pasto' }], ['line', { x1: 4, y1: 6, x2: 4.4, y2: 5.1, class: 'ad-h-pasto' }], ['line', { x1: 4.5, y1: 6, x2: 4.5, y2: 5, class: 'ad-h-pasto' }]]);
    patron('ad-corte', 3, 3, [['rect', { width: 3, height: 3, class: 'ad-f-corte' }], ['line', { x1: 0, y1: 0, x2: 0, y2: 3, class: 'ad-h-corte' }]], 45);

    // Árboles: sólo ramas, en metros reales (base en 0, arriba = −y; a lo más 9 m,
    // abajo de la losa del anillo). Tronco, tres brazos que se abren dos veces y el
    // alcorque: un círculo en el suelo, que en esta proyección es siempre la misma
    // elipse (no se deforma al girar).
    var azar = aleatorio(11);
    [['ad-arbol-a', 9, 1.1], ['ad-arbol-b', 7.2, 1], ['ad-arbol-c', 5.4, 0.9]].forEach(function (t) {
      var s = el('symbol', { id: t[0], overflow: 'visible' }, d), H = t[1], ab = t[2], gruesa = '', fina = '';
      var tope = -H * 0.36, lado = (azar() - 0.5) * 0.3;
      gruesa += 'M0 0L' + f2(lado) + ' ' + f2(tope);
      function rama(x, y, ang, largo, nivel) {
        var x2 = x + Math.sin(ang) * largo, y2 = y - Math.cos(ang) * largo, seg = 'M' + f2(x) + ' ' + f2(y) + 'L' + f2(x2) + ' ' + f2(y2);
        if (nivel === 2) gruesa += seg; else fina += seg;
        if (!nivel) return;
        var abre = (0.32 + azar() * 0.22) * ab;
        rama(x2, y2, ang - abre, largo * (0.62 + azar() * 0.12), nivel - 1);
        rama(x2, y2, ang + abre, largo * (0.62 + azar() * 0.12), nivel - 1);
        if (nivel === 2 && azar() < 0.5) rama(x2, y2, ang + (azar() - 0.5) * 0.3, largo * 0.55, 0);
      }
      [-0.62, -0.08, 0.55].forEach(function (a) { rama(lado, tope, (a + (azar() - 0.5) * 0.2) * ab, H * (0.26 + azar() * 0.06), 2); });
      el('path', { class: 'ad-arbol-base', d: 'M-0.7 0A0.7 0.35 0 1 0 0.7 0A0.7 0.35 0 1 0 -0.7 0Z' }, s);
      el('path', { class: 'ad-arbol-rama', d: fina }, s);
      el('path', { class: 'ad-arbol-tronco', d: gruesa }, s);
    });
    // Poste de luz (como el de la referencia): fuste, brazo y luminaria. 8 m.
    [['ad-poste-i', -1], ['ad-poste-d', 1]].forEach(function (t) {
      var s = el('symbol', { id: t[0], overflow: 'visible' }, d), b = t[1];
      el('path', { class: 'ad-poste', d: 'M0 0V-8M0 -7.6H' + (1.6 * b) + 'M-0.5 -7.6H0M-0.35 0H0.35' }, s);
      el('circle', { class: 'ad-poste-luz', cx: 1.6 * b, cy: -7.6, r: 0.28 }, s);
    });
    // Ecobici: un punto con una bicicleta de croquis encima (≈ 1.8 m)
    var sb = el('symbol', { id: 'ad-bici', overflow: 'visible' }, d);
    el('circle', { class: 'ad-bici-punto', cx: 0, cy: 0, r: 0.9 }, sb);
    el('path', { class: 'ad-bici', d: 'M-1.6 -1.9A0.55 0.55 0 1 0 -1.6 -0.8A0.55 0.55 0 1 0 -1.6 -1.9Z' +
      'M1.6 -1.9A0.55 0.55 0 1 0 1.6 -0.8A0.55 0.55 0 1 0 1.6 -1.9Z' +
      'M-1.6 -1.35L-0.6 -2.3L0.9 -2.3L1.6 -1.35M-0.6 -2.3L0.1 -1.35L0.9 -2.3M-0.75 -2.6H-0.35M0.9 -2.3L0.8 -2.75H1.2M0 -1.35V0' }, sb);
    // Carros: un símbolo por dirección (16), ya proyectado; se rehacen al girar.
    for (var i = 0; i < 16; i++) {
      var s = el('symbol', { id: 'ad-carro-' + i, overflow: 'visible' }, d);
      carrosSym.push([el('path', { class: 'ad-carro' }, s), el('path', { class: 'ad-carro ad-carro--cabina' }, s)]);
    }
    return d;
  }
  function rehaceCarros() {
    var pl = function (u, v, z) { return xl(u, v).toFixed(2) + ' ' + yl(u, v, z).toFixed(2); };
    carrosSym.forEach(function (c, i) {
      var a = i / 16 * 2 * Math.PI, dir = [Math.cos(a), Math.sin(a)];
      var cuerpo = caja([0, 0], dir, 1.8, 2.2, 2.2), cabina = caja([0, 0], dir, 1.5, 0.7, 1.3);
      c[0].setAttribute('d', paredes(cuerpo, 0.3, 1.0, pl) + caminoL(cuerpo, 1.0, pl));
      c[1].setAttribute('d', paredes(cabina, 1.0, 1.45, pl) + caminoL(cabina, 1.45, pl));
    });
  }
  function escalaPatrones() {
    patrones.forEach(function (pt) {
      pt.el.setAttribute('patternTransform', (pt.rot ? 'rotate(' + pt.rot + ') ' : '') + 'scale(' + (B * zoom).toFixed(4) + ')');
    });
  }

  /* ---------- Flujos ----------
     Sitio: carriles al centro de cada arroyo, con el sentido de OSM (y de
     las flechas de la planta baja escaneada). Contexto: ejes de OSM. */
  var cf = (GU.o + GF.o) / 2, cs = (GU.e + GF.e) / 2, cc = (GU.s + GF.s) / 2, ce = (GU.n + GF.n) / 2;
  var VH = (HE[0] + HE[1]) / 2;
  var TRAMOS_SITIO = [
    [[[cf, S.v0], [cf, VH]], [1.8], 0],               // Fresno al sur de Heliotropo: sin sentido en OSM, doble
    [[[cf, VH], [cf, S.v1]], [0], 1],                 // Fresno al norte: hacia el norte
    [[[cs, S.v1], [cs, S.v0]], [0], 1],               // Sabino: hacia el sur
    [[[S.u0, cc], [S.u1, cc]], [1.6], 0],             // Clavel: doble sentido
    [[[S.u1, ce], [S.u0, ce]], [-3.6, 0, 3.6], 1]     // Eulalia Guzmán: hacia el poniente, 3 carriles
  ];
  var CARRILES = [];
  function carril(pts, off, dir, ctx, semilla) {
    var acc = [0];
    for (var j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    var L = acc[acc.length - 1];
    if (L < 12) return;
    var n = Math.max(1, Math.round(L / (ctx ? CARRO_CTX : CARRO_SITIO))), autos = [];
    for (var a = 0; a < n; a++) {
      var r = Math.sin(semilla * 12.9898 + (a + 1) * 78.233) * 43758.5453;
      r -= Math.floor(r);
      autos.push({ s0: (a + 0.4 * r) * L / n, vel: 6 + 4 * r, el: null, i: -1 });
    }
    CARRILES.push({ p: pts, acc: acc, L: L, dir: dir, off: off, autos: autos, ctx: ctx });
  }
  TRAMOS_SITIO.forEach(function (t, i) {
    t[1].forEach(function (o, k) {
      carril(t[0], o, 1, false, i * 7 + k + 1);
      if (!t[2]) carril(t[0], o, -1, false, i * 7 + k + 4);
    });
  });
  var MARGEN = { u0: S.u0 - 4, u1: S.u1 + 4, v0: S.v0 - 4, v1: S.v1 + 4 };
  D.flujos.forEach(function (f, i) {
    fuera(pares(f[2]), MARGEN).forEach(function (t, k) {
      if (f[1]) carril(t, 0, 1, true, 100 + i * 5 + k);
      else { carril(t, 2.4, 1, true, 100 + i * 5 + k); carril(t, 2.4, -1, true, 200 + i * 5 + k); }
    });
  });
  function enCarril(c, s) {
    var acc = c.acc, L = c.L;
    s = ((s % L) + L) % L;
    if (c.dir < 0) s = L - s;
    var j = 1;
    while (j < acc.length - 1 && acc[j] < s) j++;
    var a = c.p[j - 1], b = c.p[j], t = (s - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1);
    var dx = (b[0] - a[0]) * c.dir, dy = (b[1] - a[1]) * c.dir, l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    return [a[0] + (b[0] - a[0]) * t + dy * c.off, a[1] + (b[1] - a[1]) * t - dx * c.off, dx, dy];
  }

  /* ---------- Naves cortadas por el anillo ----------
     Cada nave se parte en piezas chicas (una crujía × ≈7 m). Cada pieza
     lleva sus dos faldones, los muros que dan afuera y, donde la toca el
     círculo del anillo, una cara de corte. Las piezas entran sueltas al
     orden de pintado: así las columnas del anillo, dentro del corte, quedan
     tapadas sólo por lo que de verdad tienen delante. */
  var CA = [ANILLO.u, ANILLO.v];
  function menosCirculo(poli, c, r) {   // polígono menos el disco; [u, v, 1] = punto sobre el círculo
    function fuera(q) { return Math.hypot(q[0] - c[0], q[1] - c[1]) >= r; }
    function cruce(a, b, sale) {
      var dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - c[0], fy = a[1] - c[1];
      var A = dx * dx + dy * dy, Bq = 2 * (fx * dx + fy * dy), raiz = Math.sqrt(Math.max(0, Bq * Bq - 4 * A * (fx * fx + fy * fy - r * r)));
      var t = sale ? (-Bq - raiz) / (2 * A) : (-Bq + raiz) / (2 * A);
      return [a[0] + dx * t, a[1] + dy * t, 1];
    }
    var n = poli.length, k0 = -1, out = [], x = null;
    for (var i = 0; i < n; i++) if (fuera(poli[i])) { k0 = i; break; }
    if (k0 < 0) return null;
    for (var s = 0; s < n; s++) {
      var a = poli[(k0 + s) % n], b = poli[(k0 + s + 1) % n], ia = fuera(a), ib = fuera(b);
      if (ia) out.push(a);
      if (ia && !ib) { x = cruce(a, b, true); out.push(x); }
      else if (!ia && ib) {
        var e = cruce(a, b, false), t0 = Math.atan2(x[1] - c[1], x[0] - c[0]), t1 = Math.atan2(e[1] - c[1], e[0] - c[0]);
        var dt = ((t1 - t0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI, m = Math.ceil(Math.abs(dt) / 0.05);
        for (var j = 1; j < m; j++) out.push([c[0] + Math.cos(t0 + dt * j / m) * r, c[1] + Math.sin(t0 + dt * j / m) * r, 1]);
        out.push(e);
      }
    }
    return out.length > 2 ? out : null;
  }
  function cortaU(poli, u, izq) {   // la parte del polígono a un lado de la recta u = cte
    var out = [];
    for (var i = 0, n = poli.length; i < n; i++) {
      var a = poli[i], b = poli[(i + 1) % n], ia = izq ? a[0] <= u + 1e-9 : a[0] >= u - 1e-9, ib = izq ? b[0] <= u + 1e-9 : b[0] >= u - 1e-9;
      if (ia) out.push(a);
      if (ia !== ib) out.push([u, a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]), a[2] && b[2] ? 1 : 0]);
    }
    return out.length > 2 ? out : null;
  }
  function cruza(poli, eje, val) {   // dónde corta la recta (eje = val) al polígono, ordenado
    var r = [];
    for (var i = 0, n = poli.length; i < n; i++) {
      var a = poli[i], b = poli[(i + 1) % n];
      if ((a[eje] - val) * (b[eje] - val) < 0) r.push(a[1 - eje] + (b[1 - eje] - a[1 - eje]) * (val - a[eje]) / (b[eje] - a[eje]));
    }
    return r.sort(function (m, k) { return m - k; });
  }
  var PIEZAS = [];
  NAVES.forEach(function (nv) {
    var w = (nv.u1 - nv.u0) / nv.n, run = w / 2;
    var L = { u0: Math.max(nv.u0, PB.u0), u1: Math.min(nv.u1, PB.u1), v0: Math.max(nv.v0, PB.v0), v1: Math.min(nv.v1, PB.v1) };
    nv.L = L;
    var nV = Math.ceil((L.v1 - L.v0) / 7), dv = (L.v1 - L.v0) / nV;
    for (var j = 0; j < nv.n; j++) {
      var ua = nv.u0 + j * w, um = ua + run, ub = ua + w, a0 = Math.max(ua, L.u0), a1 = Math.min(ub, L.u1);
      if (a1 - a0 < 0.05) continue;
      var conCumbre = um > a0 && um < a1;
      var caja = function (e0, e1) {
        var r = [[a0, e0]];
        if (conCumbre) r.push([um, e0]);
        r.push([a1, e0], [a1, e1]);
        if (conCumbre) r.push([um, e1]);
        r.push([a0, e1]);
        return menosCirculo(r, CA, CORTE);
      };
      for (var k = 0; k < nV; k++) {
        var va = L.v0 + k * dv, vb = va + dv, pol = caja(va, vb);
        if (!pol) continue;
        // los faldones se pasan 15 cm sobre la pieza vecina: sin costuras al pintar
        PIEZAS.push({ nv: nv, L: L, um: um, run: run, valles: [j ? ua : NaN, j < nv.n - 1 ? ub : NaN], pol: pol,
          techo: caja(k ? va - 0.15 : va, k < nV - 1 ? vb + 0.15 : vb) });
      }
    }
  });

  /* ---------- Paisajismo ----------
     Todo en el piso salvo las plantas. Cada planta es un solo trazo vertical
     (un poco ladeado) para poder poner miles: las altas (> 1.1 m) de 1.15 a
     1.95 m, las bajas (< 0.9 m) de 0.35 a 0.85 m. Se reparten al azar (con
     semilla) sobre las franjas de la planta de paisajismo y se juntan en
     cuadros de 14 m que entran al orden de pintado como una pieza cada uno.
     Lo que cae dentro de un edificio (naves, industria, chimenea,
     pabellones) no se dibuja. La laguna no copia el círculo de la planta: su
     orilla es una curva suave hecha con unas cuantas ondas. */
  function dentro(u, v, pol) {
    var c = false;
    for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      var a = pol[i], b = pol[j];
      if ((a[1] > v) !== (b[1] > v) && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function enEdificio(u, v) {
    for (var i = 0; i < NAVES.length; i++) {
      var L = NAVES[i].L;
      if (L && u > L.u0 && u < L.u1 && v > L.v0 && v < L.v1 && Math.hypot(u - ANILLO.u, v - ANILLO.v) > CORTE) return true;
    }
    if (MOD && MOD.industria && dentro(u, v, pares(MOD.industria.planta))) return true;
    if (MOD && MOD.chimenea) { var c = MOD.chimenea.base; if (u > c[0] && u < c[2] && v > c[1] && v < c[3]) return true; }
    var r = Math.hypot(u - ANILLO.u, v - ANILLO.v), a = (Math.atan2(v - ANILLO.v, u - ANILLO.u) * 180 / Math.PI + 360) % 360;
    return r > CULTURA.r0 && r < CULTURA.r1 && CULTURA.pabellones.some(function (p) { return a > p[0] && a < p[1]; });
  }
  // la orilla de la laguna: radio a cada ángulo (k escala la forma)
  function orilla(t) {
    return 1 + 0.14 * Math.sin(2 * t + 0.7) + 0.08 * Math.sin(3 * t + 2.2) + 0.045 * Math.sin(5 * t + 0.4) + 0.02 * Math.sin(8 * t + 1.3);
  }
  function laguna(k, corre) {   // polígono de la orilla escalada; corre: hacia dónde se carga lo hondo
    var L = PAI.laguna, pts = [];
    for (var i = 0; i < 72; i++) {
      var t = i / 72 * 2 * Math.PI, r = L.r * k * orilla(t);
      pts.push([L.c[0] + (corre ? corre[0] * (1 - k) : 0) + Math.cos(t) * r, L.c[1] + (corre ? corre[1] * (1 - k) : 0) + Math.sin(t) * r]);
    }
    return pts;
  }
  /* ---------- Vegetación ----------
     Todo lo que no tiene desplante es área verde (un plano con pasto, ver
     crea). Encima, dos niveles de vegetación:
       · genérico: uno que otro árbol suelto en el área verde, nunca bajo los
         módulos, el aro, un edificio, el agua, los senderos o la plaza.
       · el proyecto de paisaje (las manchas de tezontle y franjas de la planta
         del amigo): una propuesta de plantación completa. En las franjas altas,
         arbustos, pastos altos y flores; en las bajas, pastos en macollo,
         flores y arbustos bajos; agaves en el tezontle; juncos en los filtros
         (humedales); y árboles de acento en las manchas grandes.
     Cada planta es un glifo de pocos trazos dibujado en pantalla desde su base
     (no un modelo): así caben miles. Van en cuadros de 14 m (una pieza del
     orden de pintado cada uno); en la general, una de cada tres. */
  var TESELA = 14, PLANTAS = {}, ARBOLES_P = null;
  function enRect(u, v, r, m) { return u > r[0] - m && u < r[2] + m && v > r[1] - m && v < r[3] + m; }
  function caja2(a) {   // [u0, v0, u1, v1] de una lista plana u, v, u, v…
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < a.length; i += 2) { b[0] = Math.min(b[0], a[i]); b[1] = Math.min(b[1], a[i + 1]); b[2] = Math.max(b[2], a[i]); b[3] = Math.max(b[3], a[i + 1]); }
    return b;
  }
  function area2(a) { var s = 0, n = a.length / 2; for (var i = 0; i < n; i++) { var j = (i + 1) % n; s += a[2 * i] * a[2 * j + 1] - a[2 * j] * a[2 * i + 1]; } return Math.abs(s) / 2; }
  function aSegmento(u, v, a, b) {   // distancia de (u, v) al segmento a-b
    var du = b[0] - a[0], dv = b[1] - a[1], L = du * du + dv * dv, t = L ? Math.max(0, Math.min(1, ((u - a[0]) * du + (v - a[1]) * dv) / L)) : 0;
    return Math.hypot(u - a[0] - du * t, v - a[1] - dv * t);
  }
  // bajo algún módulo (su huella en planta, con un margen)
  var HUELLAS = null;
  function bajoModulo(u, v, m) {
    if (!MOD) return false;
    if (!HUELLAS) { HUELLAS = {}; MOD.cajas.forEach(function (r) { HUELLAS[r[0] + ',' + r[1]] = [r[0], r[1]]; }); HUELLAS = Object.keys(HUELLAS).map(function (k) { return HUELLAS[k]; }); }
    var A = MOD.a / 2 + m, Bm = MOD.b / 2 + m;
    for (var i = 0; i < HUELLAS.length; i++) {
      var du = u - HUELLAS[i][0], dv = v - HUELLAS[i][1];
      if (Math.abs(du * MEX[0] + dv * MEX[1]) < A && Math.abs(du * MEY[0] + dv * MEY[1]) < Bm) return true;
    }
    return false;
  }
  // ¿cabe un árbol de copa r en (u, v)? (para los sueltos y los de acento)
  function cabeArbol(u, v, r) {
    var ra = Math.hypot(u - ANILLO.u, v - ANILLO.v);
    if (ra > ANILLO.ri - 3 - r && ra < ANILLO.re + 2 + r) return false;            // bajo el aro
    if (enEdificio(u, v) || enEdificio(u + r, v) || enEdificio(u - r, v) || enEdificio(u, v + r) || enEdificio(u, v - r)) return false;
    if (bajoModulo(u, v, r)) return false;
    if (EST && EST.rampas.some(function (q) { return Math.hypot(u - q.c[0], v - q.c[1]) < q.r[1] + 2; })) return false;
    var L = PAI.laguna;
    if (Math.hypot(u - L.c[0], v - L.c[1]) < L.r * 1.3 + r + 1) return false;
    return true;
  }
  function plantasDe(det) {
    if (PLANTAS[det]) return PLANTAS[det];
    var azar = aleatorio(1191), cuadros = {}, lista = [], raro = det > 1 ? 1 : 3;
    function cuadro(u, v) {
      var k = Math.floor(u / TESELA) + ',' + Math.floor(v / TESELA), c = cuadros[k];
      if (!c) { c = cuadros[k] = { u: 0, v: 0, n: 0, pasto: [], arbusto: [], flor: [], junco: [], agave: [] }; lista.push(c); }
      return c;
    }
    // tipo: pasto [u, v, alto, abre] · arbusto [u, v, radio, alto] · flor y
    // junco [u, v, alto, ladeo u, ladeo v, color] · agave [u, v, radio]
    function mete(tipo, u, v, a, b, c2, d2) {
      if (enEdificio(u, v)) return;
      var c = cuadro(u, v);
      c[tipo].push(u, v, a, b);
      if (tipo === 'flor' || tipo === 'junco') c[tipo].push(c2, d2, Math.floor(azar() * 3));
      c.u += u; c.v += v; c.n++;
    }
    function ladeo(h) { return (azar() - 0.5) * 0.35 * h; }
    PAI.plantas.forEach(function (f) {
      var du = f[2] - f[0], dv = f[3] - f[1], L = Math.hypot(du, dv) || 1, nu = -dv / L, nv = du / L, alta = f[5];
      var n = Math.round(L * f[4] / (alta ? 1.6 : 0.8) / raro);
      for (var i = 0; i < n; i++) {
        var s = azar(), o = (azar() - 0.5) * f[4], u = f[0] + du * s + nu * o, v = f[1] + dv * s + nv * o, t = azar(), h;
        if (alta) {
          if (t < 0.45) mete('arbusto', u, v, 0.45 + azar() * 0.45, 0.8 + azar() * 0.8);
          else if (t < 0.85) mete('pasto', u, v, 1.0 + azar() * 0.7, 0.25 + azar() * 0.2);
          else { h = 0.9 + azar() * 0.45; mete('flor', u, v, h, 0, ladeo(h), ladeo(h)); }
        } else {
          if (t < 0.55) mete('pasto', u, v, 0.3 + azar() * 0.4, 0.3 + azar() * 0.25);
          else if (t < 0.85) { h = 0.25 + azar() * 0.35; mete('flor', u, v, h, 0, ladeo(h), ladeo(h)); }
          else mete('arbusto', u, v, 0.3 + azar() * 0.2, 0.35 + azar() * 0.25);
        }
      }
    });
    // agaves sobre el tezontle
    PAI.tezontle.forEach(function (t) {
      var b = caja2(t), pol = pares(t), n = Math.round(area2(t) / 14 / raro);
      for (var i = 0, k = 0; i < n && k < n * 6; k++) {
        var u = b[0] + azar() * (b[2] - b[0]), v = b[1] + azar() * (b[3] - b[1]);
        if (dentro(u, v, pol)) { mete('agave', u, v, 0.35 + azar() * 0.3, 0); i++; }
      }
    });
    // juncos en los filtros vegetados (humedales)
    PAI.filtros.forEach(function (f) {
      var b = caja2(f), pol = pares(f), n = Math.round((b[2] - b[0]) * (b[3] - b[1]) / 0.6 / raro);
      for (var i = 0; i < n; i++) {
        var u = b[0] + azar() * (b[2] - b[0]), v = b[1] + azar() * (b[3] - b[1]), h = 0.7 + azar() * 0.9;
        if (dentro(u, v, pol)) mete('junco', u, v, h, 0, ladeo(h) * 0.6, ladeo(h) * 0.6);
      }
    });
    lista.forEach(function (c) { c.u /= c.n; c.v /= c.n; });
    return (PLANTAS[det] = lista);
  }
  // Árboles del paisaje: [u, v, alto, radio de copa, de acento]
  function arbolesPai() {
    if (ARBOLES_P) return ARBOLES_P;
    var azar = aleatorio(4242), lista = [], ext = [];
    PAI.tezontle.forEach(function (t) { ext.push(caja2(t)); });
    PAI.filtros.forEach(function (t) { ext.push(caja2(t)); });
    PAI.estanques.forEach(function (t) { ext.push(caja2(t)); });
    // de acento: en las manchas de tezontle grandes, uno por cada ~90 m²
    PAI.tezontle.forEach(function (t) {
      var b = caja2(t), pol = pares(t), n = Math.floor(area2(t) / 90);
      for (var i = 0, k = 0; i < n && k < 60; k++) {
        var u = b[0] + azar() * (b[2] - b[0]), v = b[1] + azar() * (b[3] - b[1]), r = 1.6 + azar() * 0.8;
        if (!dentro(u, v, pol) || !cabeArbol(u, v, r) || lista.some(function (a) { return Math.hypot(a[0] - u, a[1] - v) < 6; })) continue;
        lista.push([u, v, 4 + azar() * 1.8, r, 1]); i++;
      }
    });
    // sueltos en el área verde: muestreo con distancia mínima (uno que otro)
    var sende = PAI.senderos.map(function (sd) { return pares(sd); });
    for (var k = 0; k < 5000 && lista.length < 90; k++) {
      var u = PB.u0 + 3 + azar() * (PB.u1 - PB.u0 - 6), v = PB.v0 + 3 + azar() * (PB.v1 - PB.v0 - 6), r = 2.2 + azar() * 1.2;
      if (v > HE[0] - 2 - r && v < HE[1] + 2 + r) continue;                                   // Heliotropo
      if (enRect(u, v, [PLAZA_C.u0, PLAZA_C.v0, PLAZA_C.u1, PLAZA_C.v1], 1)) continue;          // plaza
      if (ext.some(function (b) { return enRect(u, v, b, r * 0.6 + 1); })) continue;            // manchas, filtros, agua
      if (enRect(u, v, PAI.jardines, 0)) continue;
      if (sende.some(function (l) { for (var i = 1; i < l.length; i++) if (aSegmento(u, v, l[i - 1], l[i]) < r * 0.6 + 1.2) return true; return false; })) continue;
      if (!cabeArbol(u, v, r)) continue;
      if (lista.some(function (a) { return Math.hypot(a[0] - u, a[1] - v) < (a[4] ? 8 : 12); })) continue;
      lista.push([u, v, 6 + azar() * 2.4, r, 0]);
    }
    return (ARBOLES_P = lista);
  }

  /* ---------- Sol ----------
     Posición del sol en Atlampa (19.458° N, 99.159° O, hora del centro,
     UTC−6 sin horario de verano) con las fórmulas de siempre: declinación,
     ecuación del tiempo y ángulo horario. Da la altura y el azimut (desde el
     norte, a favor del reloj), en grados. */
  var LAT = 19.4582, LON = -99.1589, HUSO = -6, RAD = Math.PI / 180;
  function diaDelAno(f) { return Math.round((Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) - Date.UTC(f.getFullYear(), 0, 0)) / 864e5); }
  function solEn(dia, hora) {
    var g = 2 * Math.PI / 365 * (dia - 1 + (hora - 12) / 24);
    var ec = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var de = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var solar = hora * 60 + ec + 4 * LON - 60 * HUSO, H = (solar / 4 - 180) * RAD, fi = LAT * RAD;
    var cz = Math.sin(fi) * Math.sin(de) + Math.cos(fi) * Math.cos(de) * Math.cos(H), alt = Math.asin(Math.max(-1, Math.min(1, cz)));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(fi) - Math.tan(de) * Math.cos(fi)) / RAD + 180;
    return { alt: alt / RAD, az: (az + 360) % 360 };
  }

  /* ---------- Minimapa ----------
     Planta del sitio con el norte arriba, la cámara como un punto y su
     ángulo de vista. Sólo indica: la cámara se gira arrastrando el dibujo. */
  function minimapa(m) {
    var T = 120, C = T / 2, ESC = 0.62, R = 50;
    m.setAttribute('viewBox', '0 0 ' + T + ' ' + T);
    var cg = Math.cos(GIRO), sg = Math.sin(GIRO);
    function aMini(u, v) {   // modelo → minimapa (norte arriba)
      var du = u - CEN[0], dv = v - CEN[1], gx = du * cg + dv * sg, gy = -du * sg + dv * cg;
      return [C + gx * ESC, C - gy * ESC];
    }
    function poli(pts, clase) { el('path', { class: clase, d: pts.map(function (r, i) { var a = aMini(r[0], r[1]); return (i ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1); }).join('') + 'Z' }, m); }
    el('circle', { class: 'ad-mini-orbita', cx: C, cy: C, r: R }, m);
    poli(rect(S.u0, S.v0, S.u1, S.v1), 'ad-mini-bloque');
    poli(rect(PB.u0, PB.v0, PB.u1, PB.v1), 'ad-mini-predio');
    NAVES.forEach(function (nv) { poli(rect(nv.L.u0, nv.L.v0, nv.L.u1, nv.L.v1), 'ad-mini-nave'); });
    // la huella de los módulos (una vez por columna)
    if (MOD) {
      var huella = {}, dm = '', A = MOD.a / 2, Bm = MOD.b / 2;
      MOD.cajas.forEach(function (r) {
        var llave = r[0] + ',' + r[1];
        if (huella[llave]) return;
        huella[llave] = 1;
        [[-A, -Bm], [A, -Bm], [A, Bm], [-A, Bm]].forEach(function (e, i) {
          var q = aMini(r[0] + MEX[0] * e[0] + MEY[0] * e[1], r[1] + MEX[1] * e[0] + MEY[1] * e[1]);
          dm += (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
        });
        dm += 'Z';
      });
      el('path', { class: 'ad-mini-modulo', d: dm }, m);
    }
    // los pabellones de arte y cultura
    var dcu = '';
    CULTURA.pabellones.forEach(function (pb) {
      var pts = [];
      for (var i = 0; i <= 12; i++) { var t = (pb[0] + (pb[1] - pb[0]) * i / 12) * Math.PI / 180; pts.push(aMini(ANILLO.u + Math.cos(t) * CULTURA.r1, ANILLO.v + Math.sin(t) * CULTURA.r1)); }
      for (i = 12; i >= 0; i--) { t = (pb[0] + (pb[1] - pb[0]) * i / 12) * Math.PI / 180; pts.push(aMini(ANILLO.u + Math.cos(t) * CULTURA.r0, ANILLO.v + Math.sin(t) * CULTURA.r0)); }
      dcu += 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z';
    });
    el('path', { class: 'ad-mini-cultura', d: dcu }, m);
    // el corte del anillo y su losa
    var ca = aMini(ANILLO.u, ANILLO.v);
    el('circle', { class: 'ad-mini-corte', cx: ca[0].toFixed(1), cy: ca[1].toFixed(1), r: (CORTE * ESC).toFixed(1) }, m);
    el('circle', { class: 'ad-mini-anillo', cx: ca[0].toFixed(1), cy: ca[1].toFixed(1), r: ((ANILLO.ri + ANILLO.re) / 2 * ESC).toFixed(1), 'stroke-width': ((ANILLO.re - ANILLO.ri) * ESC).toFixed(1) }, m);
    var cono = el('path', { class: 'ad-mini-cono' }, m), meta = el('circle', { class: 'ad-mini-meta', r: 4.5 }, m), punto = el('circle', { class: 'ad-mini-camara', r: 4.5 }, m);
    el('path', { class: 'ad-mini-n', d: 'M' + C + ' 4L' + (C - 3) + ' 10M' + C + ' 4L' + (C + 3) + ' 10' }, m);
    var tn = el('text', { class: 'ad-mini-texto', x: C, y: 17, 'text-anchor': 'middle' }, m); tn.textContent = 'N';
    function enOrbita(az) {
      var a = az * Math.PI / 180, cu = -Math.sin(a), cv = -Math.cos(a);   // la cámara mira hacia (sin, cos)
      return [C + (cu * cg + cv * sg) * R, C - (-cu * sg + cv * cg) * R];
    }
    // az: dónde está la cámara; hacia: a dónde va (el punto hueco, mientras gira)
    function pon(az, hacia) {
      var e = enOrbita(az), px = e[0], py = e[1];
      punto.setAttribute('cx', px.toFixed(1)); punto.setAttribute('cy', py.toFixed(1));
      var va = hacia !== undefined && Math.abs(hacia - az) > 0.5, h = enOrbita(va ? hacia : az);
      meta.setAttribute('cx', h[0].toFixed(1)); meta.setAttribute('cy', h[1].toFixed(1));
      meta.style.display = va ? '' : 'none';
      var ang = Math.atan2(C - py, C - px), ab = 0.32, L = R * 0.9;
      cono.setAttribute('d', 'M' + px.toFixed(1) + ' ' + py.toFixed(1) + 'L' + (px + Math.cos(ang - ab) * L).toFixed(1) + ' ' + (py + Math.sin(ang - ab) * L).toFixed(1) +
        'M' + px.toFixed(1) + ' ' + py.toFixed(1) + 'L' + (px + Math.cos(ang + ab) * L).toFixed(1) + ' ' + (py + Math.sin(ang + ab) * L).toFixed(1));
      m.setAttribute('aria-label', 'Cámara al ' + rumbo(az) + ' del predio');
    }
    function rumbo(az) {   // dónde está la cámara respecto al predio, en rumbos verdaderos
      var a = az * Math.PI / 180, cu = -Math.sin(a), cv = -Math.cos(a);
      var gx = cu * cg + cv * sg, gy = -cu * sg + cv * cg, b = (Math.atan2(gx, gy) * 180 / Math.PI + 360) % 360;
      return ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(b / 45) % 8];
    }
    return pon;
  }

  /* ---------- Construcción ---------- */
  /* Escenas: 'general' (el predio, y el contexto sólo si se pide) o un
     apartado ('estacionamiento', 'comercio', 'industria', 'cultura', 'aro'),
     cada uno en su página. En un apartado sólo se arma lo suyo con todo su
     detalle; lo demás del predio (el contexto inmediato) va como referencia
     tenue, que se prende y se apaga; el aro se ve siempre. */
  function crea(svg, op) {
    op = op || {};
    var ESC = op.escena || 'general', GENERAL = ESC === 'general';
    var DET = GENERAL ? 1 : 2;     // nivel de detalle: 1 el predio entero, 2 un apartado
    defs(svg);
    var raiz = el('g', { class: 'ad ad--' + ESC }, svg);
    var dibujos = [];    // [elemento, función que da su 'd', es del contexto]
    var alZoom = [];     // lo que depende del encuadre (rótulos, norte, escala)
    var ctxVisible = false, ctxSucio = true, ctxListo = false;
    function reg(e, f, ctx) { dibujos.push([e, f, !!ctx]); return e; }
    function redibuja() {
      dibujos.forEach(function (o) { if (!o[2] || ctxVisible) o[0].setAttribute('d', o[1]()); });
      ctxSucio = !ctxVisible;
    }
    // Apartado de cada cosa: en la general, para picarle; en un apartado, lo
    // ajeno es referencia (.ad-ref).
    function marcaAp(g, ap, siempre) {
      g.classList.add('ad-ap', 'ad-ap--' + ap);
      g.setAttribute('data-ap', ap);
      if (!GENERAL && ap !== ESC) { g.classList.add('ad-ref'); if (siempre) g.classList.add('ad-ref--siempre'); }
      return g;
    }

    // 1. Contexto: suelo, calles y vías. Sólo en la general, y no se arma
    // hasta que se pide (preparaContexto): el grupo queda listo en su lugar.
    var gx = el('g', { class: 'ad-ctx' }, raiz);

    // 2. Sitio: suelo, arroyos, banquetas, Heliotropo y predio
    var gs = el('g', { class: 'ad-sitio' }, raiz);
    function plano(clase, polis, z, padre, extra) {
      var e = el('path', extra || {}, padre || gs);
      e.setAttribute('class', clase);
      return reg(e, function () { return polis.map(function (r) { return camino(r, z); }).join(''); });
    }
    plano('ad-tierra ad-tierra--sitio', [rect(S.u0, S.v0, S.u1, S.v1)], 0);
    plano('ad-arroyo', [rect(GF.o, S.v0, GU.o, S.v1), rect(GU.e, S.v0, GF.e, S.v1), rect(S.u0, GF.s, S.u1, GU.s), rect(S.u0, GU.n, S.u1, GF.n)], 0.02);
    plano('ad-banqueta', [rect(S.u0, GU.s, GF.o, GU.n), rect(GF.e, GU.s, S.u1, GU.n), rect(GU.o, S.v0, GU.e, GF.s), rect(GU.o, GF.n, GU.e, S.v1),
      rect(S.u0, S.v0, GF.o, GF.s), rect(GF.e, S.v0, S.u1, GF.s), rect(S.u0, GF.n, GF.o, S.v1), rect(GF.e, GF.n, S.u1, S.v1)], 0.15);
    plano('ad-banqueta', [rect(GU.o, GU.s, GU.e, GU.n), rect(PB.u0, PB.v0, PB.u1, PB.v1).reverse()], 0.15, gs, { 'fill-rule': 'evenodd' });
    // Espesor de las banquetas: la guarnición (0.15 m) del lado de cada arroyo y
    // los cantos donde el bloque se corta. Sólo las caras que miran a la cámara.
    var BANQ = [rect(S.u0, GU.s, GF.o, GU.n), rect(GF.e, GU.s, S.u1, GU.n), rect(GU.o, S.v0, GU.e, GF.s), rect(GU.o, GF.n, GU.e, S.v1),
      rect(S.u0, S.v0, GF.o, GF.s), rect(GF.e, S.v0, S.u1, GF.s), rect(S.u0, GF.n, GF.o, S.v1), rect(GF.e, GF.n, S.u1, S.v1), rect(GU.o, GU.s, GU.e, GU.n)];
    reg(el('path', { class: 'ad-guarnicion' }, gs), function () { return BANQ.map(function (r) { return paredes(r, 0, 0.15); }).join(''); });
    plano('ad-predio', [rect(PB.u0, PB.v0, PB.u1, PB.v1)], 0.2);
    // área verde: todo lo que no tiene desplante (lo construido la tapa)
    if (PAI) plano('ad-pai ad-verde', [rect(PB.u0, PB.v0, PB.u1, PB.v1)], 0.2);
    // plaza cultural: rectángulo menos el disco exterior del anillo
    var PLAZA_POL = (function () {
      var r = ANILLO.re, cu = ANILLO.u, cv = ANILLO.v, P = PLAZA_C;
      var aN = Math.acos((P.u1 - cu) / r), aS = Math.PI - Math.asin((P.v0 - cv) / r), pts = [[P.u0, P.v1], [P.u1, P.v1]];
      for (var i = 0; i <= 40; i++) { var t = aN + (aS - aN) * i / 40; pts.push([cu + Math.cos(t) * r, cv + Math.sin(t) * r]); }
      pts.push([P.u0, P.v0]);
      return pts;
    })();
    plano('ad-plaza-cultural', [PLAZA_POL], 0.21);
    plano('ad-arroyo ad-arroyo--servicio', [rect(GU.o, HE[0], GU.e, HE[1])], 0.22);
    // Estacionamiento en la general: sólo su volumen, como en rayos X y muy
    // tenue (el contorno en el piso, el del fondo y las aristas que bajan; las
    // helicoidales como cilindros). Los niveles se arman en su página.
    if (EST && ESC !== 'estacionamiento') {
      var gest = marcaAp(el('g', { class: 'ad-est-huella' }, gs), 'estacionamiento'), FONDO_E = -EST.sotanos * EST.entrepiso;
      reg(el('path', { class: 'ad-est-huella-f' }, gest), function () {
        return EST.bloques.map(function (b) { return camino(pares(b.planta), 0.23); }).join('') +
          EST.rampas.map(function (r) { return camino(circulo(r.c, r.r[1], 48), 0.23); }).join('');
      });
      reg(el('path', { class: 'ad-est-huella-l' }, gest), function () {
        var d = '';
        EST.bloques.forEach(function (b) {
          var pl = pares(b.planta);
          d += camino(pl, FONDO_E);
          pl.forEach(function (q) { d += 'M' + p(q[0], q[1], 0.23) + 'L' + p(q[0], q[1], FONDO_E); });
        });
        EST.rampas.forEach(function (r) {
          // el cilindro: el círculo del fondo y sus dos generatrices de contorno
          d += camino(circulo(r.c, r.r[1], 48), FONDO_E);
          [-1, 1].forEach(function (s) { var u = r.c[0] + s * ct * r.r[1], v = r.c[1] - s * st * r.r[1]; d += 'M' + p(u, v, 0.23) + 'L' + p(u, v, FONDO_E); });
        });
        return d;
      });
    }
    // Paisajismo, lo que va en el piso: cubresuelos, senderos, el hito radial,
    // los jardines inundables, la guía de agua, la laguna con su orilla y sus
    // curvas de fondo, los estanques con fuente y los filtros vegetados.
    // En los otros apartados es referencia.
    var gpai = null;
    if (PAI) {
      gpai = marcaAp(el('g', { class: 'ad-pai' }, gs), 'paisajismo');
      var Z = 0.24, mancha = function (lista) { return function () { return lista.map(function (f) { return camino(pares(f), Z); }).join(''); }; };
      reg(el('path', { class: 'ad-pai-tez' }, gpai), mancha(PAI.tezontle));
      reg(el('path', { class: 'ad-pai-sendero' }, gpai), function () {
        return PAI.senderos.map(function (s) { return 'M' + p(s[0], s[1], Z) + 'L' + p(s[2], s[3], Z); }).join('');
      });
      reg(el('path', { class: 'ad-pai-rayo' }, gpai), function () {
        var L = PAI.laguna, R = L.borde / L.r, d = '';
        PAI.rayos.forEach(function (y) {
          var a = y[0], r0 = Math.max(y[1], L.r * R * orilla(a) + 0.8), r1 = y[2] + r0 - y[1], c = Math.cos(a), s = Math.sin(a);
          d += 'M' + p(L.c[0] + c * r0, L.c[1] + s * r0, Z) + 'L' + p(L.c[0] + c * r1, L.c[1] + s * r1, Z);
        });
        return d;
      });
      var J = PAI.jardines;
      reg(el('path', { class: 'ad-pai-jardin' }, gpai), function () { return camino(rect(J[0], J[1], J[2], J[3]), Z); });
      reg(el('path', { class: 'ad-pai-agua ad-pai-rio' }, gpai), function () { return camino(pares(PAI.rio), Z + 0.01); });
      var HONDO = [-1.6, 1.1];   // lo hondo de la laguna se carga hacia el suroeste
      reg(el('path', { class: 'ad-pai-orilla' }, gpai), function () { return camino(laguna(PAI.laguna.borde / PAI.laguna.r), Z + 0.01); });
      reg(el('path', { class: 'ad-pai-agua ad-pai-laguna' }, gpai), function () { return camino(laguna(1), Z + 0.02); });
      reg(el('path', { class: 'ad-pai-fondo' }, gpai), function () { return [0.74, 0.5, 0.27].map(function (k) { return camino(laguna(k, HONDO), Z + 0.02); }).join(''); });
      reg(el('path', { class: 'ad-pai-agua' }, gpai), function () {
        var e = PAI.estanqueNave;
        return mancha(PAI.estanques)() + camino(circulo([e[0], e[1]], e[2], 32), Z + 0.02);
      });
      reg(el('path', { class: 'ad-pai-filtro' }, gpai), mancha(PAI.filtros));
    }
    // Espuela sobre Heliotropo: durmientes cada 1.6 m, rieles a 1.435 m y el tope al final
    reg(el('path', { class: 'ad-espuela-durm' }, gs), function () {
      var d = '';
      for (var u = S.u0 + 0.8; u < ESP_FIN - 0.5; u += 1.6) d += 'M' + p(u, VH - 1.3, 0.26) + 'L' + p(u, VH + 1.3, 0.26);
      return d;
    });
    reg(el('path', { class: 'ad-espuela-riel' }, gs), function () {
      return 'M' + p(S.u0, VH - 0.72, 0.27) + 'L' + p(ESP_FIN, VH - 0.72, 0.27) + 'M' + p(S.u0, VH + 0.72, 0.27) + 'L' + p(ESP_FIN, VH + 0.72, 0.27) +
        'M' + p(ESP_FIN, VH - 1.5, 0.27) + 'L' + p(ESP_FIN, VH + 1.5, 0.27) + 'L' + p(ESP_FIN, VH + 1.5, 1.1) + 'L' + p(ESP_FIN, VH - 1.5, 1.1) + 'Z';
    });

    // 3. Flujos (capa). Antes de los volúmenes: lo que está delante tapa al carro.
    var gf = el('g', { class: 'ad-capa', 'data-capa': 'flujos' }, raiz);
    var gfl = { s: el('path', { class: 'ad-flecha' }, gf), c: el('path', { class: 'ad-flecha ad-ctx' }, gf) };
    var gca = { s: el('g', {}, gf), c: el('g', { class: 'ad-ctx' }, gf) };
    CARRILES.forEach(function (c) {
      c.autos.forEach(function (au) {
        au.el = el('g', {}, c.ctx ? gca.c : gca.s);
        au.cu = el('path', { class: 'ad-carro' }, au.el);
        au.ca = el('path', { class: 'ad-carro ad-carro--cabina' }, au.el);
      });
    });

    // 4. Volúmenes y figuras, de lejos a cerca: edificios, naves, árboles, postes, Ecobici
    var go = el('g', { class: 'ad-objetos' }, raiz), objs = [];
    PIEZAS.forEach(function (pz) {
      var g = marcaAp(el('g', { class: 'ad-nave ad-nave--' + (pz.nv === NAVES[0] ? 'sur' : 'norte') }), 'comercio'), su = 0, sv = 0;
      pz.lz = lienzo(g);
      pz.pol.forEach(function (q) { su += q[0]; sv += q[1]; });
      objs.push({ u: su / pz.pol.length, v: sv / pz.pol.length, g: g, pieza: pz });
    });
    // Columnas del anillo: prismas de 0.80 m hasta la losa
    function enPabellon(u, v) {
      var r = Math.hypot(u - ANILLO.u, v - ANILLO.v), a = (Math.atan2(v - ANILLO.v, u - ANILLO.u) * 180 / Math.PI + 360) % 360;
      return r > CULTURA.r0 - 0.5 && r < CULTURA.r1 + 0.5 && CULTURA.pabellones.some(function (p) { return a > p[0] - 0.5 && a < p[1] + 0.5; });
    }
    COLUMNAS.filter(function (c) { return !enPabellon(c[0], c[1]); }).forEach(function (c) {
      var g = marcaAp(el('g', { class: 'ad-columna' }), 'aro', true), base = rect(c[0] - 0.4, c[1] - 0.4, c[0] + 0.4, c[1] + 0.4);
      reg(el('path', {}, g), function () { return paredes(base, 0, ANILLO.z); });
      objs.push({ u: c[0], v: c[1], g: g });
    });
    // Industria (nuevos bloques.3dm, industry_bake): un prisma, en el suelo del sitio
    if (MOD && MOD.industria) {
      var IND = MOD.industria, ip = antihorario(pares(IND.planta)), gi = marcaAp(el('g', { class: 'ad-industria' }), 'industria'), iu = 0, iv = 0;
      reg(el('path', { class: 'ad-ind-muro' }, gi), function () { return paredes(ip, IND.z0, IND.z1); });
      reg(el('path', { class: 'ad-ind-techo' }, gi), function () { return camino(ip, IND.z1); });
      ip.forEach(function (q) { iu += q[0]; iv += q[1]; });
      objs.push({ u: iu / ip.length, v: iv / ip.length, g: gi });
    }
    // Chimenea existente (nuevos bloques.3dm): prisma que se afila. Va con lo
    // alto (15 m) para ordenarse bien contra los módulos.
    if (MOD && MOD.chimenea) {
      var CH = MOD.chimenea, gch = marcaAp(el('g', { class: 'ad-chimenea' }), 'industria');
      var chB = rect(CH.base[0], CH.base[1], CH.base[2], CH.base[3]), chT = rect(CH.remate[0], CH.remate[1], CH.remate[2], CH.remate[3]);
      reg(el('path', { class: 'ad-chim-muro' }, gch), function () {
        var caras = [];
        for (var i = 0; i < 4; i++) {
          var a = chB[i], b = chB[(i + 1) % 4];
          if ((b[1] - a[1]) * st - (b[0] - a[0]) * ct >= -1e-6) continue;
          caras.push('M' + p(a[0], a[1], CH.z0) + 'L' + p(b[0], b[1], CH.z0) + 'L' + p(chT[(i + 1) % 4][0], chT[(i + 1) % 4][1], CH.z1) + 'L' + p(chT[i][0], chT[i][1], CH.z1) + 'Z');
        }
        return caras.join('');
      });
      reg(el('path', { class: 'ad-chim-remate' }, gch), function () { return camino(chT, CH.z1); });
      objs.push({ u: (CH.base[0] + CH.base[2]) / 2, v: (CH.base[1] + CH.base[3]) / 2, g: gch, alto: true });
    }
    // Pabellones de arte y cultura, en rebanadas de ≈2.6 m de fachada: cada una
    // entra sola al orden de pintado (la planta es cóncava).
    var CZ = ANILLO.z - ANILLO.canto;
    CULTURA.pabellones.forEach(function (pb, ip) {
      var n = Math.max(2, Math.round((pb[1] - pb[0]) / 3.2)), da = (pb[1] - pb[0]) / n;
      for (var k = 0; k < n; k++) {
        var a0 = pb[0] + k * da, a1 = a0 + da, am = (a0 + a1) / 2 * Math.PI / 180, rm = (CULTURA.r0 + CULTURA.r1) / 2;
        var gc = marcaAp(el('g', { class: 'ad-cultura ad-cultura--' + (ip ? 'b' : 'a') }), 'cultura');
        objs.push({ u: ANILLO.u + Math.cos(am) * rm, v: ANILLO.v + Math.sin(am) * rm, g: gc, lz: lienzo(gc), cultura: [a0, a1, k === 0, k === n - 1] });
      }
    });
    // Plantas: un cuadro de 14 m por pieza (una de cada tres plantas; en
    // paisajismo, todas y también las de los humedales).
    if (PAI) plantasDe(ESC === 'paisajismo' ? 2 : 1).forEach(function (c) {
      var g = marcaAp(el('g', { class: 'ad-plantas' }), 'paisajismo');
      objs.push({ u: c.u, v: c.v, g: g, lz: lienzo(g), plantas: c });
    });
    if (PAI) arbolesPai().forEach(function (t) {
      var g = marcaAp(el('g', { class: 'ad-plantas ad-pa-arbol' }), 'paisajismo');
      objs.push({ u: t[0], v: t[1], g: g, lz: lienzo(g), plantas: { arbol: t } });
    });
    function pintaPlantas(o) {
      var c = o.plantas, lz = o.lz, Z = 0.24;
      lz.inicia();
      if (c.arbol) {   // un árbol: tronco y copa (una esfera: en pantalla, un círculo)
        var t = c.arbol, bx = X(t[0], t[1]), by = Y(t[0], t[1], Z), cy = Y(t[0], t[1], Z + t[2] - t[3] * 0.9), R = t[3] * K;
        lz.path('M' + n1(bx) + ' ' + n1(by) + 'L' + n1(bx) + ' ' + n1(cy + R * 0.55), 'ad-pa-tronco');
        lz.path('M' + n1(bx - R) + ' ' + n1(cy) + 'a' + n1(R) + ' ' + n1(R) + ' 0 1 0 ' + n1(2 * R) + ' 0a' + n1(R) + ' ' + n1(R) + ' 0 1 0 ' + n1(-2 * R) + ' 0Z' +
          // un arco adentro, del lado de la sombra, para darle cuerpo
          'M' + n1(bx - R * 0.55) + ' ' + n1(cy + R * 0.45) + 'a' + n1(R * 0.75) + ' ' + n1(R * 0.75) + ' 0 0 0 ' + n1(R * 1.1) + ' ' + n1(-R * 0.1), t[4] ? 'ad-pa-copa ad-pa-copa--acento' : 'ad-pa-copa');
        lz.cierra();
        return;
      }
      var hk = cp * K, a, i, d, x, y;
      // arbustos: de atrás hacia adelante, cada uno un domo (media elipse) relleno
      a = c.arbusto;
      if (a.length) {
        var orden = [];
        for (i = 0; i < a.length; i += 4) orden.push(i);
        orden.sort(function (p, q) { return hondo(a[q], a[q + 1]) - hondo(a[p], a[p + 1]); });
        d = '';
        orden.forEach(function (i) {
          var x = X(a[i], a[i + 1]), y = Y(a[i], a[i + 1], Z), r = a[i + 2] * K, h = a[i + 3] * hk;
          d += 'M' + n1(x - r) + ' ' + n1(y) + 'A' + n1(r) + ' ' + n1(h) + ' 0 0 1 ' + n1(x + r) + ' ' + n1(y) + 'Z';
        });
        lz.path(d, 'ad-pa-arbusto');
      }
      // pastos en macollo: tres hojas que se abren desde la base
      a = c.pasto; d = '';
      for (i = 0; i < a.length; i += 4) {
        x = X(a[i], a[i + 1]); y = Y(a[i], a[i + 1], Z);
        var h = a[i + 2] * hk, w = a[i + 3] * h, ys = n1(y - h), yl = n1(y - h * 0.8), xb = n1(x), yb = n1(y);
        d += 'M' + xb + ' ' + yb + 'L' + n1(x - w) + ' ' + yl + 'M' + xb + ' ' + yb + 'L' + n1(x + w * 0.2) + ' ' + ys + 'M' + xb + ' ' + yb + 'L' + n1(x + w) + ' ' + yl;
      }
      if (d) lz.path(d, 'ad-pa-pasto');
      // agaves: roseta de cinco hojas cortas
      a = c.agave; d = '';
      for (i = 0; i < a.length; i += 4) {
        x = X(a[i], a[i + 1]); y = Y(a[i], a[i + 1], Z);
        var ra = a[i + 2] * K, ha = a[i + 2] * 1.1 * hk;
        d += 'M' + n1(x) + ' ' + n1(y);
        [[-1, 0.35], [-0.5, 0.85], [0, 1], [0.5, 0.85], [1, 0.35]].forEach(function (e, k) {
          d += (k ? 'M' + n1(x) + ' ' + n1(y) : '') + 'L' + n1(x + e[0] * ra) + ' ' + n1(y - e[1] * ha);
        });
      }
      if (d) lz.path(d, 'ad-pa-agave');
      // flores y juncos: un tallo y su remate (un punto: trazo de largo cero)
      ['flor', 'junco'].forEach(function (tipo) {
        var a = c[tipo], tallo = '', rem = ['', '', ''];
        for (var i = 0; i < a.length; i += 7) {
          var u = a[i], v = a[i + 1], h = a[i + 2], tu = u + a[i + 4], tv = v + a[i + 5];
          var x0 = n1(X(u, v)), y0 = n1(Y(u, v, Z)), x1 = X(tu, tv), y1 = Y(tu, tv, Z + h);
          tallo += 'M' + x0 + ' ' + y0 + 'L' + n1(x1) + ' ' + n1(y1);
          rem[a[i + 6]] += tipo === 'junco' ? 'M' + n1(x1) + ' ' + n1(y1 + h * 0.08 * hk) + 'L' + n1(x1) + ' ' + n1(y1 + h * 0.3 * hk) : 'M' + n1(x1) + ' ' + n1(y1) + 'l0 0';
        }
        if (tallo) lz.path(tallo, 'ad-pa-tallo ad-pa-tallo--' + tipo);
        rem.forEach(function (r, k) { if (r) lz.path(r, 'ad-pa-' + tipo + ' ad-pa-' + tipo + '--' + k); });
      });
      lz.cierra();
    }
    /* Sol (capa 'sol'): la bóveda celeste sobre el predio, sin luz ni
       sombras. El horizonte con los rumbos, los recorridos del sol el 21 de
       junio, en el equinoccio y el 21 de diciembre, la ventana solar entre los
       solsticios cruzada por las horas (la figura que hace el sol en el año) y
       el recorrido de hoy, con el sol que lo cruza de la salida a la puesta.
       Lo de atrás de la bóveda va detrás de los edificios y lo de adelante
       encima. Al prenderla la cámara se aleja para que el sol se vea alto,
       lejos del predio (sin el contexto). */
    var R_SOL = 150, CICLO_SOL = 24000, HOY = new Date(), gsolA = el('g', { class: 'ad-sol' }), gsolF = el('g', { class: 'ad-sol' });
    raiz.insertBefore(gsolA, go);
    // la ventana solar es un velo: detrás de todo, hasta del suelo
    var gsolV = el('g', { class: 'ad-sol' }), velo = el('path', { class: 'ad-sol-ventana' }, gsolV);
    raiz.insertBefore(gsolV, raiz.firstChild);
    var DIAS = [['verano', diaDelAno(new Date(HOY.getFullYear(), 5, 21))], ['equinoccio', diaDelAno(new Date(HOY.getFullYear(), 2, 20))],
      ['invierno', diaDelAno(new Date(HOY.getFullYear(), 11, 21))]], DIA_HOY = diaDelAno(HOY);
    function enCielo(alt, az, r) {   // altura y azimut → (u, v, z) sobre la bóveda de radio r
      var ca = Math.cos(alt * RAD), E = ca * Math.sin(az * RAD), N = ca * Math.cos(az * RAD);
      var cg = Math.cos(GIRO), sg = Math.sin(GIRO);
      return [CEN[0] + r * (E * cg - N * sg), CEN[1] + r * (E * sg + N * cg), r * Math.sin(alt * RAD)];
    }
    function recorrido(dia, paso) {   // los puntos del día sobre el horizonte, con su hora
      var r = [];
      for (var h = 4; h <= 21; h += paso) { var p = solEn(dia, h); if (p.alt > 0) r.push([h, enCielo(p.alt, p.az, R_SOL)]); }
      return r;
    }
    var solP = { atras: {}, frente: {} }, solT = {}, kSol = 0;
    function solPath(clase) {
      solP.atras[clase] = el('path', { class: clase }, gsolA);
      solP.frente[clase] = el('path', { class: clase }, gsolF);
    }
    ['ad-sol-horizonte', 'ad-sol-rumbo', 'ad-sol-hora', 'ad-sol-arco ad-sol-arco--verano', 'ad-sol-arco ad-sol-arco--equinoccio',
      'ad-sol-arco ad-sol-arco--invierno', 'ad-sol-hoy'].forEach(solPath);
    var halo = el('circle', { class: 'ad-sol-halo' }, gsolF), disco = el('circle', { class: 'ad-sol-disco' }, gsolF);
    function rotSol(id, txt) { var t = el('text', { class: 'ad-sol-rot', 'text-anchor': 'middle' }, gsolF); t.textContent = txt; solT[id] = t; return t; }
    ['N', 'E', 'S', 'O'].forEach(function (r) { rotSol(r, r).classList.add('ad-sol-rot--rumbo'); });
    for (var hs = 6; hs <= 18; hs += 2) rotSol('h' + hs, hs + ' h');
    rotSol('verano', '21 jun'); rotSol('invierno', '21 dic');
    var horaSol = rotSol('hoy', ''); horaSol.classList.add('ad-sol-rot--hoy');
    function ponTexto(t, q, dy) { t.setAttribute('x', n1(X(q[0], q[1]))); t.setAttribute('y', n1(Y(q[0], q[1], q[2]) + (dy || 0))); }
    var VENTANA = null, HORAS = null, HOY_P = null;
    function pintaSol() {
      var kc = hondo(CEN[0], CEN[1]), d = { atras: {}, frente: {} };
      function lado(a, b) { return hondo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) >= kc ? 'atras' : 'frente'; }
      function linea(clase, pts) {   // polilínea partida en lo de atrás y lo de adelante
        var ant = null;
        for (var i = 1; i < pts.length; i++) {
          var l = lado(pts[i - 1], pts[i]), seg = 'L' + p(pts[i][0], pts[i][1], pts[i][2]);
          if (l !== ant) seg = 'M' + p(pts[i - 1][0], pts[i - 1][1], pts[i - 1][2]) + seg;
          d[l][clase] = (d[l][clase] || '') + seg;
          ant = l;
        }
      }
      if (!VENTANA) {
        var arcos = {};
        DIAS.forEach(function (dd) { arcos[dd[0]] = recorrido(dd[1], 1 / 12); });
        VENTANA = arcos;
        HORAS = [];
        for (var h = 6; h <= 18; h++) HORAS.push([h, DIAS.map(function (dd) { var q = solEn(dd[1], h); return q.alt > 0 ? enCielo(q.alt, q.az, R_SOL) : null; }).filter(Boolean)]);
        HOY_P = recorrido(DIA_HOY, 1 / 30);
      }
      // la ventana: entre los dos solsticios
      var ve = VENTANA.verano.map(function (q) { return q[1]; }), inv = VENTANA.invierno.map(function (q) { return q[1]; }).reverse();
      velo.setAttribute('d', 'M' + ve.concat(inv).map(function (q) { return p(q[0], q[1], q[2]); }).join('L') + 'Z');
      var hz = [];
      for (var i = 0; i <= 96; i++) { var t = i / 96 * 360; hz.push(enCielo(0, t, R_SOL)); }
      linea('ad-sol-horizonte', hz);
      [0, 90, 180, 270].forEach(function (a) { linea('ad-sol-rumbo', [enCielo(0, a, R_SOL - 6), enCielo(0, a, R_SOL + 6)]); });
      ['verano', 'equinoccio', 'invierno'].forEach(function (n) { linea('ad-sol-arco ad-sol-arco--' + n, VENTANA[n].map(function (q) { return q[1]; })); });
      HORAS.forEach(function (h) { if (h[1].length > 1) linea('ad-sol-hora', h[1]); });
      linea('ad-sol-hoy', HOY_P.map(function (q) { return q[1]; }));
      ['atras', 'frente'].forEach(function (l) { Object.keys(solP[l]).forEach(function (c) { solP[l][c].setAttribute('d', d[l][c] || ''); }); });
      // rótulos: rumbos afuera del horizonte, horas sobre el arco de invierno
      [['N', 0], ['E', 90], ['S', 180], ['O', 270]].forEach(function (r) { ponTexto(solT[r[0]], enCielo(0, r[1], R_SOL + 16)); });
      for (var hh = 6; hh <= 18; hh += 2) {
        var q = solEn(DIAS[2][1], hh), t2 = solT['h' + hh];
        t2.style.display = q.alt > 2 ? '' : 'none';
        if (q.alt > 2) ponTexto(t2, enCielo(q.alt - 3, q.az, R_SOL), 0);
      }
      [['verano', 0], ['invierno', 2]].forEach(function (r) {
        var q = solEn(DIAS[r[1]][1], 12);
        ponTexto(solT[r[0]], enCielo(q.alt + 4, q.az, R_SOL));
      });
      solea(ultimoMs || performance.now());
    }
    // el sol de hoy, de la salida a la puesta, una vez cada CICLO_SOL ms
    function solea(ms) {
      if (!capas.sol || !HOY_P || !HOY_P.length) return;
      var h0 = HOY_P[0][0], h1 = HOY_P[HOY_P.length - 1][0], h = h0 + (h1 - h0) * ((ms % CICLO_SOL) / CICLO_SOL);
      var q = solEn(DIA_HOY, h), c = enCielo(Math.max(0, q.alt), q.az, R_SOL), x = n1(X(c[0], c[1])), y = n1(Y(c[0], c[1], c[2])), r = 3.4 * K;
      disco.setAttribute('cx', x); disco.setAttribute('cy', y); disco.setAttribute('r', n1(r));
      halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', n1(r * 2));
      var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      horaSol.textContent = 'hoy ' + hh + ':' + (mm < 10 ? '0' : '') + mm;
      horaSol.setAttribute('x', x); horaSol.setAttribute('y', n1(+y - r * 2.6));
    }

    /* Estructura de acero, simplificada: de la retícula sólo las columnas que
       llegan al piso (la planta baja del PDF), cada una como una línea del piso
       al fondo del departamento que carga, con un cuadrito de 0.35 m en el
       piso. Ni trabes, ni columnas dentro de los módulos, ni diagonales. Va con
       lo alto en el orden de pintado (se cruza con los módulos). Capa
       'estructura', apagada de inicio en la general. */
    var COLS = [];
    if (PAI) PAI.columnas.forEach(function (c) {
      var g = el('g', { class: 'ad-col' }), o = { u: c[0], v: c[1], z: 0, alto: true, g: g, columna: c, cam: null };
      g.appendChild(el('path', {}));
      COLS.push(o); objs.push(o);
    });
    function pintaColumna(o) {
      if (!capas.estructura) return;
      var c = o.columna, w = 0.175, u = c[0], v = c[1];
      o.g.firstChild.setAttribute('d', 'M' + p(u, v, 0.24) + 'L' + p(u, v, c[2]) + 'M' + p(u - w, v - w, 0.24) + 'L' + p(u + w, v - w, 0.24) + 'L' + p(u + w, v + w, 0.24) + 'L' + p(u - w, v + w, 0.24) + 'Z');
      o.cam = CAM;
    }
    function pintaCultura(o) {
      var c = o.cultura, r0 = CULTURA.r0, r1 = CULTURA.r1, zb = 0.22, zt = CZ, zn = zb + (zt - zb) / CULTURA.niveles, lz = o.lz;
      var t0 = c[0] * Math.PI / 180, t1 = c[1] * Math.PI / 180, tm = (t0 + t1) / 2, m = 3;
      function q(r, t, z) { return p(ANILLO.u + Math.cos(t) * r, ANILLO.v + Math.sin(t) * r, z); }
      function arcoC(r, z, ida) { var a = []; for (var i = 0; i <= m; i++) { var t = ida ? t0 + (t1 - t0) * i / m : t1 - (t1 - t0) * i / m; a.push(q(r, t, z)); } return a; }
      function muro(r) { return 'M' + arcoC(r, zb, true).join('L') + 'L' + arcoC(r, zt, false).join('L') + 'Z'; }
      function linea(a) { return 'M' + a.join('L'); }
      var dm = '', dl = '', dt = '';
      lz.inicia();
      [[r1, 1], [r0, -1]].forEach(function (w) {
        if (!mira([Math.cos(tm) * w[1], Math.sin(tm) * w[1], 0])) return;
        dm += muro(w[0]);
        dl += linea(arcoC(w[0], zb, true)) + linea(arcoC(w[0], zn, true)) + 'M' + q(w[0], t0, zb) + 'L' + q(w[0], t0, zt);
        if (c[3]) dl += 'M' + q(w[0], t1, zb) + 'L' + q(w[0], t1, zt);
      });
      // cabeceras del pabellón (contra el pasaje y en los extremos)
      [[t0, -1, c[2]], [t1, 1, c[3]]].forEach(function (e) {
        if (!e[2]) return;
        var n = [-Math.sin(e[0]) * e[1], Math.cos(e[0]) * e[1], 0];
        if (!mira(n)) return;
        dm += 'M' + q(r0, e[0], zb) + 'L' + q(r1, e[0], zb) + 'L' + q(r1, e[0], zt) + 'L' + q(r0, e[0], zt) + 'Z';
        dl += 'M' + q(r0, e[0], zb) + 'L' + q(r1, e[0], zb) + 'M' + q(r0, e[0], zn) + 'L' + q(r1, e[0], zn) + 'M' + q(r0, e[0], zb) + 'L' + q(r0, e[0], zt) + 'M' + q(r1, e[0], zb) + 'L' + q(r1, e[0], zt);
      });
      dt = 'M' + arcoC(r1, zt, true).join('L') + 'L' + arcoC(r0, zt, false).join('L') + 'Z';
      var bordes = linea(arcoC(r1, zt, true)) + linea(arcoC(r0, zt, true));
      if (c[2]) bordes += 'M' + q(r0, t0, zt) + 'L' + q(r1, t0, zt);
      if (c[3]) bordes += 'M' + q(r0, t1, zt) + 'L' + q(r1, t1, zt);
      if (dm) lz.path(dm, 'ad-cul-muro');
      if (dl) lz.path(dl, 'ad-cul-linea');
      lz.path(dt, 'ad-cul-techo');
      lz.path(bordes, 'ad-cul-borde');
      lz.cierra();
    }
    /* Estacionamiento en su página: los 4 sótanos de cada bloque en líneas (no
       se tapan entre sí: se ven todos a la vez, como en rayos X), con los
       cajones, la jaula de muros y las helicoidales dobles bajando un sótano por
       vuelta. Un sótano elegido se rellena y se aclara; «separar» abre los
       niveles. Va antes que todo lo que está sobre el piso. */
    var ESTA = { nivel: 0, separa: false }, SEP = 7;
    function zSot(t) { return -t * (EST.entrepiso + (ESTA.separa ? SEP : 0)); }   // t: sótanos bajo la planta baja (continuo)
    var objEst = null;
    if (EST && ESC === 'estacionamiento') {
      var gE = marcaAp(el('g', { class: 'ad-est' }), 'estacionamiento');
      var cuE = 0, cvE = 0, nE = 0;
      EST.bloques.forEach(function (b) { pares(b.planta).forEach(function (q) { cuE += q[0]; cvE += q[1]; nE++; }); });
      // cada sótano en su grupo (al llegar se cargan uno por uno, del primero
      // al cuarto); la jaula, las helicoidales y los accesos, en otro
      var gComun = el('g', { class: 'ad-est-comun' }, gE);
      objEst = { u: cuE / nE, v: cvE / nE, z: -EST.sotanos * EST.entrepiso, bajo: true, g: gE, lz: lienzo(gComun), est: true,
        niveles: [1, 2, 3, 4].map(function (k) { var g = el('g', { class: 'ad-est-nivel', 'data-sotano': k }, gE); return { g: g, lz: lienzo(g) }; }),
        rot: [1, 2, 3, 4].map(function (k) { return texto(gE, 'S' + k, 'ad-est-rot', 'end'); }) };
      objs.push(objEst);
    }
    function pintaEst(o) {
      var lz = o.lz, N = EST.sotanos, sel = ESTA.nivel, fondo = zSot(N);
      lz.inicia();
      var djaula = '', dhel = '', dpaso = '', dacc = '';
      for (var k = 1; k <= N; k++) {
        var z = zSot(k), es = sel === k, losas = '', caj = '', dcu = '', ln = o.niveles[k - 1].lz;
        EST.bloques.forEach(function (b) {
          losas += camino(pares(b.planta), z);
          b.cajones.forEach(function (c) { caj += camino(rect(c[0], c[1], c[2], c[3]), z); });
        });
        if (k === 1) EST.cuartos.forEach(function (c) { dcu += c.pol ? camino(pares(c.pol), z) : camino(circulo(c.c, c.r, 24), z); });
        ln.inicia();
        ln.path(losas, es ? 'ad-est-losa ad-est-losa--sel' : 'ad-est-losa');
        ln.path(caj, es ? 'ad-est-cajon ad-est-cajon--sel' : 'ad-est-cajon');
        if (dcu) ln.path(dcu, 'ad-est-cuarto');
        ln.cierra();
      }
      // jaula: aristas verticales en las esquinas de cada bloque, de la planta baja al fondo
      EST.bloques.forEach(function (b) {
        pares(b.planta).forEach(function (q) { djaula += 'M' + p(q[0], q[1], 0) + 'L' + p(q[0], q[1], fondo); });
        djaula += camino(pares(b.planta), 0);
      });
      // helicoidales: los bordes de los dos carriles bajan un sótano por vuelta;
      // rayas radiales cada 30° marcan la rampa
      EST.rampas.forEach(function (r) {
        var radios = [r.carriles[0][0], (r.carriles[0][1] + r.carriles[1][0]) / 2, r.carriles[1][1]], pasos = N * 48;
        var a0 = r.bloque === 'norte' ? Math.PI / 2 : -Math.PI / 2;
        radios.forEach(function (R) {
          var pts = [];
          for (var i = 0; i <= pasos; i++) { var t = i / 48, a = a0 - t * 2 * Math.PI; pts.push(p(r.c[0] + Math.cos(a) * R, r.c[1] + Math.sin(a) * R, zSot(t))); }
          dhel += 'M' + pts.join('L');
        });
        for (var i = 0; i < N * 12; i++) {
          var t = i / 12, a = a0 - t * 2 * Math.PI, z = zSot(t), ca = Math.cos(a), sa = Math.sin(a);
          dpaso += 'M' + p(r.c[0] + ca * radios[0], r.c[1] + sa * radios[0], z) + 'L' + p(r.c[0] + ca * radios[2], r.c[1] + sa * radios[2], z);
        }
        djaula += camino(circulo(r.c, r.r[1], 48), 0) + camino(circulo(r.c, r.r[1], 48), fondo);
      });
      EST.accesos.forEach(function (a) {
        if (a[0] === 'l') { dacc += 'M' + p(a[1], a[2], 0.25) + 'L' + p(a[3], a[4], 0.25); return; }
        var t0 = a[4] * Math.PI / 180, t1 = a[5] * Math.PI / 180;
        if (t1 < t0) t1 += 2 * Math.PI;
        var m = Math.max(4, Math.ceil((t1 - t0) / 0.12)), pts = [];
        for (var i = 0; i <= m; i++) { var t = t0 + (t1 - t0) * i / m; pts.push(p(a[1] + Math.cos(t) * a[3], a[2] + Math.sin(t) * a[3], 0.25)); }
        dacc += 'M' + pts.join('L');
      });
      lz.path(djaula, 'ad-est-jaula');
      lz.path(dpaso, 'ad-est-paso');
      lz.path(dhel, 'ad-est-helice');
      lz.path(dacc, 'ad-est-acceso');
      lz.cierra();
      // rótulos S1–S4 junto a la esquina del bloque norte que queda más a la izquierda
      var nb = pares(EST.bloques[0].planta), izq = nb.reduce(function (m, q) { return X(q[0], q[1]) < X(m[0], m[1]) ? q : m; });
      o.rot.forEach(function (t, i) {
        t.setAttribute('x', n1(X(izq[0], izq[1]) - q(3)));
        t.setAttribute('y', n1(Y(izq[0], izq[1], zSot(i + 1)) + q(1.5)));
        t.classList.toggle('es-sel', sel === i + 1);
      });
      raiz.classList.toggle('con-sotano', !!sel);
    }

    // Anillo en tramos: así cada tramo queda delante o detrás de los módulos
    // según dónde esté (el anillo entero no puede estar a la vez delante y
    // detrás de ellos).
    var NA = 120, NSEG = 24, PASOS = NA / NSEG, RM = (ANILLO.ri + ANILLO.re) / 2;
    for (var sg = 0; sg < NSEG; sg++) {
      var tm = (sg + 0.5) / NSEG * 2 * Math.PI, ga = marcaAp(el('g', { class: 'ad-anillo' }), 'aro', true);
      objs.push({ u: ANILLO.u + Math.cos(tm) * RM, v: ANILLO.v + Math.sin(tm) * RM, z: ANILLO.z, alto: true, g: ga, anillo: sg, lz: lienzo(ga) });
    }
    // Módulos: se construyen la primera vez que el sector de la cámara los pide
    var MODS = [], SECTORES = {};
    if (MOD) {
      MOD.cajas.forEach(function (r, i) {
        MODS.push({ u: r[0], v: r[1], z: MOD.z0 + r[2] * MOD.alto, alto: true, mod: r, n: i, g: null, dentro: false, cam: null });
      });
    }
    function moduloG(o) {
      if (!o.g) { o.g = marcaAp(el('g', { class: 'ad-mod ad-mod--' + MOD.tipos[o.mod[3]] }), 'vivienda'); o.lz = lienzo(o.g); }
      return o.g;
    }
    // sector de azimut de la cámara, en la banda de altura que toca ('baja'
    // bajo MOD.banda grados, 'alta' arriba): una llave como 'alta7'
    function sectorDe(az) {
      var n = 360 / MOD.sector, s = Math.floor(az / MOD.sector) % n, b = EL < MOD.banda ? 'baja' : 'alta', k = b + s;
      if (!SECTORES[k]) SECTORES[k] = bits(MOD.sectores[b][s], MODS.length);
      return k;
    }
    var billboards = [];
    function figura(u, v, esc, id, clase, poste, voltea) {
      var e = el('g', { class: clase }), b = { e: e, u: u, v: v, esc: esc, poste: poste, sx: voltea ? -1 : 1 };
      if (poste) { b.i = copia('ad-poste-i'); b.d = copia('ad-poste-d'); e.appendChild(b.i); e.appendChild(b.d); }
      else e.appendChild(copia(id));
      billboards.push(b);
      objs.push({ u: u, v: v, g: e });
    }
    ARBOLES.forEach(function (a, i) { figura(a[0], a[1], 1, 'ad-arbol-' + (a[2] > 3.6 ? 'a' : a[2] > 2.4 ? 'b' : 'c'), 'ad-arbol ad-solo-sitio', null, i % 2); });
    POSTES.forEach(function (a) {
      var hu = a[0] < PB.u0 ? -1 : a[0] > PB.u1 ? 1 : 0, hv = a[1] < PB.v0 ? -1 : a[1] > PB.v1 ? 1 : 0;
      figura(a[0], a[1], 1, null, 'ad-poste-g ad-solo-sitio', [hu, hv]);
    });
    // Ecobici: en el carril de estacionamiento junto a la guarnición (GBFS)
    ECOBICI.forEach(function (e) { figura(e[1], e[2], 1, 'ad-bici', 'ad-bici-g'); });

    // Personas (atlampa-personas.js): figuras planas de perfil, siempre de frente
    // a la cámara; miran hacia donde caminan en la pantalla y al cambiar de
    // sentido se voltean (la figura se adelgaza hasta cero y abre del otro lado).
    var DP = window.ATLAMPA_PERSONAS, PERS = [], PASO = { corredor: 0.95, nino: 0.7 };
    if (DP) DP.personas.forEach(function (pr) {
      var g = el('g', { class: 'ad-persona ad-solo-sitio' }), c = {};
      ['a', 'b'].forEach(function (fa) {
        var dib = DP.tipos[pr.tipo](fa), gc = el('g', {}, g);
        el('path', { class: 'ad-persona-f', d: dib.f }, gc);
        el('path', { class: 'ad-persona-l', d: dib.l }, gc);
        c[fa] = gc;
      });
      c.b.style.display = 'none';
      var pts = pr.modo === 'lazo' ? pr.ruta.concat([pr.ruta[0]]) : pr.ruta, acc = [0];
      for (var j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      var o = { u: pts[0][0], v: pts[0][1], g: g, persona: pr, pts: pts, acc: acc, L: acc[acc.length - 1], cuadros: c, cuadro: 'a', mira: 1, sx: 1, oculta: false };
      PERS.push(o); objs.push(o);
    });
    // Dónde va cada quien al tiempo t (s): posición, sentido, si camina y cuánto ha andado
    function estado(o, t) {
      var pr = o.persona, L = o.L, T = L / pr.vel, tt = t + (pr.desfase || 0), s, sentido = 1, mueve = true, alfa = 1, ph;
      if (pr.modo === 'ida') {
        ph = tt % (T + pr.espera);
        if (ph > T) return null;
        s = ph * pr.vel; alfa = Math.min(1, s / 3, (L - s) / 3);
      } else if (pr.modo === 'vaiven') {
        var pa = pr.pausa;
        ph = tt % (2 * (T + pa));
        if (ph < T) s = ph * pr.vel;
        else if (ph < T + pa) { s = L; mueve = false; sentido = ph - T > pa * 0.45 ? -1 : 1; }
        else if (ph < 2 * T + pa) { s = L - (ph - T - pa) * pr.vel; sentido = -1; }
        else { s = 0; mueve = false; sentido = ph - 2 * T - pa > pa * 0.45 ? 1 : -1; }
      } else {
        if (pr.ciclo) {
          ph = tt % (pr.ciclo[0] + pr.ciclo[1]);
          if (ph > pr.ciclo[0]) return null;
          alfa = Math.min(1, ph / 1.2, (pr.ciclo[0] - ph) / 1.2);
        }
        s = (tt * pr.vel) % L;
      }
      var acc = o.acc, j = 1;
      while (j < acc.length - 1 && acc[j] < s) j++;
      var a = o.pts[j - 1], b = o.pts[j], k = (s - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { u: a[0] + (b[0] - a[0]) * k, v: a[1] + (b[1] - a[1]) * k, du: (b[0] - a[0]) / l * sentido, dv: (b[1] - a[1]) / l * sentido, mueve: mueve, s: tt * pr.vel, alfa: Math.max(0, alfa) };
    }
    var tPers = -1, nPers = 0;
    function camina(ms) {
      if (!PERS.length || !capas.personas) return;
      var t = ms / 1000, dt = tPers < 0 ? 1 : Math.min(0.2, t - tPers);
      tPers = t;
      PERS.forEach(function (o) {
        var e = estado(o, t);
        if (!e) { if (!o.oculta) { o.g.style.display = 'none'; o.oculta = true; } return; }
        if (o.oculta) { o.g.style.display = ''; o.oculta = false; }
        o.u = e.u; o.v = e.v;
        // hacia dónde va en la pantalla: si casi va hacia la cámara (o se aleja), conserva el lado
        var dx = e.du * ct - e.dv * st;
        if (Math.abs(dx) > 0.2) o.mira = dx > 0 ? 1 : -1;
        var paso = dt / 0.32 * 2;
        o.sx = o.sx < o.mira ? Math.min(o.mira, o.sx + paso) : Math.max(o.mira, o.sx - paso);
        var cu = e.mueve ? (Math.floor(e.s / (PASO[o.persona.tipo] || 0.55)) % 2 ? 'b' : 'a') : 'b';
        if (cu !== o.cuadro) { o.cuadros[o.cuadro].style.display = 'none'; o.cuadros[cu].style.display = ''; o.cuadro = cu; }
        var sx = Math.abs(o.sx) < 0.04 ? 0.04 * (o.mira) : o.sx;
        o.g.setAttribute('transform', 'translate(' + n1(X(e.u, e.v)) + ' ' + n1(Y(e.u, e.v, 0.2)) + ') scale(' + (sx * K).toFixed(3) + ' ' + K.toFixed(3) + ')');
        o.g.style.opacity = e.alfa < 1 ? e.alfa.toFixed(2) : '';
      });
      // el orden de pintado sigue a los que caminan, cada pocos cuadros
      if (++nPers % 5 === 0) ordena();
    }

    // Una pieza de nave: faldones, muros y cortes que miran a la cámara, y el
    // croquis (aristas que se pasan, láminas cada 3 m, marcos cada 8 m).
    function borde(pz, a, b) {
      var L = pz.L, E = 1e-6;
      if (a[2] && b[2]) return 'corte';
      if (Math.abs(a[0] - b[0]) < E) {
        if (Math.abs(a[0] - L.u0) < E || Math.abs(a[0] - L.u1) < E) return 'muro';
        if (Math.abs(a[0] - pz.valles[0]) < E || Math.abs(a[0] - pz.valles[1]) < E) return 'valle';
        return null;
      }
      if (Math.abs(a[1] - b[1]) < E && (Math.abs(a[1] - L.v0) < E || Math.abs(a[1] - L.v1) < E)) return 'muro';
      return null;   // junta con la pieza vecina
    }
    function pintaPieza(o) {
      var pz = o.pieza, lz = pz.lz, pol = pz.pol, n = pol.length, nv = pz.nv, dz = nv.cumbre - nv.alero;
      function z(u) { return nv.cumbre - dz * Math.abs(u - pz.um) / pz.run; }
      function P3(q) { return [q[0], q[1], z(q[0])]; }
      lz.inicia();
      var mitades = [cortaU(pz.techo, pz.um, true), cortaU(pz.techo, pz.um, false)], dT = '';
      mitades.forEach(function (h) { if (h) dT += camino(h.map(P3)); });
      lz.path(dT, 'ad-nave-techo');
      var tipos = [], vis = [], dm = '', dc = '', tr = '';
      for (var i = 0; i < n; i++) {
        var a = pol[i], b = pol[(i + 1) % n];
        tipos.push(borde(pz, a, b));
        vis.push(mira([b[1] - a[1], a[0] - b[0], 0]));
      }
      for (i = 0; i < n; i++) {
        var t = tipos[i];
        if (!t) continue;
        a = pol[i]; b = pol[(i + 1) % n];
        // un tramo que cruza la cumbrera se parte ahí para seguir el techo
        var tramos = (a[0] - pz.um) * (b[0] - pz.um) < 0 ? (function () {
          var m = [pz.um, a[1] + (b[1] - a[1]) * (pz.um - a[0]) / (b[0] - a[0])];
          return [[a, m], [m, b]];
        })() : [[a, b]];
        var pasa = t === 'corte' ? 0 : 0.9;
        tramos.forEach(function (s) {
          tr += trazo(P3(s[0]), P3(s[1]), pasa);
          if (t === 'valle' || !vis[i]) return;
          var cara = 'M' + p(s[0][0], s[0][1], 0) + 'L' + p(s[1][0], s[1][1], 0) + 'L' + p(s[1][0], s[1][1], z(s[1][0])) + 'L' + p(s[0][0], s[0][1], z(s[0][0])) + 'Z';
          if (t === 'corte') dc += cara; else dm += cara;
          tr += trazo([s[0][0], s[0][1], 0], [s[1][0], s[1][1], 0], pasa);
        });
        // marcos en los muros largos
        if (t === 'muro' && vis[i] && Math.abs(a[0] - b[0]) < 1e-6) {
          for (var vm = pz.L.v0 + 8; vm < pz.L.v1 - 2; vm += 8) {
            if ((vm - a[1]) * (vm - b[1]) < 0) tr += 'M' + p(a[0], vm, 0) + 'L' + p(a[0], vm, z(a[0]));
          }
        }
      }
      // aristas verticales en las esquinas de muros (no entre los tramos del arco)
      for (i = 0; i < n; i++) {
        var j = (i - 1 + n) % n, q = pol[i];
        if (!tipos[i] || !tipos[j] || tipos[i] === 'valle' || tipos[j] === 'valle' || !(vis[i] || vis[j])) continue;
        var r0 = pol[j], r1 = pol[(i + 1) % n];
        var giro = Math.abs(Math.atan2((q[0] - r0[0]) * (r1[1] - q[1]) - (q[1] - r0[1]) * (r1[0] - q[0]), (q[0] - r0[0]) * (r1[0] - q[0]) + (q[1] - r0[1]) * (r1[1] - q[1])));
        if (giro > 0.25) tr += trazo([q[0], q[1], 0], P3(q), 0.9);
      }
      // cumbrera y láminas del techo
      var izq = cortaU(pol, pz.um, true);
      if (izq && mitades[1]) izq.forEach(function (q, k) {
        var r = izq[(k + 1) % izq.length];
        if (Math.abs(q[0] - pz.um) < 1e-6 && Math.abs(r[0] - pz.um) < 1e-6) tr += trazo([pz.um, q[1], nv.cumbre], [pz.um, r[1], nv.cumbre], 0.9);
      });
      // las láminas, cada 3 m: sólo en el detalle del apartado
      if (DET > 1) mitades.forEach(function (h) {
        if (!h) return;
        for (var v = nv.L.v0 + 3; v < nv.L.v1 - 1; v += 3) {
          var us = cruza(h, 1, v);
          for (var k = 0; k + 1 < us.length; k += 2) tr += 'M' + p(us[k], v, z(us[k])) + 'L' + p(us[k + 1], v, z(us[k + 1]));
        }
      });
      lz.path(dm, 'ad-nave-muro');
      lz.path(dc, 'ad-nave-corte');
      lz.path(tr, 'ad-nave-trazo');
      lz.cierra();
    }
    // Un módulo: sólo sus caras del shell que miran a la cámara. Tapa, muros
    // del lado de la luz y muros a la sombra, sin contorno; las aristas van
    // aparte y sólo donde cambia el departamento (las juntas entre módulos
    // del mismo departamento no se dibujan, r[9]).
    function pintaModulo(o) {
      var r = o.mod, A = MOD.a / 2, Bm = MOD.b / 2, z0 = o.z, z1 = z0 + MOD.alto, lz = o.lz;
      function P(x, y, z) { return p(o.u + MEX[0] * x + MEY[0] * y, o.v + MEX[1] * x + MEY[1] * y, z); }
      var junta = {};
      if (r[9]) r[9].forEach(function (j) { if (typeof j === 'number') junta[j] = true; else junta[j[0]] = j.slice(1); });
      var dl = '', ds = '', dt = '', da = '';
      // arista de a a b (puntos [x, y, z] locales), o sólo sus tramos que quedan
      function arista(cod, a, b) {
        var j = junta[cod];
        if (j === true) return;
        var t = j || [0, 1];
        for (var k = 0; k < t.length; k += 2) {
          da += 'M' + P(a[0] + (b[0] - a[0]) * t[k], a[1] + (b[1] - a[1]) * t[k], a[2] + (b[2] - a[2]) * t[k]) +
                'L' + P(a[0] + (b[0] - a[0]) * t[k + 1], a[1] + (b[1] - a[1]) * t[k + 1], a[2] + (b[2] - a[2]) * t[k + 1]);
        }
      }
      // lado: [normal, eje del tramo (0 = x, 1 = y), coordenada fija, medio largo]
      [[[-MEY[0], -MEY[1]], 0, -Bm, A], [MEX, 1, A, Bm], [MEY, 0, Bm, A], [[-MEX[0], -MEX[1]], 1, -A, Bm]].forEach(function (l, i) {
        var m = r[4 + i];
        if (!m || !mira([l[0][0], l[0][1], 0])) return;
        var t = m === 1 ? [-l[3], l[3]] : m, d = '';
        for (var k = 0; k < t.length; k += 2) {
          var a = l[1] ? [l[2], t[k]] : [t[k], l[2]], b = l[1] ? [l[2], t[k + 1]] : [t[k + 1], l[2]];
          d += 'M' + P(a[0], a[1], z0) + 'L' + P(b[0], b[1], z0) + 'L' + P(b[0], b[1], z1) + 'L' + P(a[0], a[1], z1) + 'Z';
          var c = [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]];
          for (var e = 0; e < 4; e++) arista(i * 100 + 2 * k + e, c[e], c[(e + 1) % 4]);
        }
        if (l[0][0] * LUZ[0] + l[0][1] * LUZ[1] > 0) dl += d; else ds += d;
      });
      var tp = r[8], na = 0;
      if (tp === 1) tp = [[-A, -Bm, A, -Bm, A, Bm, -A, Bm]];
      if (tp) tp.forEach(function (q) {
        for (var k = 0; k < q.length; k += 2) {
          dt += (k ? 'L' : 'M') + P(q[k], q[k + 1], z1);
          var s = (k + 2) % q.length;
          arista(400 + na++, [q[k], q[k + 1], z1], [q[s], q[s + 1], z1]);
        }
        dt += 'Z';
      });
      lz.inicia();
      if (ds) lz.path(ds, 'ad-mod-sombra');
      if (dl) lz.path(dl, 'ad-mod-luz');
      if (dt) lz.path(dt, 'ad-mod-tapa');
      if (da) lz.path(da, 'ad-mod-arista');
      lz.cierra();
      o.cam = CAM;
    }
    // Un tramo del anillo: canto interior (sólo se ve el del fondo), losa,
    // bordes, canto exterior (el del frente), balaustres y barandales. Los
    // rellenos no llevan contorno entre tramos: las líneas van aparte.
    function aro(r, i) { var t = i / NA * 2 * Math.PI; return [ANILLO.u + Math.cos(t) * r, ANILLO.v + Math.sin(t) * r]; }
    function puntos(r, i0, i1, z) { var a = []; for (var i = i0; i <= i1; i++) { var q = aro(r, i); a.push(p(q[0], q[1], z)); } return a; }
    function arco(r, i0, i1, z) { return 'M' + puntos(r, i0, i1, z).join('L'); }
    // banda entre dos arcos: el primero de ida, el segundo de vuelta
    function banda(a, b) { return 'M' + a.join('L') + 'L' + b.reverse().join('L') + 'Z'; }
    function canto(r, signo, i0, i1) {
      var z1 = ANILLO.z, z0 = z1 - ANILLO.canto, f = '', l = '';
      function ve(i) { var t = (((i % NA) + NA) % NA + 0.5) / NA * 2 * Math.PI; return mira([Math.cos(t) * signo, Math.sin(t) * signo, 0]); }
      for (var i = i0; i < i1; i++) {
        if (!ve(i)) continue;
        var j = i;
        while (j < i1 && ve(j)) j++;
        f += banda(puntos(r, i, j, z1), puntos(r, i, j, z0));
        l += arco(r, i, j, z1) + arco(r, i, j, z0);
        // aristas verticales donde el canto deja de verse
        if (!ve(i - 1)) { var a = aro(r, i); l += 'M' + p(a[0], a[1], z0) + 'L' + p(a[0], a[1], z1); }
        if (!ve(j)) { var b = aro(r, j); l += 'M' + p(b[0], b[1], z0) + 'L' + p(b[0], b[1], z1); }
        i = j;
      }
      return [f, l];
    }
    function pintaAnillo(o) {
      var i0 = o.anillo * PASOS, i1 = i0 + PASOS, z = ANILLO.z, zb = z + ANILLO.baranda, lz = o.lz;
      lz.inicia();
      var ci = canto(ANILLO.ri, -1, i0, i1), ce = canto(ANILLO.re, 1, i0, i1);
      if (ci[0]) { lz.path(ci[0], 'ad-anillo-cf'); lz.path(ci[1], 'ad-anillo-cl'); }
      lz.path(banda(puntos(ANILLO.re, i0, i1, z), puntos(ANILLO.ri, i0, i1, z)), 'ad-anillo-losa');
      lz.path(arco(ANILLO.re, i0, i1, z) + arco(ANILLO.ri, i0, i1, z), 'ad-anillo-borde');
      if (ce[0]) { lz.path(ce[0], 'ad-anillo-cf'); lz.path(ce[1], 'ad-anillo-cl'); }
      var t0 = i0 / NA * 2 * Math.PI, t1 = i1 / NA * 2 * Math.PI, bal = '';
      // balaustres cada 2.4 m: sólo en el detalle
      if (DET > 1) [ANILLO.ri, ANILLO.re].forEach(function (r) {
        var m = Math.round(2 * Math.PI * r / 2.4);
        for (var i = Math.ceil(t0 / (2 * Math.PI) * m); i < t1 / (2 * Math.PI) * m; i++) {
          var t = i / m * 2 * Math.PI, u = ANILLO.u + Math.cos(t) * r, v = ANILLO.v + Math.sin(t) * r;
          bal += 'M' + p(u, v, z) + 'L' + p(u, v, zb);
        }
      });
      lz.path(bal, 'ad-anillo-balaustre');
      lz.path(arco(ANILLO.ri, i0, i1, zb) + arco(ANILLO.re, i0, i1, zb), 'ad-anillo-baranda');
      lz.cierra();
    }

    /* Orden de pintado, de atrás hacia adelante:
         0 edificios del contexto detrás del predio
         1 lo del suelo del sitio: naves, columnas, árboles, postes, Ecobici
         2 lo alto: tramos del anillo y módulos (de lejos a cerca, de abajo arriba)
         3 edificios del contexto delante del predio
       Sin contexto los edificios (ocultos) no se mueven. Al reordenar sólo se
       mueven los nodos que cambiaron de lugar (los que quedan fuera de la
       subsecuencia creciente más larga): girar poco mueve pocos nodos. */
    var sector = -1;
    function capaDe(o, kc) { return o.ctx ? (o.k > kc ? 0 : 3) : o.bajo ? 0.5 : o.alto ? 2 : 1; }
    function ordena() {
      var kc = hondo(CEN[0], CEN[1]), lista = objs.filter(function (o) {
        return (ctxVisible || !o.ctx) && (!o.persona || capas.personas) && (!o.columna || capas.estructura) && (!o.plantas || capas.paisaje);
      });
      // columnas y plantas apagadas: fuera del dibujo
      objs.forEach(function (o) { if ((o.columna && !capas.estructura) || (o.plantas && !capas.paisaje)) { if (o.g.parentNode) o.g.parentNode.removeChild(o.g); } });
      if (MOD && !capas.modulos) {   // capa apagada: ningún módulo en el dibujo
        MODS.forEach(function (o) { if (o.dentro) { go.removeChild(o.g); o.dentro = false; } });
        sector = -1;
      } else if (MOD) {
        var s = sectorDe(AZ), quiere = {};
        SECTORES[s].forEach(function (i) { quiere[i] = 1; lista.push(MODS[i]); moduloG(MODS[i]); });
        if (s !== sector) {
          // los que salen de la vista se quitan del dibujo
          MODS.forEach(function (o) { if (o.dentro && !quiere[o.n]) { go.removeChild(o.g); o.dentro = false; } });
          sector = s;
        }
      }
      lista.forEach(function (o, i) { o.k = hondo(o.u, o.v); o.c = capaDe(o, kc); o.q = i; });
      lista.sort(function (a, b) { return a.c - b.c || b.k - a.k || (a.z || 0) - (b.z || 0) || a.q - b.q; });
      var pos = new Map(), hijos = go.childNodes, i;
      for (i = 0; i < hijos.length; i++) pos.set(hijos[i], i);
      // subsecuencia creciente más larga de las posiciones actuales
      var colas = [], colaI = [], ant = new Int32Array(lista.length), queda = new Uint8Array(lista.length);
      for (i = 0; i < lista.length; i++) {
        var ps = pos.get(lista[i].g);
        if (ps === undefined) continue;
        var lo = 0, hi = colas.length;
        while (lo < hi) { var md = (lo + hi) >> 1; if (colas[md] < ps) lo = md + 1; else hi = md; }
        colas[lo] = ps; colaI[lo] = i; ant[i] = lo ? colaI[lo - 1] : -1;
      }
      for (var k = colaI.length ? colaI[colas.length - 1] : -1; k >= 0; k = ant[k]) queda[k] = 1;
      var sig = null;
      for (i = lista.length - 1; i >= 0; i--) {
        var o = lista[i];
        if (!queda[i]) go.insertBefore(o.g, sig);
        if (o.mod && !o.dentro) { o.dentro = true; if (o.cam !== CAM) pintaModulo(o); }
        sig = o.g;
      }
    }
    /* Contexto en diferido: las calles, las vías y los 332 edificios se arman
       y se calculan en tandas de pocos milisegundos (mientras la cámara se
       aleja despacio); listo() avisa cuando todo está al día con la cámara. */
    var tareasCtx = null, armandoCtx = null;
    function tareasContexto() {
      var t = [];
      t.push(function () {
        reg(el('path', { class: 'ad-tierra' }, gx), function () { return camino(rect(U0, V0, U1, V1), 0); }, true);
        [['menor', 'ad-calle'], ['mayor', 'ad-calle ad-calle--mayor'], ['tren', 'ad-tren'], ['tren', 'ad-tren-durmientes']].forEach(function (tc) {
          var lineas = D.calles[tc[0]].map(function (f) { return pares(f); });
          reg(el('path', { class: tc[1] }, gx), function () { return lineas.map(function (l) { return camino(l, 0, true); }).join(''); }, true);
        });
        ['ad-espuela-durm ad-espuela--ctx', 'ad-espuela-riel ad-espuela--ctx'].forEach(function (c) {
          reg(el('path', { class: c }, gx), function () { return camino(ESPUELA, 0, true); }, true);
        });
      });
      EDIF.forEach(function (e) {
        t.push(function () {
          var cx = 0, cy = 0;
          e.pol.forEach(function (r) { cx += r[0]; cy += r[1]; });
          var g = el('g', { class: 'ad-ctx' }), muros = el('path', { class: 'ad-edif-pared' }, g), techo = el('path', { class: 'ad-edif-techo' }, g);
          reg(muros, function () { return paredes(e.pol, 0, e.h); }, true);
          reg(techo, function () { return camino(e.pol, e.h); }, true);
          objs.push({ u: cx / e.pol.length, v: cy / e.pol.length, g: g, ctx: true });
        });
      });
      return t;
    }
    function preparaContexto(listo) {
      if (!GENERAL) return;
      if (armandoCtx) { if (listo) armandoCtx.push(listo); return; }
      if (ctxListo && !ctxSucio) { if (listo) listo(); return; }
      armandoCtx = listo ? [listo] : [];
      if (!tareasCtx) tareasCtx = tareasContexto();
      // después de armar, el 'd' de todo lo del contexto, también en tandas
      var cola = tareasCtx.slice();
      tareasCtx = [];
      var calcula = null;
      function tanda() {
        var t0 = performance.now();
        while (performance.now() - t0 < 7) {
          if (cola.length) { cola.shift()(); continue; }
          if (!calcula) calcula = dibujos.filter(function (o) { return o[2]; });
          if (!calcula.length) break;
          var o = calcula.shift();
          o[0].setAttribute('d', o[1]());
        }
        if (cola.length || (calcula && calcula.length) || !calcula) { requestAnimationFrame(tanda); return; }
        ctxListo = true; ctxSucio = false;
        var avisa = armandoCtx; armandoCtx = null;
        avisa.forEach(function (f) { f(); });
      }
      requestAnimationFrame(tanda);
    }

    // Precarga: arma (sin pintar ni meter al dibujo) los módulos de los sectores
    // vecinos, para que al girar ya estén listos.
    function precarga() {
      if (!MOD) return;
      [-1, 1].forEach(function (d) {
        var s = sectorDe(((AZ + d * MOD.sector) % 360 + 360) % 360);
        SECTORES[s].forEach(function (i) { moduloG(MODS[i]); });
      });
    }
    function pintaFiguras() {
      billboards.forEach(function (b) {
        if (b.poste) {
          var izq = xl(b.poste[0], b.poste[1]) < 0;
          b.i.style.display = izq ? '' : 'none'; b.d.style.display = izq ? 'none' : '';
        }
        var k = (K * b.esc).toFixed(3);
        b.e.setAttribute('transform', 'translate(' + n1(X(b.u, b.v)) + ' ' + n1(Y(b.u, b.v, 0)) + ') scale(' + (b.sx < 0 ? '-' : '') + k + ' ' + k + ')');
      });
    }

    // 5. Caras de suelo: sólo con suelo(true). Las dos que miran a la cámara.
    var gsuelo = el('g', { class: 'ad-suelo-caras' }, raiz);
    [[S, 'ad-solo-sitio'], [{ u0: U0, u1: U1, v0: V0, v1: V1 }, 'ad-ctx']].forEach(function (bq) {
      var r = bq[0], g = el('g', { class: 'ad-cara ' + bq[1] }, gsuelo), ctx = bq[1] === 'ad-ctx';
      ESTRATOS.forEach(function (e) {
        reg(el('path', { class: 'ad-c-' + e[0] }, g), function () { return carasSuelo(r, e[1], e[2]); }, ctx);
      });
      reg(el('path', { class: 'ad-arista' }, g), function () { return carasSuelo(r, 0, FONDO); }, ctx);
    });
    function carasSuelo(r, za, zb) {
      var lados = [[[r.u0, r.v0], [r.u1, r.v0], [0, -1]], [[r.u1, r.v1], [r.u0, r.v1], [0, 1]], [[r.u0, r.v1], [r.u0, r.v0], [-1, 0]], [[r.u1, r.v0], [r.u1, r.v1], [1, 0]]];
      return lados.filter(function (l) { return mira([l[2][0], l[2][1], 0]); }).map(function (l) {
        return 'M' + p(l[0][0], l[0][1], za) + 'L' + p(l[1][0], l[1][1], za) + 'L' + p(l[1][0], l[1][1], zb) + 'L' + p(l[0][0], l[0][1], zb) + 'Z';
      }).join('');
    }

    /* ---------- Rótulos ----------
       Todo el texto es sólo del acercamiento: con el contexto se desvanece. */
    raiz.appendChild(gsolF);
    var gr = el('g', { class: 'ad-rotulos' }, raiz);
    // Nombres de calle a lo largo de la calle, siempre legibles para la cámara
    var gcal = el('g', { class: 'ad-nombres' }, gr);
    function alo(t, u, v, du, dv, dy) {
      var x = X(u, v), y = Y(u, v, 0), sx = X(u + du, v + dv) - x, sy = Y(u + du, v + dv, 0) - y;
      var ang = Math.atan2(sy, sx) * 180 / Math.PI;
      if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
      t.setAttribute('transform', 'translate(' + n1(x) + ' ' + n1(y) + ') rotate(' + ang.toFixed(2) + ')');
      t.setAttribute('y', n1(dy));
    }
    function calle(nombre, u, v, du, dv, clase, lado) {
      var t = el('text', { class: 'ad-calle-nombre ' + (clase || ''), 'text-anchor': 'middle' }, gcal);
      t.textContent = nombre;
      alZoom.push(function () { alo(t, u, v, du, dv, lado ? lado * q(6) : q(3)); });
    }
    var um = (PB.u0 + PB.u1) / 2;
    calle('Calle del Fresno', cf, 440, 0, 1, 'ad-solo-sitio');
    calle('Calle Sabino', cs, 440, 0, 1, 'ad-solo-sitio');
    calle('Calle Clavel', um - 25, cc, 1, 0, 'ad-solo-sitio');
    calle('Av. Profra. Eulalia Guzmán', um, ce, 1, 0, 'ad-solo-sitio');

    // Las cotas de las calles (banqueta · arroyo · banqueta) irán en los cortes.

    // Norte, escala y pájaros: fijos en el cuadro. La atribución de OSM va
    // en la página, fuera del dibujo.
    var gn = el('g', { class: 'ad-norte' }, gr), eN = el('path', { class: 'ad-flecha-n' }, gn), tN = texto(gn, 'N', 'ad-r-norte ad-solo-sitio', 'middle');
    var ge = el('g', { class: 'ad-escala ad-solo-sitio' }, gr), eE = el('path', { class: 'ad-barra' }, ge), eE2 = el('path', { class: 'ad-barra-llena' }, ge);
    var tE0 = texto(ge, '0', 'ad-r-cota', 'middle'), tE1 = texto(ge, '', 'ad-r-cota', 'middle');
    var pj = [el('path', { class: 'ad-pajaro' }, gr), el('path', { class: 'ad-pajaro' }, gr)];
    alZoom.push(function () {
      if (!marco) return;
      var fx = function (f) { return marco[0] + marco[2] * f; }, fy = function (f) { return marco[1] + marco[3] * f; };
      var x = fx(0.045), y = fy(0.16);
      var dx = NORTE[0] * ct - NORTE[1] * st, dy = -(NORTE[0] * st + NORTE[1] * ct) * sp, L = Math.hypot(dx, dy);
      dx /= L; dy /= L;
      var x2 = x + dx * q(26), y2 = y + dy * q(26), a = q(4), b = q(2.6);
      eN.setAttribute('d', 'M' + n1(x) + ' ' + n1(y) + 'L' + n1(x2) + ' ' + n1(y2) +
        'M' + n1(x2 - dx * a - dy * b) + ' ' + n1(y2 - dy * a + dx * b) + 'L' + n1(x2) + ' ' + n1(y2) +
        'L' + n1(x2 - dx * a + dy * b) + ' ' + n1(y2 - dy * a - dx * b));
      tN.setAttribute('x', n1(x + dx * q(36))); tN.setAttribute('y', n1(y + dy * q(36) + q(4)));
      // escala gráfica a lo largo del eje del suelo (u o v) que quede más horizontal:
      // la medida vale en esa dirección
      var lux = ct, luy = -st * sp, lvx = -st, lvy = -ct * sp;
      if (Math.abs(lvy / lvx) < Math.abs(luy / lux)) { lux = lvx; luy = lvy; }
      var lu = Math.hypot(lux, luy);
      if (lux < 0) { lux = -lux; luy = -luy; }
      var m = q(110) / (lu * K), largo = 5;
      [5, 10, 20, 25, 50, 100, 200].forEach(function (c) { if (c <= m) largo = c; });
      var ex = fx(0.045), ey = fy(0.93), ux = lux / lu, uy = luy / lu, Lp = largo * lu * K;
      var h = q(2.2), dd = '', dl = '';
      for (var i = 0; i < 4; i++) {
        var a0 = ex + ux * Lp * i / 4, b0 = ey + uy * Lp * i / 4, a1 = ex + ux * Lp * (i + 1) / 4, b1 = ey + uy * Lp * (i + 1) / 4;
        var tr = 'M' + n1(a0) + ' ' + n1(b0) + 'L' + n1(a1) + ' ' + n1(b1) + 'L' + n1(a1) + ' ' + n1(b1 - h) + 'L' + n1(a0) + ' ' + n1(b0 - h) + 'Z';
        if (i % 2) dl += tr; else dd += tr;
      }
      eE.setAttribute('d', dd); eE2.setAttribute('d', dl);
      tE0.setAttribute('x', n1(ex)); tE0.setAttribute('y', n1(ey + q(11)));
      tE1.setAttribute('x', n1(ex + ux * Lp)); tE1.setAttribute('y', n1(ey + uy * Lp + q(11)));
      tE1.textContent = largo + ' m';
      [[0.6, 0.09, 6], [0.635, 0.065, 4.6]].forEach(function (c, i) {
        var px = fx(c[0]), py = fy(c[1]), s = q(c[2]);
        pj[i].setAttribute('d', 'M' + n1(px - s) + ' ' + n1(py - s * 0.15) + 'Q' + n1(px - s * 0.45) + ' ' + n1(py - s * 0.62) + ' ' + n1(px) + ' ' + n1(py) +
          'Q' + n1(px + s * 0.45) + ' ' + n1(py - s * 0.62) + ' ' + n1(px + s) + ' ' + n1(py - s * 0.15));
      });
    });

    /* ---------- Encuadres ----------
       Contexto: el bloque grande. Sitio: el bloque chico. Misma proporción
       para que el dibujo no cambie de alto; se recalculan al girar. */
    var ASP = 1.9;
    function cajaVista(u0, u1, v0, v1, z1, mg, aire, z0) {
      var xs = [], ys = [];
      [u0, u1].forEach(function (u) { [v0, v1].forEach(function (v) { [z0 || 0, z1].forEach(function (z) { xs.push(X(u, v)); ys.push(Y(u, v, z)); }); }); });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var w = (x1 - x0) * aire + 2 * mg, h = (y1 - y0) * aire + 2 * mg;
      if (w / h < ASP) w = h * ASP; else h = w / ASP;
      return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
    }

    /* Caja (u0, u1, v0, v1, z0, z1) de cada apartado: el encuadre de su
       página y a dónde vuela la cámara al entrar. */
    function cajaAp(ap) {
      var us = [], vs = [], z0 = 0, z1 = 10;
      function mete(q) { us.push(q[0]); vs.push(q[1]); }
      if (ap === 'estacionamiento' && EST) {
        EST.bloques.forEach(function (b) { pares(b.planta).forEach(mete); });
        EST.rampas.forEach(function (r) { mete([r.c[0] - r.r[1], r.c[1] - r.r[1]]); mete([r.c[0] + r.r[1], r.c[1] + r.r[1]]); });
        z0 = zSot(EST.sotanos); z1 = 0;
      } else if (ap === 'comercio') {
        NAVES.forEach(function (nv) { mete([nv.L.u0, nv.L.v0]); mete([nv.L.u1, nv.L.v1]); });
        z1 = 9;
      } else if (ap === 'industria' && MOD && MOD.industria) {
        pares(MOD.industria.planta).forEach(mete);
        z1 = MOD.industria.z1;
        if (MOD.chimenea) { mete(MOD.chimenea.base.slice(0, 2)); mete(MOD.chimenea.base.slice(2)); z1 = Math.max(z1, MOD.chimenea.z1); }
      } else if (ap === 'cultura') {
        CULTURA.pabellones.forEach(function (pb) { [pb[0], pb[1], (pb[0] + pb[1]) / 2].forEach(function (a) {
          [CULTURA.r0, CULTURA.r1].forEach(function (r) { mete([ANILLO.u + Math.cos(a * Math.PI / 180) * r, ANILLO.v + Math.sin(a * Math.PI / 180) * r]); });
        }); });
        mete([PLAZA_C.u0, PLAZA_C.v0]); mete([PLAZA_C.u1, PLAZA_C.v1]);
        z1 = ANILLO.z;
      } else if (ap === 'aro') {
        mete([ANILLO.u - ANILLO.re, ANILLO.v - ANILLO.re]); mete([ANILLO.u + ANILLO.re, ANILLO.v + ANILLO.re]);
        z1 = ANILLO.z + ANILLO.baranda;
      } else if (ap === 'paisajismo') {
        mete([PB.u0, PB.v0]); mete([PB.u1, PB.v1]);
        z1 = 2;
      } else if (ap === 'vivienda' && MOD) {
        MOD.cajas.forEach(function (r) { mete(r); });
        z1 = MOD.z0 + 8 * MOD.alto;
      } else return [S.u0, S.u1, S.v0, S.v1, 0, 14];
      return [Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs), Math.max.apply(null, vs), z0, z1];
    }
    // Encuadres base: vbC el contexto (también da la escala de rótulos y
    // trazos), vbS el sitio; en un apartado, vbS es su caja y no se aleja.
    function encuadres() {
      vbC = cajaVista(U0, U1, V0, V1, 24, 30 * B, 1);
      if (capas.sol) vbS = cajaVista(CEN[0] - R_SOL, CEN[0] + R_SOL, CEN[1] - R_SOL, CEN[1] + R_SOL, R_SOL, 0, 1.08);
      else if (GENERAL) vbS = cajaVista(S.u0, S.u1, S.v0, S.v1, MOD ? MOD.z0 + 8 * MOD.alto : 14, 0, 1.1);
      else { var c = cajaAp(ESC); vbS = cajaVista(c[0], c[1], c[2], c[3], c[5], 0, 1.3, c[4]); }
    }

    var capas = { flujos: false, arboles: false, personas: false, modulos: !!MOD, paisaje: !!PAI, estructura: false, sol: false }, ultimoMs = 0, xAct = -1, azAct = -1, elAct = -1, vbC, vbS;
    raiz.classList.toggle('con-modulos', capas.modulos);
    raiz.classList.toggle('con-paisaje', capas.paisaje);

    /* Zoom del usuario sobre el encuadre de la vista (rueda, pellizco, botones):
       uz = aumento; (ux, uy) = corrimiento del centro, en anchos del encuadre base. */
    var base = null, uz = 1, ux = 0, uy = 0, UZ_MAX = 12;
    function marcoBase(x) {
      var w = vbS[2] * Math.pow(vbC[2] / vbS[2], x);
      var g = (w - vbS[2]) / (vbC[2] - vbS[2]);
      return { cx: vbS[0] + vbS[2] / 2 + (vbC[0] + vbC[2] / 2 - vbS[0] - vbS[2] / 2) * g,
        cy: vbS[1] + vbS[3] / 2 + (vbC[1] + vbC[3] / 2 - vbS[1] - vbS[3] / 2) * g, w: w };
    }
    var MARGEN = 0.3;   // lo que el dibujo puede salirse del cuadro al moverlo
    function limita() {
      if (uz < 1) uz = 1;
      var mx = 0.5 - 0.5 / uz + MARGEN, my = mx / ASP;
      ux = Math.max(-mx, Math.min(mx, ux)); uy = Math.max(-my, Math.min(my, uy));
    }
    function aplica() {
      var w = base.w / uz, h = w / ASP;
      marco = [base.cx + ux * base.w - w / 2, base.cy + uy * base.w - h / 2, w, h];
      zoom = w / vbC[2];
      svg.setAttribute('viewBox', marco.map(n1).join(' '));
      escalaPatrones();
      alZoom.forEach(function (f) { f(); });
      if (capas.flujos) { pintaFlechas(); pintaCarros(ultimoMs); }
    }
    // f: factor (>1 acerca); (fx, fy): punto fijo, en fracciones del cuadro
    function acerca(f, fx, fy) {
      if (fx === undefined) { fx = 0.5; fy = 0.5; }
      var px = marco[0] + fx * marco[2], py = marco[1] + fy * marco[3];
      uz = Math.max(1, Math.min(UZ_MAX, uz * f));
      var w = base.w / uz, h = w / ASP;
      ux = (px - (fx - 0.5) * w - base.cx) / base.w;
      uy = (py - (fy - 0.5) * h - base.cy) / base.w;
      limita(); aplica();
    }
    function mueve(dfx, dfy) {   // arrastre, en fracciones del cuadro
      ux -= dfx / uz; uy -= dfy / (uz * ASP);
      limita(); aplica();
    }
    function reencuadra() { uz = 1; ux = uy = 0; if (base) aplica(); }
    function aspecto(a) {   // proporción del lienzo: el encuadre la llena
      if (!a || Math.abs(a - ASP) < 0.01) return;
      ASP = a;
      if (!vbC) return;
      encuadres();
      base = marcoBase(xAct); limita(); aplica();
    }

    function pintaFlechas() {
      var ds = '', dc = '';
      CARRILES.forEach(function (c) {
        if (c.ctx && (zoom < 0.4 || !ctxVisible)) return;
        var esc = c.ctx ? Math.max(1, 2.6 * zoom) : 1, paso = c.ctx ? 70 : 24;
        for (var s = paso * 0.5; s < c.L - 3; s += paso) {
          var r = enCarril(c, s), d = [r[2], r[3]], nx = -d[1], ny = d[0], a = 1.4 * esc, b = 1.0 * esc;
          var t = camino([[r[0] - d[0] * a + nx * b, r[1] - d[1] * a + ny * b], [r[0] + d[0] * a, r[1] + d[1] * a], [r[0] - d[0] * a - nx * b, r[1] - d[1] * a - ny * b]], 0.25, true);
          if (c.ctx) dc += t; else ds += t;
        }
      });
      gfl.s.setAttribute('d', ds); gfl.c.setAttribute('d', dc);
    }
    function pintaCarros(ms) {
      var t = ms / 1000, ver = zoom > 0.4 && ctxVisible;
      CARRILES.forEach(function (c) {
        var esc = c.ctx ? Math.max(1, 2.6 * zoom) : 1;
        c.autos.forEach(function (au) {
          if (c.ctx && !ver) { if (au.el.style.display !== 'none') au.el.style.display = 'none'; return; }
          var r = enCarril(c, au.s0 + au.vel * 1.6 * t);
          var i = Math.round(Math.atan2(r[3], r[2]) / (2 * Math.PI) * 16 + 16) % 16;
          if (au.i !== i) { au.cu.setAttribute('d', carrosSym[i][0].getAttribute('d')); au.ca.setAttribute('d', carrosSym[i][1].getAttribute('d')); au.i = i; }
          au.el.style.display = '';
          au.el.setAttribute('transform', 'translate(' + n1(X(r[0], r[1])) + ' ' + n1(Y(r[0], r[1], 0)) + ') scale(' + (K * esc).toFixed(3) + ')');
        });
      });
    }

    // x: 0 sitio → 1 contexto; az: azimut; el: altura de la cámara (°)
    function vista(x, az, el) {
      x = GENERAL ? Math.max(0, Math.min(1, x)) : 0;
      if (az === undefined) az = AZ;
      if (el === undefined) el = EL;
      var gira = az !== azAct || el !== elAct;
      if (!gira && x === xAct) return;
      if (gira) {
        camara(az, el); azAct = az; elAct = el;
        encuadres();
      }
      xAct = x;
      base = marcoBase(x);
      zoom = base.w / uz / vbC[2];
      // sin el contexto armado no se ve nada de él (lo arma preparaContexto)
      var o = ctxListo ? Math.max(0, Math.min(1, (x - 0.25) / 0.5)) : 0;
      o = o * o * (3 - 2 * o);
      raiz.style.setProperty('--ctx', o.toFixed(3));
      raiz.classList.toggle('sin-ctx', o === 0);
      raiz.classList.toggle('con-ctx', o === 1);
      var antes = ctxVisible;
      ctxVisible = o > 0;
      if (gira) {
        rehaceCarros(); CARRILES.forEach(function (c) { c.autos.forEach(function (au) { au.i = -1; }); });
        redibuja(); ordena(); pintaFiguras();
        objs.forEach(function (ob) {
          if (ob.pieza) pintaPieza(ob); else if (ob.cultura) pintaCultura(ob); else if (ob.est) pintaEst(ob);
          else if (ob.plantas) { if (capas.paisaje) { pintaPlantas(ob); ob.cam = CAM; } else ob.cam = null; }
          else if (ob.columna) pintaColumna(ob); else if (ob.lz) pintaAnillo(ob);
        });
        // sólo los módulos que están en el dibujo; los demás se pintan al entrar
        MODS.forEach(function (o) { if (o.dentro && o.cam !== CAM) pintaModulo(o); });
        if (capas.personas && tPers >= 0) camina(tPers * 1000);
        if (capas.sol) pintaSol();
      }
      else if (ctxVisible && !antes) { if (ctxSucio) redibuja(); ordena(); }
      aplica();
    }
    function fluye(ms) {
      ultimoMs = ms;
      if (capas.flujos) pintaCarros(ms);
    }
    function capa(nombre, si) {
      var era = capas[nombre];
      capas[nombre] = !!si;
      if (nombre === 'sol') {
        raiz.classList.toggle('con-sol', capas.sol);
        if (era === capas.sol || !vbC) return;
        if (capas.sol) pintaSol();
        // la cámara se aleja (o regresa) al encuadre con la bóveda
        var de = marco.slice();
        encuadres(); base = marcoBase(xAct); uz = 1; ux = uy = 0;
        var w = base.w, h = w / ASP, a = [base.cx - w / 2, base.cy - h / 2, w, h];
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) aplica(); else vuela(de, a, 900, aplica);
        return;
      }
      if (nombre === 'flujos') {
        gf.classList.toggle('is-on', capas.flujos);
        if (capas.flujos) { pintaFlechas(); pintaCarros(ultimoMs); }
      }
      raiz.classList.toggle('con-' + nombre, capas[nombre]);
      if (si && (nombre === 'paisaje' || nombre === 'estructura')) objs.forEach(function (o) {
        if (o.cam === CAM) return;
        if (o.plantas && nombre === 'paisaje') { pintaPlantas(o); o.cam = CAM; }
        if (o.columna && nombre === 'estructura') pintaColumna(o);
      });
      if (nombre === 'modulos' || nombre === 'personas' || nombre === 'inmediato' || nombre === 'paisaje' || nombre === 'estructura') ordena();
      if (nombre === 'personas' && si) { tPers = -1; camina(ultimoMs || performance.now()); }
    }
    // Programa resaltado: 'modulos' (cada tipología con su color) o una
    // tipología ('modulos44'…), 'comercio' o una nave ('nave-sur', 'nave-norte'),
    // 'industria'. Lo elegido toma su color y el resto del programa queda gris.
    // null: ninguno.
    function seleccion(t) {
      raiz.classList.toggle('con-sel', !!t);
      if (t) raiz.setAttribute('data-resalta', t); else raiz.removeAttribute('data-resalta');
    }
    // Espacio: 'publico' (planta baja libre, naves, anillo) o 'privado'
    // (vivienda, industria): eso se colorea y lo otro casi desaparece. null: nada.
    function espacio(e) {
      raiz.classList.toggle('ver-publico', e === 'publico');
      raiz.classList.toggle('ver-privado', e === 'privado');
    }
    function suelo(si) { raiz.classList.toggle('con-suelo', !!si); }


    /* ---------- Animación entre apartados ----------
       Es el corte entre una página y otra, como un video: dura lo que tarda en
       armarse la escena nueva, y mientras corre la página no deja mover la
       cámara ni hacer zoom.
       desarma(ap): todo (menos el apartado ap, si se va a él) se levanta y se
         desvanece, primero lo de arriba; la cámara vuela a la caja de ap.
       arma(desde): la escena ya está construida; sus piezas caen a su lugar de
         abajo hacia arriba y de atrás hacia adelante: el piso y el paisaje, las
         columnas, las naves y el anillo, y los módulos nivel por nivel. Los
         sótanos bajan desde la planta baja uno tras otro. Si se llega de un
         apartado (desde), éste ya está y la cámara se abre desde su caja.
       El piso del sitio (tierra, calles, banquetas, predio) no se mueve: es el
       mismo en todas las escenas y amarra el corte. */
    var muerto = false, animando = null;
    function marcoDe(caja) {
      var v = cajaVista(caja[0], caja[1], caja[2], caja[3], caja[5], 0, 1.3, caja[4]);
      return [v[0], v[1], v[2], v[3]];
    }
    function vuela(de, a, dur, listo) {
      var t0 = performance.now();
      function suave(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function paso(ms) {
        if (muerto) return;
        var t = Math.min(1, Math.max(0, (ms - t0) / dur)), k = suave(t), w = de[2] * Math.pow(a[2] / de[2], k);
        var g = Math.abs(a[2] - de[2]) < 1e-6 ? k : (w - de[2]) / (a[2] - de[2]);
        var cx = de[0] + de[2] / 2 + (a[0] + a[2] / 2 - de[0] - de[2] / 2) * g, cy = de[1] + de[3] / 2 + (a[1] + a[3] / 2 - de[1] - de[3] / 2) * g;
        marco = [cx - w / 2, cy - w / ASP / 2, w, w / ASP];
        zoom = w / vbC[2];
        svg.setAttribute('viewBox', marco.map(n1).join(' '));
        escalaPatrones();
        alZoom.forEach(function (f) { f(); });
        if (t < 1) requestAnimationFrame(paso); else if (listo) listo();
      }
      requestAnimationFrame(paso);
    }
    var BASE = /\bad-(tierra|arroyo|banqueta|guarnicion|predio)\b/;
    // Las piezas que se mueven: { g, z (0 abajo … 1 arriba), k (0 cerca … 1 lejos), dy (de dónde arranca, opcional), orden (opcional) }
    function piezas(queda) {
      var porG = new Map(), r = [], ks = [];
      objs.forEach(function (o) { porG.set(o.g, o); });
      MODS.forEach(function (o) { if (o.g) porG.set(o.g, o); });
      function mete(g, o) {
        if (queda && g.classList.contains('ad-ap--' + queda)) return;
        var z = o && o.z > 0 ? Math.min(1, o.z / 32) : o && o.anillo !== undefined ? 0.3 : 0, k = o ? hondo(o.u, o.v) : hondo(CEN[0], CEN[1]);
        r.push({ g: g, z: z, k: k }); ks.push(k);
      }
      [].forEach.call(gs.children, function (g) { if (!BASE.test(g.getAttribute('class') || '')) mete(g, null); });
      [].forEach.call(go.children, function (g) {
        var o = porG.get(g);
        if (o && o.est) {   // estacionamiento: la jaula primero y luego cada sótano, bajando desde la planta baja
          if (queda === 'estacionamiento') return;
          r.push({ g: g.querySelector('.ad-est-comun'), z: 0, k: 0, orden: 0 });
          o.niveles.forEach(function (n, i) { r.push({ g: n.g, z: 0, k: 0, orden: 0.2 + i * 0.2, dy: zSot(i + 1) * cp * K }); });
          return;
        }
        mete(g, o);
      });
      var k0 = Math.min.apply(null, ks.concat([0])), k1 = Math.max.apply(null, ks.concat([1]));
      r.forEach(function (pz) { pz.k = (pz.k - k0) / ((k1 - k0) || 1); });
      return r;
    }
    function limpia(lista) {
      lista.forEach(function (pz) { pz.g.style.transition = ''; pz.g.style.transform = ''; pz.g.style.opacity = ''; });
    }
    function desarma(ap, dur, listo) {
      dur = dur || 650;
      var azar = aleatorio(7), alto = marco[3];
      piezas(GENERAL ? ap : null).forEach(function (pz) {
        var orden = 0.7 * (1 - pz.z) + 0.3 * azar(), r = orden * dur * 0.4, d = dur * 0.6;
        pz.g.style.transition = 'transform ' + d + 'ms cubic-bezier(.55,0,.8,.35) ' + r + 'ms, opacity ' + (d * 0.55) + 'ms linear ' + (r + d * 0.45) + 'ms';
        pz.g.style.transform = 'translate(0px,' + n1(-alto * (0.4 + 0.35 * pz.z)) + 'px)';
        pz.g.style.opacity = '0';
      });
      raiz.classList.add('se-va');
      if (ap && GENERAL) vuela(marco.slice(), marcoDe(cajaAp(ap)), dur, listo);
      else setTimeout(function () { if (listo) listo(); }, dur);
    }
    function arma(desde, dur, listo) {
      dur = dur || 1100;
      var azar = aleatorio(3), lista = piezas(desde), alto = marco[3];
      raiz.classList.add('llega');
      lista.forEach(function (pz) {
        pz.g.style.transition = 'none';
        pz.g.style.transform = 'translate(0px,' + n1(pz.dy !== undefined ? pz.dy : -alto * (0.22 + 0.25 * pz.z)) + 'px)';
        pz.g.style.opacity = '0';
      });
      void svg.getBoundingClientRect();
      lista.forEach(function (pz) {
        var orden = pz.orden !== undefined ? pz.orden : 0.72 * pz.z + 0.2 * pz.k + 0.08 * azar();
        var r = orden * dur * 0.6, d = dur * 0.4;
        pz.g.style.transition = 'transform ' + d + 'ms cubic-bezier(.2,.75,.3,1) ' + r + 'ms, opacity ' + (d * 0.45) + 'ms linear ' + r + 'ms';
        pz.g.style.transform = '';
        pz.g.style.opacity = '';
      });
      requestAnimationFrame(function () { raiz.classList.remove('llega'); });
      if (desde && GENERAL) vuela(marcoDe(cajaAp(desde)), marco.slice(), dur * 0.8);
      clearTimeout(animando);
      // al terminar se limpian los estilos (la opacidad de las clases vuelve a mandar)
      animando = setTimeout(function () { limpia(lista); if (listo && !muerto) listo(); }, dur + 40);
    }
    function destruye() {
      muerto = true;
      clearTimeout(animando);
      if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
      [].forEach.call(svg.querySelectorAll('defs'), function (d) { d.parentNode.removeChild(d); });
    }
    // el apartado de lo que está bajo el cursor (o null)
    function apartadoEn(t) {   // t: un elemento o un evento del ratón
      if (t && !t.closest && t.clientX !== undefined) t = document.elementFromPoint(t.clientX, t.clientY);
      var g = t && t.closest ? t.closest('[data-ap]') : null;
      return g ? g.getAttribute('data-ap') : null;
    }
    // Estacionamiento: sótano resaltado (0 = todos) y niveles separados
    function sotano(n) { ESTA.nivel = n; if (objEst) pintaEst(objEst); }
    function separa(si) {
      ESTA.separa = !!si;
      if (!objEst) return;
      encuadres(); base = marcoBase(xAct); limita(); aplica();
      pintaEst(objEst);
    }

    vista(0, AZ);
    return { vista: vista, solea: solea, preparaContexto: preparaContexto, desarma: desarma, arma: arma, destruye: destruye, apartadoEn: apartadoEn, sotano: sotano, separa: separa,
      elevacion: function () { return EL; }, limitesElevacion: [EL_MIN, EL_MAX], escena: ESC, fluye: fluye, capa: capa, suelo: suelo, minimapa: minimapa, precarga: precarga, camina: camina, seleccion: seleccion, espacio: espacio,
      tipos: MOD ? MOD.tipos : [], acerca: acerca, mueve: mueve, reencuadra: reencuadra, aspecto: aspecto,
      aumento: function () { return uz; }, azimut: function () { return AZ; } };
  }

  window.AtlampaContexto = { crea: crea,
    // datos y cálculos del sitio, para el motor 3D (atlampa-3d.js)
    geo: { D: D, PB: PB, GU: GU, GF: GF, S: S, HE: HE, CEN: CEN, NAVES: NAVES, PIEZAS: PIEZAS, ANILLO: ANILLO, CORTE: CORTE, COLUMNAS: COLUMNAS,
      ESPUELA: ESPUELA, ESP_FIN: ESP_FIN, CULTURA: CULTURA, PLAZA_C: PLAZA_C, GIRO: GIRO, MOD: MOD, EST: EST, PAI: PAI, MEX: MEX, MEY: MEY, LUZ: LUZ,
      pares: pares, rect: rect, minimapa: minimapa, orilla: orilla, circulo: circulo, antihorario: antihorario, cortaU: cortaU, menosCirculo: menosCirculo, dentro: dentro,
      enEdificio: enEdificio, plantasDe: plantasDe, arbolesPai: arbolesPai, laguna: laguna, solEn: solEn, diaDelAno: diaDelAno, aleatorio: aleatorio } };
})();

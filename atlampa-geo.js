/* ============================================================
   ATLAMPA — datos y cálculos del sitio
   Lo que comparten el motor 3D (atlampa-3d.js) y sus extras: las medidas
   del sitio y del proyecto, las naves cortadas por el aro, el paisaje (la
   laguna, las plantas y los árboles), la posición del sol y el minimapa.
   Sale de lo que era el motor SVG (atlampa-contexto.js, ya retirado: el
   visor es todo 3D). Expone window.AtlampaGeo.

   El modelo está girado 9.96°: u corre a lo largo de Clavel y Eulalia
   Guzmán, v a lo largo de Fresno y Sabino. Medidas del sitio de la imagen
   satelital rectificada (±1 m); naves y aro de Contexto.3dm; módulos de
   nuevos bloques.3dm (atlampa-modulos.js); estacionamiento
   (atlampa-estacionamiento.js); paisaje y columnas (atlampa-paisaje.js).
   ============================================================ */
(function () {
  'use strict';

  var D = window.ATLAMPA_DATOS;

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
  /* La deformación del aro (el «chipote» del concepto de arte y cultura,
     ../arte_y_cultura_concepto.html: BULGE th 138°, w 58°, b 10 m sobre R0
     38.27): el eje del aro se abre hacia afuera con un perfil cos², b metros
     en th y nada a ±w grados; el ancho de la losa no cambia (se corre en
     radio). Escalada a este aro: b × (radio medio / 38.27); los ángulos no
     cambian. */
  var BULTO = { th: 138, w: 58, b: 10 * ((ANILLO.ri + ANILLO.re) / 2) / 38.27 };
  function bulto(t) {   // t en grados → cuánto se abre el aro (m)
    var d = ((t - BULTO.th) % 360 + 540) % 360 - 180;
    if (Math.abs(d) >= BULTO.w) return 0;
    var c = Math.cos(Math.PI / 2 * d / BULTO.w);
    return BULTO.b * c * c;
  }
  function aroPunto(t, r) { var R = r + bulto(t), a = t * Math.PI / 180; return [ANILLO.u + Math.cos(a) * R, ANILLO.v + Math.sin(a) * R]; }
  function aroPoli(r, n) { var p = []; for (var i = 0; i < n; i++) p.push(aroPunto(i / n * 360, r)); return p; }
  // el radio «sin chipote» de un punto: se compara con ri / re como si el aro fuera un círculo
  function radioAro(u, v) { var t = Math.atan2(v - ANILLO.v, u - ANILLO.u) * 180 / Math.PI; return Math.hypot(u - ANILLO.u, v - ANILLO.v) - bulto(t); }
  var COLUMNAS = pares([532.1, 379.6, 539.9, 389.2, 541.9, 425.0, 469.6, 393.1, 476.3, 382.7, 485.9, 374.9, 497.4, 370.4, 509.7, 369.7,
    521.7, 372.9, 535.2, 435.4, 525.6, 443.2, 514.1, 447.7, 489.8, 445.2, 479.4, 438.5, 471.6, 428.9, 467.1, 417.4,
    536.8, 374.4, 545.9, 385.7, 548.3, 427.9, 463.2, 390.3, 471.1, 378.0, 482.4, 368.8, 495.9, 363.6, 510.5, 362.8,
    524.5, 366.5, 540.4, 440.1, 529.1, 449.3, 515.5, 454.5, 501.0, 455.3, 486.9, 451.6, 474.7, 443.7, 465.5, 432.4, 460.3, 418.9])
    .map(function (c) { var t = Math.atan2(c[1] - ANILLO.v, c[0] - ANILLO.u) * 180 / Math.PI; return aroPunto(t, Math.hypot(c[0] - ANILLO.u, c[1] - ANILLO.v)); });   // siguen al chipote
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

  /* ---------- Datos ---------- */
  function pares(a, desde) { var r = []; for (var i = desde || 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; }
  function antihorario(poli) {
    var s = 0;
    for (var i = 0, n = poli.length; i < n; i++) { var a = poli[i], b = poli[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; }
    return s < 0 ? poli.slice().reverse() : poli;
  }
  function rect(u0, v0, u1, v1) { return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; }
  function circulo(c, r, n) { var a = []; for (var i = 0; i < n; i++) { var t = i / n * 2 * Math.PI; a.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); } return a; }

  function aleatorio(semilla) { return function () { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }; }
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, at, padre) {   // (para el minimapa, que es un SVG chico)
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (padre) padre.appendChild(e);
    return e;
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
    var ra = radioAro(u, v);
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
     ángulo de vista. Hace de brújula: picarlo nortea la vista (atlampa-pagina.js). */
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
    el('path', { class: 'ad-mini-anillo', d: 'M' + aroPoli((ANILLO.ri + ANILLO.re) / 2, 90).map(function (q) { q = aMini(q[0], q[1]); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z',
      'stroke-width': ((ANILLO.re - ANILLO.ri) * ESC).toFixed(1) }, m);
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
      m.setAttribute('aria-label', 'Brújula (cámara al ' + rumbo(az) + ' del predio): nortear la vista');
    }
    function rumbo(az) {   // dónde está la cámara respecto al predio, en rumbos verdaderos
      var a = az * Math.PI / 180, cu = -Math.sin(a), cv = -Math.cos(a);
      var gx = cu * cg + cv * sg, gy = -cu * sg + cv * cg, b = (Math.atan2(gx, gy) * 180 / Math.PI + 360) % 360;
      return ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(b / 45) % 8];
    }
    return pon;
  }

  window.AtlampaGeo = { D: D, PB: PB, GU: GU, GF: GF, S: S, HE: HE, CEN: CEN, NAVES: NAVES, PIEZAS: PIEZAS, ANILLO: ANILLO, CORTE: CORTE, COLUMNAS: COLUMNAS, BULTO: BULTO, bulto: bulto, aroPunto: aroPunto, aroPoli: aroPoli, radioAro: radioAro,
    ESPUELA: ESPUELA, ESP_FIN: ESP_FIN, CULTURA: CULTURA, PLAZA_C: PLAZA_C, GIRO: GIRO, MOD: MOD, EST: EST, PAI: PAI, MEX: MEX, MEY: MEY, LUZ: LUZ,
    pares: pares, rect: rect, minimapa: minimapa, orilla: orilla, circulo: circulo, antihorario: antihorario, cortaU: cortaU, menosCirculo: menosCirculo,
    dentro: dentro, enEdificio: enEdificio, plantasDe: plantasDe, arbolesPai: arbolesPai, laguna: laguna, solEn: solEn, diaDelAno: diaDelAno, aleatorio: aleatorio };
})();

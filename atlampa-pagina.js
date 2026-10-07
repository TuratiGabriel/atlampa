/* ============================================================
   ATLAMPA — conexión de la página con el dibujo
   Capas que se prenden y se apagan con un clic en su nombre:
     Contexto  la cámara se aleja del predio a todo el contexto;
     Flujos    carros y flechas con el sentido de cada calle;
     Árboles   los árboles de la planta baja (sólo de cerca: se apagan
               con el contexto y prenderlos acerca la cámara).
   Con una capa prendida, los botones de las demás bajan la opacidad.
   Minimapa: arrastrar el punto gira la cámara alrededor del predio; la
   cámara lo sigue despacio (un punto hueco marca a dónde va) para que los
   módulos de cada sector nuevo se armen mientras gira.
   Un solo bucle rAF: corre mientras la cámara viaja, gira o los carros
   circulan, y se detiene solo. Con movimiento reducido, la cámara salta
   y los carros se quedan quietos.
   Módulos (prendida de inicio): un solo color. Espacio: Público / Privado.
   Programa: menús de Módulos, Comercio e Industria que colorean lo elegido.
   Zoom con la rueda, el pellizco o los botones; arrastrar mueve.
   #contexto, #flujos, #arboles, #personas, #color, #sinmodulos, #sel=modulos88, #publico,
   #privado y #az=135 en la dirección (para capturas).
   ============================================================ */
(function () {
  'use strict';

  var svg = document.querySelector('[data-dibujo]');
  if (!svg || !window.AtlampaContexto) return;
  var dib = window.AtlampaContexto.crea(svg);
  window.AtlampaVista = dib;   // para capturas y frames clave desde la consola
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --k: unidades del viewBox por píxel; con el dibujo chico se ocultan los rótulos menores
  function escala() {
    var ancho = svg.getBoundingClientRect().width;
    if (!ancho) return;
    svg.style.setProperty('--k', (svg.viewBox.baseVal.width / ancho).toFixed(3));
    svg.classList.toggle('es-chico', ancho < 700);
  }

  /* ---------- Bucle ---------- */
  var x = 0, desde = 0, hacia = 0, t0 = 0, DUR = 1600;
  var az = dib.azimut(), azMeta = az, msAnt = 0;
  // Giro lento: la cámara alcanza al punto del minimapa con inercia y a lo más
  // VEL grados por segundo, así los módulos de cada sector nuevo se arman y se
  // pintan mientras gira, sin saltos.
  var VEL = 40, TAU = 0.35;
  var flujos = false, personas = false, visible = true, corriendo = false;
  function suave(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function cuadro(ms) {
    var cambia = false, dt = msAnt ? Math.min(0.1, (ms - msAnt) / 1000) : 1 / 60;
    msAnt = ms;
    if (x !== hacia) {
      var t = Math.min(1, (ms - t0) / DUR);
      x = t >= 1 ? hacia : desde + (hacia - desde) * suave(t);
      cambia = true;
    }
    if (az !== azMeta) {
      var d = azMeta - az, paso = d * (1 - Math.exp(-dt / TAU));
      paso = Math.max(-VEL * dt, Math.min(VEL * dt, paso));
      az = Math.abs(d) < 0.15 || quieto.matches ? azMeta : az + paso;
      cambia = true;
      if (az === azMeta) ocioso();
    }
    if (cambia) { dib.vista(x, az); escala(); if (ponMini) ponMini(az, azMeta); }
    if (flujos && !quieto.matches) dib.fluye(ms);
    if (personas && !quieto.matches) dib.camina(ms);
    corriendo = visible && (x !== hacia || az !== azMeta || ((flujos || personas) && !quieto.matches));
    if (corriendo) requestAnimationFrame(cuadro);
    else msAnt = 0;
  }
  // con la cámara quieta, arma de antemano los módulos de los sectores vecinos
  function ocioso() {
    if (window.requestIdleCallback) requestIdleCallback(function () { dib.precarga(); }, { timeout: 1500 });
    else setTimeout(function () { dib.precarga(); }, 200);
  }
  function arranca() {
    if (!corriendo && visible) { corriendo = true; requestAnimationFrame(cuadro); }
  }

  /* ---------- Minimapa ---------- */
  var mini = document.querySelector('[data-minimapa]'), ponMini = null;
  if (mini) {
    ponMini = dib.minimapa(mini, function (nuevo, suma) {
      // con el teclado se suma al giro en camino; al arrastrar, el camino más
      // corto alrededor del círculo
      if (suma) azMeta += suma;
      else azMeta += ((nuevo - azMeta) % 360 + 540) % 360 - 180;
      ponMini(az, azMeta);
      arranca();
    });
    ponMini(az);
    ocioso();
  }

  /* ---------- Capas ---------- */
  var gCapas = document.querySelector('.ad-capas');
  function marca(b, si) {
    b.setAttribute('aria-pressed', String(si));
    // Módulos (prendido de inicio) y Color son modos: no bajan la opacidad de los demás
    gCapas.classList.toggle('hay-activa', !!gCapas.querySelector('[aria-pressed="true"]:not([data-capa="modulos"]):not([data-capa="color"])'));
  }
  // Los árboles son sólo del acercamiento: al alejarse se apagan y al volver
  // regresan como estaban.
  var arbolesAntes = false;
  function prendida(n) { return gCapas.querySelector('[data-capa="' + n + '"]').getAttribute('aria-pressed') === 'true'; }
  function ponContexto(si, inmediato) {
    if (si) { arbolesAntes = prendida('arboles'); if (arbolesAntes) ponCapa('arboles', false); }
    else if (arbolesAntes) { arbolesAntes = false; ponCapa('arboles', true); }
    marca(gCapas.querySelector('[data-capa="contexto"]'), si);
    dib.reencuadra();
    desde = x; hacia = si ? 1 : 0; t0 = performance.now();
    if (inmediato || quieto.matches) { x = hacia; dib.vista(x, az); escala(); }
    arranca();
  }
  function ponCapa(nombre, si) {
    marca(gCapas.querySelector('[data-capa="' + nombre + '"]'), si);
    dib.capa(nombre, si);
    if (nombre === 'flujos') { flujos = si; dib.fluye(performance.now()); arranca(); }
    if (nombre === 'personas') { personas = si; arranca(); }
    if (nombre === 'color') document.body.classList.toggle('con-color', si);   // la leyenda también
    if (nombre === 'modulos' && !si && selAct && /^(modulos|44SOC)/.test(selAct)) ponSel(null);
  }
  [].forEach.call(gCapas.querySelectorAll('[data-capa]'), function (b) {
    b.addEventListener('click', function () {
      var n = b.getAttribute('data-capa'), si = b.getAttribute('aria-pressed') !== 'true';
      if (n === 'contexto') ponContexto(si);
      else {
        // prender los árboles desde el contexto acerca la cámara al predio
        if (n === 'arboles' && si && prendida('contexto')) { arbolesAntes = false; ponContexto(false); }
        ponCapa(n, si);
      }
    });
  });

  /* ---------- Espacio y programa ----------
     Espacio: Público (planta baja libre, naves, anillo) o Privado (vivienda,
     industria); uno a la vez. Programa: un menú por tipología (Módulos,
     Comercio, Industria); lo elegido se colorea y el resto del programa queda
     gris. Otro clic lo suelta. Elegir en uno suelta lo del otro. */
  var selAct = null, espAct = null;
  function marcaGrupo(attr, val) {
    [].forEach.call(document.querySelectorAll('[' + attr + ']'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)); });
  }
  function ponSel(t) {
    selAct = t;
    dib.seleccion(t);
    marcaGrupo('data-sel', t);
    var pr = document.querySelector('[data-programa]');
    if (pr) pr.classList.toggle('hay-activa', !!t);
    if (t && espAct) ponEspacio(null);
    // elegir módulos con la capa apagada la prende
    if (t && /^(modulos|44SOC)/.test(t) && !prendida('modulos')) ponCapa('modulos', true);
  }
  function ponEspacio(e) {
    espAct = e;
    dib.espacio(e);
    marcaGrupo('data-espacio', e);
    if (e && selAct) ponSel(null);
  }
  [].forEach.call(document.querySelectorAll('[data-sel]'), function (b) {
    b.addEventListener('click', function () { var t = b.getAttribute('data-sel'); ponSel(selAct === t ? null : t); });
  });
  [].forEach.call(document.querySelectorAll('[data-espacio]'), function (b) {
    b.addEventListener('click', function () { var e = b.getAttribute('data-espacio'); ponEspacio(espAct === e ? null : e); });
  });

  /* ---------- Zoom ----------
     Rueda: acerca hacia el cursor. Arrastrar: mueve (con zoom). Dos dedos:
     pellizco. Doble clic o el botón ⟲: regresa al encuadre. */
  function enCuadro(ev) {
    var r = svg.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height, r];
  }
  function acerca(f, fx, fy) { dib.acerca(f, fx, fy); escala(); svg.classList.toggle('con-zoom', dib.aumento() > 1); }
  svg.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var c = enCuadro(ev), d = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
    acerca(Math.exp(-d * 0.0018), c[0], c[1]);
  }, { passive: false });
  var dedos = {}, pell = 0;
  function distancia() { var k = Object.keys(dedos); return k.length < 2 ? 0 : Math.hypot(dedos[k[0]].x - dedos[k[1]].x, dedos[k[0]].y - dedos[k[1]].y); }
  svg.addEventListener('pointerdown', function (ev) {
    if (ev.button) return;
    dedos[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    svg.setPointerCapture(ev.pointerId);
    pell = distancia();
  });
  svg.addEventListener('pointermove', function (ev) {
    var p = dedos[ev.pointerId];
    if (!p) return;
    var r = svg.getBoundingClientRect(), n = Object.keys(dedos).length;
    if (n === 1) dib.mueve((ev.clientX - p.x) / r.width, (ev.clientY - p.y) / r.height);
    p.x = ev.clientX; p.y = ev.clientY;
    if (n === 2) {
      var d = distancia(), k = Object.keys(dedos), cx = (dedos[k[0]].x + dedos[k[1]].x) / 2, cy = (dedos[k[0]].y + dedos[k[1]].y) / 2;
      if (pell && d) acerca(d / pell, (cx - r.left) / r.width, (cy - r.top) / r.height);
      pell = d;
    }
  });
  function suelta(ev) { delete dedos[ev.pointerId]; pell = distancia(); }
  svg.addEventListener('pointerup', suelta);
  svg.addEventListener('pointercancel', suelta);
  svg.addEventListener('dblclick', function () { dib.reencuadra(); escala(); svg.classList.remove('con-zoom'); });
  [].forEach.call(document.querySelectorAll('[data-zoom]'), function (b) {
    b.addEventListener('click', function () {
      var z = b.getAttribute('data-zoom');
      if (z === '0') { dib.reencuadra(); escala(); svg.classList.remove('con-zoom'); }
      else acerca(z === 'mas' ? 1.5 : 1 / 1.5);
    });
  });

  /* ---------- Visibilidad y tamaño ---------- */
  // el encuadre toma la proporción del lienzo, que llena el espacio de trabajo
  function ajusta() {
    var r = svg.getBoundingClientRect();
    if (r.width && r.height) dib.aspecto(r.width / r.height);
    escala();
  }
  if ('ResizeObserver' in window) new ResizeObserver(ajusta).observe(svg);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; arranca(); }).observe(svg);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; arranca(); });
  window.addEventListener('resize', ajusta);
  if (quieto.addEventListener) quieto.addEventListener('change', function () { dib.fluye(performance.now()); arranca(); });

  var h = location.hash.replace('#', '').split(',');
  var ah = h.filter(function (s) { return /^az=/.test(s); })[0];
  if (ah) { az = azMeta = parseFloat(ah.slice(3)); dib.vista(x, az); if (ponMini) ponMini(az); }
  if (h.indexOf('contexto') >= 0) ponContexto(true, true);
  var xh = h.filter(function (s) { return /^x=/.test(s); })[0];
  if (xh) { x = hacia = Math.max(0, Math.min(1, parseFloat(xh.slice(2)))); dib.vista(x, az); }
  if (h.indexOf('flujos') >= 0) ponCapa('flujos', true);
  if (h.indexOf('arboles') >= 0) ponCapa('arboles', true);
  if (h.indexOf('personas') >= 0) ponCapa('personas', true);
  if (h.indexOf('color') >= 0) ponCapa('color', true);
  if (h.indexOf('sinmodulos') >= 0) ponCapa('modulos', false);
  var th = h.filter(function (s) { return /^sel=/.test(s); })[0];
  if (th) ponSel(th.slice(4));
  if (h.indexOf('publico') >= 0) ponEspacio('publico');
  if (h.indexOf('privado') >= 0) ponEspacio('privado');
  ajusta();
})();

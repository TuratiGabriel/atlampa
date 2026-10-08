/* ============================================================
   ATLAMPA — conexión de cada página con el dibujo
   Sirve a todas las páginas: la general (index.html) y la de cada apartado
   (estacionamiento.html, comercio.html…). La escena sale de
   <body data-escena="…">; sin ella, la general.

   Cámara (como en Rhino; el minimapa sólo indica)
     arrastrar con el botón derecho (o el izquierdo): orbita alrededor de lo
       que se mira; de lado gira, arriba / abajo la altura
     Shift + arrastrar, botón central o dos dedos: mueve
     rueda o pellizco: zoom hacia lo que está bajo el cursor · doble clic: encuadre
     flechas (con el dibujo enfocado): giran y suben la cámara

   Ir de un apartado a otro no recarga la página: el dibujo se desarma (la
   escena vieja se levanta y se va), se trae el HTML del apartado (ya
   precargado) para la cabeza y la columna lateral, se arma la escena nueva y
   cae a su lugar. La dirección cambia (history.pushState), así que cada
   apartado sigue siendo su propia página: se puede abrir directo, recargar o
   regresar con el botón del navegador. Mientras corre la animación no se
   puede mover la cámara, hacer zoom ni picar nada. Si no se puede traer el
   HTML (abierto como archivo), se navega como siempre y la página nueva se
   arma al llegar.

   Tablero (igual en todas las páginas): menús arriba, minimapa en la
   esquina, ficha del apartado.
     Propuesto  Predio completo y cada parte (vivienda, comercio, industria,
                arte y cultura, aro, paisajismo, estacionamiento, estructura);
                picar una abre su submenú: Inspeccionar (va a su apartado; la
                vivienda se resalta y la estructura se prende) y Ocultar /
                Mostrar. La estructura empieza oculta.
     Capas      Paisaje, Sol, Contexto urbano.
     Diagramas  Accesos, Personas, Flujos, Árboles.
     Vista      Color, Perspectiva, Mapa Nolli, Estilo, Resaltar.
     Leyenda    Espuela, Banqueta, Agua.
   Lo prendido y lo oculto no cambian al pasar de un apartado a otro.
   Picar una parte del modelo (o Inspeccionar) abre su apartado; en él
   lo demás del predio queda como referencia tenue. Contexto urbano (sólo en
   la general): la cámara se aleja despacio mientras el contexto se arma en
   tandas, y cuando está listo se va de golpe hasta el contexto entero.
   Un solo bucle rAF: corre mientras algo se mueve y se detiene solo. Con
   movimiento reducido no hay animaciones: la escena cambia de golpe.
   #contexto, #flujos, #arboles, #personas, #color, #sinmodulos,
   #resalta=publico, #estructura, #sol, #az=135, #el=20 en la
   dirección (para capturas).
   ============================================================ */
(function () {
  'use strict';

  var svg = document.querySelector('[data-dibujo]');
  if (!svg || !window.AtlampaGeo) return;
  var PAGINAS = { general: 'index.html', estacionamiento: 'estacionamiento.html', comercio: 'comercio.html',
    industria: 'industria.html', cultura: 'cultura.html', aro: 'aro.html', paisajismo: 'paisajismo.html' };
  var NOMBRES = { estacionamiento: 'Estacionamiento', comercio: 'Comercio', industria: 'Industria', cultura: 'Arte y cultura', aro: 'Aro', paisajismo: 'Paisajismo' };
  var ARMA = 1100, DESARMA = 650;   // ms de la animación entre apartados
  var ESCENA = document.body.getAttribute('data-escena') || 'general', GENERAL = ESCENA === 'general';
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  var trabajo = svg.parentNode, pagina = document.querySelector('.ad-pagina');
  var zona = trabajo;   // ratón, teclado y tamaño: el contenedor (adentro va el SVG o el lienzo 3D)
  zona.tabIndex = 0;
  // El dibujo: atlampa-3d.js (Three.js); los datos del sitio, atlampa-geo.js.
  var VER = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
  var estiloAct = 'rayado', perspAct = true;
  var antesNolli = null, NORTE_ARRIBA = -9.96;   // azimut con el norte arriba (el modelo está girado 9.96°)
  function creaDibujo() {
    var d = window.Atlampa3D.crea(svg, { escena: ESCENA });
    d.estilo(estiloAct); d.perspectiva(perspAct);
    return d;
  }
  var dib = null;

  function guarda(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function lee(k, borra) { try { var v = sessionStorage.getItem(k); if (borra) sessionStorage.removeItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  // --k: unidades del viewBox por píxel; con el dibujo chico se ocultan los rótulos menores
  function escala() {
    var ancho = svg.getBoundingClientRect().width;
    if (!ancho) return;
    svg.style.setProperty('--k', (svg.viewBox.baseVal.width / ancho).toFixed(3));
    svg.classList.toggle('es-chico', ancho < 700);
  }

  /* ---------- Bucle ----------
     x: 0 sitio → 1 contexto, con un recorrido (lista de tramos [hasta, ms, curva]).
     az y el siguen a su meta con inercia; el giro, a lo más VEL °/s, para que
     los módulos de cada sector nuevo se armen mientras gira. */
  var x = 0, tramos = [], tramo = null;
  var cam = lee('atlampa-camara') || {};
  var az = typeof cam.az === 'number' ? cam.az : 20, azMeta = az;
  var el = typeof cam.el === 'number' ? cam.el : 30, elMeta = el;
  var LIM = [6, 70], msAnt = 0;
  var VEL = 40, TAU = 0.35, TAU_EL = 0.09;
  // al arrastrar, la cámara sigue a la mano: más rápida y con menos inercia
  var VEL_MANO = 900, TAU_MANO = 0.06, mano = false;
  var flujos = false, personas = false, sol = false, visible = true, corriendo = false;
  var CURVAS = {
    suave: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    lenta: function (t) { return Math.sin(t * Math.PI / 2); },          // arranca y se va frenando
    golpe: function (t) { return t * t * t; }                             // arranca lento y se va de golpe
  };
  function recorre(lista) { tramos = lista.slice(); tramo = null; arranca(); }
  function cuadro(ms) {
    var cambia = false, dt = msAnt ? Math.min(0.1, (ms - msAnt) / 1000) : 1 / 60;
    msAnt = ms;
    if (yendo) { corriendo = false; msAnt = 0; return; }   // la animación entre apartados manda
    if (!tramo && tramos.length) { var t = tramos.shift(); tramo = { de: x, a: t[0], dur: t[1], f: CURVAS[t[2]], t0: ms, espera: t[3] }; }
    if (tramo) {
      if (tramo.espera && !tramo.espera()) tramo.t0 = ms;            // espera a que algo esté listo
      else {
        var k = Math.min(1, (ms - tramo.t0) / tramo.dur);
        x = tramo.de + (tramo.a - tramo.de) * tramo.f(k);
        cambia = true;
        if (k >= 1) tramo = null;
      }
    }
    if (az !== azMeta) {
      var d = azMeta - az, paso = d * (1 - Math.exp(-dt / (mano ? TAU_MANO : TAU))), vmax = mano ? VEL_MANO : VEL;
      paso = Math.max(-vmax * dt, Math.min(vmax * dt, paso));
      az = Math.abs(d) < 0.15 || quieto.matches ? azMeta : az + paso;
      cambia = true;
      if (az === azMeta) ocioso();
    }
    if (el !== elMeta) {
      var de = elMeta - el;
      el = Math.abs(de) < 0.1 || quieto.matches ? elMeta : el + de * (1 - Math.exp(-dt / TAU_EL));
      cambia = true;
    }
    if (cambia) { dib.vista(x, az, el); escala(); if (ponMini) ponMini(az); }
    if (flujos && !quieto.matches) dib.fluye(ms);
    if (personas && !quieto.matches) dib.camina(ms);
    if (sol && !quieto.matches) dib.solea(ms);
    corriendo = visible && (!!tramo || tramos.length > 0 || az !== azMeta || el !== elMeta || ((flujos || personas || sol) && !quieto.matches));
    if (corriendo) requestAnimationFrame(cuadro);
    else msAnt = 0;
  }
  // con la cámara quieta, arma de antemano los módulos de los sectores vecinos
  function ocioso() {
    if (window.requestIdleCallback) requestIdleCallback(function () { if (dib && !yendo) dib.precarga(); }, { timeout: 1500 });
    else setTimeout(function () { if (dib && !yendo) dib.precarga(); }, 200);
  }
  function arranca() {
    if (!corriendo && visible && !yendo) { corriendo = true; requestAnimationFrame(cuadro); }
  }

  /* ---------- Capas ---------- */
  var ponMini = null, arbolesAntes = false, resAct = '';
  function boton(n) { return document.querySelector('[data-capa="' + n + '"]'); }
  function prendida(n) { var b = boton(n); return !!b && b.getAttribute('aria-pressed') === 'true'; }
  function marca(b, si) {
    if (!b) return;
    b.setAttribute('aria-pressed', String(si));
    // la leyenda muestra sólo lo de las capas prendidas
    var n = b.getAttribute('data-capa');
    if (n) document.body.classList.toggle('sin-' + n, !si);
  }
  // Los árboles son sólo del acercamiento: al alejarse se apagan y al volver
  // regresan como estaban.
  function ponContexto(si, inmediato) {
    if (!GENERAL) return;
    if (si) { arbolesAntes = prendida('arboles'); if (arbolesAntes) ponCapa('arboles', false); }
    else if (arbolesAntes) { arbolesAntes = false; ponCapa('arboles', true); }
    marca(boton('contexto'), si);
    dib.reencuadra();
    var listo = false;
    if (si) dib.preparaContexto(function () { listo = true; });
    if (inmediato || quieto.matches) {
      if (si && !listo) { recorre([[1, 1, 'suave', function () { return listo; }]]); return; }
      x = si ? 1 : 0; tramos = []; tramo = null; dib.vista(x, az, el); escala(); return;
    }
    // Ida: despacio mientras se arma el contexto (en tandas); cuando está
    // listo, de golpe hasta el contexto entero. Vuelta: de un tirón.
    if (si) recorre([[0.12, 850, 'lenta'], [1, 550, 'golpe', function () { return listo; }]]);
    else recorre([[0, 900, 'suave']]);
  }
  function ponCapa(nombre, si) {
    marca(boton(nombre), si);
    if (nombre === 'separa') { dib.separa(si); escala(); return; }
    if (nombre === 'perspectiva') { perspAct = si; if (dib.perspectiva) dib.perspectiva(si); return; }
    // Mapa Nolli: la cámara se va a planta con el norte arriba, y al apagarlo regresa
    if (nombre === 'nolli') {
      if (si && !antesNolli) { antesNolli = { az: azMeta, el: elMeta }; azMeta += ((NORTE_ARRIBA - azMeta) % 360 + 540) % 360 - 180; elMeta = LIM[1]; mano = false; arranca(); }
      else if (!si && antesNolli) { azMeta = antesNolli.az; elMeta = antesNolli.el; antesNolli = null; arranca(); }
    }
    dib.capa(nombre, si);
    if (nombre === 'flujos') { flujos = si; dib.fluye(performance.now()); arranca(); }
    if (nombre === 'personas') { personas = si; arranca(); }
    if (nombre === 'sol') { sol = si; arranca(); }
    if (nombre === 'color') document.body.classList.toggle('con-color', si);   // la leyenda también
  }

  /* ---------- Propuesto: ocultar partes ----------
     ocultos: lo escondido, del tablero (sobrevive al cambiar de apartado).
     La estructura es la capa 'estructura' (empieza oculta). */
  var ocultos = { estructura: true };
  var PARTE_DE = { modulos: 'vivienda' };   // clave de resaltar → clave de ocultar
  function aplicaOculta(ap) {
    var si = !!ocultos[ap];
    if (ap === 'estructura') dib.capa('estructura', !si);
    else dib.oculta(ap, si);
  }
  function ponOculta(ap, si) {
    ocultos[ap] = !!si;
    aplicaOculta(ap);
    // lo que se esconde deja de estar resaltado
    if (si && (PARTE_DE[resAct] || resAct) === ap) ponResalta('');
    marcaPartes();
  }
  // cada parte en el menú: tenue si está oculta; el botón dice lo que hará
  function marcaPartes() {
    [].forEach.call(document.querySelectorAll('[data-parte]'), function (d) {
      var ap = d.getAttribute('data-parte');
      d.classList.toggle('es-oculta', !!ocultos[ap]);
      d.classList.toggle('es-actual', ap === ESCENA);
    });
    [].forEach.call(document.querySelectorAll('[data-oculta]'), function (b) { b.textContent = ocultos[b.getAttribute('data-oculta')] ? 'Mostrar' : 'Ocultar'; });
  }
  function inspecciona(ap) {
    if (ocultos[ap]) ponOculta(ap, false);
    if (ap === 'vivienda') { ponResalta('modulos'); if (!GENERAL) ir('general'); }
    else if (ap === 'estructura') ponResalta('');
    else ir(ap);
  }

  /* ---------- Resaltar ----------
     Uno a la vez: lo público o lo privado (se colorea y lo otro casi
     desaparece), o un programa (vivienda, comercio, arte y cultura,
     industria, aro, paisaje: toma su color y lo demás queda tenue). Resaltar
     algo oculto lo muestra. */
  function ponResalta(v) {
    resAct = v || '';
    var esp = resAct === 'publico' || resAct === 'privado';
    dib.espacio(esp ? resAct : null);
    dib.seleccion(esp || !resAct ? null : resAct);
    [].forEach.call(document.querySelectorAll('[data-resalta]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-resalta') === resAct)); });
    var ap = PARTE_DE[resAct] || resAct;
    if (ocultos[ap]) ponOculta(ap, false);
  }

  /* ---------- Menús ----------
     Desplegables de la barra de arriba (uno abierto a la vez, por el name
     del <details>); se cierran al picar fuera o con Escape. Un solo escucha
     para todos los botones: la ficha del apartado cambia entera. */
  function cierraMenus(salvo) {
    [].forEach.call(document.querySelectorAll('.hud-menu[open]'), function (d) { if (d !== salvo) d.open = false; });
  }
  document.addEventListener('pointerdown', function (ev) { if (!ev.target.closest('.hud-menu')) cierraMenus(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cierraMenus(); });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-capa], [data-resalta], [data-sotano], [data-zoom], [data-ir], [data-estilo], [data-oculta], [data-inspecciona]');
    if (!b || !dib) return;
    if (b.hasAttribute('data-ir')) { ev.preventDefault(); cierraMenus(); ir(b.getAttribute('data-ir')); return; }
    if (yendo) return;
    if (b.hasAttribute('data-oculta')) { var o = b.getAttribute('data-oculta'); ponOculta(o, !ocultos[o]); }
    else if (b.hasAttribute('data-inspecciona')) { cierraMenus(); inspecciona(b.getAttribute('data-inspecciona')); }
    else if (b.hasAttribute('data-capa')) {
      var n = b.getAttribute('data-capa'), si = b.getAttribute('aria-pressed') !== 'true';
      if (n === 'contexto') ponContexto(si);
      else {
        // prender los árboles desde el contexto acerca la cámara al predio
        if (n === 'arboles' && si && prendida('contexto')) { arbolesAntes = false; ponContexto(false); }
        ponCapa(n, si);
      }
    } else if (b.hasAttribute('data-resalta')) { var v = b.getAttribute('data-resalta'); ponResalta(resAct === v ? '' : v); }
    else if (b.hasAttribute('data-estilo')) { estiloAct = b.getAttribute('data-estilo'); if (dib.estilo) dib.estilo(estiloAct); marcaGrupo('data-estilo', estiloAct); }
    else if (b.hasAttribute('data-sotano')) { var s = +b.getAttribute('data-sotano'); dib.sotano(s); marcaGrupo('data-sotano', s); }
    else if (b.hasAttribute('data-zoom')) {
      var z = b.getAttribute('data-zoom');
      if (z === '0') { dib.reencuadra(); escala(); zona.classList.remove('con-zoom'); }
      else acerca(z === 'mas' ? 1.5 : 1 / 1.5);
    }
  });
  function marcaGrupo(attr, val) {
    [].forEach.call(document.querySelectorAll('[' + attr + ']'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val))); });
  }
  // el apartado en el que se está, marcado en el menú
  function marcaApartado() {
    [].forEach.call(document.querySelectorAll('.hud-ir'), function (a) {
      if (a.getAttribute('data-ir') === ESCENA) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    marcaPartes();
  }

  /* ---------- Escena ----------
     monta(): arma el dibujo de la escena actual con lo que esté prendido en
     el tablero (que no cambia de un apartado a otro). */
  function monta() {
    dib = creaDibujo();
    window.AtlampaVista = dib;   // para capturas y frames clave desde la consola
    LIM = dib.limitesElevacion;
    x = 0; tramos = []; tramo = null; flujos = personas = sol = false;
    var mini = document.querySelector('[data-minimapa]');
    ponMini = mini ? dib.minimapa(mini) : null;
    [].forEach.call(document.querySelectorAll('[data-capa]'), function (b) {
      var n = b.getAttribute('data-capa');
      if (n !== 'contexto') ponCapa(n, b.getAttribute('aria-pressed') === 'true');
    });
    [].forEach.call(document.querySelectorAll('[data-parte]'), function (d) { aplicaOculta(d.getAttribute('data-parte')); });
    ponResalta(resAct);
    marcaApartado();
    var r = zona.getBoundingClientRect();
    if (r.width && r.height) dib.aspecto(r.width / r.height);
    dib.vista(0, az, el);
    if (ponMini) ponMini(az);
    escala();
  }

  /* ---------- Ir a otro apartado ---------- */
  var yendo = false, cache = {};
  function traePagina(esc) {
    if (!cache[esc]) cache[esc] = fetch(PAGINAS[esc], { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); });
    cache[esc].catch(function () { delete cache[esc]; });
    return cache[esc];
  }
  function precargaPaginas() {
    if (location.protocol === 'file:') return;
    Object.keys(PAGINAS).forEach(function (k) { if (k !== ESCENA) traePagina(k).catch(function () {}); });
  }
  // la cabeza, la columna lateral y los textos del dibujo, de la otra página
  function cambiaDom(doc, esc) {
    document.title = doc.title;
    document.body.setAttribute('data-escena', esc);
    ['[data-ficha]'].forEach(function (s) {
      var viejo = document.querySelector(s), nuevo = doc.querySelector(s);
      if (viejo && nuevo) viejo.parentNode.replaceChild(document.importNode(nuevo, true), viejo);
    });
    ['#ad-titulo-dibujo', '#ad-desc-dibujo', '[data-ruta]'].forEach(function (s) {
      var a = document.querySelector(s), b = doc.querySelector(s);
      if (a && b) a.textContent = b.textContent;
    });
  }
  function bloquea(si) {
    yendo = si;
    trabajo.classList.toggle('armando', si);
    if (pagina) pagina.classList.toggle('armando', si);
    if (si) { dedos = {}; zona.classList.remove('arrastra'); tooltip(null); }
  }
  function ir(ap, desdeHistoria) {
    if (yendo || !PAGINAS[ap]) return;
    if (ap === ESCENA) return;
    guarda('atlampa-camara', { az: azMeta, el: elMeta });
    if (quieto.matches || location.protocol === 'file:' || !window.fetch || !window.DOMParser) { salta(ap); return; }
    var de = ESCENA, doc = traePagina(ap), listo = false, hecho = false;
    // el contexto urbano es sólo de la general: se apaga al salir
    if (prendida('contexto')) { marca(boton('contexto'), false); if (arbolesAntes) { arbolesAntes = false; marca(boton('arboles'), true); } }
    bloquea(true);
    document.body.classList.add('cambia-pagina');
    function sigue() {
      if (!listo || !hecho) return;
      doc.then(function (d) {
        dib.destruye();
        cambiaDom(d, ap);
        ESCENA = ap; GENERAL = ap === 'general';
        if (!desdeHistoria) history.pushState({ escena: ap }, '', PAGINAS[ap]);
        monta();
        document.body.classList.remove('cambia-pagina');
        dib.arma(GENERAL ? de : null, ARMA, termina);
      });
    }
    doc.then(function () { listo = true; sigue(); }, function () { salta(ap); });
    dib.desarma(GENERAL ? ap : null, DESARMA, function () { hecho = true; sigue(); });
  }
  // sin animación (o sin poder traer la página): se navega como siempre
  function salta(ap) {
    guarda('atlampa-transicion', { de: ESCENA, a: ap });
    var capas = {};
    [].forEach.call(document.querySelectorAll('[data-capa]'), function (b) { capas[b.getAttribute('data-capa')] = b.getAttribute('aria-pressed') === 'true'; });
    guarda('atlampa-tablero', { capas: capas, resalta: resAct, ocultos: ocultos });
    location.href = PAGINAS[ap];
  }
  function termina() {
    bloquea(false);
    ocioso();
    arranca();
    // si el navegador cambió de dirección mientras se armaba
    var esc = escenaDeDireccion();
    if (esc && esc !== ESCENA) ir(esc, true);
  }
  function escenaDeDireccion() {
    var f = location.pathname.split('/').pop() || 'index.html';
    for (var k in PAGINAS) if (PAGINAS[k] === f) return k;
    return null;
  }
  window.addEventListener('popstate', function (ev) {
    var esc = (ev.state && ev.state.escena) || escenaDeDireccion();
    if (esc && esc !== ESCENA && !yendo) ir(esc, true);
  });
  // al volver con el botón del navegador, la página puede venir de la caché a medio desarmar
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) location.reload(); });

  /* ---------- Apartados en el modelo (general): se señalan y se pican ---------- */
  var etiqueta = null;
  function tooltip(ap, ev) {
    if (!etiqueta) { etiqueta = document.createElement('div'); etiqueta.className = 'ad-etiqueta'; etiqueta.setAttribute('aria-hidden', 'true'); trabajo.appendChild(etiqueta); }
    var ok = ap && ap !== ESCENA && PAGINAS[ap] && !yendo;
    etiqueta.style.display = ok ? '' : 'none';
    zona.classList.toggle('sobre-ap', !!ok);
    var ad = svg.querySelector('.ad');
    if (ad) ad.setAttribute('data-sobre', ok ? ap : '');
    if (!ok) return;
    var r = trabajo.getBoundingClientRect();
    etiqueta.textContent = NOMBRES[ap] + ' →';
    etiqueta.style.left = (ev.clientX - r.left + 14) + 'px';
    etiqueta.style.top = (ev.clientY - r.top + 12) + 'px';
  }

  /* ---------- Cámara con el ratón y los dedos ----------
     Arrastrar: orbita (de lado el azimut, arriba / abajo la altura).
     Botón derecho / central o Shift: mueve el dibujo. Dos dedos: pellizco y
     mueve. Un clic sin arrastrar sobre un apartado: lo abre. */
  var GIRO_PX = 0.35, ALTO_PX = 0.22;   // grados por píxel arrastrado
  function enCuadro(ev) {
    var r = zona.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height, r];
  }
  function acerca(f, fx, fy) { dib.acerca(f, fx, fy); escala(); zona.classList.toggle('con-zoom', dib.aumento() > 1); }
  function orbita(dAz, dEl) {
    azMeta += dAz;
    elMeta = Math.max(LIM[0], Math.min(LIM[1], elMeta + dEl));
    arranca();
  }
  zona.addEventListener('wheel', function (ev) {
    if (!dib) return;   // el motor 3D todavía carga
    ev.preventDefault();
    if (yendo) return;
    var c = enCuadro(ev), d = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
    acerca(Math.exp(-d * 0.0018), c[0], c[1]);
  }, { passive: false });
  zona.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  var dedos = {}, pell = 0, modo = null, recorrido = 0;
  function distancia() { var k = Object.keys(dedos); return k.length < 2 ? 0 : Math.hypot(dedos[k[0]].x - dedos[k[1]].x, dedos[k[0]].y - dedos[k[1]].y); }
  zona.addEventListener('pointerdown', function (ev) {
    if (!dib) return;   // el motor 3D todavía carga
    if (yendo) return;
    dedos[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { zona.setPointerCapture(ev.pointerId); } catch (e) { /* puntero que ya no existe */ }
    // como en Rhino: arrastrar (derecho o izquierdo) orbita; Shift o el botón central mueve
    modo = ev.shiftKey || ev.button === 1 ? 'mueve' : 'orbita';
    if (ev.button === 1) ev.preventDefault();   // sin el desplazamiento automático del botón central
    recorrido = 0;
    pell = distancia();
    zona.classList.add('arrastra', 'arrastra--' + modo);
    tooltip(null);
  });
  zona.addEventListener('pointermove', function (ev) {
    if (!dib) return;   // el motor 3D todavía carga
    var p = dedos[ev.pointerId];
    if (!p) { if (ev.pointerType === 'mouse' && !yendo) tooltip(dib.apartadoEn(ev), ev); return; }
    if (yendo) return;
    var r = zona.getBoundingClientRect(), n = Object.keys(dedos).length, dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    recorrido += Math.abs(dx) + Math.abs(dy);
    p.x = ev.clientX; p.y = ev.clientY;
    if (n === 1 && modo === 'mueve') { dib.mueve(dx / r.width, dy / r.height); escala(); }
    else if (n === 1 && recorrido > 3) { mano = true; orbita(-dx * GIRO_PX, dy * ALTO_PX); }
    if (n === 2) {
      var d = distancia(), k = Object.keys(dedos), cx = (dedos[k[0]].x + dedos[k[1]].x) / 2, cy = (dedos[k[0]].y + dedos[k[1]].y) / 2;
      if (pell && d) acerca(d / pell, (cx - r.left) / r.width, (cy - r.top) / r.height);
      dib.mueve(dx / 2 / r.width, dy / 2 / r.height);
      pell = d;
    }
  });
  function suelta(ev) {
    var era = dedos[ev.pointerId], uno = Object.keys(dedos).length === 1;
    delete dedos[ev.pointerId];
    pell = distancia();
    if (!Object.keys(dedos).length) { zona.classList.remove('arrastra', 'arrastra--mueve', 'arrastra--orbita'); mano = false; }
    // un clic (sin arrastrar) sobre un apartado lo abre
    if (era && uno && recorrido < 5 && ev.type === 'pointerup' && ev.button === 0 && !yendo) {
      var ap = dib.apartadoEn(ev);
      if (ap && ap !== ESCENA && PAGINAS[ap]) ir(ap);
    }
  }
  zona.addEventListener('pointerup', suelta);
  zona.addEventListener('pointercancel', suelta);
  zona.addEventListener('pointerleave', function () { if (!Object.keys(dedos).length) tooltip(null); });
  zona.addEventListener('dblclick', function () { if (yendo || !dib) return; dib.reencuadra(); escala(); zona.classList.remove('con-zoom'); });
  // teclado, con el dibujo enfocado: flechas orbitan, + / − acercan, 0 encuadra
  zona.addEventListener('keydown', function (ev) {
    if (!dib) return;   // el motor 3D todavía carga
    if (yendo) return;
    var k = ev.key, hecho = true;
    if (k === 'ArrowLeft') orbita(15, 0);
    else if (k === 'ArrowRight') orbita(-15, 0);
    else if (k === 'ArrowUp') orbita(0, 5);
    else if (k === 'ArrowDown') orbita(0, -5);
    else if (k === '+' || k === '=') acerca(1.25);
    else if (k === '-') acerca(0.8);
    else if (k === '0') { dib.reencuadra(); escala(); zona.classList.remove('con-zoom'); }
    else hecho = false;
    if (hecho) ev.preventDefault();
  });

  /* ---------- Visibilidad y tamaño ---------- */
  // el encuadre toma la proporción del lienzo, que llena el espacio de trabajo
  function ajusta() {
    var r = zona.getBoundingClientRect();
    if (dib && r.width && r.height) dib.aspecto(r.width / r.height);
    escala();
  }
  if ('ResizeObserver' in window) new ResizeObserver(ajusta).observe(zona);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; arranca(); }).observe(zona);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; arranca(); });
  window.addEventListener('resize', ajusta);
  if (quieto.addEventListener) quieto.addEventListener('change', function () { if (dib) dib.fluye(performance.now()); arranca(); });

  /* ---------- Arranque ----------
     Primero se trae atlampa-3d.js (y Three.js, del CDN); si no carga, se avisa. */
  var h = location.hash.replace('#', '').split(',');
  import('./atlampa-3d.js' + (VER ? '?' + VER : '')).then(arranque, function (e) {
    console.error('No cargó el visor 3D:', e);
    var p = document.createElement('p');
    p.className = 'ad-error';
    p.textContent = 'No se pudo cargar el visor 3D (hace falta internet para Three.js, o un navegador con WebGL).';
    trabajo.appendChild(p);
  });
  function arranque() {
  function num(pre) { var s = h.filter(function (v) { return v.indexOf(pre + '=') === 0; })[0]; return s ? parseFloat(s.slice(pre.length + 1)) : null; }
  if (num('az') !== null) az = azMeta = num('az');
  if (num('el') !== null) el = elMeta = num('el');
  // el tablero como se dejó en la página anterior (si se llegó navegando)
  var tab = lee('atlampa-tablero', true);
  if (tab) {
    Object.keys(tab.capas || {}).forEach(function (n) { if (n !== 'contexto') marca(boton(n), tab.capas[n]); });
    resAct = tab.resalta || '';
    if (tab.ocultos) ocultos = tab.ocultos;
  }
  monta();
  if (h.indexOf('contexto') >= 0) ponContexto(true, true);
  ['flujos', 'arboles', 'personas', 'color', 'sol'].forEach(function (n) { if (h.indexOf(n) >= 0) ponCapa(n, true); });
  if (h.indexOf('estructura') >= 0) ponOculta('estructura', false);
  if (h.indexOf('sinmodulos') >= 0) ponOculta('vivienda', true);
  var th = h.filter(function (s) { return /^resalta=/.test(s); })[0];
  if (th) ponResalta(th.slice(8));
  history.replaceState({ escena: ESCENA }, '', location.href);

  // Al abrir la página la escena también se arma (si se llega navegando desde
  // otro apartado, la cámara se abre desde él).
  var tr = lee('atlampa-transicion', true);
  if (quieto.matches || h.indexOf('contexto') >= 0) { termina(); }
  else {
    bloquea(true);
    dib.arma(tr && tr.a === ESCENA && GENERAL ? tr.de : null, ARMA, termina);
  }
  if (window.requestIdleCallback) requestIdleCallback(precargaPaginas, { timeout: 3000 });
  else setTimeout(precargaPaginas, 1500);
  }
})();

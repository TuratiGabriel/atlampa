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
     Diagramas  Accesos, Personas, Flujos, Árboles, Postes.
     Vista      Color, Perspectiva, Mapa Nolli, Estilo, Resaltar.
     Leyenda    Espuela, Banqueta, Agua.
   Lo prendido y lo oculto no cambian al pasar de un apartado a otro.
   Picar una parte del modelo (o Inspeccionar) abre su apartado; en él
   lo demás del predio queda como referencia tenue. Contexto urbano (sólo en
   la general): la cámara se aleja despacio mientras el contexto se arma en
   tandas, y cuando está listo se va de golpe hasta el contexto entero.
   Aislar (doble clic en una parte, o Aislar en Propuesto): se queda sólo ese
   uso (todo lo demás se quita), la vista pasa a axonométrica, se vuelve a
   dibujar a mano y la barra de menús cambia: Partes (cada una se oculta o se
   desplaza; despiece completo), Vista (Color, Perspectiva, Estilo) y Salir
   (o Esc). Un clic en una parte espera un instante por si es doble clic.
   En Comercio, doble clic sobre la nave norte la abre: sólo quedan ella y el
   aro, la cubierta sube y los muros bajan para ver el interior; Esc o doble
   clic en el vacío, todo regresa.
   Las escenas se dibujan como a mano (atlampa-3d.js): al cambiar de apartado
   lo viejo se borra hacia el apartado nuevo, la cámara vuela de un encuadre
   al otro y lo nuevo se traza desde ahí (ya se puede mover mientras).
   Un solo bucle rAF: corre mientras algo se mueve y se detiene solo. Con
   movimiento reducido no hay animaciones: la escena cambia de golpe.
   #contexto, #flujos, #arboles, #postes, #personas, #color, #sinmodulos,
   #resalta=publico, #estructura, #sol, #aisla=comercio, #az=135, #el=20 en la
   dirección (para capturas).
   ============================================================ */
(function () {
  'use strict';

  var svg = document.querySelector('[data-dibujo]');
  if (!svg || !window.AtlampaGeo) return;
  var PAGINAS = { general: 'index.html', estacionamiento: 'estacionamiento.html', comercio: 'comercio.html',
    industria: 'industria.html', cultura: 'cultura.html', aro: 'aro.html', paisajismo: 'paisajismo.html' };
  var NOMBRES = { estacionamiento: 'Estacionamiento', comercio: 'Comercio', industria: 'Industria', cultura: 'Arte y cultura', aro: 'Aro', paisajismo: 'Paisajismo' };
  var ARMA = 1400, DESARMA = 450;   // ms: dibujar la escena nueva y borrar la vieja
  var ESCENA = document.body.getAttribute('data-escena') || 'general', GENERAL = ESCENA === 'general';
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  var trabajo = svg.parentNode, pagina = document.querySelector('.ad-pagina');
  var zona = trabajo;   // ratón, teclado y tamaño: el contenedor (adentro va el SVG o el lienzo 3D)
  zona.tabIndex = 0;
  // El dibujo: atlampa-3d.js (Three.js); los datos del sitio, atlampa-geo.js.
  var VER = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
  var estiloAct = 'clay', perspAct = false;
  var antesNolli = null, NORTE_ARRIBA = -9.96;   // azimut con el norte arriba (el modelo está girado 9.96°)
  function creaDibujo() {
    var d = window.Atlampa3D.crea(svg, { escena: ESCENA, az: azMeta, el: elMeta });
    d.estilo(estiloAct); d.perspectiva(perspAct);
    return d;
  }
  var dib = null;

  function guarda(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function lee(k, borra) { try { var v = sessionStorage.getItem(k); if (borra) sessionStorage.removeItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  var cortes = lee('atlampa-cortes') || { x: 1, y: 1, z: 1 };
  ['x', 'y', 'z'].forEach(function (eje) { if (typeof cortes[eje] !== 'number') cortes[eje] = 1; });

  function reflejaCorte(eje) {
    var t = Math.max(0, Math.min(1, cortes[eje])), s = document.querySelector('[data-corte-eje="' + eje + '"]');
    var o = document.querySelector('[data-corte-valor="' + eje + '"]');
    if (s) s.value = String(Math.round(t * 100));
    if (o) o.textContent = t >= 0.999 ? 'Completo' : Math.round(t * 100) + '%';
  }
  function aplicaCortes() {
    ['x', 'y', 'z'].forEach(function (eje) { reflejaCorte(eje); if (dib && dib.corta) dib.corta(eje, cortes[eje]); });
  }
  function ponCorte(eje, t) {
    cortes[eje] = Math.max(0, Math.min(1, t));
    guarda('atlampa-cortes', cortes);
    reflejaCorte(eje);
    if (dib && dib.corta) dib.corta(eje, cortes[eje]);
  }
  function restableceCortes() {
    cortes = { x: 1, y: 1, z: 1 };
    guarda('atlampa-cortes', cortes);
    aplicaCortes();
  }

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
  var VEL_MANO = 900, TAU_MANO = 0.06, mano = false, rapido = false;   // rapido: un giro pedido (brújula)
  var flujos = false, personas = false, sol = false, infra = false, visible = true, corriendo = false;
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
      var d = azMeta - az, paso = d * (1 - Math.exp(-dt / (mano || rapido ? TAU_MANO : TAU))), vmax = mano || rapido ? VEL_MANO * (rapido ? 0.4 : 1) : VEL;
      paso = Math.max(-vmax * dt, Math.min(vmax * dt, paso));
      az = Math.abs(d) < 0.15 || quieto.matches ? azMeta : az + paso;
      cambia = true;
      if (az === azMeta) { rapido = false; ocioso(); }
    }
    if (el !== elMeta) {
      var de = elMeta - el;
      el = Math.abs(de) < 0.1 || quieto.matches ? elMeta : el + de * (1 - Math.exp(-dt / TAU_EL));
      cambia = true;
    }
    if (cambia) { dib.vista(x, az, el); escala(); if (ponMini) ponMini(az); }
    if ((flujos || infra) && !quieto.matches) dib.fluye(ms);
    if (personas && !quieto.matches) dib.camina(ms);
    if (sol && !quieto.matches) dib.solea(ms);
    corriendo = visible && (!!tramo || tramos.length > 0 || az !== azMeta || el !== elMeta || ((flujos || personas || sol || infra) && !quieto.matches));
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
  var ponMini = null, resAct = '';
  function boton(n) { return document.querySelector('[data-capa="' + n + '"]'); }
  function prendida(n) { var b = boton(n); return !!b && b.getAttribute('aria-pressed') === 'true'; }
  function marca(b, si) {
    if (!b) return;
    var n = b.getAttribute('data-capa');
    // (la barra de aislar repite algunos botones: se marcan todos)
    [].forEach.call(n ? document.querySelectorAll('[data-capa="' + n + '"]') : [b], function (x) { x.setAttribute('aria-pressed', String(si)); });
    // la leyenda muestra sólo lo de las capas prendidas
    if (n) document.body.classList.toggle('sin-' + n, !si);
  }
  // (los postes y el contexto son independientes: uno no apaga al otro)
  function ponContexto(si, inmediato) {
    if (!GENERAL) return;
    marca(boton('contexto'), si);
    dib.reencuadra();
    var listo = false;
    if (si) dib.preparaContexto(function () { listo = true; });
    if (inmediato || quieto.matches) {
      if (si && !listo) { recorre([[1, 1, 'suave', function () { return listo; }]]); return; }
      x = si ? 1 : 0; tramos = []; tramo = null; dib.vista(x, az, el); escala(); return;
    }
    // Ida: el contexto ya se armó en ratos libres (si no, se espera tantito
    // con la cámara arrancando); la cámara se aleja de un tirón suave mientras
    // el contexto se dibuja del predio hacia afuera. Vuelta: igual, al revés.
    if (si) recorre(listo ? [[1, 1900, 'suave']] : [[0.05, 450, 'lenta'], [1, 1800, 'suave', function () { return listo; }]]);
    else recorre([[0, 1400, 'suave']]);
  }
  function ponCapa(nombre, si) {
    marca(boton(nombre), si);
    if (nombre === 'separa') { dib.separa(si); escala(); return; }
    if (nombre === 'perspectiva') { perspAct = si; if (dib.perspectiva) dib.perspectiva(si); return; }
    // Planta y Mapa Nolli: la cámara se va arriba (cenital) con el norte arriba, y al apagar ambos regresa
    if (nombre === 'nolli' || nombre === 'planta' || nombre === 'corte') {
      var arriba = prendida('nolli') || prendida('planta') || prendida('corte');
      if (arriba && !antesNolli) { antesNolli = { az: azMeta, el: elMeta }; azMeta += ((NORTE_ARRIBA - azMeta) % 360 + 540) % 360 - 180; elMeta = LIM[1]; mano = false; arranca(); }
      else if (!arriba && antesNolli) { azMeta = antesNolli.az; elMeta = antesNolli.el; antesNolli = null; arranca(); }
    }
    if (si && (nombre === 'instalacion-electrica' || nombre === 'instalacion-hidraulica')) {
      var otra = nombre === 'instalacion-electrica' ? 'instalacion-hidraulica' : 'instalacion-electrica';
      marca(boton(otra), false);
      dib.capa(otra, false);
    }
    dib.capa(nombre, si);
    if (nombre === 'flujos') { flujos = si; dib.fluye(performance.now()); arranca(); }
    if (nombre === 'personas') { personas = si; arranca(); }
    if (nombre === 'sol') { sol = si; arranca(); }
    if (nombre === 'instalacion-electrica' || nombre === 'instalacion-hidraulica') {
      infra = prendida('instalacion-electrica') || prendida('instalacion-hidraulica');
      document.body.classList.toggle('con-instalacion-electrica', prendida('instalacion-electrica'));
      document.body.classList.toggle('con-instalacion-hidraulica', prendida('instalacion-hidraulica'));
      dib.fluye(performance.now());
      actualizaDatos();
      arranca();
    }
    if (nombre === 'color') document.body.classList.toggle('con-color', si);   // la leyenda también
  }

  /* ---------- Brújula ----------
     El minimapa nortea: un clic (o Enter) gira la cámara hasta dejar el norte
     arriba, por el camino más corto; la altura no cambia. */
  function nortea() {
    if (yendo || !dib) return;
    azMeta += ((NORTE_ARRIBA - azMeta) % 360 + 540) % 360 - 180;
    rapido = true;
    arranca();
  }
  var brujula = document.querySelector('[data-minimapa]');
  if (brujula) {
    brujula.addEventListener('click', nortea);
    brujula.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); nortea(); } });
  }

  /* ---------- Propuesto: ocultar partes ----------
     ocultos: lo escondido, del tablero (sobrevive al cambiar de apartado).
     La estructura es la capa 'estructura' (empieza oculta). */
  var ocultos = { estructura: true };
  var PARTE_DE = { modulos: 'vivienda' };   // clave de resaltar → clave de ocultar
  function aplicaOculta(ap) {
    var si = !!ocultos[ap];
    if (ap === 'estructura') { dib.capa('estructura', !si); if (si && dib.inspeccionaEstructura) dib.inspeccionaEstructura(false); }
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
  // (inspeccionar la estructura: lo demás queda en contorno; el aro siempre se ve)
  function inspecciona(ap) {
    if (ocultos[ap]) ponOculta(ap, false);
    if (ap !== 'estructura' && dib.inspeccionaEstructura) dib.inspeccionaEstructura(false);
    if (ap === 'vivienda') { ponResalta('modulos'); if (!GENERAL) ir('general'); }
    else if (ap === 'estructura') { ponResalta(''); if (dib.inspeccionaEstructura) dib.inspeccionaEstructura(true); }
    else ir(ap);
  }

  /* ---------- Resaltar ----------
     Uno a la vez: Público / privado (cada uno con su color, todo a la
     vista), o un programa (vivienda, comercio, arte y cultura,
     industria, aro, paisaje: toma su color y lo demás queda tenue). Resaltar
     algo oculto lo muestra. */
  function ponResalta(v) {
    resAct = v || '';
    if (resAct === 'publico' || resAct === 'privado') resAct = 'espacio';   // (de antes: eran dos botones)
    var esp = resAct === 'espacio';
    if (resAct && dib.inspeccionaEstructura) dib.inspeccionaEstructura(false);
    // (en este orden: seleccion() borra el espacio)
    dib.seleccion(esp || !resAct ? null : resAct);
    dib.espacio(esp ? 'ambos' : null);
    [].forEach.call(document.querySelectorAll('[data-resalta]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-resalta') === resAct)); });
    var ap = PARTE_DE[resAct] || resAct;
    if (ocultos[ap]) ponOculta(ap, false);
    actualizaDatos();
  }


  /* ---------- Aislar un uso ----------
     dib.aisla(ap) deja sólo ese uso y lo vuelve a dibujar; aquí: la vista
     axonométrica, la barra de menús propia (Partes · Vista · Salir) y la
     ficha. Al salir, todo como estaba (perspectiva, resaltado). La vivienda se
     aísla en la general; lo demás, en su apartado (si no se está ahí, se va y
     se aísla al llegar). */
  var aislado = null, antesAislar = null, porAislar = null, fichaAntes = null;
  var NOMBRE_USO = { vivienda: 'Vivienda', comercio: 'Mercado', 'nave-norte': 'Nave norte', industria: 'Industria', cultura: 'Arte y cultura', aro: 'Aro', paisajismo: 'Paisajismo', estacionamiento: 'Estacionamiento' };
  function escenaDe(ap) { return ap === 'vivienda' ? 'general' : ap === 'nave-norte' ? 'comercio' : PAGINAS[ap] ? ap : null; }
  function aislar(ap) {
    if (!dib || !dib.aisla || yendo) return;
    var esc = escenaDe(ap);
    if (!esc) return;
    if (esc !== ESCENA) { porAislar = ap; ir(esc); return; }
    if (aislado === ap) return;
    if (aislado) saleAislado();
    cierraMenus();
    antesAislar = { persp: perspAct, resalta: resAct };
    if (prendida('contexto')) ponContexto(false, true);
    if (resAct) ponResalta('');
    if (ocultos[ap]) ponOculta(ap, false);
    ponCapa('perspectiva', false);   // axonométrica
    // una altura de axonometría (ni casi de lado ni casi en planta)
    if (elMeta < 22 || elMeta > 60) { elMeta = 34; mano = false; arranca(); }
    var partes = dib.aisla(ap);
    if (!partes) { ponCapa('perspectiva', antesAislar.persp); if (antesAislar.resalta) ponResalta(antesAislar.resalta); antesAislar = null; return; }
    aislado = ap;
    document.body.classList.add('aislado');
    // la nave norte se abre de una vez (cubierta arriba, muros abajo)
    if (ap === 'nave-norte') partes = dib.despiece(true);
    barraAislado(ap, partes);
    actualizaDatos();
  }
  function saleAislado() {
    if (!aislado) return;
    cierraMenus();
    dib.aisla(null);
    aislado = null;
    document.body.classList.remove('aislado');
    var a = antesAislar || {}; antesAislar = null;
    var b = document.querySelector('.hud-barra--aislado');
    if (b) b.remove();
    ponCapa('perspectiva', a.persp !== false);
    if (a.resalta) ponResalta(a.resalta);
    var f = document.querySelector('[data-ficha]');
    if (f && fichaAntes !== null) f.innerHTML = fichaAntes;
    fichaAntes = null;
    actualizaDatos();
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Datos físicos ----------
     El punto blanco abre una ficha opcional sobre el modelo. Los datos de
     Git mandan; el análisis financiero sólo completa el área verde, ausente
     en programa/programa.json. */
  var catalogoDatos = null, datosAbiertos = false, focoDatos = null;
  var datosBoton = document.createElement('button');
  datosBoton.className = 'hud-dato-punto';
  datosBoton.type = 'button';
  datosBoton.setAttribute('aria-expanded', 'false');
  datosBoton.innerHTML = '<span aria-hidden="true"></span>';
  var datosCapa = document.createElement('div');
  datosCapa.className = 'hud-datos-capa';
  datosCapa.hidden = true;
  datosCapa.innerHTML = '<button class="hud-datos-fondo" type="button" aria-label="Cerrar datos"></button>' +
    '<div class="hud-datos-barrido" aria-hidden="true"></div>' +
    '<section class="hud-datos-panel" role="dialog" aria-modal="true" aria-labelledby="hud-datos-titulo">' +
    '<button class="hud-datos-cerrar" type="button" aria-label="Cerrar">&#215;</button>' +
    '<div data-datos-contenido></div></section>';
  pagina.appendChild(datosBoton);
  pagina.appendChild(datosCapa);
  var datosBarrido = datosCapa.querySelector('.hud-datos-barrido');
  for (var dp = 0; dp < 64; dp++) {
    var puntoDatos = document.createElement('i');
    puntoDatos.style.setProperty('--a', (dp * 360 / 64) + 'deg');
    puntoDatos.style.setProperty('--i', dp);
    puntoDatos.style.setProperty('--entra', (dp * 3) + 'ms');
    puntoDatos.style.setProperty('--sale', ((63 - dp) * 2) + 'ms');
    datosBarrido.appendChild(puntoDatos);
  }

  function numero(n) { return new Intl.NumberFormat('es-MX').format(n); }
  function metrica(etiqueta, valor, unidad, complemento) {
    return { etiqueta: etiqueta, valor: numero(valor), unidad: unidad || '', complemento: !!complemento };
  }
  function tabla(titulo, columnas, filas) { return { titulo: titulo, columnas: columnas, filas: filas }; }
  function datosDesdePrograma(doc) {
    var f = doc.figuras, v = f.vivienda, social = v.tipologias.filter(function (t) { return /social/i.test(t.tipo); })
      .reduce(function (n, t) { return n + t.deptos; }, 0);
    var mercado = window.ATLAMPA_MERCADO && window.ATLAMPA_MERCADO.resumen;
    var infraestructura = window.ATLAMPA_INFRAESTRUCTURA || null;
    var elec = infraestructura && infraestructura.electrica, hidro = infraestructura && infraestructura.hidrosanitaria;
    var puestosNorte = mercado && Number.isFinite(mercado.puestos) ? mercado.puestos : f.comercio.puestos;
    var puestosSur = mercado && mercado.sur && Number.isFinite(mercado.sur.puestos) ? mercado.sur.puestos : 0;
    var puestosComercio = puestosNorte + puestosSur;
    var viviendaConstruida = v.m2_vendible + v.amenidades_m2 + v.extra_m2 + v.sin_asignar_m2;
    var potencial = f.potencial.construido_m2;
    var aroK = Object.keys(potencial).filter(function (k) { return /^aro /.test(k); })[0];
    var totalFisico = f.potencial.sobre_piso_m2 + f.potencial.sotanos_m2;
    var fuenteGit = 'Git · programa/programa.json';
    return {
      general: {
        titulo: 'Proyecto completo', subtitulo: 'Magnitudes físicas', fuente: fuenteGit + ' · área verde: Excel, 03_Programa_Usos',
        metricas: [metrica('Predio', f.predio_m2, 'm²'), metrica('Sobre piso', f.potencial.sobre_piso_m2, 'm²'),
          metrica('Con sótanos', totalFisico, 'm²'), metrica('Viviendas', v.deptos),
          metrica('Estacionamiento', f.estacionamiento.cajones_total, 'cajones'), metrica('Área libre', f.publico.libre_m2, 'm²')],
        tablas: [tabla('Programa', ['Uso', 'Dato principal'], [
          ['Vivienda', numero(viviendaConstruida) + ' m² proyectados'],
          ['Comercio', numero(f.comercio.naves_total_m2) + ' m² de naves'],
          ['Industria', numero(f.industria.huella_m2) + ' m² de huella'],
          ['Arte y cultura', numero(f.cultura.construido_m2) + ' m² construidos'],
          ['Aro', numero(potencial[aroK]) + ' m² de losa'],
          ['Área verde', '4,000 m² · complemento Excel']
        ]), tabla('Sistemas preliminares', ['Sistema', 'Capacidad / alcance'], infraestructura ? [
          ['Eléctrico', numero(elec.subestacion.transformador_kva) + ' kVA · ' + numero(elec.subestacion.area_m2) + ' m²'],
          ['Emergencia', numero(elec.subestacion.planta_emergencia_kw) + ' kW'],
          ['Agua potable', numero(hidro.cisterna_potable.volumen_m3) + ' m³'],
          ['Tratamiento', hidro.humedales.length + ' humedales · ' + numero(hidro.humedales.length * 48) + ' m²'],
          ['Biodigestión', '2 × ' + numero(hidro.biodigestores.capacidad_unitaria_m3) + ' m³']
        ] : [])],
        notas: ['El total físico mostrado suma la proyección sobre piso y los sótanos del repositorio.', 'El aro puede traslapar el área de cultura.', 'El área verde programada complementa un campo que no existe con esa definición en Git.']
      },
      vivienda: {
        titulo: 'Vivienda', subtitulo: 'Programa habitacional', fuente: fuenteGit,
        metricas: [metrica('Construcción proyectada', viviendaConstruida, 'm²'), metrica('Viviendas', v.deptos),
          metrica('Social', social), metrica('Media / no social', v.deptos - social)],
        tablas: [tabla('Tipologías', ['Tipo', 'Departamentos', 'm² por unidad', 'm²'], v.tipologias.map(function (t) {
          return [t.tipo, numero(t.deptos), numero(t.m2_c_u), numero(t.m2)];
        })), tabla('Áreas complementarias', ['Concepto', 'm²'], [
          ['Vendible', numero(v.m2_vendible)], ['Amenidades', numero(v.amenidades_m2)],
          ['Área extra', numero(v.extra_m2)], ['Sin asignar', numero(v.sin_asignar_m2)]
        ])],
        notas: ['“Media / no social” es total menos la tipología A social; Git no clasifica expresamente B, C y D como vivienda media.']
      },
      comercio: {
        titulo: 'Comercio', subtitulo: 'Mercado y naves', fuente: fuenteGit + ' · atlampa-mercado.js',
        metricas: [metrica('Naves', f.comercio.naves_total_m2, 'm²'), metrica('Plataformas', f.comercio.plataformas_m2, 'm²'),
          metrica('Puestos', puestosComercio), metrica('Puesto nominal', f.comercio.puesto_nominal_m2, 'm²')],
        tablas: [tabla('Superficies y capacidad', ['Concepto', 'Dato'], [
          ['Nave norte', numero(f.comercio.naves_m2[0]) + ' m²'], ['Nave sur', numero(f.comercio.naves_m2[1]) + ' m²'],
          ['Puestos nave norte', numero(puestosNorte)], ['Puestos nave sur', numero(puestosSur)],
          ['Patios', numero(f.comercio.patios.m2) + ' m²'], ['Jardín', numero(f.comercio.jardin_m2) + ' m²'],
          ['Bancas', numero(f.comercio.patios.bancas)], ['Plazas sentado', numero(f.comercio.patios.plazas_sentado)]
        ])],
        notas: ['El total suma los 31 puestos de la nave norte y los 63 puestos de la planta alta sur registrados en el modelo detallado del mercado.']
      },
      industria: {
        titulo: 'Industria', subtitulo: 'Nave industrial', fuente: fuenteGit,
        metricas: [metrica('Huella', f.industria.huella_m2, 'm²'), metrica('Altura máxima', f.industria.z_m[1], 'm')],
        notas: ['El repositorio considera un nivel para la proyección; los niveles definitivos están por confirmar.']
      },
      cultura: {
        titulo: 'Arte y cultura', subtitulo: 'Pabellones y plaza', fuente: fuenteGit,
        metricas: [metrica('Construcción', f.cultura.construido_m2, 'm²'), metrica('Huella', f.cultura.huella_m2, 'm²'),
          metrica('Plaza cultural', f.cultura.plaza_m2, 'm²'), metrica('Lámina de referencia', f.cultura.lamina_m2, 'm²')]
      },
      aro: {
        titulo: 'Aro', subtitulo: 'Losa elevada', fuente: fuenteGit,
        metricas: [metrica('Losa anular', potencial[aroK], 'm²')],
        notas: ['La superficie puede traslapar el área construida de arte y cultura.']
      },
      paisajismo: {
        titulo: 'Paisajismo', subtitulo: 'Espacio libre y vegetación', fuente: fuenteGit + ' · complemento físico del Excel',
        metricas: [metrica('Área libre', f.publico.libre_m2, 'm²'), metrica('Área libre', f.publico.pct, '%'),
          metrica('Laguna', f.paisaje.laguna_m2, 'm²'), metrica('Árboles', f.arboles.total),
          metrica('Área verde programada', 4000, 'm²', true)],
        notas: ['El área verde programada es el único complemento tomado de 03_Programa_Usos del análisis financiero.']
      },
      estacionamiento: {
        titulo: 'Estacionamiento', subtitulo: 'Dos bloques subterráneos', fuente: fuenteGit,
        metricas: [metrica('Superficie estimada', f.potencial.sotanos_m2, 'm²'), metrica('Cajones', f.estacionamiento.cajones_total),
          metrica('Por sótano', f.estacionamiento.cajones_por_sotano, 'cajones'), metrica('Sótanos', f.estacionamiento.sotanos),
          metrica('Entrepiso', f.estacionamiento.entrepiso_m, 'm')]
      },
      electrica: {
        titulo: 'Instalación eléctrica', subtitulo: 'Esquema técnico preliminar', fuente: 'Git · atlampa-infraestructura.js · NOM-001-SEDE-2012',
        metricas: infraestructura ? [metrica('Subestación', elec.subestacion.area_m2, 'm²'),
          metrica('Transformador', elec.subestacion.transformador_kva, 'kVA'), metrica('Emergencia', elec.subestacion.planta_emergencia_kw, 'kW'),
          metrica('Núcleos atendidos', elec.nucleos_vivienda.length + elec.nucleos_comercio.length),
          metrica('Derivaciones representadas', elec.nucleos_vivienda.reduce(function (n, x) { return n + x.niveles; }, 0) + elec.nucleos_comercio.reduce(function (n, x) { return n + x.niveles; }, 0))] : [],
        tablas: infraestructura ? [tabla('Equipamiento conceptual', ['Elemento', 'Criterio'], elec.subestacion.equipos.map(function (x) { return [x, 'Preliminar']; }))] : [],
        notas: ['La capacidad, los tableros y las trayectorias requieren memoria de cargas, diagrama unifilar, coordinación de protecciones y factibilidad de CFE.', 'La vista representa un alimentador por volumen, montante y una derivación conceptual por nivel; no equivale al número final de circuitos.']
      },
      hidrosanitaria: {
        titulo: 'Instalación hidro-sanitaria y pluvial', subtitulo: 'Esquema técnico preliminar', fuente: 'Git · atlampa-infraestructura.js · Reglamento de Construcciones CDMX',
        metricas: infraestructura ? [metrica('Cisterna potable', hidro.cisterna_potable.volumen_m3, 'm³'),
          metrica('Cuarto de bombas', hidro.bombas.area_m2, 'm²'), metrica('Humedales', hidro.humedales.length),
          metrica('Área de humedales', hidro.humedales.length * 48, 'm²'),
          metrica('Biodigestión total', hidro.biodigestores.capacidad_unitaria_m3 * 2, 'm³'),
          metrica('Laguna funcional', hidro.laguna.area_m2, 'm²')] : [],
        tablas: infraestructura ? [tabla('Paquetes de humedales', ['Ubicación', 'Configuración', 'Servicio'], ['norte', 'oriente', 'central'].map(function (p) {
          var hs = hidro.humedales.filter(function (h) { return h.paquete === p; });
          return [p.charAt(0).toUpperCase() + p.slice(1), '1 vertical + 1 horizontal · 96 m²', hs.map(function (h) { return h.servicio; }).join(' + ')];
        }))] : [],
        notas: ['La red separa agua potable, tratada, pluvial, aguas grises y aguas negras.', 'Las montantes y derivaciones por nivel son conceptuales; diámetros, pendientes, ventilaciones, registros, bombeo y capacidades finales deben resolverse en el proyecto ejecutivo.', 'La laguna funciona como almacenamiento de agua tratada y como parte del paisaje.']
      }
    };
  }
  function claveDatosActual() {
    if (prendida('instalacion-electrica') && catalogoDatos && catalogoDatos.electrica) return 'electrica';
    if (prendida('instalacion-hidraulica') && catalogoDatos && catalogoDatos.hidrosanitaria) return 'hidrosanitaria';
    var a = aislado === 'nave-norte' ? 'comercio' : aislado;
    if (a) return a;
    // En un apartado manda el uso de esa página. El resaltado se conserva al
    // navegar como referencia visual, pero no debe arrastrar su ficha de datos.
    if (ESCENA !== 'general' && catalogoDatos && catalogoDatos[ESCENA]) return ESCENA;
    if (resAct === 'modulos') return 'vivienda';
    if (resAct === 'espacio') return 'paisajismo';
    if (catalogoDatos && catalogoDatos[resAct]) return resAct;
    return catalogoDatos && catalogoDatos[ESCENA] ? ESCENA : 'general';
  }
  function pintaDatos() {
    var c = document.querySelector('[data-datos-contenido]');
    if (!c) return;
    if (!catalogoDatos) {
      c.innerHTML = '<p class="hud-datos-kicker">Datos físicos</p><h2 class="hud-datos-titulo" id="hud-datos-titulo">Cargando datos</h2>';
      return;
    }
    var d = catalogoDatos[claveDatosActual()] || catalogoDatos.general;
    var metricas = d.metricas.map(function (m) {
      return '<div class="hud-datos-metrica' + (m.complemento ? ' es-complemento' : '') + '"><dt>' + esc(m.etiqueta) + '</dt><dd>' + esc(m.valor) + (m.unidad ? '<span>' + esc(m.unidad) + '</span>' : '') + '</dd></div>';
    }).join('');
    var tablas = (d.tablas || []).map(function (t) {
      return '<section class="hud-datos-seccion"><h3>' + esc(t.titulo) + '</h3><div class="hud-datos-tabla-wrap"><table><thead><tr>' +
        t.columnas.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.filas.map(function (fila) { return '<tr>' + fila.map(function (x) { return '<td>' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div></section>';
    }).join('');
    var notas = (d.notas || []).map(function (n) { return '<p class="hud-datos-nota">' + esc(n) + '</p>'; }).join('');
    c.innerHTML = '<p class="hud-datos-kicker">' + esc(d.subtitulo) + '</p><h2 class="hud-datos-titulo" id="hud-datos-titulo">' + esc(d.titulo) + '</h2>' +
      '<dl class="hud-datos-metricas">' + metricas + '</dl>' + tablas + notas + '<p class="hud-datos-fuente">Fuente: ' + esc(d.fuente) + '</p>';
  }
  function actualizaDatos() {
    var nombres = { general: 'proyecto completo', vivienda: 'vivienda', comercio: 'comercio', industria: 'industria', cultura: 'arte y cultura', aro: 'aro', paisajismo: 'paisajismo', estacionamiento: 'estacionamiento', electrica: 'instalación eléctrica', hidrosanitaria: 'instalación hidro-sanitaria y pluvial' };
    var nombre = nombres[claveDatosActual()] || 'proyecto completo';
    datosBoton.title = 'Ver datos de ' + nombre;
    datosBoton.setAttribute('aria-label', 'Ver datos de ' + nombre);
    if (datosAbiertos) pintaDatos();
  }
  var datosAnimTimer = null;
  function abreDatos() {
    if (datosAbiertos) return;
    clearTimeout(datosAnimTimer);
    focoDatos = document.activeElement;
    datosAbiertos = true;
    datosCapa.hidden = false;
    datosCapa.classList.remove('saliendo');
    pintaDatos();
    var rb = datosBoton.getBoundingClientRect(), rp = datosCapa.querySelector('.hud-datos-panel').getBoundingClientRect();
    var dx = rb.left + rb.width / 2, dy = rb.top + rb.height / 2;
    var px = dx - rp.left, py = dy - rp.top;
    var radioPanel = Math.max(Math.hypot(px, py), Math.hypot(rp.width - px, py),
      Math.hypot(px, rp.height - py), Math.hypot(rp.width - px, rp.height - py)) + 12;
    var radioVista = Math.max(Math.hypot(dx, dy), Math.hypot(innerWidth - dx, dy),
      Math.hypot(dx, innerHeight - dy), Math.hypot(innerWidth - dx, innerHeight - dy)) + 12;
    datosCapa.style.setProperty('--datos-panel-x', px + 'px');
    datosCapa.style.setProperty('--datos-panel-y', py + 'px');
    datosCapa.style.setProperty('--datos-panel-r', radioPanel + 'px');
    datosBarrido.style.left = dx + 'px';
    datosBarrido.style.top = dy + 'px';
    datosBarrido.style.setProperty('--radio', radioVista + 'px');
    void datosCapa.offsetWidth;
    datosCapa.classList.add('entrando');
    datosCapa.setAttribute('aria-hidden', 'false');
    datosBoton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('con-datos');
    datosCapa.querySelector('.hud-datos-cerrar').focus();
    datosAnimTimer = setTimeout(function () { datosCapa.classList.remove('entrando'); }, 1100);
  }
  function cierraDatos(inmediato) {
    if (!datosAbiertos) return;
    clearTimeout(datosAnimTimer);
    datosAbiertos = false;
    datosBoton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('con-datos');
    datosCapa.classList.remove('entrando');
    datosCapa.classList.add('saliendo');
    datosCapa.setAttribute('aria-hidden', 'true');
    var terminaCierre = function () { datosCapa.hidden = true; datosCapa.classList.remove('saliendo'); };
    if (inmediato || quieto.matches) terminaCierre();
    else datosAnimTimer = setTimeout(terminaCierre, 720);
    if (focoDatos && focoDatos.focus) focoDatos.focus();
  }
  datosBoton.addEventListener('click', abreDatos);
  datosCapa.querySelector('.hud-datos-fondo').addEventListener('click', function () { cierraDatos(false); });
  datosCapa.querySelector('.hud-datos-cerrar').addEventListener('click', function () { cierraDatos(false); });
  fetch('programa/programa.json', { credentials: 'same-origin' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (doc) { catalogoDatos = datosDesdePrograma(doc); actualizaDatos(); }, function () {
    datosBoton.hidden = true;
    console.error('No se pudieron cargar los datos físicos de programa/programa.json');
  });
  actualizaDatos();
  function filasPartes(partes) {
    var mueven = partes.filter(function (pt) { return pt.mueve; });
    var h = mueven.length ? '<button class="hud-op" type="button" data-despiece aria-pressed="' + mueven.every(function (pt) { return pt.desplazado; }) + '">' + iconoOpcion('despiece') + '<span>Despiece (todas)</span></button><p class="hud-panel__t">Cada parte</p>' : '';
    return h + partes.map(function (pt) {
      return '<div class="hud-fila' + (pt.oculto ? ' es-oculta' : '') + '">' +
        '<span class="hud-fila__t">' + iconoOpcion('parte') + '<span>' + esc(pt.nombre) + '</span></span>' +
        '<button class="hud-acc" type="button" data-parte-oculta="' + pt.id + '" aria-pressed="' + pt.oculto + '">' + (pt.oculto ? 'Mostrar' : 'Ocultar') + '</button>' +
        (pt.mueve ? '<button class="hud-acc" type="button" data-parte-mueve="' + pt.id + '" aria-pressed="' + pt.desplazado + '">' + (pt.desplazado ? 'Regresar' : 'Desplazar') + '</button>' : '') + '</div>';
    }).join('');
  }
  function marcaPartesAislado(partes) {
    var panel = document.querySelector('.hud-panel--partes');
    if (panel && partes) panel.innerHTML = filasPartes(partes);
  }
  function iconoMenu(nombre) {
    var p = nombre === 'partes'
      ? '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>'
      : '<path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"/><circle cx="12" cy="12" r="3"/>';
    return '<svg class="hud-menu__icon" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  }
  function iconoOpcion(nombre) {
    var trazos = {
      color: '<path d="M12 3a9 9 0 1 0 0 18c1.7 0 2.2-1.4 1.2-2.5-.8-.9-.1-2.5 1.2-2.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9Z"/>',
      perspectiva: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
      clay: '<circle cx="12" cy="12" r="8"/><path d="M8 16c2-4 4-6 8-8"/>',
      rayado: '<path d="M4 8h16M4 12h16M4 16h16"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
      plano: '<rect x="4" y="4" width="16" height="16"/>',
      despiece: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 13 8 4 8-4M12 11v6"/>',
      parte: '<path d="M4 4h7v7H4zM13 13h7v7h-7zM14 4h6v6M4 14h6v6"/>'
    };
    return '<svg class="hud-op__icon" viewBox="0 0 24 24" aria-hidden="true">' + trazos[nombre] + '</svg>';
  }
  // la barra de menús del aislado y la ficha (con los datos del uso, si hay)
  function barraAislado(ap, partes) {
    var nav = document.createElement('nav');
    nav.className = 'hud-barra hud-barra--aislado';
    nav.setAttribute('aria-label', 'Menús del aislado');
    var vista = '<button class="hud-op hud-op--color" type="button" data-capa="color" aria-pressed="' + prendida('color') + '">' + iconoOpcion('color') + '<span>Color</span></button>' +
      '<button class="hud-op" type="button" data-capa="perspectiva" aria-pressed="' + perspAct + '">' + iconoOpcion('perspectiva') + '<span>Perspectiva</span></button>' +
      '<p class="hud-panel__t">Estilo</p>' +
      ['clay', 'rayado', 'plano'].map(function (e) { var n = e === 'clay' ? 'Clay' : e === 'rayado' ? 'Rayado' : 'Plano'; return '<button class="hud-op hud-op--radio" type="button" data-estilo="' + e + '" aria-pressed="' + (estiloAct === e) + '">' + iconoOpcion(e) + '<span>' + n + '</span></button>'; }).join('');
    nav.innerHTML = (partes.length ? '<details class="hud-menu" name="hud"><summary class="hud-menu__t">' + iconoMenu('partes') + '<span>Partes</span></summary><div class="hud-panel hud-panel--partes">' + filasPartes(partes) + '</div></details>' : '') +
      '<details class="hud-menu" name="hud"><summary class="hud-menu__t">' + iconoMenu('vista') + '<span>Vista</span></summary><div class="hud-panel">' + vista + '</div></details>' +
      '<button class="hud-salir" type="button" data-aisla-sale>Salir <span aria-hidden="true">✕</span></button>';
    var barra = document.querySelector('.hud-barra');
    barra.parentNode.insertBefore(nav, barra.nextSibling);
    var f = document.querySelector('[data-ficha]');
    if (f) {
      fichaAntes = f.innerHTML;
      var M = window.ATLAMPA_MERCADO, r = M && M.resumen, c = M && M.cinta, datos = [];
      if ((ap === 'comercio' || ap === 'nave-norte') && r) {
        var su = r.sur || {}, lo = r.locales || {};
        var jardinNE = 'Jardín de la esquina NE ' + Math.round(r.jardin_m2) + ' m² (' + Math.round(r.jardin_abierto_m2 || 0) + ' abiertos, alero ' + (r.alero_m || 0).toFixed(2) + ')';
        if (ap === 'nave-norte') {   // (la nave norte sola: no se cuela la sur)
          datos = [r.puestos + ' locales', 'Sobre la retícula de vivienda: isla, portal y calle de las plantas con pórtico', jardinNE, 'Foro bajo el hoyo (con vidrio)'];
        } else {
          var fondas = ((lo.PB_fonda_del_jardin || 0) + (lo.P2_racimos || 0)) / 4 + (su.racimos_pa || 0) + (su.racimos_pb || 0);
          datos = [(r.puestos + (su.puestos_pb || 0) + (su.puestos || 0)) + ' locales (norte ' + r.puestos + ' · sur PB ' + (su.puestos_pb || 0) + ' · sur PA ' + (su.puestos || 0) + ')',
            'Sur: manzanas en aparejo · ' + (su.respiros || 0) + ' respiros (tsuboniwa abajo, puente entre copas arriba) · ' + fondas + ' fondas con barra',
            'Jardín sur: ranura de doble altura sobre la franja (' + Math.round(su.ranura_m2 || 0) + ' m²) y esquina a doble altura (' + Math.round(su.doble_altura_m2 || 0) + ' m²)',
            'Norte sobre la retícula de vivienda: isla, portal y calle de las plantas con pórtico',
            jardinNE + ' · jardín sur ' + Math.round(su.jardin_sur_m2 || 0) + ' m²',
            'Foro bajo el hoyo (con vidrio) · cubierta sur: las dos aguas en módulos a tres alturas' + (su.cubierta_dobleces ? ', ' + su.cubierta_dobleces.canal + ' en canal y ' + su.cubierta_dobleces.lomo + ' en lomo' : '')];
          if (su.acuaponia_m2) datos.push('Acuaponia: vitrina de ' + Math.round(su.acuaponia_m2) + ' m²');
        }
        if (c) datos.push('Cinta del aro: ' + Math.round(c.largo) + ' m al ' + Math.max.apply(null, c.pendientes).toFixed(1) + ' %');
        datos.push('Fachada al aro: vidrio (por definir)');
      }
      f.innerHTML = '<h1 class="hud-ficha__t">' + esc(NOMBRE_USO[ap] || ap) + ' <span class="hud-ficha__sub">aislado</span></h1>' +
        (datos.length ? '<ul class="ad-datos">' + datos.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="hud-ficha__nota">Axonometría · ' + (ap === 'nave-norte' ? 'doble clic en el vacío o Esc: cerrar' : 'doble clic: encuadre · Esc: salir') + '</p>';
    }
  }

  /* ---------- Menús ----------
     Desplegables de la barra de arriba (uno abierto a la vez, por el name
     del <details>); se cierran al picar fuera o con Escape. Un solo escucha
     para todos los botones: la ficha del apartado cambia entera. */
  function cierraMenus(salvo) {
    [].forEach.call(document.querySelectorAll('.hud-menu[open]'), function (d) { if (d !== salvo) d.open = false; });
  }
  document.addEventListener('pointerdown', function (ev) { if (!ev.target.closest('.hud-menu')) cierraMenus(); });
  document.addEventListener('input', function (ev) {
    var s = ev.target.closest('[data-corte-eje]');
    if (!s || !dib) return;
    ponCorte(s.getAttribute('data-corte-eje'), Number(s.value) / 100);
  });
  // Esc: cierra el menú; aislado, sale
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (datosAbiertos) cierraDatos();
    else if (document.querySelector('.hud-menu[open]')) cierraMenus();
    else if (aislado && !yendo) saleAislado();
  });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-capa], [data-resalta], [data-sotano], [data-zoom], [data-ir], [data-estilo], [data-oculta], [data-inspecciona], [data-aisla], [data-aisla-sale], [data-parte-oculta], [data-parte-mueve], [data-despiece], [data-corte-reset]');
    if (!b || !dib) return;
    if (b.hasAttribute('data-corte-reset')) { restableceCortes(); return; }
    if (b.hasAttribute('data-ir')) { ev.preventDefault(); cierraMenus(); if (aislado) saleAislado(); ir(b.getAttribute('data-ir')); return; }
    if (yendo) return;
    if (b.hasAttribute('data-aisla')) { cierraMenus(); aislar(b.getAttribute('data-aisla')); }
    else if (b.hasAttribute('data-aisla-sale')) saleAislado();
    else if (b.hasAttribute('data-parte-oculta')) marcaPartesAislado(dib.ponParte(b.getAttribute('data-parte-oculta'), { oculto: b.getAttribute('aria-pressed') !== 'true' }));
    else if (b.hasAttribute('data-parte-mueve')) marcaPartesAislado(dib.ponParte(b.getAttribute('data-parte-mueve'), { desplazado: b.getAttribute('aria-pressed') !== 'true' }));
    else if (b.hasAttribute('data-despiece'))marcaPartesAislado(dib.despiece(b.getAttribute('aria-pressed') !== 'true'));
    else if (b.hasAttribute('data-oculta')) { var o = b.getAttribute('data-oculta'); ponOculta(o, !ocultos[o]); }
    else if (b.hasAttribute('data-inspecciona')) { cierraMenus(); inspecciona(b.getAttribute('data-inspecciona')); }
    else if (b.hasAttribute('data-capa')) {
      var n = b.getAttribute('data-capa'), si = b.getAttribute('aria-pressed') !== 'true';
      if (n === 'contexto') ponContexto(si);
      else ponCapa(n, si);
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
    x = 0; tramos = []; tramo = null; flujos = personas = sol = infra = false;
    var mini = document.querySelector('[data-minimapa]');
    ponMini = mini ? dib.minimapa(mini) : null;
    [].forEach.call(document.querySelectorAll('[data-capa]'), function (b) {
      var n = b.getAttribute('data-capa');
      if (n !== 'contexto') ponCapa(n, b.getAttribute('aria-pressed') === 'true');
    });
    aplicaCortes();
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
    cierraDatos(true);
    guarda('atlampa-camara', { az: azMeta, el: elMeta });
    if (quieto.matches || location.protocol === 'file:' || !window.fetch || !window.DOMParser) { salta(ap); return; }
    if (aislado) saleAislado();
    var de = ESCENA, doc = traePagina(ap), listo = false, hecho = false;
    // el contexto urbano es sólo de la general: se apaga al salir
    if (prendida('contexto')) marca(boton('contexto'), false);
    bloquea(true);
    document.body.classList.add('cambia-pagina');
    function sigue() {
      if (!listo || !hecho) return;
      doc.then(function (d) {
        var c0 = dib.camara ? dib.camara() : null;
        dib.destruye();
        cambiaDom(d, ap);
        ESCENA = ap; GENERAL = ap === 'general';
        if (!desdeHistoria) history.pushState({ escena: ap }, '', PAGINAS[ap]);
        monta();
        document.body.classList.remove('cambia-pagina');
        bloquea(false);   // ya se puede mover mientras se dibuja
        if (porAislar) { var pa = porAislar; porAislar = null; aislar(pa); termina(); return; }
        if (c0) dib.camara(c0);   // del encuadre de antes al de ahora
        dib.arma(GENERAL ? de : null, ARMA, termina);
      });
    }
    doc.then(function () { listo = true; sigue(); }, function () { salta(ap); });
    dib.desarma(ap, DESARMA, function () { hecho = true; sigue(); });
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
    if (GENERAL && dib && dib.preparaContexto) {
      var arma = function () { if (dib && GENERAL) dib.preparaContexto(); };
      if (window.requestIdleCallback) requestIdleCallback(arma, { timeout: 2500 }); else setTimeout(arma, 600);
    }
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
    var lim = dib && dib.dentro && dib.dentro() ? dib.limitesDentro : LIM;   // dentro de la nave se puede mirar hacia arriba
    elMeta = Math.max(lim[0], Math.min(lim[1], elMeta + dEl));
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
      if (ap && ap !== ESCENA && PAGINAS[ap] && !aislado) {
        clearTimeout(clicPend);
        clicPend = setTimeout(function () { clicPend = null; if (!yendo) ir(ap); }, 260);
      }
    }
  }
  zona.addEventListener('pointerup', suelta);
  zona.addEventListener('pointercancel', suelta);
  zona.addEventListener('pointerleave', function () { if (!Object.keys(dedos).length) tooltip(null); });
  // doble clic en una parte: aislarla (cuando se inspecciona, el mercado en Comercio; sobre la nave norte, abrirla);
  // en el vacío o ya aislado: encuadre (con la nave norte abierta, en el vacío la cierra)
  var clicPend = null;
  zona.addEventListener('dblclick', function (ev) {
    if (yendo || !dib) return;
    if (clicPend) { clearTimeout(clicPend); clicPend = null; }
    if (aislado === 'nave-norte' && !dib.apartadoEn(ev)) { saleAislado(); return; }
    if ((!aislado || aislado === 'comercio') && dib.naveNorteEn && dib.naveNorteEn(ev)) { aislar('nave-norte'); return; }
    var ap = aislado ? null : dib.apartadoEn(ev);
    if (ap && escenaDe(ap)) { aislar(ap); return; }
    dib.reencuadra(); escala(); zona.classList.remove('con-zoom');
  });
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
    else if (dib.pasea && /^[wasdqe]$/i.test(k) && !ev.ctrlKey && !ev.metaKey) {   // caminar (dentro de las naves)
      var K = k.toLowerCase();
      dib.pasea(K === 'w' ? 1 : K === 's' ? -1 : 0, K === 'd' ? 1 : K === 'a' ? -1 : 0, K === 'e' ? 1 : K === 'q' ? -1 : 0); escala();
    }
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
  ['flujos', 'arboles', 'postes', 'personas', 'color', 'sol', 'esquema', 'corte', 'instalacion-electrica', 'instalacion-hidraulica'].forEach(function (n) { if (h.indexOf(n) >= 0) ponCapa(n, true); });
  if (h.indexOf('estructura') >= 0) ponOculta('estructura', false);
  if (h.indexOf('sinmodulos') >= 0) ponOculta('vivienda', true);
  var th = h.filter(function (s) { return /^resalta=/.test(s); })[0];
  if (th) ponResalta(th.slice(8));
  history.replaceState({ escena: ESCENA }, '', location.href);

  // Al abrir la página la escena también se arma (si se llega navegando desde
  // otro apartado, la cámara se abre desde él).
  var tr = lee('atlampa-transicion', true);
  var aisla0 = h.filter(function (s) { return /^aisla=/.test(s); })[0];
  if (aisla0) { aislar(aisla0.slice(6)); termina(); }
  else if (quieto.matches || h.indexOf('contexto') >= 0) { termina(); }
  else {
    bloquea(true);
    dib.arma(tr && tr.a === ESCENA && GENERAL ? tr.de : null, ARMA, termina);
  }
  if (window.requestIdleCallback) requestIdleCallback(precargaPaginas, { timeout: 3000 });
  else setTimeout(precargaPaginas, 1500);
  }
})();

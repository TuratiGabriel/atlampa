/* ============================================================
   ATLAMPA — Modo historia (presentación final, etapa 1)
   Slides programadas sobre el visor. Cada slide es un estado: cámara,
   capas de la presentación (toda la colonia, coches, límite), marcas,
   tarjeta y rótulos. «Siguiente» vuela al estado de la siguiente; entre
   slides la cámara es libre (girar, acercar, mover) y el visor no cambia.
   Datos: atlampa-historia-datos.js (OSM, herramientas/prepara-historia.mjs).
   Guion: atlampa-historia-guion.js. Se carga sólo al entrar al modo.
   ============================================================ */
const VER = import.meta.url.split('?')[1] || '';
const conV = f => f + (VER ? '?' + VER : '');
const AMARILLO = 0xf5c518, ROJO = 0xff3b30, LILA = 0xc9a6ff, VERDE = 0xa8e063, OCRE = 0xe8a25a, CIRCUITO = 0xff6f63;   // lila y verde: los de cultura y verde del visor

function cargaScript(src) {
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => mal(new Error('no cargó ' + src));
    document.head.appendChild(s);
  });
}

export async function crea(api) {
  if (!window.ATLAMPA_HISTORIA_DATOS) await cargaScript(conV('atlampa-historia-datos.js'));
  if (!window.ATLAMPA_HISTORIA_VIVIENDA) await cargaScript(conV('atlampa-historia-vivienda.js'));   // (herramientas/prepara-vivienda-historia.py)
  const guionMod = await import(conV('./atlampa-historia-guion.js'));
  const GUION = guionMod.default, MARCAS = guionMod.MARCAS;
  const etapaDe = i => (GUION[i] && GUION[i].etapa) || 1;   // etapa de la presentación (la 1 por omisión)
  const H = window.ATLAMPA_HISTORIA_DATOS;
  const { THREE, G, W, CEN, Malla, Lineas, tapa, prisma, pon, ponLineas, material, raizG, trabajo, pide, aplicaEstilo, ESTILOS } = api;
  const D = G.D, S = G.S, R = D.rect, RAD = Math.PI / 180, DC_ = api.dib;
  const pares = (a, desde) => { const r = []; for (let i = desde || 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
  const LIM = pares(H.limite);
  const CAJA_LIM = [Math.min(...LIM.map(p => p[0])), Math.min(...LIM.map(p => p[1])), Math.max(...LIM.map(p => p[0])), Math.max(...LIM.map(p => p[1]))];
  const AZ_NORTE = ((-H.ajuste.giro % 360) + 360) % 360;   // norte arriba (la retícula del visor está girada)
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Estilos: el contexto fuera de la colonia, más tenue ---------- */
  Object.assign(ESTILOS.plano.papel, { ctxlejos: { gris: 0.025, arista: 0.11 } });
  Object.assign(ESTILOS.rayado.papel, { ctxlejos: { tono: 0.02, paso: 3.2, arista: 0.13 } });
  Object.assign(ESTILOS.clay.papel, { ctxlejos: { modo: 1, gris: 0.9, arista: 0.08 } });
  Object.assign(ESTILOS.plano.papel, { ctxpredio: { gris: 0.07, arista: 0.95 } });
  Object.assign(ESTILOS.rayado.papel, { ctxpredio: { tono: 0.08, paso: 2.4, arista: 0.95 } });
  Object.assign(ESTILOS.clay.papel, { ctxpredio: { modo: 1, gris: 0.96, arista: 0.55 } });
  // lo que se demuele y lo de las naves que corta el aro: se ven como lo existente, pero con su propio canal
  // de dibujo (api.canalPropio) para borrarse solos, como se desarma una parte en el visor
  ['plano', 'rayado', 'clay'].forEach(e => { const p = ESTILOS[e].papel; p.ctxdemuele = Object.assign({}, p.ctxpredio); p.ctxcorte = Object.assign({}, p.ctxpredio); });
  const CANAL = { dem: api.canalPropio ? api.canalPropio('ctxdemuele') : null, cor: api.canalPropio ? api.canalPropio('ctxcorte') : null };
  Object.assign(ESTILOS.plano.lineas, { ctxlejos: 0.1 });
  Object.assign(ESTILOS.rayado.lineas, { ctxlejos: 0.11 });
  Object.assign(ESTILOS.clay.lineas, { ctxlejos: 0.1 });

  /* ---------- Geometría auxiliar ---------- */
  function dentro(p, pol) {
    let k = false;
    for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      const a = pol[i], b = pol[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) k = !k;
    }
    return k;
  }
  const centro = q => { let x = 0, y = 0; q.forEach(p => { x += p[0]; y += p[1]; }); return [x / q.length, y / q.length]; };
  // partes de una polilínea fuera del rectángulo r (Liang-Barsky por tramo)
  function fuera(pts, r) {
    const tramos = []; let cur = [];
    const corta = () => { if (cur.length > 1) tramos.push(cur); cur = []; };
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
      let t0 = 0, t1 = 1, ok = true;
      const P = [-dx, dx, -dy, dy], Q = [a[0] - r.u0, r.u1 - a[0], a[1] - r.v0, r.v1 - a[1]];
      for (let k = 0; k < 4; k++) {
        if (P[k] === 0) { if (Q[k] < 0) ok = false; continue; }
        const t = Q[k] / P[k];
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
  // tramo de una polilínea (casi horizontal) entre u = de y u = a
  function entreU(pts, de, a) {
    const r = [];
    for (let i = 1; i < pts.length; i++) {
      let p = pts[i - 1], q = pts[i];
      if (p[0] > q[0]) [p, q] = [q, p];
      const u0 = Math.max(de, p[0]), u1 = Math.min(a, q[0]);
      if (u1 <= u0) continue;
      const en = u => [u, p[1] + (q[1] - p[1]) * (u - p[0]) / ((q[0] - p[0]) || 1)];
      if (!r.length) r.push(en(u0));
      r.push(en(u1));
    }
    return r.sort((x, y) => x[0] - y[0]);
  }
  // polígono a ±m de una polilínea (ingletes simples)
  function franja(pts, m) {
    const izq = [], der = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      izq.push([p[0] - dy * m, p[1] + dx * m]); der.push([p[0] + dy * m, p[1] - dx * m]);
    });
    return izq.concat(der.reverse());
  }
  const V3 = (u, v, z) => new THREE.Vector3(...W(u, v, z || 0));

  /* ---------- Grupos ---------- */
  const gH = new THREE.Group(); gH.name = 'historia'; gH.visible = false; raizG.add(gH);
  const gCol = new THREE.Group(); gCol.name = 'historia-colonia'; gH.add(gCol);
  const gLim = new THREE.Group(); gLim.name = 'historia-limite'; gH.add(gLim);
  const gAut = new THREE.Group(); gAut.name = 'historia-coches'; gAut.visible = false; gH.add(gAut);
  const gMar = {};

  /* ---------- 1. Toda la colonia (en tandas) ---------- */
  const EXT = { u0: Math.min(R.u0, CAJA_LIM[0] - 330), u1: Math.max(R.u1, CAJA_LIM[2] + 330), v0: Math.min(R.v0, CAJA_LIM[1] - 330), v1: Math.max(R.v1, CAJA_LIM[3] + 330) };
  const ctxLim = q => dentro(centro(q), LIM);
  function armaSuelo() {
    const m = new Malla(), r = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
    [r(EXT.u0, EXT.v0, EXT.u1, S.v0), r(EXT.u0, S.v1, EXT.u1, EXT.v1), r(EXT.u0, S.v0, S.u0, S.v1), r(S.u1, S.v0, EXT.u1, S.v1)].forEach(q => tapa(m, q, 0));
    pon(gCol, m, 'ctxsuelo', null, false);
  }
  function armaCalles() {
    const cerca = { menor: new Lineas(), mayor: new Lineas() }, lejos = new Lineas(), tv = new Lineas();
    const z = 0.04, pon2 = (l, t) => l.poli(t.map(q => W(q[0], q[1], z)));
    // dentro del contexto del visor: sus calles (paramentos); fuera: los ejes de OSM
    (D.calles.menor || []).forEach(f => fuera(pares(f), S).forEach(t => pon2(cerca.menor, t)));
    (D.calles.mayor || []).forEach(f => fuera(pares(f), S).forEach(t => pon2(cerca.mayor, t)));
    H.calles.forEach(c => fuera(pares(c.p), R).forEach(t => {
      const enCol = dentro(t[Math.floor(t.length / 2)], LIM) || dentro(t[0], LIM);
      pon2(enCol ? (c.c === 'menor' || c.c === 'media' ? cerca.menor : cerca.mayor) : lejos, t);
    }));
    // tren: dos rieles a ±0.72 m
    const rieles = t => { [-0.72, 0.72].forEach(o => pon2(tv, franjaLado(t, o))); };
    (D.calles.tren || []).forEach(f => fuera(pares(f), S).forEach(rieles));
    H.tren.forEach(f => fuera(pares(f), R).forEach(rieles));
    fuera(G.ESPUELA, S).forEach(rieles);
    ponLineas(gCol, cerca.menor, 'ctxcalle', 0xffffff);
    ponLineas(gCol, cerca.mayor, 'ctxavenida', 0xffffff);
    ponLineas(gCol, lejos, 'ctxlejos', 0xffffff);
    ponLineas(gCol, tv, 'ctxtren', 0xffffff);
  }
  function franjaLado(pts, o) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      return [p[0] - dy / l * o, p[1] + dx / l * o];
    });
  }
  // El predio como está hoy: el levantamiento detallado de Luis desde Google Earth (atlampa-3d.js, historiaGrupo;
  // handoff/LEVANTAMIENTO_PREEXISTENCIA.md), con sus piezas en MARCAS.existente del guion. Las dos naves orientales
  // (G.NAVES, de Contexto.3dm) se conservan; lo demás se demuele en la etapa 2 y el aro corta las naves en G.CORTE.
  // En la etapa 1 el proyecto no aparece.
  const EXI = MARCAS.existente || { piezas: [] };
  function mallaNave(m, nv) {
    const paso = (nv.u1 - nv.u0) / nv.n;
    for (let j = 0; j < nv.n; j++) {
      const u0 = nv.u0 + j * paso, u1 = u0 + paso, um = (u0 + u1) / 2, v0 = nv.v0, v1 = nv.v1, a = nv.alero, c = nv.cumbre;
      const altura = u => a + (c - a) * Math.max(0, 1 - Math.abs(u - um) / (paso / 2));
      api.muros(m, api.rect(u0, v0, u1, v1), 0, 0, altura);
      m.tri(W(u0, v0, a), W(um, v0, c), W(u1, v0, a));
      m.tri(W(u1, v1, a), W(um, v1, c), W(u0, v1, a));
      m.quad(W(u0, v0, a), W(u0, v1, a), W(um, v1, c), W(um, v0, c));
      m.quad(W(um, v0, c), W(um, v1, c), W(u1, v1, a), W(u1, v0, a));
    }
  }
  function mallaPieza(m, p) {
    const [u0, v0, u1, v1] = p.planta;
    if (p.tipo === 'nave') mallaNave(m, { u0, v0, u1, v1, n: p.n || 1, alero: p.alero, cumbre: p.cumbre });
    else if (p.tipo === 'cobertizo') {   // cubierta de un agua, de altoO (al poniente) a altoE
      const z = u => p.altoO + (p.altoE - p.altoO) * (u - u0) / (u1 - u0);
      api.muros(m, api.rect(u0, v0, u1, v1), 0, 0, z);
      m.quad(W(u0, v0, p.altoO), W(u1, v0, p.altoE), W(u1, v1, p.altoE), W(u0, v1, p.altoO));
    } else prisma(m, api.rect(u0, v0, u1, v1), p.z0 || 0, p.alto);
  }
  const altoPieza = p => p.tipo === 'nave' ? p.cumbre : p.tipo === 'cobertizo' ? Math.max(p.altoO, p.altoE) : p.alto;
  const ALTO_EXISTENTE = Math.max(...G.NAVES.map(n => n.cumbre), ...EXI.piezas.map(altoPieza));
  function mallaNaves() { const m = new Malla(); G.NAVES.forEach(nv => mallaNave(m, nv)); return m; }
  function mallaDemuele() { const m = new Malla(); EXI.piezas.forEach(p => mallaPieza(m, p)); return m; }
  function mallaExistente() { const m = mallaNaves(); EXI.piezas.forEach(p => mallaPieza(m, p)); return m; }
  // las naves que se conservan, ya cortadas por el aro (las mismas piezas del visor: G.PIEZAS), con su cara de corte
  // (sinTecho / sinMuros: sólo una de las dos partes, para el mercado de la etapa 2)
  function mallaNavesCortadas(sinTecho, sinMuros) {
    const m = new Malla(), e = 1e-3;
    G.PIEZAS.forEach(pz => {
      const nv = pz.nv, L = pz.L, zf = u => nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - pz.um) / pz.run);
      const borde = (a, b) => (Math.abs(a[0] - L.u0) < e && Math.abs(b[0] - L.u0) < e) || (Math.abs(a[0] - L.u1) < e && Math.abs(b[0] - L.u1) < e) ||
        (Math.abs(a[1] - L.v0) < e && Math.abs(b[1] - L.v0) < e) || (Math.abs(a[1] - L.v1) < e && Math.abs(b[1] - L.v1) < e);
      [true, false].forEach(izq => {
        const h = G.cortaU(pz.pol, pz.um, izq); if (!h) return;
        if (!sinTecho) tapa(m, h, 0, u => zf(u));
        if (!sinMuros) api.muros(m, h, 0, 0, u => zf(u), (a, b) => borde(a, b) || !!(a[2] && b[2]));
      });
    });
    return m;
  }
  // lo de las naves que queda dentro del círculo del aro (lo que se demuele al cortar): cada crujía recortada
  // por el disco; sin cara de corte, que la pone la parte que se queda
  function enDisco(pol, c, r) {   // polígono convexo ∩ disco (Sutherland-Hodgman contra un polígono de 192 lados)
    let out = pol;
    for (let i = 0, n = 192; i < n && out.length; i++) {
      const t0 = i / n * 2 * Math.PI, t1 = (i + 1) / n * 2 * Math.PI;
      const a = [c[0] + r * Math.cos(t0), c[1] + r * Math.sin(t0)], b = [c[0] + r * Math.cos(t1), c[1] + r * Math.sin(t1)];
      const lado = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
      const cruce = (p, q) => { const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), t = d1 / (d1 - d2); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 1]; };
      const ent = out; out = [];
      ent.forEach((p, k) => { const q = ent[(k + 1) % ent.length], ip = lado(p), iq = lado(q); if (ip) out.push(p); if (ip !== iq) out.push(cruce(p, q)); });
    }
    return out.length > 2 ? out : null;
  }
  function mallaNavesDentro() {
    const m = new Malla(), e = 1e-3, A = G.ANILLO;
    G.NAVES.forEach(nv => {
      const L = nv.L || nv, paso = (nv.u1 - nv.u0) / nv.n;
      const borde = (a, b) => (Math.abs(a[0] - L.u0) < e && Math.abs(b[0] - L.u0) < e) || (Math.abs(a[0] - L.u1) < e && Math.abs(b[0] - L.u1) < e) ||
        (Math.abs(a[1] - L.v0) < e && Math.abs(b[1] - L.v0) < e) || (Math.abs(a[1] - L.v1) < e && Math.abs(b[1] - L.v1) < e);
      for (let j = 0; j < nv.n; j++) {
        const ua = nv.u0 + j * paso, um = ua + paso / 2, a0 = Math.max(ua, L.u0), a1 = Math.min(ua + paso, L.u1);
        const zf = u => nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - um) / (paso / 2));
        const pol = enDisco([[a0, L.v0], [um, L.v0], [a1, L.v0], [a1, L.v1], [um, L.v1], [a0, L.v1]], [A.u, A.v], G.CORTE);
        if (!pol) continue;
        [true, false].forEach(izq => {
          const h = G.cortaU(pol, um, izq); if (!h) return;
          tapa(m, h, 0, u => zf(u));
          api.muros(m, h, 0, 0, u => zf(u), borde);
        });
      }
    });
    return m;
  }
  // los portones de la calle interior (entre los dos lotes), en Fresno y en Sabino
  function lineasPortones() {
    const l = new Lineas(), p = EXI.portones; if (!p) return l;
    [G.PB.u0 + 0.4, G.PB.u1 - 0.4].forEach(u => {
      [p.v0, p.v1].forEach(v => l.seg(W(u, v, 0.1), W(u, v, p.alto)));
      [0.2, p.alto].forEach(h => l.seg(W(u, p.v0, h), W(u, p.v1, h)));
      for (let v = p.v0 + 1.2; v < p.v1; v += 1.2) l.seg(W(u, v, 0.2), W(u, v, p.alto));
    });
    return l;
  }
  const areaPol = q => Math.abs(q.reduce((s, p, i) => { const r = q[(i + 1) % q.length]; return s + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2;
  const EXIS = {};   // grupos de lo existente: naves completas, naves cortadas por el aro y lo que se demuele
  function armaExistente() {
    const piso = new Malla(); tapa(piso, api.rect(G.PB.u0, G.PB.v0, G.PB.u1, G.PB.v1), 0.02);
    pon(gCol, piso, 'ctxsuelo', null, false);
    const grupo = (nombre, malla, visible, papel) => { const g = new THREE.Group(); g.name = nombre; g.visible = visible; gCol.add(g); pon(g, malla, papel || 'ctxpredio', null, 25); return g; };
    EXIS.naves = grupo('existente-naves', mallaNaves(), true);
    EXIS.cortadas = grupo('existente-naves-cortadas', mallaNavesCortadas(), false);
    EXIS.dentro = grupo('existente-naves-dentro', mallaNavesDentro(), false, 'ctxcorte');
    EXIS.demuele = grupo('existente-demuele', mallaDemuele(), true, 'ctxdemuele');
    ponLineas(EXIS.demuele, lineasPortones(), 'ctxdemuele', 0xffffff);
    // cifras para las tarjetas (huellas en planta; lo de Earth es aproximado)
    const A = G.ANILLO, fmt = x => (Math.round(x / 10) * 10).toLocaleString('es-MX');
    const rN = nv => api.rect(nv.u0, nv.v0, nv.u1, nv.v1);
    const aN = G.NAVES.reduce((s, nv) => s + areaPol(rN(nv)), 0);
    const aD = EXI.piezas.filter(p => !p.z0).reduce((s, p) => s + (p.planta[2] - p.planta[0]) * (p.planta[3] - p.planta[1]), 0);
    const aC = G.NAVES.reduce((s, nv) => { const q = G.menosCirculo(rN(nv), [A.u, A.v], G.CORTE); return s + areaPol(rN(nv)) - (q ? areaPol(q) : 0); }, 0);
    Object.assign(CALCULADOS, { huellaHoy: fmt(aN + aD), huellaDemolida: fmt(aD), huellaNaves: fmt(aN), corteNaves: fmt(aC), crujias: G.NAVES.reduce((s, nv) => s + nv.n, 0) });
    // el predio resaltado: su contorno (doble, con la banqueta) y un velo claro sobre el piso
    const lp = new Lineas(), P = G.PRED;
    lp.poli(P.map(q => W(q[0], q[1], 0.3)), true);
    lp.poli(franjaLado(P.concat([P[0]]), -2.2).slice(0, -1).map(q => W(q[0], q[1], 0.3)), true);
    ponLineas(gCol, lp, 'ctxresalta', 0xffffff);
    const vp = new Malla(); tapa(vp, P, 0.08);
    const velo = new THREE.Mesh(vp.geo(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false }));
    velo.renderOrder = 2; gCol.add(velo);
    const tv = new Lineas();
    adentro(G.ESPUELA, S).forEach(t => [-0.72, 0.72].forEach(o => tv.poli(franjaLado(t, o).map(q => W(q[0], q[1], 0.06)))));
    // los durmientes de las vías que cruzan el predio (como en el levantamiento de Luis)
    const ejeVias = G.ESPUELA[G.ESPUELA.length - 1][1];
    for (let u = G.PB.u0 + 0.5; u < G.ESP_FIN; u += 1.6) tv.seg(W(u, ejeVias - 1.3, 0.05), W(u, ejeVias + 1.3, 0.05));
    ponLineas(gCol, tv, 'ctxtren', 0xffffff);
  }
  const EDIF = D.edificios.map(f => ({ h: f[0], q: pares(f, 1) })).concat(H.edificios.map(f => ({ h: f[0], q: pares(f, 1) })));
  function armaEdificios(i0, i1) {
    const cerca = new Malla(), lejos = new Malla();
    EDIF.slice(i0, i1).forEach(e => prisma(ctxLim(e.q) ? cerca : lejos, e.q, 0, e.h));
    if (cerca.p.length) pon(gCol, cerca, 'contexto', null, 25);
    if (lejos.p.length) pon(gCol, lejos, 'ctxlejos', null, 25);
  }
  // límite: línea punteada y, afuera, una veladura que deja la colonia al frente
  const matLim = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 9, gapSize: 6, transparent: true, opacity: 0 });
  const matVelo = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  function armaLimite() {
    const pts = LIM.concat([LIM[0]]).map(p => V3(p[0], p[1], 0.6));
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matLim);
    l.computeLineDistances(); l.renderOrder = 3; gLim.add(l);
    const caja = [[EXT.u0 - 1500, EXT.v0 - 1500], [EXT.u1 + 1500, EXT.v0 - 1500], [EXT.u1 + 1500, EXT.v1 + 1500], [EXT.u0 - 1500, EXT.v1 + 1500]];
    const m = new Malla(); api.tapaHueco(m, caja, LIM, 0.08);
    const velo = new THREE.Mesh(m.geo(), matVelo); velo.renderOrder = 2; gLim.add(velo);
  }

  /* ---------- 2. Coches en todas las calles ---------- */
  const ESC = 2.4, CARRILES = [];
  const DENS = { via: 55, mayor: 75, media: 110, menor: 150 }, OFF = { via: [1.8, 5.4], mayor: [2.2, 5.6], media: [2.4], menor: [2.2] };
  function carril(pts, off, dir, cada, semilla) {
    const acc = [0];
    for (let j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const L = acc[acc.length - 1];
    if (L < 25) return;
    const n = Math.max(1, Math.round(L / cada)), autos = [];
    for (let a = 0; a < n; a++) {
      let r = Math.sin(semilla * 12.9898 + (a + 1) * 78.233) * 43758.5453; r -= Math.floor(r);
      autos.push({ s0: (a + 0.5 * r) * L / n, vel: 7 + 6 * r });
    }
    CARRILES.push({ p: pts, acc, L, dir, off, autos });
  }
  // sólo en la colonia y en las avenidas que la rodean (afuera serían ruido)
  function aLim(p) {
    let m = Infinity;
    for (let i = 0; i < LIM.length; i++) {
      const a = LIM[i], b = LIM[(i + 1) % LIM.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      m = Math.min(m, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
    }
    return m;
  }
  H.calles.forEach((c, i) => fuera(pares(c.p), S).forEach((t, k) => {
    const mid = t[Math.floor(t.length / 2)];
    if (!dentro(mid, LIM) && aLim(mid) > 45) return;
    const cada = DENS[c.c] || 150;
    OFF[c.c].forEach((o, j) => {
      const sem = i * 13 + k * 5 + j;
      if (c.s) carril(t, o, 1, cada, sem);
      else { carril(t, o, 1, cada, sem + 1); carril(t, o, -1, cada, sem + 2); }
    });
  }));
  function enCarril(c, s) {
    const acc = c.acc, L = c.L;
    s = ((s % L) + L) % L;
    if (c.dir < 0) s = L - s;
    let j = 1;
    while (j < acc.length - 1 && acc[j] < s) j++;
    const a = c.p[j - 1], b = c.p[j], t = (s - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1);
    let dx = (b[0] - a[0]) * c.dir, dy = (b[1] - a[1]) * c.dir;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    return [a[0] + (b[0] - a[0]) * t + dy * c.off, a[1] + (b[1] - a[1]) * t - dx * c.off, dx, dy];
  }
  const AUTOS = [];
  CARRILES.forEach(c => c.autos.forEach(au => AUTOS.push([c, au])));
  const carro = new Malla(), L0 = (x0, y0, x1, y1) => [[CEN[0] + x0, CEN[1] + y0], [CEN[0] + x1, CEN[1] + y0], [CEN[0] + x1, CEN[1] + y1], [CEN[0] + x0, CEN[1] + y1]];
  prisma(carro, L0(-2.1, -0.9, 2.1, 0.9), 0.3, 1.0);
  prisma(carro, L0(-1.3, -0.75, 0.8, 0.75), 1.0, 1.45);
  const NA = Math.max(1, AUTOS.length);
  const carros = new THREE.InstancedMesh(carro.geo(), material('carro'), NA);
  carros.instanceMatrix.setUsage(THREE.DynamicDrawUsage); carros.frustumCulled = false; gAut.add(carros);
  const ar = new THREE.InstancedBufferGeometry();
  ar.setAttribute('position', new THREE.EdgesGeometry(carros.geometry, 25).getAttribute('position'));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3), aGiro = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3);
  aPos.setUsage(THREE.DynamicDrawUsage); aGiro.setUsage(THREE.DynamicDrawUsage);
  ar.setAttribute('iPos', aPos); ar.setAttribute('iGiro', aGiro);
  const opCarros = { value: 0 };
  const matAr = new THREE.ShaderMaterial({
    transparent: true, uniforms: { uOp: opCarros },
    vertexShader: /* glsl */`attribute vec3 iPos; attribute vec3 iGiro;
      void main() { vec3 p = position * iGiro.z; p = vec3(p.x * iGiro.x + p.z * iGiro.y, p.y, -p.x * iGiro.y + p.z * iGiro.x);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + iPos, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uOp; void main() { gl_FragColor = vec4(vec3(0.58), 0.42 * uOp); }`
  });
  const carrosAr = new THREE.LineSegments(ar, matAr); carrosAr.frustumCulled = false; gAut.add(carrosAr);
  const MM = new THREE.Matrix4(), Q = new THREE.Quaternion(), VV = new THREE.Vector3(), EE = new THREE.Vector3(ESC, ESC, ESC), EJE = new THREE.Vector3(0, 1, 0);
  function mueveCarros(ms) {
    const t = ms / 1000;
    for (let i = 0; i < AUTOS.length; i++) {
      const c = AUTOS[i][0], au = AUTOS[i][1], r = enCarril(c, au.s0 + au.vel * 1.8 * t), p = W(r[0], r[1], 0.05), a = Math.atan2(r[3], r[2]);
      Q.setFromAxisAngle(EJE, a);
      MM.compose(VV.set(p[0], p[1], p[2]), Q, EE);
      carros.setMatrixAt(i, MM);
      aPos.setXYZ(i, p[0], p[1], p[2]); aGiro.setXYZ(i, Math.cos(a), Math.sin(a), ESC);
    }
    carros.count = AUTOS.length; ar.instanceCount = AUTOS.length;
    carros.instanceMatrix.needsUpdate = true; aPos.needsUpdate = true; aGiro.needsUpdate = true;
  }

  /* ---------- 2b. Personas en las banquetas ----------
     Pictogramas claros (las figuras del visor, negras de contorno fino, no se
     leen a esta escala), de un tamaño fijo en pantalla al alejarse y de tamaño
     real al acercarse. 4 poses de caminar × 3 tipos. */
  const FIG = (() => {
    const T = 32, A = 64, N = 3, POSES = 4, c = document.createElement('canvas');
    c.width = N * T; c.height = POSES * A;
    const x = c.getContext('2d');
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let f = 0; f < POSES; f++) for (let i = 0; i < N; i++) {
      const s = Math.sin(f * Math.PI / 2), ox = i * T + 16, oy = f * A, bob = f % 2 ? 1 : 0;
      x.fillStyle = x.strokeStyle = '#e9e7e1';
      x.beginPath(); x.arc(ox, oy + 9 + bob, 5.2, 0, Math.PI * 2); x.fill();                    // cabeza
      x.lineWidth = 7.5; x.beginPath(); x.moveTo(ox, oy + 19 + bob); x.lineTo(ox, oy + 35 + bob); x.stroke();   // torso
      if (i === 1) { x.beginPath(); x.moveTo(ox - 6, oy + 44); x.lineTo(ox + 6, oy + 44); x.lineTo(ox + 3, oy + 28); x.lineTo(ox - 3, oy + 28); x.fill(); }   // falda
      x.lineWidth = 4.2;
      x.beginPath(); x.moveTo(ox, oy + 36 + bob); x.lineTo(ox + 9 * s, oy + 60); x.moveTo(ox, oy + 36 + bob); x.lineTo(ox - 9 * s, oy + 60); x.stroke();   // piernas
      x.lineWidth = 3.4;
      x.beginPath(); x.moveTo(ox, oy + 21 + bob); x.lineTo(ox - 7 * s, oy + 34); x.moveTo(ox, oy + 21 + bob); x.lineTo(ox + 7 * s, oy + 34); x.stroke();   // brazos
      if (i === 2) { x.fillRect(ox + 3, oy + 26, 7, 9); }   // con bolsa
    }
    const tex = new THREE.CanvasTexture(c);
    return { tex, N, POSES, alto: 1.72, ancho: 0.86, camina: [0, 1, 2] };
  })();
  const PX_PERSONA = 15, PESC = 1, PERS = [];
  // alto en pantalla (px) de una persona: PX_PERSONA de lejos (algo menos si está muy lejos), el real de cerca
  function pxPersona() {
    const mpp = 2 * api.camaraEstado().h / Math.max(1, trabajo.clientHeight);
    return { mpp, px: Math.max(Math.max(7, Math.min(PX_PERSONA, PX_PERSONA * Math.sqrt(0.9 / mpp))), FIG.alto / mpp) };
  }
  let semP = 91;
  const azarP = () => { semP = (semP * 16807) % 2147483647; return (semP - 1) / 2147483646; };
  H.calles.forEach(c => {
    if (c.c === 'via') return;
    fuera(pares(c.p), S).forEach(t => {
      if (!dentro(t[Math.floor(t.length / 2)], LIM)) return;
      const acc = [0];
      for (let j = 1; j < t.length; j++) acc.push(acc[j - 1] + Math.hypot(t[j][0] - t[j - 1][0], t[j][1] - t[j - 1][1]));
      const L = acc[acc.length - 1];
      if (L < 30) return;
      const off = c.c === 'mayor' ? 9 : 5.5, n = Math.max(1, Math.round(L / 60));
      [-1, 1].forEach(lado => { for (let k = 0; k < n; k++) PERS.push({ p: t, acc, L, lado: lado * off * (0.85 + 0.3 * azarP()), s0: azarP() * L * 2,
        vel: (1.1 + 0.5 * azarP()) * 2.2 * (azarP() < 0.5 ? 1 : -1), tile: FIG.camina[Math.floor(azarP() * FIG.camina.length)], esc: PESC * (0.9 + 0.2 * azarP()) }); });
    });
  });
  const gPer = new THREE.Group(); gPer.name = 'historia-personas'; gPer.visible = false; gH.add(gPer);
  const PM = api.mallaAtlas(Math.max(1, PERS.length), api.matAtlas(FIG.tex, FIG.N, FIG.POSES, DC_));
  PERS.forEach((q, i) => { PM.aEsc.setXY(i, FIG.ancho * q.esc, FIG.alto * q.esc); PM.aTile.setX(i, q.tile); });
  PM.malla.geometry.instanceCount = PERS.length;
  gPer.add(PM.malla);
  const derecha = new THREE.Vector3();
  const caminan = ms => mueveGente(PERS, PM, ms);
  function mueveGente(PERS, PM, ms) {
    const t = ms / 1000;
    derecha.setFromMatrixColumn(api.camara().matrixWorld, 0);
    // tamaño: PX_PERSONA en pantalla de lejos, el real de cerca
    const { mpp, px } = pxPersona(), k = Math.max(1, px * mpp / FIG.alto);
    if (Math.abs(k - (PM.k || 0)) > 0.01) {
      PM.k = k;
      for (let i = 0; i < PERS.length; i++) PM.aEsc.setXY(i, FIG.ancho * PERS[i].esc * k, FIG.alto * PERS[i].esc * k);
      PM.aEsc.needsUpdate = true;
    }
    for (let i = 0; i < PERS.length; i++) {
      const q = PERS[i], s = q.s0 + q.vel * t, L = q.L, tt = ((s % (2 * L)) + 2 * L) % (2 * L), d = tt <= L ? tt : 2 * L - tt, va = tt <= L ? 1 : -1;
      let j = 1; while (j < q.acc.length - 1 && q.acc[j] < d) j++;
      const a = q.p[j - 1], b = q.p[j], f = (d - q.acc[j - 1]) / ((q.acc[j] - q.acc[j - 1]) || 1);
      const du = (b[0] - a[0]) * va, dv = (b[1] - a[1]) * va, n = Math.hypot(du, dv) || 1;
      const u = a[0] + (b[0] - a[0]) * f - dv / n * q.lado * va, v = a[1] + (b[1] - a[1]) * f + du / n * q.lado * va;
      const w = W(u + du / n, v + dv / n, 0), o = W(u, v, PM.z != null ? PM.z : 0.25);   // PM.z: a qué altura caminan
      PM.aPos.setXYZ(i, o[0], o[1], o[2]);
      PM.aVolt.setX(i, (w[0] - o[0]) * derecha.x + (w[2] - o[2]) * derecha.z >= 0 ? 1 : -1);
      PM.aPose.setX(i, Math.floor(Math.abs(s) / (0.35 * q.esc * k)) % 4);
    }
    PM.aPos.needsUpdate = true; PM.aVolt.needsUpdate = true; PM.aPose.needsUpdate = true;
  }

  /* ---------- 3. Marcas ---------- */
  const matAm = op => new THREE.MeshBasicMaterial({ color: AMARILLO, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const linAm = op => new THREE.LineBasicMaterial({ color: AMARILLO, transparent: true, opacity: op });
  const MARCA = {};   // id → { g, piezas: [{ obj, mats: [[mat, op]], esc }], rotulos, latido(ms) }
  function armaAsentamientos() {
    const def = MARCAS.asentamientos, g = new THREE.Group(); g.name = 'marca-asentamientos'; g.visible = false; gH.add(g);
    const piezas = [], rotulos = [];
    // la vía de Crisantema (OSM: railway=abandoned, casi horizontal por v ≈ 120)
    const via = H.trenViejo.map(f => pares(f)).sort((a, b) => b.filter(p => p[1] > 100 && p[1] < 130).length - a.filter(p => p[1] > 100 && p[1] < 130).length)[0];
    def.franjas.forEach((f, i) => {
      const eje = entreU(via, f.de, f.a);
      if (eje.length < 2) return;
      const pol = franja(eje, 7), alto = 4.5;
      const sub = new THREE.Group(), relleno = new Malla(), piso = new Malla();
      prisma(relleno, pol, 0, alto); tapa(piso, pol, 0.12);
      const mA = matAm(0.38), mP = matAm(0.5), mL = linAm(0.95);
      const malla = new THREE.Mesh(relleno.geo(), mA), suelo = new THREE.Mesh(piso.geo(), mP);
      const cont = new Lineas(); cont.poli(pol.map(q => W(q[0], q[1], alto)), true); cont.poli(pol.map(q => W(q[0], q[1], 0.15)), true);
      const lin = new THREE.LineSegments(cont.geo(), mL);
      [malla, suelo, lin].forEach(o => { o.renderOrder = 6; sub.add(o); });
      g.add(sub);
      piezas.push({ obj: sub, mats: [[mA, 0.38], [mP, 0.5], [mL, 0.95]], crece: true, retraso: i * 220 });
    });
    (def.rotulos || []).forEach((r, i) => rotulos.push(Object.assign({ tipo: 'marca', retraso: 500 + i * 220 }, r)));
    (def.reubicados || []).forEach((r, i) => {
      const pts = [];
      H.calles.filter(c => c.n === r.calle).forEach(c => pares(c.p).forEach(p => pts.push(p)));
      if (pts.length < 2) return;
      pts.sort((a, b) => a[0] - b[0]);
      const pol = franja(pts, 4), sub = new THREE.Group(), piso = new Malla();
      tapa(piso, pol, 0.12);
      const mP = matAm(0.16), mL = new THREE.LineDashedMaterial({ color: AMARILLO, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.85 });
      const lin = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pol.concat([pol[0]]).map(q => V3(q[0], q[1], 0.2))), mL);
      lin.computeLineDistances();
      [new THREE.Mesh(piso.geo(), mP), lin].forEach(o => { o.renderOrder = 6; sub.add(o); });
      g.add(sub);
      piezas.push({ obj: sub, mats: [[mP, 0.16], [mL, 0.85]], retraso: 700 + i * 200 });
      const c = pts[Math.floor(pts.length / 2)];
      rotulos.push({ u: c[0], v: c[1], z: 3, texto: r.texto, sub: r.sub, tipo: 'marca tenue', retraso: 900 });
    });
    if (def.destino) {
      const d = def.destino, sub = new THREE.Group();
      const anillo = new THREE.Mesh(new THREE.RingGeometry(9, 11, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
      anillo.position.copy(V3(d.u, d.v, 0.3)); anillo.renderOrder = 6; sub.add(anillo); g.add(sub);
      piezas.push({ obj: sub, mats: [[anillo.material, 0.9]], retraso: 1000 });
      rotulos.push({ u: d.u, v: d.v, z: 2, texto: d.texto, sub: d.sub, tipo: 'punto', retraso: 1100 });
    }
    MARCA.asentamientos = { g, piezas, rotulos, latido(ms, k) {
      // contorno que respira, lento
      const f = 0.75 + 0.25 * Math.sin(ms / 520);
      piezas.forEach(p => { if (p.crece) p.mats[2][0].opacity = p.mats[2][1] * f * k; });
    } };
  }
  function armaBalaceras() {
    const g = new THREE.Group(); g.name = 'marca-balaceras'; g.visible = false; gH.add(g);
    const piezas = [], rotulos = [], ondas = [];
    const geoDisco = new THREE.CircleGeometry(4, 40).rotateX(-Math.PI / 2), geoOnda = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
    const rojo = op => new THREE.MeshBasicMaterial({ color: ROJO, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
    MARCAS.balaceras.forEach((b, i) => {
      const sub = new THREE.Group();
      const mD = rojo(0.55), mO1 = rojo(0), mO2 = rojo(0);
      const disco = new THREE.Mesh(geoDisco, mD); disco.position.copy(V3(b.u, b.v, 0.35));
      const o1 = new THREE.Mesh(geoOnda, mO1), o2 = new THREE.Mesh(geoOnda, mO2);
      o1.position.copy(V3(b.u, b.v, 0.3)); o2.position.copy(V3(b.u, b.v, 0.3));
      [disco, o1, o2].forEach(o => { o.renderOrder = 7; sub.add(o); });
      g.add(sub);
      piezas.push({ obj: sub, mats: [[mD, 0.55]], retraso: i * 260 });
      ondas.push({ o1, o2, fase: i * 0.37 });
      rotulos.push({ u: b.u, v: b.v, z: 0.5, texto: b.texto, sub: b.sub, fecha: b.fecha, lado: b.lado, tipo: 'balacera', retraso: 350 + i * 260 });
    });
    MARCA.balaceras = { g, piezas, rotulos, latido(ms, k) {
      ondas.forEach(w => [[w.o1, 0], [w.o2, 0.5]].forEach(([o, d]) => {
        let f = ms / 2200 + w.fase + d; f -= Math.floor(f);
        const r = 4 + 24 * f; o.scale.set(r, 1, r); o.material.opacity = 0.85 * (1 - f) * (1 - f) * k;
      }));
    } };
  }

  /* ---------- 3b. Marcas de la segunda parte: cultura, verdes, espuela y el circuito ---------- */
  const matC = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const linC = (c, op) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op });
  // los flujos del metabolismo urbano (lámina «circuito»): un color por flujo en los pulsos
  const COLORES_FLUJOS = (MARCAS.flujos || [['#ffffff', 'flujos']]).map(f => f[0]);
  function grupoMarca(id) { const g = new THREE.Group(); g.name = 'marca-' + id; g.visible = false; gH.add(g); return g; }
  // tira plana a lo largo de una polilínea; los triángulos van en orden, así que se puede «trazar» con drawRange
  function cinta(pts, ancho, z) {
    const iz = franjaLado(pts, -ancho / 2), de = franjaLado(pts, ancho / 2), p = [];
    for (let i = 1; i < pts.length; i++) {
      const a = W(iz[i - 1][0], iz[i - 1][1], z), b = W(de[i - 1][0], de[i - 1][1], z), c = W(iz[i][0], iz[i][1], z), d = W(de[i][0], de[i][1], z);
      p.push(...a, ...b, ...c, ...b, ...d, ...c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }
  // partes de una polilínea dentro del rectángulo r
  function adentro(pts, r) {
    const tramos = []; let cur = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
      let t0 = 0, t1 = 1, ok = true;
      const P = [-dx, dx, -dy, dy], Qv = [a[0] - r.u0, r.u1 - a[0], a[1] - r.v0, r.v1 - a[1]];
      for (let k = 0; k < 4; k++) {
        if (P[k] === 0) { if (Qv[k] < 0) ok = false; continue; }
        const t = Qv[k] / P[k];
        if (P[k] < 0) { if (t > t1) ok = false; else if (t > t0) t0 = t; } else { if (t < t0) ok = false; else if (t < t1) t1 = t; }
      }
      if (!ok || t1 - t0 < 1e-9) { if (cur.length > 1) tramos.push(cur); cur = []; continue; }
      if (!cur.length || t0 > 0) { if (cur.length > 1) tramos.push(cur); cur = [[a[0] + dx * t0, a[1] + dy * t0]]; }
      cur.push([a[0] + dx * t1, a[1] + dy * t1]);
      if (t1 < 1) { tramos.push(cur); cur = []; }
    }
    if (cur.length > 1) tramos.push(cur);
    return tramos;
  }
  // partes de una polilínea dentro de la colonia (muestreo cada 3 m)
  function enColonia(pts) {
    const tramos = []; let cur = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) {
        const q = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n];
        if (dentro(q, LIM)) cur.push(q); else { if (cur.length > 1) tramos.push(cur); cur = []; }
      }
    }
    if (cur.length > 1) tramos.push(cur);
    return tramos;
  }
  // recorridos del guion: 'ESPUELA' es el trazo de la espuela del visor ('ESPUELA<', al revés) y
  // 'CIERRE', el tramo con que la espuela original cerraba al oriente del predio (MARCAS.espuela.cierre)
  const CIERRE = (MARCAS.espuela && MARCAS.espuela.cierre) || [];
  const expande = lista => lista.flatMap(p => p === 'ESPUELA' ? G.ESPUELA.map(q => [q[0], q[1]]) : p === 'ESPUELA<' ? G.ESPUELA.map(q => [q[0], q[1]]).reverse() :
    p === 'CIERRE' ? CIERRE.map(q => [q[0], q[1]]) : p === 'CIERRE<' ? CIERRE.map(q => [q[0], q[1]]).reverse() : [p]);
  const largo = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
  // pulsos de luz que recorren polilíneas (un InstancedMesh de rectángulos planos)
  const geoPulso = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function pulsos(caminos, o) {
    const items = [];
    caminos.forEach(pts => {
      const acc = [0];
      for (let j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      const L = acc[acc.length - 1]; if (L < 8) return;
      const n = Math.max(1, Math.round(L / (o.cada || 80)));
      for (let k = 0; k < n; k++) items.push({ pts, acc, L, s0: k * L / n });
    });
    const mat = new THREE.MeshBasicMaterial({ color: o.colores ? 0xffffff : o.color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const im = new THREE.InstancedMesh(geoPulso, mat, Math.max(1, items.length));
    im.count = items.length; im.frustumCulled = false; im.renderOrder = 8;
    if (o.colores) { const cs = o.colores.map(c => new THREE.Color(c)); items.forEach((it, i) => im.setColorAt(i, cs[i % cs.length])); im.instanceColor.needsUpdate = true; }
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), e3 = new THREE.Vector3(o.largo || 10, 1, o.ancho || 3);
    function mueve(ms) {
      const t = ms / 1000;
      items.forEach((it, i) => {
        let s = it.s0 + (o.vel || 14) * t; s = ((s % it.L) + it.L) % it.L;
        let j = 1; while (j < it.acc.length - 1 && it.acc[j] < s) j++;
        const a = it.pts[j - 1], b = it.pts[j], f = (s - it.acc[j - 1]) / ((it.acc[j] - it.acc[j - 1]) || 1);
        const w = W(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, o.z || 0.6);
        q.setFromAxisAngle(EJE, Math.atan2(b[1] - a[1], b[0] - a[0]));
        M4.compose(pos.set(w[0], w[1], w[2]), q, e3); im.setMatrixAt(i, M4);
      });
      im.instanceMatrix.needsUpdate = true;
    }
    mueve(0);
    return { obj: im, mat, mueve };
  }
  // ondas en el piso (como las de las balaceras), de un color
  const geoOndaC = new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
  function ondas(g, u, v, color, r0, r1, fase) {
    const os = [0, 0.5].map(() => { const o = new THREE.Mesh(geoOndaC, matC(color, 0)); o.position.copy(V3(u, v, 0.3)); o.renderOrder = 7; g.add(o); return o; });
    return (ms, k) => os.forEach((o, i) => {
      let f = ms / 2400 + (fase || 0) + i * 0.5; f -= Math.floor(f);
      const rr = r0 + (r1 - r0) * f; o.scale.set(rr, 1, rr); o.material.opacity = 0.8 * (1 - f) * (1 - f) * k;
    });
  }
  function caja3D(g, pol, alto, color, op) {
    const sub = new THREE.Group(), m = new Malla(); prisma(m, pol, 0, alto);
    const mA = matC(color, op), mL = linC(color, 1), cont = new Lineas();
    cont.poli(pol.map(q => W(q[0], q[1], alto)), true); cont.poli(pol.map(q => W(q[0], q[1], 0.2)), true);
    pol.forEach(q => cont.seg(W(q[0], q[1], 0.2), W(q[0], q[1], alto)));
    [new THREE.Mesh(m.geo(), mA), new THREE.LineSegments(cont.geo(), mL)].forEach(o => { o.renderOrder = 6; sub.add(o); });
    g.add(sub);
    return { obj: sub, mats: [[mA, op], [mL, 1]], crece: true };
  }

  function armaCultura() {
    const d = MARCAS.cultura, g = grupoMarca('cultura'), piezas = [], rotulos = [];
    // el edificio de Casa Wabi: el que contiene el punto (si no hay, una caja de 28 × 22 m)
    const ed = d.planta ? null : EDIF.find(e => dentro([d.u, d.v], e.q));
    const pol = d.planta || (ed ? ed.q : [[d.u - 14, d.v - 11], [d.u + 14, d.v - 11], [d.u + 14, d.v + 11], [d.u - 14, d.v + 11]]), alto = d.alto || ((ed ? ed.h : 8) + 0.4);
    piezas.push(caja3D(g, pol, alto, LILA, 0.55));
    const c = centro(pol), haz = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(c[0], c[1], alto), V3(c[0], c[1], alto + 48)]), linC(LILA, 0.9));
    haz.renderOrder = 7; g.add(haz); piezas.push({ obj: haz, mats: [[haz.material, 0.9]], crece: true, retraso: 300 });
    const onda = ondas(g, c[0], c[1], LILA, 10, 70, 0);
    rotulos.push({ u: c[0], v: c[1], z: alto + 48, texto: d.texto, sub: d.sub, tipo: 'marca cultura', retraso: 600 });
    (d.rotulos || []).forEach(x => rotulos.push(Object.assign({ tipo: 'calle', retraso: 900 }, x)));
    MARCA.cultura = { g, piezas, rotulos, latido: (ms, k) => onda(ms, k) };
  }

  function armaVerdes() {
    const d = MARCAS.verdes, g = grupoMarca('verdes'), piezas = [], rotulos = [], C = d.centro;
    // suelo oscuro hasta donde llegan los parques (el modelo termina antes)
    const disco = new THREE.Mesh(new THREE.CircleGeometry(d.radio + 500, 120).rotateX(-Math.PI / 2), matC(0x0c0c0c, 1));
    disco.position.copy(V3(C[0], C[1], -0.12)); disco.renderOrder = 0; g.add(disco); piezas.push({ obj: disco, mats: [[disco.material, 1]] });
    const mv = new Malla(), cont = new Lineas();
    H.verdes.forEach(v => {
      const q = pares(v.p), c = centro(q);
      if (Math.hypot(c[0] - C[0], c[1] - C[1]) > d.radio + 450) return;
      tapa(mv, q, 0.22); cont.poli(q.map(p => W(p[0], p[1], 0.24)), true);
    });
    const mV = matC(VERDE, 0.78), mVL = linC(VERDE, 0.95);
    const par = new THREE.Mesh(mv.geo(), mV), parL = new THREE.LineSegments(cont.geo(), mVL);
    par.renderOrder = 5; parL.renderOrder = 5; g.add(par, parL);
    piezas.push({ obj: par, mats: [[mV, 0.78]], retraso: 200 }, { obj: parL, mats: [[mVL, 0.95]], retraso: 200 });
    const la = new Lineas();
    H.avenidas.forEach(f => fuera(pares(f), EXT).forEach(t => la.poli(t.map(q => W(q[0], q[1], 0.05)))));
    const mAv = linC(0xffffff, 0.22), av = new THREE.LineSegments(la.geo(), mAv); g.add(av); piezas.push({ obj: av, mats: [[mAv, 0.22]] });
    const circ = [];
    for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; circ.push(V3(C[0] + d.radio * Math.cos(a), C[1] + d.radio * Math.sin(a), 0.5)); }
    const mCi = new THREE.LineDashedMaterial({ color: VERDE, dashSize: 34, gapSize: 20, transparent: true, opacity: 0.9 });
    const ci = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), mCi); ci.computeLineDistances(); ci.renderOrder = 6; g.add(ci);
    piezas.push({ obj: ci, mats: [[mCi, 0.9]], retraso: 500 });
    rotulos.push({ u: C[0], v: C[1] + d.radio, z: 1, texto: d.textoRadio || '1.5 km', tipo: 'calle', retraso: 800 });
    (d.parques || []).forEach((x, i) => {
      const v = H.verdes.find(y => y.n === x.nombre); if (!v) return;
      const c = centro(pares(v.p));
      rotulos.push({ u: c[0], v: c[1], z: 1, texto: x.texto || x.nombre, sub: x.sub, tipo: 'marca verde', lado: x.lado, retraso: 700 + i * 150 });
    });
    if (d.vacio) rotulos.push(Object.assign({ tipo: 'cifra', retraso: 400 }, d.vacio));
    MARCA.verdes = { g, piezas, rotulos, latido() {} };
  }

  function armaEspuela() {
    const d = MARCAS.espuela, g = grupoMarca('espuela'), piezas = [], rotulos = [];
    const caminos = [G.ESPUELA.map(p => [p[0], p[1]])];
    if (CIERRE.length > 1) caminos.push(CIERRE.map(p => [p[0], p[1]]));
    H.trenViejo.forEach(f => adentro(pares(f), EXT).forEach(t => { if (largo(t) > 30) caminos.push(t); }));
    caminos.forEach((pts, i) => {
      const geo = cinta(pts, 7, 0.34), m = matC(OCRE, 0.95), mesh = new THREE.Mesh(geo, m);
      mesh.renderOrder = 6; g.add(mesh);
      piezas.push({ obj: mesh, mats: [[m, 0.95]], traza: { g: geo, n: geo.attributes.position.count }, dur: 1800, retraso: i * 220 });
    });
    const pl = pulsos(caminos, { color: 0xfff0d0, cada: 120, vel: 26, largo: 26, ancho: 4.5, z: 0.5 });
    g.add(pl.obj); piezas.push({ obj: pl.obj, mats: [[pl.mat, 0.95]], retraso: 1800 });
    (d.rotulos || []).forEach((x, i) => rotulos.push(Object.assign({ tipo: 'marca espuela', retraso: 900 + i * 200 }, x)));
    MARCA.espuela = { g, piezas, rotulos, latido: ms => pl.mueve(ms) };
  }

  function armaCircuitoProyecto() {
    const d = MARCAS.circuitoProyecto, g = grupoMarca('circuitoProyecto'), piezas = [], rotulos = [], A = G.ANILLO;
    const rm = (A.ri + A.re) / 2, anillo = [];
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; anillo.push([A.u + rm * Math.cos(a), A.v + rm * Math.sin(a)]); }
    const geoA = cinta(anillo, A.re - A.ri + 0.8, A.z + 0.5), mA = matC(CIRCUITO, 0.85), mallaA = new THREE.Mesh(geoA, mA);
    mallaA.renderOrder = 7; g.add(mallaA);
    piezas.push({ obj: mallaA, mats: [[mA, 0.85]], traza: { g: geoA, n: geoA.attributes.position.count }, dur: 1600 });
    const esp = adentro(G.ESPUELA, { u0: S.u0 - 2, u1: S.u1 + 2, v0: S.v0 - 2, v1: S.v1 + 2 });
    esp.forEach(pts => {
      const geo = cinta(pts, 3.4, 0.45), m = matC(CIRCUITO, 0.9), mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 7; g.add(mesh);
      piezas.push({ obj: mesh, mats: [[m, 0.9]], traza: { g: geo, n: geo.attributes.position.count }, dur: 1200, retraso: 900 });
    });
    const pA = pulsos([anillo], { colores: COLORES_FLUJOS, cada: 14, vel: 10, largo: 5, ancho: 2.4, z: A.z + 0.75 });
    const pE = pulsos(esp, { colores: COLORES_FLUJOS, cada: 18, vel: 10, largo: 5, ancho: 2.2, z: 0.6 });
    g.add(pA.obj, pE.obj);
    piezas.push({ obj: pA.obj, mats: [[pA.mat, 0.9]], retraso: 1500 }, { obj: pE.obj, mats: [[pE.mat, 0.9]], retraso: 1900 });
    (d.rotulos || []).forEach((x, i) => rotulos.push(Object.assign({ tipo: 'marca circuito', retraso: 1000 + i * 250 }, x)));
    MARCA.circuitoProyecto = { g, piezas, rotulos, latido: ms => { pA.mueve(ms); pE.mueve(ms); } };
  }

  function armaCircuitoAtlampa() {
    const d = MARCAS.circuito, g = grupoMarca('circuitoAtlampa'), piezas = [], rotulos = [];
    const lazo = expande(d.principal);
    lazo.push(lazo[0]);
    const accL = [0]; for (let i = 1; i < lazo.length; i++) accL.push(accL[i - 1] + Math.hypot(lazo[i][0] - lazo[i - 1][0], lazo[i][1] - lazo[i - 1][1]));
    const L = accL[accL.length - 1], DUR = d.dur || 3400;
    // el momento en que el lazo pasa por p: ahí brota cada ramal
    const cuando = p => {
      let mejor = Infinity, s = 0;
      for (let i = 1; i < lazo.length; i++) {
        const a = lazo[i - 1], b = lazo[i], dx = b[0] - a[0], dy = b[1] - a[1], ll = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / ll)), dd = Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]);
        if (dd < mejor) { mejor = dd; s = accL[i - 1] + Math.sqrt(ll) * t; }
      }
      return DUR * s / L;
    };
    const geoL = cinta(lazo, 13, 0.6), mL = matC(CIRCUITO, 0.92), mallaL = new THREE.Mesh(geoL, mL); mallaL.renderOrder = 7; g.add(mallaL);
    piezas.push({ obj: mallaL, mats: [[mL, 0.92]], traza: { g: geoL, n: geoL.attributes.position.count }, dur: DUR });
    const caminos = [lazo];
    const ramal = (pts, ancho, extra) => {
      const geo = cinta(pts, ancho, 0.55), m = matC(CIRCUITO, 0.85), mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 7; g.add(mesh);
      const dur = Math.max(500, largo(pts) / L * DUR * 1.4);
      piezas.push({ obj: mesh, mats: [[m, 0.85]], traza: { g: geo, n: geo.attributes.position.count }, dur, retraso: cuando(pts[0]) + (extra || 0) });
      caminos.push(pts);
      return cuando(pts[0]) + dur;
    };
    (d.ramales || []).forEach(x => {
      if (x.via === 'diagonal') {
        const diag = H.trenViejo.map(f => pares(f)).sort((a, b) => largo(b) - largo(a)).find(f => Math.abs(f[0][0] - f[f.length - 1][0]) > 600 && Math.abs(f[0][1] - f[f.length - 1][1]) > 600);
        if (diag) enColonia(diag).forEach(t => ramal(t, 8, 300));
      } else ramal(x.pts, 8, 0);
    });
    // a los parques de fuera: líneas punteadas
    (d.parques || []).forEach(x => {
      const v = H.verdes.find(y => y.n === x.nombre); if (!v) return;
      const c = centro(pares(v.p)), m = new THREE.LineDashedMaterial({ color: VERDE, dashSize: 22, gapSize: 14, transparent: true, opacity: 0.95 });
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(x.de[0], x.de[1], 0.7), V3(c[0], c[1], 0.7)]), m);
      ln.computeLineDistances(); ln.renderOrder = 7; g.add(ln);
      const t = cuando(x.de) + 300;
      piezas.push({ obj: ln, mats: [[m, 0.9]], retraso: t });
      rotulos.push({ u: c[0], v: c[1], z: 1, texto: x.texto || x.nombre, sub: x.sub, lado: x.lado, tipo: 'marca verde', retraso: t + 400 });
      caminos.push([x.de, c]);
    });
    const latidos = [];
    (d.nodos || []).forEach(n => {
      const t = cuando([n.u, n.v]) + 200;
      const col = n.color ? new THREE.Color(n.color) : CIRCUITO;
      const ani = new THREE.Mesh(new THREE.RingGeometry(12, 17, 48).rotateX(-Math.PI / 2), matC(col, 0.95));
      ani.position.copy(V3(n.u, n.v, 0.8)); ani.renderOrder = 8; g.add(ani);
      piezas.push({ obj: ani, mats: [[ani.material, 0.95]], retraso: t });
      latidos.push(ondas(g, n.u, n.v, col, 16, 60, (n.u * 0.013) % 1));
      if (n.texto) rotulos.push({ u: n.u, v: n.v, z: 1, texto: n.texto, sub: n.sub, lado: n.lado, color: n.color, tipo: 'marca circuito' + (n.color ? ' colorido' : ''), retraso: t + 300 });
    });
    const pl = pulsos(caminos, { colores: COLORES_FLUJOS, cada: 60, vel: 34, largo: 22, ancho: 5.5, z: 0.85 });
    g.add(pl.obj); piezas.push({ obj: pl.obj, mats: [[pl.mat, 0.9]], retraso: DUR });
    MARCA.circuitoAtlampa = { g, piezas, rotulos, latido: (ms, k) => { pl.mueve(ms); latidos.forEach(f => f(ms, k)); } };
  }

  /* El mercado sobre ruedas: los fines de semana, el mercado del proyecto sale por la espuela.
     Puestos a los dos lados de la vía (toldo de color y mostrador), que se abren en ola desde
     el predio, y gente que camina por el pasillo de en medio. */
  function armaMercado() {
    const d = MARCAS.mercado, g = grupoMarca('mercado'), piezas = [], rotulos = [];
    const pts = expande(d.recorrido), acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = acc[acc.length - 1], DUR = d.dur || 4200;
    const en = s => {
      let j = 1; while (j < acc.length - 1 && acc[j] < s) j++;
      const a = pts[j - 1], b = pts[j], f = (s - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (b[0] - a[0]) / l, (b[1] - a[1]) / l];
    };
    const COLORES = (d.colores || ['#ff5cb0', '#8a98ff', '#f2c14e', '#f4f1ea', '#5ad1c6']).map(c => new THREE.Color(c));
    const puestos = [];
    for (let s = d.inicio || 8; s < L - 3; s += d.paso || 3.8) [-1, 1].forEach((lado, k) => {
      const r0 = en(s), sep = d.separacion || 4.6;
      puestos.push({ u: r0[0] - r0[3] * lado * sep, v: r0[1] + r0[2] * lado * sep, a: Math.atan2(r0[3], r0[2]), s, c: COLORES[Math.floor((s * 7.31 + k * 3) % COLORES.length)] });
    });
    const N = Math.max(1, puestos.length);
    CALCULADOS.puestos = Math.round(puestos.length / 10) * 10; CALCULADOS.mercadoKm = (L / 1000).toFixed(1);
    const toldo = new THREE.InstancedMesh(new THREE.BoxGeometry(3.1, 0.28, 2.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), N);
    const mostr = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.95, 1.1), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0 }), N);
    [toldo, mostr].forEach(m => { m.frustumCulled = false; m.renderOrder = 7; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(m); });
    puestos.forEach((p, i) => toldo.setColorAt(i, p.c));
    if (toldo.instanceColor) toldo.instanceColor.needsUpdate = true;
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), e3 = new THREE.Vector3();
    let t0 = null;
    function abre(ms) {
      const t = t0 == null ? 0 : Math.max(0, ms - t0);
      let todos = true;
      puestos.forEach((p, i) => {
        const k = Math.max(0, Math.min(1, (t - DUR * p.s / L) / 450)), e = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
        if (k < 1) todos = false;
        q.setFromAxisAngle(EJE, p.a);
        const w1 = W(p.u, p.v, 2.45 * Math.max(0.001, e)), w2 = W(p.u, p.v, 0.48 * Math.max(0.001, e));
        M4.compose(pos.set(w1[0], w1[1], w1[2]), q, e3.set(Math.max(0.001, e), 1, Math.max(0.001, e))); toldo.setMatrixAt(i, M4);
        M4.compose(pos.set(w2[0], w2[1], w2[2]), q, e3.set(1, Math.max(0.001, e), 1)); mostr.setMatrixAt(i, M4);
      });
      toldo.instanceMatrix.needsUpdate = true; mostr.instanceMatrix.needsUpdate = true;
      return todos;
    }
    abre(0);
    piezas.push({ obj: toldo, mats: [[toldo.material, 1]] }, { obj: mostr, mats: [[mostr.material, 0.95]] });
    // la gente del mercado: el mismo pictograma, caminando despacio por el pasillo
    const GENTE = [];
    const nG = Math.round(L / (d.gentePor || 5));
    for (let k = 0; k < nG; k++) GENTE.push({ p: pts, acc, L, lado: (azarP() - 0.5) * 4.4, s0: azarP() * L * 2, vel: (0.5 + 0.6 * azarP()) * 2 * (azarP() < 0.5 ? 1 : -1),
      tile: FIG.camina[Math.floor(azarP() * FIG.camina.length)], esc: 0.9 + 0.2 * azarP() });
    const matG = api.matAtlas(FIG.tex, FIG.N, FIG.POSES, DC_), GM = api.mallaAtlas(Math.max(1, GENTE.length), matG);
    GENTE.forEach((x, i) => { GM.aEsc.setXY(i, FIG.ancho * x.esc, FIG.alto * x.esc); GM.aTile.setX(i, x.tile); });
    GM.malla.geometry.instanceCount = GENTE.length; GM.malla.renderOrder = 8; g.add(GM.malla);
    const opG = matG.uniforms.uOpacidad;
    let listoAbre = false;
    (d.rotulos || []).forEach((x, i) => rotulos.push(Object.assign({ tipo: 'marca mercado', retraso: 1200 + i * 300 }, x)));
    MARCA.mercado = { g, piezas, rotulos,
      entra() { t0 = performance.now() + (d.retraso || 0); listoAbre = false; opG.value = 0; },
      latido(ms, k) {
        if (!listoAbre) listoAbre = abre(performance.now());
        const t = t0 == null ? 0 : Math.max(0, performance.now() - t0);
        opG.value = Math.max(0, Math.min(1, (t - DUR * 0.4) / 900)) * k;
        if (opG.value > 0 && !quieto.matches) mueveGente(GENTE, GM, ms);
      } };
  }

  /* ---------- 3c. Etapa 2: la demolición y el corte del aro ----------
     Lo que se va se marca en rojo y se borra como se desarma una parte en el visor (DIB_GLSL de atlampa-3d.js):
     las caras se vacían con su banda de rayado y luego las aristas se recogen, en un barrido desde el centro del
     aro (lo lejano se va primero). Cada cosa tiene su canal (CANAL). Estas marcas no sólo aparecen: su avance
     k (0…1) es la animación entera, de ida y de regreso (aplica(k)), y se quedan hechas mientras las slides
     siguientes las sigan listando. */
  const tramo = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
  const O_ARO = V3(G.ANILLO.u, G.ANILLO.v, 0);
  function canalSinc(C) {   // mientras no se borra, se dibuja junto con la colonia
    if (!C || !DC) return;
    C.uDib.value.copy(DC.uDib.value); C.uDibO.value.copy(DC.uDibO.value); C.uDibV.value.copy(DC.uDibV.value);
  }
  function canalBorra(C, a, r0, r1) {   // a: 1 dibujado … 0 borrado
    if (!C) return;
    C.uDib.value.z = 1; C.uDibO.value.copy(O_ARO); C.uDibV.value.set(r0, r1, 0);
    C.uDib.value.x = Math.min(1, a / 0.7); C.uDib.value.y = Math.max(0, Math.min(1, (a - 0.32) / 0.68));
  }
  // marcar en rojo: el mismo material del visor (su papel) con tinta roja; en 0, como estaba
  function tinte(papel) {
    const rojo = new THREE.Color(ROJO), base = {};
    const mats = () => ({ m: api.material(papel), a: api.arista ? api.arista(papel) : null, l: api.linea ? api.linea(papel) : null });
    return (r, brillo) => {
      const { m, a, l } = mats(), u = m.uniforms;
      if (r <= 0) {
        if (base.t) { u.uTinta.value = base.t; u.uGris.value = base.g; if (a) a.color.copy(base.a); if (l) l.color.copy(base.l); base.t = null; }
        return;
      }
      if (!base.t) { base.t = u.uTinta.value; base.g = u.uGris.value; if (a) base.a = a.color.clone(); if (l) base.l = l.color.clone(); }
      const b = brillo == null ? 1 : brillo;
      u.uTinta.value = base.t.clone().lerp(rojo, r).multiplyScalar(b);   // (la tinta puede ser un color compartido: no se toca)
      u.uGris.value = base.g + (0.42 - base.g) * r;
      if (a) a.color.copy(base.a).lerp(rojo, r).multiplyScalar(b);
      if (l) l.color.copy(base.l).lerp(rojo, r).multiplyScalar(b);
    };
  }
  // slide «Demolición»: los muros y losas de lo que no se conserva se marcan en rojo y se borran
  function armaDemolicion() {
    const g = new THREE.Group(); g.name = 'marca-demolicion'; g.visible = false; gH.add(g);
    const rojo = tinte('ctxdemuele');
    let pulso = 1;
    MARCA.demolicion = { g, piezas: [], rotulos: [], dur: 4200, durSale: 1100,
      aplica(k) {
        if (k <= 0) { rojo(0); canalSinc(CANAL.dem); if (EXIS.demuele) EXIS.demuele.visible = true; return; }
        rojo(suave(tramo(k, 0, 0.16)), k < 0.34 ? pulso : 1);
        canalBorra(CANAL.dem, 1 - tramo(k, 0.32, 1), 4, 120);
        if (EXIS.demuele) EXIS.demuele.visible = k < 0.999;
      },
      latido(ms, k) { pulso = k > 0.14 && k < 0.34 ? 0.82 + 0.18 * Math.sin(ms / 130) : 1; if (k > 0.14 && k < 0.34) rojo(1, pulso); }
    };
  }
  // slide «El aro»: la «o» ya bajó a su lugar; su círculo baja hasta el piso, lo de las naves que queda dentro se
  // marca en rojo y se borra, y quedan las naves cortadas (G.PIEZAS, como en el visor) con su cara de corte
  function armaCorteAro() {
    const A = G.ANILLO, R = G.CORTE, c0 = O_ARO;
    const g = new THREE.Group(); g.name = 'marca-corte-aro'; g.visible = false; gH.add(g);
    const rojo = tinte('ctxcorte');
    let pulso = 1;
    // la cortina cuelga del aro y baja al piso; su filo marca por dónde pasa el corte
    const hAro = ALTO_EXISTENTE + 4;
    const mCor = new THREE.MeshBasicMaterial({ color: CIRCUITO, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const cortina = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 160, 1, true).translate(0, 0.5, 0), mCor);
    const pf = []; for (let i = 0; i <= 160; i++) { const t = i / 160 * Math.PI * 2; pf.push(new THREE.Vector3(Math.cos(t) * R, 0, Math.sin(t) * R)); }
    const mFilo = new THREE.LineBasicMaterial({ color: CIRCUITO, transparent: true, opacity: 0 }), filo = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pf), mFilo);
    [cortina, filo].forEach(o => { o.position.copy(c0); o.renderOrder = 8; g.add(o); });
    // el corte que queda: las aristas de las caras de corte de las naves, en coral
    const lc = new Lineas();
    G.PIEZAS.forEach(pz => {
      const nv = pz.nv, zf = u => nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - pz.um) / pz.run), q = pz.pol;
      q.forEach((a, i) => {
        const b = q[(i + 1) % q.length]; if (!(a[2] && b[2])) return;
        lc.seg(W(a[0], a[1], zf(a[0])), W(b[0], b[1], zf(b[0]))); lc.seg(W(a[0], a[1], 0.08), W(b[0], b[1], 0.08));
        const ant = q[(i - 1 + q.length) % q.length], sig = q[(i + 2) % q.length];
        if (!ant[2]) lc.seg(W(a[0], a[1], 0.08), W(a[0], a[1], zf(a[0])));
        if (!sig[2]) lc.seg(W(b[0], b[1], 0.08), W(b[0], b[1], zf(b[0])));
      });
    });
    const mLc = linC(CIRCUITO, 0), corte = new THREE.LineSegments(lc.geo(), mLc); corte.renderOrder = 9; g.add(corte);
    MARCA.corteAro = { g, piezas: [], rotulos: [], dur: 5000, durSale: 1100, retraso: 500,
      aplica(k) {
        const cortado = k >= 0.22;
        if (EXIS.naves) EXIS.naves.visible = !cortado;
        if (EXIS.cortadas) EXIS.cortadas.visible = cortado && !(marcaK.comercio > 0.001);   // (con el mercado, van sus propias naves)
        if (EXIS.dentro) EXIS.dentro.visible = cortado && k < 0.999;
        const yb = hAro * (1 - suave(tramo(k, 0, 0.24)));
        cortina.position.y = c0.y + yb; cortina.scale.y = Math.max(0.001, hAro - yb); filo.position.y = c0.y + yb + 0.05;
        mCor.opacity = 0.2 * tramo(k, 0, 0.04) * (1 - tramo(k, 0.8, 1));
        mFilo.opacity = 0.95 * tramo(k, 0, 0.04) * (1 - tramo(k, 0.3, 0.45));
        rojo(cortado ? suave(tramo(k, 0.22, 0.36)) : 0, k < 0.44 ? pulso : 1);
        if (cortado) canalBorra(CANAL.cor, 1 - tramo(k, 0.44, 0.97), 12, 48); else canalSinc(CANAL.cor);
        mLc.opacity = 0.9 * tramo(k, 0.85, 1);
      },
      latido(ms, k) { pulso = k > 0.34 && k < 0.44 ? 0.82 + 0.18 * Math.sin(ms / 130) : 1; if (k > 0.34 && k < 0.44) rojo(1, pulso); }
    };
  }
  // la «o»: el aro del proyecto desde la slide «Circuito». No se va: cada slide dice qué tan opaca está y cuánto
  // sube (s.aro: { op, sube, dur }); sin s.aro, no está. Sube translúcida para dejar ver el predio y luego baja a
  // su lugar, opaca: así se lee que la «o» es el aro.
  const matO = new THREE.MeshBasicMaterial({ color: CIRCUITO, transparent: true, opacity: 0, side: THREE.DoubleSide });
  let aroO = null, aroEst = { op: 0, sube: 0 }, aroTw = null, aroForma = null;
  function armaAroO() {
    const A = G.ANILLO, lay = disenoAro('circuito', AZ_NORTE); lay.tex.dispose();   // el grosor de las letras de la palabra
    const circ = r => { const c = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2; c.push([A.u + r * Math.cos(t), A.v + r * Math.sin(t)]); } return c; };
    const geo = cinta(circ(A.re - lay.grosor / 2), lay.grosor, ALTO_EXISTENTE + 4);
    // la misma cinta con la forma del aro del proyecto (su piso, de ri a re), para pasar de una a otra
    const real = cinta(circ((A.ri + A.re) / 2), A.re - A.ri, A.z + 0.04);
    aroForma = { de: geo.attributes.position.array.slice(), a: real.attributes.position.array, k: 0 };
    aroO = new THREE.Mesh(geo, matO); aroO.name = 'historia-aro'; aroO.renderOrder = 13;
    gH.add(aroO); aplicaAro(aroEst);
  }
  // 0: la «o» de la palabra · 1: con la forma del aro del proyecto
  function formaAro(k) {
    if (!aroO || Math.abs(aroForma.k - k) < 1e-4) return;
    aroForma.k = k;
    const p = aroO.geometry.attributes.position, de = aroForma.de, a = aroForma.a;
    for (let i = 0; i < de.length; i++) p.array[i] = de[i] + (a[i] - de[i]) * k;
    p.needsUpdate = true; aroO.geometry.computeBoundingSphere();
  }
  // la opacidad de la «o»: la de la slide, y se apaga cuando el aro del proyecto ya está (marca aroReal)
  const opAro = () => aroEst.op * (1 - tramo(marcaK.aroReal || 0, 0.55, 0.9));
  function aplicaAro(e) {
    aroEst = e;
    if (!aroO) return;
    matO.opacity = opAro(); aroO.position.y = e.sube; aroO.visible = matO.opacity > 0.002;
  }
  // slide «El aro del proyecto»: la «o» baja y se adelgaza hasta tener la forma del aro; el aro del visor (sus piezas
  // 'aro' y 'cinta', copiadas con su propio canal) se dibuja como en el visor, de abajo hacia arriba; la «o» se apaga y
  // la gente empieza a caminar sobre el aro
  function armaAroReal() {
    const A = G.ANILLO, g = new THREE.Group(); g.name = 'marca-aro-real'; g.visible = false; gH.add(g);
    const U = { uDib: { value: new THREE.Vector4(1, 1, 0, 0) }, uDibO: { value: new THREE.Vector3() }, uDibV: { value: new THREE.Vector3(0, 300, 0) } };
    // el aro como se ve en el visor: sus piezas y, del Revit, las losas del aro (sus muros, los de la azotea de arte y
    // cultura, entran con «Completo»)
    const real = api.copiaConCanal ? api.copiaConCanal(['aro', 'cinta'].concat(piezasDe(/^revit-cultura-floors-.*-aro$/)), U) : new THREE.Group();
    real.visible = false; g.add(real);
    // el barrido: de abajo hacia arriba (y un poco en diagonal) sobre la caja del aro, como se dibuja una axonometría
    const caja = new THREE.Box3().setFromObject(real), t = caja.getSize(new THREE.Vector3()), w = new THREE.Vector3(0.3, 1, 0.3);
    U.uDibO.value.copy(caja.min); U.uDibV.value.copy(w.multiplyScalar(1 / Math.max(1, w.dot(t))));
    const arma = a => { U.uDib.value.x = Math.min(1, a / 0.7); U.uDib.value.y = Math.max(0, Math.min(1, (a - 0.32) / 0.68)); };
    // la gente sobre el aro: tres carriles, en los dos sentidos
    const GENTE = [], circ = r => { const c = []; for (let i = 0; i <= 180; i++) { const th = i / 180 * Math.PI * 2; c.push([A.u + r * Math.cos(th), A.v + r * Math.sin(th)]); } return c; };
    [A.ri + 1.4, (A.ri + A.re) / 2, A.re - 1.4].forEach(r => {
      const pts = circ(r), acc = [0];
      for (let j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      const L = acc[acc.length - 1];
      for (let k = 0; k < 14; k++) GENTE.push({ p: pts, acc, L, lado: (azarP() - 0.5) * 1.2, s0: azarP() * L * 2, vel: (0.9 + 0.5 * azarP()) * 1.4 * (azarP() < 0.5 ? 1 : -1),
        tile: FIG.camina[Math.floor(azarP() * FIG.camina.length)], esc: 0.9 + 0.2 * azarP() });
    });
    const matG = api.matAtlas(FIG.tex, FIG.N, FIG.POSES, DC_), GM = api.mallaAtlas(GENTE.length, matG);
    GENTE.forEach((x, i) => { GM.aEsc.setXY(i, FIG.ancho * x.esc, FIG.alto * x.esc); GM.aTile.setX(i, x.tile); });
    GM.malla.geometry.instanceCount = GENTE.length; GM.malla.renderOrder = 8; GM.z = A.z + 0.02; g.add(GM.malla);
    const opG = matG.uniforms.uOpacidad; opG.value = 0;
    Object.assign(CALCULADOS, { aroLargo: Math.round(Math.PI * (A.ri + A.re) / 10) * 10, aroAncho: (A.re - A.ri).toFixed(2), aroAlto: A.z.toFixed(2) });
    MARCA.aroReal = { g, piezas: [], rotulos: [], dur: 5200, durSale: 1200,
      aplica(k) {
        formaAro(suave(tramo(k, 0, 0.38)));
        if (aroO) { matO.opacity = opAro(); aroO.visible = matO.opacity > 0.002; }
        real.visible = k > 0.3;
        arma(tramo(k, 0.3, 0.86));
        opG.value = tramo(k, 0.84, 1);
        GM.malla.visible = opG.value > 0;
      },
      latido(ms, k) { if (opG.value > 0 && !quieto.matches) mueveGente(GENTE, GM, ms); }
    };
  }
  function ponAro(c, retraso) {
    const meta = { op: c ? (c.op == null ? 0.95 : c.op) : 0, sube: (c && c.sube) || 0 };
    if (aroTw) { tweens = tweens.filter(t => t !== aroTw); aroTw = null; }
    const de = Object.assign({}, aroEst);
    if (de.op === meta.op && de.sube === meta.sube) return;
    aroTw = anima((c && c.dur) || 1600, k => aplicaAro({ op: de.op + (meta.op - de.op) * k, sube: de.sube + (meta.sube - de.sube) * k }), () => { aroTw = null; }, retraso || 0);
  }

  /* ---------- 3d. Etapa 2: arte y cultura, en dos tiempos ----------
     Las piezas del Revit (revit-cultura-*), copiadas con canales propios (api.copiaConCanal): primero las losas
     salen del aro (plegadas a su nivel, con su color) y se despliegan hacia abajo hasta su lugar, y al final las
     escaleras; luego se arma lo demás (muros, cancelería y puertas, columnas y barandales, sombrillas) como se
     arma un uso en el visor, de abajo hacia arriba. */
  const piezasDe = re => raizG.children.map(o => o.name).filter(n => re.test(n));
  const canalNuevo = () => ({ uDib: { value: new THREE.Vector4(1, 1, 0, 0) }, uDibO: { value: new THREE.Vector3() }, uDibV: { value: new THREE.Vector3(0, 300, 0) } });
  function barridoSube(U, obj) {   // como barridoSube del visor: de abajo hacia arriba y un poco en diagonal, sobre la caja de obj
    const caja = new THREE.Box3().setFromObject(obj), t = caja.getSize(new THREE.Vector3()), w = new THREE.Vector3(0.3, 1, 0.3);
    U.uDib.value.z = 0; U.uDibO.value.copy(caja.min); U.uDibV.value.copy(w.multiplyScalar(1 / Math.max(1, w.dot(t))));
  }
  function armaCanal(U, a) { U.uDib.value.x = Math.min(1, a / 0.7); U.uDib.value.y = Math.max(0, Math.min(1, (a - 0.32) / 0.68)); }
  function copiaRevit(re, U) {
    const g = api.copiaConCanal ? api.copiaConCanal(piezasDe(re), U) : new THREE.Group();
    g.visible = false; return g;
  }
  // 1: las plataformas salen del aro y forman la volumetría; al final, las escaleras
  function armaCulturaVolumen() {
    const g = new THREE.Group(); g.name = 'marca-cultura-volumen'; g.visible = false; gH.add(g);
    const UL = canalNuevo(), UE = canalNuevo();
    const losas = copiaRevit(/^revit-cultura-floors-\d+-entero$/, UL), esc = copiaRevit(/^revit-cultura-stairs(Runs|Landings)-/, UE);
    g.add(losas, esc);
    barridoSube(UE, esc);
    UL.uDib.value.z = 1; UL.uDibO.value.copy(O_ARO); UL.uDibV.value.set(20, 62, 0);   // las líneas, desde el aro hacia afuera
    const caja = new THREE.Box3().setFromObject(losas), zTop = caja.max.y;   // se pliegan al nivel más alto (bajo el piso del aro)
    // el color: sale con el del aro y llega al suyo
    const mAro = api.material('aro'), aAro = api.arista ? api.arista('aro') : null, tintes = [];
    losas.traverse(x => {
      if (!x.material) return;
      if (x.material.isShaderMaterial && x.material.uniforms.uTinta) tintes.push({ c: x.material.uniforms.uTinta.value.clone(), set: c => { x.material.uniforms.uTinta.value.copy(c); }, de: mAro.uniforms.uTinta.value.clone() });
      else if (x.material.color) tintes.push({ c: x.material.color.clone(), set: c => { x.material.color.copy(c); }, de: aAro ? aAro.color.clone() : x.material.color.clone() });
    });
    const tmp = new THREE.Color();
    MARCA.culturaVolumen = { g, piezas: [], rotulos: [], dur: 6200, durSale: 1400,
      aplica(k) {
        losas.visible = k > 0.001;
        UL.uDib.value.x = suave(tramo(k, 0, 0.3)); UL.uDib.value.y = tramo(k, 0.34, 0.82);
        const s = Math.max(0.004, suave(tramo(k, 0.28, 0.8)));
        losas.scale.y = s; losas.position.y = zTop * (1 - s);
        const c = suave(tramo(k, 0.45, 0.85));
        tintes.forEach(t => t.set(tmp.copy(t.de).lerp(t.c, c)));
        esc.visible = k > 0.74;
        armaCanal(UE, tramo(k, 0.74, 1));
      },
      latido() {}
    };
  }
  // 2: lo demás, hasta quedar como en el visor
  function armaCulturaCompleta() {
    const g = new THREE.Group(); g.name = 'marca-cultura-completa'; g.visible = false; gH.add(g);
    const tiempos = [
      [/^revit-cultura-walls-/, 0, 0.45],                                         // muros (con los de la azotea, del aro)
      [/^revit-cultura-(doors|curtainPanels|curtainMullions)-/, 0.22, 0.62],     // cancelería y puertas
      [/^revit-cultura-(columns|railings|topRails)-/, 0.38, 0.8],                 // columnas y barandales
      [/^revit-cultura-roofs-/, 0.6, 1]                                            // sombrillas
    ].map(([re, a, b]) => { const U = canalNuevo(), c = copiaRevit(re, U); g.add(c); barridoSube(U, c); return { c, U, a, b }; });
    MARCA.culturaCompleta = { g, piezas: [], rotulos: [], dur: 7000, durSale: 1400,
      aplica(k) { tiempos.forEach(t => { const a = tramo(k, t.a, t.b); t.c.visible = a > 0; armaCanal(t.U, a); }); },
      latido() {}
    };
  }

  /* ---------- 3e. Etapa 2: el foco de un uso ----------
     Como al seleccionar un uso en el visor: lo demás se apaga, translúcido al 15 %, y el uso que se arma se sigue
     viendo igual. s.foco: 'uso' o { uso, desde, hasta, suelta }: desde (una marca) para que empiece cuando esa marca
     ya puso las piezas propias del uso (así el uso no se apaga con lo demás); con hasta, el foco se suelta cuando esa
     marca llega al tramo suelta (por omisión [0.8, 1]). FOCO[uso]: los grupos que no se apagan (llevan materiales
     propios). Para que sea suave y nada parpadee: se apaga en FOCO_MS, sigue escribiendo la profundidad y lo apagado
     se dibuja en un orden fijo (de lo lejano a lo cercano, desde la cámara del momento en que empieza). */
  const FOCO = {}, FOCO_TENUE = 0.15, FOCO_MS = 1600;
  let focoK = 0, focoUso = null, focoLista = null, focoObjs = null, focoT = 0;
  function focoJunta(uso) {
    const fuera = new Set(FOCO[uso] || []), vistos = new Set(), lista = [], objs = [];
    const pc = api.camara().position, c = new THREE.Vector3();
    (function rec(o) {
      if (fuera.has(o)) return;
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      if (ms.length) {
        const g = o.geometry;
        if (g && g.attributes && g.attributes.position) { if (!g.boundingSphere) g.computeBoundingSphere(); c.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld); }
        else c.setFromMatrixPosition(o.matrixWorld);
        objs.push({ o, ro: o.renderOrder, d: c.distanceTo(pc) });
      }
      ms.forEach(m => {
        const u = m.uniforms && m.uniforms.uOpacidad, clave = u || m;
        if (vistos.has(clave) || (!u && typeof m.opacity !== 'number')) return;
        vistos.add(clave);
        lista.push({ m, u, base: u ? u.value : m.opacity, escrito: NaN, tr: m.transparent });
      });
      o.children.forEach(rec);
    })(api.escena);
    objs.sort((p, q) => q.d - p.d).forEach((x, i) => { x.o.renderOrder = x.ro * 100000 + i; });
    focoObjs = objs;
    return lista;
  }
  function focoSuelta() {
    if (!focoLista) return;
    focoLista.forEach(e => {
      const cur = e.u ? e.u.value : e.m.opacity;
      if (Math.abs(cur - e.escrito) <= 1e-5) { if (e.u) e.u.value = e.base; else e.m.opacity = e.base; }
      e.m.transparent = e.tr;
    });
    (focoObjs || []).forEach(x => { x.o.renderOrder = x.ro; });
    focoLista = focoObjs = null;
  }
  function focoPaso() {
    const ahora = performance.now(), dt = focoT ? Math.min(100, ahora - focoT) : 16; focoT = ahora;
    const s = GUION[idx], f = s && s.foco, uso = f ? (typeof f === 'string' ? f : f.uso) : null;
    let meta = 0;
    if (uso && (!f.desde || (marcaK[f.desde] || 0) > 0.001)) { const su = f.suelta || [0.8, 1]; meta = f.hasta ? 1 - tramo(marcaK[f.hasta] || 0, su[0], su[1]) : 1; }
    if (uso && uso !== focoUso) { if (focoK < 0.01) { focoSuelta(); focoUso = uso; } else meta = 0; }   // otro uso: primero se suelta el de antes
    const paso = quieto.matches ? 1 : dt / FOCO_MS;
    focoK = meta > focoK ? Math.min(meta, focoK + paso) : Math.max(meta, focoK - paso);
    if (focoK <= 0) { focoSuelta(); return; }
    if (!focoLista) focoLista = focoJunta(focoUso);
    const fac = 1 - (1 - FOCO_TENUE) * suave(focoK);
    focoLista.forEach(e => {
      const cur = e.u ? e.u.value : e.m.opacity;
      if (Math.abs(cur - e.escrito) > 1e-5) e.base = cur;   // alguien más lo cambió: ésa es la base
      e.escrito = e.base * fac;
      if (e.u) e.u.value = e.escrito; else e.m.opacity = e.escrito;
      e.m.transparent = true;
    });
  }

  /* ---------- 3f. Etapa 2: utilidades para armar un uso ---------- */
  function marcaEn(padre, id) { const g = new THREE.Group(); g.name = 'marca-' + id; g.visible = false; padre.add(g); return g; }
  // una copia de obj (mallas puestas con pon) con materiales propios en el canal U
  function conCanal(obj, U) { const c = api.copiaConCanal ? api.copiaConCanal([obj], U) : obj; c.visible = true; return c; }
  // deja en cada malla (y sus aristas) los triángulos (segmentos) cuyo centro cumple pred(u, v, z)
  function filtraTri(grupo, pred) {
    grupo.traverse(x => {
      const n = x.isLineSegments ? 2 : x.isMesh ? 3 : 0; if (!n || !x.geometry) return;
      const g0 = x.geometry.index ? x.geometry.toNonIndexed() : x.geometry, P = g0.attributes.position.array, sel = [];
      for (let i = 0; i < g0.attributes.position.count; i += n) {
        let cx = 0, cy = 0, cz = 0;
        for (let j = 0; j < n; j++) { cx += P[3 * (i + j)]; cy += P[3 * (i + j) + 1]; cz += P[3 * (i + j) + 2]; }
        if (pred(cx / n + CEN[0], CEN[1] - cz / n, cy / n)) sel.push(i);
      }
      const g2 = new THREE.BufferGeometry();
      Object.keys(g0.attributes).forEach(k => {
        const at = g0.attributes[k], s = at.itemSize, out = new Float32Array(sel.length * n * s);
        sel.forEach((i, q) => out.set(at.array.subarray(i * s, (i + n) * s), q * n * s));
        g2.setAttribute(k, new THREE.BufferAttribute(out, s));
      });
      g2.computeBoundingSphere(); x.geometry = g2;
    });
    return grupo;
  }
  // los colores de los materiales propios de un grupo (para llevarlos de un color a otro)
  function tintes(grupo) {
    const r = [];
    grupo.traverse(x => {
      const m = x.material; if (!m || r.some(t => t.m === m)) return;
      if (m.uniforms && m.uniforms.uTinta) r.push({ m, c: m.uniforms.uTinta.value, base: m.uniforms.uTinta.value.clone(), g: m.uniforms.uGris ? m.uniforms.uGris.value : null, arista: false });
      else if (m.color) r.push({ m, c: m.color, base: m.color.clone(), g: null, arista: true });
    });
    return r;
  }
  // el barrido al revés (de arriba hacia abajo): al borrar con él, lo de abajo se va primero
  function barridoBaja(U, De) { U.uDib.value.z = 0; U.uDibV.value.copy(De.uDibV.value).negate(); U.uDibO.value.copy(De.uDibO.value).addScaledVector(De.uDibV.value, 1 / De.uDibV.value.lengthSq()); }

  /* ---------- 3g. Etapa 2: el mercado (las naves que se conservan) ----------
     Con el foco en las naves: 1) la cubierta se separa de los muros y se secciona a distintas alturas: cada pieza de la
     cubierta del Revit sale de la cubierta a dos aguas de hoy y llega a su altura, primero las cercanas al aro;
     2) los muros de hoy dejan paso a los del proyecto, con sus vanos, y a la celosía de la nave norte; 3) la cancelería
     (también la de las caras que cortó el aro) y los pisos; al terminar se suelta el foco. */
  const esCelosia = (u, v) => u > 557.5 && v > 472.5;   // la celosía: montantes y paneles de la esquina noreste de la nave norte
  function zViejo(u, v) {   // la cubierta a dos aguas de hoy (como mallaNave), en cualquier punto de las naves
    let nv = G.NAVES[0], dm = Infinity;
    G.NAVES.forEach(n => { const d = v < n.v0 ? n.v0 - v : v > n.v1 ? v - n.v1 : 0; if (d < dm) { dm = d; nv = n; } });
    const paso = (nv.u1 - nv.u0) / nv.n, j = Math.max(0, Math.min(nv.n - 1, Math.floor((u - nv.u0) / paso))), um = nv.u0 + (j + 0.5) * paso;
    return nv.alero + (nv.cumbre - nv.alero) * Math.max(0, 1 - Math.abs(u - um) / (paso / 2));
  }
  // la cubierta de la nave norte en paneles, como la de la sur: cuatro por crujía (dos por faldón) y diez a lo largo,
  // a distintas alturas y con una pequeña inclinación; sin lo que queda dentro del aro (sólo para la presentación: en
  // el Revit esa cubierta va lisa)
  function panelesNorte() {
    const nv = G.NAVES.find(n => n.v0 > 407) || G.NAVES[G.NAVES.length - 1], A = G.ANILLO, m = new Malla();
    const paso = (nv.u1 - nv.u0) / nv.n, FILAS = 10, dv = (nv.v1 - nv.v0) / FILAS, gap = 0.05, canto = 0.22;
    for (let j = 0; j < nv.n; j++) for (let h = 0; h < 4; h++) for (let r = 0; r < FILAS; r++) {
      const u0 = nv.u0 + j * paso + h * paso / 4 + gap, u1 = nv.u0 + j * paso + (h + 1) * paso / 4 - gap, v0 = nv.v0 + r * dv + gap, v1 = nv.v0 + (r + 1) * dv - gap;
      const q = G.menosCirculo(api.rect(u0, v0, u1, v1), [A.u, A.v], G.CORTE); if (!q || q.length < 3) continue;
      const c = j * 4 + h, off = 0.38 * (((c + 2 * r) % 3) - 1), tv = 0.035 * (((c * 7 + r * 3) % 5) - 2), vc = (v0 + v1) / 2;
      const zT = (u, v) => zViejo(u, v) - 0.3 + off + tv * (v - vc), zB = (u, v) => zT(u, v) - canto;
      tapa(m, q, null, zT); tapa(m, q, null, zB, true);
      api.muros(m, q, Math.min(...q.map(p => zB(p[0], p[1]))), null, zT);
    }
    const o = new THREE.Group(); o.name = 'comercio-cubierta-norte'; pon(o, m, 'nave', null, 25); return o;
  }
  // las tapas de los vanos: la cancelería y las puertas del Revit pintadas como los muros (en su propio canal U), para
  // que los muros salgan cerrados y luego se abran
  function tapaVanos(grupo, muros, U) {
    let wm = null, wl = null;
    muros.traverse(x => { if (x.isMesh && !wm) wm = x.material; else if (x.isLineSegments && !wl) wl = x.material; });
    const pm = wm ? wm.clone() : null;
    if (pm) { Object.assign(pm.uniforms, U); pm.userData = Object.assign({}, wm.userData); }
    grupo.traverse(x => {
      if (x.isMesh && pm) x.material = pm;
      else if (x.isLineSegments && wl && x.material.color) { x.material.color.copy(wl.color); x.material.opacity = wl.opacity; }
    });
    return grupo;
  }
  // los vanos de los muros del mercado que no llevan cancelería (las muescas de las fachadas): en cada lado de cada nave
  // se proyectan los muros del Revit sobre su plano y los huecos que quedan dentro de la silueta del muro (no se llega a
  // ellos desde arriba ni desde los lados) son los vanos; cada uno, un rectángulo sobre el eje del muro
  const ladosNaves = () => G.NAVES.map(nv => [[nv.u0, nv.v0], [nv.u1, nv.v0], [nv.u1, nv.v1], [nv.u0, nv.v1]]).flatMap(q => q.map((a, i) => [a, q[(i + 1) % 4]]));
  const cercaDeLados = (u, v, d) => ladosNaves().some(([a, b]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / L2));
    return Math.hypot(u - a[0] - dx * t, v - a[1] - dy * t) < d;
  });
  function vanosMercado() {
    const Rv = window.ATLAMPA_REVIT || {}, oR = Rv.origen || [0, 0, 0], gm = (Rv.grupos || []).find(r => r.programa === 'comercio' && r.categoria === 'walls');
    const m = new Malla(); if (!gm) return m;
    const f = new Float32Array(Rv.buffer, gm.offset, gm.floats), PASO = 0.2, H = 10, NZ = Math.ceil(H / PASO);
    const enTri = (x, y, A, B, C) => { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]), p = [x, y], d1 = s(p, A, B), d2 = s(p, B, C), d3 = s(p, C, A); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    ladosNaves().forEach(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), tx = dx / len, ty = dy / len, nx = -ty, ny = tx;
      const NS = Math.ceil(len / PASO), cub = new Uint8Array(NS * NZ);
      let n = 0, suma = 0;
      for (let t = 0; t < f.length; t += 9) {
        const P = [0, 1, 2].map(j => { const u = f[t + 3 * j] + oR[0], v = f[t + 3 * j + 1] + oR[1]; return [(u - a[0]) * tx + (v - a[1]) * ty, f[t + 3 * j + 2] + oR[2], (u - a[0]) * nx + (v - a[1]) * ny]; });
        if (P.some(p => Math.abs(p[2]) > 0.7 || p[0] < -0.5 || p[0] > len + 0.5)) continue;
        n++; suma += (P[0][2] + P[1][2] + P[2][2]) / 3;
        const i0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]) / PASO)), i1 = Math.min(NS - 1, Math.floor(Math.max(P[0][0], P[1][0], P[2][0]) / PASO));
        const j0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]) / PASO)), j1 = Math.min(NZ - 1, Math.floor(Math.max(P[0][1], P[1][1], P[2][1]) / PASO));
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!cub[j * NS + i] && enTri((i + 0.5) * PASO, (j + 0.5) * PASO, P[0], P[1], P[2])) cub[j * NS + i] = 1;
      }
      if (n < 4) return;
      // el arranque del muro (los primeros ZOC m) cuenta como muro: ahí los muros del Revit dejan una rendija corrida que
      // juntaría todos los vanos con lo de afuera
      const ZOC = 0.6, jz = Math.round(ZOC / PASO);
      for (let i = 0; i < NS; i++) for (let j = 0; j < jz; j++) cub[j * NS + i] = 1;
      const eje = suma / n, fuera = new Uint8Array(NS * NZ), pila = [];
      const marca = (i, j) => { const k = j * NS + i; if (i < 0 || j < 0 || i >= NS || j >= NZ || cub[k] || fuera[k]) return; fuera[k] = 1; pila.push(k); };
      for (let i = 0; i < NS; i++) marca(i, NZ - 1);
      for (let j = 0; j < NZ; j++) { marca(0, j); marca(NS - 1, j); }
      while (pila.length) { const k = pila.pop(), i = k % NS, j = (k / NS) | 0; marca(i + 1, j); marca(i - 1, j); marca(i, j + 1); marca(i, j - 1); }
      // cada hueco: sus celdas unidas → su rectángulo
      const visto = new Uint8Array(NS * NZ), P3 = (s, z) => W(a[0] + s * tx + eje * nx, a[1] + s * ty + eje * ny, z);
      for (let k0 = 0; k0 < NS * NZ; k0++) {
        if (cub[k0] || fuera[k0] || visto[k0]) continue;
        let i0 = NS, i1 = -1, j0 = NZ, j1 = -1, c = 0; const q = [k0]; visto[k0] = 1;
        while (q.length) {
          const k = q.pop(), i = k % NS, j = (k / NS) | 0; c++;
          i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
          [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].forEach(([x, y]) => { const kk = y * NS + x; if (x >= 0 && y >= 0 && x < NS && y < NZ && !cub[kk] && !fuera[kk] && !visto[kk]) { visto[kk] = 1; q.push(kk); } });
        }
        if (c * PASO * PASO < 0.4) continue;   // (rendijas entre triángulos)
        const s0 = i0 * PASO, s1 = (i1 + 1) * PASO, z0 = j0 <= jz ? 0 : j0 * PASO, z1 = (j1 + 1) * PASO;   // (los que llegan al arranque, hasta el piso)
        m.quad(P3(s0, z0), P3(s1, z0), P3(s1, z1), P3(s0, z1));
      }
    });
    return m;
  }
  // el canal de las tapas: sus caras salen con los muros (De), luego sus líneas (l: 0…1) y al final se borran (b: 0…1)
  // desde centro, como lo demolido (lo lejano primero)
  function vanosEn(U, De, l, b, centro, r0, r1) {
    if (b > 0) { U.uDib.value.z = 1; U.uDibO.value.copy(centro); U.uDibV.value.set(r0, r1, 0); armaCanal(U, 1 - b); return; }
    U.uDib.value.z = 0; U.uDibO.value.copy(De.uDibO.value); U.uDibV.value.copy(De.uDibV.value);
    U.uDib.value.y = De.uDib.value.y; U.uDib.value.x = l;
  }
  function armaComercio() {
    aplicaEstilo();   // (las copias de lo existente se llevan su estilo)
    const gC = new THREE.Group(); gC.name = 'comercio'; gH.add(gC); FOCO.comercio = [gC];
    const hoy = (sinTecho, sinMuros, U) => { const o = new THREE.Group(); o.name = 'comercio-hoy'; pon(o, mallaNavesCortadas(sinTecho, sinMuros), 'ctxpredio', null, 25); return conCanal(o, U); };
    // 0 · el foco: las naves de hoy, ahora con materiales propios (no se apagan), en lugar de las de lo existente
    const g0 = marcaEn(gC, 'comercio'), UMv = canalNuevo();
    const murosHoy = hoy(true, false, UMv), techoHoy = hoy(false, true, canalNuevo());
    g0.add(murosHoy, techoHoy);
    MARCA.comercio = { g: g0, piezas: [], rotulos: [], dur: 500, durSale: 300,
      aplica(k) { if (EXIS.cortadas) EXIS.cortadas.visible = k <= 0.001 && (marcaK.corteAro || 0) >= 0.22; },
      latido() {}
    };
    // 1 · la cubierta: primero se dibujan sus líneas sobre la cubierta de hoy (desde el aro hacia afuera); luego cada pieza
    // (triángulos unidos por sus vértices) se despega y llega a su altura. La nave norte no trae divisiones en el Revit:
    // se le ponen paneles como los de la sur (panelesNorte)
    const A = G.ANILLO, SEPARA = 2.6, clave = (a, i) => Math.round(a[i] * 50) + ',' + Math.round(a[i + 1] * 50) + ',' + Math.round(a[i + 2] * 50);
    const UT = canalNuevo(); UT.uDib.value.set(0, 0, 1, 0); UT.uDibO.value.copy(O_ARO); UT.uDibV.value.set(44, 106, 0);
    const g1 = marcaEn(gC, 'comercioTecho'), techo = new THREE.Group();
    const techoSur = filtraTri(copiaRevit(/^revit-comercio-roofs-/, UT), (u, v) => v < 407), techoNorte = conCanal(panelesNorte(), UT);
    techoSur.visible = true; techo.add(techoSur, techoNorte); g1.add(techo);
    const retDe = new Map(), morfs = [], mallas = [], lineas = [];
    techo.traverse(x => { if (x.isMesh) mallas.push(x); else if (x.isLineSegments) lineas.push(x); });
    const morf = (x, ret) => {
      const p = x.geometry.attributes.position, fin = p.array.slice(), ini = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) ini[i] = zViejo(fin[3 * i] + CEN[0], CEN[1] - fin[3 * i + 2]) + 0.06;   // (un poco arriba: que las líneas se vean sobre la de hoy)
      morfs.push({ p, fin, ini, ret, otro: x.geometry.attributes.aOtro || null });
    };
    mallas.forEach(x => {
      x.geometry = x.geometry.index ? x.geometry.toNonIndexed() : x.geometry.clone();
      const a = x.geometry.attributes.position.array, n = a.length / 3, padre = new Int32Array(n).map((_, i) => i), primero = new Map();
      const raiz = i => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
      const une = (i, j) => { i = raiz(i); j = raiz(j); if (i !== j) padre[i] = j; };
      for (let i = 0; i < n; i++) { const k = clave(a, 3 * i); if (primero.has(k)) une(i, primero.get(k)); else primero.set(k, i); if (i % 3) une(i, i - i % 3); }
      const suma = new Map();
      for (let i = 0; i < n; i++) { const r = raiz(i), s = suma.get(r) || [0, 0, 0]; s[0] += a[3 * i]; s[1] += a[3 * i + 2]; s[2]++; suma.set(r, s); }
      // el retraso de cada pieza: las cercanas al aro primero, con un poco de azar
      const retP = new Map();
      suma.forEach((s, r) => { const d = Math.hypot(s[0] / s[2] + CEN[0] - A.u, CEN[1] - s[1] / s[2] - A.v); retP.set(r, 0.38 * Math.max(0, Math.min(1, (d - 46) / 56)) + 0.08 * (((r * 9301 + 49297) % 233280) / 233280)); });
      const ret = new Float32Array(n);
      for (let i = 0; i < n; i++) { ret[i] = retP.get(raiz(i)); retDe.set(clave(a, 3 * i), ret[i]); }
      morf(x, ret);
    });
    lineas.forEach(x => {
      x.geometry = x.geometry.clone();
      const a = x.geometry.attributes.position.array, n = a.length / 3, ret = new Float32Array(n);
      for (let i = 0; i < n; i++) { const r = retDe.get(clave(a, 3 * i)); ret[i] = r == null ? 0.2 : r; }
      morf(x, ret);
    });
    const morfa = k => morfs.forEach(M => {
      const a = M.p.array, n = M.p.count;
      // cada pieza se despega (sube SEPARA m) y se asienta a su altura
      for (let i = 0; i < n; i++) { const kk = suave(tramo(k, M.ret[i], M.ret[i] + 0.5)); a[3 * i + 1] = M.ini[i] + (M.fin[3 * i + 1] - M.ini[i]) * kk + SEPARA * Math.sin(Math.PI * kk); }
      M.p.needsUpdate = true;
      if (M.otro) { const o = M.otro.array; for (let i = 0; i + 1 < n; i += 2) { o[3 * i + 1] = a[3 * i + 4]; o[3 * i + 4] = a[3 * i + 1]; } M.otro.needsUpdate = true; }
    });
    // el color: sale con el de lo existente y llega al del mercado
    const tT = tintes(techo), tH = tintes(murosHoy), hM = tH.find(t => !t.arista), hL = tH.find(t => t.arista);
    tT.forEach(t => { t.de = (t.arista ? hL : hM) ? (t.arista ? hL : hM).base.clone() : t.base.clone(); });
    const pinta = k => tT.forEach(t => t.c.copy(t.de).lerp(t.base, k));
    MARCA.comercioTecho = { g: g1, piezas: [], rotulos: [], dur: 8000, durSale: 1500,
      aplica(k) {
        const entra = k >= 0.3, km = tramo(k, 0.32, 1);
        UT.uDib.value.x = suave(tramo(k, 0, 0.3)); UT.uDib.value.y = entra ? 1 : 0;   // las líneas primero; la cubierta, cuando ya están
        techoHoy.visible = !entra; morfa(km); pinta(suave(tramo(km, 0.1, 0.9)));
      },
      latido() {}
    };
    // 2 · los vanos: los muros de hoy se borran (de abajo hacia arriba) mientras se dibujan los del proyecto, con la celosía
    // y con sus vanos todavía tapados; luego se dibujan las líneas de cada vano y ese espacio se borra desde el aro, como
    // se borra lo demolido
    const g2 = marcaEn(gC, 'comercioVanos'), UV = canalNuevo(), UPa = canalNuevo(), vanos = new THREE.Group();
    const muros = copiaRevit(/^revit-comercio-walls-/, UV), celosia = filtraTri(copiaRevit(/^revit-comercio-curtain(Panels|Mullions)-/, UV), esCelosia);
    // las tapas: los vanos de las fachadas (vanosMercado) y, en las caras que cortó el aro, su cancelería pintada como muro
    const parches = new THREE.Group(), hoyos = new THREE.Group(), mv = vanosMercado(); hoyos.name = 'comercio-vanos';
    if (mv.p.length) { pon(hoyos, mv, 'nave', null, 25); parches.add(conCanal(hoyos, UPa)); }
    const caras = tapaVanos(filtraTri(copiaRevit(/^revit-comercio-(curtainPanels|doors)-/, UPa), (u, v) => !esCelosia(u, v) && !cercaDeLados(u, v, 0.9)), muros, UPa);
    caras.visible = true; parches.add(caras);
    muros.visible = celosia.visible = parches.visible = true; vanos.add(muros, celosia); g2.add(vanos, parches);
    barridoSube(UV, vanos); barridoBaja(UMv, UV);
    MARCA.comercioVanos = { g: g2, piezas: [], rotulos: [], dur: 8000, durSale: 1500,
      aplica(k) {
        const a = tramo(k, 0.02, 0.45); vanos.visible = a > 0; armaCanal(UV, a); armaCanal(UMv, 1 - tramo(k, 0.08, 0.5)); murosHoy.visible = k < 0.5;
        vanosEn(UPa, UV, tramo(k, 0.48, 0.64), tramo(k, 0.67, 1), O_ARO, 44, 106); parches.visible = a > 0 && k < 0.999;
      },
      latido() {}
    };
    // 3 · los pisos y la cancelería (con la de las caras que cortó el aro)
    const g3 = marcaEn(gC, 'comercioCanceleria'), UP = canalNuevo(), UC = canalNuevo();
    const pisos = copiaRevit(/^revit-comercio-floors-/, UP), cancel = filtraTri(copiaRevit(/^revit-comercio-(curtainPanels|curtainMullions|doors)-/, UC), (u, v) => !esCelosia(u, v));
    pisos.visible = cancel.visible = true; g3.add(pisos, cancel);
    barridoSube(UP, pisos); barridoSube(UC, cancel);
    MARCA.comercioCanceleria = { g: g3, piezas: [], rotulos: [], dur: 6000, durSale: 1400,
      aplica(k) { const ap = tramo(k, 0, 0.45), ac = tramo(k, 0.22, 0.86); pisos.visible = ap > 0; armaCanal(UP, ap); cancel.visible = ac > 0; armaCanal(UC, ac); },
      latido() {}
    };
  }

  /* ---------- 3h. Etapa 2: la industria ----------
     1) el contorno de la industria, como una volumetría sola (MARCAS.industria: la retícula de 5.5 × 4 m, en dos
     niveles); 2) dentro de ella, los módulos que se quitaron (los de los patios y los de la planta baja libre) se
     marcan en rojo y se borran, y lo que queda deja paso al edificio del Revit, con sus vanos y su vidrio; 3) los
     chacuacos (los conos de luz) y el recorrido del sol del 21 de diciembre: la luz entra por cada cono. Al terminar
     se suelta el foco. */
  function armaIndustria() {
    const D = MARCAS.industria; if (!D) return;
    const gI = new THREE.Group(); gI.name = 'industria'; gH.add(gI); FOCO.industria = [gI];
    const a = D.giro * RAD, ca = Math.cos(a), sa = Math.sin(a);
    const P = (x, y) => [D.origen[0] + x * ca - y * sa, D.origen[1] + x * sa + y * ca];
    const nI = D.filas[0].length, nJ = D.filas.length, z = D.niveles, e = 0.04;
    const tipo = (i, j) => i < 0 || j < 0 || i >= nI || j >= nJ ? '.' : D.filas[nJ - 1 - j][i];
    const celdaPol = (i, j, m) => api.ccw([P(D.x0 + i * D.dx + m, D.y0 + j * D.dy + m), P(D.x0 + (i + 1) * D.dx - m, D.y0 + j * D.dy + m),
      P(D.x0 + (i + 1) * D.dx - m, D.y0 + (j + 1) * D.dy - m), P(D.x0 + i * D.dx + m, D.y0 + (j + 1) * D.dy - m)]);
    const celda = (u, v) => { const du = u - D.origen[0], dv = v - D.origen[1]; return [Math.floor((du * ca + dv * sa - D.x0) / D.dx), Math.floor((-du * sa + dv * ca - D.y0) / D.dy)]; };
    // una volumetría sola: la envolvente de las celdas de cada nivel, sin las juntas entre módulos
    function envolvente(en) {   // en(i, j, l): ¿la celda está en el nivel l?
      const m = new Malla(), L = z.length - 1;
      for (let l = 0; l < L; l++) for (let j = 0; j < nJ; j++) for (let i = 0; i < nI; i++) {
        if (!en(i, j, l)) continue;
        const q = celdaPol(i, j, 0), c = P(D.x0 + (i + 0.5) * D.dx, D.y0 + (j + 0.5) * D.dy);
        api.muros(m, q, z[l], z[l + 1], null, (p, r) => {   // sólo los lados que dan afuera
          const mu = (p[0] + r[0]) / 2, mv = (p[1] + r[1]) / 2, [ni, nj] = celda(mu + (mu - c[0]) * 0.2, mv + (mv - c[1]) * 0.2);
          return !en(ni, nj, l);
        });
        if (l === L - 1 || !en(i, j, l + 1)) tapa(m, q, z[l + 1]);
        if (l > 0 && !en(i, j, l - 1)) tapa(m, q, z[l], null, true);
      }
      return m;
    }
    const masa = envolvente((i, j) => tipo(i, j) !== '.');                                      // todo el contorno
    const queda = envolvente((i, j, l) => tipo(i, j) === '#' || (tipo(i, j) === 'b' && l > 0));  // lo que se queda
    const quita = new Malla();                                                                  // los módulos que se quitan
    for (let j = 0; j < nJ; j++) for (let i = 0; i < nI; i++) for (let l = 0; l + 1 < z.length; l++)
      if (tipo(i, j) === 'p' || (tipo(i, j) === 'b' && l === 0)) prisma(quita, celdaPol(i, j, e), z[l] + e, z[l + 1] - e);
    const volumen = (m, U) => { const o = new THREE.Group(); o.name = 'industria-volumen'; pon(o, m, 'industria', null, 25); return conCanal(o, U); };
    const UA = canalNuevo(), UQ = canalNuevo(), UR = canalNuevo();
    const gMasa = volumen(masa, UA), gQueda = volumen(queda, UQ), gQuita = volumen(quita, UR);
    // 1 · el contorno, una volumetría sola
    const g1 = marcaEn(gI, 'industriaVolumen'); g1.add(gMasa, gQueda, gQuita);
    barridoSube(UA, gMasa); barridoBaja(UQ, UA); barridoBaja(UR, UA);   // (lo que se quita y lo que queda sólo se borran: lo de abajo primero)
    const tq = tintes(gQuita), rojoC = new THREE.Color(ROJO);
    let pulso = 1;
    // los dos tiempos tocan los mismos grupos: se calculan juntos
    function volumenEn() {
      const k1 = marcaK.industriaVolumen || 0, k2 = marcaK.industriaPatios || 0, partido = k2 > 0.001;
      armaCanal(UA, tramo(k1, 0, 1));
      gMasa.visible = !partido; gQuita.visible = partido && k2 < 0.3; gQueda.visible = partido && k2 < 0.56;
      armaCanal(UR, 1 - tramo(k2, 0.1, 0.3));
      armaCanal(UQ, 1 - tramo(k2, 0.3, 0.56));
      const r = suave(tramo(k2, 0, 0.08)) * (k2 < 0.1 ? pulso : 1);
      tq.forEach(t => { t.c.copy(t.base).lerp(rojoC, r); if (t.g != null) t.m.uniforms.uGris.value = t.g + (0.42 - t.g) * r; });
    }
    MARCA.industriaVolumen = { g: g1, piezas: [], rotulos: [], dur: 4200, durSale: 1400, aplica: volumenEn, latido() {} };
    // 2 · se quitan los módulos (patios y planta baja libre) y queda el edificio: sus muros y losas salen con los vanos
    // de las ventanas tapados; luego se dibujan las líneas de cada ventana, ese espacio se borra (desde el centro de la
    // industria, como lo demolido) y al final entra el vidrio
    const g2 = marcaEn(gI, 'industriaPatios'), UE = canalNuevo(), UPi = canalNuevo(), UG = canalNuevo();
    const edif = copiaRevit(/^revit-industria-(walls|floors)-/, UE), vidrio = copiaRevit(/^revit-industria-(windows|doors|curtainPanels)-/, UG);
    const parches = tapaVanos(copiaRevit(/^revit-industria-(windows|doors|curtainPanels)-/, UPi), edif, UPi);
    edif.visible = vidrio.visible = parches.visible = true; g2.add(edif, parches, vidrio);
    barridoSube(UE, edif); barridoSube(UG, vidrio);
    const CI = V3(...P(D.x0 + nI * D.dx / 2, D.y0 + nJ * D.dy / 2), 0);
    MARCA.industriaPatios = { g: g2, piezas: [], rotulos: [], dur: 9500, durSale: 1600,
      aplica(k) {
        volumenEn();
        const a = tramo(k, 0.3, 0.56); edif.visible = a > 0; armaCanal(UE, a);
        vanosEn(UPi, UE, tramo(k, 0.58, 0.7), tramo(k, 0.72, 0.9), CI, 0, 34); parches.visible = a > 0 && k < 0.9;
        const v = tramo(k, 0.86, 1); vidrio.visible = v > 0; armaCanal(UG, v);
      },
      latido(ms, k) { pulso = k > 0.05 && k < 0.1 ? 0.82 + 0.18 * Math.sin(ms / 130) : 1; if (k > 0.05 && k < 0.1) volumenEn(); }
    };
    // 3 · los conos de luz y el sol del 21 de diciembre
    const g3 = marcaEn(gI, 'industriaConos'), UK = canalNuevo();
    const conos = copiaRevit(/^revit-industria-(chacuacos|chimeneas)-/, UK); conos.visible = true; g3.add(conos);
    barridoSube(UK, conos);
    const Rv = window.ATLAMPA_REVIT || {}, oR = Rv.origen || [0, 0, 0];
    const gF = (Rv.grupos || []).find(r => r.programa === 'industria' && r.categoria === 'floors'), losaN1 = [];
    if (gF) {
      const f = new Float32Array(Rv.buffer, gF.offset, gF.floats);
      for (let i = 0; i < f.length; i += 9) if ([2, 5, 8].every(j => Math.abs(f[i + j] + oR[2] - 3.06) < 0.05)) losaN1.push([0, 3, 6].map(j => [f[i + j] + oR[0], f[i + j + 1] + oR[1]]));
    }
    const enTri = (p, t) => { const s = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]); const d1 = s(p, t[0], t[1]), d2 = s(p, t[1], t[2]), d3 = s(p, t[2], t[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    // cada cono: su boca (arriba) y el piso al que llega la luz (el del nivel 1 si hay losa debajo; si no, la planta baja)
    const conosLuz = (Rv.piezasCubiertaIndustria || []).filter(p => !/CHIMENEA/i.test(p.familia)).map(p => {
      const b = p.bbox, u = (b[0][0] + b[1][0]) / 2 + oR[0], v = (b[0][1] + b[1][1]) / 2 + oR[1];
      return { u, v, zT: b[1][2] + oR[2], piso: losaN1.some(t => enTri([u, v], t)) ? 3.1 : 0.14, r: Math.min(b[1][0] - b[0][0], b[1][1] - b[0][1]) * 0.24 };
    });
    const ORO = 0xffd34d, cg = Math.cos(G.GIRO), sg = Math.sin(G.GIRO), C0 = P(D.x0 + nI * D.dx / 2, D.y0 + nJ * D.dy / 2), RS = 40;
    const enCielo = (alt, az, extra) => { const c = Math.cos(alt * RAD), E = c * Math.sin(az * RAD), N = c * Math.cos(az * RAD); return [C0[0] + RS * (E * cg - N * sg), C0[1] + RS * (E * sg + N * cg), RS * Math.sin(alt * RAD) + 2 + (extra || 0)]; };
    const dirSol = (alt, az) => { const c = Math.cos(alt * RAD), E = c * Math.sin(az * RAD), N = c * Math.cos(az * RAD); return [E * cg - N * sg, E * sg + N * cg, Math.sin(alt * RAD)]; };
    const DIA = G.diaDelAno(new Date(new Date().getFullYear(), 11, 21)), horas = [];
    for (let h = 5; h <= 20; h += 1 / 12) { const q = G.solEn(DIA, h); if (q.alt > 1) horas.push([h, q]); }
    const h0 = horas[0][0], h1 = horas[horas.length - 1][0];
    // el arco del día y el horizonte (tenue), alrededor de la industria
    const arco = new THREE.BufferGeometry().setFromPoints(horas.map(([, q]) => V3(...enCielo(q.alt, q.az))));
    const mArco = new THREE.LineBasicMaterial({ color: 0xffcf6b, transparent: true, opacity: 0 }), lArco = new THREE.Line(arco, mArco);
    const hz = []; for (let i = 0; i <= 120; i++) hz.push(V3(C0[0] + RS * Math.cos(i / 60 * Math.PI), C0[1] + RS * Math.sin(i / 60 * Math.PI), 0.3));
    const mHz = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), lHz = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hz), mHz);
    // el sol
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    { const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,211,77,.18)'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill(); x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(32, 32, 13, 0, 7); x.fill(); }
    const mSol = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false });
    const sol = new THREE.Sprite(mSol); sol.scale.set(6, 6, 1);   // (en metros: la vista es axonométrica)
    // la luz que entra por cada cono: un haz que baja desde su boca hasta el piso con la inclinación del sol (a través
    // del edificio: es un diagrama), con su mancha en el piso; los dos se mueven con el sol. El corrimiento en el piso
    // se limita a CORRE m, para que la luz no se salga del módulo cuando el sol está bajo
    const CORRE = 3.2, arriba = new THREE.Vector3(0, 1, 0), dirH = new THREE.Vector3(), pT = new THREE.Vector3(), pF = new THREE.Vector3();
    const mCol = new THREE.MeshBasicMaterial({ color: ORO, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    const mMan = mCol.clone();
    const luces = new THREE.Group(), haces = conosLuz.map(c => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 1.25, 1, 20, 1, true).translate(0, 0.5, 0), mCol);
      const man = new THREE.Mesh(new THREE.CircleGeometry(c.r * 1.7, 28).rotateX(-Math.PI / 2), mMan);
      col.renderOrder = man.renderOrder = 12; luces.add(col, man);
      return { c, col, man };
    });
    [lArco, lHz, sol].forEach(o => { o.renderOrder = 11; });
    g3.add(lArco, lHz, sol, luces);
    let solK = 0;
    function ponSol(t) {   // t: 0, cuando sale … 1, cuando se pone
      const h = h0 + (h1 - h0) * t, q = G.solEn(DIA, h), alt = Math.max(3, q.alt);
      sol.position.copy(V3(...enCielo(alt, q.az)));
      const d = dirSol(alt, q.az), hz = Math.hypot(d[0], d[1]) || 1;
      haces.forEach(({ c, col, man }) => {
        const alto = c.zT - c.piso, corre = Math.min(CORRE, alto * hz / Math.max(0.05, d[2]));   // lo que se corre la luz en el piso
        pT.set(...W(c.u, c.v, c.zT - 0.2)); pF.set(...W(c.u - d[0] / hz * corre, c.v - d[1] / hz * corre, c.piso));
        dirH.subVectors(pT, pF); const L = dirH.length();
        col.position.copy(pF); col.quaternion.setFromUnitVectors(arriba, dirH.normalize()); col.scale.set(1, Math.max(0.5, L), 1);
        man.position.set(pF.x, pF.y + 0.06, pF.z);
      });
      const s = Math.sin(alt * RAD);
      mCol.opacity = (0.06 + 0.24 * s) * solK; mMan.opacity = (0.1 + 0.38 * s) * solK; mSol.opacity = solK;
    }
    // los conos; el arco se traza; el sol lo recorre una vez, de que sale a que se pone; luego el diagrama se va (y la
    // slide suelta el foco: foco.suelta)
    MARCA.industriaConos = { g: g3, piezas: [], rotulos: [], dur: 17000, durSale: 1600,
      aplica(k) {
        const a = tramo(k, 0, 0.16); conos.visible = a > 0; armaCanal(UK, a);
        const t = tramo(k, 0.14, 0.26), fuera = 1 - tramo(k, 0.84, 0.92);
        arco.setDrawRange(0, Math.ceil(horas.length * t)); mArco.opacity = 0.9 * Math.min(1, t * 4) * fuera; mHz.opacity = 0.16 * t * fuera;
        solK = tramo(k, 0.24, 0.3) * fuera; ponSol(tramo(k, 0.28, 0.84));
        lArco.visible = lHz.visible = mArco.opacity > 0.002; sol.visible = luces.visible = solK > 0.002;
      },
      latido() {}
    };
  }

  /* ---------- 3i. Etapa 2: la vivienda ----------
     El proceso de diseño (Diego, 2026-11-27): 1) dos volumetrías orgánicas que se doblan y se moldean según el sol de
     invierno y de verano (sus curvas de nivel, una por nivel, y luego sus caras); 2) el recorrido del sol del 21 de
     diciembre y, sobre la superficie, el diagrama cuadriculado de las horas de sol (azul claro: casi nada; amarillo:
     intermedias; rojo fuerte: muchas), que se va llenando mientras el sol avanza; 3) la volumetría se llena de módulos
     (con los pisos extra, que no estaban en ella) y se quitan, en rojo, los que no convenían; 4) los módulos dejan paso
     al edificio del Revit, con las ventanas tapadas, y se arman las ventanas, los pasillos y los núcleos (desde la
     planta baja). Al terminar se suelta el foco. Datos: atlampa-historia-vivienda.js
     (herramientas/prepara-vivienda-historia.py). */
  // el cuadro de cada fragmento (como en prepara-vivienda-historia.py: según hacia dónde mira la cara, en el marco de la
  // torre) y su color según las horas de sol acumuladas (uTex: 0…1 de las horas del día), con la cuadrícula encima
  const VERT_HORAS = /* glsl */`
    varying vec3 vP; varying vec3 vN;
    void main() { vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const FRAG_HORAS = /* glsl */`
    uniform sampler2D uTex; uniform vec2 uTam; uniform float uBase; uniform vec2 uO; uniform vec2 uEje; uniform vec3 uMin;
    uniform vec3 uS; uniform vec3 uN; uniform float uB[6]; uniform vec2 uCen; uniform vec3 uLuz; uniform float uOp; uniform float uRej;
    varying vec3 vP; varying vec3 vN;
    float raya(float c) { float w = fwidth(c); float d = abs(fract(c + 0.5) - 0.5); return 1.0 - smoothstep(0.035 - w * 0.5, 0.035 + w, d); }
    vec3 rampa(float h) {
      vec3 c0 = vec3(0.80, 0.90, 1.0), c1 = vec3(1.0, 0.87, 0.34), c2 = vec3(1.0, 0.5, 0.2), c3 = vec3(0.78, 0.07, 0.06);
      return h < 0.45 ? mix(c0, c1, h / 0.45) : h < 0.75 ? mix(c1, c2, (h - 0.45) / 0.3) : mix(c2, c3, (h - 0.75) / 0.25);
    }
    void main() {
      vec3 n = normalize(cross(dFdx(vP), dFdy(vP))); if (dot(n, vN) < 0.0) n = -n;
      vec2 bj = vec2(-uEje.y, uEje.x), p = vec2(vP.x + uCen.x, uCen.y - vP.z) - uO, nh = vec2(n.x, -n.z);
      float na = dot(nh, uEje), nb = dot(nh, bj), nz = n.y;
      vec3 f = (vec3(dot(p, uEje), dot(p, bj), vP.y) - uMin) / uS, i = clamp(floor(f), vec3(0.0), uN - 1.0);
      float k; vec2 g;
      if (abs(nz) >= max(abs(na), abs(nb))) { k = (nz > 0.0 ? uB[0] : uB[1]) + i.x + i.y * uN.x; g = f.xy; }
      else if (abs(nb) >= abs(na)) { k = (nb > 0.0 ? uB[2] : uB[3]) + i.x + i.z * uN.x; g = f.xz; }
      else { k = (na > 0.0 ? uB[4] : uB[5]) + i.y + i.z * uN.y; g = f.yz; }
      k += uBase;
      float h = texture2D(uTex, vec2((mod(k, uTam.x) + 0.5) / uTam.x, (floor(k / uTam.x) + 0.5) / uTam.y)).r;
      float lam = clamp(dot(n, normalize(uLuz)) * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = rampa(h) * (0.8 + 0.2 * lam);
      col = mix(col, col * 0.42, max(raya(g.x), raya(g.y)) * uRej);
      gl_FragColor = vec4(col, uOp);
    }`;
  function armaVivienda() {
    const D = window.ATLAMPA_HISTORIA_VIVIENDA; if (!D) return;
    const gV = new THREE.Group(); gV.name = 'vivienda'; gH.add(gV); FOCO.vivienda = [gV];
    const ZB = D.modulos.z0, PASO = D.modulos.paso;
    // un canal que entra de abajo hacia arriba y sale de abajo hacia arriba (lo de abajo se va primero)
    const dosBarridos = (U, obj) => {
      barridoSube(U, obj); const sube = [U.uDibO.value.clone(), U.uDibV.value.clone()];
      const B = canalNuevo(); barridoBaja(B, U); const baja = [B.uDibO.value.clone(), B.uDibV.value.clone()];
      return entra => { const [o, v] = entra ? sube : baja; U.uDib.value.z = 0; U.uDibO.value.copy(o); U.uDibV.value.copy(v); };
    };

    // 1 · las volumetrías orgánicas, con sus curvas de nivel (una por nivel de la vivienda)
    const g1 = marcaEn(gV, 'viviendaVolumen'), UO = canalNuevo(), orgs = new THREE.Group();
    const torres = D.torres.map(T => {
      const o = T.o, n = T.v.length / 3, pos = new Float32Array(T.v.length), uvz = new Float32Array(T.v.length);
      for (let i = 0; i < n; i++) {
        const u = o[0] + T.v[3 * i] / 100, v = o[1] + T.v[3 * i + 1] / 100, z = o[2] + T.v[3 * i + 2] / 100;
        uvz[3 * i] = u; uvz[3 * i + 1] = v; uvz[3 * i + 2] = z; pos.set(W(u, v, z), 3 * i);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(T.f); geo.computeVertexNormals();
      const lin = new Lineas(), F = T.f;
      let zMax = -Infinity; for (let i = 2; i < uvz.length; i += 3) zMax = Math.max(zMax, uvz[i]);
      for (let c = ZB + PASO; c < zMax; c += PASO) for (let t = 0; t < F.length; t += 3) {
        const q = [];
        for (let j = 0; j < 3; j++) {
          const a = 3 * F[t + j], b = 3 * F[t + (j + 1) % 3], za = uvz[a + 2], zb = uvz[b + 2];
          if ((za - c) * (zb - c) < 0) { const s = (c - za) / (zb - za); q.push(W(uvz[a] + (uvz[b] - uvz[a]) * s, uvz[a + 1] + (uvz[b + 1] - uvz[a + 1]) * s, c)); }
        }
        if (q.length === 2) lin.seg(q[0], q[1]);
      }
      const g = new THREE.Group(); g.name = 'vivienda-organica'; pon(g, geo, 'modulo', null, false, lin);
      orgs.add(conCanal(g, UO));
      return { T, geo };
    });
    g1.add(orgs);
    const barreO = dosBarridos(UO, orgs);

    // 2 · el sol del 21 de diciembre y las horas de sol de cada cuadro
    const g2 = marcaEn(gV, 'viviendaSol');
    const S = D.sol.muestras, DT = D.sol.dt, HDIA = D.sol.h1 - D.sol.h0;
    let nCel = 0; const bases = D.torres.map(T => { const b = nCel; nCel += T.marco.total; return b; });
    const TW = 256, TH = Math.ceil(nCel / TW), datos = new Uint8Array(TW * TH), cum = new Float32Array(nCel * (S + 1));
    D.torres.forEach((T, t) => T.celdas.forEach((s, i) => {
      const c = (bases[t] + i) * (S + 1); let a = 0;
      for (let j = 0; j < S; j++) { cum[c + j] = a; a += s ? (+s[j]) / 9 * DT : 0; }
      cum[c + S] = a;
    }));
    const tex = new THREE.DataTexture(datos, TW, TH, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
    let horaHecha = -1;
    function horasHasta(t) {   // t: 0, cuando sale el sol … 1, cuando se pone
      if (Math.abs(t - horaHecha) < 1e-4) return;
      horaHecha = t;
      const x = t * S, s0 = Math.min(S - 1, Math.floor(x)), f = x - s0;
      for (let i = 0; i < nCel; i++) { const c = i * (S + 1), h = cum[c + s0] + (cum[c + s0 + 1] - cum[c + s0]) * f; datos[i] = Math.min(255, Math.round(h / HDIA * 255)); }
      tex.needsUpdate = true;
    }
    const uLuz = material('modulo').uniforms.uLuz, uOp = { value: 0 }, uRej = { value: 0 };
    const horas = new THREE.Group();
    torres.forEach(({ T, geo }, t) => {
      const M = T.marco;
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_HORAS, fragmentShader: FRAG_HORAS, transparent: true, side: THREE.FrontSide,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
        uniforms: { uTex: { value: tex }, uTam: { value: new THREE.Vector2(TW, TH) }, uBase: { value: bases[t] }, uO: { value: new THREE.Vector2(T.o[0], T.o[1]) },
          uEje: { value: new THREE.Vector2(Math.cos(M.ang), Math.sin(M.ang)) }, uMin: { value: new THREE.Vector3(M.amin, M.bmin, M.zmin) },
          uS: { value: new THREE.Vector3(M.SA, M.SB, M.SZ) }, uN: { value: new THREE.Vector3(M.nA, M.nB, M.nZ) }, uB: { value: M.base.slice() },
          uCen: { value: new THREE.Vector2(CEN[0], CEN[1]) }, uLuz, uOp, uRej }
      });
      const me = new THREE.Mesh(geo, mat); me.renderOrder = 3; horas.add(me);
    });
    // el arco del día, el horizonte (en la base de la vivienda) y el sol, alrededor de las dos torres
    const cg = Math.cos(G.GIRO), sg = Math.sin(G.GIRO), RS = 66;
    const C0 = [D.torres.reduce((s, T) => s + T.o[0], 0) / D.torres.length, D.torres.reduce((s, T) => s + T.o[1], 0) / D.torres.length];
    const enCielo = (alt, az) => { const c = Math.cos(alt * RAD), E = c * Math.sin(az * RAD), N = c * Math.cos(az * RAD); return [C0[0] + RS * (E * cg - N * sg), C0[1] + RS * (E * sg + N * cg), ZB + RS * Math.sin(alt * RAD)]; };
    const DIA = G.diaDelAno(new Date(2026, 11, 21)), muestrasArco = [];
    for (let h = D.sol.h0; h <= D.sol.h1 + 1e-6; h += 1 / 12) muestrasArco.push(G.solEn(DIA, h));
    const arco = new THREE.BufferGeometry().setFromPoints(muestrasArco.map(q => V3(...enCielo(Math.max(0, q.alt), q.az))));
    const mArco = new THREE.LineBasicMaterial({ color: 0xffcf6b, transparent: true, opacity: 0 }), lArco = new THREE.Line(arco, mArco);
    const hz = []; for (let i = 0; i <= 120; i++) hz.push(V3(C0[0] + RS * Math.cos(i / 60 * Math.PI), C0[1] + RS * Math.sin(i / 60 * Math.PI), ZB));
    const mHz = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), lHz = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hz), mHz);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    { const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,211,77,.18)'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill(); x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(32, 32, 13, 0, 7); x.fill(); }
    const mSol = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false });
    const sol = new THREE.Sprite(mSol); sol.scale.set(8, 8, 1);
    [lArco, lHz, sol].forEach(o => { o.renderOrder = 11; });
    g2.add(horas, lArco, lHz, sol);

    // 3 · los módulos: los que quedan (con los pisos extra) y los que se quitan
    const Md = D.modulos, gm = Md.giro * RAD, cm = Math.cos(gm), sm = Math.sin(gm), E = 0.04;
    const huella = (u, v) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => { const a = x * (Md.a / 2 - E), b = y * (Md.b / 2 - E); return [u + a * cm - b * sm, v + a * sm + b * cm]; });
    const cajas = lista => {
      const m = new Malla();
      lista.forEach(([u, v, n]) => { const z0 = ZB + n * PASO; prisma(m, huella(u, v), z0 + E, z0 + Md.alto - E); });
      const o = new THREE.Group(); o.name = 'vivienda-modulos'; pon(o, m, 'modulo', null, 25); return o;
    };
    const g3 = marcaEn(gV, 'viviendaModulos'), UQ = canalNuevo(), UX = canalNuevo();
    const gQueda = conCanal(cajas(Md.quedan), UQ), gQuita = conCanal(cajas(Md.quitan), UX);
    g3.add(gQueda, gQuita);
    const barreQ = dosBarridos(UQ, gQueda);
    barridoSube(UX, gQueda);   // (entran junto con los que quedan; se quitan de arriba hacia abajo)
    const tq = tintes(gQuita), rojoC = new THREE.Color(ROJO);
    let pulso = 1;

    // 4 · el edificio del Revit (muros y losas, sin los núcleos ni los pasillos), las ventanas, los pasillos y los núcleos
    const enNucleo = (u, v) => D.nucleos.some(b => u > b[0] - 0.4 && u < b[2] + 0.4 && v > b[1] - 0.4 && v < b[3] + 0.4);
    function losas(clase) {   // las losas del Revit, partidas en prepara-vivienda-historia.py: 'losa' o 'pasillo'
      const m = new Malla();
      D.losas.forEach(L => L[clase].forEach(pol => {
        const [ext, ...hoyos] = pol.map(r => pares(r)), e = api.ccw(ext), todos = e.concat(...hoyos);
        THREE.ShapeUtils.triangulateShape(e.map(q => new THREE.Vector2(q[0], q[1])), hoyos.map(h => h.map(q => new THREE.Vector2(q[0], q[1])))).forEach(t => {
          m.tri(...t.map(k => W(todos[k][0], todos[k][1], L.z[1])));
          m.tri(...[t[0], t[2], t[1]].map(k => W(todos[k][0], todos[k][1], L.z[0])));
        });
        [e].concat(hoyos).forEach(r => api.muros(m, r, L.z[0], L.z[1]));
      }));
      const o = new THREE.Group(); o.name = 'vivienda-' + clase; pon(o, m, 'modulo', null, 25); return o;
    }
    const g4 = marcaEn(gV, 'viviendaEdificio');
    const UE = canalNuevo(), UPi = canalNuevo(), UG = canalNuevo(), UP = canalNuevo(), UN = canalNuevo();
    const muros = filtraTri(copiaRevit(/^revit-vivienda-walls-/, UE), (u, v) => !enNucleo(u, v));
    const edif = new THREE.Group(); edif.add(muros, conCanal(losas('losa'), UE)); muros.visible = true;
    const tapas = tapaVanos(copiaRevit(/^revit-vivienda-(windows|doors)-/, UPi), muros, UPi);
    const vidrio = copiaRevit(/^revit-vivienda-(windows|doors)-/, UG);
    const pasillos = conCanal(losas('pasillo'), UP);
    const nucleos = filtraTri(copiaRevit(/^revit-vivienda-walls-/, UN), (u, v) => enNucleo(u, v));
    tapas.visible = vidrio.visible = nucleos.visible = true;
    g4.add(edif, tapas, vidrio, pasillos, nucleos);
    barridoSube(UE, edif); barridoSube(UG, vidrio); barridoSube(UP, pasillos); barridoSube(UN, nucleos);
    const CV = V3(C0[0], C0[1], 0);

    // los tiempos tocan los mismos grupos: se calculan juntos
    function viviendaEn() {
      const k1 = marcaK.viviendaVolumen || 0, k2 = marcaK.viviendaSol || 0, k3 = marcaK.viviendaModulos || 0, k4 = marcaK.viviendaEdificio || 0;
      // la volumetría: se dibuja (1) y se borra cuando los módulos ya la envuelven (3), lo de abajo primero
      const fuera = tramo(k3, 0.3, 0.46);
      barreO(fuera <= 0); armaCanal(UO, fuera > 0 ? 1 - fuera : tramo(k1, 0, 1)); orgs.visible = k1 > 0.001 && fuera < 1;
      // el diagrama de horas: entra en azul claro con su cuadrícula y se llena mientras el sol avanza; se va con los módulos
      uOp.value = tramo(k2, 0, 0.12) * (1 - tramo(k3, 0.26, 0.4)); uRej.value = tramo(k2, 0.05, 0.16);
      horas.visible = uOp.value > 0.002;
      horasHasta(tramo(k2, 0.2, 0.86));
      // los módulos: entran todos alrededor de la volumetría (primero sus líneas, que dejan verla; luego sus caras, de
      // abajo hacia arriba); los que no convenían se ponen rojos y se quitan (de arriba hacia abajo); los que quedan
      // dejan paso al edificio (4), lo de abajo primero
      const lq = tramo(k3, 0, 0.26), cq = tramo(k3, 0.2, 0.46);
      barreQ(k4 <= 0.001);
      if (k4 > 0.001) armaCanal(UQ, 1 - tramo(k4, 0.04, 0.3)); else { UQ.uDib.value.x = lq; UQ.uDib.value.y = cq; }
      gQueda.visible = lq > 0 && k4 < 0.3;
      if (k3 < 0.6) { UX.uDib.value.x = lq; UX.uDib.value.y = cq; } else armaCanal(UX, 1 - tramo(k3, 0.6, 0.92));
      gQuita.visible = lq > 0 && k3 < 0.92;
      const r = suave(tramo(k3, 0.48, 0.58)) * (k3 > 0.48 && k3 < 0.6 ? pulso : 1);
      tq.forEach(t => { t.c.copy(t.base).lerp(rojoC, r); if (t.g != null) t.m.uniforms.uGris.value = t.g + (0.42 - t.g) * r; });
    }
    MARCA.viviendaVolumen = { g: g1, piezas: [], rotulos: [], dur: 6500, durSale: 1400, aplica: viviendaEn, latido() {} };
    let solK = 0;
    MARCA.viviendaSol = { g: g2, piezas: [], rotulos: [], dur: 16000, durSale: 1600,
      aplica(k) {
        viviendaEn();
        // el arco se traza; el sol lo recorre una vez, de que sale a que se pone; luego el arco y el sol se van y queda
        // el diagrama
        const t = tramo(k, 0.03, 0.18), fuera = 1 - tramo(k, 0.88, 0.97);
        arco.setDrawRange(0, Math.ceil(muestrasArco.length * t)); mArco.opacity = 0.9 * Math.min(1, t * 4) * fuera; mHz.opacity = 0.16 * t * fuera;
        solK = tramo(k, 0.16, 0.22) * fuera;
        const q = G.solEn(DIA, D.sol.h0 + HDIA * tramo(k, 0.2, 0.86));
        sol.position.copy(V3(...enCielo(Math.max(2, q.alt), q.az))); mSol.opacity = solK;
        lArco.visible = lHz.visible = mArco.opacity > 0.002; sol.visible = solK > 0.002;
      },
      latido() {}
    };
    MARCA.viviendaModulos = { g: g3, piezas: [], rotulos: [], dur: 11000, durSale: 1600, aplica: viviendaEn,
      latido(ms, k) { pulso = k > 0.52 && k < 0.6 ? 0.82 + 0.18 * Math.sin(ms / 130) : 1; if (k > 0.52 && k < 0.6) viviendaEn(); }
    };
    MARCA.viviendaEdificio = { g: g4, piezas: [], rotulos: [], dur: 16000, durSale: 1600,
      aplica(k) {
        viviendaEn();
        const a = tramo(k, 0.02, 0.3); edif.visible = a > 0; armaCanal(UE, a);
        vanosEn(UPi, UE, tramo(k, 0.32, 0.42), tramo(k, 0.44, 0.58), CV, 0, 100); tapas.visible = a > 0 && k < 0.58;
        const v = tramo(k, 0.54, 0.68); vidrio.visible = v > 0; armaCanal(UG, v);
        const p = tramo(k, 0.62, 0.8); pasillos.visible = p > 0; armaCanal(UP, p);
        const n = tramo(k, 0.72, 0.92); nucleos.visible = n > 0; armaCanal(UN, n);
      },
      latido() {}
    };
  }

  /* ---------- 4. HTML: tarjeta, rótulos, navegación ---------- */
  const capa = document.createElement('div'); capa.className = 'hist-capa'; capa.hidden = true;
  capa.innerHTML = '<div class="hist-rotulos"></div><aside class="hist-tarjeta" aria-live="polite"></aside>' +
    '<nav class="hist-nav" aria-label="Slides de la presentación"><button type="button" class="hist-nav-flecha" data-hist="anterior" aria-label="Slide anterior">‹ Anterior</button>' +
    '<ol class="hist-nav-lista">' + GUION.map((s, i) => (i === 0 || etapaDe(i) !== etapaDe(i - 1) ? '<li class="hist-nav-etapa" aria-hidden="true">Etapa ' + etapaDe(i) + '</li>' : '') +
      '<li data-etapa="' + etapaDe(i) + '"><button type="button" data-hist-ir="' + i + '" title="' + s.titulo + '"><span>' + String(i + 1).padStart(2, '0') + '</span><i class="tt"> ' + s.titulo + '</i></button></li>').join('') + '</ol>' +
    '<button type="button" class="hist-nav-flecha hist-nav-sigue" data-hist="siguiente" aria-label="Slide siguiente">Siguiente ›</button></nav>' +
    '<div class="hist-carga" role="status">Armando Atlampa…</div>';
  trabajo.appendChild(capa);
  // portada: la palabra del concepto, enorme y difuminada, tendida en el piso arriba a la izquierda
  // de la vista de la slide; queda detrás de las volumetrías (los edificios la tapan)
  const matFondo = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const fondo3D = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), matFondo);
  fondo3D.renderOrder = 1; fondo3D.visible = false; gH.add(fondo3D);
  let fondoTexto = null, fondoTok = 0;
  function texturaFondo(t, blur) {
    const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
    const cv = document.createElement('canvas'), x = cv.getContext('2d'), px = 260, pad = 60;
    x.font = '300 ' + px + 'px ' + fam;
    const w = Math.ceil(x.measureText(t).width) + 2 * pad, h = Math.ceil(px * 1.25) + 2 * pad;
    cv.width = w; cv.height = h;
    x.font = '300 ' + px + 'px ' + fam; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
    x.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    x.fillText(t, pad, h / 2);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    return { tex, asp: w / h };
  }
  // pos 'aro': la palabra se escribe sobre la colonia y su última letra es el aro del proyecto, en su
  // lugar y a su tamaño (la «o» mide lo que el diámetro exterior del aro). Se calcula la escala con
  // las medidas del glifo; el aro es una cinta coral con los flujos del circuito.
  let fondoAro = null;
  function disenoAro(t, az) {
    const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
    const cv = document.createElement('canvas'), x = cv.getContext('2d'), px = 300, pad = 40, f = '300 ' + px + 'px ' + fam;
    x.font = f;
    const base = t.slice(0, -1), wBase = x.measureText(base).width, mo = x.measureText(t.slice(-1)), ml = x.measureText('l');
    const w = Math.ceil(wBase + mo.actualBoundingBoxRight) + 2 * pad, h = Math.ceil(px * 1.3) + 2 * pad, yb = pad + px;
    cv.width = w; cv.height = h; x.font = f; x.fillStyle = '#ffffff'; x.fillText(base, pad, yb);
    x.fillStyle = 'rgba(255, 111, 99, 0.22)'; x.fillText(t.slice(-1), pad + wBase, yb);   // la sombra de la «o»: el aro flota encima
    const ocx = pad + wBase + (mo.actualBoundingBoxRight - mo.actualBoundingBoxLeft) / 2, ocy = yb - (mo.actualBoundingBoxAscent - mo.actualBoundingBoxDescent) / 2;
    const Hpx = mo.actualBoundingBoxAscent + mo.actualBoundingBoxDescent, stem = ml.actualBoundingBoxRight + ml.actualBoundingBoxLeft;
    const A = G.ANILLO, k = 2 * A.re / Hpx, a = az * RAD;
    const ex = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), nw = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const centroO = V3(A.u, A.v, 0.4), c = centroO.clone().addScaledVector(ex, (w / 2 - ocx) * k).addScaledVector(nw, (ocy - h / 2) * k);
    const W2 = w * k / 2, H2 = h * k / 2, esq = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => c.clone().addScaledVector(ex, i * W2).addScaledVector(nw, j * H2));
    const us = esq.map(p => p.x + CEN[0]), vs = esq.map(p => -p.z + CEN[1]);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
    return { tex, c, ex, nw, ancho: w * k, alto: h * k, a, grosor: stem * k, caja: [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)] };
  }
  // la palabra impresa sobre la volumetría: una proyección desde arriba sobre el piso y sobre copias
  // de los edificios que caen debajo (techos y muros), así que se dobla con ellos
  const matImpresa = new THREE.ShaderMaterial({
    uniforms: { uMapa: { value: null }, uO: { value: new THREE.Vector3() }, uEx: { value: new THREE.Vector3() }, uNw: { value: new THREE.Vector3() }, uAncho: { value: 1 }, uAlto: { value: 1 }, uOp: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform sampler2D uMapa; uniform vec3 uO; uniform vec3 uEx; uniform vec3 uNw; uniform float uAncho; uniform float uAlto; uniform float uOp; varying vec3 vW;
      void main() {
        vec3 d = vW - uO; vec2 uv = vec2(dot(d, uEx) / uAncho + 0.5, dot(d, uNw) / uAlto + 0.5);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
        vec4 c = texture2D(uMapa, uv); if (c.a < 0.03) discard;
        gl_FragColor = vec4(c.rgb, c.a * uOp);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8
  });
  // (la «o» no se imprime: es el aro, que levita sobre lo existente; ver aroO)
  // existente: 'cortado' imprime sobre lo que queda después de la demolición y del corte del aro
  function ponImpresa(lay, existente) {
    const U = matImpresa.uniforms;
    if (U.uMapa.value && U.uMapa.value !== lay.tex) U.uMapa.value.dispose();
    U.uMapa.value = lay.tex; U.uO.value.copy(lay.c); U.uEx.value.copy(lay.ex); U.uNw.value.copy(lay.nw); U.uAncho.value = lay.ancho; U.uAlto.value = lay.alto;
    const clave = lay.caja.map(Math.round).join(',') + '|' + (existente || '');
    if (!fondoAro || fondoAro.userData.clave !== clave) {
      if (fondoAro) { fondoAro.children.forEach(o => o.geometry.dispose()); gH.remove(fondoAro); }
      const g = new THREE.Group(), k = lay.caja, m = 12;
      const piso = new Malla(); tapa(piso, api.rect(k[0] - m, k[1] - m, k[2] + m, k[3] + m), 0.25);
      const ed = new Malla();
      EDIF.forEach(e => { if (e.q.some(p => p[0] > k[0] - m && p[0] < k[2] + m && p[1] > k[1] - m && p[1] < k[3] + m)) prisma(ed, e.q, 0, e.h); });
      [piso, ed, existente === 'cortado' ? mallaNavesCortadas() : mallaExistente()].forEach(x => { if (!x.p.length) return; const o = new THREE.Mesh(x.geo(), matImpresa); o.renderOrder = 12; o.frustumCulled = false; g.add(o); });
      g.userData = { clave }; g.visible = false; gH.add(g);
      fondoAro = g;
    }
    return fondoAro;
  }
  function ponFondo(f, o) {
    const tok = ++fondoTok;
    const op = typeof f === 'object' && f ? f : { texto: f };
    const t = op.texto, blur = op.blur == null ? 7 : op.blur, clave = t + '|' + blur + '|' + (op.pos || '');
    const aroDe = fondoAro && fondoAro.visible ? matImpresa.uniforms.uOp.value : 0;
    if (!t || !o) {
      const de = matFondo.opacity;
      anima(700, k => { if (tok !== fondoTok) return; matFondo.opacity = de * (1 - k); matImpresa.uniforms.uOp.value = aroDe * (1 - k); },
        () => { if (tok === fondoTok) { fondo3D.visible = false; if (fondoAro) fondoAro.visible = false; } });
      return;
    }
    if (op.pos === 'aro') {
      const lay = op._diseno || disenoAro(t, o.az);
      fondo3D.visible = false; fondoTexto = null;
      const g = ponImpresa(lay, op.existente); g.visible = true;
      const meta = op.op == null ? 0.92 : op.op;
      anima(1600, k => { if (tok === fondoTok) { matImpresa.uniforms.uOp.value = aroDe + (meta - aroDe) * k; } });
      return;
    }
    matFondo.depthTest = true; fondo3D.renderOrder = 1;
    if (fondoAro) fondoAro.visible = false;
    if (fondoTexto !== clave) { if (matFondo.map) matFondo.map.dispose(); const tx = texturaFondo(t, blur); matFondo.map = tx.tex; matFondo.needsUpdate = true; fondo3D.userData.asp = tx.asp; fondoTexto = clave; }
    // marco de la cámara de la slide: arriba a la izquierda de la pantalla, sobre el piso
    const a = o.az * RAD, e = o.el * RAD, ASP = trabajo.clientWidth / Math.max(1, trabajo.clientHeight);
    const d = new THREE.Vector3(Math.sin(a) * Math.cos(e), -Math.sin(e), -Math.cos(a) * Math.cos(e));
    const r = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(r, d).normalize();
    let alto = o.h * (op.alto || 0.82), ancho = alto * fondo3D.userData.asp;
    const c = new THREE.Vector3(o.c[0], o.c[1], o.c[2]);
    if (op.pos === 'centro') {
      // al centro de lo que deja libre la tarjeta, sin pasarse del ancho
      const lado = Math.min(0.45, Math.max(0, (Math.min(360, trabajo.clientWidth - 64) + 64) / trabajo.clientWidth)), libre = o.h * ASP * 2 * (1 - lado) * 0.92;
      if (ancho > libre) { ancho = libre; alto = ancho / fondo3D.userData.asp; }
      c.addScaledVector(r, lado * o.h * ASP);
    } else c.addScaledVector(r, -o.h * ASP * 0.97 + ancho / 2).addScaledVector(up, o.h * 0.97 - alto / 2 * Math.sin(e));
    const t0 = -c.y / d.y; c.addScaledVector(d, t0); c.y = 0.35;   // al piso, a lo largo de la vista
    fondo3D.position.copy(c); fondo3D.scale.set(ancho, 1, alto); fondo3D.rotation.set(0, -a, 0);
    fondo3D.visible = true;
    const de = matFondo.opacity;
    const meta = op.op == null ? 0.26 : op.op;
    anima(1600, k => { if (tok === fondoTok) matFondo.opacity = de + (meta - de) * k; });
  }
  const capaRot = capa.querySelector('.hist-rotulos'), tarjeta = capa.querySelector('.hist-tarjeta'), cargaEl = capa.querySelector('.hist-carga');
  // el visor captura el puntero al arrastrar: en los botones y la tarjeta, el clic es de la presentación
  capa.addEventListener('pointerdown', ev => { if (ev.target.closest('.hist-nav, .hist-tarjeta')) ev.stopPropagation(); });
  capa.addEventListener('wheel', ev => { if (ev.target.closest('.hist-tarjeta')) ev.stopPropagation(); });
  capa.addEventListener('click', ev => {
    const b = ev.target.closest('[data-hist], [data-hist-ir]');
    if (!b) return;
    ev.stopPropagation();
    if (b.hasAttribute('data-hist-ir')) ir(+b.getAttribute('data-hist-ir'));
    else if (b.getAttribute('data-hist') === 'siguiente') siguiente(); else anterior();
  });
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CALCULADOS = {};   // cifras que salen del modelo, para la tarjeta: {puestos}, {mercadoKm}
  const conDatos = x => typeof x === 'string' ? x.replace(/\{(\w+)\}/g, (m, k) => CALCULADOS[k] != null ? CALCULADOS[k] : m) : x;
  function htmlTarjeta(s, i) {
    const t0 = s.tarjeta || {}, t = {};
    Object.keys(t0).forEach(k => { t[k] = Array.isArray(t0[k]) ? t0[k].map(c => c.map(conDatos)) : conDatos(t0[k]); });
    return '<p class="hist-kicker">' + esc(t.kicker) + '<span>' + String(i + 1).padStart(2, '0') + ' / ' + String(GUION.length).padStart(2, '0') + '</span></p>' +
      '<h2 class="hist-titulo">' + esc(t.titulo) + '</h2>' +
      (t.texto ? '<p class="hist-texto">' + esc(t.texto) + '</p>' : '') +
      (t.cifras && t.cifras.length ? '<dl class="hist-cifras">' + t.cifras.map(c => '<div><dd>' + esc(c[0]) + '</dd><dt>' + esc(c[1]) + (c[2] ? '<span>' + esc(c[2]) + '</span>' : '') + '</dt></div>').join('') + '</dl>' : '') +
      (t.leyenda ? '<ul class="hist-leyenda">' + t.leyenda.map(x => '<li><i style="background:' + esc(x[0]) + '"></i>' + esc(x[1]) + '</li>').join('') + '</ul>' : '') +
      (t.nota ? '<p class="hist-nota">' + esc(t.nota) + '</p>' : '') +
      (t.fuente ? '<p class="hist-fuente">' + esc(t.fuente) + '</p>' : '');
  }
  // dos figuras que se disparan: destello, bala y retroceso, en bucle (atlampa.css)
  const FIGURA = '<circle cx="16" cy="9" r="5.2"/><path stroke-width="7.5" d="M16 19v16"/><path stroke-width="4.2" d="M16 36l-6 24M16 36l6 24"/>' +
    '<path stroke-width="3.4" d="M16 21l-5 13M16 22l14-1"/><rect x="28" y="18.6" width="7" height="3.6"/>';
  const TIRO = '<svg class="hist-tiro" viewBox="0 0 112 64" aria-hidden="true">' +
    '<g class="hist-tiro-a">' + FIGURA + '</g><g transform="translate(112 0) scale(-1 1)"><g class="hist-tiro-b">' + FIGURA + '</g></g>' +
    '<circle class="hist-tiro-fa" cx="38" cy="20.4" r="4.2"/><circle class="hist-tiro-fb" cx="74" cy="20.4" r="4.2"/>' +
    '<path class="hist-tiro-ba" d="M39 20.4h6"/><path class="hist-tiro-bb" d="M73 20.4h-6"/></svg>';
  let tarjetaTok = 0;
  function muestraTarjeta(s, i) {
    const tok = ++tarjetaTok;
    tarjeta.innerHTML = htmlTarjeta(s, i);
    tarjeta.classList.remove('saliendo'); void tarjeta.offsetWidth; tarjeta.classList.add('entrando');
    setTimeout(() => { if (tok === tarjetaTok) tarjeta.classList.remove('entrando'); }, 1000);
  }
  function quitaTarjeta() {
    ++tarjetaTok;
    if (!tarjeta.innerHTML) return;
    tarjeta.classList.remove('entrando'); tarjeta.classList.add('saliendo');
    const tok = tarjetaTok;
    setTimeout(() => { if (tok === tarjetaTok) { tarjeta.innerHTML = ''; tarjeta.classList.remove('saliendo'); } }, 560);
  }
  // rótulos: posición en el mundo → pantalla en cada cuadro
  let ROT = [];
  function ponRotulos(lista, retrasoBase) {
    lista.forEach(r => {
      const el = document.createElement('div');
      el.className = 'hist-rotulo ' + (r.tipo || 'punto').split(' ').concat(r.lado ? [r.lado] : []).map(t => 'hist-rotulo--' + t).join(' ');
      el.style.setProperty('--tiro-fase', (-(ROT.length * 0.43) % 1.3).toFixed(2) + 's');
      if (r.color) el.style.setProperty('--c', r.color);
      el.innerHTML = (/balacera/.test(r.tipo || '') ? TIRO : '') + '<div class="t">' + (r.fecha ? '<b>' + esc(r.fecha) + '</b>' : '') + '<span>' + esc(r.texto) + '</span>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>';
      el.style.transitionDelay = ((retrasoBase || 0) + (r.retraso || 0)) + 'ms';
      capaRot.appendChild(el);
      const o = { el, p: V3(r.u, r.v, r.z || 0), dueño: r.dueño };
      ROT.push(o);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
    });
  }
  function quitaRotulos() {
    const viejos = ROT; ROT = [];
    viejos.forEach(o => { o.el.style.transitionDelay = '0ms'; o.el.classList.remove('visible'); setTimeout(() => o.el.remove(), 400); });
  }
  const tmp = new THREE.Vector3();
  api.alPintar(cam => {
    if (!activo) return;
    const w = trabajo.clientWidth, h = trabajo.clientHeight;
    // los tiradores, del alto de los civiles (un poco más: 1.2)
    const altoTiro = (pxPersona().px * 1.2 * 64 / 56).toFixed(1);
    if (altoTiro !== capaRot.dataset.tiro) { capaRot.dataset.tiro = altoTiro; capaRot.style.setProperty('--tiro-h', altoTiro + 'px'); }
    ROT.forEach(o => {
      tmp.copy(o.p).project(cam);
      const fuera = tmp.z > 1 || tmp.x < -1.2 || tmp.x > 1.2 || tmp.y < -1.2 || tmp.y > 1.2;
      o.el.style.display = fuera ? 'none' : '';
      if (!fuera) o.el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - tmp.y) / 2 * h).toFixed(1) + 'px)';
    });
  });

  /* ---------- 5. Animaciones (un solo latido mientras el modo está activo) ---------- */
  const suave = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let tweens = [];
  function anima(dur, f, fin, retraso) {
    const t = { t0: performance.now() + (retraso || 0), dur: quieto.matches ? 1 : dur, f, fin };
    tweens.push(t); arranca();
    return t;
  }
  let activo = false, corre = false, avisos = {}, volando = false;
  const DC = api.dib, dibAntes = {};
  let revelado = 0, marcaK = {}, capasAct = {};   // revelado: 0…1 del dibujo de la colonia; marcaK: id → 0…1
  function aplicaRevelado(x) {
    revelado = x;
    const lin = Math.max(0, Math.min(1, (x - 0.02) / 0.6)), rel = Math.max(0, Math.min(1, (x - 0.3) / 0.7));
    if (DC) { DC.uDib.value.x = lin; DC.uDib.value.y = rel; }
    matLim.opacity = 0.85 * Math.max(0, (x - 0.55) / 0.45);
    matVelo.opacity = 0.5 * Math.max(0, (x - 0.6) / 0.4);
    opCarros.value = Math.max(0, (x - 0.75) / 0.25);
    gAut.visible = gPer.visible = x > 0.75 && capasAct.coches !== false;
    // lo que se demuele y lo que corta el aro se dibujan con la colonia mientras no se borran
    if (!(marcaK.demolicion > 0)) canalSinc(CANAL.dem);
    if (!(marcaK.corteAro > 0)) canalSinc(CANAL.cor);
  }
  function aplicaMarca(id, k) {
    const M = MARCA[id]; if (!M) return;
    marcaK[id] = k;
    M.g.visible = k > 0.001;
    if (M.aplica) M.aplica(Math.max(0, Math.min(1, k)));
    M.piezas.forEach(p => {
      const kk = Math.max(0, Math.min(1, k));
      p.mats.forEach(([m, op]) => { m.opacity = op * kk; });
      if (p.crece) p.obj.scale.set(1, Math.max(0.001, kk), 1);
      if (p.traza && kk < 1) p.traza.g.setDrawRange(0, Infinity);
    });
  }
  // las marcas con aplica(k): de donde vayan a donde se pide, cancelando la animación que tuvieran
  function animaMarca(id, meta, dur, retraso) {
    const M = MARCA[id];
    if (M.tw) { tweens = tweens.filter(t => t !== M.tw); M.tw = null; }
    const de = marcaK[id] || 0;
    if (de === meta) return;
    aplicaMarca(id, de);
    M.tw = anima(dur * Math.abs(meta - de), (k, l) => aplicaMarca(id, de + (meta - de) * l), () => { M.tw = null; }, retraso || 0);
  }
  function latido(ms) {
    if (!activo) { corre = false; return; }
    const ahora = performance.now();
    tweens = tweens.filter(t => {
      if (ahora < t.t0) return true;
      const k = Math.min(1, (ahora - t.t0) / t.dur);
      t.f(suave(k), k);
      if (k >= 1) { if (t.fin) t.fin(); return false; }
      return true;
    });
    if (gAut.visible && !quieto.matches) mueveCarros(ms);
    if (gPer.visible && !quieto.matches) caminan(ms);
    Object.keys(MARCA).forEach(id => { if (MARCA[id].g.visible) MARCA[id].latido(ms, marcaK[id] || 0); });
    focoPaso();
    if (volando && avisos.mueve) avisos.mueve();
    pide();
    requestAnimationFrame(latido);
  }
  function arranca() { if (activo && !corre) { corre = true; requestAnimationFrame(latido); } }

  /* ---------- 6. Armado (en tandas, la primera vez) ---------- */
  let listo = false, armando = null;
  function arma() {
    if (listo) return Promise.resolve();
    if (armando) return armando;
    armando = new Promise(ok => {
      const tandas = [armaSuelo, armaCalles, armaExistente, armaLimite];
      for (let i = 0; i < EDIF.length; i += 120) { const a = i; tandas.push(() => armaEdificios(a, a + 120)); }
      tandas.push(armaAsentamientos, armaBalaceras, armaCultura, armaVerdes, armaEspuela, armaCircuitoProyecto, armaCircuitoAtlampa, armaMercado,
        armaDemolicion, armaCorteAro, armaAroO, armaAroReal, armaCulturaVolumen, armaCulturaCompleta, armaComercio, armaIndustria, armaVivienda,
        () => { mueveCarros(performance.now()); caminan(performance.now()); });
      (function sigue() {
        tandas.shift()();
        if (tandas.length) { requestAnimationFrame(sigue); return; }
        aplicaEstilo();
        listo = true; ok();
      })();
    });
    return armando;
  }

  /* ---------- 7. Cámara de cada slide ---------- */
  function objetivo(cs, conTarjeta) {
    const az = cs.az === 'norte' || cs.az == null ? AZ_NORTE : cs.az, el = cs.el == null ? 60 : cs.el;
    // una vista fija (calibrada contra una captura): centro [u, v, z] y h (la mitad del alto visible, en m)
    if (cs.centro) { const p = V3(...cs.centro); return { c: [p.x, p.y, p.z], h: cs.h, az, el }; }
    const k = cs.encuadre === 'colonia' || !cs.encuadre ? CAJA_LIM : cs.encuadre;
    const a = az * RAD, e = el * RAD;
    const d = new THREE.Vector3(Math.sin(a) * Math.cos(e), -Math.sin(e), -Math.cos(a) * Math.cos(e));
    const r = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(r, d).normalize();
    const c0 = V3((k[0] + k[2]) / 2, (k[1] + k[3]) / 2, 0);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    [k[0], k[2]].forEach(u => [k[1], k[3]].forEach(v => [0, 18].forEach(z => {
      const p = V3(u, v, z).sub(c0), px = p.dot(r), py = p.dot(up);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    })));
    // la tarjeta tapa su ancho real (360 px más márgenes): en pantallas angostas, proporcionalmente más;
    // una slide sin tarjeta se centra en toda la pantalla
    const Wt = trabajo.clientWidth, gut = Math.max(16, Math.min(40, Wt * 0.03)), ancho = Math.min(360, Wt - 2 * gut);
    const ASP = Wt / Math.max(1, trabajo.clientHeight);
    // sin tarjeta, lado sólo fija el acercamiento (el mismo que con ella) y lo encuadrado queda al centro
    const lado = conTarjeta === false ? (cs.lado || 0) : Math.min(0.45, Math.max(cs.lado || 0, (ancho + 2 * gut) / Wt));
    const h = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / (ASP * (1 - lado))) * (cs.aire || 1.1);
    const c = c0.add(r.clone().multiplyScalar((x0 + x1) / 2)).add(up.clone().multiplyScalar((y0 + y1) / 2));
    if (conTarjeta !== false) c.addScaledVector(r, -lado * h * ASP);   // lo encuadrado, centrado a la derecha de la tarjeta
    return { c: [c.x, c.y, c.z], h, az, el };
  }

  /* ---------- 8. Slides ---------- */
  let idx = -1, irTok = 0;
  function ir(n) {
    if (!activo) return estado();
    n = Math.max(0, Math.min(GUION.length - 1, n));
    const s = GUION[n], tok = ++irTok, mismo = n === idx;
    idx = n;
    [].forEach.call(capa.querySelectorAll('[data-hist-ir]'), b => b.setAttribute('aria-current', String(+b.getAttribute('data-hist-ir') === n)));
    [].forEach.call(capa.querySelectorAll('.hist-nav-lista li[data-etapa]'), li => li.classList.toggle('en-etapa', +li.getAttribute('data-etapa') === etapaDe(n)));
    // si los nombres no caben a la izquierda de la brújula, sólo la slide actual lleva el suyo
    const nav = capa.querySelector('.hist-nav'), hud = document.querySelector('.hud-camara');
    if (nav) {
      nav.classList.remove('compacta');
      const r = nav.getBoundingClientRect(), h = hud ? hud.getBoundingClientRect() : null, lim = h && h.width > 0 ? h.left - 12 : innerWidth - 12;
      if (r.left < 8 || r.right > lim) nav.classList.add('compacta');
    }
    arma().then(() => {
      if (tok !== irTok || !activo) return;
      cargaEl.hidden = true;
      const cs = Object.assign({ dur: 2400 }, s.camara || {}), dur = quieto.matches ? 1 : cs.dur;
      // lo que sale
      if (!mismo) { quitaTarjeta(); quitaRotulos(); }
      Object.keys(MARCA).forEach(id => {
        const M = MARCA[id];
        if ((s.marcas || []).includes(id)) return;
        if (M.aplica) { if (M.tw || marcaK[id] > 0) animaMarca(id, 0, M.durSale || 800); return; }   // se deshace al revés
        if (!(marcaK[id] > 0)) return;
        const de = marcaK[id]; anima(450, k => aplicaMarca(id, de * (1 - k)));
      });
      // la colonia se dibuja desde el predio hacia afuera mientras la cámara se aleja
      const capas = s.capas || {};
      capasAct = capas; gLim.visible = capas.limite !== false;
      if (capas.colonia !== false) {
        gCol.visible = true; sitioVisor(true);
        if (revelado < 1) { const de = revelado; anima(dur * 0.95, (k, l) => aplicaRevelado(de + (1 - de) * l)); } else aplicaRevelado(revelado);
      } else if (revelado > 0) {
        const de = revelado;
        anima(dur * 0.7, (k, l) => aplicaRevelado(de * (1 - l)), () => { if (tok === irTok) { gCol.visible = false; sitioVisor(false); } });
      } else { gCol.visible = false; sitioVisor(false); aplicaRevelado(0); }
      // vuelo
      volando = true;
      if (s.fondo && s.fondo.pos === 'aro') {
        s.fondo._diseno = disenoAro(s.fondo.texto, s.fondo.az == null || s.fondo.az === 'norte' ? AZ_NORTE : s.fondo.az);   // la palabra, a lo largo de las calles (norte arriba), aunque la cámara gire
        if (cs.encuadre === 'fondo') { const k = s.fondo._diseno.caja, m = 30; cs.encuadre = [k[0] - m, k[1] - m, k[2] + m, k[3] + m]; }
      }
      const obj = objetivo(cs, !!s.tarjeta);
      ponFondo(s.fondo, obj);
      ponAro(s.aro, 0);
      api.camaraA(obj, dur, () => {
        if (tok !== irTok) return;
        volando = false;
        if (avisos.fin) avisos.fin();
      });
      if (!mismo && s.tarjeta) setTimeout(() => { if (tok === irTok && activo) muestraTarjeta(s, n); }, Math.min(900, dur * 0.45));
      // lo que entra, al llegar
      setTimeout(() => {
        if (tok !== irTok || !activo) return;
        if (!mismo) {
          ponRotulos(s.rotulos || [], 0);
          (s.marcas || []).forEach(id => {
            const M = MARCA[id]; if (!M || (s.rotulosDe && !s.rotulosDe.includes(id))) return;
            // compacto: de las marcas sólo quedan las figuras (los tiradores), sin texto
            ponRotulos(s.compacto ? M.rotulos.filter(x => /balacera/.test(x.tipo || '')).map(x => Object.assign({}, x, { texto: '', sub: '', fecha: '' })) : M.rotulos, 0);
          });
        }
        (s.marcas || []).forEach(id => {
          const M = MARCA[id]; if (!M) return;
          if (marcaK[id] >= 1) return;
          if (M.aplica) { animaMarca(id, 1, M.dur || 2000, (s.retrasos && s.retrasos[id]) || M.retraso || 0); return; }
          M.g.visible = true;
          if (M.entra) M.entra();
          M.piezas.forEach(p => {
            if (p.traza) { p.traza.g.setDrawRange(0, 0); p.mats.forEach(([m, op]) => { m.opacity = op; }); }
            else p.mats.forEach(([m]) => { m.opacity = 0; });
            anima(p.dur || 900, (k, l) => {
              if (p.traza) p.traza.g.setDrawRange(0, Math.ceil(p.traza.n * l / 3) * 3);
              else p.mats.forEach(([m, op]) => { m.opacity = op * k; });
              if (p.crece) p.obj.scale.set(1, Math.max(0.001, k), 1);
            }, null, p.retraso || 0);
          });
          marcaK[id] = 1;
        });
      }, mismo ? 0 : dur * 0.8);
    });
    return estado();
  }
  function siguiente() { return ir(idx < 0 ? 0 : idx + 1); }
  function anterior() { return ir(Math.max(0, idx - 1)); }
  function estado() { return { slide: idx, total: GUION.length, id: idx >= 0 ? GUION[idx].id : null, titulo: idx >= 0 ? GUION[idx].titulo : null, listo, volando }; }

  /* ---------- 9. Entrar / salir ---------- */
  // lo del visor que se queda en la etapa 1: el sitio (calles y banquetas), su arbolado y los nombres
  const VISOR_SITIO = ['sitio', 'arboles-banqueta', 'postes-banqueta', 'nombres'], NO_TOCAR = new Set(['historia', 'contexto', 'flujos'].concat(VISOR_SITIO));
  let visAntes = null;
  function sitioVisor(si) { if (visAntes) visAntes.forEach(([o, v]) => { if (VISOR_SITIO.includes(o.name)) o.visible = si && v; }); }
  let camAntes = null;
  function entra(av) {
    if (activo) return estado();
    avisos = av || {};
    activo = true;
    camAntes = api.camaraEstado();
    visAntes = raizG.children.map(o => [o, o.visible]);
    raizG.children.forEach(o => { if (!NO_TOCAR.has(o.name)) o.visible = false; });
    capasAct = {};
    if (DC) {
      dibAntes.uDib = DC.uDib.value.clone(); dibAntes.uDibO = DC.uDibO.value.clone(); dibAntes.uDibV = DC.uDibV.value.clone();
      const rmax = Math.max(...[[EXT.u0, EXT.v0], [EXT.u1, EXT.v0], [EXT.u0, EXT.v1], [EXT.u1, EXT.v1]].map(q => Math.hypot(q[0] - CEN[0], q[1] - CEN[1])));
      DC.uDib.value.set(0, 0, 1, 0); DC.uDibO.value.set(0, 0, 0); DC.uDibV.value.set(45, rmax, 0);
    }
    revelado = 0; aplicaRevelado(0);
    Object.keys(MARCA).forEach(id => aplicaMarca(id, 0));
    gH.visible = true;
    capa.hidden = false; document.body.classList.add('hist-activo');
    cargaEl.hidden = listo;
    idx = -1;
    arranca();
    ir(0);
    return estado();
  }
  function sale(av) {
    if (!activo) return;
    ++irTok; tweens = []; volando = false;
    quitaTarjeta(); quitaRotulos(); ponFondo(null); fondo3D.visible = false; matFondo.opacity = 0; aroTw = null; aplicaAro({ op: 0, sube: 0 });
    activo = false;
    focoK = 0; focoSuelta();
    gH.visible = false; capa.hidden = true; document.body.classList.remove('hist-activo');
    if (visAntes) { visAntes.forEach(([o, v]) => { o.visible = v; }); visAntes = null; }
    Object.keys(MARCA).forEach(id => aplicaMarca(id, 0));
    if (DC && dibAntes.uDib) { DC.uDib.value.copy(dibAntes.uDib); DC.uDibO.value.copy(dibAntes.uDibO); DC.uDibV.value.copy(dibAntes.uDibV); }
    if (camAntes) api.camaraA(camAntes, quieto.matches ? 1 : 1400, () => { if (av && av.fin) av.fin(); });
    idx = -1;
    pide();
  }

  // se arma en ratos libres, para que la primera slide no espere
  if (window.requestIdleCallback) requestIdleCallback(() => arma(), { timeout: 4000 }); else setTimeout(arma, 800);
  return { entra, sale, ir, siguiente, anterior, estado, total: GUION.length,
    depura: () => ({ marcaK: Object.assign({}, marcaK), focoK, focoUso, foco: focoLista ? focoLista.length : 0 }) };
}

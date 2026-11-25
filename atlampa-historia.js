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
  const guionMod = await import(conV('./atlampa-historia-guion.js'));
  const GUION = guionMod.default, MARCAS = guionMod.MARCAS;
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
  // El predio como está hoy (levantamiento de Luis, handoff/LEVANTAMIENTO_PREEXISTENCIA.md): las dos
  // naves orientales de Contexto.3dm, completas y con cubierta a dos aguas, y las masas occidentales
  // aproximadas desde Earth (MARCAS.existente). En la etapa 1 el proyecto no aparece.
  function mallaExistente() {
    const m = new Malla();
    G.NAVES.forEach(nv => {
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
    });
    ((MARCAS.existente && MARCAS.existente.masas) || []).forEach(x => prisma(m, api.rect(...x.planta), 0, x.alto));
    return m;
  }
  function armaExistente() {
    const piso = new Malla(); tapa(piso, api.rect(G.PB.u0, G.PB.v0, G.PB.u1, G.PB.v1), 0.02);
    pon(gCol, piso, 'ctxsuelo', null, false);
    pon(gCol, mallaExistente(), 'ctxpredio', null, 25);
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
      const w = W(u + du / n, v + dv / n, 0), o = W(u, v, 0.25);
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

  /* ---------- 4. HTML: tarjeta, rótulos, navegación ---------- */
  const capa = document.createElement('div'); capa.className = 'hist-capa'; capa.hidden = true;
  capa.innerHTML = '<div class="hist-rotulos"></div><aside class="hist-tarjeta" aria-live="polite"></aside>' +
    '<nav class="hist-nav" aria-label="Slides de la presentación"><button type="button" class="hist-nav-flecha" data-hist="anterior" aria-label="Slide anterior">‹ Anterior</button>' +
    '<ol class="hist-nav-lista">' + GUION.map((s, i) => '<li><button type="button" data-hist-ir="' + i + '" title="' + s.titulo + '"><span>' + String(i + 1).padStart(2, '0') + '</span><i class="tt"> ' + s.titulo + '</i></button></li>').join('') + '</ol>' +
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
  // la «o»: el aro, levitando un poco sobre lo existente del predio (no se imprime)
  const matO = new THREE.MeshBasicMaterial({ color: CIRCUITO, transparent: true, opacity: 0, side: THREE.DoubleSide });
  function ponImpresa(lay) {
    const U = matImpresa.uniforms;
    if (U.uMapa.value && U.uMapa.value !== lay.tex) U.uMapa.value.dispose();
    U.uMapa.value = lay.tex; U.uO.value.copy(lay.c); U.uEx.value.copy(lay.ex); U.uNw.value.copy(lay.nw); U.uAncho.value = lay.ancho; U.uAlto.value = lay.alto;
    const clave = lay.caja.map(Math.round).join(',');
    if (!fondoAro || fondoAro.userData.clave !== clave) {
      if (fondoAro) { fondoAro.children.forEach(o => o.geometry.dispose()); gH.remove(fondoAro); }
      const g = new THREE.Group(), k = lay.caja, m = 12;
      const piso = new Malla(); tapa(piso, api.rect(k[0] - m, k[1] - m, k[2] + m, k[3] + m), 0.25);
      const ed = new Malla();
      EDIF.forEach(e => { if (e.q.some(p => p[0] > k[0] - m && p[0] < k[2] + m && p[1] > k[1] - m && p[1] < k[3] + m)) prisma(ed, e.q, 0, e.h); });
      [piso, ed, mallaExistente()].forEach(x => { if (!x.p.length) return; const o = new THREE.Mesh(x.geo(), matImpresa); o.renderOrder = 12; o.frustumCulled = false; g.add(o); });
      const A = G.ANILLO, rm = A.re - lay.grosor / 2, circulo = [];
      for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2; circulo.push([A.u + rm * Math.cos(t), A.v + rm * Math.sin(t)]); }
      const alto = Math.max(...G.NAVES.map(n => n.cumbre), ...((MARCAS.existente && MARCAS.existente.masas) || []).map(x => x.alto)) + 4;
      const aro = new THREE.Mesh(cinta(circulo, lay.grosor, alto), matO); aro.renderOrder = 13; g.add(aro);
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
      anima(700, k => { if (tok !== fondoTok) return; matFondo.opacity = de * (1 - k); matImpresa.uniforms.uOp.value = aroDe * (1 - k); matO.opacity *= (1 - k); },
        () => { if (tok === fondoTok) { fondo3D.visible = false; if (fondoAro) fondoAro.visible = false; } });
      return;
    }
    if (op.pos === 'aro') {
      const lay = op._diseno || disenoAro(t, o.az);
      fondo3D.visible = false; fondoTexto = null;
      const g = ponImpresa(lay); g.visible = true;
      const meta = op.op == null ? 0.92 : op.op;
      anima(1600, k => { if (tok === fondoTok) { matImpresa.uniforms.uOp.value = aroDe + (meta - aroDe) * k; matO.opacity = Math.min(1, matImpresa.uniforms.uOp.value / meta) * 0.95; } });
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
  }
  function aplicaMarca(id, k) {
    const M = MARCA[id]; if (!M) return;
    marcaK[id] = k;
    M.g.visible = k > 0.001;
    M.piezas.forEach(p => {
      const kk = Math.max(0, Math.min(1, k));
      p.mats.forEach(([m, op]) => { m.opacity = op * kk; });
      if (p.crece) p.obj.scale.set(1, Math.max(0.001, kk), 1);
      if (p.traza && kk < 1) p.traza.g.setDrawRange(0, Infinity);
    });
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
  function objetivo(cs) {
    const az = cs.az === 'norte' || cs.az == null ? AZ_NORTE : cs.az, el = cs.el == null ? 60 : cs.el;
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
    // la tarjeta tapa su ancho real (360 px más márgenes): en pantallas angostas, proporcionalmente más
    const Wt = trabajo.clientWidth, gut = Math.max(16, Math.min(40, Wt * 0.03)), ancho = Math.min(360, Wt - 2 * gut);
    const ASP = Wt / Math.max(1, trabajo.clientHeight), lado = Math.min(0.45, Math.max(cs.lado || 0, (ancho + 2 * gut) / Wt));
    const h = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / (ASP * (1 - lado))) * (cs.aire || 1.1);
    const c = c0.add(r.clone().multiplyScalar((x0 + x1) / 2)).add(up.clone().multiplyScalar((y0 + y1) / 2));
    c.addScaledVector(r, -lado * h * ASP);   // lo encuadrado, centrado a la derecha de la tarjeta
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
    arma().then(() => {
      if (tok !== irTok || !activo) return;
      cargaEl.hidden = true;
      const cs = Object.assign({ dur: 2400 }, s.camara || {}), dur = quieto.matches ? 1 : cs.dur;
      // lo que sale
      if (!mismo) { quitaTarjeta(); quitaRotulos(); }
      Object.keys(MARCA).forEach(id => {
        if ((s.marcas || []).includes(id) || !(marcaK[id] > 0)) return;
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
        s.fondo._diseno = disenoAro(s.fondo.texto, cs.az === 'norte' || cs.az == null ? AZ_NORTE : cs.az);
        if (cs.encuadre === 'fondo') { const k = s.fondo._diseno.caja, m = 30; cs.encuadre = [k[0] - m, k[1] - m, k[2] + m, k[3] + m]; }
      }
      const obj = objetivo(cs);
      ponFondo(s.fondo, obj);
      api.camaraA(obj, dur, () => {
        if (tok !== irTok) return;
        volando = false;
        if (avisos.fin) avisos.fin();
      });
      if (!mismo) setTimeout(() => { if (tok === irTok && activo) muestraTarjeta(s, n); }, Math.min(900, dur * 0.45));
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
    quitaTarjeta(); quitaRotulos(); ponFondo(null); fondo3D.visible = false; matFondo.opacity = 0;
    activo = false;
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
  return { entra, sale, ir, siguiente, anterior, estado, total: GUION.length };
}

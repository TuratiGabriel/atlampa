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
const AMARILLO = 0xf5c518, ROJO = 0xff3b30;

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
  function caminan(ms) {
    const t = ms / 1000;
    derecha.setFromMatrixColumn(api.camara().matrixWorld, 0);
    // tamaño: PX_PERSONA en pantalla de lejos, el real de cerca
    const { mpp, px } = pxPersona(), k = Math.max(1, px * mpp / FIG.alto);
    if (Math.abs(k - (caminan.k || 0)) > 0.01) {
      caminan.k = k;
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

  /* ---------- 4. HTML: tarjeta, rótulos, navegación ---------- */
  const capa = document.createElement('div'); capa.className = 'hist-capa'; capa.hidden = true;
  capa.innerHTML = '<div class="hist-rotulos"></div><aside class="hist-tarjeta" aria-live="polite"></aside>' +
    '<nav class="hist-nav" aria-label="Slides de la presentación"><button type="button" class="hist-nav-flecha" data-hist="anterior" aria-label="Slide anterior">‹ Anterior</button>' +
    '<ol class="hist-nav-lista">' + GUION.map((s, i) => '<li><button type="button" data-hist-ir="' + i + '"><span>' + String(i + 1).padStart(2, '0') + '</span> ' + s.titulo + '</button></li>').join('') + '</ol>' +
    '<button type="button" class="hist-nav-flecha hist-nav-sigue" data-hist="siguiente" aria-label="Slide siguiente">Siguiente ›</button></nav>' +
    '<div class="hist-carga" role="status">Armando Atlampa…</div>';
  trabajo.appendChild(capa);
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
  function htmlTarjeta(s, i) {
    const t = s.tarjeta || {};
    return '<p class="hist-kicker">' + esc(t.kicker) + '<span>' + String(i + 1).padStart(2, '0') + ' / ' + String(GUION.length).padStart(2, '0') + '</span></p>' +
      '<h2 class="hist-titulo">' + esc(t.titulo) + '</h2>' +
      (t.texto ? '<p class="hist-texto">' + esc(t.texto) + '</p>' : '') +
      (t.cifras && t.cifras.length ? '<dl class="hist-cifras">' + t.cifras.map(c => '<div><dd>' + esc(c[0]) + '</dd><dt>' + esc(c[1]) + (c[2] ? '<span>' + esc(c[2]) + '</span>' : '') + '</dt></div>').join('') + '</dl>' : '') +
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
  let revelado = 0, marcaK = {};   // revelado: 0…1 del dibujo de la colonia; marcaK: id → 0…1
  function aplicaRevelado(x) {
    revelado = x;
    const lin = Math.max(0, Math.min(1, (x - 0.02) / 0.6)), rel = Math.max(0, Math.min(1, (x - 0.3) / 0.7));
    if (DC) { DC.uDib.value.x = lin; DC.uDib.value.y = rel; }
    matLim.opacity = 0.85 * Math.max(0, (x - 0.55) / 0.45);
    matVelo.opacity = 0.5 * Math.max(0, (x - 0.6) / 0.4);
    opCarros.value = Math.max(0, (x - 0.75) / 0.25);
    gAut.visible = x > 0.75; gPer.visible = x > 0.75;
  }
  function aplicaMarca(id, k) {
    const M = MARCA[id]; if (!M) return;
    marcaK[id] = k;
    M.g.visible = k > 0.001;
    M.piezas.forEach(p => {
      const kk = Math.max(0, Math.min(1, k));
      p.mats.forEach(([m, op]) => { m.opacity = op * kk; });
      if (p.crece) p.obj.scale.set(1, Math.max(0.001, kk), 1);
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
      const tandas = [armaSuelo, armaCalles, armaLimite];
      for (let i = 0; i < EDIF.length; i += 120) { const a = i; tandas.push(() => armaEdificios(a, a + 120)); }
      tandas.push(armaAsentamientos, armaBalaceras, () => { mueveCarros(performance.now()); caminan(performance.now()); });
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
      gCol.visible = capas.colonia !== false; gLim.visible = capas.limite !== false;
      if (capas.colonia !== false && revelado < 1) { const de = revelado; anima(dur * 0.95, (k, l) => aplicaRevelado(de + (1 - de) * l)); }
      // vuelo
      volando = true;
      api.camaraA(objetivo(cs), dur, () => {
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
          (s.marcas || []).forEach(id => { const M = MARCA[id]; if (M) ponRotulos(M.rotulos, 0); });
        }
        (s.marcas || []).forEach(id => {
          const M = MARCA[id]; if (!M) return;
          if (marcaK[id] >= 1) return;
          M.g.visible = true;
          M.piezas.forEach(p => anima(900, k => {
            p.mats.forEach(([m, op]) => { m.opacity = op * k; });
            if (p.crece) p.obj.scale.set(1, Math.max(0.001, k), 1);
          }, null, p.retraso || 0));
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
  let camAntes = null;
  function entra(av) {
    if (activo) return estado();
    avisos = av || {};
    activo = true;
    camAntes = api.camaraEstado();
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
    quitaTarjeta(); quitaRotulos();
    activo = false;
    gH.visible = false; capa.hidden = true; document.body.classList.remove('hist-activo');
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

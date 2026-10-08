/* ============================================================
   ATLAMPA — extras del motor 3D (fase 2)
   Contexto urbano, árboles de banqueta y postes, flujos (flechas y carros)
   y rótulos de calles. Interfaz: ver «extras» en atlampa-3d.js.

   Todo lo estático va fusionado (una malla / unas LineSegments por tipo);
   los carros son UNA InstancedMesh y sólo se mueven sus matrices.
   Contenido: el que tenía el motor SVG (ya retirado); el método, otro.
   ============================================================ */
export function crea(api) {
  const { THREE, G, W, rect, Malla, Lineas, tapa, prisma, pieza, pon, ponLineas, material, raizG, trabajo, capas, pide, aplicaEstilo, ESTILOS, GENERAL } = api;
  const D = G.D, { PB, GU, GF, S, HE, CEN, ESPUELA } = G;
  const pares = (a, desde) => { const r = []; for (let i = desde || 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };

  /* ---------- Estilos: papeles y líneas nuevos ----------
     El contexto es referencia: contorno tenue, rayado casi nulo. */
  Object.assign(ESTILOS.rayado.papel, {
    contexto: { tono: 0.035, paso: 3.2, arista: 0.3 },
    ctxsuelo: { tono: 0.1, paso: 3, arista: 0.12 },
    carro: { tono: 0.3, paso: 2.2, arista: 0 }
  });
  Object.assign(ESTILOS.plano.papel, {
    contexto: { gris: 0.035, arista: 0.26 },
    ctxsuelo: { gris: 0.03, arista: 0.1 },
    carro: { gris: 0.14, arista: 0 }
  });
  Object.assign(ESTILOS.rayado.lineas, { ctxresalta: 0.9, ctxcalle: 0.22, ctxavenida: 0.32, ctxtren: 0.3, flecha: 0.5, poste: 0.5 });
  Object.assign(ESTILOS.plano.lineas, { ctxresalta: 0.85, ctxcalle: 0.2, ctxavenida: 0.3, ctxtren: 0.28, flecha: 0.45, poste: 0.45 });

  /* ---------- Geometría ---------- */
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
  // vías: dos rieles (a ±e del eje) y durmientes de ancho w cada paso
  function via(l, pts, z, e, w, paso) {
    let s = paso / 2;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const du = (b[0] - a[0]) / L, dv = (b[1] - a[1]) / L, nu = -dv, nv = du;
      [-e, e].forEach(o => l.seg(W(a[0] + nu * o, a[1] + nv * o, z), W(b[0] + nu * o, b[1] + nv * o, z)));
      for (; s < L; s += paso) { const u = a[0] + du * s, v = a[1] + dv * s; l.seg(W(u - nu * w, v - nv * w, z), W(u + nu * w, v + nv * w, z)); }
      s -= L;
    }
  }

  /* ===== 1. Árboles de banqueta y postes (capa 'arboles') ===== */
  const gArb = pieza('arboles-banqueta', null, 0.3);
  {
    const Z = 0.15, AR = D.arboles || [], tr = new Lineas(), al = new Lineas();
    if (AR.length) {
      // tres portes, como los símbolos del SVG (9, 7.2 y 5.4 m): el árbol de croquis del motor (mira a la cámara)
      const bb = api.mallaAtlas(AR.length, api.matArbol), T = api.ARBOLES_TEX;
      AR.forEach((a, i) => {
        const H = a[2] > 3.6 ? 9 : a[2] > 2.4 ? 7.2 : 5.4, p = W(a[0], a[1], Z);
        bb.aPos.setXYZ(i, p[0], p[1], p[2]); bb.aEsc.setXY(i, T.ancho * H, T.alto * H); bb.aTile.setX(i, i % 3); bb.aVolt.setX(i, (i % 2) ? 1 : -1);
        // alcorque
        const n = 10; for (let k = 0; k < n; k++) { const t0 = k / n * 2 * Math.PI, t1 = (k + 1) / n * 2 * Math.PI; al.seg(W(a[0] + Math.cos(t0) * 0.7, a[1] + Math.sin(t0) * 0.7, Z + 0.01), W(a[0] + Math.cos(t1) * 0.7, a[1] + Math.sin(t1) * 0.7, Z + 0.01)); }
      });
      gArb.add(bb.malla);
      ponLineas(gArb, al, 'sendero-alcorque', 0xffffff);
    }
    // postes de luz (8 m): fuste, brazo de 1.6 m hacia el arroyo y luminaria
    const po = new Lineas();
    (D.postes || []).forEach(a => {
      let hu = a[0] < PB.u0 ? -1 : a[0] > PB.u1 ? 1 : 0, hv = a[1] < PB.v0 ? -1 : a[1] > PB.v1 ? 1 : 0;
      const l = Math.hypot(hu, hv) || 1; hu /= l; hv /= l;
      const u1 = a[0] + hu * 1.6, v1 = a[1] + hv * 1.6;
      po.seg(W(a[0], a[1], Z), W(a[0], a[1], Z + 8));
      po.seg(W(a[0] - hu * 0.5, a[1] - hv * 0.5, Z + 7.6), W(u1, v1, Z + 7.6));
      po.seg(W(u1 - hv * 0.3, v1 + hu * 0.3, Z + 7.5), W(u1 + hv * 0.3, v1 - hu * 0.3, Z + 7.5));
      po.seg(W(u1, v1, Z + 7.6), W(u1, v1, Z + 7.45));
    });
    ponLineas(gArb, po, 'poste', 0xffffff);
  }

  /* ===== 2. Flujos: carriles (los del SVG) ===== */
  const CARRO_SITIO = 170, CARRO_CTX = 110, ESC_CTX = 1.6;   // m de calle por carro; los del contexto, más grandes
  const cf = (GU.o + GF.o) / 2, cs = (GU.e + GF.e) / 2, cc = (GU.s + GF.s) / 2, ce = (GU.n + GF.n) / 2, VH = (HE[0] + HE[1]) / 2;
  const TRAMOS_SITIO = [
    [[[cf, S.v0], [cf, VH]], [1.8], 0],               // Fresno al sur de Heliotropo: doble
    [[[cf, VH], [cf, S.v1]], [0], 1],                 // Fresno al norte: hacia el norte
    [[[cs, S.v1], [cs, S.v0]], [0], 1],               // Sabino: hacia el sur
    [[[S.u0, cc], [S.u1, cc]], [1.6], 0],             // Clavel: doble
    [[[S.u1, ce], [S.u0, ce]], [-3.6, 0, 3.6], 1]     // Eulalia Guzmán: al poniente, 3 carriles
  ];
  const CARRILES = [];
  function carril(pts, off, dir, ctx, semilla) {
    const acc = [0];
    for (let j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const L = acc[acc.length - 1];
    if (L < 12) return;
    const n = Math.max(1, Math.round(L / (ctx ? CARRO_CTX : CARRO_SITIO))), autos = [];
    for (let a = 0; a < n; a++) {
      let r = Math.sin(semilla * 12.9898 + (a + 1) * 78.233) * 43758.5453; r -= Math.floor(r);
      autos.push({ s0: (a + 0.4 * r) * L / n, vel: 6 + 4 * r });
    }
    CARRILES.push({ p: pts, acc, L, dir, off, autos, ctx });
  }
  TRAMOS_SITIO.forEach((t, i) => t[1].forEach((o, k) => { carril(t[0], o, 1, false, i * 7 + k + 1); if (!t[2]) carril(t[0], o, -1, false, i * 7 + k + 4); }));
  const MARGEN = { u0: S.u0 - 4, u1: S.u1 + 4, v0: S.v0 - 4, v1: S.v1 + 4 };
  if (GENERAL) (D.flujos || []).forEach((f, i) => fuera(pares(f[2]), MARGEN).forEach((t, k) => {
    if (f[1]) carril(t, 0, 1, true, 100 + i * 5 + k);
    else { carril(t, 2.4, 1, true, 100 + i * 5 + k); carril(t, 2.4, -1, true, 200 + i * 5 + k); }
  }));
  // [u, v, du, dv] a la distancia s del carril (con su sentido y desfase)
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

  const gFlu = new THREE.Group(); gFlu.name = 'flujos'; raizG.add(gFlu);
  // flechas en el piso (chevrones): las del sitio y las del contexto, aparte
  const flechas = { s: new Lineas(), c: new Lineas() };
  CARRILES.forEach(c => {
    const esc = c.ctx ? 2.6 : 1, paso = c.ctx ? 70 : 24, z = c.ctx ? 0.1 : 0.06, l = c.ctx ? flechas.c : flechas.s;
    for (let s = paso * 0.5; s < c.L - 3; s += paso) {
      const r = enCarril(c, s), du = r[2], dv = r[3], nu = -dv, nv = du, a = 1.4 * esc, b = 1.0 * esc;
      l.poli([W(r[0] - du * a + nu * b, r[1] - dv * a + nv * b, z), W(r[0] + du * a, r[1] + dv * a, z), W(r[0] - du * a - nu * b, r[1] - dv * a - nv * b, z)]);
    }
  });
  ponLineas(gFlu, flechas.s, 'flecha', 0xffffff);
  const flechasCtx = ponLineas(gFlu, flechas.c, 'flecha-ctx', 0xffffff);
  if (flechasCtx) flechasCtx.visible = false;
  // carros: caja y cabina, a lo largo de +x local (prisma de W: se quita CEN)
  const carro = new Malla(), L0 = (x0, y0, x1, y1) => rect(CEN[0] + x0, CEN[1] + y0, CEN[0] + x1, CEN[1] + y1);
  prisma(carro, L0(-2.1, -0.9, 2.1, 0.9), 0.3, 1.0);
  prisma(carro, L0(-1.3, -0.75, 0.8, 0.75), 1.0, 1.45);
  const autos = [];
  CARRILES.forEach(c => c.autos.forEach(au => autos.push([c, au])));   // los del sitio primero
  const nSitio = autos.filter(x => !x[0].ctx).length;
  const carros = new THREE.InstancedMesh(carro.geo(), material('carro'), Math.max(1, autos.length));
  carros.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  carros.frustumCulled = false;
  gFlu.add(carros);
  // sus aristas: las mismas instancias (posición, giro y escala por atributo)
  const NA = Math.max(1, autos.length), ar = new THREE.InstancedBufferGeometry();
  ar.setAttribute('position', new THREE.EdgesGeometry(carros.geometry, 25).getAttribute('position'));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3), aGiro = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3);
  aPos.setUsage(THREE.DynamicDrawUsage); aGiro.setUsage(THREE.DynamicDrawUsage);
  ar.setAttribute('iPos', aPos); ar.setAttribute('iGiro', aGiro);   // iGiro: cos, sen, escala
  const matAr = new THREE.ShaderMaterial({
    transparent: true,   // las del contexto, más tenues
    vertexShader: /* glsl */`attribute vec3 iPos; attribute vec3 iGiro;
      varying float vOp;
      void main() { vOp = iGiro.z > 1.0 ? 0.35 : 0.75; vec3 p = position * iGiro.z; p = vec3(p.x * iGiro.x + p.z * iGiro.y, p.y, -p.x * iGiro.y + p.z * iGiro.x);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + iPos, 1.0); }`,
    fragmentShader: /* glsl */`varying float vOp; void main() { gl_FragColor = vec4(vec3(1.0), vOp); }`
  });
  const carrosAr = new THREE.LineSegments(ar, matAr);
  carrosAr.frustumCulled = false;
  gFlu.add(carrosAr);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), E = new THREE.Vector3(1, 1, 1), EC = new THREE.Vector3(ESC_CTX, ESC_CTX, ESC_CTX), EJE = new THREE.Vector3(0, 1, 0);
  let ultimoMs = 0;
  function mueveCarros(ms) {
    ultimoMs = ms;
    const t = ms / 1000, n = ctxVisible ? autos.length : nSitio;
    for (let i = 0; i < n; i++) {
      const c = autos[i][0], au = autos[i][1], r = enCarril(c, au.s0 + au.vel * 1.6 * t), p = W(r[0], r[1], c.ctx ? 0 : 0.02), a = Math.atan2(r[3], r[2]), k = c.ctx ? ESC_CTX : 1;
      Q.setFromAxisAngle(EJE, a);
      M.compose(V.set(p[0], p[1], p[2]), Q, c.ctx ? EC : E);
      carros.setMatrixAt(i, M);
      aPos.setXYZ(i, p[0], p[1], p[2]); aGiro.setXYZ(i, Math.cos(a), Math.sin(a), k);
    }
    carros.count = n; ar.instanceCount = n;
    carros.instanceMatrix.needsUpdate = true; aPos.needsUpdate = true; aGiro.needsUpdate = true;
    pide();
  }

  /* ===== 3. Contexto urbano (sólo la general) ===== */
  let ctx = null, armando = null, ctxVisible = false, xAct = 0;
  const gCtx = new THREE.Group(); gCtx.name = 'contexto'; gCtx.visible = false; raizG.add(gCtx);
  const gCtxEd = new THREE.Group(); gCtx.add(gCtxEd);
  const R = D.rect;
  function armaSuelo() {
    // el suelo del bloque menos el del sitio (ese ya está)
    const m = new Malla();
    [rect(R.u0, R.v0, R.u1, S.v0), rect(R.u0, S.v1, R.u1, R.v1), rect(R.u0, S.v0, S.u0, S.v1), rect(S.u1, S.v0, R.u1, S.v1)].forEach(r => tapa(m, r, 0));
    pon(gCtx, m, 'ctxsuelo', null, false);
    const borde = new Lineas(); borde.poli(rect(R.u0, R.v0, R.u1, R.v1).map(q => W(q[0], q[1], 0.02)), true);
    ponLineas(gCtx, borde, 'ctxcalle-borde', 0xffffff);
    // calles: fuera del bloque del sitio (ahí están las del sitio)
    [['menor', 'ctxcalle'], ['mayor', 'ctxavenida']].forEach(tc => {
      const l = new Lineas();
      (D.calles[tc[0]] || []).forEach(f => fuera(pares(f), S).forEach(t => l.poli(t.map(q => W(q[0], q[1], 0.04)))));
      ponLineas(gCtx, l, tc[1], 0xffffff);
    });
    // tren: rieles y durmientes; la espuela fuera del sitio
    const tv = new Lineas();
    (D.calles.tren || []).forEach(f => fuera(pares(f), S).forEach(t => via(tv, t, 0.05, 0.72, 1.3, 4.8)));
    fuera(ESPUELA, S).forEach(t => via(tv, t, 0.05, 0.72, 1.3, 1.6));
    ponLineas(gCtx, tv, 'ctxtren', 0xffffff);
  }
  function armaEdificios() {
    const m = new Malla();
    D.edificios.forEach(f => prisma(m, pares(f, 1), 0, f[0]));
    pon(gCtxEd, m, 'contexto', null, 25);
  }
  function preparaContexto(listo) {
    if (!GENERAL) { if (listo) listo(); return; }
    if (ctx) { if (listo) listo(); return; }
    if (armando) { if (listo) armando.push(listo); return; }
    armando = listo ? [listo] : [];
    // en dos tandas (suelo y calles; edificios), para no trabar el cuadro
    requestAnimationFrame(() => {
      armaSuelo();
      requestAnimationFrame(() => {
        armaEdificios();
        ctx = true;
        aplicaEstilo();
        vista(xAct);
        const av = armando; armando = null; av.forEach(f => f());
      });
    });
  }
  // x: 0 sitio → 1 contexto. Se ve de 0.25 en adelante; los edificios crecen del piso
  function vista(x) {
    xAct = x;
    let o = ctx ? Math.max(0, Math.min(1, (x - 0.25) / 0.5)) : 0;
    o = o * o * (3 - 2 * o);
    const antes = ctxVisible;
    ctxVisible = o > 0;
    gCtx.visible = ctxVisible;
    gCtxEd.scale.y = Math.max(0.001, o);
    if (flechasCtx) flechasCtx.visible = ctxVisible;
    if (antes !== ctxVisible && capas.flujos) mueveCarros(ultimoMs || performance.now());
    if (!ctxVisible) alSalir();
    nombresFijos();
    pide();
  }

  /* ===== 4. Nombres de calles: texto tendido en el piso =====
     Un plano por nombre, con la textura del texto (recorte con alphaTest y alpha-to-coverage:
     nada se mezcla, nada transparente) y prueba de profundidad: lo que está delante lo tapa.
     Se orienta al pintar (onBeforeRender) para leerse siempre de izquierda a
     derecha; los del contexto, además, a un tamaño fijo en pantalla. */
  const gNom = new THREE.Group(); gNom.name = 'nombres'; raizG.add(gNom);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const FAM = () => css('--font-display') || 'sans-serif';
  const PLANO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const texturas = [];
  function textura(t, color) {
    const cv = document.createElement('canvas'), tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const r = { cv, tex, t, color, asp: 1 };
    dibuja(r); texturas.push(r);
    return r;
  }
  function dibuja(r) {
    const x = r.cv.getContext('2d'), f = '56px ' + FAM();
    x.font = f;
    const w = Math.ceil(x.measureText(r.t).width) + 24;
    r.cv.width = Math.max(4, w); r.cv.height = 84;
    x.font = f; x.fillStyle = x.strokeStyle = css(r.color) || '#9a9a9a'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.lineWidth = 3; x.lineJoin = 'round';   // un poco más grueso: chico, se sigue leyendo
    x.strokeText(r.t, r.cv.width / 2, 44); x.fillText(r.t, r.cv.width / 2, 44);
    r.asp = r.cv.width / r.cv.height;
    r.tex.dispose(); r.tex.needsUpdate = true;
  }
  // con la fuente propia: redibuja cuando cargue
  if (document.fonts && document.fonts.load) document.fonts.load('56px ' + FAM()).then(() => { texturas.forEach(dibuja); pide(); }, () => {});
  function materialTexto(tx) {
    return new THREE.MeshBasicMaterial({ map: tx.tex, alphaTest: 0.12, alphaToCoverage: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  const pv0 = new THREE.Vector3(), pv1 = new THREE.Vector3(), dd = new THREE.Vector3(), pr = new THREE.Vector3();
  /* nombre: o = { p (ancla), d (dirección de la calle, unitaria, en el piso),
     h (alto en m) y/o px (alto mínimo en pantalla), punta (va después de una
     punta, sobre el eje, hacia afuera del tramo: d apunta hacia adentro) } */
  function nombre(tx, o) {
    const me = new THREE.Mesh(PLANO, materialTexto(tx));
    me.frustumCulled = false; me.matrixAutoUpdate = false; me.userData = o; o.tx = tx;
    me.onBeforeRender = (r, sc, cam) => orienta(me, cam);
    gNom.add(me);
    return me;
  }
  function orienta(me, cam) {
    const o = me.userData, h = trabajo.clientHeight || 1;
    let hm = o.h || 0;
    if (o.px) {   // metros por pixel en el ancla; tendido, se acorta con la altura de la cámara
      const dist = cam.position.distanceTo(o.p);
      const mpp = cam.isPerspectiveCamera ? 2 * dist * Math.tan(cam.fov / 2 * Math.PI / 180) / h : (cam.top - cam.bottom) / cam.zoom / h;
      cam.getWorldDirection(pr);
      hm = Math.max(hm, o.px * mpp / Math.max(0.45, Math.abs(pr.y)));   // con h: el alto real, pero nunca menos de px
    }
    const w = hm * o.tx.asp;
    // que se lea de izquierda a derecha en pantalla
    pv0.copy(o.p).project(cam); pv1.copy(o.p).add(o.d).project(cam);
    dd.copy(o.d); if (pv1.x < pv0.x) dd.negate();
    me.position.copy(o.p);
    if (o.punta) me.position.addScaledVector(o.d, -(w / 2 + hm * 0.8));   // justo después de la punta, siguiendo la calle
    me.rotation.set(0, Math.atan2(-dd.z, dd.x), 0);
    me.scale.set(w, 1, hm);
    me.updateMatrix(); me.matrixWorld.multiplyMatrices(me.parent.matrixWorld, me.matrix);
    me.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, me.matrixWorld);
    me.normalMatrix.getNormalMatrix(me.modelViewMatrix);
  }
  // las cuatro calles del predio, al centro de su arroyo
  const um = (PB.u0 + PB.u1) / 2;
  const gSitioNom = [['Calle del Fresno', cf, 440, 0, 1], ['Calle Sabino', cs, 440, 0, 1], ['Calle Clavel', um - 25, cc, 1, 0], ['Av. Profra. Eulalia Guzmán', um, ce, 1, 0]].map(c =>
    nombre(textura(c[0], '--muted'), { p: new THREE.Vector3(...W(c[1], c[2], 0.07)), d: new THREE.Vector3(...W(CEN[0] + c[3], CEN[1] + c[4], 0)).normalize(), h: 2.4, px: 9 }));

  /* contexto: sin nombres fijos; sólo el de la calle bajo el cursor, y esa
     calle se resalta. El nombre va en las dos puntas del tramo resaltado,
     justo después de cada una (no encima del trazo resaltado). Calles con nombre: los ejes de OSM
     (D.flujos), fuera del bloque del sitio. */
  const CALLES = {};
  if (GENERAL) (D.flujos || []).forEach(f => fuera(pares(f[2]), S).forEach(t => {
    (CALLES[f[0]] = CALLES[f[0]] || { n: f[0], tramos: [] }).tramos.push(t.map(q => new THREE.Vector3(...W(q[0], q[1], 0.2))));
  }));
  const LCALLES = Object.values(CALLES);
  /* con Flujos se prenden todos: uno por calle, a la mitad de su tramo más largo */
  const gCalleNom = LCALLES.map(c => {
    let t = c.tramos[0], Lt = 0;
    c.tramos.forEach(x => { let L = 0; for (let i = 1; i < x.length; i++) L += x[i].distanceTo(x[i - 1]); if (L > Lt) { Lt = L; t = x; } });
    if (Lt < 40) return null;
    // el punto a la mitad del largo y la dirección del tramo ahí
    let s = Lt / 2, i = 1;
    for (; i < t.length - 1; i++) { const d = t[i].distanceTo(t[i - 1]); if (s <= d) break; s -= d; }
    const a = t[i - 1], b = t[i], f = Math.min(1, s / (b.distanceTo(a) || 1));
    const me = nombre(textura(c.n, '--muted'), { p: a.clone().lerp(b, f), d: b.clone().sub(a).setY(0).normalize(), px: 10 });
    me.visible = false;
    return me;
  }).filter(Boolean);
  // los del sitio: sin contexto, siempre; con el contexto, sólo con Flujos (si no, el de la calle bajo el cursor)
  function nombresFijos() {
    gSitioNom.forEach(me => { me.visible = !ctxVisible || !!capas.flujos; });
    gCalleNom.forEach(me => { me.visible = ctxVisible && !!capas.flujos; });
  }
  const txHover = textura(' ', '--fg');
  const puntas = [0, 1].map(() => { const me = nombre(txHover, { p: new THREE.Vector3(), d: new THREE.Vector3(1, 0, 0), px: 12, punta: true }); me.visible = false; return me; });
  let hover = null, tramoH = null, resalte = null;
  const gRes = new THREE.Group(); gCtx.add(gRes);
  api.linea('ctxresalta', 0xffffff);   // de una vez: aplicaEstilo le pone su opacidad
  function resalta(c) {
    if (resalte) { gRes.remove(resalte); resalte.geometry.dispose(); resalte = null; }
    if (!c) return;
    // el eje y dos paralelas a ±1.2 m: un trazo más grueso (WebGL no engruesa líneas)
    const l = new Lineas();
    c.tramos.forEach(t => [-1.2, 0, 1.2].forEach(o => {
      for (let i = 1; i < t.length; i++) {
        const a = t[i - 1], b = t[i], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L * o, nz = dx / L * o;
        l.seg([a.x + nx, 0.12, a.z + nz], [b.x + nx, 0.12, b.z + nz]);
      }
    }));
    resalte = ponLineas(gRes, l, 'ctxresalta', 0xffffff);
  }
  const q0 = new THREE.Vector3(), q1 = new THREE.Vector3();
  function bajoCursor(ev) {
    if (!ctxVisible || ev.buttons) return null;
    const cam = api.camara(), rc = trabajo.getBoundingClientRect(), w = rc.width, h = rc.height, mx = ev.clientX - rc.left, my = ev.clientY - rc.top;
    let mejor = null, dm = 8;
    LCALLES.forEach(c => c.tramos.forEach(t => {
      for (let i = 1; i < t.length; i++) {
        q0.copy(t[i - 1]).project(cam); q1.copy(t[i]).project(cam);
        if (q0.z > 1 || q1.z > 1 || q0.z < -1 || q1.z < -1) continue;
        const x0 = (q0.x + 1) / 2 * w, y0 = (1 - q0.y) / 2 * h, x1 = (q1.x + 1) / 2 * w, y1 = (1 - q1.y) / 2 * h;
        const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((mx - x0) * dx + (my - y0) * dy) / L2));
        const d = Math.hypot(x0 + dx * k - mx, y0 + dy * k - my);
        if (d < dm) { dm = d; mejor = { c, t }; }
      }
    }));
    return mejor;
  }
  function ponHover(m) {
    const c = m ? m.c : null, t = m ? m.t : null;
    if (c === hover && t === tramoH) return;
    if (c !== hover) {
      resalta(c);
      if (c) { txHover.t = c.n; dibuja(txHover); }
    }
    hover = c; tramoH = t;
    if (c) trabajo.dataset.calle = c.n; else delete trabajo.dataset.calle;   // la calle bajo el cursor (para pruebas y capturas)
    puntas.forEach((me, k) => {
      me.visible = !!t;
      if (!t) return;
      // la punta y la dirección hacia adentro del tramo
      const n = t.length, a = k ? t[n - 1] : t[0];
      let b = null;
      for (let i = 1; i < n && !b; i++) { const q = k ? t[n - 1 - i] : t[i]; if (q.distanceTo(a) > 2) b = q; }
      b = b || (k ? t[0] : t[n - 1]);
      me.userData.p.copy(a); me.userData.d.copy(b).sub(a).setY(0).normalize();
    });
    pide();
  }
  let pendiente = null;
  function alMover(ev) {
    if (pendiente) { pendiente = ev; return; }
    pendiente = ev;
    requestAnimationFrame(() => { const e = pendiente; pendiente = null; ponHover(bajoCursor(e)); });
  }
  function alSalir() { ponHover(null); }
  if (GENERAL) { trabajo.addEventListener('pointermove', alMover); trabajo.addEventListener('pointerleave', alSalir); }

  /* ---------- capas ---------- */
  function visibles() {
    gArb.visible = !!capas.arboles;
    gFlu.visible = !!capas.flujos;
    nombresFijos();
  }
  function capa(nombre, si) {
    visibles();
    if (nombre === 'flujos' && si) mueveCarros(ultimoMs || performance.now());
    pide();
  }
  function fluye(ms) { if (capas.flujos) mueveCarros(ms); }
  function destruye() {
    trabajo.removeEventListener('pointermove', alMover); trabajo.removeEventListener('pointerleave', alSalir);
    texturas.forEach(r => r.tex.dispose()); gNom.children.forEach(me => me.material.dispose());
  }

  visibles();
  mueveCarros(0);
  return { capa, vista, fluye, preparaContexto, destruye };
}

/* ============================================================
   ATLAMPA — personas
   Figuras casi planas (siempre de frente a la cámara, de perfil), en metros:
   los pies en (0, 0), arriba = −y, caminando hacia +x. Cada tipo tiene dos
   cuadros: a (zancada) y b (piernas juntas, también de pie). Silueta llena
   (f) y trazos (l): extremidades, ruedas, correas.
   Rutinas en coordenadas del sitio (u, v), en metros:
     ida     recorre la ruta y desaparece; vuelve a salir tras `espera` s
     vaiven  va y viene; en cada extremo se detiene `pausa` s y se da la vuelta
     lazo    da vueltas; con `ciclo` [activo, descanso] sólo sale a ratos
   Lo usa atlampa-contexto.js (window.ATLAMPA_PERSONAS).
   ============================================================ */
(function () {
  'use strict';

  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  function P(x, y) { return f2(x) + ' ' + f2(y); }
  function poli(pts) { return 'M' + pts.map(function (q) { return P(q[0], q[1]); }).join('L') + 'Z'; }
  function linea(pts) { return 'M' + pts.map(function (q) { return P(q[0], q[1]); }).join('L'); }
  function elipse(x, y, rx, ry) { return 'M' + P(x - rx, y) + 'a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(2 * rx) + ' 0a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(-2 * rx) + ' 0Z'; }
  function rueda(x, y, r, giro) {
    var d = elipse(x, y, r, r);
    for (var i = 0; i < 2; i++) {
      var a = giro + i * Math.PI / 2;
      d += linea([[x - Math.cos(a) * r, y - Math.sin(a) * r], [x + Math.cos(a) * r, y + Math.sin(a) * r]]);
    }
    return d;
  }

  /* Caminante genérico.
     o.h alto · o.hom ancho de hombros · o.cad ancho de cadera · o.forma
     ('pantalon', 'vestido', 'panza', 'embarazada') · o.lean inclinación
     hacia delante (m en los hombros) · o.zan media zancada · o.corre */
  function andante(o, fase, dx) {
    dx = dx || 0;
    var h = o.h, r = h * 0.065, lean = o.lean || 0;
    var yCab = -h + r * 1.15, yHom = -h * 0.82, yCad = -h * 0.5, yRod = -h * 0.25;
    var xh = lean + dx, xc = dx;
    var f = '', l = '';
    f += elipse(xh + r * 0.15, yCab, r * 0.78, r);                               // cabeza
    l += linea([[xh, yCab + r * 0.9], [xh, yHom + 0.02]]);                        // cuello
    // torso
    var hw = o.hom / 2, cw = o.cad / 2;
    if (o.forma === 'vestido' || o.forma === 'embarazada') {
      var bajo = yRod + h * 0.05, vuelo = cw + h * 0.07;
      var pts = [[xh - hw * 0.7, yHom], [xh + hw * 0.6, yHom]];
      if (o.forma === 'embarazada') pts.push([xh + hw * 0.7, -h * 0.68], [xc + cw + 0.2, -h * 0.56], [xc + cw + 0.13, -h * 0.45]);
      pts.push([xc + vuelo, bajo], [xc - vuelo, bajo]);
      f += poli(pts);
    } else {
      var pts2 = [[xh - hw, yHom], [xh + hw * 0.8, yHom]];
      if (o.forma === 'panza') pts2.push([xc + cw + 0.16, -h * 0.62], [xc + cw + 0.1, yCad + 0.02]);
      else pts2.push([xc + cw, yCad]);
      pts2.push([xc - cw, yCad]);
      f += poli(pts2);
    }
    // piernas: cadera → rodilla → tobillo, con el pie hacia delante
    var zan = o.zan || h * 0.16, piernas;
    if (o.corre) {
      piernas = fase === 'a'
        ? [[[xc + zan * 0.6, yRod - 0.08], [xc + zan * 1.2, -0.05]], [[xc - zan * 0.5, yRod + 0.02], [xc - zan * 1.3, -h * 0.12]]]
        : [[[xc + zan * 0.7, yRod - 0.15], [xc + zan * 0.3, -0.1]], [[xc - zan * 0.1, yRod + 0.05], [xc - zan * 0.8, -h * 0.17]]];
    } else {
      piernas = fase === 'a'
        ? [[[xc + zan * 0.5, yRod], [xc + zan, 0]], [[xc - zan * 0.4, yRod], [xc - zan, 0]]]
        : [[[xc + 0.06, yRod], [xc + 0.03, 0]], [[xc - 0.03, yRod], [xc - 0.05, 0]]];
    }
    var pie = h * 0.08;
    piernas.forEach(function (p) {
      var ya = o.forma === 'vestido' || o.forma === 'embarazada' ? yRod + h * 0.05 : yCad;
      l += linea([[xc, ya], p[0], p[1], [p[1][0] + pie, p[1][1]]]);
    });
    // brazo de este lado (el otro queda detrás del cuerpo)
    if (!o.sinBrazo) {
      var bz = o.corre ? (fase === 'a' ? [[xh + 0.18, yHom + 0.25], [xh + 0.34, yHom + 0.08]] : [[xh - 0.16, yHom + 0.26], [xh - 0.02, yHom + 0.42]])
        : (fase === 'a' ? [[xh + zan * 0.35, yHom + h * 0.17], [xh + zan * 0.6, yCad + 0.02]] : [[xh + 0.02, yHom + h * 0.17], [xh + 0.03, yCad + 0.04]]);
      l += linea([[xh + hw * 0.3, yHom + 0.03], bz[0], bz[1]]);
    }
    return { f: f, l: l, hom: [xh, yHom], cad: [xc, yCad], mano: [xh + zan * 0.6, yCad + 0.02] };
  }

  // Los 16 tipos: cada uno devuelve sus dos cuadros
  var TIPOS = {
    hombre: function (fase) { return andante({ h: 1.74, hom: 0.44, cad: 0.32 }, fase); },
    mujer: function (fase) { return andante({ h: 1.62, hom: 0.36, cad: 0.34, forma: 'vestido' }, fase); },
    embarazada: function (fase) { return andante({ h: 1.6, hom: 0.36, cad: 0.36, forma: 'embarazada', zan: 0.2 }, fase); },
    corpulento: function (fase) { return andante({ h: 1.8, hom: 0.62, cad: 0.5, forma: 'panza', zan: 0.24 }, fase); },
    delgada: function (fase) { return andante({ h: 1.84, hom: 0.3, cad: 0.24, zan: 0.33 }, fase); },
    chavo: function (fase) {   // con mochila
      var a = andante({ h: 1.72, hom: 0.4, cad: 0.3, lean: 0.04 }, fase);
      a.f += poli([[a.hom[0] - 0.42, a.hom[1] + 0.02], [a.hom[0] - 0.16, a.hom[1] + 0.02], [a.hom[0] - 0.16, a.hom[1] + 0.48], [a.hom[0] - 0.44, a.hom[1] + 0.46]]);
      return a;
    },
    chava: function (fase) {   // mirando el celular
      var a = andante({ h: 1.64, hom: 0.36, cad: 0.32, sinBrazo: true, zan: 0.2 }, fase), x = a.hom[0], y = a.hom[1];
      a.l += linea([[x + 0.05, y + 0.03], [x + 0.12, y + 0.3], [x + 0.32, y + 0.1]]);
      a.f += poli([[x + 0.3, y + 0.04], [x + 0.36, y + 0.04], [x + 0.36, y + 0.16], [x + 0.3, y + 0.16]]);
      return a;
    },
    viejito: function (fase) {   // encorvado, con bastón
      var a = andante({ h: 1.6, hom: 0.4, cad: 0.32, lean: 0.2, zan: 0.13, sinBrazo: true }, fase), x = a.hom[0], y = a.hom[1];
      var punta = fase === 'a' ? 0.48 : 0.36;
      a.l += linea([[x + 0.04, y + 0.04], [x + 0.2, y + 0.32], [x + 0.34, y + 0.4]]) + linea([[x + 0.3, y + 0.4], [punta, 0]]);
      return a;
    },
    viejita: function (fase) {   // con bolsa del mandado
      var a = andante({ h: 1.52, hom: 0.38, cad: 0.4, forma: 'vestido', lean: 0.12, zan: 0.12, sinBrazo: true }, fase), x = a.hom[0], y = a.hom[1];
      a.l += linea([[x + 0.06, y + 0.04], [x + 0.3, y + 0.46]]);
      a.f += poli([[x + 0.2, y + 0.46], [x + 0.2, y + 0.78], [x + 0.46, y + 0.78], [x + 0.44, y + 0.46]]);
      return a;
    },
    nino: function (fase) { return andante({ h: 1.18, hom: 0.3, cad: 0.24, corre: true, lean: 0.08, zan: 0.24 }, fase); },
    corredor: function (fase) { return andante({ h: 1.76, hom: 0.42, cad: 0.3, corre: true, lean: 0.16, zan: 0.38 }, fase); },
    'adulto-nino': function (fase) {   // de la mano: el niño va delante
      var a = andante({ h: 1.72, hom: 0.42, cad: 0.32, sinBrazo: true }, fase);
      var n = andante({ h: 1.06, hom: 0.26, cad: 0.22, zan: 0.13, sinBrazo: true }, fase === 'a' ? 'b' : 'a', 0.62);
      a.f += n.f; a.l += n.l;
      a.l += linea([[a.hom[0] + 0.1, a.hom[1] + 0.03], [a.hom[0] + 0.3, a.cad[1] + 0.05], [0.52, n.hom[1] + 0.32], [n.hom[0], n.hom[1] + 0.03]]);
      return a;
    },
    hombros: function (fase) {   // niño en los hombros
      var a = andante({ h: 1.76, hom: 0.46, cad: 0.34, sinBrazo: true }, fase), x = a.hom[0], y = a.hom[1];
      var ry = y - 0.28, r = 0.08;
      // el torso del niño gira igual que las cabezas: si no, se encima como hueco
      a.f += elipse(x + 0.02, ry - 0.22, r * 0.8, r) + poli([[x - 0.12, ry - 0.12], [x - 0.12, y - 0.1], [x + 0.08, y - 0.1], [x + 0.08, ry - 0.12]]);
      a.l += linea([[x, y], [x + 0.16, y + 0.12], [x + 0.18, y + 0.32]]) + linea([[x + 0.06, y - 0.06], [x + 0.2, y + 0.06]]);
      a.l += linea([[x + 0.08, y + 0.03], [x + 0.2, y - 0.1], [x + 0.08, ry - 0.08]]);
      return a;
    },
    carriola: function (fase) {
      var a = andante({ h: 1.64, hom: 0.38, cad: 0.34, sinBrazo: true }, fase), x = a.hom[0], y = a.hom[1], g = fase === 'a' ? 0 : Math.PI / 4;
      a.l += linea([[x + 0.06, y + 0.04], [x + 0.3, y + 0.32], [0.52, -0.98]]) + linea([[0.52, -0.98], [0.66, -0.62]]);
      a.f += poli([[0.66, -0.88], [1.22, -0.88], [1.16, -0.58], [0.7, -0.58]]) + 'M' + P(0.66, -0.88) + 'Q' + P(0.7, -1.18) + ' ' + P(1.0, -1.12) + 'L' + P(0.98, -0.88) + 'Z';
      a.l += rueda(0.76, -0.14, 0.14, g) + rueda(1.12, -0.14, 0.14, g) + linea([[0.76, -0.14], [0.86, -0.58]]) + linea([[1.12, -0.14], [1.04, -0.58]]);
      return a;
    },
    perro: function (fase) {   // paseando al perro: correa y perro delante
      var a = andante({ h: 1.7, hom: 0.42, cad: 0.32, sinBrazo: true, forma: 'vestido' }, fase), x = a.hom[0], y = a.hom[1];
      var px = 1.3, pp = fase === 'a' ? 0.1 : -0.04;
      a.l += linea([[x + 0.06, y + 0.04], [x + 0.26, y + 0.36], [x + 0.34, y + 0.56]]) + linea([[x + 0.34, y + 0.56], [px + 0.28, -0.42]]);
      a.f += poli([[px - 0.22, -0.4], [px + 0.2, -0.42], [px + 0.22, -0.26], [px - 0.2, -0.24]]) + elipse(px + 0.3, -0.46, 0.08, 0.07);
      a.l += linea([[px - 0.16, -0.26], [px - 0.16 - pp, 0]]) + linea([[px + 0.16, -0.27], [px + 0.16 + pp, 0]]) + linea([[px - 0.22, -0.38], [px - 0.34, -0.5]]);
      return a;
    },
    silla: function (fase) {   // en silla de ruedas, empujándose
      var g = fase === 'a' ? 0 : Math.PI / 4, r = 0.075, f = '', l = '';
      f += elipse(-0.02, -1.26, r * 0.8, r);
      f += poli([[-0.18, -1.16], [0.06, -1.16], [0.1, -0.6], [-0.16, -0.6]]);                     // torso
      l += linea([[-0.06, -0.58], [0.38, -0.56], [0.42, -0.12], [0.52, -0.12]]);                 // muslo, espinilla, pie
      l += linea([[0.02, -1.08], [0.14, -0.84], [fase === 'a' ? -0.02 : 0.1, -0.66]]);            // brazo al aro
      l += rueda(-0.06, -0.33, 0.33, g) + elipse(0.42, -0.06, 0.06, 0.06);                         // rueda y rueda loca
      l += linea([[-0.26, -1.04], [-0.24, -0.56], [0.36, -0.54]]) + linea([[-0.26, -1.04], [-0.36, -1.06]]);   // respaldo, asiento y manija
      return { f: f, l: l };
    }
  };

  // Rutinas. Banquetas del predio: oeste u 450.4, este u 557, norte v 483,
  // sur v 325.9; de enfrente: u 436.4, u 567.9, v 314.5, v 503.8. El bloque
  // del sitio va de u 435.3 a 568.8 y de v 311.6 a 507.1.
  var PERSONAS = [
    { tipo: 'hombre', modo: 'ida', vel: 1.35, espera: 18, desfase: 0, ruta: [[450.4, 311.6], [450.4, 507.1]] },
    { tipo: 'mujer', modo: 'ida', vel: 1.25, espera: 25, desfase: 40, ruta: [[568.8, 483], [435.3, 483]] },
    { tipo: 'embarazada', modo: 'vaiven', vel: 0.9, pausa: 6, desfase: 10, ruta: [[480, 483], [480, 471], [489, 446], [499, 426]] },
    { tipo: 'adulto-nino', modo: 'ida', vel: 1.0, espera: 30, desfase: 15, ruta: [[435.3, 405], [452, 405], [478, 412], [490, 440], [500, 470], [502, 483], [568.8, 483]] },
    { tipo: 'carriola', modo: 'ida', vel: 1.1, espera: 20, desfase: 55, ruta: [[435.3, 503.8], [568.8, 503.8]] },
    { tipo: 'silla', modo: 'vaiven', vel: 0.95, pausa: 5, desfase: 30, ruta: [[454, 405], [518, 405]] },
    { tipo: 'viejito', modo: 'vaiven', vel: 0.65, pausa: 7, desfase: 5, ruta: [[557, 332], [557, 398]] },
    { tipo: 'viejita', modo: 'ida', vel: 0.75, espera: 35, desfase: 70, ruta: [[568.8, 314.5], [435.3, 314.5]] },
    { tipo: 'chavo', modo: 'ida', vel: 1.5, espera: 22, desfase: 25, ruta: [[497, 311.6], [497, 326], [497, 360], [497, 395], [503, 409], [508, 430], [512, 470], [512, 483], [512, 507.1]] },
    { tipo: 'chava', modo: 'vaiven', vel: 0.8, pausa: 9, desfase: 50, ruta: [[461, 474], [470, 446], [463, 421]] },
    { tipo: 'nino', modo: 'lazo', vel: 2.4, ciclo: [16, 22], desfase: 8, ruta: circulo(486, 447, 6, 12) },
    { tipo: 'corpulento', modo: 'ida', vel: 1.05, espera: 26, desfase: 12, ruta: [[436.4, 507.1], [436.4, 311.6]] },
    { tipo: 'delgada', modo: 'ida', vel: 1.45, espera: 16, desfase: 60, ruta: [[567.9, 311.6], [567.9, 507.1]] },
    { tipo: 'corredor', modo: 'lazo', vel: 3.2, ciclo: [45, 40], desfase: 20, ruta: [[458, 418], [515, 418], [516, 472], [458, 472]] },
    { tipo: 'perro', modo: 'vaiven', vel: 1.0, pausa: 5, desfase: 45, ruta: [[454, 483], [520, 483]] },
    { tipo: 'hombros', modo: 'ida', vel: 1.15, espera: 28, desfase: 35, ruta: [[450.4, 507.1], [450.4, 483], [470, 470], [485, 430], [495, 406], [452.7, 404], [435.3, 404]] }
  ];
  function circulo(u, v, r, n) { var a = []; for (var i = 0; i < n; i++) { var t = i / n * 2 * Math.PI; a.push([u + Math.cos(t) * r, v + Math.sin(t) * r]); } return a; }

  window.ATLAMPA_PERSONAS = { tipos: TIPOS, personas: PERSONAS };
})();

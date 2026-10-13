# Arte y cultura, y el aro

## Arte y cultura
- Fuente: `diagrama/modelo/arte_y_cultura_concepto.html`. `herramientas/prepara-cultura.py` genera `atlampa-3d-cultura.js`.
  Sistema Rhino +497.9986, +392.0954, +0.52.
- **`atlampa-3d-cultura.js` tiene ediciones a mano** que el script no tiene. No lo regeneres sin migrar antes esas ediciones
  a `prepara-cultura.py`. Lo correcto es pasarlo al flujo Rhino → script como el mercado.
- Va en **todas** las escenas y reemplaza a los pabellones viejos, bajo el aro del proyecto. Su aro y sus columnas originales se
  quitaron porque eran muy chicos. Sin vidrios.
- La plaza cultural está en la esquina NO del predio, hasta el aro (≈1,645 m²).
- Lámina original: 2 pabellones curvos de 2 niveles y 2,000 m². Con fondo de 12 m al ras del aro salía ~1,180 m²; la diferencia está sin confirmar.
- Ficha en `paginas.py`: desactualizada (habla de los pabellones).

## Plantas y distribución (v21, 2026-10-13)
- Hoja: `diagrama/modelo/arte_y_cultura_plantas.html` (plantas por nivel, módulos tipo, áreas, volumen 3D e isométrico).
  Se armó sobre la geometría de esta rama: placas N1, N2 y azotea, salas E1/E2, auditorio, X1 y X2, las 14 columnas, las rampas
  traseras y el aro del conjunto (círculo 39.5–46.55, piso +10.03, ensanchado sobre la azotea). Sin X3 ni escaleras traseras.
- Núcleo en la celda (−7,18) y un módulo de baños M · H en (−7,17) en los 4 niveles (una sola bajada). Talleres húmedos en PB,
  uno seco en N1. Montacargas al poniente: servicio y bodegas en PB, sala 2 en N1, sala B en N2, café en la azotea.
- `atlampa-3d-cultura.js`: `DATA.mods` ya son los módulos de esa distribución y `DATA.umb` las 9 sombrillas de un módulo a
  +15.00 (`lv.PAD`) sobre las columnas con i + j par; las otras 5 columnas llegan a la azotea. `DATA.par` (parasoles a +12) ya no se dibuja.
- Vivienda: mismos 85 módulos quitados y 18 de comercio que `prepara-modulos.py`.
- Pendientes para el equipo: en la azotea el núcleo deja 0.75 m atrás y 1.05 m al frente, así que la pista de 2 m no da la vuelta;
  el aro (+10.03) queda 0.51 m arriba del +9.00 del concepto (N2 → azotea = 3.51 m); en N2 el núcleo parte la sala en dos.

## Aro
- Círculo con centro (505.75, 409.05), losa con r ≈ 39.5–46.55, piso a +10.03 (Rhino 9.92), 33 columnas.
- **El aro y arte y cultura son uno:** el aro se ensancha sobre la azotea de cultura (`G.ponPlataforma(CD.azotea)`, tablas EXT/INT
  por medio grado) y la losa RF de cultura ya no se dibuja. El "chipote" anterior se quitó.
- Color propio `#f2c14e`. Nunca se apaga al inspeccionar o resaltar.
- Corta las naves en r 47. Dentro van patios de humedales, pendiente de Gabriel.
- En `Diag::ring` hay una curva 3D de Gabriel sin usar.

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

## Edificio y plantas (v22, 2026-10-13)
- Hoja: `diagrama/modelo/arte_y_cultura_plantas.html` (plantas por nivel, módulos tipo, áreas, volumen 3D e isométrico).
- El edificio es el de la propuesta de Diego (concepto v15–v20), casi intacto: placas que crecen al frente y atrás al bajar
  (N1 933, N2 714, azotea 528 m²), escaleras en X (X1–X3 al frente, X4–X6 atrás, trazadas desde el eje del aro de proyecto
  `C`, `R0`, `BULGE` de `DATA`), solo columnas (sin la estructura en X de `gridMembers`) y sombrillas de un módulo a +15.00.
  Las rampas traseras de la rama anterior ya no van.
- Contexto: manda el aro del conjunto (`atlampa-geo.js`). Se ensancha sobre `azotea` = azotea + descansos de X3 y X6 (`DATA.RFg`),
  así que X3 y X6 llegan al aro (+9.51 aquí, +10.03 en el visor). Con esta azotea `prepara-modulos.py` da los mismos 85 módulos
  quitados y 18 de comercio. El aro lleva 3 sombrillas en su tramo este (`DATA.umb` con `ring`), con columna propia.
- Distribución: núcleo en (−7,18) y un módulo de baños M · H en (−7,17) en los 4 niveles (una sola bajada); talleres en PB y N1.
- Pendientes: el aro queda 0.51 m arriba del +9.00 del concepto (X3 y X6 suben 3.51 m); comercio a +7.47 y +10.47 contra el aro.

## Aro
- Círculo con centro (505.75, 409.05), losa con r ≈ 39.5–46.55, piso a +10.03 (Rhino 9.92), 33 columnas.
- **El aro y arte y cultura son uno:** el aro se ensancha sobre la azotea de cultura (`G.ponPlataforma(CD.azotea)`, tablas EXT/INT
  por medio grado) y la losa RF de cultura ya no se dibuja. El "chipote" anterior se quitó.
- Color propio `#f2c14e`. Nunca se apaga al inspeccionar o resaltar.
- Corta las naves en r 47. Dentro van patios de humedales, pendiente de Gabriel.
- En `Diag::ring` hay una curva 3D de Gabriel sin usar.

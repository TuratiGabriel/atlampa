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

## Aro
- Círculo con centro (505.75, 409.05), losa con r ≈ 39.5–46.55, piso a +10.03 (Rhino 9.92), 33 columnas.
- **El aro y arte y cultura son uno:** el aro se ensancha sobre la azotea de cultura (`G.ponPlataforma(CD.azotea)`, tablas EXT/INT
  por medio grado) y la losa RF de cultura ya no se dibuja. El "chipote" anterior se quitó.
- Color propio `#f2c14e`. Nunca se apaga al inspeccionar o resaltar.
- Corta las naves en r 47. Dentro van patios de humedales, pendiente de Gabriel.
- En `Diag::ring` hay una curva 3D de Gabriel sin usar.

# Arte y cultura, y el aro

## Arte y cultura
- `herramientas/prepara-cultura.py` genera `atlampa-3d-cultura.js` (no se edita a mano). Lee el edificio de
  `diagrama/modelo/arte_y_cultura_plantas.html` (la hoja de plantas de Diego) y la geometría de las escaleras y losas de
  `diagrama/modelo/arte_y_cultura_concepto.html`. Cuando Diego actualice la hoja, se copia a `modelo/` y se corre el script.
  Sistema Rhino +497.9986, +392.0954, +0.52. Más adelante conviene pasarlo al flujo Rhino → script como el mercado.
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
- Decidido (Diego): el aro se queda a +10.03 aunque quede 0.51 m arriba del +9.00 del concepto; X3 y X6 suben 3.51 m.
- Pendiente: el comercio de +7.47 y +10.47 contra el aro.

## v24 (2026-10-14): listo para pasar a Rhino
- Escaleras en X: los tramos terminan en el borde del descanso central; barandal continuo por la orilla de afuera de cada
  carril (el de adentro del carril alto sólo se corta en el descanso); zancas cerradas en todas; dos apoyos bajo el descanso.
- X6 ya no arranca en el aire: N2 crece un descanso de arranque atrás (como los de llegada).
- Columnas de una pieza (sin cortes en losas que no tocan); las de sombrilla, del piso a +15.00.
- Azotea: el café pasó a (−8,15), fuera de la pista; se quitó la isla de estar de ahí y los árboles de las islas.
- La vivienda de la hoja ya sale de `atlampa-modulos.js` (+10.84 en el visor, 2.70 cada 3.30).

## v25 (2026-10-14): escaleras y barandales sin cruces
- Las losas ya no se montan sobre los últimos escalones: los descansos crecen sólo desde el extremo de la escalera hacia afuera.
- El barandal de cada plataforma (y el del aro en X3 y X6) se abre justo en el ancho del carril que llega o sale (xStairGap) y un tramo
  corto lo une con el barandal de la escalera. Las zancas de adentro van dentro de su carril (no invaden el tramo vecino).
- Cinta: nace a nivel como la franja de afuera del aro (mismo borde y mismo barandal) y en 18 m se ensancha y se separa antes de bajar;
  ya no tiene tapa al arrancar.

## Aro
- Círculo con centro (505.75, 409.05), losa con r ≈ 39.5–46.55, piso a +10.03 (Rhino 9.92), 33 columnas.
- **El aro y arte y cultura son uno:** el aro se ensancha sobre la azotea de cultura (`G.ponPlataforma(CD.azotea)`, tablas EXT/INT
  por medio grado) y la losa RF de cultura ya no se dibuja. El "chipote" anterior se quitó.
- Color propio `#f2c14e`. Nunca se apaga al inspeccionar o resaltar.
- Corta las naves en r 47. Dentro van los patios del aro: área abierta permeable de tezontle con arriates y bancas «onda» (Gabriel, 2026-10-12; ver `mercado.md`).
- En `Diag::ring` hay una curva 3D de Gabriel sin usar.
- **Cinta (2026-10-14, Diego):** sigue bajando de la P3 de la nave norte (+4.28, se conserva la entrada) hasta ±0.00 cerca del
  acceso norte, por el borde del aro (`th1` ≈ 100°, 182.5 m en total, ≤ 8 % con descansos). El corte del aro ya no es de golpe:
  crece suave desde donde se une la cinta (la cinta arranca a un lado y se mete bajo el corte) y se cierra suave después de que
  la cinta llega al piso (`cinta.corte`, `cinta.banda` en `atlampa-mercado.js`). Se recorre 0.5 m para librar la columna de
  vivienda B2 (r 46.32, 80.67°). En la hoja de arte y cultura la pista corre por el borde de afuera del aro.
  OJO: `atlampa-mercado.js` se regeneró sólo en la cinta (aquí no hay rhino3dm); conviene correr `prepara-mercado.py` completo.

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

## v26 (2026-10-14): bocas de escalera limpias
- Algunas uniones tomaban el barandal del otro lado y cruzaban la escalera: la losa no quedaba de frente a la boca (la cortaba en
  diagonal). Ahora, con geometría exacta (GEOS de QGIS, `bocas.py` en el flujo de la hoja), cada losa recibe un descanso de 1.5 m
  frente a cada boca (y frente al primer escalón donde sale una escalera) y se le resta el tramo que llega: su orilla es justo el
  último escalón. X6 sale de N2 casi en el aire: ahí la losa se recorta a lo largo del carril y su orilla queda al lado del tramo.
- El barandal de la losa se abre sólo en la boca (dentro del ancho del carril, `xStairGap`); las orillas a los lados del tramo lo
  conservan. Las uniones (`xStairJoins`) van sólo al barandal del mismo lado del carril y a menos de 0.8 m; nunca cruzan.
- Aro del visor: la abertura de X3/X6 es más justa (−0.15 a 3 m, ±0.61) y cada cabo del barandal del aro se une con el final del
  barandal de la escalera (`CD.bocas`, en `atlampa-3d.js`).

## v27 (2026-10-14): bocas orgánicas y zancas a la vista
- Los descansos frente a cada boca (ahora de 1.8 m) ya no hacen cortes a 90°: `bocas.py` cierra (radio 1.8) y abre (radio 0.7)
  la losa sólo alrededor de ellos, así sus orillas son curvas que siguen las de la plataforma. La boca sigue recta, del ancho del tramo.
- Escalones de 1.10 m; las seis zancas de cada escalera van a ±0.575 (5 cm, de −0.52 a +0.10) y se ven a los dos lados de cada
  tramo; el barandal va sobre la zanca. La losa deja 10 cm de holgura a los lados del tramo (boca de ±0.70), para que la zanca
  no quede incrustada en el canto de la losa.

- Hoja (v28): la cinta se dibuja con su ancho real (de 0 a 2 m en la transición, `banda`) y su arranque va a nivel del aro (antes caía a la cota del final por un redondeo de 0.005° en el ángulo). Su barandal de afuera sigue al del aro; el de adentro y el del borde cortado del aro aparecen sólo donde la cinta ya bajó más de 0.30, como en el visor.

## v29 (2026-10-22): programa nuevo por el análisis financiero
- **PB:** se cierra con vidrio (`E0`: losa del N1 completa menos X1, X4 y el foso del auditorio, 905 m²) y se reparte entre dos comercios separados por un muro corrido.
  - Un café-librería tipo Péndulo, al norte y al oriente, junto al elevador y al patio: 374 m².
  - Una librería tipo Gandhi, al sur y al poniente, con acceso por el lado del auditorio y por la plaza trasera: 374 m².
  - Salen los talleres de PB, el camerino, la oficina y la recepción.
  - Al centro quedan los servicios: bodega del Péndulo (recibe el montacargas), bodega del Gandhi, pasillo de servicio, núcleo y baños.
  - El cuarto de máquinas se queda en PB, pero escondido: su puerta ahora da sólo al pasillo de servicio.
- **N1:** todo es del Péndulo (545 m²: lectura, libreros y café); salen las salas, las salas oscuras y los talleres.
- **N2:** sigue de exposición (salas A y B, 212 m²) y la antigua sala C se vuelve dos talleres en renta de 59 y 57 m². Cada uno abre a la sala B y la llegada de X2 ya entra a la sala B.
- **Azotea:** sin cambios de geometría; la terraza ahora también es exposición al aire libre y conserva el café de 22 m².
- **Para el análisis financiero (m² cerrados):**
  - Comercio: 1,381. Son el Péndulo, 963 (374 + bodega 22 + N1 545 + baños del N1 22); el Gandhi, 396 (374 + bodega 22); y el café de la azotea, 22.
  - Talleres en renta: 116.
  - Cultura sin ingreso: 491.
  - Edificio cerrado: 1,988.
- **Visor:** `prepara-cultura.py` pasa también `E0` y dibuja los parteluces de la fachada de PB. El auditorio queda sin camerino.

## v30 (2026-10-23): PB y N1 a la mitad entre los dos comercios, núcleo compartido
- **Reparto (PB y N1):** el Péndulo ocupa la mitad norte (hacia el patio) y el Gandhi la mitad sur. Péndulo 652 m², Gandhi 627 m² y café de la azotea 22.
- **Núcleo en todos los niveles:**
  - Un solo elevador-montacargas en (−8,16): cubo de 3 m, cabina ≈2.5 × 3.2, abre al norte.
  - Baños en el resto de ese módulo y en (−7,16): accesible, mujeres y hombres.
  - El ducto va pegado al cubo. En N2 no hay baños, sólo pasa el ducto. Se quitó el núcleo anterior de (−7,18).
- **Vestíbulo común (PB y N1):** junta el elevador, los baños y la escalera.
  - Encima de la escalera hay una doble altura de 12 m² (`H1`, hueco en la losa del N1) con barandal (`H1R`).
  - Cada comercio entra con puerta de vidrio. En PB el vestíbulo tiene entrada propia por el poniente para subir a la exposición.
- **Fachadas oeste y sur sólidas** (en PB y N1). Ahí se recarga la operación:
  - Péndulo, al noroeste: cocina 27, bodega 13 y caja 12.
  - Gandhi, al sur: bodega 51 y caja 27.
  - Cuarto de máquinas, entre ellas: 25; sólo abre afuera.
  - Datos: `F0s/F0g` y `F1s/F1g` son las líneas sólidas y las de vidrio. Las sólidas también van en `walls3`.
- **N2:** el montaje pasa a (−7,17) junto a la llegada. Salas A 166 y B 65 m².
- **Edificio cerrado:** 1,976 m². Comercio 1,301, talleres en renta 116, cultura y áreas comunes 559.
- **Visor:** `prepara-cultura.py` pasa F0g/F1g (parteluces sólo en el vidrio), el hueco H1 de la losa del N1 y su barandal.

## v31 (2026-10-23): muros sólidos sólo en PB y operación del Péndulo al oriente
- En PB sólo son sólidos el oriente del Péndulo (hacia el aro), con su caja, cocina y bodega, y el sur del Gandhi (bodega, caja y cuarto de máquinas, que envuelve la esquina suroeste). La fachada poniente es de vidrio y el N1 es todo de vidrio, como antes (`F1g` = null en V3).
- Se quitó el mobiliario de los comercios (no se propone): quedan sólo los espacios, la escalera del vestíbulo y los rótulos. Áreas sin cambio: Péndulo 652, Gandhi 627.

## v32 y v33 (2026-11-04/05): cocina del Péndulo y arranques de X1 y X4
- **Péndulo:** cocina de 44 m² en (−7..−6,19) y bodega de 22.3 m² en (−5,19), contra el muro oriente, con equipo indicativo y puerta de servicio. Barra y caja de 22 m² en (−6,18).
- **X1 y X4 son escaleras Vessel:** cada una tiene dos arranques a ±0.00 y dos llegadas a +3.00. En cada arranque, la fachada de PB sigue la curva de la escalera (a 0.55 m) y remata recto, sin meterse más al edificio. Es regla de Diego: la menor cantidad de curvas.
- **Puertas:** el Gandhi abre frente al arranque poniente de X1, el Péndulo junto al oriente y el vestíbulo común frente al norte de X4. En N1, X4 llega a dos puertas nuevas del Gandhi. Las puertas de vidrio abren un hueco de 1.8 m en `F0g`/`F1g`.
- **Edificio cerrado:** 1,953 m². Comercio 1,277.9 (Péndulo 649.9, Gandhi 606.0 y café 22), talleres 115.8, cultura y áreas comunes 559.3.

## v34 (2026-11-16): baño de hombres de la azotea
- X3 llegaba a la azotea contra el muro oriente del baño de hombres. Ese baño pasó a (−7,17), junto al de mujeres, con su puerta al norte, y el de mujeres abre ahora al oriente, hacia la llegada de X3. Los baños siguen sumando 32 m².

## v35 (2026-11-16): sin auditorio
- Se quitó el auditorio por completo (el foso a −3.00 con gradas y escenario: `BOWL` y `FAN`) porque chocaba con el estacionamiento subterráneo. Su lugar queda como patio a ±0.00, y las terrazas de N1 y N2 ya no se cuentan como gradas. Las áreas cerradas no cambian.
- **Visor:**
  - `prepara-cultura.py` ya no genera la malla `auditorio` ni pone el foso en `pisa`.
  - En `atlampa-3d.js` (bloque de cultura), el suelo y el predio ya no abren el hueco del foso (antes `CD.pisa[0]`), el Nolli dibuja `pisa` parejo y se quitó la parte «Auditorio» del menú.
- **Rhino:** Diego ya no lo usa para arte y cultura (2026-11-16). La fuente es la hoja `modelo/arte_y_cultura_plantas.html`.

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

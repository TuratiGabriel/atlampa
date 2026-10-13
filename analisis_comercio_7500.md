# Comercio Atlampa: balance contra 7,500 m² (2026-10-12)

Sólo lectura y cálculo. Scripts en el scratchpad: `mod_cuenta.py`, `mod_cuenta2.py`, `areas.py` y `locales.py` (copias de solo lectura de la lógica de prepara-modulos y prepara-mercado, con shapely). Todos los supuestos se pueden editar.

## 1. Comercio en la vivienda
- Un módulo mide 5.5 × 4.0 × 3.0 m, o sea **22 m²** de piso.
- Hay **18 módulos tipo comercio**: 10 en el nivel 0 (+7.99) y 8 en el nivel 1 (+10.99). Total: **396 m²**.
- Lo verifiqué corriendo la lógica de prepara-modulos.py sobre los .3dm, sin escribir el JS. Los 18 son todos los de tipo comercio y los 18 vienen en el JS, porque todos tienen cara al exterior. El filtro de cara exterior no deja fuera a ninguno.
- Palanca disponible: hay 39 módulos más en los niveles 0 y 1 a menos de 6 m del paso del aro (20 en el nivel 0 y 19 en el 1). Son 858 m², a razón de 22 m² por módulo.

## 2. Mercado: m² brutos
El recorte es el disco del aro (r 47 desde (505.75, 409.05)). El interior se mide a la cara interior del muro y se descuentan 0.3 m más de vidrio.

| | huella ext. | − aro | interior − aro |
|---|---|---|---|
| Nave norte (recorte 712) | 2,588 | **1,877** | 1,810 (si se quita el canal perimetral de 112: 1,698; menos el jardín de 199: 1,499) |
| Nave sur (recorte 1,205) | 3,978 | **2,773** | 2,632 |
| Crujía 1 sur (u 505.2–522.6) | 1,249 | | 671 |
| Crujía 2 sur (u 522.6–540.7) | 1,300 | | 829 |
| Crujía 3 sur (u 540.7–558.1) | 1,249 | | 1,132 |

- **PA sur de hoy**: 2,213 m² según el resumen del JS. Ya resta el vacío de luz (302), la carga (193), la escalera (34) y el montacargas (6).
- **PA sur completa**, sin el vacío de luz: 2,425. Si se restan 58 m² de circulación vertical pública (2 escaleras de 3.0 × 8.5 más un elevador de 2.6 × 2.6), queda **2,367**.
- Si se deja un vacío sobre la acuaponia de la crujía 1 (448 m², de v 337 a 396), la PA baja a **1,919**. Con la acuaponia en la crujía 2 el vacío es de 597; en la crujía 3, de 910.
- Una PA en la nave norte cabría con unos 1,239 m², ya restando el vacío del jardín (+3.5 m de lluvia) y la circulación. Por crujía: la oeste da 566 y la este, 662. La cubierta norte tiene alero a 6.2 y valle entre 6.5 y 7.3, así que una PA a unos +3.4 deja 3.0 m libres en la PB.

## 3. Balance (criterio: área construida bruta, huella exterior menos el aro)

| Concepto | m² |
|---|---|
| Comercio en vivienda (18 × 22) | 396 |
| Nave norte PB | 1,877 |
| Nave sur PB (incluye acuaponia, carga y biodigestor) | 2,773 |
| Nave sur PA hoy | 2,213 |
| **Total hoy** | **7,258 (faltan 242)** |
| Propuesta plana: PA sur completa con circulación pública | 2,367 (+154) |
| **Total propuesta, con PA sobre la acuaponia** | **7,412 (faltan 88)** |
| Igual, pero con vacío de luz sobre la acuaponia de la crujía 1 | 6,964 (faltan 536) |
| Medido al interior de los muros, propuesta | 7,205 (faltan 295) |
| Palanca A: PA en la crujía oeste de la nave norte | +566 |
| Palanca B: segunda fila de módulos a comercio (39) | +858 (22 por módulo) |
| Palanca C: PA en toda la nave norte | +1,239 |
| Palanca D: ceder la crujía 1 (acuaponia) a mercado | 0 en bruto; +448 en PA si había vacío; +≈225 en locales |
| No recomendado: techar los patios del aro (r < 47) | hasta 1,917 (rompe el concepto) |
| No aplica: PA sobre el cajón de carga | (necesita 4.2 m libres) |

**Con área de locales en vez de bruta, 7,500 m² son inalcanzables.** El mercado plano da unos 2,700 m² de locales, más 396 de vivienda: unos 3,100. Llegar a 7,500 de locales pediría unos 14,000 m² construidos.

## 4. Locales de 2.5 × 2.0 (5 m²) y 2 × 2 (4 m²)
Trazado: filas espalda con espalda (4.0 m de fondo), pasillos de 1.20, cruz central de 3.5 m en u y en v y un pasillo transversal de 1.20 cada 8 locales. Es un orden de magnitud.

| Zona | m² útil | 2.5×2.0 | 2×2 | % neto |
|---|---|---|---|---|
| PB norte (sin el jardín de 199 ni los baños) | 1,411 | 135 (675 m²) | 165 (660) | 47 % |
| PB sur, acuaponia en crujía 1 (sin carga, biodigestor ni circulación) | 1,668 | 178 (890) | 229 (916) | 53 % |
| PB sur, acuaponia en crujía 2 | 1,548 | 166 (830) | 211 (844) | 53 % |
| PB sur sin acuaponia | 2,116 | 217 (1,085) | 260 (1,040) | 51 % |
| PA sur completa (sin baños) | 2,259 | 222 (1,110) | 279 (1,116) | 49 % |
| PA sur con vacío sobre la acuaponia de la crujía 1 | 1,811 | 179 (895) | 219 (876) | 49 % |

- En un rectángulo limpio con el mismo trazado sale entre 57 y 59 % de neto, y 67-71 % sin la cruz ni los transversales. Esto confirma el rango de 55-65 % de un mercado tradicional.
- El recorte curvo del aro baja el neto a 47-53 %. Para estimar, usa **≈ 50 % del bruto**.
- Con 2 × 2 caben más locales, pero da casi el mismo m² vendible.
- Hoy hay 31 puestos en la nave norte y 63 en la PA sur (de 3.3 × 2).

## 5. Retícula del estacionamiento bajo las naves
- **Advertencia:** atlampa-estacionamiento.js no trae columnas. El DWG que hay hoy (`Sotanos y PB para HTML.dwg`, convertido otra vez a DXF en %TEMP%) no tiene la capa R-Estructura. Las líneas de abajo las inferí de los huecos entre cajones y de las columnas de la vivienda (columnas_vivienda.json).
- **Bajo qué nave cae cada estacionamiento:** el norte ocupa 777 m² bajo la nave norte (u < 539, la crujía oeste). El sur ocupa 1,265 m² bajo la nave sur (u < 534, crujías 1 y 2).
- **La retícula está girada −10°**, como la de la vivienda. Ejes: a = u·cos10 − v·sin10 y b = u·sin10 + v·cos10.
  - En b, las columnas van **cada 8.0 m**, con 3 cajones de 2.45 entre ellas.
    - Bajo la nave norte: b ≈ 530.7 / 538.7 / 546.7 / 554.7. Coincide con las columnas de la vivienda a cada 4 m.
    - Bajo la nave sur: b ≈ 443.2 / 451.2 / 459.2 / 467.2, con una segunda familia corrida de 1 m (434.2 / 442.2).
  - En a, el módulo es de **5.5 m** (marco de 11), con a ≈ 431.0 + 5.5k según la vivienda. Bajo la nave sur esto no está verificado.
- **Cómo se traduce a u, v en la nave sur:** la línea b = 451.2 va de v 369.1 (en u 505) a v 359.8 (en u 558). Se mueve 9 m de punta a punta de la nave.
- **Consecuencia:** unos locales ortogonales no pueden seguir esta retícula. Hay dos opciones:
  - girar el bloque de locales −10° en las crujías que tienen estacionamiento abajo;
  - alinearse a la estructura propia de la nave sur, que es ortogonal (valles en u 522.6 y 540.7, postes cada 6.6 en v, 3.3 = un puesto), y resolver el estacionamiento con transferencia en la losa.

## Recomendaciones
1. **Fijar el criterio en área construida bruta.** Con área de locales, 7,500 no cierra con ninguna palanca razonable.
2. **Hacer la PA sur completa y poner la acuaponia en la crujía 1.** La crujía 1 es la más recortada por el aro (671 m² útiles), así que la acuaponia ahí sacrifica menos mercado. La PA debe pasar encima, con iluminación cenital en lugar del vacío. Así el total llega a 7,412.
3. **Cerrar la diferencia con un entrepiso en la nave norte**, sobre la crujía oeste: unos 566 m², que ya incluyen la escalera y el elevador. Queda un margen de unos 480 m² sobre la meta, y además sirve de colchón por si se mide al interior de los muros (falta 295). Una alternativa más barata es pasar de 4 a 6 módulos más a comercio en la vivienda (+88 a 132), aunque es más frágil.
4. **Locales de 2.5 × 2.0 en filas espalda con espalda sobre las líneas de columnas**, con pasillos de 1.20, cruz de 3.5 y transversales cada 8 locales. Da unos 535 locales en la versión plana con PA sur completa y unos 2,700 m² vendibles.
5. **Pedir a Andre el DWG con R-Estructura** para confirmar el paso en a bajo la nave sur antes de trazar. Mientras tanto conviene alinear a la estructura ortogonal de la nave, porque la del estacionamiento está girada −10°.

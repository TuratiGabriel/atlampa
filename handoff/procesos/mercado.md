# Mercado (Comercio): el ejemplo completo del método

## Flujo
- Fuente: `Contexto.3dm`, capas `Layer 01::COMERCIO::mercado::perímetro / cubierta / niveles / escaleras / excavación / Locales`.
- `herramientas/prepara-mercado.py` lee con rhino3dm las mallas de render guardadas y genera `atlampa-mercado.js`
  (`window.ATLAMPA_MERCADO`). Corre en segundos; necesita `pip install rhino3dm shapely matplotlib`.
- Lee dos cosas de la carpeta del proyecto y, si no están (colaboradores, sesiones en la nube), usa su copia del repo:
  `../Rhino/Contexto.3dm` → `modelo/Contexto.3dm`, y `../analisis/mercado/columnas_vivienda.json` → `herramientas/columnas-vivienda.json`
  (las 10 columnas de la vivienda que cruzan la nave norte; con ese respaldo se reproducen idénticos acero, vivienda, perímetro, cubierta, vidrio y cinta).
- Sólo se ve en el apartado Comercio (`MERCADO` reemplaza las naves simples); en la general va una versión ligera.
- Se copia **tal cual** de Rhino. Lo que cae dentro del aro (r 47) se recorta. En Comercio, la calle y la banqueta se recortan a la huella.
- Arriba de cada bloque del script hay un `PROPUESTA` editable (nave norte, hoyo y acero, paso 3, patios del aro, nave sur, cubierta y acero de la sur, cinta).
- Análisis de apoyo en `analisis/mercado/` (en la carpeta del proyecto, **fuera del repo**): `sol_nave_norte.py` y la planta rotulada `planta_mercado_norte.png`.
- Planos DWG: `planos-extrae.py` + `planos-dwg.py` (necesitan `Plantas/dwg/`, ezdxf y AutoCAD). La hoja A-03 dibuja sola las cubiertas que haya en `cubierta`.
- Si regeneras con otra versión de shapely, cambia el orden de los triángulos del piso, plataformas, humedal y (sur) tanques, camas y locales sin cambiar la geometría:
  es ruido en el diff, no un cambio de diseño.

## Estado (2026-10-13, desde `resumen` de `atlampa-mercado.js`)
- **Nave norte:** 31 puestos en 5 bloques (B–F), 31 mesas, plataformas 1,467 m², jardín inundable 199 m² (≤ 200), hoyo 30 m², 11 árboles.
- **Patios del aro:** 1,917 m² (1,709 de tezontle permeable, 208 de arriates), 29 bancas «onda» (49 plazas sentado).
- **Nave sur, planta baja:** carga, andén y patio de servicio (343 m²), biodigestor (122 m², 3 tubos, 35.8 m³), acuaponia 1,889 m² (tanques 184, cultivo 751).
- **Nave sur, planta alta:** una plataforma a +4.28 de 2,213 m² con 63 puestos (42 de comida), 49 mesas, 5 tarimas con macetas, baños y escalera de servicio.
- **Cinta del aro:** 117 m al 8 %, de +10.03 a +2.40, con descanso en la planta alta de la sur.

## Lo que decidió Gabriel (son ejemplos del tipo de criterio que se espera)
- **Perímetro:** paneles levantados por tramos de 6.364 m y alero recortado hacia los extremos, para que el agua caiga a la **zanja**
  (0.80 m, de −0.20 a −2.08). La estructura no pasa del borde interior de la zanja.
- **Hoyo del jardín inundable:** círculo "pixelado" de franjas paralelas a la cumbrera. Regla de lluvia: el hoyo es ≥ 25 % más chico
  que el jardín (lluvia a 20°) y no puede caer agua en las plataformas. Se quedó en Ø 1 tramo en (546.57, 459.23).
  2026-10-12: «muy cuadrado, sin ritmo» → 9 franjas de ⅛ de tramo con largos y corrimientos irregulares.
- **Acero independiente:** marcos de columna a columna del perímetro, perpendiculares a los muros, que se lea que sostienen lo
  existente. Columnas gemelas con junta de 5 cm junto a las de la vivienda, sin conectarse.
- **Sol decide el programa:** la crujía oeste queda bajo la vivienda (0 h de sol) y lleva locales de 2.5×2, baños y nivel +3.0.
  La crujía este (8–10 h) lleva plataformas de lámina escalonadas, jardín profundo, rejillas, árboles, juncos.
  Referencia: Flying Carpet de Kalach.
- **Paso 3 v2:** sobre los niveles que Gabriel modeló. "La estructura de la vivienda da la traza": los claros de 11 × 8 definen los
  bloques de puestos. Los puestos se adaptan (columna → dentro de un muro; frente < 2 m → se juntan) y cada bloque da a ≥ 2 comedores.
- **Cinta del aro:** franja de 2 m que baja del aro (+10.03) al 7.99 % hasta la nave sur, con descansos.
- **Espuela:** sin tren. Paso peatonal de 4 m con rieles visibles y puente sobre la laguna.
- **2026-10-12 (todo del script, con su cita):** jardín inundable ≤ 200 m²; terrazas que «solito se genera el desnivel» (escalinatas de 0.15 / 0.40 por
  distancia a la orilla del jardín, en lugar de las plataformas de Rhino); «más locales» (5 claros, mesas: una por puesto); patios del aro como
  «área abierta permeable» de tezontle con arriates y bancas «onda» sueltas, sin estanques, puestos ni mesas.
- **2026-10-12, nave sur:** su planta baja es la base del programa (carga y descarga en la esquina SE, andén a +1.20, biodigestor, acuaponia) y la planta alta
  una sola plataforma a +4.28 que nace donde llega la cinta. **La cubierta de Rhino de la sur se quita; «luego se genera».**

## Nave sur: cubierta y acero (propuesta 2026-10-13, por validar con Gabriel)
La cubierta de Rhino no cabe sobre la planta alta. Medido contra su malla: en los valles (donde van dos filas de puestos de 3.0 m) quedan **1.93 m libres**
sobre +4.28, **300 de 699** puntos del techo de los puestos la atraviesan y **5 de 10** árboles de las tarimas chocan con ella.
- **Propuesta** (`PROPUESTA nave sur`, `CUBIERTA_SUR = True`): las mismas 3 crujías a dos aguas, con cumbreras y valles sobre las líneas de columnas de la
  planta alta, subidas lo que pide el programa: viga a +8.05 (techo de puestos +7.38, holgura 0.15, peralte 0.50), valles y aleros +8.25, cumbreras +9.80 (bajo el aro,
  +10.03; ≈10°).
- **Luz:** la cumbrera de en medio se abre sobre el vacío de luz de la acuaponia (8.0 × 37.8 m). Abertura de 4.0 × 33.8 m (135 m²): el vacío menos lo que abre la lluvia a 20°
  (la regla del hoyo de la norte), para que no caiga agua en la plataforma. La lluvia que entra recarga la acuaponia.
- **Acero independiente** (como la norte): las 30 columnas de la planta alta siguen hasta la viga, 10 marcos de muro a muro, 5 largueros, pares bajo la cubierta y montantes
  en las cumbreras. Mismas secciones (HSS 300, viga 250 × 500). Predimensionamiento: sin bajada de cargas.
- **Consecuencias:** (1) los muros de Rhino de la sur terminan casi todos en +6.20 (algunas partes llegan a +8.7), así que bajo el alero queda una **franja abierta de hasta 2.05 m**:
  ventila y da luz, pero deja pasar lluvia con viento; (2) el vidrio del corte del aro de la sur sube con la cubierta (de +6.2…9.2 a +8.2…9.8); (3) la sur queda 2 m más alta en el alero y 0.6 m en la cumbrera
  que la norte.
- **Alternativas:** subir los muros en Rhino hasta el alero (cierra la franja); o bajar el alero a +6.20 (cierra con los muros, pendiente ≈ 22° en las crujías de borde) y mover los 5 árboles
  de las tarimas de los bordes; o una cubierta distinta (plana, diente de sierra al norte para luz cenital). `CUBIERTA_SUR = False` la deja como estaba (sin cubierta ni acero).
- En el visor: 6 faldones («Cubierta · nave sur · faldón 1…6») y la parte «Estructura de acero · nave sur»; cada una se oculta o se despieza sola.

## Normativa usada (NTC Proyecto Arquitectónico CDMX, Gaceta 12/12/2024)
- Puestos ≥ 4 m², lado 2, alto 3. Pasillos ≥ 1.10.
- Rampas ≤ 8 % con descanso cada 6 m.
- Escaleras: peralte ≤ 18, huella ≥ 25.
- Barandal 0.90 si el vacío es > 0.30.

## Pendiente (de Gabriel; no lo toques sin que te lo pidan)
- Validar o cambiar la cubierta y el acero de la nave sur (arriba), y regenerar los planos A-03 y A-04 (A-04 todavía sólo dibuja el acero de la norte).
- Fachada al aro: vidrio por ahora; no está decidida. Baños de la norte: ubicación por confirmar.
- Dos avisos del propio script tras los cambios del 12-oct: (a) `OJO`: los bloques B y E no dan a dos comedores (mesas por frente: B [0, 4], E [0, 6]); la regla «cada bloque da a ≥ 2 comedores»
  ya no se cumple (el comedor poniente de B cae en el patio del aro, que no lleva mesas); (b) `ACUAPONIA_GRANDE`: la acuaponia ocupa 0.77 de la planta baja útil de la sur (el umbral es 0.5), y el biodigestor tiene
  35.8 m³ contra 5.0 m³ requeridos por los puestos de comida (sobra si sólo sirve al mercado).
- Programa (`programa/`): el área construida de la planta alta de la sur ya sale del modelo (`resumen.sur.pa_m2` = 2,213 m²) pero aún no entra en `construido`
  (sigue en `pendientes_sin_dato`).

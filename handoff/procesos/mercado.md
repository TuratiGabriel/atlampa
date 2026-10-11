# Mercado (Comercio): el ejemplo completo del método

## Flujo
- Fuente: `Contexto.3dm`, capas `Layer 01::COMERCIO::mercado::perímetro / cubierta / niveles / escaleras / excavación / Locales`.
- `herramientas/prepara-mercado.py` lee con rhino3dm las mallas de render guardadas y genera `atlampa-mercado.js`
  (`window.ATLAMPA_MERCADO`).
- Sólo se ve en el apartado Comercio (`MERCADO` reemplaza las naves simples).
- Se copia **tal cual** de Rhino. Lo que cae dentro del aro (r 47) se recorta. En Comercio, la calle y la banqueta se recortan a la huella.
- Arriba del script hay un bloque `PROPUESTA` editable (TRAMO, ZANJA, MUROS, HOYO, PLATAFORMAS, ESCALERAS, PUENTES…).
- Análisis de apoyo en `analisis/mercado/`: `sol_nave_norte.py` y la planta rotulada `planta_mercado_norte.png`.

## Lo que decidió Gabriel (son ejemplos del tipo de criterio que se espera)
- **Perímetro:** paneles levantados por tramos de 6.364 m y alero recortado hacia los extremos, para que el agua caiga a la **zanja**
  (0.80 m, de −0.20 a −2.08). La estructura no pasa del borde interior de la zanja.
- **Hoyo del jardín inundable:** círculo "pixelado" de franjas paralelas a la cumbrera. Regla de lluvia: el hoyo es ≥ 25 % más chico
  que el jardín (lluvia a 20°) y no puede caer agua en las plataformas. Se quedó en Ø 1 tramo en (546.57, 459.23).
- **Acero independiente:** marcos de columna a columna del perímetro, perpendiculares a los muros, que se lea que sostienen lo
  existente. Columnas gemelas con junta de 5 cm junto a las de la vivienda, sin conectarse.
- **Sol decide el programa:** la crujía oeste queda bajo la vivienda (0 h de sol) y lleva locales de 2.5×2, baños y nivel +3.0.
  La crujía este (8–10 h) lleva plataformas de lámina escalonadas, jardín profundo, rejillas, árboles, juncos.
  Referencia: Flying Carpet de Kalach.
- **Paso 3 v2:** sobre los niveles que Gabriel modeló. "La estructura de la vivienda da la traza": los claros de 11 × 8 definen los
  bloques de puestos. Los puestos se adaptan (columna → dentro de un muro; frente < 2 m → se juntan) y cada bloque da a ≥ 2 comedores.
- **Cinta del aro:** franja de 2 m que baja del aro (+10.03) al 7.99 % hasta la nave sur, con descansos.
- **Espuela:** sin tren. Paso peatonal de 4 m con rieles visibles y puente sobre la laguna.

## Normativa usada (NTC Proyecto Arquitectónico CDMX, Gaceta 12/12/2024)
- Puestos ≥ 4 m², lado 2, alto 3. Pasillos ≥ 1.10.
- Rampas ≤ 8 % con descanso cada 6 m.
- Escaleras: peralte ≤ 18, huella ≥ 25.
- Barandal 0.90 si el vacío es > 0.30.

## Pendiente (de Gabriel; no lo toques sin que te lo pidan)
Humedales en los patios del aro y la nave sur.

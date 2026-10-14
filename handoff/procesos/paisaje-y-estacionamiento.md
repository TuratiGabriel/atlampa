# Paisaje, sol y estacionamiento

## Paisaje
- Fuente: `diagrama/modelo/Paisaje planta.html` (planta de un amigo de Gabriel). `herramientas/prepara-paisaje.py` genera `atlampa-paisaje.js`.
  Marco: 447.92–558.99 × 322.18–488.49.
- Laguna orgánica: no copiar el círculo. Cae sobre Heliotropo/espuela, sin resolver.
- Todo lo que no tiene desplante es área verde (patrón pasto). Hay ~35 árboles sueltos, nunca bajo módulos, aro, edificios, agua ni plaza.
  Las manchas llevan arbustos, pastos, flores en 3 colores, agaves en tezontle y juncos.
- Sin tuberías hasta que Gabriel diga a dónde van.

## Sol
Capa Sol: bóveda de R 150 m con los arcos del 21 jun, equinoccio y 21 dic, horas y el sol de hoy animado. Sin sombras.
Para decidir programas por asoleamiento, usa un análisis aparte como `analisis/mercado/sol_nave_norte.py`.

## Estacionamiento
- `Sotanos y PB para HTML.dwg` → `herramientas/prepara-estacionamiento.py` → `atlampa-estacionamiento.js`.
  Convierte con accoreconsole de AutoCAD 2024; desde Git Bash los argumentos `/i` se rompen, así que usa PowerShell o subprocess.
- 2 bloques (norte 130, sur 133 cajones por sótano, con los accesibles) y 4 sótanos de 3.5 m. Helicoidales dobles: el norte baja horario, el sur antihorario.
- Sólo se ve en su apartado: se quita el piso para ver la excavación.
- Cajones accesibles (2026-10-11): las capas `P01_CAJONES_N` (16 cajones) y `P01_ACCESIBILIDAD` (16 franjas de 1.34 m junto a ellos) del DWG son cajones de estacionamiento para personas con discapacidad. En el visor van como cajones más, sin distinguirlos.
- Cisterna, cuarto de máquinas y biodigestores: el DWG de 2026-10-11 ya no los trae; quedan en espera (`cuartos: []`).
- Cajones (2026-10-14): se guardan con sus 4 esquinas, tal cual el CAD (van girados como el bloque), no como caja alineada a los ejes.
- Elevadores (2026-10-14): el desplante sale del DWG: rectángulo cerrado de la capa `Muro` (≈ 2 × 2.3 m) con el texto `Elevador` (MTEXT, capa `0`); `Escaleras` va en la misma capa de texto y en el polígono abierto de `Muro` de 6 × 4.8 m. 4 en la planta tipo (2 por bloque). El visor los sube desde el último sótano (−14.0) hasta el nivel más alto del edificio y, encima, el espacio reglamentario `espacioElevador` (**supuesto 4.20 m sin verificar**: no se halló la cifra en las NTC CDMX 2024 ni en NOM-053-SCFI-2000; confirmar con la norma o el fabricante). Se editan en `ESPACIO_ELEVADOR` de `prepara-estacionamiento.py`.

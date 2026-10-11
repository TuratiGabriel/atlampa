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
- 2 bloques (norte 135, sur 94 cajones por sótano) y 4 sótanos de 3.5 m. Helicoidales dobles: el norte baja horario, el sur antihorario.
- Sólo se ve en su apartado: se quita el piso para ver la excavación.

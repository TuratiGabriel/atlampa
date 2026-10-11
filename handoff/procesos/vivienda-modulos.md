# Vivienda modular

- Fuente: `Rhino/nuevos bloques.3dm`. Capa padre `Módulos` con `44SOC`, `modulos44/66/88`, `modulosamenidades` y `modulosextra`.
  Son 917 cajas exactas de 5.5×4×3 a −10°, 8 niveles. Las posiciones finales se toman de los gemelos en `Contexto.3dm`.
- 8 bloques independientes (B1–B4 norte, B5–B8 sur) con juntas de 1 m. B1 tenía 33 módulos corridos 1 m y ya se corrigió.
- `herramientas/prepara-modulos.py` genera `atlampa-modulos.js`: el shell, la visibilidad precalculada y las juntas sólo donde cambia el departamento.
- `herramientas/departamentos.py` saca los departamentos (A, B, C, D, amenidades, extras) de las plantas del artifact
  "Atlampa Vivienda Modular" y los escribe en `departamentos.json`. Los grupos de Rhino no sirven para esto.
- 85 módulos se quitaron porque estorbaban el aro; 17 junto al aro pasan a comercio (`modcom`).
- En el visor: botón Módulos en Capas; no se ocultan en los apartados. Gabriel no quiere tipologías como botones.

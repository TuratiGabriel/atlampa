# Estructura de acero

## Criterio
- Todo es **predimensionamiento**: las cargas (D 5.0 / CV 1.9 kPa, Zona B, Q=3) y la losa son supuestos y cambiarán.
- Las cifras se dan como orden de magnitud. Los supuestos van en un solo lugar editable. No optimices ni iteres de más.
- Al entregar, di qué miembros son sensibles si cambian las cargas.
- Vivienda (replanteamiento del profesor de ingeniería civil): retícula 11×8 propia por bloque, cada uno con su punto de partida para
  maximizar marcos con 4 módulos. Donde el marco queda a medias se recorta al ras: todo módulo queda enmarcado.
  Los voladizos se cuelgan con megadiagonales tipo Torre Reforma. Cada bloque tiene 2 cubos de circulación (elevadores 2.5×2.5, escalera 3×4).
- La estructura nueva de otros programas es **acero independiente** de la vivienda: puede ir pegada, con junta de 5 cm, pero sin conectarse.

## Archivos
- `analisis/nb/v2/` (PROPUESTA_V2.html/.md, generador) se hornea con `nb_bake_v2.py` en `Rhino/nuevos bloques_V2 claude.3dm` (sólo en la máquina de Gabriel)
  (capa `V2 claude`). Da ~2,385 t.
- Tabla de secciones: `ESTRUCTURA_columnas_y_vigas.md`. Hoja: `Predimensionamiento_V4.xlsx`.
- En el visor, las columnas de PB salen de un PDF de Gabriel (`herramientas/columnas-pb.json`). `Contexto.3dm` trae la V4 con 75 columnas a piso; está sin unificar.

## Grasshopper
Sólo nodos nativos: nada de Python/C#, ni Expression, ni cadenas de aritmética. La lógica es geométrica: colisiones, contornos, cajas
por crujía y guías dibujadas a mano como entradas.

## Alternativas
Modela cada alternativa en su propia capa de Rhino para que el usuario las prenda y apague.

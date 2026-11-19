# Lectura local de fachadas desde Revit

Este flujo consulta `COORDINATION.rvt` y sus vínculos desde Dynamo. No crea
transacciones, no guarda el modelo y no cambia parámetros ni elementos.

1. Con el coordinado abierto, abrir `Atlampa-fachadas.dyn` en Dynamo y pulsar
   **Run** en modo Manual. El registro comprimido y `latest.json` quedan en
   `runtime-local/revit-fachadas/`, fuera del repositorio.
2. Ejecutar `..\.venv\Scripts\python.exe herramientas\revit-extractor\preparar_visor.py`
   desde `Atlampa-Interfaz/`. Se regeneran `atlampa-revit.bin` y
   `atlampa-revit.js` para el visor local. El convertidor verifica la huella
   SHA256 y detiene la generación ante errores o geometrías vacías inesperadas.
3. Revisar `http://127.0.0.1:8130/` y las vistas por apartado. El origen del
   coordinado se alinea rígidamente con el vértice noroeste del predio del
   visor. Si se mueve el predio o cambia la coordinación, revisar `ORIGIN` en
   `preparar_visor.py` antes de regenerar.

Para los chacuacos de Industria, ejecutar el mismo grafo con
`Industria_ARQ.rvt` como documento activo. Esta segunda lectura se guarda en
`latest-industria.json`. El convertidor comprueba que las dos losas de
Industria tengan exactamente los mismos triángulos en el modelo individual y
el coordinado; si no coinciden, detiene la generación. Integra cada modelo
genérico de `CHACUACO_*` y `CHIMENEA` con sus vértices propios, sin copiar ni
escalar piezas. En la lectura del 15-nov-2026 hay 27 chacuacos y 5 piezas de
chimenea. Sus identificadores, nombres y cajas de dimensiones quedan en
`atlampa-revit.js` para auditoría.

La lectura del 15-nov-2026 incluye muros, losas, puertas, ventanas, cubiertas,
paneles y montantes. Los muros cortina anfitriones sin malla y los paneles de
tipo `Empty System Panel` son vacíos intencionales. Se registraron vínculos
`ORIGIN_LEVELS` y `STEEL_VIV` sin cargar; no se infiere su geometría. La
fachada usa triángulos directos de Revit, sin simplificación ni aristas
deformadas. La guarnición sigue los 72 vértices del contorno de la losa
`SITE_PLANTILLA`; el predio interior y el contexto urbano aún requieren cotejo
con el coordinado.

El convertidor omite muros de vivienda e industria cubiertos por losas a ambos
lados y sus puertas y ventanas alojadas. Conserva las caras que dan a patios
abiertos. La clasificación se calcula desde las losas y ejes leídos de Revit,
sin modificar ningún elemento del modelo. En Mercado y Arte/Cultura no se
aplica este filtro porque sus cubiertas inclinadas y niveles variables no dan
una clasificación igualmente inequívoca con esta extracción.

## Actualizar sólo Arte y cultura

Cuando sólo cambió el vínculo `ArteCultura_Aro_ARQ`, no hace falta repetir la
lectura completa: `actualiza_cultura.py <lectura.jsonl.gz>` sustituye los
grupos de cultura en `atlampa-revit.bin`/`.js` y deja byte por byte los demás
programas (y su `revitSha256`). La lectura usa el mismo formato de renglones
que `exportar.py`, sólo con ese vínculo, y su huella queda en
`culturaRevitSha256`. Lectura del 19-nov-2026 (v35, sin el foso del
auditorio): 873 muros, 35 losas, 33 puertas, 318 paneles, 269 montantes y 19
cubiertas, sin errores. Los cortes de presentación de cultura en
`atlampa-3d.js` (`PISOS_USO`) pasaron a PB, N1 y N2 + azotea.

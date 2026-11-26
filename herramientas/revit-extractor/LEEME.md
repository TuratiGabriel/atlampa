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
cubiertas, sin errores. Para cultura también se leen columnas (`OST_Columns`, redondas y de sombrilla), escaleras (`OST_StairsRuns` y `OST_StairsLandings`, que suman la geometría de cada `Stairs`), barandales (`OST_StairsRailing`) y pasamanos (`OST_RailingTopRail`); los balaustres sueltos no, porque Revit los da en coordenadas locales (en el origen) y ya vienen dentro del barandal. Los cortes de presentación de cultura en
`atlampa-3d.js` (`PISOS_USO`) pasaron a PB, N1 y N2 + azotea.

## Actualizar sólo un vínculo (vivienda o cultura)

`actualiza_vinculo.py <programa> <lectura.jsonl.gz>` reemplaza en
`atlampa-revit.bin/.js` los grupos de un solo programa (`cultura` =
ArteCultura_Aro_ARQ, `vivienda` = ARQ_VIVIENDA) y deja los demás idénticos byte
por byte. `actualiza_cultura.py <gz>` es un atajo para cultura. La lectura se
saca con COORDINATION.rvt abierto, por C# (revit-mcp), con el mismo formato de
renglones que `exportar.py`, filtrando sólo ese vínculo.

Vivienda (lectura 2026-11-19): `preparar_visor.py` infiere "muros interiores"
(losa encima por ambos lados) y los omite junto con lo que alojan. En vivienda
eso escondía también muros de fachada bajo losas en voladizo: quedaban 1,281 de
4,541 muros, 891 de 1,075 ventanas y 36 de 218 puertas. `actualiza_vinculo.py`
no hace esa inferencia y dibuja todo lo que trae Revit; los niveles se reparten
con la misma fórmula de `preparar_visor.py`. Si alguien vuelve a correr
`preparar_visor.py` completo, hay que volver a pasar esta lectura de vivienda.

## Subusos (2026-11-19)

Al entrar a un uso (su página o aislado) el visor reparte sus triángulos en subusos
con tonos del mismo uso (`SUBUSOS` y `SUBUSO_COLOR` en `atlampa-3d.js`):

- **Arte y cultura:** PB y N1 comercio (z < 6.1), N2 galería (< 9.3), azotea social; el
  aro y la pista aparte, en amarillo. Sobre los pabellones el aro son las piezas que
  `actualiza_vinculo.py` marca con `piezaId: "aro"` (losas, muros y barandales que caben
  en la banda r 39.2–46.9 desde z 9; las sombrillas no). En el resto del círculo es todo
  lo que cae en la banda del aro.
- **Vivienda:** los módulos sueltos de VIV-N1 junto al aro son comercio. En Revit nada los
  distingue; `actualiza_vinculo.py` guarda sus losas en `subusos.vivienda` del .js.
- **Comercio:** zonas de las plantas de Gabriel: baños (nave norte junto a Sabino y PA de
  la nave sur), zona de descarga y acuaponia (PB sur); área libre = lo que queda dentro
  del aro (los dos patios); el resto, mercado.
- **Industria:** un solo color hasta que se defina su programa.

## Ver por pisos (2026-11-19)

En la ficha de cada uso (su página o aislado) hay un bloque "Ver por pisos": Completo,
Sin cubierta y cada piso de arriba abajo (`VER_PISOS` en `atlampa-3d.js`). Quita las
cubiertas de Revit (roofs, chacuacos, chimeneas) y hace un corte horizontal justo bajo la
losa del piso de arriba, con el mismo uniform que usa `aislaPisoUso`. "Inspeccionar"
vivienda la abre aislada (no tiene página). El aislado del mercado ahora trae también
lo del Rhino (puestos, plataformas, patios, PB sur), no sólo la envolvente de Revit.

## Destacar subusos y animación de pisos (2026-11-19)

- Picarle a un subuso (en la leyenda de la ficha o en el modelo, clic sencillo) lo
  destaca: se quitan los pisos de arriba (`VISTA_SUBUSO`) y lo demás queda tenue.
  Otro clic en el mismo, o "Completo", lo suelta.
- Los cambios de piso ya no son de golpe: el corte baja o sube animado y, bajo él, lo
  que se va o llega se desmorona en migajas con el rayado del dibujo (`PISO_BANDA` en
  los shaders). Los techos se desintegran primero con un corte propio y luego se ocultan.

# Historia B3–B7 · volúmenes LOD100

Orden fijo: Mercado → Arte y Cultura → Industria → Vivienda → Aro. Cada uso exige dos acciones distintas: `createNextProgramVolume()` levanta su volumen desde abajo en una posición flotante; `placeCurrentProgramVolume()` lo lleva a su ubicación final. Un gesto repetido durante la animación o en otra fase se rechaza sin crear otra pieza. B2 es solo la animación de descarte, sin gesto nuevo; al terminar empieza B3 con Mercado disponible. B3–B7 identifican el uso en curso; la siguiente etapa se habilita al terminar la colocación. Tras Aro queda B8 con el zoom in final.

| Uso | Huella de referencia | Altura simplificada | Piezas |
| --- | --- | --- | --- |
| Mercado | Una huella escalonada que sigue las tres crujías sur y dos norte de `G.NAVES` | Cumbrera máxima, 9.2 m | 1 masa simple |
| Arte y Cultura | Caja envolvente de `CD.losa1` del proyecto | Hasta cara inferior del aro | 1 caja simple |
| Industria | Caja envolvente de `MOD.industria.planta` | Máximo del BIM de Revit, 10.9 m | 1 caja simple |
| Vivienda | Dos franjas calculadas por `ESQ` a partir de `MOD.cajas` | Máximo de cada franja, limitado por `BIM.viviendaMaxZ` | 2 cajas rectas |
| Aro | Centro, radio exterior y cota `ANILLO` | Sección circular de toroide LOD100 | 1 dona gruesa con hueco |

Estas son masas de presentación, no sustitutos geométricos del BIM. Sus posiciones finales usan las coordenadas ya cargadas en el visor. La caja única de Mercado une los conjuntos norte y sur por una franja estrecha al este; simplifica el vacío intermedio sin sobresalir al oeste de las dos naves norte. Las cinco naves conservadas mantienen su geometría por debajo. Cultura e Industria se reducen a cajas envolventes; no se muestran muros, ventanas, carpinterías ni interiores. Las dos cajas de Vivienda nacen rectas con eje largo norte–sur y permanecen así al colocarse: su giro a la orientación BIM queda reservado para la Etapa 3. Colores: `PROGRAMA` existente.

Cada creación muestra 500 ms de huella punteada. Mercado, Cultura e Industria crecen durante 1130 ms; Vivienda y Aro, durante 1413 ms (80% de la velocidad anterior). La colocación dura 1000 ms. Un halo tenue de puntos acompaña el crecimiento y el traslado y se apaga al terminar. `storyTransitioning` cubre el cue y el crecimiento, por lo que la pinza no se habilita antes de tiempo.

La pieza provisional de cada uso nace hacia la cámara activa, hasta 80 m o el 45% de la distancia de cámara si el usuario acercó mucho la vista. Desde el primer cue, el predio y los usos ya colocados pasan suavemente a 75% de tamaño y 85% de opacidad. La pinza reduce la pieza provisional hasta esa escala mientras la lleva a su posición en el plano de fondo; sus coordenadas de proyecto se conservan dentro del grupo. El Aro LOD100 es un toroide liso: conserva radio exterior, centro y color; su sección circular aporta grosor radial y vertical, con agujero central visible. El grosor radial sigue siendo 25% mayor que la banda previa. La superficie no dibuja aristas de malla.

Después de colocar Aro, B8 anuncia solo `restoreStoryScale` como gesto de zoom in. Esa acción restaura tamaño y opacidad del proyecto completo a 100% durante 900 ms, luego deja B9 sin gesto narrativo. `storyScaleRestored` y `storyStep` permiten confirmar el final. La ruta de gesto en Jarvis debe asociar el zoom in conocido únicamente a esta acción en B8.

Contrato de gestos de Historia: `getAvailableActions().gestureActions` (también `getState().storyGestureActions`) anuncia solo `createNextProgramVolume` en fase `create` y solo `placeCurrentProgramVolume` en fase `place`; durante `creating`/`placing` anuncia `[]`. `storyProgramUse`, `storyProgramPhase`, `storyProgramPlacedCount`, `storyStep` y `storyTransitioning` permiten observar la transición. `exitStoryMode` sigue como recuperación no gestual. Al colocar el aro la fase queda en `complete` y no se anuncia otro gesto narrativo.

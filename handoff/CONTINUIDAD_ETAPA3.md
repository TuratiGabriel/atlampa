# Relevo BIM3D · inicio de etapa 3

Actualizado: 25 de noviembre de 2026. Este archivo resume el estado **vigente** tras las pruebas de Luis y sustituye las descripciones antiguas de gestos de etapa 2 en `PLAN_PRESENTACION_FINAL.md` y en informes históricos de Jarvis. Consultar código y estado del visor antes de implementar acciones nuevas.

## Estado aceptado por Luis

- La etapa 2 funciona de principio a fin en el lanzador real de Jarvis. Luis la dio por concluida a grandes rasgos; aún admite pulidos. No implica cierre de la presentación completa ni publicación.
- Jarvis abre Historia desde Contexto urbano, lo mantiene unos 3 segundos y se acerca a la preexistencia. Abrir el visor por separado sigue mostrando el proyecto normal.
- Se iluminan las cinco naves conservadas, se retiran las demás construcciones y se conservan la espuela y el suelo. El gesto que tardaba en crear el Aro se explicó por la espera de colocación de Vivienda y el rearme tras retirar la mano; no se cambió sensibilidad.
- Programa fijo: Mercado, Arte y Cultura, Industria, Vivienda (dos volúmenes norte–sur sin giro en etapa 2), Aro (dona de sección redonda). Cada volumen tiene el color de uso. Durante la creación, el predio y lo ya colocado están al 75 % de tamaño y 85 % de opacidad; la pieza nueva aparece delante. La pinza la coloca en el plano del predio. El último zoom restaura el conjunto al 100 %.

## Contrato vigente de gestos de etapa 2

| Estado estable | Único detonante narrativo | Acción del visor |
| --- | --- | --- |
| B0, antes de conservar | Una palma abierta frontal 0.30 s | `highlightConservedNaves` |
| B1, antes de retirar | La misma palma | `discardExistingBuildings` |
| B3–B7, fase `create` | La misma palma | `createNextProgramVolume` |
| B3–B7, fase `place` | Pinza de una mano | `placeCurrentProgramVolume` |
| B8, cinco usos colocados | Zoom hacia dentro conocido | `restoreStoryScale` |

Tras reconocer la palma hay **0.40 s libres** antes del despacho; la mano puede moverse o salir. Se revalida fase y lista de acciones justo antes de ejecutar. Para repetir una palma, retirarla claramente tras el disparo; una pose sostenida no avanza dos fases. Durante animaciones y en cualquier fase no listada, no se acepta otro gesto. Los controles BIM normales y la futura etapa 3 tienen reglas independientes. El estado final de escala restaurada es B9 (`storyProgramPhase: 'full_scale'`, `storyScaleRestored: true`).

## Etapa 3 pendiente, según el árbol de Luis

**Primer contrato instalado el 25 de noviembre:** desde B9, ambas frases `Jarvis, construye [uso]` y `Jarvis, desarrolla [uso]` seleccionan y resaltan la caja indicada en cualquier orden. Alias: mercado/comercio y arte y cultura/cultura. La selección responde `storyBuildStatus: 'pending_design'`; aún no transforma ni marca construido el uso. Consultar [ETAPA3_SELECCION.md](ETAPA3_SELECCION.md). La voz real sigue pendiente de ensayo.

**Vivienda implementada el 25 de noviembre:** Luis precisó que la orden debe ejecutar automáticamente seis pasos en unos 30 s: giro a orientación BIM, división en dos partes por cada una de las dos cajas, separación para pasillos, contracción hacia la geometría existente, revelado de pisos en su sitio y aparición de ventanas/núcleos. `buildStoryHousing()` usa los grupos BIM actuales; Jarvis espera confirmación `storyHousingBuilt` antes de anunciar construcción. Durante la secuencia no hay gestos; al terminar se habilita la rama de Vivienda del árbol por subestado. Implementación y pruebas aisladas listas; **falta ensayo visual, de voz y cámara con Luis**. El primer contrato de selección del párrafo anterior sigue aplicando a los usos que continúan pendientes.

**Comercio implementado el 25 de noviembre:** `construye/desarrolla comercio` y alias `mercado` llaman `buildStoryCommerce()` (28 s). Secuencia: caja azul tenue y cinco naves conservadas azules, vanos al revelar muros/paneles BIM, losas y segundo nivel, caída de módulos existentes, cubierta real al final. Las losas Revit se agrupan en una categoría; se usan sus vacíos existentes sin inventar una sustracción. `storyBuiltUses` acumula Comercio y Vivienda en cualquier orden; durante animación no hay gestos. El gesto diagonal posterior de Comercio **aún no está integrado**. Pruebas aisladas listas; falta ensayo visual, de voz y cámara con Luis.

**Industria implementada el 25 de noviembre:** `construye/desarrolla industria` llama `buildStoryIndustry()` (28 s). Una silueta lisa derivada de sus mallas BIM muestra recortes reales; luego aparecen dos elementos de losa/niveles, 27 chacuacos y 5 chimeneas, y finalmente puertas, ventanas y paneles. Al concluir queda el grupo BIM de Industria existente. La fuente no tiene categoría de cubierta separada; no se fabricó una. `storyBuiltUses` acumula Industria con Vivienda y Comercio en cualquier orden. Gestos posteriores de Industria aún no añadidos; pruebas aisladas listas, falta ensayo de Luis.

**Arte y Cultura implementado el 25 de noviembre:** `construye/desarrolla arte y cultura` o `cultura` llama `buildStoryCulture()` (29 s). Secuencia: huella curva real, tres niveles y vacíos, escaleras/módulos, estructura y cerramientos/vidrio. Usa CD y grupos BIM existentes, sin auditorio. Los grupos etiquetados como Aro quedan excluidos; el Aro no se construye ni se deshace por esta orden. `storyBuiltUses` acumula Cultura con Vivienda/Comercio/Industria en cualquier orden. El gesto diagonal posterior aún no está integrado. Pruebas aisladas y sintaxis listas; falta ensayo visual, voz y cámara de Luis.

**Aro implementado el 25 de noviembre:** `construye/desarrolla aro` llama `buildStoryRing()` (15 s). La dona LOD100 se aplana a la pieza real; emergen tablero/piso, pasamanos y balaustres, y al final se muestra la cinta existente hacia Comercio. También se usan `floors-aro`/`walls-aro` del BIM, sin activar Cultura. Si falta la cinta, el estado informa `existingConnections:false`; no se fabrica una. `storyBuiltUses` acumula los cinco usos en cualquier orden. Las cinco animaciones quedan implementadas localmente, **pendientes del ensayo integrado de Luis**; los gestos especiales posteriores y recorrido final aún no están completos.

**Auditoría de integración del 25 de noviembre:** tras terminar cualquiera de las cinco animaciones, el estado B9 permite giro X/Y, arrastre, zoom in/out y el gesto conocido de reinicio. Este último llama `returnToStoryOverview()` sin recargar, conserva todos los usos construidos y muestra cajas de los pendientes para una nueva elección. Durante una animación no se admiten gestos. Visualizador probó estados y visibilidad en combinaciones sintéticas; Jarvis pasó 16 pruebas aisladas. Los dos accesos del escritorio apuntan al lanzador local vigente. Falta la prueba integral con Luis desde Etapa 2.

El público elige el orden de cinco usos. Cada orden **«Jarvis, construye [uso]»** transforma únicamente la caja elegida; las otras permanecen en caja. Las cinco transformaciones deben funcionar en cualquier orden. Al terminar la exploración de un uso, el nodo llamado antes «Reinicio» significa **volver a la vista general**, conservar ese uso construido y permitir la siguiente elección. Cuando estén los cinco, la orden final será **«Jarvis, muestra la vida de un habitante del proyecto»**. La animación, cámara y gestos particulares de cada uso aún requieren instrucciones y material de Luis; no inventarlos ni implementar toda la etapa de una vez. El árbol de decisiones adjunto en el chat Asesor es la referencia narrativa, pero el permiso efectivo de gestos debe codificarse por estado.

## Responsables y rutas

- **BIM3D-Visualizador:** `C:/Users/jaroc/Documents/BIM Escena 3D/Atlampa-Interfaz`, rama `interfaz-ux`; estados, geometría, animaciones, cámara y contrato `AtlampaControl`. Regenerar HTML desde `herramientas/paginas.py`.
- **BIM3D-Jarvis:** `C:/Users/jaroc/Documents/BIM Escena 3D/vazquez-industries/Jarvis Corporate`; voz, cámara web MediaPipe, detección, puertas por estado y lanzador real.
- **BIM3D-Presentación:** cues, lectura de videos, ensayo y gramática física; no altera geometría.
- **BIM3D-Asesor:** unifica decisiones, delega una unidad a cada responsable y revisa integración. El chat Técnico se usa solo si surge montaje, arranque o publicación.

Los tres chats anteriores ya compactaron su contexto el 25 de noviembre y pueden continuar. Leer este relevo y el contrato reciente antes de cualquier trabajo de etapa 3; no repetir preguntas resueltas. No hacer push, merge, publicar ni probar Revit sin instrucción expresa. Luis pidió avanzar por unidades y dirigir las pruebas reales.

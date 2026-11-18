# Árbol de decisiones del visualizador · 17 nov 2026

Fuente: `Arbol de decisiones JARVIS.pdf`, entregado por el equipo. Este archivo describe la interfaz para el chat BIM3D-Presentación; no cambia Jarvis ni los gestos.

## Contrato

`window.AtlampaControl.version === 4`. Consultar `getAvailableActions()` antes de emitir una acción. `getState()` informa `scene`, `isolated`, `detailStage`, `floor`, `zone`, `apartment`, `wall`, `urbanContextVisible` y `urbanRotationActive`. Las llamadas fuera de etapa devuelven `{ok:false,reason:...}`.

| Etapa | Acciones que avanzan |
| --- | --- |
| Predio | `setUrbanContext(true)`, `startUrbanRotation()` cuando está quieto, `stopUrbanRotation()` cuando gira o `isolateUse('vivienda'|'comercio'|'cultura'|'industria'|'aro')` |
| Contexto urbano | `orbit(deltaAz, 0)`, `startUrbanRotation()` cuando está quieto, `stopUrbanRotation()` cuando gira y `resetDetail()` |
| Vivienda | `setFloorSeparation(progress)` y `selectFloor(4,'sur')` |
| Piso 4 sur | `selectApartment(id)` o `pickApartment(x,y)` |
| Departamento | `selectWall(id)` o `pickWall(x,y)` |
| Muro | `setLateralSeparation(progress)` o `explodeWall()` |
| Comercio, cultura e industria aislados | `setUseFloorSeparation(progress)` y `selectFloor(numero)` |
| Piso de comercio | `selectModule('zona-1'|'zona-2'|'zona-3')`, según `getAvailableActions().zones` |
| Piso de cultura | `selectLocal('zona-1'|'zona-2'|'zona-3')`, según `getAvailableActions().zones` |
| Piso de industria, módulo/local, capas de muro, aro | Navegar y reiniciar, sin transición de detalle adicional |

La rotación, el desplazamiento y el zoom están disponibles en todas las etapas salvo contexto urbano, donde solo se permite rotación Y (movimiento horizontal de la mano). `resetDetail()` devuelve al predio completo. La separación horizontal del predio completo quedó bloqueada; solo el muro seleccionado puede explotar por capas.

`startUrbanRotation()` no recibe parámetros: gira **la vista actual** a 6°/s sobre Y, sin cambiar de etapa ni activar Contexto urbano. En el predio recién abierto gira solo el proyecto; si Contexto urbano ya está visible, gira esa vista. El nombre de la función se conserva por compatibilidad con Jarvis. Devuelve `{ok:true,active:true,degreesPerSecond:6}`. `stopUrbanRotation()` no recibe parámetros y devuelve `{ok:true,active:false,wasActive:boolean}`. `getState().urbanContextVisible` permite distinguir las dos vistas; `getState().urbanRotationActive` indica el giro en cualquiera. Una acción válida posterior de `AtlampaControl` cancela el giro; Jarvis también puede llamar `stopUrbanRotation()` al reconocer un gesto cuya acción se rechace por etapa. Un gesto rechazado por el visor, sin esa llamada explícita, no cancela el loop. El giro no se guarda entre páginas y se pausa mientras la pestaña está oculta.

## Precisión de esta iteración

- Vivienda conserva el flujo anterior del piso 4 sur. Sus límites de departamento y mobiliario siguen las salvedades ya acordadas con Luis.
- Comercio, cultura e industria usan cortes visuales por cotas de las losas BIM. La fuente geométrica Revit no se modifica. Son franjas de presentación, no una clasificación final de cada elemento por nivel.
- Los módulos de comercio y locales de cultura son recortes espaciales provisionales de geometría BIM real. Sus límites e IDs no son locales oficiales de Revit. Presentar siempre el carácter provisional hasta disponer de planos/IDs.
- Jarvis usa `isolateUse`, `setUseFloorSeparation`, `selectModule` y `selectLocal` según la etapa disponible. La separación lateral del predio se rechaza.

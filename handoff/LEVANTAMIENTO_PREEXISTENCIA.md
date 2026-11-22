# Levantamiento de la preexistencia · Atlampa

Estado al 22 de noviembre de 2026: **dos naves orientales confirmadas por Luis; resto en levantamiento**. La reconstrucción es esquemática y usa el estilo vigente del visor.

## Marco espacial

| Referencia | Dato observado | Alcance |
| --- | --- | --- |
| Visor, `atlampa-geo.js` | `PRED` y `PB`: rectángulo local `u=447.963…558.963`, `v=322.265…488.265` (111 × 166 m) | Marco de trabajo del visor, alineado al sitio BIM. No demuestra ocupación histórica. |
| Visor, `atlampa-geo.js` | Ejes locales `u/v` girados 9.96° respecto del norte; centro de cámara local `[503.6, 402.05]` | Se requiere cotejo de puntos de control para transformar a latitud/longitud. |
| Google Earth, vista colocada por Luis | [Vista centrada](https://earth.google.com/web/@19.45806167,-99.15875678,2240.67555016a,632.88933597d,35y,0h,0t,0r/data=CgRCAggBQgIIAEoNCP___________wEQAA) | La URL registra el **centro de cámara**, no las esquinas del terreno. Fecha de imagen aún no documentada. |
| Linderos confirmados por Luis | Toda la manzana central: Fresno al oeste, Sabino al este, Clavel al sur y Eulalia Guzmán al norte | Identifica el predio en la vista de Earth. Falta amarrar sus cuatro esquinas a coordenadas globales. |
| Naves orientales confirmadas por Luis | `AtlampaGeo.NAVES[0]` al sur y `[1]` al norte: son las naves que ya existen al este del predio | Se representan completas, sin el recorte del aro propuesto. La fuente de medidas es `Contexto.3dm` y la continuidad existente la confirmó Luis. |
| [Earth 3D, vista oblicua](https://earth.google.com/web/@19.45808797,-99.15880448,2240.39288521a,204.55874727d,35y,137.79997545h,59.99666536t,0r/data=CgRCAggBQgIIAEoNCP___________wEQAA) | Cubiertas de naves y otras masas bajas legibles; la perspectiva sirve para contrastar órdenes de altura | No permite medir todavía alturas exactas ni fecha de imagen. |
| Earth, vista cenital acercada | Dos conjuntos occidentales grandes, uno al norte y otro al sur; separación central de servicio | Huellas y alturas aproximadas para el esquema, pendientes de fotos. |

Luis confirmó que toda la manzana es el predio y que las naves orientales ya existen. Para un primer relato visual se representan también dos masas occidentales aproximadas. Todo el estado inicial va en blanco, con sombras y contornos; los colores de uso pertenecen a etapas narrativas posteriores.

| Elemento esquemático | Huella local `u0,v0,u1,v1` | Altura | Confianza |
| --- | --- | --- | --- |
| Nave oriental sur | `AtlampaGeo.NAVES[0]` | Alero 6.2 m, cumbrera 9.2 m | Media-alta: medidas de `Contexto.3dm` y confirmación de Luis de que existe. |
| Nave oriental norte | `AtlampaGeo.NAVES[1]` | Alero 6.2 m, cumbrera 9.2 m | Media-alta: igual. |
| Masa noroccidental | `449,418.5,522,487` | 6.2 m aproximados | Baja: interpretación de Earth cenital/oblicuo; fotos pendientes. |
| Masa suroccidental | `449,323.5,503.5,395.5` | 6.0 m aproximados | Baja: interpretación de Earth cenital/oblicuo; fotos pendientes. |

Las dos masas occidentales son **volúmenes de lectura**, no un levantamiento por edificio ni una afirmación de cubierta plana exacta. La franja de servicio central queda libre según la vista aérea.

## Registro por elemento

Cada elemento que se acepte llevará estos campos:

| Campo | Criterio |
| --- | --- |
| `id`, tipo y estado | Volumen, muro/barda, vacío, acceso, árbol o infraestructura; existente en la **fecha de imagen indicada**. |
| Huella `u/v` y cota | Polígono, método de alineación y tolerancia. No usar la huella de la propuesta como sustituto. |
| Altura, cubierta y fachadas | Medición o estimación explícita, con tolerancia y caras no observadas marcadas como desconocidas. |
| Fuente | Archivo o enlace, autor/proveedor, fecha de captura y punto de vista. |
| Confianza | Alta: medida/corroborada; media: concordancia de al menos dos vistas; baja: inferencia visual. Solo la geometría respaldada se mostrará como tal. |
| Contradicciones | Imágenes de fechas distintas, cambio de ocupación o discrepancia con lindero. Se elevan a Luis antes de modelar. |

## Pendientes para poder dibujar

1. Fotografías de Luis y fechas aproximadas de captura.
2. Fecha de la imagen de Google Earth usada como estado de partida.
3. Dos puntos de control identificables en Earth y en el visor para amarrar las cuatro esquinas de la manzana confirmada.
4. Orden narrativo de qué se demuele, conserva, transforma o agrega. No se deduce de la propuesta BIM.

El primer corte de `Modo historia` muestra los cuatro volúmenes esquemáticos y el suelo del predio. `sceneReady:false` indica que faltan fotos, fecha de imagen y validación de las masas occidentales.

## Ensayo manual del primer corte

Abrir el visor normal en el predio y pulsar **Modo historia** o **F9**. El control activa temporalmente Modo presentación y muestra la preexistencia blanca, sin controles. Pulsar **F9** de nuevo para volver al proyecto BIM y al estado previo de Modo presentación. Si Modo presentación ya estaba activo, F9 entra y sale sin revelar sus controles; **F8** sigue recuperándolos. Desde un apartado aislado la entrada se rechaza hasta volver al predio general.

Contrato para integraciones posteriores: `AtlampaControl.enterStoryMode()` exige predio general y Modo presentación ya activo; `exitStoryMode()` restaura la escena. `getState().storyMode` informa la entrada de forma inmediata; `getAvailableActions().actions` contiene solo `exitStoryMode` durante Historia. Los controles BIM rechazados responden `story_mode_active`.

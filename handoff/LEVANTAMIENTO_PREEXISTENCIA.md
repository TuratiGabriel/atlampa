# Levantamiento de la preexistencia · Atlampa

Estado al 22 de noviembre de 2026: **cuatro conjuntos preexistentes representados de forma esquemática**. Google Earth es la única fuente visual disponible; Luis confirmó los linderos y que las dos naves orientales ya existen. La reconstrucción usa el estilo blanco del visor.

## Marco espacial

| Referencia | Dato observado | Alcance |
| --- | --- | --- |
| Visor, `atlampa-geo.js` | `PRED` y `PB`: rectángulo local `u=447.963…558.963`, `v=322.265…488.265` (111 × 166 m) | Marco de trabajo del visor, alineado al sitio BIM. No demuestra ocupación histórica. |
| Visor, `atlampa-geo.js` | Ejes locales `u/v` girados 9.96° respecto del norte; centro de cámara local `[503.6, 402.05]` | Se requiere cotejo de puntos de control para transformar a latitud/longitud. |
| Google Earth, vista colocada por Luis | [Vista centrada](https://earth.google.com/web/@19.45806167,-99.15875678,2240.67555016a,632.88933597d,35y,0h,0t,0r/data=CgRCAggBQgIIAEoNCP___________wEQAA) | La URL registra el **centro de cámara**, no las esquinas del terreno. Fecha de imagen aún no documentada. |
| Linderos confirmados por Luis | Toda la manzana central: Fresno al oeste, Sabino al este, Clavel al sur y Eulalia Guzmán al norte | Identifica el predio en la vista de Earth. Falta amarrar sus cuatro esquinas a coordenadas globales. |
| Naves orientales confirmadas por Luis | `AtlampaGeo.NAVES[0]` al sur y `[1]` al norte: son las naves que ya existen al este del predio | Se representan completas, sin el recorte del aro propuesto. La fuente de medidas es `Contexto.3dm` y la continuidad existente la confirmó Luis. |
| [Earth 3D, vista oblicua](https://earth.google.com/web/@19.45808797,-99.15880448,2240.39288521a,204.55874727d,35y,137.79997545h,59.99666536t,0r/data=CgRCAggBQgIIAEoNCP___________wEQAA) | Cubiertas de naves y otras masas bajas legibles; la perspectiva sirve para contrastar órdenes de altura | No permite medir todavía alturas exactas ni fecha de imagen. |
| [Earth, vista cenital acercada](https://earth.google.com/web/@19.4580553,-99.15882018,2240.64176136a,485.93236985d,35y,0h,0t,0r/data=CgRCAggBQgIIAEoNCP___________wEQAA) | Dos conjuntos occidentales, uno al norte y otro al sur; franja transversal de servicio, cubiertas fragmentadas y un hueco en el conjunto suroeste | Base visual del esquema. La fecha de captura de la imagen no aparece en la vista consultada. |

Luis confirmó que toda la manzana es el predio y que las naves orientales ya existen. Los dos conjuntos occidentales se descomponen en cubiertas de distinta altura, anexos y huecos visibles en Earth. Todo el estado inicial va en blanco, con sombras y contornos; los colores de uso pertenecen a etapas narrativas posteriores.

| Elemento esquemático | Huella local `u0,v0,u1,v1` | Altura | Confianza |
| --- | --- | --- | --- |
| Nave oriental sur | `AtlampaGeo.NAVES[0]` | Alero 6.2 m, cumbrera 9.2 m | Media-alta: medidas de `Contexto.3dm` y confirmación de Luis de que existe. |
| Nave oriental norte | `AtlampaGeo.NAVES[1]` | Alero 6.2 m, cumbrera 9.2 m | Media-alta: igual. |
| Conjunto noroccidental | Envolvente `449,419,522,487`; cobertizo largo de Fresno con caída hacia el patio, dos vacíos, tres naves cortas y alas en L | Cubiertas de 5.0 a 7.6 m aproximados | Media para forma relativa por Earth 3D; baja para posición y altura exactas. |
| Conjunto suroccidental | Envolvente `449,324,503,395`; huella en L, franja sur más alta, vacío y monitor de cubierta | Cubiertas de 5.5 a 9.0 m aproximados | Media para forma relativa por Earth 3D; baja para posición y altura exactas. |
| Franja ferroviaria y portones | Eje `ESPUELA` del visor, dentro del predio por `v≈405`; portones al oeste y este de la franja central | Rieles a nivel de suelo, cerramientos de 3.2 m esquemáticos | Media para la existencia de rieles y cierres según vista Earth y calles Fresno/Sabino; baja para alturas y posición precisa. |

Los conjuntos occidentales son **volúmenes de lectura**, no un levantamiento por edificio. Su división interna y alturas tienen tolerancia visual aproximada de varios metros. La franja transversal conserva los rieles, pero se cierra con portones esquemáticos en Fresno y Sabino; no se presenta como paso libre. No se representaron materiales ni fachadas que Earth no permite distinguir. Las capturas de calle corresponden a mayo de 2022 (Sabino) y agosto de 2024 (Fresno); sus fechas difieren de la imagen 3D sin fecha visible.

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

## Pendientes de validación

1. Fecha de captura de la imagen de Google Earth usada como estado de partida; no está visible en la interfaz consultada.
2. Dos puntos de control identificables en Earth y en el visor si después se requiere georreferenciación exacta. Por ahora basta la alineación esquemática a los cuatro linderos confirmados.
3. Orden narrativo de qué se demuele, conserva, transforma o agrega. No se deduce de la propuesta BIM.

`Modo historia` muestra los cuatro conjuntos esquemáticos y el suelo del predio. `sceneReady:false` indica que la fecha de imagen y las alturas/divisiones occidentales siguen estimadas; no impide revisar visualmente el primer corte.

## Ensayo manual del primer corte

Abrir el visor normal en el predio y pulsar **Modo historia** o **F9**. El control activa temporalmente Modo presentación y muestra la preexistencia blanca con los controles de cámara. Arrastrar para orbitar, Shift + arrastrar para mover, rueda o botones para zoom; doble clic o 0 para encuadrar. Pulsar **F9** de nuevo para volver al proyecto BIM y al estado previo de Modo presentación. Si Modo presentación ya estaba activo, F9 entra y sale sin revelar sus otros controles; **F8** sigue recuperándolos. Desde un apartado aislado la entrada se rechaza hasta volver al predio general.

Contrato para integraciones posteriores: `AtlampaControl.enterStoryMode()` exige predio general y Modo presentación ya activo; `exitStoryMode()` restaura la escena. `getState().storyMode` informa la entrada de forma inmediata; `getAvailableActions().actions` contiene `orbit`, `pan`, `zoom` y `exitStoryMode` durante Historia. Los demás controles BIM rechazados responden `story_mode_active`.

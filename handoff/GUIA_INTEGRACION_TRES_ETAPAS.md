# Guía para integrar las tres etapas sin romper el visor

**25 de noviembre de 2026 · rama de trabajo `interfaz-ux` · repositorio `TuratiGabriel/atlampa`**

Esta guía es para la IA o persona que incorpore la etapa 1 (Atlampa amplia) al visor actual. Leer el código y probar el estado real antes de editar. La rama publicada es una propuesta de colaboración: no equivale a fusionarla con `master` ni a dar por terminada la presentación.

## Qué contiene cada etapa

1. **Etapa 1:** mapa de toda Atlampa, hallazgos de investigación, espuela/título «Circuito Atlampa» y falso fallo de Jarvis. La produce otro integrante en otra computadora. Su contexto urbano completo **no estaba publicado en ninguna rama de este repositorio** al revisar las ramas el 25 de noviembre. Solicitar su fuente y revisión antes de incorporarla; no sustituir el contexto actual por una versión supuesta.
2. **Etapa 2:** el Jarvis real abre el contexto urbano, lo sostiene unos 3 segundos y se acerca a la preexistencia del predio. Se destacan cinco naves; se retiran las otras masas pero permanecen las naves y la espuela. Se crean, colorean y colocan en orden Mercado, Arte y Cultura, Industria, Vivienda y Aro; al final se restaura la escala del conjunto. Luis probó esta etapa y la considera funcional, pendiente de pulidos.
3. **Etapa 3:** desde el estado B9, cualquiera de los cinco usos puede construirse en cualquier orden mediante «Jarvis, construye/desarrolla [uso]» o botón/atajo. Cada animación reemplaza solo su volumen LOD100 por grupos BIM ya existentes. Vivienda ~31.8 s, Comercio 28 s, Industria 28 s, Arte y Cultura 29 s, Aro 15 s. Los demás usos quedan como cajas hasta construirse. Tras los cinco, «Jarvis, agrega el paisaje» muestra predio, laguna y vegetación reales. El recorrido final de una persona y varios gestos especiales siguen pendientes.

## Archivos y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `atlampa-3d-ctx.js` y `atlampa-3d-ctx.css` | Contexto urbano actual. Las ramas `master`, `arte-cultura` e `interfaz-ux` publicadas tenían el mismo contenido al revisar. Ampliarlo aquí o integrarlo de forma compatible con su API; no reemplazar el motor de Historia. |
| `atlampa-3d.js` | Geometría, cámara y animaciones de Historia y BIM. Preserva grupos de naves, vías, cajas, usos construidos y paisaje. |
| `atlampa-pagina.js` | Estado, permisos y acciones de `window.AtlampaControl`, apertura de Jarvis, panel manual, historial adelante/atrás y atajos. Es la interfaz compartida entre voz, gestos y botones. |
| `herramientas/paginas.py` | Fuente de los siete HTML y versión de recursos. Regenerar los HTML con este script después de modificar plantillas o recursos; no corregir solo `index.html`. |
| `herramientas/servidor.py` | Servidor local y lista permitida de recursos del detector web de Jarvis. Conservar la ruta `/jarvis-gesture/` y su restricción a loopback. |
| `handoff/ETAPA3_SELECCION.md`, `CONTROLES_MANUALES_HISTORIA.md`, `HISTORIA_B3_B7.md` | Contratos detallados por etapa. `PLAN_PRESENTACION_FINAL.md` contiene partes históricas que ya fueron sustituidas; consultar primero esta guía y el código. |

El código de voz, detector de manos y lanzador de Jarvis está **fuera de este repositorio**, en `C:/Users/jaroc/Documents/BIM Escena 3D/vazquez-industries/Jarvis Corporate`. El push del visor no publica ese código. Para replicar voz/cámara en otra computadora se necesita coordinar esa dependencia; el visor sí ofrece controles manuales sin Jarvis.

## Contrato que debe conservarse

- Abrir el visor directamente, sin `jarvis_kiosk` en la URL, muestra el **proyecto normal**. F9 entra/sale de Historia. F8 oculta/muestra controles de presentación sin desactivar las flechas de teclado.
- Solo el kiosco de Jarvis llama `openStoryForJarvis()` → espera `ready_to_reveal` → `revealStoryForJarvis()`. La escena se prepara oculta para que el primer modelo visible sea **contexto lejano**, nunca proyecto cercano, pantalla clay o vuelo cerca→lejos→cerca. El acercamiento empieza tras aproximadamente 3 segundos. Si se amplía Atlampa, conservar esa secuencia y comprobar rendimiento/encuadre antes de revelar.
- `AtlampaControl.getState()` y `getAvailableActions()` son la fuente de verdad. Comprobar `storyMode`, `storyStep`, `storyTransitioning`, `storyProgramPhase`, `storyBuiltUses`, `storyLandscapeVisible` y `gestureActions` antes de ejecutar una acción. Durante animaciones, la lista de gestos es vacía. No habilitar por defecto giro, zoom, selección ni arrastre en una fase que no los anuncie.
- Etapa 2: palma frontal para iluminar/descartar/crear según el estado; pinza para colocar; zoom in conocido para restaurar escala en B8. Los disparos se interpretan por estado y no deben ejecutar acciones BIM parecidas. Conservar la lógica idempotente y el bloqueo durante transiciones.
- Etapa 3: `selectStoryUse(uso)` selecciona; `buildStoryHousing/Commerce/Industry/Culture/Ring()` construyen. `storyBuiltUses` acumula los cinco usos sin depender del orden. `returnToStoryOverview()` conserva lo construido y las cajas pendientes: el antiguo gesto «reinicio» significa **volver a vista general**, nunca recargar la página. `addStoryLandscape()` solo se habilita cuando hay cinco usos construidos.
- Flechas izquierda/derecha retroceden/avanzan el **paso inmediato** aun en pantalla completa o en Modo presentación. Los botones de cada uso y paisaje funcionan sin Jarvis; en presentación están disponibles los atajos `VV`, `CM`, `IN`, `AC`, `AR`, `PS`. El historial debe registrar tanto acciones manuales como de Jarvis para que los botones no diverjan del estado de voz/cámara.
- Preservar la independencia entre Cultura y Aro, incluidos los grupos BIM `floors-aro` y `walls-aro`. Preservar las cinco naves y vías al descartar; el paisaje final solo aparece tras construir los cinco usos.

## Cómo incorporar el contexto completo de un compañero

1. Obtener la **rama/commit o archivos exactos** de la etapa 1 y comparar con `master` y `interfaz-ux`. No hay que asumir que el contexto completo ya está en la rama de Diego Chávez: sus commits publicados examinados eran principalmente de Cultura, Vivienda y visualización de usos.
2. Integrar sobre una rama nueva basada en `interfaz-ux`, manteniendo intacta la rama del compañero. Evitar copiar por completo `atlampa-3d.js` o `atlampa-pagina.js` desde una versión antigua; allí están los estados y controles de las etapas 2 y 3.
3. Definir cómo se pasa del último fotograma/cue de etapa 1 en la otra computadora al kiosco real. No iniciar automáticamente la etapa 2 al abrir `index.html` fuera de Jarvis. Confirmar que el contexto amplio funciona tanto en la apertura del kiosco como al activar «Contexto urbano» manualmente.
4. Regenerar los siete HTML, subir la versión de recursos y ejecutar `python herramientas/revisa.py --base <base-de-la-rama>`, `git diff --check` y una prueba de navegador. Como mínimo ensayar: visor normal; F9; flechas adelante/atrás de B0 a B9; los cinco usos en distinto orden; paisaje solo al final; regreso a vista general; apertura de Jarvis de lejos a cerca. El ensayo de voz/cámara requiere además el repositorio de Jarvis.
5. Revisar el diff antes de fusionar: la etapa 1 debe ampliar el contexto y los cues, sin restablecer versiones viejas de geometría, `AtlampaControl`, controles o librerías. Resolver conflictos por responsabilidad de archivo y validar juntos en el equipo real.

## Límites y estado de verificación

La preexistencia es una aproximación visual de Google Earth, no un levantamiento constructivo. El contexto urbano actual cubre pocas manzanas. Etapa 3 está implementada y tuvo verificaciones de sintaxis/estado y ensayos parciales; **no confundirlas con un ensayo final de las tres etapas en ambos equipos**. El recorrido de cierre, la etapa 1 amplia y algunos gestos de detalle todavía requieren definición e integración. No publicar `master` ni reemplazar la rama de otra persona por este push.

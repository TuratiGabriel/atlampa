# Modo historia · plan de trabajo

Estado: planificación y levantamiento inicial. Rama de trabajo: `interfaz-ux`. No publicar en `master` durante el desarrollo. Prioridad vigente de Luis: visualizar la preexistencia; voz y gestos de Historia quedan para una fase posterior.

## Objetivo

Contar, mediante la proyección 3D y gestos, la transformación del predio desde un estado preexistente documentado hasta el proyecto BIM actual. Jarvis recibe dos órdenes iniciales: «Jarvis, despliega el proyecto de Atlampa» abre el visor normal y «Jarvis, retrocede en el tiempo» entra a Modo historia. La secuencia posterior se controla con gestos, salvo nueva indicación de Luis.

## Principios de evidencia

- La escena inicial representa un **estado observado en una fecha definida**, no un terreno vacío supuesto. Cada construcción, vacío, acceso, nivel y material tendrá fuente, fecha y grado de confianza.
- El polígono y las coordenadas del visor sirven para registrar y alinear el levantamiento. `modelo/Contexto.3dm` y el modelo BIM actual describen principalmente la propuesta; no se asumirán como prueba de la preexistencia del interior del predio.
- Fuentes previstas: fotografías de Luis y Google Earth. Comparar fechas de captura y resolver discrepancias antes de modelar. No presentar alturas, cubiertas o fachadas no verificadas como exactas.
- El nivel de detalle es **esquemático**, con el mismo lenguaje visual del visor: huellas, masas, cubiertas y vacíos suficientes para reconocer qué había antes. Luis no requiere precisión constructiva en esta etapa; estimaciones breves y visibles son aceptables.
- La escena inicial de preexistencia es **toda blanca**, sin distinguir usos por color. Los colores por uso aparecerán en pasos posteriores de la narrativa, cuando Luis defina su orden.

## Secuencia de trabajo

1. **Levantamiento y primer modelo visible:** delimitar la manzana completa confirmada por Luis, trazar huellas observables y producir una volumetría esquemática del existente. Estimar alturas desde Earth 3D y usar las naves existentes del lado de Sabino como referencia confirmada por Luis. Registrar incertidumbres sin detener el primer corte por detalles constructivos. Entregable: escena visible e inventario breve de volúmenes/fuentes. Se cotejará con fotos cuando Luis las comparta.
2. **Submodo:** añadir `Modo historia` dentro del modo presentación. Debe poder entrar/salir sin perder la vista BIM normal. La segunda orden de Jarvis, «retrocede en el tiempo», activará el submodo en una fase posterior. Por ahora la entrada de prueba puede ser local; al entrar debe mostrar la preexistencia levantada y un estado legible para el futuro controlador de gestos.
3. **Guion de transformación:** después del levantamiento, Luis fija el orden de remover, conservar, transformar y agregar. Cada paso tendrá estado inicial/final, objeto afectado, duración y cámara.
4. **Animación e interacción:** una vez aprobado el guion, definir gestos disparadores y de retroceso, pausas y reinicio. Convertirlo en etapas reproducibles y reversibles; una acción por gesto confirmado, con bloqueo durante transiciones.
5. **Ensayo integrado:** probar cada etapa con teclado/control sintético y luego cámara real de la presentación. Verificar continuidad visual, ausencia de geometría fantasma, recuperación tras gesto equivocado y traspaso al visor BIM actual.

## Fronteras entre chats

- **BIM3D-Visualizador:** levantamiento técnico, coordenadas, geometría, estados y submodo `Modo historia`; HTML generado desde `herramientas/paginas.py`.
- **BIM3D-Presentación:** apoyará el guion y la gramática de gestos después del levantamiento. No editar el motor del visor sin coordinación.
- **BIM3D-Jarvis:** conservar la orden de despliegue; la integración de «retrocede en el tiempo» queda pendiente hasta que exista preexistencia visible. No añadir comandos de voz para avanzar la secuencia.
- **BIM3D-Asesor:** coordinar contratos, preguntas, dependencias, revisión cruzada y seguimiento de rama/PR.

## Primer corte verificable

El primer corte debe mostrar huellas y volúmenes del estado actual respaldados por Earth/fotos, etiquetando estimaciones y vacíos de información. No se aceptará una escena vacía como resultado final del Paso 1. El submodo puede existir en estructura, pero la voz y los gestos de Historia no se activarán todavía. El paso al proyecto actual conservará el contrato existente del visor.

## Datos pendientes de Luis

- Ruta de las fotos y fecha aproximada de captura; predio exacto para contrastar Google Earth.
- Gesto deseado para cada transformación, que Luis irá definiendo.
- Orden narrativo y definición de lo que se conserva, demuele o transforma.

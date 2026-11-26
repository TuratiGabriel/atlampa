# Presentación final Atlampa · plan de producción

**Estado vigente al 25 de noviembre:** consultar primero [CONTINUIDAD_ETAPA3.md](CONTINUIDAD_ETAPA3.md). Las descripciones de gestos y pendientes de etapa 2 más abajo son antecedentes del plan original; Luis ya probó y dio por funcional esa etapa.

Estado: plan en definición, 24 de noviembre de 2026. Presentación final **miércoles 2 de diciembre, 16:00 CDMX**; duración total prevista **10–15 minutos** y ensayos lunes 30 de noviembre y martes 1 de diciembre. Rama de trabajo `interfaz-ux`. Los gestos físicos, tiempos y trayectorias concretas se cerrarán con los videos de Luis. Este documento no autoriza implementar todos los bloques de una vez.

## Objetivo escénico

La exposición pasa de una proyección convencional sobre toda Atlampa a un mueble con proyección 3D. La historia muestra la preexistencia del predio, distingue lo conservado, retira lo demás, coloca cinco volúmenes de programa y permite que el público elija en qué orden esos volúmenes se convierten en el proyecto arquitectónico. Esa elección en vivo debe funcionar en cualquiera de los órdenes posibles.

## Guion de estados

| Estado | Imagen y acción | Disparo previsto | Salida verificable |
| --- | --- | --- | --- |
| A0 · Atlampa amplia | Contexto de toda la colonia en la computadora de proyección convencional de otro integrante del equipo | Operador abre el visor | Mapa completo encuadrado |
| A1–A4 · investigación | Señalar asentamientos irregulares al sur, sitio de balacera, ausencia de oferta de arte y cultura, ausencia de áreas verdes | Animaciones del guion de etapa 1 | Cada marca aparece en su lugar y se retira sin dejar residuos |
| A5 · Circuito Atlampa | Resaltar la espuela y mostrar el título | Animación final de etapa 1 | Espuela/título legibles |
| A6 · falso fallo | Voz pregrabada de Jarvis, una orden aparente exitosa y otra fallida; apagón simulado | Cue escénico | Proyección convencional apagada y mueble 3D destapado |
| B0 · predio existente | El mueble abre la preexistencia blanca; un encuadre amplio de Atlampa seguido de acercamiento es una opción a evaluar por rendimiento y lectura | Propuesta: «Jarvis, despliega el proyecto de Atlampa» inicia apertura y acercamiento | Predio preexistente listo para narrar, sin mostrar primero la propuesta |
| B1 · conservar | Las cinco naves grandes que se conservan se iluminan más: dos al noreste y tres al sureste | Cue por precisar | Cinco naves destacadas; lo demás aún visible |
| B2 · retirar | En una sola acción se eliminan todas las construcciones que no continúan; quedan las cinco naves y las vías originales | Primer gesto nuevo, metáfora de tirar a la basura | Predio despejado salvo conservados; acción reversible para ensayo |
| B3–B7 · programa | Volúmenes LOD100 con color de uso en orden fijo: Mercado, Arte y Cultura, Industria, Vivienda (dos cajas), Aro (dona) | Por cada uso: juntar ambas manos crea el volumen de abajo hacia arriba; después una pinza de una mano lo coloca en su posición. Los desplazamientos amplios son actuación, no señales | Cinco usos en posiciones definitivas, sin detalle arquitectónico |
| C0 · elección | El público elige cualquiera de los cinco usos | Pregunta de presentadores | Cinco cajas disponibles y ninguna construcción detallada iniciada |
| C1–C5 · construcción | «Jarvis, construye [uso]» transforma solo la caja elegida en el proyecto real; una orden por cada uso que el público escoja | Voz obligatoria y gestos de apoyo por definir | Conjunto de usos construidos aumenta en uno; los restantes siguen como cajas |
| C6 · cierre | Cámara sigue el día a día de una persona que vive en el proyecto | Cue final por definir | Recorrido de conclusión legible y salida controlada |

La etapa 3 se modelará como un conjunto de usos ya construidos, no como cinco órdenes fijos. `buildUse(uso)` solo se permite para una caja disponible; una repetición no duplica geometría. Al terminar una animación, la escena queda quieta mientras los presentadores hablan. Las órdenes de voz, gestos y botones de respaldo llamarán a las mismas acciones del visor. Habrá pausa, reanudación, retroceso de ensayo y recuperación de escena sin recargar toda la presentación. La geometría actual ya agrupa las cinco naves conservadas como `G.NAVES[0]` con tres crujías al sureste y `G.NAVES[1]` con dos al noreste.

**Aclaración del árbol de decisiones del 24 de noviembre:** el nodo rotulado «Reinicio» en cada rama de uso significa **«Volver a la vista general»**. Cierra la exploración de ese uso, lo deja construido y habilita la siguiente elección del público; no deshace el uso ni reinicia toda la presentación. Los presentadores evitarán pedir por voz un uso ya desarrollado. Los cinco usos deberán terminar construidos antes de «Jarvis, muestra la vida de un habitante del proyecto». Los gestos nuevos y animaciones particulares de cada rama se definirán conforme Luis entregue sus detalles.

**Regla de gestos por estado:** el árbol es una lista de permisos, no solo una guía visual. Un gesto que no aparezca en el estado activo no se reconoce ni modifica la escena, aunque ese mismo movimiento tenga otro significado en un estado posterior. En B0, antes de colorear, solo se admite la salpicadura; en B1, después de colorear y antes de retirar, solo el puño que inicia el descarte; durante las animaciones no se admite otro gesto. En B2, después del descarte, no se habilitan gestos BIM mientras se define el gesto de colocar cajas. Esto sustituye el permiso anterior de giro/zoom en la preexistencia para estos estados. La salida manual o por voz de Historia permanece como recuperación operativa. Luis podrá ampliar los permisos de una etapa más adelante; cada ampliación deberá quedar explícita en el árbol y en el contrato del visor/Jarvis.

**Contrato de B3–B7:** se repite la pareja `crear → colocar` exactamente cinco veces en el orden fijo. En espera de crear, solo se reconoce la convergencia de ambas manos; en espera de colocar, solo la pinza existente de una mano. Una pose sostenida no cuenta dos veces ni adelanta al siguiente uso. Vivienda crea y coloca sus dos cajas como una unidad de programa; Aro usa anillo volumétrico. Cada pieza tiene huella y altura aproximadas del proyecto real, color de uso y ningún detalle de fachada.

Tiempo escénico provisional para caber en 10–15 minutos: etapa 1, 2–3 minutos; etapa 2, 3–4 minutos; elección y cinco transformaciones, 4–6 minutos; cierre, 1 minuto. Luis ajustará los tiempos al grabar videos y ensayar texto. Ninguna animación avanzará por sí sola al siguiente estado narrativo mientras el equipo esté hablando.

## Pruebas de aceptación por etapa

- **A→B:** el apagón falso no interrumpe el equipo del mueble; la orden real muestra preexistencia y llega a un encuadre estable. Hay disparador manual si la voz falla.
- **B1/B2:** exactamente las cinco naves se destacan; un gesto confirmado retira el resto una sola vez y conserva vías. Repetir el gesto no elimina más elementos.
- **B3–B7:** cada uso requiere dos disparos distintos: manos juntas para crecer desde el suelo y pinza para colocar. Siempre se sigue el orden acordado; una pose sostenida no adelanta otra fase ni otro uso. Vivienda conserva dos cajas, Aro conserva el hueco de la dona y un sexto intento no cambia la escena.
- **C1–C5:** cualquiera de los cinco usos puede ser la primera elección. Cada animación cambia solo su caja, conserva las demás y termina en estado estable. Probar cinco primeras elecciones y varias secuencias completas con órdenes diferentes.
- **C6:** recorrido final legible a distancia de proyección; salida y recuperación de escena verificadas.
- **Sistema:** voz, cámara y controles manuales llegan al mismo estado observable; error, pausa o doble orden no duplican geometría. Registrar versión y copia que arranca sin red externa.

## Contratos y responsables

- **BIM3D-Presentación:** guion de cues, tiempo de cada intervención, gramática física de gestos a partir de videos, marcas para operadores, ensayo escénico y transiciones entre las dos computadoras. No edita la geometría del visor.
- **BIM3D-Visualizador:** estados B/C, geometría de conservar/retirar, cajas, transformaciones independientes de los cinco usos, cámaras y animaciones. Publica acciones y estado por `AtlampaControl` para Jarvis y controles manuales.
- **BIM3D-Jarvis:** órdenes reales de voz de B/C, reconocimiento de gestos, bloqueo por etapa y confirmación de resultado. Espera el contrato del visor antes de conectar cada acción. La voz falsa de A6 será un recurso pregrabado separado del Jarvis real.
- **BIM3D-Asesor:** conserva una sola tabla de decisiones y preguntas, prioriza unidades pequeñas, revisa integración y coordina pruebas/ramas. El chat Técnico existente apoyará montaje, arranque, respaldo y ensayo integrado si hace falta; no se abre otro chat por ahora.

La etapa 1 se operará desde la computadora de otro de los cinco integrantes. Aún hay que repartir dentro del equipo la producción del mapa, las marcas, el audio falso y el video/animación de apagón. Su entrega al equipo BIM3D debe incluir último fotograma/encuadre, duración, cue de apagón y señal para destapar el mueble. Las afirmaciones localizadas se verificarán antes de presentarlas como hechos.

## Orden de construcción

1. **Cerrar guion y contrato técnico:** confirmar calendario, dos equipos, objetos conservados, señales entre A/B y mapa de cajas a IDs del modelo actual. Preparar storyboard y lista de assets, sin editar gestos todavía.
2. **Motor de estados y recuperación:** implementar B0–C6 con estado observable, acciones idempotentes, bloqueo durante animación, controles manuales ocultos y forma de volver al último estado estable.
3. **Etapa 2 visual:** conservar, retirar y colocar cinco cajas en orden fijo. Cada cambio se coteja con la escena antes/después y con la geometría actual.
4. **Etapa 2 en vivo:** conectar el gesto de retirar y el disparo de cada caja una vez recibidos los videos. Probar falsas activaciones y el caso de retirar las manos mientras se habla.
5. **Etapa 3 visual:** transformar cada uso en forma aislada; verificar los cinco como primera elección y varias permutaciones completas. Las cajas no elegidas siguen intactas.
6. **Etapa 3 en vivo y cierre:** conectar «construye [uso]», gestos por uso y recorrido final. Mantener botón de respaldo por cue.
7. **Ensayo integral:** dos equipos, proyector y mueble reales; arranque desde cero, flujo completo, prueba de voz/cámara, recuperación ante fallo y pasada con elección imprevisible del público. Congelar la versión probada y guardar copia recuperable.

Una unidad de implementación a la vez cuando comparta el visor; Presentación puede preparar cues sin editar código. Cada unidad termina con contrato, prueba dirigida y breve evidencia compartida, evitando repetir inventarios o preguntas en otros chats. No push/merge a `main` sin instrucción expresa.

## Calendario provisional y puerta de alcance

El plan corporativo anterior sitúa la congelación el 27 de noviembre. El evento real será el 2 de diciembre a las 16:00 y los ensayos completos están previstos el 30 de noviembre y 1 de diciembre. La nueva narrativa amplía el alcance: proponemos un **candidato funcional** antes del primer ensayo y congelar la versión probada después del ensayo del 1 de diciembre, salvo que Luis mantenga la fecha anterior. Prioridad si el plazo aprieta: (1) transición A→B y etapa 2 completa, (2) etapa 3 con cinco elecciones independientes y controles de respaldo, (3) cierre cinematográfico, (4) pulido de animación. No se declarará completo un estado solo por tener una maqueta visual.

| Fecha | Resultado objetivo |
| --- | --- |
| 24 nov | Cerrar cue A→B, inventario de elementos conservados/retirados, gramática inicial y storyboard con responsables. |
| 25 nov | Motor de estados B/C y controles manuales de recuperación; primer corte visual B0–B2. |
| 26 nov | Cinco cajas y gesto repetido de B3–B7; primera transformación aislada de etapa 3. |
| 27 nov | Cinco transformaciones independientes y voz `construye [uso]` conectada; candidato funcional con controles de respaldo. |
| 28–29 nov | Pulido visual, recursos del cierre y revisión de secuencias. El calendario vigente de Jarvis reserva el domingo libre; cualquier cambio de código Jarvis en fin de semana requerirá indicación expresa de Luis. |
| 30 nov | Ensayo completo con ambas computadoras y mueble; registrar fallos y contingencias. |
| 1 dic | Segundo ensayo, correcciones indispensables, copia de respaldo y congelación de versión probada. |
| 2 dic, 16:00 | Presentación; prueba corta de arranque antes de público y soporte. |

## Decisiones pendientes de Luis

1. Probar si el mueble 3D comienza con toda Atlampa o con un entorno amplio más ligero; esta opción no bloquea la escena del predio. La primera orden real se propone como apertura directa de preexistencia con acercamiento.
2. Cue exacto entre el apagón simulado en la computadora del compañero, destape del mueble y primera orden real.
3. Reparto y formato de entrega de la etapa 1 en la computadora del compañero.
4. Videos de los gestos de retirar y colocar caja; duración, umbral de activación y postura de reposo.
5. Secuencia por cada uso en etapa 3: qué parte se detalla, duración, cámara, gestos de apoyo y explicación hablada.
6. Trayectoria y recursos del recorrido final de la persona y solución manual ante una orden no reconocida.

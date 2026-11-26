# Modo historia sin Jarvis — 25 nov 2026

Abrir `index.html` muestra el proyecto habitual. F9 entra o sale de Historia sin activar Modo presentación. El panel manual aparece abajo a la izquierda; las flechas de pantalla y las teclas izquierda/derecha avanzan o retroceden un paso estable a la vez. Durante una animación se bloquea el siguiente paso. Retroceder restaura inmediatamente el estado anterior; avanzar después repite su animación. El historial incluye acciones lanzadas por Jarvis o por controles manuales y las construcciones de Etapa 3 en el orden en que se hayan ejecutado.

Etapa 2: iluminar cinco naves → retirar las demás construcciones → crear y colocar cada una de las cinco cajas → restaurar escala. Cada avance se hace con la misma flecha derecha; izquierda regresa al paso previo.

Etapa 3: desde B9 los botones Vivienda, Comercio, Industria, Arte y cultura y Aro seleccionan y construyen directamente el uso elegido, en cualquier orden. Paisaje se habilita solo cuando los cinco están construidos. La flecha izquierda deshace la última construcción terminada y conserva las demás; la derecha la puede repetir. Las cajas pendientes permanecen.

F8 alterna Modo presentación sin salir de Historia. Ese modo oculta el panel, pero deja activos izquierda/derecha y los atajos de dos letras: `VV` Vivienda, `CM` Comercio, `IN` Industria, `AC` Arte y cultura, `AR` Aro, `PS` Paisaje. La pareja se teclea seguida, con menos de 850 ms entre teclas. Los atajos también funcionan fuera de pantalla completa porque el receptor está en el documento, no en un botón con foco.

Validación: `herramientas/revisa.py --base HEAD` OK, `node --check` y `git diff --check` OK. En navegador sin Jarvis/cámara: F9 mostró el panel; se recorrió Etapa 2 completa con flechas; izquierda volvió al paso anterior de caja; botón Comercio construyó y se deshizo; `VV` construyó Vivienda con F8 activo y se deshizo; izquierda funcionó con botones ocultos. Pendiente ensayo humano de todos los atajos y órdenes mixtas de Jarvis.

Cambios locales en rama `interfaz-ux`; sin commit, push, merge ni Revit. Respaldos previos en `handoff/backups/2026-11-25-controles-manuales/`.

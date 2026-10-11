# Industria: por dónde empezar

## Estado actual
- En el visor es un prisma simple. Sale de la capa `industry_bake - Copy` de `Contexto.3dm` vía `prepara-modulos.py`
  (`MOD.industria`: planta, z0 +0.51, z1 +7.92).
- En `atlampa-3d.js` busca `/* ===== 4. Industria`. También aparece en el corte en planta, en el esquema compositivo y en los apartados.
- Papel `'industria'`, color `#d2d4d8`, espacio privado.
- La ficha de `paginas.py` dice "La nave industrial": está por escribir.

## Plan (igual que el mercado; lee `mercado.md`)
1. Lee con rhino3dm el archivo del usuario (`Rhino/Industria.3dm`, en el sistema de Contexto.3dm). Lista sus capas y pídele que
   las ordene en `Layer 01::INDUSTRIA::<nave>::<parte>`. Comprueba que calce con la industria de Contexto.3dm (< 1 cm).
2. Crea `herramientas/prepara-industria.py` (copia la estructura de `prepara-mercado.py`) y genera `atlampa-industria.js`.
   Se dibuja sólo con `ESC === 'industria'`; la general queda con el prisma.
3. Primera ronda de preguntas: qué tipo de industria, qué programa y qué quiere ver primero.
4. Después la estructura: acero independiente que rigidiza lo existente.
5. Al final el programa interior. Busca normativa específica de industria (andenes, carga, ventilación, salidas) y cítala.
6. Partes para aislar: muros por lado y cubierta por faldón.

## Primeros archivos a leer
- `atlampa-3d.js`: el bloque de industria y el bloque `if (MERCADO)`.
- `prepara-mercado.py`.
- `paginas.py`.

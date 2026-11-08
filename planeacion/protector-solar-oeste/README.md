# Protector solar de la fachada oeste

Medio cilindro sobre cada ventana de la vivienda (versión v3n: 336 ventanas, 435 cilindros). La fachada mira a rumbo 300°.

## Pieza elegida

- **Lámina vertical** de −15° a +45° (0° mira hacia afuera; positivo es norte), a toda la altura de la ventana.
- **Sin tapa inferior.**
- **Cubierta** de lámina plegada, con caída hacia la mitad del arco (+15°), gotero y labio de salida del agua.
- **Radio** según el ancho de la ventana: un cilindro por cada 0.90 m, aproximadamente.

**Medido para toda la fachada**, con rayos paralelos, el edificio real y las piezas vecinas, en cielo despejado:

| Verano bloqueado | Invierno entra | Luz | Vista |
|---|---|---|---|
| 52% | 85% | 63% | 61% |

Luz y vista son estimaciones.

## Dos versiones

- **A, lámina curva:** arco de 60°.
- **B, lámina quebrada:** los mismos extremos, con un pliegue de 135° hacia el edificio en la mitad del arco. El agua cae en ese pliegue.

La versión B no se ha medido contra el sol.

## Archivos

- `axono_A_general.png`, `axono_B_general.png`: axonométrica de la vivienda con el protector, 21 de junio a las 17:00, con la sombra de un solo vector de sol.
- `axono_A_detalle.png`, `axono_B_detalle.png`: acercamiento a la torre.
- `dwg/protector_A_curva.dwg`, `dwg/protector_B_quebrada.dwg`: protector para una ventana de 1000 × 800 mm. Incluyen axonométrica, frente, perfil, planta, corte por fachada y especificación, en mm y a escala real.
- `dwg/vistas_sueltas/`: cada vista en su propio archivo, para vincularla en Revit.
- `dwg/protector_modelo_3D.dwg`: las dos versiones en sólidos.
- `fuentes_materiales.md`: respaldo de la especificación, con lo que falta verificar.

## Pendiente

- **Cálculo estructural:** perfiles y anclajes son tentativos.
- **Normativa:** viento y sismo con las NTC vigentes; reacción al fuego exigida en CDMX.
- **Revit:** los DWG se comprobaron reabriéndolos en Rhino, pero no se han abierto en Revit ni en AutoCAD.
- **Mantenimiento:** el fabricante pide inspección anual y limpieza; la pieza no queda libre de mantenimiento.
- **Visor 3D:** el protector no está en el visor, porque sus módulos no tienen ventanas.

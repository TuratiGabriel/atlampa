# Sitio y coordenadas

## Transformación Rhino → visor
`Contexto.3dm` (mm) → visor (m):
- u = x/1000 + 503.255
- v = y/1000 + 404.153
- z = z/1000 + 0.11

El 0.00 de Rhino queda en z 0.11 del visor. El predio del visor está a +0.20 y las calles a 0.00.

## Sitio
- El sitio del visor es **el de Gabriel en Rhino**, no el del satélite. Capas: `site::polygon` es el predio, un cuadrilátero con el
  lado sur inclinado, de (448.08, 322.23) a (558.95, 488.27). Capa `site` es la banqueta: anillo de 1.80 m por fuera, a +0.20.
- En `atlampa-geo.js` están `PRED`, `GUP` (polígonos), `PB`/`GU` (sus cajas) y `G.recortaConvexo`. `CEN` queda fijo en
  (503.6, 402.05) para no mover la cámara, el sol ni el minimapa.
- Heliotropo ya no es calle: es parte del predio y paso de la espuela.
- Las calles de CADMapper en Rhino no cuadran con el sitio. Lo de enfrente sigue saliendo del satélite. Los edificios del contexto
  son exactos de `Contexto::buildings`.
- En Rhino las calles están a −0.52. El visor se quedó con calle 0.00 (sin confirmar con Gabriel si ese escalón es intencional).

## Pasos de programas que no usan la transformación general
- Módulos: DU/DV/DZ = 497.9956 / 392.0994 / 7.16. Toman la posición del gemelo de cada módulo en Contexto.3dm.
- Arte y cultura: 497.9986 / 392.0954 / 0.52.
- Estacionamiento: TU/TV = 447.9256 / 322.9694.
- La chimenea sigue con el paso viejo (497.59, 391.73) +0.2.

## Ojo
Si abres un `.3dm` por MCP, Rhino lo alinea por Earth anchor y las mallas (float32) se redondean a 1.024 m.
Usa rhino3dm, o iguala el `EarthAnchorPoint` antes de abrir.

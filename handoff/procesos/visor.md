# Visor 3D (`diagrama/`, repo github.com/TuratiGabriel/atlampa)

## Archivos
| Archivo | Qué es |
|---|---|
| `atlampa-3d.js` | Motor Three.js 0.170 (de `lib/`, por importmap). Arma piezas, estilos, apartados, aislar y diagramas. |
| `atlampa-geo.js` | Geometría compartida: predio, aro, `G.pares`, recortes. |
| `atlampa-pagina.js` | Tablero. Cambia de apartado sin recargar (pushState) y conserva las capas en sessionStorage. |
| `herramientas/paginas.py` | Genera `index.html` y cada apartado (ficha: título, desc, datos). No edites los HTML a mano. Tiene `V`, la versión que hay que subir. |
| `herramientas/servidor.py` | Servidor local sin caché, puerto 8130 (`.claude/launch.json`). |
| `herramientas/ramas.py` | Estado de las ramas, ver cualquier rama (o todas mezcladas) en local y mezclar sin pelear con `V` ni las páginas. Ver `ramas-y-version-local.md`. |
| `herramientas/revisa.py` | Revisión antes de subir (< 1 s): conflictos, sintaxis, páginas al día, archivos que pide el sitio, `programa/` y, con `--base origin/master`, que `V` haya subido. Corre sola en cada PR (`.github/workflows/revisa.yml`). |
| `lib/` | Three.js 0.170.0 y los complementos que se usan, copiados del paquete de npm. El sitio no depende de ningún CDN. |

Three.js va en `lib/` (2026-10-13): el sitio funciona sin internet. Si un script necesita otro complemento (`three/addons/…`), cópialo de
`three@0.170.0/examples/jsm/` a `lib/three-0.170.0-addons/` con la misma ruta; `revisa.py` avisa si falta.
Vercel no publica `*.3dm`, `herramientas/`, `handoff/` ni `.github/` (`.vercelignore`).

## Tablero (igual en todas las páginas)
- El modelo ocupa la pantalla completa.
- Menús arriba a la derecha:
  - **Propuesto:** inspeccionar u ocultar cada parte.
  - **Capas:** paisaje, sol, contexto, módulos, estructura.
  - **Diagramas:** Nolli, esquema compositivo, corte a 1.75.
  - **Vista:** Color, y Resaltar uno a la vez (público/privado, vivienda, comercio, cultura, industria).
  - **Apartados** y **Leyenda**.
- Minimapa y zoom en la esquina; ficha del apartado a la izquierda.
- Cambiar de apartado sólo cambia la ruta y la ficha: **no** cambia la configuración del usuario.
- Cámara libre como en Rhino: orbitar, mover sin topes y zoom hacia el cursor.
- **Aislar** (doble clic): cada parte es una pieza suelta. Clic la selecciona (velo rojo), TransformControls la mueve, H la oculta y Esc la suelta.
  No se guarda nada.

## Cómo entra un programa
1. Su script genera `window.ATLAMPA_<PROG>`.
2. En `atlampa-3d.js`: `const X = ESC === '<apartado>' ? DATOS : null`. Arma con `pieza('<prog>-<parte>', '<programa>', orden)`
   y registra partes con `parte(...)`. Modelo a seguir: bloque `if (MERCADO)`.
3. En `paginas.py` añade el script y la ficha, y sube `V`.

## Estilo (no inventes otro)
**Ojo (2026-10-13):** con `interfaz-ux` («Renueva visor con estilo clay editorial») el tablero pasó a fondo claro y volúmenes con color.
Lo de abajo es el estilo anterior y está por actualizar: antes de tocar el estilo, mira `atlampa.css` y la paleta de `atlampa-3d.js`.

- Fondo negro. Volúmenes negros **sin relleno**, sólo aristas a mano (el trazo se pasa de las esquinas). Blanco a .72.
- Jerarquía por línea: el proyecto grueso, lo que acompaña gris y delgado, el contexto más delgado.
- **Nada transparente:** lo ajeno va opaco y apagado. Resaltar deja lo demás al 15 %.
- Colores de programa, siempre ≤ 34 % mezclados con el gris:

  | Programa | Color |
  |---|---|
  | vivienda | `#ff5cb0` |
  | comercio | `#8a98ff` |
  | industria | `#d2d4d8` |
  | cultura | `#c9a6ff` |
  | público | `#ff6f63` |
  | verde | `#a8e063` |
  | agua | `#8fd0ff` |
  | aro | `#f2c14e` (nunca se apaga) |

- La industria y la vivienda son espacio privado; lo demás es público.
- Sin rótulos dentro del predio; las cotas van en cortes.
- Árboles y personas son croquis existentes (siluetas distintas entre sí). Usa los que hay.
- Esquema compositivo: sólo líneas 2D blancas, un acento rojo y el modelo muy tenue.

## Rendimiento
El SVG daba 10–15 fps; por eso se migró a WebGL. Para que la carga se sienta ligera, el contexto se arma en tandas y las piezas se guardan en caché.

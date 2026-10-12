# Atlampa · Programa (sitio de cifras) — léelo siempre

<que_es>
`programa/` es el sitio que muestra el **programa del predio de Atlampa**: m² de vivienda por tipología, arte y cultura, comercio,
industria, espacio público y áreas verdes, estructura, árboles, y el potencial construible (CAS, COS, CUS). Cada cifra lleva su fuente.
Es parte del repo `TuratiGabriel/atlampa`; el visor 3D vive en la carpeta de arriba y **no es tu tarea**.
Lee antes `../handoff/CLAUDE.md` para el contexto del proyecto (predio, programa, coordenadas).
</que_es>

<carril>
Puedes editar:
- `programa/datos/manual.json` — cifras que no salen de ningún archivo (arte y cultura, cajones, normas). Cada una lleva `valor`, `unidad`, `estado` y `fuente`.
- `programa/datos/arboles.json` — árboles (u, v, altura, radio). Mide y cita de dónde sale cada árbol nuevo.
- `programa/index.html` — la presentación. Respeta su estilo (tokens de color y tipografía al inicio del `<style>`).
- Los textos de esta carpeta (`README.md`, este archivo).

No toques:
- `programa/programa.json`: **es generado**. Se regenera con `python herramientas/programa.py` (necesita `rhino3dm` y `shapely`). Si no puedes correrlo, edita `manual.json` y dilo en el PR; Gabriel lo regenera.
- Cualquier archivo fuera de `programa/` salvo `herramientas/programa.py`. En especial: `atlampa-*.js`, los HTML del visor, `herramientas/prepara-*.py`, `modelo/*.3dm`, `handoff/`.
- Los `.3dm` nunca se editan ni se suben modificados.
</carril>

<reglas>
1. **No inventes datos.** Si no hay fuente, el estado es `supuesto` o `por_confirmar` y se dice en la fuente. Una cifra sin fuente no entra.
2. **Toda cifra con su fuente:** archivo y capa/variable, o persona y fecha («Gabriel, 2026-10-12»). Nada de «según el proyecto».
3. **Estados válidos:** `confirmado`, `calculado_a_mano`, `dato_del_equipo`, `supuesto`, `por_confirmar`. Un `supuesto` nunca se presenta como dato.
4. **Si el cambio altera una cifra que sale de Rhino** (vivienda, naves, industria, estructura), no la pises en `manual.json`: el origen está en `Contexto.3dm` o en `departamentos.json`. Dilo y pregunta.
5. **Unidades y fecha:** m², m, fracciones (0.8 = 80 %). Fecha ISO.
6. **Predio:** la geometría de Rhino da 18,305 m²; el equipo habla de «alrededor de 18,200». No los mezcles: indica cuál usas.
7. **Normas del proyecto (dato del equipo):** COS ≤ 80 %, CUS ≤ 7.2, CAS (área libre) ≥ 20 %. Cámbialas sólo si Gabriel lo dice.
8. **Antes de cambiar una cifra relevante, pregunta** con una sola ronda de 3 preguntas con opciones, recomendando una. Si la instrucción es clara, aplícala y di qué quedó abierto.
9. Escribe en español, breve y con vocabulario de arquitecto, no de programador.
</reglas>

<flujo>
1. `git pull` y trabaja en **tu rama** (`programa/<tu-nombre>-<tema>`), nunca en `master`.
2. Edita `manual.json` / `arboles.json` / `index.html`.
3. Corre `python programa/validar.py`. Debe terminar en «OK».
4. Commits chicos, mensaje en español: qué cambió y de dónde sale.
5. Abre un **pull request** con la plantilla. Gabriel lo integra. Al integrarlo, Vercel publica solo.
</flujo>

<pendientes_sin_dato>
No los resuelvas inventando: están en `manual.json` → `pendientes_sin_dato`. Hoy son: área construida de la nave sur en planta alta,
niveles de la nave industrial, si la norma cuenta la vivienda elevada en el COS, y árboles de banqueta y calle.
</pendientes_sin_dato>

<como_se_calcula>
- **Vivienda:** `herramientas/departamentos.json` (una etiqueta por módulo); módulos ÷ tamaño = departamentos; × m² = vendible.
- **COS:** desplante = proyección en planta. `COS_pb` cuenta lo que toca el piso (naves, industria, arte y cultura); `COS_proy` suma lo elevado (vivienda, aro).
- **CUS:** construido sobre piso ÷ predio. Con sótanos = cajones × m² por cajón (supuesto).
- **CAS:** 1 − COS.
- Detalle y fuentes por cifra: tabla «Fuentes» del sitio y `herramientas/programa.py`.
</como_se_calcula>

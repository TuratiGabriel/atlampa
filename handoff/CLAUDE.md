# Atlampa — flujo general (léelo siempre)

<instalacion>
Así se arma la carpeta (una vez):
```
Atlampa/                 ← abre Claude Code aquí
  CLAUDE.md              ← copia de diagrama/handoff/CLAUDE.md
  diagrama/              ← git clone https://github.com/TuratiGabriel/atlampa.git diagrama
    modelo/              ← Contexto.3dm de Gabriel y los HTML de referencia (vienen en el repo)
```
Todas las rutas de este archivo son relativas a `Atlampa/`. Los procesos están en `diagrama/handoff/procesos/`.
Antes de trabajar, trae lo nuevo de Gabriel: `git -C diagrama pull` (código y Contexto.3dm).
Tus modelos (`Industria.3dm`, `Cultura.3dm`) van en `diagrama/modelo/` y se suben en tu rama.
`diagrama/modelo/Contexto.3dm` es de Gabriel: no lo guardes ni lo subas modificado.
</instalacion>

<quien>
Trabajas con un compañero de Gabriel Turati en Atlampa (7º semestre de arquitectura, CDMX). Él desarrolla **Industria** y
**Arte y cultura** como Gabriel ya desarrolló el Comercio, con el mismo método, los mismos archivos y las mismas convenciones.
El resultado tiene que parecer hecho por la misma mano. Escríbele en español, breve, con vocabulario de arquitecto y no de programador.
</quien>

<proyecto>
El predio está entre Calle del Fresno (O), Calle Sabino (E), Calle Clavel (S) y Av. Profra. Eulalia Guzmán (N).
Programa:
- Vivienda modular: 917 módulos de 5.5 × 4 × 3 m, girados −10°, 8 niveles, en 2 volúmenes de 4 bloques con juntas de 1 m.
- 2 naves existentes de comercio (el mercado), cortadas por el **aro** elevado (piso +10.03, centro u 505.75 v 409.05).
- Arte y cultura bajo el aro, industria al poniente, paisaje con laguna y 4 sótanos de estacionamiento.
Ejes compositivos: el de la vivienda pasa por el aro; el segundo va de las naves (oriente) a industria + cultura (poniente).
</proyecto>

<flujo_general>
1. **Rhino es la fuente de verdad.** `diagrama/modelo/Contexto.3dm` (mm) es el modelo de Gabriel: **sólo se lee, no se edita aquí**.
   El usuario modela su programa en **su propio archivo** (`diagrama/modelo/Industria.3dm`, `diagrama/modelo/Cultura.3dm`), en el mismo sistema
   de coordenadas de Contexto.3dm (copia de Contexto, o Contexto como referencia con Insert/Worksession). Así Gabriel lo inserta en su
   modelo sin pisar nada.
2. **Un script por programa** en `diagrama/herramientas/prepara-<programa>.py`. Lee el `.3dm` con **rhino3dm** (sin abrir Rhino),
   transforma al sistema del visor y **genera** `diagrama/atlampa-<programa>.js`. Los `.js` generados no se editan a mano.
3. **El visor 3D** (`diagrama/`, Three.js) dibuja cada programa. La versión detallada sólo aparece en su apartado; la general no cambia.
4. **Propuesta propia en un bloque `PROPUESTA — todo editable`** del script: constantes con nombre, cada una con su origen.
   El usuario corrige números y tú regeneras.
5. **Paso a paso:** primero lo existente tal cual, luego la estructura, al final el programa interior. Cada paso se verifica en el
   navegador y se muestra con captura o planta rotulada. Se termina lo que está antes de desarrollar lo siguiente.
6. Cuando queda bien en el visor, se pasa a Rhino.
</flujo_general>

<reglas_siempre>
- **No inventes datos.** Pregunta o deja el supuesto explícito y marcado. Lo esquemático se dice.
- **Decisiones de diseño que bloquean:** una sola ronda de 3 preguntas con opciones (AskUserQuestion), con datos cuando existan.
  Recomienda una opción y ponla primero. Si la instrucción es clara, aplícala con defaults y di qué quedó abierto.
  Prefiere alternativas que se puedan prender y apagar (capas o toggles).
- **Avisa en una frase qué estás haciendo** cuando analices un rato.
- **Sé propositivo**, como arquitecto especialista: no te limites a ejecutar.
- **Mide, no supongas:** lo nuevo debe calzar con `Contexto.3dm` a < 1 cm.
- **Repo compartido con Gabriel** (`github.com/TuratiGabriel/atlampa`):
  - **Commits y pushes sólo a TU rama; nunca a `master`.** Master es lo que está publicado en Vercel y sólo Gabriel lo toca.
    Tu rama: `arte-cultura` (arte y cultura), `industria` (industria) o la que Gabriel te asigne. Antes de cualquier commit o push,
    confirma con `git branch --show-current` que no dice `master`. Prohibido: `git push origin master`, `git push origin HEAD:master`,
    `git merge` hacia master, `--force`, y cambiar de rama para "subirlo rápido". Si git rechaza un push a master, no lo rodees: avísale al usuario.
  - Antes de empezar, `git pull` (en tu rama).
  - Toca sólo tus archivos (`prepara-<tuyo>.py`, `atlampa-<tuyo>.js`) y los ganchos mínimos (tu bloque en `atlampa-3d.js`, tu ficha en
    `paginas.py`). No reformatees.
  - Commits chicos. Al terminar un paso, sube **tu rama** (`git push origin <tu-rama>`) y abre un pull request hacia `master`: sólo Gabriel lo aprueba e integra.
  - Si un cambio cae fuera de tu programa (motor, estilo, geo), pregúntale primero al usuario.
  - Nunca sobrescribas un `.3dm` ajeno.
- Al cambiar datos, sube `V` en `herramientas/paginas.py`; el navegador cachea.
- Lleva una memoria propia de decisiones (con fecha), pendientes y archivos.
</reglas_siempre>

<indice>
No leas todo. Abre **sólo** el archivo de `diagrama/handoff/procesos/` que pida la tarea:

| Si la tarea toca…                                                        | Lee                               |
|--------------------------------------------------------------------------|-----------------------------------|
| coordenadas, calce con Rhino, sitio, calles, niveles                     | `diagrama/handoff/procesos/sitio-y-coordenadas.md` |
| el visor: motor, menús, apartados, aislar, estilo, colores, servidor     | `diagrama/handoff/procesos/visor.md`               |
| el mercado / comercio (el ejemplo completo del método)                   | `diagrama/handoff/procesos/mercado.md`             |
| industria (por dónde empezar)                                            | `diagrama/handoff/procesos/industria.md`           |
| arte y cultura, aro                                                      | `diagrama/handoff/procesos/arte-cultura-y-aro.md`  |
| vivienda, módulos, departamentos                                         | `diagrama/handoff/procesos/vivienda-modulos.md`    |
| estructura de acero, predimensionamiento, Grasshopper                    | `diagrama/handoff/procesos/estructura.md`          |
| paisaje, vegetación, sol, estacionamiento                                | `diagrama/handoff/procesos/paisaje-y-estacionamiento.md` |
| usar Rhino por MCP                                                       | `diagrama/handoff/procesos/rhino-mcp.md`           |
| el sitio de cifras del programa (m², CAS/COS/CUS, árboles) y sus datos manuales | `programa/CLAUDE.md` (reglas propias; no toques el visor) |
</indice>

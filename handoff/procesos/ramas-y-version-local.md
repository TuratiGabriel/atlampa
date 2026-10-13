# Ramas, versión local e integración

Todos los comandos se corren desde la carpeta `diagrama/` (la raíz del repo). Hace falta Python 3 y git 2.38 o más nuevo.

## Cómo está armado
- **`master` es lo publicado.** Vercel lo publica solo uno o dos minutos después de cada cambio. Nadie trabaja directo en `master`.
- **Cada quien trabaja en su rama** (`industria`, `arte-cultura`, …) y al terminar un paso abre un pull request.
- **Gabriel integra:** ve la rama en local, revisa que no rompa nada y la mete a `master` (botón *Merge* del PR o `ramas.py integra`).
- Cada PR corre `revisa.py` solo en GitHub; si sale en rojo, el detalle dice qué arreglar.

## Ver en local
| Para ver… | Comando |
|---|---|
| tu copia de trabajo, tal como la tienes | `python herramientas/servidor.py` → http://localhost:8130 |
| la rama de alguien, sin cambiarte de rama | `python herramientas/ramas.py ver industria` |
| cómo quedaría esa rama ya integrada | `python herramientas/ramas.py ver industria --mezcla` |
| todas las ramas pendientes juntas (el «merge general») | `python herramientas/ramas.py ver todo` |

`ramas.py ver` arma una copia aparte (no toca tu carpeta), la abre en el navegador y la borra al cerrar con Ctrl+C.
Three.js va en `lib/`, así que todo funciona sin internet.

## Estado de las ramas
`python herramientas/ramas.py` trae lo nuevo de GitHub y dice, por rama:
- qué commits tiene sin integrar y cuántos le faltan de `master`;
- si se mezcla limpia, si sólo choca en la versión y las páginas (se resuelve solo) o si choca en archivos de diseño;
- si dos ramas tocan los mismos archivos (van a chocar entre ellas).

## Mezclar
| Para… | Comando |
|---|---|
| traer lo nuevo de `master` a una rama, antes de seguir trabajando en ella (o cuando su PR dice *This branch has conflicts*) | `python herramientas/ramas.py actualiza industria` |
| meter una rama a `master` sin PR | `python herramientas/ramas.py integra industria` |

Las dos hacen lo mismo:
1. Mezclan en una copia aparte.
2. **Resuelven solas el choque de siempre:** dos ramas suben `V` y regeneran los `.html`. Ponen una `V` más nueva que las dos y regeneran las páginas con `paginas.py`.
3. **Se detienen si chocan archivos de diseño** (scripts, datos, fichas de `paginas.py`) y dicen cuáles: eso lo decide el autor de la rama, o Claude con el contexto.
4. Corren `revisa.py` sobre el resultado.
5. Preguntan antes de subir. Con `--si` no preguntan; con `--no` sólo prueban y no suben nada.

## El ritual de cada sesión
1. **Al empezar:** `python herramientas/ramas.py actualiza <tu rama>` (o `git pull` si tu rama ya está al día).
2. Trabaja en tu rama, con commits chicos.
3. **Antes de subir:** `python herramientas/revisa.py --base origin/master`.
4. Sube tu rama y abre el PR.
5. **Gabriel:** `python herramientas/ramas.py` → `ver <rama> --mezcla` → *Merge*.

## Si algo sale mal
- **Se cerró la ventana sin Ctrl+C:** la copia temporal se borra sola la siguiente vez que corras `ramas.py`.
- **`ramas.py` dice que git es viejo:** actualiza Git for Windows (git-scm.com).
- **Una rama vieja chocará con todo:** antes de seguir trabajando en ella, `actualiza`. Si ya está integrada y nadie la usa, se puede borrar en GitHub (*Branches*).

# Atlampa (repo `diagrama/`)

Las reglas del proyecto están en `handoff/CLAUDE.md`: léelas antes de trabajar. Este archivo sólo dice cómo usarlas desde aquí.

- **En tu máquina** (Claude abierto en `Atlampa/`): ya tienes la copia de `handoff/CLAUDE.md` en `Atlampa/CLAUDE.md`. Si cambió, cópiala de nuevo.
- **En una sesión en la nube** (este repo es la carpeta de trabajo): en esas reglas quita `diagrama/` de las rutas. La carpeta del proyecto
  (`Rhino/`, `analisis/`, `Plantas/`) no existe aquí. `prepara-mercado.py` y `prepara-cultura.py` corren con lo que trae el repo
  (`modelo/`); `prepara-modulos.py` (`nuevos bloques.3dm`) y `prepara-estacionamiento.py` (el DWG de sótanos) no: pide esos archivos.
  Para regenerar datos hace falta `pip install rhino3dm shapely matplotlib`.
- Antes de subir: `python herramientas/revisa.py --base origin/master`.
- Ramas, vista local y mezclas: `python herramientas/ramas.py` (guía en `handoff/procesos/ramas-y-version-local.md`).

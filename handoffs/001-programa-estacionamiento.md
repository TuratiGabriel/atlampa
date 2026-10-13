MISSION : Actualiza cifras de estacionamiento del sitio programa/ (Vercel atlampa-fuy6) a 263 cajones/sótano y regenera programa.json.
MODE    : KNOWN. cwd = C:\Users\gablu\Documents\Escuela\Uni\7mo Sem\Atlampa\diagrama (repo, rama master)
ROUTE   : programa/datos/manual.json → estacionamiento.cajones_por_sotano {valor 229, fuente "…norte 135 + sur 94 por sótano"}
          herramientas/programa.py:153  fuentes['estacionamiento'] string (dice norte 135 + sur 94)
          programa/index.html:201  <p class="src"> (dice norte 135, sur 94; manual)
          programa/index.html:229  texto "sótanos = 916 cajones × 25 m²"
          programa/index.html:353  fila "Sótanos (916 cajones × 25 m², supuesto)"
          programa/programa.json  GENERADO por herramientas/programa.py — no editar a mano
STACK   : Python 3 (rhino3dm, shapely ya instalados), HTML/JS vanilla
INPUT   : nuevo dato: norte 130 + sur 133 = 263 cajones/sótano, 4 sótanos = 1052. Fuente: herramientas/prepara-estacionamiento.py + atlampa-estacionamiento.js (DWG 2026-10-11, incluye 16 cajones accesibles P01_CAJONES_N/P01_ACCESIBILIDAD).
OUTPUT  : manual.json valor 263, estado "calculado_a_mano", fuente con norte 130 + sur 133 y fecha 2026-10-11.
          programa.py:153 y index.html:201 → "norte 130, sur 133".
          index.html:229 y :353 sin número fijo: usar el total del JSON (F.estacionamiento.cajones_total) en :353; en :229 texto "cajones × 25 m²" sin cifra fija.
          programa.json regenerado: cajones_por_sotano 263, cajones_total 1052, sotanos_m2 = 26300.
LIMITS  : No tocar visor (atlampa-*.js, *.html de raíz, paginas.py), ni programa/CLAUDE.md, README.md, validar.py, arboles.json.
          No editar programa.json a mano. No commit, no push.
ASSUMED : m2_por_cajon sigue 25 (supuesto). Industria sin cambios (no existe modelo/Industria.3dm).
MINIMA  : `python herramientas/programa.py` → sale sin error
          `python programa/validar.py` → OK
          `grep -c 916 programa/index.html programa/programa.json` → 0 y 0
          programa.json: estacionamiento.cajones_total == 1052
ABORT   : programa.py falla por archivo faltante o librería; línea citada no coincide. Reporta, no adivines.
REPORT  : archivos cambiados + 1 línea c/u; MINIMA pass/fail; diferencias de otras cifras que haya movido la regeneración.

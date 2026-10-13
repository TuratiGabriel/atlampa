# Atlampa · Programa

Sitio con el programa del predio de Atlampa (vivienda, arte y cultura, comercio, industria, espacio público, estructura, árboles)
y su potencial construible (CAS, COS, CUS). Cada cifra muestra de qué archivo sale.

## Qué hay aquí
| Archivo | Qué es | ¿Lo editas? |
|---|---|---|
| `index.html` | El sitio. Lee `programa.json`. | Sí (diseño y texto) |
| `programa.json` | Cifras calculadas. | **No**: lo genera `herramientas/programa.py` |
| `datos/manual.json` | Cifras sin archivo fuente, con su estado y fuente. | **Sí** |
| `datos/arboles.json` | Árboles del visor y polígonos del predio. | **Sí** |
| `validar.py` | Revisa que los datos tengan fuente y estado. | No |
| `CLAUDE.md` | Reglas para tu Claude o chat. | Sólo con permiso de Gabriel |

## Cómo colaborar
1. Clona `https://github.com/TuratiGabriel/atlampa` y crea tu rama: `git checkout -b programa/tu-nombre-tema`.
2. Abre la carpeta con tu Claude (Claude Code, o pega `programa/CLAUDE.md` en tu chat) y pídele el cambio. Ejemplo:
   *«Lee programa/CLAUDE.md. El área de arte y cultura cambió a 1,350 m² según la lámina nueva; actualiza manual.json con su fuente.»*
3. `python programa/validar.py` → «OK».
4. Sube **sólo tu rama** (`git push origin tu-rama`) y abre un pull request con la plantilla. Nunca empujes a `master`: está protegida y publica el sitio. Gabriel lo aprueba, lo integra y el sitio se actualiza solo.

## Regenerar las cifras (Gabriel o quien tenga rhino3dm)
```bash
pip install rhino3dm shapely
python herramientas/programa.py
```
Escribe `programa/programa.json`. Necesita `modelo/Contexto.3dm` (o `../Rhino/Contexto.3dm`) y los scripts `prepara-*.py`.

## Publicación (Vercel)
Proyecto en Vercel con **Root Directory = `programa`**, sin build (`vercel.json`). Cada merge a `master` redespliega solo.

## Reglas cortas
Sin datos inventados. Toda cifra con fuente. Los `.3dm` no se tocan. Lo que no está claro queda como `supuesto` o `por_confirmar`.

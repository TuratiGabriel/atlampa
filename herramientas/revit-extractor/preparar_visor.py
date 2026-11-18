"""Convierte lecturas del coordinado e Industria en mallas locales para el visor.

No abre ni escribe modelos Revit. Conserva los triángulos exportados, en metros,
sin simplificación. La traslación sólo sitúa el sistema interno del coordinado
en el sistema (u,v) ya utilizado por la escena.
"""
import gzip
import hashlib
import json
import struct
from collections import defaultdict
from pathlib import Path
from math import hypot

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VIEWER = HERE.parents[1]
MANIFEST = ROOT / "runtime-local/revit-fachadas/latest.json"
INDUSTRIA_MANIFEST = ROOT / "runtime-local/revit-fachadas/latest-industria.json"

# Coincide el vértice noroeste del solar de Revit (0,166) con el predio
# publicado en la escena (447.963,488.265). Un único desplazamiento rígido
# aplica a todos los vínculos y preserva sus posiciones relativas.
ORIGIN = [447.963, 322.265, 0.0]
SOURCE_NAMES = {
    "ARQ_VIVIENDA": "vivienda",
    "Mercado_ARQ": "comercio",
    "Industria_ARQ": "industria",
    "ArteCultura_Aro_ARQ": "cultura",
    "Estacionamiento_Estr": "estacionamiento",
    "SITE": "sitio",
}


def muros_interiores(snapshot):
    """Identifica tabiques cubiertos por una losa en ambos lados.

    Se aplica donde la losa superior coincide con la coronación del muro. Un
    lado sin cubierta conserva la fachada, incluidos los patios abiertos.
    Mercado y Cultura tienen cubiertas inclinadas o geometría de múltiples
    alturas: aquí no se infiere su condición de fachada.
    """
    edificios = {"ARQ_VIVIENDA", "Industria_ARQ"}
    losas = defaultdict(list)
    muros = defaultdict(list)
    with gzip.open(snapshot, "rt", encoding="utf-8") as rows:
        for line in rows:
            row = json.loads(line)
            if row.get("kind") != "element":
                continue
            source = row["source"].split("/")[-1].split(".rvt")[0]
            if source not in edificios or not row["bbox"]:
                continue
            if row["category"] == "floors":
                polygons = []
                for t in row["triangles"]:
                    if abs(t[2] - t[5]) > .001 or abs(t[2] - t[8]) > .001:
                        continue
                    p = Polygon(((t[0], t[1]), (t[3], t[4]), (t[6], t[7])))
                    if p.area > .0001:
                        polygons.append(p)
                if polygons:
                    losas[source].append((row["bbox"][1][2], polygons))
            elif row["category"] == "walls" and row.get("axis"):
                muros[source].append(row)
    ocultos = defaultdict(set)
    for source in edificios:
        slabs = sorted(losas[source], key=lambda p: p[0])
        levels = []
        for z, polygons in slabs:
            if not levels or z - levels[-1][0] > .8:
                levels.append([z, list(polygons)])
            else:
                levels[-1][1].extend(polygons)
        footprints = [(z, unary_union(polygons)) for z, polygons in levels]
        for wall in muros[source]:
            z = wall["bbox"][1][2]
            # Industria tiene un nivel de cubierta parcial y otro continuo:
            # ambos definen los patios abiertos en planta. En vivienda se usa
            # sólo la losa del nivel correspondiente por sus terrazas escalonadas.
            matching = ([shape for _, shape in footprints] if source == "Industria_ARQ"
                        else [shape for slab_z, shape in footprints if -.2 <= slab_z - z <= .7])
            if not matching:
                continue
            roof = unary_union(matching) if len(matching) > 1 else matching[0]
            x1, y1, _ = wall["axis"][0]
            x2, y2, _ = wall["axis"][1]
            dx, dy = x2-x1, y2-y1
            length = hypot(dx, dy)
            if length < .01:
                continue
            nx, ny = -dy/length, dx/length
            # Dos distancias evitan clasificar por una losa que apenas toca el eje.
            if all(sum(all(roof.covers(Point(x1+t*dx+s*d*nx,
                                           y1+t*dy+s*d*ny)) for s in (-1, 1))
                       for t in (.15, .35, .5, .65, .85)) >= 4
                   for d in (.4, .8)):
                ocultos[source].add(wall["id"])
    return ocultos


def convex_hull(points):
    points = sorted(set(points))
    if len(points) < 3:
        raise RuntimeError("SITE_PLANTILLA no tiene contorno válido")
    def cross(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    lower, upper = [], []
    for p in points:
        while len(lower) > 1 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(points):
        while len(upper) > 1 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def run():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest["errorCount"]:
        raise RuntimeError("La lectura Revit contiene errores de geometría")
    digest = hashlib.sha256(Path(manifest["file"]).read_bytes()).hexdigest()
    if digest != manifest["sha256"]:
        raise RuntimeError("La lectura Revit no coincide con su huella SHA256")
    interior = muros_interiores(manifest["file"])
    groups = defaultdict(list)
    missing = defaultdict(int)
    ids = defaultdict(list)
    max_housing_z = 0.0
    bounds = {}
    site_main = None
    industry_floors = {}
    with gzip.open(manifest["file"], "rt", encoding="utf-8") as rows:
        for line in rows:
            row = json.loads(line)
            if row.get("kind") != "element":
                continue
            source = row["source"].split("/")[-1].split(".rvt")[0]
            program = SOURCE_NAMES.get(source)
            if program is None:
                continue
            if program == "sitio" and row["category"] == "floors" and row["bbox"]:
                b = row["bbox"]
                area_box = (b[1][0] - b[0][0]) * (b[1][1] - b[0][1])
                if site_main is None or area_box > site_main[0]:
                    site_main = (area_box, row)
            if row["bbox"]:
                box = row["bbox"]
                if program not in bounds:
                    bounds[program] = [box[0][:], box[1][:]]
                else:
                    for axis in range(3):
                        bounds[program][0][axis] = min(bounds[program][0][axis], box[0][axis])
                        bounds[program][1][axis] = max(bounds[program][1][axis], box[1][axis])
            category = row["category"]
            if source == "Industria_ARQ" and category == "floors":
                industry_floors[row["id"]] = row["triangles"]
            if category == "genericModels":
                continue  # se incorporan sólo desde la lectura individual verificada
            if row["id"] in interior[source] or row.get("hostId") in interior[source]:
                continue
            if not row["triangles"]:
                esperado = (category == "walls" and row["family"] == "Curtain Wall") or (
                    category == "curtainPanels" and row["family"] == "Empty System Panel")
                if not esperado:
                    raise RuntimeError("Elemento sin geometría visible inesperado: {} {} {}".format(
                        source, category, row["id"]))
                missing[(program, category)] += 1
                continue
            if program == "vivienda":
                z = row["bbox"][0][2] if row["bbox"] else 0
                if row["bbox"]:
                    max_housing_z = max(max_housing_z, row["bbox"][1][2])
                level = min(11, max(0, round((z - 10.6431) / 3.3)))
            else:
                level = 0
            key = (program, category, level, "")
            ids[key].append(row["id"])
            for tri in row["triangles"]:
                groups[key].extend(tri)
    if not INDUSTRIA_MANIFEST.exists():
        raise RuntimeError("Falta la lectura individual de Industria para los chacuacos")
    industry_manifest = json.loads(INDUSTRIA_MANIFEST.read_text(encoding="utf-8"))
    if industry_manifest["errorCount"]:
        raise RuntimeError("La lectura individual de Industria contiene errores")
    industry_digest = hashlib.sha256(Path(industry_manifest["file"]).read_bytes()).hexdigest()
    if industry_digest != industry_manifest["sha256"]:
        raise RuntimeError("La lectura individual de Industria no coincide con su huella SHA256")
    current_floors = {}
    roof_elements = []
    with gzip.open(industry_manifest["file"], "rt", encoding="utf-8") as rows:
        for line in rows:
            row = json.loads(line)
            if row.get("kind") != "element":
                continue
            if row["category"] == "floors":
                current_floors[row["id"]] = row["triangles"]
            if row["category"] == "genericModels" and row["family"].startswith(("CHACUACO", "CHIMENEA")):
                roof_elements.append(row)
    if current_floors != industry_floors:
        raise RuntimeError("Industria individual y el coordinado no coinciden en sus losas; revisar coordinación")
    if not roof_elements:
        raise RuntimeError("La lectura individual de Industria no contiene chacuacos")
    for row in roof_elements:
        if not row["triangles"] or not row["bbox"]:
            raise RuntimeError("Volumen de cubierta sin geometría: " + row["id"])
        category = "chacuacos" if row["family"].startswith("CHACUACO") else "chimeneas"
        key = ("industria", category, 0, row["id"])
        ids[key].append(row["id"])
        for tri in row["triangles"]:
            groups[key].extend(tri)
        box = row["bbox"]
        for axis in range(3):
            bounds["industria"][0][axis] = min(bounds["industria"][0][axis], box[0][axis])
            bounds["industria"][1][axis] = max(bounds["industria"][1][axis], box[1][axis])
    if not groups:
        raise RuntimeError("La lectura Revit no contiene triángulos")
    if site_main is None:
        raise RuntimeError("No se encontró SITE_PLANTILLA")
    site_outline = convex_hull((t[i], t[i + 1]) for t in site_main[1]["triangles"] for i in (0, 3, 6))
    info = []
    payload = bytearray()
    for key in sorted(groups):
        values = groups[key]
        offset = len(payload)
        payload.extend(struct.pack("<%sf" % len(values), *values))
        info.append({"programa": key[0], "categoria": key[1], "nivel": key[2],
                     "piezaId": key[3],
                     "offset": offset, "floats": len(values), "elementos": len(ids[key]),
                     "triangulos": len(values) // 9})
    binary = VIEWER / "atlampa-revit.bin"
    binary.write_bytes(payload)
    meta = {"schema": 1, "revitSha256": digest, "industriaRevitSha256": industry_digest, "origen": ORIGIN,
            "archivo": binary.name, "bytes": len(payload), "viviendaMaxZ": max_housing_z,
            "bounds": bounds, "siteOutline": site_outline, "grupos": info,
            "piezasCubiertaIndustria": [{"id": r["id"], "nombre": r["name"], "familia": r["family"],
                                         "bbox": r["bbox"]} for r in roof_elements],
            "sinMalla": [{"programa": k[0], "categoria": k[1], "elementos": v}
                         for k, v in sorted(missing.items())]}
    (VIEWER / "atlampa-revit.js").write_text(
        "// Geometría leída de Revit; generada por herramientas/revit-extractor/preparar_visor.py\n"
        "window.ATLAMPA_REVIT = " + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print(json.dumps({"bytes": len(payload), "grupos": len(info),
                      "triangulos": sum(g["triangulos"] for g in info),
                      "volumenesCubierta": {"chacuacos": sum(r["family"].startswith("CHACUACO") for r in roof_elements),
                                            "chimeneas": sum(r["family"].startswith("CHIMENEA") for r in roof_elements)},
                      "murosInterioresOmitidos": {s: len(v) for s, v in interior.items()},
                      "sinMalla": meta["sinMalla"]}, ensure_ascii=False))


if __name__ == "__main__":
    run()

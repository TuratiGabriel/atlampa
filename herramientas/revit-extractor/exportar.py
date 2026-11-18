"""Dynamo/Revit: lectura local de fachadas y vínculos, sin transacciones.

Salida: JSON Lines comprimido con geometría en metros del sistema interno del
modelo anfitrión. No clasifica como exterior lo que Revit no declare exterior.
"""
import datetime
import gzip
import hashlib
import json
import os
from collections import Counter

import clr

clr.AddReference("RevitAPI")
clr.AddReference("RevitServices")
from Autodesk.Revit import DB
from RevitServices.Persistence import DocumentManager


SCHEMA = 1
FT = 0.3048
CATEGORIES = (
    ("walls", DB.BuiltInCategory.OST_Walls),
    ("floors", DB.BuiltInCategory.OST_Floors),
    ("windows", DB.BuiltInCategory.OST_Windows),
    ("doors", DB.BuiltInCategory.OST_Doors),
    ("curtainPanels", DB.BuiltInCategory.OST_CurtainWallPanels),
    ("curtainMullions", DB.BuiltInCategory.OST_CurtainWallMullions),
    ("roofs", DB.BuiltInCategory.OST_Roofs),
    ("genericModels", DB.BuiltInCategory.OST_GenericModel),
)
ROOT = os.path.join(os.path.expanduser("~"), "Documents", "BIM Escena 3D", "runtime-local", "revit-fachadas")


def eid(value):
    try:
        return str(value.Value)
    except AttributeError:
        return str(value.IntegerValue)


def name(value):
    try:
        return str(value.Name)
    except Exception:
        return ""


def point(xyz, transform):
    p = transform.OfPoint(xyz)
    return [round(p.X * FT, 4), round(p.Y * FT, 4), round(p.Z * FT, 4)]


def box(element, transform):
    bounds = element.get_BoundingBox(None)
    if bounds is None:
        return None
    a, b = bounds.Min, bounds.Max
    corners = [point(DB.XYZ(x, y, z), transform)
               for x in (a.X, b.X) for y in (a.Y, b.Y) for z in (a.Z, b.Z)]
    return [[min(p[i] for p in corners) for i in range(3)],
            [max(p[i] for p in corners) for i in range(3)]]


def triangles(geometry, transform):
    result = []
    if geometry is None:
        return result
    for obj in geometry:
        if isinstance(obj, DB.GeometryInstance):
            # GetInstanceGeometry ya aplica la transformación interna de la familia.
            result.extend(triangles(obj.GetInstanceGeometry(), transform))
        elif isinstance(obj, DB.Solid):
            if obj.Faces.Size == 0:
                continue
            for face in obj.Faces:
                mesh = face.Triangulate()
                if mesh is None:
                    continue
                for i in range(mesh.NumTriangles):
                    tri = mesh.get_Triangle(i)
                    result.append([q for j in range(3) for q in point(tri.get_Vertex(j), transform)])
        elif isinstance(obj, DB.Mesh):
            for i in range(obj.NumTriangles):
                tri = obj.get_Triangle(i)
                result.append([q for j in range(3) for q in point(tri.get_Vertex(j), transform)])
    return result


def wall_function(element):
    wall = element if isinstance(element, DB.Wall) else getattr(element, "Host", None)
    if isinstance(wall, DB.Wall):
        try:
            return str(wall.WallType.Function)
        except Exception:
            return "unknown"
    return "unknown"


def record(element, document, transform, source, category, options):
    typ = document.GetElement(element.GetTypeId())
    type_name = name(typ)
    if not type_name and typ is not None:
        parameter = typ.get_Parameter(DB.BuiltInParameter.SYMBOL_NAME_PARAM)
        type_name = parameter.AsString() if parameter is not None else ""
    location = element.Location
    insertion = point(location.Point, transform) if isinstance(location, DB.LocationPoint) else None
    axis = ([point(location.Curve.GetEndPoint(i), transform) for i in (0, 1)]
            if isinstance(location, DB.LocationCurve) and location.Curve.IsBound else None)
    host = getattr(element, "Host", None)
    geometry_error = None
    try:
        mesh = triangles(element.get_Geometry(options), transform)
    except Exception as exc:
        mesh = []
        geometry_error = str(exc)[:300]
    return {
        "kind": "element", "source": source, "category": category,
        "id": eid(element.Id), "uniqueId": str(element.UniqueId),
        "name": name(element), "type": type_name,
        "family": str(getattr(typ, "FamilyName", "")) if typ is not None else "",
        "hostId": eid(host.Id) if host is not None else None,
        "levelId": eid(element.LevelId), "wallFunction": wall_function(element),
        "insertion": insertion, "axis": axis, "bbox": box(element, transform),
        "triangles": mesh, "geometryError": geometry_error,
    }


def transform_data(transform):
    return {"origin": point(DB.XYZ.Zero, transform),
            "basisX": [round(v, 7) for v in (transform.BasisX.X, transform.BasisX.Y, transform.BasisX.Z)],
            "basisY": [round(v, 7) for v in (transform.BasisY.X, transform.BasisY.Y, transform.BasisY.Z)],
            "basisZ": [round(v, 7) for v in (transform.BasisZ.X, transform.BasisZ.Y, transform.BasisZ.Z)]}


def export():
    active = DocumentManager.Instance.CurrentDBDocument
    if active is None:
        raise RuntimeError("Dynamo no tiene un documento Revit activo")
    os.makedirs(ROOT, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in active.Title)
    final = os.path.join(ROOT, "{}-{}.jsonl.gz".format(safe, stamp))
    temp = final + ".tmp"
    options = DB.Options()
    options.DetailLevel = DB.ViewDetailLevel.Fine
    options.IncludeNonVisibleObjects = False
    counts, errors, unloaded, sources = Counter(), [], [], []

    with gzip.open(temp, "wt", encoding="utf-8", compresslevel=6) as output:
        output.write(json.dumps({"kind": "header", "schema": SCHEMA,
                                 "host": active.Title, "coordinateSystem": "host internal, metres",
                                 "generatedAt": stamp}, ensure_ascii=False) + "\n")

        def visit(document, transform, source, ancestors, depth):
            if depth > 4:
                unloaded.append({"source": source, "reason": "link_depth_limit"})
                return
            if document.Title in ancestors:
                unloaded.append({"source": source, "reason": "link_cycle"})
                return
            path = ancestors + (document.Title,)
            sources.append({"source": source, "document": document.Title,
                            "transform": transform_data(transform)})
            for category, bic in CATEGORIES:
                if category == "genericModels" and not document.Title.startswith("Industria_ARQ"):
                    continue
                elements = DB.FilteredElementCollector(document).OfCategory(bic).WhereElementIsNotElementType()
                for element in elements:
                    try:
                        row = record(element, document, transform, source, category, options)
                        output.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
                        counts[category] += 1
                        if row["geometryError"]:
                            errors.append({"source": source, "category": category,
                                           "id": eid(element.Id), "error": row["geometryError"]})
                    except Exception as exc:
                        errors.append({"source": source, "category": category,
                                       "id": eid(element.Id), "error": str(exc)[:300]})
            links = DB.FilteredElementCollector(document).OfClass(DB.RevitLinkInstance)
            for link in links:
                linked = link.GetLinkDocument()
                child_source = source + "/" + name(link) + "#" + eid(link.Id)
                if linked is None:
                    unloaded.append({"source": child_source, "reason": "unloaded"})
                    continue
                visit(linked, transform.Multiply(link.GetTotalTransform()), child_source, path, depth + 1)

        visit(active, DB.Transform.Identity, active.Title, (), 0)
        output.write(json.dumps({"kind": "summary", "counts": dict(counts),
                                 "errorCount": len(errors), "errors": errors[:100],
                                 "unloadedLinks": unloaded, "sources": sources},
                                ensure_ascii=False, separators=(",", ":")) + "\n")
    os.replace(temp, final)
    digest = hashlib.sha256()
    with open(final, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    manifest = {"schema": SCHEMA, "file": final, "sha256": digest.hexdigest(),
                "bytes": os.path.getsize(final), "counts": dict(counts),
                "errorCount": len(errors), "errors": errors[:100],
                "unloadedLinks": unloaded, "sources": sources,
                "complete": not errors and not unloaded}
    manifest_name = "latest-industria.json" if active.Title.startswith("Industria_ARQ") else "latest.json"
    with open(os.path.join(ROOT, manifest_name), "w", encoding="utf-8") as stream:
        json.dump(manifest, stream, ensure_ascii=False, indent=2)
    return "Atlampa BIM: {} elementos, {} errores, {} vínculos ausentes. {}".format(
        sum(counts.values()), len(errors), len(unloaded), final)


OUT = export()

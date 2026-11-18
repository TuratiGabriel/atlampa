"""Resume el último registro Revit y el alcance de los bloques actuales."""
import gzip
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path.home() / "Documents" / "BIM Escena 3D"
manifest = json.loads((ROOT / "runtime-local/revit-fachadas/latest.json").read_text(encoding="utf-8"))
counts = defaultdict(Counter)
functions = defaultdict(Counter)
triangles = Counter()
bounds = {}
category_bounds = {}
no_mesh = []
z_hist = defaultdict(Counter)
with gzip.open(manifest["file"], "rt", encoding="utf-8") as stream:
    for line in stream:
        row = json.loads(line)
        if row["kind"] != "element":
            continue
        source = row["source"].split("/")[1].split(".rvt")[0] if "/" in row["source"] else "COORDINATION"
        cat = row["category"]
        counts[source][cat] += 1
        functions[source][row["wallFunction"]] += 1
        triangles[source] += len(row["triangles"])
        if not row["triangles"]:
            no_mesh.append((source, cat, row["id"], row.get("geometryError")))
        b = row["bbox"]
        if b:
            if cat in ("windows", "doors", "floors"):
                z_hist[(source, cat)][round(b[0][2], 1)] += 1
            ck = (source, cat)
            if ck not in category_bounds:
                category_bounds[ck] = [b[0][:], b[1][:]]
            else:
                for i in range(3):
                    category_bounds[ck][0][i] = min(category_bounds[ck][0][i], b[0][i])
                    category_bounds[ck][1][i] = max(category_bounds[ck][1][i], b[1][i])
            if source not in bounds:
                bounds[source] = [b[0][:], b[1][:]]
            else:
                for i in range(3):
                    bounds[source][0][i] = min(bounds[source][0][i], b[0][i])
                    bounds[source][1][i] = max(bounds[source][1][i], b[1][i])

for source in sorted(counts):
    print(source, dict(counts[source]), "triangles", triangles[source],
          "bounds", bounds.get(source), "wallFunction", dict(functions[source]))
    for cat in counts[source]:
        print("  ", cat, category_bounds.get((source, cat)))
        if (source, cat) in z_hist:
            print("    z_min", sorted(z_hist[(source, cat)].items()))
print("no_mesh", len(no_mesh), no_mesh[:12])
print("unloaded", manifest["unloadedLinks"])

modfile = ROOT / "Atlampa-Interfaz/atlampa-modulos.js"
code = modfile.read_text(encoding="utf-8")
payload = code.split("window.ATLAMPA_MODULOS = ", 1)[1].strip().rstrip(";")
mod = json.loads(payload)
print("viewer_modules", len(mod["cajas"]), "z0", mod["z0"], "step", mod["paso"],
      "xy_bounds", [min(r[i] for r in mod["cajas"]) for i in (0, 1)],
      [max(r[i] for r in mod["cajas"]) for i in (0, 1)])

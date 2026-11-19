"""Sustituye sólo Arte y cultura en atlampa-revit.bin / atlampa-revit.js.

Uso:  python actualiza_cultura.py <lectura-cultura.jsonl.gz>

La lectura tiene el mismo formato de renglones que exportar.py (kind, source,
category, id, family, bbox, triangles), en metros del sistema interno del
coordinado, y sólo trae el vínculo ArteCultura_Aro_ARQ. Se hace así cuando
cambió únicamente ese vínculo: los demás programas conservan sus triángulos,
sus grupos y la huella de su lectura completa (revitSha256).

Aplica las mismas reglas que preparar_visor.py para cultura: omite modelos
genéricos, nivel 0, falla ante elementos sin malla inesperados y no infiere
muros interiores.
"""
import gzip
import hashlib
import json
import struct
import sys
from collections import defaultdict
from pathlib import Path

VIEWER = Path(__file__).resolve().parents[2]
JS = VIEWER / "atlampa-revit.js"
BIN = VIEWER / "atlampa-revit.bin"
PREFIJO = "window.ATLAMPA_REVIT = "


def run(lectura):
    lectura = Path(lectura)
    digest = hashlib.sha256(lectura.read_bytes()).hexdigest()
    texto = JS.read_text(encoding="utf-8")
    cabeza, cuerpo = texto.split(PREFIJO, 1)
    meta = json.loads(cuerpo.strip().rstrip(";"))
    viejo = BIN.read_bytes()
    if len(viejo) != meta["bytes"]:
        raise RuntimeError("atlampa-revit.bin no corresponde a atlampa-revit.js")

    grupos, ids, faltan = defaultdict(list), defaultdict(list), defaultdict(int)
    bounds, fuentes, errores = None, set(), 0
    with gzip.open(lectura, "rt", encoding="utf-8") as rows:
        for line in rows:
            row = json.loads(line)
            if row.get("kind") == "summary":
                errores = row.get("errorCount", 0)
            if row.get("kind") != "element":
                continue
            fuente = row["source"].split("/")[-1].split(".rvt")[0]
            fuentes.add(fuente)
            if fuente != "ArteCultura_Aro_ARQ":
                raise RuntimeError("La lectura trae otro vínculo: " + row["source"])
            cat = row["category"]
            if row["bbox"]:
                b = row["bbox"]
                if bounds is None:
                    bounds = [b[0][:], b[1][:]]
                else:
                    for k in range(3):
                        bounds[0][k] = min(bounds[0][k], b[0][k])
                        bounds[1][k] = max(bounds[1][k], b[1][k])
            if cat == "genericModels":
                continue
            if not row["triangles"]:
                esperado = (cat == "walls" and row["family"] == "Curtain Wall") or (
                    cat == "curtainPanels" and row["family"] == "Empty System Panel")
                if not esperado:
                    raise RuntimeError("Elemento sin geometría visible inesperado: {} {}".format(cat, row["id"]))
                faltan[cat] += 1
                continue
            ids[cat].append(row["id"])
            for tri in row["triangles"]:
                grupos[cat].extend(tri)
    if errores:
        raise RuntimeError("La lectura de cultura contiene errores de geometría")
    if not grupos:
        raise RuntimeError("La lectura de cultura no contiene triángulos")

    # Se conservan los grupos ajenos con sus bytes y se agregan los de cultura,
    # en el mismo orden (programa, categoría, nivel, pieza) que preparar_visor.py.
    entradas = []
    for g in meta["grupos"]:
        if g["programa"] == "cultura":
            continue
        datos = viejo[g["offset"]:g["offset"] + g["floats"] * 4]
        entradas.append(((g["programa"], g["categoria"], g["nivel"], g["piezaId"]), datos, g))
    for cat, valores in grupos.items():
        g = {"programa": "cultura", "categoria": cat, "nivel": 0, "piezaId": "",
             "elementos": len(ids[cat]), "triangulos": len(valores) // 9}
        entradas.append((("cultura", cat, 0, ""), struct.pack("<%sf" % len(valores), *valores), g))
    entradas.sort(key=lambda e: e[0])
    payload, info = bytearray(), []
    for _, datos, g in entradas:
        g = dict(g, offset=len(payload), floats=len(datos) // 4)
        payload.extend(datos)
        info.append(g)

    meta["grupos"] = info
    meta["bytes"] = len(payload)
    meta["bounds"]["cultura"] = bounds
    meta["culturaRevitSha256"] = digest
    meta["sinMalla"] = [s for s in meta["sinMalla"] if s["programa"] != "cultura"] + [
        {"programa": "cultura", "categoria": c, "elementos": n} for c, n in sorted(faltan.items())]
    BIN.write_bytes(payload)
    JS.write_text(cabeza + PREFIJO + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n",
                  encoding="utf-8")
    print(json.dumps({"bytes": len(payload), "cultura": {c: info_c["triangulos"] for info_c in info
                      if info_c["programa"] == "cultura" for c in [info_c["categoria"]]},
                      "bounds": bounds, "sinMalla": dict(faltan)}, ensure_ascii=False))


if __name__ == "__main__":
    run(sys.argv[1])

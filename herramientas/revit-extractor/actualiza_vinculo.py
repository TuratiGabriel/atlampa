"""Sustituye un solo programa en atlampa-revit.bin / atlampa-revit.js.

Uso:  python actualiza_vinculo.py <programa> <lectura.jsonl.gz>
      programa: cultura (ArteCultura_Aro_ARQ) o vivienda (ARQ_VIVIENDA)

La lectura tiene el mismo formato de renglones que exportar.py (kind, source,
category, id, family, bbox, triangles), en metros del sistema interno del
coordinado, y sólo trae ese vínculo. Se hace así cuando cambió únicamente ese
vínculo: los demás programas conservan sus triángulos, sus grupos y la huella
de su lectura completa (revitSha256).

Aplica las reglas de preparar_visor.py: omite modelos genéricos, falla ante
elementos sin malla inesperados y reparte la vivienda por nivel. A diferencia
de preparar_visor.py NO infiere muros interiores: esa inferencia escondía
también muros de fachada (con ventanas) bajo losas en voladizo, así que se
dibujan todos los muros que trae Revit.
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
VINCULOS = {"cultura": "ArteCultura_Aro_ARQ", "vivienda": "ARQ_VIVIENDA"}


def nivel(programa, row):
    if programa != "vivienda":
        return 0
    z = row["bbox"][0][2] if row["bbox"] else 0
    return min(11, max(0, round((z - 10.6431) / 3.3)))   # igual que preparar_visor.py


def run(programa, lectura):
    vinculo = VINCULOS[programa]
    lectura = Path(lectura)
    digest = hashlib.sha256(lectura.read_bytes()).hexdigest()
    texto = JS.read_text(encoding="utf-8")
    cabeza, cuerpo = texto.split(PREFIJO, 1)
    meta = json.loads(cuerpo.strip().rstrip(";"))
    viejo = BIN.read_bytes()
    if len(viejo) != meta["bytes"]:
        raise RuntimeError("atlampa-revit.bin no corresponde a atlampa-revit.js")

    grupos, ids, faltan = defaultdict(list), defaultdict(list), defaultdict(int)
    bounds, errores, max_z = None, None, 0.0
    with gzip.open(lectura, "rt", encoding="utf-8") as rows:
        for line in rows:
            row = json.loads(line)
            if row.get("kind") == "summary":
                errores = row.get("errorCount", 0)
            if row.get("kind") != "element":
                continue
            fuente = row["source"].split("/")[-1].split(".rvt")[0]
            if fuente != vinculo:
                raise RuntimeError("La lectura trae otro vínculo: " + row["source"])
            cat = row["category"]
            if row["bbox"]:
                b = row["bbox"]
                max_z = max(max_z, b[1][2])
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
            clave = (cat, nivel(programa, row))
            ids[clave].append(row["id"])
            for tri in row["triangles"]:
                grupos[clave].extend(tri)
    if errores is None:
        raise RuntimeError("La lectura está incompleta: no tiene renglón summary")
    if errores:
        raise RuntimeError("La lectura contiene errores de geometría")
    if not grupos:
        raise RuntimeError("La lectura no contiene triángulos")

    # Se conservan los grupos ajenos con sus bytes y se agregan los nuevos,
    # en el mismo orden (programa, categoría, nivel, pieza) que preparar_visor.py.
    entradas = []
    for g in meta["grupos"]:
        if g["programa"] == programa:
            continue
        datos = viejo[g["offset"]:g["offset"] + g["floats"] * 4]
        entradas.append(((g["programa"], g["categoria"], g["nivel"], g["piezaId"]), datos, g))
    for (cat, niv), valores in grupos.items():
        g = {"programa": programa, "categoria": cat, "nivel": niv, "piezaId": "",
             "elementos": len(ids[(cat, niv)]), "triangulos": len(valores) // 9}
        entradas.append(((programa, cat, niv, ""), struct.pack("<%sf" % len(valores), *valores), g))
    entradas.sort(key=lambda e: e[0])
    payload, info = bytearray(), []
    for _, datos, g in entradas:
        g = dict(g, offset=len(payload), floats=len(datos) // 4)
        payload.extend(datos)
        info.append(g)

    meta["grupos"] = info
    meta["bytes"] = len(payload)
    meta["bounds"][programa] = bounds
    meta[programa + "RevitSha256"] = digest
    if programa == "vivienda":
        meta["viviendaMaxZ"] = max_z
    meta["sinMalla"] = [s for s in meta["sinMalla"] if s["programa"] != programa] + [
        {"programa": programa, "categoria": c, "elementos": n} for c, n in sorted(faltan.items())]
    BIN.write_bytes(payload)
    JS.write_text(cabeza + PREFIJO + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n",
                  encoding="utf-8")
    resumen = defaultdict(lambda: [0, 0])
    for g in info:
        if g["programa"] == programa:
            resumen[g["categoria"]][0] += g["elementos"]
            resumen[g["categoria"]][1] += g["triangulos"]
    print(json.dumps({"bytes": len(payload), programa: resumen, "bounds": bounds,
                      "sinMalla": dict(faltan)}, ensure_ascii=False))


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])

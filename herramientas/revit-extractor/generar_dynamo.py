"""Genera el grafo de un nodo Python para Dynamo incluido con Revit 2026."""
import json
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
SAMPLE = Path(r"C:\Program Files\Autodesk\Revit 2026\AddIns\DynamoForRevit\NodeHelpSharedDocs\PythonNodeModels.PythonNode.dyn")
graph = json.loads(SAMPLE.read_text(encoding="utf-8"))
node = next(n for n in graph["Nodes"] if n["ConcreteType"].startswith("PythonNodeModels.PythonNode,"))
view = next(n for n in graph["View"]["NodeViews"] if n["Id"] == node["Id"])
graph["Uuid"] = str(uuid.uuid4())
graph["Name"] = "Atlampa - fachadas Revit"
graph["Description"] = "Lectura de muros, losas, puertas y ventanas del anfitrión y vínculos; no cambia el modelo."
node["Code"] = (
    "import os\n"
    "path = os.path.join(os.path.expanduser('~'), 'Documents', 'BIM Escena 3D', "
    "'Atlampa-Interfaz', 'herramientas', 'revit-extractor', 'exportar.py')\n"
    "with open(path, encoding='utf-8') as source:\n"
    "    exec(compile(source.read(), path, 'exec'), globals())\n"
)
node["Inputs"] = []
node["VariableInputPorts"] = True
node["Id"] = str(uuid.uuid4())
node["Outputs"][0]["Id"] = str(uuid.uuid4())
node["Outputs"][0]["Name"] = "resultado"
graph["Nodes"] = [node]
graph["Connectors"] = []
graph["Dependencies"] = []
graph["NodeLibraryDependencies"] = []
graph["Bindings"] = []
view["Id"] = node["Id"]
view["Name"] = "Extraer fachadas (solo lectura)"
view["X"], view["Y"] = 0.0, 0.0
graph["View"]["NodeViews"] = [view]
graph["View"]["Annotations"] = []
graph["View"]["Dynamo"]["RunType"] = "Manual"
(HERE / "Atlampa-fachadas.dyn").write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
print(HERE / "Atlampa-fachadas.dyn")

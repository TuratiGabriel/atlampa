# Rhino por MCP (si lo tiene)

- **Prefiere rhino3dm** (`pip install rhino3dm`) para leer `.3dm`. Rhino se cerró varias veces al consultarlo por MCP.
- La 1ª llamada que lanza Rhino responde `rhino_closed`: repítela. Usa un slot propio (`spawn_slot`); un slot `adopted:true` no se cierra ni se vacía.
- `open_doc` **importa** al documento actual, así que empieza siempre en un slot limpio.
- `save_doc` **sobrescribe sin preguntar**: guarda sólo en copias de trabajo, nunca en los originales.
- Coordenadas muy lejos del origen y Earth anchor: las mallas se redondean a 1.024 m. Construye en un marco local en m y traslada al final.
- Scripts largos: déjalos en un archivo y ejecútalos con `exec(open(ruta).read())` desde `run_python`.
- Para que una capa se guarde oculta: `Layer.SetPersistentVisibility(False)`. Para las capturas, fija la cámara desde `run_python`.

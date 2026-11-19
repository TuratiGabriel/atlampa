"""Prepara el nivel 4 sur para inspección, sin abrir ni modificar Revit.

Fuentes: lectura local del coordinado, departamentos.json y lámina 20 del
PDF entregado. El registro del mobiliario es visual (error medio ≈0.21 m);
la cota vertical y la geometría de los elementos construidos vienen del BIM.

Uso: ..\\.venv\\Scripts\\python.exe herramientas/vivienda4.py <archivo.pdf>
"""
import gzip
import hashlib
import json
import struct
import sys
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from pypdf import PdfReader
from shapely.affinity import rotate, translate
from shapely.geometry import Point, box
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
VIEWER = HERE.parent
ROOT = VIEWER.parent
ORIGIN = [447.963, 322.265, 0]
MODULE_ORIGIN = [497.99562, 392.09942]
FLOOR_Z = 20.5431
SOUTH_LIMIT = 410
# Ajuste por ejes de muros de la lámina 20 contra la lectura BIM.
REGISTRATION = {'a': 31.95, 'b': -0.10, 'x0': 716.0, 'y0': 666.0,
                'center': [482.5, 393.0], 'meanErrorM': 0.213}
FEATURED = [
    {'id': 'S04uA7', 'areaM2': 44, 'wallId': '1668170'},
    {'id': 'S04uC12', 'areaM2': 66, 'wallId': '1673391'},
    {'id': 'S04uD14', 'areaM2': 88, 'wallId': '1765028'},
]


def run(pdf_path):
    manifest = json.loads((ROOT / 'runtime-local/revit-fachadas/latest.json').read_text(encoding='utf-8'))
    snapshot = Path(manifest['file'])
    if hashlib.sha256(snapshot.read_bytes()).hexdigest() != manifest['sha256']:
        raise RuntimeError('La lectura local no coincide con el manifiesto')
    page = PdfReader(str(pdf_path)).pages[19]
    image = next(im for im in page.images if im.name == 'X4.png')
    (VIEWER / 'vivienda4-sur-planta.png').write_bytes(image.data)

    apt = defaultdict(list)
    for key, label in json.loads((HERE / 'departamentos.json').read_text(encoding='utf-8')).items():
        if not (label.startswith('S04u') and key.endswith('|0')):
            continue
        _, x, y, _ = key.split('|')
        apt[label].append([round(float(x) + MODULE_ORIGIN[0], 4),
                           round(float(y) + MODULE_ORIGIN[1], 4)])
    apt_polygons = {label: unary_union([translate(rotate(box(-2.75, -2, 2.75, 2),
                          -10, origin=(0, 0)), x, y) for x, y in centers])
                    for label, centers in apt.items()}

    # Los huecos cerrados del raster corresponden a las piezas grandes de
    # mobiliario dibujadas en planta (camas y mesas). El contorno en planta
    # se conserva; las alturas se asignan esquemáticamente en el visor.
    rgba = np.array(image.image.convert('RGBA'))
    mask = (rgba[:, :, 3] < 5).astype('uint8')
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    reg = REGISTRATION
    a, b = reg['a'], reg['b']
    scale2 = a*a + b*b

    def pixel_to_world(px, py):
        dx, dy = px - reg['x0'], py - reg['y0']
        return [reg['center'][0] + (a*dx+b*dy)/scale2,
                reg['center'][1] + (b*dx-a*dy)/scale2]

    furniture = []
    for contour in contours:
        area = cv2.contourArea(contour)
        px, py, w, h = cv2.boundingRect(contour)
        if not (area > 1300 and 40 < w < 160 and 35 < h < 130):
            continue
        center = pixel_to_world(px + w/2, py + h/2)
        apartment = next((name for name, poly in apt_polygons.items()
                          if poly.contains(Point(center))), None)
        if not apartment:
            continue
        corners = [pixel_to_world(px, py), pixel_to_world(px+w, py),
                   pixel_to_world(px+w, py+h), pixel_to_world(px, py+h)]
        kind = 'mesa' if 40 <= w <= 55 and 35 <= h <= 55 else 'cama' if area > 3000 else 'mueble'
        if kind == 'cama':
            # El contorno cerrado del PDF incluye la recámara completa; se
            # conserva su centro, con una huella de cama esquemática de 2×1.6 m.
            cx, cy = center
            corners = [[cx-1, cy+.8], [cx+1, cy+.8],
                       [cx+1, cy-.8], [cx-1, cy-.8]]
        furniture.append({'apartment': apartment, 'kind': kind,
                          'corners': [[round(u, 4), round(v, 4)] for u, v in corners]})

    payload = bytearray()
    elements = []
    with gzip.open(snapshot, 'rt', encoding='utf-8') as lines:
        for line in lines:
            row = json.loads(line)
            if row.get('kind') != 'element' or 'ARQ_VIVIENDA.rvt' not in row.get('source', ''):
                continue
            if row.get('category') not in ('floors', 'walls', 'doors', 'windows') or not row.get('bbox') or not row.get('triangles'):
                continue
            z = row['bbox'][0][2]
            if min(11, max(0, round((z - 10.6431) / 3.3))) != 3:
                continue
            b = row['bbox']
            if b[0][1] + ORIGIN[1] >= SOUTH_LIMIT:
                continue
            vals = [float(v) for tri in row['triangles'] for v in tri]
            offset = len(payload)
            payload.extend(struct.pack('<%sf' % len(vals), *vals))
            elements.append({'id': row['id'], 'category': row['category'], 'name': row['name'],
                             'type': row['type'], 'wallFunction': row.get('wallFunction'),
                             'axis': row.get('axis'), 'bbox': b, 'offset': offset,
                             'floats': len(vals)})
    binary = VIEWER / 'vivienda4-sur.bin'
    binary.write_bytes(payload)
    doc = {'schema': 1, 'sourceSha256': manifest['sha256'], 'pdfPage': 20,
           'pdfSha256': hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
           'origin': ORIGIN, 'floorZ': FLOOR_Z, 'southLimit': SOUTH_LIMIT,
           'registration': REGISTRATION, 'image': 'vivienda4-sur-planta.png',
           'imageSize': [image.image.width, image.image.height],
           'file': binary.name, 'bytes': len(payload),
           'apartments': [{'id': k, 'centers': v} for k, v in sorted(apt.items())],
           'featuredApartments': FEATURED,
           'furniture3dEnabled': False,
           'furniture': furniture,
           'elements': elements,
           'wallLayers': ['Panel de yeso interior', 'Montantes de madera', 'Aislamiento',
                          'Revestimiento estructural (OSB)', 'Membrana impermeable (WRB)',
                          'Paneles de revestimiento exterior']}
    (VIEWER / 'vivienda4-sur.js').write_text('window.ATLAMPA_VIVIENDA4 = ' +
        json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(json.dumps({'apartamentosSeleccionables': len(FEATURED), 'muebles3D': 0,
                      'huellasPDFPorRevisar': len(furniture), 'elementos': len(elements),
                      'bytes': len(payload)}, ensure_ascii=False))


if __name__ == '__main__':
    run(Path(sys.argv[1]))

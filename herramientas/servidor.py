"""Servidor local: archivos editables siempre frescos; librerías versionadas en caché."""
import functools
import http.server
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


RAIZ = Path(__file__).resolve().parents[1]
JARVIS_GESTOS = RAIZ.parent / 'vazquez-industries' / 'Jarvis Corporate' / 'specs' / 'corporate' / 'prototypes' / 'bim-gestos-usb'
ACTIVOS_JARVIS = {
    '/jarvis-gesture/' + nombre: JARVIS_GESTOS / nombre
    for nombre in (
        'vision_bundle.js',
        'camera_bridge.js',
        'hand_landmarker.task',
        'wasm/vision_wasm_internal.js',
        'wasm/vision_wasm_internal.wasm',
        'wasm/vision_wasm_module_internal.js',
        'wasm/vision_wasm_module_internal.wasm',
        'wasm/vision_wasm_nosimd_internal.js',
        'wasm/vision_wasm_nosimd_internal.wasm',
    )
}


class SinCache(http.server.SimpleHTTPRequestHandler):
    def ruta_jarvis(self):
        ruta = urlsplit(self.path).path
        return ruta if unquote(ruta).startswith('/jarvis-gesture') else None

    def activo_jarvis(self):
        ruta = self.ruta_jarvis()
        if ruta is None:
            return None
        archivo = ACTIVOS_JARVIS.get(ruta)
        # Ni rutas codificadas ni enlaces simbólicos pueden ampliar la lista.
        if archivo and archivo.is_file() and not archivo.is_symlink() and archivo.resolve().is_relative_to(JARVIS_GESTOS.resolve()):
            return archivo
        return False

    def do_GET(self):
        if self.activo_jarvis() is False:
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.activo_jarvis() is False:
            self.send_error(404)
            return
        super().do_HEAD()

    def translate_path(self, path):
        archivo = self.activo_jarvis()
        return str(archivo) if archivo else super().translate_path(path)

    def end_headers(self):
        path = urlsplit(self.path).path
        if path.startswith('/jarvis-gesture'):
            self.send_header('Cache-Control', 'no-store')
        elif path.startswith(('/lib/', '/fuentes/')):
            self.send_header('Cache-Control', 'private, max-age=86400, immutable')
        else:
            self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


if __name__ == '__main__':
    # el puerto: el que asigne la app (PORT), si no el de la línea de comandos, si no 8130
    puerto = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8130))
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(SinCache, directory=RAIZ)).serve_forever()

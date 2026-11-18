"""Servidor local: archivos editables siempre frescos; librerías versionadas en caché."""
import functools
import http.server
import os
import sys
from urllib.parse import urlsplit


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        path = urlsplit(self.path).path
        if path.startswith(('/lib/', '/fuentes/')):
            self.send_header('Cache-Control', 'private, max-age=86400, immutable')
        else:
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    # el puerto: el que asigne la app (PORT), si no el de la línea de comandos, si no 8130
    puerto = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8130))
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(SinCache, directory=raiz)).serve_forever()

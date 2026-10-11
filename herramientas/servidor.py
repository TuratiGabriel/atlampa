"""Servidor local del diagrama sin caché: el navegador siempre pide la última
versión de cada archivo (con http.server a secas, a veces se quedaba con un
JS viejo).   python diagrama/herramientas/servidor.py 8130"""
import functools
import http.server
import os
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    # el puerto: el que asigne la app (PORT), si no el de la línea de comandos, si no 8130
    puerto = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8130))
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(SinCache, directory=raiz)).serve_forever()

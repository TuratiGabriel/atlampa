"""Valida los datos de programa/: estructura, fuente y estado de cada cifra manual, y que no se cuelen
rutas personales ni correos. Uso: python programa/validar.py (desde la raíz del repo)."""
import json
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

AQUI = os.path.dirname(os.path.abspath(__file__))
ESTADOS = {'confirmado', 'calculado_a_mano', 'dato_del_equipo', 'supuesto', 'por_confirmar'}
errores = []


def cargar(ruta):
    try:
        return json.load(open(os.path.join(AQUI, ruta), encoding='utf-8'))
    except Exception as e:
        errores.append('%s: no se puede leer (%s)' % (ruta, e))
        return None


manual = cargar('datos/manual.json')
if manual:
    for grupo, cifras in manual.items():
        if grupo.startswith('_') or grupo == 'pendientes_sin_dato':
            continue
        for clave, c in cifras.items():
            donde = 'manual.json: %s.%s' % (grupo, clave)
            for campo in ('valor', 'unidad', 'estado', 'fuente'):
                if campo not in c:
                    errores.append('%s: falta «%s»' % (donde, campo))
            if c.get('estado') not in ESTADOS:
                errores.append('%s: estado «%s» no válido (usa %s)' % (donde, c.get('estado'), ', '.join(sorted(ESTADOS))))
            if not str(c.get('fuente', '')).strip():
                errores.append('%s: fuente vacía' % donde)
            if not isinstance(c.get('valor'), (int, float)):
                errores.append('%s: valor debe ser número' % donde)

arboles = cargar('datos/arboles.json')
if arboles:
    for i, a in enumerate(arboles.get('arboles', [])):
        if len(a) < 4 or not all(isinstance(x, (int, float)) for x in a[:4]):
            errores.append('arboles.json: árbol %d mal formado (u, v, altura, radio)' % i)
        elif not (0.5 <= a[2] <= 30 and 0.3 <= a[3] <= 15):
            errores.append('arboles.json: árbol %d con altura o radio raros (%s, %s)' % (i, a[2], a[3]))
    for k in ('PRED', 'GUP'):
        if k not in arboles:
            errores.append('arboles.json: falta %s' % k)

prog = cargar('programa.json')
if prog:
    for k in ('generado', 'figuras', 'fuentes'):
        if k not in prog:
            errores.append('programa.json: falta «%s»' % k)
    for k in prog.get('figuras', {}):
        if k not in prog.get('fuentes', {}):
            errores.append('programa.json: la cifra «%s» no tiene fuente' % k)

# privacidad: nada de rutas de Windows personales ni correos
PATRON = re.compile(r'[A-Za-z]:\\Users\\|/Users/[a-z]+/|\b[\w.+-]+@[A-Za-z][\w-]*\.[A-Za-z]{2,}\b')
for raiz, _, archivos in os.walk(AQUI):
    for f in archivos:
        if f.endswith(('.json', '.md', '.html', '.py')):
            ruta = os.path.join(raiz, f)
            if os.path.abspath(ruta) == os.path.abspath(__file__):
                continue
            m = PATRON.search(open(ruta, encoding='utf-8', errors='ignore').read())
            if m:
                errores.append('%s: contiene una ruta personal o un correo («%s»)' % (os.path.relpath(ruta, AQUI), m.group(0)))

if errores:
    print('\n'.join('X ' + e for e in errores))
    sys.exit(1)
print('OK')

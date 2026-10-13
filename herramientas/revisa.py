"""Revisión rápida del repo antes de subir (y en cada pull request: .github/workflows/revisa.yml).

Uso, desde la raíz del repo:
    python herramientas/revisa.py                        # todo lo de abajo
    python herramientas/revisa.py --base origin/master   # además: si cambió un archivo del sitio, ¿subió V?

Revisa:
1. que no queden marcas de conflicto de git (<<<<<<< ======= >>>>>>>);
2. la sintaxis de cada .js (node --check; si no hay node, se avisa y se salta) y de cada .py;
3. que los .html sean los que genera paginas.py (nadie los editó a mano ni olvidó regenerarlos);
4. que exista cada archivo local que pide el sitio: scripts, estilos, lib/ de Three.js y sus complementos, imports y fetch;
5. los datos de programa/ (programa/validar.py);
6. con --base: si cambió un .js o .css del sitio, que V haya subido en paginas.py (si no, el navegador usa el viejo).
No necesita rhino3dm ni el .3dm: no regenera los datos, sólo revisa lo que hay."""
import importlib.util
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from contextlib import redirect_stdout

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BINARIOS = ('.3dm', '.woff2', '.woff', '.png', '.jpg', '.jpeg', '.pdf', '.dwg', '.dxf', '.ico')
errores, avisos = [], []


def git(*args):
    return subprocess.run(['git', '-C', RAIZ] + list(args), capture_output=True, text=True, encoding='utf-8').stdout


def archivos(*patrones):
    return [f for f in git('ls-files', '--', *patrones).splitlines() if f]


def leer(rel):
    return open(os.path.join(RAIZ, rel), encoding='utf-8', errors='replace').read()


def paso(titulo, n_antes):
    nuevos = len(errores) - n_antes
    print(('  ok  ' if not nuevos else '  ✗   ') + titulo + ('' if not nuevos else ' (%d)' % nuevos))


# 1. marcas de conflicto
n = len(errores)
MARCA = re.compile(r'^(<{7} |>{7} |={7}$)', re.M)
for f in archivos():
    if f.lower().endswith(BINARIOS) or not os.path.exists(os.path.join(RAIZ, f)):
        continue
    t = leer(f)
    m = MARCA.search(t)
    if m:
        errores.append('%s:%d: marca de conflicto de git sin resolver' % (f, t.count('\n', 0, m.start()) + 1))
paso('sin marcas de conflicto', n)

# 2. sintaxis
n = len(errores)
node = shutil.which('node')
js = archivos('*.js')
if node:
    for f in js:
        if not os.path.exists(os.path.join(RAIZ, f)):
            continue   # borrado: si alguien lo pide, lo dice el paso 4
        r = subprocess.run([node, '--check', os.path.join(RAIZ, f)], capture_output=True, text=True, encoding='utf-8')
        if r.returncode:
            lineas = r.stderr.strip().splitlines() or ['']
            donde = re.search(r':(\d+)$', lineas[0])
            que = next((l.strip() for l in lineas if 'Error' in l), lineas[-1])
            errores.append('%s%s: %s' % (f, ':' + donde.group(1) if donde else '', que))
    paso('sintaxis de %d .js' % len(js), n)
else:
    avisos.append('no hay node: no se revisó la sintaxis de los .js (instálalo de nodejs.org)')
n = len(errores)
py = archivos('*.py')
for f in py:
    try:
        compile(leer(f), f, 'exec')
    except SyntaxError as e:
        errores.append('%s:%s: error de sintaxis: %s' % (f, e.lineno, e.msg))
paso('sintaxis de %d .py' % len(py), n)

# 3. html al día con paginas.py
n = len(errores)
spec = importlib.util.spec_from_file_location('paginas', os.path.join(AQUI, 'paginas.py'))
paginas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paginas)
with tempfile.TemporaryDirectory() as tmp:
    paginas.RAIZ = tmp
    with redirect_stdout(io.StringIO()):
        paginas.main()
    html = sorted(os.listdir(tmp))
    for f in html:
        nuevo = open(os.path.join(tmp, f), encoding='utf-8').read()
        if not os.path.exists(os.path.join(RAIZ, f)):
            errores.append('%s: falta; corre python herramientas/paginas.py' % f)
        elif leer(f) != nuevo:
            errores.append('%s: no es la que genera paginas.py; corre python herramientas/paginas.py (no se editan a mano)' % f)
paso('%d páginas iguales a las que genera paginas.py' % len(html), n)

# 4. archivos locales que pide el sitio
n = len(errores)


def existe(ref, desde):
    ref = ref.split('?')[0].split('#')[0]
    if not ref or re.match(r'^(https?:|data:|mailto:|//)', ref):
        return
    if not os.path.exists(os.path.join(RAIZ, os.path.normpath(ref))):
        errores.append('%s pide %s, que no existe' % (desde, ref))


mapa = {}
for f in html:
    t = leer(f)
    for ref in re.findall(r'(?:src|href)="([^"]+)"', t):
        existe(ref, f)
    im = re.search(r'<script type="importmap">(.*?)</script>', t, re.S)
    if im:
        mapa = json.loads(im.group(1)).get('imports', {})
        for ref in mapa.values():
            existe(ref, f + ' (importmap)')
sitio = [f for f in js if '/' not in f]
for f in sitio:
    t = leer(f)
    for ref in re.findall(r"""import\(\s*['"](\./[^'"]+)['"]""", t) + re.findall(r"""fetch\(\s*['"]([^'"]+)['"]""", t):
        existe(ref, f)
    for esp in set(re.findall(r"""from\s+['"]([^'"./][^'"]*)['"]""", t)):
        pref = max((p for p in mapa if esp == p or (p.endswith('/') and esp.startswith(p))), key=len, default=None)
        if pref is None:
            errores.append('%s importa %s, que no está en el importmap de paginas.py' % (f, esp))
        else:
            existe(mapa[pref] + esp[len(pref):] if pref.endswith('/') else mapa[pref], f)
paso('archivos que pide el sitio (scripts, estilos, lib/, imports, fetch)', n)

# 5. programa/
n = len(errores)
r = subprocess.run([sys.executable, os.path.join(RAIZ, 'programa', 'validar.py')], capture_output=True, text=True,
                   encoding='utf-8', cwd=RAIZ)
if r.returncode:
    errores.append('programa/validar.py:\n      ' + (r.stdout + r.stderr).strip().replace('\n', '\n      '))
paso('datos de programa/ (validar.py)', n)

# 6. ¿subió V?
if '--base' in sys.argv:
    n = len(errores)
    base = sys.argv[sys.argv.index('--base') + 1]
    mb = git('merge-base', base, 'HEAD').strip()
    if not mb:
        avisos.append('no encontré %s: no se revisó si subió V' % base)
    else:
        cambiados = git('diff', '--name-only', mb, 'HEAD').splitlines()
        sitio_cambia = [f for f in cambiados if re.match(r'^(atlampa[^/]*\.(js|css)|lib/.*)$', f)]
        def v_en(texto):
            m = re.search(r"^V = '([^']+)'", texto, re.M)
            return m and m.group(1)
        v_base = v_en(git('show', mb + ':herramientas/paginas.py'))
        v_ahora = v_en(leer('herramientas/paginas.py'))
        if sitio_cambia and v_base == v_ahora:
            errores.append('cambiaron %s pero V sigue en %s: súbela en herramientas/paginas.py y corre paginas.py'
                           % (', '.join(sitio_cambia[:4]) + (' …' if len(sitio_cambia) > 4 else ''), v_ahora))
        paso('V subió si cambió el sitio (contra %s)' % base, n)

for a in avisos:
    print('  aviso ' + a)
if errores:
    print('\n%d problema(s):' % len(errores))
    for e in errores:
        print('  - ' + e)
    sys.exit(1)
print('\nOK')

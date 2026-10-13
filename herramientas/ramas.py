"""Ramas del equipo: ver cada una en local y mezclarlas sin pelearse con la versión ni las páginas.

Uso, desde la raíz del repo (la carpeta diagrama/):
    python herramientas/ramas.py                      # estado: qué tiene cada rama sin integrar y si choca con master
    python herramientas/ramas.py ver <rama>           # abre esa rama en el navegador, tal cual está
    python herramientas/ramas.py ver <rama> --mezcla  # … y cómo queda mezclada con master
    python herramientas/ramas.py ver todo             # master con todas las ramas pendientes: el «merge general»
    python herramientas/ramas.py actualiza <rama>     # trae lo nuevo de master a la rama (antes de seguir trabajando en ella)
    python herramientas/ramas.py integra <rama>       # mete la rama a master (lo que hace el botón Merge de un PR)

Nada toca tu carpeta de trabajo: cada vista o mezcla se arma en una copia aparte (git worktree) que se borra al terminar.
El choque de siempre entre ramas (V en paginas.py y los .html, que se generan) se resuelve solo: V nueva y páginas
regeneradas con paginas.py. Si chocan archivos de diseño (scripts, datos, fichas), no adivina: se detiene y dice cuáles.
Antes de subir corre revisa.py y pregunta (con --si no pregunta; con --no no sube nada)."""
import datetime
import functools
import http.server
import importlib.util
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import webbrowser

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
PRINCIPAL = 'master'


def git(*args, donde=RAIZ, revisa=True):
    r = subprocess.run(['git', '-C', donde] + list(args), capture_output=True, text=True, encoding='utf-8', errors='replace')
    if revisa and r.returncode:
        raise SystemExit('git %s falló:\n%s' % (' '.join(args), (r.stderr or r.stdout).strip()))
    return r.stdout.strip()


def cargar(nombre):
    spec = importlib.util.spec_from_file_location(nombre, os.path.join(AQUI, nombre + '.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def ref(rama):
    """origin/<rama> si existe en GitHub; si no, la rama local o el commit tal cual."""
    for r in ('origin/' + rama, rama):
        if git('rev-parse', '--verify', '--quiet', r + '^{commit}', revisa=False):
            return r
    raise SystemExit('No encuentro la rama «%s». Ramas: %s' % (rama, ', '.join(ramas())))


def ramas():
    return [r[len('origin/'):] for r in git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin').splitlines()
            if r.startswith('origin/') and r not in ('origin/HEAD', 'origin/' + PRINCIPAL)]


def generados():
    """Lo que se genera y se puede rehacer: las páginas de paginas.py."""
    p = cargar('paginas')
    return {p.pagina(k) for k in p.APARTADOS}


def choques(a, b):
    """Archivos que chocarían al mezclar a con b (sin tocar nada). None si este git no sabe hacerlo."""
    r = subprocess.run(['git', '-C', RAIZ, 'merge-tree', '--write-tree', '--name-only', a, b],
                       capture_output=True, text=True, encoding='utf-8')
    if r.returncode not in (0, 1):
        return None
    if r.returncode == 0:
        return []
    lineas = r.stdout.split('\n\n')[0].splitlines()[1:]
    return sorted(set(l for l in lineas if l))


# ---------------------------------------------------------------- estado

def estado():
    print('Trayendo lo nuevo de GitHub…')
    git('fetch', '--prune', 'origin')
    gen = generados() | {'herramientas/paginas.py'}
    m = 'origin/' + PRINCIPAL
    print('\n%s: %s\n' % (PRINCIPAL, git('log', '-1', '--format=%h %s (%an, %ad)', '--date=short', m)))
    pendientes, tocados = [], {}
    for r in sorted(ramas(), key=lambda r: git('log', '-1', '--format=%ct', 'origin/' + r), reverse=True):
        o = 'origin/' + r
        nuevos = git('log', '--format=  · %h %s (%an, %ad)', '--date=short', '%s..%s' % (m, o)).splitlines()
        atras = int(git('rev-list', '--count', '%s..%s' % (o, m)))
        if not nuevos:
            print('%s — ya está en %s%s' % (r, PRINCIPAL, (' (le faltan %d commits de master: si su autor sigue en ella, '
                                                            'que la actualice primero)' % atras) if atras else ''))
            continue
        pendientes.append(r)
        print('%s — %d commit(s) sin integrar, %d atrás de %s' % (r, len(nuevos), atras, PRINCIPAL))
        for n in nuevos[:6]:
            print(n)
        if len(nuevos) > 6:
            print('  · … y %d más' % (len(nuevos) - 6))
        c = choques(m, o)
        if c is None:
            print('  ? no pude probar la mezcla (actualiza git a 2.38 o más)')
        elif not c:
            print('  ✓ se mezcla con %s sin conflictos' % PRINCIPAL)
        elif set(c) <= gen:
            print('  ✓ sólo choca en la versión y las páginas: se resuelve solo (ramas.py integra %s)' % r)
        else:
            print('  ✗ choca en archivos de diseño: %s' % ', '.join(f for f in c if f not in gen))
        base = git('merge-base', m, o)
        tocados[r] = set(git('diff', '--name-only', base, o).splitlines()) - gen
        print()
    for i, a in enumerate(pendientes):
        for b in pendientes[i + 1:]:
            comun = tocados[a] & tocados[b]
            if comun:
                print('Ojo: %s y %s tocan los mismos archivos: %s' % (a, b, ', '.join(sorted(comun)[:5])))
    if not pendientes:
        print('Todo está integrado en %s.' % PRINCIPAL)


# ---------------------------------------------------------------- mezclar

def nueva_v(*vs):
    """Una V más nueva que todas: la fecha de hoy y la letra que siga."""
    hoy = datetime.date.today().strftime('%Y%m%d')
    tope = max([v for v in vs if v] + [''])
    for letra in 'abcdefghijklmnopqrstuvwxyz':
        if hoy + letra > tope:
            return hoy + letra
    return tope + 'a'


SITIO = re.compile(r'^(atlampa[^/]*\.(js|css)|lib/.*)$')   # lo que el navegador guarda: si cambia, sube V (igual que revisa.py)


def v_de(texto):
    m = re.search(r"^V = '([^']*)'", texto or '', re.M)
    return m and m.group(1)


def mezcla(copia, otra, que):
    """Mezcla `otra` en la copia. Resuelve sola la versión y las páginas; si choca algo más, se detiene.
    Devuelve (ok, archivos de diseño en conflicto)."""
    r = subprocess.run(['git', '-C', copia, 'merge', '--no-ff', '--no-commit', otra], capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    conflicto = git('diff', '--name-only', '--diff-filter=U', donde=copia).splitlines()
    if r.returncode and not conflicto:
        raise SystemExit('git merge falló:\n' + (r.stderr or r.stdout).strip())
    gen = generados()
    disenio = [f for f in conflicto if f not in gen and f != 'herramientas/paginas.py']
    if 'herramientas/paginas.py' in conflicto:
        texto = open(os.path.join(copia, 'herramientas/paginas.py'), encoding='utf-8').read()
        trozos = re.findall(r'^<{7}[^\n]*\n(.*?)^={7}\n(.*?)^>{7}[^\n]*\n', texto, re.S | re.M)
        sin_v = lambda t: re.sub(r"^V = '[^']*'.*\n", '', t, flags=re.M)
        if any(sin_v(a) != sin_v(b) for a, b in trozos):
            disenio.append('herramientas/paginas.py')
    if disenio:
        git('merge', '--abort', donde=copia)
        return False, disenio
    # la versión: más nueva que las dos si chocaron, o si la otra trae cambios del sitio y V se quedó en la nuestra
    p = os.path.join(copia, 'herramientas/paginas.py')
    texto = open(p, encoding='utf-8').read()
    nuestra, suya = v_de(git('show', 'HEAD:herramientas/paginas.py', donde=copia)), v_de(git('show', otra + ':herramientas/paginas.py', donde=copia))
    texto = re.sub(r'^<{7}[^\n]*\n(.*?)^={7}\n(.*?)^>{7}[^\n]*\n', lambda m: m.group(1), texto, flags=re.S | re.M)
    base = git('merge-base', 'HEAD', otra, donde=copia)
    trae_sitio = any(SITIO.match(f) for f in git('diff', '--name-only', base, otra, donde=copia).splitlines())
    if conflicto or (trae_sitio and v_de(texto) == nuestra):
        v = nueva_v(nuestra, suya)
        texto = re.sub(r"^V = '[^']*'", "V = '%s'" % v, texto, count=1, flags=re.M)
        open(p, 'w', encoding='utf-8', newline='\n').write(texto)
        subprocess.run([sys.executable, p], cwd=copia, capture_output=True, check=True)
        git('add', 'herramientas/paginas.py', *sorted(gen), donde=copia)
        print('  · %s: versión %s y páginas regeneradas con paginas.py' % (que, v))
    return True, []


def es_ancestro(a, b):
    return subprocess.run(['git', '-C', RAIZ, 'merge-base', '--is-ancestor', a, b]).returncode == 0


def barre_copias():
    """Borra las copias que quedaron de otras veces (p. ej. si se cerró la ventana sin Ctrl+C)."""
    tmp = os.path.realpath(tempfile.gettempdir())
    for linea in git('worktree', 'list', '--porcelain').splitlines():
        d = linea[len('worktree '):] if linea.startswith('worktree ') else ''
        if os.path.basename(d).startswith('atlampa-') and os.path.dirname(os.path.realpath(d)) == tmp:
            borra_copia(d)


def copia_temporal(desde):
    barre_copias()
    d = tempfile.mkdtemp(prefix='atlampa-')
    git('worktree', 'add', '--detach', d, desde)
    return d


def borra_copia(d):
    git('worktree', 'remove', '--force', d, revisa=False)
    shutil.rmtree(d, ignore_errors=True)
    git('worktree', 'prune', revisa=False)


def revisa(copia):
    r = subprocess.run([sys.executable, os.path.join(copia, 'herramientas', 'revisa.py'), '--base', 'origin/' + PRINCIPAL],
                       cwd=copia, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print('\n'.join('  ' + l for l in r.stdout.rstrip().splitlines()))
    return r.returncode == 0


def sube(copia, destino, opciones):
    if '--no' in opciones:
        print('No subí nada (--no).')
        return
    if '--si' not in opciones:
        if input('¿Lo subo a %s en GitHub? (s/n) ' % destino).strip().lower() not in ('s', 'si', 'sí', 'y'):
            print('No subí nada.')
            return
    git('push', 'origin', 'HEAD:' + destino, donde=copia)
    print('Subido a %s.' % destino)


def actualiza(rama, opciones, hacia=None):
    """`actualiza`: master → rama. `integra`: rama → master."""
    git('fetch', '--prune', 'origin')
    destino, otra = (rama, 'origin/' + PRINCIPAL) if hacia is None else (PRINCIPAL, ref(rama))
    if es_ancestro(otra, ref(destino)):
        print('%s ya tiene todo lo de %s: nada que hacer.' % (destino, otra.replace('origin/', '')))
        return 0
    copia = copia_temporal(ref(destino))
    try:
        print('Mezclando %s en %s…' % (otra.replace('origin/', ''), destino))
        ok, disenio = mezcla(copia, otra, destino)
        if not ok:
            print('\n✗ Chocan archivos de diseño: %s.\n  No los resuelvo a ciegas: que lo decida el autor de la rama '
                  '(o pídeselo a Claude con contexto). No subí nada.' % ', '.join(disenio))
            return 1
        git('commit', '--no-edit', '-m', 'Mezcla %s en %s' % (otra.replace('origin/', ''), destino), donde=copia)
        print('Revisión (revisa.py) del resultado:')
        if not revisa(copia):
            print('\n✗ La revisión encontró problemas (arriba). No subí nada.')
            return 1
        sube(copia, destino, opciones)
        return 0
    finally:
        borra_copia(copia)


# ---------------------------------------------------------------- ver en local

def puerto_libre(desde=8131):
    for p in range(desde, desde + 50):
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', p)):
                return p
    raise SystemExit('No hay puerto libre entre %d y %d' % (desde, desde + 50))


def ver(rama, opciones):
    git('fetch', '--prune', 'origin')
    todo = rama == 'todo'
    copia = copia_temporal('origin/' + PRINCIPAL if todo or '--mezcla' in opciones else ref(rama))
    try:
        if todo or '--mezcla' in opciones:
            lista = [r for r in ramas() if git('rev-list', '--count', 'origin/%s..origin/%s' % (PRINCIPAL, r)) != '0'] \
                if todo else [rama]
            for r in lista:
                ok, disenio = mezcla(copia, ref(r), r)
                if ok:
                    git('commit', '--no-edit', '-m', 'vista: ' + r, donde=copia, revisa=False)
                    print('  ✓ %s' % r)
                else:
                    print('  ✗ %s se queda fuera: choca en %s' % (r, ', '.join(disenio)))
        puerto = puerto_libre()
        url = 'http://localhost:%d/' % puerto
        que = 'todas las ramas pendientes sobre ' + PRINCIPAL if todo else rama + (' mezclada con ' + PRINCIPAL if '--mezcla' in opciones else '')
        print('\nViendo %s en %s\n(cópialo al navegador si no se abre solo; Ctrl+C para terminar y borrar la copia)' % (que, url))
        class Callado(cargar('servidor').SinCache):
            def log_message(self, *a):
                pass

        def cierra(*a):   # cerrar la ventana o terminar el proceso = Ctrl+C: igual se borra la copia
            raise KeyboardInterrupt
        signal.signal(signal.SIGTERM, cierra)
        servidor = http.server.ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(Callado, directory=copia))
        if '--sin-navegador' not in opciones:
            webbrowser.open(url)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            servidor.server_close()
    finally:
        borra_copia(copia)
        print('Copia borrada.')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opciones = [a for a in sys.argv[1:] if a.startswith('--')]
    if not args:
        estado()
    elif args[0] == 'ver' and len(args) == 2:
        ver(args[1], opciones)
    elif args[0] == 'actualiza' and len(args) == 2:
        sys.exit(actualiza(args[1], opciones))
    elif args[0] == 'integra' and len(args) == 2:
        sys.exit(actualiza(args[1], opciones, hacia=PRINCIPAL))
    else:
        print(__doc__)

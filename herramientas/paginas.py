"""Las páginas del visor (index.html y una por apartado) desde una plantilla.

    python herramientas/paginas.py      (desde diagrama/)

Todas comparten el dibujo 3D (atlampa-3d.js con <body data-escena>), la
página (atlampa-pagina.js) y el mismo tablero: el modelo a pantalla completa
y encima, como en un videojuego, los menús desplegables, el minimapa en la
esquina y la ficha del apartado. Menús:
  Propuesto  Predio completo y cada parte del proyecto (vivienda, comercio,
             industria, arte y cultura, aro, paisajismo, estacionamiento,
             estructura); al picar una se abre su submenú: Inspeccionar (ir a
             su apartado) y Ocultar / Mostrar.
  Capas      Paisaje, Sol y Contexto urbano (éste sólo en la general).
  Diagramas  Accesos, Personas, Flujos, Árboles y Postes.
  Vista      Color, Perspectiva, Mapa Nolli, Estilo y Resaltar (uno a la vez).
  Leyenda    Espuela, Banqueta y Agua.
Al cambiar de apartado sólo cambian la ruta y la ficha: lo prendido y lo
oculto se quedan como estaban. No editar los .html a mano.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
V = '20261012f'      # versión de los archivos (para que el navegador no use los viejos)

SOTANOS = '''
      <div class="hud-grupo" role="group" aria-label="Sótanos">
        <button class="hud-op" type="button" data-sotano="0" aria-pressed="true">Todos</button>
        <button class="hud-op" type="button" data-sotano="1" aria-pressed="false">S1 · −3.5</button>
        <button class="hud-op" type="button" data-sotano="2" aria-pressed="false">S2 · −7.0</button>
        <button class="hud-op" type="button" data-sotano="3" aria-pressed="false">S3 · −10.5</button>
        <button class="hud-op" type="button" data-sotano="4" aria-pressed="false">S4 · −14.0</button>
      </div>
      <button class="hud-op hud-op--linea" type="button" data-capa="separa" aria-pressed="false">Separar niveles</button>'''

GENERAL_DESC = ('Axonometría del predio de Atlampa entre las calles del Fresno, Sabino y Clavel y la avenida Profesora '
                'Eulalia Guzmán: las dos naves de comercio cortadas por el círculo del aro, el aro elevado, la industria, '
                'el edificio de arte y cultura con su plaza, los módulos de vivienda apilados hasta ocho '
                'niveles, el paisaje de la planta baja (áreas verdes, humedales, estanques y la laguna), el estacionamiento '
                'en sótanos como un volumen tenue y la espuela de ferrocarril por la calle Heliotropo. Los menús de arriba '
                'abren o esconden cada parte de lo propuesto, prenden capas y diagramas (contexto urbano, sol, flujos, '
                'postes, personas, accesos) y resaltan lo público, lo privado o un programa. Arrastrar orbita la cámara; con el botón derecho se mueve; '
                'la rueda acerca hacia el cursor.')

APARTADOS = {
    'general': {
        'titulo': 'Atlampa', 'pagina': 'index.html', 'ruta': 'Col. Atlampa, Cuauhtémoc, CDMX',
        'desc': GENERAL_DESC, 'datos': [], 'extra': '', 'leyenda': [],
    },
    'estacionamiento': {
        'titulo': 'Estacionamiento',
        'desc': 'Dos estacionamientos independientes bajo el predio, norte y sur, de cuatro sótanos de 3.5 m cada uno, '
                'dibujados en líneas para que se vean todos los niveles a la vez: el contorno de cada sótano, sus cajones, '
                'la cisterna, el cuarto de máquinas y los biodigestores en el primer sótano, y las dos rampas helicoidales '
                'dobles que bajan un sótano por vuelta desde la planta baja.',
        'datos': ['2 bloques independientes', '4 sótanos de 3.5 m', '263 cajones por sótano · 1052 en total',
                  'Norte 130 · sur 133 por sótano', 'Helicoidales dobles desde la planta baja'],
        'extra': SOTANOS,
        'leyenda': ['<li><i class="ad-leyenda__est"></i>Sótano</li>', '<li><i class="ad-leyenda__cajon"></i>Cajón</li>',
                    '<li><i class="ad-leyenda__helice"></i>Helicoidal</li>'],
    },
    'comercio': {
        'titulo': 'Comercio',
        'desc': 'Las dos naves de comercio, de techos a dos aguas con crujías de 17.97 m, cortadas por el círculo del aro.',
        'datos': ['Nave sur: 3 crujías', 'Nave norte: 2 crujías', 'Alero +6.20 · cumbrera +9.20'],
        'extra': '', 'leyenda': [],
    },
    'industria': {
        'titulo': 'Industria',
        'desc': 'La nave industrial.',
        'datos': ['Nave industrial'],
        'extra': '', 'leyenda': [],
    },
    'cultura': {
        'titulo': 'Arte y cultura',
        'desc': 'Los dos pabellones curvos de arte y cultura bajo el aro, de dos niveles, con el pasaje entre ambos y la plaza cultural.',
        'datos': ['2 pabellones de 2 niveles', 'Fondo de 12 m, al ras del aro', 'Plaza cultural ≈ 1,645 m²'],
        'extra': '', 'leyenda': [],
    },
    'aro': {
        'titulo': 'Aro',
        'desc': 'El aro elevado: una losa anular a +10.03 sobre dos filas de columnas, con su barandal.',
        'datos': ['Losa a +10.03', 'Radio interior 39.5 m · exterior 46.55 m', 'Dos filas de columnas de 0.80 m'],
        'extra': '', 'leyenda': [],
    },
    'paisajismo': {
        'titulo': 'Paisajismo',
        'desc': 'La planta baja como paisaje y como la parte visible de la máquina viva que limpia el agua: '
                'todo lo que no tiene desplante es área verde, y donde está el proyecto de paisaje, una propuesta de '
                'plantación (árboles, arbustos, pastos y flores) sobre cubresuelos de tezontle, filtros vegetados '
                '(humedales) a la vista, estanques con fuente, la laguna principal, la guía de agua que la cruza, los '
                'jardines inundables, los senderos y el pavimento radial del hito. Las tuberías todavía no se dibujan.',
        'datos': ['Máquina viva: humedales, estanques y laguna', 'Área verde: todo lo que no tiene desplante',
                  '240 columnas llegan al piso', 'Tuberías: pendientes'],
        'extra': '', 'leyenda': [],
    },
}


def pagina(k):
    return APARTADOS[k].get('pagina', k + '.html')


# capa: [clave, nombre, prendida de inicio, clases extra] (solo-general: sólo en
# la general)
CAPAS = [('modulos', 'Módulos', True, ''), ('paisaje', 'Paisaje', True, ''), ('sol', 'Sol', False, ''),
         ('contexto', 'Contexto urbano', False, 'solo-general')]
DIAGRAMAS = [('accesos', 'Accesos', False, ''), ('personas', 'Personas', False, ''),
             ('flujos', 'Flujos', False, ''), ('arboles', 'Árboles', False, ''), ('postes', 'Postes', False, ''),
             ('esquema', 'Esquema compositivo', False, ''), ('corte', 'Corte en planta (1.75 m)', False, '')]
RESALTA = [('', 'Nada'), ('espacio', '<i class="hud-esp hud-esp--pub"></i>Público / <i class="hud-esp hud-esp--pri"></i>privado'), ('modulos', 'Vivienda'),
           ('comercio', 'Comercio'), ('cultura', 'Arte y cultura'), ('industria', 'Industria'),
           ('aro', 'Aro'), ('paisajismo', 'Paisaje')]
# Propuesto: [clave para ocultar, nombre]. Las que tienen apartado van a él al
# inspeccionar; la vivienda se resalta y la estructura es una capa (apagada de
# inicio).
# (el aro no: siempre está, conecta todo; al inspeccionar cualquier cosa se queda, con su color)
PROPUESTO = [('vivienda', 'Vivienda'), ('comercio', 'Comercio'), ('industria', 'Industria'), ('cultura', 'Arte y cultura'),
             ('paisajismo', 'Paisajismo'), ('estacionamiento', 'Estacionamiento'), ('estructura', 'Estructura')]

# Leyenda: data-l = la capa de la que depende (se oculta si está apagada)
LEYENDA = '''
          <li><i class="ad-leyenda__espuela"></i>Espuela</li>
          <li><i class="ad-leyenda__banqueta"></i>Banqueta</li>
          <li data-l="paisaje"><i class="ad-leyenda__agua"></i>Agua</li>'''

PLANTILLA = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlampa · {titulo_doc}</title>
<link rel="stylesheet" href="atlampa.css?v={v}">
<link rel="stylesheet" href="atlampa-3d-ctx.css?v={v}">
<!-- Three.js del CDN (pendiente: copiarlo a lib/ para presentar sin internet) -->
<script type="importmap">{{"imports": {{"three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}}}</script>
</head>
<body data-escena="{clave}">
<!-- Generada por herramientas/paginas.py: no editar a mano. -->
<main class="ad-pagina">
  <section class="ad-trabajo" aria-label="Modelo">
    <svg class="ad-dibujo" data-dibujo role="img" tabindex="0" aria-labelledby="ad-titulo-dibujo" aria-describedby="ad-desc-dibujo">
      <title id="ad-titulo-dibujo">Axonometría · {titulo}</title>
      <desc id="ad-desc-dibujo">{desc}</desc>
    </svg>
  </section>

  <header class="hud-cabeza">
    <a class="hud-marca" href="index.html" data-ir="general">Atlampa</a>
    <span class="hud-ruta" data-ruta>{ruta}</span>
  </header>

  <nav class="hud-barra" aria-label="Menús">
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">Propuesto</summary>
      <div class="hud-panel hud-panel--propuesto">
        <a class="hud-op hud-ir" href="index.html" data-ir="general">Predio completo</a>
{propuesto}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">Capas</summary>
      <div class="hud-panel">
{capas}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">Diagramas</summary>
      <div class="hud-panel">
{diagramas}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">Vista</summary>
      <div class="hud-panel">
        <button class="hud-op hud-op--color" type="button" data-capa="color" aria-pressed="false">Color</button>
        <button class="hud-op" type="button" data-capa="perspectiva" aria-pressed="true">Perspectiva</button>
        <button class="hud-op" type="button" data-capa="planta" aria-pressed="false">Planta</button>
        <button class="hud-op" type="button" data-capa="nolli" aria-pressed="false">Mapa Nolli</button>
        <p class="hud-panel__t">Estilo</p>
        <button class="hud-op hud-op--radio" type="button" data-estilo="rayado" aria-pressed="true">Rayado</button>
        <button class="hud-op hud-op--radio" type="button" data-estilo="plano" aria-pressed="false">Plano</button>
        <p class="hud-panel__t">Resaltar</p>
{resalta}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">Leyenda</summary>
      <div class="hud-panel">
        <ul class="ad-leyenda">{leyenda}
        </ul>
        <p class="ad-fuente">Calles © colaboradores de OpenStreetMap</p>
      </div>
    </details>
  </nav>

  <aside class="hud-ficha" data-ficha{ficha_oculta}>
{ficha}
  </aside>

  <div class="hud-camara">
    <svg class="ad-mini" data-minimapa role="button" tabindex="0" aria-label="Brújula: nortear la vista"></svg>
    <div class="ad-zoom" role="group" aria-label="Zoom">
      <button class="ad-zoom__b" type="button" data-zoom="mas" aria-label="Acercar">+</button>
      <button class="ad-zoom__b" type="button" data-zoom="0" aria-label="Regresar al encuadre">⟲</button>
      <button class="ad-zoom__b" type="button" data-zoom="menos" aria-label="Alejar">−</button>
    </div>
  </div>

  <p class="ad-ayuda">Arrastrar (derecho o izquierdo): orbitar · Shift + arrastrar o botón central: mover · rueda: zoom al cursor · clic en una parte: entrar · doble clic: aislarla (en el vacío: encuadre)</p>
</main>
<script src="atlampa-datos.js?v={v}"></script>
<script src="atlampa-modulos.js?v={v}"></script>
<script src="atlampa-estacionamiento.js?v={v}"></script>
<script src="atlampa-paisaje.js?v={v}"></script>
<script src="atlampa-mercado.js?v={v}"></script>
<script src="atlampa-geo.js?v={v}"></script>
<script src="atlampa-pagina.js?v={v}"></script>
</body>
</html>
'''


def ficha(a):
    if not a['datos']:
        return ''
    h = '    <h1 class="hud-ficha__t">%s</h1>\n' % a['titulo']
    h += '    <ul class="ad-datos">\n%s\n    </ul>' % '\n'.join('      <li>%s</li>' % d for d in a['datos'])
    if a['extra']:
        h += a['extra']
    if a['leyenda']:
        h += '\n    <ul class="ad-leyenda">\n      %s\n    </ul>' % '\n      '.join(a['leyenda'])
    return h


def botones(lista):
    return '\n'.join('        <button class="hud-op%s" type="button" data-capa="%s" aria-pressed="%s">%s</button>'
                     % (' ' + g if g else '', n, 'true' if on else 'false', t) for n, t, on, g in lista)


# cada parte, un <details> con su submenú (una abierta a la vez, por el name)
def propuesto():
    h = []
    for k, t in PROPUESTO:
        h.append('        <details class="hud-parte" name="hud-parte" data-parte="%s">\n'
                 '          <summary class="hud-parte__t">%s</summary>\n'
                 '          <div class="hud-parte__sub">\n'
                 '            <button class="hud-acc" type="button" data-inspecciona="%s">Inspeccionar</button>\n'
                 '%s'
                 '            <button class="hud-acc" type="button" data-oculta="%s">%s</button>\n'
                 '          </div>\n'
                 '        </details>' % (k, t, k,
                                       '' if k == 'estructura' else '            <button class="hud-acc" type="button" data-aisla="%s">Aislar</button>\n' % k,
                                       k, 'Mostrar' if k == 'estructura' else 'Ocultar'))
    return '\n'.join(h)


def main():
    resalta = '\n'.join('        <button class="hud-op hud-op--radio" type="button" data-resalta="%s" aria-pressed="%s">%s</button>'
                        % (n, 'true' if not n else 'false', t) for n, t in RESALTA)
    for clave, a in APARTADOS.items():
        html = PLANTILLA.format(
            clave=clave, v=V, titulo=a['titulo'], titulo_doc='Predio' if clave == 'general' else a['titulo'],
            desc=a['desc'], ruta=a.get('ruta', '/ ' + a['titulo']), capas=botones(CAPAS), diagramas=botones(DIAGRAMAS),
            resalta=resalta, propuesto=propuesto(), leyenda=LEYENDA, ficha=ficha(a), ficha_oculta='' if a['datos'] else ' hidden')
        ruta = os.path.join(RAIZ, pagina(clave))
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(html)
        print('escrita', ruta)


if __name__ == '__main__':
    main()

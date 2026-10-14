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
V = '20261014a'      # versión de los archivos (para que el navegador no use los viejos)

ICONOS = {
    'propuesto': '<path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M17 8h2a2 2 0 0 1 2 2v11M3 21h19M8 7h5M8 11h5M8 15h5M8 19h5"/>',
    'capas': '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    'diagramas': '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M5 17v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/>',
    'vista': '<path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"/><circle cx="12" cy="12" r="3"/>',
    'leyenda': '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
    'predio': '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
    'vivienda': '<path d="M4 21V5h16v16M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4"/>',
    'modulos': '<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5"/>',
    'paisaje': '<path d="M12 22v-7M8 18h8M7 11a5 5 0 1 1 10 0 4 4 0 0 1-1 7H8a4 4 0 0 1-1-7Z"/>',
    'sol': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'contexto': '<path d="M3 21V9h7v12M10 21V3h11v18M6 12h1M6 16h1M14 7h3M14 11h3M14 15h3"/>',
    'accesos': '<path d="M5 12h14M14 7l5 5-5 5"/>',
    'personas': '<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2"/>',
    'flujos': '<path d="M3 17c4 0 4-10 8-10s4 10 10 2"/><path d="m18 7 3 2-2 3"/>',
    'arboles': '<path d="M12 22v-7M8 18h8M7 11a5 5 0 1 1 10 0 4 4 0 0 1-1 7H8a4 4 0 0 1-1-7Z"/>',
    'postes': '<path d="M12 22V6M7 6h10M9 2h6v4H9Z"/>',
    'esquema': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    'corte': '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M3 12h18"/>',
    'color': '<path d="M12 3a9 9 0 1 0 0 18c1.7 0 2.2-1.4 1.2-2.5-.8-.9-.1-2.5 1.2-2.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.5" r=".8"/><circle cx="15" cy="7.5" r=".8"/>',
    'perspectiva': '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
    'planta': '<rect x="3" y="3" width="18" height="18"/><path d="M8 3v8h8V3M8 21v-6h5"/>',
    'nolli': '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
    'instalacion-electrica': '<path d="m13 2-7 11h5l-1 9 8-12h-5l0-8Z"/><path d="M4 4h3M17 20h3"/>',
    'instalacion-hidraulica': '<path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/><path d="M9 16c.5 1.5 1.5 2 3 2"/>',
    'clay': '<circle cx="12" cy="12" r="8"/><path d="M8 16c2-4 4-6 8-8"/>',
    'rayado': '<path d="M4 8h16M4 12h16M4 16h16"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
    'plano': '<rect x="4" y="4" width="16" height="16"/>',
    'nada': '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    'espacio': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 12h9"/>',
    'comercio': '<path d="M4 10v11h16V10M3 10l2-6h14l2 6M8 21v-6h8v6"/>',
    'cultura': '<path d="M3 9h18M5 9v9M9 9v9M15 9v9M19 9v9M2 21h20M12 3l9 4H3l9-4Z"/>',
    'industria': '<path d="M3 21V9l6 3V8l6 4V5h6v16Z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
    'aro': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
    'estacionamiento': '<circle cx="12" cy="12" r="9"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    'estructura': '<path d="M4 21V3M20 21V3M4 7h16M4 13h16M4 19h16"/>',
    'nivel': '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/>',
    'separa': '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'
}


def icono(nombre, clase='hud-menu__icon'):
    return '<svg class="%s" viewBox="0 0 24 24" aria-hidden="true">%s</svg>' % (clase, ICONOS[nombre])


def opcion_icono(nombre):
    alias = {'paisajismo': 'paisaje'}
    return icono(alias.get(nombre, nombre), 'hud-op__icon')


SOTANOS = '''
      <div class="hud-grupo" role="group" aria-label="Sótanos">
        <button class="hud-op" type="button" data-sotano="0" aria-pressed="true">{nivel}<span>Todos</span></button>
        <button class="hud-op" type="button" data-sotano="1" aria-pressed="false">{nivel}<span>S1 · −3.5</span></button>
        <button class="hud-op" type="button" data-sotano="2" aria-pressed="false">{nivel}<span>S2 · −7.0</span></button>
        <button class="hud-op" type="button" data-sotano="3" aria-pressed="false">{nivel}<span>S3 · −10.5</span></button>
        <button class="hud-op" type="button" data-sotano="4" aria-pressed="false">{nivel}<span>S4 · −14.0</span></button>
      </div>
      <button class="hud-op hud-op--linea" type="button" data-capa="separa" aria-pressed="false">{separa}<span>Separar niveles</span></button>'''.format(
          nivel=opcion_icono('nivel'), separa=opcion_icono('separa'))

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
                  'Norte 130 · sur 133 por sótano', '4 elevadores: del último sótano a la azotea y su espacio reglamentario', 'Helicoidales dobles desde la planta baja'],
        'extra': SOTANOS,
        'leyenda': ['<li><i class="ad-leyenda__est"></i>Sótano</li>', '<li><i class="ad-leyenda__cajon"></i>Cajón</li>',
                    '<li><i class="ad-leyenda__helice"></i>Helicoidal</li>'],
    },
    'comercio': {
        'titulo': 'Comercio',
        'desc': 'Las dos naves de comercio, de techos a dos aguas con crujías de 17.97 m, cortadas por el círculo del aro.',
        # (la sur: cubierta plegada en prepara-mercado.py, CUBIERTA_SUR; la de Rhino no cabía sobre su planta alta)
        'datos': ['Nave norte: 2 crujías · alero +6.20 · cumbrera +9.20', 'Nave sur: 3 crujías · las mismas aguas, subidas y plegadas (+7.90 / +10.90)',
                  'Nave sur: planta alta a +4.28 con manzanas y respiros'],
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
<!-- Three.js 0.170.0 y los complementos que se usan van en lib/ (sin CDN): el sitio funciona sin internet -->
<script type="importmap">{{"imports": {{"three": "./lib/three-0.170.0.module.min.js", "three/addons/": "./lib/three-0.170.0-addons/"}}}}</script>
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
      <summary class="hud-menu__t">{icon_propuesto}<span>Propuesto</span></summary>
      <div class="hud-panel hud-panel--propuesto">
        <a class="hud-op hud-ir" href="index.html" data-ir="general">{icon_predio}<span>Predio completo</span></a>
{propuesto}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">{icon_capas}<span>Capas</span></summary>
      <div class="hud-panel">
{capas}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">{icon_diagramas}<span>Diagramas</span></summary>
      <div class="hud-panel">
{diagramas}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">{icon_vista}<span>Vista</span></summary>
      <div class="hud-panel hud-panel--vista">
        <button class="hud-op hud-op--color" type="button" data-capa="color" aria-pressed="false">{icon_color}<span>Color</span></button>
        <button class="hud-op" type="button" data-capa="perspectiva" aria-pressed="false">{icon_perspectiva}<span>Perspectiva</span></button>
        <button class="hud-op" type="button" data-capa="planta" aria-pressed="false">{icon_planta}<span>Planta</span></button>
        <button class="hud-op" type="button" data-capa="nolli" aria-pressed="false">{icon_nolli}<span>Mapa Nolli</span></button>
        <p class="hud-panel__t">Instalaciones</p>
        <button class="hud-op hud-op--radio" type="button" data-capa="instalacion-electrica" aria-pressed="false">{icon_instalacion_electrica}<span>Instalación eléctrica</span></button>
        <button class="hud-op hud-op--radio" type="button" data-capa="instalacion-hidraulica" aria-pressed="false">{icon_instalacion_hidraulica}<span>Instalación hidro-sanitaria y pluvial</span></button>
        <ul class="hud-infra-leyenda" aria-label="Tipos de agua">
          <li><i style="--infra:#4b82a8"></i>Potable</li>
          <li><i style="--infra:#76b5c7"></i>Pluvial</li>
          <li><i style="--infra:#8c9394"></i>Aguas grises</li>
          <li><i style="--infra:#504844"></i>Aguas negras</li>
          <li><i style="--infra:#4d9788"></i>Agua tratada</li>
          <li><i style="--infra:#78945f"></i>Riego</li>
        </ul>
        <p class="hud-panel__t">Estilo</p>
        <button class="hud-op hud-op--radio" type="button" data-estilo="clay" aria-pressed="true">{icon_clay}<span>Clay</span></button>
        <button class="hud-op hud-op--radio" type="button" data-estilo="rayado" aria-pressed="false">{icon_rayado}<span>Rayado</span></button>
        <button class="hud-op hud-op--radio" type="button" data-estilo="plano" aria-pressed="false">{icon_plano}<span>Plano</span></button>
        <p class="hud-panel__t">Resaltar</p>
{resalta}
      </div>
    </details>
    <details class="hud-menu" name="hud">
      <summary class="hud-menu__t">{icon_leyenda}<span>Leyenda</span></summary>
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
<script src="atlampa-estructura.js?v={v}"></script>
<script src="atlampa-industria.js?v={v}"></script>
<script src="atlampa-infraestructura.js?v={v}"></script>
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
    return '\n'.join('        <button class="hud-op%s" type="button" data-capa="%s" aria-pressed="%s">%s<span>%s</span></button>'
                     % (' ' + g if g else '', n, 'true' if on else 'false', opcion_icono(n), t) for n, t, on, g in lista)


# cada parte, un <details> con su submenú (una abierta a la vez, por el name)
def propuesto():
    h = []
    for k, t in PROPUESTO:
        h.append('        <details class="hud-parte" name="hud-parte" data-parte="%s">\n'
                 '          <summary class="hud-parte__t">%s<span>%s</span></summary>\n'
                 '          <div class="hud-parte__sub">\n'
                 '            <button class="hud-acc" type="button" data-inspecciona="%s">Inspeccionar</button>\n'
                 '%s'
                 '            <button class="hud-acc" type="button" data-oculta="%s">%s</button>\n'
                 '          </div>\n'
                 '        </details>' % (k, opcion_icono(k), t, k,
                                       '' if k == 'estructura' else '            <button class="hud-acc" type="button" data-aisla="%s">Aislar</button>\n' % k,
                                       k, 'Mostrar' if k == 'estructura' else 'Ocultar'))
    return '\n'.join(h)


def main():
    resalta = '\n'.join('        <button class="hud-op hud-op--radio" type="button" data-resalta="%s" aria-pressed="%s">%s<span>%s</span></button>'
                        % (n, 'true' if not n else 'false', opcion_icono(n or 'nada'), t) for n, t in RESALTA)
    for clave, a in APARTADOS.items():
        html = PLANTILLA.format(
            clave=clave, v=V, titulo=a['titulo'], titulo_doc='Predio' if clave == 'general' else a['titulo'],
            desc=a['desc'], ruta=a.get('ruta', '/ ' + a['titulo']), capas=botones(CAPAS), diagramas=botones(DIAGRAMAS),
            resalta=resalta, propuesto=propuesto(), leyenda=LEYENDA, ficha=ficha(a), ficha_oculta='' if a['datos'] else ' hidden',
            icon_propuesto=icono('propuesto'), icon_capas=icono('capas'), icon_diagramas=icono('diagramas'),
            icon_vista=icono('vista'), icon_leyenda=icono('leyenda'), icon_predio=opcion_icono('predio'),
            icon_color=opcion_icono('color'), icon_perspectiva=opcion_icono('perspectiva'),
            icon_planta=opcion_icono('planta'), icon_nolli=opcion_icono('nolli'), icon_clay=opcion_icono('clay'),
            icon_instalacion_electrica=opcion_icono('instalacion-electrica'),
            icon_instalacion_hidraulica=opcion_icono('instalacion-hidraulica'),
            icon_rayado=opcion_icono('rayado'), icon_plano=opcion_icono('plano'))
        ruta = os.path.join(RAIZ, pagina(clave))
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(html)
        print('escrita', ruta)


if __name__ == '__main__':
    main()

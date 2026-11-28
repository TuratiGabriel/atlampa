/* ============================================================
   ATLAMPA — Modo historia · guion de las etapas 1 y 2
   Cada slide es un estado del visor. Coordenadas en metros del visor (u, v);
   ver PRESENTACION FINAL/CONTEXTO.md y herramientas/prepara-historia.mjs.

   camara: encuadre  'colonia' | [u0, v0, u1, v1]
           az        'norte' (norte arriba) o grados del visor
           el        elevación (89 = cenital) · aire: holgura · dur: ms
           lado      fracción del ancho que tapa la tarjeta (se centra en el resto)
   capas:  colonia (edificios y calles de toda Atlampa), coches, limite
   marcas: 'asentamientos' | 'balaceras' | 'cultura' | 'verdes' | 'espuela' | 'circuitoProyecto' | 'circuitoAtlampa' | 'mercado'
           etapa 2: 'demolicion' (en rojo y se borra como se desarma en el visor) | 'corteAro' (el aro corta las naves);
           éstas se animan enteras (ida y regreso) y se quedan hechas mientras las siguientes slides las listen
   aro:    { op, sube, dur } la «o» de «circuito», que es el aro: opacidad y cuánto sube (m); sin aro, no está
           (ver MARCAS abajo; en las balaceras, lado: 'izq' | 'der' pone el texto a un lado de los tiradores)
   compacto: true → de las marcas sólo quedan las figuras, sin sus textos (la slide de factores)
   rotulosDe: [ids] → sólo esas marcas ponen sus textos
   tarjeta: kicker, titulo, texto, cifras [[valor, etiqueta, nota]], nota, fuente
            (una slide sin tarjeta no la muestra y se encuadra en toda la pantalla)
   rotulos: { u, v, z, texto, sub, tipo: 'calle' | 'punto', lado: 'izq' (texto a la izquierda) }
   fondo: { texto, pos: 'esquina' | 'centro' | 'aro', blur, op, alto } · 'aro': la última letra es el aro del
          proyecto en su lugar, y camara.encuadre: 'fondo' encuadra la palabra
   ============================================================ */

export const MARCAS = {
  // El predio hoy, con el levantamiento detallado de Luis desde Google Earth (handoff/LEVANTAMIENTO_PREEXISTENCIA.md;
  // es el mismo de atlampa-3d.js, historiaGrupo). Las dos naves orientales son G.NAVES y se conservan; estas piezas
  // son lo que se demuele en la etapa 2. Subdivisiones y alturas aproximadas. planta: [u0, v0, u1, v1].
  existente: {
    piezas: [
      // conjunto noroeste
      { id: 'cubierta-fresno-inclinada', tipo: 'cobertizo', planta: [449, 419, 469, 487], altoO: 7.2, altoE: 5.5 },
      { id: 'ala-norte', planta: [469, 468, 491, 487], alto: 5.2 },
      { id: 'anexo-suroeste', planta: [469, 419, 478, 441], alto: 5.8 },
      { id: 'nave-corta-1', tipo: 'nave', planta: [479, 419, 496, 458], alero: 6.3, cumbre: 7.6 },
      { id: 'nave-corta-2', tipo: 'nave', planta: [498, 419, 509, 458], alero: 5.9, cumbre: 7.5 },
      { id: 'nave-corta-3', tipo: 'nave', planta: [510, 419, 521, 458], alero: 5.9, cumbre: 7.5 },
      { id: 'ala-patio-oeste', planta: [492, 462, 499, 487], alto: 5.0 },
      { id: 'ala-patio-norte', planta: [499, 479, 522, 487], alto: 5.2 },
      { id: 'ala-patio-este', planta: [516, 462, 522, 479], alto: 5.0 },
      // conjunto suroeste
      { id: 'cubierta-principal', planta: [449, 345, 484, 395], alto: 6.0 },
      { id: 'franja-sur-dos-niveles', planta: [449, 324, 503, 345], alto: 9.0 },
      { id: 'ala-hacia-naves', planta: [484, 372, 503, 395], alto: 5.5 },
      { id: 'monitor-de-cubierta', planta: [452, 349, 459, 376], z0: 6.0, alto: 6.8 }
    ],
    // portones de la calle interior, en Fresno y en Sabino (también se demuelen)
    portones: { v0: 396.6, v1: 417.5, alto: 3.2 }
  },
  // Etapa 2 · la industria se arma desde su retícula: módulos de 5.5 × 4 m (los de los chacuacos del Revit), en dos
  // niveles. Se parte del contorno, como una volumetría sola, y dentro se quitan los módulos que se quitaron.
  // Ejes girados: x a lo largo de giro (grados) desde origen. filas: de la fila de arriba (la más al norte, j = 9) a la
  // de abajo (j = 0), columnas i = 0… de poniente a oriente. '#' = módulo del proyecto · 'p' = se quita en los dos
  // niveles (patio) · 'b' = se quita sólo en planta baja (planta baja libre) · '.' = fuera del contorno.
  // Sacado del Revit (2026-11-27): patios = sin cubierta; planta baja libre = con losa del nivel 1 encima y casi sin
  // muros en planta baja (aproximado).
  industria: {
    origen: [449.396, 360.185], giro: -9.9992, x0: -3.15, y0: -12.8, dx: 5.5, dy: 4, niveles: [0, 3.06, 6.2],
    filas: [
      '..##bb..',
      '##bbb#..',
      '###p###.',
      '###pppb.',
      '####bb#.',
      '..#p#bb.',
      '..#p###.',
      '.##p#pb#',
      '.###b#b#',
      '.###bb..'
    ]
  },
  // Booklet p. 68: franjas sobre el derecho de vía de la antigua espuela
  // (Crisantema, "Las Vías"), georreferidas con el límite de la colonia.
  asentamientos: {
    franjas: [{ de: 378, a: 435 }, { de: 458, a: 516 }, { de: 702, a: 899 }],
    rotulos: [
      { u: 447, v: 120, z: 6, texto: 'Las Vías', sub: 'Crisantema · Cedro – Sabino', lado: 'izq' },
      { u: 800, v: 120, z: 6, texto: 'Las Vías', sub: 'Crisantema · Naranjo – Pino' }
    ],
    // campamentos reubicados en 2024 (El Universal, 22-jun-2024): sólo los de ubicación segura
    reubicados: [
      { calle: 'Callejón del Caño', texto: 'Callejón del Caño', sub: 'reubicado en 2024' }
    ],
    destino: { u: 968, v: 127, texto: 'U.H. Fresno 409', sub: '286 familias reubicadas · 2024' }   // booklet p. 69
  },
  // Prensa con fecha y calle confirmadas; las marcadas «aprox.» van sobre su calle.
  balaceras: [
    { u: 80, v: 400, fecha: 'ago 2022', texto: 'Heliotropo 178', sub: 'herido en una fiesta · aprox.' },
    { u: 793, v: 282, fecha: 'ago 2022', texto: 'Ciprés 280', sub: 'repartidor asesinado' },
    { u: 942, v: 643, fecha: 'feb 2023', texto: 'Nopal y Pino', sub: 'hombre asesinado en una vecindad', lado: 'der' },
    { u: 1212, v: 554, fecha: 'ago 2025', texto: 'Plaza Juárez', sub: 'Nopal y Oyamel · asesinato', lado: 'izq' },
    { u: 797, v: 675, fecha: 'ene 2026', texto: 'Ciprés, junto al puente', sub: 'ataque desde una moto · aprox.', lado: 'izq' }
  ],
  // Casa Wabi Sabino: Sabino 336 (casawabi.org), una cuadra al sur del predio (booklet pp. 9 y 13).
  // Se resalta el edificio que contiene el punto (lado oriente de Sabino, números pares).
  // Coordenada de Mapstr (19.4564979, -99.1586551) → (551.6, 223.7): lado poniente de Sabino. El edificio
  // (Alberto Kalach, compartido con el Studio Bosco Sodi) no está en Contexto.3dm ni en OSM: planta estimada
  // de 24 m de frente por 36 de fondo, algo más alta que lo de alrededor.
  cultura: { u: 552, v: 224, planta: [[518, 214], [554, 214], [554, 238], [518, 238]], alto: 13, texto: 'Casa Wabi', sub: 'Sabino 336 · único espacio de arte' },
  // Booklet p. 50: ningún parque dentro de la colonia; parques a menos de 1.5 km (OSM).
  verdes: {
    centro: [503.6, 405], radio: 1500, textoRadio: '1.5 km del predio',
    vacio: { u: 870, v: 600, z: 2, texto: '0 m²', sub: 'de área verde dentro de la colonia' },
    parques: [
      { nombre: 'Alameda de Santa Maria La Ribera', texto: 'Alameda de Santa María' },
      { nombre: 'Parque Revolución', texto: 'Parque Revolución' },
      { nombre: 'Parque Ciprés', texto: 'Parque Ciprés' },
      { nombre: 'Parque Sándalo', texto: 'Parque Sándalo' },
      { nombre: 'Parque Buenavista', texto: 'Parque Buenavista', lado: 'izq' },
      { nombre: 'Bajo Puente Nonoalco Tlatelolco', texto: 'Bajo Puente Nonoalco' }
    ]
  },
  // La espuela del visor (Crisantema → Cedro → Heliotropo → predio) y las vías en desuso de OSM.
  // cierre: el trazo original al oriente del predio (dibujo de Diego, 2026-11-24): sigue por Heliotropo,
  // baja en espejo de Cedro (curvas de r 74 m) y vuelve a la vía de Crisantema en u ≈ 790.
  espuela: {
    cierre: [[552, 405], [640, 405], [790, 405], [804.4, 403.6], [818.3, 399.4], [831.1, 392.5], [842.3, 383.3], [851.5, 372.1], [858.4, 359.3],
      [862.6, 345.4], [864, 331], [864, 260], [864, 195], [862.6, 180.6], [858.4, 166.7], [851.5, 153.9], [842.3, 142.7], [831.1, 133.5],
      [818.3, 126.6], [804.4, 122.4], [790, 121]],
    rotulos: [
      { u: 760, v: 121, z: 2, texto: 'Crisantema', sub: 'la vía corre por la calle' },
      { u: 331, v: 255, z: 2, texto: 'Cedro', sub: 'sube hacia el predio', lado: 'izq' },
      { u: 470, v: 405, z: 3, texto: 'Heliotropo', sub: 'cruza el predio' },
      { u: 779, v: 681, z: 2, texto: 'Vía diagonal', sub: 'en desuso' },
      { u: 864, v: 262, z: 2, texto: 'Cierre de la espuela', sub: 'trazo original' }
    ]
  },
  // Metabolismo urbano (lámina «circuito»): los flujos que entran, se transforman y vuelven a circular.
  // Cada flujo es un color en los pulsos del circuito.
  flujos: [['#8fd0ff', 'agua'], ['#ffd34d', 'energía'], ['#d2d4d8', 'materiales'], ['#ffffff', 'personas'], ['#7dffb0', 'capital']],
  // Concepto: los circuitos del proyecto y los usos que une (posiciones en el predio)
  circuitoProyecto: {
    rotulos: [
      { u: 553, v: 409, z: 12, texto: 'El aro', sub: 'une los usos y vuelve' },
      { u: 505, v: 420, z: 48, texto: 'Vivienda', sub: 'personas · habitar' },
      { u: 532, v: 350, z: 9, texto: 'Mercado', sub: 'capital · intercambio' },
      { u: 470, v: 372, z: 9, texto: 'Microindustria', sub: 'materiales · producción', lado: 'izq' },
      { u: 476, v: 455, z: 7, texto: 'Cultura', sub: 'encuentro · memoria', lado: 'izq' },
      { u: 430, v: 405, z: 2, texto: 'La espuela', sub: 'la memoria del movimiento', lado: 'izq' }
    ]
  },
  // …y el de Atlampa: sale del predio, sigue la espuela y conecta lo presentado.
  // principal: lazo cerrado ('ESPUELA' = el trazo de la espuela del visor); ramales y parques brotan
  // cuando el lazo pasa por su punto de partida.
  circuito: {
    dur: 3600,
    principal: ['CIERRE', [761, 121], [563, 119], 'ESPUELA'],   // la espuela cerrada, desde el predio
    ramales: [
      { pts: [[563, 119], [563, 226], [554, 226]] },          // Casa Wabi
      { pts: [[795, 121], [793, 282]] },                     // Ciprés 280
      { pts: [[790, 121], [944, 120], [968, 127]] },         // Crisantema → Fresno 409
      { pts: [[679, 405], [679, 500], [942, 500], [942, 643], [1212, 554]] },   // Naranjo → Eulalia → Nopal y Pino → Plaza Juárez
      { pts: [[797, 500], [797, 675]] },                     // Ciprés, junto al puente
      { pts: [[331, 330], [331, 400], [80, 400]] },          // Heliotropo
      { via: 'diagonal' }                                    // la vía diagonal en desuso
    ],
    parques: [
      { de: [877, 120], nombre: 'Alameda de Santa Maria La Ribera', texto: 'Alameda de Santa María', sub: 'ecológico · paisaje' },
      { de: [797, 675], nombre: 'Parque Ciprés', sub: 'ecológico · paisaje' },
      { de: [80, 400], nombre: 'Parque Revolución', sub: 'ecológico · paisaje' },
      { de: [1212, 554], nombre: 'Parque Sándalo', sub: 'ecológico · paisaje' }
    ],
    nodos: [
      { u: 550, v: 226, texto: 'Casa Wabi', sub: 'social · cultura', color: '#c9a6ff' },
      { u: 447, v: 120, texto: 'Las Vías', sub: 'social · vivienda', lado: 'izq', color: '#ff5cb0' },
      { u: 800, v: 120, color: '#ff5cb0' },
      { u: 968, v: 127, texto: 'Fresno 409', sub: 'social · vivienda', color: '#ff5cb0' },
      { u: 793, v: 282 }, { u: 942, v: 643 }, { u: 1212, v: 554, texto: 'Calle activa', sub: 'social · donde hubo violencia' }, { u: 797, v: 675 }, { u: 80, v: 400 }
    ]
  },
  // Ejemplo del concepto: los fines de semana el mercado del proyecto sale por la espuela
  // (desde Heliotropo, entre las naves, hasta Crisantema y Pino) como un mercado sobre ruedas.
  mercado: {
    recorrido: ['CIERRE', [761, 121], [563, 119], 'ESPUELA'],   // toda la espuela cerrada, desde el predio
    paso: 3.8, separacion: 4.6, gentePor: 4.5, dur: 4600, retraso: 3400,   // abre cuando el circuito ya está trazado
    rotulos: [
      { u: 545, v: 405, z: 4, texto: 'Mercado del proyecto', sub: 'productivo · sale por la espuela', lado: 'izq' },
      { u: 700, v: 121, z: 4, texto: 'Mercado sobre ruedas', sub: 'productivo · sábado y domingo' }
    ]
  }
};

export default [
  {
    id: 'atlampa',
    titulo: 'Atlampa',
    camara: { encuadre: 'colonia', az: 'norte', el: 89, aire: 1.06, lado: 0.26, dur: 3200 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: [],
    tarjeta: {
      kicker: 'Etapa 1 · La colonia',
      titulo: 'Atlampa',
      texto: 'Colonia industrial al norponiente del Centro, rodeada por Circuito Interior, Insurgentes Norte y Ricardo Flores Magón. El tren suburbano la cruza y la parte en cuatro sectores.',
      cifras: [
        ['15,130', 'habitantes', 'Censo 2020'],
        ['74', 'manzanas', ''],
        ['0.52 m²', 'de área verde por habitante', ''],
        ['32 %', 'del empleo es industrial', 'DENUE 2019']
      ],
      fuente: 'INEGI 2020 · PPDU Atlampa 2022 · Booklet de análisis, pp. 21, 34–45, 67'
    },
    rotulos: [
      { u: 1406, v: 327, texto: 'Insurgentes Norte', tipo: 'calle' },
      { u: 944, v: 74, texto: 'Ricardo Flores Magón', tipo: 'calle' },
      { u: 333, v: 971, texto: 'Circuito Interior', tipo: 'calle' },
      { u: 1002, v: 507, texto: 'Eulalia Guzmán · Eje 2 Nte', tipo: 'calle' },
      { u: 1197, v: 259, texto: 'Tren Suburbano', tipo: 'calle' },
      { u: 503.6, v: 405, z: 12, texto: 'Predio', sub: '17,180 m² · hoy', tipo: 'punto' }
    ]
  },
  {
    id: 'asentamientos',
    titulo: 'Asentamientos',
    camara: { encuadre: [300, 40, 1060, 850], az: 'norte', el: 44, aire: 1.08, lado: 0.26, dur: 2600 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['asentamientos'],
    tarjeta: {
      kicker: 'Problemática · Vivienda',
      titulo: 'Asentamientos irregulares',
      texto: 'Después del sismo de 1985, familias damnificadas se instalaron sobre el derecho de vía de la antigua espuela ferroviaria, en Crisantema. El campamento temporal se volvió vivienda permanente: sin servicios formales, sin certeza jurídica y con riesgo de incendio y desalojo.',
      cifras: [
        ['1985', 'origen: el sismo', ''],
        ['≈ 300', 'familias en Las Vías', 'según vecinos, 2023'],
        ['9', 'campamentos en la zona', ''],
        ['286', 'familias reubicadas', 'U.H. Fresno 409, 2024']
      ],
      nota: 'Junio de 2023: un incendio consumió 24 viviendas en Crisantema y Sabino. En 2024 se desalojó a unas 50 familias del corredor.',
      fuente: 'Booklet p. 68 · Excélsior, 26-ene-2023 · La Jornada, 18-jun-2023 · El Universal, 22-jun-2024'
    },
    rotulos: []
  },
  {
    id: 'balaceras',
    titulo: 'Balaceras',
    camara: { encuadre: [40, 230, 1330, 720], az: 'norte', el: 50, aire: 1.1, lado: 0.26, dur: 2600 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['balaceras'],
    tarjeta: {
      kicker: 'Problemática · Seguridad',
      titulo: 'Balaceras',
      texto: 'Los ataques armados ocurren en vecindades, bares clandestinos y cruces con poca gente en la calle. La baja presencia peatonal, el grafiti y los predios abandonados alimentan la percepción de inseguridad.',
      cifras: [
        ['5', 'balaceras documentadas', '2022 – 2026'],
        ['4', 'personas asesinadas', ''],
        ['2', 'personas heridas', ''],
        ['2', 'casos en 2025 – 2026', 'booklet p. 71']
      ],
      nota: '«…no sé a quién le fueron a echar de balazos acá a la esquina…» — vecina de Atlampa',
      fuente: 'Booklet pp. 71–72 · TV Azteca, 27-ago-2022, 13-feb-2023 y 23-ago-2025 · Posta, 19-ene-2026'
    },
    rotulos: []
  },
  {
    id: 'cultura',
    titulo: 'Cultura',
    camara: { encuadre: [400, 140, 760, 520], az: 'norte', el: 42, aire: 1.15, lado: 0.26, dur: 2600 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['cultura'],
    tarjeta: {
      kicker: 'Problemática · Arte y cultura',
      titulo: 'Un solo espacio de arte',
      texto: 'En toda la colonia, el único establecimiento dedicado al arte y la cultura es Casa Wabi Sabino: exhibe y difunde arte contemporáneo a una cuadra al sur del predio. Para 15,130 habitantes no hay otro lugar de arte, exposición o convivencia cultural.',
      cifras: [
        ['1', 'espacio de arte en la colonia', 'Casa Wabi Sabino'],
        ['15,130', 'habitantes', 'Censo 2020'],
        ['1 cuadra', 'del predio', 'Sabino 336'],
        ['5,000 m²', 'de arte y cultura', 'en nuestro programa']
      ],
      nota: 'Su cercanía abre la posibilidad de un corredor cultural entre Casa Wabi y el proyecto.',
      fuente: 'Booklet pp. 9 y 13 · casawabi.org'
    },
    rotulos: [{ u: 503.6, v: 405, z: 12, texto: 'Predio', tipo: 'punto' }]
  },
  {
    id: 'verdes',
    titulo: 'Áreas verdes',
    camara: { encuadre: [-1060, -1160, 2070, 1970], az: 'norte', el: 89, aire: 1.0, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['verdes'],
    tarjeta: {
      kicker: 'Problemática · Medio ambiente',
      titulo: 'Sin áreas verdes',
      texto: 'Atlampa no tiene una sola área verde dentro de la colonia. Hay parques a menos de 1.5 km, pero ninguno adentro. La superficie está casi toda pavimentada entre vialidades de alto flujo: isla de calor, cero infiltración y escurrimiento directo al drenaje.',
      cifras: [
        ['0 m²', 'de área verde por habitante', 'dentro de la colonia'],
        ['6 m²', 'promedio de la CDMX', 'por habitante'],
        ['9 m²', 'mínimo de la OMS', 'por habitante'],
        ['1 – 3 °C', 'más por isla de calor', '']
      ],
      fuente: 'Booklet pp. 24, 31 y 50 · OpenStreetMap (parques)'
    },
    rotulos: []
  },
  {
    id: 'espuela',
    titulo: 'Espuela',
    camara: { encuadre: [60, 30, 1360, 1180], az: 'norte', el: 52, aire: 1.06, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['espuela'],
    tarjeta: {
      kicker: 'Patrimonio · Memoria ferroviaria',
      titulo: 'La espuela',
      texto: 'La antigua espuela ferroviaria daba servicio a la zona industrial y formaba un circuito: corría por Crisantema, subía por Cedro, cruzaba el predio por Heliotropo y bajaba de nuevo al oriente hasta cerrar. Hoy está en desuso, pero conserva la memoria productiva de Atlampa. Es una reliquia que hay que mantener y volver eje del proyecto.',
      cifras: [
        ['≈ 3.7 km', 'de vías y trazo original', 'dentro de la colonia'],
        ['5', 'naves de ladrillo protegidas', 'en el predio · nivel 3'],
        ['1905', 'fábrica La Maravilla', 'patrimonio industrial vecino'],
        ['4', 'sectores', 'que dejó el tren suburbano']
      ],
      fuente: 'Booklet pp. 8, 12, 15, 47 y 67 · OpenStreetMap (railway=abandoned)'
    },
    rotulos: []
  },
  {
    id: 'concepto',
    titulo: 'Atlampa en circuito',
    camara: { encuadre: [-500, -540, 1700, 1460], az: 'norte', el: 58, aire: 1.02, lado: 0.26, dur: 3000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['circuitoAtlampa', 'espuela', 'verdes', 'mercado'],
    rotulosDe: ['circuitoAtlampa', 'mercado'],
    // lleva también lo que decía la slide «Circuito» (la definición y el metabolismo urbano)
    tarjeta: {
      kicker: 'Concepto',
      titulo: 'Atlampa en circuito',
      texto: '(circuitus, latín): rodear, recorrer, volver. Un dispositivo que conecta espacios residuales, habitantes, producción y paisaje. Nuestros usos llevan el circuito y el ecosistema de necesidades a toda Atlampa: sale del predio, retoma la espuela (≈ 1.5 km) y reconecta lo fragmentado.',
      cifras: [
        ['Social', 'vivienda · cultura · calle activa', 'Las Vías, Casa Wabi, balaceras'],
        ['Productivo', 'mercado · microindustria', 'el mercado sale por la espuela'],
        ['Ecológico', 'agua · paisaje', 'hacia los parques cercanos'],
        ['≈ {puestos}', 'puestos en fin de semana', 'mercado sobre ruedas']
      ],
      leyenda: [['#ff6f63', 'circuito'], ['#e8a25a', 'espuela'], ['#8fd0ff', 'agua'], ['#ffd34d', 'energía'], ['#d2d4d8', 'materiales'], ['#ffffff', 'personas'], ['#7dffb0', 'capital']],
      nota: 'Metabolismo urbano: agua, energía, materiales, personas y capital entran, se transforman y vuelven a circular.',
      fuente: 'Lámina «circuito» (Actividad 02A)'
    },
    rotulos: []
  },
  {
    id: 'circuito',
    titulo: 'Circuito',
    // Última slide de la etapa 1 y paso a la etapa 2: sólo la palabra escrita sobre la colonia, sin tarjeta.
    // Su «o» es el aro del proyecto, en su lugar (un guiño a lo que será). Ángulo de la captura de Diego (2026-11-26).
    camara: { encuadre: 'fondo', az: 37, el: 32, aire: 1.28, lado: 0, dur: 3000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['asentamientos', 'cultura', 'espuela'],
    compacto: true,
    fondo: { texto: 'circuito', pos: 'aro', op: 0.9 },
    aro: { op: 0.95 },   // desde aquí la «o» (el aro) no se va
    rotulos: []
  },

  /* ===== Etapa 2: del predio de hoy al proyecto (sobre el modelo) =====
     aro: { op, sube, dur } en cada slide; si una slide no lo trae, la «o» se va. */
  {
    id: 'predio', etapa: 2,
    titulo: 'El predio',
    // la cámara se acerca al predio; la palabra se va y la «o» sube, translúcida, para dejar ver lo existente
    camara: { encuadre: [447, 322, 559, 489], az: 37, el: 40, aire: 1.3, lado: 0.26, dur: 3400 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: [],
    aro: { op: 0.3, sube: 14, dur: 1800 },
    rotulos: []
  },
  {
    id: 'demolicion', etapa: 2,
    titulo: 'Demolición',
    // los muros y losas que no se conservan se marcan en rojo y se borran como en el visor (las piezas de MARCAS.existente)
    camara: { encuadre: [447, 322, 559, 489], az: 37, el: 40, aire: 1.3, lado: 0.26, dur: 1200 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion'],
    aro: { op: 0.3, sube: 14 },
    rotulos: []
  },
  {
    id: 'aro', etapa: 2,
    titulo: 'El aro',
    // la «o» baja a su lugar, deja de ser translúcida y la palabra se vuelve a escribir (sobre lo que queda): el concepto
    // es el aro; luego se demuele lo de las naves que queda dentro. La cámara se aleja un poco para que se vea la palabra
    camara: { encuadre: [405, 300, 559, 489], az: 37, el: 50, aire: 1.18, lado: 0.26, dur: 2000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro'],
    aro: { op: 0.95, sube: 0, dur: 1700 },
    fondo: { texto: 'circuito', pos: 'aro', op: 0.9, existente: 'cortado' },
    rotulos: []
  },
  {
    id: 'aroReal', etapa: 2,
    titulo: 'Aro del proyecto',
    // cerca del predio: la «o» baja y se adelgaza hasta ser el aro del visor, que se dibuja debajo; la «o» se apaga y
    // la gente empieza a caminar sobre el aro
    camara: { encuadre: [452, 354, 560, 464], az: 37, el: 30, aire: 1.05, lado: 0.26, dur: 3000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal'],
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'culturaVolumen', etapa: 2,
    titulo: 'Arte y cultura',
    // las losas de arte y cultura salen del aro (plegadas a su nivel) y se despliegan hasta su lugar; al final, las escaleras
    // el ángulo de la captura de Diego (2026-11-26)
    camara: { encuadre: [462, 360, 570, 468], az: 'norte', el: 27, aire: 1.12, lado: 0.26, dur: 2400 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen'],
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'culturaCompleta', etapa: 2,
    titulo: 'Completo',
    // lo demás se arma como un uso en el visor: muros, cancelería y puertas, columnas y barandales, sombrillas
    camara: { encuadre: [462, 360, 570, 468], az: 'norte', el: 27, aire: 1.12, lado: 0.26, dur: 1200 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta'],
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },

  /* Comercio y mercado: las naves que se conservan. foco: lo demás se apaga, como al seleccionar un uso en el visor;
     con foco.hasta, el foco se suelta cuando termina esa marca. */
  {
    id: 'comercio', etapa: 2,
    titulo: 'Mercado',
    // las naves resaltadas: lo demás, oscuro y translúcido
    camara: { encuadre: [500, 318, 566, 494], az: 300, el: 36, aire: 1.12, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio'],
    foco: { uso: 'comercio', desde: 'comercio' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'comercioTecho', etapa: 2,
    titulo: 'Mercado · cubierta',
    // la cubierta se separa de los muros y se secciona a distintas alturas
    camara: { encuadre: [500, 318, 566, 494], az: 300, el: 36, aire: 1.12, lado: 0.26, dur: 1200 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho'],
    foco: { uso: 'comercio', desde: 'comercio' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'comercioVanos', etapa: 2,
    titulo: 'Mercado · vanos',
    // los vanos de los muros y la celosía de la nave norte; cuando se acaban de abrir los vanos entran la cancelería
    // (también la de las caras que cortó el aro) y los pisos (Diego, 2026-11-27: antes era otra slide); al final se
    // suelta el foco
    camara: { encuadre: [500, 318, 566, 494], az: 235, el: 24, aire: 1.1, lado: 0.26, dur: 2400 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria'],
    retrasos: { comercioCanceleria: 6400 },
    foco: { uso: 'comercio', desde: 'comercio', hasta: 'comercioCanceleria' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },

  /* Industria: la retícula de módulos (MARCAS.industria) */
  {
    id: 'industria', etapa: 2,
    titulo: 'Industria',
    // lo demás se apaga y aparece el contorno de la industria, como una volumetría sola
    camara: { encuadre: [440, 345, 500, 410], az: 37, el: 34, aire: 1.15, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen'],
    foco: { uso: 'industria', desde: 'industriaVolumen' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'industriaPatios', etapa: 2,
    titulo: 'Industria · patios',
    // dentro del contorno se quitan los módulos de los patios y los de la planta baja libre; queda el edificio, con
    // sus vanos y su vidrio (más bajo, para que se vea la planta baja)
    camara: { encuadre: [440, 345, 500, 410], az: 37, el: 26, aire: 1.15, lado: 0.26, dur: 1400 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios'],
    foco: { uso: 'industria', desde: 'industriaVolumen' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'industriaConos', etapa: 2,
    titulo: 'Industria · luz',
    // los conos de luz y el recorrido del sol del 21 de diciembre; al final se suelta el foco
    // el ángulo de la captura de Diego (2026-11-27), calibrado comparando capturas: una vista fija
    camara: { centro: [502, 358, 4], h: 39.5, az: 316.5, el: 21.5, dur: 2600 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios', 'industriaConos'],
    foco: { uso: 'industria', desde: 'industriaVolumen', hasta: 'industriaConos', suelta: [0.93, 1] },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },

  /* Vivienda: el proceso de diseño (atlampa-historia-vivienda.js, herramientas/prepara-vivienda-historia.py) */
  {
    id: 'vivienda', etapa: 2,
    titulo: 'Vivienda',
    // lo demás se apaga y se generan las dos volumetrías orgánicas: sus curvas de nivel y luego sus caras
    // el ángulo de la captura de Diego (2026-11-27), calibrado comparando capturas; una vista fija (el encuadre sólo
    // mide hasta 18 m de alto). Es el mismo en las cuatro slides de la vivienda
    camara: { centro: [505, 405, 13], h: 59, az: 306, el: 27, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios', 'industriaConos', 'viviendaVolumen'],
    foco: { uso: 'vivienda', desde: 'viviendaVolumen' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'viviendaSol', etapa: 2,
    titulo: 'Vivienda · sol',
    // el recorrido del sol del 21 de diciembre; la superficie se vuelve el diagrama de horas de sol, que se llena
    // mientras el sol avanza
    camara: { centro: [505, 405, 13], h: 59, az: 306, el: 27, dur: 1800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios', 'industriaConos', 'viviendaVolumen', 'viviendaSol'],
    foco: { uso: 'vivienda', desde: 'viviendaVolumen' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'viviendaModulos', etapa: 2,
    titulo: 'Vivienda · módulos',
    // la volumetría se llena de módulos (con los pisos extra) y se quitan los que no convenían
    camara: { centro: [505, 405, 13], h: 59, az: 306, el: 27, dur: 1800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios', 'industriaConos', 'viviendaVolumen', 'viviendaSol', 'viviendaModulos'],
    foco: { uso: 'vivienda', desde: 'viviendaVolumen' },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  },
  {
    id: 'viviendaEdificio', etapa: 2,
    titulo: 'Vivienda · edificio',
    // los módulos dejan paso al edificio del Revit; luego las ventanas, los pasillos y los núcleos. Al final se suelta
    // el foco
    camara: { centro: [505, 405, 13], h: 59, az: 306, el: 27, dur: 1600 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['demolicion', 'corteAro', 'aroReal', 'culturaVolumen', 'culturaCompleta', 'comercio', 'comercioTecho', 'comercioVanos', 'comercioCanceleria', 'industriaVolumen', 'industriaPatios', 'industriaConos', 'viviendaVolumen', 'viviendaSol', 'viviendaModulos', 'viviendaEdificio'],
    foco: { uso: 'vivienda', desde: 'viviendaVolumen', hasta: 'viviendaEdificio', suelta: [0.93, 1] },
    aro: { op: 0.95, sube: 0 },
    rotulos: []
  }
];

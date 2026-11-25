/* ============================================================
   ATLAMPA — Modo historia · guion de la etapa 1
   Cada slide es un estado del visor. Coordenadas en metros del visor (u, v);
   ver PRESENTACION FINAL/CONTEXTO.md y herramientas/prepara-historia.mjs.

   camara: encuadre  'colonia' | [u0, v0, u1, v1]
           az        'norte' (norte arriba) o grados del visor
           el        elevación (89 = cenital) · aire: holgura · dur: ms
           lado      fracción del ancho que tapa la tarjeta (se centra en el resto)
   capas:  colonia (edificios y calles de toda Atlampa), coches, limite
   marcas: 'asentamientos' | 'balaceras' | 'cultura' | 'verdes' | 'espuela' | 'circuitoProyecto' | 'circuitoAtlampa'
           (ver MARCAS abajo; en las balaceras, lado: 'izq' | 'der' pone el texto a un lado de los tiradores)
   compacto: true → de las marcas sólo quedan las figuras, sin sus textos (la slide de factores)
   rotulosDe: [ids] → sólo esas marcas ponen sus textos
   tarjeta: kicker, titulo, texto, cifras [[valor, etiqueta, nota]], nota, fuente
   rotulos: { u, v, z, texto, sub, tipo: 'calle' | 'punto', lado: 'izq' (texto a la izquierda) }
   ============================================================ */

export const MARCAS = {
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
  // Concepto (lámina «circuito»): los circuitos del proyecto…
  circuitoProyecto: {
    rotulos: [
      { u: 553, v: 409, z: 12, texto: 'El aro', sub: '≈ 270 m · rodear y volver' },
      { u: 452, v: 405, z: 2, texto: 'La espuela', sub: 'cruza el predio', lado: 'izq' }
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
      { de: [877, 120], nombre: 'Alameda de Santa Maria La Ribera', texto: 'Alameda de Santa María' },
      { de: [797, 675], nombre: 'Parque Ciprés' },
      { de: [80, 400], nombre: 'Parque Revolución' },
      { de: [1212, 554], nombre: 'Parque Sándalo' }
    ],
    nodos: [
      { u: 550, v: 226, texto: 'Casa Wabi' },
      { u: 447, v: 120, texto: 'Las Vías', lado: 'izq' },
      { u: 800, v: 120 },
      { u: 968, v: 127, texto: 'Fresno 409' },
      { u: 793, v: 282 }, { u: 942, v: 643 }, { u: 1212, v: 554 }, { u: 797, v: 675 }, { u: 80, v: 400 }
    ]
  },
  // Ejemplo del concepto: los fines de semana el mercado del proyecto sale por la espuela
  // (desde Heliotropo, entre las naves, hasta Crisantema y Pino) como un mercado sobre ruedas.
  mercado: {
    recorrido: ['CIERRE', [761, 121], [563, 119], 'ESPUELA'],   // toda la espuela cerrada, desde el predio
    paso: 3.8, separacion: 4.6, gentePor: 4.5, dur: 4600,
    rotulos: [
      { u: 545, v: 405, z: 4, texto: 'Mercado del proyecto', sub: 'sale por la espuela', lado: 'izq' },
      { u: 700, v: 121, z: 4, texto: 'Mercado sobre ruedas', sub: 'sábado y domingo' }
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
      { u: 503.6, v: 405, z: 34, texto: 'Predio', sub: '17,180 m²', tipo: 'punto' }
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
    rotulos: [{ u: 503.6, v: 405, z: 34, texto: 'Predio', tipo: 'punto' }]
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
    id: 'factores',
    titulo: 'Factores',
    camara: { encuadre: [-150, -120, 1850, 1250], az: 'norte', el: 62, aire: 1.04, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['asentamientos', 'balaceras', 'cultura', 'verdes', 'espuela'],
    compacto: true,
    tarjeta: {
      kicker: 'Concepto · 1 / 4',
      titulo: 'Una colonia fragmentada',
      texto: 'Asentamientos irregulares, violencia, un solo espacio de arte, ninguna área verde y una espuela en desuso. En Atlampa muchos flujos se han debilitado: la industria se desplaza, el suelo queda subutilizado y la espuela conserva la memoria de un movimiento que ya no ocurre.',
      fuente: 'Lámina «circuito» · Booklet de análisis'
    },
    rotulos: [
      { u: 640, v: 120, z: 6, texto: 'Asentamientos', tipo: 'factor', color: '#f5c518' },
      { u: 1000, v: 600, z: 6, texto: 'Violencia', tipo: 'factor', color: '#ff3b30' },
      { u: 536, v: 226, z: 40, texto: 'Un solo espacio de arte', tipo: 'factor', color: '#c9a6ff' },
      { u: 1300, v: 880, z: 2, texto: 'Sin áreas verdes', tipo: 'factor', color: '#a8e063' },
      { u: 331, v: 255, z: 2, texto: 'Espuela en desuso', tipo: 'factor', color: '#e8a25a' }
    ]
  },
  {
    id: 'circuito',
    titulo: 'Circuito',
    camara: { encuadre: [420, 320, 600, 500], az: 'norte', el: 38, aire: 1.3, lado: 0.26, dur: 2800 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['circuitoProyecto'],
    tarjeta: {
      kicker: 'Concepto · 2 / 4',
      titulo: 'Circuito',
      texto: '(circuitus, latín): rodear, recorrer, volver. Dentro del proyecto ya hay circuitos: el aro rodea el conjunto y la espuela lo atraviesa. Son recorridos que conectan y regresan a su origen, como los flujos de la ciudad: agua, energía, materiales, personas y capital.',
      cifras: [
        ['≈ 270 m', 'de recorrido en el aro', ''],
        ['+10 m', 'altura del aro', '']
      ],
      fuente: 'Lámina «circuito» (Actividad 02A)'
    },
    rotulos: []
  },
  {
    id: 'concepto',
    titulo: 'Atlampa en circuito',
    camara: { encuadre: [-500, -540, 1700, 1460], az: 'norte', el: 58, aire: 1.02, lado: 0.26, dur: 3000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['circuitoProyecto', 'circuitoAtlampa', 'espuela', 'verdes'],
    rotulosDe: ['circuitoAtlampa'],
    tarjeta: {
      kicker: 'Concepto · 3 / 4',
      titulo: 'Atlampa en circuito',
      texto: 'Así como hay circuitos dentro del proyecto, el concepto busca influir en toda Atlampa. El circuito sale del predio, retoma la espuela y conecta lo fragmentado: Las Vías, Casa Wabi, los puntos de violencia y los parques cercanos. Convierte los vacíos y las estructuras existentes en oportunidades.',
      cifras: [
        ['≈ 1.5 km', 'de espuela cerrada', 'columna del circuito'],
        ['3', 'flujos que reactiva', 'social · productivo · ecológico']
      ],
      nota: 'Un sistema capaz de recorrer, conectar y transformar el territorio a partir de sus propios recursos.',
      fuente: 'Lámina «circuito» (Actividad 02A)'
    },
    rotulos: []
  },
  {
    id: 'mercado',
    titulo: 'Mercado',
    camara: { encuadre: [330, 90, 880, 430], az: 8, el: 34, aire: 1.04, lado: 0.26, dur: 3000 },
    capas: { colonia: true, coches: true, limite: true },
    marcas: ['circuitoProyecto', 'espuela', 'mercado'],
    rotulosDe: ['mercado'],
    tarjeta: {
      kicker: 'Concepto · 4 / 4 · Un ejemplo',
      titulo: 'Mercado sobre ruedas',
      texto: 'Así llega el concepto a la colonia: los fines de semana, el mercado del proyecto sale de las naves y se extiende por la espuela como un mercado sobre ruedas. La vía en desuso vuelve a mover gente, comercio y convivencia, y la actividad del proyecto impacta directamente sobre Atlampa.',
      cifras: [
        ['≈ {mercadoKm} km', 'de mercado', 'sobre la espuela'],
        ['≈ {puestos}', 'puestos', 'a los dos lados de la vía'],
        ['Sáb · Dom', 'el mercado sale', 'entre semana, en las naves'],
        ['0', 'calles cerradas', 'va sobre la vía']
      ],
      nota: 'Es uno de los ejemplos de cómo el circuito reactiva lo social, lo productivo y lo ecológico.',
      fuente: 'Concepto del equipo · lámina «circuito»'
    },
    rotulos: []
  }
];

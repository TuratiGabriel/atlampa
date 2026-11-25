/* ============================================================
   ATLAMPA — Modo historia · guion de la etapa 1
   Cada slide es un estado del visor. Coordenadas en metros del visor (u, v);
   ver PRESENTACION FINAL/CONTEXTO.md y herramientas/prepara-historia.mjs.

   camara: encuadre  'colonia' | [u0, v0, u1, v1]
           az        'norte' (norte arriba) o grados del visor
           el        elevación (89 = cenital) · aire: holgura · dur: ms
           lado      fracción del ancho que tapa la tarjeta (se centra en el resto)
   capas:  colonia (edificios y calles de toda Atlampa), coches, limite
   marcas: 'asentamientos' | 'balaceras' (ver MARCAS abajo; en las balaceras, lado: 'izq' | 'der' pone el texto a un lado de los tiradores)
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
  ]
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
  }
];

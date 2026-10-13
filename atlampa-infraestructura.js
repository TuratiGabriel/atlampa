/* Infraestructura conceptual del conjunto.
   Las posiciones parten de la geometría vigente del visor. Las capacidades
   eléctricas son preliminares hasta contar con memoria de cargas y factibilidad CFE. */
window.ATLAMPA_INFRAESTRUCTURA = {
  version: '2026-10-13',
  electrica: {
    acometida: [520, 491.5, 1.2],
    subestacion: {
      caja: [511, 472, 521, 479],
      nivel: -3.5,
      altura: 3.1,
      area_m2: 70,
      transformador_kva: 1500,
      planta_emergencia_kw: 500,
      equipos: ['Celda de media tensión', 'Transformador seco 1,500 kVA', 'TGBT', 'Tableros por uso', 'ATS', 'Planta de emergencia 500 kW']
    },
    nucleos_vivienda: [
      { nombre: 'Vivienda N1', centro: [478, 444], origen: [485, 430, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda N2', centro: [493, 456], origen: [505, 455, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda N3', centro: [507, 453], origen: [505, 455, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda E1', centro: [520, 438], origen: [510, 414, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda C1', centro: [486, 390], origen: [500, 390, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda C2', centro: [501, 385], origen: [500, 390, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda S1', centro: [514, 370], origen: [520, 380, 0.8], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda S2', centro: [505, 345], origen: [520, 380, 0.8], niveles: 8, azimut: -10 }
    ],
    nucleos_comercio: [
      { nombre: 'Comercio norte', centro: [542, 450], origen: [530, 462, 0.8], niveles: 2, azimut: -10 },
      { nombre: 'Comercio sur', centro: [535, 365], origen: [520, 380, 0.8], niveles: 2, azimut: -10 }
    ],
    postes: [[485, 445, 4.8], [510, 414, 4.8], [500, 370, 4.8], [535, 405, 4.8]],
    rutas: [
      { tipo: 'red', puntos: [[520, 491.5, 1.2], [520, 484, 0.8], [516, 478, -0.3], [516, 475.5, -2.5]] },
      { tipo: 'alumbrado', puntos: [[516, 475.5, -2.5], [505, 458, 0.45], [485, 445, 0.45]] },
      { tipo: 'alumbrado', puntos: [[516, 475.5, -2.5], [514, 430, 0.45], [510, 414, 0.45], [535, 405, 0.45]] },
      { tipo: 'alumbrado', puntos: [[510, 414, 0.45], [500, 390, 0.45], [500, 370, 0.45]] },
      { tipo: 'vivienda', puntos: [[516, 475.5, -2.5], [503, 455, 4], [490, 445, 12], [475, 445, 18]] },
      { tipo: 'vivienda', puntos: [[503, 455, 4], [500, 410, 6], [485, 380, 15]] },
      { tipo: 'comercio', puntos: [[516, 475.5, -2.5], [530, 462, 0.8], [542, 450, 4.5]] },
      { tipo: 'comercio', puntos: [[516, 475.5, -2.5], [515, 410, 0.8], [535, 365, 4.5]] }
    ]
  },
  hidrosanitaria: {
    toma_publica: [549, 489, 0.8],
    cisterna_potable: { caja: [454, 349.5, 474, 360.5], nivel: -3.5, profundidad: 2.5, area_m2: 220, volumen_m3: 550 },
    bombas: { caja: [474, 349.5, 482, 354.5], nivel: -3.5, altura: 3, area_m2: 40 },
    laguna: { centro: [490.9, 405, 0.36], area_m2: 346, uso: 'Almacenamiento funcional de agua tratada' },
    humedales: [
      { paquete: 'norte', tipo: 'vertical', caja: [452, 470, 458, 478], servicio: 'Aguas grises' },
      { paquete: 'norte', tipo: 'horizontal', caja: [460, 470, 466, 478], servicio: 'Pulimiento' },
      { paquete: 'oriente', tipo: 'vertical', caja: [536, 417, 542, 425], servicio: 'Aguas grises' },
      { paquete: 'oriente', tipo: 'horizontal', caja: [544, 417, 550, 425], servicio: 'Pulimiento' },
      { paquete: 'central', tipo: 'vertical', caja: [514, 399, 520, 407], servicio: 'Efluente de biodigestores' },
      { paquete: 'central', tipo: 'horizontal', caja: [522, 399, 528, 407], servicio: 'Pulimiento y riego' }
    ],
    nucleos: [
      { nombre: 'Vivienda N1', centro: [478, 444], origen: [485, 430, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda N2', centro: [493, 456], origen: [485, 430, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda N3', centro: [507, 453], origen: [485, 430, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda E1', centro: [520, 438], origen: [485, 430, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda C1', centro: [486, 390], origen: [500, 390, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda C2', centro: [501, 385], origen: [500, 390, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda S1', centro: [514, 370], origen: [520, 380, 1], niveles: 8, azimut: -10 },
      { nombre: 'Vivienda S2', centro: [505, 345], origen: [520, 380, 1], niveles: 8, azimut: -10 },
      { nombre: 'Comercio norte', centro: [542, 450], origen: [540, 450, 3], niveles: 2, azimut: -10 },
      { nombre: 'Comercio sur', centro: [535, 365], origen: [535, 365, 3], niveles: 2, azimut: -10 }
    ],
    biodigestores: {
      fuente: 'ATLAMPA_MERCADO.sur.bio',
      desplazamiento_segundo: [10.8, 0, 0],
      capacidad_unitaria_m3: 35.8,
      area_unitaria_m2: 122.4
    },
    rutas: [
      { agua: 'potable', puntos: [[549, 489, 0.8], [548, 430, 0.5], [520, 380, 0.2], [482, 354, -2.4], [464, 354.5, -4.2]] },
      { agua: 'potable', puntos: [[464, 354.5, -4.2], [478, 352, -2.4], [478, 352, -1.1], [500, 390, 1], [485, 430, 12]] },
      { agua: 'potable', puntos: [[478, 352, -1.1], [520, 380, 1], [540, 450, 4]] },
      { agua: 'gris', puntos: [[485, 430, 10], [475, 450, 1], [455, 474, 0.55], [463, 474, 0.55]] },
      { agua: 'gris', puntos: [[540, 450, 3], [540, 435, 1], [539, 421, 0.55], [547, 421, 0.55]] },
      { agua: 'gris', puntos: [[535, 365, 3], [540, 390, 1], [517, 403, 0.55], [525, 403, 0.55]] },
      { agua: 'tratada', puntos: [[463, 474, 0.45], [478, 440, 0.4], [490.9, 405, 0.38]] },
      { agua: 'tratada', puntos: [[547, 421, 0.45], [520, 414, 0.4], [490.9, 405, 0.38]] },
      { agua: 'tratada', puntos: [[525, 403, 0.45], [507, 408, 0.4], [490.9, 405, 0.38]] },
      { agua: 'tratada', puntos: [[490.9, 405, 0.38], [485, 420, 1], [485, 430, 9]] },
      { agua: 'tratada', puntos: [[490.9, 405, 0.38], [515, 420, 1], [540, 450, 3]] },
      { agua: 'negra', puntos: [[485, 430, 8], [500, 390, 0.5], [522, 330.6, 0.2]] },
      { agua: 'negra', puntos: [[540, 450, 2.5], [545, 390, 0.5], [532.8, 330.6, 0.2]] },
      { agua: 'tratada', puntos: [[522, 330.6, 0.2], [520, 380, 0.5], [517, 403, 0.55]] },
      { agua: 'tratada', puntos: [[532.8, 330.6, 0.2], [535, 380, 0.5], [525, 403, 0.55]] },
      { agua: 'solidos', puntos: [[522, 330.6, 0.2], [540, 326, 0.3], [553, 326, 0.3]] },
      { agua: 'riego', puntos: [[463, 474, 0.5], [475, 455, 0.35], [480, 445, 0.35]] },
      { agua: 'riego', puntos: [[525, 403, 0.5], [510, 390, 0.35], [490, 370, 0.35]] },
      { agua: 'riego', puntos: [[547, 421, 0.5], [545, 410, 0.35], [550, 390, 0.35]] },
      { agua: 'pluvial', puntos: [[475, 445, 28], [475, 445, 1], [490.9, 405, 0.4]] },
      { agua: 'pluvial', puntos: [[490, 455, 25], [490, 455, 1], [490.9, 405, 0.4]] },
      { agua: 'pluvial', puntos: [[485, 380, 25], [485, 380, 1], [490.9, 405, 0.4]] },
      { agua: 'pluvial', puntos: [[535, 450, 9], [535, 420, 0.6], [490.9, 405, 0.4]] }
    ]
  }
};

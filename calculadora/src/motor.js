// Motor de cálculo del taxímetro.
// Base normativa: Decreto 456/001 (Reglamento Técnico Mercosur para Taxímetros) y Res. MEF 111/026.
// Nada de este archivo depende de la página: se prueba con `npm test`.

const EPSILON = 1e-9;

export const TARIFAS = {
  urbana: [
    { codigo: 'T1', nombre: 'De día, lunes a sábado', recargo: false },
    { codigo: 'T2', nombre: 'De noche (22 a 6 h), domingos y feriados', recargo: true },
  ],
  extraurbana: [
    { codigo: 'T3', nombre: 'De día, lunes a sábado', recargo: false },
    { codigo: 'T4', nombre: 'De noche (22 a 6 h), domingos y feriados', recargo: true },
  ],
};

/**
 * Valores derivados de una tarifa. No se guardan en la configuración: se calculan.
 *  K  = $/km, H = $/hora de espera, vt = velocidad de transición (km/h),
 *  d  = metros por ficha, s = segundos por ficha, C = distancia incluida en la bajada.
 * El recargo (q) se aplica a bajada, K y H; la ficha queda fija, así vt no cambia.
 */
export function derivados(cfg, modalidad, conRecargo) {
  const q = conRecargo ? 1 + cfg.recargo_pct / 100 : 1;
  const Kbase = modalidad === 'urbana'
    ? cfg.ficha * 1000 / cfg.metros_por_ficha_urbano
    : cfg.km_extraurbano;
  const K = Kbase * q;
  const H = cfg.hora_espera * q;
  return {
    q,
    bajada: Math.round(cfg.bajada * q * 100) / 100,
    ficha: cfg.ficha,
    K,
    H,
    vt: H / K,
    d: cfg.ficha * 1000 / K,
    s: cfg.ficha * 3600 / H,
    C: cfg.distancia_incluida_m,
  };
}

/**
 * Metros equivalentes de un recorrido.
 * Por encima de vt el reloj mide distancia; por debajo, tiempo convertido a distancia (modo excluyente, §5.3).
 * @param tramos [{dist: metros, dur: segundos}]
 */
export function metrosEquivalentes(tramos, vt) {
  let M = 0;
  for (const { dist, dur } of tramos) {
    if (!(dur > 0)) { M += dist; continue; }       // sin duración: solo se cuenta la distancia
    const v = (dist / dur) * 3.6;
    M += v > vt ? dist : dur * vt / 3.6;
  }
  return M;
}

/** Metros equivalentes de una espera (tiempo a velocidad cero). */
export function metrosDeEspera(segundos, vt) {
  return segundos * vt / 3.6;
}

/** Cantidad de fichas que cayeron luego de la bajada. */
export function contarFichas(M, C, d, primeraFichaEn) {
  const inicio = primeraFichaEn === 'C+d' ? C + d : C;
  if (M < inicio - EPSILON) return 0;
  return 1 + Math.floor((M - inicio) / d + EPSILON);
}

export function importe(der, n) {
  return Math.round((der.bajada + n * der.ficha) * 100) / 100;
}

/** Segundos de espera extra que se suman para el máximo del rango. */
export function segundosDeEspera(cfg, modalidad, distanciaM) {
  return modalidad === 'urbana'
    ? cfg.espera_urbano_s_por_km * distanciaM / 1000
    : cfg.espera_extraurbano_s;
}

/** Mínimo y máximo de una tarifa para un recorrido. */
export function calcularTarifa(tramos, distanciaM, cfg, modalidad, conRecargo) {
  const der = derivados(cfg, modalidad, conRecargo);
  const esperaS = segundosDeEspera(cfg, modalidad, distanciaM);
  const Mmin = metrosEquivalentes(tramos, der.vt);
  const Mmax = Mmin + metrosDeEspera(esperaS, der.vt);
  const nMin = contarFichas(Mmin, der.C, der.d, cfg.primera_ficha_en);
  const nMax = contarFichas(Mmax, der.C, der.d, cfg.primera_ficha_en);
  return {
    derivados: der,
    esperaS,
    min: { M: Mmin, fichas: nMin, importe: importe(der, nMin) },
    max: { M: Mmax, fichas: nMax, importe: importe(der, nMax) },
  };
}

/** Valijas que se cobran: las que pasan de las incluidas (la primera es gratis). */
export function valijasCobradas(cfg, cantidad) {
  return Math.max(0, cantidad - cfg.valijas_incluidas);
}

/** Importe por las valijas del pasajero: valor máximo por cada valija cobrada, sin recargo. */
export function importeValijas(cfg, cantidad) {
  return Math.round(valijasCobradas(cfg, cantidad) * cfg.valija_adicional * 100) / 100;
}

/**
 * Las dos tarifas que corresponden a la modalidad (T1/T2 o T3/T4).
 * min.importe y max.importe son lo que marca el reloj; min.total y max.total suman las valijas.
 */
export function calcularRangos(tramos, distanciaM, modalidad, cfg, valijas = 0) { // valijas: todas las del pasajero
  const extra = importeValijas(cfg, valijas);
  return TARIFAS[modalidad].map((t) => {
    const r = calcularTarifa(tramos, distanciaM, cfg, modalidad, t.recargo);
    const total = (x) => Math.round((x + extra) * 100) / 100;
    return {
      ...t,
      ...r,
      valijas: { cantidad: valijas, cobradas: valijasCobradas(cfg, valijas), importe: extra },
      min: { ...r.min, total: total(r.min.importe) },
      max: { ...r.max, total: total(r.max.importe) },
    };
  });
}

/** Redondeo de pantalla (propuesta, no confirmada): mínimo hacia abajo, máximo hacia arriba, al peso entero. */
export function redondearRango(min, max) {
  return { desde: Math.floor(min + EPSILON), hasta: Math.ceil(max - EPSILON) };
}

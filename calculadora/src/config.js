// config.js — todo lo que cambia cuando sale una resolución nueva.
// Instructivo: ver LEEME-ACTUALIZAR-TARIFAS.md
// Usar punto como separador decimal (100.56, no 100,56).

export const CONFIG = {
  vigencia: "2026-07-06",                 // fecha de vigencia de estos valores (AAAA-MM-DD)
  fuente: "Resolución MEF 111/026 · Resolución Departamental del 28/07/2026, pág. 46-47",

  bajada: 100.56,            // $ bajada de bandera
  distancia_incluida_m: 250, // m incluidos en la bajada (Res. MEF 111/026; la Intendencia no fijó otra)
  ficha: 2.93,               // $ valor de la ficha, ÚNICO en todo el reloj
  metros_por_ficha_urbano: 100,
  km_extraurbano: 55.36,     // $/km extraurbano
  hora_espera: 451.96,       // $ por hora de espera
  recargo_pct: 20,           // nocturno (22-06 h), domingos y feriados; único, no acumulable
  valija_adicional: 29.27,   // $ máximo por valija adicional (no lleva recargo)
  valijas_incluidas: 1,      // valijas que no se cobran (la primera es gratis)

  // Parámetros del rango
  espera_urbano_s_por_km: 45,  // espera extra del máximo urbano: segundos por km de viaje
  espera_extraurbano_s: 120,   // espera extra del máximo extraurbano: segundos fijos por viaje

  // Punto abierto: cuándo entra la primera ficha
  primera_ficha_en: "C",     // "C" = al cumplirse la distancia incluida; "C+d" = una ficha después

  // Ruta de emergencia (si el servicio de rutas no responde)
  factor_rodeo: 1.3,
  velocidad_emergencia_kmh: 30,
  espera_maxima_ruta_s: 6,   // segundos que se espera al servicio de rutas antes de usar la emergencia
};

// ---- Validación: no hace falta tocar nada de acá para abajo ----

const NUMERICOS = [
  'bajada', 'distancia_incluida_m', 'ficha', 'metros_por_ficha_urbano', 'km_extraurbano',
  'hora_espera', 'recargo_pct', 'valija_adicional', 'espera_urbano_s_por_km',
  'espera_extraurbano_s', 'factor_rodeo', 'velocidad_emergencia_kmh', 'espera_maxima_ruta_s',
  'valijas_incluidas',
];

/** Devuelve la lista de errores (vacía si la configuración es válida). */
export function validarConfig(cfg) {
  const errores = [];
  for (const campo of NUMERICOS) {
    const v = cfg[campo];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errores.push(`"${campo}" tiene que ser un número (con punto decimal), y vale ${JSON.stringify(v)}.`);
      continue;
    }
    if (campo === 'recargo_pct') {
      if (v < 0 || v > 100) errores.push(`"recargo_pct" tiene que estar entre 0 y 100, y vale ${v}.`);
    } else if (campo === 'valijas_incluidas') {
      if (v < 0 || !Number.isInteger(v)) errores.push(`"valijas_incluidas" tiene que ser un número entero (0, 1, 2…), y vale ${v}.`);
    } else if (campo === 'distancia_incluida_m') {
      if (v < 0) errores.push(`"distancia_incluida_m" no puede ser negativo, y vale ${v}.`);
    } else if (v <= 0) {
      errores.push(`"${campo}" tiene que ser mayor que 0, y vale ${v}.`);
    }
  }
  if (!['C', 'C+d'].includes(cfg.primera_ficha_en)) {
    errores.push(`"primera_ficha_en" tiene que ser "C" o "C+d", y vale ${JSON.stringify(cfg.primera_ficha_en)}.`);
  }
  if (typeof cfg.vigencia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cfg.vigencia) ||
      Number.isNaN(Date.parse(cfg.vigencia))) {
    errores.push(`"vigencia" tiene que ser una fecha AAAA-MM-DD, y vale ${JSON.stringify(cfg.vigencia)}.`);
  }
  return errores;
}

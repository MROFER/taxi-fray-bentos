/**
 * Tarifa oficial de taxis de Río Negro, para el contenido de la página
 * (ticket, pasos, preguntas frecuentes, JSON-LD y llms.txt).
 *
 * Los valores NO se cargan acá: salen de calculadora/src/config.js, el mismo archivo
 * que usa la calculadora. Para cambiar tarifas, ver calculadora/LEEME-ACTUALIZAR-TARIFAS.md.
 */
import { CONFIG } from '@calc/config.js';

export const TARIFA = {
  /** Bajada de bandera. */
  bandera: CONFIG.bajada,
  /** Metros incluidos en la bajada. */
  metrosBandera: CONFIG.distancia_incluida_m,
  /** Ficha (cada 100 m en planta urbana). */
  ficha: CONFIG.ficha,
  metrosPorFicha: CONFIG.metros_por_ficha_urbano,
  /** Hora de espera. */
  horaEspera: CONFIG.hora_espera,
  /** Kilómetro fuera de la planta urbana. */
  kmExtra: CONFIG.km_extraurbano,
  /** Recargo nocturno, domingos y feriados (fracción: 0.2 = 20 %). */
  nocturno: CONFIG.recargo_pct / 100,
  /** Cada valija adicional, máximo. */
  valija: CONFIG.valija_adicional,
  valijasIncluidas: CONFIG.valijas_incluidas,
  horarioNocturno: { desde: 22, hasta: 6 },
  fuente: CONFIG.fuente,
  /** "06/07/2026" */
  vigencia: CONFIG.vigencia.split('-').reverse().join('/'),
} as const;

const moneda = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$ 100,56" */
export const pesos = (n: number): string => '$ ' + moneda.format(n);

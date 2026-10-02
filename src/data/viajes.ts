/**
 * Precios de viajes de ejemplo para las preguntas frecuentes, calculados en el build con el motor de la calculadora.
 * Las rutas son recorridos reales de OSRM guardados en calculadora/tests/rutas (salen de Plaza Constitución);
 * si cambia la tarifa en calculadora/src/config.js, estos precios se actualizan solos.
 */
import { CONFIG } from '@calc/config.js';
import { convertirOsrm } from '@calc/ruta.js';
import { detectarModalidad } from '@calc/modalidad.js';
import { calcularRangos, redondearRango } from '@calc/motor.js';
import lasCanas from '../../calculadora/tests/rutas/centro-lasCanas.json';
import puente from '../../calculadora/tests/rutas/centro-puente.json';
import utec from '../../calculadora/tests/rutas/centro-utec.json';

export interface Viaje {
  km: number;
  /** De día, lunes a sábado. */
  dia: { desde: number; hasta: number };
  /** De noche, domingos y feriados. */
  noche: { desde: number; hasta: number };
}

function precio(osrm: unknown): Viaje {
  const ruta = convertirOsrm(osrm);
  const { modalidad } = detectarModalidad(ruta);
  const [dia, noche] = (calcularRangos(ruta.tramos, ruta.distancia_m, modalidad, CONFIG, 0) as {
    min: { importe: number };
    max: { importe: number };
  }[]).map((t) => redondearRango(t.min.importe, t.max.importe));
  return { km: Math.round(ruta.distancia_m / 100) / 10, dia: dia!, noche: noche! };
}

export const VIAJES = {
  lasCanas: precio(lasCanas),
  puente: precio(puente),
  utec: precio(utec),
};

/** "$ 578 y $ 593" */
export const rango = (r: { desde: number; hasta: number }) => `$ ${r.desde} y $ ${r.hasta}`;

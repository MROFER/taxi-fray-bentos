// Detección urbana / extraurbana: si la ruta sale del cerco urbano, el viaje es extraurbano.

import { normalizar } from './texto.js';
import { CERCO_URBANO, TOLERANCIA_CERCO_M, VIAS_PUENTE } from './cerco-urbano.js';

const PASO_REVISION_M = 20; // cada cuántos metros se revisa la ruta

// Proyección plana local (metros), suficiente a escala de ciudad.
const LAT0 = CERCO_URBANO[0][0] * Math.PI / 180;
const aMetros = ([lat, lon]) => [lon * 111320 * Math.cos(LAT0), lat * 110540];
const CERCO_M = CERCO_URBANO.map(aMetros);

function dentroDelPoligono([x, y], poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function distanciaAlBorde([x, y], poligono) {
  let min = Infinity;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [ax, ay] = poligono[j], [bx, by] = poligono[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return min;
}

/** ¿El punto [lat, lon] está dentro del cerco urbano (con el margen de tolerancia)? */
export function dentroDelCerco(punto, cerco = CERCO_M) {
  const p = aMetros(punto);
  return dentroDelPoligono(p, cerco) || distanciaAlBorde(p, cerco) <= TOLERANCIA_CERCO_M;
}

/** Para el editor: comprueba puntos contra un cerco que todavía no se guardó. */
export function dentroDeOtroCerco(punto, cerco) {
  return dentroDelCerco(punto, cerco.map(aMetros));
}

/** Primer punto de la línea que queda fuera del cerco, revisando cada PASO_REVISION_M metros; o null. */
function primeroAfuera(linea) {
  for (let k = 0; k < linea.length; k++) {
    if (!dentroDelCerco(linea[k])) return linea[k];
    if (k === linea.length - 1) break;
    const [a, b] = [linea[k], linea[k + 1]];
    const [ax, ay] = aMetros(a), [bx, by] = aMetros(b);
    const pasos = Math.floor(Math.hypot(bx - ax, by - ay) / PASO_REVISION_M);
    for (let s = 1; s <= pasos; s++) {
      const f = s / (pasos + 1);
      const p = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
      if (!dentroDelCerco(p)) return p;
    }
  }
  return null;
}

const esPuente = (nombre) => VIAS_PUENTE.some((v) => (' ' + normalizar(nombre) + ' ').includes(' ' + normalizar(v) + ' '));

/**
 * @returns {{ modalidad: 'urbana'|'extraurbana', salida: [lat, lon] | null, via: string, usaPuente: boolean }}
 *   salida: primer punto de la ruta fuera del cerco. via: nombre de la vía por la que sale (si se conoce).
 */
export function detectarModalidad(ruta) {
  const resultado = { modalidad: 'urbana', salida: null, via: '', usaPuente: false };
  resultado.usaPuente = ruta.pasos.some((p) => p.dist > 0 && esPuente(p.nombre));

  // Con la ruta de OSRM se revisa paso por paso para saber por qué vía sale.
  // Con la ruta de emergencia (línea recta) se revisan el origen, el destino y la recta entre ambos.
  const tramos = ruta.pasos.length
    ? ruta.pasos.map((p) => ({ nombre: p.nombre, linea: p.geometria }))
    : [{ nombre: '', linea: ruta.geometria }];

  for (const t of tramos) {
    const afuera = primeroAfuera(t.linea);
    if (afuera) {
      resultado.modalidad = 'extraurbana';
      resultado.salida = afuera;
      resultado.via = t.nombre;
      break;
    }
  }
  return resultado;
}

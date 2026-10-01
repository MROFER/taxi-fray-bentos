// Búsqueda de calles, esquinas y números de puerta sobre los datos embebidos de OpenStreetMap.
// No usa ningún servicio externo.

import { normalizar, palabras } from './texto.js';
import CALLES from '../data/calles.js';
import ESQUINAS from '../data/esquinas.js';
import NUMEROS from '../data/numeros.js';

// Palabras que la gente agrega pero que pueden no estar en el nombre cargado:
// "continuación colo" tiene que sugerir Colón.
const RELLENO = new Set([
  'calle', 'avenida', 'av', 'avda', 'continuacion', 'cont', 'de', 'del', 'la', 'las', 'los', 'el', 'y',
  'dr', 'doctor', 'gral', 'general', 'pte', 'presidente', 'camino', 'rambla', 'ruta', 'bulevar', 'bv',
]);

// Índice de búsqueda: por cada calle, sus palabras (nombre + alias).
const INDICE = CALLES.map((c, i) => ({
  i,
  nombre: c.n,
  normalizado: normalizar(c.n),
  palabras: [...new Set([c.n, ...c.a].flatMap(palabras))],
}));

export const calles = CALLES;

/**
 * Sugerencias para lo que el pasajero va escribiendo.
 * Cada palabra escrita tiene que ser el comienzo de alguna palabra del nombre,
 * salvo las palabras de relleno ("calle", "continuación"…), que se pueden omitir.
 * @returns [{ indice, nombre }]
 */
export function buscarCalles(texto, limite = 8) {
  const buscadas = palabras(texto);
  if (!buscadas.length) return [];
  const q = normalizar(texto);
  const resultados = [];
  for (const c of INDICE) {
    let aciertos = 0, valido = true, aciertosUtiles = 0;
    for (const b of buscadas) {
      if (c.palabras.some((p) => p.startsWith(b))) {
        aciertos++;
        if (!RELLENO.has(b)) aciertosUtiles++;
      } else if (!RELLENO.has(b)) {
        valido = false;
        break;
      }
    }
    // Hace falta al menos una palabra "útil", salvo que todo lo escrito sea relleno y coincida (ej. "rambla").
    if (!valido || aciertos === 0 || (aciertosUtiles === 0 && aciertos < buscadas.length)) continue;
    const empieza = c.normalizado.startsWith(q) ? 1 : 0;
    resultados.push({ indice: c.i, nombre: c.nombre, aciertos, empieza });
  }
  resultados.sort((a, b) => b.aciertos - a.aciertos || b.empieza - a.empieza || a.nombre.localeCompare(b.nombre, 'es'));
  return resultados.slice(0, limite).map(({ indice, nombre }) => ({ indice, nombre }));
}

/** Calles que cruzan a la calle dada, ordenadas por nombre. */
export function esquinasDe(indice) {
  const lista = [];
  for (const [a, b, lat, lon] of ESQUINAS) {
    if (a === indice || b === indice) {
      const otra = a === indice ? b : a;
      lista.push({ otra, nombre: CALLES[otra].n, punto: [lat, lon] });
    }
  }
  // Si dos calles se cruzan en más de un lugar, se numeran para distinguirlas.
  lista.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  const vistos = {};
  for (const e of lista) vistos[e.nombre] = (vistos[e.nombre] || 0) + 1;
  const contador = {};
  for (const e of lista) {
    if (vistos[e.nombre] > 1) e.nombre += ` (cruce ${(contador[e.nombre] = (contador[e.nombre] || 0) + 1)})`;
  }
  return lista;
}

/** Número de puerta exacto, si está cargado en OpenStreetMap. Devuelve [lat, lon] o null. */
export function buscarNumero(indice, numero) {
  const buscado = normalizar(numero).replace(/ /g, '');
  if (!buscado) return null;
  const encontrado = (NUMEROS[indice] || []).find(([n]) => normalizar(n).replace(/ /g, '') === buscado);
  return encontrado ? [encontrado[1], encontrado[2]] : null;
}

/** ¿Hay números de puerta cargados para esta calle? */
export function tieneNumeros(indice) {
  return (NUMEROS[indice] || []).length > 0;
}

/** Punto estimado cuando solo se eligió la calle: la mitad de su tramo más largo. */
export function puntoDeCalle(indice) {
  return CALLES[indice].p;
}

// Palabras que separan dos calles: "25 de Mayo y Lavalleja", "18 de Julio esq. Rincón".
const SEPARADORES_ESQUINA = new Set(['y', 'esq', 'esquina', 'con']);
// "25 de Mayo 3390", "25 de mayo nro 3390", "Colón 1234 bis"
const CON_NUMERO = /^(.+?)\s+(?:(?:nro|numero|num|n)\s+)?(\d{1,5}(?:\s?(?:bis|[a-z]))?)$/;

/**
 * Cuando "calle y otra" no da resultados: si las dos calles existen pero no se cruzan, devuelve sus nombres.
 * @returns {{ calle: string, otra: string } | null}
 */
export function calleSinCruce(texto) {
  const tokens = palabras(texto);
  for (let k = 1; k < tokens.length - 1; k++) {
    if (!SEPARADORES_ESQUINA.has(tokens[k])) continue;
    const [a] = buscarCalles(tokens.slice(0, k).join(' '), 1);
    const [b] = buscarCalles(tokens.slice(k + 1).join(' '), 1);
    if (a && b && a.indice !== b.indice) return { calle: a.nombre, otra: b.nombre };
  }
  return null;
}

/**
 * Sugerencias para una dirección escrita de corrido en el campo de la calle.
 * Entiende "calle", "calle número" y "calle y otra calle".
 * @returns [{ tipo: 'calle'|'numero'|'esquina', indice, nombre, numero?, encontrado?, otra?, punto? }]
 */
export function sugerirDirecciones(texto, limite = 8) {
  const q = normalizar(texto);
  const esquinas = [], conNumero = [], numeroSinCargar = [];

  // Calle y esquina: probar cada separador ("treinta y tres" no rompe nada: no se cruza consigo misma).
  const tokens = q ? q.split(' ') : [];
  tokens.forEach((t, k) => {
    if (!SEPARADORES_ESQUINA.has(t) || k === 0 || k === tokens.length - 1) return;
    const izquierda = tokens.slice(0, k).join(' '), derecha = tokens.slice(k + 1).join(' ');
    const deLaDerecha = new Set(buscarCalles(derecha, 30).map((c) => c.indice));
    for (const c of buscarCalles(izquierda, 5)) {
      for (const e of esquinasDe(c.indice)) {
        if (!deLaDerecha.has(e.otra)) continue;
        esquinas.push({ tipo: 'esquina', indice: c.indice, nombre: `${c.nombre} y ${e.nombre}`, otra: e.otra, punto: e.punto });
      }
    }
  });

  // Calle completa ("25 de Mayo", o "25 de Mayo y" a medio escribir): ofrecer todas sus esquinas.
  // Con un espacio al final (recién elegida de la lista) se ofrecen solo las esquinas, no la calle otra vez.
  const base = tokens.length && SEPARADORES_ESQUINA.has(tokens.at(-1)) ? tokens.slice(0, -1) : tokens;
  const exacta = base.length ? INDICE.find((c) => c.normalizado === base.join(' ')) : null;
  const soloEsquinas = Boolean(exacta) && (base.length < tokens.length || /\s$/.test(texto));
  if (exacta) {
    for (const e of esquinasDe(exacta.i)) {
      esquinas.push({ tipo: 'esquina', indice: exacta.i, nombre: `${exacta.nombre} y ${e.nombre}`, otra: e.otra, punto: e.punto });
    }
  }

  // Calle y número de puerta.
  const m = q.match(CON_NUMERO);
  if (m) {
    for (const c of buscarCalles(m[1], 3)) {
      const encontrado = buscarNumero(c.indice, m[2]) !== null;
      const s = { tipo: 'numero', indice: c.indice, nombre: `${c.nombre} ${m[2]}`, numero: m[2], encontrado };
      (encontrado ? conNumero : numeroSinCargar).push(s);
    }
  }

  const soloCalle = soloEsquinas ? [] : buscarCalles(texto, limite).map((c) => ({ tipo: 'calle', ...c }));
  // La calle escrita completa va primero; sus esquinas, después.
  const primero = exacta ? soloCalle.filter((c) => c.indice === exacta.i) : [];
  const resto = soloCalle.filter((c) => !primero.includes(c));
  // El número no cargado solo se ofrece si no hay otra interpretación ("Calle 1" es una calle, no "Calle" nº 1).
  const todas = [...primero, ...conNumero, ...esquinas, ...resto,
    ...(esquinas.length || conNumero.length || soloCalle.length ? [] : numeroSinCargar)];
  const vistos = new Set();
  // Cuando se listan todas las esquinas de una calle, se muestran todas (la lista tiene barra de desplazamiento).
  return todas.filter((s) => !vistos.has(s.nombre) && vistos.add(s.nombre)).slice(0, exacta ? 60 : limite);
}

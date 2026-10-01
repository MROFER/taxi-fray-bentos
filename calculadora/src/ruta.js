// Cálculo de la ruta. Para cambiar de proveedor alcanza con tocar este archivo:
// el resto de la página solo usa obtenerRuta(origen, destino).
//
// Forma del resultado:
// {
//   distancia_m, duracion_s,
//   tramos:    [{ dist, dur }]            — segmentos pequeños, para el motor
//   geometria: [[lat, lon], ...]          — un punto más que tramos
//   pasos:     [{ nombre, dist, geometria }] — vías recorridas, para detectar la modalidad
//   emergencia: false | true
// }

import { CONFIG } from './config.js';

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';

/** Distancia en línea recta entre dos puntos [lat, lon], en metros. */
export function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ruta entre dos puntos [lat, lon]. Nunca falla: si OSRM no responde, devuelve la ruta de emergencia. */
export async function obtenerRuta(origen, destino, { fetchFn = globalThis.fetch, cfg = CONFIG } = {}) {
  try {
    return await rutaOsrm(origen, destino, fetchFn, cfg.espera_maxima_ruta_s * 1000);
  } catch {
    return rutaEmergencia(origen, destino, cfg);
  }
}

async function rutaOsrm(origen, destino, fetchFn, esperaMs) {
  const coords = `${origen[1]},${origen[0]};${destino[1]},${destino[0]}`;
  const url = `${OSRM}${coords}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), esperaMs);
  try {
    const r = await fetchFn(url, { signal: control.signal });
    if (!r.ok) throw new Error(`OSRM respondió ${r.status}`);
    const datos = await r.json();
    if (datos.code !== 'Ok' || !datos.routes?.length) throw new Error(`OSRM: ${datos.code}`);
    return convertirOsrm(datos.routes[0]);
  } finally {
    clearTimeout(reloj);
  }
}

export function convertirOsrm(ruta) {
  const tramos = [], pasos = [];
  for (const tramo of ruta.legs) {
    const { distance, duration } = tramo.annotation;
    distance.forEach((dist, i) => tramos.push({ dist, dur: duration[i] }));
    for (const p of tramo.steps) {
      pasos.push({
        nombre: p.name || '',
        dist: p.distance,
        geometria: (p.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon]),
      });
    }
  }
  return {
    distancia_m: ruta.distance,
    duracion_s: ruta.duration,
    tramos,
    geometria: ruta.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    pasos,
    emergencia: false,
  };
}

/** Línea recta × factor de rodeo, a velocidad supuesta. */
export function rutaEmergencia(origen, destino, cfg = CONFIG) {
  const dist = haversine(origen, destino) * cfg.factor_rodeo;
  const dur = dist / (cfg.velocidad_emergencia_kmh / 3.6);
  return {
    distancia_m: dist,
    duracion_s: dur,
    tramos: [{ dist, dur }],
    geometria: [origen, destino],
    pasos: [],
    emergencia: true,
  };
}

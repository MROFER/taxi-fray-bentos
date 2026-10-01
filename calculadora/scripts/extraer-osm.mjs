// Extrae calles, esquinas y números de puerta de OpenStreetMap (Overpass API)
// y genera los archivos embebidos en data/.
//
// Uso:  node scripts/extraer-osm.mjs
//
// Los datos son © colaboradores de OpenStreetMap, licencia ODbL.
// No usar datos de Google ni de otras fuentes con condiciones incompatibles.

import { writeFile, mkdir } from 'node:fs/promises';
import { normalizar } from '../src/texto.js';

// Zona: Fray Bentos y Barrio Anglo (sur, oeste, norte, este).
const BBOX = '-33.20,-58.40,-33.05,-58.15';
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const AGENTE = 'tarifa-fray-bentos/1.0 (extraccion de datos, proyecto comunitario)';

const CONSULTA_CALLES = `[out:json][timeout:90];
( way["highway"]["name"](${BBOX}); );
out geom;`;

const CONSULTA_NUMEROS = `[out:json][timeout:90];
( node["addr:housenumber"](${BBOX});
  way["addr:housenumber"](${BBOX}); );
out center tags;`;

const TOLERANCIA_SIMPLIFICAR_M = 8;   // geometría de calles
const SEPARACION_ESQUINAS_M = 150;    // dos cruces de las mismas calles más cerca que esto = una esquina

async function overpass(consulta) {
  let ultimoError;
  for (const url of SERVIDORES) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': AGENTE, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(consulta),
        });
        if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
        return (await r.json()).elements;
      } catch (e) {
        ultimoError = e;
        console.warn(`  aviso: ${e.message}; reintentando…`);
        await new Promise((ok) => setTimeout(ok, 5000 * intento));
      }
    }
  }
  throw ultimoError;
}

const redondear = (x) => Math.round(x * 1e5) / 1e5; // ~1 m

function distanciaM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Douglas-Peucker con proyección local plana (suficiente a escala de ciudad).
function simplificar(puntos, toleranciaM) {
  if (puntos.length <= 2) return puntos;
  const lat0 = puntos[0][0] * Math.PI / 180;
  const xy = puntos.map(([lat, lon]) => [lon * 111320 * Math.cos(lat0), lat * 110540]);
  const conservar = new Array(puntos.length).fill(false);
  conservar[0] = conservar[puntos.length - 1] = true;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    const [ax, ay] = xy[i], [bx, by] = xy[j];
    const largo = Math.hypot(bx - ax, by - ay) || 1e-9;
    let max = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((bx - ax) * (ay - xy[k][1]) - (ax - xy[k][0]) * (by - ay)) / largo;
      if (d > max) { max = d; idx = k; }
    }
    if (max > toleranciaM) { conservar[idx] = true; pila.push([i, idx], [idx, j]); }
  }
  return puntos.filter((_, k) => conservar[k]);
}

// Punto a mitad de camino sobre el tramo más largo de la calle: "punto estimado" cuando solo se elige la calle.
function puntoMedio(lineas) {
  let mejor = null, mejorLargo = -1;
  for (const l of lineas) {
    let largo = 0;
    for (let k = 1; k < l.length; k++) largo += distanciaM(l[k - 1], l[k]);
    if (largo > mejorLargo) { mejorLargo = largo; mejor = l; }
  }
  let resto = mejorLargo / 2;
  for (let k = 1; k < mejor.length; k++) {
    const tramo = distanciaM(mejor[k - 1], mejor[k]);
    if (tramo >= resto && tramo > 0) {
      const f = resto / tramo;
      return [redondear(mejor[k - 1][0] + f * (mejor[k][0] - mejor[k - 1][0])),
              redondear(mejor[k - 1][1] + f * (mejor[k][1] - mejor[k - 1][1]))];
    }
    resto -= tramo;
  }
  return mejor[0];
}

function construirCalles(vias) {
  const porNombre = new Map();
  for (const v of vias) {
    const nombre = v.tags.name.trim();
    if (!porNombre.has(nombre)) porNombre.set(nombre, { nombre, alias: new Set(), lineas: [], vias: [] });
    const c = porNombre.get(nombre);
    for (const t of ['alt_name', 'old_name', 'short_name', 'official_name', 'loc_name']) {
      for (const a of (v.tags[t] || '').split(';')) if (a.trim() && a.trim() !== nombre) c.alias.add(a.trim());
    }
    c.lineas.push(v.geometry.map((p) => [redondear(p.lat), redondear(p.lon)]));
    c.vias.push(v);
  }
  return [...porNombre.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function construirEsquinas(calles) {
  // nodo OSM → { calles: Set(índice), punto }
  const nodos = new Map();
  calles.forEach((c, idx) => {
    for (const v of c.vias) {
      v.nodes.forEach((id, k) => {
        if (!nodos.has(id)) nodos.set(id, { calles: new Set(), punto: [redondear(v.geometry[k].lat), redondear(v.geometry[k].lon)] });
        nodos.get(id).calles.add(idx);
      });
    }
  });
  const porPar = new Map(); // "a|b" → [[lat,lon], ...]
  for (const { calles: cs, punto } of nodos.values()) {
    if (cs.size < 2) continue;
    const ids = [...cs].sort((x, y) => x - y);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const clave = ids[i] + '|' + ids[j];
        const puntos = porPar.get(clave) || [];
        if (!puntos.some((p) => distanciaM(p, punto) < SEPARACION_ESQUINAS_M)) puntos.push(punto);
        porPar.set(clave, puntos);
      }
    }
  }
  const esquinas = [];
  for (const [clave, puntos] of porPar) {
    const [a, b] = clave.split('|').map(Number);
    for (const p of puntos) esquinas.push([a, b, p[0], p[1]]);
  }
  return esquinas.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

function construirNumeros(elementos, calles) {
  const indice = new Map();
  calles.forEach((c, idx) => {
    indice.set(normalizar(c.nombre), idx);
    for (const a of c.alias) if (!indice.has(normalizar(a))) indice.set(normalizar(a), idx);
  });
  const numeros = {};
  const sinCalle = new Map();
  let total = 0, sinNombreDeCalle = 0, repetidos = 0;
  for (const e of elementos) {
    const calle = e.tags['addr:street'];
    const numero = String(e.tags['addr:housenumber']).trim();
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!calle) { sinNombreDeCalle++; continue; }
    const idx = indice.get(normalizar(calle));
    if (idx === undefined) { sinCalle.set(calle, (sinCalle.get(calle) || 0) + 1); continue; }
    const lista = (numeros[idx] ||= []);
    if (lista.some((n) => normalizar(n[0]) === normalizar(numero))) { repetidos++; continue; }
    lista.push([numero, redondear(lat), redondear(lon)]);
    total++;
  }
  for (const lista of Object.values(numeros)) {
    lista.sort((x, y) => (parseInt(x[0], 10) || 0) - (parseInt(y[0], 10) || 0));
  }
  return { numeros, total, sinCalle, sinNombreDeCalle, repetidos };
}

const encabezado = (que) =>
  `// ${que}. Generado por scripts/extraer-osm.mjs el ${new Date().toISOString().slice(0, 10)}. No editar a mano.\n` +
  `// Datos © colaboradores de OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright).\n`;

async function main() {
  console.log('Descargando calles…');
  const vias = await overpass(CONSULTA_CALLES);
  console.log('Descargando números de puerta…');
  const conNumero = await overpass(CONSULTA_NUMEROS);

  const calles = construirCalles(vias.filter((v) => v.type === 'way' && v.geometry && v.nodes));
  const esquinas = construirEsquinas(calles);
  const { numeros, total, sinCalle, sinNombreDeCalle, repetidos } = construirNumeros(conNumero, calles);

  const callesSalida = calles.map((c) => ({
    n: c.nombre,
    a: [...c.alias],
    p: puntoMedio(c.lineas),
    g: c.lineas.map((l) => simplificar(l, TOLERANCIA_SIMPLIFICAR_M)),
  }));

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(new URL('../data/calles.js', import.meta.url),
    encabezado('Calles: n = nombre, a = alias, p = punto medio [lat, lon], g = geometría simplificada') +
    'export default [\n' + callesSalida.map((c) => JSON.stringify(c)).join(',\n') + '\n];\n');
  await writeFile(new URL('../data/esquinas.js', import.meta.url),
    encabezado('Esquinas: [índice calle A, índice calle B, lat, lon]') +
    'export default [\n' + esquinas.map((e) => JSON.stringify(e)).join(',\n') + '\n];\n');
  await writeFile(new URL('../data/numeros.js', import.meta.url),
    encabezado('Números de puerta por índice de calle: [número, lat, lon]') +
    'export default {\n' + Object.entries(numeros).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(',\n') + '\n};\n');

  const callesConNumeros = Object.keys(numeros).length;
  console.log('\n=== Medición ===');
  console.log(`Calles (nombres distintos): ${calles.length}  (${vias.length} tramos OSM)`);
  console.log(`Esquinas: ${esquinas.length}`);
  console.log(`Números de puerta cargados: ${total}, en ${callesConNumeros} de ${calles.length} calles`);
  console.log(`Descartados: ${sinNombreDeCalle} sin addr:street, ${repetidos} repetidos, ` +
    `${[...sinCalle.values()].reduce((a, b) => a + b, 0)} con una calle que no está en la lista`);
  if (sinCalle.size) {
    const top = [...sinCalle].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('  Calles de addr:street no encontradas (top 10): ' + top.map(([n, c]) => `${n} (${c})`).join(', '));
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });

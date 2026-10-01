// Rutas reales de OSRM guardadas en tests/rutas/ (datos © colaboradores de OpenStreetMap).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { convertirOsrm, rutaEmergencia, haversine, obtenerRuta } from '../src/ruta.js';
import { detectarModalidad, dentroDelCerco } from '../src/modalidad.js';
import { CONFIG } from '../src/config.js';
import { LUGARES_DE_CONTROL } from '../src/cerco-urbano.js';

const ruta = (nombre) =>
  convertirOsrm(JSON.parse(readFileSync(new URL(`./rutas/${nombre}.json`, import.meta.url), 'utf8')));

const esperado = {
  'centro-anglo': 'urbana',
  'centro-utec': 'urbana',
  'centro-molino': 'urbana',                  // Barrio El Molino, por Batlle y Ordóñez
  'centro-artigasFeria': 'urbana',            // hasta el cruce de Artigas con Camino La Feria
  'centro-lasCanas': 'extraurbana',
  'centro-feriaPasandoBohanes': 'extraurbana',
  'centro-ramal10': 'extraurbana',
  'centro-puente': 'extraurbana',
  'centro-ruta2este': 'extraurbana',
  'centro-antesUpm': 'extraurbana',           // Roslik pasando Camino La Feria
  'centro-upm': 'extraurbana',
  'upm-centro': 'extraurbana',
  'centro-pasandoUpm': 'extraurbana',
  'pasandoUpm-centro': 'extraurbana',
};

for (const [nombre, modalidad] of Object.entries(esperado)) {
  test(`modalidad ${nombre}: ${modalidad}`, () => {
    assert.equal(detectarModalidad(ruta(nombre)).modalidad, modalidad);
  });
}

test('lugares de control dentro y fuera del cerco', () => {
  for (const [n, p] of Object.entries(LUGARES_DE_CONTROL.dentro)) assert.ok(dentroDelCerco(p), `${n} debería estar dentro`);
  for (const [n, p] of Object.entries(LUGARES_DE_CONTROL.fuera)) assert.ok(!dentroDelCerco(p), `${n} debería estar fuera`);
});

test('dice por qué vía sale del cerco', () => {
  // Pasando El Molino, OSM llama "Continuación Batlle" al Camino José Batlle y Ordóñez.
  assert.equal(detectarModalidad(ruta('centro-lasCanas')).via, 'Continuación Batlle');
});

test('la ruta convertida es coherente', () => {
  const r = ruta('centro-anglo');
  assert.equal(r.geometria.length, r.tramos.length + 1);
  const suma = r.tramos.reduce((s, t) => s + t.dist, 0);
  assert.ok(Math.abs(suma - r.distancia_m) < 5, `${suma} vs ${r.distancia_m}`);
});

test('cruzar el puente se marca para mostrar el aviso', () => {
  assert.equal(detectarModalidad(ruta('centro-puente')).usaPuente, false); // llega al acceso, no lo cruza
  const r = { pasos: [{ nombre: 'Puente Internacional Libertador General San Martín', dist: 5000, geometria: [[-33.1076, -58.2469]] }], geometria: [] };
  const m = detectarModalidad(r);
  assert.equal(m.modalidad, 'extraurbana');
  assert.equal(m.usaPuente, true);
});

test('ruta de emergencia: línea recta × 1,3 a 30 km/h, modalidad según el cerco', () => {
  const o = [-33.1165, -58.3130], d = [-33.1193, -58.3270];
  const r = rutaEmergencia(o, d, CONFIG);
  assert.equal(r.emergencia, true);
  assert.ok(Math.abs(r.distancia_m - haversine(o, d) * 1.3) < 1e-6);
  assert.ok(Math.abs(r.duracion_s - r.distancia_m / (30 / 3.6)) < 1e-6);
  assert.equal(detectarModalidad(r).modalidad, 'urbana');
  assert.equal(detectarModalidad(rutaEmergencia(o, [-33.1646, -58.3559], CONFIG)).modalidad, 'extraurbana');
});

test('obtenerRuta usa la emergencia si el servicio falla o tarda', async () => {
  const o = [-33.1165, -58.3130], d = [-33.1193, -58.3270];
  const falla = async () => { throw new Error('sin red'); };
  assert.equal((await obtenerRuta(o, d, { fetchFn: falla })).emergencia, true);

  const lenta = (url, { signal }) => new Promise((_, no) => signal.addEventListener('abort', () => no(new Error('abort'))));
  const cfg = { ...CONFIG, espera_maxima_ruta_s: 0.05 };
  assert.equal((await obtenerRuta(o, d, { fetchFn: lenta, cfg })).emergencia, true);
});

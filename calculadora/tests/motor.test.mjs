import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, validarConfig } from '../src/config.js';
import {
  derivados, metrosEquivalentes, contarFichas, calcularTarifa, calcularRangos, redondearRango,
} from '../src/motor.js';

const cfg = { ...CONFIG, primera_ficha_en: 'C' };
const cerca = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// Viaje a velocidad constante (mayor que vt): un solo tramo.
const viaje = (metros, kmh) => [{ dist: metros, dur: metros / (kmh / 3.6) }];

test('la configuración inicial es válida', () => {
  assert.deepEqual(validarConfig(CONFIG), []);
});

test('la validación detecta valores absurdos', () => {
  assert.equal(validarConfig({ ...CONFIG, ficha: 0 }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, bajada: '100,56' }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, hora_espera: NaN }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, recargo_pct: 120 }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, recargo_pct: 0 }).length, 0);
  assert.equal(validarConfig({ ...CONFIG, distancia_incluida_m: -1 }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, distancia_incluida_m: 0 }).length, 0);
  assert.equal(validarConfig({ ...CONFIG, primera_ficha_en: 'D' }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, vigencia: '06/07/2026' }).length, 1);
});

test('velocidades de transición', () => {
  cerca(derivados(cfg, 'urbana', false).vt, 15.43);
  cerca(derivados(cfg, 'extraurbana', false).vt, 8.16);
});

test('urbano 2,0 km, T1, mínimo: 18 fichas, $153,30', () => {
  const r = calcularTarifa(viaje(2000, 40), 2000, cfg, 'urbana', false);
  cerca(r.min.M, 2000, 1e-6);
  assert.equal(r.min.fichas, 18);
  assert.equal(r.min.importe, 153.30);
});

test('urbano 2,0 km, T1, máximo: 90 s de espera, 22 fichas, $165,02', () => {
  const r = calcularTarifa(viaje(2000, 40), 2000, cfg, 'urbana', false);
  assert.equal(r.esperaS, 90);
  cerca(r.max.M, 2385.6, 0.05);
  assert.equal(r.max.fichas, 22);
  assert.equal(r.max.importe, 165.02);
});

test('extraurbano 10 km a 60 km/h, T3, mínimo: 185 fichas, $642,61', () => {
  const r = calcularTarifa(viaje(10000, 60), 10000, cfg, 'extraurbana', false);
  cerca(r.derivados.d, 52.93);
  assert.equal(r.min.fichas, 185);
  assert.equal(r.min.importe, 642.61);
});

test('extraurbano 10 km, T3, máximo: 120 s de espera, 190 fichas, $657,26', () => {
  const r = calcularTarifa(viaje(10000, 60), 10000, cfg, 'extraurbana', false);
  assert.equal(r.esperaS, 120);
  cerca(r.max.M - r.min.M, 272.1, 0.05);
  assert.equal(r.max.fichas, 190);
  assert.equal(r.max.importe, 657.26);
});

test('viaje de 100 m: solo la bajada', () => {
  const r = calcularTarifa(viaje(100, 30), 100, cfg, 'urbana', false);
  assert.equal(r.min.fichas, 0);
  assert.equal(r.min.importe, 100.56);
});

test('T2 y T4: misma vt que T1 y T3, bajada 120,67', () => {
  for (const modalidad of ['urbana', 'extraurbana']) {
    const sin = derivados(cfg, modalidad, false);
    const con = derivados(cfg, modalidad, true);
    cerca(con.vt, sin.vt, 1e-9);
    assert.equal(con.bajada, 120.67);
    assert.equal(con.ficha, sin.ficha);
    cerca(con.H, sin.H * 1.2, 1e-9);
  }
});

test('fichas en los bordes (tolerancia de coma flotante)', () => {
  const d = derivados(cfg, 'urbana', false).d; // 100 m, con error de coma flotante
  assert.equal(contarFichas(249.99, 250, d, 'C'), 0);
  assert.equal(contarFichas(250, 250, d, 'C'), 1);
  assert.equal(contarFichas(350, 250, d, 'C'), 2);
  assert.equal(contarFichas(349.99, 250, d, 'C+d'), 0);
  assert.equal(contarFichas(350, 250, d, 'C+d'), 1);
  assert.equal(contarFichas(450, 250, d, 'C+d'), 2);
});

test('"C+d" cobra una ficha menos que "C" en el mismo viaje', () => {
  const a = calcularTarifa(viaje(2000, 40), 2000, cfg, 'urbana', false);
  const b = calcularTarifa(viaje(2000, 40), 2000, { ...cfg, primera_ficha_en: 'C+d' }, 'urbana', false);
  assert.equal(a.min.fichas - b.min.fichas, 1);
});

test('tramo lento: se cobra por tiempo', () => {
  const vt = derivados(cfg, 'urbana', false).vt;
  // 50 m en 60 s = 3 km/h < vt → cuenta 60 s × vt/3,6
  cerca(metrosEquivalentes([{ dist: 50, dur: 60 }], vt), 60 * vt / 3.6, 1e-9);
  // tramo sin duración: cuenta la distancia
  assert.equal(metrosEquivalentes([{ dist: 30, dur: 0 }], vt), 30);
});

test('calcularRangos devuelve T1/T2 en urbano y T3/T4 en extraurbano', () => {
  assert.deepEqual(calcularRangos(viaje(2000, 40), 2000, 'urbana', cfg).map((t) => t.codigo), ['T1', 'T2']);
  assert.deepEqual(calcularRangos(viaje(2000, 40), 2000, 'extraurbana', cfg).map((t) => t.codigo), ['T3', 'T4']);
});

test('redondeo de pantalla: mínimo hacia abajo, máximo hacia arriba', () => {
  assert.deepEqual(redondearRango(153.30, 165.02), { desde: 153, hasta: 166 });
  assert.deepEqual(redondearRango(153, 165), { desde: 153, hasta: 165 });
});

test('3 valijas: la primera es gratis, se cobran 2 a $29,27, sin recargo', () => {
  const [t1, t2] = calcularRangos(viaje(2000, 40), 2000, 'urbana', cfg, 3);
  assert.equal(t1.valijas.cobradas, 2);
  assert.equal(t1.valijas.importe, 58.54);
  assert.equal(t1.min.importe, 153.30);            // el reloj no cambia
  assert.equal(t1.min.total, 211.84);              // 153,30 + 2 × 29,27
  assert.equal(t1.max.total, 223.56);              // 165,02 + 58,54
  assert.equal(t2.valijas.importe, 58.54);         // T2: misma valija, sin recargo
});

test('1 valija no se cobra', () => {
  const [t1] = calcularRangos(viaje(2000, 40), 2000, 'urbana', cfg, 1);
  assert.equal(t1.valijas.cobradas, 0);
  assert.equal(t1.valijas.importe, 0);
  assert.equal(t1.min.total, t1.min.importe);
});

test('valijas_incluidas inválido se detecta', () => {
  assert.equal(validarConfig({ ...CONFIG, valijas_incluidas: 1.5 }).length, 1);
  assert.equal(validarConfig({ ...CONFIG, valijas_incluidas: 0 }).length, 0);
});

test('sin valijas, el total es igual al importe del reloj', () => {
  const [t1] = calcularRangos(viaje(2000, 40), 2000, 'urbana', cfg);
  assert.equal(t1.valijas.cantidad, 0);
  assert.equal(t1.min.total, t1.min.importe);
  assert.equal(t1.max.total, t1.max.importe);
});

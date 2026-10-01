import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarCalles, esquinasDe, buscarNumero, sugerirDirecciones, calleSinCruce, calles } from '../src/direcciones.js';

const nombres = (texto) => buscarCalles(texto).map((c) => c.nombre);
const indice = (nombre) => calles.findIndex((c) => c.n === nombre);

test('"colo" sugiere Colón', () => {
  assert.ok(nombres('colo').includes('Colón'));
});

test('"continuación colo" también sugiere Colón', () => {
  assert.ok(nombres('continuación colo').includes('Colón'));
});

test('sin acentos ni mayúsculas', () => {
  assert.ok(nombres('RINCON').includes('Rincón'));
  assert.ok(nombres('jose pedro').includes('José Pedro Varela'));
});

test('"continuacion batlle" pone primero Continuación Batlle', () => {
  assert.equal(nombres('continuacion batlle')[0], 'Continuación Batlle');
});

test('una palabra que no está en ninguna calle no sugiere nada', () => {
  assert.deepEqual(nombres('zzzz'), []);
  assert.deepEqual(nombres(''), []);
});

test('esquinas de 18 de Julio incluyen Treinta y Tres', () => {
  const e = esquinasDe(indice('18 de Julio'));
  assert.ok(e.some((x) => x.nombre.startsWith('Treinta y Tres')));
});

test('número de puerta exacto, o null si no está cargado', () => {
  // 18 de Julio 1033 está cargado en OSM al momento de la extracción (2026-09-30).
  const i = indice('18 de Julio');
  const p = buscarNumero(i, '1033');
  assert.ok(Array.isArray(p) && p.length === 2);
  assert.ok(p[0] < -33.1 && p[0] > -33.13);
  assert.equal(buscarNumero(i, '999999'), null);
});


test('"25 de mayo 3390" sugiere la calle con el número encontrado', () => {
  const [s] = sugerirDirecciones('25 de mayo 3390');
  assert.equal(s.tipo, 'numero');
  assert.equal(s.nombre, '25 de Mayo 3390');
  assert.equal(s.encontrado, true);
});

test('"25 de mayo y Libertador Juan Antonio Lavalleja" sugiere la esquina', () => {
  const [s] = sugerirDirecciones('25 de mayo y Libertador Juan Antonio Lavalleja');
  assert.equal(s.tipo, 'esquina');
  assert.equal(s.nombre, '25 de Mayo y Libertador Juan Antonio Lavalleja');
});

test('la esquina también se sugiere a medio escribir y con "esq"', () => {
  assert.equal(sugerirDirecciones('25 de mayo y lava')[0].tipo, 'esquina');
  assert.equal(sugerirDirecciones('25 de mayo esq lavalleja')[0].tipo, 'esquina');
});

test('"Treinta y Tres" sigue siendo una calle, no una esquina', () => {
  assert.ok(sugerirDirecciones('treinta y tres').some((s) => s.tipo === 'calle' && s.nombre === 'Treinta y Tres'));
});

test('"25 de mayo" sola sugiere la calle', () => {
  const [s] = sugerirDirecciones('25 de mayo');
  assert.equal(s.tipo, 'calle');
  assert.equal(s.nombre, '25 de Mayo');
});

test('número que no está cargado: se ofrece igual, marcado como no encontrado', () => {
  const [s] = sugerirDirecciones('25 de mayo 99999');
  assert.equal(s.tipo, 'numero');
  assert.equal(s.encontrado, false);
});

test('calle recién elegida ("25 de Mayo "): se listan todas sus esquinas', () => {
  const s = sugerirDirecciones('25 de Mayo ');
  assert.ok(s.length >= 10);
  assert.ok(s.every((x) => x.tipo === 'esquina'));
  assert.ok(s.some((x) => x.nombre === '25 de Mayo y Libertador Juan Antonio Lavalleja'));
});

test('"25 de mayo y" también lista sus esquinas', () => {
  const s = sugerirDirecciones('25 de mayo y');
  assert.ok(s.length >= 10 && s.every((x) => x.tipo === 'esquina'));
});

test('calles que existen pero no se cruzan se distinguen de una calle inexistente', () => {
  assert.deepEqual(sugerirDirecciones('18 de Julio y Rincón'), []);
  assert.deepEqual(calleSinCruce('18 de Julio y rinc'), { calle: '18 de Julio', otra: 'Rincón' });
  assert.equal(calleSinCruce('25 de mayo y zzzz'), null);
});

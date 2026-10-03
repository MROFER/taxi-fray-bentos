// Prueba public/api/alta.php con el servidor de PHP y una base SQLite temporal.
// Si no hay PHP con pdo_sqlite instalado, se saltea.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
const php = spawnSync('php', ['-m'], { encoding: 'utf8' });
const hayPhp = php.status === 0 && /pdo_sqlite/i.test(php.stdout);
const PUERTO = 8790 + Math.floor(Math.random() * 100);
const URL_ALTA = `http://127.0.0.1:${PUERTO}/api/alta.php`;

let servidor;
let dir;

before(async () => {
  if (!hayPhp) return;
  dir = mkdtempSync(join(tmpdir(), 'alta-'));
  const config = join(dir, 'taxi-config.php');
  writeFileSync(config, `<?php return ['db' => ['dsn' => 'sqlite:${join(dir, 'taxi.db')}'], 'sal' => 'prueba'];`);
  // Tabla como la crearon las versiones anteriores (sin la columna "acepto"), para probar que se agrega sola.
  spawnSync('php', ['-r', `(new PDO('sqlite:${join(dir, 'taxi.db')}'))->exec("CREATE TABLE solicitudes_alta (id INTEGER PRIMARY KEY AUTOINCREMENT, creado TEXT NOT NULL, titular TEXT NOT NULL, movil TEXT NOT NULL DEFAULT '', telefono TEXT NOT NULL, permiso TEXT NOT NULL, parada TEXT NOT NULL DEFAULT '', correo TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente')");`]);
  servidor = spawn('php', ['-S', `127.0.0.1:${PUERTO}`, '-t', join(raiz, 'public')], {
    env: { ...process.env, TAXI_CONFIG: config },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(URL_ALTA);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('no arrancó el servidor de PHP');
});

after(() => {
  servidor?.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const enviar = (campos) => fetch(URL_ALTA, { method: 'POST', body: new URLSearchParams(campos) });
const valida = {
  titular: 'Juan Pérez', telefono: '099 123 456', permiso: 'jtx 0212', movil: 'Taxi Lechuzas',
  consentimiento: 'si', declaracion: 'si',
};

test('alta.php', { skip: !hayPhp && 'PHP con pdo_sqlite no está instalado' }, async (t) => {
  await t.test('solo acepta POST', async () => {
    assert.equal((await fetch(URL_ALTA)).status, 405);
  });

  await t.test('guarda una solicitud válida', async () => {
    const r = await enviar(valida);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.equal(j.id, 1);
    const fila = spawnSync('php', ['-r', `echo (new PDO('sqlite:${join(dir, 'taxi.db')}'))->query('SELECT acepto FROM solicitudes_alta')->fetchColumn();`], { encoding: 'utf8' });
    assert.match(fila.stdout, /^privacidad\+declaracion \d{4}-\d{2}-\d{2}$/);
  });

  await t.test('rechaza datos incompletos y dice cuáles', async () => {
    const r = await enviar({ titular: 'Jo', telefono: '123', permiso: '', correo: 'no-es-correo' });
    assert.equal(r.status, 422);
    assert.deepEqual((await r.json()).campos, ['titular', 'movil', 'telefono', 'permiso', 'correo', 'consentimiento', 'declaracion']);
  });

  await t.test('exige las dos casillas', async () => {
    const { declaracion, ...sinDeclaracion } = valida;
    const r = await enviar(sinDeclaracion);
    assert.equal(r.status, 422);
    assert.deepEqual((await r.json()).campos, ['declaracion']);
  });

  await t.test('el campo trampa descarta el envío sin guardarlo', async () => {
    const r = await enviar({ ...valida, web: 'http://spam' });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).id, undefined);
  });

  await t.test('frena más de 5 solicitudes por hora desde la misma conexión', async () => {
    for (let i = 0; i < 4; i++) assert.equal((await enviar(valida)).status, 200);
    assert.equal((await enviar(valida)).status, 429);
  });
});

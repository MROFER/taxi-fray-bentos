// Prueba el ingreso al panel (public/api/panel/) con el servidor de PHP, una base SQLite temporal
// y un GitHub de mentira (para ver qué le llega). Si no hay PHP con pdo_sqlite y curl, se saltea.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
const php = spawnSync('php', ['-m'], { encoding: 'utf8' });
const hayPhp = php.status === 0 && /pdo_sqlite/i.test(php.stdout) && /^curl$/im.test(php.stdout);
const PUERTO = 8900 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PUERTO}/api/panel/`;
const CORREO = 'dueno@example.com';

let servidor;
let github;
let dir;
const recibidos = [];

before(async () => {
  if (!hayPhp) return;
  dir = mkdtempSync(join(tmpdir(), 'panel-'));
  github = createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => (cuerpo += c));
    req.on('end', () => {
      recibidos.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, cuerpo });
      res.writeHead(200, { 'Content-Type': 'application/json', Link: '<x>; rel="next"', 'Set-Cookie': 'no=pasa' });
      res.end(JSON.stringify({ ok: 'github' }));
    });
  });
  await new Promise((r) => github.listen(0, '127.0.0.1', r));
  const config = join(dir, 'taxi-config.php');
  writeFileSync(
    config,
    `<?php return ['db' => ['dsn' => 'sqlite:${join(dir, 'taxi.db')}'], 'sal' => 'prueba',
      'panel' => ['correos' => ['Dueno@Example.com'], 'github_token' => 'llave-secreta', 'github_api' => 'http://127.0.0.1:${github.address().port}']];`,
  );
  servidor = spawn('php', ['-S', `127.0.0.1:${PUERTO}`, '-t', join(raiz, 'public')], {
    env: { ...process.env, TAXI_CONFIG: config, TAXI_PANEL_CORREOS: join(dir, 'correos.txt') },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + 'sesion.php');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('no arrancó el servidor de PHP');
});

after(() => {
  servidor?.kill();
  github?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

let cookie = '';
const post = (archivo, datos, cabeceras = {}) =>
  fetch(BASE + archivo, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabeceras }, body: JSON.stringify(datos) });
const conSesion = (archivo, opciones = {}) => fetch(BASE + archivo, { ...opciones, headers: { Cookie: cookie, ...opciones.headers } });
const ultimoCodigo = () => readFileSync(join(dir, 'correos.txt'), 'utf8').trim().split('\n').at(-1).split('restablecer=')[1];

test('ingreso al panel', { skip: !hayPhp && 'PHP con pdo_sqlite y curl no está instalado' }, async (t) => {
  await t.test('sin sesión no deja pasar a GitHub', async () => {
    assert.equal((await fetch(BASE + 'sesion.php')).status, 401);
    assert.equal((await fetch(BASE + 'gh.php/api/v3/user')).status, 401);
    assert.equal(recibidos.length, 0);
  });

  await t.test('no se puede abrir el archivo común', async () => {
    assert.equal((await fetch(BASE + '_comun.php')).status, 404);
  });

  await t.test('un mail no habilitado no recibe enlace (y la respuesta es la misma)', async () => {
    const r = await post('recuperar.php', { correo: 'otro@example.com' });
    assert.equal(r.status, 200);
    assert.equal(existsSync(join(dir, 'correos.txt')), false);
  });

  await t.test('un mail habilitado recibe el enlace y elige contraseña', async () => {
    assert.equal((await post('recuperar.php', { correo: 'DUENO@example.com' })).status, 200);
    const codigo = ultimoCodigo();
    assert.match(codigo, /^[\w-]{40,}$/);
    assert.equal((await post('restablecer.php', { codigo, clave: 'corta' })).status, 422);
    const r = await post('restablecer.php', { codigo, clave: 'una frase larga' });
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie').split(';')[0];
    assert.match(r.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(r.headers.get('set-cookie'), /SameSite=Strict/i);
    assert.equal((await post('restablecer.php', { codigo, clave: 'otra frase larga' })).status, 400, 'el enlace sirve una sola vez');
    assert.equal((await conSesion('sesion.php')).status, 200);
  });

  await t.test('entra con la contraseña y rechaza una equivocada', async () => {
    assert.equal((await post('entrar.php', { correo: CORREO, clave: 'equivocada!!' })).status, 401);
    const r = await post('entrar.php', { correo: CORREO, clave: 'una frase larga' });
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie').split(';')[0];
  });

  await t.test('una cookie alterada no sirve', async () => {
    const [datos, firma] = cookie.split('=')[1].split('.');
    const r = await fetch(BASE + 'sesion.php', { headers: { Cookie: `tfb_panel=${datos}x.${firma}` } });
    assert.equal(r.status, 401);
  });

  await t.test('con sesión pasa a GitHub con la llave del servidor', async () => {
    const r = await conSesion('gh.php/api/v3/repos/MROFER/taxi-fray-bentos/contents/a.json?ref=panel-admin', {
      headers: { Authorization: 'token de-mentira' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('link'), '<x>; rel="next"');
    assert.equal(r.headers.get('set-cookie'), null, 'no reenvía cookies de GitHub');
    const p = recibidos.at(-1);
    assert.equal(p.url, '/repos/MROFER/taxi-fray-bentos/contents/a.json?ref=panel-admin');
    assert.equal(p.auth, 'Bearer llave-secreta');
  });

  await t.test('GraphQL: reenvía el cuerpo', async () => {
    const consulta = JSON.stringify({ query: '{ viewer { login } }' });
    const r = await conSesion('gh.php/api/graphql', { method: 'POST', body: consulta, headers: { 'Content-Type': 'application/json' } });
    assert.equal(r.status, 200);
    assert.equal(recibidos.at(-1).url, '/graphql');
    assert.equal(recibidos.at(-1).cuerpo, consulta);
  });

  await t.test('solo deja pasar este repositorio, y nada desde otro sitio', async () => {
    const antes = recibidos.length;
    assert.equal((await conSesion('gh.php/api/v3/repos/otro/repo')).status, 403);
    assert.equal((await conSesion('gh.php/api/v3/user/repos')).status, 403);
    assert.equal((await conSesion('gh.php/api/v3/repos/MROFER/taxi-fray-bentos/%2e%2e/%2e%2e/otro/repo')).status, 403);
    const ajeno = await conSesion('gh.php/api/graphql', { method: 'POST', body: '{}', headers: { Origin: 'https://malo.example' } });
    assert.equal(ajeno.status, 403);
    assert.equal(recibidos.length, antes);
  });

  await t.test('cambiar la contraseña cierra las sesiones viejas', async () => {
    const vieja = cookie;
    await post('recuperar.php', { correo: CORREO });
    const r = await post('restablecer.php', { codigo: ultimoCodigo(), clave: 'la frase nueva' });
    assert.equal(r.status, 200);
    assert.equal((await fetch(BASE + 'sesion.php', { headers: { Cookie: vieja } })).status, 401);
  });

  await t.test('frena a quien prueba contraseñas', async () => {
    let ultimo;
    for (let i = 0; i < 7; i++) ultimo = await post('entrar.php', { correo: CORREO, clave: `mala-${i}-xxxxx` });
    assert.equal(ultimo.status, 429);
  });
});

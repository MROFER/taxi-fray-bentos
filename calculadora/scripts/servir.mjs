// Servidor local para probar la página: node scripts/servir.mjs  →  http://localhost:8080
// Además permite guardar el cerco urbano desde herramientas/editar-cerco.html.
// Solo escucha en esta computadora (127.0.0.1): nadie más en la red puede usarlo.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARCHIVO_CERCO = join(RAIZ, 'src', 'cerco-urbano.js');
const RESPALDOS = join(RAIZ, 'herramientas', 'respaldos');
const PUERTO = Number(process.env.PORT) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
};
const BLOQUE_CERCO = /export const CERCO_URBANO = \[[\s\S]*?\n\];/;
const LINEA_PUNTO = /^\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*,?\s*(?:\/\/\s?(.*))?$/;

/** Puntos y notas del cerco, leídos del archivo (las notas son los comentarios de cada línea). */
async function leerCerco() {
  const texto = await readFile(ARCHIVO_CERCO, 'utf8');
  const bloque = texto.match(BLOQUE_CERCO)?.[0];
  if (!bloque) throw new Error('No se encontró CERCO_URBANO en src/cerco-urbano.js');
  return bloque.split('\n').map((l) => l.match(LINEA_PUNTO)).filter(Boolean)
    .map(([, lat, lon, nota]) => ({ lat: Number(lat), lon: Number(lon), nota: (nota || '').trim() }));
}

function validar(puntos) {
  if (!Array.isArray(puntos) || puntos.length < 3 || puntos.length > 300) return 'El cerco necesita entre 3 y 300 puntos.';
  for (const p of puntos) {
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lon)) return 'Hay un punto sin coordenadas válidas.';
    if (p.lat < -34 || p.lat > -32 || p.lon < -59 || p.lon > -57) return 'Hay un punto fuera de la zona de Río Negro.';
    if (p.nota !== undefined && (typeof p.nota !== 'string' || p.nota.length > 150)) return 'Hay una nota demasiado larga.';
  }
  return null;
}

async function guardarCerco(puntos) {
  const texto = await readFile(ARCHIVO_CERCO, 'utf8');
  if (!BLOQUE_CERCO.test(texto)) throw new Error('No se encontró CERCO_URBANO en src/cerco-urbano.js');
  const marca = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  await mkdir(RESPALDOS, { recursive: true });
  const respaldo = join(RESPALDOS, `cerco-urbano-${marca}.js`);
  await writeFile(respaldo, texto);
  const lineas = puntos.map(({ lat, lon, nota }) => {
    const limpia = (nota || '').replace(/[\r\n]+/g, ' ').trim();
    return `  [${lat.toFixed(5)}, ${lon.toFixed(5)}],${limpia ? ' // ' + limpia : ''}`;
  });
  const nuevo = texto.replace(BLOQUE_CERCO, () => 'export const CERCO_URBANO = [\n' + lineas.join('\n') + '\n];');
  await writeFile(ARCHIVO_CERCO, nuevo);
  return respaldo.slice(RAIZ.length).replace(/\\/g, '/');
}

async function leerCuerpo(req) {
  let cuerpo = '';
  for await (const parte of req) {
    cuerpo += parte;
    if (cuerpo.length > 100_000) throw new Error('Pedido demasiado grande.');
  }
  return JSON.parse(cuerpo);
}

const json = (res, estado, datos) => {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(datos));
};

createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);

  if (ruta === '/api/cerco') {
    try {
      if (req.method === 'GET') return json(res, 200, { puntos: await leerCerco() });
      if (req.method === 'POST') {
        const { puntos } = await leerCuerpo(req);
        const error = validar(puntos);
        if (error) return json(res, 400, { error });
        const respaldo = await guardarCerco(puntos);
        console.log(`Cerco guardado (${puntos.length} puntos). Respaldo: ${respaldo}`);
        return json(res, 200, { ok: true, respaldo });
      }
      return json(res, 405, { error: 'Método no permitido' });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  const archivo = normalize(join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
  if (!archivo.startsWith(normalize(RAIZ))) { res.writeHead(403).end(); return; }
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(contenido);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`Abrí http://localhost:${PUERTO}`);
  console.log(`Editor del cerco: http://localhost:${PUERTO}/herramientas/editar-cerco.html`);
});

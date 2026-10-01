// Arma una vista previa de un solo archivo HTML a partir de dist/ (después de `npm run build`):
// todo el JS, el CSS de Leaflet y las fuentes quedan adentro del HTML, sin archivos aparte.
// Sirve para compartir la landing en lugares que solo aceptan un archivo (por ejemplo un Artifact de Claude).
// Uso: node scripts/vista-previa.mjs [salida.html]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const DIST = new URL('../dist/', import.meta.url).pathname;
const ASSETS = join(DIST, '_astro');
const salida = process.argv[2] ?? join(DIST, 'vista-previa.html');

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// 1. Scripts: un solo bundle IIFE (los import() dinámicos quedan adentro).
const modulos = [...html.matchAll(/<script type="module" src="\/_astro\/([^"]+)"><\/script>/g)].map((m) => m[1]);
const entrada = modulos.map((f) => `import ${JSON.stringify(join(ASSETS, f))};`).join('\n');
const { outputFiles } = await build({
  stdin: { contents: entrada, resolveDir: ASSETS, loader: 'js' },
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  logLevel: 'error',
  plugins: [{
    // Sin precargas de Vite: en un solo archivo no hay nada que precargar.
    name: 'sin-precarga',
    setup(b) {
      b.onLoad({ filter: /\.js$/ }, (a) => ({
        contents: readFileSync(a.path, 'utf8').replace(/__vite__mapDeps\(\[[^\]]*\]\)/g, '[]'),
        loader: 'js',
      }));
    },
  }],
});
const js = outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<script type="module" src="\/_astro\/[^"]+"><\/script>/g, '');

// 2. Fuentes como data URI; sin precargas.
html = html.replace(/<link rel="preload"[^>]*>/g, '');
html = html.replace(/url\(\/_astro\/([^)]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${readFileSync(join(ASSETS, f)).toString('base64')})`);

// 3. CSS de Leaflet inline (el mapa lo pide como archivo; si no lo encuentra sigue igual).
const leafletCss = readdirSync(ASSETS).find((f) => /^leaflet\..+\.css$/.test(f));
const css = leafletCss ? `<style>${readFileSync(join(ASSETS, leafletCss), 'utf8')}</style>` : '';

// 4. Sin enlaces a archivos que no viajan con la vista previa.
html = html.replace(/<link rel="(icon|apple-touch-icon|manifest|sitemap)"[^>]*>/g, '');
html = html.replace('</head>', `${css}</head>`).replace('</body>', `<script>${js}</script></body>`);

writeFileSync(salida, html);
console.log(`Vista previa: ${salida} (${Math.round(html.length / 1024)} KB)`);

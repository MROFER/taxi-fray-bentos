// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
// SITE_URL y BASE_PATH permiten publicar en otra dirección (ej. GitHub Pages: ver .github/workflows/deploy.yml).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://taxifraybentos.com.uy',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
  // Dirección vieja de la calculadora (en Hostinger además hay un 301 en public/.htaccess).
  redirects: { '/calculadora': `${(process.env.BASE_PATH ?? '/').replace(/\/$/, '')}/calculadora-de-tarifas/` },
  integrations: [
    sitemap({
      // Las páginas legales llevan noindex (ver PaginaLegal.astro): fuera del sitemap para no mandar señales contradictorias.
      filter: (page) => !/\/(aviso-legal|privacidad|cookies|condiciones)\/?$/.test(page),
    }),
  ],
  build: {
    // Una sola página liviana: el CSS va inline en el <head> y se ahorra un request bloqueante.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
});

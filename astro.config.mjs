// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
// SITE_URL y BASE_PATH permiten publicar en otra dirección (ej. GitHub Pages: ver .github/workflows/deploy.yml).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://taxifraybentos.com.uy',
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'ignore',
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

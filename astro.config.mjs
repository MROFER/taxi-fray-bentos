// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://taxifraybentos.com.uy',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    // Una sola página liviana: el CSS va inline en el <head> y se ahorra un request bloqueante.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
});

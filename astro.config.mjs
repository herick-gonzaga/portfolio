// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://herick-gonzaga.pages.dev',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', pt: 'pt-BR', es: 'es' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline bundled scripts or assets: public/_headers' Content-Security-Policy allows
      // inline scripts only by hash, so component scripts must ship as files under /_astro/.
      assetsInlineLimit: 0,
    },
  },
});

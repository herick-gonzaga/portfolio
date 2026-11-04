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
  // Every route ends in "/", like the canonical and hreflang URLs; with format 'preserve' the
  // sitemap would otherwise list /pt and /es.
  trailingSlash: 'always',
  build: {
    // index.astro → index.html as before, and 404.astro → 404.html (not 404/index.html), so
    // Cloudflare Pages finds /404.html, /pt/404.html and /es/404.html and serves the nearest one with status 404.
    format: 'preserve',
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
      // One stylesheet for every page. Without this, the classes the home and 404 pages share are
      // split into a second render-blocking CSS file.
      cssCodeSplit: false,
    },
  },
});

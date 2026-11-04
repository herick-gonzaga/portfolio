/**
 * 404 pages (src/pages/404.astro, pt/404.astro, es/404.astro).
 * Build: dist/404.html, dist/pt/404.html and dist/es/404.html exist (build.format 'preserve'), and
 * the sitemap leaves them out (contact-seo checks it lists exactly the three routes).
 * Serving: an unknown path gets the nearest 404.html with status 404 and the security headers, never
 * the homepage. That includes a missing hashed asset under /_astro/, which Cloudflare Pages served
 * as the homepage with a 200 and immutable caching while the site had no 404.html.
 * Page (1440 and 390px): ink background, mono cobalt-soft kicker "404", one <h1> at the H2 size
 * with ui.notFoundTitle, ui.notFoundText in muted-dark, and a 48px primary button with
 * ui.notFoundBack that goes to the locale's homepage. Head: localized title, robots noindex, and no
 * canonical, hreflang, og:url or JSON-LD (they'd point at a URL the page doesn't belong to).
 * A pt browser on an unknown English path is not redirected (the locale script only runs on /).
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKENS, normalize } from './lib/context.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WIDTHS = [
  { width: 1440, h2: 40 },
  { width: 390, h2: 32 },
];

/** Unknown paths per route prefix, including a nested one. */
const unknownPaths = (route) => [`${route.path}does-not-exist`, `${route.path}a/b/c/`];

function readPage() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const style = (el) => (el ? getComputedStyle(el) : null);
  const main = document.querySelector('main[data-not-found]');
  const kicker = main?.querySelector('p');
  const heading = main?.querySelector('h1');
  const copy = heading?.nextElementSibling;
  const button = main?.querySelector('a');
  const meta = (selector) => document.querySelector(selector)?.getAttribute('content') ?? null;
  return {
    lang: document.documentElement.lang,
    title: document.title,
    robots: meta('meta[name="robots"]'),
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    hreflang: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
    ogUrl: document.querySelectorAll('meta[property="og:url"]').length,
    jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
    isHome: Boolean(document.getElementById('projects') || document.getElementById('contact')),
    h1Count: document.querySelectorAll('h1').length,
    main: main && { background: style(main).backgroundColor, height: main.getBoundingClientRect().height },
    kicker: kicker && { text: text(kicker), mono: /mono/i.test(style(kicker).fontFamily), size: parseFloat(style(kicker).fontSize), color: style(kicker).color },
    heading: heading && { text: text(heading), size: parseFloat(style(heading).fontSize), weight: style(heading).fontWeight, color: style(heading).color },
    copy: copy && { text: text(copy), color: style(copy).color },
    button: button && {
      text: text(button),
      href: button.getAttribute('href'),
      background: style(button).backgroundColor,
      color: style(button).color,
      height: button.getBoundingClientRect().height,
    },
    viewportHeight: innerHeight,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

async function checkServing(t, baseUrl, routes) {
  for (const route of routes) {
    const file = join(root, 'dist', route.path, '404.html');
    t.ok(existsSync(file), `dist${route.path}404.html exists`);
    for (const path of unknownPaths(route)) {
      const response = await fetch(baseUrl + path);
      const body = await response.text();
      t.eq(response.status, 404, `${path}: status 404`);
      t.ok(body.includes('data-not-found') && body.includes(`lang="${route.lang}"`), `${path}: serves the ${route.locale} 404 page`);
      t.ok(response.headers.get('content-security-policy'), `${path}: security headers are sent with the 404`);
    }
  }

  const asset = await fetch(`${baseUrl}/_astro/missing.js`);
  const assetBody = await asset.text();
  t.eq(asset.status, 404, '/_astro/missing.js: status 404, not the homepage with 200');
  t.ok(assetBody.includes('data-not-found') && !assetBody.includes('id="projects"'), '/_astro/missing.js: body is the 404 page, not the homepage');
  t.note(`/_astro/missing.js Cache-Control on the local server: ${asset.headers.get('cache-control')} (public/_headers matches by path; check the live response after deploy)`);
}

async function checkPage(t, browser, baseUrl, route) {
  const { ui, profile } = route.content;
  const home = route.path;
  const path = `${route.path}does-not-exist`;
  const page = await browser.newPage();
  try {
    for (const { width, h2 } of WIDTHS) {
      const at = `${path} @${width}`;
      await page.viewport(width);
      await page.goto(baseUrl + path);
      const m = await page.eval(readPage);

      t.eq(m.lang, route.lang, `${at}: html lang is ${route.lang}`);
      t.eq(m.title, `${ui.notFoundTitle} — ${profile.name}`, `${at}: localized <title>`);
      t.eq(m.robots, 'noindex', `${at}: robots noindex`);
      t.eq([m.canonical, m.hreflang, m.ogUrl, m.jsonLd], [0, 0, 0, 0], `${at}: no canonical, hreflang, og:url or JSON-LD`);
      t.ok(!m.isHome, `${at}: not the homepage`);

      t.eq(m.main?.background, TOKENS.ink, `${at}: ink background`);
      t.ok(m.main && m.main.height >= m.viewportHeight - 0.5, `${at}: ink fills the viewport`, JSON.stringify(m.main));
      t.ok(
        m.kicker?.text === '404' && m.kicker.mono && m.kicker.size === 13 && m.kicker.color === TOKENS.cobaltSoft,
        `${at}: kicker "404" is mono 13px cobalt-soft`,
        JSON.stringify(m.kicker),
      );
      t.eq(m.h1Count, 1, `${at}: one <h1>`);
      t.ok(
        m.heading?.text === normalize(ui.notFoundTitle) && m.heading.size === h2 && m.heading.weight === '600' && m.heading.color === TOKENS.white,
        `${at}: heading is "${ui.notFoundTitle}" at the H2 size (${h2}px/600, white)`,
        JSON.stringify(m.heading),
      );
      t.ok(
        m.copy?.text === normalize(ui.notFoundText) && m.copy.color === TOKENS.mutedDark,
        `${at}: copy is ui.notFoundText in muted-dark`,
        JSON.stringify(m.copy),
      );
      t.ok(
        m.button?.text === normalize(ui.notFoundBack) &&
          m.button.href === home &&
          m.button.background === TOKENS.cobalt &&
          m.button.color === TOKENS.white &&
          Math.round(m.button.height) === TOKENS.buttonHeight,
        `${at}: primary button "${ui.notFoundBack}" links to ${home}`,
        JSON.stringify(m.button),
      );
      t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
    }

    await page.viewport(1440);
    await page.click('main[data-not-found] a');
    const landed = await page.waitFor((target) => location.pathname === target && document.readyState === 'complete' && !!document.getElementById('projects'), {
      args: [home],
    });
    t.ok(landed, `${path}: the button opens ${home}`);
    t.eq(page.errors, [], `${path}: no uncaught page errors`);
  } finally {
    await page.close();
  }
}

async function checkNoRedirect(t, browser, baseUrl) {
  const page = await browser.newPage({ language: 'pt-BR' });
  try {
    await page.goto(`${baseUrl}/does-not-exist`);
    t.eq(await page.eval(() => location.pathname), '/does-not-exist', 'pt-BR browser on an unknown English path stays on it (no locale redirect)');
  } finally {
    await page.close();
  }
}

export default {
  name: '404 pages',
  async run({ browser, baseUrl, routes, t }) {
    await checkServing(t, baseUrl, routes);
    for (const route of routes) await checkPage(t, browser, baseUrl, route);
    await checkNoRedirect(t, browser, baseUrl);
  },
};

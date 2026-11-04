/**
 * Cloudflare Pages deploy.
 * Host: astro.config.mjs `site` is https://SITE_HOST (lib/context.mjs).
 * Build: `npm run build` runs no check:* script; .node-version and .nvmrc both pin Node 22; the
 * packages the build needs (astro check) are dependencies, so it also builds when devDependencies
 * are skipped; the committed og.png and favicon.ico exist for builds without Chrome.
 * Headers: dist/_headers is public/_headers; every route sends nosniff, Referrer-Policy,
 * Permissions-Policy and the CSP; /_astro/* is cached immutable and HTML is not.
 * CSP: script-src is 'self' plus exactly the sha256 of each inline script in the built pages, 404
 * pages included (no
 * 'unsafe-inline', 'unsafe-eval' or wildcards), and the pages carry no inline styles or inline
 * event handlers. Under the
 * served CSP every route runs its inline and bundled scripts without errors, and the locale
 * redirect still sends pt and es browsers from / to /pt/ and /es/.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../../astro.config.mjs';
import { SITE_HOST } from './lib/context.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const distHtml = (path) => read('dist', path.endsWith('.html') ? path : join(path, 'index.html'));
/** Every built HTML page: the three routes and their 404 pages. */
const htmlPages = (routes) => routes.flatMap((r) => [r.path, `${r.path}404.html`]);
const sha256 = (text) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

/** Executable inline scripts (no src, no type such as application/ld+json). */
const inlineScripts = (html) =>
  [...html.matchAll(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

function parseCsp(value = '') {
  return Object.fromEntries(
    value
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name.toLowerCase(), sources]),
  );
}

function checkBuildSetup(t) {
  const pkg = JSON.parse(read('package.json'));
  t.eq(config.site, `https://${SITE_HOST}`, `astro.config.mjs site is https://${SITE_HOST}`);
  t.ok(!/check:|run\.mjs|a11y|perf/.test(pkg.scripts.build), 'npm run build runs no check:* script', pkg.scripts.build);
  t.eq(read('.node-version').trim(), '22', '.node-version pins Node 22');
  t.eq(read('.nvmrc').trim(), read('.node-version').trim(), '.nvmrc matches .node-version');
  const devOnly = ['astro', '@astrojs/check', 'typescript', '@types/node'].filter((name) => !pkg.dependencies[name]);
  t.eq(devOnly, [], 'packages used by npm run build are dependencies (build works without devDependencies)');
  t.ok(existsSync(join(root, 'public', 'og.png')) && existsSync(join(root, 'public', 'favicon.ico')), 'committed og.png and favicon.ico exist for builds without Chrome');
  t.ok(existsSync(join(root, 'dist', '_headers')) && read('dist', '_headers') === read('public', '_headers'), 'dist/_headers is public/_headers');
}

async function checkHeaders(t, baseUrl, routes) {
  const css = readdirSync(join(root, 'dist', '_astro')).find((file) => file.endsWith('.css'));
  const js = readdirSync(join(root, 'dist', '_astro')).find((file) => file.endsWith('.js'));
  for (const path of [...routes.map((r) => r.path), '/robots.txt', `/_astro/${css}`]) {
    const { headers } = await fetch(baseUrl + path);
    t.eq(headers.get('x-content-type-options'), 'nosniff', `${path}: X-Content-Type-Options nosniff`);
    t.eq(headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${path}: Referrer-Policy strict-origin-when-cross-origin`);
    t.eq(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', `${path}: minimal Permissions-Policy`);
    t.ok(headers.get('content-security-policy'), `${path}: Content-Security-Policy is sent`);
  }
  for (const file of [css, js]) {
    const cache = (await fetch(`${baseUrl}/_astro/${file}`)).headers.get('cache-control');
    t.eq(cache, 'public, max-age=31536000, immutable', `/_astro/${file.split('.').at(-1)} assets are cached immutable`);
  }
  for (const path of ['/', '/robots.txt', '/og.png']) {
    const cache = (await fetch(baseUrl + path)).headers.get('cache-control') ?? '';
    t.ok(!cache.includes('immutable'), `${path} is not cached immutable`, cache);
  }
}

async function checkPolicy(t, baseUrl, routes) {
  const csp = parseCsp((await fetch(baseUrl + '/')).headers.get('content-security-policy'));
  const scriptSrc = csp['script-src'] ?? [];
  t.eq(csp['default-src'], ["'self'"], "default-src is 'self'");
  t.ok(scriptSrc.includes("'self'"), "script-src allows 'self'", scriptSrc.join(' '));
  const loose = scriptSrc.filter((s) => /unsafe|\*|^https?:$|^data:$/.test(s));
  t.eq(loose, [], "script-src has no 'unsafe-*', wildcard or scheme sources");
  t.eq(csp['object-src'], ["'none'"], "object-src is 'none'");

  const pages = htmlPages(routes);
  const inline = pages.flatMap((path) => inlineScripts(distHtml(path)).map((code) => ({ route: path, hash: sha256(code), size: code.length })));
  const needed = [...new Set(inline.map((s) => s.hash))].sort();
  const allowed = scriptSrc.filter((s) => s.startsWith("'sha256-")).sort();
  t.eq(allowed, needed, 'script-src hashes are exactly the inline scripts of the built pages (update public/_headers)');
  t.note(`inline scripts: ${inline.map((s) => `${s.route} ${s.size}B ${s.hash}`).join(', ')}`);

  const styled = pages.filter((path) => /<style[\s>]|\sstyle="/.test(distHtml(path)));
  t.eq(styled, [], "pages have no <style> elements or style attributes (style-src is 'self')");
  const handlers = pages.flatMap((path) => [...distHtml(path).matchAll(/<[a-z][^>]*\s(on[a-z]+)=/g)].map((m) => `${path} ${m[1]}`));
  t.eq(handlers, [], 'pages have no inline event handler attributes (hashes cannot allow them)');
}

async function checkPagesUnderCsp(t, browser, baseUrl, routes) {
  for (const route of routes) {
    const page = await browser.newPage({ width: 1440, language: 'en-US' });
    try {
      await page.goto(baseUrl + route.path);
      const state = await page.eval(() => ({
        heroReady: document.body.classList.contains('hero-ready'),
        bundled: performance.getEntriesByType('resource').filter((e) => /\/_astro\/.*\.js$/.test(e.name) && e.responseStatus === 200).length,
        modules: document.querySelectorAll('script[type="module"][src^="/_astro/"]').length,
      }));
      t.ok(state.heroReady, `${route.path}: inline hero script runs under the CSP`);
      t.ok(state.modules > 0 && state.bundled === state.modules, `${route.path}: bundled scripts load from /_astro/`, JSON.stringify(state));
      t.eq(page.errors, [], `${route.path}: no uncaught script errors under the CSP`);
    } finally {
      await page.close();
    }
  }

  for (const [language, target] of [['pt-BR', '/pt/'], ['es-ES', '/es/']]) {
    const page = await browser.newPage({ width: 1440, language });
    try {
      await page.send('Page.navigate', { url: `${baseUrl}/` });
      const landed = await page.waitFor((path) => location.pathname === path && document.readyState === 'complete', { args: [target] });
      t.ok(landed, `${language} browser on / is redirected to ${target} under the CSP`);
    } finally {
      await page.close();
    }
  }
}

export default {
  name: 'Cloudflare Pages deploy',
  async run({ browser, baseUrl, routes, t }) {
    checkBuildSetup(t);
    await checkHeaders(t, baseUrl, routes);
    await checkPolicy(t, baseUrl, routes);
    await checkPagesUnderCsp(t, browser, baseUrl, routes);
  },
};

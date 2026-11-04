/**
 * Lighthouse audit: serves dist/ and runs Lighthouse with the desktop and mobile presets on /,
 * /pt/ and /es/. Exit code 1 if any Performance, Accessibility, Best Practices or SEO score is
 * below 95. Reports are written to reports/lighthouse/<route>-<preset>.json (gitignored).
 *
 *   npm run check:perf          # build, then audit
 *   node scripts/perf.mjs       # audit the existing dist/
 *   AUDIT_URL=https://herick-gonzaga.pages.dev node scripts/perf.mjs   # audit a deployed site
 *
 * Uses the system Chrome (or $CHROME_PATH), like the UI checks, pinned to en-US: with a pt or es
 * system locale the redirect script would otherwise send the / audit to /pt/ or /es/.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { ROUTES } from './checks/lib/context.mjs';
import { serveDist } from './checks/lib/server.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outDir = join(root, 'reports', 'lighthouse');
const TARGET = 95;
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const PRESETS = [
  { name: 'desktop', config: desktopConfig },
  { name: 'mobile', config: undefined }, // Lighthouse default: Moto G Power, slow 4G, 4× CPU.
];
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

if (!process.env.AUDIT_URL && !existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first (or use `npm run check:perf`).');
  process.exit(1);
}
const chromePath = CHROME_CANDIDATES.find((path) => path && existsSync(path));
if (!chromePath) {
  console.error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
// AUDIT_URL audits a deployed site instead of serving dist/.
const live = process.env.AUDIT_URL?.replace(/\/+$/, '');
const server = live ? { url: live, close: async () => {} } : await serveDist(dist);
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--disable-gpu', '--lang=en-US', '--accept-lang=en-US'] });
const rows = [];

try {
  for (const route of ROUTES) {
    for (const preset of PRESETS) {
      const result = await lighthouse(
        `${server.url}${route.path}`,
        { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES },
        preset.config,
      );
      const { lhr } = result;
      const slug = route.path === '/' ? 'en' : route.path.replaceAll('/', '');
      writeFileSync(join(outDir, `${slug}-${preset.name}.json`), result.report);
      const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
      const failing = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
        .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ''}`);
      const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map(
        (id) => `${id.split('-').map((w) => w[0].toUpperCase()).join('')} ${lhr.audits[id]?.displayValue ?? '—'}`,
      );
      rows.push({ route: route.path, preset: preset.name, scores, metrics, failing });
    }
  }
} finally {
  chrome.kill();
  await server.close();
}

let below = 0;
console.log(`Lighthouse, target ≥${TARGET} in ${CATEGORIES.join(', ')}\n`);
console.log('route  preset   perf  a11y  bp   seo');
for (const row of rows) {
  const s = row.scores;
  const low = CATEGORIES.filter((c) => s[c] < TARGET);
  below += low.length;
  console.log(
    `${row.route.padEnd(6)} ${row.preset.padEnd(8)} ${[s.performance, s.accessibility, s['best-practices'], s.seo].map((v) => String(v).padEnd(5)).join(' ')}${low.length ? ' ✗' : ''}`,
  );
  console.log(`       ${row.metrics.join(' · ')}`);
  if (row.failing.length) console.log(`       audits below 0.9: ${row.failing.join(', ')}`);
}
console.log(`\n${below ? 'FAILED' : 'PASSED'}: ${below} score(s) below ${TARGET}; reports in reports/lighthouse/`);
process.exit(below ? 1 : 0);

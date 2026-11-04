/**
 * Accessibility audit: serves dist/ and runs axe-core on /, /pt/ and /es/ at 1440px and 390px
 * in headless Chrome. Exit code 1 if axe reports any violation.
 *
 *   npm run check:a11y          # build, then audit
 *   node scripts/a11y.mjs       # audit the existing dist/
 *   AUDIT_URL=https://herick-gonzaga.pages.dev node scripts/a11y.mjs   # audit a deployed site
 *
 * The axe engine is the one bundled with @axe-core/cli, so `npx axe <url>` and this script
 * always agree on rules. The CLI itself is not used here because its headless Chrome ignores
 * --window-size, so it cannot audit an exact 390px viewport; the repo's DevTools driver can.
 *
 * Besides the page as loaded, each mobile run also audits the open mobile menu sheet, and each
 * run audits the open language switcher, so content that is hidden on load is covered too.
 * Each locale's 404 page (an unknown path under the route) is audited as loaded at both widths.
 * JSON results are written to reports/axe/ (gitignored).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, sleep } from './checks/lib/browser.mjs';
import { ROUTES } from './checks/lib/context.mjs';
import { serveDist } from './checks/lib/server.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outDir = join(root, 'reports', 'axe');
const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
/** Lets the hero load sequence finish so axe sees final colors and opacity. */
const SETTLE_MS = 1500;

const cliRequire = createRequire(createRequire(import.meta.url).resolve('@axe-core/cli/package.json'));
const axeSource = readFileSync(cliRequire.resolve('axe-core/axe.min.js'), 'utf8');
const axeVersion = JSON.parse(readFileSync(cliRequire.resolve('axe-core/package.json'), 'utf8')).version;

if (!process.env.AUDIT_URL && !existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first (or use `npm run check:a11y`).');
  process.exit(1);
}

async function audit(page) {
  await page.send('Runtime.evaluate', { expression: axeSource });
  return page.eval(async () => {
    const result = await window.axe.run(document);
    return {
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(' '), summary: n.failureSummary })),
      })),
      passes: result.passes.length,
      incomplete: result.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
    };
  });
}

/** Clicks the first visible element matching `selector`; false when none is rendered. */
async function open(page, selector) {
  const point = await page.eval((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  if (!point) return false;
  await page.click(point);
  await sleep(400);
  return true;
}

/** Page states to audit at a width: each is a sequence of triggers clicked in order. */
const statesFor = (width) =>
  width < 900
    ? [
        ['loaded', []],
        ['mobile menu open', ['[data-menu-open]']],
        ['mobile menu + language switcher open', ['[data-menu-open]', '[data-lang-trigger]']],
      ]
    : [
        ['loaded', []],
        ['language switcher open', ['[data-lang-trigger]']],
      ];

// AUDIT_URL audits a deployed site instead of serving dist/.
const live = process.env.AUDIT_URL?.replace(/\/+$/, '');
const server = live ? { url: live, close: async () => {} } : await serveDist(dist);
const browser = await launchBrowser();
mkdirSync(outDir, { recursive: true });
const rows = [];

try {
  for (const route of ROUTES) {
    const notFound = `${route.path}does-not-exist`;
    for (const { width, height } of WIDTHS) {
      const page = await browser.newPage({ width, height, language: 'en-US' });
      try {
        await page.goto(`${server.url}${notFound}`);
        await sleep(SETTLE_MS);
        rows.push({ route: notFound, width, state: '404 page', ...(await audit(page)) });
      } finally {
        await page.close();
      }
    }
    for (const { width, height } of WIDTHS) {
      for (const [state, triggers] of statesFor(width)) {
        const page = await browser.newPage({ width, height, language: 'en-US' });
        try {
          await page.goto(`${server.url}${route.path}`);
          await sleep(SETTLE_MS);
          let opened = true;
          for (const trigger of triggers) opened = opened && (await open(page, trigger));
          if (!opened) {
            rows.push({ route: route.path, width, state, skipped: true, violations: [] });
            continue;
          }
          const result = await audit(page);
          rows.push({ route: route.path, width, state, ...result });
        } finally {
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

writeFileSync(join(outDir, 'results.json'), JSON.stringify({ axeVersion, rows }, null, 2));

let total = 0;
console.log(`axe-core ${axeVersion}\n`);
for (const row of rows) {
  const label = `${row.route.padEnd(20)} @${String(row.width).padEnd(4)} ${row.state}`;
  if (row.skipped) {
    console.log(`SKIP  ${label} (trigger not found)`);
    continue;
  }
  total += row.violations.length;
  console.log(`${row.violations.length ? 'FAIL' : 'PASS'}  ${label}  ${row.violations.length} violation(s), ${row.passes} rules passed`);
  for (const v of row.violations) {
    console.log(`      ✗ [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes) console.log(`        ${n.target}`);
  }
}
const skipped = rows.filter((r) => r.skipped).length;
console.log(`\n${total ? 'FAILED' : 'PASSED'}: ${total} violation(s) across ${rows.length - skipped} audited state(s); results in reports/axe/results.json`);
process.exit(total || skipped ? 1 : 0);

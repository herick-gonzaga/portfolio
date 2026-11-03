/**
 * Browser UI checks. Serves dist/ and runs every scripts/checks/*.check.mjs against
 * /, /pt/ and /es/ in headless Chrome. Exit code 1 if any assertion fails.
 *
 *   npm run check:ui                       # build, then run all checks
 *   node scripts/checks/run.mjs [filter]   # run against the existing dist/, optionally only
 *                                          # check files whose name contains `filter`
 *
 * A check file default-exports { name, run({ browser, baseUrl, routes, t }) }. `t` records
 * assertions: t.ok(condition, label, detail?), t.eq(actual, expected, label),
 * t.near(actual, expected, tolerance, label) and t.note(text) for informational lines.
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from './lib/browser.mjs';
import { ROUTES } from './lib/context.mjs';
import { serveDist } from './lib/server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', '..', 'dist');
const filter = process.argv[2];

function createRecorder() {
  const results = [];
  const notes = [];
  const record = (pass, label, detail) => {
    results.push({ pass: Boolean(pass), label, detail: pass ? undefined : detail });
    return Boolean(pass);
  };
  return {
    results,
    notes,
    ok: (condition, label, detail = '') => record(condition, label, detail),
    eq: (actual, expected, label) =>
      record(
        JSON.stringify(actual) === JSON.stringify(expected),
        label,
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      ),
    near: (actual, expected, tolerance, label) =>
      record(
        typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
        label,
        `expected ${expected} ±${tolerance}, got ${actual}`,
      ),
    note: (text) => notes.push(text),
  };
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first (or use `npm run check:ui`).');
  process.exit(1);
}

const files = readdirSync(here)
  .filter((file) => file.endsWith('.check.mjs') && (!filter || file.includes(filter)))
  .sort();
if (files.length === 0) {
  console.error(`No check files match "${filter}".`);
  process.exit(1);
}

const server = await serveDist(dist);
const browser = await launchBrowser();
let failed = 0;
let total = 0;

try {
  for (const file of files) {
    const { default: check } = await import(pathToFileURL(join(here, file)).href);
    const t = createRecorder();
    const started = Date.now();
    try {
      await check.run({ browser, baseUrl: server.url, routes: ROUTES, t });
    } catch (error) {
      t.ok(false, 'check crashed', error?.stack ?? String(error));
    }
    const failures = t.results.filter((r) => !r.pass);
    failed += failures.length;
    total += t.results.length;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const status = failures.length ? 'FAIL' : 'PASS';
    console.log(`\n${status}  ${check.name}  ${t.results.length - failures.length}/${t.results.length}  (${file}, ${seconds}s)`);
    for (const note of t.notes) console.log(`      · ${note}`);
    for (const failure of failures) console.log(`      ✗ ${failure.label}${failure.detail ? `\n        ${failure.detail}` : ''}`);
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`\n${failed ? 'FAILED' : 'PASSED'}: ${total - failed}/${total} assertions across ${files.length} check file(s).`);
process.exit(failed ? 1 : 0);

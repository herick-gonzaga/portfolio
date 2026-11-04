/**
 * Build-time image assets, rendered in headless Chrome (the same driver as the UI checks, so no
 * npm dependency and nothing shipped at runtime). Run by `npm run build` and `npm run assets`.
 *
 * - public/og.png (1200×630) from scripts/assets/og.svg, with Instrument Sans and JetBrains Mono
 *   embedded from @fontsource-variable and the texts filled from src/i18n/en.ts and the site URL.
 * - public/favicon.ico (16, 32 and 48px PNG entries) from public/favicon.svg.
 *
 * Files are only rewritten when their bytes change. On Cloudflare Pages (CF_PAGES=1) Chrome is never
 * looked for, and anywhere else without Chrome the committed files are kept with a warning: either
 * way the build continues with the og.png and favicon.ico in git.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from '../astro.config.mjs';
import { en } from '../src/i18n/en.ts';
import { launchBrowser } from './checks/lib/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...parts) => join(root, ...parts);
const OG = { width: 1200, height: 630 };
const ICO_SIZES = [16, 32, 48];

const escapeXml = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const fontFace = (family, file) => {
  const data = readFileSync(fromRoot('node_modules', '@fontsource-variable', file)).toString('base64');
  return `@font-face{font-family:"${family}";font-weight:100 900;src:url(data:font/woff2;base64,${data}) format("woff2");}`;
};

function ogSvg() {
  const url = new URL(config.site).host;
  const fill = { name: en.profile.name, title: en.profile.title, url };
  return readFileSync(fromRoot('scripts', 'assets', 'og.svg'), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => escapeXml(fill[key]));
}

/** An .ico holding PNG images (supported by every current browser and Windows Vista+). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

function writeIfChanged(path, bytes) {
  const label = path.slice(root.length + 1);
  if (existsSync(path) && readFileSync(path).equals(bytes)) {
    console.log(`assets: ${label} unchanged`);
    return;
  }
  writeFileSync(path, bytes);
  console.log(`assets: wrote ${label} (${bytes.length} bytes)`);
}

async function render(browser, dir, name, html, { width, height, transparent = false }) {
  const file = join(dir, `${name}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg,img{display:block}</style>${html}`);
  const page = await browser.newPage({ width, height });
  if (transparent) await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await page.goto(pathToFileURL(file).href);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
  await page.close();
  return Buffer.from(data, 'base64');
}

const KEEP = 'Keeping the committed public/og.png and public/favicon.ico.';
if (process.env.CF_PAGES) {
  console.log(`assets: Cloudflare Pages build, Chrome skipped. ${KEEP}`);
  process.exit(0);
}

let browser;
try {
  browser = await launchBrowser();
} catch (error) {
  console.warn(`assets: ${error.message} ${KEEP}`);
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'portfolio-assets-'));
try {
  const fonts = fontFace('Instrument Sans Variable', 'instrument-sans/files/instrument-sans-latin-wght-normal.woff2') +
    fontFace('JetBrains Mono Variable', 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2');
  const og = await render(browser, dir, 'og', `<style>${fonts}</style>${ogSvg()}`, OG);
  writeIfChanged(fromRoot('public', 'og.png'), og);

  const faviconUrl = pathToFileURL(fromRoot('public', 'favicon.svg')).href;
  const images = [];
  for (const size of ICO_SIZES) {
    const png = await render(browser, dir, `favicon-${size}`, `<img src="${faviconUrl}" width="${size}" height="${size}" alt="">`, {
      width: size,
      height: size,
      transparent: true,
    });
    images.push({ size, png });
  }
  writeIfChanged(fromRoot('public', 'favicon.ico'), buildIco(images));
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}

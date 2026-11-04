/**
 * Cross-section QA audit (docs/QA_REPORT.md).
 * Responsive sweep (1440, 1392, 1200, 900, 600, 390, 360): no horizontal scroll, no clipped text,
 * H1 at most 3 lines at 1440 and 5 at 390, touch targets ≥44px below 900px (sheet included;
 * controls inline inside a sentence are exempt, per the WCAG 2.5.8 inline exception).
 * Contrast: every visible text node, SVG text included, ≥4.5:1 (3:1 for large text) against its
 * effective background, at 1440 and 390 with the mobile sheet and switcher open.
 * Names: every visible link/button has an accessible name; icon-only ones use aria-label; every
 * SVG is aria-hidden except the SystemDiagram (role="img" + aria-label).
 * Keyboard: the full Tab path (navbar → switcher → menu → sections → footer) in document order,
 * every stop with a 2px solid cobalt ring at 2px offset from the first frame, switcher options
 * and the mobile sheet included, and Tab leaving the page after the footer (no trap).
 * Reduced motion: no transition or animation anywhere; hero, diagram, timeline, navbar and
 * switcher render their final states immediately.
 * Performance: the two latin font preloads match the CSS files, font-display swap, one stylesheet,
 * sized SVGs and images, inline head scripts under 1 KB.
 */
import { TOKENS } from './lib/context.mjs';

const SWEEP = [1440, 1392, 1200, 900, 600, 390, 360];
const RING = `solid 2px ${TOKENS.cobalt} 2px`;

/* ---------- Responsive sweep ---------- */

function measureLayout(width) {
  const visible = (el) => el.getClientRects().length > 0 && !el.closest('[hidden]');
  const de = document.documentElement;
  const h1 = document.querySelector('h1');
  const lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
  const describe = (el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
  const clipped = [...document.querySelectorAll('body *')]
    .filter((el) => visible(el) && !el.closest('svg') && el.textContent.trim())
    .filter((el) => /hidden|clip|auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
    .map(describe);
  const small =
    width < 900
      ? [...document.querySelectorAll('a[href], button')]
          .filter(visible)
          // WCAG 2.5.8 inline exception: a control that is part of a sentence (the name in the
          // hero intro) is sized by the line of text it sits in.
          .filter((el) => {
            const sentence = el.closest('p');
            return !sentence || sentence.textContent.trim() === el.textContent.trim();
          })
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 44 - 0.5 || r.height < 44 - 0.5;
          })
          .map((el) => `${describe(el)} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`)
      : [];
  return { hscroll: de.scrollWidth - de.clientWidth, lines, clipped, small };
}

async function openSheet(page) {
  await page.click('[data-menu-open]');
  await page.waitFor(() => !document.querySelector('[data-mobile-menu]').hidden);
}

async function sweep(t, page, url, at) {
  for (const width of SWEEP) {
    await page.viewport(width);
    await page.goto(url);
    const m = await page.eval(measureLayout, width);
    const w = `${at} @${width}`;
    t.eq(m.hscroll, 0, `${w}: no horizontal scroll`);
    t.eq(m.clipped, [], `${w}: no clipped text`);
    if (width === 1440) t.ok(m.lines <= 3, `${w}: H1 wraps to at most 3 lines`, `${m.lines} lines`);
    if (width === 390) t.ok(m.lines <= 5, `${w}: H1 wraps to at most 5 lines`, `${m.lines} lines`);
    if (width < 900) {
      t.eq(m.small, [], `${w}: touch targets ≥44px`);
      await openSheet(page);
      const sheet = await page.eval(measureLayout, width);
      t.eq(sheet.small, [], `${w}: touch targets ≥44px in the mobile sheet`);
      await page.click('[data-mobile-menu] [data-lang-trigger]');
      const menu = await page.eval(measureLayout, width);
      t.eq(menu.small, [], `${w}: touch targets ≥44px in the open switcher`);
    }
  }
}

/* ---------- Contrast ---------- */

function measureContrast() {
  const parse = (s) => {
    const m = (s.match(/[\d.]+/g) ?? ['0', '0', '0', '0']).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const INK = parse('rgb(15, 20, 32)');
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      // The navbar is transparent over the ink hero and ink at 86% once scrolled.
      if (e.matches('[data-navbar]')) return INK;
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.a >= 0.99) return c;
    }
    return parse(getComputedStyle(document.documentElement).backgroundColor);
  };
  const failures = [];
  let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length || el.closest('[hidden]')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]:not(svg)')) continue;
    const svgText = el instanceof SVGElement;
    let fg = parse(svgText ? cs.fill : cs.color);
    const bg = bgOf(el);
    if (fg.a < 1) fg = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    checked++;
    if (ratio < (large ? 3 : 4.5) - 0.005) {
      failures.push(`${ratio.toFixed(2)}:1 ${size}px "${el.textContent.trim().slice(0, 30)}"`);
    }
  }
  return { checked, failures };
}

async function contrast(t, page, url, at) {
  for (const width of [1440, 390]) {
    await page.viewport(width);
    await page.goto(url);
    const w = `${at} @${width}`;
    const loaded = await page.eval(measureContrast);
    t.ok(loaded.checked > 50, `${w}: contrast measured on the page text`, `${loaded.checked} elements`);
    t.eq(loaded.failures, [], `${w}: all text ≥4.5:1 (large ≥3:1), SVG text included`);
    if (width < 900) await openSheet(page);
    await page.click(width < 900 ? '[data-mobile-menu] [data-lang-trigger]' : '[data-navbar] [data-lang-trigger]');
    const open = await page.eval(measureContrast);
    t.eq(open.failures, [], `${w}: open ${width < 900 ? 'sheet and ' : ''}switcher text ≥4.5:1`);
  }
}

/* ---------- Names and SVGs ---------- */

function readNames() {
  const visible = (el) => el.getClientRects().length > 0 && !el.closest('[hidden]');
  const controls = [...document.querySelectorAll('a[href], button')].filter(visible);
  const unnamed = controls
    .filter((el) => !(el.getAttribute('aria-label') || el.textContent).trim())
    .map((el) => el.outerHTML.slice(0, 60));
  const iconOnlyWithoutLabel = controls
    .filter((el) => !el.textContent.trim() && el.querySelector('svg') && !el.getAttribute('aria-label'))
    .map((el) => el.outerHTML.slice(0, 60));
  const svgs = [...document.querySelectorAll('svg')];
  const exposed = svgs.filter((s) => s.getAttribute('aria-hidden') !== 'true');
  const diagram = document.querySelector('#top svg[role="img"]');
  return {
    controls: controls.length,
    unnamed,
    iconOnlyWithoutLabel,
    svgs: svgs.length,
    exposed: exposed.map((s) => ({ role: s.getAttribute('role'), label: Boolean(s.getAttribute('aria-label')) })),
    diagram: diagram ? { role: diagram.getAttribute('role'), label: Boolean(diagram.getAttribute('aria-label')?.trim()) } : null,
  };
}

async function names(t, page, url, at) {
  for (const width of [1440, 390]) {
    await page.viewport(width);
    await page.goto(url);
    if (width < 900) await openSheet(page);
    const n = await page.eval(readNames);
    const w = `${at} @${width}`;
    t.ok(n.controls > 5, `${w}: interactive controls found`, `${n.controls}`);
    t.eq(n.unnamed, [], `${w}: every link and button has an accessible name`);
    t.eq(n.iconOnlyWithoutLabel, [], `${w}: icon-only controls have an aria-label`);
    t.eq(n.exposed, [{ role: 'img', label: true }], `${w}: decorative SVGs are aria-hidden; only the diagram is exposed`);
    t.eq(n.diagram, { role: 'img', label: true }, `${w}: SystemDiagram has role="img" and a label`);
  }
}

/* ---------- Keyboard path and focus ring ---------- */

function focusState() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cs = getComputedStyle(el);
  const region = el.closest('[data-navbar], [data-mobile-menu], section[id], footer');
  return {
    id: [...document.querySelectorAll('*')].indexOf(el),
    label: (el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' ').slice(0, 30),
    region: region?.id || region?.tagName.toLowerCase() || el.tagName.toLowerCase(),
    ring: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.outlineOffset}`,
    focusVisible: el.matches(':focus-visible'),
    option: el.hasAttribute('data-lang-option'),
  };
}

/** Every visible focusable element outside the (closed) mobile sheet, in document order. */
function pageFocusables() {
  return [...document.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.getClientRects().length > 0 && !el.closest('[hidden]'))
    .map((el) => [...document.querySelectorAll('*')].indexOf(el));
}

/** Tabs until focus leaves the page; returns every stop. */
async function tabThrough(page, limit = 80) {
  const stops = [];
  for (let i = 0; i < limit; i++) {
    await page.press('Tab');
    const s = await page.eval(focusState);
    if (!s) return { stops, left: true };
    stops.push(s);
  }
  return { stops, left: false };
}

function checkRings(t, stops, w, what) {
  const bad = stops.filter((s) => s.ring !== RING || !s.focusVisible).map((s) => `${s.label}: ${s.ring}`);
  t.eq(bad, [], `${w}: ${what} show a 2px cobalt ring at 2px offset immediately`);
}

async function switcherOptions(t, page, scope, w) {
  await page.eval((sel) => document.querySelector(sel).focus(), `${scope} [data-lang-trigger]`);
  await page.press('Enter');
  const stops = [];
  for (let i = 0; i < 3; i++) {
    stops.push(await page.eval(focusState));
    await page.press('ArrowDown');
  }
  const options = stops.filter((s) => s?.option);
  t.eq(new Set(options.map((s) => s.id)).size, 3, `${w}: Enter opens the switcher and arrow keys move through its 3 options`);
  checkRings(t, stops.filter(Boolean), w, 'switcher options');
  await page.press('Escape');
  const back = await page.eval(() => document.activeElement?.hasAttribute('data-lang-trigger'));
  t.ok(back, `${w}: Esc closes the switcher and returns focus to its trigger`);
}

async function keyboard(t, page, url, at) {
  // Desktop: navbar → switcher → CTA → hero → sections → footer, then out of the page.
  await page.viewport(1440);
  await page.goto(url);
  let w = `${at} @1440`;
  const expected = await page.eval(pageFocusables);
  const desktop = await tabThrough(page);
  t.eq(desktop.stops.map((s) => s.id), expected, `${w}: Tab visits every control once, in document order`);
  t.ok(desktop.left, `${w}: Tab leaves the page after the footer (no trap)`);
  t.eq(desktop.stops.at(-1)?.region, 'footer', `${w}: the footer is the last stop`);
  checkRings(t, desktop.stops, w, 'all Tab stops');
  await switcherOptions(t, page, '[data-navbar]', w);

  // Mobile: brand → menu button; the sheet holds focus until Esc; then on to the footer.
  await page.viewport(390);
  await page.goto(url);
  w = `${at} @390`;
  await page.press('Tab');
  await page.press('Tab');
  const menuButton = await page.eval(focusState);
  t.ok(menuButton && (await page.eval(() => document.activeElement.hasAttribute('data-menu-open'))), `${w}: second Tab stop is the menu button`);
  checkRings(t, [menuButton].filter(Boolean), w, 'the menu button');
  await page.press('Enter');
  await page.waitFor(() => !document.querySelector('[data-mobile-menu]').hidden);
  const sheetCount = await page.eval(
    () => [...document.querySelectorAll('[data-mobile-menu] a[href], [data-mobile-menu] button')].filter((el) => el.getClientRects().length).length,
  );
  const sheet = (await tabThrough(page, sheetCount + 1)).stops;
  t.ok(sheet.every((s) => s.region === 'mobile-menu'), `${w}: focus stays in the open sheet`, sheet.map((s) => s.region).join(','));
  t.eq(new Set(sheet.map((s) => s.id)).size, sheetCount, `${w}: Tab reaches all ${sheetCount} sheet controls and wraps`);
  checkRings(t, sheet, w, 'sheet controls');
  await switcherOptions(t, page, '[data-mobile-menu]', w);
  await page.press('Escape');
  const closed = await page.eval(() => document.querySelector('[data-mobile-menu]').hidden && document.activeElement.hasAttribute('data-menu-open'));
  t.ok(closed, `${w}: Esc closes the sheet and returns focus to the menu button`);
  const rest = await tabThrough(page);
  t.ok(rest.left && rest.stops.at(-1)?.region === 'footer', `${w}: Tab continues to the footer and leaves the page`);
  checkRings(t, rest.stops, w, 'remaining Tab stops');
}

/* ---------- Reduced motion ---------- */

function readMotion() {
  const seconds = (list) => Math.max(...list.split(',').map((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 0.001 : 1)));
  const moving = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const transition = seconds(cs.transitionDuration) + seconds(cs.transitionDelay);
    const animated = cs.animationName !== 'none' && seconds(cs.animationDuration) + seconds(cs.animationDelay) > 0.001;
    if (transition > 0.001 || animated) moving.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}`);
  }
  const final = [...document.querySelectorAll('.hero-status, .hero-title, .hero-ctas, .sd-edge, .sd-dash, .sd-hub, .sd-node, .journey-item')].map((el) => {
    const cs = getComputedStyle(el);
    return { opacity: cs.opacity, transform: cs.transform, dashoffset: cs.strokeDashoffset };
  });
  return {
    moving: moving.slice(0, 10),
    finalCount: final.length,
    hidden: final.filter((f) => f.opacity !== '1' || f.transform !== 'none' || !['0px', '0'].includes(f.dashoffset)).length,
  };
}

async function reducedMotion(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440 });
  await page.reducedMotion(true);
  await page.goto(url);
  const w = `${at} @1440 reduced motion`;
  const m = await page.eval(readMotion);
  t.eq(m.moving, [], `${w}: no element has a transition or animation`);
  t.ok(m.finalCount > 20, `${w}: hero, diagram and timeline elements found`, `${m.finalCount}`);
  t.eq(m.hidden, 0, `${w}: hero sequence, diagram and timeline show their final state on load`);

  const navbar = await page.eval(async () => {
    window.scrollTo(0, 200);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return getComputedStyle(document.querySelector('[data-navbar]')).backgroundColor;
  });
  t.eq(navbar, TOKENS.navScrolled, `${w}: navbar background switches with no fade`);

  await page.click('[data-navbar] [data-lang-trigger]');
  const switcher = await page.eval(readMotion);
  t.eq(switcher.moving, [], `${w}: open switcher has no transition`);

  await page.hover('.card');
  const hover = await page.eval(() => {
    const cs = getComputedStyle(document.querySelector('.card'));
    return { transform: cs.transform, shadow: cs.boxShadow };
  });
  t.eq(hover, { transform: 'none', shadow: 'none' }, `${w}: card hover has no lift or shadow`);
  t.eq(page.errors, [], `${w}: no uncaught page errors`);
  await page.close();
}

/* ---------- Performance hygiene ---------- */

/** Font preloads match the CSS @font-face files; SVGs/images have explicit size; small redirect. */
async function performanceHead(t, page, url, at) {
  await page.goto(url);
  const head = await page.eval(async () => {
    const preloads = [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => ({
      href: new URL(l.href).pathname,
      type: l.type,
      crossorigin: l.hasAttribute('crossorigin'),
    }));
    const css = (await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => fetch(l.href).then((r) => r.text())))).join('');
    const fontFiles = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => new URL(m[1], location.href).pathname);
    const display = [...css.matchAll(/@font-face\{[^}]*\}/g)].map((m) => /font-display:swap/.test(m[0]));
    const unsized = [...document.querySelectorAll('svg, img')]
      .filter((el) => !el.closest('svg svg') && !(el.getAttribute('width') && el.getAttribute('height')))
      .map((el) => el.outerHTML.slice(0, 60));
    const inline = [...document.querySelectorAll('head script:not([src]):not([type])')].map((s) => s.textContent.length);
    return { preloads, fontFiles, display, unsized, inline, stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length };
  });
  t.eq(head.preloads.length, 2, `${at}: two font preloads`);
  t.ok(
    head.preloads.every((p) => p.type === 'font/woff2' && p.crossorigin && head.fontFiles.includes(p.href)),
    `${at}: font preloads are crossorigin woff2 files the CSS uses (no double download)`,
    JSON.stringify(head.preloads),
  );
  t.ok(head.display.length > 0 && head.display.every(Boolean), `${at}: every @font-face uses font-display: swap`);
  t.eq(head.stylesheets, 1, `${at}: a single render-blocking stylesheet`);
  t.eq(head.unsized, [], `${at}: every SVG and image has explicit width and height`);
  t.ok(head.inline.every((n) => n < 1024), `${at}: inline head scripts stay under 1 KB`, JSON.stringify(head.inline));
}

export default {
  name: 'QA audit: responsive, contrast, names, keyboard, motion, performance',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const page = await browser.newPage();
      await sweep(t, page, url, at);
      await contrast(t, page, url, at);
      await names(t, page, url, at);
      await keyboard(t, page, url, at);
      await performanceHead(t, page, url, at);
      t.eq(page.errors, [], `${at}: no uncaught page errors`);
      await page.close();
      await reducedMotion(t, browser, url, at);
    }
  },
};

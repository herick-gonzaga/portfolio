/**
 * Achievements & impact "evidence board" (src/components/Achievements.astro,
 * src/scripts/impact-ledger.ts, the count-up in src/scripts/interactions.ts), in every locale.
 *
 * - Copy: header, the three metrics (value, label, note) and the four achievements (icon, title,
 *   description) match the locale files, with real values in the locale's number format; each row
 *   shows "EXH-0N" (localized prefix) and its localized category tag.
 * - Layout (1440 → 390): bottom padding only, on the mist background, AA contrast for every text.
 *   Metrics: no boxes (no background, radius or shadow); oversized JetBrains Mono cobalt values, one
 *   line that fits its column; three columns split by 1px hairlines from 900px, stacked below.
 *   Ledger: one full-width row per achievement split by hairlines, no boxes; the head is a <button>
 *   inside the H3; the rail runs down the ledger's left. Nothing overflows, no horizontal scroll.
 * - Disclosure: aria-expanded/aria-controls/role="region"; first row open by default, one at a
 *   time, the open row closes on a second click; Enter and Space toggle from the keyboard; visible
 *   focus ring; "+" turns 45deg ("×") when open; height animates; collapsed bodies are hidden.
 * - Motion: below the fold the values wait at 0, then count up with decode glyphs, staggered, and
 *   end on the exact locale text (sr-only copy always final); hovering a row scrambles its code and
 *   settles back; the rail scrubs down with the scroll. No layout shift from the section.
 * - Fallbacks: reduced motion (at load and switched on mid-visit) → final values, no scramble, rail
 *   drawn, instant toggles. Print → every description and the full rail. No JS → every description
 *   visible, no toggle affordance, final values.
 */
import { sleep } from './lib/browser.mjs';
import { TOKENS, normalize } from './lib/context.mjs';
import { icons } from '../../src/components/ui/icons.ts';

const WIDTHS = [1440, 1200, 900, 600, 390];
const IMPACT_VALUES = {
  en: ['10+', '500+', '98.85%'],
  pt: ['10+', '500+', '98,85%'],
  es: ['10+', '500+', '98,85%'],
};

const ROW = (n) => `#impact [data-ledger-row]:nth-child(${n})`;

function readTexts(expectedIcons) {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const impact = document.getElementById('impact');
  const iconMarkup = (html) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = html;
    return svg.innerHTML;
  };
  return {
    header: {
      kicker: text(impact.querySelector('header > p:first-child')),
      title: text(impact.querySelector('header h2')),
      intro: text(impact.querySelector('header h2 + p')) || undefined,
    },
    metrics: [...impact.querySelectorAll('[data-metrics] > li')].map((li) => ({
      value: text(li.querySelector('.metric-value .sr-only')),
      shown: text(li.querySelector('[data-countup]')),
      label: text(li.querySelector('.metric-label')),
      note: text(li.querySelector('.metric-note')),
    })),
    items: [...impact.querySelectorAll('[data-achievements] > li')].map((li) => ({
      index: text(li.querySelector('[data-ledger-index]')),
      tag: text(li.querySelector('.ledger-tag')),
      title: text(li.querySelector('.ledger-title')),
      description: text(li.querySelector('.ledger-desc')),
      icon: iconMarkup(li.querySelector('svg').innerHTML),
    })),
    expectedIcons: expectedIcons.map(iconMarkup),
  };
}

function measure() {
  const px = (v) => parseFloat(v);
  const vw = document.documentElement.clientWidth;
  const impact = document.getElementById('impact');
  const box = (el) => el.getBoundingClientRect();
  const st = (el, pseudo) => getComputedStyle(el, pseudo);
  const metrics = [...impact.querySelectorAll('[data-metrics] > li')];
  const rows = [...impact.querySelectorAll('[data-ledger-row]')];
  const ledger = impact.querySelector('[data-ledger]');
  const overflowing = [];
  for (const el of impact.querySelectorAll('*')) {
    const r = box(el);
    if (r.width === 0 || el.closest('.sr-only')) continue;
    const clips = st(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
    if (r.left < -0.5 || r.right > vw + 0.5 || clips) overflowing.push(`${el.tagName.toLowerCase()}.${el.className}`);
  }
  const boxless = (el) => {
    const s = st(el);
    return s.backgroundColor === 'rgba(0, 0, 0, 0)' && px(s.borderTopLeftRadius) === 0 && s.boxShadow === 'none';
  };
  return {
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    background: st(impact).backgroundColor,
    padding: [px(st(impact).paddingTop), px(st(impact).paddingBottom)],
    metrics: metrics.map((li, i) => {
      const value = li.querySelector('.metric-value');
      const vs = st(value);
      const shown = li.querySelector('[data-countup]');
      return {
        left: Math.round(box(li).left),
        top: Math.round(box(li).top),
        boxless: boxless(li),
        hairlineLeft: [st(li).borderLeftWidth, st(li).borderLeftColor],
        hairlineTop: [st(li).borderTopWidth, st(li).borderTopColor],
        mono: vs.fontFamily.includes('JetBrains Mono'),
        size: px(vs.fontSize),
        color: vs.color,
        oneLine: Math.round(box(value).height) === Math.round(px(vs.lineHeight)),
        fits: box(shown).right <= box(li).right - px(st(li).paddingRight) + 0.5,
        valueAboveLabel: box(value).bottom <= box(li.querySelector('.metric-label')).top,
        index: i,
      };
    }),
    rows: rows.map((li) => ({
      boxless: boxless(li),
      width: box(li).width,
      borderTop: [st(li).borderTopWidth, st(li).borderTopColor],
      left: Math.round(box(li).left),
      buttonInH3: li.querySelector('h3 > button[data-ledger-trigger]') !== null,
      parts: ['[data-ledger-index]', '.ledger-tag', 'svg', '.ledger-title', '.ledger-toggle'].every((s) =>
        li.querySelector(`button ${s}`),
      ),
      indexMono: st(li.querySelector('[data-ledger-index]')).fontFamily.includes('JetBrains Mono'),
      tagMono: st(li.querySelector('.ledger-tag')).fontFamily.includes('JetBrains Mono'),
      buttonHeight: box(li.querySelector('button')).height,
    })),
    ledgerWidth: box(ledger).width,
    contentWidth: box(impact.querySelector('.container')).width - px(st(impact.querySelector('.container')).paddingLeft) * 2,
    rail: [st(ledger, '::before').width, st(ledger, '::after').backgroundColor, Math.round(box(ledger).height)],
    overflowing,
  };
}

function readContrast() {
  const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c;
    }
    return rgb(getComputedStyle(document.documentElement).backgroundColor);
  };
  const low = [];
  const section = document.getElementById('impact');
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.textContent.trim() || el.closest('.sr-only')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || el.getClientRects().length === 0) continue;
    // Ledger rows get a hover tint (cobalt at most ~10% over the mist): require AA on that too.
    const bg = bgOf(el);
    const tinted = bg.map((v, i) => v * 0.9 + [43, 91, 255][i] * 0.1);
    for (const back of el.closest('[data-ledger-row]') ? [bg, tinted] : [bg]) {
      const [a, b] = [lum(rgb(s.color)), lum(back)].sort((x, y) => y - x);
      const ratio = (a + 0.05) / (b + 0.05);
      if (ratio < 4.5) low.push(`"${node.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
    }
  }
  return low;
}

const readRows = () =>
  [...document.querySelectorAll('#impact [data-ledger-row]')].map((li) => {
    const button = li.querySelector('[data-ledger-trigger]');
    const body = li.querySelector('[data-ledger-body]');
    const toggle = getComputedStyle(li.querySelector('.ledger-toggle'));
    return {
      expanded: button.getAttribute('aria-expanded'),
      controls: button.getAttribute('aria-controls'),
      controlsBody: button.getAttribute('aria-controls') === body.id,
      role: body.getAttribute('role'),
      labelledBy: body.getAttribute('aria-labelledby') === button.id,
      visible: getComputedStyle(body).visibility === 'visible',
      height: Math.round(body.getBoundingClientRect().height),
      descHeight: Math.round(li.querySelector('.ledger-desc').getBoundingClientRect().height),
      toggleVisible: toggle.visibility === 'visible',
      toggleTransform: toggle.transform,
    };
  });

/** Rotation in degrees of a computed `transform` matrix. */
const angleOf = (transform) => {
  const m = /matrix\(([^,]+), ([^,]+)/.exec(transform ?? '');
  return m ? Math.round((Math.atan2(Number(m[2]), Number(m[1])) * 180) / Math.PI) : 0;
};

const impactShift = () =>
  new Promise((resolve) => {
    const impact = document.getElementById('impact');
    const observer = new PerformanceObserver(() => {});
    observer.observe({ type: 'layout-shift', buffered: true });
    requestAnimationFrame(() => {
      const entries = observer.takeRecords();
      observer.disconnect();
      resolve(
        entries
          .filter((e) => !e.hadRecentInput && e.sources?.some((src) => src.node && impact.contains(src.node)))
          .reduce((sum, e) => sum + e.value, 0),
      );
    });
  });

const railScale = () => {
  const t = getComputedStyle(document.querySelector('#impact [data-ledger]'), '::after').transform;
  const m = /matrix\(([^)]+)\)/.exec(t);
  return { transform: t, scale: m ? Number(m[1].split(',')[3]) : 1, armed: document.querySelector('#impact [data-ledger]').hasAttribute('data-ledger-armed') };
};

async function checkDisclosure(t, page, at) {
  let rows = await page.eval(readRows);
  t.eq(rows.map((r) => r.expanded), ['true', 'false', 'false', 'false'], `${at}: first row open by default, others collapsed`);
  t.ok(rows.every((r) => r.controlsBody && r.role === 'region' && r.labelledBy), `${at}: buttons control their region (aria-controls, role, aria-labelledby)`, JSON.stringify(rows[0]));
  t.ok(rows[0].visible && rows[0].height > 0, `${at}: the open description is visible`);
  t.ok(rows.slice(1).every((r) => !r.visible && r.height === 0), `${at}: collapsed descriptions are hidden with no height`, JSON.stringify(rows.map((r) => [r.visible, r.height])));
  t.ok(rows.every((r) => r.toggleVisible), `${at}: every row shows the expand affordance`);
  t.eq(angleOf(rows[0].toggleTransform), 45, `${at}: the open row's "+" is turned into "×"`);
  t.eq(angleOf(rows[1].toggleTransform), 0, `${at}: a closed row shows "+"`);

  // Click row 3: it opens, row 1 closes; its height animates rather than jumping.
  await page.click(`${ROW(3)} .ledger-title`);
  await sleep(90);
  const mid = await page.eval(readRows);
  t.ok(mid[2].height > 0 && mid[2].height < mid[2].descHeight - 1, `${at}: opening animates the height`, JSON.stringify({ height: mid[2].height, full: mid[2].descHeight }));
  await sleep(600);
  rows = await page.eval(readRows);
  t.eq(rows.map((r) => r.expanded), ['false', 'false', 'true', 'false'], `${at}: clicking a row opens it and closes the open one`);
  t.ok(rows[2].visible && rows[2].height >= rows[2].descHeight - 1 && !rows[0].visible && rows[0].height === 0, `${at}: only the clicked row's description shows`);

  await page.click(`${ROW(3)} .ledger-title`);
  await sleep(600);
  rows = await page.eval(readRows);
  t.eq(rows.map((r) => r.expanded), ['false', 'false', 'false', 'false'], `${at}: clicking the open row closes it`);

  // Keyboard: focus the second button with Tab from the first, then Enter and Space.
  await page.eval(() => document.querySelector('#impact [data-ledger-row]:nth-child(1) [data-ledger-trigger]').focus());
  await page.press('Tab');
  const focus = await page.eval(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { second: el === document.querySelector('#impact [data-ledger-row]:nth-child(2) [data-ledger-trigger]'), visible: el.matches(':focus-visible'), outline: [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset] };
  });
  t.ok(focus.second, `${at}: Tab moves between ledger buttons`);
  t.ok(focus.visible && focus.outline[0] === 'solid' && focus.outline[1] === '2px' && focus.outline[2] === TOKENS.cobalt && focus.outline[3] === '2px', `${at}: focused row shows the 2px cobalt focus ring at 2px offset`, JSON.stringify(focus));
  await page.press('Enter');
  await sleep(600);
  rows = await page.eval(readRows);
  t.eq(rows[1].expanded, 'true', `${at}: Enter opens the focused row`);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(600);
  rows = await page.eval(readRows);
  t.eq(rows[1].expanded, 'false', `${at}: Space closes it`);
}

async function checkMotion(t, browser, route) {
  const at = route.path;
  const url = route.url;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  await page.waitFor(() => document.documentElement.dataset.interactions === 'ready', { timeout: 3000 });
  await sleep(200);

  const zero = await page.eval(() => [...document.querySelectorAll('#impact [data-countup]')].map((el) => el.textContent.trim()));
  t.ok(zero.every((v) => /^0([.,]0+)?[+%]$/.test(v)), `${at}: below the fold the metric values wait at 0`, JSON.stringify(zero));

  // Scroll the metrics into view and sample the count-up.
  await page.eval(() => document.querySelector('#impact [data-metrics]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const samples = await page.eval(
    () =>
      new Promise((resolve) => {
        const els = [...document.querySelectorAll('#impact [data-countup]')];
        const heights = els.map(() => new Set());
        const out = [];
        const t0 = performance.now();
        const tick = () => {
          out.push({ t: performance.now() - t0, v: els.map((el) => el.textContent.trim()) });
          els.forEach((el, i) => heights[i].add(Math.round(el.closest('li').getBoundingClientRect().height * 100) / 100));
          if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
          else resolve({ out, heights: heights.map((h) => h.size), raw: heights.map((h) => [...h]) });
        };
        requestAnimationFrame(tick);
      }),
  );
  const finals = IMPACT_VALUES[route.locale];
  const glyph = (v) => /[#$&*/<=>?@]/.test(v);
  t.ok(samples.out.some((s) => s.v.some(glyph)), `${at}: digits flicker through decode glyphs`);
  t.ok(samples.out.some((s) => s.v.some((v, i) => v !== finals[i] && !glyph(v) && /[1-9]/.test(v))), `${at}: values count up through intermediate numbers`);
  const firstMove = finals.map((f, i) => samples.out.find((s) => !/^0([.,]0+)?[+%]$/.test(s.v[i]))?.t ?? Infinity);
  t.ok(firstMove[0] < firstMove[1] && firstMove[1] < firstMove[2], `${at}: the three metrics start staggered`, JSON.stringify(firstMove.map(Math.round)));
  t.eq(samples.out.at(-1).v, finals, `${at}: count-up ends on the exact locale values`);
  t.ok(samples.heights.every((n) => n === 1), `${at}: each metric keeps one height while counting`, JSON.stringify(samples.raw));
  const sr = await page.eval(() => [...document.querySelectorAll('#impact .metric-value .sr-only')].map((el) => el.textContent.trim()));
  t.eq(sr, finals, `${at}: screen readers get the final values`);

  // Index scramble on hover.
  await page.eval(() => document.querySelector('#impact [data-ledger]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(900);
  await page.hover(`${ROW(2)} .ledger-title`);
  const scramble = await page.eval(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#impact [data-ledger-row]:nth-child(2) [data-ledger-index]');
        const seen = [];
        const t0 = performance.now();
        const tick = () => {
          seen.push(el.textContent);
          if (performance.now() - t0 < 700) requestAnimationFrame(tick);
          else resolve({ seen, final: el.textContent });
        };
        requestAnimationFrame(tick);
      }),
  );
  const code = `${route.content.achievements.exhibitPrefix}-02`;
  t.ok(scramble.seen.some((v) => v !== code && v.length === code.length), `${at}: hovering a row scrambles its code (same length)`, JSON.stringify(scramble.seen.slice(0, 4)));
  t.eq(scramble.final, code, `${at}: the code settles back to ${code}`);
  const tint = await page.eval(() => getComputedStyle(document.querySelector('#impact [data-ledger-row]:nth-child(2)'), '::before').opacity);
  t.eq(tint, '1', `${at}: hovered row shows the spotlight tint`);
  await page.moveMouse(5, 5);

  // Rail scrub.
  await page.eval(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.eval(() => {
    const ledger = document.querySelector('#impact [data-ledger]');
    window.scrollTo({ top: ledger.getBoundingClientRect().top + scrollY - innerHeight * 0.72 + ledger.offsetHeight * 0.3, behavior: 'instant' });
  });
  await sleep(300);
  const partial = await page.eval(railScale);
  await page.eval(() => {
    const ledger = document.querySelector('#impact [data-ledger]');
    window.scrollTo({ top: ledger.getBoundingClientRect().bottom + scrollY, behavior: 'instant' });
  });
  await sleep(300);
  const full = await page.eval(railScale);
  t.ok(partial.armed && partial.scale > 0.1 && partial.scale < 0.6, `${at}: the rail is partly drawn mid-ledger`, JSON.stringify(partial));
  t.ok(full.scale > 0.99, `${at}: the rail is fully drawn past the ledger`, JSON.stringify(full));
  t.near(await page.eval(impactShift), 0, 0.0001, `${at}: no layout shift from the section with motion`);

  // Switching on reduced motion mid-visit, then print.
  await page.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  t.ok((await page.eval(railScale)).scale === 1, `${at}: switching on reduced motion mid-visit draws the full rail`);
  await page.send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const print = await page.eval(readRows);
  t.ok(print.every((r) => r.visible && r.height > 0), `${at}: print shows every description`, JSON.stringify(print.map((r) => r.height)));
  t.ok((await page.eval(railScale)).scale === 1, `${at}: print shows the full rail`);
  t.eq(page.errors, [], `${at}: no page errors with motion`);
  await page.close();
}

async function checkReducedMotion(t, browser, route) {
  const at = route.path;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(true);
  await page.goto(route.url);
  await sleep(1200);
  const values = await page.eval(() => [...document.querySelectorAll('#impact [data-countup]')].map((el) => el.textContent.trim()));
  t.eq(values, IMPACT_VALUES[route.locale], `${at}: reduced motion shows the final values below the fold`);
  t.ok(!(await page.eval(railScale)).armed && (await page.eval(railScale)).scale === 1, `${at}: reduced motion: rail drawn, not scrubbed`);
  await page.hover(`${ROW(2)} .ledger-title`);
  const seen = await page.eval(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#impact [data-ledger-row]:nth-child(2) [data-ledger-index]');
        const out = new Set();
        const t0 = performance.now();
        const tick = () => (out.add(el.textContent), performance.now() - t0 < 400 ? requestAnimationFrame(tick) : resolve([...out]));
        requestAnimationFrame(tick);
      }),
  );
  t.eq(seen.length, 1, `${at}: reduced motion: no index scramble`);
  await page.click(`${ROW(4)} .ledger-title`);
  await sleep(60);
  const rows = await page.eval(readRows);
  t.ok(rows[3].expanded === 'true' && rows[3].visible && rows[3].height >= rows[3].descHeight - 1, `${at}: reduced motion: rows toggle instantly`, JSON.stringify(rows[3]));
  t.near(await page.eval(impactShift), 0, 0.0001, `${at}: no layout shift from the section under reduced motion`);
  await page.close();
}

/** Reads the ledger and metrics with JavaScript disabled, over the DOM/CSS protocol domains. */
async function checkNoJs(t, browser, route) {
  const at = route.path;
  const page = await browser.newPage({ width: 390, height: 900 });
  await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  const before = page.loads;
  await page.send('Page.navigate', { url: route.url });
  const start = Date.now();
  while (page.loads <= before) {
    if (Date.now() - start > 15000) throw new Error(`Timed out loading ${route.url}`);
    await sleep(20);
  }
  await page.send('DOM.enable');
  await page.send('CSS.enable');
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const all = async (selector) => (await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector })).nodeIds;
  const styleOf = async (nodeId) => {
    const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
    return (name) => computedStyle.find((p) => p.name === name)?.value;
  };
  const bodies = [];
  for (const nodeId of await all('#impact [data-ledger-body]')) {
    const s = await styleOf(nodeId);
    const { model } = await page.send('DOM.getBoxModel', { nodeId });
    bodies.push({ visibility: s('visibility'), height: model.height });
  }
  const toggles = [];
  for (const nodeId of await all('#impact .ledger-toggle')) toggles.push((await styleOf(nodeId))('visibility'));
  const values = [];
  for (const nodeId of await all('#impact [data-countup]')) {
    const { outerHTML } = await page.send('DOM.getOuterHTML', { nodeId });
    values.push(outerHTML.replace(/<[^>]+>/g, '').trim());
  }
  t.ok(bodies.length === 4 && bodies.every((b) => b.visibility === 'visible' && b.height > 0), `${at}: without JS every description is visible`, JSON.stringify(bodies));
  t.ok(toggles.every((v) => v === 'hidden'), `${at}: without JS no expand affordance is shown`, JSON.stringify(toggles));
  t.eq(values, IMPACT_VALUES[route.locale], `${at}: without JS the metric values are final`);
  await page.close();
}

export default {
  name: 'Achievements & impact evidence board',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    await page.reducedMotion(true);
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const { content } = route;

      await page.viewport(1440);
      await page.goto(url);
      const texts = await page.eval(readTexts, content.achievements.items.map((item) => icons[item.icon]));
      t.eq(texts.header, { kicker: content.sections.impact.kicker, title: content.sections.impact.title, intro: content.sections.impact.intro }, `${at}: header matches locale`);
      t.eq(
        texts.metrics.map(({ value, label, note }) => ({ value, label, note })),
        content.achievements.metrics.map((m) => ({ value: m.value, label: normalize(m.label), note: normalize(m.note) })),
        `${at}: metrics match locale`,
      );
      t.eq(texts.metrics.map((m) => m.shown), IMPACT_VALUES[route.locale], `${at}: metric values are the real numbers in the locale's number format`);
      t.eq(
        texts.items.map(({ index, tag, title, description }) => ({ index, tag, title, description })),
        content.achievements.items.map((item, i) => ({
          index: `${content.achievements.exhibitPrefix}-0${i + 1}`,
          tag: normalize(item.tag),
          title: normalize(item.title),
          description: normalize(item.description),
        })),
        `${at}: ledger rows match locale (code, tag, title, description)`,
      );
      t.eq(texts.items.map((i) => i.icon), texts.expectedIcons, `${at}: achievement icons match locale`);
      t.eq(await page.eval(readContrast), [], `${at}: every text in the section meets AA (4.5:1), also on the hover tint`);

      for (const width of WIDTHS) {
        const w = `${at} @${width}`;
        await page.viewport(width);
        await page.goto(url);
        const m = await page.eval(measure);
        const pad = width >= 900 ? 112 : 72;
        t.ok(m.hscroll <= 0, `${w}: no horizontal scroll`, `${m.hscroll}px`);
        t.eq(m.background, TOKENS.transparent, `${w}: section sits on the mist page background`);
        t.eq(m.padding, [0, pad], `${w}: bottom padding only (${pad}px)`);
        t.ok(m.metrics.every((x) => x.boxless), `${w}: metrics have no card boxes`);
        t.ok(m.metrics.every((x) => x.mono && x.color === TOKENS.cobalt && x.size >= 56), `${w}: metric values are ≥56px JetBrains Mono in cobalt`, JSON.stringify(m.metrics[0]));
        t.ok(m.metrics.every((x) => x.oneLine && x.fits), `${w}: each metric value is one line inside its column`, JSON.stringify(m.metrics.map((x) => [x.oneLine, x.fits])));
        t.ok(m.metrics.every((x) => x.valueAboveLabel), `${w}: each value sits above its label`);
        if (width >= 900) {
          t.eq(new Set(m.metrics.map((x) => x.top)).size, 1, `${w}: metrics share one row`);
          t.eq(m.metrics.slice(1).map((x) => x.hairlineLeft), [['1px', TOKENS.line], ['1px', TOKENS.line]], `${w}: 1px vertical hairlines between metrics`);
          t.eq(m.metrics[0].hairlineLeft[0], '0px', `${w}: no hairline before the first metric`);
        } else {
          t.eq(new Set(m.metrics.map((x) => x.left)).size, 1, `${w}: metrics stack in one column`);
          t.eq(m.metrics.slice(1).map((x) => x.hairlineTop), [['1px', TOKENS.line], ['1px', TOKENS.line]], `${w}: stacked metrics are split by hairlines`);
        }
        t.ok(m.rows.length === 4 && m.rows.every((r) => r.boxless && r.borderTop[0] === '1px' && r.borderTop[1] === TOKENS.line), `${w}: four boxless ledger rows split by hairlines`);
        t.eq(new Set(m.rows.map((r) => r.left)).size, 1, `${w}: ledger rows form one column`);
        t.near(m.ledgerWidth, m.contentWidth, 1, `${w}: the ledger spans the full content width`);
        t.ok(m.rows.every((r) => r.buttonInH3 && r.parts && r.indexMono && r.tagMono), `${w}: each row head is a button in the H3 with mono code + tag, icon, title and toggle`);
        t.ok(m.rows.every((r) => r.buttonHeight >= TOKENS.touchTarget), `${w}: row buttons are at least 44px tall`);
        t.ok(m.rail[0] === '1px' && m.rail[1] === TOKENS.cobalt && m.rail[2] > 200, `${w}: the rail runs down the ledger`, JSON.stringify(m.rail));
        t.eq(m.overflowing, [], `${w}: nothing in the section overflows`);
      }

      // Disclosure with motion allowed (the height animation is part of the contract).
      const live = await browser.newPage();
      await live.reducedMotion(false);
      for (const width of [1440, 390]) {
        await live.viewport(width);
        await live.goto(url);
        await live.eval(() => document.querySelector('#impact [data-ledger]').scrollIntoView({ block: 'center', behavior: 'instant' }));
        await live.waitFor(() => !document.querySelector('#impact .reveal-pending, #impact .reveal-active'), { timeout: 3000 });
        await sleep(200);
        await checkDisclosure(t, live, `${at} @${width}`);
      }
      t.eq(live.errors, [], `${at}: no page errors while toggling`);
      await live.close();

      const withUrl = { ...route, url };
      await checkMotion(t, browser, withUrl);
      await checkReducedMotion(t, browser, withUrl);
      await checkNoJs(t, browser, withUrl);
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

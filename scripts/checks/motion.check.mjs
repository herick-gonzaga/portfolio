/**
 * Motion foundation (src/scripts/motion.ts): Lenis smooth scroll, the [data-reveal] scroll reveal
 * and the 2px scroll-progress bar, in every locale.
 *
 * - The expected sections are tagged: section headers, the About facts panel, skill cards,
 *   project cards, impact cards and the contact block (groups for every card grid).
 * - With motion allowed: Lenis is on, elements below the fold start hidden 24px lower, elements
 *   already on screen are never hidden, reveals end in the untransformed final state and stay
 *   revealed, siblings in a group are staggered, data-reveal-delay delays, the bar is 2px cobalt
 *   at the top and tracks scroll progress, the wheel scrolls smoothly, and Lenis pauses while the
 *   personal panel locks the page. Scrolling the whole page causes no layout shift.
 * - Under prefers-reduced-motion and without JS: no Lenis, no bar, every element in its final state.
 */
import { sleep } from './lib/browser.mjs';
import { TOKENS } from './lib/context.mjs';

/** Selectors that must carry data-reveal, and the containers that must be data-reveal-group. */
const REVEALED = [
  '#about header',
  '#skills header',
  '#projects header',
  '#journey header',
  '#impact header',
  '#about .card',
  '#skills ul.grid > li',
  '#projects article',
  '#impact [data-metrics] > li',
  '#impact [data-achievements] > li',
  '#contact .grid > div',
  '#contact [data-contact-details]',
];
const GROUPS = ['#skills ul.grid', '#projects .grid', '#impact [data-metrics]', '#impact [data-achievements]', '#contact .grid'];

const readTags = (revealed, groups) => ({
  missing: revealed.filter((sel) => {
    const els = [...document.querySelectorAll(sel)];
    return els.length === 0 || els.some((el) => !el.hasAttribute('data-reveal'));
  }),
  missingGroups: groups.filter((sel) => !document.querySelector(sel)?.hasAttribute('data-reveal-group')),
});

const readState = () => {
  const line = innerHeight * 0.88;
  const items = [...document.querySelectorAll('[data-reveal]')].map((el) => {
    const s = getComputedStyle(el);
    const pending = el.classList.contains('reveal-pending');
    // A pending element is drawn 24px lower; its layout position is 24px higher.
    const top = el.getBoundingClientRect().top - (pending ? 24 : 0);
    return { pending, top, opacity: s.opacity, transform: s.transform };
  });
  const bar = document.querySelector('.scroll-progress');
  const bs = bar && getComputedStyle(bar);
  return {
    lenis: document.documentElement.classList.contains('lenis'),
    items,
    bar: bar && {
      position: bs.position,
      top: bar.getBoundingClientRect().top,
      height: bar.getBoundingClientRect().height,
      color: bs.backgroundColor,
      ariaHidden: bar.getAttribute('aria-hidden'),
      zIndex: Number(bs.zIndex),
    },
    line,
  };
};

const barScale = () => {
  const bar = document.querySelector('.scroll-progress');
  return bar ? new DOMMatrix(getComputedStyle(bar).transform).a : null;
};

/** Scrolls `selector` into view and records, per [data-reveal] in it, the ms until it first shows. */
const timeReveal = (selector) =>
  new Promise((resolve) => {
    const els = [...document.querySelectorAll(`${selector} [data-reveal], ${selector}[data-reveal]`)];
    const start = performance.now();
    const shown = els.map(() => null);
    const tick = () => {
      els.forEach((el, i) => {
        if (shown[i] === null && Number(getComputedStyle(el).opacity) > 0.02) shown[i] = performance.now() - start;
      });
      if (shown.every((v) => v !== null) || performance.now() - start > 4000) resolve(shown);
      else requestAnimationFrame(tick);
    };
    document.querySelector(selector).scrollIntoView({ block: 'center' });
    requestAnimationFrame(tick);
  });

/** Scrolls through the page in viewport steps, then sums every layout-shift entry. */
const scrollForShifts = async () => {
  const shifts = [];
  new PerformanceObserver((list) => shifts.push(...list.getEntries())).observe({ type: 'layout-shift', buffered: true });
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
    window.scrollTo(0, y);
    await frame();
    await new Promise((r) => setTimeout(r, 60));
  }
  await new Promise((r) => setTimeout(r, 1500));
  return shifts.reduce((sum, e) => sum + e.value, 0);
};

/** Reads every [data-reveal] style over the DOM/CSS domains with script execution disabled. */
async function readWithoutJs(page, url) {
  await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  const before = page.loads;
  await page.send('Page.navigate', { url });
  const start = Date.now();
  while (page.loads <= before) {
    if (Date.now() - start > 15000) throw new Error(`Timed out loading ${url}`);
    await sleep(20);
  }
  await page.send('DOM.enable');
  await page.send('CSS.enable');
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-reveal]' });
  const { nodeIds: bars } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.scroll-progress' });
  const { attributes } = await page.send('DOM.getAttributes', {
    nodeId: (await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'html' })).nodeId,
  });
  const items = [];
  for (const nodeId of nodeIds) {
    const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
    const get = (name) => computedStyle.find((p) => p.name === name)?.value;
    items.push({ opacity: get('opacity'), transform: get('transform') });
  }
  const htmlClass = attributes[attributes.indexOf('class') + 1] ?? '';
  return { items, bars: bars.length, lenis: attributes.includes('class') && /\blenis\b/.test(htmlClass) };
}

const final = (i) => i.opacity === '1' && i.transform === 'none';

async function checkMotion(t, browser, url, at) {
  // Delay the contact details by 300ms before motion.ts runs (it reads data-reveal-delay at init).
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `new MutationObserver((_, obs) => {
      const el = document.querySelector('[data-contact-details]');
      if (el) { el.dataset.revealDelay = '300'; obs.disconnect(); }
    }).observe(document, { childList: true, subtree: true });`,
  });
  await page.goto(url);

  const tags = await page.eval(readTags, REVEALED, GROUPS);
  t.eq(tags.missing, [], `${at}: headings, facts panel and every card/contact block carry data-reveal`);
  t.eq(tags.missingGroups, [], `${at}: every card grid and the contact block is a data-reveal-group`);

  const s = await page.eval(readState);
  t.ok(s.lenis, `${at}: Lenis smooth scrolling is on`);
  t.ok(s.items.some((i) => i.pending), `${at}: elements below the fold are armed`);
  t.ok(
    s.items.filter((i) => i.pending).every((i) => i.opacity === '0' && i.transform === 'matrix(1, 0, 0, 1, 0, 24)'),
    `${at}: armed elements start hidden, 24px lower`,
    JSON.stringify(s.items.find((i) => i.pending)),
  );
  t.ok(s.items.filter((i) => i.pending).every((i) => i.top > s.line), `${at}: only elements below the fold are armed`);
  t.ok(s.items.filter((i) => !i.pending).every(final), `${at}: elements already on screen are never hidden`);
  t.ok(s.bar !== null, `${at}: scroll-progress bar is rendered`);
  if (s.bar) {
    t.eq(s.bar.position, 'fixed', `${at}: progress bar is fixed`);
    t.eq([s.bar.top, s.bar.height], [0, 2], `${at}: progress bar is 2px at the top`);
    t.eq(s.bar.color, TOKENS.cobalt, `${at}: progress bar uses the cobalt accent`);
    t.eq(s.bar.ariaHidden, 'true', `${at}: progress bar is hidden from assistive tech`);
    t.ok(s.bar.zIndex > 50, `${at}: progress bar sits above the navbar`);
  }
  t.near(await page.eval(barScale), 0, 0.001, `${at}: progress bar is empty at the top`);

  // Smooth wheel: a 600px wheel tick is eased over several frames, not jumped.
  await page.moveMouse(720, 450);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 600 });
  const steps = await page.eval(
    () =>
      new Promise((resolve) => {
        const ys = [];
        const tick = () => {
          ys.push(scrollY);
          if (ys.length < 40) requestAnimationFrame(tick);
          else resolve(ys);
        };
        requestAnimationFrame(tick);
      }),
  );
  const distinct = new Set(steps.filter((y) => y > 0)).size;
  t.ok(distinct >= 5 && steps.at(-1) > 0, `${at}: the wheel scrolls smoothly (eased over frames)`, JSON.stringify(steps));

  // Stagger: the second skill card starts after the first.
  const skills = await page.eval(timeReveal, '#skills ul.grid');
  t.ok(skills[1] - skills[0] >= 50, `${at}: siblings in a group are staggered`, JSON.stringify(skills));
  // data-reveal-delay: the delayed contact details start ≥300ms after the contact text.
  const contact = await page.eval(timeReveal, '#contact .grid');
  t.ok(contact[1] - contact[0] >= 300, `${at}: data-reveal-delay delays the reveal`, JSON.stringify(contact));

  t.note(`${at}: skills start at ${skills.map(Math.round).join('/')}ms, contact at ${contact.map(Math.round).join('/')}ms, wheel steps ${distinct}`);

  const cls = await page.eval(scrollForShifts);
  t.eq(cls, 0, `${at}: scrolling the whole page causes no layout shift`);
  const end = await page.eval(readState);
  t.ok(end.items.every((i) => !i.pending && final(i)), `${at}: every element ends revealed and untransformed`);
  t.near(await page.eval(barScale), 1, 0.01, `${at}: progress bar is full at the bottom`);

  await page.eval(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
  await page.settle();
  t.near(await page.eval(barScale), 0.5, 0.02, `${at}: progress bar tracks scroll progress`);
  await page.eval(() => window.scrollTo(0, 0));
  // 800ms: a project card left hovered at mid-page springs back from its tilt over 650ms.
  await sleep(800);
  t.ok((await page.eval(readState)).items.every(final), `${at}: revealed elements stay visible after scrolling back`);

  // Personal panel locks the page: Lenis pauses, then resumes on close.
  await page.click('[data-personal-open]');
  const stopped = await page.waitFor(() => document.documentElement.classList.contains('lenis-stopped'), { timeout: 1000 });
  t.ok(stopped, `${at}: Lenis pauses while the personal panel is open`);
  await page.click('[data-personal-close]');
  const resumed = await page.waitFor(() => !document.documentElement.classList.contains('lenis-stopped'), { timeout: 1000 });
  t.ok(resumed, `${at}: Lenis resumes when the personal panel closes`);

  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

async function checkReducedMotion(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(true);
  await page.goto(url);
  const s = await page.eval(readState);
  t.ok(!s.lenis, `${at}: no Lenis under prefers-reduced-motion`);
  t.ok(s.bar === null, `${at}: no progress bar under prefers-reduced-motion`);
  t.ok(s.items.length > 0 && s.items.every((i) => !i.pending && final(i)), `${at}: every element is static under prefers-reduced-motion`);
  t.eq(page.errors, [], `${at}: no page errors under prefers-reduced-motion`);
  await page.close();
}

async function checkNoJs(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  const s = await readWithoutJs(page, url);
  t.ok(s.items.length > 0 && s.items.every(final), `${at}: every element is fully visible without JS`, JSON.stringify(s.items.find((i) => !final(i))));
  t.eq([s.bars, s.lenis], [0, false], `${at}: no progress bar or Lenis without JS`);
  await page.close();
}

export default {
  name: 'Motion foundation (Lenis, reveal, progress bar)',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const url = baseUrl + route.path;
      await checkMotion(t, browser, url, route.path);
      await checkReducedMotion(t, browser, url, route.path);
      await checkNoJs(t, browser, url, route.path);
    }
  },
};

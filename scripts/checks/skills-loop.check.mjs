/**
 * Skills loop (src/components/Skills.astro, src/scripts/skills-loop.ts), in every locale.
 *
 * - On ink, with AA contrast (4.5:1) for every text in the section.
 * - ≥1200px: ring + tabs. A role="tablist" (labelled from ui.skillsLoop) with four role="tab" nodes
 *   in loop order (build, validate, automate, ship), each with its localized stage verb in mono and
 *   the pillar icon; one aria-selected tab with tabindex 0; its tabpanel shows "0N / 04 · verb", the
 *   title, the description and the chips. The panels share one grid cell (the column is as tall as
 *   the tallest pillar, so switching never moves layout). Chips stay one 28px line inside the panel.
 * - Behaviour (motion allowed): the pulse orbits, the next stage activates after ~5s, the new panel
 *   fades in with its chips staggered; hovering a node selects it and pauses, and the cycle resumes
 *   ~8s after the pointer leaves; ArrowLeft/ArrowRight/Home/End move and select with a visible focus
 *   ring; the orbit stops while the section is offscreen.
 * - <1200px: a stepper accordion, first step open, one open at a time, aria-expanded/aria-controls
 *   on the step buttons and role="region" panels; tapping the node opens its step; the pulse runs
 *   down the line; no auto-cycling.
 * - prefers-reduced-motion: no pulse, no auto-cycle, first pillar selected, instant switches.
 * - No JS: no ring, all four pillars stacked and visible.
 */
import { sleep } from './lib/browser.mjs';
import { TOKENS } from './lib/context.mjs';

const LOOP = ['code', 'shield', 'spark', 'globe'];
const DESKTOP = [1920, 1440, 1200];
const MOBILE = [1199, 900, 390];
const CHIP_COUNTS = [10, 7, 8, 6];

const pillarsOf = (content) => LOOP.map((icon) => content.skills.find((s) => s.icon === icon));

const scrollToLoop = () => {
  document.querySelector('#skills [data-loop]').scrollIntoView({ block: 'center', behavior: 'instant' });
};

const selectedIndex = () =>
  [...document.querySelectorAll('#skills [data-loop-tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true');

const isSelected = (index) =>
  [...document.querySelectorAll('#skills [data-loop-tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true') === index;

const openIndex = () => [...document.querySelectorAll('#skills [data-loop-trigger]')].findIndex((t) => t.getAttribute('aria-expanded') === 'true');

const orbitAngle = () => document.querySelector('#skills [data-loop-orbit]').getAttribute('transform');

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
    return [255, 255, 255];
  };
  const low = [];
  const section = document.getElementById('skills');
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.textContent.trim() || el.closest('.sr-only')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || el.getClientRects().length === 0) continue;
    const [a, b] = [lum(rgb(s.color)), lum(bgOf(el))].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    if (ratio < 4.5) low.push(`"${node.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
  }
  return { bg: getComputedStyle(section).backgroundColor, low };
}

function readDesktop() {
  const root = document.querySelector('#skills [data-loop]');
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = [...root.querySelectorAll('[data-loop-tab]')];
  const steps = [...root.querySelectorAll('[data-loop-step]')];
  const ring = root.querySelector('[data-loop-ring]').getBoundingClientRect();
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const stepsBox = root.querySelector('[data-loop-steps]').getBoundingClientRect();
  const chips = [];
  for (const step of steps) {
    const body = step.querySelector('[data-loop-body]').getBoundingClientRect();
    for (const chip of step.querySelectorAll('[data-loop-chips] li > span')) {
      const r = chip.getBoundingClientRect();
      chips.push({
        label: text(chip),
        nowrap: getComputedStyle(chip).whiteSpace === 'nowrap',
        height: Math.round(r.height),
        outside: Math.max(body.left - r.left, r.right - body.right),
      });
    }
  }
  return {
    mode: root.dataset.mode,
    ringShown: ring.width > 300,
    tablistLabel: tablist?.getAttribute('aria-label'),
    tabs: tabs.map((tab) => {
      const r = tab.getBoundingClientRect();
      return {
        role: tab.getAttribute('role'),
        verb: text(tab.querySelector('.loop-node-verb')),
        font: getComputedStyle(tab.querySelector('.loop-node-verb')).fontFamily,
        icon: Boolean(tab.querySelector('svg')),
        selected: tab.getAttribute('aria-selected'),
        tabindex: tab.getAttribute('tabindex'),
        controls: tab.getAttribute('aria-controls'),
        inside: r.left >= 0 && r.right <= document.documentElement.clientWidth && r.height >= 43.5,
      };
    }),
    panels: steps.map((step) => {
      const r = step.getBoundingClientRect();
      return {
        id: step.id,
        role: step.getAttribute('role'),
        labelledby: step.getAttribute('aria-labelledby'),
        visible: getComputedStyle(step).visibility === 'visible',
        meta: text(step.querySelector('.loop-step-static .loop-step-meta')),
        top: Math.round(r.top),
        height: r.height,
      };
    }),
    stepsHeight: stepsBox.height,
    chips,
    chipCounts: steps.map((s) => s.querySelectorAll('[data-loop-chips] li').length),
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

function readMobile() {
  const root = document.querySelector('#skills [data-loop]');
  const steps = [...root.querySelectorAll('[data-loop-step]')];
  return {
    mode: root.dataset.mode,
    ringDisplay: getComputedStyle(root.querySelector('[data-loop-ring]')).display,
    steps: steps.map((step) => {
      const trigger = step.querySelector('[data-loop-trigger]');
      const body = step.querySelector('[data-loop-body]');
      return {
        triggerShown: getComputedStyle(trigger).display !== 'none',
        expanded: trigger.getAttribute('aria-expanded'),
        controls: trigger.getAttribute('aria-controls') === body.id,
        role: body.getAttribute('role'),
        labelledby: body.getAttribute('aria-labelledby') === trigger.id,
        hidden: body.hidden,
        h3: trigger.parentElement.tagName,
      };
    }),
    pulse: getComputedStyle(steps[0].querySelector('.loop-step-line'), '::after').animationName,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

/** Samples the first and last chip of the active panel for ~600ms after a click. */
const sampleSwitch = () =>
  new Promise((resolve) => {
    const panel = document.querySelector('#skills [data-loop-step].is-active');
    const chips = panel.querySelectorAll('[data-loop-chips] li');
    const first = chips[0];
    const last = chips[chips.length - 1];
    const frames = [];
    const start = performance.now();
    const tick = () => {
      frames.push({
        panel: Number(getComputedStyle(panel).opacity),
        first: Number(getComputedStyle(first).opacity),
        last: Number(getComputedStyle(last).opacity),
      });
      if (performance.now() - start < 600) requestAnimationFrame(tick);
      else resolve(frames);
    };
    requestAnimationFrame(tick);
  });

async function checkDesktop(t, browser, route, width) {
  const at = `${route.path} @${width}`;
  const pillars = pillarsOf(route.content);
  const page = await browser.newPage({ width, height: 1000 });
  await page.goto(`${route.baseUrl}${route.path}`);
  await page.eval(scrollToLoop);
  await page.settle();
  const m = await page.eval(readDesktop);

  t.eq(m.mode, 'tabs', `${at}: ring + tabs layout`);
  t.ok(m.ringShown, `${at}: the ring is shown`);
  t.eq(m.tablistLabel, route.content.ui.skillsLoop, `${at}: tablist has its localized label`);
  t.eq(m.tabs.map((x) => x.verb), pillars.map((p) => p.stage), `${at}: nodes show the stage verbs in loop order`);
  t.ok(m.tabs.every((x) => x.role === 'tab' && x.icon && /JetBrains Mono/.test(x.font)), `${at}: every node is a tab with its icon and a mono verb`);
  t.eq(m.tabs.map((x) => x.selected), ['true', 'false', 'false', 'false'], `${at}: the first stage is selected`);
  t.eq(m.tabs.map((x) => x.tabindex), ['0', '-1', '-1', '-1'], `${at}: roving tabindex`);
  t.ok(m.tabs.every((x) => x.inside), `${at}: nodes are ≥44px tall and inside the viewport`);
  t.ok(
    m.panels.every((p, i) => p.role === 'tabpanel' && p.labelledby === `skills-tab-${i}` && m.tabs[i].controls === p.id),
    `${at}: tabs and tabpanels reference each other`,
  );
  t.eq(m.panels.map((p) => p.visible), [true, false, false, false], `${at}: only the active panel is visible`);
  t.eq(m.panels.map((p) => p.meta), pillars.map((p, i) => `0${i + 1} / 04 · ${p.stage}`), `${at}: panel meta reads "0N / 04 · verb"`);
  t.eq(new Set(m.panels.map((p) => p.top)).size, 1, `${at}: panels share one grid cell`);
  t.near(m.stepsHeight, Math.max(...m.panels.map((p) => p.height)), 0.5, `${at}: panel column reserves the tallest pillar`);
  t.eq(m.chipCounts, CHIP_COUNTS, `${at}: every pillar keeps its chips`);
  const bad = (fn) => m.chips.filter(fn).map((c) => c.label);
  t.eq(bad((c) => !c.nowrap || c.height !== TOKENS.chipHeight), [], `${at}: every chip is one 28px line`);
  t.eq(bad((c) => c.outside > 0.5), [], `${at}: every chip sits inside its panel`);
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);

  if (width === 1440) {
    const contrast = await page.eval(readContrast);
    t.eq(contrast.bg, TOKENS.ink, `${at}: section is on ink`);
    t.eq(contrast.low, [], `${at}: every text meets 4.5:1`);
  }
  await page.close();
}

async function checkBehaviour(t, browser, route, long) {
  const at = `${route.path} @1440`;
  const page = await browser.newPage({ width: 1440, height: 1000 });
  await page.reducedMotion(false);
  await page.goto(`${route.baseUrl}${route.path}`);
  await page.eval(scrollToLoop);
  await page.moveMouse(5, 500);

  // The pulse orbits, and the cycle moves on about every 5s.
  const a1 = await page.eval(orbitAngle);
  await sleep(300);
  t.ok((await page.eval(orbitAngle)) !== a1, `${at}: the pulse travels around the ring`);
  const t0 = Date.now();
  const advanced = await page.waitFor(isSelected, { args: [1], timeout: 7000 });
  const elapsed = Date.now() - t0;
  t.ok(advanced && elapsed > 3500, `${at}: auto-cycles to the next stage after ~5s`, `${elapsed}ms`);

  // Clicking a node: switches with a quick fade and staggered chips.
  await page.click('#skills [data-loop-tab][data-pos="2"]');
  const frames = await page.eval(sampleSwitch);
  t.eq(await page.eval(selectedIndex), 2, `${at}: clicking a node selects it`);
  t.ok(frames.some((f) => f.panel < 0.9), `${at}: the panel fades in`, JSON.stringify(frames.slice(0, 3)));
  t.ok(frames.some((f) => f.first - f.last > 0.05), `${at}: the chips stagger in`);
  t.ok(frames.at(-1).panel === 1 && frames.at(-1).last === 1, `${at}: the panel ends fully shown`);

  // Hover selects and holds while the pointer stays on the loop.
  await page.hover('#skills [data-loop-tab][data-pos="3"]');
  const hovered = await page.waitFor(isSelected, { args: [3], timeout: 1000 });
  t.ok(hovered, `${at}: hovering a node selects it`);
  await page.settle();
  const hoverLabel = await page.eval(() => document.documentElement.classList.contains('cursor-hover'));
  t.ok(hoverLabel, `${at}: the cursor ring expands over a node`);
  if (long) {
    await sleep(6000);
    t.eq(await page.eval(selectedIndex), 3, `${at}: auto-cycle is paused while hovering`);
    await page.moveMouse(5, 500);
    await sleep(7000);
    t.eq(await page.eval(selectedIndex), 3, `${at}: still paused 7s after the pointer left`);
    const resumed = await page.waitFor(isSelected, { args: [0], timeout: 8000 });
    t.ok(resumed, `${at}: auto-cycling resumes after the pointer leaves`);
  }
  await page.moveMouse(5, 500);

  // Keyboard: arrows, Home, End; selection follows focus; visible focus ring.
  await page.eval(() => document.querySelector('#skills [data-loop-tab][aria-selected="true"]').focus());
  await page.eval(() => document.querySelector('#skills [data-loop-tab][data-pos="0"]').focus());
  const keys = [];
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Home', 'End']) {
    await page.press(key);
    keys.push([await page.eval(selectedIndex), await page.eval(() => document.activeElement.dataset.pos)]);
  }
  t.eq(keys, [[1, '1'], [2, '2'], [1, '1'], [0, '0'], [3, '3'], [0, '0'], [3, '3']], `${at}: arrow keys, Home and End move and select (wrapping)`);
  const ring = await page.eval(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, width: s.outlineWidth, visible: document.activeElement.matches(':focus-visible') };
  });
  t.eq(ring, { style: 'solid', width: '2px', visible: true }, `${at}: focused node shows a 2px focus ring`);
  await sleep(5600);
  t.eq(await page.eval(selectedIndex), 3, `${at}: keyboard focus on the tabs pauses auto-cycling`);

  // Offscreen: the orbit stops.
  await page.eval(() => document.activeElement.blur());
  await page.eval(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(300);
  const paused = await page.eval(() => document.querySelector('#skills [data-loop]').hasAttribute('data-paused'));
  const b1 = await page.eval(orbitAngle);
  await sleep(400);
  t.ok(paused && (await page.eval(orbitAngle)) === b1, `${at}: the pulse stops while the section is offscreen`);

  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

async function checkMobile(t, browser, route, width) {
  const at = `${route.path} @${width}`;
  const page = await browser.newPage({ width, height: 900 });
  await page.reducedMotion(false);
  await page.goto(`${route.baseUrl}${route.path}`);
  await page.eval(scrollToLoop);
  const m = await page.eval(readMobile);
  t.eq(m.mode, 'accordion', `${at}: stepper accordion layout`);
  t.eq(m.ringDisplay, 'none', `${at}: no ring`);
  t.ok(m.steps.every((s) => s.triggerShown && s.h3 === 'H3' && s.controls && s.role === 'region' && s.labelledby), `${at}: step buttons in headings control their regions`);
  t.eq(m.steps.map((s) => [s.expanded, s.hidden]), [['true', false], ['false', true], ['false', true], ['false', true]], `${at}: the first step is open`);
  t.eq(m.pulse, 'loop-drop', `${at}: the pulse runs down the line`);
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);

  await page.click('#skills [data-loop-step]:nth-child(3) [data-loop-trigger]');
  t.eq(await page.eval(openIndex), 2, `${at}: tapping a step opens it and closes the others`);
  // The node on the line is part of the button's hit area.
  const node = await page.center('#skills [data-loop-step]:nth-child(2) .loop-step-node');
  await page.click(node);
  t.eq(await page.eval(openIndex), 1, `${at}: tapping a node opens its step`);
  if (width === 390) {
    await sleep(5600);
    t.eq(await page.eval(openIndex), 1, `${at}: no auto-cycling`);
    const contrast = await page.eval(readContrast);
    t.eq(contrast.low, [], `${at}: every text meets 4.5:1`);
  }
  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

async function checkReduced(t, browser, route) {
  for (const width of [1440, 390]) {
    const at = `${route.path} @${width} reduced motion`;
    const page = await browser.newPage({ width, height: 900 });
    await page.reducedMotion(true);
    await page.goto(`${route.baseUrl}${route.path}`);
    await page.eval(scrollToLoop);
    const state = await page.eval(() => {
      const root = document.querySelector('#skills [data-loop]');
      return {
        motion: root.hasAttribute('data-motion'),
        orbit: getComputedStyle(root.querySelector('[data-loop-orbit]')).display,
        pulse: getComputedStyle(root.querySelector('.loop-step-line'), '::after').display,
      };
    });
    t.eq(state, { motion: false, orbit: 'none', pulse: 'none' }, `${at}: no pulse`);
    if (width === 1440) {
      await sleep(5600);
      t.eq(await page.eval(selectedIndex), 0, `${at}: no auto-cycle, first pillar stays selected`);
      await page.click('#skills [data-loop-tab][data-pos="1"]');
      const frames = await page.eval(sampleSwitch);
      t.ok(frames.every((f) => f.panel === 1 && f.last === 1), `${at}: switching is instant`);
    } else {
      t.eq(await page.eval(openIndex), 0, `${at}: first step open`);
    }
    await page.close();
  }
}

async function checkNoJs(t, browser, route) {
  const at = `${route.path} @1440 without JS`;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  const before = page.loads;
  await page.send('Page.navigate', { url: `${route.baseUrl}${route.path}` });
  while (page.loads <= before) await sleep(20);
  await page.send('DOM.enable');
  await page.send('CSS.enable');
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const style = async (selector) => {
    const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const out = [];
    for (const nodeId of nodeIds) {
      const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
      const get = (name) => computedStyle.find((p) => p.name === name)?.value;
      out.push(`${get('display')}/${get('visibility')}`);
    }
    return out;
  };
  t.eq(await style('#skills [data-loop-ring]'), ['none/visible'], `${at}: no ring`);
  const shown = (list) => list.length === 4 && list.every((v) => !v.startsWith('none') && v.endsWith('/visible'));
  t.ok(shown(await style('#skills [data-loop-step]')), `${at}: all four pillars render`);
  t.ok(shown(await style('#skills [data-loop-body]')), `${at}: every description and chip list is visible`);
  t.ok(shown(await style('#skills .loop-step-static')), `${at}: every stage and title is visible`);
  t.ok((await style('#skills [data-loop-trigger]')).every((v) => v.startsWith('none')), `${at}: no dead buttons`);
  await page.close();
}

export default {
  name: 'Skills loop',
  async run({ browser, baseUrl, routes, t }) {
    for (const r of routes) {
      const route = { ...r, baseUrl };
      for (const width of DESKTOP) await checkDesktop(t, browser, route, width);
      await checkBehaviour(t, browser, route, route.locale === 'en');
      for (const width of MOBILE) await checkMobile(t, browser, route, width);
      await checkReduced(t, browser, route);
      await checkNoJs(t, browser, route);
    }
  },
};

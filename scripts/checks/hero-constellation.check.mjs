/**
 * Hero constellation, entrance and typewriter (src/scripts/constellation.ts, src/scripts/hero.ts),
 * in every locale.
 *
 * - Constellation: a canvas is inserted behind the diagram, aria-hidden and pointer-events: none
 *   (clicks and selection pass through), sized to the diagram plus its bleed, its backing store
 *   scaled by devicePixelRatio. It animates while the hero is visible and stops (frozen pixels,
 *   data-constellation="paused") when the hero scrolls offscreen or the tab is hidden, then
 *   resumes. The SVG's static edges fade out; the localized nodes and hub stay in the DOM above
 *   the canvas. The cursor repels nearby particles and parallaxes the canvas by at most 7px.
 * - Entrance: once the fonts are loaded, the H1 is split into masked lines that rise one after
 *   another; the status line and the CTAs follow; SplitText is reverted at the end.
 * - Typewriter: cycles content.profile.roles after the status text with a blinking mono block
 *   cursor, without changing the status line's size; screen readers get the full list once.
 * - Under prefers-reduced-motion and without JS: no canvas, the static diagram with its edges,
 *   the first role rendered statically and a steady cursor.
 */
import { sleep } from './lib/browser.mjs';
import { normalize } from './lib/context.mjs';

/** Records the H1 split and the copy's opacity on every frame for the first 3.5s after load. */
const TRACE = `(() => {
  window.__heroTrace = [];
  const start = performance.now();
  const sample = () => {
    const hero = document.getElementById('top');
    const h1 = hero && hero.querySelector('h1');
    if (h1) {
      const masks = [...h1.children].filter((el) => el.tagName === 'DIV');
      const opacity = (sel) => Number(getComputedStyle(hero.querySelector(sel)).opacity);
      window.__heroTrace.push({
        t: performance.now() - start,
        fonts: document.fonts.status,
        overflow: masks.map((m) => getComputedStyle(m).overflow),
        lines: masks.map((m) => {
          const line = m.firstElementChild;
          return line ? new DOMMatrix(getComputedStyle(line).transform).f / line.getBoundingClientRect().height : null;
        }),
        h1: Number(getComputedStyle(h1).opacity),
        status: opacity('.hero-status'),
        ctas: opacity('.hero-ctas'),
      });
    }
    if (performance.now() - start < 3500) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();`;

const readCanvas = () => {
  const wrapper = document.querySelector('[data-hero-diagram]');
  const canvas = wrapper?.querySelector('canvas');
  const svg = wrapper?.querySelector('svg.system-diagram');
  if (!canvas) return { canvas: false, edges: [...document.querySelectorAll('#top .sd-edge')].map((e) => getComputedStyle(e).opacity) };
  const cs = getComputedStyle(canvas);
  const box = canvas.getBoundingClientRect();
  const svgBox = svg.getBoundingClientRect();
  const node = svg.querySelector('.sd-node rect').getBoundingClientRect();
  // A point inside the canvas bleed, outside the diagram, and the middle of the first node.
  const bleed = document.elementFromPoint(box.left + 12, svgBox.top + svgBox.height / 2);
  const onNode = document.elementFromPoint(node.left + node.width / 2, node.top + node.height / 2);
  return {
    canvas: true,
    state: wrapper.dataset.constellation,
    ariaHidden: canvas.getAttribute('aria-hidden'),
    pointerEvents: cs.pointerEvents,
    userSelect: cs.userSelect,
    position: cs.position,
    behind: canvas.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING && getComputedStyle(svg).position === 'relative',
    cssWidth: parseFloat(canvas.style.width),
    cssHeight: parseFloat(canvas.style.height),
    backing: [canvas.width, canvas.height],
    dpr: devicePixelRatio,
    covers: box.width > svgBox.width && box.height > svgBox.height,
    bleedHit: bleed === canvas ? 'canvas' : bleed?.tagName,
    nodeHit: onNode?.closest('svg') === svg,
    edges: [...svg.querySelectorAll('.sd-edge, .sd-dash')].map((e) => getComputedStyle(e).opacity),
    texts: [...svg.querySelectorAll('.sd-node text, .sd-hub text')].map((el) => el.textContent.trim()),
  };
};

/** Sum of every pixel byte: changes whenever anything on the canvas moves. */
const canvasHash = () => {
  const canvas = document.querySelector('[data-hero-diagram] canvas');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 7) sum = (sum + data[i] * (i % 251)) % 1e9;
  return sum;
};

const frames = (n = 4) => new Promise((resolve) => {
  const go = (k) => (k ? requestAnimationFrame(() => go(k - 1)) : resolve());
  go(n);
});

/** Pixels brighter than the hub glow within `r` px of a viewport point, summed over `samples` frames. */
const litAround = (x, y, r, samples) =>
  new Promise((resolve) => {
    const canvas = document.querySelector('[data-hero-diagram] canvas');
    const ctx = canvas.getContext('2d');
    let lit = 0;
    let left = samples;
    const read = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = canvas.width / box.width;
      const cx = (x - box.left) * dpr;
      const cy = (y - box.top) * dpr;
      const rr = r * dpr;
      const data = ctx.getImageData(Math.round(cx - rr), Math.round(cy - rr), Math.round(rr * 2), Math.round(rr * 2)).data;
      const side = Math.round(rr * 2);
      for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % side;
        const py = Math.floor(i / 4 / side);
        if ((px - rr) ** 2 + (py - rr) ** 2 <= rr * rr && data[i + 3] > 128) lit++;
      }
      if (--left) setTimeout(read, 150);
      else resolve(lit);
    };
    read();
  });

/** Midpoint of the hub → first node spoke, in viewport coordinates. */
const spokeMid = () => {
  const svg = document.querySelector('#top svg.system-diagram');
  const hub = svg.querySelector('.sd-hub circle:nth-of-type(2)').getBoundingClientRect();
  const node = svg.querySelector('.sd-node rect').getBoundingClientRect();
  return {
    x: (hub.left + hub.width / 2 + node.left + node.width / 2) / 2,
    y: (hub.top + hub.height / 2 + node.top + node.height / 2) / 2,
  };
};

const parallaxOffset = () => {
  const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-hero-diagram] canvas')).transform);
  return [m.e, m.f];
};

async function checkConstellation(t, browser, url, route) {
  const at = `${route.path} constellation`;
  const { diagram } = route.content;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  await page.moveMouse(5, 895);

  const c = await page.eval(readCanvas);
  t.ok(c.canvas, `${at}: a canvas is inserted behind the diagram`);
  if (!c.canvas) return page.close();
  t.eq(c.state, 'running', `${at}: animation loop runs while the hero is visible`);
  t.eq(c.ariaHidden, 'true', `${at}: canvas is hidden from assistive tech`);
  t.eq([c.position, c.pointerEvents, c.userSelect], ['absolute', 'none', 'none'], `${at}: canvas ignores the pointer and selection`);
  t.ok(c.behind, `${at}: diagram paints above the canvas`);
  t.ok(c.covers, `${at}: canvas covers the diagram and bleeds past it`);
  t.ok(c.bleedHit !== 'canvas', `${at}: clicks over the canvas reach the page`, c.bleedHit);
  t.ok(c.nodeHit, `${at}: discipline nodes stay on top and hit-testable`);
  t.eq(c.backing, [Math.round(c.cssWidth * c.dpr), Math.round(c.cssHeight * c.dpr)], `${at}: backing store matches CSS size × DPR (1x)`);
  const expected = [...diagram.nodes.slice(0, 4).flatMap((n) => [n.title, n.sub]), diagram.center, diagram.centerSub];
  t.eq([...c.texts].sort(), [...expected].sort(), `${at}: nodes and hub stay as localized DOM text`);
  await sleep(1400);
  t.ok((await page.eval(readCanvas)).edges.every((o) => o === '0'), `${at}: static SVG edges give way to the particle network`);

  const a = await page.eval(canvasHash);
  await page.eval(frames, 6);
  t.ok(a !== (await page.eval(canvasHash)), `${at}: particles move between frames`);

  // Pointer: repel around the cursor and a small parallax.
  const mid = await page.eval(spokeMid);
  const free = await page.eval(litAround, mid.x, mid.y, 26, 10);
  await page.moveMouse(Math.round(mid.x), Math.round(mid.y));
  await sleep(1500);
  const repelled = await page.eval(litAround, mid.x, mid.y, 26, 10);
  t.ok(free > 0 && repelled < free * 0.25, `${at}: particles near the cursor are repelled`, `lit px ${free} → ${repelled}`);
  const [px, py] = await page.eval(parallaxOffset);
  t.ok(Math.hypot(px, py) > 0.5 && Math.abs(px) <= 7.01 && Math.abs(py) <= 7.01, `${at}: canvas parallaxes a few px with the pointer`, `${px}, ${py}`);
  t.note(`${at}: lit px near the spoke ${free} free / ${repelled} under the cursor, parallax ${px.toFixed(1)}, ${py.toFixed(1)}px`);

  // Offscreen: the loop stops and the pixels freeze; back on screen it resumes.
  await page.eval(() => window.scrollTo(0, document.getElementById('top').offsetHeight + 400));
  const paused = await page.waitFor(() => document.querySelector('[data-hero-diagram]').dataset.constellation === 'paused', { timeout: 2000 });
  t.ok(paused, `${at}: loop pauses when the hero is offscreen`);
  const h1 = await page.eval(canvasHash);
  await sleep(300);
  t.eq(await page.eval(canvasHash), h1, `${at}: nothing is drawn while offscreen`);
  await page.eval(() => window.scrollTo(0, 0));
  t.ok(await page.waitFor(() => document.querySelector('[data-hero-diagram]').dataset.constellation === 'running', { timeout: 2000 }), `${at}: loop resumes back on screen`);

  // Hidden tab (visibilitychange): same.
  await page.eval(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  t.eq(await page.eval(() => document.querySelector('[data-hero-diagram]').dataset.constellation), 'paused', `${at}: loop pauses when the tab is hidden`);
  const h2 = await page.eval(canvasHash);
  await sleep(300);
  t.eq(await page.eval(canvasHash), h2, `${at}: nothing is drawn while the tab is hidden`);
  await page.eval(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  t.eq(await page.eval(() => document.querySelector('[data-hero-diagram]').dataset.constellation), 'running', `${at}: loop resumes when the tab is visible`);

  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();

  // Retina: the backing store doubles.
  const hi = await browser.newPage({ width: 1440, height: 900 });
  await hi.reducedMotion(false);
  await hi.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await hi.goto(url);
  const r = await hi.eval(readCanvas);
  t.ok(r.canvas && r.dpr === 2, `${at} @2x: canvas rendered`);
  if (r.canvas) t.eq(r.backing, [Math.round(r.cssWidth * 2), Math.round(r.cssHeight * 2)], `${at} @2x: backing store matches CSS size × DPR`);
  await hi.close();

  // Mobile: still inside the hero, no horizontal scroll.
  const small = await browser.newPage({ width: 390, height: 900 });
  await small.reducedMotion(false);
  await small.goto(url);
  const s = await small.eval(() => ({
    canvas: !!document.querySelector('[data-hero-diagram] canvas'),
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  t.ok(s.canvas && s.hscroll <= 0, `${route.path} @390 constellation: renders without horizontal scroll`, JSON.stringify(s));
  await small.close();
}

async function checkEntrance(t, browser, url, route) {
  const at = `${route.path} entrance`;
  const { profile } = route.content;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: TRACE });
  await page.goto(url);
  await sleep(3600);
  const trace = await page.eval(() => window.__heroTrace);
  // Frames where the split H1 is on screen (the split happens one frame before the H1 is shown).
  const split = trace.filter((f) => f.lines.length > 0 && f.h1 > 0);
  t.ok(split.length > 0 && split[0].lines.length >= 2, `${at}: the H1 is split into lines`, `${split[0]?.lines.length} lines`);
  if (split.length) {
    t.eq(split[0].fonts, 'loaded', `${at}: the split waits for the fonts`);
    t.ok(split.every((f) => f.overflow.every((o) => o === 'hidden' || o === 'clip')), `${at}: each line is clipped by its mask`);
    t.ok(split[0].lines.every((y) => y > 0.5), `${at}: lines start below their mask`, JSON.stringify(split[0].lines));
    const settledAt = split[0].lines.map((_, i) => split.find((f) => f.lines[i] < 0.02)?.t ?? Infinity);
    t.ok(settledAt.every((v, i) => Number.isFinite(v) && (i === 0 || v > settledAt[i - 1])), `${at}: lines rise one after another`, JSON.stringify(settledAt.map(Math.round)));
    const firstMove = split.find((f) => f.lines[0] < split[0].lines[0] - 0.01)?.t ?? 0;
    const statusAt = trace.find((f) => f.status > 0.05)?.t ?? Infinity;
    const ctasAt = trace.find((f) => f.ctas > 0.05)?.t ?? Infinity;
    t.ok(statusAt > firstMove && ctasAt >= statusAt, `${at}: status line and CTAs follow the headline`, JSON.stringify({ firstMove, statusAt, ctasAt }));
    t.note(`${at}: lines settle at ${settledAt.map(Math.round).join('/')}ms, status from ${Math.round(statusAt)}ms, CTAs from ${Math.round(ctasAt)}ms`);
  }
  const end = await page.eval(() => {
    const hero = document.getElementById('top');
    const h1 = hero.querySelector('h1');
    return {
      children: h1.children.length,
      text: h1.textContent,
      styles: [...hero.querySelectorAll('.hero-status, .hero-title, .hero-ctas')].map((el) => [getComputedStyle(el).opacity, getComputedStyle(el).transform]),
    };
  });
  t.eq([end.children, normalize(end.text)], [0, normalize(profile.headline)], `${at}: the split is reverted to plain text`);
  t.ok(end.styles.every(([o, tr]) => o === '1' && tr === 'none'), `${at}: copy ends visible and untransformed`, JSON.stringify(end.styles));
  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

const readTypewriter = (target, timeout) =>
  new Promise((resolve) => {
    const root = document.querySelector('[data-typewriter]');
    const out = root.querySelector('[data-typewriter-text]');
    const status = document.querySelector('.hero-status');
    const sizes = new Set();
    const seen = new Set();
    const start = performance.now();
    const tick = () => {
      const s = status.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      sizes.add(`${Math.round(s.height)}x${Math.round(b.width)}`);
      seen.add(out.textContent);
      if (out.textContent === target || performance.now() - start > timeout) {
        const cursor = getComputedStyle(root.querySelector('.hero-cursor'));
        resolve({
          text: out.textContent,
          partial: [...seen].some((v) => v.length > 0 && target.startsWith(v) && v !== target),
          sizes: [...sizes],
          cursor: { animation: cursor.animationName, font: cursor.fontFamily, width: parseFloat(cursor.width) },
          sr: root.querySelector('.sr-only').textContent,
          liveHidden: out.closest('[aria-hidden="true"]') !== null,
        });
      } else requestAnimationFrame(tick);
    };
    tick();
  });

async function checkTypewriter(t, browser, url, route) {
  const at = `${route.path} typewriter`;
  const { roles } = route.content.profile;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  t.eq(await page.eval(() => document.querySelector('[data-typewriter-text]').textContent), roles[0], `${at}: starts on the first role`);
  const r = await page.eval(readTypewriter, roles[1], 9000);
  t.eq(r.text, roles[1], `${at}: types the next localized role`);
  t.ok(r.partial, `${at}: the role is typed character by character`);
  t.eq(r.sizes.length, 1, `${at}: typing never resizes the status line`, JSON.stringify(r.sizes));
  t.eq(r.cursor.animation, 'hero-blink', `${at}: block cursor blinks`);
  t.ok(r.cursor.font.includes('JetBrains Mono') && r.cursor.width > 4, `${at}: cursor is a JetBrains Mono block`, JSON.stringify(r.cursor));
  t.eq(r.sr, roles.join(', '), `${at}: screen readers get every role once`);
  t.ok(r.liveHidden, `${at}: the animated text is aria-hidden`);
  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

async function checkReducedMotion(t, browser, url, route) {
  const at = `${route.path} reduced motion`;
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(true);
  await page.goto(url);
  await sleep(2500);
  const s = await page.eval(() => ({
    canvas: document.querySelectorAll('#top canvas').length,
    edges: [...document.querySelectorAll('#top .sd-edge')].map((e) => getComputedStyle(e).opacity),
    text: document.querySelector('[data-typewriter-text]').textContent,
    cursor: getComputedStyle(document.querySelector('.hero-cursor')).animationName,
    h1Children: document.querySelector('#top h1').children.length,
  }));
  t.eq(s.canvas, 0, `${at}: no constellation canvas`);
  t.ok(s.edges.length > 0 && s.edges.every((o) => o === '1'), `${at}: the static diagram keeps its edges`);
  t.eq([s.text, s.cursor], [route.content.profile.roles[0], 'none'], `${at}: first role, steady cursor`);
  t.eq(s.h1Children, 0, `${at}: the H1 is never split`);
  t.eq(page.errors, [], `${at}: no page errors`);
  await page.close();
}

async function checkNoJs(t, browser, url, route) {
  const at = `${route.path} no JS`;
  const page = await browser.newPage({ width: 1440, height: 900 });
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
  const q = (selector) => page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector }).then((r) => r.nodeIds);
  const canvases = await q('#top canvas');
  const [typed] = await q('[data-typewriter-text]');
  const { outerHTML } = await page.send('DOM.getOuterHTML', { nodeId: typed });
  const opacities = [];
  for (const nodeId of await q('#top .sd-edge, #top .hero-status, #top .hero-title, #top .hero-ctas')) {
    const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
    opacities.push(computedStyle.find((p) => p.name === 'opacity')?.value);
  }
  t.eq(canvases.length, 0, `${at}: no canvas`);
  t.eq(outerHTML.replace(/<[^>]+>/g, ''), route.content.profile.roles[0], `${at}: first role rendered statically`);
  t.ok(opacities.length > 0 && opacities.every((o) => o === '1'), `${at}: copy and static diagram fully visible`, JSON.stringify(opacities));
  await page.close();
}

export default {
  name: 'Hero constellation, entrance and typewriter',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const url = baseUrl + route.path;
      await checkConstellation(t, browser, url, route);
      await checkEntrance(t, browser, url, route);
      await checkTypewriter(t, browser, url, route);
      await checkReducedMotion(t, browser, url, route);
      await checkNoJs(t, browser, url, route);
    }
  },
};

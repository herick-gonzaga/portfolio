/**
 * QA pass over the whole interaction layer (motion foundation, hero entrance + typewriter,
 * constellation, card tilt / spotlight, magnetic CTAs, count-ups, journey timeline, skills loop,
 * impact ledger, terminal, custom cursor), in every locale:
 *
 * - Reduced motion (set before load): no Lenis, no progress bar, no cursor, no canvas, no running
 *   CSS or Web Animations after a full scroll, no requestAnimationFrame loop while idle, the
 *   typewriter frozen, counters on their final text, every [data-reveal] element at full opacity,
 *   no tilt or magnetic offset under a mouse, and every text element in <main> fully visible.
 * - No JS: every section has content and no text element in <main> is transparent or hidden.
 * - Touch (390px, coarse pointer, no hover, touch events): no cursor elements, no magnetic offset
 *   and no tilt after taps, the terminal runs a command from the keyboard and from a quick-command
 *   button, and the hero canvas uses the reduced particle budget and keeps up at 4× CPU throttling.
 * - Motion allowed: zero cumulative layout shift from load through a full scroll (entrance,
 *   typewriter, reveals, counters, timeline, ledger), the constellation pauses offscreen and while
 *   the tab is hidden, and the skills loop does too.
 * - No console errors or uncaught exceptions on any of the above.
 * - The three locale files have the same keys, and nothing rendered on /pt/ or /es/ (text,
 *   aria-label, title, alt, placeholder, terminal output) is English left over from the markup.
 */
import { sleep } from './lib/browser.mjs';
import { ROUTES } from './lib/context.mjs';

/** Counts requestAnimationFrame calls and records layout shifts and console errors. */
/** QA_DEBUG=1 prints progress to stderr. */
const log = (...args) => process.env.QA_DEBUG && console.error('[motion-qa]', ...args);

const PROBE = `(() => {
  window.__qa = { raf: 0, shifts: [], errors: [] };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__qa.raf++; return raf(cb); };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__qa.shifts.push({
        value: e.value,
        sources: (e.sources || []).map((s) => s.node ? (s.node.id || s.node.className || s.node.nodeName) + '' : '?'),
      });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  const error = console.error.bind(console);
  console.error = (...args) => { window.__qa.errors.push(args.map(String).join(' ')); error(...args); };
  addEventListener('error', (e) => window.__qa.errors.push(String(e.message || (e.target && e.target.src) || e)), true);
  addEventListener('unhandledrejection', (e) => window.__qa.errors.push('unhandled: ' + String(e.reason)));
})();`;

async function openPage(browser, { width = 1440, height = 900, language = 'en-US', reduced = false, js = true, touch = false } = {}) {
  const page = await browser.newPage({ width, height, language });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  // Failed requests and other browser-level errors land here, not in console.error.
  page.logErrors = [];
  page.connection.on((message) => {
    if (message.sessionId !== page.sessionId || message.method !== 'Log.entryAdded') return;
    const { level, text, url } = message.params.entry;
    if (level === 'error' && !/Content Security Policy/i.test(text)) page.logErrors.push(`${text} ${url ?? ''}`.trim());
  });
  const features = [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }];
  if (touch) {
    features.push({ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-hover', value: 'none' }, { name: 'any-pointer', value: 'coarse' });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  await page.send('Emulation.setEmulatedMedia', { features });
  if (!js) await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  return page;
}

/** Scrolls the whole page in steps (native scroll, so it works with or without Lenis). */
async function scrollThrough(page, stepMs = 120) {
  const height = await page.eval(() => document.documentElement.scrollHeight);
  const vh = await page.eval(() => innerHeight);
  for (let y = 0; y <= height; y += Math.round(vh * 0.6)) {
    await page.eval((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await sleep(stepMs);
  }
}

/** Text elements in <main> (or the whole body) whose effective opacity is < 1 or that are hidden. */
function invisibleText() {
  // Collapsed disclosure / inactive tab panels are hidden on purpose; their controls stay reachable.
  const controlled = [...document.querySelectorAll('[aria-controls]')].flatMap((c) => c.getAttribute('aria-controls').split(/\s+/));
  const regions = controlled.map((id) => document.getElementById(id)).filter(Boolean);
  const skip = (el) =>
    el.closest('.sr-only, [hidden], [aria-hidden="true"], template, script, style, noscript, dialog:not([open]), [inert]') ||
    regions.some((r) => r.contains(el));
  const out = [];
  for (const el of document.querySelectorAll('main *, footer *')) {
    if (skip(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    if (el.getClientRects().length === 0) continue; // display: none (e.g. a breakpoint variant)
    let opacity = 1;
    let hidden = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      opacity *= Number.parseFloat(cs.opacity);
      if (cs.visibility === 'hidden' || cs.clipPath === 'inset(100%)') hidden = true;
    }
    if (opacity < 0.99 || hidden) out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${el.textContent.trim().slice(0, 30)}" (opacity ${opacity.toFixed(2)}${hidden ? ', hidden' : ''})`);
  }
  return out;
}

/** Motion library chunks the page has requested. */
const MOTION_CHUNKS = () =>
  performance
    .getEntriesByType('resource')
    .map((e) => e.name.split('/').pop())
    .filter((n) => /gsap|ScrollTrigger|SplitText|lenis/i.test(n));

function readQa() {
  return {
    raf: window.__qa.raf,
    cls: window.__qa.shifts.reduce((s, e) => s + e.value, 0),
    shifts: window.__qa.shifts,
    errors: window.__qa.errors,
  };
}

/* ---------- Locale parity ---------- */

function keyPaths(value, prefix = '') {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => keyPaths(v, `${prefix}[${i}]`))];
  if (value && typeof value === 'object') return Object.keys(value).sort().flatMap((k) => keyPaths(value[k], prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

/** Every rendered string a user (or a screen reader) can meet, terminal answers included. */
function renderedStrings() {
  const out = new Set();
  const add = (s) => {
    const v = (s ?? '').replace(/\s+/g, ' ').trim();
    if (v && /[a-z]{3}/i.test(v)) out.add(v);
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    // Text marked as another language (the switcher's endonyms) is meant to stay as is.
    const foreign = parent?.closest('[lang]') && parent.closest('[lang]') !== document.documentElement;
    if (parent && !foreign && !parent.closest('script, style')) add(walker.currentNode.textContent);
  }
  for (const el of document.querySelectorAll('[aria-label], [title], [alt], [placeholder], [aria-description], [data-roles]')) {
    for (const attr of ['aria-label', 'title', 'alt', 'placeholder', 'aria-description']) add(el.getAttribute(attr));
  }
  // Every terminal answer (also the ones not run), straight from the JSON data block.
  const data = document.querySelector('[data-terminal-data]');
  if (data) {
    // Printed text only: segment text (`t`) and plain strings, not tones, hrefs or the prompt key.
    const walk = (v, key) => {
      if (typeof v === 'string') return ['k', 'href', 'hireMail', 'prompt', 'commands'].includes(key) ? null : add(v);
      if (Array.isArray(v)) return v.forEach((x) => walk(x));
      if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, k));
    };
    walk(JSON.parse(data.textContent));
  }
  add(document.title);
  add(document.querySelector('meta[name="description"]')?.content);
  return [...out];
}

export default {
  name: 'Interaction layer QA (reduced motion, no JS, touch, CLS, pausing, errors, locale parity)',
  async run({ browser, baseUrl, routes, t }) {
    const allErrors = [];
    const collect = async (page, label) => {
      const qa = await page.eval(readQa).catch(() => ({ errors: [] }));
      const errors = [...qa.errors, ...page.errors, ...page.logErrors];
      if (errors.length) allErrors.push(`${label}: ${errors.join(' | ')}`);
      return qa;
    };

    /* ---------- Locale parity (files) ---------- */
    const [en, pt, es] = ROUTES.map((r) => r.content);
    const enKeys = keyPaths(en);
    for (const [code, content] of [['pt', pt], ['es', es]]) {
      const keys = new Set(keyPaths(content));
      const missing = enKeys.filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !enKeys.includes(k));
      t.ok(missing.length === 0 && extra.length === 0, `${code}: same keys as en`, `missing ${missing.slice(0, 10).join(', ')}; extra ${extra.slice(0, 10).join(', ')}`);
    }

    const rendered = {};
    for (const route of routes) {
      const label = route.path;

      /* ---------- Motion allowed: CLS, pausing ---------- */
      {
        log(label, 'Motion allowed: CLS, pausing');
        const page = await openPage(browser, { language: route.lang });
        await page.goto(`${baseUrl}${route.path}`);
        // Hero entrance, then at least one typewriter cycle.
        await sleep(4500);
        const hero = await page.eval(() => document.querySelector('[data-hero-diagram]')?.dataset.constellation ?? null);
        t.eq(hero, 'running', `${label} constellation runs while the hero is on screen`);
        await scrollThrough(page, 250);
        await sleep(1800); // counters, ledger scramble, timeline
        t.eq(await page.eval(() => document.querySelector('[data-hero-diagram]')?.dataset.constellation), 'paused', `${label} constellation pauses offscreen`);
        const loopPaused = await page.eval(() => {
          const loop = document.querySelector('[data-loop]');
          return loop ? loop.hasAttribute('data-paused') : null;
        });
        t.ok(loopPaused !== false, `${label} skills loop pauses offscreen`, `data-paused ${loopPaused}`);
        // Terminal output is part of the rendered copy.
        await page.eval(() => document.querySelector('[data-terminal] input')?.focus());
        await page.waitFor(() => document.querySelector('[data-terminal]') && window.__qa);
        for (const cmd of await page.eval(() => [...document.querySelectorAll('[data-terminal-run]')].map((b) => b.dataset.terminalRun).filter((c) => !c.startsWith('sudo')))) {
          // `sudo hire-me` opens a mailto: link, which blocks headless Chrome; its text is read from the data block below.
          await page.eval((c) => document.querySelector(`[data-terminal-run="${c}"]`).click(), cmd);
          await sleep(900);
        }
        log(label, 'terminal done');
        rendered[route.locale] = await page.eval(renderedStrings);
        rendered.shell = await page.eval(() => {
          const data = JSON.parse(document.querySelector('[data-terminal-data]')?.textContent ?? '{}');
          const prompt = (data.prompt ?? '').trim();
          return [prompt, `${prompt} ~`, `${prompt}:~$`, ...(data.commands ?? [])].concat(
            [...document.querySelectorAll('[data-terminal-run]')].map((b) => b.dataset.terminalRun),
          );
        });

        await page.eval(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await sleep(400);
        t.eq(await page.eval(() => document.querySelector('[data-hero-diagram]')?.dataset.constellation), 'running', `${label} constellation resumes on screen`);
        // Tab hidden: report it the way a real background tab does.
        await page.eval(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await sleep(300);
        t.eq(await page.eval(() => document.querySelector('[data-hero-diagram]')?.dataset.constellation), 'paused', `${label} constellation pauses while the tab is hidden`);

        const qa = await collect(page, `${label} motion`);
        t.ok(qa.cls < 0.001, `${label} zero layout shift from load through a full scroll`, `CLS ${qa.cls?.toFixed(4)}: ${JSON.stringify(qa.shifts?.slice(0, 5))}`);
        await page.close();
      }

      /* ---------- Reduced motion ---------- */
      {
        log(label, 'Reduced motion');
        const page = await openPage(browser, { language: route.lang, reduced: true });
        await page.goto(`${baseUrl}${route.path}`);
        await sleep(1200);
        const typed0 = await page.eval(() => document.querySelector('[data-typewriter-text]')?.textContent);
        const statics = await page.eval(() => ({
          lenis: document.documentElement.classList.contains('lenis'),
          bar: Boolean(document.querySelector('.scroll-progress')),
          cursor: Boolean(document.querySelector('.cursor-dot, .cursor-ring')),
          canvas: Boolean(document.querySelector('[data-hero-diagram] canvas')),
        }));
        t.eq(statics, { lenis: false, bar: false, cursor: false, canvas: false }, `${label} reduced motion: no smooth scroll, progress bar, cursor or canvas`);
        t.eq(await page.eval(MOTION_CHUNKS), [], `${label} reduced motion: GSAP and Lenis are never downloaded`);
        await scrollThrough(page, 150);
        await sleep(600);
        const running = await page.eval(() =>
          document
            .getAnimations()
            .filter((a) => a.playState === 'running')
            .map((a) => `${a.animationName || a.transitionProperty || 'anim'} on ${a.effect?.target?.className || a.effect?.target?.tagName}`),
        );
        t.eq(running, [], `${label} reduced motion: no running CSS animations or transitions after a full scroll`);
        const before = await page.eval(() => window.__qa.raf);
        await sleep(2500);
        const rafIdle = (await page.eval(() => window.__qa.raf)) - before;
        t.ok(rafIdle <= 2, `${label} reduced motion: no animation-frame loop while idle`, `${rafIdle} rAF calls in 2.5s`);
        t.eq(await page.eval(() => document.querySelector('[data-typewriter-text]')?.textContent), typed0, `${label} reduced motion: typewriter frozen on the first role`);
        const counters = await page.eval(() =>
          [...document.querySelectorAll('[data-countup]')].filter((el) => !/[1-9]/.test(el.textContent)).map((el) => el.textContent),
        );
        t.eq(counters, [], `${label} reduced motion: every counter shows its final value`);
        const reveals = await page.eval(() =>
          [...document.querySelectorAll('[data-reveal]')]
            .filter((el) => getComputedStyle(el).opacity !== '1' || getComputedStyle(el).transform !== 'none' || el.classList.contains('reveal-pending'))
            .map((el) => el.className),
        );
        t.eq(reveals, [], `${label} reduced motion: every reveal element in its final state`);
        t.eq(await page.eval(invisibleText), [], `${label} reduced motion: all text in main/footer fully visible`);
        // Mouse over a tilt card and next to a magnetic CTA: nothing moves.
        await page.eval(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        const magnet = await page.eval(() => {
          const r = document.querySelector('[data-magnetic]')?.getBoundingClientRect();
          return r ? { x: r.right + 10, y: r.top + r.height / 2 } : null;
        });
        if (magnet) {
          await page.moveMouse(magnet.x, magnet.y);
          await sleep(200);
          const moved = await page.eval(() =>
            [...document.querySelectorAll('[data-magnetic]')].map((b) => getComputedStyle(b).translate).filter((v) => !/^(none|0px( 0px)?)$/.test(v)),
          );
          t.eq(moved, [], `${label} reduced motion: magnetic CTAs do not move`);
        }
        const tilt = await page.eval(() => {
          const card = document.querySelector('[data-tilt]');
          card?.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = card?.getBoundingClientRect();
          return r ? { x: r.left + 8, y: r.top + 8 } : null;
        });
        if (tilt) {
          await page.moveMouse(tilt.x, tilt.y);
          await sleep(500);
          t.eq(await page.eval(() => getComputedStyle(document.querySelector('[data-tilt]')).transform), 'none', `${label} reduced motion: cards do not tilt`);
        }
        await collect(page, `${label} reduced`);
        await page.close();
      }

      /* ---------- No JS ---------- */
      {
        log(label, 'No JS');
        const page = await openPage(browser, { language: route.lang, js: false });
        // page.goto() evaluates in the page, which hangs while scripts are disabled: wait for the
        // load event, then re-enable scripting (the page's own scripts were already skipped).
        const loads = page.loads;
        await page.send('Page.navigate', { url: `${baseUrl}${route.path}` });
        while (page.loads <= loads) await sleep(25);
        await page.send('Emulation.setScriptExecutionDisabled', { value: false });
        await page.settle();
        t.eq(await page.eval(() => document.body.classList.contains('hero-ready')), false, `${label} no JS: page scripts did not run`);
        const empty = await page.eval(() =>
          [...document.querySelectorAll('main section, main > :not(script, style, template)')]
            .filter((s) => s.getBoundingClientRect().height < 40 || !s.innerText.trim())
            .map((s) => s.id || s.className),
        );
        t.eq(empty, [], `${label} no JS: every section renders content`);
        t.eq(await page.eval(invisibleText), [], `${label} no JS: all text in main/footer fully visible`);
        await page.close();
      }

      /* ---------- Touch ---------- */
      {
        log(label, 'Touch');
        const page = await openPage(browser, { width: 390, height: 844, language: route.lang, touch: true });
        await page.goto(`${baseUrl}${route.path}`);
        await sleep(2500);
        const chunks = await page.eval(MOTION_CHUNKS);
        t.ok(!chunks.some((c) => /lenis/i.test(c)), `${label} touch: Lenis is not downloaded (touch scrolling is native)`, chunks.join(', '));
        t.eq(await page.eval(() => document.documentElement.classList.contains('lenis')), false, `${label} touch: no smooth-scroll layer`);
        const tap = async (x, y) => {
          await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          await sleep(40);
          await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        };
        const cta = await page.eval(() => {
          const r = document.querySelector('[data-magnetic]')?.getBoundingClientRect();
          return r ? { x: r.left + r.width / 2, y: r.bottom + 6 } : null;
        });
        if (cta) await tap(cta.x, cta.y);
        const card = await page.eval(() => {
          const el = document.querySelector('[data-tilt]');
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          return { x: r.left + 10, y: r.top + 10 };
        });
        await tap(card.x, card.y);
        await sleep(1200); // let the scroll reveal (a 2D translate) finish
        const state = await page.eval(() => ({
          cursor: Boolean(document.querySelector('.cursor-dot, .cursor-ring')),
          magnet: [...document.querySelectorAll('[data-magnetic]')].some((b) => b.style.getPropertyValue('--magnet-x')),
          tilt: [...document.querySelectorAll('[data-tilt]')].some((c) => c.style.getPropertyValue('--tilt-x') || getComputedStyle(c).transform.startsWith('matrix3d')),
        }));
        t.eq(state, { cursor: false, magnet: false, tilt: false }, `${label} touch: no custom cursor, magnetic offset or tilt`);

        // Terminal: tap the prompt, type, Enter; then a quick-command button.
        const input = await page.eval(() => {
          const el = document.querySelector('[data-terminal] input');
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          return { x: r.left + 20, y: r.top + r.height / 2 };
        });
        await tap(input.x, input.y);
        await page.waitFor(() => document.activeElement?.matches('[data-terminal] input'), { timeout: 2000 });
        const before = await page.eval(() => document.querySelector('[data-terminal] [role="log"]').children.length);
        await page.send('Input.insertText', { text: 'help' });
        await page.press('Enter');
        const grew = await page.waitFor((n) => document.querySelector('[data-terminal] [role="log"]').children.length > n + 1, { args: [before], timeout: 3000 });
        t.ok(grew, `${label} touch: terminal runs a typed command`);
        const button = await page.eval(() => {
          const b = document.querySelectorAll('[data-terminal-run]')[1];
          const r = b.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, n: document.querySelector('[data-terminal] [role="log"]').children.length };
        });
        await tap(button.x, button.y);
        const grew2 = await page.waitFor((n) => document.querySelector('[data-terminal] [role="log"]').children.length > n, { args: [button.n], timeout: 3000 });
        t.ok(grew2, `${label} touch: terminal quick-command button works on tap`);

        // Hero canvas on a phone at 4× CPU throttling.
        await page.eval(() => window.scrollTo({ top: document.querySelector('[data-hero-diagram]').offsetTop - 200, behavior: 'instant' }));
        await sleep(500);
        await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const perf = await page.eval(async () => {
          const wrapper = document.querySelector('[data-hero-diagram]');
          const canvas = wrapper.querySelector('canvas');
          const frames = [];
          let last = performance.now();
          await new Promise((resolve) => {
            const end = last + 2000;
            const step = (now) => {
              frames.push(now - last);
              last = now;
              if (now < end) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          });
          frames.sort((a, b) => a - b);
          const longTasks = performance.getEntriesByType('longtask')?.length ?? 0;
          return {
            state: wrapper.dataset.constellation,
            particles: Number(wrapper.dataset.particles ?? NaN),
            canvasWidth: canvas ? canvas.getBoundingClientRect().width : 0,
            fps: Math.round(1000 / (frames.reduce((s, f) => s + f, 0) / frames.length)),
            p95: Math.round(frames[Math.floor(frames.length * 0.95)]),
            longTasks,
          };
        });
        await page.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        t.note(`${label} touch canvas @4× CPU: ${JSON.stringify(perf)}`);
        t.eq(perf.state, 'running', `${label} touch: constellation runs on a phone`);
        t.ok(perf.particles <= 40, `${label} touch: phone particle budget ≤40`, `${perf.particles}`);
        t.ok(perf.p95 <= 40, `${label} touch: canvas frames p95 ≤40ms at 4× CPU`, `p95 ${perf.p95}ms`);
        await collect(page, `${label} touch`);
        await page.close();
      }
    }

    t.eq(allErrors, [], 'no console errors, failed requests or uncaught exceptions');

    /* ---------- Locale parity (rendered) ---------- */
    const contentStrings = Object.fromEntries(ROUTES.map((r) => [r.locale, new Set(strings(r.content).map((s) => s.replace(/\s+/g, ' ').trim()))]));
    const enSet = new Set(rendered.en ?? []);
    for (const code of ['pt', 'es']) {
      // Same text on the English page and this one, and not a value this locale's file chose to
      // keep identical (names, tech terms): hard-coded copy that never went through src/i18n.
      // Composed strings ("role · company", "© year name") are fine when every word comes from the
      // locale file; shell syntax (prompt, command names) is the same in every language.
      const pieces = [...contentStrings[code]].filter((v) => v.length > 1).sort((a, b) => b.length - a.length);
      const shell = new Set(rendered.shell ?? []);
      const leftovers = (rendered[code] ?? []).filter((s) => {
        if (!enSet.has(s) || contentStrings[code].has(s) || shell.has(s)) return false;
        if (/^[A-Z]{2,5}$/.test(s)) return false; // acronyms (time zone abbreviation)
        if (/^[\w.-]+@[\w.-]+:/.test(s)) return false; // user@host shell paths (terminal title)
        let rest = s;
        for (const piece of pieces) rest = rest.split(piece).join(' ');
        return /[a-z]{3}/i.test(rest.replace(/\b(19|20)\d\d\b/g, ''));
      });
      t.eq(leftovers, [], `${code}: no untranslated rendered strings`);
    }
  },
};

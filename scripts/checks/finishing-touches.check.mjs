/**
 * Finishing interaction layer, in every locale:
 *
 * - Custom cursor (src/scripts/cursor.ts): a cobalt dot on the pointer and a ring that trails it
 *   (lerp: behind right after a move, on the pointer once settled). The ring expands over links,
 *   buttons and cards, shrinks while the mouse is pressed, and the native cursor is never hidden.
 *   Both elements are aria-hidden and ignore the pointer. Never created on touch devices or under
 *   reduced motion; removed when reduced motion turns on mid-visit.
 * - Navbar: the active-section link (aria-current, set by the existing observer) gets a 2px
 *   cobalt-soft underline as wide as the label; it moves to the next link when the section changes.
 * - Contact: a "Local time" row (localized label) right after the time zone, showing the current
 *   time in Brazil (America/Sao_Paulo, UTC−3) as HH:MM:SS in JetBrains Mono, ticking every second.
 * - Load polish: scroll reveals and the journey timeline arm only after the web fonts are loaded.
 */
import { sleep } from './lib/browser.mjs';
import { TOKENS } from './lib/context.mjs';

const H1 = '#top h1';
const FONT_DELAY_MS = 600;

const readCursor = () => {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return null;
  // Rendered centre (after translate and scale), not the style value: a scale applied on top of the
  // position would move the element without changing its translate.
  const pos = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const root = document.documentElement.classList;
  const ds = getComputedStyle(dot);
  const rs = getComputedStyle(ring);
  return {
    dot: pos(dot),
    ring: pos(ring),
    ringScale: rs.scale,
    visible: ds.opacity === '1' && rs.opacity === '1',
    hover: root.contains('cursor-hover'),
    down: root.contains('cursor-down'),
    aria: [dot.getAttribute('aria-hidden'), ring.getAttribute('aria-hidden')],
    events: [ds.pointerEvents, rs.pointerEvents],
    position: [ds.position, rs.position],
    z: Number(rs.zIndex),
    dotColor: ds.backgroundColor,
    nativeCursor: [getComputedStyle(document.body).cursor, getComputedStyle(document.querySelector('header nav a')).cursor],
    noneAnywhere: [...document.querySelectorAll('*')].some((el) => getComputedStyle(el).cursor === 'none'),
  };
};

const SCALE = { 'false,false': 'none', 'true,false': '1.75', 'false,true': '0.65' };

/** Polls until the state classes and scale reach the expected end state and the ring has caught up. */
async function settleCursor(page, hover, down) {
  const want = SCALE[`${hover},${down}`];
  // The driver sends `fn.toString()` to the page; compose readCursor in (no eval: the CSP forbids it).
  const probe = { toString: () => `(h, d, w) => { const c = (${readCursor})(); return c && c.hover === h && c.down === d && c.ringScale === w && Math.hypot(c.ring.x - c.dot.x, c.ring.y - c.dot.y) < 1 && c; }` };
  const done = await page.waitFor(probe, { args: [hover, down, want], timeout: 1500 });
  return done || page.eval(readCursor);
}

async function pointOn(page, sel) {
  return page.eval((s) => {
    const el = document.querySelector(s);
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + 40), y: Math.round(r.top + r.height / 2) };
  }, sel);
}

async function checkCursor(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);

  const idle = await page.eval(readCursor);
  t.ok(idle !== null, `${at}: cursor dot and ring are created on a fine pointer`);
  if (!idle) return page.close();
  t.eq(idle.visible, false, `${at}: cursor stays hidden until the pointer moves`);
  t.eq([idle.aria, idle.events, idle.position], [['true', 'true'], ['none', 'none'], ['fixed', 'fixed']], `${at}: cursor is aria-hidden, fixed and ignores the pointer`);
  t.ok(idle.z > 60, `${at}: cursor sits above the navbar, sheet and progress bar`, String(idle.z));
  t.eq(idle.dotColor, TOKENS.cobalt, `${at}: dot is cobalt`);
  t.ok(!idle.noneAnywhere && idle.nativeCursor[0] !== 'none' && idle.nativeCursor[1] === 'pointer', `${at}: native cursor stays visible`, JSON.stringify(idle.nativeCursor));

  // Follow + lerp, on the (non-interactive) hero heading.
  const a = await pointOn(page, H1);
  await page.moveMouse(a.x, a.y);
  await sleep(700);
  let c = await page.eval(readCursor);
  t.ok(c.visible && !c.hover, `${at}: cursor shows on move, no hover state over plain text`, JSON.stringify(c));
  t.ok(Math.abs(c.dot.x - a.x) < 1 && Math.abs(c.dot.y - a.y) < 1, `${at}: dot sits on the pointer`, JSON.stringify(c.dot));
  t.ok(Math.abs(c.ring.x - a.x) < 1 && Math.abs(c.ring.y - a.y) < 1, `${at}: ring settles on the pointer`, JSON.stringify(c.ring));

  const bx = a.x + 400;
  await page.moveMouse(bx, a.y);
  c = await page.eval(readCursor);
  t.ok(Math.abs(c.dot.x - bx) < 1, `${at}: dot jumps with the pointer`, JSON.stringify(c.dot));
  t.ok(c.ring.x > a.x - 1 && c.ring.x < bx - 20, `${at}: ring trails behind right after a move`, JSON.stringify(c.ring));
  await sleep(800);
  c = await page.eval(readCursor);
  t.ok(Math.abs(c.ring.x - bx) < 1, `${at}: ring catches up with the pointer`, JSON.stringify(c.ring));

  // Hover states.
  for (const [sel, name] of [
    ['header nav a[data-section="about"]', 'navbar link'],
    ['[data-personal-open]', 'button'],
    ['#impact [data-achievements] > li:first-child', 'ledger row'],
  ]) {
    await page.hover(sel);
    c = await settleCursor(page, true, false);
    t.ok(c.hover && c.ringScale === '1.75', `${at}: ring expands over a ${name}`, JSON.stringify({ hover: c.hover, scale: c.ringScale }));
    const pt = page.mouse;
    t.ok(
      Math.hypot(c.ring.x - pt.x, c.ring.y - pt.y) < 1.5 && Math.hypot(c.dot.x - pt.x, c.dot.y - pt.y) < 1.5,
      `${at}: expanded ring and dot stay centred on the pointer over a ${name}`,
      JSON.stringify({ pointer: pt, ring: c.ring, dot: c.dot }),
    );
  }

  // Press shrinks the ring; release restores it.
  const p = await pointOn(page, H1);
  await page.moveMouse(p.x, p.y);
  c = await settleCursor(page, false, false);
  t.ok(!c.hover && c.ringScale === 'none', `${at}: ring returns to its resting size off interactive elements`, JSON.stringify({ hover: c.hover, scale: c.ringScale }));
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  c = await settleCursor(page, false, true);
  t.ok(c.down && c.ringScale === '0.65', `${at}: ring shrinks while the mouse is pressed`, JSON.stringify({ down: c.down, scale: c.ringScale }));
  t.ok(Math.hypot(c.ring.x - p.x, c.ring.y - p.y) < 1.5, `${at}: shrunken ring stays centred on the pointer`, JSON.stringify({ pointer: p, ring: c.ring }));
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  c = await settleCursor(page, false, false);
  t.ok(!c.down && c.ringScale === 'none', `${at}: ring restores on release`, JSON.stringify({ down: c.down, scale: c.ringScale }));

  // Reduced motion turned on mid-visit removes the cursor.
  await page.reducedMotion(true);
  const gone = await page.waitFor(() => !document.querySelector('.cursor-dot, .cursor-ring'), { timeout: 1500 });
  t.ok(gone, `${at}: switching to reduced motion removes the cursor`);
  t.eq(page.errors, [], `${at}: no page errors (cursor)`);
  await page.close();
}

async function checkCursorDisabled(t, browser, url, at) {
  for (const mode of ['touch', 'reduced motion']) {
    const page = await browser.newPage({ width: 1440, height: 900 });
    await page.reducedMotion(mode === 'reduced motion');
    if (mode === 'touch') await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.goto(url);
    await page.moveMouse(400, 400);
    await sleep(200);
    const count = await page.eval(() => document.querySelectorAll('.cursor-dot, .cursor-ring').length);
    t.eq(count, 0, `${at}: no custom cursor under ${mode}`);
    t.eq(page.errors, [], `${at}: no page errors under ${mode}`);
    await page.close();
  }
}

const readUnderlines = () =>
  [...document.querySelectorAll('header nav a[data-section]')].map((a) => {
    const after = getComputedStyle(a, '::after');
    const m = new DOMMatrixReadOnly(after.transform === 'none' ? undefined : after.transform);
    return {
      id: a.dataset.section,
      current: a.getAttribute('aria-current'),
      scale: m.a,
      opacity: Number(after.opacity),
      height: parseFloat(after.height),
      width: parseFloat(after.width),
      linkWidth: a.getBoundingClientRect().width,
      color: after.backgroundColor,
    };
  });

async function checkNavUnderline(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);

  const top = await page.eval(readUnderlines);
  t.ok(top.every((u) => u.scale === 0 && u.opacity === 0), `${at}: no underline while the hero is in view`, JSON.stringify(top));

  let previous;
  for (const id of ['skills', 'projects', 'journey']) {
    await page.eval((target) => {
      const el = document.getElementById(target);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72);
    }, id);
    const active = await page.waitFor(
      (target) => document.querySelector(`header nav a[data-section="${target}"]`)?.getAttribute('aria-current') === 'location',
      { args: [id], timeout: 3000 },
    );
    await sleep(500);
    const u = await page.eval(readUnderlines);
    const on = u.find((x) => x.id === id);
    t.ok(active && on.scale === 1 && on.opacity === 1, `${at}: "${id}" link shows the underline when its section is active`, JSON.stringify(on));
    t.ok(Math.abs(on.width - on.linkWidth) < 0.5 && on.height === 2 && on.color === TOKENS.cobaltSoft, `${at}: "${id}" underline is 2px cobalt-soft, label width`, JSON.stringify(on));
    const others = u.filter((x) => x.id !== id && (x.scale !== 0 || x.opacity !== 0)).map((x) => x.id);
    t.eq(others, [], `${at}: only "${id}" is underlined`);
    if (previous) t.ok(u.find((x) => x.id === previous).current === null, `${at}: underline leaves "${previous}" for "${id}"`);
    previous = id;
  }
  t.eq(page.errors, [], `${at}: no page errors (navbar)`);
  await page.close();
}

/** Seconds since midnight in Brazil (America/Sao_Paulo) right now. */
function brazilSeconds() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date());
  const [h, m, s] = parts.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

async function checkClock(t, browser, url, route, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(url);
  const read = () =>
    page.eval(() => {
      const rows = [...document.querySelectorAll('[data-contact-details] > li')];
      const row = document.querySelector('[data-contact-details] [data-row="localtime"]');
      const time = row?.querySelector('time[data-clock]');
      return {
        order: rows.map((li) => li.dataset.row),
        label: row?.firstElementChild.textContent.trim(),
        text: time?.textContent.trim(),
        datetime: time?.getAttribute('datetime'),
        font: time && getComputedStyle(time).fontFamily,
        suffix: row?.querySelector('time + span')?.textContent.trim(),
      };
    });

  const first = await read();
  const expected = brazilSeconds();
  t.eq(first.order.slice(-2), ['timezone', 'localtime'], `${at}: local time row follows the time zone row`);
  t.eq(first.label, route.content.ui.contact.localTime, `${at}: local time label from locale`);
  t.ok(/^\d{2}:\d{2}:\d{2}$/.test(first.text ?? '') && first.datetime === first.text, `${at}: clock shows HH:MM:SS (and a matching datetime)`, JSON.stringify(first));
  const [h, m, s] = (first.text ?? '0:0:0').split(':').map(Number);
  const diff = Math.abs(((h * 3600 + m * 60 + s - expected + 43200) % 86400) - 43200);
  t.ok(diff <= 2, `${at}: clock shows the current time in Brazil (UTC−3)`, `${first.text} vs ${expected}s`);
  t.ok(/JetBrains Mono/.test(first.font ?? ''), `${at}: clock is set in JetBrains Mono`, first.font);
  t.eq(first.suffix, 'BRT', `${at}: clock is labelled BRT`);

  await sleep(1150);
  const second = await read();
  t.ok(second.text !== first.text, `${at}: clock ticks every second`, `${first.text} → ${second.text}`);

  await page.viewport(390);
  await page.settle();
  const overflow = await page.eval(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  t.ok(overflow <= 0, `${at} @390: clock row adds no horizontal overflow`, String(overflow));
  t.eq(page.errors, [], `${at}: no page errors (clock)`);
  await page.close();
}

async function checkFontGate(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  // Record the font loading status the moment the first reveal and the journey timeline arm.
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__armed = {};
      new MutationObserver((records) => {
        for (const r of records) {
          const el = r.target;
          if (!window.__armed.reveal && el.classList && el.classList.contains('reveal-pending')) window.__armed.reveal = document.fonts.status;
          if (!window.__armed.journey && el.hasAttribute && el.hasAttribute('data-journey-armed')) window.__armed.journey = document.fonts.status;
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class', 'data-journey-armed'] });`,
  });
  // Hold every font response for FONT_DELAY_MS (under the 1s cap), so the scripts start while the
  // fonts are still loading and the gate is actually exercised.
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*.woff2', requestStage: 'Request' }] });
  let held = 0;
  const off = page.connection.on((message) => {
    if (message.sessionId !== page.sessionId || message.method !== 'Fetch.requestPaused') return;
    held++;
    setTimeout(() => page.send('Fetch.continueRequest', { requestId: message.params.requestId }).catch(() => {}), FONT_DELAY_MS);
  });
  await page.goto(url);
  off();
  await page.send("Fetch.disable");
  t.ok(held > 0, `${at}: font requests were delayed ${FONT_DELAY_MS}ms`);
  const ready = await page.waitFor(() => document.documentElement.dataset.motion === 'ready' && document.documentElement.dataset.fonts === 'ready', { timeout: 3000 });
  t.ok(ready, `${at}: motion setup completes after the font gate`);
  const armed = await page.eval(() => [window.__armed.reveal, window.__armed.journey]);
  t.eq(armed, ['loaded', 'loaded'], `${at}: reveals and journey timeline arm only once the fonts are loaded`);
  const preloader = await page.eval(() => document.querySelectorAll('[data-preloader], .preloader').length);
  t.eq(preloader, 0, `${at}: no preloader overlay`);
  t.eq(page.errors, [], `${at}: no page errors (load)`);
  await page.close();
}

/**
 * Hybrid device (fine primary pointer plus a touchscreen): the cursor exists for the mouse, but a
 * touch hides it at once (no stuck "pressed" state) and the next mouse move brings it back.
 */
async function checkHybrid(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  await page.eval(() => {
    window.__touchPointers = 0;
    addEventListener('pointerdown', (e) => e.pointerType === 'touch' && window.__touchPointers++, true);
  });
  const p = await pointOn(page, H1);
  await page.moveMouse(p.x, p.y);
  await settleCursor(page, false, false);
  const shown = await page.waitFor(() => ['.cursor-dot', '.cursor-ring'].every((s) => getComputedStyle(document.querySelector(s)).opacity === '1'), { timeout: 1000 });
  t.ok(shown, `${at} hybrid: cursor shows for the mouse`);
  const touch = { x: p.x + 120, y: p.y };
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await sleep(50);
  const during = await page.eval(readCursor);
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
  const after = await page.eval(readCursor);
  const touches = await page.eval(() => window.__touchPointers);
  t.ok(touches > 0, `${at} hybrid: a real touch reached the page`, String(touches));
  t.ok(!during.visible && !during.down, `${at} hybrid: touching hides the cursor without a pressed state`, JSON.stringify({ visible: during.visible, down: during.down }));
  t.ok(!after.visible && !after.down, `${at} hybrid: cursor stays hidden after the touch ends`, JSON.stringify({ visible: after.visible, down: after.down }));
  await page.moveMouse(p.x, p.y + 10);
  const back = await page.waitFor(() => document.documentElement.classList.contains('cursor-visible'), { timeout: 1000 });
  t.ok(back, `${at} hybrid: the next mouse move shows the cursor again`);
  t.eq(page.errors, [], `${at} hybrid: no page errors`);
  await page.close();
}

/** Turning reduced motion on mid-visit removes the cursor within a frame or two, with no fade. */
async function checkLiveReducedMotion(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  const p = await pointOn(page, H1);
  await page.moveMouse(p.x, p.y);
  await settleCursor(page, false, false);
  await page.eval(() => {
    window.__cursorGone = null;
    new MutationObserver((_, obs) => {
      if (!document.querySelector('.cursor-dot, .cursor-ring')) {
        window.__cursorGone = performance.now();
        obs.disconnect();
      }
    }).observe(document.body, { childList: true });
  });
  const t0 = await page.eval(() => performance.now());
  await page.reducedMotion(true);
  const gone = await page.waitFor(() => window.__cursorGone, { timeout: 1500 });
  const ms = gone ? gone - t0 : null;
  t.ok(ms !== null && ms < 250, `${at}: reduced motion on mid-visit removes the cursor immediately`, `${ms}ms`);
  const classes = await page.eval(() => ['cursor-visible', 'cursor-hover', 'cursor-down'].filter((c) => document.documentElement.classList.contains(c)));
  t.eq(classes, [], `${at}: no cursor state classes left behind`);
  await page.reducedMotion(false);
  await page.moveMouse(p.x, p.y + 5);
  const restored = await page.waitFor(() => document.querySelectorAll('.cursor-dot, .cursor-ring').length === 2, { timeout: 1000 });
  t.ok(restored, `${at}: cursor returns when reduced motion is turned off again`);
  await page.close();
}

/**
 * The font gate must never block: with font requests failing, or taking 3s (past the 1s cap),
 * setup finishes within ~1s of the DOM being ready, the hero copy is shown, the journey timeline
 * arms, and scrolling the whole page leaves no element waiting to be revealed.
 */
async function checkFontFailure(t, browser, url, at) {
  for (const mode of ['fail', 'slow']) {
    const page = await browser.newPage({ width: 1440, height: 900 });
    await page.reducedMotion(false);
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__gate = {};
        new MutationObserver(() => {
          const d = document.documentElement.dataset;
          if (d.motion === 'ready' && !window.__gate.motion) window.__gate.motion = performance.now();
          if (document.querySelector('[data-journey-armed]') && !window.__gate.journey) window.__gate.journey = performance.now();
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-motion', 'data-journey-armed'] });`,
    });
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*.woff2', requestStage: 'Request' }] });
    const off = page.connection.on((message) => {
      if (message.sessionId !== page.sessionId || message.method !== 'Fetch.requestPaused') return;
      const id = message.params.requestId;
      if (mode === 'fail') page.send('Fetch.failRequest', { requestId: id, errorReason: 'Failed' }).catch(() => {});
      else setTimeout(() => page.send('Fetch.continueRequest', { requestId: id }).catch(() => {}), 3000);
    });
    await page.goto(url);
    const label = mode === 'fail' ? 'fonts fail' : 'fonts take 3s';
    const m = await page.eval(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { motion: window.__gate.motion - nav.domInteractive, journey: window.__gate.journey - nav.domInteractive, fonts: document.fonts.status };
    });
    t.ok(m.motion > 0 && m.motion < 1400, `${at} (${label}): reveal setup runs within the 1s cap`, JSON.stringify(m));
    t.ok(m.journey > 0 && m.journey < 1400, `${at} (${label}): journey timeline arms within the 1s cap`, JSON.stringify(m));
    const hero = await page.waitFor(() => {
      const els = [...document.querySelectorAll('#top h1, #top .hero-status, #top .hero-ctas')];
      return els.length > 0 && els.every((el) => getComputedStyle(el).opacity === '1');
    }, { timeout: 4000 });
    t.ok(hero, `${at} (${label}): hero copy is fully shown`);
    // Scroll the whole page in steps; every reveal must fire.
    await page.eval(async () => {
      const step = innerHeight * 0.5;
      for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    const stuck = await page.waitFor(() => document.querySelectorAll('.reveal-pending, .reveal-active').length === 0 && 'none', { timeout: 3000 });
    const left = stuck === 'none' ? 0 : await page.eval(() => document.querySelectorAll('.reveal-pending, .reveal-active').length);
    t.eq(left, 0, `${at} (${label}): no content left hidden after scrolling the page`);
    t.eq(page.errors, [], `${at} (${label}): no page errors`);
    off();
    await page.send('Fetch.disable').catch(() => {});
    await page.close();
  }
}

/** The clock adds no layout shift and does not drift over several ticks. */
async function checkClockStability(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(url);
  await page.eval(() => document.querySelector('[data-contact-details]').scrollIntoView({ block: 'center' }));
  await sleep(1200);
  const widths = await page.eval(() => {
    const time = document.querySelector('[data-clock]');
    const row = time.closest('li');
    const live = { w: time.getBoundingClientRect().width, h: row.getBoundingClientRect().height };
    const text = time.textContent;
    time.textContent = '--:--:--';
    const placeholder = { w: time.getBoundingClientRect().width, h: row.getBoundingClientRect().height };
    time.textContent = text;
    return { live, placeholder };
  });
  t.ok(Math.abs(widths.live.w - widths.placeholder.w) < 0.5 && widths.live.h === widths.placeholder.h, `${at}: placeholder and live time have the same box (no shift when the script starts)`, JSON.stringify(widths));
  await page.eval(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.sources?.some((s) => s.node && s.node.closest?.('[data-contact-details]'))) window.__shifts.push(e.value);
      }
    }).observe({ type: 'layout-shift' });
  });
  const brazil = () => {
    const [h, m, s] = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };
  let worst = 0;
  for (let i = 0; i < 4; i++) {
    await sleep(1000);
    const text = await page.eval(() => document.querySelector('[data-clock]').textContent);
    const [h, m, s] = text.split(':').map(Number);
    worst = Math.max(worst, Math.abs(((h * 3600 + m * 60 + s - brazil() + 43200) % 86400) - 43200));
  }
  t.ok(worst <= 1, `${at}: clock stays within 1s of Brazil time across ticks`, `${worst}s`);
  const shifts = await page.eval(() => window.__shifts);
  t.eq(shifts, [], `${at}: no layout shifts in the contact details while the clock ticks`);
  await page.close();
}

/** The underline coexists with the language switcher and leaves the mobile sheet untouched. */
async function checkNavIntegration(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  const toSkills = () =>
    page.eval(() => window.scrollTo(0, document.getElementById('skills').getBoundingClientRect().top + scrollY - 72));
  const active = () =>
    page.waitFor(() => document.querySelector('header nav a[data-section="skills"]').getAttribute('aria-current') === 'location', { timeout: 3000 });
  await toSkills();
  await active();
  await sleep(450);
  const trigger = '[data-lang-switcher]:has(#lang-desktop-menu) [data-lang-trigger]';
  // Click in place: the driver's click() scrolls the target into view, which on a sticky-header
  // control scrolls the page and changes the active section.
  await page.click(await page.center(trigger, { scroll: false }));
  await sleep(200);
  const open = await page.eval(() => !document.querySelector('#lang-desktop-menu').hidden);
  let u = (await page.eval(readUnderlines)).find((x) => x.id === 'skills');
  t.ok(open && u.scale === 1, `${at}: underline stays on the active link while the language menu is open`, JSON.stringify({ open, u }));
  const y0 = await page.eval(() => scrollY);
  await page.press('Escape');
  await sleep(100);
  const y1 = await page.eval(() => scrollY);
  t.ok(Math.abs(y1 - y0) < 2, `${at}: closing the language menu with Escape does not scroll the page`, `${y0} → ${y1}`);
  u = (await page.eval(readUnderlines)).find((x) => x.id === 'skills');
  t.ok(u.scale === 1, `${at}: underline unaffected after closing the language menu`);

  for (const width of [1200, 900]) {
    await page.viewport(width);
    await page.reload();
    await toSkills();
    await active();
    await sleep(450);
    const on = (await page.eval(readUnderlines)).find((x) => x.id === 'skills');
    t.ok(on.scale === 1 && Math.abs(on.width - on.linkWidth) < 0.5, `${at} @${width}: underline matches the label width`, JSON.stringify(on));
  }

  await page.viewport(390);
  await page.reload();
  await toSkills();
  await page.waitFor(() => document.querySelector('[data-sheet-link][data-section="skills"]').getAttribute('aria-current') === 'location', { timeout: 3000 });
  await page.click(await page.center('[data-menu-open]', { scroll: false }));
  await sleep(150);
  const sheet = await page.eval(() => ({
    open: !document.querySelector('[data-mobile-menu]').hidden,
    current: document.querySelector('[data-sheet-link][aria-current="location"]')?.dataset.section,
    pseudo: [...document.querySelectorAll('[data-sheet-link]')].map((a) => getComputedStyle(a, '::after').content),
    desktopHidden: document.querySelector('header nav').offsetParent === null,
    switcher: document.querySelector('#mobile-menu [data-lang-switcher]') !== null,
  }));
  t.ok(sheet.open && sheet.current === 'skills' && sheet.switcher, `${at} @390: mobile sheet opens with the active section marked and its language switcher`, JSON.stringify(sheet));
  t.ok(sheet.pseudo.every((c) => c === 'none') && sheet.desktopHidden, `${at} @390: no underline pseudo-element in the sheet; desktop links hidden`, JSON.stringify(sheet));
  await page.press('Escape');
  const closed = await page.waitFor(() => document.querySelector('[data-mobile-menu]').hidden, { timeout: 1000 });
  t.ok(closed, `${at} @390: Escape still closes the sheet`);
  t.eq(page.errors, [], `${at}: no page errors (nav integration)`);
  await page.close();
}

export default {
  name: 'Finishing touches: cursor, active nav underline, live clock, font-gated entrances',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      await checkCursor(t, browser, url, at);
      await checkCursorDisabled(t, browser, url, at);
      await checkNavUnderline(t, browser, url, at);
      await checkClock(t, browser, url, route, at);
      await checkFontGate(t, browser, url, at);
      await checkHybrid(t, browser, url, at);
      await checkLiveReducedMotion(t, browser, url, at);
      await checkFontFailure(t, browser, url, at);
      await checkClockStability(t, browser, url, at);
      await checkNavIntegration(t, browser, url, at);
    }
  },
};

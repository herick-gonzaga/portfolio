/**
 * Card and CTA interactions (src/scripts/interactions.ts, Card.astro, global.css), in every locale.
 *
 * - Spotlight: every skill, project and impact card is tagged; on hover the glow and the border
 *   light fade in, centred on the cursor (--spot-x/--spot-y), cobalt on light cards and
 *   cobalt-soft on the dark featured card, and fade out on leave. The spec hover shadow is kept.
 * - Tilt: project cards only; they lean toward the cursor (at most 6deg per axis), return to
 *   `transform: none` after the cursor leaves, and never tilt on touch or under reduced motion.
 * - Count-up: the featured metrics start at 0 below the fold, count up once in the locale's number
 *   format (mono font, "+" kept) and end on the exact locale text; screen readers always get the
 *   final value; values on screen at load, and every value under reduced motion, are static.
 * - Magnetic CTAs: "View projects", the navbar "Get in touch" and "Email me" drift toward a cursor
 *   within 80px (at most 8px per axis), not beyond, and spring back; never on touch or under
 *   reduced motion.
 * - Inline link underline: a 1px line that draws left-to-right on hover (no text-decoration).
 */
import { sleep } from './lib/browser.mjs';
import { TOKENS } from './lib/context.mjs';

const SPOTLIGHT = ['#skills ul.grid article', '#projects article', '#impact [data-metrics] .card', '#impact [data-achievements] article'];
const TILT = '#projects article';
const MAGNETIC = ['#top [href="#projects"]', 'header [href="#contact"]', '#contact a[href^="mailto:"]'];
const FEATURED = { en: ['500+', '9,000+', '10+'], pt: ['500+', '9.000+', '10+'], es: ['500+', '9.000+', '10+'] };

const settled = (sel) => {
  const el = document.querySelector(sel);
  return el && !el.closest('.reveal-pending, .reveal-active') && getComputedStyle(el).opacity === '1';
};

/** Scrolls `sel` to the centre, waits for its reveal to finish and returns its box. */
async function bring(page, sel) {
  await page.eval((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
  await page.waitFor(settled, { args: [sel], timeout: 3000 });
  await sleep(100);
  return page.eval((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, sel);
}

const readSpot = (sel) => {
  const el = document.querySelector(sel);
  const before = getComputedStyle(el, '::before');
  const after = getComputedStyle(el, '::after');
  return {
    x: parseFloat(el.style.getPropertyValue('--spot-x')),
    y: parseFloat(el.style.getPropertyValue('--spot-y')),
    glow: Number(before.opacity),
    ring: Number(after.opacity),
    ringImage: after.backgroundImage,
    shadow: getComputedStyle(el).boxShadow,
  };
};

async function checkSpotlight(t, page, at) {
  const tags = await page.eval(
    (sels, tilt) => ({
      missing: sels.filter((s) => {
        const els = [...document.querySelectorAll(s)];
        return els.length === 0 || els.some((el) => !el.hasAttribute('data-spotlight'));
      }),
      tilted: [...document.querySelectorAll('[data-tilt]')].every((el) => el.matches(tilt)),
      tiltCount: document.querySelectorAll(tilt).length === document.querySelectorAll('[data-tilt]').length,
    }),
    SPOTLIGHT,
    TILT,
  );
  t.eq(tags.missing, [], `${at}: skill, project and impact cards have the spotlight`);
  t.ok(tags.tilted && tags.tiltCount, `${at}: every project card, and only project cards, tilts`);

  const cases = [
    { sel: '#skills ul.grid > li:first-child article', ring: TOKENS.cobalt, name: 'skill card' },
    { sel: '#impact [data-metrics] > li:first-child .card', ring: TOKENS.cobalt, name: 'impact metric card' },
    { sel: '#impact [data-achievements] > li:first-child article', ring: TOKENS.cobalt, name: 'achievement card' },
    { sel: '#projects article.card-dark', ring: TOKENS.cobaltSoft, name: 'dark featured card' },
  ];
  for (const c of cases) {
    const box = await bring(page, c.sel);
    const at1 = { x: box.left + box.width * 0.25, y: box.top + box.height * 0.3 };
    await page.moveMouse(at1.x, at1.y);
    await page.moveMouse(at1.x + 10, at1.y + 6);
    await page.waitFor(
      (sel) => {
        const el = document.querySelector(sel);
        return getComputedStyle(el, '::before').opacity === '1' && getComputedStyle(el, '::after').opacity === '1';
      },
      { args: [c.sel], timeout: 1500 },
    );
    await sleep(250);
    const s = await page.eval(readSpot, c.sel);
    t.ok(s.glow > 0.99 && s.ring > 0.99, `${at}: ${c.name}: glow and border light fade in on hover`, JSON.stringify(s));
    t.ok(
      Math.abs(s.x - (at1.x + 10 - box.left)) <= 2 && Math.abs(s.y - (at1.y + 6 - box.top)) <= 2,
      `${at}: ${c.name}: spotlight follows the cursor`,
      JSON.stringify({ spot: [s.x, s.y], cursor: [at1.x + 10 - box.left, at1.y + 6 - box.top] }),
    );
    const ringRgb = c.ring.replace('rgb(', '').replace(')', '');
    t.ok(s.ringImage.includes('radial-gradient') && s.ringImage.replace(/rgba?\(/g, '').includes(ringRgb), `${at}: ${c.name}: border light uses the accent`, s.ringImage);
    t.ok(s.shadow.includes(TOKENS.cardShadow), `${at}: ${c.name}: spec hover shadow is kept`, s.shadow);

    await page.moveMouse(5, 450);
    await sleep(400);
    const off = await page.eval(readSpot, c.sel);
    t.ok(off.glow === 0 && off.ring === 0, `${at}: ${c.name}: spotlight fades out on leave`, JSON.stringify(off));
  }
}

const readTilt = (sel) => {
  const el = document.querySelector(sel);
  return {
    tx: parseFloat(el.style.getPropertyValue('--tilt-x')),
    ty: parseFloat(el.style.getPropertyValue('--tilt-y')),
    transform: getComputedStyle(el).transform,
  };
};

async function checkTilt(t, page, at) {
  const cards = await page.eval((s) => document.querySelectorAll(s).length, TILT);
  for (let i = 1; i <= cards; i++) {
    // Cards are nested differently per row, so address them by index through a data hook.
    await page.eval((s, n) => document.querySelectorAll(s)[n - 1].setAttribute('data-check-tilt', String(n)), TILT, i);
    const hook = `[data-check-tilt="${i}"]`;
    const box = await bring(page, hook);
    // Top-right corner region: the right edge and the top edge dip away from the viewer.
    await page.moveMouse(box.left + box.width * 0.95, box.top + box.height * 0.05);
    await sleep(350);
    const near = await page.eval(readTilt, hook);
    t.ok(near.tx > 4 && near.tx <= 6 && near.ty > 4 && near.ty <= 6, `${at}: project card ${i} tilts toward the cursor, at most 6deg`, JSON.stringify(near));
    t.ok(near.transform.startsWith('matrix3d('), `${at}: project card ${i} is rotated in 3D while hovered`, near.transform);
    await page.moveMouse(box.left + box.width * 0.05, box.top + box.height * 0.95);
    await sleep(350);
    const opposite = await page.eval(readTilt, hook);
    t.ok(opposite.tx < -4 && opposite.tx >= -6 && opposite.ty < -4 && opposite.ty >= -6, `${at}: project card ${i} follows the cursor to the opposite corner`, JSON.stringify(opposite));
    await page.moveMouse(5, 450);
    const back = await page.waitFor((s) => getComputedStyle(document.querySelector(s)).transform === 'none', { args: [hook], timeout: 1500 });
    t.ok(back, `${at}: project card ${i} springs back flat on leave`);
  }
  const skill = '#skills ul.grid > li:first-child article';
  const box = await bring(page, skill);
  await page.moveMouse(box.left + box.width * 0.95, box.top + 10);
  await sleep(300);
  t.eq(await page.eval((s) => getComputedStyle(document.querySelector(s)).transform, skill), 'matrix(1, 0, 0, 1, 0, -2)', `${at}: skill cards only lift, never tilt`);
  await page.moveMouse(5, 450);
}

const readMetrics = () =>
  [...document.querySelectorAll('#projects dl dd')].map((dd) => {
    const shown = dd.querySelector('[data-countup]');
    return {
      sr: dd.querySelector('.sr-only')?.textContent.trim(),
      shown: shown?.textContent.trim(),
      hidden: shown?.getAttribute('aria-hidden'),
      font: getComputedStyle(shown).fontFamily,
    };
  });

async function checkCountUp(t, page, at, locale) {
  const expected = FEATURED[locale];
  const start = await page.eval(readMetrics);
  t.eq(start.map((m) => m.sr), expected, `${at}: screen readers get the final metric values`);
  t.ok(start.every((m) => m.hidden === 'true'), `${at}: the counting copy is aria-hidden`);
  t.eq(start.map((m) => m.shown), ['0+', '0+', '0+'], `${at}: metrics below the fold wait at 0 with their "+"`);
  t.ok(start.every((m) => m.font.includes('JetBrains Mono')), `${at}: metrics keep the mono font`);

  await page.eval(() => document.querySelector('#projects dl').scrollIntoView({ block: 'center' }));
  const frames = await page.eval(
    () =>
      new Promise((resolve) => {
        const seen = [];
        const t0 = performance.now();
        const tick = () => {
          seen.push([...document.querySelectorAll('#projects [data-countup]')].map((el) => el.textContent.trim()));
          if (performance.now() - t0 < 2400) requestAnimationFrame(tick);
          else resolve(seen);
        };
        requestAnimationFrame(tick);
      }),
  );
  const big = frames.map((f) => f[1]);
  const num = (s) => Number(s.replace(/\D/g, ''));
  const increasing = big.every((v, i) => i === 0 || num(v) >= num(big[i - 1]));
  const distinct = new Set(big).size;
  t.ok(increasing && distinct >= 10, `${at}: 9,000+ counts up over many frames`, `${distinct} values`);
  const sep = expected[1][1];
  const grouped = big.filter((v) => num(v) >= 1000 && num(v) < 9000);
  t.ok(grouped.length > 0 && grouped.every((v) => v.includes(sep) && v.endsWith('+')), `${at}: intermediate values use the locale separator "${sep}" and keep "+"`, JSON.stringify(grouped.slice(0, 3)));
  t.eq(frames.at(-1), expected, `${at}: metrics end on the exact locale values`);

  await page.eval(() => window.scrollTo(0, 0));
  await sleep(300);
  await page.eval(() => document.querySelector('#projects dl').scrollIntoView({ block: 'center' }));
  await sleep(300);
  t.eq((await page.eval(readMetrics)).map((m) => m.shown), expected, `${at}: count-up runs only once`);
}

const readMagnet = (sel) => {
  const el = document.querySelector(sel);
  const [x = '0px', y = '0px'] = getComputedStyle(el).translate.split(' ');
  return { x: parseFloat(x) || 0, y: parseFloat(y) || 0, tagged: el.hasAttribute('data-magnetic') };
};

async function checkMagnetic(t, page, at) {
  const others = await page.eval(() => [...document.querySelectorAll('[data-magnetic]')].length);
  t.eq(others, MAGNETIC.length, `${at}: exactly the three primary CTAs are magnetic`);
  for (const sel of MAGNETIC) {
    const box = sel.startsWith('header') ? await page.eval((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel) : await bring(page, sel);
    t.ok((await page.eval(readMagnet, sel)).tagged, `${at}: ${sel} is magnetic`);
    const cy = box.top + box.height / 2;
    // 30px below-right of the bottom-right corner: within range, outside the button.
    await page.moveMouse(box.left + box.width + 20, box.top + box.height + 20);
    await sleep(400);
    const near = await page.eval(readMagnet, sel);
    t.ok(near.x > 0.5 && near.y > 0.5 && near.x <= 8 && near.y <= 8, `${at}: ${sel} drifts toward a cursor within 80px, at most 8px`, JSON.stringify(near));
    await page.moveMouse(box.left + box.width - 2, cy);
    await sleep(400);
    const inside = await page.eval(readMagnet, sel);
    t.ok(inside.x <= 8 && inside.x >= 0, `${at}: ${sel} never moves more than 8px`, JSON.stringify(inside));
    await page.moveMouse(box.left + box.width + 120, box.top + box.height + 120);
    await sleep(800);
    const far = await page.eval(readMagnet, sel);
    t.ok(Math.abs(far.x) < 0.01 && Math.abs(far.y) < 0.01, `${at}: ${sel} springs back once the cursor is beyond 80px`, JSON.stringify(far));
  }
}

async function checkUnderline(t, page, at) {
  const sel = '#projects header + div a';
  await bring(page, sel);
  const read = (s) => {
    const a = document.querySelector(s);
    const span = a.querySelector('.link-underline');
    const cs = span && getComputedStyle(span);
    return cs && { size: cs.backgroundSize, position: cs.backgroundPosition, decoration: getComputedStyle(a).textDecorationLine };
  };
  const before = await page.eval(read, sel);
  t.eq(before, { size: '0% 1px', position: '0px 100%', decoration: 'none' }, `${at}: link underline is hidden at rest, anchored left`);
  await page.hover(sel);
  const mid = await page.waitFor((s) => {
    const w = parseFloat(getComputedStyle(document.querySelector(s).querySelector('.link-underline')).backgroundSize);
    return w > 0 && w < 100 && w;
  }, { args: [sel], timeout: 1000 });
  t.ok(mid, `${at}: link underline draws progressively (left-to-right)`, String(mid));
  await sleep(400);
  t.eq((await page.eval(read, sel)).size, '100% 1px', `${at}: link underline is fully drawn on hover`);
  const all = await page.eval(() =>
    [...document.querySelectorAll('#projects a:not([data-magnetic]), #contact [data-contact-details] a')].every((a) => a.querySelector('.link-underline')),
  );
  t.ok(all, `${at}: project and contact text links all use the animated underline`);
}

async function checkDisabled(t, browser, url, at, { reduced, touch }) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(reduced);
  if (touch) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(url);
  const mode = reduced ? 'reduced motion' : 'touch';

  const box = await bring(page, '#projects article.card-dark');
  await page.moveMouse(box.left + box.width * 0.95, box.top + 10);
  await sleep(400);
  const tilt = await page.eval(readTilt, '#projects article.card-dark');
  t.ok(!tilt.transform.startsWith('matrix3d'), `${at}: no tilt under ${mode}`, tilt.transform);

  const sel = MAGNETIC[0];
  await page.eval(() => window.scrollTo(0, 0));
  await sleep(200);
  const b = await page.eval((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  await page.moveMouse(b.right + 20, b.bottom + 20);
  await sleep(400);
  const m = await page.eval(readMagnet, sel);
  t.ok(m.x === 0 && m.y === 0, `${at}: no magnetic pull under ${mode}`, JSON.stringify(m));

  if (reduced) {
    t.eq((await page.eval(readMetrics)).map((x) => x.shown), (await page.eval(readMetrics)).map((x) => x.sr), `${at}: metrics are static under reduced motion`);
  }
  t.eq(page.errors, [], `${at}: no page errors under ${mode}`);
  await page.close();
}

async function checkLoadedInView(t, browser, url, at) {
  // Metrics already on screen at load (a reload mid-page) are never reset to 0.
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `new MutationObserver((_, obs) => {
      const contact = document.querySelector('#contact');
      if (contact) { obs.disconnect(); document.querySelector('#projects dl').scrollIntoView({ block: 'center' }); }
    }).observe(document, { childList: true, subtree: true });`,
  });
  await page.goto(url);
  await sleep(200);
  const m = await page.eval(readMetrics);
  t.eq(m.map((x) => x.shown), m.map((x) => x.sr), `${at}: metrics already on screen at load stay as rendered`);
  await page.close();
}

export default {
  name: 'Card spotlight, tilt, count-up, magnetic CTAs, link underline',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const page = await browser.newPage({ width: 1440, height: 900 });
      await page.reducedMotion(false);
      await page.goto(url);
      t.ok(await page.eval(() => matchMedia('(hover: hover) and (pointer: fine)').matches), `${at}: test browser has a fine hover pointer`);
      await checkCountUp(t, page, at, route.locale);
      await checkSpotlight(t, page, at);
      await checkTilt(t, page, at);
      await checkMagnetic(t, page, at);
      await checkUnderline(t, page, at);
      t.eq(page.errors, [], `${at}: no page errors`);
      await page.close();

      await checkDisabled(t, browser, url, at, { reduced: true, touch: false });
      await checkDisabled(t, browser, url, at, { reduced: false, touch: true });
      await checkLoadedInView(t, browser, url, at);
    }
  },
};

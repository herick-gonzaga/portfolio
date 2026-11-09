/**
 * Journey section (Achievements & impact has its own check: impact.check.mjs).
 * Journey: copy matches the locale files; 200px/1fr grid with a sticky header column only from
 * 900px; timeline line, item padding, dot style per item type (current / past work / education)
 * and dot position (centered on the line, aligned with the first text line); item typography.
 * Scroll story (1440 and 390 wide): the cobalt line draws with its tip on the 60% viewport line;
 * each item activates once when the tip reaches its dot (dot scales in with a pulse, period/title/
 * description slide in staggered); items already passed are never hidden; no layout shift; the
 * header column stays sticky while the story runs (desktop). Final state (line fully drawn, items
 * static) under prefers-reduced-motion, after switching it on mid-visit, in print, and without JS.
 * Org notes ("through Codengage") render after the org as muted 15px regular text, and the work
 * history shows a single current engagement, with Codengage only as a note, never its own entry.
 * Journey: nothing overflows and no horizontal scroll in any locale.
 */
import { TOKENS, normalize } from './lib/context.mjs';
import { sleep } from './lib/browser.mjs';

const WIDTHS = [1440, 1200, 900, 600, 390];

function readTexts() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const journey = document.getElementById('journey');
  const headerOf = (section) => ({
    kicker: text(section.querySelector('header > p:first-child')),
    title: text(section.querySelector('header h2')),
    intro: text(section.querySelector('header h2 + p')) || undefined,
  });
  const items = [...journey.querySelectorAll('ol > li')].map((li) => {
    const [period, description] = li.querySelectorAll(':scope > p');
    const note = li.querySelector('h3 [data-org-note]');
    return {
      period: text(period),
      heading: text(li.querySelector('h3')),
      orgNote: note ? text(note) : undefined,
      description: text(description),
      dot: li.dataset.dot,
    };
  });
  return {
    journey: { header: headerOf(journey), items, listTag: journey.querySelector('ol')?.tagName },
  };
}

function measureLayout() {
  const px = (value) => parseFloat(value);
  const vw = document.documentElement.clientWidth;
  const style = (el) => getComputedStyle(el);
  const box = (el) => el.getBoundingClientRect();
  const font = (el) => {
    const s = style(el);
    return {
      size: px(s.fontSize),
      lineHeight: Math.round((px(s.lineHeight) / px(s.fontSize)) * 100) / 100,
      weight: s.fontWeight,
      color: s.color,
      mono: s.fontFamily.includes('JetBrains Mono'),
      tracking: Math.round((px(s.letterSpacing) / px(s.fontSize)) * 1000) / 1000 || 0,
    };
  };
  const overflowIn = (section) => {
    const found = [];
    for (const el of section.querySelectorAll('*')) {
      const r = box(el);
      if (r.width === 0) continue;
      const clips = style(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
      if (r.left < -0.5 || r.right > vw + 0.5 || clips) found.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
    }
    return found;
  };

  // Journey.
  const journey = document.getElementById('journey');
  const container = journey.querySelector('.container');
  const headerCol = container.firstElementChild;
  const header = headerCol.querySelector('header');
  const intro = header.querySelector('h2 + p');
  const ol = journey.querySelector('ol');
  const lis = [...ol.querySelectorAll(':scope > li')];
  const olBox = box(ol);
  const lineX = olBox.left + px(style(ol).borderLeftWidth) / 2;
  const descriptionProbe = (p) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:62ch';
    p.appendChild(probe);
    const w = box(probe).width;
    probe.remove();
    return w;
  };
  const items = lis.map((li) => {
    const dot = li.querySelector('.journey-dot');
    const [period, description] = li.querySelectorAll(':scope > p');
    const ds = style(dot);
    const db = box(dot);
    const pb = box(period);
    const ls = style(li);
    return {
      kind: li.dataset.dot,
      padding: [ls.paddingTop, ls.paddingRight, ls.paddingBottom, ls.paddingLeft].map(px),
      dot: {
        width: db.width,
        height: db.height,
        position: ds.position,
        background: ds.backgroundColor,
        border: [px(ds.borderTopWidth), ds.borderTopColor],
        shadow: ds.boxShadow,
        centerXOffset: db.left + db.width / 2 - lineX,
        centerYOffset: db.top + db.height / 2 - (pb.top + px(style(period).lineHeight) / 2),
      },
      period: font(period),
      title: font(li.querySelector('h3')),
      orgNote: li.querySelector('h3 [data-org-note]') ? font(li.querySelector('h3 [data-org-note]')) : undefined,
      description: { ...font(description), maxWidth: px(style(description).maxWidth), width: box(description).width, ch62: descriptionProbe(description) },
    };
  });
  const hs = style(headerCol);
  const containerStyle = style(container);

  return {
    vw,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    journey: {
      background: style(journey).backgroundColor,
      padding: [px(style(journey).paddingTop), px(style(journey).paddingBottom)],
      columns: containerStyle.display === 'grid' ? containerStyle.gridTemplateColumns.split(' ').map(px) : [],
      headerPosition: hs.position,
      headerTop: hs.top,
      headerBesideList: box(headerCol).right <= olBox.left + 0.5 && box(headerCol).top <= olBox.top + 0.5,
      listBelowHeader: olBox.top >= box(headerCol).bottom - 0.5,
      kicker: font(header.querySelector('p')),
      titleFont: font(header.querySelector('h2')),
      intro: font(intro),
      olTag: ol.tagName,
      olBorder: [style(ol).borderLeftWidth, style(ol).borderLeftColor],
      items,
      overflowing: overflowIn(journey),
    },
  };
}

function checkJourneyLayout(t, j, at, width) {
  const desktop = width >= 900;
  const pad = desktop ? 112 : 72;
  t.eq(j.background, TOKENS.transparent, `${at}: Journey sits on the mist page background`);
  t.eq(j.padding, [pad, pad], `${at}: Journey padding ${pad}px top and bottom`);

  if (desktop) {
    t.eq(j.columns.length, 2, `${at}: Journey is a two-column grid`);
    t.eq(j.columns[0], 200, `${at}: left column is 200px`);
    t.ok(j.headerBesideList, `${at}: header column sits left of the timeline`);
    t.eq([j.headerPosition, j.headerTop], ['sticky', '96px'], `${at}: header column is sticky at 96px`);
  } else {
    t.eq(j.columns, [], `${at}: Journey is a single column`);
    t.ok(j.listBelowHeader, `${at}: timeline stacks below the header`);
    t.ok(j.headerPosition !== 'sticky', `${at}: header column is not sticky below 900px`, j.headerPosition);
  }
  t.ok(j.kicker.mono && j.kicker.size === 13 && j.kicker.color === TOKENS.cobalt, `${at}: kicker is mono 13px cobalt`);
  t.eq(j.titleFont.size, desktop ? 40 : 32, `${at}: H2 size`);
  t.ok(j.intro.size === 15 && j.intro.color === TOKENS.muted, `${at}: intro is 15px muted`, JSON.stringify(j.intro));

  t.eq(j.olTag, 'OL', `${at}: timeline is an <ol>`);
  t.eq(j.olBorder, ['1px', TOKENS.line], `${at}: timeline has a 1px line left border`);
  const last = j.items.length - 1;
  t.eq(
    j.items.map((i) => i.padding),
    j.items.map((_, n) => [0, 0, n === last ? 0 : 40, 40]),
    `${at}: items are padded 0 0 40px 40px, last without bottom padding`,
  );

  const expectedDot = {
    current: { background: TOKENS.cobalt, border: [0, ''], shadow: `${TOKENS.mist} 0px 0px 0px 3px` },
    past: { background: TOKENS.white, border: [3, TOKENS.cobalt], shadow: 'none' },
    education: { background: TOKENS.white, border: [3, TOKENS.text], shadow: 'none' },
  };
  for (const [n, item] of j.items.entries()) {
    const d = item.dot;
    const e = expectedDot[item.kind];
    const label = `${at}: item ${n + 1} (${item.kind}) dot`;
    t.ok(Boolean(e), `${label} has a known type`, item.kind);
    if (!e) continue;
    t.ok(d.position === 'absolute' && Math.abs(d.width - 13) < 0.01 && Math.abs(d.height - 13) < 0.01, `${label} is 13px and absolutely positioned`, JSON.stringify(d));
    t.ok(
      d.background === e.background && d.border[0] === e.border[0] && (e.border[0] === 0 || d.border[1] === e.border[1]) && d.shadow === e.shadow,
      `${label} style`,
      JSON.stringify(d),
    );
    t.near(d.centerXOffset, 0, 0.5, `${label} is centered on the line`);
    t.near(d.centerYOffset, 0, 1, `${label} is aligned with the first text line`);

    const current = item.kind === 'current';
    t.ok(
      item.period.mono && item.period.size === 13 && item.period.color === (current ? TOKENS.cobalt : TOKENS.muted),
      `${at}: item ${n + 1} period is mono 13px ${current ? 'cobalt' : 'muted'}`,
      JSON.stringify(item.period),
    );
    t.ok(item.title.size === 20 && item.title.weight === '600', `${at}: item ${n + 1} H3 is 20px/600`, JSON.stringify(item.title));
    if (item.orgNote) {
      const note = item.orgNote;
      t.ok(note.size === 15 && note.weight === '400' && note.color === TOKENS.muted, `${at}: item ${n + 1} org note is 15px/400 muted`, JSON.stringify(note));
    }
    const desc = item.description;
    t.ok(desc.size === 15 && desc.lineHeight === 1.55 && desc.color === TOKENS.muted, `${at}: item ${n + 1} description is 15px/1.55 muted`, JSON.stringify(desc));
    t.ok(Math.abs(desc.maxWidth - desc.ch62) <= 0.5 && desc.width <= desc.ch62 + 0.5, `${at}: item ${n + 1} description max 62ch`, JSON.stringify(desc));
  }
  t.eq(j.overflowing, [], `${at}: nothing in Journey overflows`);
}

/** Scrolls so the header column would have scrolled past 96px; a sticky header stays at 96px. */
async function checkStickyBehaviour(t, page, at, width) {
  const result = await page.eval(async () => {
    const journey = document.getElementById('journey');
    const headerCol = journey.querySelector('.container').firstElementChild;
    const ol = journey.querySelector('ol');
    const olTop = ol.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, olTop + 160 - 96);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { headerTop: headerCol.getBoundingClientRect().top, listTop: ol.getBoundingClientRect().top };
  });
  if (width >= 900) t.near(result.headerTop, 96, 1, `${at}: header column stays at 96px while the timeline scrolls`);
  else t.ok(result.headerTop < 0, `${at}: header column scrolls away below 900px`, JSON.stringify(result));
}

/** Fraction of the viewport height where the drawn line's tip sits and items activate. */
const TIP = 0.6;
const DOT_HIDDEN = 'matrix(0, 0, 0, 0, 0, 0)';
const PART_HIDDEN = 'matrix(1, 0, 0, 1, -12, 0)';

const readStory = (tip) => {
  const list = document.querySelector('#journey ol');
  const lb = list.getBoundingClientRect();
  const line = getComputedStyle(list, '::before');
  const m = line.transform.match(/^matrix\(([^)]+)\)$/);
  const scaleY = line.transform === 'none' ? 1 : m ? Number(m[1].split(',')[3]) : NaN;
  const look = (el, pseudo) => {
    const s = getComputedStyle(el, pseudo);
    return { opacity: s.opacity, transform: s.transform, delay: s.transitionDelay, duration: s.transitionDuration, animation: s.animationName };
  };
  // Layout boxes ignore transforms: offset* only, so any difference is a real layout shift.
  const layout = (el) => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
  return {
    armed: list.hasAttribute('data-journey-armed'),
    tipY: innerHeight * tip,
    line: { content: line.content, color: line.backgroundColor, width: line.width, origin: line.transformOrigin, transform: line.transform, scaleY, top: lb.top, height: lb.height },
    headerTop: document.querySelector('#journey .container').firstElementChild.getBoundingClientRect().top,
    items: [...list.children].map((li) => {
      const dot = li.querySelector('.journey-dot');
      const r = dot.getBoundingClientRect();
      const parts = [...li.children].filter((el) => el !== dot);
      return {
        pending: li.hasAttribute('data-journey-pending'),
        active: li.classList.contains('is-active'),
        dotCenter: r.top + r.height / 2,
        dot: look(dot),
        pulse: look(dot, '::after'),
        parts: parts.map((el) => look(el)),
        layout: [layout(li), layout(dot), ...parts.map(layout)],
      };
    }),
  };
};

/** Scrolls so item `n`'s dot centre sits `offset` px below (positive) or above the tip line. */
const scrollDotTo = (n, offset, tip) => {
  const dot = document.querySelectorAll('#journey ol > li .journey-dot')[n];
  const r = dot.getBoundingClientRect();
  window.scrollTo(0, scrollY + r.top + r.height / 2 - (innerHeight * tip + offset));
};

const isFinal = (item) =>
  item.dot.transform === 'none' && item.parts.every((p) => p.opacity === '1' && p.transform === 'none');

/** Sum of layout shifts caused by nodes inside #journey since load. */
const journeyShift = () =>
  new Promise((resolve) => {
    const journey = document.getElementById('journey');
    const observer = new PerformanceObserver(() => {});
    observer.observe({ type: 'layout-shift', buffered: true });
    requestAnimationFrame(() => {
      const entries = observer.takeRecords();
      observer.disconnect();
      resolve(
        entries
          .filter((e) => e.sources?.some((src) => src.node && journey.contains(src.node)))
          .reduce((sum, e) => sum + e.value, 0),
      );
    });
  });

async function checkScrollStory(t, browser, url, route, width) {
  const at = `${route} @${width}`;
  const page = await browser.newPage({ width, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  const read = () => page.eval(readStory, TIP);
  const settle = () => sleep(250);
  const tipError = (s) => {
    const expected = Math.min(Math.max(s.tipY, s.line.top), s.line.top + s.line.height);
    return s.line.top + s.line.scaleY * s.line.height - expected;
  };

  const start = await read();
  t.ok(start.armed, `${at}: scroll story is armed when JS runs and motion is allowed`);
  t.ok(
    start.line.content === '""' && start.line.color === TOKENS.cobalt && start.line.width === '1px' && start.line.origin.endsWith(' 0px'),
    `${at}: drawn line is a 1px cobalt ::before growing from the top`,
    JSON.stringify(start.line),
  );
  t.near(start.line.scaleY, 0, 0.001, `${at}: line is undrawn while the timeline is below the tip line`);
  t.ok(start.items.every((i) => i.pending === i.dotCenter > start.tipY), `${at}: exactly the items below the tip line are pending`);
  t.ok(start.items.some((i) => i.pending), `${at}: some items start pending`);
  t.ok(start.items.filter((i) => !i.pending).every(isFinal), `${at}: items already reached are never hidden`);
  const hidden = start.items.filter((i) => i.pending);
  t.ok(
    hidden.every((i) => i.dot.transform === DOT_HIDDEN && i.parts.every((p) => p.opacity === '0' && p.transform === PART_HIDDEN)),
    `${at}: pending items start with the dot at scale 0 and the text hidden 12px left`,
    JSON.stringify(hidden[0]),
  );
  t.ok(hidden.every((i) => i.dot.duration === '0s' && i.parts.every((p) => p.duration === '0s')), `${at}: arming hides pending items instantly`);

  // Item 2's dot just short of the tip: item 1 has activated, item 2 waits.
  await page.eval(scrollDotTo, 1, 30, TIP);
  await settle();
  const before = await read();
  t.near(tipError(before), 0, 2, `${at}: line tip sits on the 60% viewport line`);
  t.ok(before.items[0].active || !before.items[0].pending, `${at}: item 1 is active once the line has passed it`);
  t.ok(!before.items[1].active && before.items[1].parts[0].opacity === '0', `${at}: item 2 stays hidden until the line reaches its dot`);

  // Just past it: item 2 activates with the pulse and the staggered slide-in.
  await page.eval(scrollDotTo, 1, -30, TIP);
  const fired = await page.waitFor(() => document.querySelectorAll('#journey ol > li')[1].classList.contains('is-active'), { timeout: 2000 });
  t.ok(fired, `${at}: item 2 activates when the line reaches its dot`);
  const during = await read();
  const two = during.items[1];
  t.eq(two.pulse.animation, 'journey-pulse', `${at}: activated dot plays the accent pulse`);
  t.eq(two.parts.map((p) => p.delay), ['0.08s, 0.08s', '0.16s, 0.16s', '0.24s, 0.24s'], `${at}: period, title, description are staggered 80ms apart`);
  t.near(tipError(during), 0, 2, `${at}: line tip still on the 60% line after scrolling`);
  const done = await page.waitFor(
    () => {
      const li = document.querySelectorAll('#journey ol > li')[1];
      return [...li.children].every((el) => getComputedStyle(el).transform === 'none' && getComputedStyle(el).opacity === '1');
    },
    { timeout: 3000 },
  );
  t.ok(done, `${at}: item 2 ends in its final state`);

  // Mid-story: the last item's dot reaching the tip; on desktop the header column is pinned.
  await page.eval(scrollDotTo, during.items.length - 1, 0, TIP);
  await settle();
  const mid = await read();
  t.near(tipError(mid), 0, 2, `${at}: line tip on the 60% line at the last item`);
  if (width >= 900) t.near(mid.headerTop, 96, 1, `${at}: header column stays sticky at 96px while the entries scroll past`);
  else t.ok(mid.headerTop < 0, `${at}: header column scrolls away in normal flow below 900px`, String(mid.headerTop));

  // Through to the end: line fully drawn, every item active.
  await page.eval(() => {
    const list = document.querySelector('#journey ol');
    window.scrollTo(0, scrollY + list.getBoundingClientRect().bottom - innerHeight * 0.3);
  });
  await sleep(1200);
  const end = await read();
  t.near(end.line.scaleY, 1, 0.001, `${at}: line is fully drawn past the end of the timeline`);
  t.ok(end.items.every(isFinal), `${at}: every item has activated by the end`, JSON.stringify(end.items.map(isFinal)));

  // No layout shift: transform-free boxes are identical before arming takes effect and after.
  t.eq(end.items.map((i) => i.layout), start.items.map((i) => i.layout), `${at}: item layout boxes never change (no layout shift)`);
  t.near(await page.eval(journeyShift), 0, 0.0001, `${at}: no layout-shift entries from Journey`);

  // Back to the top: the line retracts with the scroll, items stay revealed (activate once).
  await page.eval(() => window.scrollTo(0, 0));
  await settle();
  const back = await read();
  t.near(back.line.scaleY, 0, 0.001, `${at}: line retracts when scrolling back up`);
  t.ok(back.items.every(isFinal), `${at}: activated items stay revealed after scrolling away`);

  // Static layout matches the reduced-motion render.
  const still = await browser.newPage({ width, height: 900 });
  await still.reducedMotion(true);
  await still.goto(url);
  const reduced = await still.eval(readStory, TIP);
  t.eq(reduced.items.map((i) => i.layout), start.items.map((i) => i.layout), `${at}: layout is identical with and without motion`);
  await still.close();

  t.eq(page.errors, [], `${at}: no page errors during the scroll story`);
  await page.close();
}

async function checkLiveSwitches(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  const armed = await page.eval(readStory, TIP);
  t.ok(armed.items.some((i) => i.pending && !i.active), `${at}: items pending before switching media`);

  await page.send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const print = await page.eval(readStory, TIP);
  t.ok(print.items.every(isFinal) && print.line.transform === 'none', `${at}: print shows every item and the full line`, JSON.stringify(print.items.find((i) => !isFinal(i))));

  await page.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const reduced = await page.eval(readStory, TIP);
  t.ok(
    reduced.items.every(isFinal) && reduced.line.transform === 'none',
    `${at}: switching on reduced motion mid-visit draws the line and shows every item`,
  );
  await page.close();
}

/**
 * Loads `url` with JavaScript disabled and reads the timeline items' styles over the DOM/CSS
 * protocol domains (Runtime.evaluate is unavailable while script execution is disabled).
 */
async function readStoryWithoutJs(page, url) {
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
  const { nodeId: listId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#journey ol' });
  const { attributes } = await page.send('DOM.getAttributes', { nodeId: listId });
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: listId, selector: ':scope > li > *' });
  const parts = [];
  for (const nodeId of nodeIds) {
    const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
    const get = (name) => computedStyle.find((p) => p.name === name)?.value;
    parts.push({ opacity: get('opacity'), transform: get('transform') });
  }
  return { armed: attributes.includes('data-journey-armed'), parts };
}

async function checkFinalState(t, browser, url, at, mode) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  const label = mode === 'reduced-motion' ? 'under prefers-reduced-motion' : 'without JS';
  if (mode === 'reduced-motion') {
    await page.reducedMotion(true);
    await page.goto(url);
    const state = await page.eval(readStory, TIP);
    t.ok(!state.armed, `${at}: scroll story is not armed under prefers-reduced-motion`);
    t.ok(state.line.transform === 'none' && state.line.color === TOKENS.cobalt, `${at}: line is fully drawn ${label}`, JSON.stringify(state.line));
    t.ok(state.items.every(isFinal), `${at}: every timeline item renders in its final state ${label}`, JSON.stringify(state.items[0]));
    t.near(await page.eval(journeyShift), 0, 0.0001, `${at}: no layout-shift entries from Journey ${label}`);
  } else {
    // The line's scaleY only applies to an armed list, so an unarmed list has it fully drawn.
    const state = await readStoryWithoutJs(page, url);
    t.ok(!state.armed && state.parts.length > 0, `${at}: scroll story is not armed without JS (line fully drawn)`, JSON.stringify(state));
    t.ok(
      state.parts.every((p) => p.opacity === '1' && p.transform === 'none'),
      `${at}: every timeline item renders in its final state ${label}`,
      JSON.stringify(state.parts.find((p) => p.opacity !== '1' || p.transform !== 'none')),
    );
  }
  await page.close();
}

export default {
  name: 'Journey section',
  async run({ browser, baseUrl, routes, t }) {
    // Static layout is measured in its final state (reduced motion); checkScrollStory covers the
    // motion path, including that its layout boxes are identical.
    const page = await browser.newPage();
    await page.reducedMotion(true);
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const { content } = route;

      await page.viewport(1440);
      await page.goto(url);
      const texts = await page.eval(readTexts);

      const header = (h) => ({ kicker: h.kicker, title: h.title, intro: h.intro });
      t.eq(texts.journey.header, header(content.sections.journey), `${at}: Journey header matches locale`);
      t.eq(
        texts.journey.items,
        content.journey.map((item) => ({
          period: normalize(item.place ? `${item.period} · ${item.place}` : item.period),
          heading: normalize(`${item.title} · ${item.org}${item.orgNote ? ` ${item.orgNote}` : ''}`),
          orgNote: item.orgNote ? normalize(item.orgNote) : undefined,
          description: normalize(item.description),
          dot: item.current ? 'current' : item.type === 'education' ? 'education' : 'past',
        })),
        `${at}: Journey items match locale (order, text, dot type)`,
      );
      // One engagement: a single current work entry (SubBase), Codengage only as its "through" note.
      const currentWork = content.journey.filter((item) => item.current && item.type === 'work');
      t.eq(currentWork.map((item) => item.org), ['SubBase'], `${at}: exactly one current work entry, at SubBase`);
      t.ok(/Codengage/.test(currentWork[0]?.orgNote ?? ''), `${at}: the SubBase entry notes Codengage`, currentWork[0]?.orgNote);
      t.ok(
        content.journey.every((item) => item.org !== 'Codengage'),
        `${at}: Codengage is not a separate timeline entry`,
      );
      t.ok(
        texts.journey.items.filter((item) => item.orgNote).length === content.journey.filter((item) => item.orgNote).length,
        `${at}: every org note is rendered`,
      );

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        const m = await page.eval(measureLayout);
        t.ok(m.hscroll <= 0, `${at} @${width}: no horizontal scroll`, `${m.hscroll}px`);
        checkJourneyLayout(t, m.journey, `${at} @${width}`, width);
        await checkStickyBehaviour(t, page, `${at} @${width}`, width);
      }

      for (const width of [1440, 390]) await checkScrollStory(t, browser, url, at, width);
      await checkLiveSwitches(t, browser, url, at);
      await checkFinalState(t, browser, url, at, 'reduced-motion');
      await checkFinalState(t, browser, url, at, 'no-js');
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

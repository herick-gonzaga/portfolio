/**
 * Journey and Achievements & impact sections.
 * Journey: copy matches the locale files; 200px/1fr grid with a sticky header column only from
 * 900px; timeline line, item padding, dot style per item type (current / past work / education)
 * and dot position (centered on the line, aligned with the first text line); item typography;
 * fade-in once at 30% visibility, final state under prefers-reduced-motion and without JS.
 * Org notes ("through Codengage") render after the org as muted 15px regular text, and the work
 * history shows a single current engagement, with Codengage only as a note, never its own entry.
 * Achievements: copy and real metric values (no placeholders); bottom-only padding; 3 metric
 * cards (1 column below 600px; values 36px between 600px and 900px, 44px elsewhere) whose values
 * share one baseline; 2-column achievement grid (1 column below 900px) with
 * the icon left of the text. Both: nothing overflows and no horizontal scroll in any locale.
 */
import { TOKENS, normalize } from './lib/context.mjs';
import { sleep } from './lib/browser.mjs';
import { icons } from '../../src/components/ui/icons.ts';

const WIDTHS = [1440, 1200, 900, 600, 390];

/** Real metric values per locale: same numbers, locale-specific separators. */
const IMPACT_VALUES = {
  en: ['10+', '500+', '98.85%'],
  pt: ['10+', '500+', '98,85%'],
  es: ['10+', '500+', '98,85%'],
};

function readTexts(expectedIcons) {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const journey = document.getElementById('journey');
  const impact = document.getElementById('impact');
  const headerOf = (section) => ({
    kicker: text(section.querySelector('header > p:first-child')),
    title: text(section.querySelector('header h2')),
    intro: text(section.querySelector('header h2 + p')) || undefined,
  });
  // Normalizes an icon's markup the same way for the rendered SVG and the expected icon source.
  const iconMarkup = (html) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = html;
    return svg.innerHTML;
  };
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
    impact: {
      header: headerOf(impact),
      metrics: [...impact.querySelectorAll('[data-metrics] > li')].map((li) => {
        const [value, label, note] = li.querySelectorAll('p');
        return { value: text(value), label: text(label), note: text(note) };
      }),
      items: [...impact.querySelectorAll('[data-achievements] > li')].map((li) => ({
        title: text(li.querySelector('h3')),
        description: text(li.querySelector('h3 + p')),
        icon: iconMarkup(li.querySelector('svg').innerHTML),
      })),
      expectedIcons: expectedIcons.map(iconMarkup),
    },
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
  const baseline = (el) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(probe);
    const y = box(probe).top;
    probe.remove();
    return y;
  };
  const lineCount = (el) => Math.round(box(el).height / px(style(el).lineHeight));
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

  // Achievements.
  const impact = document.getElementById('impact');
  const metricLis = [...impact.querySelectorAll('[data-metrics] > li')];
  const metricCards = metricLis.map((li) => li.firstElementChild);
  const achievementCards = [...impact.querySelectorAll('[data-achievements] > li > article')];
  const is = style(impact);

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
    impact: {
      background: is.backgroundColor,
      padding: [px(is.paddingTop), px(is.paddingBottom)],
      metricColumns: new Set(metricCards.map((c) => Math.round(box(c).left))).size,
      metricRows: new Set(metricCards.map((c) => Math.round(box(c).top))).size,
      metricHeights: metricCards.map((c) => box(c).height),
      metricGap: metricCards.length > 1 ? px(style(metricLis[0].parentElement).columnGap) : 0,
      metricValues: metricCards.map((c) => font(c.querySelector('p'))),
      metricLabels: metricCards.map((c) => ({ ...font(c.querySelectorAll('p')[1]), lines: lineCount(c.querySelectorAll('p')[1]) })),
      metricNotes: metricCards.map((c) => font(c.querySelectorAll('p')[2])),
      valueBaselines: metricCards.map((c) => baseline(c.querySelector('p'))),
      valueFirst: metricCards.every((c) => c.querySelector('p') === c.firstElementChild),
      achievementColumns: new Set(achievementCards.map((c) => Math.round(box(c).left))).size,
      achievementGap: px(style(impact.querySelector('[data-achievements]')).columnGap),
      rowSpacing: box(impact.querySelector('[data-achievements]')).top - box(impact.querySelector('[data-metrics]')).bottom,
      achievements: achievementCards.map((card) => {
        const icon = card.querySelector('svg');
        const textCol = icon.nextElementSibling;
        return {
          icon: { width: box(icon).width, height: box(icon).height, color: style(icon).color, shrink: style(icon).flexShrink },
          iconLeftOfText: box(icon).right <= box(textCol).left,
          gap: box(textCol).left - box(icon).right,
          iconTopOffset: box(icon).top - box(textCol).top,
          title: font(textCol.querySelector('h3')),
          description: font(textCol.querySelector('p')),
        };
      }),
      overflowing: overflowIn(impact),
    },
  };
}

const spread = (values) => Math.max(...values) - Math.min(...values);

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

function checkImpactLayout(t, m, at, width) {
  const pad = width >= 900 ? 112 : 72;
  t.eq(m.background, TOKENS.transparent, `${at}: Impact sits on the mist page background`);
  t.eq(m.padding, [0, pad], `${at}: Impact has bottom padding only (${pad}px)`);

  const metricCols = width >= 600 ? 3 : 1;
  t.eq(m.metricColumns, metricCols, `${at}: ${metricCols} metric column(s)`);
  if (metricCols === 3) {
    t.eq(m.metricRows, 1, `${at}: metrics share one row`);
    t.eq(m.metricGap, 24, `${at}: metric gap is 24px`);
    t.ok(spread(m.metricHeights) <= 1, `${at}: metric cards have equal height`, JSON.stringify(m.metricHeights));
    t.ok(spread(m.valueBaselines) <= 0.5, `${at}: metric values share one baseline`, JSON.stringify(m.valueBaselines));
    const wraps = m.metricLabels.map((l) => l.lines);
    if (spread(wraps) > 0) t.note(`${at}: metric labels wrap unevenly (${wraps.join('/')} lines), baselines still aligned`);
  }
  t.ok(m.valueFirst, `${at}: each metric value is the first line of its card`);
  // 36px in the narrow 3-column band (600-899px) so values like "98.85%" fit on one line; 44px elsewhere.
  const valueSize = width >= 600 && width < 900 ? 36 : 44;
  t.ok(
    m.metricValues.every((v) => v.size === valueSize && v.weight === '600' && v.color === TOKENS.cobalt && v.tracking === -0.03),
    `${at}: metric values are ${valueSize}px/600 cobalt, -0.03em`,
    JSON.stringify(m.metricValues[0]),
  );
  t.ok(
    m.metricLabels.every((l) => l.size === 15 && l.weight === '600' && l.color === TOKENS.text),
    `${at}: metric labels are 15px/600`,
    JSON.stringify(m.metricLabels[0]),
  );
  t.ok(
    m.metricNotes.every((n) => n.size === 14 && n.lineHeight === 1.5 && n.color === TOKENS.muted),
    `${at}: metric notes are 14px/1.5 muted`,
    JSON.stringify(m.metricNotes[0]),
  );

  const achievementCols = width >= 900 ? 2 : 1;
  t.eq(m.achievementColumns, achievementCols, `${at}: ${achievementCols} achievement column(s)`);
  if (achievementCols === 2) t.eq(m.achievementGap, 24, `${at}: achievement column gap is 24px`);
  t.near(m.rowSpacing, 24, 0.5, `${at}: 24px between metrics and achievements`);
  for (const [n, a] of m.achievements.entries()) {
    const label = `${at}: achievement ${n + 1}`;
    t.ok(
      a.icon.width === 24 && a.icon.height === 24 && a.icon.color === TOKENS.cobalt && a.icon.shrink === '0',
      `${label} icon is 24px cobalt, flex-shrink 0`,
      JSON.stringify(a.icon),
    );
    t.ok(a.iconLeftOfText, `${label} icon sits left of the text`);
    t.near(a.gap, 20, 0.5, `${label} icon-text gap is 20px`);
    t.near(a.iconTopOffset, 2, 0.5, `${label} icon is offset 2px from the top`);
    t.ok(a.title.size === 17 && a.title.weight === '600', `${label} H3 is 17px/600`, JSON.stringify(a.title));
    t.ok(
      a.description.size === 14 && a.description.lineHeight === 1.55 && a.description.color === TOKENS.muted,
      `${label} description is 14px/1.55 muted`,
      JSON.stringify(a.description),
    );
  }
  t.eq(m.overflowing, [], `${at}: nothing in Impact overflows`);
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

const readReveal = () => {
  const list = document.querySelector('#journey ol');
  return {
    armed: list.hasAttribute('data-journey-armed'),
    items: [...list.children].map((li) => {
      const s = getComputedStyle(li);
      return { opacity: s.opacity, transform: s.transform, duration: s.transitionDuration, visible: li.classList.contains('is-visible') };
    }),
  };
};

async function checkFadeIn(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(false);
  await page.goto(url);
  const before = await page.eval(readReveal);
  t.ok(before.armed, `${at}: reveal is armed when JS runs and motion is allowed`);
  t.ok(
    before.items.every((i) => i.opacity === '0' && i.transform === 'matrix(1, 0, 0, 1, 0, 12)'),
    `${at}: off-screen items start hidden, 12px lower`,
    JSON.stringify(before.items[0]),
  );
  t.ok(before.items.every((i) => i.duration === '0s'), `${at}: hiding pending items is instant (no fade-out)`, JSON.stringify(before.items[0]));

  // Only ~10% of the first item visible: it must stay hidden (threshold 0.3).
  await page.eval(() => {
    const li = document.querySelector('#journey ol > li');
    const r = li.getBoundingClientRect();
    window.scrollTo(0, scrollY + r.top - innerHeight + r.height * 0.1);
  });
  await sleep(400);
  const partial = await page.eval(readReveal);
  t.ok(!partial.items[0].visible && partial.items[0].opacity === '0', `${at}: an item 10% in view stays hidden`, JSON.stringify(partial.items[0]));

  await page.eval(() => document.querySelector('#journey ol > li').scrollIntoView({ block: 'center' }));
  const shown = await page.waitFor(() => getComputedStyle(document.querySelector('#journey ol > li')).opacity === '1', { timeout: 2000 });
  t.ok(shown, `${at}: item fades in once 30% visible`);
  const revealed = await page.eval(readReveal);
  t.eq(revealed.items[0].duration, '0.32s, 0.32s', `${at}: reveal transitions over 320ms`);
  const settled = await page.waitFor(() => getComputedStyle(document.querySelector('#journey ol > li')).transform === 'none', { timeout: 2000 });
  t.ok(settled, `${at}: revealed item ends untranslated`);

  // Scrolling away and back does not hide it again (fades in once).
  await page.eval(() => window.scrollTo(0, 0));
  await sleep(400);
  const after = await page.eval(readReveal);
  t.ok(after.items[0].visible && after.items[0].opacity === '1', `${at}: revealed item stays visible after scrolling away`);
  t.eq(page.errors, [], `${at}: no page errors during fade-in`);
  await page.close();
}

/**
 * Loads `url` with JavaScript disabled and reads the timeline items' styles over the DOM/CSS
 * protocol domains (Runtime.evaluate is unavailable while script execution is disabled).
 */
async function readRevealWithoutJs(page, url) {
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
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: listId, selector: ':scope > li' });
  const items = [];
  for (const nodeId of nodeIds) {
    const { computedStyle } = await page.send('CSS.getComputedStyleForNode', { nodeId });
    const get = (name) => computedStyle.find((p) => p.name === name)?.value;
    items.push({ opacity: get('opacity'), transform: get('transform') });
  }
  return { armed: attributes.includes('data-journey-armed'), items };
}

async function checkFinalState(t, browser, url, at, mode) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  let state;
  if (mode === 'reduced-motion') {
    await page.reducedMotion(true);
    await page.goto(url);
    state = await page.eval(readReveal);
  } else {
    state = await readRevealWithoutJs(page, url);
    t.ok(!state.armed && state.items.length > 0, `${at}: reveal is not armed without JS`, JSON.stringify(state));
  }
  const label = mode === 'reduced-motion' ? 'under prefers-reduced-motion' : 'without JS';
  t.ok(
    state.items.every((i) => i.opacity === '1' && i.transform === 'none'),
    `${at}: every timeline item renders in its final state ${label}`,
    JSON.stringify(state),
  );
  if (mode === 'reduced-motion') t.ok(!state.armed, `${at}: reveal is not armed under prefers-reduced-motion`);
  await page.close();
}

export default {
  name: 'Journey & Achievements sections',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const { content } = route;

      await page.viewport(1440);
      await page.goto(url);
      const iconNames = content.achievements.items.map((item) => item.icon);
      const texts = await page.eval(readTexts, iconNames.map((name) => icons[name]));

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

      t.eq(texts.impact.header, header(content.sections.impact), `${at}: Impact header matches locale`);
      t.eq(
        texts.impact.metrics,
        content.achievements.metrics.map((m) => ({ value: m.value, label: normalize(m.label), note: normalize(m.note) })),
        `${at}: metrics match locale`,
      );
      t.eq(
        texts.impact.metrics.map((m) => m.value),
        IMPACT_VALUES[route.locale],
        `${at}: metric values are the real numbers in the locale's number format`,
      );
      t.ok(
        texts.impact.metrics.every((m) => !/\[(N|Replace)/.test(m.value + m.label + m.note)),
        `${at}: no "[N]" or bracketed "[Replace" placeholders remain`,
      );
      t.eq(
        texts.impact.items.map(({ title, description }) => ({ title, description })),
        content.achievements.items.map((i) => ({ title: normalize(i.title), description: normalize(i.description) })),
        `${at}: achievements match locale`,
      );
      t.eq(texts.impact.items.map((i) => i.icon), texts.impact.expectedIcons, `${at}: achievement icons match locale`);

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        const m = await page.eval(measureLayout);
        t.ok(m.hscroll <= 0, `${at} @${width}: no horizontal scroll`, `${m.hscroll}px`);
        checkJourneyLayout(t, m.journey, `${at} @${width}`, width);
        checkImpactLayout(t, m.impact, `${at} @${width}`, width);
        await checkStickyBehaviour(t, page, `${at} @${width}`, width);
      }

      await checkFadeIn(t, browser, url, at);
      await checkFinalState(t, browser, url, at, 'reduced-motion');
      await checkFinalState(t, browser, url, at, 'no-js');
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

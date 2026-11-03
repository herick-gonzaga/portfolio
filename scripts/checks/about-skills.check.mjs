/**
 * About and Skills sections (PR #3): copy matches the locale files, layout, cards, fact rows,
 * typography, section rhythm, header width, overflow, card hover and the navbar active anchor.
 */
import { TOKENS, normalize } from './lib/context.mjs';

const WIDTHS = [1440, 1200, 900, 600, 599, 390];

function readTexts() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const header = (id) => ({
    kicker: text(document.querySelector(`#${id} header > p:first-child`)),
    title: text(document.querySelector(`#${id} h2`)),
    intro: text(document.querySelector(`#${id} header > p + h2 + p`)) || undefined,
  });
  return {
    about: header('about'),
    skillsHeader: header('skills'),
    paragraphs: [...document.querySelectorAll('#about .grid > div:first-child p')].map(text),
    facts: [...document.querySelectorAll('#about dl > div')].map((row) => ({
      label: text(row.querySelector('dt')),
      value: text(row.querySelector('dd')),
    })),
    skills: [...document.querySelectorAll('#skills ul.grid > li > article')].map((card) => ({
      title: text(card.querySelector('h3')),
      description: text(card.querySelector('p')),
      chips: [...card.querySelectorAll('ul li')].map(text),
    })),
  };
}

function measureLayout() {
  const px = (value) => parseFloat(value);
  const vw = document.documentElement.clientWidth;
  const about = document.getElementById('about');
  const skills = document.getElementById('skills');
  const aboutGrid = about.querySelector('.grid');
  const aboutColumns = getComputedStyle(aboutGrid).gridTemplateColumns.split(' ').map(px);

  const rows = [...about.querySelectorAll('dl > div')].map((row, i, all) => {
    const dt = row.querySelector('dt').getBoundingClientRect();
    const dd = row.querySelector('dd').getBoundingClientRect();
    return {
      dtWidth: dt.width,
      sideBySide: Math.abs(dt.top - dd.top) < 1 && dd.left >= dt.right,
      stacked: dd.top >= dt.bottom - 0.5,
      border: px(getComputedStyle(row).borderBottomWidth),
      last: i === all.length - 1,
    };
  });

  const cards = [...skills.querySelectorAll('ul.grid > li > article')].map((card) => {
    const style = getComputedStyle(card);
    const box = card.getBoundingClientRect();
    const chipList = card.querySelector('ul').getBoundingClientRect();
    return {
      top: Math.round(box.top),
      height: box.height,
      chipsBottomOffset: box.bottom - chipList.bottom,
      accentWidth: px(style.borderTopWidth),
      accentColor: style.borderTopColor,
      padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(px),
    };
  });

  const paragraphs = [...about.querySelectorAll('.grid > div:first-child p')].map((p) => {
    const style = getComputedStyle(p);
    return { fontSize: px(style.fontSize), lineHeight: px(style.lineHeight), color: style.color };
  });

  const h2s = [about, skills].map((section) => {
    const style = getComputedStyle(section.querySelector('h2'));
    return { fontSize: px(style.fontSize), letterSpacing: px(style.letterSpacing) / px(style.fontSize) };
  });

  const padding = (el) => ({ top: px(getComputedStyle(el).paddingTop), bottom: px(getComputedStyle(el).paddingBottom) });
  const headerMaxWidth = [about, skills].map((s) => getComputedStyle(s.querySelector('header')).maxWidth);

  // Overflow: nothing in either section extends past the viewport or clips its own text.
  const overflowing = [];
  for (const el of [...about.querySelectorAll('*'), ...skills.querySelectorAll('*')]) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const display = getComputedStyle(el).display;
    const clipsText = display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
    if (r.left < -0.5 || r.right > vw + 0.5 || clipsText) {
      overflowing.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
    }
  }

  return {
    vw,
    aboutColumns,
    aboutGap: px(getComputedStyle(aboutGrid).columnGap),
    rows,
    cards,
    paragraphs,
    h2s,
    aboutPadding: padding(about),
    skillsPadding: padding(skills),
    headerMaxWidth,
    overflowing,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

function checkLayout(t, m, at, width) {
  const desktop = width >= 900;
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
  t.eq(m.overflowing, [], `${at}: nothing in About or Skills overflows`);

  // About grid: 7fr/5fr from 900px, one column below.
  if (desktop) {
    t.eq(m.aboutColumns.length, 2, `${at}: About has two columns`);
    t.near(m.aboutColumns[0] / m.aboutColumns[1], 7 / 5, 0.01, `${at}: About columns are 7fr/5fr`);
  } else {
    t.eq(m.aboutColumns.length, 1, `${at}: About is a single column`);
  }

  // Fact rows: 120px label beside the value from 600px, label above the value below.
  if (width >= 600) {
    t.eq(m.rows.filter((r) => Math.round(r.dtWidth) !== 120).length, 0, `${at}: fact labels are 120px wide`);
    t.ok(m.rows.every((r) => r.sideBySide), `${at}: fact label sits beside its value`);
  } else {
    t.ok(m.rows.every((r) => r.stacked), `${at}: fact label sits above its value`);
  }
  t.ok(
    m.rows.every((r) => (r.last ? r.border === 0 : r.border === 1)),
    `${at}: 1px dividers between fact rows only`,
    JSON.stringify(m.rows.map((r) => r.border)),
  );

  // Skill cards.
  const rowsByTop = Object.values(Object.groupBy(m.cards, (c) => c.top));
  t.ok(
    rowsByTop.every((row) => Math.max(...row.map((c) => c.height)) - Math.min(...row.map((c) => c.height)) <= 1),
    `${at}: skill cards in a row share one height`,
  );
  if (rowsByTop.some((row) => row.length > 1)) {
    const offsets = m.cards.map((c) => c.chipsBottomOffset);
    t.ok(Math.max(...offsets) - Math.min(...offsets) <= 1, `${at}: chip blocks are pinned to the card bottom`, JSON.stringify(offsets));
  }
  t.ok(
    m.cards.every((c) => c.accentWidth === 3 && c.accentColor === TOKENS.cobalt),
    `${at}: skill cards have a 3px cobalt top accent`,
  );
  const pad = desktop ? 32 : 24;
  t.ok(
    m.cards.every((c) => c.padding.every((p) => p === pad)),
    `${at}: skill card padding is ${pad}px`,
    JSON.stringify(m.cards.map((c) => c.padding)),
  );

  // Typography and rhythm.
  t.ok(
    m.paragraphs.every((p) => p.fontSize === 18 && Math.abs(p.lineHeight - 28.8) < 0.1 && p.color === TOKENS.text2),
    `${at}: About paragraphs are 18px/1.6 text-2`,
    JSON.stringify(m.paragraphs),
  );
  const h2Size = desktop ? 40 : 32;
  t.ok(
    m.h2s.every((h) => h.fontSize === h2Size && Math.abs(h.letterSpacing + 0.02) < 0.001),
    `${at}: H2 is ${h2Size}px at -0.02em`,
    JSON.stringify(m.h2s),
  );
  const sectionPad = desktop ? 112 : 72;
  t.eq(m.aboutPadding, { top: sectionPad, bottom: sectionPad }, `${at}: About section padding ${sectionPad}px`);
  t.eq(m.skillsPadding, { top: 0, bottom: sectionPad }, `${at}: Skills section padding is bottom-only`);
  t.eq(m.headerMaxWidth, ['736px', '736px'], `${at}: section header max-width is 46rem`);
}

async function checkHover(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440 });
  await page.goto(url);
  const selector = '#skills ul.grid > li:first-child article';
  const base = await page.eval((sel) => {
    const style = getComputedStyle(document.querySelector(sel));
    return { transitionDuration: style.transitionDuration, transitionProperty: style.transitionProperty };
  }, selector);
  t.ok(
    base.transitionProperty.includes('transform') && base.transitionDuration.split(', ').every((d) => d === '0.16s'),
    `${at}: card transition is 160ms`,
    JSON.stringify(base),
  );
  await page.hover(selector);
  const hovered = await page.waitFor(
    (sel) => {
      const style = getComputedStyle(document.querySelector(sel));
      return style.transform === 'matrix(1, 0, 0, 1, 0, -2)' && { transform: style.transform, shadow: style.boxShadow };
    },
    { args: [selector], timeout: 1500 },
  );
  t.ok(hovered, `${at}: hovered card lifts 2px`);
  t.eq(hovered && hovered.shadow, TOKENS.cardShadow, `${at}: hovered card has the spec shadow`);

  await page.moveMouse(5, 5);
  await page.reducedMotion(true);
  await page.reload();
  await page.hover(selector);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const reduced = await page.eval((sel) => {
    const style = getComputedStyle(document.querySelector(sel));
    return { transform: style.transform, shadow: style.boxShadow };
  }, selector);
  t.eq(reduced, { transform: 'none', shadow: 'none' }, `${at}: no hover motion under reduced motion`);
  await page.close();
}

async function checkActiveAnchor(t, page, at) {
  for (const id of ['about', 'skills']) {
    await page.eval((target) => document.getElementById(target).scrollIntoView({ behavior: 'instant' }), id);
    const active = await page.waitFor(
      (target) => document.querySelector(`header nav a[data-section="${target}"]`)?.getAttribute('aria-current') === 'location',
      { args: [id], timeout: 2000 },
    );
    t.ok(active, `${at}: navbar marks "${id}" active when it is in view`);
    const others = await page.eval(
      (target) => [...document.querySelectorAll('header nav a[aria-current]')].map((a) => a.dataset.section).filter((s) => s !== target),
      id,
    );
    t.eq(others, [], `${at}: only "${id}" is active`);
  }
}

export default {
  name: 'About and Skills sections',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const route of routes) {
      const url = baseUrl + route.path;
      const { content } = route;

      await page.viewport(1440);
      await page.goto(url);
      const texts = await page.eval(readTexts);
      const at = route.path;
      t.eq(texts.about, { kicker: content.sections.about.kicker, title: content.sections.about.title, intro: content.sections.about.intro }, `${at}: About header matches locale`);
      t.eq(texts.skillsHeader, { kicker: content.sections.skills.kicker, title: content.sections.skills.title, intro: content.sections.skills.intro }, `${at}: Skills header matches locale`);
      t.eq(texts.paragraphs, content.profile.about.map(normalize), `${at}: About paragraphs match locale`);
      t.eq(texts.facts, content.profile.facts.map((f) => ({ label: normalize(f.label), value: normalize(f.value) })), `${at}: fact sheet matches locale`);
      t.eq(
        texts.skills,
        content.skills.map((s) => ({ title: normalize(s.title), description: normalize(s.description), chips: s.chips.map(normalize) })),
        `${at}: skill cards match locale`,
      );
      await checkActiveAnchor(t, page, `${at} @1440`);

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        checkLayout(t, await page.eval(measureLayout), `${route.path} @${width}`, width);
      }

      await checkHover(t, browser, url, `${route.path} @1440`);
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

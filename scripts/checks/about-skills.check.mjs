/**
 * About and Skills sections (PR #3): copy matches the locale files, layout, fact rows,
 * typography, section rhythm, header width, overflow and the navbar active anchor.
 * Skills renders its pillars in loop order (build, validate, automate, ship); the loop itself is
 * covered by skills-loop.check.mjs.
 */
import { TOKENS, normalize } from './lib/context.mjs';

/** Skills loop order, by pillar icon (src/components/Skills.astro). */
const LOOP = ['code', 'shield', 'spark', 'globe'];

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
    skills: [...document.querySelectorAll('#skills [data-loop-step]')].map((step) => ({
      title: text(step.querySelector('.loop-step-static .loop-step-title')),
      description: text(step.querySelector('.loop-step-desc')),
      chips: [...step.querySelectorAll('[data-loop-chips] li')].map(text),
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
    if (r.width === 0 || el.matches('.sr-only')) continue;
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
    skillsBg: getComputedStyle(skills).backgroundColor,
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

  // Skills sits on ink, like the hero and contact bookends.
  t.eq(m.skillsBg, TOKENS.ink, `${at}: Skills section is on ink`);

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
  t.eq(m.skillsPadding, { top: sectionPad, bottom: sectionPad }, `${at}: Skills section padding ${sectionPad}px`);
  t.eq(m.headerMaxWidth, ['736px', '736px'], `${at}: section header max-width is 46rem`);
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
        LOOP.map((icon) => content.skills.find((s) => s.icon === icon)).map((s) => ({ title: normalize(s.title), description: normalize(s.description), chips: s.chips.map(normalize) })),
        `${at}: skill pillars match locale, in loop order`,
      );
      await checkActiveAnchor(t, page, `${at} @1440`);

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        checkLayout(t, await page.eval(measureLayout), `${route.path} @${width}`, width);
      }

    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

/**
 * Projects section: copy matches the locale files (by tier), section surface and rhythm, header row,
 * row 1 (2fr/1fr from 900px), row 2 (2 columns from 600px), card typography, equal-height secondary
 * cards, metrics grid, chips, overflow, and external links (target="_blank", rel="noopener").
 */
import { TOKENS, normalize } from './lib/context.mjs';

const WIDTHS = [1440, 1392, 1200, 900, 600, 390];

const COLORS = {
  white: 'rgb(255, 255, 255)',
  line: 'rgb(220, 224, 230)',
  ink: 'rgb(15, 20, 32)',
  inkLine: 'rgb(30, 38, 53)',
  muted: 'rgb(91, 100, 114)',
  mutedDark: 'rgb(166, 175, 191)',
  cobaltSoft: 'rgb(123, 150, 255)',
};

/** Cards in DOM order: featured, the secondary column, then the small grid. */
function readTexts() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const section = document.getElementById('projects');
  const links = (list) => [...list.querySelectorAll('a')].map((a) => ({ label: text(a), href: a.getAttribute('href') }));
  const chips = (list) => [...list.querySelectorAll(':scope > li')].map(text);
  const [row1, row2] = section.querySelectorAll(':scope .container > div:last-child > .grid');
  const featured = row1.querySelector(':scope > article');
  const card = (el) => {
    const lists = el.querySelectorAll('ul');
    return {
      kind: text(el.querySelector('p')),
      name: text(el.querySelector('h3')),
      description: text(el.querySelector('h3 + p')),
      stack: chips(lists[0]),
      links: lists[1] ? links(lists[1]) : [],
      hasLinksRow: Boolean(lists[1]),
    };
  };
  const repoLink = section.querySelector('header + div a');
  return {
    header: {
      kicker: text(section.querySelector('header > p:first-child')),
      title: text(section.querySelector('header h2')),
    },
    repoLink: { label: text(repoLink), href: repoLink?.getAttribute('href') },
    featured: {
      kind: text(featured.querySelector('span')),
      period: text(featured.querySelector('span + p')) || undefined,
      name: text(featured.querySelector('h3')),
      description: text(featured.querySelector('h3 + p')),
      metrics: [...featured.querySelectorAll('dl > div')].map((m) => ({ value: text(m.querySelector('dd')), label: text(m.querySelector('dt')) })),
      stack: chips(featured.querySelector('dl + ul')),
      links: links(featured.querySelector('dl + ul + ul')),
    },
    secondary: [...row1.querySelectorAll(':scope > div > article')].map(card),
    small: [...row2.querySelectorAll(':scope > article')].map(card),
  };
}

function measureLayout() {
  const px = (value) => parseFloat(value);
  const vw = document.documentElement.clientWidth;
  const section = document.getElementById('projects');
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

  const header = section.querySelector('header');
  const action = header.nextElementSibling;
  const repoLink = action.querySelector('a');
  const [row1, row2] = section.querySelectorAll(':scope .container > div:last-child > .grid');
  const featured = row1.querySelector(':scope > article');
  const column = row1.querySelector(':scope > div');
  const secondary = [...column.querySelectorAll(':scope > article')];
  const small = [...row2.querySelectorAll(':scope > article')];

  const fs = style(featured);
  const topRow = featured.firstElementChild;
  const kindChip = topRow.querySelector('span');
  const period = topRow.querySelector('p');
  const description = featured.querySelector('h3 + p');
  // 60ch in the description's own font, measured with a probe element.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:60ch';
  description.appendChild(probe);
  const sixtyCh = box(probe).width;
  probe.remove();
  const dl = featured.querySelector('dl');
  const metricItems = [...dl.querySelectorAll(':scope > div')];

  const chips = [...section.querySelectorAll('article ul > li > span')].map((chip) => {
    const card = chip.closest('article');
    const cs = style(card);
    const cb = box(card);
    const r = box(chip);
    return {
      label: chip.textContent.trim(),
      whiteSpace: style(chip).whiteSpace,
      height: r.height,
      outside: Math.max(cb.left + px(cs.paddingLeft) + px(cs.borderLeftWidth) - r.left, r.right - (cb.right - px(cs.paddingRight) - px(cs.borderRightWidth))),
    };
  });

  const overflowing = [];
  for (const el of section.querySelectorAll('*')) {
    const r = box(el);
    if (r.width === 0) continue;
    const clipsText = style(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
    if (r.left < -0.5 || r.right > vw + 0.5 || clipsText) {
      overflowing.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
    }
  }

  const ss = style(section);
  const cards = (list) => list.map((a) => ({ top: Math.round(box(a).top), left: Math.round(box(a).left), width: box(a).width, height: box(a).height }));
  return {
    vw,
    section: {
      background: ss.backgroundColor,
      borders: [ss.borderTopWidth, ss.borderTopColor, ss.borderBottomWidth, ss.borderBottomColor],
      padding: [px(ss.paddingTop), px(ss.paddingBottom)],
      headerMaxWidth: style(header).maxWidth,
    },
    headerRow: {
      linkBeside: box(action).left >= box(header).right - 0.5 && box(action).bottom <= box(header).bottom + 0.5,
      linkBelow: box(action).top >= box(header).bottom - 0.5,
      linkRightAligned: Math.abs(box(action).right - box(row1).right) < 1,
      linkFont: font(repoLink),
      linkColor: style(repoLink).color,
      linkHeight: box(repoLink).height,
    },
    row1: {
      columns: style(row1).gridTemplateColumns.split(' ').map(px),
      gap: px(style(row1).columnGap),
      rowGap: px(style(row1).rowGap),
      columnBelowFeatured: box(column).top >= box(featured).bottom - 0.5,
      columnHeight: box(column).height,
      columnGap: px(style(column).rowGap),
    },
    featured: {
      ...cards([featured])[0],
      background: fs.backgroundColor,
      padding: [fs.paddingTop, fs.paddingRight, fs.paddingBottom, fs.paddingLeft].map(px),
      minHeight: fs.minHeight,
      topRow: {
        sameLine: Math.abs(box(kindChip).top + box(kindChip).height / 2 - (box(period).top + box(period).height / 2)) < 2,
        chipAtStart: Math.abs(box(kindChip).left - box(topRow).left) < 1,
        periodAtEnd: Math.abs(box(period).right - box(topRow).right) < 1,
        periodFont: font(period),
      },
      title: font(featured.querySelector('h3')),
      description: { ...font(description), width: box(description).width, maxWidth: px(style(description).maxWidth), sixtyCh },
      metrics: {
        columns: new Set(metricItems.map((m) => Math.round(box(m).left))).size,
        border: [style(dl).borderTopWidth, style(dl).borderTopColor],
        valueFonts: metricItems.map((m) => font(m.querySelector('dd'))),
        labelFonts: metricItems.map((m) => font(m.querySelector('dt'))),
        valueTops: metricItems.map((m) => box(m.querySelector('dd')).top),
        valueAboveLabel: metricItems.every((m) => box(m.querySelector('dd')).bottom <= box(m.querySelector('dt')).top + 0.5),
      },
      chipBorders: [...featured.querySelectorAll('span')].map((c) => style(c).borderTopColor),
      linkFonts: [...featured.querySelectorAll('dl + ul + ul a')].map((a) => ({ ...font(a), height: box(a).height })),
    },
    secondary: cards(secondary).map((c, i) => ({
      ...c,
      kind: font(secondary[i].querySelector('p')),
      title: font(secondary[i].querySelector('h3')),
      description: font(secondary[i].querySelector('h3 + p')),
      links: [...secondary[i].querySelectorAll('ul + ul a')].map((a) => ({ ...font(a), height: box(a).height })),
    })),
    small: cards(small).map((c, i) => ({
      ...c,
      kind: font(small[i].querySelector('p')),
      title: font(small[i].querySelector('h3')),
      description: font(small[i].querySelector('h3 + p')),
    })),
    row2Gap: [px(style(row2).columnGap), box(row2).top - box(row1).bottom],
    chips,
    overflowing,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

const spread = (values) => Math.max(...values) - Math.min(...values);

function checkLayout(t, m, at, width) {
  const desktop = width >= 900;
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
  t.eq(m.overflowing, [], `${at}: nothing in Projects overflows`);

  // Section surface and rhythm.
  t.eq(m.section.background, COLORS.white, `${at}: section is white`);
  t.eq(m.section.borders, ['1px', COLORS.line, '1px', COLORS.line], `${at}: 1px line borders top and bottom`);
  const pad = desktop ? 112 : 72;
  t.eq(m.section.padding, [pad, pad], `${at}: section padding ${pad}px`);
  t.eq(m.section.headerMaxWidth, '736px', `${at}: section header max-width is 46rem`);

  // Header row: link to the right from 900px, stacked below the header under 900px.
  if (desktop) {
    t.ok(m.headerRow.linkBeside, `${at}: repos link sits beside the header`);
    t.ok(m.headerRow.linkRightAligned, `${at}: repos link is right-aligned`);
  } else {
    t.ok(m.headerRow.linkBelow, `${at}: repos link stacks below the header`);
  }
  t.ok(
    m.headerRow.linkFont.size === 14 && m.headerRow.linkFont.weight === '600' && m.headerRow.linkColor === TOKENS.cobalt,
    `${at}: repos link is 14px/600 cobalt`,
    JSON.stringify(m.headerRow.linkFont),
  );
  t.ok(m.headerRow.linkHeight >= TOKENS.touchTarget, `${at}: repos link touch target ≥44px`, `${m.headerRow.linkHeight}px`);

  // Row 1: 2fr/1fr from 900px with a 24px gap, single column below.
  if (desktop) {
    t.eq(m.row1.columns.length, 2, `${at}: row 1 has two columns`);
    t.near(m.row1.columns[0] / m.row1.columns[1], 2, 0.01, `${at}: row 1 columns are 2fr/1fr`);
    t.eq(m.row1.gap, 24, `${at}: row 1 column gap is 24px`);
  } else {
    t.eq(m.row1.columns.length, 1, `${at}: row 1 is a single column`);
    t.ok(m.row1.columnBelowFeatured, `${at}: secondary cards sit below the featured card`);
    t.eq(m.row1.rowGap, 24, `${at}: row 1 row gap is 24px`);
  }

  // Secondary cards: equal height and filling the column next to the featured card.
  t.eq(m.row1.columnGap, 24, `${at}: secondary cards are 24px apart`);
  if (desktop) {
    t.ok(spread(m.secondary.map((c) => c.height)) <= 1, `${at}: secondary cards have equal height`, JSON.stringify(m.secondary.map((c) => c.height)));
    t.near(m.row1.columnHeight, m.featured.height, 1, `${at}: secondary column matches the featured card height`);
    const filled = m.secondary.reduce((sum, c) => sum + c.height, 0) + m.row1.columnGap;
    t.near(filled, m.row1.columnHeight, 1, `${at}: secondary cards fill the column`);
  }

  // Featured card.
  const f = m.featured;
  t.eq(f.background, COLORS.ink, `${at}: featured card is ink`);
  const featuredPad = desktop ? 40 : 24;
  t.eq(f.padding, [featuredPad, featuredPad, featuredPad, featuredPad], `${at}: featured padding ${featuredPad}px`);
  t.ok(f.minHeight === '420px' && f.height >= 420, `${at}: featured min-height 420px`, `${f.minHeight}, ${f.height}px`);
  t.ok(f.topRow.chipAtStart && f.topRow.periodAtEnd, `${at}: kind chip and period are space-between`);
  if (width >= 600) t.ok(f.topRow.sameLine, `${at}: kind chip and period share a line`);
  t.ok(
    f.topRow.periodFont.mono && f.topRow.periodFont.size === 12 && f.topRow.periodFont.color === COLORS.cobaltSoft,
    `${at}: period is mono 12px cobalt-soft`,
    JSON.stringify(f.topRow.periodFont),
  );
  t.ok(
    f.title.size === 32 && f.title.weight === '600' && f.title.tracking === -0.02 && f.title.color === COLORS.white,
    `${at}: featured H3 is 32px/600, -0.02em, white`,
    JSON.stringify(f.title),
  );
  t.ok(
    f.description.size === 16 && f.description.lineHeight === 1.6 && f.description.color === COLORS.mutedDark,
    `${at}: featured description is 16px/1.6 muted-dark`,
    JSON.stringify(f.description),
  );
  t.near(f.description.maxWidth, f.description.sixtyCh, 0.5, `${at}: featured description max-width is 60ch`);
  t.ok(f.description.width <= f.description.sixtyCh + 0.5, `${at}: featured description is at most 60ch wide`);
  t.eq(f.metrics.columns, width >= 600 ? 3 : 1, `${at}: metrics columns`);
  t.eq(f.metrics.border, ['1px', COLORS.inkLine], `${at}: metrics have a 1px ink-line top border`);
  t.ok(
    f.metrics.valueFonts.every((v) => v.size === 24 && v.weight === '600' && v.color === COLORS.white),
    `${at}: metric values are 24px/600 white`,
    JSON.stringify(f.metrics.valueFonts[0]),
  );
  t.ok(
    f.metrics.labelFonts.every((l) => l.size === 13 && l.color === COLORS.mutedDark),
    `${at}: metric labels are 13px muted-dark`,
    JSON.stringify(f.metrics.labelFonts[0]),
  );
  t.ok(f.metrics.valueAboveLabel, `${at}: metric value sits above its label`);
  if (f.metrics.columns > 1) {
    t.ok(spread(f.metrics.valueTops) <= 1, `${at}: metric values share one top line`, JSON.stringify(f.metrics.valueTops));
  }
  t.ok(f.chipBorders.every((c) => c === 'rgb(42, 50, 66)'), `${at}: featured chips are dark`);
  t.ok(
    f.linkFonts.length > 0 && f.linkFonts.every((l) => l.size === 14 && l.weight === '600' && l.color === COLORS.cobaltSoft && l.height >= TOKENS.touchTarget),
    `${at}: featured links are 14px/600 cobalt-soft, ≥44px tall`,
    JSON.stringify(f.linkFonts),
  );

  // Secondary and small card typography.
  t.ok(
    m.secondary.every((c) => c.kind.mono && c.kind.size === 12 && c.kind.color === TOKENS.cobalt),
    `${at}: secondary kind is mono 12px cobalt`,
  );
  t.ok(m.secondary.every((c) => c.title.size === 22 && c.title.weight === '600'), `${at}: secondary H3 is 22px/600`);
  t.ok(
    m.secondary.every((c) => c.description.size === 15 && c.description.lineHeight === 1.55 && c.description.color === COLORS.muted),
    `${at}: secondary description is 15px/1.55 muted`,
    JSON.stringify(m.secondary.map((c) => c.description)),
  );
  t.ok(
    m.secondary.flatMap((c) => c.links).every((l) => l.size === 14 && l.weight === '600' && l.color === TOKENS.cobalt && l.height >= TOKENS.touchTarget),
    `${at}: secondary links are 14px/600 cobalt, ≥44px tall`,
  );
  t.ok(
    m.small.every((c) => c.kind.mono && c.kind.size === 12 && c.kind.color === TOKENS.cobalt),
    `${at}: small kind is mono 12px cobalt`,
  );
  t.ok(m.small.every((c) => c.title.size === 18 && c.title.weight === '600'), `${at}: small H3 is 18px/600`);
  t.ok(
    m.small.every((c) => c.description.size === 14 && c.description.lineHeight === 1.55 && c.description.color === COLORS.muted),
    `${at}: small description is 14px/1.55 muted`,
  );

  // Row 2: two columns from 600px, one below; 24px gaps.
  const smallColumns = new Set(m.small.map((c) => c.left)).size;
  t.eq(smallColumns, width >= 600 ? 2 : 1, `${at}: small cards columns`);
  t.eq(m.row2Gap.map(Math.round), [24, 24], `${at}: row 2 column gap and spacing below row 1 are 24px`);

  // Chips: one line, 28px, inside their card.
  const bad = (fn) => m.chips.filter(fn).map((c) => c.label);
  t.eq(bad((c) => c.whiteSpace !== 'nowrap' || Math.round(c.height) !== TOKENS.chipHeight), [], `${at}: chips are one 28px line`);
  t.eq(bad((c) => c.outside > 0.5), [], `${at}: chips sit inside their card's content box`);
}

async function checkLinks(t, page, at) {
  const links = await page.eval(() =>
    [...document.querySelectorAll('#projects a[href]')].map((a) => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: (a.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean),
    })),
  );
  const external = links.filter((l) => /^https?:\/\//.test(l.href));
  const internal = links.filter((l) => !/^https?:\/\//.test(l.href));
  t.ok(external.length >= 2, `${at}: section has external links`, JSON.stringify(links));
  t.eq(
    external.filter((l) => l.target !== '_blank' || !l.rel.includes('noopener')).map((l) => l.href),
    [],
    `${at}: external links open in a new tab with rel="noopener"`,
  );
  t.eq(internal.filter((l) => l.target !== null).map((l) => l.href), [], `${at}: internal links stay in the same tab`);
}

async function checkHoverUnderline(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440 });
  await page.goto(url);
  const selector = '#projects header + div a';
  const before = await page.eval((sel) => getComputedStyle(document.querySelector(sel)).textDecorationLine, selector);
  await page.hover(selector);
  const after = await page.waitFor((sel) => getComputedStyle(document.querySelector(sel)).textDecorationLine === 'underline', {
    args: [selector],
    timeout: 1500,
  });
  t.ok(before === 'none' && after, `${at}: repos link underlines on hover`, `before: ${before}`);
  await page.close();
}

export default {
  name: 'Projects section',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;
      const { content } = route;
      const byTier = (tier) => content.projects.filter((p) => p.tier === tier);
      const card = (p) => ({
        kind: normalize(p.kind),
        name: normalize(p.name),
        description: normalize(p.description),
        stack: p.stack.map(normalize),
        links: p.links.map((l) => ({ label: normalize(l.label), href: l.href })),
        hasLinksRow: p.links.length > 0,
      });

      await page.viewport(1440);
      await page.goto(url);
      const texts = await page.eval(readTexts);
      t.eq(texts.header, { kicker: content.sections.projects.kicker, title: content.sections.projects.title }, `${at}: Projects header matches locale`);
      t.eq(texts.repoLink, { label: content.ui.allRepos, href: content.profile.contact.github }, `${at}: repos link matches locale`);
      const [featured] = byTier('featured');
      t.eq(
        texts.featured,
        {
          kind: normalize(featured.kind),
          period: featured.period && normalize(featured.period),
          name: normalize(featured.name),
          description: normalize(featured.description),
          metrics: (featured.metrics ?? []).map((m) => ({ value: m.value, label: normalize(m.label) })),
          stack: featured.stack.map(normalize),
          links: featured.links.map((l) => ({ label: normalize(l.label), href: l.href })),
        },
        `${at}: featured project matches locale`,
      );
      t.ok(texts.featured.metrics.every((m) => m.value === '[N]'), `${at}: "[N]" metric placeholders are untouched`);
      t.eq(texts.secondary, byTier('secondary').map(card), `${at}: secondary projects match locale`);
      t.eq(texts.small, byTier('small').map(card), `${at}: small projects match locale (no links row when empty)`);
      await checkLinks(t, page, at);

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        checkLayout(t, await page.eval(measureLayout), `${at} @${width}`, width);
      }

      await checkHoverUnderline(t, browser, url, `${at} @1440`);
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

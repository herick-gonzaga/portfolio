/**
 * Projects section: copy matches the locale files (by tier), section surface and rhythm, header row,
 * row 1 (the two featured cards, MQ-Test then Meus Investimentos, in two equal columns from 1200px,
 * stacked below), row 2 (secondary then small cards: 3 columns from 1200px, 2 from 600px with a lone
 * last card spanning both, 1 below), card typography, equal-height cards per row, metrics grids and
 * real metric values, chips, overflow, the featured link note (text, style, aria-describedby), and
 * external links (target="_blank", rel="noopener noreferrer").
 * Links: a card with no links has no links row, no link points at the "#projects" placeholder,
 * and no link returns 404 (lib/links.mjs).
 */
import { TOKENS, normalize } from './lib/context.mjs';
import { checkLinkTargets } from './lib/links.mjs';

const WIDTHS = [1440, 1392, 1200, 1199, 900, 600, 390];

/** Featured cards in order, with their real metric values per locale (locale-specific thousands separator). */
const FEATURED_SLUGS = ['mq-test', 'meus-investimentos'];
const FEATURED_VALUES = {
  en: [['500+', '9,000+', '10+'], ['6', '4', 'R$ 0']],
  pt: [['500+', '9.000+', '10+'], ['6', '4', 'R$ 0']],
  es: [['500+', '9.000+', '10+'], ['6', '4', 'R$ 0']],
};
const LIVE_APP = 'https://day-trader-ruby.vercel.app';

/** Cards in DOM order: the featured row, then row 2 (secondary cards, then small cards). */
function readTexts() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const section = document.getElementById('projects');
  const links = (list) => [...list.querySelectorAll('a')].map((a) => ({ label: text(a), href: a.getAttribute('href') }));
  const chips = (list) => [...list.querySelectorAll(':scope > li')].map(text);
  const [row1, row2] = section.querySelectorAll(':scope .container > div:last-child > .grid');
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
    featured: [...row1.querySelectorAll(':scope > article')].map((featured) => {
      const featuredLinks = featured.querySelector('dl + ul + ul');
      const note = featured.querySelector('dl + ul + ul + p');
      return {
        kind: text(featured.querySelector('span')),
        period: text(featured.querySelector('span + p')) || undefined,
        name: text(featured.querySelector('h3')),
        description: text(featured.querySelector('h3 + p')),
        metrics: [...featured.querySelectorAll('dl > div')].map((m) => ({ value: text(m.querySelector('dd .sr-only')), label: text(m.querySelector('dt')) })),
        stack: chips(featured.querySelector('dl + ul')),
        links: featuredLinks ? links(featuredLinks) : [],
        hasLinksRow: Boolean(featuredLinks),
        linkNote: note ? text(note) : undefined,
      };
    }),
    rest: [...row2.querySelectorAll(':scope > article')].map(card),
  };
}

function measureLayout(secondaryCount) {
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
  const featuredCards = [...row1.querySelectorAll(':scope > article')];
  const rest = [...row2.querySelectorAll(':scope > article')];
  const secondary = rest.slice(0, secondaryCount);
  const small = rest.slice(secondaryCount);

  const readFeatured = (featured) => {
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
    return { topRow, kindChip, period, description, sixtyCh, dl, metricItems, fs };
  };

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
    // .sr-only is clipped to 1px on purpose (the static metric values for screen readers).
    if (r.width === 0 || el.closest('.sr-only')) continue;
    const clipsText = style(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
    if (r.left < -0.5 || r.right > vw + 0.5 || clipsText) {
      overflowing.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
    }
  }

  const ss = style(section);
  const cards = (list) => list.map((a) => ({ top: Math.round(box(a).top), left: Math.round(box(a).left), width: box(a).width, height: box(a).height }));
  const featured = featuredCards.map((card) => {
    const { topRow, kindChip, period, description, sixtyCh, dl, metricItems, fs } = readFeatured(card);
    const note = card.querySelector('dl + ul + ul + p');
    return {
      ...cards([card])[0],
      background: fs.backgroundColor,
      padding: [fs.paddingTop, fs.paddingRight, fs.paddingBottom, fs.paddingLeft].map(px),
      minHeight: fs.minHeight,
      topRow: {
        sameLine: Math.abs(box(kindChip).top + box(kindChip).height / 2 - (box(period).top + box(period).height / 2)) < 2,
        chipAtStart: Math.abs(box(kindChip).left - box(topRow).left) < 1,
        periodAtEnd: Math.abs(box(period).right - box(topRow).right) < 1,
        periodFont: font(period),
      },
      title: font(card.querySelector('h3')),
      description: { ...font(description), width: box(description).width, maxWidth: px(style(description).maxWidth), sixtyCh },
      metrics: {
        columns: new Set(metricItems.map((m) => Math.round(box(m).left))).size,
        border: [style(dl).borderTopWidth, style(dl).borderTopColor],
        valueFonts: metricItems.map((m) => font(m.querySelector('dd'))),
        labelFonts: metricItems.map((m) => font(m.querySelector('dt'))),
        valueTops: metricItems.map((m) => box(m.querySelector('dd')).top),
        valueAboveLabel: metricItems.every((m) => box(m.querySelector('dd')).bottom <= box(m.querySelector('dt')).top + 0.5),
      },
      chipBorders: [...card.querySelectorAll('ul > li > span')].map((c) => style(c).borderTopColor),
      linkFonts: [...card.querySelectorAll('dl + ul + ul a')].map((a) => ({ ...font(a), height: box(a).height })),
      note: note && { ...font(note), belowLinks: box(note).top >= box(card.querySelector('dl + ul + ul')).bottom - 0.5 },
    };
  });
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
    },
    featured,
    row2: {
      columns: style(row2).gridTemplateColumns.split(' ').map(px),
      gap: px(style(row2).columnGap),
      rowGap: px(style(row2).rowGap),
      cards: cards(rest),
      width: box(row2).width,
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
  const sideBySide = width >= 1200;
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
  t.eq(m.overflowing, [], `${at}: nothing in Projects overflows`);

  // Section surface and rhythm.
  t.eq(m.section.background, TOKENS.white, `${at}: section is white`);
  t.eq(m.section.borders, ['1px', TOKENS.line, '1px', TOKENS.line], `${at}: 1px line borders top and bottom`);
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

  // Row 1: the featured cards in two equal columns from 1200px with a 24px gap; one column below.
  const featuredTops = m.featured.map((c) => c.top);
  if (sideBySide) {
    t.eq(m.row1.columns.length, 2, `${at}: row 1 has two columns`);
    t.near(m.row1.columns[0], m.row1.columns[1], 1, `${at}: featured columns are equal`);
    t.eq(m.row1.gap, 24, `${at}: row 1 column gap is 24px`);
    t.ok(spread(featuredTops) <= 1, `${at}: featured cards share a row`, JSON.stringify(featuredTops));
    t.ok(spread(m.featured.map((c) => c.height)) <= 1, `${at}: featured cards have equal height`, JSON.stringify(m.featured.map((c) => c.height)));
  } else {
    t.eq(m.row1.columns.length, 1, `${at}: row 1 is a single column`);
    t.ok(featuredTops[1] > featuredTops[0], `${at}: MQ-Test stacks above Meus Investimentos`);
    t.eq(m.row1.rowGap, 24, `${at}: row 1 row gap is 24px`);
  }

  // Featured cards.
  for (const [i, f] of m.featured.entries()) {
    const fat = `${at} featured #${i + 1}`;
    t.eq(f.background, TOKENS.ink, `${fat}: card is ink`);
    const featuredPad = desktop ? 40 : 24;
    t.eq(f.padding, [featuredPad, featuredPad, featuredPad, featuredPad], `${fat}: padding ${featuredPad}px`);
    t.ok(f.minHeight === '420px' && f.height >= 420, `${fat}: min-height 420px`, `${f.minHeight}, ${f.height}px`);
    t.ok(f.topRow.chipAtStart && f.topRow.periodAtEnd, `${fat}: kind chip and period are space-between`);
    if (width >= 600) t.ok(f.topRow.sameLine, `${fat}: kind chip and period share a line`);
    t.ok(
      f.topRow.periodFont.mono && f.topRow.periodFont.size === 12 && f.topRow.periodFont.color === TOKENS.cobaltSoft,
      `${fat}: period is mono 12px cobalt-soft`,
      JSON.stringify(f.topRow.periodFont),
    );
    t.ok(
      f.title.size === 32 && f.title.weight === '600' && f.title.tracking === -0.02 && f.title.color === TOKENS.white,
      `${fat}: H3 is 32px/600, -0.02em, white`,
      JSON.stringify(f.title),
    );
    t.ok(
      f.description.size === 16 && f.description.lineHeight === 1.6 && f.description.color === TOKENS.mutedDark,
      `${fat}: description is 16px/1.6 muted-dark`,
      JSON.stringify(f.description),
    );
    t.near(f.description.maxWidth, f.description.sixtyCh, 0.5, `${fat}: description max-width is 60ch`);
    t.ok(f.description.width <= f.description.sixtyCh + 0.5, `${fat}: description is at most 60ch wide`);
    t.eq(f.metrics.columns, width >= 600 ? 3 : 1, `${fat}: metrics columns`);
    t.eq(f.metrics.border, ['1px', TOKENS.inkLine], `${fat}: metrics have a 1px ink-line top border`);
    t.ok(
      f.metrics.valueFonts.every((v) => v.size === 24 && v.weight === '600' && v.color === TOKENS.white),
      `${fat}: metric values are 24px/600 white`,
      JSON.stringify(f.metrics.valueFonts[0]),
    );
    t.ok(
      f.metrics.labelFonts.every((l) => l.size === 13 && l.color === TOKENS.mutedDark),
      `${fat}: metric labels are 13px muted-dark`,
      JSON.stringify(f.metrics.labelFonts[0]),
    );
    t.ok(f.metrics.valueAboveLabel, `${fat}: metric value sits above its label`);
    if (f.metrics.columns > 1) {
      t.ok(spread(f.metrics.valueTops) <= 1, `${fat}: metric values share one top line`, JSON.stringify(f.metrics.valueTops));
    }
    t.ok(f.chipBorders.every((c) => c === 'rgb(42, 50, 66)'), `${fat}: chips are dark`);
    t.ok(
      f.linkFonts.every((l) => l.size === 14 && l.weight === '600' && l.color === TOKENS.cobaltSoft && l.height >= TOKENS.touchTarget),
      `${fat}: links are 14px/600 cobalt-soft, ≥44px tall`,
      JSON.stringify(f.linkFonts),
    );
    if (f.note) {
      t.ok(
        f.note.mono && f.note.size === 12 && f.note.color === TOKENS.mutedDark && f.note.belowLinks,
        `${fat}: link note is mono 12px muted-dark, below the links`,
        JSON.stringify(f.note),
      );
    }
  }

  // Secondary and small card typography.
  t.ok(
    m.secondary.every((c) => c.kind.mono && c.kind.size === 12 && c.kind.color === TOKENS.cobalt),
    `${at}: secondary kind is mono 12px cobalt`,
  );
  t.ok(m.secondary.every((c) => c.title.size === 22 && c.title.weight === '600'), `${at}: secondary H3 is 22px/600`);
  t.ok(
    m.secondary.every((c) => c.description.size === 15 && c.description.lineHeight === 1.55 && c.description.color === TOKENS.muted),
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
    m.small.every((c) => c.description.size === 14 && c.description.lineHeight === 1.55 && c.description.color === TOKENS.muted),
    `${at}: small description is 14px/1.55 muted`,
  );

  // Row 2: three columns from 1200px, two from 600px (a lone last card spans both), one below; 24px gaps.
  const expectedColumns = sideBySide ? 3 : width >= 600 ? 2 : 1;
  t.eq(m.row2.columns.length, expectedColumns, `${at}: row 2 columns`);
  const rows = Map.groupBy(m.row2.cards, (c) => c.top);
  for (const [top, row] of rows) {
    t.ok(spread(row.map((c) => c.height)) <= 1, `${at}: row 2 cards at ${top}px share one height`, JSON.stringify(row.map((c) => c.height)));
  }
  const last = m.row2.cards.at(-1);
  if (rows.get(last.top).length === 1) {
    t.near(last.width, m.row2.width, 1, `${at}: a lone last card in row 2 spans the full width`);
  }
  t.eq(m.row2Gap.map(Math.round), [24, 24], `${at}: row 2 column gap and spacing below row 1 are 24px`);

  // Chips: one line, 28px, inside their card.
  const bad = (fn) => m.chips.filter(fn).map((c) => c.label);
  t.eq(bad((c) => c.whiteSpace !== 'nowrap' || Math.round(c.height) !== TOKENS.chipHeight), [], `${at}: chips are one 28px line`);
  t.eq(bad((c) => c.outside > 0.5), [], `${at}: chips sit inside their card's content box`);
}

async function checkLinks(t, page, baseUrl, at, noteText) {
  const links = await page.eval(() =>
    [...document.querySelectorAll('#projects a[href]')].map((a) => ({
      label: a.textContent.replace(/\s+/g, ' ').trim(),
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: (a.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean),
      describedBy: a.getAttribute('aria-describedby'),
      note: a.getAttribute('aria-describedby') ? document.getElementById(a.getAttribute('aria-describedby'))?.textContent.trim() : null,
    })),
  );
  const external = links.filter((l) => /^https?:\/\//.test(l.href));
  const internal = links.filter((l) => !/^https?:\/\//.test(l.href));
  t.ok(external.length >= 1, `${at}: section has external links`, JSON.stringify(links));
  t.eq(
    external.filter((l) => l.target !== '_blank' || !l.rel.includes('noopener') || !l.rel.includes('noreferrer')).map((l) => l.href),
    [],
    `${at}: external links open in a new tab with rel="noopener noreferrer"`,
  );
  t.eq(internal.filter((l) => l.target !== null).map((l) => l.href), [], `${at}: internal links stay in the same tab`);
  const liveApp = links.find((l) => l.href === LIVE_APP);
  t.ok(liveApp && liveApp.note === noteText, `${at}: live-app link is described by the login note`, JSON.stringify(liveApp));
  // The live app sits behind a login (and an external host): check only the site's own links for 404s.
  await checkLinkTargets(t, links.filter((l) => l.href !== LIVE_APP), baseUrl, at);
}

async function checkHoverUnderline(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440 });
  await page.goto(url);
  // The animated underline is a 1px background line on the label span (card-interactions.check.mjs).
  const selector = '#projects header + div a .link-underline';
  const width = (sel) => getComputedStyle(document.querySelector(sel)).backgroundSize;
  const before = await page.eval(width, selector);
  await page.hover('#projects header + div a');
  const after = await page.waitFor((sel) => getComputedStyle(document.querySelector(sel)).backgroundSize === '100% 1px', {
    args: [selector],
    timeout: 1500,
  });
  t.ok(before === '0% 1px' && after, `${at}: repos link underlines on hover`, `before: ${before}`);
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
      const featured = byTier('featured');
      t.eq(featured.map((p) => p.slug), FEATURED_SLUGS, `${at}: featured projects are MQ-Test, then Meus Investimentos`);
      t.eq(
        texts.featured,
        featured.map((p) => ({
          kind: normalize(p.kind),
          period: p.period && normalize(p.period),
          name: normalize(p.name),
          description: normalize(p.description),
          metrics: (p.metrics ?? []).map((m) => ({ value: m.value, label: normalize(m.label) })),
          stack: p.stack.map(normalize),
          links: p.links.map((l) => ({ label: normalize(l.label), href: l.href })),
          hasLinksRow: p.links.length > 0,
          linkNote: p.linkNote && normalize(p.linkNote),
        })),
        `${at}: featured projects match locale`,
      );
      t.eq(
        texts.featured.map((f) => f.metrics.map((m) => m.value)),
        FEATURED_VALUES[route.locale],
        `${at}: featured metrics are the real numbers in the locale's number format`,
      );
      t.eq(texts.rest, [...byTier('secondary'), ...byTier('small')].map(card), `${at}: secondary then small projects match locale (no links row when empty)`);
      t.ok(!content.projects.some((p) => p.slug === 'susagendamento'), `${at}: SUSAGENDAMENTO card is gone`);
      await checkLinks(t, page, baseUrl, at, normalize(featured[1].linkNote));

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        checkLayout(t, await page.eval(measureLayout, byTier('secondary').length), `${at} @${width}`, width);
      }

      await checkHoverUnderline(t, browser, url, `${at} @1440`);
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

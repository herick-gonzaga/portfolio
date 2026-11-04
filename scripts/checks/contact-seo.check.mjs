/**
 * Contact section + footer, <head> metadata and crawler files.
 * Contact (1440, 900, 600, 390px): copy matches the locale files; mailto and external links
 * (new tab, rel noopener); ink background, 120/56 padding (72/40 below 900px) and the 1px
 * transparent → cobalt → transparent top line; 2 bottom-aligned columns with a 48px gap from 900px;
 * typography; CTAs full width below 600px; 5 details rows (email, LinkedIn, GitHub, Instagram,
 * time zone) with dividers and label/value stacking below
 * 600px; footer row (13px, 24px top padding, ink-line border) that wraps on mobile; no overflow.
 * Head: title, description, canonical, 4 hreflang, Open Graph, Twitter card, valid JSON-LD Person
 * and theme-color per route; og.png is a 1200×630 PNG; favicons, robots.txt and sitemap reachable.
 */
import config from '../../astro.config.mjs';
import { TOKENS, normalize } from './lib/context.mjs';

const WIDTHS = [1440, 900, 600, 390];
const SITE = new URL(config.site).origin;
const OG_LOCALE = { en: 'en_US', pt: 'pt_BR', es: 'es_LA' };

function readTexts() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const link = (a) => ({ label: text(a), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') });
  const section = document.getElementById('contact');
  const left = section.querySelector('h2').parentElement;
  const footer = section.querySelector('footer');
  return {
    labelledBy: section.getAttribute('aria-labelledby'),
    titleId: section.querySelector('h2').id,
    kicker: text(left.querySelector('p')),
    title: text(section.querySelector('h2')),
    body: text(section.querySelector('h2 + p')),
    buttons: [...left.querySelectorAll('a')].map(link),
    rows: [...section.querySelectorAll('[data-contact-details] > li')].map((li) => {
      const [label, value] = li.children;
      return { label: text(label), value: text(value), ...(value.tagName === 'A' ? { link: link(value) } : {}) };
    }),
    footer: {
      items: [...footer.querySelectorAll('p')].map(text),
      backTop: link(footer.querySelector('a')),
    },
    // The Contact section is the only place left on the page that used to be a placeholder.
    placeholders: document.querySelectorAll('main > section#contact').length,
  };
}

function measure() {
  const px = (value) => parseFloat(value);
  const vw = document.documentElement.clientWidth;
  const box = (el) => el.getBoundingClientRect();
  const style = (el) => getComputedStyle(el);
  const font = (el) => {
    const s = style(el);
    return {
      size: px(s.fontSize),
      lineHeight: Math.round((px(s.lineHeight) / px(s.fontSize)) * 100) / 100,
      color: s.color,
      mono: s.fontFamily.includes('JetBrains Mono'),
    };
  };
  const chWidth = (el, n) => {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;width:${n}ch`;
    el.appendChild(probe);
    const w = box(probe).width;
    probe.remove();
    return w;
  };
  const border = (el, side) => {
    const s = style(el);
    return [px(s[`border${side}Width`]), s[`border${side}Color`]];
  };

  const section = document.getElementById('contact');
  const s = style(section);
  const line = section.firstElementChild;
  const container = section.querySelector('.container');
  const grid = container.firstElementChild;
  const [left, list] = grid.children;
  const h2 = section.querySelector('h2');
  const body = section.querySelector('h2 + p');
  const buttons = [...left.querySelectorAll('a')];
  const footer = section.querySelector('footer');
  const containerBox = box(container);
  const contentWidth = containerBox.width - px(style(container).paddingLeft) - px(style(container).paddingRight);

  const overflowing = [];
  for (const el of section.querySelectorAll('*')) {
    const r = box(el);
    if (r.width === 0) continue;
    const clips = style(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'svg';
    if (r.left < -0.5 || r.right > vw + 0.5 || clips) overflowing.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
  }

  return {
    hscroll: document.documentElement.scrollWidth - vw,
    background: s.backgroundColor,
    padding: [px(s.paddingTop), px(s.paddingBottom)],
    topLine: {
      height: box(line).height,
      top: box(line).top - box(section).top,
      width: box(line).width - box(section).width,
      image: style(line).backgroundImage,
    },
    gridColumns: style(grid).gridTemplateColumns.split(' ').length,
    columnGap: px(style(grid).columnGap),
    rowGap: px(style(grid).rowGap),
    leftBottom: box(left).bottom,
    leftTop: box(left).top,
    listTop: box(list).top,
    listBottom: box(list).bottom,
    listLeft: box(list).left,
    leftRight: box(left).right,
    kicker: font(left.querySelector('p')),
    h2: { ...font(h2), weight: style(h2).fontWeight, maxWidth: px(style(h2).maxWidth), ch16: chWidth(h2, 16), width: box(h2).width },
    body: { ...font(body), maxWidth: px(style(body).maxWidth), ch50: chWidth(body, 50), width: box(body).width },
    buttons: buttons.map((a) => ({ width: box(a).width, height: box(a).height, left: box(a).left, top: box(a).top })),
    contentWidth,
    leftWidth: box(left).width,
    list: { tag: list.tagName, borderTop: border(list, 'Top') },
    rows: [...list.children].map((li) => {
      const [label, value] = li.children;
      const lb = box(label);
      const vb = box(value);
      const lib = box(li);
      return {
        borderBottom: border(li, 'Bottom'),
        label: font(label),
        value: font(value),
        stacked: vb.top >= lb.bottom - 0.5,
        leftAligned: Math.abs(vb.left - lb.left) < 0.5,
        labelLeftOfValue: lb.right <= vb.left + 0.5,
        centersAligned: Math.abs(lb.top + lb.height / 2 - (vb.top + vb.height / 2)) < 1.5,
        valueFlushRight: Math.abs(vb.right - lib.right) < 0.5,
        valueHeight: vb.height,
      };
    }),
    footer: {
      borderTop: border(footer, 'Top'),
      paddingTop: px(style(footer).paddingTop),
      ...font(footer),
      flexWrap: style(footer).flexWrap,
      taglineMono: font(footer.querySelectorAll('p')[1]).mono,
      lineTops: [...new Set([...footer.children].map((el) => Math.round(box(el).top + box(el).height / 2)))].length,
      backTopHeight: box(footer.querySelector('a')).height,
      bottomGap: box(section).bottom - box(footer).bottom,
    },
    overflowing,
  };
}

function readHead() {
  const meta = (attr, key) => [...document.querySelectorAll(`meta[${attr}="${key}"]`)].map((m) => m.content);
  const ldNodes = [...document.querySelectorAll('script[type="application/ld+json"]')];
  let ld = null;
  let ldError = null;
  try {
    ld = JSON.parse(ldNodes[0]?.textContent ?? '');
  } catch (error) {
    ldError = String(error);
  }
  return {
    lang: document.documentElement.lang,
    title: document.title,
    titleCount: document.querySelectorAll('head > title').length,
    description: meta('name', 'description'),
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute('href')),
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [l.hreflang, l.getAttribute('href')]),
    themeColor: meta('name', 'theme-color'),
    icons: [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.getAttribute('href')),
    og: Object.fromEntries(
      ['type', 'title', 'description', 'url', 'locale', 'locale:alternate', 'image', 'image:width', 'image:height'].map((k) => [k, meta('property', `og:${k}`)]),
    ),
    twitter: Object.fromEntries(['card', 'title', 'description', 'image'].map((k) => [k, meta('name', `twitter:${k}`)])),
    ldCount: ldNodes.length,
    ld,
    ldError,
  };
}

function checkTexts(t, texts, content, at) {
  const { profile, ui, sections } = content;
  const { contact } = profile;
  t.eq(texts.placeholders, 1, `${at}: exactly one #contact section`);
  t.eq(texts.labelledBy, texts.titleId, `${at}: section is labelled by its H2`);
  t.eq(texts.kicker, sections.contact.kicker, `${at}: kicker matches locale`);
  t.eq(texts.title, normalize(profile.contactHeadline), `${at}: H2 matches locale`);
  t.eq(texts.body, normalize(profile.contactText), `${at}: text matches locale`);
  t.eq(
    texts.buttons,
    [
      { label: ui.emailMe, href: `mailto:${contact.email}`, target: null, rel: null },
      { label: ui.linkedin, href: contact.linkedin, target: '_blank', rel: 'noopener' },
    ],
    `${at}: CTA labels, mailto and LinkedIn (new tab, rel noopener)`,
  );
  t.eq(
    texts.rows,
    [
      { label: ui.contact.email, value: contact.email, link: { label: contact.email, href: `mailto:${contact.email}`, target: null, rel: null } },
      { label: ui.contact.linkedin, value: contact.linkedinLabel, link: { label: contact.linkedinLabel, href: contact.linkedin, target: '_blank', rel: 'noopener' } },
      { label: ui.contact.github, value: contact.githubLabel, link: { label: contact.githubLabel, href: contact.github, target: '_blank', rel: 'noopener' } },
      { label: ui.contact.instagram, value: contact.instagramLabel, link: { label: contact.instagramLabel, href: contact.instagram, target: '_blank', rel: 'noopener' } },
      { label: ui.contact.timezone, value: normalize(contact.timezone) },
    ],
    `${at}: detail rows (labels, values, links) match locale`,
  );
  t.eq(texts.footer.items, [`© 2026 ${profile.fullName}`, normalize(profile.footerTagline)], `${at}: footer copyright and tagline`);
  t.eq(texts.footer.backTop, { label: ui.backTop, href: '#top', target: null, rel: null }, `${at}: back-to-top link`);
}

function checkLayout(t, m, at, width) {
  const desktop = width >= 900;
  t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
  t.eq(m.background, TOKENS.ink, `${at}: ink background`);
  t.eq(m.padding, desktop ? [120, 56] : [72, 40], `${at}: padding ${desktop ? '120/56' : '72/40'}`);
  t.ok(
    m.topLine.height === 1 && m.topLine.top === 0 && m.topLine.width === 0,
    `${at}: 1px full-width line at the top`,
    JSON.stringify(m.topLine),
  );
  t.eq(
    m.topLine.image,
    'linear-gradient(to right, rgba(0, 0, 0, 0), rgb(43, 91, 255), rgba(0, 0, 0, 0))',
    `${at}: top line is transparent → cobalt → transparent`,
  );

  if (desktop) {
    t.eq(m.gridColumns, 2, `${at}: 2 columns`);
    t.eq(m.columnGap, 48, `${at}: 48px column gap`);
    t.near(m.leftBottom, m.listBottom, 0.5, `${at}: columns are bottom-aligned`);
    t.near(m.listLeft - m.leftRight, 48, 0.5, `${at}: details list starts 48px right of the text column`);
  } else {
    t.eq(m.gridColumns, 1, `${at}: single column`);
    t.near(m.listTop - m.leftBottom, 48, 0.5, `${at}: 48px between text and details list`);
  }

  t.eq([m.kicker.size, m.kicker.color, m.kicker.mono], [13, TOKENS.cobaltSoft, true], `${at}: kicker mono 13px cobalt-soft`);
  t.ok(
    m.h2.size === (desktop ? 48 : 32) && m.h2.lineHeight === 1.1 && m.h2.color === TOKENS.white && m.h2.weight === '600',
    `${at}: H2 ${desktop ? 48 : 32}px/1.1 white`,
    JSON.stringify(m.h2),
  );
  t.near(m.h2.maxWidth, m.h2.ch16, 0.5, `${at}: H2 max-width is 16ch`);
  t.ok(m.h2.width <= m.h2.ch16 + 0.5, `${at}: H2 stays within 16ch`, JSON.stringify(m.h2));
  t.ok(
    m.body.size === 17 && m.body.lineHeight === 1.6 && m.body.color === TOKENS.mutedDark,
    `${at}: text 17px/1.6 muted-dark`,
    JSON.stringify(m.body),
  );
  t.near(m.body.maxWidth, m.body.ch50, 0.5, `${at}: text max-width is 50ch`);

  t.ok(m.buttons.every((b) => b.height === 48), `${at}: CTAs are 48px tall`, JSON.stringify(m.buttons));
  if (width < 600) {
    t.ok(m.buttons.every((b) => Math.abs(b.width - m.leftWidth) < 0.5), `${at}: CTAs are full width`, JSON.stringify(m.buttons));
    t.ok(m.buttons[1].top > m.buttons[0].top, `${at}: CTAs stack`);
  } else {
    t.ok(m.buttons.every((b) => b.width < m.leftWidth - 1), `${at}: CTAs size to their content`, JSON.stringify(m.buttons));
    t.near(m.buttons[1].top, m.buttons[0].top, 0.5, `${at}: CTAs share a row`);
  }

  t.eq(m.list.tag, 'UL', `${at}: details are a <ul>`);
  t.eq(m.list.borderTop, [1, TOKENS.inkLine], `${at}: list has a 1px ink-line top border`);
  t.eq(m.rows.length, 5, `${at}: 5 detail rows`);
  for (const [n, row] of m.rows.entries()) {
    const label = `${at}: row ${n + 1}`;
    t.eq(row.borderBottom, [1, TOKENS.inkLine], `${label} has a 1px ink-line bottom border`);
    t.eq([row.label.size, row.label.color, row.label.mono], [14, TOKENS.mutedDark, false], `${label} label is 14px muted-dark`);
    t.eq([row.value.size, row.value.color, row.value.mono], [15, TOKENS.white, true], `${label} value is mono 15px white`);
    t.ok(row.valueHeight >= 44, `${label} value is a ≥44px target`, `${row.valueHeight}px`);
    if (width < 600) {
      t.ok(row.stacked && row.leftAligned, `${label} label sits above the value`, JSON.stringify(row));
    } else {
      t.ok(row.labelLeftOfValue && row.centersAligned && row.valueFlushRight, `${label} label left, value right`, JSON.stringify(row));
    }
  }

  const f = m.footer;
  t.eq(f.borderTop, [1, TOKENS.inkLine], `${at}: footer has a 1px ink-line top border`);
  t.eq(f.paddingTop, 24, `${at}: footer has 24px top padding`);
  t.eq([f.size, f.color], [13, TOKENS.mutedDark], `${at}: footer text is 13px muted`);
  t.ok(f.taglineMono, `${at}: footer tagline is mono`);
  t.eq(f.flexWrap, 'wrap', `${at}: footer row can wrap`);
  t.ok(f.backTopHeight >= 44, `${at}: back-to-top is a ≥44px target`, `${f.backTopHeight}px`);
  t.near(f.bottomGap, desktop ? 56 : 40, 0.5, `${at}: footer ends ${desktop ? 56 : 40}px above the section bottom`);
  if (width >= 1440) t.eq(f.lineTops, 1, `${at}: footer fits one row`);
  if (width <= 390) t.ok(f.lineTops > 1, `${at}: footer wraps onto several rows`, `${f.lineTops} row(s)`);
  t.eq(m.overflowing, [], `${at}: nothing in Contact overflows`);
}

function checkHead(t, head, route) {
  const at = route.path;
  const { content, locale } = route;
  const url = (path) => SITE + path;
  const canonical = url(route.path);
  t.eq(head.lang, route.lang, `${at}: html lang`);
  t.eq([head.titleCount, head.title], [1, content.meta.title], `${at}: one <title> from locale`);
  t.eq(head.description, [content.meta.description], `${at}: one meta description from locale`);
  t.ok(content.meta.description.length <= 155, `${at}: description is ≤155 characters`, `${content.meta.description.length}`);
  t.eq(head.canonical, [canonical], `${at}: absolute canonical`);
  t.eq(
    head.hreflang,
    [['en', url('/')], ['pt-BR', url('/pt/')], ['es', url('/es/')], ['x-default', url('/')]],
    `${at}: 4 absolute hreflang alternates`,
  );
  t.eq(head.themeColor, ['#0F1420'], `${at}: theme-color #0F1420`);
  t.eq(head.icons, ['/favicon.ico', '/favicon.svg'], `${at}: favicon.ico and favicon.svg linked`);
  t.eq(
    head.og,
    {
      type: ['profile'],
      title: [content.meta.title],
      description: [content.meta.description],
      url: [canonical],
      locale: [OG_LOCALE[locale]],
      'locale:alternate': Object.entries(OG_LOCALE).filter(([code]) => code !== locale).map(([, value]) => value),
      image: [url('/og.png')],
      'image:width': ['1200'],
      'image:height': ['630'],
    },
    `${at}: Open Graph tags`,
  );
  t.eq(
    head.twitter,
    { card: ['summary_large_image'], title: [content.meta.title], description: [content.meta.description], image: [url('/og.png')] },
    `${at}: Twitter card tags`,
  );
  t.ok(head.ldCount === 1 && head.ld && !head.ldError, `${at}: one valid JSON-LD block`, head.ldError ?? `${head.ldCount} block(s)`);
  if (head.ld) {
    const { ld } = head;
    t.eq(
      { context: ld['@context'], type: ld['@type'], name: ld.name, jobTitle: ld.jobTitle, url: ld.url, sameAs: ld.sameAs, inLanguage: ld.inLanguage },
      {
        context: 'https://schema.org',
        type: 'Person',
        name: content.profile.fullName,
        jobTitle: content.profile.title,
        url: canonical,
        sameAs: [content.profile.contact.linkedin, content.profile.contact.github, content.profile.contact.instagram],
        inLanguage: route.lang,
      },
      `${at}: JSON-LD Person fields`,
    );
  }
}

async function checkFiles(t, baseUrl, routes) {
  const get = async (path) => {
    const response = await fetch(baseUrl + path);
    return { status: response.status, type: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) };
  };

  const og = await get('/og.png');
  const isPng = og.body.subarray(1, 4).toString() === 'PNG';
  t.ok(og.status === 200 && isPng, '/og.png is served as a PNG', `${og.status} ${og.type}`);
  if (isPng) t.eq([og.body.readUInt32BE(16), og.body.readUInt32BE(20)], [1200, 630], '/og.png is 1200×630');

  const svg = await get('/favicon.svg');
  t.ok(svg.status === 200 && svg.body.toString().includes('rx="7"') && svg.body.toString().includes('#2B5BFF'), '/favicon.svg is the cobalt rounded square');
  const ico = await get('/favicon.ico');
  t.ok(ico.status === 200 && ico.body.readUInt16LE(2) === 1 && ico.body.readUInt16LE(4) >= 1, '/favicon.ico is an icon file', `${ico.status}`);

  const robots = await get('/robots.txt');
  const robotsText = robots.body.toString();
  t.eq(robots.status, 200, '/robots.txt is reachable');
  t.ok(/^User-agent: \*$/m.test(robotsText) && /^Allow: \/$/m.test(robotsText) && !/^Disallow: \/\S*/m.test(robotsText), 'robots.txt allows all crawlers', robotsText);
  t.ok(robotsText.includes(`Sitemap: ${SITE}/sitemap-index.xml`), 'robots.txt points to the sitemap index', robotsText);

  const index = await get('/sitemap-index.xml');
  const sitemapUrls = [...index.body.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  t.ok(index.status === 200 && sitemapUrls.length > 0, '/sitemap-index.xml is reachable and lists sitemaps', `${index.status}`);
  const entries = [];
  for (const sitemapUrl of sitemapUrls) {
    const sitemap = await get(new URL(sitemapUrl).pathname);
    t.eq(sitemap.status, 200, `${new URL(sitemapUrl).pathname} is reachable`);
    for (const [, block] of sitemap.body.toString().matchAll(/<url>(.*?)<\/url>/gs)) {
      entries.push({
        loc: block.match(/<loc>([^<]+)<\/loc>/)[1],
        alternates: [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href]).sort(),
      });
    }
  }
  const expectedAlternates = routes.map((r) => [r.lang, SITE + r.path]).sort();
  t.eq(entries.map((e) => e.loc).sort(), routes.map((r) => SITE + r.path).sort(), 'sitemap lists exactly the three routes');
  t.ok(
    entries.every((e) => JSON.stringify(e.alternates) === JSON.stringify(expectedAlternates)),
    'every sitemap entry lists the en, pt-BR and es alternates',
    JSON.stringify(entries),
  );
}

export default {
  name: 'Contact section & SEO metadata',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const route of routes) {
      const url = baseUrl + route.path;
      const at = route.path;

      await page.viewport(1440);
      await page.goto(url);
      checkHead(t, await page.eval(readHead), route);
      checkTexts(t, await page.eval(readTexts), route.content, at);

      for (const width of WIDTHS) {
        await page.viewport(width);
        await page.goto(url);
        checkLayout(t, await page.eval(measure), `${at} @${width}`, width);
      }
    }
    await checkFiles(t, baseUrl, routes);
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

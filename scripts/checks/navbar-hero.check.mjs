/**
 * Navbar, language switcher, first-visit redirect, mobile sheet, hero and <head> (PR #2).
 */
import { TOKENS, normalize } from './lib/context.mjs';

const anchorIds = ['about', 'skills', 'projects', 'journey', 'impact'];

async function checkHead(t, page, route) {
  const head = await page.eval(() => {
    const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    return {
      lang: document.documentElement.lang,
      title: document.title,
      description: document.querySelector('meta[name="description"]').content,
      alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [l.hreflang, new URL(l.href).pathname]),
      canonical: new URL(document.querySelector('link[rel="canonical"]').href).pathname,
      inLanguage: ld.inLanguage,
      ldType: ld['@type'],
    };
  });
  const at = route.path;
  t.eq(head.lang, route.lang, `${at}: html lang`);
  t.eq(head.title, route.content.meta.title, `${at}: <title> from locale`);
  t.eq(head.description, route.content.meta.description, `${at}: meta description from locale`);
  t.eq(head.canonical, route.path, `${at}: canonical`);
  t.eq(head.alternates, [['en', '/'], ['pt-BR', '/pt/'], ['es', '/es/'], ['x-default', '/']], `${at}: hreflang alternates`);
  t.eq([head.ldType, head.inLanguage], ['Person', route.lang], `${at}: JSON-LD Person inLanguage`);
}

async function checkNavbar(t, page, route) {
  const { nav } = route.content.ui;
  for (const width of [1440, 1200, 900]) {
    await page.viewport(width);
    await page.goto(page.url);
    const at = `${route.path} @${width}`;
    const m = await page.eval(() => {
      const header = document.querySelector('[data-navbar]');
      const style = getComputedStyle(header);
      const links = [...header.querySelectorAll('nav a[data-section]')];
      const row = header.querySelector('.container');
      const brand = row.firstElementChild.getBoundingClientRect();
      const cluster = row.children[1].getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      return {
        height: header.getBoundingClientRect().height,
        position: style.position,
        scrolled: header.hasAttribute('data-scrolled'),
        background: style.backgroundColor,
        links: links.map((a) => ({ id: a.dataset.section, label: a.textContent.trim(), visible: a.offsetParent !== null, right: a.getBoundingClientRect().right })),
        menuVisible: document.querySelector('[data-menu-open]').offsetParent !== null,
        overlap: brand.right > cluster.left,
        clusterRight: cluster.right,
        vw,
        rowOverflow: row.scrollWidth - row.clientWidth,
      };
    });
    t.eq([m.height, m.position], [TOKENS.navHeight, 'sticky'], `${at}: navbar is a 72px sticky bar`);
    t.eq([m.scrolled, m.background], [false, 'rgba(0, 0, 0, 0)'], `${at}: navbar is transparent at the top`);
    t.eq(m.links.map((l) => [l.id, l.label]), anchorIds.map((id) => [id, nav[id]]), `${at}: desktop anchors and labels`);
    t.ok(m.links.every((l) => l.visible) && !m.menuVisible, `${at}: desktop anchors shown, menu button hidden`);
    t.ok(!m.overlap && m.rowOverflow <= 0 && m.clusterRight <= m.vw, `${at}: nav items fit the bar without overlap`, JSON.stringify(m));
  }

  await page.viewport(1440);
  await page.eval(() => window.scrollTo(0, 200));
  // Waits past the 160ms background transition for the final color.
  const scrolled = await page.waitFor(
    (expected) => {
      const header = document.querySelector('[data-navbar]');
      const bg = getComputedStyle(header).backgroundColor;
      return header.hasAttribute('data-scrolled') && bg === expected && bg;
    },
    { args: [TOKENS.navScrolled], timeout: 1500 },
  );
  t.eq(scrolled, TOKENS.navScrolled, `${route.path}: navbar turns ink 86% after scrolling past 40px`);
  await page.eval(() => window.scrollTo(0, 0));
  const reset = await page.waitFor(() => !document.querySelector('[data-navbar]').hasAttribute('data-scrolled'));
  t.ok(reset, `${route.path}: navbar returns to transparent at the top`);
}

async function checkSwitcher(t, browser, baseUrl, route) {
  const page = await browser.newPage({ width: 1440 });
  page.url = baseUrl + route.path;
  await page.goto(page.url);
  const at = `${route.path} switcher`;
  const root = '#lang-desktop-menu';
  const trigger = '[data-lang-switcher]:has(#lang-desktop-menu) [data-lang-trigger]';

  const initial = await page.eval((sel, menu) => {
    const button = document.querySelector(sel);
    return {
      label: button.textContent.trim(),
      ariaLabel: button.getAttribute('aria-label'),
      expanded: button.getAttribute('aria-expanded'),
      hidden: document.querySelector(menu).hidden,
      options: [...document.querySelectorAll(`${menu} a`)].map((a) => [a.dataset.langOption, a.getAttribute('href'), a.hreflang, a.getAttribute('aria-current')]),
    };
  }, trigger, root);
  t.eq([initial.label, initial.ariaLabel, initial.expanded, initial.hidden], [route.locale.toUpperCase(), `${route.content.ui.language} ${route.locale.toUpperCase()}`, 'false', true], `${at}: closed trigger shows the locale code`);
  t.eq(
    initial.options,
    [['en', '/', 'en', route.locale === 'en' ? 'true' : null], ['pt', '/pt/', 'pt-BR', route.locale === 'pt' ? 'true' : null], ['es', '/es/', 'es', route.locale === 'es' ? 'true' : null]],
    `${at}: options link to each locale with hreflang and aria-current`,
  );

  const state = () =>
    page.eval((sel, menu) => ({
      expanded: document.querySelector(sel).getAttribute('aria-expanded'),
      hidden: document.querySelector(menu).hidden,
      focus: document.activeElement?.dataset.langOption ?? (document.activeElement === document.querySelector(sel) ? 'trigger' : document.activeElement?.tagName),
    }), trigger, root);

  await page.click(trigger);
  t.eq(await state(), { expanded: 'true', hidden: false, focus: route.locale }, `${at}: click opens and focuses the current locale`);
  await page.press('ArrowDown');
  const order = ['en', 'pt', 'es'];
  const next = order[(order.indexOf(route.locale) + 1) % 3];
  t.eq((await state()).focus, next, `${at}: ArrowDown moves to the next option`);
  await page.press('Escape');
  t.eq(await state(), { expanded: 'false', hidden: true, focus: 'trigger' }, `${at}: Escape closes and returns focus`);

  await page.click(trigger);
  await page.click({ x: 700, y: 600 });
  t.eq((await state()).hidden, true, `${at}: outside click closes`);

  // Choosing a locale keeps the current hash and remembers the choice.
  const target = route.locale === 'pt' ? 'es' : 'pt';
  await page.eval(() => history.replaceState(null, '', '#skills'));
  await page.click(trigger);
  await page.click(`${root} a[data-lang-option="${target}"]`);
  const landed = await page.waitFor(
    (path) => location.pathname === path && document.readyState === 'complete' && { path: location.pathname, hash: location.hash, stored: localStorage.getItem('lang') },
    { args: [`/${target}/`], timeout: 5000 },
  );
  t.eq(landed, { path: `/${target}/`, hash: '#skills', stored: target }, `${at}: choosing ${target} keeps #skills and stores lang`);
  await page.close();
}

async function checkRedirect(t, browser, baseUrl) {
  const visit = async (language, path, presetLang) => {
    const page = await browser.newPage({ language });
    if (presetLang) {
      await page.goto(`${baseUrl}/pt/`);
      await page.eval((lang) => localStorage.setItem('lang', lang), presetLang);
    }
    await page.goto(baseUrl + path);
    await page.waitFor(() => document.readyState === 'complete');
    await new Promise((resolve) => setTimeout(resolve, 150));
    const result = await page.eval(() => ({ path: location.pathname, hash: location.hash, stored: localStorage.getItem('lang') }));
    await page.close();
    return result;
  };
  t.eq(await visit('pt-BR', '/'), { path: '/pt/', hash: '', stored: 'pt' }, 'redirect: pt browser on / goes to /pt/ once');
  t.eq(await visit('es-ES', '/'), { path: '/es/', hash: '', stored: 'es' }, 'redirect: es browser on / goes to /es/');
  t.eq(await visit('pt-BR', '/#about'), { path: '/pt/', hash: '#about', stored: 'pt' }, 'redirect: keeps the hash');
  t.eq(await visit('en-US', '/'), { path: '/', hash: '', stored: null }, 'redirect: en browser stays on /');
  t.eq(await visit('fr-FR', '/'), { path: '/', hash: '', stored: null }, 'redirect: other languages stay on /');
  t.eq(await visit('pt-BR', '/', 'en'), { path: '/', hash: '', stored: 'en' }, 'redirect: a stored choice wins over the browser language');
  t.eq(await visit('en-US', '/pt/'), { path: '/pt/', hash: '', stored: null }, 'redirect: explicit /pt/ is never redirected');
  t.eq(await visit('pt-BR', '/es/'), { path: '/es/', hash: '', stored: null }, 'redirect: explicit /es/ is never redirected');
}

async function checkMobileSheet(t, browser, baseUrl, route) {
  const page = await browser.newPage({ width: 390, height: 844 });
  await page.goto(baseUrl + route.path);
  const at = `${route.path} @390 sheet`;
  const { nav } = route.content.ui;
  const state = () =>
    page.eval(() => {
      const sheet = document.querySelector('[data-mobile-menu]');
      const open = document.querySelector('[data-menu-open]');
      const active = document.activeElement;
      return {
        hidden: sheet.hidden,
        expanded: open.getAttribute('aria-expanded'),
        overflow: document.documentElement.style.overflow,
        focus: active?.hasAttribute('data-menu-close') ? 'close' : active?.hasAttribute('data-menu-open') ? 'open' : active?.dataset.section ?? active?.tagName,
      };
    });

  const closed = await page.eval(() => {
    const open = document.querySelector('[data-menu-open]');
    const r = open.getBoundingClientRect();
    return { visible: open.offsetParent !== null, desktopNav: document.querySelector('header nav').offsetParent !== null, w: r.width, h: r.height, label: open.getAttribute('aria-label') };
  });
  t.eq([closed.visible, closed.desktopNav], [true, false], `${at}: menu button shown, desktop anchors hidden`);
  t.ok(closed.w >= TOKENS.touchTarget && closed.h >= TOKENS.touchTarget, `${at}: menu button is a 44px touch target`);
  t.eq(closed.label, route.content.ui.menuOpen, `${at}: menu button aria-label`);
  t.eq(await state(), { hidden: true, expanded: 'false', overflow: '', focus: 'BODY' }, `${at}: sheet starts closed`);

  await page.click('[data-menu-open]');
  t.eq(await state(), { hidden: false, expanded: 'true', overflow: 'hidden', focus: 'close' }, `${at}: opens, locks scroll, focuses close`);
  const sheet = await page.eval(() => {
    const el = document.querySelector('[data-mobile-menu]');
    const r = el.getBoundingClientRect();
    return {
      role: el.getAttribute('role'),
      modal: el.getAttribute('aria-modal'),
      fullScreen: r.top === 0 && r.left === 0 && r.width === innerWidth && r.height === innerHeight,
      links: [...el.querySelectorAll('[data-sheet-link]')].map((a) => [a.dataset.section, a.textContent.trim(), a.getBoundingClientRect().height]),
      switcher: Boolean(el.querySelector('[data-lang-switcher]')),
      closeLabel: el.querySelector('[data-menu-close]').getAttribute('aria-label'),
    };
  });
  t.eq([sheet.role, sheet.modal, sheet.fullScreen], ['dialog', 'true', true], `${at}: full-screen modal dialog`);
  t.eq(sheet.links.map(([id, label]) => [id, label]), [...anchorIds.map((id) => [id, nav[id]]), ['contact', nav.cta]], `${at}: 6 links with locale labels`);
  t.ok(sheet.links.every(([, , h]) => h >= TOKENS.touchTarget), `${at}: sheet links are ≥44px tall`);
  t.eq([sheet.switcher, sheet.closeLabel], [true, route.content.ui.menuClose], `${at}: switcher and labelled close button`);

  // Focus trap: Shift+Tab from the first focusable element wraps to the last link.
  await page.eval(() => document.querySelector('#lang-mobile-menu').previousElementSibling.focus());
  await page.press('Tab', { shift: true });
  t.eq((await state()).focus, 'contact', `${at}: Shift+Tab wraps to the last link`);
  await page.press('Tab');
  t.ok((await page.eval(() => document.activeElement?.hasAttribute('data-lang-trigger'))), `${at}: Tab wraps back to the first control`);

  // Escape inside the switcher closes only the switcher.
  await page.click('[data-mobile-menu] [data-lang-trigger]');
  await page.press('Escape');
  const afterSwitcherEscape = await page.eval(() => ({ menu: document.querySelector('#lang-mobile-menu').hidden, sheet: document.querySelector('[data-mobile-menu]').hidden }));
  t.eq(afterSwitcherEscape, { menu: true, sheet: false }, `${at}: Escape in the switcher keeps the sheet open`);

  await page.press('Escape');
  t.eq(await state(), { hidden: true, expanded: 'false', overflow: '', focus: 'open' }, `${at}: Escape closes and returns focus`);

  await page.click('[data-menu-open]');
  await page.click('[data-mobile-menu] a[data-section="skills"]');
  const afterLink = await page.waitFor(() => location.hash === '#skills' && document.querySelector('[data-mobile-menu]').hidden && { hash: location.hash, overflow: document.documentElement.style.overflow });
  t.eq(afterLink, { hash: '#skills', overflow: '' }, `${at}: a link closes the sheet and navigates`);

  await page.click('[data-menu-open]');
  await page.viewport(1000);
  const grown = await page.waitFor(() => document.querySelector('[data-mobile-menu]').hidden && document.documentElement.style.overflow === '');
  t.ok(grown, `${at}: growing past 900px closes the sheet and releases scroll`);
  await page.close();
}

function measureHero() {
  const hero = document.getElementById('top');
  const h1 = hero.querySelector('h1');
  const h1Style = getComputedStyle(h1);
  const container = hero.querySelector('.container');
  const cs = getComputedStyle(container);
  const contentLeft = container.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
  const contentRight = container.getBoundingClientRect().right - parseFloat(cs.paddingRight);
  const ctas = [...hero.querySelectorAll('.hero-ctas a')].map((a) => {
    const r = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), label: a.textContent.trim(), height: r.height, width: r.width, overflow: a.scrollWidth - a.clientWidth, right: r.right };
  });
  const chips = [...hero.querySelectorAll('ul.hero-ctas li > span')].map((chip) => {
    const r = chip.getBoundingClientRect();
    return { label: chip.textContent.trim(), height: r.height, whiteSpace: getComputedStyle(chip).whiteSpace, inside: r.left >= contentLeft - 0.5 && r.right <= contentRight + 0.5 };
  });
  const svg = hero.querySelector('svg.system-diagram');
  const nodes = [...svg.querySelectorAll('.sd-node')].map((g) => {
    const rect = g.querySelector('rect').getBBox();
    return [...g.querySelectorAll('text')].every((text) => {
      const b = text.getBBox();
      return b.x >= rect.x && b.x + b.width <= rect.x + rect.width;
    });
  });
  return {
    status: hero.querySelector('.hero-status').textContent.replace(/\s+/g, ' ').trim(),
    h1: h1.textContent.replace(/\s+/g, ' ').trim(),
    h1Lines: Math.round(h1.getBoundingClientRect().height / parseFloat(h1Style.lineHeight)),
    h1Size: parseFloat(h1Style.fontSize),
    ctas,
    contentWidth: contentRight - contentLeft,
    chips,
    diagram: { role: svg.getAttribute('role'), label: svg.getAttribute('aria-label'), width: svg.getBoundingClientRect().width, nodesFit: nodes },
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

async function checkHero(t, page, route) {
  const { profile, ui, diagram } = route.content;
  for (const width of [1440, 1200, 900, 600, 390]) {
    await page.viewport(width);
    await page.goto(page.url);
    const m = await page.eval(measureHero);
    const at = `${route.path} @${width} hero`;
    t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `${m.hscroll}px`);
    t.eq([m.status, m.h1], [normalize(profile.status), normalize(profile.headline)], `${at}: status and H1 from locale`);
    t.eq(m.h1Size, width >= 900 ? 72 : 44, `${at}: H1 size`);
    if (width === 1440) t.ok(m.h1Lines <= 3, `${at}: H1 wraps to at most 3 lines`, `${m.h1Lines} lines`);
    if (width === 390) t.ok(m.h1Lines <= 5, `${at}: H1 wraps to at most 5 lines`, `${m.h1Lines} lines`);
    t.eq(m.ctas.map((c) => [c.href, c.label]), [['#projects', ui.viewProjects], ['#contact', ui.contactMe]], `${at}: CTA links and labels`);
    t.ok(m.ctas.every((c) => c.height === TOKENS.buttonHeight && c.overflow <= 0), `${at}: CTAs are 48px and fit their label`);
    if (width < 600) t.ok(m.ctas.every((c) => Math.abs(c.width - m.contentWidth) < 1), `${at}: CTAs are full width`);
    else t.ok(m.ctas.every((c) => c.width < m.contentWidth - 1), `${at}: CTAs are auto width`);
    t.eq(m.chips.map((c) => c.label), profile.heroChips, `${at}: hero chips from locale`);
    t.ok(m.chips.every((c) => c.whiteSpace === 'nowrap' && Math.round(c.height) === TOKENS.chipHeight && c.inside), `${at}: hero chips are one line and inside the hero`);
    t.eq([m.diagram.role, m.diagram.label], ['img', diagram.ariaLabel], `${at}: diagram is a labelled image`);
    t.ok(m.diagram.width <= (width >= 900 ? 460 : 320) + 0.5, `${at}: diagram max width`, `${m.diagram.width}px`);
    t.ok(m.diagram.nodesFit.every(Boolean), `${at}: diagram node labels fit their boxes`);
  }
}

async function checkHeroMotion(t, browser, url, at) {
  const read = (page) => page.eval(() => [...document.querySelectorAll('.hero-status, .hero-title, .hero-ctas')].map((el) => getComputedStyle(el).opacity));
  const page = await browser.newPage();
  await page.goto(url);
  const done = await page.waitFor(() => [...document.querySelectorAll('.hero-status, .hero-title, .hero-ctas')].every((el) => getComputedStyle(el).opacity === '1'), { timeout: 2000 });
  t.ok(done, `${at}: hero load sequence ends fully visible`);
  t.ok(await page.eval(() => document.body.classList.contains('hero-ready')), `${at}: hero sequence is armed`);
  await page.reducedMotion(true);
  await page.goto(url);
  const opacities = await read(page);
  const animations = await page.eval(() => [...document.querySelectorAll('.hero-status, .hero-title, .hero-ctas')].map((el) => getComputedStyle(el).animationName));
  t.ok(opacities.every((o) => o === '1') && animations.every((a) => a === 'none'), `${at}: reduced motion renders the final state`, JSON.stringify({ opacities, animations }));
  await page.close();
}

export default {
  name: 'Navbar, language switcher, redirect, mobile sheet and hero',
  async run({ browser, baseUrl, routes, t }) {
    for (const route of routes) {
      const page = await browser.newPage();
      page.url = baseUrl + route.path;
      await page.goto(page.url);
      await checkHead(t, page, route);
      await checkNavbar(t, page, route);
      await checkHero(t, page, route);
      t.eq(page.errors, [], `${route.path}: no uncaught page errors`);
      await page.close();
      await checkSwitcher(t, browser, baseUrl, route);
      await checkMobileSheet(t, browser, baseUrl, route);
      await checkHeroMotion(t, browser, page.url, route.path);
    }
    await checkRedirect(t, browser, baseUrl);
  },
};

/**
 * "Beyond the code" panel (PersonalPanel.astro) at 1440 and 390px, in every locale.
 * Navbar brand split: the "HG" square is a "Back to top" link (≥44px target) that scrolls to the
 * top without opening the panel; only the name next to it opens the panel, under its own
 * localized name ("Herick Gonzaga — beyond the code"), and keyboard Tab goes logo → name.
 * Triggers: the navbar name and the name inside the hero intro are buttons that open one
 * modal <dialog> (aria-modal, labelled by its title); the hero intro still reads as the locale
 * string. Content: title, body, the photo (/images/herick.jpg, loaded, localized alt, object-fit
 * cover filling the media box) with the "HG" monogram kept hidden as its fallback (a broken image
 * swaps to it), and the
 * Instagram button (new tab, rel noopener). Keyboard: the close button gets focus on open, Tab
 * and Shift+Tab wrap inside the panel, Esc closes and returns focus to the trigger. The close
 * button and a backdrop click close it too; the page scroll lock is released on close. The panel
 * fits the viewport without horizontal scroll and every control is a ≥44px target.
 */
import { TOKENS, normalize } from './lib/context.mjs';

const WIDTHS = [1440, 390];
const INSTAGRAM = 'https://www.instagram.com/herick.andrey/';

function readClosed() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const dialog = document.querySelector('[data-personal-panel]');
  const triggers = [...document.querySelectorAll('[data-personal-open]')];
  return {
    dialogs: document.querySelectorAll('dialog').length,
    tag: dialog?.tagName,
    open: dialog?.open,
    ariaModal: dialog?.getAttribute('aria-modal'),
    titleMatches: dialog?.getAttribute('aria-labelledby') === dialog?.querySelector('h2')?.id,
    triggers: triggers.map((el) => ({
      tag: el.tagName,
      text: text(el),
      region: el.closest('[data-navbar]') ? 'navbar' : el.closest('#top') ? 'hero' : 'other',
      label: el.getAttribute('aria-label'),
      haspopup: el.getAttribute('aria-haspopup'),
      controls: el.getAttribute('aria-controls'),
    })),
    heroIntro: text(document.querySelector('#top h1 + p')),
  };
}

function readBrand() {
  const logo = document.querySelector('[data-navbar] [data-brand-top]');
  const name = document.querySelector('[data-navbar] [data-personal-open]');
  const r = logo?.getBoundingClientRect();
  return {
    logo: logo && {
      tag: logo.tagName,
      href: logo.getAttribute('href'),
      label: logo.getAttribute('aria-label'),
      text: logo.textContent.trim(),
      opensPanel: logo.hasAttribute('data-personal-open') || logo.hasAttribute('aria-haspopup'),
      containsName: logo.contains(name),
      size: [Math.round(r.width), Math.round(r.height)],
    },
    nameText: name?.textContent.trim(),
  };
}

const focusedBrand = () => {
  const el = document.activeElement;
  if (el?.hasAttribute('data-brand-top')) return 'logo';
  if (el?.matches('[data-navbar] [data-personal-open]')) return 'name';
  return el?.tagName ?? null;
};

function readOpen() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const dialog = document.querySelector('[data-personal-panel]');
  const box = dialog.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const ig = dialog.querySelector('[data-personal-instagram]');
  const photo = dialog.querySelector('[data-personal-photo]');
  const fallback = dialog.querySelector('[data-personal-fallback]');
  const targets = [...dialog.querySelectorAll('a[href], button')].map((el) => el.getBoundingClientRect().height);
  return {
    open: dialog.open,
    title: text(dialog.querySelector('h2')),
    body: text(dialog.querySelector('h2 + p')),
    instagram: { label: text(ig), href: ig?.getAttribute('href'), target: ig?.getAttribute('target'), rel: ig?.getAttribute('rel') },
    media: photo && {
      src: photo.getAttribute('src'),
      alt: photo.getAttribute('alt'),
      loaded: photo.complete && photo.naturalWidth > 0,
      visible: !photo.hidden && photo.getBoundingClientRect().height > 0,
      fit: getComputedStyle(photo).objectFit,
      fillsBox: (() => {
        const m = dialog.querySelector('[data-personal-media]').getBoundingClientRect();
        const r = photo.getBoundingClientRect();
        return Math.abs(r.width - m.width) < 1 && Math.abs(r.height - m.height) < 1;
      })(),
    },
    fallback: fallback && { inDom: true, hidden: fallback.hidden, text: text(fallback) },
    focusIsClose: document.activeElement?.hasAttribute('data-personal-close'),
    closeLabel: dialog.querySelector('[data-personal-close]')?.getAttribute('aria-label'),
    inside: box.left >= -0.5 && box.right <= vw + 0.5 && box.top >= -0.5 && box.bottom <= window.innerHeight + 0.5,
    hscroll: dialog.scrollWidth - dialog.clientWidth,
    minTarget: Math.min(...targets),
    scrollLocked: document.documentElement.style.overflow === 'hidden',
  };
}

const focused = () => {
  const el = document.activeElement;
  if (el?.hasAttribute('data-personal-close')) return 'close';
  if (el?.hasAttribute('data-personal-instagram')) return 'instagram';
  return el?.closest('[data-personal-panel]') ? 'panel-other' : 'outside';
};

const afterClose = () => {
  const dialog = document.querySelector('[data-personal-panel]');
  const el = document.activeElement;
  return {
    open: dialog.open,
    scrollLocked: document.documentElement.style.overflow === 'hidden',
    focusRegion: el?.hasAttribute('data-personal-open') ? (el.closest('[data-navbar]') ? 'navbar' : 'hero') : el?.tagName,
  };
};

const isClosed = () => !document.querySelector('[data-personal-panel]').open;
const isOpen = () => document.querySelector('[data-personal-panel]').open;

export default {
  name: 'Personal panel ("Beyond the code")',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const width of WIDTHS) {
      await page.viewport(width);
      for (const route of routes) {
        const { profile, personal, ui } = route.content;
        const at = `${route.path} @${width}`;
        await page.goto(baseUrl + route.path);

        const c = await page.eval(readClosed);
        t.eq(c.dialogs, 1, `${at}: exactly one <dialog> on the page`);
        t.eq([c.tag, c.open, c.ariaModal], ['DIALOG', false, 'true'], `${at}: panel is a closed aria-modal <dialog>`);
        t.ok(c.titleMatches, `${at}: panel is labelled by its title`);
        t.eq(
          c.triggers,
          [
            { tag: 'BUTTON', text: profile.name, region: 'navbar', label: personal.open, haspopup: 'dialog', controls: 'personal-panel' },
            { tag: 'BUTTON', text: profile.name, region: 'hero', label: null, haspopup: 'dialog', controls: 'personal-panel' },
          ],
          `${at}: navbar name and hero-intro name are dialog trigger buttons`,
        );
        t.ok(personal.open.startsWith(profile.name), `${at}: navbar name's accessible name starts with its visible text (WCAG 2.5.3)`);

        // Navbar brand split: the logo is a separate "Back to top" link.
        const b = await page.eval(readBrand);
        t.eq(
          b.logo && { ...b.logo, size: undefined },
          { tag: 'A', href: '#top', label: ui.backTop, text: profile.initials, opensPanel: false, containsName: false, size: undefined },
          `${at}: "${profile.initials}" logo is a "Back to top" link, separate from the name`,
        );
        t.ok(b.logo && Math.min(...b.logo.size) >= TOKENS.touchTarget, `${at}: logo link is a ≥44px target`, JSON.stringify(b.logo?.size));
        t.ok(ui.backTop !== personal.open, `${at}: logo and name have distinct accessible names`);
        t.eq(b.nameText, profile.name, `${at}: name button shows only the name`);

        await page.eval(() => window.scrollTo(0, 1500));
        await page.click('[data-brand-top]');
        const scrolledTop = await page.waitFor(() => window.scrollY < 1, { timeout: 3000 });
        await page.settle();
        t.ok(scrolledTop, `${at}: clicking the logo scrolls back to the top`);
        t.ok(await page.eval(isClosed), `${at}: clicking the logo does not open the panel`);

        // Keyboard: logo → name, and Enter on the name opens the panel.
        await page.goto(baseUrl + route.path);
        await page.press('Tab');
        const firstStop = await page.eval(focusedBrand);
        await page.press('Tab');
        const secondStop = await page.eval(focusedBrand);
        t.eq([firstStop, secondStop], ['logo', 'name'], `${at}: Tab reaches the logo, then the name`);
        await page.press('Enter');
        t.ok(await page.waitFor(isOpen), `${at}: Enter on the name opens the panel`);
        await page.press('Escape');
        await page.waitFor(isClosed);
        await page.settle();
        t.eq(await page.eval(focusedBrand), 'name', `${at}: Esc returns focus to the name`);
        t.eq(c.heroIntro, normalize(profile.intro), `${at}: hero intro still reads as the locale string`);

        // Open from the navbar with a real click.
        await page.click('[data-navbar] [data-personal-open]');
        await page.waitFor(isOpen);
        await page.settle();
        const o = await page.eval(readOpen);
        t.ok(o.open, `${at}: clicking the navbar name opens the panel`);
        t.eq(o.title, personal.title, `${at}: title matches locale`);
        t.eq(o.body, normalize(personal.body), `${at}: body matches locale`);
        t.eq(o.instagram, { label: profile.contact.instagramLabel, href: INSTAGRAM, target: '_blank', rel: 'noopener' }, `${at}: Instagram button (new tab, rel noopener)`);
        t.eq(profile.contact.instagramLabel, '@herick.andrey', `${at}: Instagram handle`);
        t.eq(o.media?.src, '/images/herick.jpg', `${at}: panel shows an <img> pointing to /images/herick.jpg`);
        t.ok(o.media?.alt?.trim() && o.media.alt === personal.photoAlt, `${at}: photo alt text is non-empty and matches locale`, o.media?.alt);
        t.ok(o.media?.loaded && o.media.visible, `${at}: photo loads and is visible`, JSON.stringify(o.media));
        t.eq([o.media?.fit, o.media?.fillsBox], ['cover', true], `${at}: photo fills the media box with object-fit: cover (no distortion)`);
        t.eq(o.fallback, { inDom: true, hidden: true, text: profile.initials }, `${at}: ${profile.initials} monogram fallback stays in the DOM, hidden`);
        t.ok(o.focusIsClose, `${at}: focus moves to the close button on open`);
        t.eq(o.closeLabel, personal.close, `${at}: close button label matches locale`);
        t.ok(o.inside, `${at}: panel fits inside the viewport`);
        t.ok(o.hscroll <= 0, `${at}: no horizontal scroll inside the panel`, `${o.hscroll}px`);
        t.ok(o.minTarget >= TOKENS.touchTarget - 0.5, `${at}: every control is a ≥44px target`, `${o.minTarget}px`);
        t.ok(o.scrollLocked, `${at}: page scroll is locked while open`);

        // Focus trap: forward wraps last → first, backward wraps first → last.
        await page.press('Tab');
        t.eq(await page.eval(focused), 'instagram', `${at}: Tab moves to the Instagram button`);
        await page.press('Tab');
        t.eq(await page.eval(focused), 'close', `${at}: Tab wraps back to the close button`);
        await page.press('Tab', { shift: true });
        t.eq(await page.eval(focused), 'instagram', `${at}: Shift+Tab wraps to the Instagram button`);

        // Esc closes and returns focus to the navbar trigger.
        await page.press('Escape');
        await page.waitFor(isClosed);
        await page.settle(); // the 'close' event fires a task after dialog.open turns false
        t.eq(await page.eval(afterClose), { open: false, scrollLocked: false, focusRegion: 'navbar' }, `${at}: Esc closes, unlocks scroll and refocuses the navbar name`);

        // Hero trigger + close button.
        await page.click('#top [data-personal-open]');
        await page.waitFor(isOpen);
        t.ok(await page.eval(isOpen), `${at}: clicking the hero-intro name opens the panel`);
        await page.click('[data-personal-close]');
        await page.waitFor(isClosed);
        await page.settle(); // the 'close' event fires a task after dialog.open turns false
        t.eq(await page.eval(afterClose), { open: false, scrollLocked: false, focusRegion: 'hero' }, `${at}: close button closes and refocuses the hero name`);

        // Backdrop click (top-left corner, outside the centered panel).
        await page.click('[data-navbar] [data-personal-open]');
        await page.waitFor(isOpen);
        await page.click({ x: 4, y: 4 });
        await page.waitFor(isClosed);
        await page.settle(); // the 'close' event fires a task after dialog.open turns false
        t.ok(await page.eval(isClosed), `${at}: a backdrop click closes the panel`);

        // Broken photo: the monogram replaces it in the same box.
        await page.click('[data-navbar] [data-personal-open]');
        await page.waitFor(isOpen);
        await page.eval(() => {
          document.querySelector('[data-personal-photo]').src = '/images/missing-photo.jpg';
        });
        const swapped = await page.waitFor(() => {
          const photo = document.querySelector('[data-personal-photo]');
          const fallback = document.querySelector('[data-personal-fallback]');
          const box = document.querySelector('[data-personal-media]').getBoundingClientRect();
          const r = fallback.getBoundingClientRect();
          return photo.hidden && !fallback.hidden && Math.abs(r.width - box.width) < 1 && Math.abs(r.height - box.height) < 1;
        });
        t.ok(swapped, `${at}: a photo that fails to load is replaced by the ${profile.initials} monogram in the same box`);
        await page.press('Escape');
        await page.waitFor(isClosed);
        await page.settle();

        // Instagram row in Contact.
        const row = await page.eval(() => {
          const li = document.querySelector('[data-contact-details] [data-row="instagram"]');
          const a = li?.querySelector('a');
          return li && { label: li.firstElementChild.textContent.trim(), href: a?.getAttribute('href'), text: a?.textContent.trim(), target: a?.getAttribute('target'), rel: a?.getAttribute('rel') };
        });
        t.eq(row, { label: ui.contact.instagram, href: INSTAGRAM, text: '@herick.andrey', target: '_blank', rel: 'noopener' }, `${at}: Contact lists Instagram`);
      }
    }
    await page.close();
  },
};

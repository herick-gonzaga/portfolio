/**
 * "Beyond the code" panel (PersonalPanel.astro) at 1440 and 390px, in every locale.
 * Triggers: the navbar name and the name inside the hero intro are buttons that open one
 * modal <dialog> (aria-modal, labelled by its title); the hero intro still reads as the locale
 * string. Content: title, body, the photo or the "HG" monogram fallback (exactly one) and the
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
      haspopup: el.getAttribute('aria-haspopup'),
      controls: el.getAttribute('aria-controls'),
    })),
    heroIntro: text(document.querySelector('#top h1 + p')),
  };
}

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
    media: { photo: Boolean(photo), photoAlt: photo?.getAttribute('alt') ?? null, fallback: text(fallback) },
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
          ['navbar', 'hero'].map((region) => ({ tag: 'BUTTON', text: region === 'navbar' ? `${profile.initials}${profile.name}` : profile.name, region, haspopup: 'dialog', controls: 'personal-panel' })),
          `${at}: navbar name and hero-intro name are dialog trigger buttons`,
        );
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
        t.ok(
          o.media.photo ? o.media.photoAlt === personal.photoAlt && o.media.fallback === '' : o.media.fallback === profile.initials,
          `${at}: shows the photo or, without it, the ${profile.initials} monogram`,
          JSON.stringify(o.media),
        );
        t.note(`${at}: panel media is ${o.media.photo ? 'the photo' : 'the monogram fallback'}`);
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

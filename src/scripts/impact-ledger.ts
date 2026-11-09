/**
 * Achievements "exhibit ledger" (src/components/Achievements.astro).
 *
 * - Disclosure: each row head is a <button> that gets aria-expanded/aria-controls here; one row is
 *   open at a time (activating the open row closes it). The collapsed state itself is CSS, keyed on
 *   the row's [data-open] and on body.hero-ready (set by an inline script before first paint), so
 *   rows 2-4 are already collapsed in the first frame and nothing shifts when this script runs.
 *   Without JS every description stays visible. The height animation is CSS (grid-template-rows).
 * - Index scramble: hovering a row (mouse/pen) scrambles its mono "EXH-0N" code, settling left to
 *   right. The code is aria-hidden, so assistive tech never hears the glyphs.
 * - Rail: a cobalt line on the ledger's left draws down as the page scrolls, scrubbed by
 *   ScrollTrigger like the Journey timeline. Armed only with motion allowed; otherwise (and without
 *   JS, in print, or after switching reduced motion on) the line is fully drawn.
 *
 * Under prefers-reduced-motion: no scramble, no rail scrub, and toggles are instant (global CSS).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fontsReady } from './fonts';

const SCRAMBLE_MS = 420;
const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/';
/** The rail's tip, as % of the viewport height from the top. */
const TIP = 72;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function scramble(el: HTMLElement) {
  if (el.dataset.scrambling !== undefined) return;
  const final = el.textContent ?? '';
  const chars = [...final];
  const last = Math.max(1, chars.length - 1);
  const start = performance.now();
  el.dataset.scrambling = '';
  const step = (now: number) => {
    const t = (now - start) / SCRAMBLE_MS;
    if (t >= 1 || reduced.matches) {
      el.textContent = final;
      delete el.dataset.scrambling;
      return;
    }
    el.textContent = chars
      .map((ch, i) =>
        ch === '-' || t >= 0.25 + 0.75 * (i / last) ? ch : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)],
      )
      .join('');
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function init(root: HTMLElement) {
  const rows = [...root.querySelectorAll<HTMLElement>('[data-ledger-row]')];
  const triggers = rows.map((row) => row.querySelector<HTMLButtonElement>('[data-ledger-trigger]')!);
  const bodies = rows.map((row) => row.querySelector<HTMLElement>('[data-ledger-body]')!);

  const setOpen = (index: number) => {
    rows.forEach((row, i) => {
      row.toggleAttribute('data-open', i === index);
      triggers[i].setAttribute('aria-expanded', String(i === index));
    });
  };

  triggers.forEach((trigger, i) => {
    trigger.setAttribute('aria-controls', bodies[i].id);
    trigger.setAttribute('aria-expanded', String(rows[i].hasAttribute('data-open')));
    trigger.addEventListener('click', () => setOpen(rows[i].hasAttribute('data-open') ? -1 : i));
  });

  // Rows below (and their ScrollTriggers) move when a row opens or closes: re-measure once settled.
  let refresh = 0;
  root.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'grid-template-rows' || ScrollTrigger.getAll().length === 0) return;
    cancelAnimationFrame(refresh);
    refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  rows.forEach((row) => {
    const index = row.querySelector<HTMLElement>('[data-ledger-index]');
    if (!index) return;
    row.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch' && !reduced.matches) scramble(index);
    });
  });

  if (!reduced.matches) {
    // The rail's span depends on the final text layout: arm once the web fonts are in.
    void fontsReady().then(() => {
      gsap.registerPlugin(ScrollTrigger);
      root.dataset.ledgerArmed = '';
      gsap.fromTo(
        root,
        { '--ledger-progress': 0 },
        {
          '--ledger-progress': 1,
          ease: 'none',
          scrollTrigger: { trigger: root, start: `top ${TIP}%`, end: `bottom ${TIP}%`, scrub: true },
        },
      );
    });
  }
}

document.querySelectorAll<HTMLElement>('[data-ledger]').forEach(init);

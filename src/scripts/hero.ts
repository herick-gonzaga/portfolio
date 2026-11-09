/**
 * Hero entrance and status-line typewriter, loaded from src/components/Hero.astro.
 *
 * Entrance (once per load, after the fonts are ready so the H1 splits on its final line breaks):
 * the H1 lines rise into view one after another from behind a clipping mask, then the intro and
 * the status line fade up, then the CTAs and chips. SplitText is reverted at the end, so the H1
 * is plain text again (accessible name, selection and resize all behave as before).
 *
 * Hiding before first paint: the inline script in Hero.astro adds body.hero-ready, and the hero
 * CSS keeps the animated blocks hidden behind a failsafe rise that starts at 1.6s. This script
 * adds .hero-js, which cancels the failsafe and holds the blocks for GSAP. When the script arrives
 * after the failsafe has already revealed them, the entrance is skipped, so nothing ever
 * disappears once shown. Without JS, or under prefers-reduced-motion, everything is static.
 *
 * Typewriter: after the entrance it deletes the first role (rendered statically by the server)
 * and types the next one, cycling through content.profile.roles. Screen readers get the full list
 * from a static sr-only span; the animated text is aria-hidden.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { fontsReady } from './fonts';

const TYPE_MS = 65;
const DELETE_MS = 32;
const HOLD_MS = 1900;
const GAP_MS = 350;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves once the tab is visible (immediately if it already is). */
const whenVisible = () =>
  document.hidden
    ? new Promise<void>((resolve) => {
        const onChange = () => {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', onChange);
          resolve();
        };
        document.addEventListener('visibilitychange', onChange);
      })
    : Promise.resolve();

async function typewriter(root: HTMLElement) {
  const output = root.querySelector<HTMLElement>('[data-typewriter-text]');
  const roles = (root.dataset.roles ?? '').split('|').filter(Boolean);
  if (!output || roles.length < 2) return;

  root.classList.add('is-typing');
  let index = 0;
  for (;;) {
    await wait(HOLD_MS);
    if (reducedMotion.matches) return;
    await whenVisible();
    const current = roles[index];
    for (let n = current.length; n >= 0; n--) {
      output.textContent = current.slice(0, n);
      await wait(DELETE_MS);
    }
    await wait(GAP_MS);
    index = (index + 1) % roles.length;
    const next = roles[index];
    for (let n = 1; n <= next.length; n++) {
      output.textContent = next.slice(0, n);
      await wait(TYPE_MS);
    }
  }
}

function entrance(hero: HTMLElement): Promise<void> {
  const title = hero.querySelector<HTMLElement>('h1.hero-title');
  const intro = hero.querySelectorAll<HTMLElement>('p.hero-title');
  const status = hero.querySelector<HTMLElement>('.hero-status');
  const ctas = hero.querySelectorAll<HTMLElement>('.hero-ctas');
  if (!title || !status) return Promise.resolve();

  const split = SplitText.create(title, { type: 'lines', mask: 'lines', aria: 'auto' });
  // Line height is tight (1.02): give each mask room below for descenders, without moving layout.
  gsap.set(split.masks, { paddingBottom: '0.14em', marginBottom: '-0.14em' });

  const animated = [title, ...intro, status, ...ctas];
  return new Promise((resolve) => {
    gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          split.revert();
          gsap.set(animated, { clearProps: 'opacity,transform' });
          // Keep .hero-js (re-adding the failsafe animation would replay it); just release the hold.
          hero.classList.add('hero-entered');
          resolve();
        },
      })
      .set(title, { opacity: 1 })
      .from(split.lines, { yPercent: 115, duration: 0.95, ease: 'power4.out', stagger: 0.11 })
      .fromTo(intro, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0.35)
      .fromTo(status, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55 }, 0.5)
      .fromTo(ctas, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.09 }, 0.65);
  });
}

async function init() {
  const hero = document.getElementById('top');
  if (!hero || reducedMotion.matches) return;
  const typing = hero.querySelector<HTMLElement>('[data-typewriter]');

  // Take over only while the CSS failsafe still hides the hero copy.
  const status = hero.querySelector<HTMLElement>('.hero-status');
  const hidden = document.body.classList.contains('hero-ready') && status && getComputedStyle(status).opacity === '0';
  if (hidden) {
    gsap.registerPlugin(SplitText);
    hero.classList.add('hero-js');
    await fontsReady();
    await entrance(hero);
  }
  if (typing) void typewriter(typing);
}

void init();

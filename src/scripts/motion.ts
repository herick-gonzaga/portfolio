/**
 * Site-wide motion, loaded once from src/layouts/Base.astro:
 *
 * - Lenis smooth scrolling (wheel only; touch stays native), driven by GSAP's ticker and feeding
 *   ScrollTrigger on every scroll. Not loaded at all on touch-only devices.
 * - Scroll reveal: every [data-reveal] element fades in and rises 24px the first time it enters
 *   the viewport. `data-reveal-delay="120"` adds a delay in ms. [data-reveal] elements inside a
 *   [data-reveal-group] container that enter together are staggered.
 * - A 2px cobalt scroll-progress bar fixed at the top of the page.
 *
 * Progressive enhancement: the markup is always in its final state. Only this script hides an
 * element (the .reveal-pending class), and only one that is still below the fold, so nothing
 * already on screen disappears and nothing stays hidden without JS. Opacity and transform never
 * move layout, so there is no layout shift.
 *
 * Reveals are set up only once the web fonts are in (src/scripts/fonts.ts, capped at 1s): which
 * elements sit below the fold, and where their triggers fall, depend on the final text layout.
 * Smooth scrolling starts right away. <html data-motion="ready"> marks the end of setup.
 *
 * Under prefers-reduced-motion none of this runs, and GSAP and Lenis are never downloaded: native
 * scrolling, every element static, no bar. With motion allowed they are dynamic imports (code-split
 * chunks shared with the other motion scripts), so they never sit in the page's initial module
 * graph or hold back first paint and the hero.
 */
import type Lenis from 'lenis';
import type { gsap as GSAP } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';
import { fontsReady } from './fonts';

let gsap: typeof GSAP;
let ScrollTrigger: typeof ScrollTriggerType;

const REVEAL_OFFSET_Y = 24;
const REVEAL_DURATION = 0.7;
const REVEAL_STAGGER = 0.08;
/** An element reveals once its top passes 88% of the viewport height. */
const REVEAL_START = 'top 88%';

const PENDING = 'reveal-pending';
const ACTIVE = 'reveal-active';

function initSmoothScroll(LenisClass: typeof Lenis) {
  const lenis = new LenisClass({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // The personal panel and the mobile menu lock the page with html { overflow: hidden }; pause
  // Lenis meanwhile so the wheel never scrolls the page behind them.
  const root = document.documentElement;
  const sync = () => (root.style.overflow === 'hidden' ? lenis.stop() : lenis.start());
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['style'] });
}

const delayOf = (el: Element) => {
  const ms = Number.parseFloat((el as HTMLElement).dataset.revealDelay ?? '');
  return Number.isFinite(ms) ? ms / 1000 : 0;
};

function reveal(batch: Element[]) {
  batch.forEach((el) => el.classList.add(ACTIVE));
  gsap.fromTo(
    batch,
    { opacity: 0, y: REVEAL_OFFSET_Y },
    {
      opacity: 1,
      y: 0,
      duration: REVEAL_DURATION,
      ease: 'power3.out',
      stagger: (index, target) => index * REVEAL_STAGGER + delayOf(target),
      onStart: () => batch.forEach((el) => el.classList.remove(PENDING)),
      onComplete: () => {
        gsap.set(batch, { clearProps: 'opacity,transform' });
        batch.forEach((el) => el.classList.remove(ACTIVE));
      },
    },
  );
}

function initReveal() {
  const elements = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  // Anything that already starts above the trigger line (on screen, or scrolled past after a
  // reload or a #hash link) stays as rendered.
  const line = window.innerHeight * 0.88;
  const pending = elements.filter((el) => el.getBoundingClientRect().top > line);
  pending.forEach((el) => el.classList.add(PENDING));

  // One batch per group (elements entering together are staggered); lone elements get their own.
  const groups = new Map<Element, HTMLElement[]>();
  for (const el of pending) {
    const key = el.closest('[data-reveal-group]') ?? el;
    groups.set(key, [...(groups.get(key) ?? []), el]);
  }
  for (const members of groups.values()) {
    ScrollTrigger.batch(members, { start: REVEAL_START, once: true, onEnter: reveal });
  }
}

function initProgressBar() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  const setScale = gsap.quickSetter(bar, 'scaleX');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => setScale(self.progress),
    onRefresh: (self) => setScale(self.progress),
  });
}

/**
 * ScrollTrigger measures trigger positions once (and on resize). Sections that change the page
 * height later (a skills-loop accordion step or a ledger row opening, a late font swap) would leave every trigger below them, and the progress bar's end, stale: re-measure
 * whenever the document height settles on a new value.
 */
function refreshOnHeightChange() {
  let height = document.documentElement.scrollHeight;
  let timer = 0;
  new ResizeObserver(() => {
    const next = document.documentElement.scrollHeight;
    if (next === height) return;
    height = next;
    clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  }).observe(document.body);
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/**
 * Lenis only smooths the wheel (touch scrolling stays native), so touch-only devices skip it: no
 * download, and no GSAP ticker running every frame for nothing.
 */
const wheel = window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches;

if (!reducedMotion) {
  // The chunks download in parallel with the font wait (capped at 1s from page start). Smooth
  // scrolling starts as soon as they arrive; reveals wait for the fonts as well.
  const fonts = fontsReady();
  void Promise.all([wheel ? import('lenis') : null, import('gsap'), import('gsap/ScrollTrigger')])
    .then(([lenisModule, gsapModule, scrollTriggerModule]) => {
      gsap = gsapModule.gsap;
      ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      if (lenisModule) initSmoothScroll(lenisModule.default);
      return fonts;
    })
    .then(() => {
      initReveal();
      initProgressBar();
      refreshOnHeightChange();
      document.documentElement.dataset.motion = 'ready';
    });
}

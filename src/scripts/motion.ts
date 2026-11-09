/**
 * Site-wide motion, loaded once from src/layouts/Base.astro:
 *
 * - Lenis smooth scrolling (wheel only; touch stays native), driven by GSAP's ticker and feeding
 *   ScrollTrigger on every scroll.
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
 * Under prefers-reduced-motion none of this runs: native scrolling, every element static, no bar.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fontsReady } from './fonts';

const REVEAL_OFFSET_Y = 24;
const REVEAL_DURATION = 0.7;
const REVEAL_STAGGER = 0.08;
/** An element reveals once its top passes 88% of the viewport height. */
const REVEAL_START = 'top 88%';

const PENDING = 'reveal-pending';
const ACTIVE = 'reveal-active';

function initSmoothScroll() {
  const lenis = new Lenis({ autoRaf: false });
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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  gsap.registerPlugin(ScrollTrigger);
  initSmoothScroll();
  void fontsReady().then(() => {
    initReveal();
    initProgressBar();
    document.documentElement.dataset.motion = 'ready';
  });
}

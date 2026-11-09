/**
 * Pointer interactions, loaded once from src/layouts/Base.astro (styles live in Card.astro and
 * global.css; this script only writes custom properties and classes):
 *
 * - Spotlight ([data-spotlight] cards): --spot-x/--spot-y follow the cursor inside the card, in px
 *   from its border-box corner. Mouse and pen only; CSS fades the glow in on :hover.
 * - Tilt ([data-tilt] cards): --tilt-x/--tilt-y lean the card up to MAX_TILT toward the cursor; CSS
 *   applies them while hovered and springs back on leave. Fine pointers, motion allowed.
 * - Magnetic buttons ([data-magnetic]): within MAGNET_RADIUS of the button edge the button drifts
 *   up to MAGNET_MAX toward the cursor (--magnet-x/--magnet-y), springing back once it leaves.
 *   Fine pointers, motion allowed.
 * - Count-up ([data-countup]): each value counts from 0 the first time it scrolls into view, in the
 *   page's number format (decimals included: "98.85%" / "98,85%"), and ends on the exact text from
 *   the locale file. Values already on screen (or scrolled past) when the script starts stay as
 *   rendered. `data-countup-delay="180"` holds the start by that many ms (to stagger a row);
 *   `data-countup-decode` adds a decode: each digit flickers through random mono glyphs and settles
 *   left to right while the number counts. Motion allowed only.
 *
 * Nothing here is needed for first paint, so setup waits for an idle moment after load and never
 * reads layout: the count-up decides from its IntersectionObserver's first report. Pointer work is
 * batched into one write per animation frame. Turning on reduced motion mid-visit releases the
 * magnetic buttons and jumps running or waiting counters to their final values (tilt is CSS-gated).
 */
import { perFrame } from './frame';

const MAX_TILT = 6;
const MAGNET_RADIUS = 80;
const MAGNET_MAX = 8;
/** Fraction of the cursor's offset from the button centre that the button follows. */
const MAGNET_PULL = 0.3;
const COUNT_MS = 1600;
/** Decode: glyphs a digit flickers through, how often they change, and when digits settle (0-1 of the count). */
const DECODE_GLYPHS = '0123456789#$%&*+/<=>?@';
const DECODE_STEP_MS = 55;
const DECODE_FIRST = 0.3;
const DECODE_LAST = 0.78;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const motion = !reducedMotion.matches;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function initCards() {
  for (const card of document.querySelectorAll<HTMLElement>('[data-spotlight]')) {
    const tilt = motion && finePointer && card.hasAttribute('data-tilt');
    const update = perFrame((x: number, y: number) => {
      const r = card.getBoundingClientRect();
      const px = x - r.left;
      const py = y - r.top;
      card.style.setProperty('--spot-x', `${px.toFixed(1)}px`);
      card.style.setProperty('--spot-y', `${py.toFixed(1)}px`);
      if (tilt) {
        // -0.5..0.5 across the card; the side under the cursor dips away from the viewer.
        const nx = clamp(px / r.width, 0, 1) - 0.5;
        const ny = clamp(py / r.height, 0, 1) - 0.5;
        card.style.setProperty('--tilt-x', `${(-ny * 2 * MAX_TILT).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(nx * 2 * MAX_TILT).toFixed(2)}deg`);
      }
    });
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      update(event.clientX, event.clientY);
    };
    card.addEventListener('pointerenter', onPointer);
    card.addEventListener('pointermove', onPointer);
  }
}

function initMagnetic() {
  const buttons = [...document.querySelectorAll<HTMLElement>('[data-magnetic]')].map((el) => ({ el, x: 0, y: 0 }));
  if (buttons.length === 0) return;
  let pointer: { x: number; y: number } | null = null;

  const update = perFrame(() => {
    for (const b of buttons) {
      // Measure the resting box: subtract the offset currently applied.
      const r = b.el.getBoundingClientRect();
      const left = r.left - b.x;
      const top = r.top - b.y;
      let x = 0;
      let y = 0;
      if (pointer && r.width > 0 && !reducedMotion.matches) {
        const dx = clamp(pointer.x, left, left + r.width) - pointer.x;
        const dy = clamp(pointer.y, top, top + r.height) - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < MAGNET_RADIUS) {
          const strength = 1 - distance / MAGNET_RADIUS;
          x = clamp((pointer.x - (left + r.width / 2)) * MAGNET_PULL, -MAGNET_MAX, MAGNET_MAX) * strength;
          y = clamp((pointer.y - (top + r.height / 2)) * MAGNET_PULL, -MAGNET_MAX, MAGNET_MAX) * strength;
        }
      }
      if (x === b.x && y === b.y) continue;
      b.x = x;
      b.y = y;
      b.el.classList.toggle('is-magnetized', x !== 0 || y !== 0);
      b.el.style.setProperty('--magnet-x', `${x.toFixed(2)}px`);
      b.el.style.setProperty('--magnet-y', `${y.toFixed(2)}px`);
    }
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      update();
    },
    { passive: true },
  );
  // The page scrolls under a still cursor (wheel, keys, anchor links): re-measure.
  window.addEventListener('scroll', () => pointer && update(), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null;
    update();
  });
  window.addEventListener('blur', () => {
    pointer = null;
    update();
  });
  reducedMotion.addEventListener('change', () => update());
}

/**
 * Splits "9,000+" into its number (9000), the text after it ("+") and whether it is grouped, and
 * "98,85%" into 98.85 with 2 decimals. A separator followed by exactly 3 digits groups thousands;
 * one followed by 1-2 digits at the end of the number is the decimal mark.
 */
function parseValue(text: string) {
  const match = /^(\D*)(\d{1,3}(?:([.,\u00a0\u202f ])\d{3})*|\d+)(?:[.,](\d{1,2}))?(\D*)$/.exec(text.trim());
  if (!match) return null;
  const [, prefix, digits, separator, fraction = '', suffix] = match;
  const whole = Number.parseInt(digits.replace(/\D/g, ''), 10);
  const value = fraction ? whole + Number.parseInt(fraction, 10) / 10 ** fraction.length : whole;
  return { prefix, value, decimals: fraction.length, grouped: Boolean(separator), suffix };
}

/** Swaps every digit not yet settled at progress `t` for a random glyph; settling runs left to right. */
function decode(text: string, t: number, now: number) {
  const digits = [...text].filter((ch) => ch >= '0' && ch <= '9').length;
  const tick = Math.floor(now / DECODE_STEP_MS);
  let seen = 0;
  return [...text]
    .map((ch, i) => {
      if (ch < '0' || ch > '9') return ch;
      const settleAt = DECODE_FIRST + (DECODE_LAST - DECODE_FIRST) * (digits > 1 ? seen++ / (digits - 1) : 1);
      if (t >= settleAt) return ch;
      // Pseudo-random per step and position, so a glyph holds for DECODE_STEP_MS instead of one frame.
      const n = Math.abs(Math.sin((tick + 1) * 12.9898 + i * 78.233) * 43758.5453);
      return DECODE_GLYPHS[Math.floor((n - Math.floor(n)) * DECODE_GLYPHS.length)];
    })
    .join('');
}

type Counter = {
  final: string;
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
  format: Intl.NumberFormat;
  delay: number;
  decode: boolean;
  frame: number;
};

function initCountUp() {
  const items = [...document.querySelectorAll<HTMLElement>('[data-countup]')];
  if (items.length === 0) return;
  const locale = document.documentElement.lang || undefined;
  const counters = new Map<HTMLElement, Counter>();
  /** Elements whose first observer report is still to come. */
  const unseen = new Set<HTMLElement>(items);

  const finish = (el: HTMLElement) => {
    const c = counters.get(el);
    if (!c) return;
    cancelAnimationFrame(c.frame);
    el.textContent = c.final;
    counters.delete(el);
    observer.unobserve(el);
  };

  const run = (el: HTMLElement) => {
    const c = counters.get(el);
    if (!c) return;
    const start = performance.now() + c.delay;
    const scale = 10 ** c.decimals;
    const tick = (now: number) => {
      if (reducedMotion.matches) return finish(el);
      if (now < start) {
        c.frame = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - start) / COUNT_MS);
      if (t >= 1) return finish(el);
      const eased = 1 - Math.pow(1 - t, 3);
      const text = `${c.prefix}${c.format.format(Math.round(c.value * eased * scale) / scale)}${c.suffix}`;
      el.textContent = c.decode ? decode(text, t, now) : text;
      c.frame = requestAnimationFrame(tick);
    };
    c.frame = requestAnimationFrame(tick);
  };

  const arm = (el: HTMLElement) => {
    const final = el.textContent?.trim() ?? '';
    const parsed = parseValue(final);
    if (!parsed) return false;
    // useGrouping "always" keeps "9.000" in Spanish, matching the locale files (es groups 4+ digits).
    const format = new Intl.NumberFormat(locale, {
      useGrouping: parsed.grouped ? 'always' : false,
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    } as Intl.NumberFormatOptions);
    const delay = Number.parseFloat(el.dataset.countupDelay ?? '');
    counters.set(el, {
      final,
      prefix: parsed.prefix,
      value: parsed.value,
      decimals: parsed.decimals,
      suffix: parsed.suffix,
      format,
      delay: Number.isFinite(delay) ? delay : 0,
      decode: el.hasAttribute('data-countup-decode'),
      frame: 0,
    });
    el.textContent = `${parsed.prefix}${format.format(0)}${parsed.suffix}`;
    return true;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (unseen.delete(el)) {
          // First report: on screen or scrolled past stays as rendered; below the fold waits at 0.
          const below = entry.boundingClientRect.top >= window.innerHeight;
          if (!below || !arm(el)) observer.unobserve(el);
          continue;
        }
        if (entry.isIntersecting && counters.has(el)) {
          observer.unobserve(el);
          run(el);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  items.forEach((el) => observer.observe(el));

  const finishAll = () => [...counters.keys()].forEach(finish);
  reducedMotion.addEventListener('change', () => reducedMotion.matches && finishAll());
  window.addEventListener('beforeprint', finishAll);
}

const init = () => {
  initCards();
  if (motion && finePointer) initMagnetic();
  if (motion) initCountUp();
  // Lets tests (scripts/checks/card-interactions.check.mjs) wait for the deferred setup.
  document.documentElement.dataset.interactions = 'ready';
};
if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 1000 });
else setTimeout(init, 200);

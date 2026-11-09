/**
 * Custom cursor, loaded once from src/layouts/Base.astro (styles in global.css, .cursor-*).
 *
 * A small cobalt dot sits on the pointer and a ring trails it, eased toward the pointer every
 * frame (lerp). Over interactive elements (links, buttons, form fields, cards) the ring expands;
 * while a button is pressed it shrinks. The native cursor stays visible: this only decorates it.
 *
 * Fine pointers with motion allowed only. Touch devices never create the elements, and turning on
 * reduced motion mid-visit removes them. Both elements are aria-hidden and pointer-events: none.
 * The frame loop runs only while the ring is still catching up, so an idle cursor costs nothing.
 */
export {};

/** Fraction of the remaining distance the ring covers per 60fps frame. */
const LERP = 0.18;
/** Below this distance (px) the ring snaps to the pointer and the loop stops. */
const SETTLE = 0.1;
const INTERACTIVE =
  'a[href], button, [role="button"], input, textarea, select, summary, label[for], [data-spotlight], [data-cursor="hover"]';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

function createCursor() {
  const root = document.documentElement;
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  for (const el of [dot, ring]) el.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);

  const pointer = { x: 0, y: 0 };
  const trail = { x: 0, y: 0 };
  let frame = 0;
  let last = 0;
  let seen = false;

  // `translate`, not `transform`: CSS applies translate, then scale, then transform, so a
  // position in `transform` would be multiplied by the state `scale` (1.75 on hover).
  const place = (el: HTMLElement, x: number, y: number) => {
    el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  };

  const tick = (now: number) => {
    // Frame-rate independent: the same feel at 60Hz and 120Hz.
    const dt = last ? Math.min(64, now - last) / (1000 / 60) : 1;
    last = now;
    const k = 1 - Math.pow(1 - LERP, dt);
    trail.x += (pointer.x - trail.x) * k;
    trail.y += (pointer.y - trail.y) * k;
    if (Math.hypot(pointer.x - trail.x, pointer.y - trail.y) < SETTLE) {
      trail.x = pointer.x;
      trail.y = pointer.y;
      frame = 0;
      last = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    place(ring, trail.x, trail.y);
  };

  const setVisible = (on: boolean) => root.classList.toggle('cursor-visible', on);

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return setVisible(false);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!seen) {
      // First move: start the ring on the pointer instead of flying in from the corner.
      seen = true;
      trail.x = pointer.x;
      trail.y = pointer.y;
      place(ring, trail.x, trail.y);
    }
    place(dot, pointer.x, pointer.y);
    setVisible(true);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const onOver = (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    root.classList.toggle('cursor-hover', Boolean(target?.closest(INTERACTIVE)));
  };
  const onDown = (event: PointerEvent) => event.pointerType !== 'touch' && root.classList.add('cursor-down');
  const onUp = () => root.classList.remove('cursor-down');
  const onLeave = () => {
    setVisible(false);
    onUp();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    root.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    root.classList.remove('cursor-visible', 'cursor-hover', 'cursor-down');
    dot.remove();
    ring.remove();
  };
}

let destroy: (() => void) | undefined;

const sync = () => {
  const enabled = finePointer.matches && !reducedMotion.matches;
  if (enabled && !destroy) destroy = createCursor();
  else if (!enabled && destroy) {
    destroy();
    destroy = undefined;
  }
};

sync();
reducedMotion.addEventListener('change', sync);
finePointer.addEventListener('change', sync);

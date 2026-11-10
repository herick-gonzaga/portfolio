/**
 * Skills loop (src/components/Skills.astro): the four pillars as tabs around a ring (≥1200px) or as
 * a vertical stepper accordion (<1200px). Without this script every pillar renders stacked and open.
 *
 * Tabs (≥1200px): role="tablist"/"tab"/"tabpanel" with aria-selected, a roving tabindex and
 * ArrowLeft/ArrowRight/Home/End (wrapping, selection follows focus). A pulse orbits the ring on the
 * shared GSAP ticker (the one Lenis runs on), one quarter turn per CYCLE_S, and while auto-cycling
 * the next pillar becomes active as the pulse reaches its node. Hovering, clicking or focusing a
 * node selects it and pauses the cycle; it resumes RESUME_MS after the pointer has left the ring
 * (and focus has left the tabs), with the pulse gliding back onto the active node. Auto-cycling
 * needs a fine pointer: touch screens only change pillar when a node is tapped.
 *
 * Accordion (<1200px): each step header is a button with aria-expanded controlling a region; one
 * step is open at a time (tapping the open one closes it). The pulse down the line is CSS.
 *
 * The orbit only runs while the section is on screen and the tab is visible (IntersectionObserver +
 * visibilitychange); `data-paused` freezes the CSS animations meanwhile. Pointer work is batched to
 * one call per frame. Under prefers-reduced-motion (also when switched on mid-visit): no pulse, no
 * auto-cycle and no transitions — a static tab interface / accordion with the first pillar open.
 *
 * GSAP drives only motion (pulse, arc, glides, panel entrances), so it is imported on demand: right
 * away with motion allowed, never under reduced motion (until it is switched off mid-visit). Until
 * it arrives the loop works fully, just without those tweens.
 */
import type { gsap as GSAP } from 'gsap';
import { perFrame } from './frame';

let gsap: typeof GSAP | undefined;
let gsapLoading: Promise<unknown> | undefined;
const loadGsap = () => (gsapLoading ??= import('gsap').then((m) => (gsap = m.gsap)));

/** Seconds for the pulse to travel from one node to the next (= auto-cycle interval). */
const CYCLE_S = 5;
/** Auto-cycling resumes this long after the pointer leaves the loop. */
const RESUME_MS = 8000;
/** Ring centre in SVG user units (Skills.astro: SIZE / 2). */
const C = 240;
/** Longest frame step fed to the orbit, so a stalled frame never jumps the pulse. */
const MAX_DT_MS = 50;

type Mode = 'tabs' | 'accordion';

const wide = window.matchMedia('(min-width: 1200px)');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse = window.matchMedia('(pointer: coarse)');

const mod = (n: number, m: number) => ((n % m) + m) % m;

function init(root: HTMLElement) {
  const ring = root.querySelector<HTMLElement>('[data-loop-ring]')!;
  const tablist = root.querySelector<HTMLElement>('[data-loop-tabs]')!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-loop-tab]')];
  const steps = [...root.querySelectorAll<HTMLElement>('[data-loop-step]')];
  const triggers = steps.map((s) => s.querySelector<HTMLButtonElement>('[data-loop-trigger]')!);
  const bodies = steps.map((s) => s.querySelector<HTMLElement>('[data-loop-body]')!);
  const arc = root.querySelector<SVGCircleElement>('[data-loop-arc]')!;
  const orbit = root.querySelector<SVGGElement>('[data-loop-orbit]')!;
  const count = root.querySelector<HTMLElement>('[data-loop-count]')!;
  const n = steps.length;

  let mode: Mode = wide.matches ? 'tabs' : 'accordion';
  let motion = !reduced.matches;
  /** Active tab (tabs) / open step (accordion, -1 when all are closed). */
  let active = 0;
  /** Pulse position in nodes: 0 = first node, 1 = second, … (keeps growing; rendered mod n). */
  const state = { phase: 0 };
  let gliding = false;
  /** Start of the lit arc, in pathLength units (100 per quarter), tracked continuously. */
  let arcStart = -100;
  let auto = false;
  let pointerIn = false;
  let focusIn = false;
  let resumeTimer = 0;
  let inView = false;
  let ticking = false;

  const canAuto = () => motion && !coarse.matches && mode === 'tabs';

  // ---------- Rendering ----------

  const renderOrbit = () => {
    orbit.setAttribute('transform', `rotate(${(mod(state.phase, n) * (360 / n)).toFixed(2)} ${C} ${C})`);
  };

  function moveArc(index: number) {
    const target = (index - 1) * 100;
    // Nearest equivalent position, so the arc always takes the short way round.
    arcStart += mod(target - arcStart + 200, 400) - 200;
    if (motion && gsap) gsap.to(arc, { attr: { 'stroke-dashoffset': -arcStart }, duration: 0.5, ease: 'power3.out', overwrite: true });
    else arc.setAttribute('stroke-dashoffset', String(-arcStart));
  }

  /** Glides the pulse onto node `index` (the nearest lap), then lets it orbit on from there. */
  function glideTo(index: number) {
    if (!motion || mode !== 'tabs' || !gsap) return;
    const target = Math.round((state.phase - index) / n) * n + index;
    const distance = Math.abs(target - state.phase);
    if (distance < 0.001) return;
    gliding = true;
    gsap.to(state, {
      phase: target,
      duration: 0.3 + 0.25 * distance,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: renderOrbit,
      onComplete: () => (gliding = false),
      onInterrupt: () => (gliding = false),
    });
  }

  function enter(target: HTMLElement, chipsFrom: { x?: number; y?: number }) {
    if (!gsap) return;
    const chips = target.querySelectorAll('[data-loop-chips] > li');
    gsap.killTweensOf([target, ...chips]);
    gsap.fromTo(target, { opacity: 0, ...chipsFrom }, { opacity: 1, x: 0, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'opacity,transform' });
    gsap.fromTo(
      chips,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.08, stagger: 0.03, clearProps: 'opacity,transform' },
    );
  }

  // ---------- State ----------

  function select(index: number, animate: boolean) {
    const changed = index !== active;
    active = index;
    if (mode === 'tabs') {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      steps.forEach((step, i) => {
        step.classList.toggle('is-active', i === index);
        // Only the visible panel is a Tab stop (the hidden ones are visibility: hidden).
        step.tabIndex = i === index ? 0 : -1;
      });
      count.textContent = String(index + 1).padStart(2, '0');
      moveArc(index);
      if (changed && animate && motion) enter(steps[index], { x: 16 });
    } else {
      steps.forEach((step, i) => {
        const open = i === index;
        step.classList.toggle('is-active', open);
        triggers[i].setAttribute('aria-expanded', String(open));
        bodies[i].hidden = !open;
      });
      if (changed && animate && motion && index >= 0) enter(bodies[index], { y: -6 });
    }
  }

  function applyMode(next: Mode) {
    mode = next;
    root.dataset.mode = mode;
    const all = [...steps, ...bodies, ...steps.flatMap((s) => [...s.querySelectorAll('[data-loop-chips] > li')])];
    gsap?.killTweensOf(all);
    gsap?.set(all, { clearProps: 'opacity,transform' });
    if (mode === 'tabs') {
      steps.forEach((step, i) => {
        step.setAttribute('role', 'tabpanel');
        step.setAttribute('aria-labelledby', tabs[i].id);
        bodies[i].hidden = false;
        bodies[i].removeAttribute('role');
        bodies[i].removeAttribute('aria-labelledby');
        triggers[i].removeAttribute('aria-expanded');
        triggers[i].removeAttribute('aria-controls');
      });
      const index = active < 0 ? 0 : active;
      active = -1;
      select(index, false);
      state.phase = index;
      renderOrbit();
      auto = canAuto();
    } else {
      steps.forEach((step, i) => {
        step.removeAttribute('role');
        step.removeAttribute('aria-labelledby');
        step.removeAttribute('tabindex');
        step.classList.remove('is-active');
        bodies[i].setAttribute('role', 'region');
        bodies[i].setAttribute('aria-labelledby', triggers[i].id);
        triggers[i].setAttribute('aria-controls', bodies[i].id);
      });
      const index = active;
      active = -2;
      select(index, false);
      auto = false;
    }
    updateRunning();
  }

  // ---------- Auto-cycle and orbit ----------

  function tick(_time: number, deltaMs: number) {
    if (gliding) return;
    state.phase += Math.min(deltaMs, MAX_DT_MS) / 1000 / CYCLE_S;
    if (auto) {
      const index = mod(Math.floor(state.phase), n);
      if (index !== active) select(index, true);
    }
    renderOrbit();
  }

  function updateRunning() {
    const visible = inView && !document.hidden;
    root.toggleAttribute('data-paused', !visible);
    const run = visible && motion && mode === 'tabs' && Boolean(gsap);
    if (run && !ticking) gsap!.ticker.add(tick);
    if (!run && ticking) gsap!.ticker.remove(tick);
    ticking = run;
  }

  function hold() {
    auto = false;
    window.clearTimeout(resumeTimer);
  }

  function release() {
    window.clearTimeout(resumeTimer);
    if (!canAuto() || pointerIn || focusIn) return;
    resumeTimer = window.setTimeout(() => {
      if (!canAuto() || pointerIn || focusIn) return;
      glideTo(active);
      auto = true;
    }, RESUME_MS);
  }

  /** User picked a pillar on the ring. */
  function pick(index: number) {
    hold();
    if (index !== active) {
      select(index, true);
      glideTo(index);
    }
  }

  // ---------- Events ----------

  const hoverPick = perFrame((index: number) => pointerIn && pick(index));

  tabs.forEach((tab, i) => {
    tab.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') hoverPick(i);
    });
    tab.addEventListener('click', () => {
      pick(i);
      release();
    });
    tab.addEventListener('focus', () => pick(i));
  });

  ring.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    pointerIn = true;
    hold();
  });
  ring.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    pointerIn = false;
    release();
  });

  // Keyboard focus holds the cycle; a mouse click's focus does not (the pointer rules apply).
  tablist.addEventListener('focusin', (event) => {
    focusIn = (event.target as Element).matches(':focus-visible');
    if (focusIn) hold();
  });
  tablist.addEventListener('focusout', (event) => {
    if (tablist.contains(event.relatedTarget as Node | null)) return;
    focusIn = false;
    release();
  });

  tablist.addEventListener('keydown', (event) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: n - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const index = mod(keys[event.key], n);
    tabs[index].focus(); // the focus handler selects it
  });

  triggers.forEach((trigger, i) =>
    trigger.addEventListener('click', () => {
      if (mode === 'accordion') select(active === i ? -1 : i, true);
    }),
  );

  new IntersectionObserver((entries) => {
    inView = entries.at(-1)!.isIntersecting;
    updateRunning();
  }).observe(root);
  document.addEventListener('visibilitychange', updateRunning);

  wide.addEventListener('change', () => applyMode(wide.matches ? 'tabs' : 'accordion'));
  const onMotionChange = () => {
    motion = !reduced.matches;
    root.toggleAttribute('data-motion', motion);
    if (!motion) {
      hold();
      gliding = false;
      gsap?.killTweensOf(state);
    } else {
      if (!pointerIn && !focusIn) auto = canAuto();
      void loadGsap().then(updateRunning);
    }
    updateRunning();
  };
  reduced.addEventListener('change', onMotionChange);
  coarse.addEventListener('change', () => {
    if (!canAuto()) hold();
    else release();
  });

  root.toggleAttribute('data-motion', motion);
  applyMode(mode);
  if (motion) void loadGsap().then(updateRunning);
}

document.querySelectorAll<HTMLElement>('[data-loop]').forEach(init);

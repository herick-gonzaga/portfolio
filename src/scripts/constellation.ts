/**
 * Hero constellation, loaded from src/components/Hero.astro.
 *
 * A 2D canvas behind the "fig. 01" system diagram: ~80 drifting particles, linked by thin cobalt
 * lines when they are close, gravitate toward the diagram's five anchors (the four discipline
 * nodes and the central hub) and flow along its spokes and rails, so the network draws the
 * diagram's shape. The nodes and the hub stay the diagram's own SVG text (localized, selectable,
 * covered by its aria-label); their opaque boxes sit above the canvas. The SVG's static edges fade
 * out while the canvas runs (see .is-constellation in SystemDiagram.astro).
 *
 * - Pointer: particles within 120px of the cursor are pushed away, and the canvas parallaxes a
 *   few px against the pointer. The canvas is pointer-events: none and aria-hidden, so clicks and
 *   text selection go to the page as before.
 * - Particle budget follows the canvas width: 80, 54 below 520px, 36 below 400px (phones);
 *   data-particles reports it.
 * - Rendering is devicePixelRatio-aware (capped at 2) and follows the diagram's size.
 * - The requestAnimationFrame loop only runs while the hero is on screen and the tab is visible.
 *   The wrapper's data-constellation attribute reports "running" or "paused".
 * - Under prefers-reduced-motion, without JS or without a 2D context, nothing is created and the
 *   static diagram renders exactly as before. Switching to reduced motion later tears it down.
 */

const COUNT = 80;
const COUNT_SMALL = 54;
/** Phones: the link pass is O(n²), so a phone-sized canvas gets well under half the desktop work. */
const COUNT_PHONE = 36;
/** Below these canvas widths (CSS px) the smaller particle counts are used. */
const SMALL_WIDTH = 520;
const PHONE_WIDTH = 400;
/**
 * How far the canvas extends past the diagram (CSS px). Sideways it is capped by the room left
 * inside the hero (minus the parallax travel), so the canvas never overflows the page.
 */
const BLEED = 56;
const LINK_DIST = 74;
const REPEL_RADIUS = 120;
const REPEL_FORCE = 1.6;
const SPRING = 0.0022;
const DAMPING = 0.9;
const MAX_SPEED = 2.6;
const PARALLAX_PX = 7;
const MAX_DPR = 2;

const LINE_RGB = '91, 125, 255';
const CORE_RGB = '163, 182, 255';
const HALO_RGB = '43, 91, 255';

type Kind = 'anchor' | 'edge' | 'free';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: Kind;
  /** Anchor or edge index. */
  ref: number;
  /** Anchor cloud: orbit angle, radius factor and angular speed. Edge: position along it. */
  a: number;
  r: number;
  w: number;
  /** Phase of the per-particle wobble. */
  phase: number;
  size: number;
}

interface Anchor {
  x: number;
  y: number;
  /** Half extents of the cloud around the anchor. */
  rx: number;
  ry: number;
}

interface Edge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  len: number;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function create(wrapper: HTMLElement, svg: SVGSVGElement, hero: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'constellation';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  wrapper.prepend(canvas);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let bleedX = BLEED;
  let anchors: Anchor[] = [];
  let edges: Edge[] = [];
  let particles: Particle[] = [];
  let pointer: { x: number; y: number } | null = null;
  let parallax = { x: 0, y: 0 };
  let onScreen = false;
  let frame = 0;
  let last = 0;
  let time = 0;

  /** Reads the anchors (node boxes and hub) from the SVG, in canvas coordinates. */
  function readGeometry() {
    const origin = svg.getBoundingClientRect();
    const ox = origin.left - bleedX;
    const oy = origin.top - BLEED;
    const boxes = [...svg.querySelectorAll<SVGRectElement>('.sd-node rect')].map((r) => r.getBoundingClientRect());
    const hub = svg.querySelector<SVGCircleElement>('.sd-hub circle:nth-of-type(2)')?.getBoundingClientRect();
    if (boxes.length < 4 || !hub) return false;

    const nodes = boxes.map((b) => ({
      x: b.left - ox + b.width / 2,
      y: b.top - oy + b.height / 2,
      rx: b.width / 2 + 14,
      ry: b.height / 2 + 14,
    }));
    const center = { x: hub.left - ox + hub.width / 2, y: hub.top - oy + hub.height / 2, rx: hub.width * 0.75, ry: hub.height * 0.75 };
    anchors = [...nodes, center];

    const edge = (a: { x: number; y: number }, b: { x: number; y: number }): Edge => ({
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      len: Math.hypot(b.x - a.x, b.y - a.y),
    });
    // Spokes hub → each node, then the top and bottom rails (nodes: TL, TR, BL, BR).
    edges = [...nodes.map((n) => edge(center, n)), edge(nodes[0], nodes[1]), edge(nodes[2], nodes[3])];
    return true;
  }

  function spawn(kind: Kind, ref: number): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      kind,
      ref,
      a: kind === 'edge' ? Math.random() : Math.random() * Math.PI * 2,
      r: 0.35 + Math.random() * 0.75,
      w: (Math.random() < 0.5 ? -1 : 1) * (0.0012 + Math.random() * 0.0028),
      phase: Math.random() * Math.PI * 2,
      size: 0.9 + Math.random() * 1.1,
    };
  }

  const budget = () => (width < PHONE_WIDTH ? COUNT_PHONE : width < SMALL_WIDTH ? COUNT_SMALL : COUNT);

  /** ~40% orbit the five anchors, ~45% flow along the edges (weighted by length), the rest roam. */
  function populate() {
    const count = budget();
    const nAnchor = Math.round(count * 0.4);
    const nEdge = Math.round(count * 0.45);
    const list: Particle[] = [];
    for (let i = 0; i < nAnchor; i++) list.push(spawn('anchor', i % anchors.length));
    const total = edges.reduce((sum, e) => sum + e.len, 0);
    for (let i = 0; i < nEdge; i++) {
      let pick = ((i + 0.5) / nEdge) * total;
      let ref = 0;
      while (ref < edges.length - 1 && pick > edges[ref].len) pick -= edges[ref++].len;
      list.push(spawn('edge', ref));
    }
    while (list.length < count) list.push(spawn('free', 0));
    particles = list;
    wrapper.dataset.particles = String(list.length);
  }

  function resize() {
    const box = svg.getBoundingClientRect();
    const room = Math.min(box.left - hero.getBoundingClientRect().left, hero.clientWidth - box.right) - PARALLAX_PX - 1;
    bleedX = Math.max(0, Math.min(BLEED, Math.floor(room)));
    canvas.style.left = `${-bleedX}px`;
    const nextW = box.width + bleedX * 2;
    const nextH = box.height + BLEED * 2;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nextW < 1 || nextH < 1) return;
    const scaleX = width ? nextW / width : 1;
    const scaleY = height ? nextH / height : 1;
    width = nextW;
    height = nextH;
    dpr = nextDpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!readGeometry()) return;
    if (particles.length !== budget()) populate();
    else
      for (const p of particles) {
        p.x *= scaleX;
        p.y *= scaleY;
      }
    if (!frame) draw();
  }

  function target(p: Particle) {
    const wobble = Math.sin(time * 0.0009 + p.phase);
    if (p.kind === 'anchor') {
      const an = anchors[p.ref];
      p.a += p.w;
      return { x: an.x + Math.cos(p.a) * an.rx * p.r, y: an.y + Math.sin(p.a) * an.ry * p.r };
    }
    if (p.kind === 'edge') {
      const e = edges[p.ref];
      // Data flows outward along each edge and wraps around.
      p.a = (p.a + 0.0009 + Math.abs(p.w) * 0.12) % 1;
      const nx = -(e.by - e.ay) / e.len;
      const ny = (e.bx - e.ax) / e.len;
      const off = wobble * 7 * p.r;
      return { x: e.ax + (e.bx - e.ax) * p.a + nx * off, y: e.ay + (e.by - e.ay) * p.a + ny * off };
    }
    // Free particles roam slow Lissajous paths across the whole canvas.
    return {
      x: width * (0.5 + 0.48 * Math.sin(time * 0.00011 * (1 + p.r) + p.phase)),
      y: height * (0.5 + 0.48 * Math.cos(time * 0.00009 * (1 + p.r) + p.phase * 1.7)),
    };
  }

  function step(dt: number) {
    const k = SPRING * dt;
    for (const p of particles) {
      const t = target(p);
      let ax = (t.x - p.x) * k;
      let ay = (t.y - p.y) * k;
      if (pointer) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < REPEL_RADIUS && d > 0.01) {
          const f = (1 - d / REPEL_RADIUS) ** 2 * REPEL_FORCE * dt;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }
      p.vx = (p.vx + ax) * DAMPING ** dt;
      p.vy = (p.vy + ay) * DAMPING ** dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > MAX_SPEED) {
        p.vx *= MAX_SPEED / speed;
        p.vy *= MAX_SPEED / speed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function draw() {
    const c = ctx!;
    c.clearRect(0, 0, width, height);

    // Soft glow behind the hub.
    const hub = anchors[4];
    if (hub) {
      const glow = c.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, hub.rx * 2.6);
      glow.addColorStop(0, `rgba(${HALO_RGB}, 0.16)`);
      glow.addColorStop(1, `rgba(${HALO_RGB}, 0)`);
      c.fillStyle = glow;
      c.fillRect(0, 0, width, height);
    }

    c.lineWidth = 0.8;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        if (dx > LINK_DIST || dx < -LINK_DIST) continue;
        const dy = a.y - b.y;
        if (dy > LINK_DIST || dy < -LINK_DIST) continue;
        const d = Math.hypot(dx, dy);
        if (d >= LINK_DIST) continue;
        c.strokeStyle = `rgba(${LINE_RGB}, ${((1 - d / LINK_DIST) * 0.55).toFixed(3)})`;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }

    c.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      c.fillStyle = `rgba(${HALO_RGB}, 0.22)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(${CORE_RGB}, 0.9)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  function updatePointer(target: { x: number; y: number }) {
    parallax.x += (target.x - parallax.x) * 0.08;
    parallax.y += (target.y - parallax.y) * 0.08;
    canvas.style.transform = `translate3d(${parallax.x.toFixed(2)}px, ${parallax.y.toFixed(2)}px, 0)`;
  }

  let client: { x: number; y: number } | null = null;

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    // dt in 60fps frames, clamped so a long gap (tab switch, jank) never makes particles jump.
    const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
    last = now;
    time += dt * 16.667;

    const heroBox = hero.getBoundingClientRect();
    const goal = client
      ? {
          x: -((client.x - heroBox.left) / heroBox.width - 0.5) * 2 * PARALLAX_PX,
          y: -((client.y - heroBox.top) / heroBox.height - 0.5) * 2 * PARALLAX_PX,
        }
      : { x: 0, y: 0 };
    updatePointer(goal);

    if (client) {
      const box = canvas.getBoundingClientRect();
      pointer = { x: client.x - box.left, y: client.y - box.top };
    } else pointer = null;

    step(dt);
    draw();
  }

  function sync() {
    const run = onScreen && !document.hidden;
    if (run && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    } else if (!run && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    wrapper.dataset.constellation = run ? 'running' : 'paused';
  }

  const onPointerMove = (e: PointerEvent) => {
    client = { x: e.clientX, y: e.clientY };
  };
  const onPointerLeave = () => {
    client = null;
  };

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  const ro = new ResizeObserver(() => resize());
  let dprQuery: MediaQueryList | null = null;
  const onDprChange = () => {
    resize();
    watchDpr();
  };
  function watchDpr() {
    dprQuery?.removeEventListener('change', onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener('change', onDprChange, { once: true });
  }

  wrapper.classList.add('is-constellation');
  wrapper.dataset.constellation = 'paused';
  resize();
  ro.observe(svg);
  window.addEventListener('resize', resize, { passive: true });
  io.observe(hero);
  watchDpr();
  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', sync);
  // Fade the canvas in on the next frame so the CSS transition runs.
  requestAnimationFrame(() => canvas.classList.add('is-visible'));

  return function destroy() {
    cancelAnimationFrame(frame);
    frame = 0;
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('resize', resize);
    dprQuery?.removeEventListener('change', onDprChange);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', sync);
    canvas.remove();
    wrapper.classList.remove('is-constellation');
    delete wrapper.dataset.constellation;
    delete wrapper.dataset.particles;
  };
}

function init() {
  const hero = document.getElementById('top');
  const wrapper = hero?.querySelector<HTMLElement>('[data-hero-diagram]');
  const svg = wrapper?.querySelector<SVGSVGElement>('svg.system-diagram');
  if (!hero || !wrapper || !svg) return;

  let destroy: (() => void) | null = null;
  const apply = () => {
    if (reducedMotion.matches) {
      destroy?.();
      destroy = null;
    } else if (!destroy) destroy = create(wrapper, svg, hero);
  };
  apply();
  reducedMotion.addEventListener('change', apply);
}

init();

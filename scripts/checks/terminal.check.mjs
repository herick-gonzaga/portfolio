/**
 * Contact terminal (src/components/Terminal.astro + src/scripts/terminal.ts), on /, /pt/ and /es/.
 * Markup: a labelled window with 3 traffic-light dots and a mono body, `herick@portfolio:~$`
 * prompt, a blinking block cursor, an input with a visually hidden locale label, the output in a
 * role="log" aria-live="polite" region and the locale's welcome line.
 * Lazy: on load at the top of the page the terminal chunk is not requested; focusing the input
 * (without scrolling) loads it; scrolling the window into view loads it and runs `help` once
 * (without moving focus or the page, or editing what a focused visitor is typing), and never again
 * after `clear`.
 * Commands (expected copy from src/i18n): help, about, skills, projects, journey, contact (mailto +
 * new-tab LinkedIn/GitHub links), languages, sudo hire-me (prints, then opens the mailto), clear,
 * unknown input ("<cmd>: command not found" + help hint); output is typed (aria-busy while typing)
 * and auto-scrolls the body to the bottom.
 * Keyboard: ArrowUp/ArrowDown history with the draft restored; Tab completes a unique prefix,
 * lists ambiguous candidates once and then moves focus; Tab on an empty input and Shift+Tab leave.
 * Reduced motion: output appears at once and the cursor does not blink.
 * Mobile (390px): quick-command buttons ≥44px tall and run their command, 16px input, no
 * horizontal overflow in the body.
 */
import { normalize } from './lib/context.mjs';
import { sleep } from './lib/browser.mjs';

const COMMANDS = ['help', 'about', 'skills', 'projects', 'journey', 'contact', 'languages', 'sudo hire-me', 'clear'];

const terminalChunkRequested = () =>
  performance.getEntriesByType('resource').some((r) => /\/_astro\/terminal\.[^/]+\.js$/.test(r.name));

const logText = () => document.querySelector('[data-terminal-log]').textContent.replace(/\s+/g, ' ').trim();

const idle = () => {
  const log = document.querySelector('[data-terminal-log]');
  return document.querySelector('[data-terminal]').hasAttribute('data-terminal-ready') && !log.hasAttribute('aria-busy');
};

/** Types `text` into the focused input and presses Enter, then waits for the output to finish. */
async function runCommand(page, text) {
  await page.eval(() => {
    const input = document.querySelector('[data-terminal-input]');
    input.focus({ preventScroll: true });
    input.value = '';
  });
  await page.send('Input.insertText', { text });
  const before = await page.eval(() => document.querySelectorAll('[data-terminal-log] .t-echo').length);
  await page.press('Enter');
  await page.waitFor((n) => document.querySelectorAll('[data-terminal-log] .t-echo').length > n, { args: [before] });
  await sleep(30);
  await page.waitFor(idle, { timeout: 4000 });
  // Text of everything printed after the last echo.
  return page.eval(() => {
    const echoes = document.querySelectorAll('[data-terminal-log] .t-echo');
    const last = echoes[echoes.length - 1];
    const parts = [];
    for (let el = last.nextElementSibling; el; el = el.nextElementSibling) {
      parts.push(...[...el.querySelectorAll('.t-line')].map((line) => line.textContent));
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  });
}

const includesAll = (haystack, needles) => needles.filter((n) => !haystack.includes(normalize(n)));

async function structure(t, page, route, at) {
  const { terminal } = route.content;
  const m = await page.eval(() => {
    const root = document.querySelector('[data-terminal]');
    const win = root.querySelector('.terminal');
    const log = root.querySelector('[data-terminal-log]');
    const input = root.querySelector('[data-terminal-input]');
    const label = document.querySelector(`label[for="${input.id}"]`);
    const cursor = root.querySelector('[data-terminal-cursor]');
    const cs = getComputedStyle(win);
    return {
      inContact: Boolean(root.closest('#contact')),
      group: [win.getAttribute('role'), win.getAttribute('aria-label')],
      dots: root.querySelectorAll('.terminal-dot').length,
      mono: cs.fontFamily.includes('JetBrains Mono'),
      prompt: root.querySelector('.t-prompt [aria-hidden="true"]').textContent.trim(),
      log: [log.getAttribute('role'), log.getAttribute('aria-live')],
      label: label?.textContent.trim(),
      labelHidden: label?.classList.contains('sr-only'),
      tabindex: input.getAttribute('tabindex'),
      cursor: { width: cursor.getBoundingClientRect().width, animation: getComputedStyle(cursor).animationName },
      welcome: log.textContent.replace(/\s+/g, ' ').trim(),
      ready: root.hasAttribute('data-terminal-ready'),
    };
  });
  t.ok(m.inContact, `${at}: the terminal is inside the Contact section`);
  t.eq(m.group, ['group', terminal.label], `${at}: window is a group labelled "${terminal.label}"`);
  t.eq(m.dots, 3, `${at}: title bar has 3 traffic-light dots`);
  t.ok(m.mono, `${at}: terminal uses JetBrains Mono`);
  t.eq(m.prompt, 'herick@portfolio:~$', `${at}: prompt reads herick@portfolio:~$`);
  t.eq(m.log, ['log', 'polite'], `${at}: output is role="log" aria-live="polite"`);
  t.eq([m.label, m.labelHidden], [terminal.inputLabel, true], `${at}: input has a visually hidden locale label`);
  t.eq(m.tabindex, '0', `${at}: input is a single Tab stop`);
  t.ok(m.cursor.width > 4 && m.cursor.animation === 'terminal-blink', `${at}: block cursor blinks`, JSON.stringify(m.cursor));
  t.eq(m.welcome, normalize(terminal.welcome.replace('{help}', 'help')), `${at}: welcome line from the locale`);
  t.ok(!m.ready, `${at}: terminal JS is not initialized on load`);
  t.ok(!(await page.eval(terminalChunkRequested)), `${at}: terminal chunk is not requested on load`);
}

async function lazyOnFocus(t, browser, url, r, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(url);
  await page.eval(() => document.querySelector('[data-terminal-input]').focus({ preventScroll: true }));
  const ready = await page.waitFor(() => document.querySelector('[data-terminal]').hasAttribute('data-terminal-ready'));
  t.ok(ready, `${at}: focusing the input (out of view) loads and initializes the terminal`);
  t.ok(await page.eval(terminalChunkRequested), `${at}: the terminal chunk is fetched on first interaction`);
  // Auto help scrolling in while the visitor is typing never touches their input.
  await page.send('Input.insertText', { text: 'abo' });
  await page.eval(() => document.querySelector('[data-terminal] .terminal').scrollIntoView({ block: 'center' }));
  await page.waitFor(() => document.querySelector('[data-terminal-log] .t-echo'));
  await page.waitFor(idle, { timeout: 4000 });
  t.eq(await page.eval(() => document.querySelector('[data-terminal-input]').value), 'abo', `${at}: auto help leaves a focused prompt's text alone`);
  const output = await runCommand(page, 'about');
  t.ok(output.includes(normalize(r.content.terminal.about[0])), `${at}: a command typed right after focus runs`);
  await page.close();
}

async function autoHelp(t, page, r, at) {
  const { terminal } = r.content;
  await page.eval(() => document.querySelector('[data-terminal] .terminal').scrollIntoView({ block: 'center' }));
  const scrollY = await page.eval(() => window.scrollY);
  const ran = await page.waitFor(() => document.querySelector('[data-terminal-log] .t-echo')?.textContent.includes('help'), { timeout: 5000 });
  t.ok(ran, `${at}: help runs by itself when the terminal scrolls into view`);
  t.ok(await page.waitFor(idle, { timeout: 5000 }), `${at}: auto help finishes`);
  const text = await page.eval(logText);
  const missing = includesAll(text, [...COMMANDS, ...Object.values(terminal.commands), terminal.helpTip]);
  t.eq(missing, [], `${at}: help lists every command with its locale description`);
  const after = await page.eval(() => ({
    y: window.scrollY,
    focused: document.activeElement?.hasAttribute('data-terminal-input') ?? false,
  }));
  t.ok(Math.abs(after.y - scrollY) < 2 && !after.focused, `${at}: auto help moves neither the page nor focus`, JSON.stringify(after));
}

async function commands(t, page, r, at) {
  const { terminal, skills, projects, journey, profile, ui } = r.content;

  // Typewriter: the log is aria-busy while an answer is being typed.
  await page.eval(() => {
    const input = document.querySelector('[data-terminal-input]');
    input.focus({ preventScroll: true });
    input.value = 'skills';
  });
  await page.press('Enter');
  const busy = await page.waitFor(() => document.querySelector('[data-terminal-log]').getAttribute('aria-busy') === 'true', { timeout: 1000 });
  t.ok(busy, `${at}: output is typed in (log aria-busy while typing)`);
  await page.waitFor(idle, { timeout: 4000 });
  const skillsText = await page.eval(logText);
  t.eq(includesAll(skillsText, skills.flatMap((s) => [s.title, ...s.chips])), [], `${at}: skills prints every category and tag`);
  const scrolled = await page.eval(() => {
    const body = document.querySelector('[data-terminal-body]');
    return { overflow: body.scrollHeight > body.clientHeight, atEnd: body.scrollHeight - body.scrollTop - body.clientHeight < 2 };
  });
  t.ok(scrolled.overflow && scrolled.atEnd, `${at}: body auto-scrolls to the bottom`, JSON.stringify(scrolled));

  const about = await runCommand(page, 'about');
  t.eq(includesAll(about, terminal.about), [], `${at}: about prints the bio`);

  const projectsText = await runCommand(page, 'projects');
  t.eq(includesAll(projectsText, projects.flatMap((p) => [p.name, p.tagline])), [], `${at}: projects prints names and one-liners`);

  const journeyText = await runCommand(page, 'journey');
  t.eq(includesAll(journeyText, journey.flatMap((j) => [j.period, j.title, j.org])), [], `${at}: journey prints the timeline`);

  const languages = await runCommand(page, 'languages');
  t.eq(includesAll(languages, terminal.languages.flatMap((l) => [l.name, l.level])), [], `${at}: languages prints PT/EN/ES/FR levels`);

  await runCommand(page, 'contact');
  const links = await page.eval(() =>
    [...document.querySelectorAll('[data-terminal-log] .t-entry:last-child a')].map((a) => ({
      label: a.textContent,
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
    })),
  );
  const { contact } = profile;
  t.eq(
    links,
    [
      { label: contact.email, href: `mailto:${contact.email}`, target: null, rel: null },
      { label: contact.linkedinLabel, href: contact.linkedin, target: '_blank', rel: 'noopener' },
      { label: contact.githubLabel, href: contact.github, target: '_blank', rel: 'noopener' },
    ],
    `${at}: contact prints email, LinkedIn and GitHub as links`,
  );
  const contactText = await page.eval(logText);
  t.eq(includesAll(contactText, [ui.contact.email, ui.contact.linkedin, ui.contact.github]), [], `${at}: contact labels from the locale`);

  const unknown = await runCommand(page, 'rm -rf /');
  t.eq(unknown, normalize(`rm: ${terminal.notFound} ${terminal.notFoundHint.replace('{help}', 'help')}`), `${at}: unknown input → command not found + help hint`);

  // sudo hire-me: playful lines, then the mail client opens (anchor click recorded, not followed).
  await page.eval(() => {
    window.__mailto = [];
    HTMLAnchorElement.prototype.click = function () {
      window.__mailto.push(this.href);
    };
  });
  const hire = await runCommand(page, 'sudo hire-me');
  const mail = `mailto:${contact.email}?subject=${encodeURIComponent(terminal.hireSubject)}`;
  t.eq(includesAll(hire, [...terminal.hire, terminal.hireOpening, contact.email]), [], `${at}: sudo hire-me prints its lines`);
  t.eq(await page.eval(() => window.__mailto), [mail], `${at}: sudo hire-me opens the mailto with a locale subject`);

  // History.
  await page.eval(() => {
    const input = document.querySelector('[data-terminal-input]');
    input.focus({ preventScroll: true });
    input.value = 'draft';
  });
  const values = [];
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown']) {
    await page.press(key);
    values.push(await page.eval(() => document.querySelector('[data-terminal-input]').value));
  }
  t.eq(values, ['sudo hire-me', 'rm -rf /', 'sudo hire-me', 'draft'], `${at}: ArrowUp/ArrowDown browse the history and restore the draft`);

  // Clear.
  await page.eval(() => {
    const input = document.querySelector('[data-terminal-input]');
    input.value = 'clear';
  });
  await page.press('Enter');
  const cleared = await page.waitFor(() => document.querySelector('[data-terminal-log]').children.length === 0, { timeout: 2000 });
  t.ok(cleared, `${at}: clear empties the screen`);
  t.eq(await page.eval(() => document.querySelector('[data-terminal-input]').value), '', `${at}: the prompt is empty after a command`);

  // Auto help runs once only: scrolling away and back after `clear` doesn't rerun it.
  await page.eval(() => window.scrollTo(0, 0));
  await sleep(150);
  await page.eval(() => document.querySelector('[data-terminal] .terminal').scrollIntoView({ block: 'center' }));
  await sleep(400);
  t.eq(await page.eval(() => document.querySelector('[data-terminal-log]').children.length), 0, `${at}: help auto-runs only the first time`);
}

async function keyboard(t, page, at) {
  const focus = (value = '') =>
    page.eval((v) => {
      const input = document.querySelector('[data-terminal-input]');
      input.focus({ preventScroll: true });
      input.value = v;
      input.setSelectionRange(v.length, v.length);
    }, value);
  const state = () =>
    page.eval(() => ({
      value: document.querySelector('[data-terminal-input]').value,
      inInput: document.activeElement?.hasAttribute('data-terminal-input') ?? false,
      next: document.activeElement?.getAttribute('data-terminal-run') ?? document.activeElement?.tagName,
    }));

  await focus('lan');
  await page.press('Tab');
  let s = await state();
  t.eq([s.value, s.inInput], ['languages', true], `${at}: Tab completes a unique prefix and keeps focus`);

  await focus('su');
  await page.press('Tab');
  s = await state();
  t.eq([s.value, s.inInput], ['sudo hire-me', true], `${at}: Tab completes "sudo hire-me"`);

  await focus('c');
  const echoes = await page.eval(() => document.querySelectorAll('[data-terminal-log] .t-echo').length);
  await page.press('Tab');
  s = await state();
  t.eq([s.value, s.inInput], ['c', true], `${at}: Tab on an ambiguous prefix keeps focus once`);
  await page.waitFor(idle);
  const listed = await page.eval((n) => {
    const echo = document.querySelectorAll('[data-terminal-log] .t-echo')[n];
    return echo?.nextElementSibling?.textContent.replace(/\s+/g, ' ').trim();
  }, echoes);
  t.eq(listed, 'contact clear', `${at}: …and lists the candidates`);
  await page.press('Tab');
  s = await state();
  t.eq([s.inInput, s.next], [false, 'help'], `${at}: a second Tab moves focus on (no trap)`);

  await focus('');
  await page.press('Tab');
  s = await state();
  t.eq([s.inInput, s.next], [false, 'help'], `${at}: Tab on an empty prompt moves to the next control`);

  await focus('');
  await page.press('Tab', { shift: true });
  s = await state();
  t.ok(!s.inInput, `${at}: Shift+Tab leaves the prompt`);
}

async function reducedMotion(t, browser, url, at) {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.reducedMotion(true);
  await page.goto(url);
  await page.eval(() => document.querySelector('[data-terminal] .terminal').scrollIntoView({ block: 'center' }));
  await page.waitFor(() => document.querySelector('[data-terminal-log] .t-echo'));
  await page.waitFor(idle);
  await page.eval(() => {
    const input = document.querySelector('[data-terminal-input]');
    input.focus({ preventScroll: true });
    input.value = 'skills';
  });
  await page.press('Enter');
  const instant = await page.eval(() => {
    const log = document.querySelector('[data-terminal-log]');
    return new Promise((resolve) =>
      requestAnimationFrame(() => resolve({ busy: log.hasAttribute('aria-busy'), done: log.lastElementChild?.classList.contains('t-entry') })),
    );
  });
  t.ok(!instant.busy && instant.done, `${at}: reduced motion prints output at once`, JSON.stringify(instant));
  const blink = await page.eval(() => getComputedStyle(document.querySelector('[data-terminal-cursor]')).animationName);
  t.eq(blink, 'none', `${at}: reduced motion stops the cursor blinking`);
  await page.close();
}

async function mobile(t, browser, url, at) {
  const page = await browser.newPage({ width: 390, height: 844 });
  await page.goto(url);
  await page.eval(() => document.querySelector('[data-terminal] .terminal').scrollIntoView({ block: 'center' }));
  await page.waitFor(idle, { timeout: 5000 });
  await page.waitFor(() => document.querySelector('[data-terminal-log] .t-echo'));
  await page.waitFor(idle, { timeout: 5000 });
  const m = await page.eval(() => {
    const root = document.querySelector('[data-terminal]');
    const body = root.querySelector('[data-terminal-body]');
    const de = document.documentElement;
    return {
      buttons: [...root.querySelectorAll('[data-terminal-run]')].map((b) => Math.round(b.getBoundingClientRect().height)),
      inputFont: parseFloat(getComputedStyle(root.querySelector('[data-terminal-input]')).fontSize),
      bodyOverflowX: body.scrollWidth - body.clientWidth,
      pageOverflowX: de.scrollWidth - de.clientWidth,
      fits: root.getBoundingClientRect().right <= de.clientWidth,
    };
  });
  t.ok(m.buttons.length === 8 && m.buttons.every((h) => h >= 44), `${at}: 8 quick-command buttons, ≥44px tall`, JSON.stringify(m.buttons));
  t.eq(m.inputFont, 16, `${at}: input is 16px (no iOS zoom on focus)`);
  t.ok(m.bodyOverflowX <= 0 && m.pageOverflowX <= 0 && m.fits, `${at}: no horizontal overflow`, JSON.stringify(m));
  await page.click('[data-terminal-run="contact"]');
  const ran = await page.waitFor(
    () => [...document.querySelectorAll('[data-terminal-log] .t-echo')].some((e) => e.textContent.includes('contact')),
    { timeout: 4000 },
  );
  await page.waitFor(idle, { timeout: 4000 });
  const linkCount = await page.eval(() => document.querySelectorAll('[data-terminal-log] a').length);
  t.ok(ran && linkCount === 3, `${at}: tapping a quick command runs it`, `ran=${ran} links=${linkCount}`);
  t.eq(page.errors, [], `${at}: no script errors`);
  await page.close();
}

export default {
  name: 'Contact terminal',
  async run({ browser, baseUrl, routes, t }) {
    for (const r of routes) {
      const url = `${baseUrl}${r.path}`;
      const at = r.path;
      const page = await browser.newPage({ width: 1440, height: 900 });
      await page.goto(url);
      await structure(t, page, r, at);
      await autoHelp(t, page, r, at);
      await commands(t, page, r, at);
      await keyboard(t, page, at);
      t.eq(page.errors, [], `${at}: no script errors`);
      await page.close();

      await lazyOnFocus(t, browser, url, r, at);
      await reducedMotion(t, browser, url, at);
      await mobile(t, browser, url, at);
    }
  },
};

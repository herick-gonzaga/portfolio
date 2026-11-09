/**
 * Interactive terminal in the Contact section (src/components/Terminal.astro).
 *
 * Loaded lazily: the component's bootstrap script imports this module the first time the
 * terminal scrolls into view or is interacted with (focus, pointer, quick-command button), so
 * none of this runs or downloads on page load.
 *
 * Every printed line is prepared server-side, localized, in the component's JSON data block; this
 * module only renders it. Output is typed in, a chunk of characters per frame, and capped so a long
 * answer still finishes in well under a second; under prefers-reduced-motion it appears at once.
 * The log is role="log" aria-live="polite" and aria-busy while a line is being typed, so screen
 * readers announce each answer once, complete.
 *
 * Keyboard: Enter runs, ArrowUp/ArrowDown browse the history, Tab completes a partial command
 * name. Tab never traps focus: with nothing to complete (empty input, no match, or a second Tab
 * that would not change anything) it moves focus as usual, and Shift+Tab always does.
 */

export type Tone = 'cmd' | 'muted' | 'accent' | 'ok' | 'tag';

/** One run of text inside a line: plain, colored, or a link. */
export interface Segment {
  t: string;
  k?: Tone;
  href?: string;
  /** Open in a new tab (rel="noopener"). */
  ext?: boolean;
}

export type Line = Segment[];

export interface TerminalData {
  prompt: string;
  /** Command names, in `help` order; also the Tab completion candidates. */
  commands: string[];
  outputs: Record<string, Line[]>;
  /** "command not found", printed after the unknown input. */
  notFound: string;
  notFoundHint: Line;
  /** mailto: URL opened by `sudo hire-me` once its output is printed. */
  hireMail: string;
}

export interface TerminalController {
  /** Runs the command typed in the input (Enter / form submit). */
  submit(): void;
  /** Types `command` into the prompt and runs it (quick-command buttons). */
  run(command: string): void;
  /** Runs `help` once, the first time the terminal scrolls into view, unless something ran. */
  autoHelp(): void;
}

const TYPE_ECHO_MS = 45;
const CHAR_MS = 9;
const MAX_ENTRY_MS = 700;
const FRAME_MS = 16;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function mount(root: HTMLElement): TerminalController {
  const data = JSON.parse(root.querySelector('[data-terminal-data]')!.textContent!) as TerminalData;
  const body = root.querySelector<HTMLElement>('[data-terminal-body]')!;
  const log = root.querySelector<HTMLElement>('[data-terminal-log]')!;
  const input = root.querySelector<HTMLInputElement>('[data-terminal-input]')!;
  const mirror = root.querySelector<HTMLElement>('[data-terminal-mirror]')!;
  const cursor = root.querySelector<HTMLElement>('[data-terminal-cursor]')!;

  const history: string[] = [];
  let historyIndex = 0;
  let draft = '';
  let ranSomething = false;
  let autoHelpDone = false;
  /** Commands queued or running; while any are, a new one sets `skip` to finish them at once. */
  let pending = 0;
  let skip = false;
  /** True while typeIntoPrompt is writing into the input. */
  let autoTyping = false;
  let queue = Promise.resolve();
  /** A Tab that could not complete anything; the next Tab moves focus instead. */
  let tabStalled = false;

  const scrollToEnd = () => {
    body.scrollTop = body.scrollHeight;
  };

  /* ---------- Block cursor ---------- */

  // The native caret is hidden; the block sits after the text before the selection start,
  // measured with a hidden mirror span in the same font, minus the input's own scroll offset.
  function placeCursor() {
    const position = input.selectionStart ?? input.value.length;
    mirror.textContent = input.value.slice(0, position);
    const max = input.clientWidth - cursor.offsetWidth;
    const left = Math.max(0, Math.min(mirror.offsetWidth - input.scrollLeft, max));
    cursor.style.transform = `translateX(${left}px)`;
  }
  const placeCursorSoon = () => requestAnimationFrame(placeCursor);
  for (const type of ['input', 'focus', 'click', 'select', 'keyup']) input.addEventListener(type, placeCursorSoon);
  placeCursor();

  /* ---------- Rendering ---------- */

  function renderLine(line: Line, className = 't-line'): HTMLElement {
    const p = document.createElement('p');
    p.className = className;
    for (const seg of line) {
      let el: HTMLElement;
      if (seg.href) {
        const a = document.createElement('a');
        a.href = seg.href;
        if (seg.ext) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        a.className = 't-link';
        el = a;
      } else {
        el = document.createElement('span');
      }
      if (seg.k) el.classList.add(`t-${seg.k}`);
      el.textContent = seg.t;
      p.append(el);
    }
    return p;
  }

  /** Appends `lines` to the log, typing their text in unless motion is reduced. */
  async function print(lines: Line[]) {
    const entry = document.createElement('div');
    entry.className = 't-entry';
    log.append(entry);
    const elements = lines.map((line) => (line.length ? renderLine(line) : renderLine([], 't-line t-blank')));
    const total = lines.reduce((n, line) => n + line.reduce((m, seg) => m + seg.t.length, 0), 0);

    if (reducedMotion.matches || skip || total === 0) {
      entry.append(...elements);
      scrollToEnd();
      return;
    }

    log.setAttribute('aria-busy', 'true');
    const perFrame = Math.max(1, Math.ceil(total / (Math.min(total * CHAR_MS, MAX_ENTRY_MS) / FRAME_MS)));
    let budget = perFrame;
    for (const el of elements) {
      const nodes = [...el.childNodes].map((child) => {
        const textNode = child.firstChild as Text | null;
        const full = textNode?.data ?? '';
        if (textNode) textNode.data = '';
        return { textNode, full };
      });
      entry.append(el);
      for (const { textNode, full } of nodes) {
        if (!textNode) continue;
        let shown = 0;
        while (shown < full.length) {
          if (skip) {
            shown = full.length;
          } else {
            const step = Math.min(budget, full.length - shown);
            shown += step;
            budget -= step;
          }
          textNode.data = full.slice(0, shown);
          if (budget <= 0) {
            scrollToEnd();
            await frame();
            budget = perFrame;
          }
        }
      }
      scrollToEnd();
    }
    log.removeAttribute('aria-busy');
  }

  function echo(command: string) {
    log.append(renderLine([{ t: data.prompt, k: 'ok' }, { t: ` ${command}` }], 't-line t-echo'));
    scrollToEnd();
  }

  /* ---------- Commands ---------- */

  async function execute(raw: string) {
    const command = raw.trim().replace(/\s+/g, ' ');
    if (!command) return;
    if (command.toLowerCase() === 'clear') {
      log.replaceChildren();
      return;
    }
    const lines = data.outputs[command.toLowerCase()];
    if (!lines) {
      await print([[{ t: `${command.split(' ')[0]}: ${data.notFound}` }], data.notFoundHint]);
      return;
    }
    await print(lines);
    if (command.toLowerCase() === 'sudo hire-me') openMail(data.hireMail);
  }

  function openMail(href: string) {
    const a = document.createElement('a');
    a.href = href;
    a.click();
  }

  function remember(command: string) {
    if (command && history.at(-1) !== command) history.push(command);
    historyIndex = history.length;
    draft = '';
  }

  /** Queues a command: anything still being typed finishes instantly first. */
  function enqueue(command: string, { typeEcho = false } = {}) {
    ranSomething = true;
    if (pending > 0) skip = true;
    pending++;
    queue = queue.then(async () => {
      // Another command is already waiting: show this one at once.
      skip = pending > 1;
      // The prompt is only borrowed for the typing effect while nobody is using it.
      if (typeEcho && !reducedMotion.matches && document.activeElement !== input && !input.value) {
        await typeIntoPrompt(command);
        // Focused mid-typing: the focus handler already emptied it, what's there now is theirs.
        if (document.activeElement !== input) {
          input.value = '';
          placeCursor();
        }
      }
      echo(command);
      await execute(command);
      pending--;
    });
  }

  /**
   * Types `command` into the empty prompt, character by character, as if someone typed it. Stops
   * the moment the visitor focuses the prompt, so it never edits what they are typing.
   */
  async function typeIntoPrompt(command: string) {
    autoTyping = true;
    for (const char of command) {
      if (skip || document.activeElement === input) break;
      input.value += char;
      placeCursor();
      await wait(TYPE_ECHO_MS);
    }
    autoTyping = false;
  }

  /* ---------- Keyboard ---------- */

  /**
   * Tab completion. 'filled': the input was extended to the longest common prefix of the
   * matching commands. 'listed': the input was already that prefix, so the candidates were
   * printed. null: nothing to complete, so Tab keeps its normal focus-moving behavior.
   */
  function complete(): 'filled' | 'listed' | null {
    const value = input.value.trimStart().toLowerCase();
    if (!value) return null;
    const matches = data.commands.filter((name) => name.startsWith(value));
    if (matches.length === 0 || (matches.length === 1 && matches[0] === value)) return null;
    let prefix = matches[0];
    for (const name of matches) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (prefix.length > value.length) {
      input.value = prefix;
      input.setSelectionRange(prefix.length, prefix.length);
      placeCursor();
      return 'filled';
    }
    // A second Tab on the same ambiguous prefix moves focus on, so it can never trap focus.
    if (tabStalled) return null;
    const typed = input.value;
    queue = queue.then(() => {
      echo(typed);
      return print([matches.map((name, i) => ({ t: i ? `  ${name}` : name, k: 'cmd' as const }))]);
    });
    return 'listed';
  }

  // Focus taken while the prompt was being typed into by autoHelp/run: hand it back empty.
  input.addEventListener('focus', () => {
    if (!autoTyping) return;
    input.value = '';
    placeCursor();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      const result = complete();
      tabStalled = result === 'listed';
      if (result) event.preventDefault();
      return;
    }
    tabStalled = false;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (history.length === 0) return;
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = event.key === 'ArrowUp' ? Math.max(0, historyIndex - 1) : Math.min(history.length, historyIndex + 1);
      input.value = historyIndex === history.length ? draft : history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
      placeCursor();
      return;
    }

    if (event.key === 'Escape' && input.value) {
      event.preventDefault();
      input.value = '';
      placeCursor();
    }
  });

  // Clicking the terminal focuses the prompt, like a real one — but not when the visitor is
  // selecting text or following a link.
  body.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a, input')) return;
    if (window.getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });

  root.setAttribute('data-terminal-ready', '');

  return {
    submit() {
      const command = input.value;
      input.value = '';
      placeCursor();
      remember(command.trim());
      enqueue(command);
    },
    run(command) {
      remember(command);
      enqueue(command, { typeEcho: true });
    },
    autoHelp() {
      if (autoHelpDone || ranSomething) return;
      autoHelpDone = true;
      enqueue('help', { typeEcho: true });
    },
  };
}

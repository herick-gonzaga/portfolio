/**
 * Minimal headless Chrome driver over the DevTools protocol (Node 22 global WebSocket).
 * No npm dependency: it launches the system Chrome (or $CHROME_PATH). Each page gets its own
 * browser context, so localStorage and cookies never leak between checks.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Connection {
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error(`Cannot connect to ${url}`)), { once: true });
    });
    return new Connection(ws);
  }

  constructor(ws) {
    this.ws = ws;
    this.lastId = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const call = this.pending.get(message.id);
        if (!call) return;
        this.pending.delete(message.id);
        if (message.error) call.reject(new Error(`${call.method}: ${message.error.message}`));
        else call.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.lastId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.ws.close();
  }
}

const KEYS = {
  Tab: 9,
  Enter: 13,
  Escape: 27,
  End: 35,
  Home: 36,
  ArrowUp: 38,
  ArrowDown: 40,
};

export class Page {
  constructor(connection, sessionId, browserContextId, cspViolations = []) {
    this.connection = connection;
    this.sessionId = sessionId;
    this.browserContextId = browserContextId;
    /** Uncaught page exceptions since the page was created. */
    this.errors = [];
    /** Content-Security-Policy violations reported by Chrome, shared with the Browser. */
    this.cspViolations = cspViolations;
    this.loads = 0;
    this.mouse = { x: 0, y: 0 };
  }

  async init({ width, height, language }) {
    this.off = this.connection.on((message) => {
      if (message.sessionId !== this.sessionId) return;
      if (message.method === 'Page.loadEventFired') this.loads++;
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        this.errors.push(details.exception?.description ?? details.text);
      }
      if (message.method === 'Log.entryAdded' && /Content Security Policy/i.test(message.params.entry.text)) {
        this.cspViolations.push(`${message.params.entry.url ?? ''} ${message.params.entry.text}`.trim());
      }
    });
    await this.send('Page.enable');
    await this.send('Log.enable');
    await this.send('Runtime.enable');
    await this.viewport(width, height);
    await this.setLanguage(language);
  }

  send(method, params) {
    return this.connection.send(method, params, this.sessionId);
  }

  viewport(width, height = 900) {
    this.width = width;
    return this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }

  reducedMotion(on) {
    return this.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }],
    });
  }

  /** Sets navigator.language(s) for documents loaded after this call. */
  setLanguage(language) {
    const source = `(() => {
      const lang = ${JSON.stringify(language)};
      Object.defineProperty(Navigator.prototype, 'language', { get: () => lang, configurable: true });
      Object.defineProperty(Navigator.prototype, 'languages', { get: () => [lang], configurable: true });
    })();`;
    return this.send('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  /** Runs `fn(...args)` in the page and returns its JSON-serializable result. */
  async eval(fn, ...args) {
    const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }

  /** Polls `fn(...args)` until it returns a truthy value; tolerates evaluations during navigation. */
  async waitFor(fn, { timeout = 5000, args = [] } = {}) {
    const start = Date.now();
    let last;
    while (Date.now() - start < timeout) {
      try {
        last = await this.eval(fn, ...args);
        if (last) return last;
      } catch {
        // The page is navigating; retry.
      }
      await sleep(25);
    }
    return last;
  }

  /** Waits for fonts and two frames so measurements reflect the final layout. */
  settle() {
    return this.eval(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  }

  async goto(url) {
    const before = this.loads;
    await this.send('Page.navigate', { url });
    const start = Date.now();
    while (this.loads <= before) {
      if (Date.now() - start > 15000) throw new Error(`Timed out loading ${url}`);
      await sleep(20);
    }
    await this.waitFor(() => document.readyState === 'complete');
    await this.settle();
  }

  async reload() {
    const href = await this.eval(() => location.href);
    await this.goto(href);
  }

  async press(key, { shift = false } = {}) {
    const code = KEYS[key];
    if (!code) throw new Error(`Unsupported key ${key}`);
    const base = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: shift ? 8 : 0 };
    // Enter needs a keyDown with text (it also emits the keypress) so it activates a focused
    // <button> like a real key; rawKeyDown only fires keydown.
    const down = key === 'Enter' ? { type: 'keyDown', text: '\r' } : { type: 'rawKeyDown' };
    await this.send('Input.dispatchKeyEvent', { ...down, ...base });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }

  /** Center of the first element matching `selector`, scrolled into view; null if not rendered. */
  async center(selector, { scroll = true } = {}) {
    return this.eval(
      (sel, doScroll) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        if (doScroll) el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      selector,
      scroll,
    );
  }

  async moveMouse(x, y) {
    this.mouse = { x, y };
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  }

  async hover(selector) {
    const point = await this.center(selector);
    if (!point) throw new Error(`Cannot hover ${selector}: not rendered`);
    await this.moveMouse(point.x, point.y);
  }

  /** A trusted mouse click at the element's center (or at explicit viewport coordinates). */
  async click(target) {
    const point = typeof target === 'string' ? await this.center(target) : target;
    if (!point) throw new Error(`Cannot click ${target}: not rendered`);
    await this.moveMouse(point.x, point.y);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    }
  }

  async close() {
    this.off?.();
    await this.connection.send('Target.disposeBrowserContext', { browserContextId: this.browserContextId });
  }
}

export class Browser {
  constructor(connection, process, userDataDir) {
    this.connection = connection;
    this.process = process;
    this.userDataDir = userDataDir;
    /** Every Content-Security-Policy violation on any page opened by this browser. */
    this.cspViolations = [];
  }

  /** A new page in a fresh browser context (empty storage). `language` sets navigator.language. */
  async newPage({ width = 1440, height = 900, language = 'en-US' } = {}) {
    const { browserContextId } = await this.connection.send('Target.createBrowserContext');
    const { targetId } = await this.connection.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await this.connection.send('Target.attachToTarget', { targetId, flatten: true });
    const page = new Page(this.connection, sessionId, browserContextId, this.cspViolations);
    await page.init({ width, height, language });
    return page;
  }

  async close() {
    try {
      await this.connection.send('Browser.close');
    } catch {
      // Already gone.
    }
    this.connection.close();
    if (this.process.exitCode === null) {
      const exited = new Promise((resolve) => this.process.once('exit', resolve));
      this.process.kill();
      await Promise.race([exited, sleep(5000)]);
    }
    // Chrome's helper processes can still be flushing the profile; removal is best-effort.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        rmSync(this.userDataDir, { recursive: true, force: true });
        return;
      } catch {
        await sleep(200);
      }
    }
  }
}

export async function launchBrowser() {
  const executable = CHROME_CANDIDATES.find((path) => path && existsSync(path));
  if (!executable) throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
  const userDataDir = mkdtempSync(join(tmpdir(), 'portfolio-ui-checks-'));
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start within 15s')), 15000);
    child.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code})`));
    });
  });
  const connection = await Connection.open(wsUrl);
  return new Browser(connection, child, userDataDir);
}

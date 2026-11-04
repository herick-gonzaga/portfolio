/**
 * Skills grid and chips: 2×2 from 900px (no 4-column row, even at 1440+), 1 column below 900.
 * Every chip stays on one line (nowrap, 28px) and inside its card's content box, at the
 * breakpoint edges and the review widths, in every locale.
 * Expanded skills: each group renders its pinned chip count (10 / 8 / 7 / 6) with the
 * new chips present, and the two cards in a row share one height (balanced chip blocks).
 */
import { TOKENS } from './lib/context.mjs';

const WIDTHS = [1920, 1440, 1392, 1360, 1200, 900, 899, 390];
const expectedColumns = (width) => (width >= 900 ? 2 : 1);

const CHIP_COUNTS = [10, 8, 7, 6];
const SHARED_NEW_CHIPS = ['SQL / Redash', 'JavaScript', 'Astro & Tailwind CSS'];
const NEW_CHIPS = {
  en: [
    [...SHARED_NEW_CHIPS, 'Networking fundamentals'],
    ['LLM evals', 'Coding agents (Claude Code)'],
    ['E2E testing in CI', 'Test management (MQ-Test)'],
    ['Spanish & French (basic)', 'Mentoring'],
  ],
  pt: [
    [...SHARED_NEW_CHIPS, 'Fundamentos de redes'],
    ['Avaliação de LLMs', 'Agentes de código (Claude Code)'],
    ['Testes E2E no CI', 'Gestão de testes (MQ-Test)'],
    ['Espanhol e Francês (básico)', 'Mentoria'],
  ],
  es: [
    [...SHARED_NEW_CHIPS, 'Fundamentos de redes'],
    ['Evaluación de LLMs', 'Agentes de código (Claude Code)'],
    ['Pruebas E2E en CI', 'Gestión de pruebas (MQ-Test)'],
    ['Español y Francés (básico)', 'Mentoría'],
  ],
};

function measure() {
  const items = [...document.querySelectorAll('#skills ul.grid > li')];
  const columns = new Set(items.map((li) => Math.round(li.getBoundingClientRect().left))).size;
  const chips = [];
  for (const li of items) {
    const card = li.querySelector('article');
    const style = getComputedStyle(card);
    const box = card.getBoundingClientRect();
    const innerLeft = box.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
    const innerRight = box.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
    for (const chip of card.querySelectorAll('ul li > span')) {
      const r = chip.getBoundingClientRect();
      chips.push({
        label: chip.textContent.trim(),
        whiteSpace: getComputedStyle(chip).whiteSpace,
        height: r.height,
        textOverflow: chip.scrollWidth - chip.clientWidth,
        outside: Math.max(innerLeft - r.left, r.right - innerRight),
        spare: innerRight - innerLeft - r.width,
      });
    }
  }
  const groups = items.map((li) => [...li.querySelectorAll('article ul li > span')].map((c) => c.textContent.trim()));
  const rows = {};
  for (const li of items) {
    const r = li.querySelector('article').getBoundingClientRect();
    (rows[Math.round(r.top)] ??= []).push(r.height);
  }
  const rowHeightSpread = Object.values(rows).map((hs) => Math.max(...hs) - Math.min(...hs));
  const root = document.documentElement;
  return { lang: root.lang, columns, chips, groups, rowHeightSpread, hscroll: root.scrollWidth - root.clientWidth };
}

export default {
  name: 'Skills grid and chips',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const width of WIDTHS) {
      await page.viewport(width);
      for (const route of routes) {
        await page.goto(baseUrl + route.path);
        const m = await page.eval(measure);
        const at = `${route.path} @${width}`;
        t.eq(m.lang, route.lang, `${at}: html lang`);
        t.eq(m.columns, expectedColumns(width), `${at}: column count`);
        t.ok(m.hscroll <= 0, `${at}: no horizontal scroll`, `page is ${m.hscroll}px wider than the viewport`);
        const bad = (fn) => m.chips.filter(fn).map((c) => c.label);
        t.eq(bad((c) => c.whiteSpace !== 'nowrap'), [], `${at}: every chip is white-space: nowrap`);
        t.eq(bad((c) => Math.round(c.height) !== TOKENS.chipHeight), [], `${at}: every chip is one 28px line`);
        t.eq(bad((c) => c.textOverflow > 0.5), [], `${at}: no chip text overflows its chip`);
        t.eq(bad((c) => c.outside > 0.5), [], `${at}: every chip sits inside its card's content box`);
        t.eq(m.rowHeightSpread.filter((d) => d > 0.5), [], `${at}: cards in a row share one height`);
        if (width === 1440) {
          t.eq(m.groups.map((g) => g.length), CHIP_COUNTS, `${at}: chip count per skill group`);
          NEW_CHIPS[route.locale].forEach((chips, i) => {
            const missing = chips.filter((c) => !m.groups[i]?.includes(c));
            t.eq(missing, [], `${at}: group ${i + 1} renders its new chips`);
          });
        }
        const tightest = m.chips.reduce((a, b) => (b.spare < a.spare ? b : a));
        if (route.locale === 'es' && (width === 900 || width === 1440)) {
          t.note(`${at}: tightest chip "${tightest.label}" has ${Math.round(tightest.spare)}px spare`);
        }
      }
    }
    await page.close();
  },
};

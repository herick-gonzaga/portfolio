/**
 * Skills grid and chips: 4 columns from 1392px, 2×2 from 900 to 1391px, 1 column below 900.
 * Every chip stays on one line (nowrap, 28px) and inside its card's content box, at the
 * breakpoint edges and the review widths, in every locale.
 */
import { TOKENS } from './lib/context.mjs';

const WIDTHS = [1440, 1392, 1391, 1360, 1200, 900, 899, 390];
const expectedColumns = (width) => (width >= 1392 ? 4 : width >= 900 ? 2 : 1);

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
  const root = document.documentElement;
  return { lang: root.lang, columns, chips, hscroll: root.scrollWidth - root.clientWidth };
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
        const tightest = m.chips.reduce((a, b) => (b.spare < a.spare ? b : a));
        if (route.locale === 'es' && (width === 1392 || width === 1440)) {
          t.note(`${at}: tightest chip "${tightest.label}" has ${Math.round(tightest.spare)}px spare`);
        }
      }
    }
    await page.close();
  },
};

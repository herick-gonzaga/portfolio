/**
 * Positioning (Software & AI Engineering + International Relations): the hero badge, the
 * International Relations chip, the About "Available for" row, the Contact paragraph and the
 * meta/Open Graph/Twitter/JSON-LD description render the agreed copy, and no job-seeking copy
 * is left anywhere on the page, in the head metadata or in the JSON-LD.
 *
 * Expected strings are pinned here on purpose, not read from src/i18n, so an edit to the locale
 * files that drifts from the agreed positioning fails this check.
 */
import { normalize } from './lib/context.mjs';

const EXPECTED = {
  en: {
    status: 'Software & AI Engineering + International Relations · Brazil (UTC−3)',
    introStart: 'I’m Herick Gonzaga, a Software & AI Engineer and International Relations undergraduate.',
    chip: 'International Relations',
    fact: { label: 'Available for', value: 'Talks, mentoring and tech communities' },
    contact: 'Organizing a talk, looking for a mentor or building a tech community? My inbox is open — English or Portuguese both work.',
    description: 'Software & AI Engineer who pairs engineering with an International Relations background: LLM systems, agents and QA for U.S. construction procurement.',
  },
  pt: {
    status: 'Engenharia de Software & IA + Relações Internacionais · Brasil (UTC−3)',
    introStart: 'Sou Herick Gonzaga, Engenheiro de Software & IA e estudante de Relações Internacionais.',
    chip: 'Relações Internacionais',
    fact: { label: 'Disponível para', value: 'Palestras, mentorias e comunidades tech' },
    contact: 'Organizando uma palestra, buscando mentoria ou construindo uma comunidade tech? Minha caixa de entrada está aberta — em inglês ou português.',
    description: 'Engenheiro de Software & IA que une engenharia à formação em Relações Internacionais: sistemas LLM, agentes e QA para uma plataforma de compras dos EUA.',
  },
  es: {
    status: 'Ingeniería de Software e IA + Relaciones Internacionales · Brasil (UTC−3)',
    introStart: 'Soy Herick Gonzaga, Ingeniero de Software e IA y estudiante de Relaciones Internacionales.',
    chip: 'Relaciones Internacionales',
    fact: { label: 'Disponible para', value: 'Charlas, mentorías y comunidades tech' },
    contact: '¿Organizas una charla, buscas mentoría o construyes una comunidad tech? Mi bandeja de entrada está abierta.',
    description: 'Ingeniero de Software e IA que une ingeniería con formación en Relaciones Internacionales: LLM, agentes y QA para una plataforma de compras de EE. UU.',
  },
};

/** Job-seeking phrases in any of the three languages; none may appear on any route. */
const JOB_SEEKING = [
  /open to (remote |new )?(roles|work|opportunities|positions)/i,
  /\bopen to\b/i,
  /hiring for/i,
  /aberto a (vagas|oportunidades)/i,
  /\bvagas?\b/i,
  /contratando/i,
  /abierto a/i,
  /roles remotos/i,
  /buscas a alguien/i,
  /\bvacantes?\b/i,
];

function read() {
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const metas = [...document.querySelectorAll('head meta[content]')].map((m) => m.getAttribute('content'));
  return {
    status: text(document.querySelector('[data-hero-status-text]')),
    intro: text(document.querySelector('#top p.hero-title')),
    chips: [...document.querySelectorAll('.hero-ctas li')].map(text),
    facts: [...document.querySelectorAll('#about dl > div')].map((row) => ({ label: text(row.querySelector('dt')), value: text(row.querySelector('dd')) })),
    contact: text(document.querySelector('#contact h2 + p')),
    descriptions: {
      meta: document.querySelector('head meta[name="description"]')?.getAttribute('content'),
      og: document.querySelector('head meta[property="og:description"]')?.getAttribute('content'),
      twitter: document.querySelector('head meta[name="twitter:description"]')?.getAttribute('content'),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((ld) => ld['@type'] === 'Person')?.description,
    },
    haystack: [
      document.title,
      document.body.innerText,
      ...metas,
      ...[...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      ...[...document.querySelectorAll('[aria-label], [alt], [title]')].flatMap((el) => ['aria-label', 'alt', 'title'].map((a) => el.getAttribute(a) ?? '')),
    ].join('\n'),
  };
}

export default {
  name: 'Positioning copy',
  async run({ browser, baseUrl, routes, t }) {
    const page = await browser.newPage();
    for (const route of routes) {
      const want = EXPECTED[route.locale];
      const at = route.path;
      await page.viewport(1440);
      await page.goto(baseUrl + route.path);
      const m = await page.eval(read);

      t.eq(m.status, want.status, `${at}: hero badge states the positioning`);
      t.ok(normalize(m.intro).startsWith(want.introStart), `${at}: hero intro names the International Relations identity`, m.intro);
      t.eq(m.chips.at(-1), want.chip, `${at}: hero ends with the International Relations chip`);
      t.eq(m.chips.length, 6, `${at}: hero has 6 chips`);
      t.eq(m.facts.at(-1), want.fact, `${at}: About ends with the "available for" row`);
      t.eq(m.contact, want.contact, `${at}: Contact paragraph invites talks, mentoring and communities`);
      t.eq(m.descriptions, { meta: want.description, og: want.description, twitter: want.description, jsonLd: want.description }, `${at}: meta, Open Graph, Twitter and JSON-LD descriptions carry the International Relations angle`);
      t.ok(want.description.length <= 155, `${at}: description is ≤155 characters`, `${want.description.length}`);

      const hits = JOB_SEEKING.filter((re) => re.test(m.haystack)).map(String);
      t.eq(hits, [], `${at}: no job-seeking copy in page, head metadata or JSON-LD`);
    }
    t.eq(page.errors, [], 'no uncaught page errors');
    await page.close();
  },
};

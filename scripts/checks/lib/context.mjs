/**
 * Shared fixtures for every check: the three locale routes, the locale content (straight from
 * src/i18n, so expected texts never drift from the copy) and design-token values.
 */
import { en } from '../../../src/i18n/en.ts';
import { es } from '../../../src/i18n/es.ts';
import { pt } from '../../../src/i18n/pt.ts';

export const ROUTES = [
  { path: '/', locale: 'en', lang: 'en', content: en },
  { path: '/pt/', locale: 'pt', lang: 'pt-BR', content: pt },
  { path: '/es/', locale: 'es', lang: 'es', content: es },
];

/** Computed-style values of the tokens in src/styles/tokens.css. */
export const TOKENS = {
  cobalt: 'rgb(43, 91, 255)',
  text2: 'rgb(60, 70, 84)',
  navScrolled: 'rgba(15, 20, 32, 0.86)',
  cardShadow: 'rgba(15, 20, 32, 0.08) 0px 8px 24px 0px',
  navHeight: 72,
  chipHeight: 28,
  buttonHeight: 48,
  touchTarget: 44,
};

/** Whitespace-normalized text, as compared against locale strings. */
export const normalize = (text) => (text ?? '').replace(/\s+/g, ' ').trim();

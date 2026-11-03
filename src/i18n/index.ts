import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import type { Content, Locale } from './types';

export type { Content, Locale } from './types';

export const defaultLocale: Locale = 'en';

export const locales = [
  { code: 'en', label: 'English', country: 'US' },
  { code: 'pt', label: 'Português', country: 'BR' },
  { code: 'es', label: 'Español', country: 'ES' },
] as const satisfies readonly { code: Locale; label: string; country: string }[];

/** BCP 47 tags for `<html lang>`, hreflang and JSON-LD `inLanguage`. */
export const htmlLang: Record<Locale, string> = {
  en: 'en',
  pt: 'pt-BR',
  es: 'es',
};

const content: Record<Locale, Content> = { en, pt, es };

export function getContent(locale: Locale): Content {
  return content[locale];
}

/**
 * Builds a route path for a locale. English is unprefixed; pt and es get "/pt" and "/es".
 * localePath('pt', '/') → '/pt/' · localePath('en', '/') → '/'
 */
export function localePath(locale: Locale, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return locale === defaultLocale ? normalized : `/${locale}${normalized}`;
}

/**
 * Generates docs/TRANSLATION_REVIEW.md from src/i18n/{en,pt,es}.ts and
 * validates locale invariants. Run with: npm run i18n:review
 *
 * Checks (exit code 1 on failure):
 * - bracketed placeholders ("[N]", "[...]") are identical in every locale
 * - meta.description is at most 155 characters
 */
import { writeFileSync } from 'node:fs';
import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';
import { pt } from '../src/i18n/pt.ts';

type Flat = Map<string, string>;

function flatten(value: unknown, prefix: string, out: Flat): Flat {
  if (typeof value === 'string') {
    out.set(prefix, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const id =
        item && typeof item === 'object' && 'slug' in item ? String((item as { slug: string }).slug) : String(index);
      flatten(item, `${prefix}[${id}]`, out);
    });
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\[[^\]]+\]/g) ?? []).join(' ');
const cell = (s = '') => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const flatEn = flatten(en, '', new Map());
const flatPt = flatten(pt, '', new Map());
const flatEs = flatten(es, '', new Map());

const errors: string[] = [];
const rows: string[] = [];
let unchanged = 0;

for (const [key, enValue] of flatEn) {
  const ptValue = flatPt.get(key);
  const esValue = flatEs.get(key);
  if (ptValue === undefined || esValue === undefined) {
    errors.push(`Missing key in ${ptValue === undefined ? 'pt' : 'es'}: ${key}`);
    continue;
  }
  if (placeholders(enValue) !== placeholders(ptValue) || placeholders(enValue) !== placeholders(esValue)) {
    errors.push(`Placeholder mismatch: ${key}`);
  }
  if (enValue === ptValue && enValue === esValue) {
    unchanged += 1;
    continue;
  }
  rows.push(`| \`${key}\` | ${cell(enValue)} | ${cell(ptValue)} | ${cell(esValue)} |`);
}

for (const [code, content] of Object.entries({ en, pt, es })) {
  const length = content.meta.description.length;
  if (length > 155) errors.push(`meta.description in ${code} is ${length} characters (max 155)`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const doc = `# Translation review

Generated from \`src/i18n/en.ts\`, \`pt.ts\` and \`es.ts\` by \`npm run i18n:review\`. Do not edit by hand:
change the locale files and regenerate.

- PT is Brazilian Portuguese; ES is neutral Latin American Spanish.
- Proper nouns, company and product names, stack names and technical terms (LLM, MCP, QA, CI/CD,
  prompt engineering, HITL, Rails, E2E, MLOps) stay in English.
- "[N]" and every bracketed placeholder are identical in all three locales and must be replaced in all three.
- ${unchanged} strings that are identical in all three locales (names, URLs, stack names, placeholders) are omitted.

| Key | EN | PT | ES |
| --- | --- | --- | --- |
${rows.join('\n')}
`;

writeFileSync(new URL('../docs/TRANSLATION_REVIEW.md', import.meta.url), doc);
console.log(`docs/TRANSLATION_REVIEW.md: ${rows.length} translated strings, ${unchanged} identical omitted.`);

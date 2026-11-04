# Herick Gonzaga — Portfolio

Personal portfolio of Herick Gonzaga, Software & AI Engineer. A static, trilingual (EN / PT / ES) site built with Astro and Tailwind CSS.

## Stack

- [Astro 7](https://astro.build) with static output
- [Tailwind CSS 4](https://tailwindcss.com) via `@tailwindcss/vite`, driven by design tokens in `src/styles/tokens.css`
- TypeScript (strict)
- Instrument Sans and JetBrains Mono, self-hosted through Fontsource

## Getting started

Requires Node 22+ (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

| Command                | Action                                                        |
| :--------------------- | :------------------------------------------------------------ |
| `npm run dev`          | Start the dev server                                          |
| `npm run build`        | Generate image assets, type-check with `astro check`, then build to `./dist/` |
| `npm run assets`       | Regenerate `public/og.png` and `public/favicon.ico`           |
| `npm run preview`      | Preview the production build                                  |
| `npm run i18n:review`  | Validate locales and regenerate `docs/TRANSLATION_REVIEW.md`  |
| `npm run check:ui`     | Build, serve `dist/` and run the browser UI checks            |
| `npm run check:a11y`   | Build, then run axe on `/`, `/pt/`, `/es/` at 1440 and 390px  |
| `npm run check:perf`   | Build, then run Lighthouse (desktop + mobile) on the three routes; fails below 95 |

## Project structure

```text
src/
├── components/
│   ├── Page.astro          # Full page for one locale
│   ├── Navbar.astro        # Sticky navbar, active section, mobile sheet
│   ├── LanguageSwitcher.astro
│   ├── Hero.astro          # Hero + SystemDiagram.astro
│   ├── About.astro         # Bio paragraphs + fact sheet
│   ├── Skills.astro        # Four skill cards
│   ├── Projects.astro      # Featured, secondary and small project cards
│   ├── ProjectFeatured.astro / ProjectCard.astro / ProjectCardSmall.astro
│   ├── ProjectLinks.astro  # Project links row (external links open in a new tab)
│   ├── Journey.astro / Achievements.astro
│   ├── Contact.astro       # Contact details, CTAs and the site footer
│   ├── ui/                 # Button, Card, Chip, Icon, Kicker, Section primitives
│   └── flags/              # Simplified US / BR / ES flags (inline SVG)
├── layouts/Base.astro      # <head>: SEO, hreflang, Open Graph, Twitter card, JSON-LD
├── i18n/                   # Typed content: en.ts, pt.ts, es.ts
├── pages/                  # /, /pt/, /es/ and robots.txt
└── styles/                 # Design tokens and global styles
docs/
├── DESIGN_SPEC.md          # Visual system and section spec
├── QA_REPORT.md            # Accessibility, performance, responsive and content audit
└── TRANSLATION_REVIEW.md   # Generated side-by-side translation table
public/                     # favicon.svg (source), favicon.ico and og.png (generated, committed)
scripts/
├── translation-review.ts
├── generate-assets.mjs     # og.png from assets/og.svg, favicon.ico from favicon.svg
├── checks/                 # Browser UI checks (npm run check:ui)
├── a11y.mjs                # axe audit (npm run check:a11y)
└── perf.mjs                # Lighthouse audit (npm run check:perf)
```

## Internationalization

English is the default locale at `/`; Portuguese (Brazil) and Spanish live at `/pt/` and `/es/`. On a first visit to `/`, browsers set to Portuguese or Spanish are redirected once to their locale; the choice (automatic or from the language switcher) is stored in `localStorage.lang`, and explicit `/pt/` or `/es/` URLs are never redirected. All copy lives in `src/i18n/*.ts` and is checked against a shared type, so a missing key fails the type-check.

`npm run i18n:review` also enforces two rules: bracketed placeholders such as `[N]` must match in every locale, and `meta.description` must stay within 155 characters.

## Design

The visual system ("Signal") is documented in [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md): color tokens, type scale, layout grid, components, motion and responsive breakpoints.

## SEO assets

`npm run build` first runs `scripts/generate-assets.mjs`, which renders `scripts/assets/og.svg` (with Instrument Sans and JetBrains Mono embedded, the name and title from `src/i18n/en.ts` and the host from `site`) to `public/og.png` at 1200×630, and `public/favicon.svg` to a 16/32/48px `public/favicon.ico`. It uses the same headless Chrome driver as the UI checks, so there is no npm dependency. Files are only rewritten when their bytes change; without Chrome the committed files are kept. The "HG" in `favicon.svg` is JetBrains Mono Bold converted to outlines, so it renders without the font.

`robots.txt` is generated from `src/pages/robots.txt.ts` and points to the `@astrojs/sitemap` index.

## Browser UI checks

`npm run check:ui` builds the site, serves `dist/` on a local port and runs every `scripts/checks/*.check.mjs` file in headless Chrome against `/`, `/pt/` and `/es/`. It exits non-zero if any assertion fails. Expected copy comes straight from `src/i18n/`, so the checks never drift from the locale files.

- Requires Google Chrome or Chromium. Set `CHROME_PATH` if it isn't in a standard location. There are no npm dependencies: the driver talks to Chrome over the DevTools protocol (`scripts/checks/lib/browser.mjs`).
- `node scripts/checks/run.mjs <filter>` runs only the check files whose name contains `<filter>`, against the existing `dist/`.
- Each check file default-exports `{ name, run({ browser, baseUrl, routes, t }) }` and records assertions with `t.ok`, `t.eq`, `t.near` and `t.note`.

Every section PR adds or extends a check file in `scripts/checks/` and must pass `npm run check:ui`.

## Accessibility and performance audits

Both scripts build the site, serve `dist/` locally and use the same Chrome as the UI checks (`CHROME_PATH` applies). Their output goes to `reports/`, which is gitignored. The latest results are in [`docs/QA_REPORT.md`](docs/QA_REPORT.md).

- `npm run check:a11y` runs axe-core on each route at 1440px (as loaded, and with the language switcher open) and at 390px (as loaded, with the menu sheet open, and with the sheet's switcher open). It exits non-zero on any violation and writes `reports/axe/results.json`. The axe engine is the one bundled with `@axe-core/cli`. The CLI itself isn't used because its headless Chrome ignores `--window-size`, so it can't audit a 390px viewport.
- `npm run check:perf` runs Lighthouse with the desktop preset and the default mobile preset on `/`, `/pt/` and `/es/`. It exits non-zero if Performance, Accessibility, Best Practices or SEO scores below 95, and writes one JSON report per route and preset to `reports/lighthouse/`. Chrome is pinned to `en-US` so the locale redirect doesn't send the `/` audit to `/pt/` or `/es/`. Mobile scores can vary by a point or two between runs on a busy machine.

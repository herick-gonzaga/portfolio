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
| `npm run build`        | Type-check with `astro check`, then build to `./dist/`        |
| `npm run preview`      | Preview the production build                                  |
| `npm run i18n:review`  | Validate locales and regenerate `docs/TRANSLATION_REVIEW.md`  |
| `npm run check:ui`     | Build, serve `dist/` and run the browser UI checks            |

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
│   ├── ui/                 # Button, Card, Chip, Icon, Kicker, Section primitives
│   └── flags/              # Simplified US / BR / ES flags (inline SVG)
├── layouts/Base.astro      # <head>: SEO, hreflang alternates, JSON-LD
├── i18n/                   # Typed content: en.ts, pt.ts, es.ts
├── pages/                  # /, /pt/, /es/
└── styles/                 # Design tokens and global styles
docs/
├── DESIGN_SPEC.md          # Visual system and section spec
└── TRANSLATION_REVIEW.md   # Generated side-by-side translation table
scripts/
├── translation-review.ts
└── checks/                 # Browser UI checks (npm run check:ui)
```

## Internationalization

English is the default locale at `/`; Portuguese (Brazil) and Spanish live at `/pt/` and `/es/`. On a first visit to `/`, browsers set to Portuguese or Spanish are redirected once to their locale; the choice (automatic or from the language switcher) is stored in `localStorage.lang`, and explicit `/pt/` or `/es/` URLs are never redirected. All copy lives in `src/i18n/*.ts` and is checked against a shared type, so a missing key fails the type-check.

`npm run i18n:review` also enforces two rules: bracketed placeholders such as `[N]` must match in every locale, and `meta.description` must stay within 155 characters.

## Design

The visual system ("Signal") is documented in [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md): color tokens, type scale, layout grid, components, motion and responsive breakpoints.

## Browser UI checks

`npm run check:ui` builds the site, serves `dist/` on a local port and runs every `scripts/checks/*.check.mjs` file in headless Chrome against `/`, `/pt/` and `/es/`. It exits non-zero if any assertion fails. Expected copy comes straight from `src/i18n/`, so the checks never drift from the locale files.

- Requires Google Chrome or Chromium. Set `CHROME_PATH` if it isn't in a standard location. There are no npm dependencies: the driver talks to Chrome over the DevTools protocol (`scripts/checks/lib/browser.mjs`).
- `node scripts/checks/run.mjs <filter>` runs only the check files whose name contains `<filter>`, against the existing `dist/`.
- Each check file default-exports `{ name, run({ browser, baseUrl, routes, t }) }` and records assertions with `t.ok`, `t.eq`, `t.near` and `t.note`.

Every section PR adds or extends a check file in `scripts/checks/` and must pass `npm run check:ui`.

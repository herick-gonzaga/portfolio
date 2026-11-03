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

## Project structure

```text
src/
├── components/
│   ├── Page.astro          # Full page for one locale
│   ├── Navbar.astro        # Sticky navbar, active section, mobile sheet
│   ├── LanguageSwitcher.astro
│   ├── Hero.astro          # Hero + SystemDiagram.astro
│   ├── ui/                 # Button, Chip, Kicker, Icon primitives
│   └── flags/              # Simplified US / BR / ES flags (inline SVG)
├── layouts/Base.astro      # <head>: SEO, hreflang alternates, JSON-LD
├── i18n/                   # Typed content: en.ts, pt.ts, es.ts
├── pages/                  # /, /pt/, /es/
└── styles/                 # Design tokens and global styles
docs/
├── DESIGN_SPEC.md          # Visual system and section spec
└── TRANSLATION_REVIEW.md   # Generated side-by-side translation table
scripts/translation-review.ts
```

## Internationalization

English is the default locale at `/`; Portuguese (Brazil) and Spanish live at `/pt/` and `/es/`. On a first visit to `/`, browsers set to Portuguese or Spanish are redirected once to their locale; the choice (automatic or from the language switcher) is stored in `localStorage.lang`, and explicit `/pt/` or `/es/` URLs are never redirected. All copy lives in `src/i18n/*.ts` and is checked against a shared type, so a missing key fails the type-check.

`npm run i18n:review` also enforces two rules: bracketed placeholders such as `[N]` must match in every locale, and `meta.description` must stay within 155 characters.

## Design

The visual system ("Signal") is documented in [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md): color tokens, type scale, layout grid, components, motion and responsive breakpoints.

# QA report

Audit of the full site (all seven sections) against [`DESIGN_SPEC.md`](DESIGN_SPEC.md), run on 2026-11-03 on branch `qa/audit`. Scope: deviations were fixed and nothing was redesigned.

All results come from the scripts below, run against the built `dist/` served locally in headless Chrome 156:

| Command              | What it runs                                                                 |
| :------------------- | :--------------------------------------------------------------------------- |
| `npm run check:ui`   | All browser UI checks, including the new `scripts/checks/qa-audit.check.mjs` |
| `npm run check:a11y` | axe-core 4.14.0 on `/`, `/pt/`, `/es/` at 1440 and 390px                     |
| `npm run check:perf` | Lighthouse 13.6.0, desktop and mobile presets, on the three routes           |

## Summary

| Area            | Before                                                                                                                                                                      | After                                     |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| axe             | 12 violations (1 rule)                                                                                                                                                      | 0 violations                              |
| Manual a11y     | Two failures: diagram caption contrast 3.08:1, and switcher touch targets 40px in the mobile sheet. Focus ring faded in from the text colour for 160ms. | All pass                                  |
| Lighthouse      | 100 on 5 of 6 runs. `/pt/` mobile scored 67 on a noisy run, and the "/" desktop run had actually audited `/pt/` (see below).                                                  | 99–100 in every category on all 6 runs    |
| Responsive      | No failures                                                                                                                                                                 | No failures                               |
| Reduced motion  | No failures                                                                                                                                                                 | No failures; now asserted for every element |
| UI checks       | 3926 assertions in 6 files                                                                                                                                                  | 4145 assertions in 7 files, all passing   |

## 1. Accessibility

### axe

`check:a11y` audits five page states per route. At 1440px it audits the page as loaded and with the language switcher open. At 390px it audits the page as loaded, with the mobile sheet open, and with the sheet and its switcher both open. That makes 15 states in total. Content hidden on load (the switcher list and the sheet) is therefore audited too.

| Route  | Width | Before                                  | After |
| :----- | :---- | :-------------------------------------- | :---- |
| `/`    | 1440  | 1 (`label-content-name-mismatch`) in each of 2 states | 0     |
| `/`    | 390   | 0 as loaded; 1 in each of the 2 sheet states | 0     |
| `/pt/` | 1440  | 1 in each of 2 states                   | 0     |
| `/pt/` | 390   | 0 as loaded; 1 in each of the 2 sheet states | 0     |
| `/es/` | 1440  | 1 in each of 2 states                   | 0     |
| `/es/` | 390   | 0 as loaded; 1 in each of the 2 sheet states | 0     |

The one rule that failed was `label-content-name-mismatch` (serious, WCAG 2.5.3). The switcher trigger displayed "EN" but was named "Language".

**Note on `@axe-core/cli`.** The CLI's headless Chrome ignores `--window-size`: it reports a 756×413 window whatever is passed. At that width the desktop switcher is hidden and the sheet is closed, so a plain `npx axe` run reports 0 violations and misses this bug. `check:a11y` therefore injects the axe-core engine bundled with `@axe-core/cli` through the repo's DevTools driver, which sets exact viewports. The rules and version are the same as the CLI's.

### Manual checks

All of these are now assertions in `qa-audit.check.mjs`, run on every route.

| Check | Result |
| :---- | :----- |
| Text contrast ≥4.5:1 (≥3:1 for large text), measured on every visible text element against its effective background, SVG text included, at 1440 and 390 with the sheet and switcher open | **Fixed.** The diagram caption "fig. 01 — …" was 11px mono in `muted` on ink, 3.08:1. It now uses `muted-dark`, which gives 8.33:1. Lowest remaining ratios: cobalt kicker 13px on mist, 4.76:1; cobalt 12–13px mono on surface, 5.19:1; muted 13px mono on mist, 5.48:1; cobalt-soft 12–13px mono on ink, 6.7:1. |
| Icon-only controls have an `aria-label` | Pass. The menu and close buttons are labelled, and every visible link and button has an accessible name. |
| Decorative SVGs are `aria-hidden` | Pass. 27 of the 28 SVGs are `aria-hidden="true"`. |
| SystemDiagram has `role="img"` and a label | Pass. It is the only SVG exposed to assistive tech. |
| 2px cobalt focus ring at 2px offset on every interactive element | **Fixed.** The final ring was correct, but Tailwind's `transition-colors` also animates `outline-color`. On every focus the ring faded from the element's text colour (white or muted-dark) to cobalt over 160ms. `outline-color` is now cobalt at rest. The check samples the ring on the first frame of each Tab stop, including switcher options and sheet controls. |
| Keyboard path: navbar → switcher → menu → sections → footer, no trap | Pass. **Desktop:** Tab visits every control once, in document order. Enter and the arrow keys work the switcher, and Esc returns focus to its trigger. After "Back to top" in the footer, focus leaves the page. **Mobile:** the second Tab stop is the menu button. Enter opens the sheet, Tab cycles inside it (a modal dialog), Esc closes the switcher and then the sheet, focus returns to the menu button, and Tab continues to the footer and out. |

The switcher also used `aria-haspopup="listbox"`, but its popup is a list of links, not a listbox. The attribute was removed; the trigger is now a plain disclosure (`aria-expanded` + `aria-controls`).

## 2. Motion

With `prefers-reduced-motion: reduce` emulated, on every route:

- No element has a non-zero `transition-duration` + `transition-delay`, or a running animation. The open switcher passes too.
- The hero status, H1 and CTAs, the diagram's edges, dashes, hub and nodes, and every timeline item render at opacity 1 with no transform and a stroke-dashoffset of 0, straight after load.
- The navbar switches to its scrolled background within two frames of scrolling, with no fade.
- Card hover shows no lift and no shadow.

Each component already gated its animation behind `prefers-reduced-motion: no-preference`, so no fix was needed. The hero sequence, card hover and timeline reveal were already asserted. The navbar fade, the switcher, the global "no element moves" assertion and the diagram's final state are new in `qa-audit.check.mjs`.

## 3. Performance

Lighthouse 13.6.0, scores out of 100. Reports are in `reports/lighthouse/<route>-<preset>.json` (gitignored).

**After:**

| Route  | Preset  | Performance | Accessibility | Best Practices | SEO | FCP   | LCP   | TBT  | CLS |
| :----- | :------ | :---------- | :------------ | :------------- | :-- | :---- | :---- | :--- | :-- |
| `/`    | desktop | 100         | 100           | 100            | 100 | 0.3 s | 0.4 s | 0 ms | 0   |
| `/`    | mobile  | 100         | 100           | 100            | 100 | 1.2 s | 1.2 s | 0 ms | 0   |
| `/pt/` | desktop | 100         | 100           | 100            | 100 | 0.3 s | 0.3 s | 0 ms | 0   |
| `/pt/` | mobile  | 100         | 100           | 100            | 100 | 1.2 s | 1.2 s | 0 ms | 0   |
| `/es/` | desktop | 100         | 100           | 100            | 100 | 0.3 s | 0.4 s | 0 ms | 0   |
| `/es/` | mobile  | 99          | 100           | 100            | 100 | 1.2 s | 1.8 s | 0 ms | 0   |

**Before:**

| Route  | Preset  | Perf | A11y | BP  | SEO | Note |
| :----- | :------ | :--- | :--- | :-- | :-- | :--- |
| `/`    | desktop | 100  | 100  | 100 | 100 | Actually audited `/pt/`: Lighthouse's Chrome inherited the machine's Portuguese locale, so the redirect script fired. `check:perf` now pins Chrome to `en-US`. |
| `/`    | mobile  | 100  | 100  | 100 | 100 | |
| `/pt/` | desktop | 100  | 100  | 100 | 100 | |
| `/pt/` | mobile  | 67   | 100  | 100 | 100 | TBT 1,030 ms and 6.6 s of main-thread work on a page that scores 100 in the other locales. This was CPU contention on that run; every later run scored 99–100. |
| `/es/` | desktop | 100  | 100  | 100 | 100 | |
| `/es/` | mobile  | 100  | 100  | 100 | 100 | |

Scores vary by ±1 point between runs on mobile; LCP on `/es/` mobile ranged from 1.2 to 1.8 s.

| Requirement | Status |
| :---------- | :----- |
| Fonts self-hosted via Fontsource with `font-display: swap` | Already in place: `@fontsource-variable/*`, and all 8 `@font-face` rules use `swap`. |
| Preload the two variable font files | **Added.** The latin `wght` files for Instrument Sans and JetBrains Mono are preloaded in `Base.astro`. Before, the fonts were found only after the CSS had downloaded (HTML → CSS → woff2). The preload URLs are the same hashed files the CSS references, so nothing downloads twice; this is asserted. |
| No CLS from fonts, the hero SVG or og/favicon | CLS is 0 on all six runs. og.png and the favicons aren't rendered in the page. |
| No render-blocking CSS beyond the critical bundle | One stylesheet, `Page.*.css` at 33 KB (asserted). |
| Inline redirect script stays small | 651 bytes, `/` only. Inline head scripts are asserted to stay under 1 KB. |
| Images and SVGs have explicit dimensions | All 28 SVGs have `width` and `height` (asserted). The page has no `<img>`. |

**Remaining Lighthouse insights.** These are unscored, and none blocks the target:

- **`cache-insight` and `document-latency-insight`:** the local test server sends no cache or compression headers. GitHub Pages sets both.
- **`unused-css-rules` (10 KB):** Fontsource's `@font-face` rules for non-latin subsets, which are never downloaded.
- **`forced-reflow-insight`:** the navbar script reads `offsetHeight` and `scrollY` once at startup, which forces the first layout early. It runs once, not repeatedly, and costs no score, so it was left alone.

## 4. Responsive sweep

Every width was checked on `/`, `/pt/` and `/es/`:

- no horizontal scroll (document `scrollWidth` = `clientWidth`);
- no clipped text (no element with overflow `hidden`, `clip`, `auto` or `scroll` whose text is wider than its box);
- below 900px, every visible link and button is at least 44×44px, with the mobile sheet and its switcher open as well.

All three pass at every width.

H1 line count per width:

| Width | `/` | `/pt/` | `/es/` | Limit |
| :---- | :-- | :----- | :----- | :---- |
| 1440  | 3   | 3      | 3      | ≤3    |
| 1392  | 3   | 3      | 3      |       |
| 1200  | 4   | 4      | 4      |       |
| 900   | 4   | 5      | 5      |       |
| 600   | 3   | 3      | 3      |       |
| 390   | 4   | 4      | 5      | ≤5    |
| 360   | 4   | 5      | 5      |       |

**Fixed:** the mobile sheet's language switcher trigger and options were 40px tall. Below 900px they are now 44px; the desktop switcher keeps its 40px spec.

## 5. Content integrity

### Placeholders

Each placeholder is identical in `src/i18n/en.ts`, `pt.ts` and `es.ts`. None appears outside `src/i18n/`.

| Key | Value | Renders as |
| :-- | :---- | :--------- |
| `projects[0].metrics[0].value` | `[N]` | MQ-Test: "test cases organized" |
| `projects[0].metrics[1].value` | `[N]` | MQ-Test: "runs tracked via MCP" |
| `projects[0].metrics[2].value` | `[N]` | MQ-Test: "integrations" |
| `achievements.metrics[0].value` | `[N]` | "vendor prompt systems" |
| `achievements.metrics[1].value` | `[N]` | "automated tests shipped" |
| `achievements.metrics[2].value` | `[N]%` | "extraction accuracy gain" |
| `achievements.metrics[2].note` | `[Replace with a measured before/after from a vendor prompt revision.]` | The visible note under that metric. It is an editorial instruction, shown on the live page in all three locales. |

Two more links are placeholders: they have no destination and point back at the Projects section.

| Key | Label (en / pt / es) | `href` |
| :-- | :------------------- | :----- |
| `projects[0].links[1]` | Case study / Estudo de caso / Caso de estudio | `#projects` |
| `projects[1].links[0]` | Read the write-up / Ler o artigo / Leer el artículo | `#projects` |

### External links

HTTP status from `curl -I` (HEAD) on 2026-11-03, with and without following redirects. The list includes every URL in the built pages: links, canonical/hreflang, Open Graph, JSON-LD and robots.txt.

| URL | Used for | HEAD status |
| :-- | :------- | :---------- |
| `https://github.com/herick-gonzaga` | Contact, project links, JSON-LD `sameAs` | 200 |
| `https://linkedin.com/in/herick-gonzaga` | Contact, JSON-LD `sameAs` | 200 |
| `https://github.com/herick-gonzaga/MQ-Test` | MQ-Test "Repository" link | **404**. The repository is private or doesn't exist. |
| `https://herick-gonzaga.github.io/` | Canonical, hreflang en and x-default, og:url | **404**. Site not deployed yet. |
| `https://herick-gonzaga.github.io/pt/` | Canonical and hreflang pt-BR | **404**. Site not deployed yet. |
| `https://herick-gonzaga.github.io/es/` | Canonical and hreflang es | **404**. Site not deployed yet. |
| `https://herick-gonzaga.github.io/og.png` | og:image, twitter:image | **404**. Site not deployed yet. |
| `https://herick-gonzaga.github.io/sitemap-index.xml` | robots.txt `Sitemap:` | **404**. Site not deployed yet. |
| `mailto:andreyherick8@gmail.com` | Contact | Not an HTTP link |

The `github.io` URLs will resolve once GitHub Pages serves the site. The MQ-Test link needs the repository to be made public, or the link removed.

## Fixes made

| Commit | Change |
| :----- | :----- |
| `fix(a11y)` | Language switcher: accessible name now contains the visible code ("Language EN"); `aria-haspopup="listbox"` dropped; 44px trigger and options below 900px. |
| `fix(a11y)` | Diagram caption uses `muted-dark` on ink (3.08:1 → 8.33:1). |
| `fix(a11y)` | `outline-color` is cobalt at rest, so the focus ring no longer fades in from the text colour. |
| `perf(fonts)` | Preloads for the two latin variable font files. |
| `test(checks)` | The browser driver's Enter now activates focused buttons, as a real key does. |
| `test(checks)` | New `qa-audit.check.mjs` (219 assertions): responsive sweep, contrast, names and SVGs, keyboard path and focus ring, reduced motion, performance hygiene. |
| `test(a11y)`, `test(perf)`, `build(qa)` | `check:a11y` and `check:perf` scripts; `@axe-core/cli`, `lighthouse` and `chrome-launcher` dev dependencies; `reports/` gitignored. |

The new check fails 39 of its assertions on the code before these fixes, covering contrast, focus ring and touch targets, and passes on the code after them.

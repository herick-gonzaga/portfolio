# Portfolio design spec — "Signal"

Concept: one engineer, four connected disciplines (Software, AI, Quality, Global). Infrastructure-product aesthetic (Linear/Vercel/Stripe Docs): clean surfaces, visible grid, large tight typography, one electric accent. Dark "bookends": Hero and Contact on ink; everything between on mist.

## Stack
Astro 7, Tailwind CSS 4, TypeScript (strict). Static output. Node 22+.

## Color tokens
ink #0F1420 (hero/contact bg, featured card) · ink-line #1E2635 · ink-surface #141A28 · ink-border #2A3242
mist #F4F5F7 (page bg) · surface #FFFFFF · line #DCE0E6
text #141922 · text-2 #3C4654 · muted #5B6472 · muted-dark #A6AFBF (on ink)
cobalt #2B5BFF (single accent: CTAs, kickers, timeline dots) · cobalt-hover #1E45D6 · cobalt-soft #7B96FF (accent on ink)
signal #3DDC84 (only the hero status dot)

## Typography
Instrument Sans (display + body, 400–700). JetBrains Mono (dates, chips, metrics, email).
H1 72px/1.02, tracking -0.035em, max 14ch · H2 40px/1.1, -0.02em · H3 20–32px/600 · body 15–19px/1.55 · mono 12–13px.
Section kicker: mono 13px cobalt, format "NN / Section name".
Mobile: H1 44px, H2 32px.

## Layout
8px base. Container max 1248px, side padding 96px (48px ≤1199, 24px ≤899). 12-col grid, 24px gutter. Section padding 112px vertical (72px mobile).
Radii: buttons/chips 6–8px, cards 12px. One shadow only, on card hover: 0 8px 24px rgba(15,20,32,.08).
Type scale and section padding switch from mobile to desktop values at 900px.
Section header (kicker, H2, intro) max-width 46rem.

## Components
Button primary (cobalt bg, white text, 48px, radius 8) · Button ghost (1px border line, dark variant uses ink-border) · Chip (mono 12px, 28px tall, 1px border) · Card (surface + line border, radius 12, padding 32) · Metric (number 44px/600 cobalt + bold label + 1-line muted) · Timeline item (filled cobalt dot = current, hollow = past) · Kicker.

## Sections (in order)
00 Navbar sticky · 01 Hero · 02 About · 03 Skills · 04 Featured Projects · 05 Journey · 06 Achievements & Impact · 07 Contact + footer.

## Motion
One orchestrated hero entrance, once after fonts load (H1 lines rise from clipping masks, staggered → intro + status → CTAs/chips, ~1.4s; src/scripts/hero.ts), then a typewriter cycling `profile.roles` after the status line with a blinking JetBrains Mono block cursor. Behind the fig. 01 diagram, a canvas constellation (~80 cobalt particles, linked under 74px, gravitating to the four nodes and the hub and flowing along the spokes; cursor repels within 120px, ≤7px parallax; paused offscreen/hidden tab; src/scripts/constellation.ts) replaces the SVG edges. Reduced motion / no JS: the static diagram and copy, first role, steady cursor. Navbar turns from transparent to rgba(ink,.86)+blur after 40px scroll; active anchor via IntersectionObserver. Hover: cards translate -2px + shadow, 160ms ease-out. Skill, project and impact cards add a spotlight: a soft cobalt radial glow (cobalt-soft on ink) under the content and a 1px border light, both centred on the cursor (src/scripts/interactions.ts). Project cards also tilt up to 6deg toward the cursor and spring back on leave (fine pointers only). The featured MQ-Test metrics count up from 0 once when scrolled into view, in the locale's number format. The primary CTAs (View projects, Get in touch, Email me) drift up to 8px toward a cursor within 80px and spring back. Inline text links draw a 1px underline left-to-right on hover. Tilt, magnetic pull and count-up are off on touch and under reduced motion. Timeline items fade in once at 0.3 threshold. Everything respects prefers-reduced-motion (final state, no transitions). Focus ring: 2px cobalt, 2px offset, on every interactive element.

## Responsive breakpoints
Skills grid: 2×2 ≥900, 1 column <900; chip labels never wrap · ≥1200 full layout · 900–1199 margins 48, featured project stacks above the two small cards · 600–899 single column, H1 44, hamburger menu (full-screen sheet with 6 anchors), hero diagram 320px below text · <600 margins 24, chips wrap, metrics 1 col, CTAs full width. Mobile-first CSS. Touch targets ≥44px.

## Rules
No lorem ipsum, no invented numbers: unknown metrics stay as "[N]" placeholders. No gradient washes, glassmorphism, particles or per-section scroll animations. Inline SVG icons (stroke 1.8), never emoji. Semantic HTML, real <a>/<button>, aria-labels on icon-only buttons. Lighthouse target: 95+ on all four categories.

## i18n conventions (apply to every component)
- Every section component receives `locale` ("en" | "pt" | "es") as a prop and reads `const content = getContent(locale)`. No user-facing text is ever hardcoded in a component.
- Section headers come from `content.sections.<name>`; button labels, nav items, aria-labels and link texts from `content.ui.*`; hero diagram texts from `content.diagram`.
- Any new text needed by a component is first added to the Content interface, then to en.ts, pt.ts and es.ts, then to docs/TRANSLATION_REVIEW.md.
- "[N]" and bracketed placeholders are identical in all three locale files.
- Internal anchors stay unprefixed ("#projects"); route links use `localePath(locale, path)`.
- Base.astro: `<html lang>` from the locale; per-locale <title> and meta description from `content.meta`; hreflang alternates for en, pt, es and x-default; JSON-LD Person includes `inLanguage`.
- Sitemap: @astrojs/sitemap with `i18n: { defaultLocale: "en", locales: { en: "en", pt: "pt-BR", es: "es" } }`.
- QA runs axe and Lighthouse on all three routes and checks the translated H1 wraps to at most 3 lines at 1440px and 5 at 390px, with no chip, button or nav item overflowing in PT or ES.
- README documents src/i18n/ as the only place to edit copy and that "[N]" must be replaced in all three locale files.

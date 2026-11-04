# Post-deploy QA report

Live checks of the production site, run on 2026-11-03.

| | |
| :-- | :-- |
| Live URL | https://herick-gonzaga.pages.dev (Cloudflare Pages) |
| Deploy commit | `4b9de6d` on `main` ("chore: trigger pages deploy (2)", includes PR #14) |
| Build match | The live HTML of `/`, `/pt/` and `/es/` is byte-identical to a local `npm run build` of that commit, and the live `/og.png` has the same SHA-1 as `public/og.png` (`2f1effc…`). |
| Tools | curl; Lighthouse 13.6.0 and axe-core 4.14.0 in headless Chrome 156, run with `AUDIT_URL=https://herick-gonzaga.pages.dev` |

The pre-deploy audit against the local `dist/` (accessibility fixes, motion, responsive sweep, content integrity) is in git history at `f2e73c8`.

## Summary

| Check | Result |
| :---- | :----- |
| HTTP status of the three routes, sitemap, robots.txt, og.png | 200 on all six |
| Security headers from `public/_headers` | Present on every response |
| `/_astro/*` caching | `public, max-age=31536000, immutable` on all 7 hashed assets |
| Canonical, hreflang, og:url, og:image | All on `https://herick-gonzaga.pages.dev`, on all three routes |
| Lighthouse, desktop and mobile | 100 in every category on all 6 runs |
| axe | 0 violations in 15 page states |
| GitHub Pages references | None left in the repo (a `git grep` for the old Pages domain returns nothing) |
| `astro check` | 0 errors, 0 warnings, 0 hints |

## 1. Status and headers

`curl -I` on each URL:

| URL | Status | Content-Type |
| :-- | :----- | :----------- |
| `/` | 200 | `text/html; charset=utf-8` |
| `/pt/` | 200 | `text/html; charset=utf-8` |
| `/es/` | 200 | `text/html; charset=utf-8` |
| `/sitemap-index.xml` | 200 | `application/xml` |
| `/robots.txt` | 200 | `text/plain; charset=utf-8` |
| `/og.png` | 200 | `image/png` |

All six responses carry these headers, with the same values as `public/_headers`:

| Header | Live value |
| :----- | :--------- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'sha256-DOAbO5EA…' 'sha256-Y9XeUTwz…'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

The CSP blocks nothing on the live pages. Lighthouse's Best Practices score includes "no browser errors logged to the console", and it scored 100 on every run.

Cache headers:

| Path | `Cache-Control` |
| :--- | :-------------- |
| HTML, sitemap, robots.txt, og.png | `public, max-age=0, must-revalidate` (Cloudflare default) |
| `/_astro/*` (2 woff2 fonts, `Page.*.css`, 4 component scripts) | `public, max-age=31536000, immutable` |

Responses are served with Brotli compression (`content-encoding: br`), and `http://` redirects to `https://` with a 301.

## 2. SEO and social meta

Fetched from the live HTML of each route:

| Tag | `/` | `/pt/` | `/es/` |
| :-- | :-- | :----- | :----- |
| `canonical` | `…pages.dev/` | `…pages.dev/pt/` | `…pages.dev/es/` |
| `hreflang="en"` | `…pages.dev/` | `…pages.dev/` | `…pages.dev/` |
| `hreflang="pt-BR"` | `…pages.dev/pt/` | `…pages.dev/pt/` | `…pages.dev/pt/` |
| `hreflang="es"` | `…pages.dev/es/` | `…pages.dev/es/` | `…pages.dev/es/` |
| `hreflang="x-default"` | `…pages.dev/` | `…pages.dev/` | `…pages.dev/` |
| `og:url` | `…pages.dev/` | `…pages.dev/pt/` | `…pages.dev/es/` |
| `og:image` / `twitter:image` | `…pages.dev/og.png` | same | same |
| `og:locale` | `en_US` | `pt_BR` | `es_LA` |

`…pages.dev` stands for `https://herick-gonzaga.pages.dev`.

The robots.txt `Sitemap:` line, the sitemap index, and every `<loc>` and `xhtml:link` in `sitemap-0.xml` also use `https://herick-gonzaga.pages.dev`. So does the JSON-LD `url`.

**Open Graph image.** I checked the meta tags only. I didn't use a card validator and didn't post anywhere. Every route has `og:image` with `og:image:type` `image/png`, `og:image:width` 1200, `og:image:height` 630 and a localized `og:image:alt`. Every route also has `twitter:card` `summary_large_image` and localized `og:title`/`og:description` with matching `twitter:*` tags. The image URL returns 200 `image/png`.

## 3. Lighthouse

Lighthouse 13.6.0 against the live URLs with `AUDIT_URL=https://herick-gonzaga.pages.dev node scripts/perf.mjs`. The target is ≥95 in every category.

| Route | Preset | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | SI |
| :---- | :----- | :---------- | :------------ | :------------- | :-- | :-- | :-- | :-- | :-- | :-- |
| `/` | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.5 s |
| `/` | mobile | 100 | 100 | 100 | 100 | 0.9 s | 0.9 s | 0 ms | 0 | 0.9 s |
| `/pt/` | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.4 s |
| `/pt/` | mobile | 100 | 100 | 100 | 100 | 0.9 s | 0.9 s | 0 ms | 0 | 0.9 s |
| `/es/` | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.3 s | 0 ms | 0 | 0.4 s |
| `/es/` | mobile | 100 | 100 | 100 | 100 | 1.0 s | 1.0 s | 30 ms | 0 | 1.0 s |

Mobile LCP is 0.9–1.0 s live, down from 1.2–1.8 s against the local server. The local server sent no compression or cache headers; Cloudflare sends both.

Some unscored insights remain below 0.9. None of them affects the score:

- **`render-blocking-insight`** (estimated savings 80–120 ms on mobile): the single `Page.*.css` stylesheet.
- **`network-dependency-tree-insight`**: the chain from HTML to CSS to fonts. The two latin fonts are already preloaded.
- **`forced-reflow-insight`**: the navbar script reads layout once at startup. This is unchanged from the pre-deploy audit.

## 4. Accessibility (axe)

axe-core 4.14.0 against the live URLs with `AUDIT_URL=https://herick-gonzaga.pages.dev node scripts/a11y.mjs`:

| Route | 1440px loaded | 1440px switcher open | 390px loaded | 390px menu open | 390px menu + switcher open |
| :---- | :------------ | :------------------- | :----------- | :-------------- | :------------------------- |
| `/` | 0 | 0 | 0 | 0 | 0 |
| `/pt/` | 0 | 0 | 0 | 0 | 0 |
| `/es/` | 0 | 0 | 0 | 0 | 0 |

That is 0 violations across 15 states. Depending on the state, 39 to 42 rules passed.

## 5. Changes in this PR

| Commit | Change |
| :----- | :----- |
| `fix(checks)` | Removed the unused `baseOrigin` parameter from `checkHead` in `scripts/checks/navbar-hero.check.mjs`. `astro check` now reports 0 hints (it was reporting ts(6133)). |
| `feat(audits)` | `scripts/perf.mjs` and `scripts/a11y.mjs` audit a deployed site when `AUDIT_URL` is set, instead of serving `dist/`. This is documented in the README. |
| `docs(qa)` | This report, which replaces the pre-deploy audit. It also removes the last references to the old GitHub Pages URLs. |

## 6. Known items

1. **No 404 page, and unknown paths are cached as immutable assets.** The site has no `404.html`, so Cloudflare Pages treats it as a single-page app and serves the home page with status 200 for any unknown path. For example, `/nope-xyz` returns 200. Under `/_astro/*`, that fallback also gets the one-year `immutable` cache header: `/_astro/does-not-exist.js` returns the home HTML with `max-age=31536000, immutable`. After a redeploy, a browser that still has the old HTML could request an old asset hash, then cache home-page HTML under that asset URL for a year. Adding `src/pages/404.astro` turns off the fallback, so unknown paths return a 404 status instead of the home page. Re-test `/_astro/does-not-exist.js` after that change to confirm the result.
2. **MQ-Test repository link returns 404.** `https://github.com/herick-gonzaga/MQ-Test` is still private or doesn't exist. Make the repository public or remove the link.
3. **Two project links are placeholders.** These point back to `#projects`:
   - MQ-Test "Case study" (`projects[0].links[1]`)
   - "Read the write-up" (`projects[1].links[0]`)
4. **No `Strict-Transport-Security` header.** HTTP already redirects to HTTPS with a 301. Adding HSTS to `_headers` is optional.
5. **Instagram link not verified.** `https://www.instagram.com/herick.andrey/` wasn't status-checked in this run. GitHub and LinkedIn both returned 200.
6. **CSP hashes are tied to inline scripts.** Editing the locale redirect script in `Base.astro` or the hero-ready script in `Hero.astro` changes its hash. `cloudflare.check.mjs` catches this and prints the new value to paste into `public/_headers`.

/**
 * Tailwind theme mapped onto the design tokens in src/styles/tokens.css.
 * Tailwind v4 loads this file through the `@config` directive in src/styles/global.css.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./src/**/*.{astro,html,js,ts,md,mdx}'],
  theme: {
    // Spec breakpoints (mobile-first).
    screens: {
      sm: '600px',
      md: '900px',
      lg: '1200px',
    },
    // Note: Tailwind v4 ignores `theme.container` options (center/padding).
    // The `container` utility is defined with `@utility` in src/styles/global.css
    // and reads --container-max / --page-padding-x from tokens.css.
    extend: {
      colors: {
        ink: {
          DEFAULT: 'var(--color-ink)',
          line: 'var(--color-ink-line)',
          surface: 'var(--color-ink-surface)',
          border: 'var(--color-ink-border)',
        },
        mist: 'var(--color-mist)',
        surface: 'var(--color-surface)',
        line: 'var(--color-line)',
        text: {
          DEFAULT: 'var(--color-text)',
          2: 'var(--color-text-2)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          dark: 'var(--color-muted-dark)',
        },
        cobalt: {
          DEFAULT: 'var(--color-cobalt)',
          hover: 'var(--color-cobalt-hover)',
          soft: 'var(--color-cobalt-soft)',
        },
        signal: 'var(--color-signal)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        h1: ['var(--text-h1)', { lineHeight: 'var(--leading-h1)', letterSpacing: 'var(--tracking-h1)' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--leading-h2)', letterSpacing: 'var(--tracking-h2)' }],
        'h3-sm': ['var(--text-h3-sm)', { lineHeight: '1.25', fontWeight: '600' }],
        'h3-lg': ['var(--text-h3-lg)', { lineHeight: '1.15', fontWeight: '600' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: 'var(--leading-body)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-body)' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: 'var(--leading-body)' }],
        'mono-sm': ['var(--text-mono-sm)', { lineHeight: '1.4' }],
        mono: ['var(--text-mono)', { lineHeight: '1.4' }],
        metric: ['var(--text-metric)', { lineHeight: '1', fontWeight: '600' }],
      },
      maxWidth: {
        container: 'var(--container-max)',
        h1: 'var(--measure-h1)',
      },
      spacing: {
        'page-x': 'var(--page-padding-x)',
        section: 'var(--section-padding-y)',
        gutter: 'var(--grid-gutter)',
        card: 'var(--card-padding)',
        button: 'var(--button-height)',
        chip: 'var(--chip-height)',
        touch: 'var(--touch-target)',
      },
      borderRadius: {
        chip: 'var(--radius-chip)',
        button: 'var(--radius-button)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card-hover)',
      },
      transitionDuration: {
        hover: 'var(--duration-hover)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
};

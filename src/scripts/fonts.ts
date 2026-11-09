/**
 * Font gate for entrance animations. Measuring or splitting text before the web fonts swap in
 * would animate the fallback-font layout and then jump (a flash of unstyled text mid-animation),
 * so every entrance waits on this. Capped at FONT_WAIT_MS: a slow font never holds the page.
 *
 * When the fonts are in, <html data-fonts="ready"> is set (checks wait on it).
 */
export const FONT_WAIT_MS = 1000;

let gate: Promise<void> | undefined;

export function fontsReady(): Promise<void> {
  gate ??= Promise.race([
    'fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve(),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]).then(() => {
    document.documentElement.dataset.fonts = 'ready';
  });
  return gate;
}

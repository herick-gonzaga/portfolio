/**
 * Link-target checks shared by the contact-seo and projects checks:
 * - no link inside the section points at "#projects" (the old placeholder for a missing page);
 * - no link returns 404 (or 410). External http(s) URLs are requested over the network, same-site
 *   paths ("/…") from the local server. mailto:, tel: and other in-page anchors are skipped.
 *
 * Each URL is requested once per run, so the three locales share one request per link. HEAD is
 * tried first, then GET when HEAD isn't answered with a 2xx. Any status other than 404/410, and
 * network errors, are printed as notes but don't fail the run, so a rate limit or an offline
 * machine doesn't block it.
 */
export const PLACEHOLDER_HREF = '#projects';
const MISSING = new Set([404, 410]);
const TIMEOUT_MS = 10_000;
const cache = new Map();

async function request(url) {
  const options = { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) };
  try {
    const head = await fetch(url, { ...options, method: 'HEAD' });
    if (head.ok) return { status: head.status };
    const get = await fetch(url, { ...options, method: 'GET' });
    await get.body?.cancel();
    return { status: get.status };
  } catch (error) {
    return { error: error.cause?.code ?? error.name };
  }
}

/** Cached { status } or { error } for `url`. */
export function linkStatus(url) {
  if (!cache.has(url)) cache.set(url, request(url));
  return cache.get(url);
}

/**
 * Asserts that `links` ([{ label, href }]) has no "#projects" placeholder and no target that
 * returns 404. `baseUrl` resolves same-site paths against the local server.
 */
export async function checkLinkTargets(t, links, baseUrl, at) {
  t.eq(
    links.filter((l) => l.href === PLACEHOLDER_HREF).map((l) => l.label),
    [],
    `${at}: no placeholder link to ${PLACEHOLDER_HREF}`,
  );
  const targets = [...new Set(links.map((l) => l.href).filter((href) => /^https?:\/\//.test(href) || /^\/(?!\/)/.test(href)))];
  const results = await Promise.all(
    targets.map(async (href) => [href, await linkStatus(href.startsWith('/') ? baseUrl + href : href)]),
  );
  t.eq(
    results.filter(([, r]) => MISSING.has(r.status)).map(([href, r]) => `${href} → ${r.status}`),
    [],
    `${at}: no link returns 404 (${targets.length} checked)`,
  );
  for (const [href, r] of results) {
    if (r.error || r.status >= 400) t.note(`${at}: ${href} → ${r.error ?? r.status} (not treated as missing)`);
  }
}

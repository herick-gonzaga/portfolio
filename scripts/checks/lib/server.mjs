/**
 * Static file server for the built site (dist/), on a free port of 127.0.0.1. Responses carry the
 * headers from dist/_headers (Cloudflare Pages format), so the checks run under the production
 * Content-Security-Policy. A path with no file gets the nearest 404.html (walking up from its
 * directory) with status 404, as Cloudflare Pages does when the site has a top-level 404.html.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/**
 * Parses a Cloudflare Pages _headers file into [{ pattern, headers }]. Supports path rules with
 * `*` splats and `:name` placeholders; absolute-URL rules and `! Header` removals are ignored.
 */
export function parseHeaders(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const source = line.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+');
      rules.push({ path: line, pattern: line.startsWith('/') ? new RegExp(`^${source}$`) : null, headers: [] });
      continue;
    }
    const match = line.trim().match(/^([^!:][^:]*):\s*(.*)$/);
    if (match && rules.length) rules.at(-1).headers.push([match[1].toLowerCase(), match[2]]);
  }
  return rules;
}

/** Headers for `pathname`; a header set by several matching rules is joined with ", ". */
export function headersFor(rules, pathname) {
  const out = {};
  for (const rule of rules) {
    if (!rule.pattern?.test(pathname)) continue;
    for (const [name, value] of rule.headers) out[name] = out[name] ? `${out[name]}, ${value}` : value;
  }
  return out;
}

/** Nearest 404.html at or above the directory of `file`, inside `root`; null if there is none. */
function nearest404(root, file) {
  for (let dir = dirname(file); dir === root || dir.startsWith(root + sep); dir = dirname(dir)) {
    const candidate = join(dir, '404.html');
    if (isFile(candidate)) return candidate;
    if (dir === root) break;
  }
  return null;
}

export function serveDist(dir) {
  const root = resolve(dir);
  const headersFile = join(root, '_headers');
  const rules = existsSync(headersFile) ? parseHeaders(readFileSync(headersFile, 'utf8')) : [];
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (!isFile(file)) file = join(file, 'index.html');
    if (!isFile(file)) {
      const notFound = nearest404(root, file);
      if (!notFound) {
        response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
        return;
      }
      response.writeHead(404, { ...headersFor(rules, pathname), 'content-type': TYPES['.html'] });
      createReadStream(notFound).pipe(response);
      return;
    }
    response.writeHead(200, {
      ...headersFor(rules, pathname),
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      resolveServer({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

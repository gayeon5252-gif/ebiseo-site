#!/usr/bin/env node
/** Verify deployed discovery files and selected frontend files against this checkout.
 * Node.js 20+. No query strings or response bodies are logged.
 * --timeout-ms may reduce the default 180-second total deadline for testing.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 'https://isabiseo.com';
const RESOURCES = [
  { filename: 'guide-feed.xml', pathname: '/guide-feed.xml', kind: 'xml' },
  { filename: 'sitemap.xml', pathname: '/sitemap.xml', kind: 'xml' },
  { filename: 'index.html', pathname: '/', kind: 'html' },
  { filename: 'cost.html', pathname: '/cost', kind: 'html' },
  { filename: 'guide/moving-supplies-list.html', pathname: '/guide/moving-supplies-list', kind: 'html' },
  { filename: 'js/home.js', pathname: '/js/home.js', kind: 'js', page: 'index.html' },
  { filename: 'js/cost.js', pathname: '/js/cost.js', kind: 'js', page: 'cost.html' },
];
const FILES = RESOURCES.map(resource => resource.filename);
const TOTAL_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 15_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;
const CONTENT_TYPES = {
  xml: new Set(['application/xml', 'application/rss+xml', 'text/xml']),
  html: new Set(['text/html']),
  js: new Set(['application/javascript', 'text/javascript', 'application/ecmascript', 'text/ecmascript']),
};

/** Ignore only an initial UTF-8 BOM and CRLF/CR line-ending differences. */
export function normalizeXml(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function sameGeneratedContent(expected, actual) {
  return normalizeXml(expected) === normalizeXml(actual);
}

/** Read only the selected local script reference; never follow arbitrary HTML URLs. */
function scriptPath(html, pathname) {
  const refs = [];
  const scripts = /<script\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>[\s\S]*?<\/script\s*>/gi;
  const attributes = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const [, text] of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(scripts)) {
    const attrs = [...text.matchAll(attributes)];
    const sources = attrs.filter(attr => attr[1].toLowerCase() === 'src');
    if (sources.length > 1) throw new Error('Invalid local script reference');
    if (!sources.length) continue;
    const src = sources[0][2] ?? sources[0][3] ?? sources[0][4] ?? '';
    const url = new URL(src, SITE);
    if (url.pathname !== pathname) continue;
    // Support the current version query without widening the origin/path allowlist.
    if (url.origin !== SITE || url.hash || src !== pathname + url.search ||
        !/^(?:\?v=[A-Za-z0-9._-]+)?$/.test(url.search)) {
      throw new Error('Invalid local script reference');
    }
    refs.push(src);
  }
  if (refs.length !== 1) throw new Error('Missing or duplicate local script reference');
  return refs[0];
}

async function matchesLive(resource, expected, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  let response;
  try {
    response = await fetch(SITE + resource.requestPath, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Ebiseo-DeploymentCheck/1.0',
        Accept: [...CONTENT_TYPES[resource.kind]].join(', '),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (response.status !== 200 || response.redirected || !CONTENT_TYPES[resource.kind].has(contentType)) {
      await response.body?.cancel();
      return false;
    }
    const chunks = [];
    let bytes = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) {
          controller.abort();
          return false;
        }
        chunks.push(chunk);
      }
    }
    if (controller.signal.aborted || Date.now() >= deadline) return false;
    const actual = Buffer.concat(chunks);
    if (resource.kind === 'xml') {
      return sameGeneratedContent(expected.toString('utf8'), actual.toString('utf8'));
    }
    // Exact bytes for JS AND HTML: preserve code, script versions and guide links.
    // Full HTML equality also checks link labels and inline scripts without a DOM approximation.
    return expected.equals(actual);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyDeployment(timeoutMs = TOTAL_TIMEOUT_MS) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TOTAL_TIMEOUT_MS) {
    throw new Error('Invalid timeout');
  }
  const deadline = Date.now() + timeoutMs;
  const reads = await Promise.allSettled(FILES.map(filename => readFile(path.join(ROOT, 'public', filename))));
  const missing = FILES.filter((filename, index) => reads[index].status === 'rejected');
  if (missing.length) {
    return { status: 'failed', mismatches: missing, attempts: 0, reason: 'local-baseline-unavailable' };
  }
  const expected = reads.map(result => result.value);
  const targets = [];
  for (const resource of RESOURCES) {
    try {
      const requestPath = resource.page
        ? scriptPath(expected[FILES.indexOf(resource.page)].toString('utf8'), resource.pathname)
        : resource.pathname;
      targets.push({ ...resource, requestPath });
    } catch {
      return { status: 'failed', mismatches: [resource.page], attempts: 0, reason: 'local-script-reference-invalid' };
    }
  }
  let attempts = 0;
  let mismatches = [...FILES];
  while (Date.now() < deadline) {
    attempts++;
    // Recheck all seven resources on each attempt; do not combine successes across attempts.
    const matched = await Promise.all(targets.map((resource, index) => matchesLive(resource, expected[index], deadline)));
    mismatches = FILES.filter((filename, index) => !matched[index]);
    if (!mismatches.length && Date.now() < deadline) {
      return { status: 'success', mismatches, attempts };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await delay(Math.min(RETRY_DELAY_MS, remaining));
  }
  return { status: 'failed', mismatches, attempts, reason: 'deadline-exceeded' };
}

async function main() {
  const args = process.argv.slice(2);
  let timeoutMs = TOTAL_TIMEOUT_MS;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--timeout-ms' || !/^\d+$/.test(args[1])) {
      throw new Error('Invalid arguments');
    }
    timeoutMs = Number(args[1]);
  }
  const result = await verifyDeployment(timeoutMs);
  console.log(JSON.stringify(result));
  if (result.status !== 'success') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    console.log(JSON.stringify({ status: 'failed', mismatches: FILES, attempts: 0 }));
    process.exitCode = 1;
  });
}

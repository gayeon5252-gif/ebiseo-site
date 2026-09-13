#!/usr/bin/env node
/**
 * Read-only site health check; Node.js 20+ on Windows or Linux. No browser,
 * analytics JavaScript, affiliate links, credentials, or publication are used.
 *
 * node tools/operations/check-site.mjs --source-root . --output-dir output/operations
 * Production origin is fixed. --base-url permits loopback HTTP fixtures only.
 * Writes latest-check.json. Exit 1 = health failure; comparison warnings exit 0.
 * Without --source-root, use cwd/public, then the existing Windows source, if any.
 */
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://isabiseo.com';
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 4;
const MAX_BODY_BYTES = 3 * 1024 * 1024;
const DEFAULT_OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../output/operations');
const WINDOWS_SOURCE = 'C:/Users/USER/Downloads/ebiseo-project';
const CORE_PATHS = ['/', '/checklist', '/cost', '/guide', '/safety', '/loan'];

function decodeXml(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  })[entity]);
}

function cleanText(value) {
  return decodeXml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function validateBase(input = SITE) {
  const url = new URL(input);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== SITE && !(loopback && url.protocol === 'http:')) {
    throw new Error('Only https://isabiseo.com or a loopback HTTP fixture is allowed.');
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('The base URL must be an origin without a path, credentials, or query.');
  }
  return url.origin;
}

/** This site uses a single urlset sitemap, not a sitemap index. */
export function parseSitemap(xml, baseUrl = SITE) {
  const base = validateBase(baseUrl);
  const paths = [];
  const errors = [];
  if (!/<urlset\b[^>]*>[\s\S]*<\/urlset\s*>/i.test(xml)) {
    errors.push('sitemap_urlset_missing');
  }
  const entries = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)];
  if (!entries.length) errors.push('sitemap_contains_no_locations');
  for (const entry of entries) {
    try {
      const url = new URL(decodeXml(entry[1].trim()));
      // Fixture sitemaps may retain the production origin. Never fetch other hosts.
      if (![SITE, base].includes(url.origin) || url.username || url.password || url.search || url.hash) {
        errors.push('sitemap_location_not_allowed');
        continue;
      }
      paths.push(url.pathname);
    } catch {
      errors.push('sitemap_location_invalid');
    }
  }
  if (entries.length && !paths.length) errors.push('sitemap_contains_no_valid_locations');
  return { paths: [...new Set(paths)].sort(), errors: [...new Set(errors)] };
}

function titleOf(html) {
  return cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '');
}

/** Pure response assessment, exported for small offline fixtures. */
export function assessResource(route, result) {
  const issues = [];
  if (result.error) issues.push(result.error);
  if (result.status !== 200) issues.push(`http_status_${result.status ?? 'unavailable'}`);
  const html = result.body || '';
  const title = titleOf(html);
  if (result.status === 200) {
    if (result.finalPath === '/' && route !== '/') issues.push('unexpected_redirect_to_home');
    // Only title/h1 evidence counts; a 404 mentioned in an article is not a failure.
    const h1 = cleanText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] || '');
    const notFound = /(?:\b404\b|page\s+not\s+found|페이지를\s*찾을\s*수\s*없|찾으시는\s*페이지가\s*없)/i;
    if (notFound.test(title) || notFound.test(h1)) issues.push('soft_404_title_or_heading');
    if (route === '/') {
      const visibleText = cleanText(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ''));
      for (const expected of ['이비서', '이사 예정일을 선택하세요', '플래너 시작하기']) {
        if (!visibleText.includes(expected)) issues.push(`home_missing_text:${expected}`);
      }
    } else if (route === '/checklist' && !html.includes('날짜별 체크리스트')) {
      issues.push('checklist_missing_heading');
    } else if (route === '/robots.txt' && !/^\s*User-agent\s*:/im.test(html)) {
      issues.push('robots_missing_user_agent');
    }
    if (route !== '/robots.txt' && route !== '/sitemap.xml' && !title) {
      issues.push('html_title_missing');
    }
  }
  return { path: route, status: result.status, finalPath: result.finalPath,
    elapsedMs: result.elapsedMs, title, ok: issues.length === 0, issues: [...new Set(issues)] };
}

async function fetchResource(base, route) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let status = null;
  let current = new URL(route, base);
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      const response = await fetch(current, {
        signal: controller.signal, redirect: 'manual',
        headers: { 'User-Agent': 'Ebiseo-HealthCheck/1.0', Accept: 'text/html, application/xml, text/plain;q=0.9' },
      });
      status = response.status;
      if ([301, 302, 303, 307, 308].includes(status)) {
        await response.body?.cancel();
        const next = new URL(response.headers.get('location') || '', current);
        if (next.origin !== base || next.username || next.password || next.search || next.hash) {
          throw new Error('redirect_outside_allowed_site');
        }
        if (!response.headers.get('location') || redirects === 5) throw new Error('redirect_limit_or_missing_location');
        current = next;
        continue;
      }
      const chunks = [];
      let bytes = 0;
      if (response.body) {
        for await (const chunk of response.body) {
          bytes += chunk.length;
          if (bytes > MAX_BODY_BYTES) throw new Error('response_body_too_large');
          chunks.push(chunk);
        }
      }
      return { status, finalPath: current.pathname, body: Buffer.concat(chunks).toString('utf8'), elapsedMs: Date.now() - start };
    }
  } catch (error) {
    // Avoid storing arbitrary error messages, URLs, headers, or response contents.
    const known = ['redirect_outside_allowed_site', 'redirect_limit_or_missing_location', 'response_body_too_large'];
    return { status, finalPath: current.pathname, body: '', elapsedMs: Date.now() - start,
      error: controller.signal.aborted ? 'request_timeout' : known.includes(error.message) ? error.message : 'request_failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent(items, callback) {
  const values = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      values[index] = await callback(items[index]);
    }
  }));
  return values;
}

async function hasPublic(root) {
  try { return (await stat(path.join(root, 'public'))).isDirectory(); } catch { return false; }
}

async function chooseSourceRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  if (await hasPublic(process.cwd())) return process.cwd();
  if (process.platform === 'win32' && await hasPublic(WINDOWS_SOURCE)) return WINDOWS_SOURCE;
  return null;
}

function cacheVersion(html) {
  return html.match(/(?:\/|["'])css\/style\.css\?v=(\d+)/)?.[1] || null;
}

function guideLinks(html) {
  return [...new Set([...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["'](\/guide\/[^"'#?]+)["']/gi)].map(match => match[1]))];
}

async function compareLocal(sourceRoot, bodies, livePaths, warnings) {
  if (!sourceRoot) return { available: false, reason: 'no_local_source' };
  try {
    const publicDir = path.join(sourceRoot, 'public');
    const [home, sitemap, guides] = await Promise.all([
      readFile(path.join(publicDir, 'index.html'), 'utf8'),
      readFile(path.join(publicDir, 'sitemap.xml'), 'utf8'),
      readdir(path.join(publicDir, 'guide'), { withFileTypes: true }),
    ]);
    const parsed = parseSitemap(sitemap);
    const localPaths = parsed.paths;
    const localVersion = cacheVersion(home);
    const liveVersion = cacheVersion(bodies.get('/') || '');
    const localGuideCount = guides.filter(file => file.isFile() && file.name.endsWith('.html')).length;
    const liveGuideCount = guideLinks(bodies.get('/guide') || '').length;
    if (parsed.errors.length) warnings.push({ code: 'local_sitemap_invalid', details: parsed.errors });
    if (!localVersion || !liveVersion || localVersion !== liveVersion) {
      warnings.push({ code: 'cache_version_comparison', local: localVersion, live: liveVersion });
    }
    const localOnly = localPaths.filter(route => !livePaths.includes(route));
    const liveOnly = livePaths.filter(route => !localPaths.includes(route));
    if (localOnly.length || liveOnly.length) warnings.push({ code: 'sitemap_drift', localOnly, liveOnly });
    if (localGuideCount !== liveGuideCount) warnings.push({ code: 'guide_count_drift', local: localGuideCount, live: liveGuideCount });
    return { available: true, cacheVersion: { local: localVersion, live: liveVersion },
      sitemapCount: { local: localPaths.length, live: livePaths.length },
      guideCount: { local: localGuideCount, live: liveGuideCount } };
  } catch {
    warnings.push({ code: 'local_comparison_unavailable' });
    return { available: false, reason: 'source_files_unavailable' };
  }
}

/** Runs checks and returns a public-data-only report; does not write a file. */
export async function runCheck(options = {}) {
  const base = validateBase(options.baseUrl);
  const started = Date.now();
  const results = [];
  const failures = [];
  const warnings = [];
  const bodies = new Map();
  const initialPaths = [...CORE_PATHS, '/robots.txt', '/sitemap.xml'];
  const check = async route => {
    const fetched = await fetchResource(base, route);
    bodies.set(route, fetched.body);
    return assessResource(route, fetched);
  };
  results.push(...await mapConcurrent(initialPaths, check));
  const sitemap = parseSitemap(bodies.get('/sitemap.xml') || '', base);
  for (const code of sitemap.errors) failures.push({ path: '/sitemap.xml', code });
  const remainingPaths = sitemap.paths.filter(route => !initialPaths.includes(route));
  results.push(...await mapConcurrent(remainingPaths, check));
  for (const result of results) {
    for (const code of result.issues) failures.push({ path: result.path, code });
  }
  const sourceRoot = await chooseSourceRoot(options.sourceRoot);
  const comparison = await compareLocal(sourceRoot, bodies, sitemap.paths, warnings);
  const ok = failures.length === 0;
  return {
    schemaVersion: 1, checkedAt: new Date(started).toISOString(), baseUrl: base,
    mode: base === SITE ? 'production' : 'loopback-fixture', ok,
    status: ok ? warnings.length ? 'warning' : 'healthy' : 'failed',
    summary: { resources: results.length, sitemapUrls: sitemap.paths.length,
      failures: failures.length, warnings: warnings.length, elapsedMs: Date.now() - started },
    failures, warnings, comparison, results,
    limits: 'HTTP and static HTML checks only; no JavaScript execution or GA4 collection verification.',
  };
}

async function main() {
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node check-site.mjs [--source-root PATH] [--output-dir PATH] [--base-url http://127.0.0.1:PORT]');
      return;
    }
    const key = { '--source-root': 'sourceRoot', '--output-dir': 'outputDir', '--base-url': 'baseUrl' }[arg];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${arg}`);
    options[key] = args[++i];
  }
  const report = await runCheck(options);
  const outputDir = path.resolve(options.outputDir || DEFAULT_OUTPUT);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'latest-check.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ status: report.status, ...report.summary, report: path.join(outputDir, 'latest-check.json') }));
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`Site check could not complete: ${error.message}`);
    process.exitCode = 1;
  });
}

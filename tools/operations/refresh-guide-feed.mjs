#!/usr/bin/env node
/**
 * Node 20+, no network or AI. Reuses guide titles/descriptions and recorded dates.
 * Run: node tools/operations/refresh-guide-feed.mjs [--check]
 * --check writes nothing; exit 1 means changes are needed, exit 0 means current.
 * Default writes only public/guide-feed.xml and missing guide entries in sitemap.xml.
 * Existing sitemap entries remain byte-for-byte unchanged. No dates use today's date.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://isabiseo.com';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  hellip: '…', middot: '·', copy: '©', reg: '®', trade: '™' };

function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, entity) => {
    if (!entity.startsWith('#')) return ENTITIES[entity] ?? original;
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return Number.isInteger(number) && number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
      ? String.fromCodePoint(number) : original;
  });
}

export function xmlEscape(value) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function attributes(tag) {
  const result = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b(?:[^"'<>]|"[^"]*"|'[^']*')*>`, 'gi'))]
    .map(match => attributes(match[0]));
}

/** Accept only a real calendar date or an ISO timestamp with an explicit zone. */
export function recordedDate(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/);
  if (!match) return null;
  const midnight = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== text.slice(0, 10)) return null;
  if (text.length > 10 && !Number.isFinite(Date.parse(text))) return null;
  return text;
}

function articleDates(head, metas) {
  const values = {};
  for (const meta of metas) {
    const key = (meta.itemprop || meta.name || meta.property || '').toLowerCase();
    if (['datemodified', 'datepublished'].includes(key)) values[key] = recordedDate(meta.content);
  }
  for (const match of head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try {
      const parsed = JSON.parse(match[2]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed['@graph']) ? parsed['@graph'] : [])];
      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue;
        const types = [].concat(item['@type'] || []);
        if (!types.some(type => /(?:^|\/)(?:Article|BlogPosting|NewsArticle)$/.test(type))) continue;
        values.datemodified ||= recordedDate(item.dateModified);
        values.datepublished ||= recordedDate(item.datePublished);
      }
    } catch { /* Invalid structured data supplies no date; it is never guessed. */ }
  }
  return values.datemodified || values.datepublished || null;
}

export function extractGuide(filename, html) {
  if (!/^[a-z0-9][a-z0-9_-]*\.html$/i.test(filename)) throw new Error(`Unsupported guide filename: ${filename}`);
  const slug = filename.slice(0, -5);
  const expected = `${SITE}/guide/${slug}`;
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1];
  if (!head) throw new Error(`Missing HTML head: ${filename}`);
  const metas = tags(head, 'meta');
  if (metas.some(meta => /^(robots|googlebot|bingbot)$/i.test(meta.name || '') &&
    /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(meta.content || ''))) return null;
  const canonicals = tags(head, 'link').filter(link => (link.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  if (canonicals.length > 1) throw new Error(`Multiple canonical links: ${filename}`);
  if (canonicals.length) {
    let canonical;
    try { canonical = new URL(canonicals[0].href); } catch { throw new Error(`Invalid canonical: ${filename}`); }
    if (canonical.href !== expected || canonical.username || canonical.password) {
      throw new Error(`Canonical must match this guide's isabiseo URL: ${filename}`);
    }
  }
  const title = decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = metas.find(meta => (meta.name || '').toLowerCase() === 'description')?.content?.replace(/\s+/g, ' ').trim();
  if (!title || !description) throw new Error(`Missing title or meta description: ${filename}`);
  return { title, description, url: expected, metadataDate: articleDates(head, metas) };
}

function readSitemap(xml) {
  if (!/<urlset\b[^>]*>[\s\S]*<\/urlset\s*>/i.test(xml)) throw new Error('sitemap.xml must contain a urlset.');
  const entries = new Map();
  for (const block of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url\s*>/gi)) {
    const loc = block[1].match(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/i)?.[1];
    if (!loc) throw new Error('Sitemap url entry is missing loc.');
    const url = decode(loc.trim());
    if (entries.has(url)) throw new Error('Sitemap contains a duplicate loc; existing entries require review.');
    const rawDate = block[1].match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod\s*>/i)?.[1]?.trim();
    entries.set(url, { rawDate, date: recordedDate(rawDate) });
  }
  if (!entries.size) throw new Error('sitemap.xml contains no URL entries.');
  return entries;
}

/** Pure artifact generation, also usable with small in-memory fixtures. */
export function buildArtifacts(files, originalSitemap) {
  const sitemapEntries = readSitemap(originalSitemap);
  const guides = [];
  let excludedNoindex = 0;
  for (const file of files) {
    const guide = extractGuide(file.name, file.html);
    if (guide) guides.push(guide); else excludedNoindex++;
  }
  if (!guides.length) throw new Error('No indexable guides found; refusing to replace the feed with an empty feed.');
  guides.sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  const additions = [];
  for (const guide of guides) {
    const existing = sitemapEntries.get(guide.url);
    if (existing?.rawDate && !existing.date) throw new Error(`Invalid recorded sitemap lastmod: ${guide.url}`);
    if (!existing) {
      const date = guide.metadataDate;
      additions.push(`  <url><loc>${xmlEscape(guide.url)}</loc>${date ? `<lastmod>${xmlEscape(date)}</lastmod>` : ''}</url>`);
      sitemapEntries.set(guide.url, { date });
    }
    guide.date = sitemapEntries.get(guide.url).date || null;
  }
  const newline = originalSitemap.includes('\r\n') ? '\r\n' : '\n';
  let sitemap = originalSitemap;
  if (additions.length) {
    const closingIndex = originalSitemap.search(/<\/urlset\s*>/i);
    const before = originalSitemap.slice(0, closingIndex);
    sitemap = before + (before.endsWith('\n') ? '' : newline) + additions.join(newline) + newline + originalSitemap.slice(closingIndex);
  }
  // Last modification is not publication. dc:date preserves that recorded date
  // without claiming a pubDate; build time / filesystem mtime are never used.
  guides.sort((a, b) => {
    const dateDifference = (b.date ? Date.parse(b.date) : -Infinity) - (a.date ? Date.parse(a.date) : -Infinity);
    if (Number.isFinite(dateDifference) && dateDifference !== 0) return dateDifference;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.url < b.url ? -1 : a.url > b.url ? 1 : 0;
  });
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    '    <title>이비서 이사 가이드</title>',
    `    <link>${SITE}/guide</link>`,
    '    <description>이비서에 등록된 이사 가이드의 제목과 요약입니다.</description>',
    '    <language>ko-KR</language>',
    `    <atom:link href="${SITE}/guide-feed.xml" rel="self" type="application/rss+xml" />`,
    '    <!-- Item dc:date comes from sitemap lastmod; it is not a publication timestamp. -->',
  ];
  for (const guide of guides) {
    lines.push('    <item>', `      <title>${xmlEscape(guide.title)}</title>`,
      `      <link>${xmlEscape(guide.url)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(guide.url)}</guid>`,
      `      <description>${xmlEscape(guide.description)}</description>`);
    if (guide.date) lines.push(`      <dc:date>${xmlEscape(guide.date)}</dc:date>`);
    lines.push('    </item>');
  }
  lines.push('  </channel>', '</rss>', '');
  return { feed: lines.join('\n'), sitemap, itemCount: guides.length, addedCount: additions.length, excludedNoindex };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node tools/operations/refresh-guide-feed.mjs [--check]');
    return;
  }
  if (args.some(arg => arg !== '--check')) throw new Error('Only --check is supported.');
  const publicDir = path.join(ROOT, 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const feedPath = path.join(publicDir, 'guide-feed.xml');
  const names = (await readdir(path.join(publicDir, 'guide'), { withFileTypes: true }))
    .filter(file => file.isFile() && file.name.endsWith('.html')).map(file => file.name).sort();
  const files = await Promise.all(names.map(async name => ({ name, html: await readFile(path.join(publicDir, 'guide', name), 'utf8') })));
  const originalSitemap = await readFile(sitemapPath, 'utf8');
  let originalFeed = null;
  try { originalFeed = await readFile(feedPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const built = buildArtifacts(files, originalSitemap);
  const changedFiles = [];
  if (originalFeed !== built.feed) changedFiles.push('public/guide-feed.xml');
  if (originalSitemap !== built.sitemap) changedFiles.push('public/sitemap.xml');
  const check = args.includes('--check');
  if (!check) {
    if (originalSitemap !== built.sitemap) await writeFile(sitemapPath, built.sitemap, 'utf8');
    if (originalFeed !== built.feed) await writeFile(feedPath, built.feed, 'utf8');
  }
  console.log(JSON.stringify({ mode: check ? 'check' : 'write', itemCount: built.itemCount,
    addedSitemapUrls: built.addedCount, excludedNoindex: built.excludedNoindex, changedFiles }));
  process.exitCode = check && changedFiles.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Guide feed refresh failed: ${error.message}`); process.exitCode = 1; });
}

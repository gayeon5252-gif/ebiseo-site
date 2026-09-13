#!/usr/bin/env node
/** Verify deployed discovery files against this checkout. Node.js 20+.
 * No query strings or response bodies are logged. Exit 1 means verification failed.
 * --timeout-ms may reduce the default 180-second total deadline for testing.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 'https://isabiseo.com';
const FILES = ['guide-feed.xml', 'sitemap.xml'];
const TOTAL_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 15_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

/** Ignore only an initial UTF-8 BOM and CRLF/CR line-ending differences. */
export function normalizeXml(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function sameGeneratedContent(expected, actual) {
  return normalizeXml(expected) === normalizeXml(actual);
}

async function matchesLive(filename, expected, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  let response;
  try {
    response = await fetch(`${SITE}/${filename}`, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Ebiseo-DeploymentCheck/1.0',
        Accept: 'application/xml, application/rss+xml, text/xml;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    if (response.status !== 200) {
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
    return sameGeneratedContent(expected, Buffer.concat(chunks).toString('utf8'));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let timeoutMs = TOTAL_TIMEOUT_MS;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--timeout-ms' || !/^\d+$/.test(args[1])) {
      throw new Error('Invalid arguments');
    }
    timeoutMs = Number(args[1]);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TOTAL_TIMEOUT_MS) {
      throw new Error('Invalid timeout');
    }
  }
  const deadline = Date.now() + timeoutMs;
  const expected = await Promise.all(FILES.map(filename => readFile(path.join(ROOT, 'public', filename), 'utf8')));
  let attempts = 0;
  let mismatches = [...FILES];
  while (Date.now() < deadline) {
    attempts++;
    // Check both files on every attempt so success describes one observed deployment.
    const matched = await Promise.all(FILES.map((filename, index) => matchesLive(filename, expected[index], deadline)));
    mismatches = FILES.filter((filename, index) => !matched[index]);
    if (!mismatches.length) {
      console.log(JSON.stringify({ status: 'success', mismatches, attempts }));
      return;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await delay(Math.min(RETRY_DELAY_MS, remaining));
  }
  console.log(JSON.stringify({ status: 'failed', mismatches, attempts }));
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    console.log(JSON.stringify({ status: 'failed', mismatches: FILES, attempts: 0 }));
    process.exitCode = 1;
  });
}

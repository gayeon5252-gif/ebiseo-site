import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR' }).then(c => c.newPage())
await page.goto('https://isabiseo.com/?nc=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
await page.waitForTimeout(11000)
const srcs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src, w: f.width, h: f.height, parent: f.parentElement?.className || f.parentElement?.tagName })))
srcs.forEach(s => { console.log('parent=' + s.parent + '  ' + s.w + 'x' + s.h); console.log('  ' + (s.src || '(src 없음 — 내용을 직접 써넣은 방식)').slice(0, 220)) })
await browser.close()

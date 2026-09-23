import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newContext({ viewport: { width: 430, height: 900 }, isMobile: true, locale: 'ko-KR' }).then(c => c.newPage())
for (const u of ['/', '/guide/studio-maintenance-fee', '/checklist']) {
  await p.goto('https://isabiseo.com' + u + '?nc=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(3500)
  const kids = await p.evaluate(() => {
    const m = document.querySelector('main'); if (!m) return []
    return Array.from(m.children).map(c => c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).split(' ')[0] : ''))
  })
  console.log(u + '  →  ' + kids.slice(0, 7).join(' | ') + (kids.length > 7 ? ' …(' + kids.length + '개)' : ''))
}
await b.close()

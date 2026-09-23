import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newContext({ locale: 'ko-KR', viewport: { width: 1400, height: 1000 } }).then(c => c.newPage())
const urls = [
  'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020601.jsp',
  'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020701.jsp',
]
for (const u of urls) {
  try {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await p.waitForTimeout(6000)
    const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
    const title = await p.title()
    const rates = [...new Set(t.match(/연\s?[0-9]\.[0-9]+%|[0-9]\.[0-9]+%\s?~\s?[0-9]\.[0-9]+%|[0-9]\.[0-9]+%/g) || [])]
    console.log('--- ' + title + ' (' + u.slice(-16) + ')')
    console.log('   금리 후보: ' + (rates.slice(0, 12).join(' , ') || '없음'))
    const idx = t.indexOf('청년전용 버팀목')
    if (idx > -1) console.log('   본문: ' + t.slice(idx, idx + 260))
  } catch (e) { console.log('--- ' + u + ' 실패: ' + String(e).slice(0, 80)) }
}
await b.close()

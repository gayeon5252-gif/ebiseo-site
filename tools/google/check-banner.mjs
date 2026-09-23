/** 쿠팡 배너가 실제로 렌더되는지 확인 — 로그인 없음, 읽기만 함 */
import { chromium } from 'playwright-core'
import path from 'node:path'
const OUT = process.argv[2] || '.'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const [name, w, h, mobile] of [['desktop', 1920, 1080, false], ['mobile', 430, 900, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'ko-KR' })
  const page = await ctx.newPage()
  await page.goto('https://isabiseo.com/?nc=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(9000)
  const rail = await page.locator('.cp-rail').count()
  const railVisible = rail ? await page.locator('.cp-rail').first().isVisible() : false
  const bottom = await page.locator('.cp-bottom').count()
  const iframes = await page.locator('iframe[src*="coupang"], .cp-bottom iframe, .cp-rail iframe').count()
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  console.log(name + ': 레일 ' + rail + '(보임 ' + railVisible + ') / 하단슬롯 ' + bottom + ' / 쿠팡 iframe ' + iframes + ' / 가로스크롤 ' + scroll)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(OUT, 'banner-' + name + '.png') })
  await ctx.close()
}
await browser.close()
console.log('DONE')
